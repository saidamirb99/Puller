import React, { useEffect, useState, useMemo, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  PieChart, Pie, Cell, AreaChart, Area, ResponsiveContainer, Tooltip, XAxis,
} from 'recharts';
import { AppLayout } from '../components/layout/AppLayout';
import { useAuth } from '../context/AuthContext';
import investmentService, {
  PortfolioSummary, HoldingSummary, InvestmentTransaction,
  MarketOverview, MarketQuote,
  SearchResult, InvestmentTxnType, HistoryPoint, WatchlistItem,
} from '../services/investment.service';
import { containerV, itemV } from '../utils/motion';

/* ── Constants ─────────────────────────────────────────── */
const COLORS = ['#F5C518', '#00B894', '#0984E3', '#E17055', '#E84393', '#F0932B', '#00CEC9', '#FF6B35'];
const makeFmt = (c: string) => (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: c }).format(n);
const STATUS_LABELS: Record<string, { label: string; color: string; dot: string }> = {
  'open': { label: 'Market Open', color: 'text-[#00B894]', dot: 'bg-[#00B894]' },
  'closed': { label: 'Market Closed', color: 'text-[#E17055]', dot: 'bg-[#E17055]' },
  'pre-market': { label: 'Pre-Market', color: 'text-[#F0932B]', dot: 'bg-[#F0932B]' },
  'after-hours': { label: 'After Hours', color: 'text-[#0984E3]', dot: 'bg-[#0984E3]' },
};

type Tab = 'market' | 'portfolio' | 'watchlist';

/* ── Chart Tooltip ─────────────────────────────────────── */
const ChartTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[#0c0c18]/90 border border-white/[0.07] rounded-xl px-4 py-2.5 shadow-xl backdrop-blur-xl">
      <p className="text-gray-400 text-[10px] mb-1">{label}</p>
      <p className="text-sm font-semibold text-[#F5C518]">${payload[0].value?.toLocaleString()}</p>
    </div>
  );
};

/* ── Skeleton ──────────────────────────────────────────── */
const Skeleton = ({ className = '' }: { className?: string }) => (
  <div className={`bg-white/[0.06] rounded-xl animate-pulse ${className}`} />
);

/* ══════════════════════════════════════════════════════════
   MAIN COMPONENT
   ══════════════════════════════════════════════════════════ */
export const Investments: React.FC = () => {
  const { user } = useAuth();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const currency = user?.default_currency || 'USD';
  const fmt = useMemo(() => makeFmt(currency), [currency]);

  /* ── State ──────────────────────────────────────────── */
  const [activeTab, setActiveTab] = useState<Tab>('market');
  const [overview, setOverview] = useState<MarketOverview | null>(null);
  const [summary, setSummary] = useState<PortfolioSummary | null>(null);
  const [watchlist, setWatchlist] = useState<WatchlistItem[]>([]);
  const [watchlistQuotes, setWatchlistQuotes] = useState<Record<string, MarketQuote>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [moversTab, setMoversTab] = useState<'gainers' | 'losers'>('gainers');

  // Portfolio tab state
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [expandedTxns, setExpandedTxns] = useState<InvestmentTransaction[]>([]);
  const [historyData, setHistoryData] = useState<HistoryPoint[]>([]);
  const [historyTicker, setHistoryTicker] = useState('');

  // Search overlay
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // Record Transaction modal
  const [showTxnModal, setShowTxnModal] = useState(false);
  const [txnHolding, setTxnHolding] = useState<HoldingSummary | null>(null);
  const [txnType, setTxnType] = useState<InvestmentTxnType>(InvestmentTxnType.BUY);
  const [txnShares, setTxnShares] = useState('');
  const [txnPrice, setTxnPrice] = useState('');
  const [txnDate, setTxnDate] = useState(new Date().toISOString().slice(0, 10));
  const [txnFees, setTxnFees] = useState('');

  const searchTimer = useRef<ReturnType<typeof setTimeout>>();

  /* ── Data Loading ───────────────────────────────────── */
  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      const [overviewData, summaryData, watchlistData] = await Promise.all([
        investmentService.getMarketOverview().catch(() => null),
        investmentService.getSummary().catch(() => null),
        investmentService.getWatchlist().catch(() => []),
      ]);
      if (overviewData) setOverview(overviewData);
      if (summaryData) setSummary(summaryData);
      setWatchlist(watchlistData);

      // Load watchlist quotes
      if (watchlistData.length > 0) {
        const quotes: Record<string, MarketQuote> = {};
        await Promise.all(
          watchlistData.map(async (item) => {
            try {
              const q = await investmentService.getQuote(item.ticker);
              quotes[item.ticker] = q;
            } catch { /* skip */ }
          })
        );
        setWatchlistQuotes(quotes);
      }

      // Load first holding history for portfolio chart
      if (summaryData && summaryData.holdings.length > 0 && !historyTicker) {
        const ticker = summaryData.holdings[0].ticker;
        setHistoryTicker(ticker);
        const hist = await investmentService.getHistory(ticker, '6mo').catch(() => []);
        setHistoryData(hist);
      }
    } catch (e) {
      console.error('Failed to load investments:', e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  /* ── Search ─────────────────────────────────────────── */
  const handleSearch = (query: string) => {
    setSearchQuery(query);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    if (!query.trim()) { setSearchResults([]); return; }
    setIsSearching(true);
    searchTimer.current = setTimeout(async () => {
      try {
        const results = await investmentService.searchTicker(query);
        setSearchResults(results);
      } catch { setSearchResults([]); }
      finally { setIsSearching(false); }
    }, 400);
  };

  /* ── Record Transaction ─────────────────────────────── */
  const handleRecordTxn = async () => {
    if (!txnHolding || !txnShares || !txnPrice) return;
    try {
      await investmentService.recordTransaction(txnHolding.id, {
        txn_type: txnType,
        shares: parseFloat(txnShares),
        price_per_share: parseFloat(txnPrice),
        fees: txnFees ? parseFloat(txnFees) : 0,
        txn_date: new Date(txnDate + 'T12:00:00').toISOString(),
      });
      resetTxnModal();
      loadData();
    } catch (e: any) {
      alert(e.response?.data?.detail || 'Failed to record transaction');
    }
  };

  const resetTxnModal = () => {
    setShowTxnModal(false);
    setTxnHolding(null);
    setTxnShares(''); setTxnPrice('');
    setTxnDate(new Date().toISOString().slice(0, 10)); setTxnFees('');
  };

  /* ── Expand Holding ─────────────────────────────────── */
  const toggleExpand = async (holdingId: string) => {
    if (expandedId === holdingId) { setExpandedId(null); return; }
    setExpandedId(holdingId);
    try {
      const txns = await investmentService.getTransactions(holdingId);
      setExpandedTxns(txns);
    } catch { setExpandedTxns([]); }
  };

  /* ── Load history for a ticker ──────────────────────── */
  const loadHistory = async (ticker: string) => {
    setHistoryTicker(ticker);
    try {
      const hist = await investmentService.getHistory(ticker, '6mo');
      setHistoryData(hist);
    } catch { setHistoryData([]); }
  };

  /* ── Watchlist toggle ───────────────────────────────── */
  const toggleWatchlist = async (ticker: string, name: string) => {
    const isInWatchlist = watchlist.some(w => w.ticker === ticker);
    try {
      if (isInWatchlist) {
        await investmentService.removeFromWatchlist(ticker);
        setWatchlist(prev => prev.filter(w => w.ticker !== ticker));
      } else {
        const item = await investmentService.addToWatchlist({ ticker, name });
        setWatchlist(prev => [item, ...prev]);
        try {
          const q = await investmentService.getQuote(ticker);
          setWatchlistQuotes(prev => ({ ...prev, [ticker]: q }));
        } catch { /* skip */ }
      }
    } catch { /* skip */ }
  };

  const openBuySell = (holding: HoldingSummary, type: InvestmentTxnType) => {
    setTxnHolding(holding);
    setTxnType(type);
    setTxnPrice(holding.current_price.toString());
    setShowTxnModal(true);
  };

  /* ── Derived data ───────────────────────────────────── */
  const donutData = useMemo(() =>
    (summary?.holdings || [])
      .filter(h => h.market_value > 0)
      .map((h, i) => ({ name: h.ticker, value: h.market_value, color: COLORS[i % COLORS.length] })),
    [summary],
  );

  const marketStatus = overview?.market_status;
  const statusInfo = STATUS_LABELS[marketStatus?.status || 'closed'] || STATUS_LABELS['closed'];

  const totalValue = summary?.total_value || 0;
  const totalCost = summary?.total_cost || 0;
  const totalPnl = summary?.total_pnl || 0;
  const totalPnlPct = summary?.total_pnl_pct || 0;
  const dayChange = summary?.day_change || 0;
  const dayChangePct = summary?.day_change_pct || 0;

  /* ══════════════════════════════════════════════════════
     RENDER
     ══════════════════════════════════════════════════════ */
  return (
    <AppLayout>
      <div className="p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto">

        {/* ═══ TAB BAR ════════════════════════════════════════ */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex gap-1 bg-white/[0.04] rounded-2xl p-1 border border-white/[0.06]">
            {(['market', 'portfolio', 'watchlist'] as Tab[]).map(tab => (
              <button key={tab} onClick={() => setActiveTab(tab)}
                className={`px-4 sm:px-6 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                  activeTab === tab
                    ? 'bg-[#F5C518]/15 text-[#F5C518] border border-[#F5C518]/30'
                    : 'text-gray-500 hover:text-white'
                }`}>
                {t(`investments.tabs.${tab}`)}
              </button>
            ))}
          </div>
          <button onClick={() => setShowSearch(true)}
            className="w-10 h-10 rounded-xl bg-white/[0.06] border border-white/[0.07] flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/[0.1] transition-all">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
          </button>
        </div>

        <motion.div variants={containerV} initial="hidden" animate={isLoading ? 'hidden' : 'show'} className="space-y-6">

          {/* ═══ MARKET TAB ══════════════════════════════════ */}
          {activeTab === 'market' && (
            <>
              {/* ── Hero Section ──────────────────────────── */}
              <motion.div variants={itemV}>
                <div className="relative rounded-3xl overflow-hidden"
                  style={{ background: 'linear-gradient(135deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.02) 100%)', backdropFilter: 'blur(40px)', WebkitBackdropFilter: 'blur(40px)' }}>
                  <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#F5C518] to-transparent opacity-80" />
                  <div className="absolute -right-16 -top-16 w-56 h-56 rounded-full"
                    style={{ background: 'radial-gradient(circle, rgba(245,197,24,0.12) 0%, transparent 70%)' }} />
                  <div className="absolute -left-12 -bottom-12 w-40 h-40 rounded-full"
                    style={{ background: 'radial-gradient(circle, rgba(0,184,148,0.08) 0%, transparent 70%)' }} />

                  <div className="relative z-10 p-5 sm:p-7 lg:p-8">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${statusInfo.dot} animate-pulse`} />
                        <span className={`text-xs font-semibold ${statusInfo.color}`}>{statusInfo.label}</span>
                      </div>
                    </div>
                    <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-white tracking-tight mb-1">
                      {t('investments.hero.title')}
                    </h1>
                    <p className="text-gray-500 text-sm">{t('investments.hero.subtitle')}</p>

                    {/* ── S&P 500 sparkline in hero ── */}
                    {overview && overview.indices.length > 0 && (
                      <div className="mt-6 flex flex-col sm:flex-row items-start sm:items-end gap-4 sm:gap-8">
                        {overview.indices.slice(0, 3).map((idx) => (
                          <button key={idx.ticker} onClick={() => navigate(`/investments/asset/${encodeURIComponent(idx.ticker)}`)}
                            className="group text-left">
                            <p className="text-gray-500 text-[10px] uppercase tracking-wider font-medium">
                              {idx.display_name || idx.name}
                            </p>
                            <p className="text-white font-bold text-lg group-hover:text-[#F5C518] transition-colors">
                              {idx.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </p>
                            <p className={`text-xs font-semibold ${idx.change >= 0 ? 'text-[#00B894]' : 'text-[#E17055]'}`}>
                              {idx.change >= 0 ? '+' : ''}{idx.change.toFixed(2)} ({idx.change_pct >= 0 ? '+' : ''}{idx.change_pct.toFixed(2)}%)
                            </p>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>

              {/* ── Market Indices ─────────────────────────── */}
              {overview && overview.indices.length > 0 && (
                <motion.div variants={itemV}>
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-1 h-4 rounded-full bg-[#0984E3]" />
                    <h3 className="text-white font-semibold text-sm">{t('investments.indices.title')}</h3>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                    {overview.indices.map((idx) => (
                      <button key={idx.ticker} onClick={() => navigate(`/investments/asset/${encodeURIComponent(idx.ticker)}`)}
                        className="glass rounded-2xl p-4 text-left hover:bg-white/[0.06] transition-all group">
                        <p className="text-gray-500 text-[10px] uppercase tracking-wider font-medium truncate">
                          {idx.display_name || idx.name}
                        </p>
                        <p className="text-white font-bold text-base mt-1 group-hover:text-[#F5C518] transition-colors">
                          {idx.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </p>
                        <div className="flex items-center gap-1.5 mt-1">
                          <span className={`text-xs font-semibold ${idx.change >= 0 ? 'text-[#00B894]' : 'text-[#E17055]'}`}>
                            {idx.change >= 0 ? '+' : ''}{idx.change_pct.toFixed(2)}%
                          </span>
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
                            stroke={idx.change >= 0 ? '#00B894' : '#E17055'} strokeWidth="2.5" strokeLinecap="round">
                            {idx.change >= 0
                              ? <polyline points="18 15 12 9 6 15" />
                              : <polyline points="6 9 12 15 18 9" />
                            }
                          </svg>
                        </div>
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}

              {/* ── Top Movers ────────────────────────────── */}
              {overview && (overview.top_movers.gainers.length > 0 || overview.top_movers.losers.length > 0) && (
                <motion.div variants={itemV}>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-1 h-4 rounded-full bg-[#F0932B]" />
                      <h3 className="text-white font-semibold text-sm">{t('investments.movers.title')}</h3>
                    </div>
                    <div className="flex gap-1 bg-white/[0.04] rounded-lg p-0.5 border border-white/[0.06]">
                      <button onClick={() => setMoversTab('gainers')}
                        className={`px-3 py-1.5 rounded-md text-[11px] font-semibold transition-all ${
                          moversTab === 'gainers' ? 'bg-[#00B894]/15 text-[#00B894]' : 'text-gray-500'
                        }`}>{t('investments.movers.gainers')}</button>
                      <button onClick={() => setMoversTab('losers')}
                        className={`px-3 py-1.5 rounded-md text-[11px] font-semibold transition-all ${
                          moversTab === 'losers' ? 'bg-[#E17055]/15 text-[#E17055]' : 'text-gray-500'
                        }`}>{t('investments.movers.losers')}</button>
                    </div>
                  </div>
                  <div className="flex gap-3 overflow-x-auto pb-2" style={{ scrollbarWidth: 'none' }}>
                    {(moversTab === 'gainers' ? overview.top_movers.gainers : overview.top_movers.losers).map((stock) => (
                      <button key={stock.ticker} onClick={() => navigate(`/investments/asset/${stock.ticker}`)}
                        className="glass rounded-2xl p-4 min-w-[160px] flex-shrink-0 text-left hover:bg-white/[0.06] transition-all group">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="w-8 h-8 rounded-lg flex items-center justify-center text-[10px] font-bold"
                            style={{ backgroundColor: moversTab === 'gainers' ? 'rgba(0,184,148,0.15)' : 'rgba(225,112,85,0.15)',
                              color: moversTab === 'gainers' ? '#00B894' : '#E17055' }}>
                            {stock.ticker.slice(0, 3)}
                          </div>
                          <div className="min-w-0">
                            <p className="text-white text-xs font-semibold group-hover:text-[#F5C518] transition-colors">{stock.ticker}</p>
                            <p className="text-gray-600 text-[10px] truncate max-w-[80px]">{stock.name}</p>
                          </div>
                        </div>
                        <p className="text-white font-bold text-sm">${stock.price.toFixed(2)}</p>
                        <p className={`text-[11px] font-semibold mt-0.5 ${stock.change_pct >= 0 ? 'text-[#00B894]' : 'text-[#E17055]'}`}>
                          {stock.change_pct >= 0 ? '+' : ''}{stock.change_pct.toFixed(2)}%
                        </p>
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}

              {/* ── Sector Heatmap ────────────────────────── */}
              {overview && overview.sectors.length > 0 && (
                <motion.div variants={itemV}>
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-1 h-4 rounded-full bg-[#E84393]" />
                    <h3 className="text-white font-semibold text-sm">{t('investments.sectors.title')}</h3>
                  </div>
                  <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-2">
                    {overview.sectors.map((sector) => {
                      const intensity = Math.min(Math.abs(sector.change_pct) / 3, 1);
                      const isPositive = sector.change_pct >= 0;
                      const bg = isPositive
                        ? `rgba(0,184,148,${0.08 + intensity * 0.22})`
                        : `rgba(225,112,85,${0.08 + intensity * 0.22})`;
                      return (
                        <div key={sector.ticker}
                          className="rounded-xl p-3 border border-white/[0.05] text-center transition-all hover:scale-[1.02]"
                          style={{ backgroundColor: bg }}>
                          <p className="text-gray-300 text-[10px] font-medium truncate">{sector.sector}</p>
                          <p className={`text-sm font-bold mt-1 ${isPositive ? 'text-[#00B894]' : 'text-[#E17055]'}`}>
                            {isPositive ? '+' : ''}{sector.change_pct.toFixed(2)}%
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </motion.div>
              )}

              {/* ── Portfolio Quick Glance ─────────────────── */}
              {summary && summary.holdings_count > 0 && (
                <motion.div variants={itemV}>
                  <div className="glass rounded-2xl p-5">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <div className="w-1 h-4 rounded-full bg-[#F5C518]" />
                        <h3 className="text-white font-semibold text-sm">{t('investments.portfolio')}</h3>
                      </div>
                      <button onClick={() => setActiveTab('portfolio')}
                        className="text-[#F5C518] text-xs font-semibold hover:underline">
                        {t('investments.viewPortfolio')} →
                      </button>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-4">
                      <div className="flex-1">
                        <p className="text-gray-500 text-[10px] uppercase tracking-wider">{t('investments.totalValue')}</p>
                        <p className="text-white font-extrabold text-2xl">{fmt(totalValue)}</p>
                        <p className={`text-xs font-semibold mt-1 ${dayChange >= 0 ? 'text-[#00B894]' : 'text-[#E17055]'}`}>
                          {dayChange >= 0 ? '+' : ''}{fmt(dayChange)} ({dayChangePct >= 0 ? '+' : ''}{dayChangePct.toFixed(2)}%) {t('investments.dayChange')}
                        </p>
                      </div>
                      <div className="flex gap-4">
                        <div>
                          <p className="text-gray-500 text-[10px] uppercase tracking-wider">{t('investments.totalReturn')}</p>
                          <p className={`font-bold text-base ${totalPnl >= 0 ? 'text-[#00B894]' : 'text-[#E17055]'}`}>
                            {totalPnl >= 0 ? '+' : ''}{fmt(totalPnl)}
                          </p>
                          <p className={`text-[10px] font-medium ${totalPnl >= 0 ? 'text-[#00B894]/70' : 'text-[#E17055]/70'}`}>
                            {totalPnlPct >= 0 ? '+' : ''}{totalPnlPct.toFixed(2)}%
                          </p>
                        </div>
                        <div>
                          <p className="text-gray-500 text-[10px] uppercase tracking-wider">{t('investments.holdings')}</p>
                          <p className="text-white font-bold text-base">{summary.holdings_count}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </>
          )}

          {/* ═══ PORTFOLIO TAB ═══════════════════════════════ */}
          {activeTab === 'portfolio' && (
            <>
              {/* ── Portfolio Hero ─────────────────────────── */}
              <motion.div variants={itemV}>
                <div className="relative rounded-3xl overflow-hidden"
                  style={{ background: 'linear-gradient(135deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.02) 100%)', backdropFilter: 'blur(40px)', WebkitBackdropFilter: 'blur(40px)' }}>
                  <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#F5C518] to-transparent opacity-80" />
                  <div className="absolute -right-12 -top-12 w-48 h-48 rounded-full"
                    style={{ background: 'radial-gradient(circle, rgba(245,197,24,0.10) 0%, transparent 70%)' }} />
                  <div className="relative z-10 p-5 sm:p-6 lg:p-8">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-6">
                      <div>
                        <p className="text-gray-500 text-xs uppercase tracking-widest font-semibold mb-1">{t('investments.portfolio')}</p>
                        <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
                          {isLoading ? <Skeleton className="w-48 h-10" /> : fmt(totalValue)}
                        </h2>
                        {!isLoading && (
                          <div className="flex items-center gap-3 mt-2">
                            <span className={`text-sm font-semibold ${dayChange >= 0 ? 'text-[#00B894]' : 'text-[#E17055]'}`}>
                              {dayChange >= 0 ? '+' : ''}{fmt(dayChange)} ({dayChangePct >= 0 ? '+' : ''}{dayChangePct.toFixed(2)}%)
                            </span>
                            <span className="text-gray-600 text-xs">{t('investments.dayChange')}</span>
                          </div>
                        )}
                      </div>
                      <button onClick={() => { setShowSearch(true); }}
                        className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm transition-all active:scale-95"
                        style={{ background: 'linear-gradient(135deg, #F5C518, #D4A810)', color: '#000', boxShadow: '0 8px 24px rgba(245,197,24,0.25)' }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                          <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
                        </svg>
                        {t('investments.addHolding')}
                      </button>
                    </div>

                    {/* Stats pills */}
                    <div className="flex flex-col sm:flex-row gap-3">
                      <div className="flex-1 bg-white/[0.04] backdrop-blur-sm rounded-2xl px-4 py-3 border border-white/[0.06]">
                        <p className="text-gray-500 text-[10px] uppercase tracking-wider">{t('investments.totalInvested')}</p>
                        <p className="text-white font-bold text-base">{fmt(totalCost)}</p>
                      </div>
                      <div className="flex-1 bg-white/[0.04] backdrop-blur-sm rounded-2xl px-4 py-3 border border-white/[0.06]">
                        <p className="text-gray-500 text-[10px] uppercase tracking-wider">{t('investments.totalReturn')}</p>
                        <p className={`font-bold text-base ${totalPnl >= 0 ? 'text-[#00B894]' : 'text-[#E17055]'}`}>
                          {totalPnl >= 0 ? '+' : ''}{fmt(totalPnl)} ({totalPnlPct >= 0 ? '+' : ''}{totalPnlPct.toFixed(2)}%)
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>

              {/* ── Charts Row ─────────────────────────────── */}
              {!isLoading && (summary?.holdings_count || 0) > 0 && (
                <motion.div variants={itemV} className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {/* Allocation Donut */}
                  <div className="glass rounded-2xl p-5">
                    <div className="flex items-center gap-2 mb-4">
                      <div className="w-1 h-4 rounded-full bg-[#F5C518]" />
                      <h3 className="text-white font-semibold text-sm">{t('investments.portfolioAllocation')}</h3>
                    </div>
                    <div className="relative">
                      <ResponsiveContainer width="100%" height={200}>
                        <PieChart>
                          <Pie data={donutData} cx="50%" cy="50%" innerRadius={55} outerRadius={80}
                            paddingAngle={3} dataKey="value" cornerRadius={4} animationDuration={900}>
                            {donutData.map((_, i) => <Cell key={i} fill={donutData[i].color} stroke="transparent" />)}
                          </Pie>
                        </PieChart>
                      </ResponsiveContainer>
                      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                        <p className="text-white font-bold text-lg">{summary?.holdings_count}</p>
                        <p className="text-gray-500 text-[9px] uppercase tracking-wider">{t('investments.holdings')}</p>
                      </div>
                    </div>
                    <div className="space-y-1.5 mt-2">
                      {donutData.map((item) => (
                        <div key={item.name} className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: item.color }} />
                          <span className="text-gray-500 text-[10px] truncate flex-1">{item.name}</span>
                          <span className="text-gray-400 text-[10px] font-medium">{fmt(item.value)}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Performance Chart */}
                  <div className="glass rounded-2xl p-5">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <div className="w-1 h-4 rounded-full bg-[#00B894]" />
                        <h3 className="text-white font-semibold text-sm">{t('investments.performance')}</h3>
                      </div>
                      <div className="flex gap-1.5 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
                        {(summary?.holdings || []).slice(0, 4).map(h => (
                          <button key={h.ticker} onClick={() => loadHistory(h.ticker)}
                            className={`px-2.5 py-1 rounded-lg text-[10px] font-semibold transition-all whitespace-nowrap ${
                              historyTicker === h.ticker
                                ? 'bg-[#F5C518]/15 text-[#F5C518] border border-[#F5C518]/30'
                                : 'bg-white/[0.04] text-gray-500 border border-white/[0.07] hover:text-white'
                            }`}>{h.ticker}</button>
                        ))}
                      </div>
                    </div>
                    {historyData.length > 0 ? (
                      <ResponsiveContainer width="100%" height={200}>
                        <AreaChart data={historyData}>
                          <defs>
                            <linearGradient id="perfG" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor="#F5C518" stopOpacity={0.3} />
                              <stop offset="100%" stopColor="#F5C518" stopOpacity={0} />
                            </linearGradient>
                          </defs>
                          <XAxis dataKey="date" tick={{ fill: '#4B5563', fontSize: 10 }} axisLine={false} tickLine={false}
                            tickFormatter={(v: string) => v.slice(5)} interval="preserveStartEnd" />
                          <Tooltip content={<ChartTooltip />} />
                          <Area type="monotone" dataKey="close" stroke="#F5C518" strokeWidth={2}
                            fill="url(#perfG)" dot={false}
                            activeDot={{ r: 4, fill: '#F5C518', stroke: '#050510', strokeWidth: 2 }}
                            animationDuration={1200} />
                        </AreaChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-[200px] flex items-center justify-center text-gray-600 text-xs">
                        {t('common.noData')}
                      </div>
                    )}
                  </div>
                </motion.div>
              )}

              {/* ── Holdings List ──────────────────────────── */}
              <motion.div variants={itemV}>
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-1 h-5 rounded-full bg-[#F5C518]" />
                  <h3 className="text-white font-semibold text-base">{t('investments.holdings')}</h3>
                  <span className="text-xs text-gray-600 font-medium bg-white/[0.04] px-2 py-0.5 rounded-full">
                    {summary?.holdings_count || 0}
                  </span>
                </div>

                {isLoading ? (
                  <div className="space-y-3">
                    {[1, 2, 3].map(i => (
                      <div key={i} className="glass rounded-2xl p-5 animate-pulse">
                        <div className="flex items-center gap-4">
                          <Skeleton className="w-10 h-10 rounded-xl" />
                          <div className="flex-1 space-y-2">
                            <Skeleton className="w-20 h-3" />
                            <Skeleton className="w-32 h-2" />
                          </div>
                          <Skeleton className="w-16 h-4" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : !summary || summary.holdings.length === 0 ? (
                  <div className="glass rounded-2xl py-16 text-center relative overflow-hidden">
                    <div className="absolute -top-20 left-1/2 -translate-x-1/2 w-60 h-60 rounded-full opacity-[0.06]"
                      style={{ background: 'radial-gradient(circle, #F5C518, transparent)' }} />
                    <div className="relative z-10">
                      <div className="w-16 h-16 rounded-2xl bg-[#F5C518]/10 flex items-center justify-center mx-auto mb-4">
                        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#F5C518" strokeWidth="2" strokeLinecap="round">
                          <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
                          <polyline points="16 7 22 7 22 13" />
                        </svg>
                      </div>
                      <h3 className="text-lg font-bold text-white mb-2">{t('investments.noHoldings')}</h3>
                      <p className="text-gray-500 text-sm mb-6 max-w-xs mx-auto">{t('investments.noHoldingsDesc')}</p>
                      <p className="text-gray-600 text-[10px] mb-4 max-w-xs mx-auto">{t('investments.disclaimer')}</p>
                      <button onClick={() => setShowSearch(true)}
                        className="px-6 py-3 rounded-xl font-semibold text-sm text-black transition-all active:scale-95"
                        style={{ background: 'linear-gradient(135deg, #F5C518, #D4A810)' }}>
                        {t('investments.addFirst')}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {summary.holdings.map((h, idx) => {
                      const isExpanded = expandedId === h.id;
                      return (
                        <motion.div key={h.id}
                          initial={{ opacity: 0, y: 12 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: idx * 0.05, duration: 0.4 }}>
                          <div className={`glass rounded-2xl overflow-hidden transition-all ${isExpanded ? 'ring-1 ring-[#F5C518]/30' : ''}`}>
                            <button onClick={() => toggleExpand(h.id)}
                              className="w-full p-4 sm:p-5 flex items-center gap-3 sm:gap-4 text-left hover:bg-white/[0.02] transition-all">
                              <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                                style={{ backgroundColor: `${COLORS[idx % COLORS.length]}15` }}>
                                <span className="text-xs font-bold" style={{ color: COLORS[idx % COLORS.length] }}>
                                  {h.ticker.slice(0, 3)}
                                </span>
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <p className="text-white font-semibold text-sm">{h.ticker}</p>
                                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/[0.06] text-gray-500 font-medium">{h.asset_type}</span>
                                </div>
                                <p className="text-gray-500 text-xs truncate">{h.name}</p>
                              </div>
                              <div className="text-right flex-shrink-0 hidden sm:block">
                                <p className="text-white font-semibold text-sm">{fmt(h.current_price)}</p>
                                <p className={`text-[11px] font-medium ${h.day_change >= 0 ? 'text-[#00B894]' : 'text-[#E17055]'}`}>
                                  {h.day_change >= 0 ? '+' : ''}{fmt(h.day_change)} ({h.day_change_pct >= 0 ? '+' : ''}{h.day_change_pct}%)
                                </p>
                              </div>
                              <div className="text-right flex-shrink-0">
                                <p className="text-white font-bold text-sm">{fmt(h.market_value)}</p>
                                <p className={`text-[11px] font-medium ${h.unrealized_pnl >= 0 ? 'text-[#00B894]' : 'text-[#E17055]'}`}>
                                  {h.unrealized_pnl >= 0 ? '+' : ''}{fmt(h.unrealized_pnl)} ({h.unrealized_pnl_pct >= 0 ? '+' : ''}{h.unrealized_pnl_pct}%)
                                </p>
                              </div>
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6B7280" strokeWidth="2" strokeLinecap="round"
                                className={`flex-shrink-0 transition-transform ${isExpanded ? 'rotate-180' : ''}`}>
                                <path d="M6 9l6 6 6-6" />
                              </svg>
                            </button>

                            {isExpanded && (
                              <div className="px-4 sm:px-5 pb-4 sm:pb-5 border-t border-white/[0.06]">
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 py-4">
                                  <div>
                                    <p className="text-gray-500 text-[10px] uppercase tracking-wider">{t('investments.totalShares')}</p>
                                    <p className="text-white font-semibold text-sm">{h.total_shares.toFixed(4)}</p>
                                  </div>
                                  <div>
                                    <p className="text-gray-500 text-[10px] uppercase tracking-wider">{t('investments.avgCost')}</p>
                                    <p className="text-white font-semibold text-sm">{fmt(h.avg_cost)}</p>
                                  </div>
                                  <div>
                                    <p className="text-gray-500 text-[10px] uppercase tracking-wider">{t('investments.costBasis')}</p>
                                    <p className="text-white font-semibold text-sm">{fmt(h.cost_basis)}</p>
                                  </div>
                                  <div>
                                    <p className="text-gray-500 text-[10px] uppercase tracking-wider">{t('investments.realizedPnl')}</p>
                                    <p className={`font-semibold text-sm ${h.realized_pnl >= 0 ? 'text-[#00B894]' : 'text-[#E17055]'}`}>
                                      {h.realized_pnl >= 0 ? '+' : ''}{fmt(h.realized_pnl)}
                                    </p>
                                  </div>
                                </div>
                                <div className="flex gap-2 mb-4">
                                  <button onClick={() => openBuySell(h, InvestmentTxnType.BUY)}
                                    className="flex-1 py-2.5 rounded-xl text-sm font-semibold bg-[#00B894]/15 text-[#00B894] border border-[#00B894]/20 hover:bg-[#00B894]/25 transition-all">
                                    {t('investments.buyMore')}
                                  </button>
                                  <button onClick={() => openBuySell(h, InvestmentTxnType.SELL)}
                                    disabled={h.total_shares <= 0}
                                    className="flex-1 py-2.5 rounded-xl text-sm font-semibold bg-[#E17055]/15 text-[#E17055] border border-[#E17055]/20 hover:bg-[#E17055]/25 transition-all disabled:opacity-30 disabled:cursor-not-allowed">
                                    {t('investments.sell')}
                                  </button>
                                  <button onClick={() => navigate(`/investments/asset/${h.ticker}`)}
                                    className="py-2.5 px-4 rounded-xl text-sm font-semibold bg-white/[0.06] text-gray-400 border border-white/[0.07] hover:bg-white/[0.1] hover:text-white transition-all">
                                    {t('investments.details')}
                                  </button>
                                </div>

                                <div className="flex items-center gap-2 mb-3">
                                  <div className="w-1 h-3 rounded-full bg-[#F5C518]" />
                                  <p className="text-gray-400 text-xs font-semibold">{t('investments.transactionHistory')}</p>
                                </div>
                                {expandedTxns.length === 0 ? (
                                  <p className="text-gray-600 text-xs py-2">{t('investments.noTransactions')}</p>
                                ) : (
                                  <div className="space-y-1.5 max-h-48 overflow-y-auto" style={{ scrollbarWidth: 'none' }}>
                                    {expandedTxns.map(txn => (
                                      <div key={txn.id} className="flex items-center gap-3 py-2 px-3 rounded-xl bg-white/[0.02]">
                                        <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                                          txn.txn_type === 'BUY' ? 'bg-[#00B894]/15' : 'bg-[#E17055]/15'
                                        }`}>
                                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
                                            stroke={txn.txn_type === 'BUY' ? '#00B894' : '#E17055'} strokeWidth="2.5" strokeLinecap="round">
                                            {txn.txn_type === 'BUY'
                                              ? <path d="M12 5v14M5 12l7-7 7 7" />
                                              : <path d="M12 19V5M5 12l7 7 7-7" />
                                            }
                                          </svg>
                                        </div>
                                        <div className="flex-1 min-w-0">
                                          <p className="text-white text-xs font-medium">
                                            {txn.txn_type} {txn.shares} @ {fmt(txn.price_per_share)}
                                          </p>
                                          <p className="text-gray-600 text-[10px]">
                                            {new Date(txn.txn_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                            {txn.fees > 0 && ` · Fee: ${fmt(txn.fees)}`}
                                          </p>
                                        </div>
                                        <p className="text-white text-xs font-semibold">{fmt(txn.total_amount)}</p>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                )}
              </motion.div>
            </>
          )}

          {/* ═══ WATCHLIST TAB ═══════════════════════════════ */}
          {activeTab === 'watchlist' && (
            <motion.div variants={itemV}>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-1 h-5 rounded-full bg-[#E84393]" />
                  <h3 className="text-white font-semibold text-base">{t('investments.watchlist.title')}</h3>
                  <span className="text-xs text-gray-600 font-medium bg-white/[0.04] px-2 py-0.5 rounded-full">
                    {watchlist.length}
                  </span>
                </div>
                <button onClick={() => setShowSearch(true)}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl font-semibold text-xs text-[#F5C518] bg-[#F5C518]/10 border border-[#F5C518]/20 hover:bg-[#F5C518]/20 transition-all">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                    <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
                  </svg>
                  {t('investments.watchlist.add')}
                </button>
              </div>

              {watchlist.length === 0 ? (
                <div className="glass rounded-2xl py-16 text-center">
                  <div className="w-14 h-14 rounded-2xl bg-[#E84393]/10 flex items-center justify-center mx-auto mb-4">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#E84393" strokeWidth="2" strokeLinecap="round">
                      <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-bold text-white mb-2">{t('investments.watchlist.empty')}</h3>
                  <p className="text-gray-500 text-sm max-w-xs mx-auto">{t('investments.watchlist.emptyDesc')}</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {watchlist.map((item, idx) => {
                    const quote = watchlistQuotes[item.ticker];
                    return (
                      <motion.div key={item.id}
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.05, duration: 0.4 }}>
                        <div className="glass rounded-2xl p-4 flex items-center gap-4 hover:bg-white/[0.04] transition-all group">
                          <button onClick={() => navigate(`/investments/asset/${item.ticker}`)}
                            className="flex-1 flex items-center gap-4 text-left min-w-0">
                            <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                              style={{ backgroundColor: `${COLORS[idx % COLORS.length]}15` }}>
                              <span className="text-xs font-bold" style={{ color: COLORS[idx % COLORS.length] }}>
                                {item.ticker.slice(0, 3)}
                              </span>
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-white font-semibold text-sm group-hover:text-[#F5C518] transition-colors">{item.ticker}</p>
                              <p className="text-gray-500 text-xs truncate">{item.name}</p>
                            </div>
                            {quote && (
                              <div className="text-right flex-shrink-0">
                                <p className="text-white font-bold text-sm">${quote.price.toFixed(2)}</p>
                                <p className={`text-[11px] font-medium ${quote.change >= 0 ? 'text-[#00B894]' : 'text-[#E17055]'}`}>
                                  {quote.change >= 0 ? '+' : ''}{quote.change_pct.toFixed(2)}%
                                </p>
                              </div>
                            )}
                          </button>
                          <button onClick={() => toggleWatchlist(item.ticker, item.name)}
                            className="p-2 rounded-lg hover:bg-white/[0.06] text-[#E84393] transition-all flex-shrink-0">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="#E84393" stroke="#E84393" strokeWidth="2" strokeLinecap="round">
                              <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" />
                            </svg>
                          </button>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </motion.div>
          )}

        </motion.div>
      </div>

      {/* ═══ SEARCH OVERLAY ══════════════════════════════════ */}
      {showSearch && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-20"
          onClick={(e) => { if (e.target === e.currentTarget) { setShowSearch(false); setSearchQuery(''); setSearchResults([]); } }}>
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => { setShowSearch(false); setSearchQuery(''); setSearchResults([]); }} />
          <div className="relative w-full max-w-lg mx-4 bg-[#0c0c18]/95 backdrop-blur-2xl rounded-2xl border border-white/[0.07] shadow-2xl overflow-hidden">
            <div className="p-4">
              <div className="relative">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#6B7280" strokeWidth="2" strokeLinecap="round"
                  className="absolute left-3 top-1/2 -translate-y-1/2">
                  <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
                <input type="text" value={searchQuery} onChange={(e) => handleSearch(e.target.value)}
                  placeholder={t('investments.searchPlaceholder')}
                  className="w-full bg-white/[0.06] border border-white/[0.07] rounded-xl pl-10 pr-4 py-3 text-white text-sm focus:outline-none focus:border-[#F5C518]/40 transition-colors"
                  autoFocus />
                {isSearching && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 border-2 border-[#F5C518]/30 border-t-[#F5C518] rounded-full animate-spin" />
                )}
              </div>
            </div>
            {searchResults.length > 0 && (
              <div className="max-h-80 overflow-y-auto border-t border-white/[0.05]" style={{ scrollbarWidth: 'none' }}>
                {searchResults.map(r => (
                  <button key={r.ticker} onClick={() => navigate(`/investments/asset/${r.ticker}`)}
                    className="w-full flex items-center gap-4 px-4 py-3 hover:bg-white/[0.06] transition-all text-left border-b border-white/[0.03] last:border-0">
                    <div className="w-9 h-9 rounded-lg bg-[#F5C518]/10 flex items-center justify-center flex-shrink-0">
                      <span className="text-[10px] font-bold text-[#F5C518]">{r.ticker.slice(0, 3)}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-sm font-semibold">{r.ticker}</p>
                      <p className="text-gray-500 text-xs truncate">{r.name}</p>
                    </div>
                    <span className="text-gray-600 text-[10px] px-1.5 py-0.5 rounded bg-white/[0.06] flex-shrink-0">{r.asset_type}</span>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#4B5563" strokeWidth="2" strokeLinecap="round">
                      <path d="M9 18l6-6-6-6" />
                    </svg>
                  </button>
                ))}
              </div>
            )}
            {searchQuery && !isSearching && searchResults.length === 0 && (
              <div className="px-4 pb-4 text-center">
                <p className="text-gray-500 text-sm">{t('investments.noResults')}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ═══ RECORD TRANSACTION MODAL ════════════════════════ */}
      {showTxnModal && txnHolding && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
          onClick={(e) => { if (e.target === e.currentTarget) resetTxnModal(); }}>
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={resetTxnModal} />
          <div className="relative w-full sm:max-w-md bg-[#0c0c18]/80 backdrop-blur-2xl rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden border border-white/[0.07]">
            <div className="absolute top-0 left-0 right-0 h-[2px]"
              style={{ background: `linear-gradient(90deg, transparent, ${txnType === InvestmentTxnType.BUY ? '#00B89460' : '#E1705560'}, transparent)` }} />
            <div className="flex items-center justify-between px-5 pt-5 pb-3">
              <button onClick={resetTxnModal}
                className="w-8 h-8 flex items-center justify-center rounded-xl bg-white/[0.06] text-gray-400 hover:text-white hover:bg-white/[0.1] transition-all">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
              <h2 className="text-white font-semibold text-base">
                {txnType === InvestmentTxnType.BUY ? t('investments.buyMore') : t('investments.sell')} {txnHolding.ticker}
              </h2>
              <div className="w-8" />
            </div>
            <div className="px-5 pb-6 space-y-4">
              <p className="text-gray-600 text-[10px] text-center">{t('investments.disclaimer')}</p>
              <div className="flex gap-2">
                <button onClick={() => setTxnType(InvestmentTxnType.BUY)}
                  className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                    txnType === InvestmentTxnType.BUY
                      ? 'bg-[#00B894]/15 text-[#00B894] border border-[#00B894]/30'
                      : 'bg-white/[0.04] text-gray-500 border border-white/[0.07]'
                  }`}>{t('investments.buy')}</button>
                <button onClick={() => setTxnType(InvestmentTxnType.SELL)}
                  className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                    txnType === InvestmentTxnType.SELL
                      ? 'bg-[#E17055]/15 text-[#E17055] border border-[#E17055]/30'
                      : 'bg-white/[0.04] text-gray-500 border border-white/[0.07]'
                  }`}>{t('investments.sell')}</button>
              </div>
              {txnType === InvestmentTxnType.SELL && (
                <p className="text-gray-500 text-xs">
                  {t('investments.totalShares')}: <span className="text-white font-semibold">{txnHolding.total_shares.toFixed(4)}</span>
                </p>
              )}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-gray-500 text-[10px] uppercase tracking-wider font-medium mb-1.5 block">{t('investments.shares')}</label>
                  <input type="number" value={txnShares} onChange={e => setTxnShares(e.target.value)} step="any" min="0"
                    max={txnType === InvestmentTxnType.SELL ? txnHolding.total_shares : undefined}
                    className="w-full bg-white/[0.06] border border-white/[0.07] rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-[#F5C518]/40 transition-colors" />
                </div>
                <div>
                  <label className="text-gray-500 text-[10px] uppercase tracking-wider font-medium mb-1.5 block">{t('investments.pricePerShare')}</label>
                  <input type="number" value={txnPrice} onChange={e => setTxnPrice(e.target.value)} step="any" min="0"
                    className="w-full bg-white/[0.06] border border-white/[0.07] rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-[#F5C518]/40 transition-colors" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-gray-500 text-[10px] uppercase tracking-wider font-medium mb-1.5 block">{t('investments.txnDate')}</label>
                  <input type="date" value={txnDate} onChange={e => setTxnDate(e.target.value)}
                    className="w-full bg-white/[0.06] border border-white/[0.07] rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-[#F5C518]/40 transition-colors [color-scheme:dark]" />
                </div>
                <div>
                  <label className="text-gray-500 text-[10px] uppercase tracking-wider font-medium mb-1.5 block">{t('investments.fees')}</label>
                  <input type="number" value={txnFees} onChange={e => setTxnFees(e.target.value)} step="any" min="0" placeholder="0.00"
                    className="w-full bg-white/[0.06] border border-white/[0.07] rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-[#F5C518]/40 transition-colors" />
                </div>
              </div>
              {txnShares && txnPrice && (
                <div className="bg-white/[0.04] rounded-xl px-4 py-3 border border-white/[0.06]">
                  <div className="flex justify-between">
                    <span className="text-gray-500 text-xs">Total</span>
                    <span className="text-white font-bold text-sm">{fmt(parseFloat(txnShares) * parseFloat(txnPrice))}</span>
                  </div>
                  {txnType === InvestmentTxnType.SELL && (
                    <div className="flex justify-between mt-1">
                      <span className="text-gray-500 text-xs">{t('investments.realizedPnl')}</span>
                      <span className={`text-sm font-bold ${
                        parseFloat(txnPrice) >= txnHolding.avg_cost ? 'text-[#00B894]' : 'text-[#E17055]'
                      }`}>{fmt((parseFloat(txnPrice) - txnHolding.avg_cost) * parseFloat(txnShares))}</span>
                    </div>
                  )}
                </div>
              )}
              <button onClick={handleRecordTxn} disabled={!txnShares || !txnPrice}
                className="w-full py-3 rounded-2xl font-semibold text-sm text-black transition-all active:scale-[0.97] disabled:opacity-40"
                style={{
                  background: txnType === InvestmentTxnType.BUY
                    ? 'linear-gradient(135deg, #00B894, #00B894CC)'
                    : 'linear-gradient(135deg, #E17055, #E17055CC)',
                  boxShadow: txnType === InvestmentTxnType.BUY ? '0 8px 24px #00B89430' : '0 8px 24px #E1705530',
                }}>
                {txnType === InvestmentTxnType.BUY ? t('investments.buy') : t('investments.sell')}
              </button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
};
