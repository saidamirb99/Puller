import React from 'react';
import { useTranslation } from 'react-i18next';
import { CategoryIcon } from '../ui/CategoryIcon';
import { useAuth } from '../../context/AuthContext';
import { Transaction } from '../../services/transaction.service';

interface TransactionListItemProps {
  transaction: Transaction;
  onClick?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
}

export const TransactionListItem: React.FC<TransactionListItemProps> = ({
  transaction,
  onClick,
  onEdit,
  onDelete,
}) => {
  const { user } = useAuth();
  const { t, i18n } = useTranslation();
  const isRu = i18n.language === 'ru';
  const locale = isRu ? 'ru-RU' : 'en-US';
  const isIncome = transaction.transaction_type === 'INCOME';
  const amountPrefix = isIncome ? '+' : '-';
  const categoryColor = transaction.category?.color || '#F5C518';

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: user?.default_currency || 'USD',
    }).format(amount);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const time = date.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit', hour12: false });
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) return time;
    if (days === 1) return `${t('common.yesterday')}, ${time}`;
    if (days < 7) return `${date.toLocaleDateString(locale, { weekday: 'short' })}, ${time}`;
    return `${date.toLocaleDateString(locale, { month: 'short', day: 'numeric' })}, ${time}`;
  };

  return (
    <div
      className="bg-[#0D0D0D] border border-[#1A1A1A] rounded-xl px-4 py-3.5 hover:bg-[#111] transition-all duration-200 cursor-pointer group border-l-2"
      style={{ borderLeftColor: categoryColor }}
      onClick={onClick}
    >
      <div className="flex items-center gap-3">
        {/* Icon */}
        <CategoryIcon
          icon={transaction.category?.icon || 'folder'}
          color={categoryColor}
          size="md"
          className="flex-shrink-0"
        />

        {/* Info */}
        <div className="flex-1 min-w-0">
          <h4 className="text-white font-medium text-sm truncate">{transaction.description}</h4>
          <p className="text-gray-600 text-xs mt-0.5 flex items-center gap-1.5">
            <span>{transaction.category?.name || t('transactions.uncategorized')}</span>
            {transaction.merchant && (
              <>
                <span className="text-gray-700">·</span>
                <span className="truncate max-w-[120px]">{transaction.merchant}</span>
              </>
            )}
          </p>
        </div>

        {/* Amount + Time */}
        <div className="text-right mr-1 flex-shrink-0">
          <p className={`font-bold text-sm ${isIncome ? 'text-[#00B894]' : 'text-white'}`}>
            {amountPrefix}{formatCurrency(transaction.amount)}
          </p>
          <p className="text-gray-600 text-[11px] mt-0.5">{formatDate(transaction.transaction_date)}</p>
        </div>

        {/* Action Buttons (hover reveal) */}
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
          {onEdit && (
            <button
              onClick={(e) => { e.stopPropagation(); onEdit(); }}
              className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-500 hover:text-[#F5C518] hover:bg-[#F5C518]/10 transition-all"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
                <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
              </svg>
            </button>
          )}
          {onDelete && (
            <button
              onClick={(e) => { e.stopPropagation(); onDelete(); }}
              className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-500 hover:text-[#E17055] hover:bg-[#E17055]/10 transition-all"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
