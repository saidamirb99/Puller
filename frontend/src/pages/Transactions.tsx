import React, { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { AppLayout } from '../components/layout/AppLayout';
import { TransactionListItem } from '../components/transactions/TransactionListItem';
import { TransactionModal } from '../components/transactions/TransactionModal';
import { TransferModal } from '../components/transactions/TransferModal';
import { useAuth } from '../context/AuthContext';
import transactionService, {
  Transaction,
  TransactionType,
  TransactionCreate,
} from '../services/transaction.service';
import debtService, { DebtCreate } from '../services/debt.service';
import { containerV, itemV } from '../utils/motion';

const FILTER_COLORS: Record<string, string> = {
  all: '#F5C518',
  expense: '#E17055',
  income: '#00B894',
};

export const Transactions: React.FC = () => {
  const { user } = useAuth();
  const { t, i18n } = useTranslation();
  const currency = user?.default_currency || 'USD';
  const fmt = useMemo(
    () => (n: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(n),
    [currency],
  );

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [filteredTransactions, setFilteredTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showTransfer, setShowTransfer] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [activeFilter, setActiveFilter] = useState('all');

  const filters = [
    { label: t('transactions.all'), value: 'all' },
    { label: t('transactions.expenses'), value: 'expense' },
    { label: t('transactions.income'), value: 'income' },
  ];

  useEffect(() => { loadTransactions(); }, []);
  useEffect(() => { filterTransactions(); }, [activeFilter, transactions]);

  const loadTransactions = async () => {
    try {
      setIsLoading(true);
      const data = await transactionService.getTransactions();
      setTransactions(data);
    } catch (error) {
      console.error('Failed to load transactions:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const filterTransactions = () => {
    let filtered = [...transactions];
    if (activeFilter === 'expense') filtered = filtered.filter((t) => t.transaction_type === TransactionType.EXPENSE);
    else if (activeFilter === 'income') filtered = filtered.filter((t) => t.transaction_type === TransactionType.INCOME);
    setFilteredTransactions(filtered);
  };

  const handleCreateTransaction = async (data: TransactionCreate) => {
    if (editingTransaction) {
      await transactionService.updateTransaction(editingTransaction.id, data);
    } else {
      await transactionService.createTransaction(data);
    }
    setShowForm(false);
    setEditingTransaction(null);
    loadTransactions();
  };

  const handleCreateDebt = async (data: DebtCreate) => {
    await debtService.createDebt(data);
    setShowForm(false);
    setEditingTransaction(null);
  };

  const handleEditTransaction = (transaction: Transaction) => {
    setEditingTransaction(transaction);
    setShowForm(true);
  };

  const handleDeleteTransaction = async (id: string) => {
    if (window.confirm(t('transactions.deleteConfirm'))) {
      try {
        await transactionService.deleteTransaction(id);
        loadTransactions();
      } catch (error) {
        console.error('Failed to delete transaction:', error);
      }
    }
  };

  const openAddModal = () => { setEditingTransaction(null); setShowForm(true); };

  /* ── Summary stats ──────────────────────────────────── */
  const totalIncome = useMemo(
    () => transactions.filter(t => t.transaction_type === TransactionType.INCOME).reduce((s, t) => s + t.amount, 0),
    [transactions],
  );
  const totalExpense = useMemo(
    () => transactions.filter(t => t.transaction_type === TransactionType.EXPENSE).reduce((s, t) => s + t.amount, 0),
    [transactions],
  );

  /* ── Group by date ──────────────────────────────────── */
  const locale = i18n.language === 'ru' ? 'ru-RU' : 'en-US';
  const groupedTransactions = filteredTransactions.reduce((groups, transaction) => {
    const date = new Date(transaction.transaction_date).toLocaleDateString(locale, {
      weekday: 'long', month: 'long', day: 'numeric',
    });
    if (!groups[date]) groups[date] = [];
    groups[date].push(transaction);
    return groups;
  }, {} as Record<string, Transaction[]>);

  const getDayTotal = (txs: Transaction[]) =>
    txs.reduce((total, t) => t.transaction_type === TransactionType.INCOME ? total + t.amount : total - t.amount, 0);

  return (
    <AppLayout>
      <div className="p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto">
        <motion.div variants={containerV} initial="hidden" animate={isLoading ? 'hidden' : 'show'} className="space-y-6">

          {/* ═══ HERO HEADER ═══════════════════════════════════ */}
          <motion.div variants={itemV}>
            <div className="relative rounded-3xl overflow-hidden glass">
              {/* Gold accent line */}
              <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#F5C518] to-transparent opacity-80" />
              {/* Radial glow */}
              <div className="absolute -top-20 right-10 w-60 h-60 rounded-full opacity-[0.06]"
                style={{ background: 'radial-gradient(circle, #F5C518, transparent)' }} />
              <div className="relative z-10 p-4 sm:p-6 lg:p-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0">
                <div>
                  <h1 className="text-2xl font-bold text-white">{t('transactions.title')}</h1>
                  <p className="text-sm text-gray-500 mt-1">{t('transactions.subtitle')}</p>
                </div>
                <div className="hidden sm:flex items-center gap-2">
                  <button
                    onClick={() => setShowTransfer(true)}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-sm transition-all active:scale-95 bg-[#8B5CF6]/15 text-[#8B5CF6] border border-[#8B5CF6]/30 hover:bg-[#8B5CF6]/25"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                      <path d="M7 17L17 7M17 7H7M17 7V17" />
                    </svg>
                    {t('transfer.title')}
                  </button>
                  <button
                    onClick={openAddModal}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm transition-all active:scale-95"
                    style={{ background: 'linear-gradient(135deg, #F5C518, #D4A810)', color: '#000', boxShadow: '0 8px 24px rgba(245,197,24,0.25)' }}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                      <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
                    </svg>
                    {t('transactions.addTransaction')}
                  </button>
                </div>
              </div>
            </div>
          </motion.div>

          {/* ═══ SUMMARY PILLS ════════════════════════════════ */}
          <motion.div variants={itemV} className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <div className="relative glass rounded-2xl p-5 overflow-hidden">
              <div className="absolute -top-10 -right-10 w-24 h-24 rounded-full opacity-[0.05]"
                style={{ background: 'radial-gradient(circle, #00B894, transparent)' }} />
              <div className="relative z-10 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#00B894]/15 flex items-center justify-center">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#00B894" strokeWidth="2.5" strokeLinecap="round"><path d="M12 5v14M5 12l7-7 7 7" /></svg>
                </div>
                <div>
                  <p className="text-gray-500 text-[10px] uppercase tracking-wider">{t('analytics.totalIncome')}</p>
                  <p className="text-white font-bold text-lg">{fmt(totalIncome)}</p>
                </div>
              </div>
            </div>
            <div className="relative glass rounded-2xl p-5 overflow-hidden">
              <div className="absolute -top-10 -right-10 w-24 h-24 rounded-full opacity-[0.05]"
                style={{ background: 'radial-gradient(circle, #E17055, transparent)' }} />
              <div className="relative z-10 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#E17055]/15 flex items-center justify-center">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#E17055" strokeWidth="2.5" strokeLinecap="round"><path d="M12 19V5M5 12l7 7 7-7" /></svg>
                </div>
                <div>
                  <p className="text-gray-500 text-[10px] uppercase tracking-wider">{t('analytics.totalExpenses')}</p>
                  <p className="text-white font-bold text-lg">{fmt(totalExpense)}</p>
                </div>
              </div>
            </div>
          </motion.div>

          {/* ═══ FILTER CHIPS ═════════════════════════════════ */}
          <motion.div variants={itemV} className="flex gap-2 items-center">
            {filters.map((chip) => {
              const isActive = activeFilter === chip.value;
              const color = FILTER_COLORS[chip.value];
              return (
                <button
                  key={chip.value}
                  onClick={() => setActiveFilter(chip.value)}
                  className="px-4 py-2 rounded-full font-medium text-sm whitespace-nowrap transition-all duration-200"
                  style={{
                    backgroundColor: isActive ? `${color}18` : 'transparent',
                    color: isActive ? color : '#6B7280',
                    border: isActive ? `1.5px solid ${color}` : '1.5px solid rgba(255,255,255,0.07)',
                  }}
                >
                  {chip.label}
                </button>
              );
            })}
            <span className="ml-auto text-gray-600 text-xs">
              {filteredTransactions.length} {filteredTransactions.length === 1 ? t('transactions.transactionSingular') : t('transactions.transactionPlural')}
            </span>
          </motion.div>

          {/* ═══ TRANSACTION LIST ══════════════════════════════ */}
          {isLoading ? (
            <div className="flex flex-col items-center py-16">
              <div className="w-10 h-10 border-2 border-[#F5C518]/30 border-t-[#F5C518] rounded-full animate-spin mb-4" />
              <p className="text-gray-500 text-sm">{t('transactions.loading')}</p>
            </div>
          ) : filteredTransactions.length === 0 ? (
            <motion.div variants={itemV}
              className="relative glass rounded-2xl py-16 text-center overflow-hidden">
              <div className="absolute -top-20 left-1/2 -translate-x-1/2 w-60 h-60 rounded-full opacity-[0.06]"
                style={{ background: 'radial-gradient(circle, #F5C518, transparent)' }} />
              <div className="relative z-10">
                <div className="w-16 h-16 rounded-2xl bg-[#F5C518]/10 flex items-center justify-center mx-auto mb-4">
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#F5C518" strokeWidth="2" strokeLinecap="round">
                    <path d="M12 1v22M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" />
                  </svg>
                </div>
                <h3 className="text-lg font-bold text-white mb-2">{t('transactions.empty')}</h3>
                <p className="text-gray-500 text-sm mb-6 max-w-xs mx-auto">{t('transactions.emptyDesc')}</p>
                <button
                  onClick={openAddModal}
                  className="px-6 py-3 rounded-xl font-semibold text-sm text-black transition-all active:scale-95"
                  style={{ background: 'linear-gradient(135deg, #F5C518, #D4A810)' }}
                >
                  {t('transactions.addFirst')}
                </button>
              </div>
            </motion.div>
          ) : (
            <div className="space-y-6">
              {Object.entries(groupedTransactions).map(([date, dayTransactions]) => {
                const dayTotal = getDayTotal(dayTransactions);
                return (
                  <motion.div key={date} variants={itemV}>
                    {/* Day header */}
                    <div className="flex items-center justify-between mb-3 px-1">
                      <div className="flex items-center gap-2">
                        <div className="w-1 h-4 rounded-full bg-[#F5C518]" />
                        <h3 className="text-sm font-medium text-gray-400 capitalize">{date}</h3>
                      </div>
                      <p className={`text-sm font-semibold ${dayTotal >= 0 ? 'text-[#00B894]' : 'text-[#E17055]'}`}>
                        {dayTotal >= 0 ? '+' : ''}{fmt(dayTotal)}
                      </p>
                    </div>
                    {/* Day transactions */}
                    <div className="space-y-2">
                      {dayTransactions.map((transaction) => (
                        <TransactionListItem
                          key={transaction.id}
                          transaction={transaction}
                          onEdit={() => handleEditTransaction(transaction)}
                          onDelete={() => handleDeleteTransaction(transaction.id)}
                        />
                      ))}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </motion.div>

        {/* Transaction Modal */}
        {showForm && (
          <TransactionModal
            transaction={editingTransaction}
            onSubmit={handleCreateTransaction}
            onDebtSubmit={handleCreateDebt}
            onClose={() => { setShowForm(false); setEditingTransaction(null); }}
          />
        )}

        {/* Transfer Modal */}
        {showTransfer && (
          <TransferModal
            onSuccess={() => { setShowTransfer(false); loadTransactions(); }}
            onClose={() => setShowTransfer(false)}
          />
        )}
      </div>

    </AppLayout>
  );
};
