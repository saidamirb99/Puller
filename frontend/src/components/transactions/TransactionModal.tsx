import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { CategoryIcon } from '../ui/CategoryIcon';
import { TransactionType, TransactionCreate, Transaction, Category, INCOME_CATEGORY_NAMES } from '../../services/transaction.service';
import { Account } from '../../services/account.service';
import transactionService from '../../services/transaction.service';
import accountService from '../../services/account.service';
import { DebtCreate, DebtCategory } from '../../services/debt.service';
import { AllocationPreview } from '../jars/AllocationPreview';
import { VoiceInputButton } from './VoiceInputButton';
import { VoiceParseResult } from '../../services/voice.service';

type ModalMode = 'expense' | 'income' | 'debt';

interface TransactionModalProps {
  transaction?: Transaction | null;
  onSubmit: (data: TransactionCreate) => Promise<void>;
  onDebtSubmit?: (data: DebtCreate) => Promise<void>;
  onClose: () => void;
  initialMode?: ModalMode;
}

const toLocalDateTime = (iso: string) => {
  const d = new Date(iso);
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

const nowLocalDateTime = () => {
  const d = new Date();
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

const DEBT_CATEGORIES: { value: DebtCategory; emoji: string; labelKey: string }[] = [
  { value: 'PERSONAL', emoji: '👤', labelKey: 'debts.categoryPersonal' },
  { value: 'BUSINESS', emoji: '💼', labelKey: 'debts.categoryBusiness' },
  { value: 'LOAN', emoji: '🏦', labelKey: 'debts.categoryLoan' },
];

export const TransactionModal: React.FC<TransactionModalProps> = ({
  transaction,
  onSubmit,
  onDebtSubmit,
  onClose,
  initialMode,
}) => {
  const { t } = useTranslation();
  const isEdit = Boolean(transaction);

  const getInitialMode = (): ModalMode => {
    if (initialMode) return initialMode;
    if (transaction?.transaction_type === TransactionType.INCOME) return 'income';
    return 'expense';
  };

  const [mode, setMode] = useState<ModalMode>(getInitialMode());

  // Transaction fields
  const [type, setType] = useState<TransactionType>(
    transaction?.transaction_type ?? TransactionType.EXPENSE
  );
  const [amountStr, setAmountStr] = useState(transaction ? transaction.amount.toFixed(2) : '0.00');
  const [accountId, setAccountId] = useState(transaction?.account_id ?? '');
  const [categoryId, setCategoryId] = useState(transaction?.category_id ?? '');
  const [date, setDate] = useState(
    transaction ? toLocalDateTime(transaction.transaction_date) : nowLocalDateTime()
  );
  const [description, setDescription] = useState(transaction?.description ?? '');
  const [merchant, setMerchant] = useState(transaction?.merchant ?? '');
  const [notes, setNotes] = useState(transaction?.notes ?? '');

  // Debt-specific fields
  const [debtType, setDebtType] = useState<'DEBT' | 'RECEIVABLE'>('RECEIVABLE');
  const [debtPerson, setDebtPerson] = useState('');
  const [debtDueDate, setDebtDueDate] = useState('');
  const [debtCategory, setDebtCategory] = useState<DebtCategory | ''>('');
  const [debtNote, setDebtNote] = useState('');

  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [showAccountPicker, setShowAccountPicker] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const amountRef = useRef<HTMLInputElement>(null);
  const accountPickerRef = useRef<HTMLDivElement>(null);
  const isExpense = mode === 'expense';
  const accentColor = mode === 'expense' ? '#E17055' : mode === 'income' ? '#00B894' : '#F5C518';

  useEffect(() => { loadData(); }, []);
  useEffect(() => { setTimeout(() => amountRef.current?.focus(), 300); }, []);

  useEffect(() => {
    if (!showAccountPicker) return;
    const handleClick = (e: MouseEvent) => {
      if (accountPickerRef.current && !accountPickerRef.current.contains(e.target as Node))
        setShowAccountPicker(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [showAccountPicker]);

  const loadData = async () => {
    try {
      const [accs, cats] = await Promise.all([accountService.getAccounts(), transactionService.getCategories()]);
      setAccounts(accs);
      setCategories(cats);
      if (!transaction && accs.length > 0 && !accountId) setAccountId(accs[0].id);
    } catch (e) { console.error(e); }
  };

  const incomeCategories = categories.filter((c) => INCOME_CATEGORY_NAMES.includes(c.name));
  const expenseCategories = categories.filter((c) => !INCOME_CATEGORY_NAMES.includes(c.name));
  const shownCategories = isExpense ? expenseCategories : incomeCategories;
  const displayCategories = shownCategories.length > 0 ? shownCategories : categories;
  const selectedAccount = accounts.find((a) => a.id === accountId);

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) =>
    setAmountStr(e.target.value.replace(/[^0-9.]/g, '') || '0');
  const handleAmountFocus = () => { if (amountStr === '0.00' || amountStr === '0') setAmountStr(''); };
  const handleAmountBlur = () => { const n = parseFloat(amountStr); setAmountStr(isNaN(n) ? '0.00' : n.toFixed(2)); };

  const handleVoiceParsed = (result: VoiceParseResult) => {
    if (result.amount !== null && result.amount > 0) {
      setAmountStr(result.amount.toFixed(2));
    }
    if (result.transaction_type === 'INCOME') {
      setMode('income');
      setType(TransactionType.INCOME);
    } else if (result.transaction_type === 'EXPENSE') {
      setMode('expense');
      setType(TransactionType.EXPENSE);
    }
    if (result.category_id) setCategoryId(result.category_id);
    if (result.description) setDescription(result.description);
    if (result.merchant) setMerchant(result.merchant);
  };

  const handleModeSwitch = (newMode: ModalMode) => {
    setMode(newMode);
    if (newMode === 'expense') setType(TransactionType.EXPENSE);
    if (newMode === 'income') setType(TransactionType.INCOME);
    setCategoryId('');
    setError('');
  };

  const handleSubmit = async () => {
    const amount = parseFloat(amountStr);

    if (mode === 'debt') {
      if (!amount || amount <= 0) { setError(t('modal.errorAmount')); amountRef.current?.focus(); return; }
      if (!debtPerson.trim()) { setError(t('debts.errorPerson')); return; }
      if (!onDebtSubmit) return;
      setError('');
      setIsSubmitting(true);
      try {
        await onDebtSubmit({
          person_name: debtPerson.trim(),
          amount,
          debt_type: debtType,
          category: debtCategory || null,
          description: debtNote.trim() || undefined,
          due_date: debtDueDate || null,
          account_id: accountId || null,
        });
      } catch (e: any) {
        setError(e.response?.data?.detail || t('modal.errorSave'));
        setIsSubmitting(false);
      }
      return;
    }

    if (!amount || amount <= 0) { setError(t('modal.errorAmount')); amountRef.current?.focus(); return; }
    if (!accountId) { setError(t('modal.errorAccount')); return; }
    if (!description.trim()) { setError(t('modal.errorDescription')); return; }
    setError('');
    setIsSubmitting(true);
    try {
      await onSubmit({
        account_id: accountId,
        category_id: categoryId || null,
        transaction_type: type,
        amount,
        description: description.trim(),
        merchant: merchant.trim() || null,
        notes: notes.trim() || null,
        transaction_date: new Date(date).toISOString(),
      });
    } catch (e: any) {
      setError(e.response?.data?.detail || t('modal.errorSave'));
      setIsSubmitting(false);
    }
  };

  const formatDateDisplay = useCallback((d: string) => {
    const date = new Date(d);
    const today = new Date();
    const yesterday = new Date(); yesterday.setDate(today.getDate() - 1);
    const time = date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
    if (date.toDateString() === today.toDateString()) return `${t('common.today')}, ${time}`;
    if (date.toDateString() === yesterday.toDateString()) return `${t('common.yesterday')}, ${time}`;
    const dateStr = date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });
    return `${dateStr}, ${time}`;
  }, [t]);

  const modalTitle = isEdit
    ? t('modal.editTransaction')
    : mode === 'expense'
    ? t('modal.newExpense')
    : mode === 'income'
    ? t('modal.newIncome')
    : t('modal.newDebt');

  const saveBtnLabel = isEdit
    ? t('modal.saveChanges')
    : mode === 'expense'
    ? t('modal.saveExpense')
    : mode === 'income'
    ? t('modal.saveIncome')
    : t('debts.addEntry');

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center sm:items-center"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={onClose} />
      <div className="relative w-full max-w-sm bg-[#0D0D0D] rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden animate-slide-up border border-[#1A1A1A] sm:border-[#2A2A2A]">
        {/* Top accent line */}
        <div className="absolute top-0 left-0 right-0 h-[2px]"
          style={{ background: `linear-gradient(90deg, transparent, ${accentColor}60, transparent)` }} />

        {/* Drag handle (mobile) */}
        <div className="flex justify-center pt-3 sm:hidden">
          <div className="w-10 h-1 rounded-full bg-white/10" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-4 pb-3">
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-xl bg-white/[0.06] text-gray-400 hover:text-white hover:bg-white/[0.1] transition-all"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
          <h2 className="text-white font-semibold text-base">{modalTitle}</h2>
          <button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-white/[0.06] transition-all disabled:opacity-40"
            style={{ color: accentColor }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </button>
        </div>

        {/* Mode Tabs */}
        {!isEdit && (
          <div className="flex mx-5 bg-white/[0.03] rounded-xl overflow-hidden mb-4 p-0.5">
            {(['expense', 'income', 'debt'] as ModalMode[]).map((m) => {
              const tabColor = m === 'expense' ? '#E17055' : m === 'income' ? '#00B894' : '#F5C518';
              const isActive = mode === m;
              return (
                <button
                  key={m}
                  onClick={() => handleModeSwitch(m)}
                  className={`flex-1 py-2 text-sm font-medium transition-all rounded-lg ${isActive ? 'text-white' : 'text-gray-600'}`}
                  style={{
                    backgroundColor: isActive ? `${tabColor}18` : 'transparent',
                    borderBottom: isActive ? `2px solid ${tabColor}` : '2px solid transparent',
                  }}
                >
                  {m === 'expense' ? t('modal.expense') : m === 'income' ? t('modal.income') : t('modal.debt')}
                </button>
              );
            })}
          </div>
        )}

        <div className="px-5 pb-6 space-y-4 overflow-y-auto max-h-[75vh]">
          {/* Amount */}
          <div className="flex items-center justify-center gap-2 py-5 relative">
            <div className="absolute inset-0 rounded-2xl opacity-30"
              style={{ background: `radial-gradient(circle at center, ${accentColor}08, transparent)` }} />
            <span className="text-gray-600 text-3xl font-light">$</span>
            <input
              ref={amountRef}
              type="number"
              inputMode="decimal"
              value={amountStr}
              onChange={handleAmountChange}
              onFocus={handleAmountFocus}
              onBlur={handleAmountBlur}
              className="text-5xl font-bold text-center bg-transparent text-gray-400 w-48 focus:outline-none focus:text-white transition-colors"
              placeholder="0.00"
              min="0"
              step="0.01"
            />
          </div>

          {/* Voice Input (expense/income modes only, not edit) */}
          {mode !== 'debt' && !isEdit && (
            <VoiceInputButton
              onParsed={handleVoiceParsed}
              onError={(err) => setError(err)}
            />
          )}

          {/* ── DEBT MODE FIELDS ────────────────────────────── */}
          {mode === 'debt' && (
            <>
              {/* Debt direction sub-tabs */}
              <div className="flex bg-dark-bg rounded-xl overflow-hidden">
                {(['RECEIVABLE', 'DEBT'] as const).map(dt => (
                  <button
                    key={dt}
                    onClick={() => setDebtType(dt)}
                    className={`flex-1 py-2.5 text-sm font-semibold transition-all ${
                      debtType === dt
                        ? dt === 'RECEIVABLE'
                          ? 'bg-semantic-income/20 text-semantic-income'
                          : 'bg-semantic-expense/20 text-semantic-expense'
                        : 'text-gray-500'
                    }`}
                  >
                    {dt === 'RECEIVABLE' ? t('debts.owedDirection') : t('debts.oweDirection')}
                  </button>
                ))}
              </div>

              {/* Person */}
              <div className="flex items-center gap-3 py-3 border-t border-dark-border">
                <div className="w-8 h-8 rounded-full bg-dark-bg flex items-center justify-center text-gray-400">👤</div>
                <div className="flex-1">
                  <p className="text-gray-500 text-[10px] uppercase tracking-wider mb-1">{t('debts.person')}</p>
                  <input
                    type="text"
                    value={debtPerson}
                    onChange={e => setDebtPerson(e.target.value)}
                    placeholder={t('debts.personSearch')}
                    className="w-full bg-transparent text-white text-sm placeholder-gray-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Due Date */}
              <div className="flex items-center gap-3 py-3 border-t border-dark-border">
                <div className="w-8 h-8 rounded-full bg-dark-bg flex items-center justify-center text-gray-400">📅</div>
                <div className="flex-1">
                  <p className="text-gray-500 text-[10px] uppercase tracking-wider mb-0.5">{t('debts.dueDateOptional')}</p>
                  <input
                    type="date"
                    value={debtDueDate}
                    onChange={e => setDebtDueDate(e.target.value)}
                    className="bg-transparent text-white text-sm focus:outline-none w-full"
                  />
                </div>
              </div>

              {/* Debt Category chips */}
              <div className="border-t border-dark-border pt-3">
                <p className="text-xs text-gray-500 uppercase tracking-wider mb-3 font-medium">{t('modal.category')}</p>
                <div className="flex gap-2 flex-wrap">
                  {DEBT_CATEGORIES.map(cat => {
                    const isSelected = debtCategory === cat.value;
                    return (
                      <button
                        key={cat.value}
                        type="button"
                        onClick={() => setDebtCategory(isSelected ? '' : cat.value)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all border ${
                          isSelected
                            ? 'bg-brand-purple/20 border-brand-purple text-brand-purple'
                            : 'border-dark-border text-gray-400 hover:border-gray-500'
                        }`}
                      >
                        {cat.emoji} {t(cat.labelKey)}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Debt Note */}
              <div className="flex items-start gap-3 py-3 border-t border-dark-border">
                <div className="w-8 h-8 rounded-full bg-dark-bg flex items-center justify-center text-gray-400 mt-0.5">💬</div>
                <div className="flex-1">
                  <p className="text-gray-500 text-[10px] uppercase tracking-wider mb-1">{t('debts.note')}</p>
                  <input
                    type="text"
                    value={debtNote}
                    onChange={e => setDebtNote(e.target.value)}
                    placeholder={t('debts.notePlaceholder')}
                    className="w-full bg-transparent text-white text-sm placeholder-gray-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Account picker for debt */}
              <div className="flex justify-center border-t border-dark-border pt-3">
                <div className="relative" ref={accountPickerRef}>
                  <button
                    onClick={() => setShowAccountPicker(!showAccountPicker)}
                    className="flex items-center gap-2 bg-dark-bg hover:bg-dark-hover border border-dark-border rounded-full px-4 py-1.5 text-sm text-white transition-all"
                  >
                    <span>{selectedAccount?.icon || '💸'}</span>
                    <span className="font-medium">{selectedAccount?.name || t('debts.noAccount')}</span>
                    <span className="text-gray-400 text-xs">▾</span>
                  </button>
                  {showAccountPicker && (
                    <div className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 w-56 bg-dark-card border border-dark-border rounded-xl shadow-xl z-10 overflow-hidden">
                      <button
                        onClick={() => { setAccountId(''); setShowAccountPicker(false); }}
                        className="w-full flex items-center gap-3 px-4 py-3 text-sm hover:bg-dark-hover transition-colors text-white"
                      >
                        <span>💸</span>
                        <span className="text-gray-400">{t('debts.noAccount')}</span>
                      </button>
                      {accounts.map((acc) => (
                        <button
                          key={acc.id}
                          onClick={() => { setAccountId(acc.id); setShowAccountPicker(false); }}
                          className={`w-full flex items-center gap-3 px-4 py-3 text-sm hover:bg-dark-hover transition-colors ${acc.id === accountId ? 'text-brand-purple' : 'text-white'}`}
                        >
                          <span className="text-lg">{acc.icon}</span>
                          <div className="text-left flex-1">
                            <p className="font-medium">{acc.name}</p>
                            <p className="text-gray-400 text-xs">${acc.balance.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
                          </div>
                          {acc.id === accountId && <span className="text-brand-purple">✓</span>}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </>
          )}

          {/* ── TRANSACTION MODE FIELDS ─────────────────────── */}
          {mode !== 'debt' && (
            <>
              {/* Account picker */}
              <div className="flex justify-center">
                <div className="relative" ref={accountPickerRef}>
                  <button
                    onClick={() => setShowAccountPicker(!showAccountPicker)}
                    className="flex items-center gap-2 bg-dark-bg hover:bg-dark-hover border border-dark-border rounded-full px-4 py-1.5 text-sm text-white transition-all"
                  >
                    <span>{selectedAccount?.icon || '🏦'}</span>
                    <span className="font-medium">{selectedAccount?.name || t('modal.selectAccount')}</span>
                    <span className="text-gray-400 text-xs">▾</span>
                  </button>
                  {showAccountPicker && (
                    <div className="absolute top-full mt-1 left-1/2 -translate-x-1/2 w-56 bg-dark-card border border-dark-border rounded-xl shadow-xl z-10 overflow-hidden">
                      {accounts.length === 0 ? (
                        <p className="text-gray-400 text-sm px-4 py-3">{t('modal.noAccounts')}</p>
                      ) : accounts.map((acc) => (
                        <button
                          key={acc.id}
                          onClick={() => { setAccountId(acc.id); setShowAccountPicker(false); }}
                          className={`w-full flex items-center gap-3 px-4 py-3 text-sm hover:bg-dark-hover transition-colors ${acc.id === accountId ? 'text-brand-purple' : 'text-white'}`}
                        >
                          <span className="text-lg">{acc.icon}</span>
                          <div className="text-left flex-1">
                            <p className="font-medium">{acc.name}</p>
                            <p className="text-gray-400 text-xs">${acc.balance.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
                          </div>
                          {acc.id === accountId && <span className="text-brand-purple">✓</span>}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Jar Allocation Preview (income mode only) */}
              {mode === 'income' && !isEdit && (
                <AllocationPreview amount={parseFloat(amountStr) || 0} />
              )}

              {/* Category */}
              {displayCategories.length > 0 && (
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wider mb-3 font-medium">{t('modal.category')}</p>
                  <div className="flex gap-3 overflow-x-auto pb-1 snap-x">
                    {displayCategories.map((cat) => (
                      <button
                        key={cat.id}
                        onClick={() => setCategoryId(cat.id === categoryId ? '' : cat.id)}
                        className="flex-shrink-0 snap-start flex flex-col items-center gap-1.5 p-2.5 rounded-xl transition-all"
                        style={{
                          backgroundColor: cat.id === categoryId ? `${cat.color}25` : 'transparent',
                          border: cat.id === categoryId ? `1.5px solid ${cat.color}` : '1.5px solid transparent',
                        }}
                      >
                        <CategoryIcon icon={cat.icon} color={cat.color} size="md" />
                        <span
                          className="text-xs whitespace-nowrap font-medium"
                          style={{ color: cat.id === categoryId ? cat.color : '#9CA3AF' }}
                        >
                          {cat.name.length > 10 ? cat.name.slice(0, 9) + '…' : cat.name}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Date */}
              <div className="flex items-center gap-3 py-3 border-t border-dark-border">
                <div className="w-8 h-8 rounded-full bg-dark-bg flex items-center justify-center text-gray-400">📅</div>
                <div className="flex-1">
                  <p className="text-gray-500 text-[10px] uppercase tracking-wider mb-0.5">{t('modal.date')}</p>
                  <p className="text-white text-sm font-medium">{formatDateDisplay(date)}</p>
                </div>
                <label className="text-gray-600 text-sm cursor-pointer hover:text-gray-400 transition-colors">
                  ›<input type="datetime-local" value={date} onChange={(e) => setDate(e.target.value)} className="sr-only" />
                </label>
              </div>

              {/* Description */}
              <div className="flex items-start gap-3 py-3 border-t border-dark-border">
                <div className="w-8 h-8 rounded-full bg-dark-bg flex items-center justify-center text-gray-400 mt-0.5">📝</div>
                <div className="flex-1">
                  <p className="text-gray-500 text-[10px] uppercase tracking-wider mb-1">{t('modal.description')}</p>
                  <input
                    type="text"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder={isExpense ? t('modal.placeholderExpense') : t('modal.placeholderIncome')}
                    className="w-full bg-transparent text-white text-sm placeholder-gray-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Merchant */}
              <div className="flex items-center gap-3 py-3 border-t border-dark-border">
                <div className="w-8 h-8 rounded-full bg-dark-bg flex items-center justify-center text-gray-400">
                  {isExpense ? '💳' : '👤'}
                </div>
                <div className="flex-1">
                  <p className="text-gray-500 text-[10px] uppercase tracking-wider mb-1">
                    {isExpense ? t('modal.merchantExpense') : t('modal.merchantIncome')}
                  </p>
                  <input
                    type="text"
                    value={merchant}
                    onChange={(e) => setMerchant(e.target.value)}
                    placeholder={isExpense ? t('modal.placeholderMerchantExpense') : t('modal.placeholderMerchantIncome')}
                    className="w-full bg-transparent text-white text-sm placeholder-gray-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Note */}
              <div className="flex items-start gap-3 py-3 border-t border-dark-border">
                <div className="w-8 h-8 rounded-full bg-dark-bg flex items-center justify-center text-gray-400 mt-0.5">💬</div>
                <div className="flex-1">
                  <p className="text-gray-500 text-[10px] uppercase tracking-wider mb-1">{t('modal.note')}</p>
                  <input
                    type="text"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder={t('modal.placeholderNote')}
                    className="w-full bg-transparent text-white text-sm placeholder-gray-500 focus:outline-none"
                  />
                </div>
              </div>
            </>
          )}

          {error && <p className="text-semantic-expense text-sm text-center py-1">{error}</p>}

          <button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="w-full py-4 rounded-2xl font-semibold text-white text-base transition-all active:scale-[0.97] disabled:opacity-60 flex items-center justify-center gap-2 mt-2 relative overflow-hidden"
            style={{ background: `linear-gradient(135deg, ${accentColor}, ${accentColor}CC)`, boxShadow: `0 8px 24px ${accentColor}30` }}
          >
            {isSubmitting ? (
              <div className="w-5 h-5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
            ) : saveBtnLabel}
          </button>
        </div>
      </div>
    </div>
  );
};
