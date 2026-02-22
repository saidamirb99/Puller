import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { AppLayout } from '../components/layout/AppLayout';
import debtService, { Debt, DebtPaymentCreate } from '../services/debt.service';
import accountService, { Account } from '../services/account.service';

const fmt = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n);

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

const fmtDateTime = (iso: string) =>
  new Date(iso).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });

const getDaysUntilDue = (d: string) =>
  Math.ceil((new Date(d).getTime() - Date.now()) / 86400000);

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

// ─── Settle Modal (for Mark as Paid) ────────────────────────────────────────
interface SettleModalProps {
  accounts: Account[];
  defaultAccountId?: string | null;
  onConfirm: (accountId: string | null) => void;
  onCancel: () => void;
}
const SettleModal: React.FC<SettleModalProps> = ({ accounts, defaultAccountId, onConfirm, onCancel }) => {
  const { t } = useTranslation();
  const [selected, setSelected] = useState<string>(defaultAccountId || '');
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) onCancel(); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [onCancel]);

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[70] p-4">
      <div ref={ref} className="bg-dark-card border border-dark-border rounded-2xl shadow-2xl w-full max-w-sm p-6">
        <h3 className="text-white font-bold text-lg mb-1">{t('debts.markPaid')}</h3>
        <p className="text-gray-400 text-sm mb-5">{t('debts.settlementAccount')}</p>
        <div className="space-y-2 max-h-48 overflow-y-auto mb-5">
          <button onClick={() => setSelected('')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border transition-all ${selected === '' ? 'border-brand-purple bg-brand-purple/10' : 'border-dark-border hover:border-gray-500'}`}>
            <span className="text-xl">💸</span>
            <span className="text-white text-sm">{t('debts.skipAccount')}</span>
          </button>
          {accounts.map(acc => (
            <button key={acc.id} onClick={() => setSelected(acc.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border transition-all ${selected === acc.id ? 'border-brand-purple bg-brand-purple/10' : 'border-dark-border hover:border-gray-500'}`}>
              <span className="text-xl">{acc.icon}</span>
              <div className="text-left flex-1 min-w-0">
                <p className="text-white text-sm font-medium truncate">{acc.name}</p>
                <p className="text-gray-500 text-xs">{fmt(acc.balance)}</p>
              </div>
            </button>
          ))}
        </div>
        <div className="flex gap-3">
          <button onClick={onCancel} className="flex-1 py-2.5 rounded-xl border border-dark-border text-gray-400 hover:text-white transition-all text-sm font-medium">{t('debts.cancel')}</button>
          <button onClick={() => onConfirm(selected || null)} className="flex-1 py-2.5 rounded-xl bg-brand-purple hover:bg-brand-purple-light text-white font-semibold transition-all text-sm">
            ✓ {t('debts.markPaid')}
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Payment Modal ──────────────────────────────────────────────────────────
interface PaymentModalProps {
  remaining: number;
  accounts: Account[];
  defaultAccountId?: string | null;
  onSubmit: (data: DebtPaymentCreate) => void;
  onCancel: () => void;
}
const PaymentModal: React.FC<PaymentModalProps> = ({ remaining, accounts, defaultAccountId, onSubmit, onCancel }) => {
  const { t } = useTranslation();
  const [amountStr, setAmountStr] = useState('');
  const [accountId, setAccountId] = useState(defaultAccountId || '');
  const [note, setNote] = useState('');
  const [error, setError] = useState('');
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) onCancel(); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [onCancel]);

  const handleSubmit = () => {
    const amt = parseFloat(amountStr);
    if (!amountStr || isNaN(amt) || amt <= 0) { setError(t('debts.errorAmount')); return; }
    if (amt > remaining + 0.01) { setError(t('debtDetail.exceedsRemaining')); return; }
    onSubmit({ amount: amt, account_id: accountId || null, note: note.trim() || undefined });
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center z-[70] p-0 sm:p-4">
      <div ref={ref} className="bg-dark-card w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-dark-border">
          <h2 className="text-white font-bold text-lg">{t('debtDetail.addPayment')}</h2>
          <button onClick={onCancel} className="w-8 h-8 flex items-center justify-center rounded-full bg-dark-bg text-gray-400 hover:text-white">✕</button>
        </div>
        <div className="px-6 py-5 space-y-4">
          {/* Amount */}
          <div>
            <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">{t('debts.amount')}</label>
            <div className="flex items-center gap-2">
              <span className="text-gray-400 text-2xl">$</span>
              <input type="number" inputMode="decimal" value={amountStr} onChange={e => { setAmountStr(e.target.value); setError(''); }}
                placeholder="0.00" min="0.01" step="0.01" autoFocus
                className="text-3xl font-bold bg-transparent text-white w-full focus:outline-none placeholder-gray-500" />
            </div>
            <p className="text-gray-500 text-xs mt-1">{t('debtDetail.remaining')}: {fmt(remaining)}</p>
            {error && <p className="text-semantic-expense text-xs mt-1">{error}</p>}
          </div>

          {/* Account */}
          <div>
            <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">{t('debts.linkedAccount')}</label>
            <select value={accountId} onChange={e => setAccountId(e.target.value)}
              className="w-full px-4 py-3 bg-dark-bg border border-dark-border rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-purple">
              <option value="">{t('debts.noAccount')}</option>
              {accounts.map(a => <option key={a.id} value={a.id}>{a.icon} {a.name} ({fmt(a.balance)})</option>)}
            </select>
          </div>

          {/* Note */}
          <div>
            <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">{t('debtDetail.paymentNote')}</label>
            <input type="text" value={note} onChange={e => setNote(e.target.value)} placeholder={t('debtDetail.paymentNotePlaceholder')}
              className="w-full px-4 py-3 bg-dark-bg border border-dark-border rounded-xl text-white placeholder-gray-500 text-sm focus:outline-none focus:ring-2 focus:ring-brand-purple" />
          </div>

          <button onClick={handleSubmit} className="w-full py-4 rounded-2xl bg-semantic-income hover:bg-semantic-income/90 text-white font-bold text-base transition-all shadow-lg">
            {t('debtDetail.recordPayment')}
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Reminder Modal ─────────────────────────────────────────────────────────
interface ReminderModalProps {
  currentReminder?: string | null;
  onSubmit: (datetime: string | null) => void;
  onCancel: () => void;
}
const ReminderModal: React.FC<ReminderModalProps> = ({ currentReminder, onSubmit, onCancel }) => {
  const { t } = useTranslation();
  const [dt, setDt] = useState(currentReminder ? currentReminder.slice(0, 16) : '');
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) onCancel(); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [onCancel]);

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[70] p-4">
      <div ref={ref} className="bg-dark-card border border-dark-border rounded-2xl shadow-2xl w-full max-w-sm p-6">
        <h3 className="text-white font-bold text-lg mb-1">{t('debtDetail.setReminder')}</h3>
        <p className="text-gray-400 text-sm mb-5">{t('debtDetail.reminderDesc')}</p>
        <input type="datetime-local" value={dt} onChange={e => setDt(e.target.value)}
          className="w-full px-4 py-3 bg-dark-bg border border-dark-border rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-purple mb-5" />
        <div className="flex gap-3">
          {currentReminder && (
            <button onClick={() => onSubmit(null)} className="flex-1 py-2.5 rounded-xl border border-semantic-expense/30 text-semantic-expense hover:bg-semantic-expense/10 transition-all text-sm font-medium">
              {t('debtDetail.removeReminder')}
            </button>
          )}
          <button onClick={onCancel} className="flex-1 py-2.5 rounded-xl border border-dark-border text-gray-400 hover:text-white transition-all text-sm font-medium">{t('debts.cancel')}</button>
          <button onClick={() => onSubmit(dt ? new Date(dt).toISOString() : null)} disabled={!dt}
            className="flex-1 py-2.5 rounded-xl bg-brand-purple hover:bg-brand-purple-light text-white font-semibold transition-all text-sm disabled:opacity-50">
            {t('debts.save')}
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Edit Modal ─────────────────────────────────────────────────────────────
interface EditModalProps {
  debt: Debt;
  onSubmit: (data: Record<string, any>) => void;
  onCancel: () => void;
}
const EditModal: React.FC<EditModalProps> = ({ debt, onSubmit, onCancel }) => {
  const { t } = useTranslation();
  const [personName, setPersonName] = useState(debt.person_name);
  const [amount, setAmount] = useState(String(debt.amount));
  const [dueDate, setDueDate] = useState(debt.due_date ? debt.due_date.slice(0, 10) : '');
  const [description, setDescription] = useState(debt.description || '');
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) onCancel(); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [onCancel]);

  const handleSave = () => {
    const data: Record<string, any> = {};
    if (personName.trim() !== debt.person_name) data.person_name = personName.trim();
    const amt = parseFloat(amount);
    if (!isNaN(amt) && amt > 0 && amt !== debt.amount) data.amount = amt;
    if (dueDate !== (debt.due_date ? debt.due_date.slice(0, 10) : '')) data.due_date = dueDate || null;
    if (description.trim() !== (debt.description || '')) data.description = description.trim() || null;
    onSubmit(data);
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center z-[70] p-0 sm:p-4">
      <div ref={ref} className="bg-dark-card w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-dark-border">
          <h2 className="text-white font-bold text-lg">{t('debtDetail.editDebt')}</h2>
          <button onClick={onCancel} className="w-8 h-8 flex items-center justify-center rounded-full bg-dark-bg text-gray-400 hover:text-white">✕</button>
        </div>
        <div className="px-6 py-5 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">{t('debts.person')}</label>
            <input type="text" value={personName} onChange={e => setPersonName(e.target.value)}
              className="w-full px-4 py-3 bg-dark-bg border border-dark-border rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-purple" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">{t('debts.amount')}</label>
            <input type="number" value={amount} onChange={e => setAmount(e.target.value)} min="0.01" step="0.01"
              className="w-full px-4 py-3 bg-dark-bg border border-dark-border rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-purple" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">{t('debts.dueDate')}</label>
            <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)}
              className="w-full px-4 py-3 bg-dark-bg border border-dark-border rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-purple" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">{t('debts.description')}</label>
            <input type="text" value={description} onChange={e => setDescription(e.target.value)}
              className="w-full px-4 py-3 bg-dark-bg border border-dark-border rounded-xl text-white placeholder-gray-500 text-sm focus:outline-none focus:ring-2 focus:ring-brand-purple" />
          </div>
          <button onClick={handleSave} className="w-full py-4 rounded-2xl bg-brand-purple hover:bg-brand-purple-light text-white font-bold text-base transition-all">
            {t('debts.save')}
          </button>
        </div>
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// ─── Main Detail Page ───────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════
export const DebtDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();

  const [debt, setDebt] = useState<Debt | null>(null);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showSettleModal, setShowSettleModal] = useState(false);
  const [showReminderModal, setShowReminderModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [personalNote, setPersonalNote] = useState('');
  const [isSavingNote, setIsSavingNote] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (id) loadData();
  }, [id]);

  useEffect(() => {
    if (!showMenu) return;
    const h = (e: MouseEvent) => { if (menuRef.current && !menuRef.current.contains(e.target as Node)) setShowMenu(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [showMenu]);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const [d, acc] = await Promise.all([
        debtService.getDebt(id!),
        accountService.getAccounts(),
      ]);
      setDebt(d);
      setAccounts(acc);
      setPersonalNote(d.personal_note || '');
    } catch {
      navigate('/debts');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddPayment = async (data: DebtPaymentCreate) => {
    await debtService.addPayment(debt!.id, data);
    setShowPaymentModal(false);
    await loadData();
  };

  const handleMarkPaid = async (accountId: string | null) => {
    await debtService.markPaid(debt!.id, accountId);
    setShowSettleModal(false);
    await loadData();
  };

  const handleSetReminder = async (datetime: string | null) => {
    await debtService.updateDebt(debt!.id, { reminder_at: datetime });
    setShowReminderModal(false);
    await loadData();
  };

  const handleEdit = async (data: Record<string, any>) => {
    if (Object.keys(data).length > 0) {
      await debtService.updateDebt(debt!.id, data);
    }
    setShowEditModal(false);
    await loadData();
  };

  const handleSaveNote = async () => {
    if (personalNote === (debt?.personal_note || '')) return;
    setIsSavingNote(true);
    await debtService.updateDebt(debt!.id, { personal_note: personalNote.trim() || null });
    await loadData();
    setIsSavingNote(false);
  };

  const handleDeletePayment = async (paymentId: string) => {
    if (!window.confirm(t('debtDetail.deletePaymentConfirm'))) return;
    await debtService.deletePayment(debt!.id, paymentId);
    await loadData();
  };

  const handleDelete = async () => {
    if (!window.confirm(t('debts.deleteConfirm'))) return;
    await debtService.deleteDebt(debt!.id);
    navigate('/debts');
  };

  if (isLoading || !debt) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-brand-purple" />
        </div>
      </AppLayout>
    );
  }

  const isReceivable = debt.debt_type === 'RECEIVABLE';
  const remaining = Math.max(0, debt.amount - debt.paid_amount);
  const pct = debt.amount > 0 ? Math.min(100, (debt.paid_amount / debt.amount) * 100) : 0;
  const daysLeft = debt.due_date ? getDaysUntilDue(debt.due_date) : null;
  const isOverdue = daysLeft !== null && daysLeft < 0 && !debt.is_paid;
  const catColor = debt.category ? categoryColor[debt.category] : '#F5C518';

  // Build activity timeline
  const timeline: { date: string; icon: string; label: string; detail?: string; paymentId?: string }[] = [];
  timeline.push({ date: debt.created_at, icon: '📝', label: t('debtDetail.created'), detail: fmt(debt.amount) });
  for (const p of debt.payments) {
    timeline.push({
      date: p.paid_at,
      icon: '💰',
      label: t('debtDetail.paymentReceived'),
      detail: fmt(p.amount) + (p.note ? ` — ${p.note}` : ''),
      paymentId: p.id,
    });
  }
  if (debt.reminder_at) {
    timeline.push({ date: debt.reminder_at, icon: '🔔', label: t('debtDetail.reminderSet'), detail: fmtDateTime(debt.reminder_at) });
  }
  timeline.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  return (
    <AppLayout>
      {/* Header */}
      <header className="bg-dark-bg border-b border-dark-border px-6 py-4">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/debts')} className="w-10 h-10 flex items-center justify-center rounded-full bg-dark-card border border-dark-border text-gray-400 hover:text-white transition-colors">
            ←
          </button>
          <div className={`w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold text-white ${getAvatarColor(debt.person_name)}`}>
            {debt.person_name.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-white font-bold text-lg truncate">{debt.person_name}</h1>
            <p className="text-gray-400 text-sm">
              {isReceivable ? t('debtDetail.owedToYou') : t('debtDetail.youOwe')}
              {debt.category && (
                <span className="ml-2 text-xs px-2 py-0.5 rounded-full font-medium" style={{ backgroundColor: `${catColor}20`, color: catColor }}>
                  {debt.category.charAt(0) + debt.category.slice(1).toLowerCase()}
                </span>
              )}
            </p>
          </div>
          {/* Menu */}
          <div className="relative" ref={menuRef}>
            <button onClick={() => setShowMenu(v => !v)} className="w-10 h-10 flex items-center justify-center rounded-full bg-dark-card border border-dark-border text-gray-400 hover:text-white">
              ⋮
            </button>
            {showMenu && (
              <div className="absolute right-0 top-12 bg-dark-card border border-dark-border rounded-xl shadow-xl z-20 min-w-[160px] py-1">
                <button onClick={() => { setShowMenu(false); setShowEditModal(true); }} className="w-full px-4 py-2.5 text-left text-sm text-gray-400 hover:bg-dark-hover flex items-center gap-2">
                  ✏️ {t('debtDetail.edit')}
                </button>
                <button onClick={() => { setShowMenu(false); handleDelete(); }} className="w-full px-4 py-2.5 text-left text-sm text-semantic-expense hover:bg-semantic-expense/10 flex items-center gap-2">
                  🗑 {t('debtDetail.delete')}
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      <div className="p-4 sm:p-6 space-y-5 max-w-2xl mx-auto">
        {/* Main Card — Amount & Progress */}
        <div className="bg-dark-card border border-dark-border rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-gray-500 text-xs uppercase tracking-wider mb-1">
                {isReceivable ? t('debtDetail.owedToYou') : t('debtDetail.youOwe')}
              </p>
              <p className={`text-2xl sm:text-3xl font-bold ${isReceivable ? 'text-semantic-income' : 'text-semantic-expense'}`}>
                {isReceivable ? '+' : '-'}{fmt(debt.amount)}
              </p>
            </div>
            {debt.is_paid ? (
              <span className="text-xs px-3 py-1.5 bg-semantic-income/15 text-semantic-income rounded-full font-bold uppercase">{t('debts.paid')}</span>
            ) : isOverdue ? (
              <span className="text-xs px-3 py-1.5 bg-semantic-expense/15 text-semantic-expense rounded-full font-bold uppercase">{t('debts.overdue')}</span>
            ) : (
              <span className="text-xs px-3 py-1.5 bg-brand-purple/15 text-brand-purple rounded-full font-bold uppercase">{t('debts.open')}</span>
            )}
          </div>

          {/* Due Date */}
          {debt.due_date && (
            <div className="flex items-center gap-2 mb-4">
              <span className="text-gray-500 text-sm">📅</span>
              <span className={`text-sm ${isOverdue ? 'text-semantic-expense font-semibold' : 'text-gray-400'}`}>
                {t('debts.dueDate')}: {fmtDate(debt.due_date)}
                {daysLeft !== null && !debt.is_paid && (
                  <span className="ml-2">
                    ({daysLeft < 0 ? t('debts.overdue') : daysLeft === 0 ? t('common.today') : t('debts.dueIn').replace('{{days}}', String(daysLeft))})
                  </span>
                )}
              </span>
            </div>
          )}

          {/* Account */}
          {debt.account && (
            <div className="flex items-center gap-2 mb-4">
              <span className="text-sm">{debt.account.icon}</span>
              <span className="text-gray-400 text-sm">{debt.account.name}</span>
            </div>
          )}

          {/* Repayment Progress */}
          <div className="mt-2">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-400 text-xs font-semibold uppercase tracking-wider">{t('debtDetail.repaymentProgress')}</span>
              <span className="text-white text-sm font-bold">{pct.toFixed(0)}%</span>
            </div>
            <div className="w-full h-3 bg-dark-bg rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${pct}%`,
                  background: debt.is_paid
                    ? '#00B894'
                    : `linear-gradient(90deg, ${catColor}, ${catColor}CC)`,
                }}
              />
            </div>
            <div className="flex items-center justify-between mt-2">
              <span className="text-gray-500 text-xs">{t('debtDetail.paid')}: {fmt(debt.paid_amount)}</span>
              <span className="text-gray-500 text-xs">{t('debtDetail.remaining')}: {fmt(remaining)}</span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        {!debt.is_paid && (
          <div className="grid grid-cols-3 gap-3">
            <button onClick={() => setShowReminderModal(true)}
              className="flex flex-col items-center gap-2 py-4 bg-dark-card border border-dark-border rounded-2xl hover:border-brand-purple/40 transition-all">
              <span className="text-2xl">🔔</span>
              <span className="text-xs text-gray-400 font-medium">{t('debtDetail.reminder')}</span>
            </button>
            <button onClick={() => setShowSettleModal(true)}
              className="flex flex-col items-center gap-2 py-4 bg-dark-card border border-dark-border rounded-2xl hover:border-semantic-income/40 transition-all">
              <span className="text-2xl">✓</span>
              <span className="text-xs text-gray-400 font-medium">{t('debts.markPaid')}</span>
            </button>
            <button onClick={() => setShowPaymentModal(true)}
              className="flex flex-col items-center gap-2 py-4 bg-dark-card border border-dark-border rounded-2xl hover:border-brand-purple/40 transition-all">
              <span className="text-2xl">💸</span>
              <span className="text-xs text-gray-400 font-medium">{t('debtDetail.addPayment')}</span>
            </button>
          </div>
        )}

        {/* Reminder banner */}
        {debt.reminder_at && (
          <div className="flex items-center gap-3 px-4 py-3 bg-amber-500/10 border border-amber-500/20 rounded-xl">
            <span className="text-lg">🔔</span>
            <div className="flex-1">
              <p className="text-amber-400 text-sm font-semibold">{t('debtDetail.reminderSet')}</p>
              <p className="text-amber-400/70 text-xs">{fmtDateTime(debt.reminder_at)}</p>
            </div>
            <button onClick={() => setShowReminderModal(true)} className="text-amber-400 text-xs underline">{t('debtDetail.edit')}</button>
          </div>
        )}

        {/* Activity Timeline */}
        <div className="bg-dark-card border border-dark-border rounded-2xl p-5">
          <h3 className="text-white font-bold text-sm mb-4">{t('debtDetail.activity')}</h3>
          <div className="space-y-0">
            {timeline.map((item, i) => (
              <div key={i} className="flex gap-3 relative">
                {/* Vertical line */}
                {i < timeline.length - 1 && (
                  <div className="absolute left-[15px] top-8 bottom-0 w-px bg-dark-border" />
                )}
                <div className="w-8 h-8 flex items-center justify-center bg-dark-bg rounded-full text-sm flex-shrink-0 z-10 border border-dark-border">
                  {item.icon}
                </div>
                <div className="flex-1 min-w-0 pb-5">
                  <div className="flex items-center justify-between">
                    <p className="text-white text-sm font-medium">{item.label}</p>
                    {item.paymentId && !debt.is_paid && (
                      <button onClick={() => handleDeletePayment(item.paymentId!)}
                        className="text-gray-500 hover:text-semantic-expense text-xs transition-colors">✕</button>
                    )}
                  </div>
                  {item.detail && <p className="text-gray-400 text-xs mt-0.5">{item.detail}</p>}
                  <p className="text-gray-600 text-[10px] mt-1">{fmtDateTime(item.date)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Personal Note */}
        <div className="bg-dark-card border border-dark-border rounded-2xl p-5">
          <h3 className="text-white font-bold text-sm mb-3">{t('debtDetail.personalNote')}</h3>
          <textarea
            value={personalNote}
            onChange={e => setPersonalNote(e.target.value)}
            placeholder={t('debtDetail.personalNotePlaceholder')}
            rows={3}
            className="w-full px-4 py-3 bg-dark-bg border border-dark-border rounded-xl text-white placeholder-gray-500 text-sm focus:outline-none focus:ring-2 focus:ring-brand-purple resize-none"
          />
          {personalNote !== (debt.personal_note || '') && (
            <button onClick={handleSaveNote} disabled={isSavingNote}
              className="mt-2 px-4 py-2 rounded-xl bg-brand-purple hover:bg-brand-purple-light text-white text-sm font-semibold transition-all disabled:opacity-50">
              {isSavingNote ? '...' : t('debts.save')}
            </button>
          )}
        </div>

        {/* Description */}
        {debt.description && (
          <div className="bg-dark-card border border-dark-border rounded-2xl p-5">
            <h3 className="text-white font-bold text-sm mb-2">{t('debts.description')}</h3>
            <p className="text-gray-400 text-sm">{debt.description}</p>
          </div>
        )}
      </div>

      {/* Modals */}
      {showPaymentModal && (
        <PaymentModal
          remaining={remaining}
          accounts={accounts}
          defaultAccountId={debt.account_id}
          onSubmit={handleAddPayment}
          onCancel={() => setShowPaymentModal(false)}
        />
      )}
      {showSettleModal && (
        <SettleModal
          accounts={accounts}
          defaultAccountId={debt.account_id}
          onConfirm={handleMarkPaid}
          onCancel={() => setShowSettleModal(false)}
        />
      )}
      {showReminderModal && (
        <ReminderModal
          currentReminder={debt.reminder_at}
          onSubmit={handleSetReminder}
          onCancel={() => setShowReminderModal(false)}
        />
      )}
      {showEditModal && (
        <EditModal
          debt={debt}
          onSubmit={handleEdit}
          onCancel={() => setShowEditModal(false)}
        />
      )}
    </AppLayout>
  );
};
