import React, { useEffect, useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { AppLayout } from '../components/layout/AppLayout';
import { JarConfigModal } from '../components/jars/JarConfigModal';
import jarService, { JarSummary, JarBalance } from '../services/jar.service';
import { useAuth } from '../context/AuthContext';
import { containerV, itemV } from '../utils/motion';
import { useAnimatedNumber } from '../hooks/useAnimatedNumber';

/* Circular ring progress for each jar */
const JarRing: React.FC<{ jar: JarBalance; totalAllocated: number; fmt: (n: number) => string }> = ({ jar, totalAllocated, fmt }) => {
  const { t } = useTranslation();
  const pctFill = totalAllocated > 0 ? Math.min((jar.balance / totalAllocated) * 100, 100) : 0;
  const r = 40;
  const circumference = 2 * Math.PI * r;
  const dashLen = (pctFill / 100) * circumference;

  return (
    <div
      className="relative rounded-2xl overflow-hidden p-5 transition-all duration-300 border border-[#2A2A2A] hover:-translate-y-1 hover:border-[#F5C518]/20 hover:shadow-[0_0_30px_rgba(245,197,24,0.08)] cursor-pointer"
      style={{ background: '#1A1A1A99' }}
    >
      {/* Top accent line */}
      <div className="absolute top-0 left-0 right-0 h-[2px]"
        style={{ background: `linear-gradient(90deg, transparent, ${jar.color}60, transparent)` }} />

      {/* Subtle glow */}
      <div className="absolute -top-12 -right-12 w-28 h-28 rounded-full opacity-[0.05]"
        style={{ background: `radial-gradient(circle, ${jar.color}, transparent)` }} />

      <div className="relative z-10">
        {/* Top row: icon + percentage badge */}
        <div className="flex items-center justify-between mb-4">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl"
            style={{ backgroundColor: `${jar.color}15` }}>
            {jar.icon}
          </div>
          <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full"
            style={{ backgroundColor: `${jar.color}15`, color: jar.color }}>
            {jar.percentage}%
          </span>
        </div>

        {/* Name */}
        <p className="text-gray-400 text-sm mb-4">{jar.name}</p>

        {/* Ring + balance */}
        <div className="flex items-center gap-4">
          <svg viewBox="0 0 100 100" className="w-20 h-20 flex-shrink-0">
            <defs>
              <linearGradient id={`jarGrad-${jar.jar_type}`} x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor={jar.color} stopOpacity="0.6" />
                <stop offset="100%" stopColor={jar.color} />
              </linearGradient>
            </defs>
            {/* Track */}
            <circle cx="50" cy="50" r={r} fill="none" stroke="#1A1A1A" strokeWidth="6" />
            {/* Progress */}
            <circle cx="50" cy="50" r={r} fill="none"
              stroke={`url(#jarGrad-${jar.jar_type})`}
              strokeWidth="6" strokeLinecap="round"
              strokeDasharray={`${dashLen} ${circumference}`}
              transform="rotate(-90 50 50)"
              className="transition-all duration-1000" />
            {/* Center percentage */}
            <text x="50" y="50" textAnchor="middle" dominantBaseline="central"
              className="fill-white font-bold" style={{ fontSize: '14px' }}>
              {Math.round(pctFill)}%
            </text>
          </svg>

          <div className="min-w-0">
            <p className="text-2xl font-bold text-white">{fmt(jar.balance)}</p>
            <p className="text-gray-600 text-xs mt-1">{t('jars.ofTotal', { pct: jar.percentage })}</p>
          </div>
        </div>
      </div>
    </div>
  );
};


export const Jars: React.FC = () => {
  const { user } = useAuth();
  const { t } = useTranslation();
  const currency = user?.default_currency || 'USD';
  const fmt = useMemo(
    () => (n: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(n),
    [currency],
  );

  const [summary, setSummary] = useState<JarSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showConfig, setShowConfig] = useState(false);

  const loadData = async () => {
    try {
      const data = await jarService.getJarSummary();
      setSummary(data);
    } catch (e) {
      console.error('Failed to load jars', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  const handleConfigSaved = () => {
    setShowConfig(false);
    loadData();
  };

  const animTotal = useAnimatedNumber(summary?.total_allocated ?? 0);

  return (
    <AppLayout>
      <div className="p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto">
        <motion.div variants={containerV} initial="hidden" animate={isLoading ? 'hidden' : 'show'} className="space-y-6">

          {/* ═══ HERO HEADER ═══════════════════════════════════ */}
          <motion.div variants={itemV}>
            <div className="relative rounded-3xl overflow-hidden bg-[#1A1A1A]/60 backdrop-blur-xl border border-[#2A2A2A]">
              {/* Gold accent line */}
              <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#F5C518] to-transparent opacity-60" />
              {/* Radial glow */}
              <div className="absolute -top-20 right-10 w-60 h-60 rounded-full opacity-[0.03]"
                style={{ background: 'radial-gradient(circle, #F5C518, transparent)' }} />
              <div className="relative z-10 p-4 sm:p-6 lg:p-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0">
                <div>
                  <h1 className="text-2xl font-bold text-white">{t('jars.title')}</h1>
                  <p className="text-sm text-gray-500 mt-1">{t('jars.subtitle')}</p>
                </div>
                <button
                  onClick={() => setShowConfig(true)}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all border border-[#2A2A2A] bg-white/[0.04] text-gray-400 hover:text-white hover:border-[#F5C518]/30"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="3" />
                    <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" />
                  </svg>
                  {t('jars.configureJars')}
                </button>
              </div>
            </div>
          </motion.div>

          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {[0,1,2,3,4,5].map(i => (
                <div key={i} className="bg-[#1A1A1A]/60 backdrop-blur-xl border border-[#2A2A2A] rounded-2xl p-5 animate-pulse">
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-10 h-10 rounded-xl bg-white/[0.06]" />
                    <div className="w-12 h-5 rounded-full bg-white/[0.04]" />
                  </div>
                  <div className="h-3 w-20 bg-white/[0.04] rounded mb-4" />
                  <div className="flex items-center gap-4">
                    <div className="w-20 h-20 rounded-full border-[6px] border-[#1A1A1A]" />
                    <div>
                      <div className="h-6 w-24 bg-white/[0.06] rounded mb-2" />
                      <div className="h-2 w-16 bg-white/[0.04] rounded" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : !summary ? (
            <motion.div variants={itemV}
              className="relative bg-[#1A1A1A]/60 backdrop-blur-xl border border-[#2A2A2A] rounded-2xl py-20 text-center overflow-hidden">
              <div className="absolute -top-20 left-1/2 -translate-x-1/2 w-60 h-60 rounded-full opacity-[0.03]"
                style={{ background: 'radial-gradient(circle, #F5C518, transparent)' }} />
              <div className="relative z-10">
                <div className="w-16 h-16 rounded-2xl bg-[#F5C518]/10 flex items-center justify-center mx-auto mb-4 text-3xl">
                  🏺
                </div>
                <p className="text-gray-400 text-sm">{t('jars.noAllocations')}</p>
              </div>
            </motion.div>
          ) : (
            <>
              {/* ═══ TOTAL ALLOCATED HERO ══════════════════════════ */}
              <motion.div variants={itemV}>
                <div className="relative rounded-2xl overflow-hidden bg-[#1A1A1A]/60 backdrop-blur-xl border border-[#2A2A2A] p-6">
                  <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#F5C518] to-transparent opacity-40" />
                  <div className="absolute -top-20 right-10 w-48 h-48 rounded-full opacity-[0.03]"
                    style={{ background: 'radial-gradient(circle, #F5C518, transparent)' }} />
                  <div className="relative z-10 flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#F5C518" strokeWidth="2" strokeLinecap="round">
                          <path d="M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" />
                        </svg>
                        <p className="text-gray-500 text-sm font-medium">{t('jars.totalAllocated')}</p>
                      </div>
                      <p className="text-3xl font-bold text-white">{fmt(animTotal)}</p>
                    </div>
                    <div className="flex items-center gap-1">
                      {summary.jars.slice(0, 6).map((jar) => (
                        <div key={jar.jar_type} className="w-2 h-8 rounded-full opacity-60"
                          style={{ backgroundColor: jar.color, height: `${Math.max(12, (jar.balance / Math.max(summary.total_allocated, 1)) * 80)}px` }} />
                      ))}
                    </div>
                  </div>
                </div>
              </motion.div>

              {/* ═══ 6 JAR CARDS WITH RINGS ═══════════════════════ */}
              <motion.div variants={itemV}>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                  {summary.jars.map((jar: JarBalance, idx: number) => (
                    <motion.div
                      key={jar.jar_type}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.5, delay: idx * 0.08, ease: [0.25, 0.46, 0.45, 0.94] }}
                    >
                      <JarRing jar={jar} totalAllocated={summary.total_allocated} fmt={fmt} />
                    </motion.div>
                  ))}
                </div>
              </motion.div>

              {/* Empty state hint */}
              {summary.total_allocated === 0 && (
                <motion.div variants={itemV}
                  className="relative bg-[#1A1A1A]/60 backdrop-blur-xl border border-[#2A2A2A] rounded-2xl py-12 text-center overflow-hidden">
                  <div className="absolute -top-20 left-1/2 -translate-x-1/2 w-60 h-60 rounded-full opacity-[0.03]"
                    style={{ background: 'radial-gradient(circle, #F5C518, transparent)' }} />
                  <div className="relative z-10">
                    <div className="w-14 h-14 rounded-2xl bg-[#F5C518]/10 flex items-center justify-center mx-auto mb-3 text-2xl">🏺</div>
                    <p className="text-gray-400 text-sm">{t('jars.noAllocations')}</p>
                    <p className="text-gray-600 text-xs mt-1">{t('jars.noAllocationsDesc')}</p>
                  </div>
                </motion.div>
              )}
            </>
          )}
        </motion.div>
      </div>

      {showConfig && (
        <JarConfigModal
          onClose={() => setShowConfig(false)}
          onSaved={handleConfigSaved}
        />
      )}
    </AppLayout>
  );
};
