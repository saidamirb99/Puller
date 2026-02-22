import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { AppLayout } from '../components/layout/AppLayout';
import { containerV, itemV } from '../utils/motion';
import accountService from '../services/account.service';
import transactionService, { Transaction, TransactionType } from '../services/transaction.service';
import { currencies, searchCurrencies } from '../data/currencies';

export const Settings: React.FC = () => {
  const { user, logout, updateUser } = useAuth();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const [notifications, setNotifications] = useState(() => {
    return localStorage.getItem('notifications') !== 'false';
  });

  /* ── Real data ─────────────────────────────────────────── */
  const [accountCount, setAccountCount] = useState(0);
  const [transactionCount, setTransactionCount] = useState(0);

  useEffect(() => {
    accountService.getAccounts().then(a => setAccountCount(a.length)).catch(() => {});
    transactionService.getTransactions().then(t => setTransactionCount(t.length)).catch(() => {});
  }, []);

  /* ── Modal states ────────────────────────────────────────── */
  const [showCurrencyModal, setShowCurrencyModal] = useState(false);
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [currencySearch, setCurrencySearch] = useState('');
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [exporting, setExporting] = useState(false);

  /* ── Helpers ────────────────────────────────────────────── */
  const initials = useMemo(
    () => (user?.name || 'U').split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2),
    [user?.name],
  );

  const handleLogout = () => {
    logout();
    navigate('/welcome');
  };

  const toggleLang = () => {
    const next = i18n.language === 'ru' ? 'en' : 'ru';
    i18n.changeLanguage(next);
    localStorage.setItem('lang', next);
  };

  const toggleNotifications = () => {
    const next = !notifications;
    setNotifications(next);
    localStorage.setItem('notifications', String(next));
  };

  const langLabel = i18n.language === 'ru' ? 'Русский' : 'English';

  /* ── Currency selection ──────────────────────────────────── */
  const filteredCurrencies = useMemo(
    () => currencySearch ? searchCurrencies(currencySearch) : currencies.slice(0, 30),
    [currencySearch],
  );

  const handleCurrencySelect = (code: string) => {
    updateUser({ default_currency: code });
    setShowCurrencyModal(false);
    setCurrencySearch('');
  };

  /* ── Edit profile ────────────────────────────────────────── */
  const openEditProfile = () => {
    setEditName(user?.name || '');
    setEditEmail(user?.email || '');
    setShowEditProfile(true);
  };

  const saveProfile = () => {
    if (editName.trim().length < 2) return;
    updateUser({ name: editName.trim() });
    setShowEditProfile(false);
  };

  /* ── Export transactions as CSV ───────────────────────────── */
  const handleExport = useCallback(async () => {
    setExporting(true);
    try {
      const transactions: Transaction[] = await transactionService.getTransactions();
      if (transactions.length === 0) {
        alert(i18n.language === 'ru' ? 'Нет транзакций для экспорта' : 'No transactions to export');
        return;
      }
      const header = 'Date,Type,Amount,Description,Category,Merchant,Notes';
      const rows = transactions.map(tx => {
        const date = new Date(tx.transaction_date).toLocaleDateString();
        const type = tx.transaction_type === TransactionType.INCOME ? 'Income' : 'Expense';
        const desc = `"${(tx.description || '').replace(/"/g, '""')}"`;
        const cat = `"${(tx.category?.name || '').replace(/"/g, '""')}"`;
        const merchant = `"${(tx.merchant || '').replace(/"/g, '""')}"`;
        const notes = `"${(tx.notes || '').replace(/"/g, '""')}"`;
        return `${date},${type},${tx.amount},${desc},${cat},${merchant},${notes}`;
      });
      const csv = [header, ...rows].join('\n');
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `finpulse-transactions-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      alert(i18n.language === 'ru' ? 'Ошибка экспорта' : 'Export failed');
    } finally {
      setExporting(false);
    }
  }, [i18n.language]);

  /* ── Coming soon alert ───────────────────────────────────── */
  const comingSoon = () => {
    alert(i18n.language === 'ru' ? 'Скоро будет доступно!' : 'Coming soon!');
  };

  /* ── Support mailto ──────────────────────────────────────── */
  const openSupport = () => {
    window.open('mailto:support@finpulse.app?subject=FinPulse Support', '_blank');
  };

  return (
    <AppLayout>
      <motion.div
        variants={containerV}
        initial="hidden"
        animate="show"
        className="p-4 sm:p-6 lg:p-8 max-w-2xl mx-auto space-y-4 sm:space-y-6"
      >
        {/* ── Hero Profile Card ──────────────────────────── */}
        <motion.div variants={itemV}>
          <div className="relative rounded-2xl sm:rounded-3xl overflow-hidden glass">
            {/* Accent line */}
            <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#F5C518] to-transparent opacity-80" />
            {/* Glow */}
            <div className="absolute -top-20 -right-10 w-48 h-48 rounded-full opacity-[0.07]"
              style={{ background: 'radial-gradient(circle, #F5C518, transparent)' }} />

            <div className="relative p-4 sm:p-6 lg:p-8 flex items-center gap-3.5 sm:gap-5">
              {/* Avatar */}
              <div
                className="w-12 h-12 sm:w-16 sm:h-16 rounded-xl sm:rounded-2xl flex items-center justify-center text-base sm:text-xl font-bold text-black flex-shrink-0 shadow-lg"
                style={{ background: 'linear-gradient(135deg, #F5C518, #FFD93D)' }}
              >
                {initials}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <h1 className="text-white font-bold text-lg sm:text-xl truncate">{user?.name || 'User'}</h1>
                <p className="text-gray-500 text-xs sm:text-sm truncate mt-0.5">{user?.email || ''}</p>
                <div className="flex items-center gap-2 sm:gap-3 mt-1.5 sm:mt-2">
                  <span className="text-[9px] sm:text-[10px] text-gray-600 uppercase tracking-wider">
                    {accountCount} {t(accountCount === 1 ? 'common.accountSingular' : 'common.accountPlural')}
                  </span>
                  <span className="w-1 h-1 rounded-full bg-gray-700" />
                  <span className="text-[9px] sm:text-[10px] text-gray-600 uppercase tracking-wider">
                    {transactionCount} {t(transactionCount === 1 ? 'transactions.transactionSingular' : 'transactions.transactionPlural')}
                  </span>
                </div>
              </div>

              {/* Edit button */}
              <button
                onClick={openEditProfile}
                className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-white/[0.06] border border-white/[0.07] flex items-center justify-center text-gray-400 hover:text-white hover:border-[#F5C518]/30 transition-all"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="sm:w-4 sm:h-4">
                  <path d="M17 3a2.83 2.83 0 114 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
                </svg>
              </button>
            </div>
          </div>
        </motion.div>

        {/* ── General ────────────────────────────────────── */}
        <motion.div variants={itemV}>
          <p className="text-gray-500 text-[10px] uppercase tracking-wider font-semibold mb-2.5 ml-1">
            {t('settings.general')}
          </p>
          <div className="relative rounded-2xl overflow-hidden glass">
            <div className="divide-y divide-white/[0.06]">
              {/* Currency */}
              <SettingsRow
                icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#F5C518" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><path d="M15 9.35a4 4 0 00-3-1.35c-2.21 0-4 1.34-4 3s1.79 3 4 3a4 4 0 003-1.35" /><path d="M12 5v2M12 17v2" /></svg>}
                iconColor="#F5C518"
                label={t('settings.currency')}
                onClick={() => setShowCurrencyModal(true)}
                rightContent={<span className="text-gray-400 text-sm font-medium">{user?.default_currency || 'USD'}</span>}
                chevron
              />
              {/* Language */}
              <SettingsRow
                icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#60A5FA" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="2" y1="12" x2="22" y2="12" /><path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z" /></svg>}
                iconColor="#60A5FA"
                label={t('settings.language')}
                onClick={toggleLang}
                rightContent={<span className="text-gray-400 text-sm font-medium">{langLabel}</span>}
                chevron
              />
              {/* Notifications */}
              <SettingsRow
                icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#A78BFA" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 01-3.46 0" /></svg>}
                iconColor="#A78BFA"
                label={t('settings.notifications')}
                onClick={() => navigate('/notifications')}
                rightContent={
                  <div className="flex items-center gap-2">
                    <button
                      onClick={(e) => { e.stopPropagation(); toggleNotifications(); }}
                      className={`relative w-10 h-[22px] sm:w-11 sm:h-6 rounded-full transition-colors duration-200 ${notifications ? 'bg-[#F5C518]' : 'bg-white/[0.10]'}`}
                    >
                      <div className={`absolute top-0.5 left-0.5 w-[18px] h-[18px] sm:w-5 sm:h-5 rounded-full bg-white shadow-md transition-transform duration-200 ${notifications ? 'translate-x-[18px] sm:translate-x-5' : ''}`} />
                    </button>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6B7280" strokeWidth="2" strokeLinecap="round"><path d="M9 18l6-6-6-6" /></svg>
                  </div>
                }
              />
            </div>
          </div>
        </motion.div>

        {/* ── Data ───────────────────────────────────────── */}
        <motion.div variants={itemV}>
          <p className="text-gray-500 text-[10px] uppercase tracking-wider font-semibold mb-2.5 ml-1">
            {t('settings.data')}
          </p>
          <div className="relative rounded-2xl overflow-hidden glass">
            <div className="divide-y divide-white/[0.06]">
              <SettingsRow
                icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#FB923C" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /></svg>}
                iconColor="#FB923C"
                label={t('settings.categories')}
                onClick={() => navigate('/analytics')}
                chevron
              />
              <SettingsRow
                icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#4ADE80" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 5c-1.5 0-2.8 1.4-3 2-3.5-1.5-11-.3-11 5 0 1.8 0 3 2 4.5V20h4v-2h3v2h4v-4c1-.5 1.7-1 2-2h2v-4h-2c0-1-.5-1.5-1-2" /><path d="M2 9.5a.5.5 0 110-1 .5.5 0 010 1z" fill="#4ADE80" /></svg>}
                iconColor="#4ADE80"
                label={t('settings.budgets')}
                onClick={() => navigate('/jars')}
                chevron
              />
              <SettingsRow
                icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#22D3EE" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>}
                iconColor="#22D3EE"
                label={exporting ? (i18n.language === 'ru' ? 'Экспорт...' : 'Exporting...') : t('settings.exportData')}
                onClick={handleExport}
                chevron
              />
            </div>
          </div>
        </motion.div>

        {/* ── Family ─────────────────────────────────────── */}
        <motion.div variants={itemV}>
          <p className="text-gray-500 text-[10px] uppercase tracking-wider font-semibold mb-2.5 ml-1">
            {t('settings.family')}
          </p>
          <div className="relative rounded-2xl overflow-hidden glass">
            <SettingsRow
              icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#F472B6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 00-3-3.87" /><path d="M16 3.13a4 4 0 010 7.75" /></svg>}
              iconColor="#F472B6"
              label={t('settings.familySharing')}
              onClick={comingSoon}
              chevron
              rightContent={
                <span className="text-[9px] font-bold uppercase tracking-wider bg-[#F5C518] text-black px-2 py-0.5 rounded-full">
                  {t('settings.new')}
                </span>
              }
            />
          </div>
        </motion.div>

        {/* ── About ──────────────────────────────────────── */}
        <motion.div variants={itemV}>
          <p className="text-gray-500 text-[10px] uppercase tracking-wider font-semibold mb-2.5 ml-1">
            {t('settings.about')}
          </p>
          <div className="relative rounded-2xl overflow-hidden glass">
            <div className="divide-y divide-white/[0.06]">
              <SettingsRow
                icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg>}
                iconColor="#9CA3AF"
                label={t('settings.support')}
                onClick={openSupport}
                chevron
              />
              <SettingsRow
                icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0110 0v4" /></svg>}
                iconColor="#9CA3AF"
                label={t('settings.privacySecurity')}
                onClick={comingSoon}
                chevron
              />
              {/* Logout */}
              <button onClick={handleLogout} className="w-full">
                <SettingsRow
                  icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#F87171" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" /></svg>}
                  iconColor="#F87171"
                  label={t('settings.logOut')}
                  labelColor="text-red-400"
                  hoverBg="hover:bg-red-500/[0.03]"
                />
              </button>
            </div>
          </div>
        </motion.div>

        {/* ── Version Footer ─────────────────────────────── */}
        <motion.p variants={itemV} className="text-center text-gray-700 text-[11px] sm:text-xs pt-2 pb-8 sm:pb-6">
          {t('settings.version')}
        </motion.p>
      </motion.div>

      {/* ════════════════════════════════════════════════════ */}
      {/* ─── Currency Selector Modal                       ─ */}
      {/* ════════════════════════════════════════════════════ */}
      <AnimatePresence>
        {showCurrencyModal && (
          <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
              onClick={() => { setShowCurrencyModal(false); setCurrencySearch(''); }}
            />
            <motion.div
              initial={{ y: 100, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 100, opacity: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="relative w-full max-w-sm bg-[#0c0c18]/80 backdrop-blur-2xl rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden border border-white/[0.05] sm:border-white/[0.07]"
            >
              {/* Drag handle (mobile) */}
              <div className="flex justify-center pt-3 sm:hidden">
                <div className="w-10 h-1 rounded-full bg-white/10" />
              </div>

              <div className="p-5">
                <h2 className="text-white font-bold text-lg mb-4">{t('settings.currency')}</h2>
                <input
                  type="text"
                  value={currencySearch}
                  onChange={e => setCurrencySearch(e.target.value)}
                  placeholder={t('accountForm.searchCurrency')}
                  className="w-full px-4 py-2.5 rounded-xl bg-white/[0.06] border border-white/[0.07] text-white text-sm placeholder-gray-500 outline-none focus:border-[#F5C518]/40 transition-colors mb-3"
                  autoFocus
                />
                <div className="max-h-64 overflow-y-auto space-y-0.5">
                  {filteredCurrencies.map(c => (
                    <button
                      key={c.code}
                      onClick={() => handleCurrencySelect(c.code)}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-colors ${
                        c.code === user?.default_currency
                          ? 'bg-[#F5C518]/10 border border-[#F5C518]/20'
                          : 'hover:bg-white/[0.08]'
                      }`}
                    >
                      <span className="text-lg">{c.flag}</span>
                      <div className="flex-1 min-w-0">
                        <span className="text-white text-sm font-medium">{c.code}</span>
                        <span className="text-gray-500 text-xs ml-2">{c.name}</span>
                      </div>
                      <span className="text-gray-400 text-sm">{c.symbol}</span>
                      {c.code === user?.default_currency && (
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#F5C518" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      )}
                    </button>
                  ))}
                  {filteredCurrencies.length === 0 && (
                    <p className="text-gray-500 text-sm text-center py-6">{t('accountForm.noCurrencies')}</p>
                  )}
                </div>
              </div>

              <div className="px-5 pb-5">
                <button
                  onClick={() => { setShowCurrencyModal(false); setCurrencySearch(''); }}
                  className="w-full py-2.5 rounded-xl bg-white/[0.06] border border-white/[0.07] text-gray-400 text-sm font-medium hover:bg-white/[0.08] transition-colors"
                >
                  {t('modal.cancel')}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ════════════════════════════════════════════════════ */}
      {/* ─── Edit Profile Modal                            ─ */}
      {/* ════════════════════════════════════════════════════ */}
      <AnimatePresence>
        {showEditProfile && (
          <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
              onClick={() => setShowEditProfile(false)}
            />
            <motion.div
              initial={{ y: 100, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 100, opacity: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="relative w-full max-w-sm bg-[#0c0c18]/80 backdrop-blur-2xl rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden border border-white/[0.05] sm:border-white/[0.07]"
            >
              {/* Drag handle (mobile) */}
              <div className="flex justify-center pt-3 sm:hidden">
                <div className="w-10 h-1 rounded-full bg-white/10" />
              </div>

              <div className="p-5 space-y-4">
                <h2 className="text-white font-bold text-lg">{t('settings.editProfile')}</h2>

                <div>
                  <label className="text-gray-400 text-xs font-medium mb-1.5 block">{t('auth.fullName')}</label>
                  <input
                    type="text"
                    value={editName}
                    onChange={e => setEditName(e.target.value)}
                    placeholder={t('auth.namePlaceholder')}
                    className="w-full px-4 py-2.5 rounded-xl bg-white/[0.06] border border-white/[0.07] text-white text-sm placeholder-gray-500 outline-none focus:border-[#F5C518]/40 transition-colors"
                    autoFocus
                  />
                </div>

                <div>
                  <label className="text-gray-400 text-xs font-medium mb-1.5 block">{t('auth.email')}</label>
                  <input
                    type="email"
                    value={editEmail}
                    disabled
                    className="w-full px-4 py-2.5 rounded-xl bg-white/[0.06] border border-white/[0.07] text-gray-500 text-sm cursor-not-allowed"
                  />
                  <p className="text-gray-600 text-[10px] mt-1 ml-1">
                    {i18n.language === 'ru' ? 'Email нельзя изменить' : 'Email cannot be changed'}
                  </p>
                </div>
              </div>

              <div className="flex gap-3 px-5 pb-5">
                <button
                  onClick={() => setShowEditProfile(false)}
                  className="flex-1 py-2.5 rounded-xl bg-white/[0.06] border border-white/[0.07] text-gray-400 text-sm font-medium hover:bg-white/[0.08] transition-colors"
                >
                  {t('modal.cancel')}
                </button>
                <button
                  onClick={saveProfile}
                  disabled={editName.trim().length < 2}
                  className="flex-1 py-2.5 rounded-xl text-black text-sm font-bold transition-all disabled:opacity-40"
                  style={{ background: 'linear-gradient(135deg, #F5C518, #FFD93D)' }}
                >
                  {t('modal.saveChanges')}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </AppLayout>
  );
};

/* ═══════════════════════════════════════════════════════════════════════════ */
/* ─── Reusable settings row                                               ─ */
/* ═══════════════════════════════════════════════════════════════════════════ */
interface SettingsRowProps {
  icon: React.ReactNode;
  iconColor: string;
  label: string;
  labelColor?: string;
  onClick?: () => void;
  rightContent?: React.ReactNode;
  chevron?: boolean;
  hoverBg?: string;
}

const SettingsRow: React.FC<SettingsRowProps> = ({
  icon,
  iconColor,
  label,
  labelColor = 'text-white',
  onClick,
  rightContent,
  chevron = false,
  hoverBg = 'hover:bg-white/[0.06]',
}) => {
  const Wrapper = onClick ? 'button' : 'div';
  return (
    <Wrapper
      onClick={onClick}
      className={`w-full flex items-center gap-3 sm:gap-3.5 px-3.5 py-3 sm:px-4 sm:py-3.5 transition-colors cursor-pointer ${hoverBg} ${onClick ? 'text-left' : ''}`}
    >
      <div
        className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg sm:rounded-xl flex items-center justify-center flex-shrink-0"
        style={{ backgroundColor: `${iconColor}15` }}
      >
        {icon}
      </div>
      <span className={`text-[13px] sm:text-sm font-medium flex-1 ${labelColor}`}>{label}</span>
      {rightContent}
      {chevron && (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#4B5563" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="9 18 15 12 9 6" />
        </svg>
      )}
    </Wrapper>
  );
};
