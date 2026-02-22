import React from 'react';
import { useTranslation } from 'react-i18next';
import { Account, AccountType } from '../../services/account.service';


interface AccountCardProps {
  account: Account;
  onEdit: (account: Account) => void;
  onDelete: (account: Account) => void;
}

const accountTypeLabelKeys: Record<string, string> = {
  [AccountType.CHECKING]: 'accounts.checkingType',
  [AccountType.SAVINGS]: 'accounts.savingsType',
  [AccountType.CREDIT_CARD]: 'accounts.creditCardType',
  [AccountType.CASH]: 'accounts.cashType',
  [AccountType.INVESTMENT]: 'accounts.investmentType',
};

const CARD_GRADIENTS_DARK: Record<string, string> = {
  [AccountType.CHECKING]: 'linear-gradient(135deg, rgba(255,255,255,0.06) 0%, rgba(12,12,24,0.8) 100%)',
  [AccountType.SAVINGS]: 'linear-gradient(135deg, rgba(13,26,13,0.6) 0%, rgba(12,12,24,0.8) 100%)',
  [AccountType.CREDIT_CARD]: 'linear-gradient(135deg, rgba(26,26,0,0.6) 0%, rgba(12,12,24,0.8) 100%)',
  [AccountType.CASH]: 'linear-gradient(135deg, rgba(255,255,255,0.04) 0%, rgba(12,12,24,0.8) 100%)',
  [AccountType.INVESTMENT]: 'linear-gradient(135deg, rgba(13,13,26,0.6) 0%, rgba(12,12,24,0.8) 100%)',
};


export const AccountCard: React.FC<AccountCardProps> = ({ account, onEdit, onDelete }) => {
  const { t } = useTranslation();
  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
    }).format(amount);
  };

  const isNegativeBalance = account.balance < 0;
  const isCreditCard = account.account_type === AccountType.CREDIT_CARD;
  const cardColor = account.color || '#F5C518';

  return (
    <div
      className="relative rounded-2xl overflow-hidden group cursor-pointer transition-all duration-300 border border-white/[0.07] backdrop-blur-2xl hover:-translate-y-1 hover:border-[#F5C518]/20 hover:shadow-[0_0_30px_rgba(245,197,24,0.08)]"
      style={{ background: CARD_GRADIENTS_DARK[account.account_type] || CARD_GRADIENTS_DARK[AccountType.CASH] }}
    >
      {/* Top accent line */}
      <div className="absolute top-0 left-0 right-0 h-[2px]"
        style={{ background: `linear-gradient(90deg, transparent, ${cardColor}60, transparent)` }} />

      {/* Subtle glow */}
      <div className="absolute -top-20 -right-20 w-40 h-40 rounded-full opacity-[0.07]"
        style={{ background: `radial-gradient(circle, ${cardColor}, transparent)` }} />

      {/* Actions */}
      <div className="absolute top-4 right-4 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
        <button
          onClick={(e) => { e.stopPropagation(); onEdit(account); }}
          className="w-7 h-7 rounded-lg bg-white/10 backdrop-blur flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/20 transition-all text-xs"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
            <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
          </svg>
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(account); }}
          className="w-7 h-7 rounded-lg bg-white/10 backdrop-blur flex items-center justify-center text-gray-400 hover:text-red-400 hover:bg-red-500/20 transition-all text-xs"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="3 6 5 6 21 6" />
            <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
          </svg>
        </button>
      </div>

      <div className="p-6">
        {/* Card type badge + icon */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl"
              style={{ backgroundColor: `${cardColor}15` }}>
              {account.icon}
            </div>
            <div>
              <p className="text-white font-semibold text-sm">{account.name}</p>
              <p className="text-gray-500 text-xs">{t(accountTypeLabelKeys[account.account_type])}</p>
            </div>
          </div>
          {account.institution && (
            <span className="text-gray-600 text-xs font-medium">{account.institution}</span>
          )}
        </div>

        {/* Card number */}
        {account.account_number_last4 && (
          <div className="flex items-center gap-4 mb-4">
            <div className="flex gap-1.5">
              {[0,1,2].map(g => (
                <div key={g} className="flex gap-0.5">
                  {[0,1,2,3].map(d => (
                    <div key={d} className="w-1.5 h-1.5 rounded-full bg-gray-600" />
                  ))}
                </div>
              ))}
            </div>
            <span className="text-gray-400 text-sm font-mono tracking-wider">{account.account_number_last4}</span>
          </div>
        )}

        {/* Balance */}
        <div className="mb-2">
          <p className="text-gray-500 text-xs mb-1">{t('accounts.currentBalance')}</p>
          <p className={`text-2xl font-bold ${isNegativeBalance ? 'text-red-400' : 'text-white'}`}>
            {formatCurrency(account.balance, account.currency)}
          </p>
        </div>

        {/* Credit card utilization */}
        {isCreditCard && account.credit_limit && (
          <div className="mt-4 pt-3 border-t border-white/[0.06]">
            <div className="flex justify-between text-xs mb-2">
              <span className="text-gray-500">{t('accounts.creditUsed')}</span>
              <span className="text-gray-400">
                {formatCurrency(account.credit_limit - account.balance, account.currency)} / {formatCurrency(account.credit_limit, account.currency)}
              </span>
            </div>
            <div className="w-full bg-white/[0.06] rounded-full h-1.5">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${Math.min(((account.credit_limit - account.balance) / account.credit_limit) * 100, 100)}%`,
                  background: `linear-gradient(90deg, ${cardColor}, ${cardColor}80)`,
                }}
              />
            </div>
          </div>
        )}

        {account.exclude_from_total && (
          <div className="mt-3 inline-flex items-center gap-1 px-2 py-1 bg-yellow-500/10 border border-yellow-500/20 text-yellow-400/80 text-[10px] rounded-lg font-medium">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
            </svg>
            {t('accounts.excludedFromTotal')}
          </div>
        )}
      </div>
    </div>
  );
};
