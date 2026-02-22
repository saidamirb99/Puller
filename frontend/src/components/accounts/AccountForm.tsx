import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Account, AccountCreate, AccountType } from '../../services/account.service';
import { currencies, getCurrency, searchCurrencies } from '../../data/currencies';

interface AccountFormProps {
  account?: Account;
  onSubmit: (data: AccountCreate) => Promise<void>;
  onCancel: () => void;
}

const accountTypeIcons: Record<string, string> = {
  [AccountType.CHECKING]: '🏦',
  [AccountType.SAVINGS]: '💰',
  [AccountType.CREDIT_CARD]: '💳',
  [AccountType.CASH]: '💵',
  [AccountType.INVESTMENT]: '📈',
};

const colorOptions = [
  '#0ea5e9', '#10b981', '#f59e0b', '#ef4444',
  '#8b5cf6', '#ec4899', '#6366f1', '#14b8a6',
];

export const AccountForm: React.FC<AccountFormProps> = ({ account, onSubmit, onCancel }) => {
  const { t } = useTranslation();
  const isEdit = Boolean(account);

  const accountTypeOptions = [
    { value: AccountType.CHECKING, label: t('accountForm.checkingAccount'), icon: accountTypeIcons[AccountType.CHECKING] },
    { value: AccountType.SAVINGS, label: t('accountForm.savingsAccount'), icon: accountTypeIcons[AccountType.SAVINGS] },
    { value: AccountType.CREDIT_CARD, label: t('accountForm.creditCardAccount'), icon: accountTypeIcons[AccountType.CREDIT_CARD] },
    { value: AccountType.CASH, label: t('accountForm.cashAccount'), icon: accountTypeIcons[AccountType.CASH] },
    { value: AccountType.INVESTMENT, label: t('accountForm.investmentAccount'), icon: accountTypeIcons[AccountType.INVESTMENT] },
  ];

  const [formData, setFormData] = useState<AccountCreate>({
    name: account?.name || '',
    account_type: account?.account_type || AccountType.CHECKING,
    currency: account?.currency || 'USD',
    initial_balance: account?.initial_balance || 0,
    institution: account?.institution || '',
    account_number_last4: account?.account_number_last4 || '',
    color: account?.color || '#0ea5e9',
    icon: account?.icon || '💳',
    credit_limit: account?.credit_limit || undefined,
    exclude_from_total: account?.exclude_from_total || false,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [currencyOpen, setCurrencyOpen] = useState(false);
  const [currencySearch, setCurrencySearch] = useState('');
  const currencyRef = useRef<HTMLDivElement>(null);
  const currencyInputRef = useRef<HTMLInputElement>(null);

  const filteredCurrencies = useMemo(() => {
    if (!currencySearch) return currencies.slice(0, 30);
    return searchCurrencies(currencySearch);
  }, [currencySearch]);

  const selectedCurrency = formData.currency ? getCurrency(formData.currency) : undefined;

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (currencyRef.current && !currencyRef.current.contains(e.target as Node)) {
        setCurrencyOpen(false);
        setCurrencySearch('');
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;

    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : type === 'number' ? parseFloat(value) || 0 : value,
    }));

    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name || formData.name.trim().length === 0) {
      newErrors.name = t('accountForm.nameRequired');
    }

    if (formData.account_number_last4 && formData.account_number_last4.length !== 4) {
      newErrors.account_number_last4 = t('accountForm.last4Error');
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    setIsLoading(true);
    try {
      await onSubmit(formData);
    } catch (error: any) {
      setErrors({
        submit: error.response?.data?.detail || t('accountForm.saveFailed'),
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Title */}
      <div className="flex items-center gap-2 mb-2">
        <div className="w-1 h-5 rounded-full bg-[#F5C518]" />
        <h3 className="text-lg font-bold text-white">
          {isEdit ? t('accountForm.editTitle') : t('accountForm.createTitle')}
        </h3>
      </div>

      {/* Account Name */}
      <div>
        <label className="text-gray-500 text-[10px] uppercase tracking-wider font-medium mb-1.5 block">
          {t('accountForm.name')}
        </label>
        <input
          type="text"
          name="name"
          placeholder={t('accountForm.namePlaceholder')}
          value={formData.name}
          onChange={handleChange}
          className="w-full bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl px-4 py-3 text-white text-sm placeholder-gray-500 focus:outline-none focus:border-[#F5C518]/40 transition-colors"
        />
        {errors.name && <p className="text-[#E17055] text-xs mt-1">{errors.name}</p>}
      </div>

      {/* Account Type — styled chips instead of select */}
      <div>
        <label className="text-gray-500 text-[10px] uppercase tracking-wider font-medium mb-2 block">
          {t('accountForm.type')}
        </label>
        <div className="flex gap-2 overflow-x-auto pb-1">
          {accountTypeOptions.map((option) => {
            const isActive = formData.account_type === option.value;
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => setFormData(prev => ({ ...prev, account_type: option.value }))}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap transition-all flex-shrink-0"
                style={{
                  backgroundColor: isActive ? '#F5C51818' : '#1A1A1A',
                  color: isActive ? '#F5C518' : '#9CA3AF',
                  border: isActive ? '1.5px solid #F5C518' : '1.5px solid #2A2A2A',
                }}
              >
                <span>{option.icon}</span>
                {option.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Currency + Initial Balance — side by side */}
      <div className="grid grid-cols-2 gap-3">
        <div ref={currencyRef} className="relative">
          <label className="text-gray-500 text-[10px] uppercase tracking-wider font-medium mb-1.5 block">
            {t('accountForm.currency')}
          </label>
          <button
            type="button"
            onClick={() => {
              setCurrencyOpen(!currencyOpen);
              setCurrencySearch('');
              setTimeout(() => currencyInputRef.current?.focus(), 50);
            }}
            className="w-full bg-[#1A1A1A] border rounded-xl px-4 py-3 text-sm text-left flex items-center gap-2 transition-colors"
            style={{
              borderColor: currencyOpen ? 'rgba(245,197,24,0.4)' : '#2A2A2A',
            }}
          >
            {selectedCurrency ? (
              <>
                <span className="text-base leading-none">{selectedCurrency.flag}</span>
                <span className="text-white font-medium">{selectedCurrency.code}</span>
                <span className="text-gray-500 text-xs truncate">{selectedCurrency.symbol}</span>
              </>
            ) : (
              <span className="text-gray-600">{t('accountForm.selectCurrency')}</span>
            )}
            <svg className="ml-auto w-4 h-4 text-gray-500 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </button>

          {currencyOpen && (
            <div className="absolute z-50 top-full mt-1 left-0 right-0 bg-[#0D0D0D] border border-[#2A2A2A] rounded-xl shadow-2xl overflow-hidden"
              style={{ boxShadow: '0 16px 48px rgba(0,0,0,0.5)' }}>
              {/* Search */}
              <div className="p-2 border-b border-[#1A1A1A]">
                <div className="relative">
                  <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" />
                  </svg>
                  <input
                    ref={currencyInputRef}
                    type="text"
                    placeholder={t('accountForm.searchCurrency')}
                    value={currencySearch}
                    onChange={(e) => setCurrencySearch(e.target.value)}
                    className="w-full bg-[#1A1A1A] rounded-lg pl-9 pr-3 py-2 text-white text-xs placeholder-gray-500 focus:outline-none"
                  />
                </div>
              </div>
              {/* List */}
              <div className="max-h-48 overflow-y-auto overscroll-contain">
                {filteredCurrencies.length === 0 ? (
                  <div className="px-4 py-6 text-center text-gray-500 text-xs">{t('accountForm.noCurrencies')}</div>
                ) : (
                  filteredCurrencies.map((c) => {
                    const isSelected = formData.currency === c.code;
                    return (
                      <button
                        key={c.code}
                        type="button"
                        onClick={() => {
                          setFormData(prev => ({ ...prev, currency: c.code }));
                          setCurrencyOpen(false);
                          setCurrencySearch('');
                        }}
                        className="w-full flex items-center gap-2.5 px-3 py-2.5 text-left transition-colors hover:bg-[#1A1A1A]"
                        style={{
                          backgroundColor: isSelected ? '#F5C51812' : undefined,
                        }}
                      >
                        <span className="text-base leading-none flex-shrink-0">{c.flag}</span>
                        <span className="font-medium text-sm" style={{ color: isSelected ? '#F5C518' : '#fff' }}>{c.code}</span>
                        <span className="text-gray-500 text-xs truncate flex-1">{c.name}</span>
                        <span className="text-gray-600 text-xs flex-shrink-0">{c.symbol}</span>
                        {isSelected && (
                          <svg className="w-3.5 h-3.5 text-[#F5C518] flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                        )}
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>

        <div>
          <label className="text-gray-500 text-[10px] uppercase tracking-wider font-medium mb-1.5 block">
            {t('accountForm.balance')}
          </label>
          <input
            type="number"
            name="initial_balance"
            step="0.01"
            value={formData.initial_balance}
            onChange={handleChange}
            className="w-full bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl px-4 py-3 text-white text-sm placeholder-gray-500 focus:outline-none focus:border-[#F5C518]/40 transition-colors"
          />
        </div>
      </div>

      {/* Credit Limit (conditional) */}
      {formData.account_type === AccountType.CREDIT_CARD && (
        <div>
          <label className="text-gray-500 text-[10px] uppercase tracking-wider font-medium mb-1.5 block">
            {t('accountForm.creditLimit')}
          </label>
          <input
            type="number"
            name="credit_limit"
            step="0.01"
            value={formData.credit_limit || ''}
            onChange={handleChange}
            className="w-full bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl px-4 py-3 text-white text-sm placeholder-gray-500 focus:outline-none focus:border-[#F5C518]/40 transition-colors"
          />
          <p className="text-gray-600 text-[10px] mt-1">{t('accountForm.creditLimitHint')}</p>
        </div>
      )}

      {/* Institution + Last 4 — side by side */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-gray-500 text-[10px] uppercase tracking-wider font-medium mb-1.5 block">
            {t('accountForm.institution')}
          </label>
          <input
            type="text"
            name="institution"
            placeholder={t('accountForm.institutionPlaceholder')}
            value={formData.institution || ''}
            onChange={handleChange}
            className="w-full bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl px-4 py-3 text-white text-sm placeholder-gray-500 focus:outline-none focus:border-[#F5C518]/40 transition-colors"
          />
        </div>

        <div>
          <label className="text-gray-500 text-[10px] uppercase tracking-wider font-medium mb-1.5 block">
            {t('accountForm.last4')}
          </label>
          <input
            type="text"
            name="account_number_last4"
            placeholder="1234"
            maxLength={4}
            value={formData.account_number_last4 || ''}
            onChange={handleChange}
            className="w-full bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl px-4 py-3 text-white text-sm placeholder-gray-500 focus:outline-none focus:border-[#F5C518]/40 transition-colors"
          />
          {errors.account_number_last4 && <p className="text-[#E17055] text-xs mt-1">{errors.account_number_last4}</p>}
        </div>
      </div>

      {/* Color picker */}
      <div>
        <label className="text-gray-500 text-[10px] uppercase tracking-wider font-medium mb-2 block">
          {t('accountForm.color')}
        </label>
        <div className="flex gap-2.5">
          {colorOptions.map((color) => (
            <button
              key={color}
              type="button"
              onClick={() => setFormData((prev) => ({ ...prev, color }))}
              className="w-9 h-9 rounded-full transition-all"
              style={{
                backgroundColor: color,
                boxShadow: formData.color === color ? `0 0 0 2px #0D0D0D, 0 0 0 4px ${color}` : 'none',
                transform: formData.color === color ? 'scale(1.1)' : 'scale(1)',
              }}
            />
          ))}
        </div>
      </div>

      {/* Exclude from total */}
      <div className="flex items-center gap-3 py-2">
        <button
          type="button"
          onClick={() => setFormData(prev => ({ ...prev, exclude_from_total: !prev.exclude_from_total }))}
          className="w-5 h-5 rounded-md flex items-center justify-center transition-all"
          style={{
            backgroundColor: formData.exclude_from_total ? '#F5C518' : 'transparent',
            border: formData.exclude_from_total ? '1.5px solid #F5C518' : '1.5px solid #2A2A2A',
          }}
        >
          {formData.exclude_from_total && (
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="3" strokeLinecap="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          )}
        </button>
        <span className="text-gray-400 text-sm">{t('accountForm.excludeFromTotal')}</span>
      </div>

      {/* Error */}
      {errors.submit && (
        <p className="text-[#E17055] text-sm text-center py-2 px-3 bg-[#E17055]/10 rounded-xl">{errors.submit}</p>
      )}

      {/* Buttons */}
      <div className="flex gap-3 pt-2">
        <button
          type="submit"
          disabled={isLoading}
          className="flex-1 py-3.5 rounded-2xl font-semibold text-sm transition-all active:scale-[0.97] disabled:opacity-50 flex items-center justify-center gap-2"
          style={{
            background: 'linear-gradient(135deg, #F5C518, #F5C518CC)',
            color: '#000',
            boxShadow: '0 8px 24px #F5C51830',
          }}
        >
          {isLoading ? (
            <div className="w-5 h-5 border-2 border-black/30 border-t-black rounded-full animate-spin" />
          ) : isEdit ? t('accountForm.updateAccount') : t('accountForm.createAccount')}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 py-3.5 rounded-2xl border border-[#2A2A2A] text-gray-400 hover:text-white hover:border-[#F5C518]/30 transition-all text-sm font-medium"
        >
          {t('accountForm.cancel')}
        </button>
      </div>
    </form>
  );
};
