import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Account } from '../../services/account.service';
import accountService from '../../services/account.service';
import transactionService, { TransferCreate } from '../../services/transaction.service';

interface TransferModalProps {
  onSuccess: () => void;
  onClose: () => void;
}

const nowLocalDateTime = () => {
  const d = new Date();
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

const ACCENT = '#8B5CF6'; // Purple for transfers

export const TransferModal: React.FC<TransferModalProps> = ({ onSuccess, onClose }) => {
  const { t } = useTranslation();

  const [accounts, setAccounts] = useState<Account[]>([]);
  const [fromAccountId, setFromAccountId] = useState('');
  const [toAccountId, setToAccountId] = useState('');
  const [amountStr, setAmountStr] = useState('0.00');
  const [date, setDate] = useState(nowLocalDateTime());
  const [description, setDescription] = useState('');
  const [notes, setNotes] = useState('');

  // Exchange rate
  const [rateMode, setRateMode] = useState<'auto' | 'manual'>('auto');
  const [autoRate, setAutoRate] = useState<number | null>(null);
  const [manualRate, setManualRate] = useState('');
  const [fetchingRate, setFetchingRate] = useState(false);
  const [rateFetchError, setRateFetchError] = useState(false);

  const [showFromPicker, setShowFromPicker] = useState(false);
  const [showToPicker, setShowToPicker] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const amountRef = useRef<HTMLInputElement>(null);
  const fromPickerRef = useRef<HTMLDivElement>(null!);
  const toPickerRef = useRef<HTMLDivElement>(null!);

  const fromAccount = accounts.find((a) => a.id === fromAccountId);
  const toAccount = accounts.find((a) => a.id === toAccountId);
  const isDifferentCurrency = fromAccount && toAccount && fromAccount.currency !== toAccount.currency;

  const effectiveRate = rateMode === 'manual' ? parseFloat(manualRate) || 1 : autoRate || 1;
  const amount = parseFloat(amountStr) || 0;
  const receivedAmount = isDifferentCurrency ? Math.round(amount * effectiveRate * 100) / 100 : amount;

  useEffect(() => {
    loadAccounts();
    setTimeout(() => amountRef.current?.focus(), 300);
  }, []);

  // Close pickers on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (fromPickerRef.current && !fromPickerRef.current.contains(e.target as Node)) setShowFromPicker(false);
      if (toPickerRef.current && !toPickerRef.current.contains(e.target as Node)) setShowToPicker(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  // Fetch exchange rate when currencies change
  useEffect(() => {
    if (!isDifferentCurrency || rateMode !== 'auto') return;
    fetchExchangeRate(fromAccount!.currency, toAccount!.currency);
  }, [fromAccountId, toAccountId, rateMode]);

  const loadAccounts = async () => {
    try {
      const accs = await accountService.getAccounts();
      setAccounts(accs);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchExchangeRate = async (from: string, to: string) => {
    setFetchingRate(true);
    setRateFetchError(false);
    setAutoRate(null);
    try {
      const res = await fetch(`https://api.frankfurter.app/latest?from=${from}&to=${to}`);
      if (!res.ok) throw new Error('Failed');
      const data = await res.json();
      const rate = data.rates?.[to];
      if (rate) {
        setAutoRate(rate);
      } else {
        setRateFetchError(true);
      }
    } catch {
      setRateFetchError(true);
    } finally {
      setFetchingRate(false);
    }
  };

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) =>
    setAmountStr(e.target.value.replace(/[^0-9.]/g, '') || '0');
  const handleAmountFocus = () => { if (amountStr === '0.00' || amountStr === '0') setAmountStr(''); };
  const handleAmountBlur = () => { const n = parseFloat(amountStr); setAmountStr(isNaN(n) ? '0.00' : n.toFixed(2)); };

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

  const handleSubmit = async () => {
    if (!amount || amount <= 0) { setError(t('transfer.errorAmount')); amountRef.current?.focus(); return; }
    if (!fromAccountId) { setError(t('transfer.errorFromAccount')); return; }
    if (!toAccountId) { setError(t('transfer.errorToAccount')); return; }
    if (fromAccountId === toAccountId) { setError(t('transfer.sameAccountError')); return; }

    setError('');
    setIsSubmitting(true);
    try {
      const payload: TransferCreate = {
        from_account_id: fromAccountId,
        to_account_id: toAccountId,
        amount,
        description: description.trim() || 'Transfer',
        notes: notes.trim() || null,
        transaction_date: new Date(date).toISOString(),
      };
      if (isDifferentCurrency) {
        payload.exchange_rate = effectiveRate;
      }
      await transactionService.createTransfer(payload);
      onSuccess();
    } catch (e: any) {
      setError(e.response?.data?.detail || t('transfer.failed'));
      setIsSubmitting(false);
    }
  };

  const AccountPicker = ({
    label,
    selectedId,
    onSelect,
    show,
    setShow,
    pickerRef,
    excludeId,
  }: {
    label: string;
    selectedId: string;
    onSelect: (id: string) => void;
    show: boolean;
    setShow: (v: boolean) => void;
    pickerRef: React.RefObject<HTMLDivElement>;
    excludeId?: string;
  }) => {
    const selected = accounts.find((a) => a.id === selectedId);
    return (
      <div className="relative" ref={pickerRef}>
        <p className="text-gray-500 text-[10px] uppercase tracking-wider mb-1.5 font-semibold">{label}</p>
        <button
          onClick={() => setShow(!show)}
          className="w-full flex items-center gap-3 bg-white/[0.04] hover:bg-white/[0.06] border border-white/[0.06] rounded-xl px-4 py-3 text-sm text-white transition-all"
        >
          {selected ? (
            <>
              <span className="text-lg">{selected.icon}</span>
              <div className="text-left flex-1">
                <p className="font-medium">{selected.name}</p>
                <p className="text-gray-500 text-xs">{selected.currency} &middot; {selected.balance.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
              </div>
            </>
          ) : (
            <span className="text-gray-500 flex-1">{t('transfer.selectAccount')}</span>
          )}
          <span className="text-gray-500 text-xs">▾</span>
        </button>
        {show && (
          <div className="absolute top-full mt-1 left-0 right-0 bg-white/[0.06] backdrop-blur-2xl border border-white/[0.07] rounded-xl shadow-xl z-20 overflow-hidden max-h-60 overflow-y-auto">
            {accounts.filter(a => a.id !== excludeId).map((acc) => (
              <button
                key={acc.id}
                onClick={() => { onSelect(acc.id); setShow(false); }}
                className={`w-full flex items-center gap-3 px-4 py-3 text-sm hover:bg-white/[0.08] transition-colors ${acc.id === selectedId ? 'text-[#8B5CF6]' : 'text-white'}`}
              >
                <span className="text-lg">{acc.icon}</span>
                <div className="text-left flex-1">
                  <p className="font-medium">{acc.name}</p>
                  <p className="text-gray-500 text-xs">{acc.currency} &middot; {acc.balance.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
                </div>
                {acc.id === selectedId && <span className="text-[#8B5CF6]">✓</span>}
              </button>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center sm:items-center"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-sm glass-modal rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden animate-slide-up border border-white/[0.05] sm:border-white/[0.07]">
        {/* Top accent line */}
        <div className="absolute top-0 left-0 right-0 h-[2px]"
          style={{ background: `linear-gradient(90deg, transparent, ${ACCENT}60, transparent)` }} />

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
          <h2 className="text-white font-semibold text-base">{t('transfer.title')}</h2>
          <button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-white/[0.06] transition-all disabled:opacity-40"
            style={{ color: ACCENT }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </button>
        </div>

        <div className="px-5 pb-6 space-y-4 overflow-y-auto max-h-[75vh]">
          {/* Amount */}
          <div className="flex items-center justify-center gap-2 py-5 relative">
            <div className="absolute inset-0 rounded-2xl opacity-30"
              style={{ background: `radial-gradient(circle at center, ${ACCENT}08, transparent)` }} />
            <span className="text-gray-600 text-3xl font-light">
              {fromAccount?.currency === 'USD' ? '$' : fromAccount?.currency || '$'}
            </span>
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

          {/* From -> To accounts */}
          <div className="space-y-3">
            <AccountPicker
              label={t('transfer.fromAccount')}
              selectedId={fromAccountId}
              onSelect={setFromAccountId}
              show={showFromPicker}
              setShow={setShowFromPicker}
              pickerRef={fromPickerRef}
              excludeId={toAccountId}
            />

            {/* Arrow between accounts */}
            <div className="flex justify-center">
              <div className="w-8 h-8 rounded-full bg-white/[0.04] border border-white/[0.06] flex items-center justify-center">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={ACCENT} strokeWidth="2.5" strokeLinecap="round">
                  <path d="M12 5v14M5 12l7 7 7-7" />
                </svg>
              </div>
            </div>

            <AccountPicker
              label={t('transfer.toAccount')}
              selectedId={toAccountId}
              onSelect={setToAccountId}
              show={showToPicker}
              setShow={setShowToPicker}
              pickerRef={toPickerRef}
              excludeId={fromAccountId}
            />
          </div>

          {/* Exchange Rate Section (only when currencies differ) */}
          {isDifferentCurrency && (
            <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-gray-500 text-[10px] uppercase tracking-wider font-semibold">{t('transfer.exchangeRate')}</p>
                <p className="text-xs text-gray-400">{fromAccount?.currency} → {toAccount?.currency}</p>
              </div>

              {/* Auto / Manual toggle */}
              <div className="flex bg-white/[0.03] rounded-lg overflow-hidden p-0.5">
                {(['auto', 'manual'] as const).map((mode) => (
                  <button
                    key={mode}
                    onClick={() => setRateMode(mode)}
                    className={`flex-1 py-1.5 text-xs font-medium transition-all rounded-md ${
                      rateMode === mode ? 'bg-[#8B5CF6]/20 text-[#8B5CF6]' : 'text-gray-500'
                    }`}
                  >
                    {mode === 'auto' ? t('transfer.autoRate') : t('transfer.manualRate')}
                  </button>
                ))}
              </div>

              {rateMode === 'auto' ? (
                <div className="text-center">
                  {fetchingRate ? (
                    <div className="flex items-center justify-center gap-2 py-2">
                      <div className="w-4 h-4 border-2 border-[#8B5CF6]/30 border-t-[#8B5CF6] rounded-full animate-spin" />
                      <span className="text-gray-400 text-xs">{t('transfer.fetchingRate')}</span>
                    </div>
                  ) : rateFetchError ? (
                    <div className="py-2">
                      <p className="text-[#E17055] text-xs">{t('transfer.rateFetchError')}</p>
                      <button
                        onClick={() => fetchExchangeRate(fromAccount!.currency, toAccount!.currency)}
                        className="text-[#8B5CF6] text-xs mt-1 underline"
                      >
                        Retry
                      </button>
                    </div>
                  ) : autoRate ? (
                    <p className="text-white text-sm font-medium py-1">
                      1 {fromAccount?.currency} = {autoRate.toFixed(4)} {toAccount?.currency}
                    </p>
                  ) : null}
                </div>
              ) : (
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-gray-500 text-sm">1 {fromAccount?.currency} =</span>
                    <input
                      type="number"
                      inputMode="decimal"
                      value={manualRate}
                      onChange={(e) => setManualRate(e.target.value)}
                      placeholder="0.0000"
                      className="flex-1 bg-white/[0.04] border border-white/[0.06] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#8B5CF6]/50"
                      step="0.0001"
                      min="0"
                    />
                    <span className="text-gray-500 text-sm">{toAccount?.currency}</span>
                  </div>
                </div>
              )}

              {/* Preview received amount */}
              {amount > 0 && (
                <div className="flex items-center justify-between pt-2 border-t border-white/[0.06]">
                  <span className="text-gray-500 text-xs">{t('transfer.theyReceive')}</span>
                  <span className="text-white font-bold text-sm">
                    {receivedAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })} {toAccount?.currency}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Date */}
          <div className="flex items-center gap-3 py-3 border-t border-white/[0.06]">
            <div className="w-8 h-8 rounded-full bg-white/[0.04] flex items-center justify-center text-gray-400">📅</div>
            <div className="flex-1">
              <p className="text-gray-500 text-[10px] uppercase tracking-wider mb-0.5">{t('modal.date')}</p>
              <p className="text-white text-sm font-medium">{formatDateDisplay(date)}</p>
            </div>
            <label className="text-gray-600 text-sm cursor-pointer hover:text-gray-400 transition-colors">
              ›<input type="datetime-local" value={date} onChange={(e) => setDate(e.target.value)} className="sr-only" />
            </label>
          </div>

          {/* Description */}
          <div className="flex items-start gap-3 py-3 border-t border-white/[0.06]">
            <div className="w-8 h-8 rounded-full bg-white/[0.04] flex items-center justify-center text-gray-400 mt-0.5">📝</div>
            <div className="flex-1">
              <p className="text-gray-500 text-[10px] uppercase tracking-wider mb-1">{t('transfer.description')}</p>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={t('transfer.descriptionPlaceholder')}
                className="w-full bg-transparent text-white text-sm placeholder-gray-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Notes */}
          <div className="flex items-start gap-3 py-3 border-t border-white/[0.06]">
            <div className="w-8 h-8 rounded-full bg-white/[0.04] flex items-center justify-center text-gray-400 mt-0.5">💬</div>
            <div className="flex-1">
              <p className="text-gray-500 text-[10px] uppercase tracking-wider mb-1">{t('transfer.notes')}</p>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder={t('transfer.notesPlaceholder')}
                className="w-full bg-transparent text-white text-sm placeholder-gray-500 focus:outline-none"
              />
            </div>
          </div>

          {error && <p className="text-[#E17055] text-sm text-center py-1">{error}</p>}

          <button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="w-full py-4 rounded-2xl font-semibold text-white text-base transition-all active:scale-[0.97] disabled:opacity-60 flex items-center justify-center gap-2 mt-2 relative overflow-hidden"
            style={{ background: `linear-gradient(135deg, ${ACCENT}, ${ACCENT}CC)`, boxShadow: `0 8px 24px ${ACCENT}30` }}
          >
            {isSubmitting ? (
              <div className="w-5 h-5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <path d="M7 17L17 7M17 7H7M17 7V17" />
                </svg>
                {t('transfer.submit')}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
