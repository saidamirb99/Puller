import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { CategoryIcon } from '../ui/CategoryIcon';
import { TransactionType, TransactionCreate, Category } from '../../services/transaction.service';
import { Account } from '../../services/account.service';
import transactionService from '../../services/transaction.service';
import accountService from '../../services/account.service';

interface TransactionFormProps {
  onSubmit: (data: TransactionCreate) => Promise<void>;
  onCancel: () => void;
  initialType?: TransactionType;
}

export const TransactionForm: React.FC<TransactionFormProps> = ({
  onSubmit,
  onCancel,
  initialType = TransactionType.EXPENSE,
}) => {
  const { t } = useTranslation();
  const [formData, setFormData] = useState<TransactionCreate>({
    account_id: '',
    category_id: '',
    transaction_type: initialType,
    amount: 0,
    description: '',
    notes: '',
    transaction_date: new Date().toISOString().slice(0, 16),
    merchant: '',
  });

  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [accountsData, categoriesData] = await Promise.all([
        accountService.getAccounts(),
        transactionService.getCategories(),
      ]);
      setAccounts(accountsData);
      setCategories(categoriesData);

      // Auto-select first account if available
      if (accountsData.length > 0 && !formData.account_id) {
        setFormData((prev) => ({ ...prev, account_id: accountsData[0].id }));
      }
    } catch (error) {
      console.error('Failed to load data:', error);
    }
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === 'amount' ? parseFloat(value) || 0 : value,
    }));

    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  const handleTypeToggle = (type: TransactionType) => {
    setFormData((prev) => ({ ...prev, transaction_type: type }));
  };

  const handleCategorySelect = (categoryId: string) => {
    setFormData((prev) => ({ ...prev, category_id: categoryId }));
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.account_id) {
      newErrors.account_id = t('modal.errorAccount');
    }

    if (!formData.amount || formData.amount <= 0) {
      newErrors.amount = t('modal.errorAmountPositive');
    }

    if (!formData.description || formData.description.trim().length === 0) {
      newErrors.description = t('modal.errorDescriptionRequired');
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
        submit: error.response?.data?.detail || t('modal.createFailed'),
      });
    } finally {
      setIsLoading(false);
    }
  };

  const isIncome = formData.transaction_type === TransactionType.INCOME;

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-2xl font-bold text-white">{t('modal.addTransaction')}</h3>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => handleTypeToggle(TransactionType.EXPENSE)}
            className={`px-4 py-2 rounded-xl font-medium transition-all ${
              !isIncome
                ? 'bg-semantic-expense text-white'
                : 'bg-white/[0.04] text-gray-400 border border-white/[0.07]'
            }`}
          >
            💸 {t('modal.expense')}
          </button>
          <button
            type="button"
            onClick={() => handleTypeToggle(TransactionType.INCOME)}
            className={`px-4 py-2 rounded-xl font-medium transition-all ${
              isIncome
                ? 'bg-semantic-income text-white'
                : 'bg-white/[0.04] text-gray-400 border border-white/[0.07]'
            }`}
          >
            💰 {t('modal.income')}
          </button>
        </div>
      </div>

      {/* Account Selection */}
      <div>
        <label className="block text-sm font-medium text-gray-400 mb-2">{t('modal.account')}</label>
        <select
          name="account_id"
          value={formData.account_id}
          onChange={handleChange}
          className="w-full px-4 py-2.5 bg-white/[0.04] border border-white/[0.07] rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-brand-purple"
        >
          <option value="">{t('modal.selectAccount')}</option>
          {accounts.map((account) => (
            <option key={account.id} value={account.id}>
              {account.icon} {account.name} - {account.currency}{' '}
              {account.balance.toLocaleString()}
            </option>
          ))}
        </select>
        {errors.account_id && <p className="mt-1.5 text-sm text-semantic-error">{errors.account_id}</p>}
      </div>

      {/* Amount & Description */}
      <div className="grid grid-cols-2 gap-4">
        <Input
          label={t('modal.amount')}
          type="number"
          name="amount"
          step="0.01"
          placeholder="0.00"
          value={formData.amount || ''}
          onChange={handleChange}
          error={errors.amount}
          required
        />
        <Input
          label={t('modal.description')}
          type="text"
          name="description"
          placeholder={t('modal.descriptionPlaceholder')}
          value={formData.description}
          onChange={handleChange}
          error={errors.description}
          required
        />
      </div>

      {/* Category Selection */}
      <div>
        <label className="block text-sm font-medium text-gray-400 mb-3">{t('modal.category')}</label>
        <div className="grid grid-cols-4 gap-3 max-h-64 overflow-y-auto pr-2">
          {categories.map((category) => (
            <button
              key={category.id}
              type="button"
              onClick={() => handleCategorySelect(category.id)}
              className={`flex flex-col items-center gap-2 p-3 rounded-xl transition-all ${
                formData.category_id === category.id
                  ? 'bg-brand-purple ring-2 ring-brand-purple-light'
                  : 'bg-white/[0.04] border border-white/[0.07] hover:border-brand-purple'
              }`}
            >
              <CategoryIcon icon={category.icon} color={category.color} size="md" />
              <span className="text-xs text-gray-400 text-center">{category.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Date & Merchant */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-400 mb-2">{t('modal.dateTime')}</label>
          <input
            type="datetime-local"
            name="transaction_date"
            value={formData.transaction_date}
            onChange={handleChange}
            className="w-full px-4 py-2.5 bg-white/[0.04] border border-white/[0.07] rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-brand-purple"
          />
        </div>
        <Input
          label={isIncome ? t('modal.merchantIncome') : t('modal.merchantExpense')}
          type="text"
          name="merchant"
          placeholder={isIncome ? t('modal.placeholderMerchantIncome') : t('modal.placeholderMerchantExpense')}
          value={formData.merchant || ''}
          onChange={handleChange}
        />
      </div>

      {/* Notes */}
      <div>
        <label className="block text-sm font-medium text-gray-400 mb-2">{t('modal.notesLabel')}</label>
        <textarea
          name="notes"
          value={formData.notes || ''}
          onChange={handleChange}
          rows={3}
          placeholder={t('modal.notesPlaceholder')}
          className="w-full px-4 py-2.5 bg-white/[0.04] border border-white/[0.07] rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-brand-purple resize-none"
        />
      </div>

      {/* Error Message */}
      {errors.submit && (
        <div className="bg-semantic-error/10 border border-semantic-error text-semantic-error px-4 py-3 rounded-xl">
          {errors.submit}
        </div>
      )}

      {/* Buttons */}
      <div className="flex gap-3 pt-4">
        <Button type="submit" variant="primary" className="flex-1" isLoading={isLoading}>
          {isIncome ? `💰 ${t('modal.addIncome')}` : `💸 ${t('modal.addExpense')}`}
        </Button>
        <Button type="button" variant="secondary" onClick={onCancel} className="flex-1">
          {t('modal.cancel')}
        </Button>
      </div>
    </form>
  );
};
