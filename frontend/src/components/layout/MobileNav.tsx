import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

interface MobileNavProps {
  onAddTransaction: () => void;
}

const tabs = [
  {
    id: 'dashboard',
    path: '/dashboard',
    labelKey: 'sidebar.dashboard',
    icon: (c: string) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="7" rx="1.5" />
        <rect x="14" y="3" width="7" height="7" rx="1.5" />
        <rect x="3" y="14" width="7" height="7" rx="1.5" />
        <rect x="14" y="14" width="7" height="7" rx="1.5" />
      </svg>
    ),
  },
  {
    id: 'accounts',
    path: '/accounts',
    labelKey: 'sidebar.wallet',
    icon: (c: string) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="5" width="20" height="14" rx="2" />
        <path d="M16 12a1 1 0 100-2 1 1 0 000 2z" fill={c} />
      </svg>
    ),
  },
  // Center "+" button is rendered separately
  {
    id: 'analytics',
    path: '/analytics',
    labelKey: 'sidebar.analytics',
    icon: (c: string) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M18 20V10" />
        <path d="M12 20V4" />
        <path d="M6 20v-6" />
      </svg>
    ),
  },
  {
    id: 'settings',
    path: '/settings',
    labelKey: 'settings.title',
    icon: (c: string) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
        <circle cx="12" cy="7" r="4" />
      </svg>
    ),
  },
];

export const MobileNav: React.FC<MobileNavProps> = ({ onAddTransaction }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation();

  const isActive = (path: string) => location.pathname === path || location.pathname.startsWith(path + '/');

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 md:hidden bg-[#050510]/70 backdrop-blur-2xl border-t border-white/[0.07]"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
    >
      <div className="flex items-end justify-around px-2 h-16">
        {/* Left tabs */}
        {tabs.slice(0, 2).map(tab => {
          const active = isActive(tab.path);
          const color = active ? '#F5C518' : '#6B7280';
          return (
            <button
              key={tab.id}
              onClick={() => navigate(tab.path)}
              className="flex flex-col items-center justify-center gap-0.5 flex-1 py-2 active:scale-95 transition-transform"
            >
              {tab.icon(color)}
              <span className="text-[10px] font-medium" style={{ color }}>{t(tab.labelKey)}</span>
            </button>
          );
        })}

        {/* Center "+" button */}
        <div className="flex flex-col items-center justify-center flex-1 -mt-5">
          <button
            onClick={onAddTransaction}
            className="w-14 h-14 rounded-full flex items-center justify-center shadow-lg active:scale-95 transition-transform"
            style={{
              background: 'linear-gradient(135deg, #F5C518, #D4A810)',
              boxShadow: '0 4px 20px rgba(245,197,24,0.35)',
            }}
          >
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
          </button>
          <span className="text-[10px] font-medium text-[#F5C518] mt-0.5">{t('modal.addTransaction')}</span>
        </div>

        {/* Right tabs */}
        {tabs.slice(2).map(tab => {
          const active = isActive(tab.path);
          const color = active ? '#F5C518' : '#6B7280';
          return (
            <button
              key={tab.id}
              onClick={() => navigate(tab.path)}
              className="flex flex-col items-center justify-center gap-0.5 flex-1 py-2 active:scale-95 transition-transform"
            >
              {tab.icon(color)}
              <span className="text-[10px] font-medium" style={{ color }}>{t(tab.labelKey)}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
