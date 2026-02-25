import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../context/AuthContext';


export const Sidebar: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { t, i18n } = useTranslation();

  const navItems = [
    { id: 'dashboard', label: t('sidebar.dashboard'), path: '/dashboard',
      icon: (active: boolean) => (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={active ? '#F5C518' : '#6B7280'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="3" width="7" height="7" rx="1.5" />
          <rect x="14" y="3" width="7" height="7" rx="1.5" />
          <rect x="3" y="14" width="7" height="7" rx="1.5" />
          <rect x="14" y="14" width="7" height="7" rx="1.5" />
        </svg>
      ),
    },
    { id: 'accounts', label: t('sidebar.wallet'), path: '/accounts',
      icon: (active: boolean) => (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={active ? '#F5C518' : '#6B7280'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="2" y="5" width="20" height="14" rx="2" />
          <path d="M16 12a1 1 0 100-2 1 1 0 000 2z" fill={active ? '#F5C518' : '#6B7280'} />
        </svg>
      ),
    },
    { id: 'transactions', label: t('sidebar.transactions'), path: '/transactions',
      icon: (active: boolean) => (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={active ? '#F5C518' : '#6B7280'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M7 17l-4-4 4-4" />
          <path d="M17 7l4 4-4 4" />
          <line x1="3" y1="13" x2="21" y2="13" />
          <line x1="3" y1="11" x2="21" y2="11" />
        </svg>
      ),
    },
    { id: 'analytics', label: t('sidebar.analytics'), path: '/analytics',
      icon: (active: boolean) => (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={active ? '#F5C518' : '#6B7280'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 20V10" />
          <path d="M12 20V4" />
          <path d="M6 20v-6" />
        </svg>
      ),
    },
    // Hidden for now — will come back to Investments later
    // { id: 'investments', label: t('sidebar.investments'), path: '/investments',
    //   icon: (active: boolean) => (
    //     <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={active ? '#F5C518' : '#6B7280'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    //       <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
    //       <polyline points="16 7 22 7 22 13" />
    //     </svg>
    //   ),
    // },
    { id: 'jars', label: t('sidebar.jars'), path: '/jars',
      icon: (active: boolean) => (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={active ? '#F5C518' : '#6B7280'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M8 2h8" />
          <path d="M9 2v2.5a.5.5 0 01-.5.5h-2a1 1 0 00-1 1v14a2 2 0 002 2h9a2 2 0 002-2V6a1 1 0 00-1-1h-2a.5.5 0 01-.5-.5V2" />
          <path d="M7 12h10" />
        </svg>
      ),
    },
    { id: 'debts', label: t('sidebar.debts'), path: '/debts',
      icon: (active: boolean) => (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={active ? '#F5C518' : '#6B7280'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M17 21v-2a4 4 0 00-3-3.87" />
          <path d="M9 21v-2a4 4 0 013-3.87" />
          <circle cx="12" cy="7" r="4" />
        </svg>
      ),
    },
  ];

  const handleLogout = () => {
    logout();
    navigate('/welcome');
  };

  const toggleLang = () => {
    const next = i18n.language === 'ru' ? 'en' : 'ru';
    i18n.changeLanguage(next);
    localStorage.setItem('lang', next);
  };

  const firstName = user?.name?.split(' ')[0] || 'User';
  const initials = (user?.name || 'U').split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);

  return (
    <aside className="w-[72px] hover:w-64 group/sidebar glass-subtle border-r border-white/[0.05] flex flex-col flex-shrink-0 transition-all duration-300 overflow-hidden">
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 h-16 flex-shrink-0">
        <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 relative"
          style={{ background: 'linear-gradient(135deg, #F5C518 0%, #D4A810 100%)' }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" />
          </svg>
        </div>
        <span className="text-white font-bold text-lg whitespace-nowrap opacity-0 group-hover/sidebar:opacity-100 transition-opacity duration-200">FinPulse</span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 mt-4 px-3 space-y-1">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path || location.pathname.startsWith(item.path + '/');
          return (
            <button
              key={item.id}
              onClick={() => navigate(item.path)}
              className={`w-full flex items-center gap-3 pl-[14px] pr-3 py-3 rounded-xl transition-all relative ${
                isActive
                  ? 'bg-[#F5C518]/10'
                  : 'hover:bg-white/[0.04]'
              }`}
            >
              {/* Active indicator bar */}
              {isActive && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full bg-[#F5C518]" />
              )}
              <div className="flex-shrink-0">{item.icon(isActive)}</div>
              <span className={`text-sm font-medium whitespace-nowrap opacity-0 group-hover/sidebar:opacity-100 transition-opacity duration-200 ${
                isActive ? 'text-[#F5C518]' : 'text-gray-400'
              }`}>
                {item.label}
              </span>
            </button>
          );
        })}
      </nav>

      {/* Bottom section */}
      <div className="px-3 pb-4 space-y-1">
        {/* Language toggle */}
        <button
          onClick={toggleLang}
          className="w-full flex items-center gap-3 pl-[14px] pr-3 py-3 rounded-xl hover:bg-white/[0.04] transition-all"
        >
          <div className="w-5 h-5 flex items-center justify-center flex-shrink-0">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#6B7280" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <line x1="2" y1="12" x2="22" y2="12" />
              <path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z" />
            </svg>
          </div>
          <span className="text-sm text-gray-400 font-medium whitespace-nowrap opacity-0 group-hover/sidebar:opacity-100 transition-opacity duration-200">
            {i18n.language === 'ru' ? 'English' : 'Русский'}
          </span>
        </button>

        {/* Logout */}
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 pl-[14px] pr-3 py-3 rounded-xl hover:bg-red-500/10 transition-all group/logout"
        >
          <div className="flex-shrink-0">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#6B7280" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="group-hover/logout:stroke-red-400 transition-colors">
              <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
          </div>
          <span className="text-sm text-gray-400 font-medium whitespace-nowrap opacity-0 group-hover/sidebar:opacity-100 transition-opacity duration-200 group-hover/logout:text-red-400 transition-colors">
            {t('sidebar.signOut')}
          </span>
        </button>

        {/* User avatar — links to Settings */}
        <div className="border-t border-white/[0.07] pt-3 mt-2">
          <button
            onClick={() => navigate('/settings')}
            className={`w-full flex items-center gap-3 pl-[10px] pr-3 py-2 rounded-xl transition-all ${
              location.pathname === '/settings' ? 'bg-[#F5C518]/10' : 'hover:bg-white/[0.04]'
            }`}
          >
            <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-black flex-shrink-0"
              style={{ background: 'linear-gradient(135deg, #F5C518, #FFD93D)' }}>
              {initials}
            </div>
            <div className="opacity-0 group-hover/sidebar:opacity-100 transition-opacity duration-200 min-w-0 text-left">
              <p className="text-white text-sm font-medium truncate">{firstName}</p>
              <p className="text-gray-500 text-xs truncate">{user?.email || ''}</p>
            </div>
          </button>
        </div>
      </div>
    </aside>
  );
};
