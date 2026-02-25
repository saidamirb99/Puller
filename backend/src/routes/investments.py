from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from typing import List, Optional
from config.database import get_db
from src.models.user import User
from src.models.investment import InvestmentHolding, InvestmentTransaction, InvestmentTxnType
from src.models.watchlist import WatchlistItem
from src.schemas.investment import (
    HoldingCreate, HoldingResponse,
    TransactionCreate, TransactionResponse,
    PortfolioSummary, HoldingSummary,
    MarketQuote, SearchResult, HistoryPoint,
    MarketOverview, MarketStatus, TopMovers, SectorPerformance,
    AssetDetail, WatchlistAdd, WatchlistItemResponse,
)
from src.routes.auth import get_current_user_dependency
from src.services import market_data_service

router = APIRouter()


# ── Holdings CRUD ────────────────────────────────────────

@router.post("/holdings", response_model=HoldingResponse, status_code=status.HTTP_201_CREATED)
async def create_holding(
    data: HoldingCreate,
    current_user: User = Depends(get_current_user_dependency),
    db: Session = Depends(get_db),
):
    """Create a new investment holding."""
    existing = db.query(InvestmentHolding).filter(
        InvestmentHolding.user_id == current_user.id,
        InvestmentHolding.ticker == data.ticker,
        InvestmentHolding.is_active == True,
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail=f"Holding for {data.ticker} already exists")

    holding = InvestmentHolding(
        user_id=current_user.id,
        ticker=data.ticker,
        name=data.name,
        asset_type=data.asset_type,
        notes=data.notes,
    )
    db.add(holding)
    db.commit()
    db.refresh(holding)
    return holding


@router.get("/holdings", response_model=List[HoldingResponse])
async def get_holdings(
    current_user: User = Depends(get_current_user_dependency),
    db: Session = Depends(get_db),
):
    """List all active holdings for the current user."""
    return (
        db.query(InvestmentHolding)
        .filter(InvestmentHolding.user_id == current_user.id, InvestmentHolding.is_active == True)
        .order_by(InvestmentHolding.ticker)
        .all()
    )


@router.delete("/holdings/{holding_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_holding(
    holding_id: str,
    current_user: User = Depends(get_current_user_dependency),
    db: Session = Depends(get_db),
):
    """Delete a holding (only if 0 shares)."""
    holding = db.query(InvestmentHolding).filter(
        InvestmentHolding.id == holding_id,
        InvestmentHolding.user_id == current_user.id,
    ).first()
    if not holding:
        raise HTTPException(status_code=404, detail="Holding not found")
    if holding.total_shares > 0.001:
        raise HTTPException(status_code=400, detail="Cannot delete holding with shares. Sell all shares first.")

    db.delete(holding)
    db.commit()


# ── Buy/Sell Transactions ────────────────────────────────

@router.post("/holdings/{holding_id}/transactions", response_model=TransactionResponse, status_code=status.HTTP_201_CREATED)
async def record_transaction(
    holding_id: str,
    data: TransactionCreate,
    current_user: User = Depends(get_current_user_dependency),
    db: Session = Depends(get_db),
):
    """Record a buy or sell transaction for a holding."""
    holding = db.query(InvestmentHolding).filter(
        InvestmentHolding.id == holding_id,
        InvestmentHolding.user_id == current_user.id,
    ).first()
    if not holding:
        raise HTTPException(status_code=404, detail="Holding not found")

    total_amount = round(data.shares * data.price_per_share, 2)

    if data.txn_type == InvestmentTxnType.BUY:
        old_cost_total = holding.avg_cost * holding.total_shares
        new_cost_total = old_cost_total + total_amount
        new_total_shares = holding.total_shares + data.shares
        holding.avg_cost = round(new_cost_total / new_total_shares, 4) if new_total_shares > 0 else 0
        holding.total_shares = round(new_total_shares, 6)

    elif data.txn_type == InvestmentTxnType.SELL:
        if data.shares > holding.total_shares + 0.001:
            raise HTTPException(
                status_code=400,
                detail=f"Cannot sell {data.shares} shares. Only {holding.total_shares} available.",
            )
        realized = (data.price_per_share - holding.avg_cost) * data.shares
        holding.realized_pnl = round(holding.realized_pnl + realized, 2)
        holding.total_shares = round(holding.total_shares - data.shares, 6)

    txn = InvestmentTransaction(
        holding_id=holding.id,
        user_id=current_user.id,
        txn_type=data.txn_type,
        shares=data.shares,
        price_per_share=data.price_per_share,
        total_amount=total_amount,
        fees=data.fees,
        txn_date=data.txn_date,
        notes=data.notes,
    )
    db.add(txn)
    db.commit()
    db.refresh(txn)
    return txn


@router.get("/holdings/{holding_id}/transactions", response_model=List[TransactionResponse])
async def get_transactions(
    holding_id: str,
    current_user: User = Depends(get_current_user_dependency),
    db: Session = Depends(get_db),
):
    """Get all transactions for a holding."""
    holding = db.query(InvestmentHolding).filter(
        InvestmentHolding.id == holding_id,
        InvestmentHolding.user_id == current_user.id,
    ).first()
    if not holding:
        raise HTTPException(status_code=404, detail="Holding not found")

    return (
        db.query(InvestmentTransaction)
        .filter(InvestmentTransaction.holding_id == holding_id)
        .order_by(InvestmentTransaction.txn_date.desc())
        .all()
    )


# ── Portfolio Summary ────────────────────────────────────

@router.get("/summary", response_model=PortfolioSummary)
async def get_portfolio_summary(
    current_user: User = Depends(get_current_user_dependency),
    db: Session = Depends(get_db),
):
    """Get full portfolio summary with live market data."""
    holdings = (
        db.query(InvestmentHolding)
        .filter(InvestmentHolding.user_id == current_user.id, InvestmentHolding.is_active == True)
        .all()
    )

    if not holdings:
        return PortfolioSummary(
            total_value=0, total_cost=0, total_pnl=0, total_pnl_pct=0,
            day_change=0, day_change_pct=0, holdings_count=0, holdings=[],
        )

    tickers = [h.ticker for h in holdings if h.total_shares > 0]
    quotes = market_data_service.get_batch_quotes(tickers) if tickers else {}

    total_value = 0.0
    total_cost = 0.0
    total_day_change = 0.0
    holding_summaries = []

    for h in holdings:
        quote = quotes.get(h.ticker)
        current_price = quote["price"] if quote else 0.0
        previous_close = quote["previous_close"] if quote else current_price

        market_value = round(h.total_shares * current_price, 2)
        cost_basis = round(h.total_shares * h.avg_cost, 2)
        unrealized_pnl = round(market_value - cost_basis, 2)
        unrealized_pnl_pct = round((unrealized_pnl / cost_basis * 100), 2) if cost_basis > 0 else 0.0
        day_change = round(h.total_shares * (current_price - previous_close), 2)
        day_change_pct = round(((current_price - previous_close) / previous_close * 100), 2) if previous_close > 0 else 0.0

        total_value += market_value
        total_cost += cost_basis
        total_day_change += day_change

        holding_summaries.append(HoldingSummary(
            id=h.id, ticker=h.ticker, name=h.name, asset_type=h.asset_type,
            total_shares=h.total_shares, avg_cost=h.avg_cost, realized_pnl=h.realized_pnl,
            current_price=current_price, previous_close=previous_close,
            market_value=market_value, cost_basis=cost_basis,
            unrealized_pnl=unrealized_pnl, unrealized_pnl_pct=unrealized_pnl_pct,
            day_change=day_change, day_change_pct=day_change_pct,
            allocation_pct=0,
        ))

    for hs in holding_summaries:
        hs.allocation_pct = round((hs.market_value / total_value * 100), 2) if total_value > 0 else 0.0

    total_pnl = round(total_value - total_cost, 2)
    total_pnl_pct = round((total_pnl / total_cost * 100), 2) if total_cost > 0 else 0.0
    day_change_pct_total = round((total_day_change / (total_value - total_day_change) * 100), 2) if (total_value - total_day_change) > 0 else 0.0

    return PortfolioSummary(
        total_value=round(total_value, 2), total_cost=round(total_cost, 2),
        total_pnl=total_pnl, total_pnl_pct=total_pnl_pct,
        day_change=round(total_day_change, 2), day_change_pct=day_change_pct_total,
        holdings_count=len(holdings), holdings=holding_summaries,
    )


# ── Market Data Proxy ────────────────────────────────────

@router.get("/market/quote/{ticker}", response_model=Optional[MarketQuote])
async def get_market_quote(ticker: str):
    """Get live market quote for a ticker."""
    quote = market_data_service.get_quote(ticker)
    if not quote:
        raise HTTPException(status_code=404, detail=f"Quote not found for {ticker}")
    return quote


@router.get("/market/search", response_model=List[SearchResult])
async def search_market(q: str = Query(..., min_length=1)):
    """Search for tickers matching a query."""
    return market_data_service.search_ticker(q)


@router.get("/market/history/{ticker}", response_model=List[HistoryPoint])
async def get_market_history(
    ticker: str,
    period: str = Query(default="1y"),
):
    """Get historical price data for a ticker."""
    return market_data_service.get_history(ticker, period)


# ── Market Overview (new) ────────────────────────────────

@router.get("/market/overview", response_model=MarketOverview)
async def get_market_overview():
    """Get full market overview: status, indices, movers, sectors."""
    status = market_data_service.get_market_status()
    indices = market_data_service.get_market_indices()
    movers = market_data_service.get_top_movers(8)
    sectors = market_data_service.get_sector_performance()

    return MarketOverview(
        market_status=MarketStatus(**status),
        indices=[MarketQuote(**i) for i in indices],
        top_movers=TopMovers(
            gainers=[MarketQuote(**g) for g in movers.get("gainers", [])],
            losers=[MarketQuote(**l) for l in movers.get("losers", [])],
        ),
        sectors=[SectorPerformance(**s) for s in sectors],
    )


@router.get("/market/indices", response_model=List[MarketQuote])
async def get_indices():
    """Get current data for major market indices."""
    return [MarketQuote(**i) for i in market_data_service.get_market_indices()]


@router.get("/market/movers", response_model=TopMovers)
async def get_movers(limit: int = Query(default=8, ge=1, le=20)):
    """Get top gainers and losers."""
    movers = market_data_service.get_top_movers(limit)
    return TopMovers(
        gainers=[MarketQuote(**g) for g in movers.get("gainers", [])],
        losers=[MarketQuote(**l) for l in movers.get("losers", [])],
    )


@router.get("/market/sectors", response_model=List[SectorPerformance])
async def get_sectors():
    """Get sector ETF performance."""
    return [SectorPerformance(**s) for s in market_data_service.get_sector_performance()]


@router.get("/market/detail/{ticker}", response_model=Optional[AssetDetail])
async def get_detail(ticker: str):
    """Get comprehensive asset details."""
    detail = market_data_service.get_asset_detail(ticker)
    if not detail:
        raise HTTPException(status_code=404, detail=f"Details not found for {ticker}")
    return detail


# ── Watchlist ────────────────────────────────────────────

@router.get("/watchlist", response_model=List[WatchlistItemResponse])
async def get_watchlist(
    current_user: User = Depends(get_current_user_dependency),
    db: Session = Depends(get_db),
):
    """Get user's watchlist."""
    return (
        db.query(WatchlistItem)
        .filter(WatchlistItem.user_id == current_user.id)
        .order_by(WatchlistItem.created_at.desc())
        .all()
    )


@router.post("/watchlist", response_model=WatchlistItemResponse, status_code=status.HTTP_201_CREATED)
async def add_to_watchlist(
    data: WatchlistAdd,
    current_user: User = Depends(get_current_user_dependency),
    db: Session = Depends(get_db),
):
    """Add a ticker to user's watchlist."""
    existing = db.query(WatchlistItem).filter(
        WatchlistItem.user_id == current_user.id,
        WatchlistItem.ticker == data.ticker,
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail=f"{data.ticker} is already in your watchlist")

    item = WatchlistItem(
        user_id=current_user.id,
        ticker=data.ticker,
        name=data.name,
        asset_type=data.asset_type,
    )
    db.add(item)
    db.commit()
    db.refresh(item)
    return item


@router.delete("/watchlist/{ticker}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_from_watchlist(
    ticker: str,
    current_user: User = Depends(get_current_user_dependency),
    db: Session = Depends(get_db),
):
    """Remove a ticker from user's watchlist."""
    item = db.query(WatchlistItem).filter(
        WatchlistItem.user_id == current_user.id,
        WatchlistItem.ticker == ticker.upper(),
    ).first()
    if not item:
        raise HTTPException(status_code=404, detail="Watchlist item not found")
    db.delete(item)
    db.commit()
