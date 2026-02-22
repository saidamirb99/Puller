import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, Legend, RadarChart, Radar, PolarGrid, PolarAngleAxis,
} from 'recharts';
import { AppLayout } from '../components/layout/AppLayout';
import { useAuth } from '../context/AuthContext';
import transactionService, { Transaction, TransactionStats, TransactionType } from '../services/transaction.service';
import accountService, { Account } from '../services/account.service';
import {
  startOfDay, endOfDay, startOfWeek, endOfWeek,
  startOfMonth, endOfMonth, startOfYear,
  subMonths,
  addDays, addMonths,
  eachDayOfInterval, eachWeekOfInterval, eachMonthOfInterval,
  differenceInCalendarDays, isSameMonth, isToday, format,
} from 'date-fns';
import type { Locale } from 'date-fns';
import { ru as ruLocale } from 'date-fns/locale';
import { isMaterialIcon } from '../data/icon-library';

/* ── Constants ─────────────────────────────────────────── */
const COLORS = ['#F5C518','#00B894','#E17055','#F0932B','#0984E3','#E84393','#00CEC9','#FF6B35','#FFD93D','#55EFC4'];
const makeFmt = (c: string) => (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: c }).format(n);
const makeFmtShort = (c: string) => {
  const sym = new Intl.NumberFormat('en-US', { style: 'currency', currency: c })
    .formatToParts(0).find(p => p.type === 'currency')?.value || '$';
  return (n: number) => {
    if (Math.abs(n) >= 1000) return `${sym}${(n / 1000).toFixed(1)}k`;
    return `${sym}${Math.round(n)}`;
  };
};

/* ── Framer-motion variants ────────────────────────────── */
const containerV = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.08 } } };
const itemV = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] } } };

/* ── Date range helpers ──────────────────────────────────── */
const rangeSpanDays = (start: Date, end: Date): number =>
  differenceInCalendarDays(end, start) + 1;

const shiftRange = (start: Date, end: Date, direction: 1 | -1): { start: Date; end: Date } => {
  const span = rangeSpanDays(start, end);
  const newStart = addDays(start, direction * span);
  let newEnd = addDays(end, direction * span);
  const now = new Date();
  if (newEnd > now) newEnd = now;
  return { start: startOfDay(newStart), end: endOfDay(newEnd) };
};

const isForwardDisabled = (end: Date): boolean =>
  startOfDay(end) >= startOfDay(new Date());

const formatRangeLabel = (start: Date, end: Date, locale?: Locale): string => {
  const sameDay = differenceInCalendarDays(end, start) === 0;
  const sameMonth = isSameMonth(start, end);
  const sameYear = start.getFullYear() === end.getFullYear();
  if (sameDay) return format(start, 'MMM d, yyyy', { locale });
  if (sameMonth) return `${format(start, 'MMM d', { locale })} \u2013 ${format(end, 'd, yyyy', { locale })}`;
  if (sameYear) return `${format(start, 'MMM d', { locale })} \u2013 ${format(end, 'MMM d, yyyy', { locale })}`;
  return `${format(start, 'MMM d, yyyy', { locale })} \u2013 ${format(end, 'MMM d, yyyy', { locale })}`;
};

type GroupingStrategy = 'single' | 'daily' | 'weekly' | 'monthly';
const getGroupingStrategy = (start: Date, end: Date): GroupingStrategy => {
  const span = rangeSpanDays(start, end);
  if (span <= 1) return 'single';
  if (span <= 14) return 'daily';
  if (span <= 90) return 'weekly';
  return 'monthly';
};

/* ── Tooltip components ────────────────────────────────── */
const ChartTooltip = ({ active, payload, currency = 'USD' }: any) => {
  if (!active || !payload?.length) return null;
  const f = makeFmt(currency);
  return (
    <div className="bg-[#111] border border-white/[0.07] rounded-xl px-4 py-2 shadow-xl backdrop-blur">
      <p className="text-white text-sm font-medium">{payload[0].name}</p>
      <p className="text-[#F5C518] font-bold">{f(payload[0].value)}</p>
    </div>
  );
};

const BarTooltip = ({ active, payload, label, currency = 'USD' }: any) => {
  if (!active || !payload?.length) return null;
  const f = makeFmt(currency);
  return (
    <div className="bg-[#111] border border-white/[0.07] rounded-xl px-4 py-3 shadow-xl backdrop-blur">
      <p className="text-gray-400 text-xs mb-2">{label}</p>
      {payload.map((e: any) => (
        <p key={e.name} className="text-sm font-medium" style={{ color: e.color }}>
          {e.name}: {f(e.value)}
        </p>
      ))}
    </div>
  );
};

/* ── SpendingGauge ─────────────────────────────────────── */
const SpendingGauge: React.FC<{ spent: number; income: number; label: string }> = ({ spent, income, label }) => {
  const pct = income > 0 ? Math.min((spent / income) * 100, 100) : 0;
  const circumference = 2 * Math.PI * 54;
  const dashLen = (pct / 100) * circumference * 0.75;
  return (
    <div className="flex flex-col items-center">
      <svg viewBox="0 0 130 130" className="w-40 h-40">
        <defs>
          <linearGradient id="gaugeGradA" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#F0932B" /><stop offset="100%" stopColor="#F5C518" />
          </linearGradient>
        </defs>
        <circle cx="65" cy="65" r="54" fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="10"
          strokeLinecap="round" strokeDasharray={`${circumference * 0.75} ${circumference}`}
          transform="rotate(135 65 65)" />
        <circle cx="65" cy="65" r="54" fill="none" stroke="url(#gaugeGradA)" strokeWidth="10"
          strokeLinecap="round" strokeDasharray={`${dashLen} ${circumference}`}
          transform="rotate(135 65 65)" className="transition-all duration-1000" />
        <text x="65" y="60" textAnchor="middle" className="fill-white font-bold" style={{ fontSize: '24px' }}>
          {Math.round(pct)}%
        </text>
        <text x="65" y="78" textAnchor="middle" className="fill-gray-500" style={{ fontSize: '10px' }}>
          {label}
        </text>
      </svg>
    </div>
  );
};

/* ── Calendar day interface ────────────────────────────── */
interface CalendarDay {
  date: Date;
  dayNumber: number;
  isCurrentMonth: boolean;
  income: number;
  expense: number;
}

const buildCalendarDays = (anchor: Date, txs: Transaction[]): CalendarDay[] => {
  const monthStart = startOfMonth(anchor);
  const monthEnd = endOfMonth(anchor);
  const calStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });

  const dailyMap = new Map<string, { income: number; expense: number }>();
  txs.forEach(tx => {
    const key = tx.transaction_date.slice(0, 10);
    const e = dailyMap.get(key) || { income: 0, expense: 0 };
    if (tx.transaction_type === TransactionType.INCOME) e.income += tx.amount;
    else e.expense += tx.amount;
    dailyMap.set(key, e);
  });

  return eachDayOfInterval({ start: calStart, end: calEnd }).map(date => {
    const key = format(date, 'yyyy-MM-dd');
    const data = dailyMap.get(key) || { income: 0, expense: 0 };
    return {
      date,
      dayNumber: date.getDate(),
      isCurrentMonth: isSameMonth(date, anchor),
      income: data.income,
      expense: data.expense,
    };
  });
};

/* ══════════════════════════════════════════════════════════
   MAIN COMPONENT
   ══════════════════════════════════════════════════════════ */
export const Analytics: React.FC = () => {
  const { user } = useAuth();
  const { t, i18n } = useTranslation();
  const isRu = i18n.language === 'ru';
  const locale = isRu ? ruLocale : undefined;
  const currency = user?.default_currency || 'USD';
  const fmt = useMemo(() => makeFmt(currency), [currency]);
  const fmtShort = useMemo(() => makeFmtShort(currency), [currency]);

  /* ── State ───────────────────────────────────────────── */
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [stats, setStats] = useState<TransactionStats | null>(null);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [startDate, setStartDate] = useState<Date>(() => startOfMonth(new Date()));
  const [endDate, setEndDate] = useState<Date>(() => endOfDay(new Date()));
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [tempStartDate, setTempStartDate] = useState('');
  const [tempEndDate, setTempEndDate] = useState('');

  const [allTimeStats, setAllTimeStats] = useState<TransactionStats | null>(null);

  const [calendarMonth, setCalendarMonth] = useState<Date>(new Date());
  const [calendarTransactions, setCalendarTransactions] = useState<Transaction[]>([]);
  const [isCalendarLoading, setIsCalendarLoading] = useState(false);

  /* ── Data loading ────────────────────────────────────── */
  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      const filters = {
        start_date: startDate.toISOString(),
        end_date: endDate.toISOString(),
      };
      const [txs, statsData, accountsData, allStats] = await Promise.all([
        transactionService.getTransactions({ ...filters, limit: 1000 }),
        transactionService.getTransactionStats(filters),
        accountService.getAccounts(),
        transactionService.getTransactionStats(),
      ]);
      setTransactions(txs);
      setStats(statsData);
      setAccounts(accountsData);
      setAllTimeStats(allStats);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  }, [startDate, endDate]);

  useEffect(() => { loadData(); }, [loadData]);

  /* Calendar data — fetches full month independently */
  useEffect(() => {
    const fetchCalendar = async () => {
      setIsCalendarLoading(true);
      try {
        const s = startOfMonth(calendarMonth);
        const e = endOfMonth(calendarMonth);
        const txs = await transactionService.getTransactions({
          start_date: s.toISOString(),
          end_date: endOfDay(e).toISOString(),
          limit: 1000,
        });
        setCalendarTransactions(txs);
      } catch (err) {
        console.error(err);
      } finally {
        setIsCalendarLoading(false);
      }
    };
    fetchCalendar();
  }, [calendarMonth]);

  /* ── Derived values ──────────────────────────────────── */
  const totalIncome = stats?.total_income || 0;
  const totalExpense = stats?.total_expense || 0;
  const netIncome = stats?.net_income || 0;
  const txnCount = stats?.transaction_count || 0;
  const avgTxn = txnCount > 0 ? totalExpense / txnCount : 0;
  const savingsRate = totalIncome > 0 ? Math.round(((totalIncome - totalExpense) / totalIncome) * 100) : 0;
  const totalBalance = useMemo(() =>
    accounts.reduce((sum, acc) => sum + acc.balance, 0),
    [accounts],
  );

  /* All-time totals (unfiltered — for hero card) */
  const allTimeIncome = allTimeStats?.total_income || 0;
  const allTimeExpense = allTimeStats?.total_expense || 0;
  const allTimeNet = allTimeStats?.net_income || 0;

  /* ── Expense category data ───────────────────────────── */
  const expenseCategoryData = useMemo(() => {
    const map = new Map<string, { name: string; value: number; icon: string }>();
    transactions.filter(tx => tx.transaction_type === TransactionType.EXPENSE).forEach(tx => {
      const key = tx.category?.name || 'Other';
      const ex = map.get(key);
      if (ex) ex.value += tx.amount;
      else map.set(key, { name: key, value: tx.amount, icon: tx.category?.icon || 'folder' });
    });
    return Array.from(map.values()).sort((a, b) => b.value - a.value).slice(0, 8)
      .map((item, i) => ({ ...item, color: COLORS[i % COLORS.length] }));
  }, [transactions]);

  /* ── Income category data ────────────────────────────── */
  const incomeCategoryData = useMemo(() => {
    const map = new Map<string, { name: string; value: number; icon: string }>();
    transactions.filter(tx => tx.transaction_type === TransactionType.INCOME).forEach(tx => {
      const key = tx.category?.name || 'Other';
      const ex = map.get(key);
      if (ex) ex.value += tx.amount;
      else map.set(key, { name: key, value: tx.amount, icon: tx.category?.icon || 'monetization_on' });
    });
    return Array.from(map.values()).sort((a, b) => b.value - a.value).slice(0, 8)
      .map((item, i) => ({ ...item, color: COLORS[i % COLORS.length] }));
  }, [transactions]);

  /* ── Bar chart data (period-adaptive) ────────────────── */
  const incLabel = t('transactions.income');
  const expLabel = t('transactions.expenses');

  const barData = useMemo(() => {
    const strategy = getGroupingStrategy(startDate, endDate);

    if (strategy === 'single') {
      return [{
        label: format(startDate, 'MMM d', { locale }),
        [incLabel]: Math.round(totalIncome * 100) / 100,
        [expLabel]: Math.round(totalExpense * 100) / 100,
      }];
    }

    if (strategy === 'daily') {
      const days = eachDayOfInterval({ start: startDate, end: endDate });
      return days.map(d => {
        const key = format(d, 'yyyy-MM-dd');
        let inc = 0, exp = 0;
        transactions.forEach(tx => {
          if (tx.transaction_date.slice(0, 10) === key) {
            if (tx.transaction_type === TransactionType.INCOME) inc += tx.amount;
            else exp += tx.amount;
          }
        });
        return {
          label: format(d, days.length <= 7 ? 'EEE' : 'M/d', { locale }),
          [incLabel]: Math.round(inc * 100) / 100,
          [expLabel]: Math.round(exp * 100) / 100,
        };
      });
    }

    if (strategy === 'weekly') {
      const weekStarts = eachWeekOfInterval(
        { start: startDate, end: endDate },
        { weekStartsOn: 1 },
      );
      return weekStarts.map((ws, i) => {
        const we = i < weekStarts.length - 1 ? addDays(weekStarts[i + 1], -1) : endDate;
        let inc = 0, exp = 0;
        transactions.forEach(tx => {
          const txDate = new Date(tx.transaction_date);
          if (txDate >= ws && txDate <= endOfDay(we)) {
            if (tx.transaction_type === TransactionType.INCOME) inc += tx.amount;
            else exp += tx.amount;
          }
        });
        return {
          label: format(ws, 'M/d', { locale }),
          [incLabel]: Math.round(inc * 100) / 100,
          [expLabel]: Math.round(exp * 100) / 100,
        };
      });
    }

    /* monthly */
    const monthStarts = eachMonthOfInterval({ start: startDate, end: endDate });
    return monthStarts.map(ms => {
      const me = endOfMonth(ms);
      let inc = 0, exp = 0;
      transactions.forEach(tx => {
        const txDate = new Date(tx.transaction_date);
        if (txDate >= ms && txDate <= me) {
          if (tx.transaction_type === TransactionType.INCOME) inc += tx.amount;
          else exp += tx.amount;
        }
      });
      return {
        label: format(ms, 'MMM', { locale }),
        [incLabel]: Math.round(inc * 100) / 100,
        [expLabel]: Math.round(exp * 100) / 100,
      };
    });
  }, [transactions, startDate, endDate, totalIncome, totalExpense, incLabel, expLabel, locale]);

  /* ── Radar chart data ────────────────────────────────── */
  const radarData = useMemo(() => {
    const cats = new Map<string, { income: number; expense: number }>();
    [...expenseCategoryData, ...incomeCategoryData].forEach(c => {
      if (!cats.has(c.name)) cats.set(c.name, { income: 0, expense: 0 });
    });
    expenseCategoryData.forEach(c => { const e = cats.get(c.name)!; e.expense = c.value; });
    incomeCategoryData.forEach(c => { const e = cats.get(c.name)!; e.income = c.value; });
    return Array.from(cats.entries()).slice(0, 6).map(([name, v]) => ({
      category: name,
      [incLabel]: v.income,
      [expLabel]: v.expense,
    }));
  }, [expenseCategoryData, incomeCategoryData, incLabel, expLabel]);

  /* ── Calendar days ───────────────────────────────────── */
  const calendarDays = useMemo(
    () => buildCalendarDays(calendarMonth, calendarTransactions),
    [calendarMonth, calendarTransactions]
  );

  /* ── Date label for selector ─────────────────────────── */
  const dateLabel = useMemo(
    () => formatRangeLabel(startDate, endDate, locale),
    [startDate, endDate, locale],
  );

  /* ── Stat cards config ───────────────────────────────── */
  const statCards = [
    { label: t('analytics.totalIncome'), value: totalIncome, color: '#00B894', icon: 'M7 17l4-4 4 4M7 7l4 4 4-4' },
    { label: t('analytics.totalExpenses'), value: totalExpense, color: '#E17055', icon: 'M7 7l4 4 4-4M7 17l4-4 4 4' },
    { label: t('analytics.netSavings'), value: netIncome, color: netIncome >= 0 ? '#F5C518' : '#E17055',
      icon: netIncome >= 0 ? 'M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6' : 'M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z' },
  ];

  const extraStats = [
    { label: t('analytics.transactionCount'), value: txnCount, formatted: txnCount.toString(), color: '#F5C518', icon: 'M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z' },
    { label: t('analytics.avgTransaction'), value: avgTxn, formatted: fmt(avgTxn), color: '#0984E3', icon: 'M4 4h16v16H4zM9 9h6M9 12h4M9 15h6' },
    { label: t('analytics.savingsRate'), value: savingsRate, formatted: `${savingsRate}%`, color: '#00B894', icon: 'M23 6l-9.5 9.5-5-5L1 18' },
  ];

  const dayHeaders = isRu
    ? ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс']
    : ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  /* ══════════════════════════════════════════════════════
     RENDER
     ══════════════════════════════════════════════════════ */
  return (
    <AppLayout>
      <div className="p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-white">{t('analytics.title')}</h1>
          <p className="text-sm text-gray-500 mt-1">{t('analytics.subtitle')}</p>
        </div>

        <motion.div variants={containerV} initial="hidden" animate={isLoading ? 'hidden' : 'show'}
          className="space-y-6">

          {/* ═══ DATE RANGE SELECTOR ═══════════════════════ */}
          <motion.div variants={itemV}
            className="bg-[#0c0c18]/80 backdrop-blur-2xl border border-white/[0.05] rounded-2xl p-4">
            <div className="flex items-center justify-center gap-4">
              {/* Left arrow */}
              <button
                onClick={() => {
                  const shifted = shiftRange(startDate, endDate, -1);
                  setStartDate(shifted.start);
                  setEndDate(shifted.end);
                }}
                className="w-8 h-8 rounded-lg bg-white/[0.06] border border-white/[0.07] flex items-center justify-center text-gray-400 hover:text-[#F5C518] hover:border-[#F5C518]/40 transition-all">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M15 18l-6-6 6-6" /></svg>
              </button>

              {/* Date label */}
              <span className="text-white text-sm font-medium min-w-[200px] text-center">{dateLabel}</span>

              {/* Right arrow */}
              <button
                onClick={() => {
                  if (!isForwardDisabled(endDate)) {
                    const shifted = shiftRange(startDate, endDate, 1);
                    setStartDate(shifted.start);
                    setEndDate(shifted.end);
                  }
                }}
                disabled={isForwardDisabled(endDate)}
                className={`w-8 h-8 rounded-lg bg-white/[0.06] border border-white/[0.07] flex items-center justify-center transition-all ${
                  isForwardDisabled(endDate)
                    ? 'text-gray-700 cursor-not-allowed opacity-40'
                    : 'text-gray-400 hover:text-[#F5C518] hover:border-[#F5C518]/40'
                }`}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M9 18l6-6-6-6" /></svg>
              </button>

              {/* Calendar icon */}
              <button
                onClick={() => {
                  setTempStartDate(format(startDate, 'yyyy-MM-dd'));
                  setTempEndDate(format(endDate, 'yyyy-MM-dd'));
                  setShowDatePicker(true);
                }}
                className="w-8 h-8 rounded-lg bg-white/[0.06] border border-white/[0.07] flex items-center justify-center text-gray-400 hover:text-[#F5C518] hover:border-[#F5C518]/40 transition-all">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                  <line x1="16" y1="2" x2="16" y2="6" />
                  <line x1="8" y1="2" x2="8" y2="6" />
                  <line x1="3" y1="10" x2="21" y2="10" />
                </svg>
              </button>
            </div>
          </motion.div>

          {/* ═══ DATE PICKER MODAL ═══════════════════════════ */}
          {showDatePicker && (
            <div className="fixed inset-0 z-50 flex items-center justify-center"
              onClick={(e) => { if (e.target === e.currentTarget) setShowDatePicker(false); }}>
              <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowDatePicker(false)} />
              <div className="relative w-full max-w-sm bg-[#0c0c18]/80 backdrop-blur-2xl rounded-3xl shadow-2xl overflow-hidden border border-white/[0.07]">
                {/* Top accent line */}
                <div className="absolute top-0 left-0 right-0 h-[2px]"
                  style={{ background: 'linear-gradient(90deg, transparent, #F5C51860, transparent)' }} />

                {/* Header */}
                <div className="flex items-center justify-between px-5 pt-5 pb-3">
                  <button onClick={() => setShowDatePicker(false)}
                    className="w-8 h-8 flex items-center justify-center rounded-xl bg-white/[0.06] text-gray-400 hover:text-white hover:bg-white/[0.1] transition-all">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                      <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  </button>
                  <h2 className="text-white font-semibold text-base">{t('analytics.selectPeriod')}</h2>
                  <div className="w-8" />
                </div>

                <div className="px-5 pb-6 space-y-5">
                  {/* Date inputs */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-gray-500 text-[10px] uppercase tracking-wider font-medium mb-1.5 block">
                        {t('analytics.startDate')}
                      </label>
                      <input type="date" value={tempStartDate}
                        max={tempEndDate || format(new Date(), 'yyyy-MM-dd')}
                        onChange={(e) => setTempStartDate(e.target.value)}
                        className="w-full bg-white/[0.06] border border-white/[0.07] rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-[#F5C518]/40 transition-colors [color-scheme:dark]" />
                    </div>
                    <div>
                      <label className="text-gray-500 text-[10px] uppercase tracking-wider font-medium mb-1.5 block">
                        {t('analytics.endDate')}
                      </label>
                      <input type="date" value={tempEndDate}
                        min={tempStartDate}
                        max={format(new Date(), 'yyyy-MM-dd')}
                        onChange={(e) => setTempEndDate(e.target.value)}
                        className="w-full bg-white/[0.06] border border-white/[0.07] rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-[#F5C518]/40 transition-colors [color-scheme:dark]" />
                    </div>
                  </div>

                  {/* Quick presets */}
                  <div className="flex flex-wrap gap-2">
                    {[
                      { label: t('analytics.today'), start: startOfDay(new Date()), end: endOfDay(new Date()) },
                      { label: t('analytics.thisWeek'), start: startOfWeek(new Date(), { weekStartsOn: 1 }), end: endOfDay(new Date()) },
                      { label: t('analytics.thisMonth'), start: startOfMonth(new Date()), end: endOfDay(new Date()) },
                      { label: t('analytics.lastMonth'), start: startOfMonth(subMonths(new Date(), 1)), end: endOfMonth(subMonths(new Date(), 1)) },
                      { label: t('analytics.thisYear'), start: startOfYear(new Date()), end: endOfDay(new Date()) },
                      { label: t('analytics.last3Months'), start: startOfMonth(subMonths(new Date(), 2)), end: endOfDay(new Date()) },
                    ].map((preset) => (
                      <button key={preset.label}
                        onClick={() => {
                          setTempStartDate(format(preset.start, 'yyyy-MM-dd'));
                          setTempEndDate(format(preset.end, 'yyyy-MM-dd'));
                        }}
                        className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all border ${
                          tempStartDate === format(preset.start, 'yyyy-MM-dd') && tempEndDate === format(preset.end, 'yyyy-MM-dd')
                            ? 'bg-[#F5C518] text-black border-[#F5C518]'
                            : 'bg-transparent border-white/[0.07] text-gray-400 hover:border-[#F5C518]/40 hover:text-white'
                        }`}>
                        {preset.label}
                      </button>
                    ))}
                  </div>

                  {/* Action buttons */}
                  <div className="flex gap-3">
                    <button
                      onClick={() => {
                        setTempStartDate(format(startOfMonth(new Date()), 'yyyy-MM-dd'));
                        setTempEndDate(format(new Date(), 'yyyy-MM-dd'));
                      }}
                      className="flex-1 py-3 rounded-2xl font-semibold text-sm text-gray-400 border border-white/[0.07] hover:border-[#F5C518]/40 hover:text-white transition-all">
                      {t('analytics.clearAll')}
                    </button>
                    <button
                      onClick={() => {
                        if (tempStartDate && tempEndDate) {
                          setStartDate(startOfDay(new Date(tempStartDate + 'T00:00:00')));
                          setEndDate(endOfDay(new Date(tempEndDate + 'T00:00:00')));
                        }
                        setShowDatePicker(false);
                      }}
                      className="flex-1 py-3 rounded-2xl font-semibold text-sm text-black transition-all active:scale-[0.97]"
                      style={{ background: 'linear-gradient(135deg, #F5C518, #F5C518CC)', boxShadow: '0 8px 24px #F5C51830' }}>
                      {t('analytics.apply')}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ═══ HERO BALANCE CARD ═════════════════════════ */}
          <motion.div variants={itemV}
            className="relative bg-[#0c0c18]/80 backdrop-blur-2xl border border-white/[0.05] rounded-2xl overflow-hidden">
            {/* Decorative gradient */}
            <div className="absolute top-0 left-0 right-0 h-[2px]"
              style={{ background: 'linear-gradient(90deg, transparent, #F5C51860, transparent)' }} />
            <div className="absolute -top-20 -right-20 w-60 h-60 rounded-full opacity-[0.07]"
              style={{ background: 'radial-gradient(circle, #F5C518, transparent)' }} />

            <div className="relative z-10 p-4 sm:p-6">
              {/* Header row: wallet label + total balance reference */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-[#F5C518]/10 flex items-center justify-center">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#F5C518" strokeWidth="2" strokeLinecap="round">
                      <path d="M21 12V7H5a2 2 0 010-4h14v4" />
                      <path d="M3 5v14a2 2 0 002 2h16v-5" />
                      <path d="M18 12a2 2 0 000 4h4v-4h-4z" />
                    </svg>
                  </div>
                  <span className="text-gray-500 text-xs uppercase tracking-widest font-semibold">{t('dashboard.myWallet')}</span>
                </div>
                <div className="text-right">
                  <p className="text-gray-600 text-[10px] uppercase tracking-wider">{t('dashboard.totalBalance')}</p>
                  <p className="text-white font-bold text-sm">{isLoading ? '...' : fmt(totalBalance)}</p>
                </div>
              </div>

              {/* Main number: net savings across all accounts (all time) */}
              <p className="text-gray-500 text-xs mb-1">{t('analytics.netSavings')}</p>
              <h3 className={`text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight mb-1 ${allTimeNet >= 0 ? 'text-[#00B894]' : 'text-[#E17055]'}`}>
                {isLoading ? (
                  <span className="inline-block w-48 h-10 bg-white/[0.07] rounded-xl animate-pulse" />
                ) : `${allTimeNet >= 0 ? '+' : ''}${fmt(allTimeNet)}`}
              </h3>
              <p className="text-gray-600 text-xs mb-5">
                {accounts.length} {accounts.length === 1 ? t('common.accountSingular') : t('common.accountPlural')}
              </p>

              {/* Income / Expense pills (all-time totals from all accounts) */}
              <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                <div className="flex-1 bg-white/[0.04] rounded-2xl px-4 py-3 sm:px-5 border border-white/[0.06]">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-[#00B894]/15 flex items-center justify-center">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#00B894" strokeWidth="2.5" strokeLinecap="round"><path d="M12 5v14M5 12l7-7 7 7" /></svg>
                    </div>
                    <div>
                      <p className="text-gray-500 text-[10px] uppercase tracking-wider">{t('analytics.totalIncome')}</p>
                      <p className="text-white font-bold text-base">{isLoading ? '...' : fmt(allTimeIncome)}</p>
                    </div>
                  </div>
                </div>
                <div className="flex-1 bg-white/[0.04] rounded-2xl px-4 py-3 sm:px-5 border border-white/[0.06]">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-[#E17055]/15 flex items-center justify-center">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#E17055" strokeWidth="2.5" strokeLinecap="round"><path d="M12 19V5M5 12l7 7 7-7" /></svg>
                    </div>
                    <div>
                      <p className="text-gray-500 text-[10px] uppercase tracking-wider">{t('analytics.totalExpenses')}</p>
                      <p className="text-white font-bold text-base">{isLoading ? '...' : fmt(allTimeExpense)}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>

          {/* ═══ STAT CARDS ════════════════════════════════ */}
          <motion.div variants={itemV}>
            {/* Row 1: 3 cards + gauge */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5 mb-5">
              <div className="sm:col-span-2 lg:col-span-3 grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-5">
                {statCards.map(card => (
                  <div key={card.label} className="relative rounded-2xl overflow-hidden p-5"
                    style={{ background: 'rgba(255,255,255,0.06)', border: `1px solid ${card.color}20` }}>
                    <div className="absolute -top-10 -right-10 w-24 h-24 rounded-full opacity-[0.06]"
                      style={{ background: `radial-gradient(circle, ${card.color}, transparent)` }} />
                    <div className="relative z-10">
                      <div className="w-9 h-9 rounded-xl flex items-center justify-center mb-4"
                        style={{ backgroundColor: `${card.color}15` }}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={card.color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d={card.icon} />
                        </svg>
                      </div>
                      <p className="text-gray-500 text-xs font-medium mb-1">{card.label}</p>
                      <p className="text-xl font-bold" style={{ color: card.color }}>
                        {isLoading ? '...' : fmt(card.value)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="bg-[#0c0c18]/80 backdrop-blur-2xl border border-white/[0.05] rounded-2xl p-4 flex items-center justify-center">
                {isLoading ? (
                  <div className="w-10 h-10 border-2 border-[#F5C518]/30 border-t-[#F5C518] rounded-full animate-spin" />
                ) : (
                  <SpendingGauge spent={totalExpense} income={totalIncome} label={t('analytics.totalExpenses')} />
                )}
              </div>
            </div>
            {/* Row 2: extra stats */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-5">
              {extraStats.map(card => (
                <div key={card.label} className="relative rounded-2xl overflow-hidden p-5"
                  style={{ background: 'rgba(255,255,255,0.06)', border: `1px solid ${card.color}20` }}>
                  <div className="absolute -top-10 -right-10 w-24 h-24 rounded-full opacity-[0.06]"
                    style={{ background: `radial-gradient(circle, ${card.color}, transparent)` }} />
                  <div className="relative z-10">
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center mb-4"
                      style={{ backgroundColor: `${card.color}15` }}>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={card.color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d={card.icon} />
                      </svg>
                    </div>
                    <p className="text-gray-500 text-xs font-medium mb-1">{card.label}</p>
                    <p className="text-xl font-bold" style={{ color: card.color }}>
                      {isLoading ? '...' : card.formatted}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>

          {/* ═══ DONUT CHARTS ROW ══════════════════════════ */}
          <motion.div variants={itemV} className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
            {/* Expense donut */}
            <div className="bg-[#0c0c18]/80 backdrop-blur-2xl border border-white/[0.05] rounded-2xl p-6">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-1 h-4 rounded-full bg-[#F5C518]" />
                <h3 className="text-white font-semibold text-sm">{t('analytics.spendingByCategory')}</h3>
              </div>
              <p className="text-gray-600 text-xs mb-5 ml-3">{t('analytics.spendingDesc')}</p>
              {isLoading ? (
                <div className="h-48 flex items-center justify-center">
                  <div className="w-8 h-8 border-2 border-[#F5C518]/30 border-t-[#F5C518] rounded-full animate-spin" />
                </div>
              ) : expenseCategoryData.length === 0 ? (
                <div className="h-48 flex items-center justify-center text-gray-600 text-sm">{t('analytics.noExpenseData')}</div>
              ) : (
                <>
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <Pie data={expenseCategoryData} cx="50%" cy="50%" innerRadius={60} outerRadius={85}
                        paddingAngle={4} dataKey="value" cornerRadius={4}>
                        {expenseCategoryData.map((_, i) => <Cell key={i} fill={expenseCategoryData[i].color} stroke="transparent" />)}
                      </Pie>
                      <Tooltip content={<ChartTooltip currency={currency} />} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-2 mt-3">
                    {expenseCategoryData.slice(0, 6).map(cat => {
                      const total = expenseCategoryData.reduce((s, c) => s + c.value, 0);
                      const pct = total > 0 ? Math.round((cat.value / total) * 100) : 0;
                      return (
                        <div key={cat.name} className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: cat.color }} />
                          <span className="text-gray-500 text-[11px] truncate flex-1">{cat.name}</span>
                          <span className="text-gray-400 text-[11px] font-medium">{pct}%</span>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </div>

            {/* Income donut */}
            <div className="bg-[#0c0c18]/80 backdrop-blur-2xl border border-white/[0.05] rounded-2xl p-6">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-1 h-4 rounded-full bg-[#00B894]" />
                <h3 className="text-white font-semibold text-sm">{t('analytics.incomeByCategory')}</h3>
              </div>
              <p className="text-gray-600 text-xs mb-5 ml-3">{t('analytics.incomeDesc')}</p>
              {isLoading ? (
                <div className="h-48 flex items-center justify-center">
                  <div className="w-8 h-8 border-2 border-[#00B894]/30 border-t-[#00B894] rounded-full animate-spin" />
                </div>
              ) : incomeCategoryData.length === 0 ? (
                <div className="h-48 flex items-center justify-center text-gray-600 text-sm">{t('analytics.noIncomeData')}</div>
              ) : (
                <>
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <Pie data={incomeCategoryData} cx="50%" cy="50%" innerRadius={60} outerRadius={85}
                        paddingAngle={4} dataKey="value" cornerRadius={4}>
                        {incomeCategoryData.map((_, i) => <Cell key={i} fill={incomeCategoryData[i].color} stroke="transparent" />)}
                      </Pie>
                      <Tooltip content={<ChartTooltip currency={currency} />} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-2 mt-3">
                    {incomeCategoryData.slice(0, 6).map(cat => {
                      const total = incomeCategoryData.reduce((s, c) => s + c.value, 0);
                      const pct = total > 0 ? Math.round((cat.value / total) * 100) : 0;
                      return (
                        <div key={cat.name} className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: cat.color }} />
                          <span className="text-gray-500 text-[11px] truncate flex-1">{cat.name}</span>
                          <span className="text-gray-400 text-[11px] font-medium">{pct}%</span>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          </motion.div>

          {/* ═══ BAR CHART + RADAR ═════════════════════════ */}
          <motion.div variants={itemV} className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5">
            {/* Bar chart */}
            <div className="bg-[#0c0c18]/80 backdrop-blur-2xl border border-white/[0.05] rounded-2xl p-6">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-1 h-4 rounded-full bg-[#00B894]" />
                <h3 className="text-white font-semibold text-sm">{t('analytics.monthlyOverview')}</h3>
              </div>
              <p className="text-gray-600 text-xs mb-5 ml-3">{t('analytics.monthlyDesc')}</p>
              {isLoading ? (
                <div className="h-48 flex items-center justify-center">
                  <div className="w-8 h-8 border-2 border-[#00B894]/30 border-t-[#00B894] rounded-full animate-spin" />
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={barData} barGap={4}>
                    <XAxis dataKey="label" tick={{ fill: '#6B7280', fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: '#6B7280', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => fmtShort(v)} />
                    <Tooltip content={<BarTooltip currency={currency} />} cursor={{ fill: '#ffffff06' }} />
                    <Legend wrapperStyle={{ fontSize: 11, color: '#6B7280', paddingTop: 8 }} />
                    <Bar dataKey={incLabel} fill="#00B894" radius={[6, 6, 0, 0]} maxBarSize={28} />
                    <Bar dataKey={expLabel} fill="#E17055" radius={[6, 6, 0, 0]} maxBarSize={28} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* Radar chart */}
            <div className="bg-[#0c0c18]/80 backdrop-blur-2xl border border-white/[0.05] rounded-2xl p-6">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-1 h-4 rounded-full bg-[#E84393]" />
                <h3 className="text-white font-semibold text-sm">{t('analytics.categoryComparison')}</h3>
              </div>
              <p className="text-gray-600 text-xs mb-5 ml-3">{t('analytics.categoryComparisonDesc')}</p>
              {isLoading ? (
                <div className="h-48 flex items-center justify-center">
                  <div className="w-8 h-8 border-2 border-[#E84393]/30 border-t-[#E84393] rounded-full animate-spin" />
                </div>
              ) : radarData.length < 3 ? (
                <div className="h-[260px] flex items-center justify-center text-gray-600 text-sm">
                  {t('analytics.notEnoughCategories')}
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={260}>
                  <RadarChart data={radarData} cx="50%" cy="50%" outerRadius="70%">
                    <PolarGrid stroke="rgba(255,255,255,0.07)" />
                    <PolarAngleAxis dataKey="category" tick={{ fill: '#6B7280', fontSize: 10 }} />
                    <Radar name={incLabel} dataKey={incLabel} stroke="#00B894" fill="#00B894" fillOpacity={0.15} strokeWidth={2} />
                    <Radar name={expLabel} dataKey={expLabel} stroke="#E17055" fill="#E17055" fillOpacity={0.15} strokeWidth={2} />
                    <Tooltip content={<BarTooltip currency={currency} />} />
                    <Legend wrapperStyle={{ fontSize: 11, color: '#6B7280', paddingTop: 8 }} />
                  </RadarChart>
                </ResponsiveContainer>
              )}
            </div>
          </motion.div>

          {/* ═══ CALENDAR VIEW ═════════════════════════════ */}
          <motion.div variants={itemV}
            className="bg-[#0c0c18]/80 backdrop-blur-2xl border border-white/[0.05] rounded-2xl p-6">
            <div className="flex items-center justify-between mb-5">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-1 h-4 rounded-full bg-[#F5C518]" />
                  <h3 className="text-white font-semibold text-sm">{t('analytics.calendarView')}</h3>
                </div>
                <p className="text-gray-600 text-xs ml-3">{t('analytics.calendarDesc')}</p>
              </div>
              {/* Calendar month nav */}
              <div className="flex items-center gap-3">
                <button onClick={() => setCalendarMonth(subMonths(calendarMonth, 1))}
                  className="w-8 h-8 rounded-lg bg-white/[0.06] border border-white/[0.07] flex items-center justify-center text-gray-400 hover:text-[#F5C518] hover:border-[#F5C518]/40 transition-all">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M15 18l-6-6 6-6" /></svg>
                </button>
                <span className="text-white text-sm font-medium min-w-[140px] text-center">
                  {format(calendarMonth, 'MMMM yyyy', { locale })}
                </span>
                <button onClick={() => setCalendarMonth(addMonths(calendarMonth, 1))}
                  className="w-8 h-8 rounded-lg bg-white/[0.06] border border-white/[0.07] flex items-center justify-center text-gray-400 hover:text-[#F5C518] hover:border-[#F5C518]/40 transition-all">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M9 18l6-6-6-6" /></svg>
                </button>
              </div>
            </div>

            {isCalendarLoading ? (
              <div className="h-[400px] flex items-center justify-center">
                <div className="w-8 h-8 border-2 border-[#F5C518]/30 border-t-[#F5C518] rounded-full animate-spin" />
              </div>
            ) : (
              <>
                {/* Day headers */}
                <div className="grid grid-cols-7 gap-px mb-px">
                  {dayHeaders.map(d => (
                    <div key={d} className="text-center text-gray-500 text-[11px] font-medium py-2">{d}</div>
                  ))}
                </div>
                {/* Calendar grid */}
                <div className="grid grid-cols-7 gap-px bg-white/[0.06] rounded-xl overflow-hidden">
                  {calendarDays.map((day, idx) => {
                    const today = isToday(day.date);
                    const hasData = day.income > 0 || day.expense > 0;
                    return (
                      <div key={idx}
                        className={`bg-[#0c0c18]/80 backdrop-blur-2xl p-1 sm:p-2 min-h-[56px] sm:min-h-[80px] transition-all ${
                          !day.isCurrentMonth ? 'opacity-30' : ''
                        } ${today ? 'ring-1 ring-inset ring-[#F5C518]/60' : ''}`}>
                        <p className={`text-xs font-medium mb-1 ${today ? 'text-[#F5C518]' : 'text-gray-400'}`}>
                          {day.dayNumber}
                        </p>
                        {hasData && day.isCurrentMonth && (
                          <div className="space-y-0.5">
                            {day.income > 0 && (
                              <p className="text-[#00B894] text-[10px] font-medium truncate">+{fmtShort(day.income)}</p>
                            )}
                            {day.expense > 0 && (
                              <p className="text-[#E17055] text-[10px] font-medium truncate">-{fmtShort(day.expense)}</p>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </motion.div>

          {/* ═══ CATEGORY BREAKDOWNS ═══════════════════════ */}
          <motion.div variants={itemV} className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
            {/* Expense categories */}
            {!isLoading && expenseCategoryData.length > 0 && (
              <div className="bg-[#0c0c18]/80 backdrop-blur-2xl border border-white/[0.05] rounded-2xl p-6">
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-1 h-4 rounded-full bg-[#F0932B]" />
                  <h3 className="text-white font-semibold text-sm">{t('analytics.topCategories')}</h3>
                </div>
                <p className="text-gray-600 text-xs mb-5 ml-3">{t('analytics.topCategoriesDesc')}</p>
                <div className="space-y-4">
                  {expenseCategoryData.map((cat, i) => {
                    const total = expenseCategoryData.reduce((s, c) => s + c.value, 0);
                    const pct = total > 0 ? Math.round((cat.value / total) * 100) : 0;
                    return (
                      <div key={cat.name} className="flex items-center gap-4 group">
                        <span className="text-gray-600 text-xs w-4 text-right font-mono">{i + 1}</span>
                        <div className="w-9 h-9 rounded-xl flex items-center justify-center"
                          style={{ backgroundColor: `${cat.color}15` }}>
                          {isMaterialIcon(cat.icon) ? (
                            <span className="material-symbols-outlined" style={{ color: cat.color, fontSize: 20 }}>{cat.icon}</span>
                          ) : (
                            <span className="text-base">{cat.icon}</span>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between items-center mb-1.5">
                            <span className="text-white text-sm font-medium">{cat.name}</span>
                            <span className="text-white text-sm font-bold">{fmt(cat.value)}</span>
                          </div>
                          <div className="h-1 bg-white/[0.04] rounded-full overflow-hidden">
                            <div className="h-full rounded-full transition-all duration-700"
                              style={{ width: `${pct}%`, background: `linear-gradient(90deg, ${cat.color}, ${cat.color}80)` }} />
                          </div>
                        </div>
                        <span className="text-gray-600 text-xs w-10 text-right font-medium">{pct}%</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Income categories */}
            {!isLoading && incomeCategoryData.length > 0 && (
              <div className="bg-[#0c0c18]/80 backdrop-blur-2xl border border-white/[0.05] rounded-2xl p-6">
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-1 h-4 rounded-full bg-[#00B894]" />
                  <h3 className="text-white font-semibold text-sm">{t('analytics.topIncomeCategories')}</h3>
                </div>
                <p className="text-gray-600 text-xs mb-5 ml-3">{t('analytics.topIncomeCategoriesDesc')}</p>
                <div className="space-y-4">
                  {incomeCategoryData.map((cat, i) => {
                    const total = incomeCategoryData.reduce((s, c) => s + c.value, 0);
                    const pct = total > 0 ? Math.round((cat.value / total) * 100) : 0;
                    return (
                      <div key={cat.name} className="flex items-center gap-4 group">
                        <span className="text-gray-600 text-xs w-4 text-right font-mono">{i + 1}</span>
                        <div className="w-9 h-9 rounded-xl flex items-center justify-center"
                          style={{ backgroundColor: `${cat.color}15` }}>
                          {isMaterialIcon(cat.icon) ? (
                            <span className="material-symbols-outlined" style={{ color: cat.color, fontSize: 20 }}>{cat.icon}</span>
                          ) : (
                            <span className="text-base">{cat.icon}</span>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between items-center mb-1.5">
                            <span className="text-white text-sm font-medium">{cat.name}</span>
                            <span className="text-white text-sm font-bold">{fmt(cat.value)}</span>
                          </div>
                          <div className="h-1 bg-white/[0.04] rounded-full overflow-hidden">
                            <div className="h-full rounded-full transition-all duration-700"
                              style={{ width: `${pct}%`, background: `linear-gradient(90deg, ${cat.color}, ${cat.color}80)` }} />
                          </div>
                        </div>
                        <span className="text-gray-600 text-xs w-10 text-right font-medium">{pct}%</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </motion.div>

        </motion.div>
      </div>
    </AppLayout>
  );
};
