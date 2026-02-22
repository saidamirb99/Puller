import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import {
  AreaChart, Area, PieChart, Pie, Cell,
  ResponsiveContainer, Tooltip, XAxis,
} from 'recharts';
import { useAuth } from '../context/AuthContext';
import { AppLayout } from '../components/layout/AppLayout';
import accountService, { Account } from '../services/account.service';
import transactionService, { Transaction, TransactionStats, TransactionType } from '../services/transaction.service';
import debtService, { Debt } from '../services/debt.service';
import { CategoryIcon } from '../components/ui/CategoryIcon';
import { containerV, itemV } from '../utils/motion';
import { useAnimatedNumber } from '../hooks/useAnimatedNumber';

/* ── Constants ─────────────────────────────────────────── */
const COLORS = ['#F5C518','#00B894','#E17055','#F0932B','#0984E3','#E84393','#00CEC9','#FF6B35'];
const makeFmt = (c: string) => (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: c }).format(n);

/* ── Chart tooltip ─────────────────────────────────────── */
const ChartTooltip = ({ active, payload, label, currency = 'USD' }: any) => {
  if (!active || !payload?.length) return null;
  const f = makeFmt(currency);
  return (
    <div className="bg-[#111] border border-[#2A2A2A] rounded-xl px-4 py-2.5 shadow-xl backdrop-blur">
      <p className="text-gray-400 text-[10px] mb-1">{label}</p>
      {payload.map((e: any) => (
        <p key={e.dataKey} className="text-sm font-semibold" style={{ color: e.color }}>
          {e.name}: {f(e.value)}
        </p>
      ))}
    </div>
  );
};

/* ── Main Component ────────────────────────────────────── */
export const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const currency = user?.default_currency || 'USD';
  const fmt = useMemo(() => makeFmt(currency), [currency]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [allTransactions, setAllTransactions] = useState<Transaction[]>([]);
  const [recentTransactions, setRecentTransactions] = useState<Transaction[]>([]);
  const [transactionStats, setTransactionStats] = useState<TransactionStats | null>(null);
  const [debts, setDebts] = useState<Debt[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const [accountsData, transactionsData, statsData, debtsData] = await Promise.all([
        accountService.getAccounts(),
        transactionService.getTransactions(),
        transactionService.getTransactionStats(),
        debtService.getDebts().catch(() => []),
      ]);
      setAccounts(accountsData);
      setAllTransactions(transactionsData);
      setRecentTransactions(transactionsData.slice(0, 5));
      setTransactionStats(statsData);
      setDebts(debtsData);
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const totalBalance = useMemo(() =>
    accounts.reduce((sum, acc) => sum + acc.balance, 0),
    [accounts]
  );
  const totalIncome = transactionStats?.total_income || 0;
  const totalExpense = transactionStats?.total_expense || 0;
  const netIncome = totalIncome - totalExpense;
  const savingsRate = totalIncome > 0 ? Math.round(((totalIncome - totalExpense) / totalIncome) * 100) : 0;

  /* Animated numbers */
  const animBalance = useAnimatedNumber(totalBalance);
  const animIncome = useAnimatedNumber(totalIncome, 1000);
  const animExpense = useAnimatedNumber(totalExpense, 1000);

  /* ── Derived: 6-month cash flow data ─────────────────── */
  const monthlyData = useMemo(() => {
    const locale = i18n.language === 'ru' ? 'ru-RU' : 'en-US';
    const now = new Date();
    const map = new Map<string, { income: number; expense: number }>();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      map.set(d.toLocaleDateString(locale, { month: 'short' }), { income: 0, expense: 0 });
    }
    allTransactions.forEach(tx => {
      const key = new Date(tx.transaction_date).toLocaleDateString(locale, { month: 'short' });
      if (map.has(key)) {
        const e = map.get(key)!;
        if (tx.transaction_type === TransactionType.INCOME) e.income += tx.amount;
        else e.expense += tx.amount;
      }
    });
    return Array.from(map.entries()).map(([month, v]) => ({
      month,
      [t('dashboard.income')]: Math.round(v.income),
      [t('dashboard.expenses')]: Math.round(v.expense),
    }));
  }, [allTransactions, i18n.language, t]);

  /* ── Derived: category spending donut ────────────────── */
  const categoryData = useMemo(() => {
    const catMap = new Map<string, { name: string; value: number; icon: string }>();
    allTransactions
      .filter(tx => tx.transaction_type === TransactionType.EXPENSE)
      .forEach(tx => {
        const key = tx.category?.name || 'Other';
        const ex = catMap.get(key);
        if (ex) ex.value += tx.amount;
        else catMap.set(key, { name: key, value: tx.amount, icon: tx.category?.icon || 'folder' });
      });
    return Array.from(catMap.values())
      .sort((a, b) => b.value - a.value)
      .slice(0, 6)
      .map((item, i) => ({ ...item, color: COLORS[i % COLORS.length] }));
  }, [allTransactions]);

  /* ── Derived: debt snapshot ──────────────────────────── */
  const openDebts = debts.filter(d => !d.is_paid);
  const totalOwed = openDebts.filter(d => d.debt_type === 'DEBT').reduce((s, d) => s + d.amount, 0);
  const totalDue = openDebts.filter(d => d.debt_type === 'RECEIVABLE').reduce((s, d) => s + d.amount, 0);
  const debtTotal = totalOwed + totalDue;

  /* ── Derived: savings gauge SVG ──────────────────────── */
  const gaugeR = 52;
  const gaugeCircumference = 2 * Math.PI * gaugeR;
  const gaugeArc = gaugeCircumference * 0.75; // 270°
  const gaugeFill = (Math.max(0, Math.min(savingsRate, 100)) / 100) * gaugeArc;

  const incLabel = t('dashboard.income');
  const expLabel = t('dashboard.expenses');

  return (
    <AppLayout>
      {/* Header */}
      <header className="px-4 pt-4 sm:px-6 sm:pt-6 lg:px-8 lg:pt-8 pb-2 flex items-center justify-between">
        <div>
          <p className="text-gray-500 text-sm">{t('common.hello')},</p>
          <h2 className="text-2xl font-bold text-white">{user?.name?.split(' ')[0] || 'User'}</h2>
        </div>
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/notifications')} className="relative w-11 h-11 rounded-full bg-[#1A1A1A] border border-[#2A2A2A] flex items-center justify-center text-gray-400 hover:text-white hover:border-[#F5C518]/40 transition-all">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 01-3.46 0" /></svg>
            <span className="absolute top-2 right-2.5 w-2 h-2 bg-[#E17055] rounded-full" />
          </button>
          <div className="w-11 h-11 rounded-full bg-gradient-to-br from-[#F5C518] to-[#D4A810] flex items-center justify-center text-black font-bold text-sm cursor-pointer">
            {user?.name?.charAt(0) || 'U'}
          </div>
        </div>
      </header>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto px-4 pb-4 sm:px-6 sm:pb-6 lg:px-8 lg:pb-8">
        <motion.div className="max-w-7xl mx-auto space-y-6 mt-4"
          variants={containerV} initial="hidden" animate={isLoading ? 'hidden' : 'show'}>

          {/* ═══ SECTION 1: HERO + RECENT ═══════════════════ */}
          <motion.div variants={itemV} className="grid grid-cols-1 lg:grid-cols-5 gap-4 sm:gap-6 items-stretch">
            {/* Wallet Card (3/5) */}
            <div className="lg:col-span-3 relative rounded-3xl overflow-hidden flex flex-col" style={{ background: 'linear-gradient(135deg, #1A1A1A 0%, #0D0D0D 100%)' }}>
              <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#F5C518] to-transparent opacity-60" />
              <div className="absolute -right-12 -top-12 w-48 h-48 rounded-full" style={{ background: 'radial-gradient(circle, rgba(245,197,24,0.06) 0%, transparent 70%)' }} />
              <div className="absolute -left-8 -bottom-8 w-36 h-36 rounded-full" style={{ background: 'radial-gradient(circle, rgba(245,197,24,0.04) 0%, transparent 70%)' }} />

              <div className="relative z-10 p-5 sm:p-6 lg:p-8 flex-1 flex flex-col">
                <div className="flex items-center justify-between mb-6">
                  <span className="text-gray-500 text-xs uppercase tracking-widest font-semibold">{t('dashboard.myWallet')}</span>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-[#F5C518]/10 flex items-center justify-center">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#F5C518" strokeWidth="2" strokeLinecap="round">
                        <path d="M2 12C2 6.5 6.5 2 12 2" /><path d="M5 12c0-3.87 3.13-7 7-7" /><path d="M8 12a4 4 0 014-4" />
                        <circle cx="12" cy="12" r="1" fill="#F5C518" />
                      </svg>
                    </div>
                    <div className="w-10 h-7 rounded-md bg-gradient-to-br from-[#F5C518]/30 to-[#D4A810]/20 border border-[#F5C518]/20" />
                  </div>
                </div>

                <p className="text-gray-500 text-xs mb-1">{t('dashboard.totalBalance')}</p>
                <h3 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white tracking-tight mb-1">
                  {isLoading ? (
                    <span className="inline-block w-48 h-12 bg-[#2A2A2A] rounded-xl animate-pulse" />
                  ) : fmt(animBalance)}
                </h3>
                <p className="text-gray-600 text-xs mb-auto pb-6">
                  {accounts.length} {accounts.length === 1 ? t('common.accountSingular') : t('common.accountPlural')} · {user?.default_currency || 'USD'}
                </p>

                {/* Income / Expense pills with sparklines */}
                <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                  <div className="flex-1 bg-white/[0.04] backdrop-blur-sm rounded-2xl px-4 py-3 sm:px-5 sm:py-4 border border-white/[0.06]">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-[#00B894]/15 flex items-center justify-center">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#00B894" strokeWidth="2.5" strokeLinecap="round"><path d="M12 5v14M5 12l7-7 7 7" /></svg>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-gray-500 text-[11px] uppercase tracking-wider">{t('dashboard.income')}</p>
                        <p className="text-white font-bold text-lg">{isLoading ? '...' : fmt(animIncome)}</p>
                      </div>
                    </div>
                  </div>
                  <div className="flex-1 bg-white/[0.04] backdrop-blur-sm rounded-2xl px-4 py-3 sm:px-5 sm:py-4 border border-white/[0.06]">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-[#E17055]/15 flex items-center justify-center">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#E17055" strokeWidth="2.5" strokeLinecap="round"><path d="M12 19V5M5 12l7 7 7-7" /></svg>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-gray-500 text-[11px] uppercase tracking-wider">{t('dashboard.expenses')}</p>
                        <p className="text-white font-bold text-lg">{isLoading ? '...' : fmt(animExpense)}</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Accounts inside hero */}
                {!isLoading && accounts.length > 0 && (
                  <div className="mt-5 pt-5 border-t border-white/[0.06]">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-gray-500 text-xs uppercase tracking-widest font-semibold">{t('dashboard.myAccounts')}</span>
                      <button onClick={() => navigate('/accounts')} className="text-[10px] text-[#F5C518] font-semibold hover:underline">
                        {t('dashboard.viewAll')}
                      </button>
                    </div>
                    <div className="flex gap-3 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
                      {accounts.map((account) => (
                        <div
                          key={account.id}
                          className="min-w-[140px] sm:min-w-[160px] bg-white/[0.04] border border-white/[0.06] rounded-xl px-3.5 py-3 flex-shrink-0 cursor-pointer hover:border-[#F5C518]/20 transition-all"
                          onClick={() => navigate('/accounts')}
                        >
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-lg">{account.icon}</span>
                            <span className="text-gray-400 text-xs truncate">{account.name}</span>
                          </div>
                          <p className="text-white font-bold text-sm">{fmt(account.balance)}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Recent Transactions (2/5) */}
            <div className="lg:col-span-2 bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl p-5 flex flex-col">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-white font-bold text-sm">{t('dashboard.recent')}</h4>
                <button onClick={() => navigate('/transactions')} className="text-[10px] text-[#F5C518] font-semibold hover:underline">
                  {t('dashboard.seeAll')}
                </button>
              </div>
              <div className="flex-1 space-y-0.5 overflow-y-auto" style={{ scrollbarWidth: 'none' }}>
                {isLoading ? (
                  <div className="space-y-3">
                    {[1,2,3,4,5].map(i => (
                      <div key={i} className="flex items-center gap-2.5 py-2.5">
                        <div className="w-9 h-9 rounded-xl bg-[#2A2A2A] animate-pulse flex-shrink-0" />
                        <div className="flex-1 space-y-1.5">
                          <div className="w-24 h-2.5 bg-[#2A2A2A] rounded animate-pulse" />
                          <div className="w-16 h-2 bg-[#2A2A2A] rounded animate-pulse" />
                        </div>
                        <div className="w-14 h-3 bg-[#2A2A2A] rounded animate-pulse" />
                      </div>
                    ))}
                  </div>
                ) : recentTransactions.length === 0 ? (
                  <div className="text-center py-8 flex-1 flex flex-col items-center justify-center">
                    <p className="text-3xl mb-2">💸</p>
                    <p className="text-gray-500 text-xs mb-3">{t('dashboard.noTransactions')}</p>
                    <button onClick={() => navigate('/transactions')} className="bg-[#F5C518] text-black px-4 py-2 rounded-xl text-xs font-semibold hover:bg-[#FFD93D] transition-all">
                      {t('dashboard.addTransaction')}
                    </button>
                  </div>
                ) : (
                  recentTransactions.map((tx, idx) => {
                    const isIncome = tx.transaction_type === 'INCOME';
                    return (
                      <motion.div
                        key={tx.id}
                        initial={{ opacity: 0, x: 12 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: idx * 0.06, duration: 0.4 }}
                        className="flex items-center gap-2.5 py-2.5 px-2 rounded-xl hover:bg-white/[0.03] cursor-pointer transition-all border-l-2"
                        style={{ borderLeftColor: tx.category?.color || '#F5C518' }}
                        onClick={() => navigate('/transactions')}
                      >
                        <div className="w-9 h-9 rounded-xl bg-[#252525] flex items-center justify-center flex-shrink-0">
                          <CategoryIcon icon={tx.category?.icon || 'folder'} color={tx.category?.color || '#F5C518'} size="sm" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-white font-medium text-xs truncate">{tx.description}</p>
                          <p className="text-gray-600 text-[10px]">
                            {tx.category?.name || t('transactions.uncategorized')} · {new Date(tx.transaction_date).toLocaleDateString(i18n.language === 'ru' ? 'ru-RU' : 'en-US', { month: 'short', day: 'numeric' })}, {new Date(tx.transaction_date).toLocaleTimeString(i18n.language === 'ru' ? 'ru-RU' : 'en-US', { hour: '2-digit', minute: '2-digit', hour12: false })}
                          </p>
                        </div>
                        <p className={`font-bold text-xs flex-shrink-0 ${isIncome ? 'text-[#00B894]' : 'text-white'}`}>
                          {isIncome ? '+' : '-'}{fmt(tx.amount)}
                        </p>
                      </motion.div>
                    );
                  })
                )}
              </div>
            </div>
          </motion.div>

          {/* ═══ SECTION 2: CASH FLOW AREA CHART ════════════ */}
          <motion.div variants={itemV}
            className="bg-[#1A1A1A]/60 backdrop-blur-xl border border-[#2A2A2A] rounded-2xl p-6 relative overflow-hidden">
            <div className="absolute -top-16 -right-16 w-40 h-40 rounded-full opacity-[0.03]"
              style={{ background: 'radial-gradient(circle, #00B894, transparent)' }} />
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2">
                <div className="w-1 h-4 rounded-full bg-[#F5C518]" />
                <h3 className="text-white font-semibold text-sm">{t('dashboard.cashFlow')}</h3>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-[#00B894]" />
                  <span className="text-gray-500 text-[10px]">{incLabel}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-[#E17055]" />
                  <span className="text-gray-500 text-[10px]">{expLabel}</span>
                </div>
              </div>
            </div>
            {isLoading ? (
              <div className="h-[200px] flex items-center justify-center">
                <div className="w-8 h-8 border-2 border-[#F5C518]/30 border-t-[#F5C518] rounded-full animate-spin" />
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={monthlyData}>
                  <defs>
                    <linearGradient id="incG" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#00B894" stopOpacity={0.3} />
                      <stop offset="100%" stopColor="#00B894" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="expG" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#E17055" stopOpacity={0.2} />
                      <stop offset="100%" stopColor="#E17055" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="month" tick={{ fill: '#4B5563', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <Tooltip content={<ChartTooltip currency={currency} />} />
                  <Area type="monotone" dataKey={incLabel} name={incLabel} stroke="#00B894" strokeWidth={2.5}
                    fill="url(#incG)" dot={false} activeDot={{ r: 4, fill: '#00B894', stroke: '#0D0D0D', strokeWidth: 2 }}
                    animationDuration={1200} />
                  <Area type="monotone" dataKey={expLabel} name={expLabel} stroke="#E17055" strokeWidth={2}
                    fill="url(#expG)" dot={false} strokeDasharray="6 3"
                    activeDot={{ r: 4, fill: '#E17055', stroke: '#0D0D0D', strokeWidth: 2 }}
                    animationDuration={1400} />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </motion.div>

          {/* ═══ SECTION 3: INSIGHTS ROW ════════════════════ */}
          <motion.div variants={itemV} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">

            {/* 3a: Spending Donut */}
            <div className="bg-[#1A1A1A]/60 backdrop-blur-xl border border-[#2A2A2A] rounded-2xl p-5 relative overflow-hidden">
              <div className="absolute -top-10 -right-10 w-24 h-24 rounded-full opacity-[0.04]"
                style={{ background: 'radial-gradient(circle, #F5C518, transparent)' }} />
              <div className="flex items-center gap-2 mb-4">
                <div className="w-1 h-4 rounded-full bg-[#F5C518]" />
                <h3 className="text-white font-semibold text-sm">{t('dashboard.spendingByCategory')}</h3>
              </div>
              {isLoading ? (
                <div className="h-[180px] flex items-center justify-center">
                  <div className="w-8 h-8 border-2 border-[#F5C518]/30 border-t-[#F5C518] rounded-full animate-spin" />
                </div>
              ) : categoryData.length === 0 ? (
                <div className="h-[180px] flex items-center justify-center text-gray-600 text-xs">{t('common.noData')}</div>
              ) : (
                <>
                  <div className="relative">
                    <ResponsiveContainer width="100%" height={160}>
                      <PieChart>
                        <Pie data={categoryData} cx="50%" cy="50%" innerRadius={48} outerRadius={70}
                          paddingAngle={3} dataKey="value" cornerRadius={4}
                          animationBegin={200} animationDuration={900}>
                          {categoryData.map((_, i) => <Cell key={i} fill={categoryData[i].color} stroke="transparent" />)}
                        </Pie>
                      </PieChart>
                    </ResponsiveContainer>
                    {/* Center stat */}
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                      <p className="text-white font-bold text-lg">{fmt(totalExpense)}</p>
                      <p className="text-gray-500 text-[9px] uppercase tracking-wider">{t('dashboard.spent')}</p>
                    </div>
                  </div>
                  <div className="space-y-1.5 mt-2">
                    {categoryData.slice(0, 4).map(cat => {
                      const total = categoryData.reduce((s, c) => s + c.value, 0);
                      const pct = total > 0 ? Math.round((cat.value / total) * 100) : 0;
                      return (
                        <div key={cat.name} className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: cat.color }} />
                          <span className="text-gray-500 text-[10px] truncate flex-1">{cat.name}</span>
                          <span className="text-gray-400 text-[10px] font-medium">{pct}%</span>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </div>

            {/* 3b: Savings Rate Gauge */}
            <div className="bg-[#1A1A1A]/60 backdrop-blur-xl border border-[#2A2A2A] rounded-2xl p-5 flex flex-col items-center relative overflow-hidden">
              <div className="absolute -top-10 -left-10 w-24 h-24 rounded-full opacity-[0.04]"
                style={{ background: 'radial-gradient(circle, #00B894, transparent)' }} />
              <div className="flex items-center gap-2 mb-4 self-start">
                <div className="w-1 h-4 rounded-full bg-[#00B894]" />
                <h3 className="text-white font-semibold text-sm">{t('dashboard.savingsRate')}</h3>
              </div>
              {isLoading ? (
                <div className="flex-1 flex items-center justify-center">
                  <div className="w-8 h-8 border-2 border-[#00B894]/30 border-t-[#00B894] rounded-full animate-spin" />
                </div>
              ) : (
                <>
                  <svg viewBox="0 0 130 130" className="w-36 h-36 mb-3">
                    <defs>
                      <linearGradient id="savGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#F5C518" />
                        <stop offset="100%" stopColor="#00B894" />
                      </linearGradient>
                    </defs>
                    <circle cx="65" cy="65" r={gaugeR} fill="none" stroke="#1A1A1A" strokeWidth="10"
                      strokeLinecap="round" strokeDasharray={`${gaugeArc} ${gaugeCircumference}`}
                      transform="rotate(135 65 65)" />
                    <circle cx="65" cy="65" r={gaugeR} fill="none" stroke="url(#savGrad)" strokeWidth="10"
                      strokeLinecap="round" strokeDasharray={`${gaugeFill} ${gaugeCircumference}`}
                      transform="rotate(135 65 65)"
                      className="transition-all duration-[1500ms] ease-out" />
                    <text x="65" y="58" textAnchor="middle" className="fill-white font-bold" style={{ fontSize: '26px' }}>
                      {savingsRate}%
                    </text>
                    <text x="65" y="78" textAnchor="middle" className="fill-gray-500" style={{ fontSize: '10px' }}>
                      {t('dashboard.savings')}
                    </text>
                  </svg>
                  <div className="flex items-center gap-3 mt-auto">
                    <div className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${netIncome >= 0 ? 'bg-[#00B894]/10 text-[#00B894]' : 'bg-[#E17055]/10 text-[#E17055]'}`}>
                      {netIncome >= 0 ? '+' : ''}{fmt(netIncome)}
                    </div>
                    <span className="text-gray-600 text-[10px]">{transactionStats?.transaction_count || 0} {t('common.txns')}</span>
                  </div>
                </>
              )}
            </div>

            {/* 3c: Debt Snapshot */}
            <div className="bg-[#1A1A1A]/60 backdrop-blur-xl border border-[#2A2A2A] rounded-2xl p-5 flex flex-col relative overflow-hidden">
              <div className="absolute -bottom-10 -right-10 w-24 h-24 rounded-full opacity-[0.04]"
                style={{ background: 'radial-gradient(circle, #E17055, transparent)' }} />
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-1 h-4 rounded-full bg-[#E17055]" />
                  <h3 className="text-white font-semibold text-sm">{t('dashboard.debtSnapshot')}</h3>
                </div>
                <button onClick={() => navigate('/debts')} className="text-[10px] text-[#F5C518] font-semibold hover:underline">
                  {t('dashboard.viewAll')}
                </button>
              </div>
              {isLoading ? (
                <div className="flex-1 flex items-center justify-center">
                  <div className="w-8 h-8 border-2 border-[#E17055]/30 border-t-[#E17055] rounded-full animate-spin" />
                </div>
              ) : openDebts.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center">
                  <div className="w-12 h-12 rounded-xl bg-[#00B894]/10 flex items-center justify-center mb-2">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#00B894" strokeWidth="2" strokeLinecap="round"><polyline points="20 6 9 17 4 12" /></svg>
                  </div>
                  <p className="text-gray-500 text-xs">{t('dashboard.noDebts')}</p>
                </div>
              ) : (
                <>
                  <div className="flex gap-3 mb-4">
                    <div className="flex-1 bg-[#E17055]/[0.08] rounded-xl px-3 py-2.5 border border-[#E17055]/10">
                      <p className="text-gray-500 text-[9px] uppercase tracking-wider mb-0.5">{t('dashboard.iOwe')}</p>
                      <p className="text-[#E17055] text-base font-bold">{fmt(totalOwed)}</p>
                    </div>
                    <div className="flex-1 bg-[#00B894]/[0.08] rounded-xl px-3 py-2.5 border border-[#00B894]/10">
                      <p className="text-gray-500 text-[9px] uppercase tracking-wider mb-0.5">{t('dashboard.owedToMe')}</p>
                      <p className="text-[#00B894] text-base font-bold">{fmt(totalDue)}</p>
                    </div>
                  </div>

                  {/* Stacked ratio bar */}
                  {debtTotal > 0 && (
                    <div className="flex h-2 rounded-full overflow-hidden gap-0.5 mb-3">
                      <div className="rounded-full transition-all duration-1000 bg-[#E17055]"
                        style={{ width: `${(totalOwed / debtTotal) * 100}%` }} />
                      <div className="rounded-full transition-all duration-1000 bg-[#00B894]"
                        style={{ width: `${(totalDue / debtTotal) * 100}%` }} />
                    </div>
                  )}

                  <div className="mt-auto flex items-center justify-between">
                    <div className={`text-sm font-bold ${totalDue >= totalOwed ? 'text-[#00B894]' : 'text-[#E17055]'}`}>
                      {t('dashboard.netDebt')}: {totalDue >= totalOwed ? '+' : '-'}{fmt(Math.abs(totalDue - totalOwed))}
                    </div>
                    <span className="text-gray-600 text-[10px]">{t('dashboard.openItems', { count: openDebts.length })}</span>
                  </div>
                </>
              )}
            </div>
          </motion.div>


        </motion.div>
      </div>
    </AppLayout>
  );
};
