import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { AppLayout } from '../components/layout/AppLayout';
import { AccountCard } from '../components/accounts/AccountCard';
import { AccountForm } from '../components/accounts/AccountForm';
import accountService, { Account, AccountCreate } from '../services/account.service';
import { containerV, itemV } from '../utils/motion';
import { useAnimatedNumber } from '../hooks/useAnimatedNumber';

export const Accounts: React.FC = () => {
  const { user } = useAuth();
  const { t } = useTranslation();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Account | undefined>();

  useEffect(() => { loadAccounts(); }, []);

  const loadAccounts = async () => {
    try {
      setIsLoading(true);
      const data = await accountService.getAccounts();
      setAccounts(data);
    } catch (error) {
      console.error('Failed to load accounts:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateAccount = async (data: AccountCreate) => {
    if (editingAccount) {
      await accountService.updateAccount(editingAccount.id, data);
    } else {
      await accountService.createAccount(data);
    }
    setShowForm(false);
    setEditingAccount(undefined);
    loadAccounts();
  };

  const handleEditAccount = (account: Account) => {
    setEditingAccount(account);
    setShowForm(true);
  };

  const handleDeleteAccount = async (account: Account) => {
    if (window.confirm(t('accounts.deleteConfirm', { name: account.name }))) {
      try {
        await accountService.deleteAccount(account.id);
        loadAccounts();
      } catch (error) {
        console.error('Failed to delete account:', error);
      }
    }
  };

  const totalBalance = accounts
    .filter((acc) => !acc.exclude_from_total)
    .reduce((sum, acc) => sum + acc.balance, 0);

  const animBalance = useAnimatedNumber(totalBalance);

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: user?.default_currency || 'USD' }).format(amount);

  return (
    <AppLayout>
      <motion.div className="p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto"
        variants={containerV} initial="hidden" animate={isLoading ? 'hidden' : 'show'}>

        {/* Hero section */}
        <motion.div variants={itemV}>
          <div className="relative rounded-3xl overflow-hidden mb-8 glass">
            {/* Accent line top */}
            <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#F5C518] to-transparent opacity-80" />

            {/* Watermark glow */}
            <div className="absolute -top-20 right-10 w-60 h-60 rounded-full opacity-[0.06]"
              style={{ background: 'radial-gradient(circle, #F5C518, transparent)' }} />

            <div className="relative z-10 p-4 sm:p-6 lg:p-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#F5C518" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="2" y="5" width="20" height="14" rx="2" />
                    <path d="M2 10h20" />
                  </svg>
                  <p className="text-gray-500 text-sm font-medium">{t('accounts.totalBalance')}</p>
                </div>
                <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white mb-2">{formatCurrency(animBalance)}</h2>
                <p className="text-gray-500 text-sm">
                  {accounts.length === 1
                    ? t('accounts.across', { count: accounts.length })
                    : t('accounts.acrossPlural', { count: accounts.length })}
                </p>
              </div>

              {!showForm && (
                <button
                  onClick={() => { setEditingAccount(undefined); setShowForm(true); }}
                  className="flex items-center gap-2 px-5 py-3 rounded-xl font-semibold text-sm transition-all active:scale-95"
                  style={{ background: 'linear-gradient(135deg, #F5C518, #D4A810)', color: '#000', boxShadow: '0 8px 24px rgba(245,197,24,0.25)' }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                    <line x1="12" y1="5" x2="12" y2="19" />
                    <line x1="5" y1="12" x2="19" y2="12" />
                  </svg>
                  {t('accounts.addAccount')}
                </button>
              )}
            </div>
          </div>
        </motion.div>

        {/* Form */}
        {showForm && (
          <motion.div variants={itemV}>
            <div className="glass rounded-2xl p-6 mb-8 shadow-xl">
              <AccountForm
                account={editingAccount}
                onSubmit={handleCreateAccount}
                onCancel={() => { setShowForm(false); setEditingAccount(undefined); }}
              />
            </div>
          </motion.div>
        )}

        {/* Section title */}
        <motion.div variants={itemV}>
          <div className="flex items-center gap-3 mb-5">
            <div className="w-1 h-5 rounded-full bg-[#F5C518]" />
            <h3 className="text-base font-semibold text-white">{t('accounts.allAccounts')}</h3>
            <span className="text-xs text-gray-600 font-medium bg-white/[0.04] px-2 py-0.5 rounded-full">{accounts.length}</span>
          </div>

          {/* Account cards */}
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {[0,1,2].map(i => (
                <div key={i} className="glass rounded-2xl p-6 animate-pulse">
                  <div className="flex items-center gap-3 mb-8">
                    <div className="w-10 h-10 rounded-xl bg-white/[0.06]" />
                    <div>
                      <div className="h-3 w-20 bg-white/[0.06] rounded mb-2" />
                      <div className="h-2 w-14 bg-white/[0.04] rounded" />
                    </div>
                  </div>
                  <div className="h-3 w-16 bg-white/[0.04] rounded mb-2" />
                  <div className="h-6 w-32 bg-white/[0.06] rounded" />
                </div>
              ))}
            </div>
          ) : accounts.length === 0 ? (
            <div className="text-center py-20 glass rounded-2xl">
              <div className="w-16 h-16 rounded-2xl bg-[#F5C518]/10 flex items-center justify-center mx-auto mb-4">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#F5C518" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="2" y="5" width="20" height="14" rx="2" />
                  <path d="M2 10h20" />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-white mb-2">{t('accounts.empty')}</h3>
              <p className="text-gray-500 text-sm mb-6 max-w-xs mx-auto">{t('accounts.emptyDesc')}</p>
              <button
                onClick={() => { setEditingAccount(undefined); setShowForm(true); }}
                className="px-6 py-3 rounded-xl font-semibold text-sm text-black transition-all active:scale-95"
                style={{ background: 'linear-gradient(135deg, #F5C518, #D4A810)' }}
              >
                {t('accounts.addFirst')}
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {accounts.map((account, idx) => (
                <motion.div
                  key={account.id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: idx * 0.08, duration: 0.4 }}
                >
                  <AccountCard account={account} onEdit={handleEditAccount} onDelete={handleDeleteAccount} />
                </motion.div>
              ))}
            </div>
          )}
        </motion.div>
      </motion.div>
    </AppLayout>
  );
};
