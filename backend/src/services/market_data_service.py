"""Yahoo Finance market data service with in-memory TTL caching."""
import time
from datetime import datetime, timezone
from typing import Optional, Dict, List
import yfinance as yf


class _TTLCache:
    """Simple in-memory cache with per-key TTL."""

    def __init__(self):
        self._store: Dict[str, tuple] = {}  # key -> (value, expire_at)

    def get(self, key: str):
        entry = self._store.get(key)
        if entry is None:
            return None
        value, expire_at = entry
        if time.time() > expire_at:
            del self._store[key]
            return None
        return value

    def set(self, key: str, value, ttl_seconds: int):
        self._store[key] = (value, time.time() + ttl_seconds)


_cache = _TTLCache()

QUOTE_TTL = 300       # 5 minutes
SEARCH_TTL = 3600     # 1 hour
HISTORY_TTL = 900     # 15 minutes
OVERVIEW_TTL = 120    # 2 minutes
DETAIL_TTL = 600      # 10 minutes

# ── Index & sector definitions ────────────────────────────
MARKET_INDICES = {
    "^GSPC": "S&P 500",
    "^IXIC": "NASDAQ",
    "^DJI": "Dow Jones",
    "^RUT": "Russell 2000",
    "^VIX": "VIX",
}

SECTOR_ETFS = {
    "XLK": "Technology",
    "XLV": "Healthcare",
    "XLF": "Financials",
    "XLE": "Energy",
    "XLY": "Consumer Disc.",
    "XLI": "Industrials",
    "XLC": "Communication",
    "XLU": "Utilities",
    "XLP": "Consumer Staples",
    "XLRE": "Real Estate",
    "XLB": "Materials",
}

POPULAR_TICKERS = [
    "AAPL", "MSFT", "GOOGL", "AMZN", "NVDA", "META", "TSLA", "BRK-B",
    "JPM", "V", "UNH", "JNJ", "WMT", "MA", "PG", "HD", "XOM", "CVX",
    "BAC", "KO", "PFE", "ABBV", "MRK", "PEP", "COST", "TMO", "AVGO",
    "CSCO", "ACN", "MCD", "ABT", "CRM", "NKE", "AMD", "INTC", "NFLX",
    "DIS", "PYPL", "QCOM", "T",
]


def _fast_quote(ticker_obj) -> Optional[dict]:
    """Extract quote from fast_info (fallback when .info is incomplete)."""
    try:
        fi = ticker_obj.fast_info
        if not fi:
            return None
        price = float(getattr(fi, "last_price", 0) or 0)
        if price == 0:
            return None
        prev_close = float(getattr(fi, "previous_close", 0) or price)
        change = price - prev_close
        change_pct = (change / prev_close * 100) if prev_close else 0
        return {
            "ticker": ticker_obj.ticker,
            "name": ticker_obj.ticker,
            "price": round(price, 2),
            "change": round(change, 2),
            "change_pct": round(change_pct, 2),
            "previous_close": round(prev_close, 2),
            "day_high": round(float(getattr(fi, "day_high", 0) or 0), 2),
            "day_low": round(float(getattr(fi, "day_low", 0) or 0), 2),
            "volume": int(getattr(fi, "last_volume", 0) or 0),
            "market_cap": getattr(fi, "market_cap", None),
            "currency": str(getattr(fi, "currency", "USD") or "USD"),
        }
    except Exception:
        return None


def get_quote(ticker: str) -> Optional[dict]:
    """Get current quote for a single ticker."""
    key = f"quote:{ticker.upper()}"
    cached = _cache.get(key)
    if cached is not None:
        return cached

    try:
        t = yf.Ticker(ticker.upper())
        info = t.info
        if not info or "regularMarketPrice" not in info:
            result = _fast_quote(t)
            if result:
                _cache.set(key, result, QUOTE_TTL)
            return result

        price = float(info.get("regularMarketPrice", 0) or info.get("currentPrice", 0))
        prev_close = float(info.get("regularMarketPreviousClose", 0) or info.get("previousClose", price))
        change = price - prev_close
        change_pct = (change / prev_close * 100) if prev_close else 0

        result = {
            "ticker": ticker.upper(),
            "name": info.get("shortName", "") or info.get("longName", ticker.upper()),
            "price": round(price, 2),
            "change": round(change, 2),
            "change_pct": round(change_pct, 2),
            "previous_close": round(prev_close, 2),
            "day_high": round(float(info.get("dayHigh", 0) or 0), 2),
            "day_low": round(float(info.get("dayLow", 0) or 0), 2),
            "volume": int(info.get("volume", 0) or 0),
            "market_cap": info.get("marketCap"),
            "currency": info.get("currency", "USD"),
        }
        _cache.set(key, result, QUOTE_TTL)
        return result
    except Exception:
        return None


def get_batch_quotes(tickers: List[str]) -> Dict[str, dict]:
    """Get quotes for multiple tickers. Returns dict keyed by ticker."""
    results = {}
    uncached = []

    for t in tickers:
        key = f"quote:{t.upper()}"
        cached = _cache.get(key)
        if cached is not None:
            results[t.upper()] = cached
        else:
            uncached.append(t.upper())

    if not uncached:
        return results

    for ticker in uncached:
        quote = get_quote(ticker)
        if quote:
            results[ticker] = quote

    return results


def search_ticker(query: str) -> List[dict]:
    """Search for tickers matching a query string."""
    key = f"search:{query.lower()}"
    cached = _cache.get(key)
    if cached is not None:
        return cached

    try:
        results = []
        search = yf.Search(query)
        quotes = getattr(search, 'quotes', []) or []

        for item in quotes[:10]:
            q_type = item.get("quoteType", "").upper()
            if q_type not in ("EQUITY", "ETF"):
                continue
            results.append({
                "ticker": item.get("symbol", ""),
                "name": item.get("shortname", "") or item.get("longname", ""),
                "asset_type": "ETF" if q_type == "ETF" else "STOCK",
                "exchange": item.get("exchange", ""),
            })

        _cache.set(key, results, SEARCH_TTL)
        return results
    except Exception:
        return []


def get_history(ticker: str, period: str = "1y") -> List[dict]:
    """Get historical closing prices for a ticker."""
    valid_periods = {"1d", "5d", "1mo", "3mo", "6mo", "1y", "2y", "5y", "max"}
    if period not in valid_periods:
        period = "1y"

    key = f"history:{ticker.upper()}:{period}"
    cached = _cache.get(key)
    if cached is not None:
        return cached

    try:
        t = yf.Ticker(ticker.upper())
        hist = t.history(period=period)
        if hist.empty:
            return []

        results = []
        for date, row in hist.iterrows():
            results.append({
                "date": date.strftime("%Y-%m-%d"),
                "close": round(float(row["Close"]), 2),
                "open": round(float(row.get("Open", 0)), 2),
                "high": round(float(row.get("High", 0)), 2),
                "low": round(float(row.get("Low", 0)), 2),
                "volume": int(row.get("Volume", 0)),
            })

        _cache.set(key, results, HISTORY_TTL)
        return results
    except Exception:
        return []


# ── Market Overview ─────────────────────────────────────────

def get_market_status() -> dict:
    """Determine if NYSE is currently open, pre-market, or closed."""
    now = datetime.now(timezone.utc)
    hour_et = (now.hour - 5) % 24  # approximate ET offset
    weekday = now.weekday()

    if weekday >= 5:
        status = "closed"
    elif 4 <= hour_et < 9.5:
        status = "pre-market"
    elif 9.5 <= hour_et < 16:
        status = "open"
    elif 16 <= hour_et < 20:
        status = "after-hours"
    else:
        status = "closed"

    return {
        "status": status,
        "timestamp": now.isoformat(),
    }


def get_market_indices() -> List[dict]:
    """Get current data for major market indices."""
    key = "market:indices"
    cached = _cache.get(key)
    if cached is not None:
        return cached

    results = []
    for symbol, name in MARKET_INDICES.items():
        quote = get_quote(symbol)
        if quote:
            quote["display_name"] = name
            results.append(quote)

    _cache.set(key, results, OVERVIEW_TTL)
    return results


def get_top_movers(limit: int = 10) -> dict:
    """Get top gainers and losers from popular stocks."""
    key = f"market:movers:{limit}"
    cached = _cache.get(key)
    if cached is not None:
        return cached

    quotes = get_batch_quotes(POPULAR_TICKERS)
    all_quotes = list(quotes.values())
    all_quotes = [q for q in all_quotes if q.get("price", 0) > 0]

    sorted_by_change = sorted(all_quotes, key=lambda x: x.get("change_pct", 0), reverse=True)

    result = {
        "gainers": sorted_by_change[:limit],
        "losers": sorted_by_change[-limit:][::-1],  # worst first
    }

    _cache.set(key, result, OVERVIEW_TTL)
    return result


def get_sector_performance() -> List[dict]:
    """Get daily performance of sector ETFs."""
    key = "market:sectors"
    cached = _cache.get(key)
    if cached is not None:
        return cached

    results = []
    quotes = get_batch_quotes(list(SECTOR_ETFS.keys()))

    for symbol, sector_name in SECTOR_ETFS.items():
        quote = quotes.get(symbol)
        if quote:
            results.append({
                "ticker": symbol,
                "sector": sector_name,
                "price": quote["price"],
                "change": quote["change"],
                "change_pct": quote["change_pct"],
            })

    results.sort(key=lambda x: x["change_pct"], reverse=True)
    _cache.set(key, results, OVERVIEW_TTL)
    return results


def get_asset_detail(ticker: str) -> Optional[dict]:
    """Get comprehensive details for a single asset."""
    key = f"detail:{ticker.upper()}"
    cached = _cache.get(key)
    if cached is not None:
        return cached

    try:
        t = yf.Ticker(ticker.upper())
        info = t.info
        if not info:
            return None

        price = float(info.get("regularMarketPrice", 0) or info.get("currentPrice", 0))
        prev_close = float(info.get("regularMarketPreviousClose", 0) or info.get("previousClose", price))
        change = price - prev_close
        change_pct = (change / prev_close * 100) if prev_close else 0

        result = {
            "ticker": ticker.upper(),
            "name": info.get("shortName", "") or info.get("longName", ticker.upper()),
            "price": round(price, 2),
            "change": round(change, 2),
            "change_pct": round(change_pct, 2),
            "previous_close": round(prev_close, 2),
            "open": round(float(info.get("open", 0) or info.get("regularMarketOpen", 0) or 0), 2),
            "day_high": round(float(info.get("dayHigh", 0) or 0), 2),
            "day_low": round(float(info.get("dayLow", 0) or 0), 2),
            "volume": int(info.get("volume", 0) or 0),
            "avg_volume": int(info.get("averageVolume", 0) or 0),
            "market_cap": info.get("marketCap"),
            "pe_ratio": info.get("trailingPE"),
            "eps": info.get("trailingEps"),
            "beta": info.get("beta"),
            "dividend_yield": info.get("dividendYield"),
            "year_high": info.get("fiftyTwoWeekHigh"),
            "year_low": info.get("fiftyTwoWeekLow"),
            "fifty_day_avg": info.get("fiftyDayAverage"),
            "two_hundred_day_avg": info.get("twoHundredDayAverage"),
            "currency": info.get("currency", "USD"),
            "exchange": info.get("exchange", ""),
            "quote_type": info.get("quoteType", "EQUITY"),
            # Company info
            "description": info.get("longBusinessSummary", ""),
            "sector": info.get("sector", ""),
            "industry": info.get("industry", ""),
            "website": info.get("website", ""),
            "employees": info.get("fullTimeEmployees"),
            "city": info.get("city", ""),
            "country": info.get("country", ""),
        }

        _cache.set(key, result, DETAIL_TTL)
        return result
    except Exception:
        # Fallback to fast_info
        try:
            t = yf.Ticker(ticker.upper())
            fq = _fast_quote(t)
            if fq:
                fq.update({"description": "", "sector": "", "industry": ""})
                _cache.set(key, fq, DETAIL_TTL)
            return fq
        except Exception:
            return None
