import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import {
  AreaChart, Area, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import { AppLayout } from '../components/layout/AppLayout';
import { useAuth } from '../context/AuthContext';
import investmentService, {
  AssetDetail, HistoryPoint, WatchlistItem, AssetType, InvestmentTxnType,
} from '../services/investment.service';
import { containerV, itemV } from '../utils/motion';

/* ── Helpers ──────────────────────────────────────────── */
const makeFmt = (c: string) => (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: c }).format(n);
const fmtBig = (n: number | null | undefined) => {
  if (!n) return '—';
  if (n >= 1e12) return `$${(n / 1e12).toFixed(2)}T`;
  if (n >= 1e9) return `$${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6) return `$${(n / 1e6).toFixed(1)}M`;
  return `$${n.toLocaleString()}`;
};
const fmtVol = (n: number | null | undefined) => {
  if (!n) return '—';
  if (n >= 1e9) return `${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6) return `${(n / 1e6).toFixed(2)}M`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(1)}K`;
  return n.toLocaleString();
};
const fmtPct = (n: number | null | undefined) => n != null ? `${(n * 100).toFixed(2)}%` : '—';

type Period = '1d' | '5d' | '1mo' | '3mo' | '6mo' | '1y' | '5y';
const PERIODS: { key: Period; label: string }[] = [
  { key: '1d', label: '1D' }, { key: '5d', label: '1W' }, { key: '1mo', label: '1M' },
  { key: '3mo', label: '3M' }, { key: '6mo', label: '6M' }, { key: '1y', label: '1Y' }, { key: '5y', label: '5Y' },
];

const ChartTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[#0c0c18]/90 border border-white/[0.07] rounded-xl px-4 py-2.5 shadow-xl backdrop-blur-xl">
      <p className="text-gray-400 text-[10px] mb-1">{label}</p>
      <p className="text-sm font-semibold text-[#F5C518]">${payload[0].value?.toLocaleString()}</p>
    </div>
  );
};

/* ══════════════════════════════════════════════════════════
   ASSET DETAIL PAGE
   ══════════════════════════════════════════════════════════ */
export const InvestmentDetail: React.FC = () => {
  const { ticker: rawTicker } = useParams<{ ticker: string }>();
  const ticker = decodeURIComponent(rawTicker || '');
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t } = useTranslation();
  const currency = user?.default_currency || 'USD';
  const fmt = useMemo(() => makeFmt(currency), [currency]);

  /* ── State ──────────────────────────────────────────── */
  const [detail, setDetail] = useState<AssetDetail | null>(null);
  const [history, setHistory] = useState<HistoryPoint[]>([]);
  const [period, setPeriod] = useState<Period>('6mo');
  const [isLoading, setIsLoading] = useState(true);
  const [isChartLoading, setIsChartLoading] = useState(false);
  const [watchlist, setWatchlist] = useState<WatchlistItem[]>([]);
  const [showDesc, setShowDesc] = useState(false);

  // Add to portfolio modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [buyShares, setBuyShares] = useState('');
  const [buyPrice, setBuyPrice] = useState('');
  const [buyDate, setBuyDate] = useState(new Date().toISOString().slice(0, 10));
  const [buyFees, setBuyFees] = useState('');

  const isInWatchlist = watchlist.some(w => w.ticker === ticker.toUpperCase());

  /* ── Load Data ──────────────────────────────────────── */
  const loadData = useCallback(async () => {
    if (!ticker) return;
    try {
      setIsLoading(true);
      const [detailData, histData, wlData] = await Promise.all([
        investmentService.getAssetDetail(ticker),
        investmentService.getHistory(ticker, period),
        investmentService.getWatchlist().catch(() => []),
      ]);
      setDetail(detailData);
      setHistory(histData);
      setWatchlist(wlData);
      setBuyPrice(detailData.price.toString());
    } catch (e) {
      console.error('Failed to load asset detail:', e);
    } finally {
      setIsLoading(false);
    }
  }, [ticker]);

  useEffect(() => { loadData(); }, [loadData]);

  /* ── Change period ──────────────────────────────────── */
  const changePeriod = async (p: Period) => {
    setPeriod(p);
    setIsChartLoading(true);
    try {
      const histData = await investmentService.getHistory(ticker, p);
      setHistory(histData);
    } catch { setHistory([]); }
    finally { setIsChartLoading(false); }
  };

  /* ── Watchlist toggle ───────────────────────────────── */
  const toggleWatchlist = async () => {
    if (!detail) return;
    try {
      if (isInWatchlist) {
        await investmentService.removeFromWatchlist(ticker.toUpperCase());
        setWatchlist(prev => prev.filter(w => w.ticker !== ticker.toUpperCase()));
      } else {
        const item = await investmentService.addToWatchlist({
          ticker: ticker.toUpperCase(),
          name: detail.name,
          asset_type: detail.quote_type === 'ETF' ? 'ETF' : 'STOCK',
        });
        setWatchlist(prev => [item, ...prev]);
      }
    } catch { /* skip */ }
  };

  /* ── Add to portfolio ───────────────────────────────── */
  const handleAddToPortfolio = async () => {
    if (!detail || !buyShares || !buyPrice) return;
    try {
      const holding = await investmentService.createHolding({
        ticker: detail.ticker,
        name: detail.name,
        asset_type: detail.quote_type === 'ETF' ? AssetType.ETF : AssetType.STOCK,
      });
      await investmentService.recordTransaction(holding.id, {
        txn_type: InvestmentTxnType.BUY,
        shares: parseFloat(buyShares),
        price_per_share: parseFloat(buyPrice),
        fees: buyFees ? parseFloat(buyFees) : 0,
        txn_date: new Date(buyDate + 'T12:00:00').toISOString(),
      });
      setShowAddModal(false);
      setBuyShares(''); setBuyFees('');
    } catch (e: any) {
      alert(e.response?.data?.detail || 'Failed to add to portfolio');
    }
  };

  /* ── Chart color based on period change ─────────────── */
  const chartColor = useMemo(() => {
    if (history.length < 2) return '#F5C518';
    return history[history.length - 1].close >= history[0].close ? '#00B894' : '#E17055';
  }, [history]);

  /* ── Stats grid ─────────────────────────────────────── */
  const stats = useMemo(() => {
    if (!detail) return [];
    return [
      { label: t('investments.detail.open'), value: detail.open ? fmt(detail.open) : '—' },
      { label: t('investments.detail.high'), value: detail.day_high ? fmt(detail.day_high) : '—' },
      { label: t('investments.detail.low'), value: detail.day_low ? fmt(detail.day_low) : '—' },
      { label: t('investments.detail.prevClose'), value: fmt(detail.previous_close) },
      { label: t('investments.detail.volume'), value: fmtVol(detail.volume) },
      { label: t('investments.detail.avgVolume'), value: fmtVol(detail.avg_volume) },
      { label: t('investments.detail.marketCap'), value: fmtBig(detail.market_cap) },
      { label: t('investments.detail.peRatio'), value: detail.pe_ratio ? detail.pe_ratio.toFixed(2) : '—' },
      { label: t('investments.detail.eps'), value: detail.eps ? `$${detail.eps.toFixed(2)}` : '—' },
      { label: t('investments.detail.beta'), value: detail.beta ? detail.beta.toFixed(2) : '—' },
      { label: t('investments.detail.divYield'), value: fmtPct(detail.dividend_yield) },
      { label: t('investments.detail.yearHigh'), value: detail.year_high ? fmt(detail.year_high) : '—' },
      { label: t('investments.detail.yearLow'), value: detail.year_low ? fmt(detail.year_low) : '—' },
      { label: t('investments.detail.fiftyDayAvg'), value: detail.fifty_day_avg ? fmt(detail.fifty_day_avg) : '—' },
    ];
  }, [detail, fmt, t]);

  /* ══════════════════════════════════════════════════════
     RENDER
     ══════════════════════════════════════════════════════ */
  return (
    <AppLayout>
      <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto">
        <motion.div variants={containerV} initial="hidden" animate={isLoading ? 'hidden' : 'show'} className="space-y-6">

          {/* ── Back + Header ─────────────────────────────── */}
          <motion.div variants={itemV}>
            <button onClick={() => navigate('/investments')}
              className="flex items-center gap-2 text-gray-500 hover:text-white text-sm mb-4 transition-colors">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M19 12H5M12 19l-7-7 7-7" />
              </svg>
              {t('investments.backToMarket')}
            </button>

            <div className="relative rounded-3xl overflow-hidden"
              style={{ background: 'linear-gradient(135deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.02) 100%)', backdropFilter: 'blur(40px)', WebkitBackdropFilter: 'blur(40px)' }}>
              <div className="absolute top-0 left-0 right-0 h-[2px]" style={{ background: `linear-gradient(90deg, transparent, ${chartColor}60, transparent)` }} />

              <div className="relative z-10 p-5 sm:p-7">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <div className="flex items-center gap-3 mb-1">
                      <h1 className="text-2xl sm:text-3xl font-extrabold text-white">{detail?.ticker || ticker}</h1>
                      {detail?.quote_type && (
                        <span className="text-[10px] px-2 py-1 rounded-lg bg-white/[0.06] text-gray-400 font-medium">{detail.quote_type}</span>
                      )}
                    </div>
                    <p className="text-gray-500 text-sm">{detail?.name}</p>
                    {detail?.sector && (
                      <p className="text-gray-600 text-xs mt-1">{detail.sector}{detail.industry ? ` · ${detail.industry}` : ''}</p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <button onClick={toggleWatchlist}
                      className={`w-10 h-10 rounded-xl flex items-center justify-center border transition-all ${
                        isInWatchlist
                          ? 'bg-[#E84393]/15 border-[#E84393]/30 text-[#E84393]'
                          : 'bg-white/[0.06] border-white/[0.07] text-gray-400 hover:text-white'
                      }`}>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill={isInWatchlist ? '#E84393' : 'none'}
                        stroke={isInWatchlist ? '#E84393' : 'currentColor'} strokeWidth="2" strokeLinecap="round">
                        <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" />
                      </svg>
                    </button>
                  </div>
                </div>

                {detail && (
                  <div className="mt-4">
                    <p className="text-3xl sm:text-4xl font-extrabold text-white">{fmt(detail.price)}</p>
                    <p className={`text-sm font-semibold mt-1 ${detail.change >= 0 ? 'text-[#00B894]' : 'text-[#E17055]'}`}>
                      {detail.change >= 0 ? '+' : ''}{fmt(detail.change)} ({detail.change_pct >= 0 ? '+' : ''}{detail.change_pct.toFixed(2)}%)
                    </p>
                  </div>
                )}
              </div>
            </div>
          </motion.div>

          {/* ── Price Chart ────────────────────────────────── */}
          <motion.div variants={itemV}>
            <div className="glass rounded-2xl p-5">
              {/* Period pills */}
              <div className="flex gap-1.5 mb-4 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
                {PERIODS.map(p => (
                  <button key={p.key} onClick={() => changePeriod(p.key)}
                    className={`px-3.5 py-1.5 rounded-lg text-[11px] font-semibold transition-all whitespace-nowrap ${
                      period === p.key
                        ? 'text-white border border-white/20'
                        : 'bg-white/[0.04] text-gray-500 border border-white/[0.07] hover:text-white'
                    }`}
                    style={period === p.key ? { backgroundColor: `${chartColor}20`, borderColor: `${chartColor}40`, color: chartColor } : {}}>
                    {p.label}
                  </button>
                ))}
              </div>

              {isChartLoading ? (
                <div className="h-[280px] flex items-center justify-center">
                  <div className="w-8 h-8 border-2 border-[#F5C518]/30 border-t-[#F5C518] rounded-full animate-spin" />
                </div>
              ) : history.length > 0 ? (
                <ResponsiveContainer width="100%" height={280}>
                  <AreaChart data={history}>
                    <defs>
                      <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={chartColor} stopOpacity={0.25} />
                        <stop offset="100%" stopColor={chartColor} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="date" tick={{ fill: '#4B5563', fontSize: 10 }} axisLine={false} tickLine={false}
                      tickFormatter={(v: string) => v.slice(5)} interval="preserveStartEnd" />
                    <YAxis domain={['auto', 'auto']} hide />
                    <Tooltip content={<ChartTooltip />} />
                    <Area type="monotone" dataKey="close" stroke={chartColor} strokeWidth={2}
                      fill="url(#chartGrad)" dot={false}
                      activeDot={{ r: 5, fill: chartColor, stroke: '#050510', strokeWidth: 2 }}
                      animationDuration={1000} />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[280px] flex items-center justify-center text-gray-600 text-sm">
                  {t('common.noData')}
                </div>
              )}
            </div>
          </motion.div>

          {/* ── Action Buttons ─────────────────────────────── */}
          <motion.div variants={itemV}>
            <div className="flex gap-3">
              <button onClick={() => setShowAddModal(true)}
                className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-2xl font-semibold text-sm transition-all active:scale-[0.97]"
                style={{ background: 'linear-gradient(135deg, #F5C518, #D4A810)', color: '#000', boxShadow: '0 8px 24px rgba(245,197,24,0.25)' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
                </svg>
                {t('investments.addToPortfolio')}
              </button>
              <button onClick={toggleWatchlist}
                className={`px-6 py-3.5 rounded-2xl font-semibold text-sm transition-all border ${
                  isInWatchlist
                    ? 'bg-[#E84393]/15 border-[#E84393]/30 text-[#E84393]'
                    : 'bg-white/[0.06] border-white/[0.07] text-gray-400 hover:text-white'
                }`}>
                {isInWatchlist ? t('investments.watchlist.remove') : t('investments.watchlist.addBtn')}
              </button>
            </div>
          </motion.div>

          {/* ── Quick Stats ────────────────────────────────── */}
          {detail && (
            <motion.div variants={itemV}>
              <div className="glass rounded-2xl p-5">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-1 h-4 rounded-full bg-[#0984E3]" />
                  <h3 className="text-white font-semibold text-sm">{t('investments.detail.stats')}</h3>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-x-6 gap-y-3">
                  {stats.map(({ label, value }) => (
                    <div key={label} className="flex justify-between items-baseline py-2 border-b border-white/[0.04]">
                      <span className="text-gray-500 text-xs">{label}</span>
                      <span className="text-white text-sm font-semibold">{value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {/* ── About Section ──────────────────────────────── */}
          {detail?.description && (
            <motion.div variants={itemV}>
              <div className="glass rounded-2xl p-5">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-1 h-4 rounded-full bg-[#00CEC9]" />
                  <h3 className="text-white font-semibold text-sm">{t('investments.detail.about')}</h3>
                </div>
                <p className={`text-gray-400 text-sm leading-relaxed ${!showDesc ? 'line-clamp-3' : ''}`}>
                  {detail.description}
                </p>
                {detail.description.length > 200 && (
                  <button onClick={() => setShowDesc(!showDesc)}
                    className="text-[#F5C518] text-xs font-semibold mt-2 hover:underline">
                    {showDesc ? t('investments.detail.showLess') : t('investments.detail.showMore')}
                  </button>
                )}
                {(detail.sector || detail.city || detail.employees) && (
                  <div className="flex flex-wrap gap-3 mt-4 pt-3 border-t border-white/[0.06]">
                    {detail.sector && (
                      <div className="text-xs">
                        <span className="text-gray-600">{t('investments.detail.sector')}: </span>
                        <span className="text-gray-400">{detail.sector}</span>
                      </div>
                    )}
                    {detail.industry && (
                      <div className="text-xs">
                        <span className="text-gray-600">{t('investments.detail.industry')}: </span>
                        <span className="text-gray-400">{detail.industry}</span>
                      </div>
                    )}
                    {detail.employees && (
                      <div className="text-xs">
                        <span className="text-gray-600">{t('investments.detail.employees')}: </span>
                        <span className="text-gray-400">{detail.employees.toLocaleString()}</span>
                      </div>
                    )}
                    {detail.city && detail.country && (
                      <div className="text-xs">
                        <span className="text-gray-600">{t('investments.detail.hq')}: </span>
                        <span className="text-gray-400">{detail.city}, {detail.country}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </motion.div>
          )}

        </motion.div>
      </div>

      {/* ═══ ADD TO PORTFOLIO MODAL ══════════════════════════ */}
      {showAddModal && detail && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
          onClick={(e) => { if (e.target === e.currentTarget) setShowAddModal(false); }}>
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowAddModal(false)} />
          <div className="relative w-full sm:max-w-md bg-[#0c0c18]/80 backdrop-blur-2xl rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden border border-white/[0.07]">
            <div className="absolute top-0 left-0 right-0 h-[2px]"
              style={{ background: 'linear-gradient(90deg, transparent, #F5C51860, transparent)' }} />

            <div className="flex items-center justify-between px-5 pt-5 pb-3">
              <button onClick={() => setShowAddModal(false)}
                className="w-8 h-8 flex items-center justify-center rounded-xl bg-white/[0.06] text-gray-400 hover:text-white hover:bg-white/[0.1] transition-all">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
              <h2 className="text-white font-semibold text-base">{t('investments.addToPortfolio')}</h2>
              <div className="w-8" />
            </div>

            <div className="px-5 pb-6 space-y-4">
              {/* Ticker info */}
              <div className="flex items-center gap-3 bg-[#F5C518]/10 border border-[#F5C518]/20 rounded-xl px-4 py-3">
                <div>
                  <p className="text-[#F5C518] font-bold text-sm">{detail.ticker}</p>
                  <p className="text-gray-400 text-xs truncate">{detail.name}</p>
                </div>
                <div className="ml-auto text-right">
                  <p className="text-white font-bold text-sm">{fmt(detail.price)}</p>
                  <p className={`text-[10px] font-medium ${detail.change >= 0 ? 'text-[#00B894]' : 'text-[#E17055]'}`}>
                    {detail.change >= 0 ? '+' : ''}{detail.change_pct.toFixed(2)}%
                  </p>
                </div>
              </div>

              <p className="text-gray-600 text-[10px] text-center">{t('investments.disclaimer')}</p>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-gray-500 text-[10px] uppercase tracking-wider font-medium mb-1.5 block">{t('investments.shares')}</label>
                  <input type="number" value={buyShares} onChange={e => setBuyShares(e.target.value)} step="any" min="0" placeholder="10"
                    className="w-full bg-white/[0.06] border border-white/[0.07] rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-[#F5C518]/40 transition-colors" />
                </div>
                <div>
                  <label className="text-gray-500 text-[10px] uppercase tracking-wider font-medium mb-1.5 block">{t('investments.pricePerShare')}</label>
                  <input type="number" value={buyPrice} onChange={e => setBuyPrice(e.target.value)} step="any" min="0"
                    className="w-full bg-white/[0.06] border border-white/[0.07] rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-[#F5C518]/40 transition-colors" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-gray-500 text-[10px] uppercase tracking-wider font-medium mb-1.5 block">{t('investments.txnDate')}</label>
                  <input type="date" value={buyDate} onChange={e => setBuyDate(e.target.value)}
                    className="w-full bg-white/[0.06] border border-white/[0.07] rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-[#F5C518]/40 transition-colors [color-scheme:dark]" />
                </div>
                <div>
                  <label className="text-gray-500 text-[10px] uppercase tracking-wider font-medium mb-1.5 block">{t('investments.fees')}</label>
                  <input type="number" value={buyFees} onChange={e => setBuyFees(e.target.value)} step="any" min="0" placeholder="0.00"
                    className="w-full bg-white/[0.06] border border-white/[0.07] rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-[#F5C518]/40 transition-colors" />
                </div>
              </div>

              {buyShares && buyPrice && (
                <div className="bg-white/[0.04] rounded-xl px-4 py-3 border border-white/[0.06]">
                  <div className="flex justify-between">
                    <span className="text-gray-500 text-xs">{t('investments.totalInvested')}</span>
                    <span className="text-white font-bold text-sm">
                      {fmt(parseFloat(buyShares) * parseFloat(buyPrice) + (buyFees ? parseFloat(buyFees) : 0))}
                    </span>
                  </div>
                </div>
              )}

              <button onClick={handleAddToPortfolio} disabled={!buyShares || !buyPrice}
                className="w-full py-3 rounded-2xl font-semibold text-sm text-black transition-all active:scale-[0.97] disabled:opacity-40"
                style={{ background: 'linear-gradient(135deg, #F5C518, #F5C518CC)', boxShadow: '0 8px 24px #F5C51830' }}>
                {t('investments.addToPortfolio')}
              </button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
};
