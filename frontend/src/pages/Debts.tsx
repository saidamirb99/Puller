import React, { useEffect, useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { AppLayout } from '../components/layout/AppLayout';
import debtService, { Debt, DebtCreate, DebtCategory } from '../services/debt.service';
import accountService, { Account } from '../services/account.service';
import { containerV, itemV } from '../utils/motion';

const fmt = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n);

const getDaysUntilDue = (dueDate: string) =>
  Math.ceil((new Date(dueDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));

const CATEGORIES: { value: DebtCategory; emoji: string }[] = [
  { value: 'PERSONAL', emoji: '👤' },
  { value: 'BUSINESS', emoji: '💼' },
  { value: 'LOAN', emoji: '🏦' },
];

const categoryColor: Record<string, string> = {
  PERSONAL: '#F5C518',
  BUSINESS: '#0984E3',
  LOAN: '#00B894',
};

const avatarColors = [
  'bg-yellow-500', 'bg-blue-500', 'bg-emerald-500',
  'bg-orange-500', 'bg-pink-500', 'bg-cyan-500',
];
const getAvatarColor = (name: string) =>
  avatarColors[name.charCodeAt(0) % avatarColors.length];

interface FormData {
  debtType: 'DEBT' | 'RECEIVABLE';
  amountStr: string;
  person: string;
  dueDate: string;
  category: DebtCategory | '';
  note: string;
  accountId: string;
}

const emptyForm: FormData = {
  debtType: 'RECEIVABLE',
  amountStr: '',
  person: '',
  dueDate: '',
  category: '',
  note: '',
  accountId: '',
};

// ─── Settle Modal ──────────────────────────────────────────────────────────────
interface SettleModalProps {
  debt: Debt;
  accounts: Account[];
  onConfirm: (accountId: string | null) => void;
  onCancel: () => void;
}
const SettleModal: React.FC<SettleModalProps> = ({ debt, accounts, onConfirm, onCancel }) => {
  const { t } = useTranslation();
  const [selected, setSelected] = useState<string>(debt.account_id || '');
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onCancel();
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [onCancel]);

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-[70] p-4">
      <div ref={ref} className="relative bg-[#0D0D0D] border border-[#2A2A2A] rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-[2px]"
          style={{ background: 'linear-gradient(90deg, transparent, #00B89460, transparent)' }} />
        <div className="p-6">
          <h3 className="text-white font-bold text-lg mb-1">{t('debts.markPaid')}</h3>
          <p className="text-gray-500 text-sm mb-5">{t('debts.settlementAccount')}</p>
          <div className="space-y-2 max-h-48 overflow-y-auto mb-5">
            <button
              onClick={() => setSelected('')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border transition-all ${
                selected === '' ? 'border-[#F5C518] bg-[#F5C518]/10' : 'border-[#2A2A2A] hover:border-[#F5C518]/30'
              }`}
            >
              <span className="text-xl">💸</span>
              <span className="text-white text-sm">{t('debts.skipAccount')}</span>
            </button>
            {accounts.map(acc => (
              <button
                key={acc.id}
                onClick={() => setSelected(acc.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border transition-all ${
                  selected === acc.id ? 'border-[#F5C518] bg-[#F5C518]/10' : 'border-[#2A2A2A] hover:border-[#F5C518]/30'
                }`}
              >
                <span className="text-xl">{acc.icon}</span>
                <div className="text-left flex-1 min-w-0">
                  <p className="text-white text-sm font-medium truncate">{acc.name}</p>
                  <p className="text-gray-500 text-xs">{fmt(acc.balance)}</p>
                </div>
              </button>
            ))}
          </div>
          <div className="flex gap-3">
            <button onClick={onCancel}
              className="flex-1 py-3 rounded-xl border border-[#2A2A2A] text-gray-400 hover:text-white hover:border-[#F5C518]/30 transition-all text-sm font-medium">
              {t('debts.cancel')}
            </button>
            <button onClick={() => onConfirm(selected || null)}
              className="flex-1 py-3 rounded-xl font-semibold text-sm text-black transition-all active:scale-[0.97]"
              style={{ background: 'linear-gradient(135deg, #00B894, #00B894CC)', boxShadow: '0 8px 24px #00B89430' }}>
              {t('debts.markPaid')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── Debt Card ─────────────────────────────────────────────────────────────────
interface DebtCardProps {
  debt: Debt;
  onMarkPaid: (debt: Debt) => void;
  onDelete: (id: string) => void;
  onClick: (id: string) => void;
}
const DebtCard: React.FC<DebtCardProps> = ({ debt, onMarkPaid, onDelete, onClick }) => {
  const { t } = useTranslation();
  const daysLeft = debt.due_date ? getDaysUntilDue(debt.due_date) : null;
  const isOverdue = daysLeft !== null && daysLeft < 0 && !debt.is_paid;
  const isReceivable = debt.debt_type === 'RECEIVABLE';
  const catInfo = CATEGORIES.find(c => c.value === debt.category);
  const catKey = debt.category?.toLowerCase();
  const catLabel = catKey ? t(`debts.category${debt.category!.charAt(0) + debt.category!.slice(1).toLowerCase()}`) : null;

  return (
    <div
      onClick={() => onClick(debt.id)}
      className={`relative bg-[#0D0D0D] rounded-2xl p-4 transition-all cursor-pointer group overflow-hidden ${
        debt.is_paid ? 'opacity-60' : 'hover:bg-[#111]'
      }`}
      style={{
        border: `1px solid ${isOverdue ? '#E1705540' : '#2A2A2A'}`,
        borderLeftWidth: '3px',
        borderLeftColor: isReceivable ? '#00B894' : '#E17055',
      }}
    >
      <div className="flex items-center gap-3">
        {/* Avatar */}
        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 text-white ${getAvatarColor(debt.person_name)}`}>
          {debt.person_name.charAt(0).toUpperCase()}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-white font-semibold text-sm">{debt.person_name}</p>
            {debt.is_paid && (
              <span className="text-[10px] px-2 py-0.5 bg-[#00B894]/15 text-[#00B894] rounded-full font-semibold uppercase">
                {t('debts.paid')}
              </span>
            )}
            {!debt.is_paid && !isOverdue && (
              <span className="text-[10px] px-2 py-0.5 bg-[#F5C518]/15 text-[#F5C518] rounded-full font-semibold uppercase">
                {t('debts.open')}
              </span>
            )}
            {isOverdue && (
              <span className="text-[10px] px-2 py-0.5 bg-[#E17055]/15 text-[#E17055] rounded-full font-semibold uppercase">
                {t('debts.overdue')}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 mt-1 flex-wrap">
            {catInfo && (
              <span
                className="text-[10px] px-1.5 py-0.5 rounded-md font-medium"
                style={{ backgroundColor: `${categoryColor[debt.category!]}20`, color: categoryColor[debt.category!] }}
              >
                {catInfo.emoji} {catLabel}
              </span>
            )}
            {debt.due_date && (
              <span className={`text-xs ${isOverdue ? 'text-[#E17055]' : 'text-gray-500'}`}>
                {daysLeft !== null && !debt.is_paid
                  ? daysLeft < 0
                    ? t('debts.overdue')
                    : daysLeft === 0
                    ? t('common.today')
                    : t('debts.dueIn').replace('{{days}}', String(daysLeft))
                  : new Date(debt.due_date).toLocaleDateString()}
              </span>
            )}
            {debt.account && (
              <span className="text-[10px] px-1.5 py-0.5 bg-[#F5C518]/10 border border-[#F5C518]/20 text-[#F5C518] rounded-md">
                {debt.account.icon} {debt.account.name}
              </span>
            )}
          </div>

          {debt.description && (
            <p className="text-gray-600 text-xs mt-1 truncate">{debt.description}</p>
          )}
        </div>

        {/* Amount + Actions */}
        <div className="flex flex-col items-end gap-2 flex-shrink-0">
          <p className={`text-base font-bold ${isReceivable ? 'text-[#00B894]' : 'text-[#E17055]'}`}>
            {isReceivable ? '+' : '-'}{fmt(debt.amount)}
          </p>
          {!debt.is_paid && (
            <div className="flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                onClick={(e) => { e.stopPropagation(); onMarkPaid(debt); }}
                className="text-[11px] px-2.5 py-1 bg-[#00B894]/10 text-[#00B894] rounded-lg hover:bg-[#00B894]/20 transition-all font-medium"
              >
                {t('debts.markPaid')}
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); onDelete(debt.id); }}
                className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-[#E17055]/10 text-gray-500 hover:text-[#E17055] transition-all"
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <polyline points="3 6 5 6 21 6" />
                  <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
                </svg>
              </button>
            </div>
          )}
          {debt.is_paid && (
            <button
              onClick={(e) => { e.stopPropagation(); onDelete(debt.id); }}
              className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-[#E17055]/10 text-gray-600 hover:text-[#E17055] transition-all opacity-0 group-hover:opacity-100"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <polyline points="3 6 5 6 21 6" />
                <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
              </svg>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

// ─── Main Page ─────────────────────────────────────────────────────────────────
export const Debts: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'RECEIVABLE' | 'DEBT'>('RECEIVABLE');
  const [debts, setDebts] = useState<Debt[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('');
  const [showHistory, setShowHistory] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [settleDebt, setSettleDebt] = useState<Debt | null>(null);
  const [form, setForm] = useState<FormData>(emptyForm);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [saveError, setSaveError] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [showAccountPicker, setShowAccountPicker] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);
  const accountPickerRef = useRef<HTMLDivElement>(null);
  const amountRef = useRef<HTMLInputElement>(null);

  useEffect(() => { loadAll(); }, []);

  useEffect(() => {
    if (!showModal) return;
    const h = (e: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(e.target as Node)) setShowModal(false);
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [showModal]);

  useEffect(() => {
    if (!showAccountPicker) return;
    const h = (e: MouseEvent) => {
      if (accountPickerRef.current && !accountPickerRef.current.contains(e.target as Node)) setShowAccountPicker(false);
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [showAccountPicker]);

  const loadAll = async () => {
    try {
      setIsLoading(true);
      const [debtsData, accountsData] = await Promise.all([
        debtService.getDebts(),
        accountService.getAccounts(),
      ]);
      setDebts(debtsData);
      setAccounts(accountsData);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const applyFilters = (list: Debt[]) =>
    list.filter(d => {
      if (d.debt_type !== activeTab) return false;
      if (search && !d.person_name.toLowerCase().includes(search.toLowerCase())) return false;
      if (categoryFilter && d.category !== categoryFilter) return false;
      return true;
    });

  const activeDebts = applyFilters(debts.filter(d => !d.is_paid));
  const historyDebts = applyFilters(debts.filter(d => d.is_paid));

  const totalOwed = debts.filter(d => d.debt_type === 'DEBT' && !d.is_paid).reduce((s, d) => s + d.amount, 0);
  const totalDue = debts.filter(d => d.debt_type === 'RECEIVABLE' && !d.is_paid).reduce((s, d) => s + d.amount, 0);
  const owedCount = debts.filter(d => d.debt_type === 'DEBT' && !d.is_paid).length;
  const dueCount = debts.filter(d => d.debt_type === 'RECEIVABLE' && !d.is_paid).length;
  const debtTotal = totalOwed + totalDue;

  const openModal = () => {
    setForm({
      ...emptyForm,
      debtType: activeTab === 'RECEIVABLE' ? 'RECEIVABLE' : 'DEBT',
      category: categoryFilter as typeof emptyForm.category,
    });
    setFormErrors({});
    setSaveError('');
    setShowModal(true);
    setTimeout(() => amountRef.current?.focus(), 200);
  };

  const validateForm = () => {
    const errors: Record<string, string> = {};
    if (!form.person.trim()) errors.person = t('debts.errorPerson');
    const amt = parseFloat(form.amountStr);
    if (!form.amountStr || isNaN(amt) || amt <= 0) errors.amount = t('debts.errorAmount');
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) return;
    setSaveError('');
    setIsSaving(true);
    try {
      const payload: DebtCreate = {
        person_name: form.person.trim(),
        amount: parseFloat(form.amountStr),
        debt_type: form.debtType,
        category: form.category || null,
        description: form.note.trim() || undefined,
        due_date: form.dueDate || null,
        account_id: form.accountId || null,
      };
      await debtService.createDebt(payload);
      setShowModal(false);
      setForm(emptyForm);
      await loadAll();
    } catch (e: any) {
      setSaveError(e?.response?.data?.detail || 'Failed to save. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleMarkPaidConfirm = async (accountId: string | null) => {
    if (!settleDebt) return;
    try {
      await debtService.markPaid(settleDebt.id, accountId);
      setSettleDebt(null);
      await loadAll();
    } catch (e) {
      console.error(e);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm(t('debts.deleteConfirm'))) return;
    try {
      await debtService.deleteDebt(id);
      await loadAll();
    } catch (e) {
      console.error(e);
    }
  };

  const selectedAccountForForm = accounts.find(a => a.id === form.accountId);

  return (
    <AppLayout>
      <div className="p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto">
        <motion.div variants={containerV} initial="hidden" animate={isLoading ? 'hidden' : 'show'} className="space-y-6">

          {/* ═══ HERO HEADER ═══════════════════════════════════ */}
          <motion.div variants={itemV}>
            <div className="relative rounded-3xl overflow-hidden bg-[#1A1A1A]/60 backdrop-blur-xl border border-[#2A2A2A]">
              {/* Gold accent line */}
              <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#F5C518] to-transparent opacity-60" />
              {/* Radial glow */}
              <div className="absolute -top-20 right-10 w-60 h-60 rounded-full opacity-[0.03]"
                style={{ background: 'radial-gradient(circle, #F5C518, transparent)' }} />
              <div className="relative z-10 p-4 sm:p-6 lg:p-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0">
                <div>
                  <h1 className="text-2xl font-bold text-white">{t('debts.title')}</h1>
                  <p className="text-sm text-gray-500 mt-1">{t('debts.subtitle')}</p>
                </div>
                <button
                  onClick={openModal}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm transition-all active:scale-95"
                  style={{ background: 'linear-gradient(135deg, #F5C518, #D4A810)', color: '#000', boxShadow: '0 8px 24px rgba(245,197,24,0.25)' }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                    <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
                  </svg>
                  {t('debts.newEntry')}
                </button>
              </div>
            </div>
          </motion.div>

          {/* ═══ SUMMARY CARDS ═══════════════════════════════ */}
          <motion.div variants={itemV} className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <div className="relative bg-[#1A1A1A]/60 backdrop-blur-xl border border-[#2A2A2A] rounded-2xl p-5 overflow-hidden">
              <div className="absolute -top-10 -right-10 w-24 h-24 rounded-full opacity-[0.05]"
                style={{ background: 'radial-gradient(circle, #E17055, transparent)' }} />
              <div className="relative z-10 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#E17055]/15 flex items-center justify-center">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#E17055" strokeWidth="2.5" strokeLinecap="round"><path d="M12 19V5M5 12l7 7 7-7" /></svg>
                </div>
                <div>
                  <p className="text-gray-500 text-[10px] uppercase tracking-wider">{t('debts.totalOwed')}</p>
                  <p className="text-white font-bold text-lg">-{fmt(totalOwed)}</p>
                  <p className="text-gray-600 text-xs mt-0.5">{t('debts.activeCount').replace('{{count}}', String(owedCount))}</p>
                </div>
              </div>
            </div>
            <div className="relative bg-[#1A1A1A]/60 backdrop-blur-xl border border-[#2A2A2A] rounded-2xl p-5 overflow-hidden">
              <div className="absolute -top-10 -right-10 w-24 h-24 rounded-full opacity-[0.05]"
                style={{ background: 'radial-gradient(circle, #00B894, transparent)' }} />
              <div className="relative z-10 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#00B894]/15 flex items-center justify-center">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#00B894" strokeWidth="2.5" strokeLinecap="round"><path d="M12 5v14M5 12l7-7 7 7" /></svg>
                </div>
                <div>
                  <p className="text-gray-500 text-[10px] uppercase tracking-wider">{t('debts.totalDue')}</p>
                  <p className="text-white font-bold text-lg">+{fmt(totalDue)}</p>
                  <p className="text-gray-600 text-xs mt-0.5">{t('debts.activeCount').replace('{{count}}', String(dueCount))}</p>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Ratio bar */}
          {debtTotal > 0 && (
            <motion.div variants={itemV} className="flex h-1.5 rounded-full overflow-hidden gap-0.5 mx-1">
              <div className="rounded-full transition-all duration-1000 bg-[#E17055]"
                style={{ width: `${(totalOwed / debtTotal) * 100}%` }} />
              <div className="rounded-full transition-all duration-1000 bg-[#00B894]"
                style={{ width: `${(totalDue / debtTotal) * 100}%` }} />
            </motion.div>
          )}

          {/* ═══ TAB SWITCHER ═══════════════════════════════ */}
          <motion.div variants={itemV}>
            <div className="flex bg-[#1A1A1A]/60 backdrop-blur-xl border border-[#2A2A2A] rounded-xl p-1 gap-1">
              {(['RECEIVABLE', 'DEBT'] as const).map(tab => {
                const isActive = activeTab === tab;
                const color = tab === 'RECEIVABLE' ? '#00B894' : '#E17055';
                return (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className="flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all"
                    style={{
                      backgroundColor: isActive ? `${color}18` : 'transparent',
                      color: isActive ? color : '#6B7280',
                    }}
                  >
                    {tab === 'RECEIVABLE' ? t('debts.receivablesTab') : t('debts.debtsTab')}
                  </button>
                );
              })}
            </div>
          </motion.div>

          {/* ═══ SEARCH + FILTERS ═══════════════════════════ */}
          <motion.div variants={itemV} className="space-y-3">
            <div className="relative">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
              </div>
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder={t('debts.searchByName')}
                className="w-full pl-10 pr-4 py-3 bg-[#1A1A1A]/60 backdrop-blur-xl border border-[#2A2A2A] rounded-xl text-white placeholder-gray-500 text-sm focus:outline-none focus:border-[#F5C518]/40 transition-colors"
              />
            </div>

            <div className="flex gap-2 flex-wrap">
              <button
                onClick={() => setCategoryFilter('')}
                className="px-3 py-1.5 rounded-full text-xs font-semibold transition-all"
                style={{
                  backgroundColor: categoryFilter === '' ? '#F5C51818' : 'transparent',
                  color: categoryFilter === '' ? '#F5C518' : '#6B7280',
                  border: categoryFilter === '' ? '1.5px solid #F5C518' : '1.5px solid #2A2A2A',
                }}
              >
                {t('debts.allCategories')}
              </button>
              {CATEGORIES.map(cat => {
                const labelKey = `debts.category${cat.value.charAt(0) + cat.value.slice(1).toLowerCase()}`;
                const isActive = categoryFilter === cat.value;
                const color = categoryColor[cat.value];
                return (
                  <button
                    key={cat.value}
                    onClick={() => setCategoryFilter(isActive ? '' : cat.value)}
                    className="px-3 py-1.5 rounded-full text-xs font-semibold transition-all"
                    style={{
                      backgroundColor: isActive ? `${color}18` : 'transparent',
                      color: isActive ? color : '#6B7280',
                      border: isActive ? `1.5px solid ${color}` : '1.5px solid #2A2A2A',
                    }}
                  >
                    {cat.emoji} {t(labelKey)}
                  </button>
                );
              })}
            </div>
          </motion.div>

          {/* ═══ DEBT LIST ══════════════════════════════════ */}
          {isLoading ? (
            <div className="flex flex-col items-center py-16">
              <div className="w-10 h-10 border-2 border-[#F5C518]/30 border-t-[#F5C518] rounded-full animate-spin mb-4" />
              <p className="text-gray-500 text-sm">{t('debts.loading')}</p>
            </div>
          ) : (
            <>
              {/* ACTIVE Section */}
              <motion.div variants={itemV}>
                <div className="flex items-center gap-2 mb-3 px-1">
                  <div className="w-1 h-4 rounded-full bg-[#F5C518]" />
                  <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest">{t('debts.active')}</h3>
                  {activeDebts.length > 0 && (
                    <span className="text-[10px] px-2 py-0.5 bg-[#F5C518]/15 text-[#F5C518] rounded-full font-bold">
                      {activeDebts.length}
                    </span>
                  )}
                </div>

                {activeDebts.length === 0 ? (
                  <div className="relative bg-[#1A1A1A]/60 backdrop-blur-xl border border-[#2A2A2A] rounded-2xl p-10 text-center overflow-hidden">
                    <div className="absolute -top-16 left-1/2 -translate-x-1/2 w-40 h-40 rounded-full opacity-[0.03]"
                      style={{ background: 'radial-gradient(circle, #F5C518, transparent)' }} />
                    <div className="relative z-10">
                      <div className="w-14 h-14 rounded-2xl bg-[#00B894]/10 flex items-center justify-center mx-auto mb-3">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#00B894" strokeWidth="2" strokeLinecap="round">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      </div>
                      <p className="text-white font-semibold mb-1">
                        {activeTab === 'DEBT' ? t('debts.noDebts') : t('debts.noReceivables')}
                      </p>
                      <p className="text-gray-500 text-sm">
                        {activeTab === 'DEBT' ? t('debts.noDebtsDesc') : t('debts.noReceivablesDesc')}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {activeDebts.map(debt => (
                      <DebtCard
                        key={debt.id}
                        debt={debt}
                        onMarkPaid={setSettleDebt}
                        onDelete={handleDelete}
                        onClick={(id) => navigate(`/debts/${id}`)}
                      />
                    ))}
                  </div>
                )}
              </motion.div>

              {/* RECENT HISTORY Section */}
              {historyDebts.length > 0 && (
                <motion.div variants={itemV}>
                  <button
                    onClick={() => setShowHistory(v => !v)}
                    className="flex items-center gap-2 mb-3 px-1 group w-full"
                  >
                    <div className="w-1 h-4 rounded-full bg-gray-600" />
                    <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest group-hover:text-gray-400 transition-colors">
                      {t('debts.recentHistory')}
                    </h3>
                    <span className="text-[10px] px-2 py-0.5 bg-white/[0.04] text-gray-500 rounded-full font-bold">
                      {historyDebts.length}
                    </span>
                    <svg
                      width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"
                      className={`ml-auto text-gray-600 transition-transform ${showHistory ? 'rotate-180' : ''}`}
                    >
                      <path d="M6 9l6 6 6-6" />
                    </svg>
                  </button>
                  {showHistory && (
                    <div className="space-y-2">
                      {historyDebts.map(debt => (
                        <DebtCard
                          key={debt.id}
                          debt={debt}
                          onMarkPaid={setSettleDebt}
                          onDelete={handleDelete}
                          onClick={(id) => navigate(`/debts/${id}`)}
                        />
                      ))}
                    </div>
                  )}
                </motion.div>
              )}
            </>
          )}
        </motion.div>
      </div>

      {/* ═══ ADD ENTRY MODAL ════════════════════════════════ */}
      {showModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
          <div
            ref={modalRef}
            className="relative w-full sm:max-w-sm bg-[#0D0D0D] rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden border border-[#1A1A1A] sm:border-[#2A2A2A]"
          >
            {/* Top accent */}
            <div className="absolute top-0 left-0 right-0 h-[2px]"
              style={{ background: 'linear-gradient(90deg, transparent, #F5C51860, transparent)' }} />

            {/* Drag handle (mobile) */}
            <div className="flex justify-center pt-3 sm:hidden">
              <div className="w-10 h-1 rounded-full bg-white/10" />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between px-5 pt-4 pb-3">
              <button onClick={() => setShowModal(false)}
                className="w-8 h-8 flex items-center justify-center rounded-xl bg-white/[0.06] text-gray-400 hover:text-white hover:bg-white/[0.1] transition-all">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
              <h2 className="text-white font-semibold text-base">{t('debts.newEntry')}</h2>
              <div className="w-8" />
            </div>

            <div className="px-5 pb-6 space-y-4 overflow-y-auto max-h-[80vh]">
              {/* Direction Tabs */}
              <div className="flex bg-white/[0.03] rounded-xl overflow-hidden p-0.5">
                {(['RECEIVABLE', 'DEBT'] as const).map(dt => {
                  const isActive = form.debtType === dt;
                  const color = dt === 'RECEIVABLE' ? '#00B894' : '#E17055';
                  return (
                    <button
                      key={dt}
                      onClick={() => setForm(f => ({ ...f, debtType: dt }))}
                      className="flex-1 py-2.5 text-sm font-semibold transition-all rounded-lg"
                      style={{
                        backgroundColor: isActive ? `${color}18` : 'transparent',
                        color: isActive ? color : '#6B7280',
                        borderBottom: isActive ? `2px solid ${color}` : '2px solid transparent',
                      }}
                    >
                      {dt === 'RECEIVABLE' ? t('debts.owedDirection') : t('debts.oweDirection')}
                    </button>
                  );
                })}
              </div>

              {/* Amount */}
              <div className="flex items-center justify-center gap-2 py-4 relative">
                <div className="absolute inset-0 rounded-2xl opacity-30"
                  style={{ background: `radial-gradient(circle at center, ${form.debtType === 'RECEIVABLE' ? '#00B894' : '#E17055'}08, transparent)` }} />
                <span className="text-gray-600 text-3xl font-light">$</span>
                <input
                  ref={amountRef}
                  type="number"
                  inputMode="decimal"
                  value={form.amountStr}
                  onChange={e => setForm(f => ({ ...f, amountStr: e.target.value }))}
                  placeholder="0.00"
                  className="text-3xl sm:text-4xl lg:text-5xl font-bold text-center bg-transparent text-white w-full max-w-[12rem] focus:outline-none placeholder-gray-700"
                  min="0.01"
                  step="0.01"
                />
              </div>
              {formErrors.amount && (
                <p className="text-[#E17055] text-xs text-center -mt-2">{formErrors.amount}</p>
              )}

              {/* Person */}
              <div className="flex items-center gap-3 py-3 border-t border-[#1A1A1A]">
                <div className="w-8 h-8 rounded-full bg-[#1A1A1A] flex items-center justify-center text-gray-400">👤</div>
                <div className="flex-1">
                  <p className="text-gray-500 text-[10px] uppercase tracking-wider mb-1">{t('debts.person')}</p>
                  <input
                    type="text"
                    value={form.person}
                    onChange={e => setForm(f => ({ ...f, person: e.target.value }))}
                    placeholder={t('debts.personSearch')}
                    className="w-full bg-transparent text-white text-sm placeholder-gray-500 focus:outline-none"
                  />
                </div>
              </div>
              {formErrors.person && <p className="text-[#E17055] text-xs -mt-2 pl-11">{formErrors.person}</p>}

              {/* Due Date */}
              <div className="flex items-center gap-3 py-3 border-t border-[#1A1A1A]">
                <div className="w-8 h-8 rounded-full bg-[#1A1A1A] flex items-center justify-center text-gray-400">📅</div>
                <div className="flex-1">
                  <p className="text-gray-500 text-[10px] uppercase tracking-wider mb-0.5">{t('debts.dueDateOptional')}</p>
                  <input
                    type="date"
                    value={form.dueDate}
                    onChange={e => setForm(f => ({ ...f, dueDate: e.target.value }))}
                    className="bg-transparent text-white text-sm focus:outline-none w-full [color-scheme:dark]"
                  />
                </div>
              </div>

              {/* Category Chips */}
              <div className="border-t border-[#1A1A1A] pt-3">
                <p className="text-xs text-gray-500 uppercase tracking-wider mb-3 font-medium">{t('modal.category')}</p>
                <div className="flex gap-2 flex-wrap">
                  {CATEGORIES.map(cat => {
                    const labelKey = `debts.category${cat.value.charAt(0) + cat.value.slice(1).toLowerCase()}`;
                    const isSelected = form.category === cat.value;
                    const color = categoryColor[cat.value];
                    return (
                      <button
                        key={cat.value}
                        type="button"
                        onClick={() => setForm(f => ({ ...f, category: isSelected ? '' : cat.value as DebtCategory }))}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all"
                        style={{
                          backgroundColor: isSelected ? `${color}18` : 'transparent',
                          color: isSelected ? color : '#9CA3AF',
                          border: isSelected ? `1.5px solid ${color}` : '1.5px solid #2A2A2A',
                        }}
                      >
                        {cat.emoji} {t(labelKey)}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Account (optional) */}
              {accounts.length > 0 && (
                <div className="border-t border-[#1A1A1A] pt-3">
                  <p className="text-xs text-gray-500 uppercase tracking-wider mb-2 font-medium">{t('debts.linkedAccount')}</p>
                  <div className="relative" ref={accountPickerRef}>
                    <button
                      type="button"
                      onClick={() => setShowAccountPicker(v => !v)}
                      className="w-full flex items-center gap-3 px-4 py-3 bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl text-left hover:border-[#F5C518]/30 transition-all"
                    >
                      {selectedAccountForForm ? (
                        <>
                          <span className="text-lg">{selectedAccountForForm.icon}</span>
                          <span className="text-white font-medium text-sm flex-1">{selectedAccountForForm.name}</span>
                          <span className="text-gray-500 text-xs">{fmt(selectedAccountForForm.balance)}</span>
                        </>
                      ) : (
                        <>
                          <span className="text-lg">💸</span>
                          <span className="text-gray-500 text-sm flex-1">{t('debts.noAccount')}</span>
                        </>
                      )}
                      <span className="text-gray-600 text-xs">▾</span>
                    </button>
                    {showAccountPicker && (
                      <div className="absolute top-full left-0 right-0 mt-1 bg-[#0D0D0D] border border-[#2A2A2A] rounded-xl shadow-xl z-10 overflow-hidden max-h-44 overflow-y-auto">
                        <button
                          type="button"
                          onClick={() => { setForm(f => ({ ...f, accountId: '' })); setShowAccountPicker(false); }}
                          className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-[#111] transition-all"
                        >
                          <span className="text-lg">💸</span>
                          <span className="text-gray-400 text-sm">{t('debts.noAccount')}</span>
                        </button>
                        {accounts.map(acc => (
                          <button
                            key={acc.id}
                            type="button"
                            onClick={() => { setForm(f => ({ ...f, accountId: acc.id })); setShowAccountPicker(false); }}
                            className={`w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-[#111] transition-all ${form.accountId === acc.id ? 'bg-[#F5C518]/10' : ''}`}
                          >
                            <span className="text-lg">{acc.icon}</span>
                            <span className="text-white text-sm flex-1 truncate">{acc.name}</span>
                            <span className="text-gray-500 text-xs">{fmt(acc.balance)}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Note */}
              <div className="flex items-start gap-3 py-3 border-t border-[#1A1A1A]">
                <div className="w-8 h-8 rounded-full bg-[#1A1A1A] flex items-center justify-center text-gray-400 mt-0.5">💬</div>
                <div className="flex-1">
                  <p className="text-gray-500 text-[10px] uppercase tracking-wider mb-1">{t('debts.note')}</p>
                  <input
                    type="text"
                    value={form.note}
                    onChange={e => setForm(f => ({ ...f, note: e.target.value }))}
                    placeholder={t('debts.notePlaceholder')}
                    className="w-full bg-transparent text-white text-sm placeholder-gray-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Error */}
              {saveError && (
                <p className="text-[#E17055] text-sm text-center py-2 px-3 bg-[#E17055]/10 rounded-xl">{saveError}</p>
              )}

              {/* Submit */}
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="w-full py-4 rounded-2xl font-semibold text-base transition-all active:scale-[0.97] disabled:opacity-50 flex items-center justify-center gap-2 mt-2"
                style={{
                  background: 'linear-gradient(135deg, #F5C518, #F5C518CC)',
                  color: '#000',
                  boxShadow: '0 8px 24px #F5C51830',
                }}
              >
                {isSaving ? (
                  <div className="w-5 h-5 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                ) : t('debts.addEntry')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Settle Modal */}
      {settleDebt && (
        <SettleModal
          debt={settleDebt}
          accounts={accounts}
          onConfirm={handleMarkPaidConfirm}
          onCancel={() => setSettleDebt(null)}
        />
      )}
    </AppLayout>
  );
};
