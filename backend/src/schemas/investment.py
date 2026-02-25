from pydantic import BaseModel, Field, field_validator
from datetime import datetime
from typing import Optional, List
from src.models.investment import AssetType, InvestmentTxnType


# ── Holding Schemas ──────────────────────────────────────

class HoldingCreate(BaseModel):
    ticker: str = Field(..., min_length=1, max_length=20)
    name: str = Field(..., min_length=1, max_length=200)
    asset_type: AssetType = AssetType.STOCK
    notes: Optional[str] = None

    @field_validator('ticker')
    @classmethod
    def ticker_uppercase(cls, v: str) -> str:
        return v.strip().upper()


class HoldingResponse(BaseModel):
    id: str
    user_id: str
    ticker: str
    name: str
    asset_type: AssetType
    total_shares: float
    avg_cost: float
    realized_pnl: float
    notes: Optional[str] = None
    is_active: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# ── Transaction Schemas ──────────────────────────────────

class TransactionCreate(BaseModel):
    txn_type: InvestmentTxnType
    shares: float = Field(..., gt=0)
    price_per_share: float = Field(..., gt=0)
    fees: float = Field(default=0.0, ge=0)
    txn_date: datetime
    notes: Optional[str] = None


class TransactionResponse(BaseModel):
    id: str
    holding_id: str
    user_id: str
    txn_type: InvestmentTxnType
    shares: float
    price_per_share: float
    total_amount: float
    fees: float
    txn_date: datetime
    notes: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


# ── Portfolio Summary Schemas ────────────────────────────

class HoldingSummary(BaseModel):
    id: str
    ticker: str
    name: str
    asset_type: AssetType
    total_shares: float
    avg_cost: float
    realized_pnl: float
    current_price: float
    previous_close: float
    market_value: float
    cost_basis: float
    unrealized_pnl: float
    unrealized_pnl_pct: float
    day_change: float
    day_change_pct: float
    allocation_pct: float


class PortfolioSummary(BaseModel):
    total_value: float
    total_cost: float
    total_pnl: float
    total_pnl_pct: float
    day_change: float
    day_change_pct: float
    holdings_count: int
    holdings: List[HoldingSummary]


# ── Market Data Schemas ──────────────────────────────────

class MarketQuote(BaseModel):
    ticker: str
    name: str
    price: float
    change: float
    change_pct: float
    previous_close: float
    day_high: float
    day_low: float
    volume: int
    market_cap: Optional[float] = None
    currency: str = "USD"
    display_name: Optional[str] = None


class SearchResult(BaseModel):
    ticker: str
    name: str
    asset_type: str
    exchange: str


class HistoryPoint(BaseModel):
    date: str
    close: float
    open: Optional[float] = None
    high: Optional[float] = None
    low: Optional[float] = None
    volume: Optional[int] = None


class MarketStatus(BaseModel):
    status: str
    timestamp: str


class TopMovers(BaseModel):
    gainers: List[MarketQuote]
    losers: List[MarketQuote]


class SectorPerformance(BaseModel):
    ticker: str
    sector: str
    price: float
    change: float
    change_pct: float


class MarketOverview(BaseModel):
    market_status: MarketStatus
    indices: List[MarketQuote]
    top_movers: TopMovers
    sectors: List[SectorPerformance]


class AssetDetail(BaseModel):
    ticker: str
    name: str
    price: float
    change: float
    change_pct: float
    previous_close: float
    open: Optional[float] = None
    day_high: Optional[float] = None
    day_low: Optional[float] = None
    volume: Optional[int] = None
    avg_volume: Optional[int] = None
    market_cap: Optional[float] = None
    pe_ratio: Optional[float] = None
    eps: Optional[float] = None
    beta: Optional[float] = None
    dividend_yield: Optional[float] = None
    year_high: Optional[float] = None
    year_low: Optional[float] = None
    fifty_day_avg: Optional[float] = None
    two_hundred_day_avg: Optional[float] = None
    currency: str = "USD"
    exchange: Optional[str] = None
    quote_type: Optional[str] = None
    description: Optional[str] = None
    sector: Optional[str] = None
    industry: Optional[str] = None
    website: Optional[str] = None
    employees: Optional[int] = None
    city: Optional[str] = None
    country: Optional[str] = None


# ── Watchlist Schemas ────────────────────────────────────

class WatchlistAdd(BaseModel):
    ticker: str = Field(..., min_length=1, max_length=20)
    name: str = Field(..., min_length=1, max_length=200)
    asset_type: str = "STOCK"

    @field_validator('ticker')
    @classmethod
    def ticker_uppercase(cls, v: str) -> str:
        return v.strip().upper()


class WatchlistItemResponse(BaseModel):
    id: str
    ticker: str
    name: str
    asset_type: str
    created_at: datetime

    class Config:
        from_attributes = True
