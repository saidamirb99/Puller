import api from './api';

/* ── Enums ──────────────────────────────────────────────── */

export enum AssetType {
  STOCK = 'STOCK',
  ETF = 'ETF',
}

export enum InvestmentTxnType {
  BUY = 'BUY',
  SELL = 'SELL',
}

/* ── Interfaces ─────────────────────────────────────────── */

export interface InvestmentHolding {
  id: string;
  user_id: string;
  ticker: string;
  name: string;
  asset_type: AssetType;
  total_shares: number;
  avg_cost: number;
  realized_pnl: number;
  notes: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface HoldingCreate {
  ticker: string;
  name: string;
  asset_type: AssetType;
  notes?: string;
}

export interface InvestmentTransaction {
  id: string;
  holding_id: string;
  user_id: string;
  txn_type: InvestmentTxnType;
  shares: number;
  price_per_share: number;
  total_amount: number;
  fees: number;
  txn_date: string;
  notes: string | null;
  created_at: string;
}

export interface TransactionCreate {
  txn_type: InvestmentTxnType;
  shares: number;
  price_per_share: number;
  fees?: number;
  txn_date: string;
  notes?: string;
}

export interface HoldingSummary {
  id: string;
  ticker: string;
  name: string;
  asset_type: AssetType;
  total_shares: number;
  avg_cost: number;
  realized_pnl: number;
  current_price: number;
  previous_close: number;
  market_value: number;
  cost_basis: number;
  unrealized_pnl: number;
  unrealized_pnl_pct: number;
  day_change: number;
  day_change_pct: number;
  allocation_pct: number;
}

export interface PortfolioSummary {
  total_value: number;
  total_cost: number;
  total_pnl: number;
  total_pnl_pct: number;
  day_change: number;
  day_change_pct: number;
  holdings_count: number;
  holdings: HoldingSummary[];
}

export interface MarketQuote {
  ticker: string;
  name: string;
  price: number;
  change: number;
  change_pct: number;
  previous_close: number;
  day_high: number;
  day_low: number;
  volume: number;
  market_cap: number | null;
  currency: string;
  display_name?: string;
}

export interface SearchResult {
  ticker: string;
  name: string;
  asset_type: string;
  exchange: string;
}

export interface HistoryPoint {
  date: string;
  close: number;
  open?: number;
  high?: number;
  low?: number;
  volume?: number;
}

export interface MarketStatus {
  status: 'open' | 'closed' | 'pre-market' | 'after-hours';
  timestamp: string;
}

export interface TopMovers {
  gainers: MarketQuote[];
  losers: MarketQuote[];
}

export interface SectorPerformance {
  ticker: string;
  sector: string;
  price: number;
  change: number;
  change_pct: number;
}

export interface MarketOverview {
  market_status: MarketStatus;
  indices: MarketQuote[];
  top_movers: TopMovers;
  sectors: SectorPerformance[];
}

export interface AssetDetail {
  ticker: string;
  name: string;
  price: number;
  change: number;
  change_pct: number;
  previous_close: number;
  open: number | null;
  day_high: number | null;
  day_low: number | null;
  volume: number | null;
  avg_volume: number | null;
  market_cap: number | null;
  pe_ratio: number | null;
  eps: number | null;
  beta: number | null;
  dividend_yield: number | null;
  year_high: number | null;
  year_low: number | null;
  fifty_day_avg: number | null;
  two_hundred_day_avg: number | null;
  currency: string;
  exchange: string | null;
  quote_type: string | null;
  description: string | null;
  sector: string | null;
  industry: string | null;
  website: string | null;
  employees: number | null;
  city: string | null;
  country: string | null;
}

export interface WatchlistItem {
  id: string;
  ticker: string;
  name: string;
  asset_type: string;
  created_at: string;
}

/* ── Service ────────────────────────────────────────────── */

class InvestmentService {
  /* Holdings */
  async getHoldings(): Promise<InvestmentHolding[]> {
    const res = await api.get<InvestmentHolding[]>('/api/v1/investments/holdings');
    return res.data;
  }

  async createHolding(data: HoldingCreate): Promise<InvestmentHolding> {
    const res = await api.post<InvestmentHolding>('/api/v1/investments/holdings', data);
    return res.data;
  }

  async deleteHolding(id: string): Promise<void> {
    await api.delete(`/api/v1/investments/holdings/${id}`);
  }

  /* Transactions */
  async getTransactions(holdingId: string): Promise<InvestmentTransaction[]> {
    const res = await api.get<InvestmentTransaction[]>(`/api/v1/investments/holdings/${holdingId}/transactions`);
    return res.data;
  }

  async recordTransaction(holdingId: string, data: TransactionCreate): Promise<InvestmentTransaction> {
    const res = await api.post<InvestmentTransaction>(`/api/v1/investments/holdings/${holdingId}/transactions`, data);
    return res.data;
  }

  /* Portfolio Summary */
  async getSummary(): Promise<PortfolioSummary> {
    const res = await api.get<PortfolioSummary>('/api/v1/investments/summary');
    return res.data;
  }

  /* Market Data */
  async getQuote(ticker: string): Promise<MarketQuote> {
    const res = await api.get<MarketQuote>(`/api/v1/investments/market/quote/${ticker}`);
    return res.data;
  }

  async searchTicker(query: string): Promise<SearchResult[]> {
    const res = await api.get<SearchResult[]>('/api/v1/investments/market/search', { params: { q: query } });
    return res.data;
  }

  async getHistory(ticker: string, period = '1y'): Promise<HistoryPoint[]> {
    const res = await api.get<HistoryPoint[]>(`/api/v1/investments/market/history/${ticker}`, { params: { period } });
    return res.data;
  }

  /* Market Overview */
  async getMarketOverview(): Promise<MarketOverview> {
    const res = await api.get<MarketOverview>('/api/v1/investments/market/overview');
    return res.data;
  }

  async getIndices(): Promise<MarketQuote[]> {
    const res = await api.get<MarketQuote[]>('/api/v1/investments/market/indices');
    return res.data;
  }

  async getTopMovers(limit = 8): Promise<TopMovers> {
    const res = await api.get<TopMovers>('/api/v1/investments/market/movers', { params: { limit } });
    return res.data;
  }

  async getSectors(): Promise<SectorPerformance[]> {
    const res = await api.get<SectorPerformance[]>('/api/v1/investments/market/sectors');
    return res.data;
  }

  async getAssetDetail(ticker: string): Promise<AssetDetail> {
    const res = await api.get<AssetDetail>(`/api/v1/investments/market/detail/${ticker}`);
    return res.data;
  }

  /* Watchlist */
  async getWatchlist(): Promise<WatchlistItem[]> {
    const res = await api.get<WatchlistItem[]>('/api/v1/investments/watchlist');
    return res.data;
  }

  async addToWatchlist(data: { ticker: string; name: string; asset_type?: string }): Promise<WatchlistItem> {
    const res = await api.post<WatchlistItem>('/api/v1/investments/watchlist', data);
    return res.data;
  }

  async removeFromWatchlist(ticker: string): Promise<void> {
    await api.delete(`/api/v1/investments/watchlist/${ticker}`);
  }
}

export default new InvestmentService();
