import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { AppLayout } from '../components/layout/AppLayout';
import insightsService, { Insight } from '../services/insights.service';
import { containerV, itemV } from '../utils/motion';

const SEVERITY_CONFIG: Record<string, { color: string; bg: string; border: string; label: string }> = {
  alert: { color: '#EF4444', bg: '#EF4444', border: '#EF4444', label: 'notifications.alert' },
  warning: { color: '#F59E0B', bg: '#F59E0B', border: '#F59E0B', label: 'notifications.warning' },
  success: { color: '#00B894', bg: '#00B894', border: '#00B894', label: 'notifications.success' },
  info: { color: '#8B5CF6', bg: '#8B5CF6', border: '#8B5CF6', label: 'notifications.info' },
};

const MATERIAL_ICON_MAP: Record<string, string> = {
  trending_up: 'M16 6l2.29 2.29-4.88 4.88-4-4L2 16.59 3.41 18l6-6 4 4 6.3-6.29L22 12V6z',
  trending_down: 'M16 18l2.29-2.29-4.88-4.88-4 4L2 7.41 3.41 6l6 6 4-4 6.3 6.29L22 12v6z',
  savings: 'M15.5 1h-2v2.17C7.36 3.56 2 7.92 2 13.5 2 19.3 6.7 24 12.5 24S23 19.3 23 13.5c0-2.38-.79-4.57-2.11-6.34L15.5 1zm-3 20C8.36 21 5 17.64 5 13.5c0-3.44 2.52-6.29 5.81-6.87L12 10l5.34-3.54c.93 1.34 1.52 2.93 1.62 4.64L12.5 15l-3-2v4.5c0 1.38 1.12 2.5 2.5 2.5h.5v1z',
  warning: 'M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z',
  account_balance_wallet: 'M21 18v1c0 1.1-.9 2-2 2H5c-1.11 0-2-.9-2-2V5c0-1.1.89-2 2-2h14c1.1 0 2 .9 2 2v1h-9c-1.11 0-2 .9-2 2v8c0 1.1.89 2 2 2h9zm-9-2h10V8H12v8zm4-2.5c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5z',
  pie_chart: 'M11 2v20c-5.07-.5-9-4.79-9-10s3.93-9.5 9-10zm2.03 0v8.99H22c-.47-4.74-4.24-8.52-8.97-8.99zm0 11.01V22c4.74-.47 8.5-4.25 8.97-8.99h-8.97z',
  category: 'M12 2l-5.5 9h11L12 2zm0 3.84L13.93 9h-3.87L12 5.84zM17.5 13c-2.49 0-4.5 2.01-4.5 4.5s2.01 4.5 4.5 4.5 4.5-2.01 4.5-4.5-2.01-4.5-4.5-4.5zm0 7c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5zM3 21.5h8v-8H3v8zm2-6h4v4H5v-4z',
  error: 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z',
  schedule: 'M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z',
  account_balance: 'M4 10v7h3v-7H4zm6 0v7h3v-7h-3zM2 22h19v-3H2v3zm14-12v7h3v-7h-3zm-4.5-9L2 6v2h19V6l-9.5-5z',
  moving: 'M19.71 9.71L22 12V6h-6l2.29 2.29-4.06 4.06-3-3-6.94 6.94 1.42 1.42 5.52-5.52 3 3 5.48-5.48z',
  speed: 'M20.38 8.57l-1.23 1.85a8 8 0 01-.22 7.58H5.07A8 8 0 0115.58 6.85l1.85-1.23A10 10 0 003.35 19a2 2 0 001.72 1h13.85a2 2 0 001.74-1 10 10 0 00-.27-10.44zm-9.79 6.84a2 2 0 002.83 0l5.66-8.49-8.49 5.66a2 2 0 000 2.83z',
  info: 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z',
  wallet: 'M21 18v1c0 1.1-.9 2-2 2H5c-1.11 0-2-.9-2-2V5c0-1.1.89-2 2-2h14c1.1 0 2 .9 2 2v1h-9c-1.11 0-2 .9-2 2v8c0 1.1.89 2 2 2h9zm-9-2h10V8H12v8zm4-2.5c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5z',
};

const InsightIcon: React.FC<{ icon: string; color: string }> = ({ icon, color }) => {
  const path = MATERIAL_ICON_MAP[icon];
  if (!path) {
    return (
      <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${color}15` }}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill={color}>
          <path d={MATERIAL_ICON_MAP.info} />
        </svg>
      </div>
    );
  }
  return (
    <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${color}15` }}>
      <svg width="20" height="20" viewBox="0 0 24 24" fill={color}>
        <path d={path} />
      </svg>
    </div>
  );
};

export const Notifications: React.FC = () => {
  const { t } = useTranslation();
  const [insights, setInsights] = useState<Insight[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [generatedAt, setGeneratedAt] = useState<string | null>(null);

  useEffect(() => { loadInsights(); }, []);

  const loadInsights = async () => {
    setIsLoading(true);
    try {
      const data = await insightsService.getInsights();
      setInsights(data.insights);
      setGeneratedAt(data.generated_at);
    } catch (error) {
      console.error('Failed to load insights:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatTime = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
  };

  return (
    <AppLayout>
      <div className="p-4 sm:p-6 lg:p-8 max-w-3xl mx-auto">
        <motion.div variants={containerV} initial="hidden" animate={isLoading ? 'hidden' : 'show'} className="space-y-5">

          {/* ═══ HERO ═══════════════════════════════════════ */}
          <motion.div variants={itemV}>
            <div className="relative rounded-3xl overflow-hidden bg-[#1A1A1A]/60 backdrop-blur-xl border border-[#2A2A2A]">
              <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#8B5CF6] to-transparent opacity-60" />
              <div className="absolute -top-20 right-10 w-60 h-60 rounded-full opacity-[0.03]"
                style={{ background: 'radial-gradient(circle, #8B5CF6, transparent)' }} />
              <div className="relative z-10 p-4 sm:p-6 lg:p-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-8 h-8 rounded-lg bg-[#8B5CF6]/15 flex items-center justify-center">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="#8B5CF6">
                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
                      </svg>
                    </div>
                    <span className="text-[10px] font-bold uppercase tracking-widest text-[#8B5CF6]">AI Insights</span>
                  </div>
                  <h1 className="text-2xl font-bold text-white">{t('notifications.title')}</h1>
                  <p className="text-sm text-gray-500 mt-1">{t('notifications.subtitle')}</p>
                </div>
                <button
                  onClick={loadInsights}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-sm transition-all active:scale-95 bg-[#8B5CF6]/15 text-[#8B5CF6] border border-[#8B5CF6]/30 hover:bg-[#8B5CF6]/25"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                    <path d="M23 4v6h-6M1 20v-6h6" />
                    <path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15" />
                  </svg>
                  {t('notifications.refresh')}
                </button>
              </div>
              {generatedAt && (
                <div className="relative z-10 px-4 sm:px-6 lg:px-8 pb-4">
                  <p className="text-gray-600 text-xs">{t('notifications.generatedAt', { time: formatTime(generatedAt) })}</p>
                </div>
              )}
            </div>
          </motion.div>

          {/* ═══ INSIGHTS LIST ═══════════════════════════════ */}
          {isLoading ? (
            <div className="flex flex-col items-center py-16">
              <div className="w-10 h-10 border-2 border-[#8B5CF6]/30 border-t-[#8B5CF6] rounded-full animate-spin mb-4" />
              <p className="text-gray-500 text-sm">{t('notifications.loading')}</p>
            </div>
          ) : insights.length === 0 ? (
            <motion.div variants={itemV}
              className="relative bg-[#1A1A1A]/60 backdrop-blur-xl border border-[#2A2A2A] rounded-2xl py-16 text-center overflow-hidden">
              <div className="absolute -top-20 left-1/2 -translate-x-1/2 w-60 h-60 rounded-full opacity-[0.03]"
                style={{ background: 'radial-gradient(circle, #8B5CF6, transparent)' }} />
              <div className="relative z-10">
                <div className="w-16 h-16 rounded-2xl bg-[#8B5CF6]/10 flex items-center justify-center mx-auto mb-4">
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="#8B5CF6">
                    <path d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.89 2 2 2zm6-6v-5c0-3.07-1.64-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.63 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z" />
                  </svg>
                </div>
                <h3 className="text-lg font-bold text-white mb-2">{t('notifications.empty')}</h3>
                <p className="text-gray-500 text-sm max-w-xs mx-auto">{t('notifications.emptyDesc')}</p>
              </div>
            </motion.div>
          ) : (
            <div className="space-y-3">
              {insights.map((insight) => {
                const config = SEVERITY_CONFIG[insight.severity] || SEVERITY_CONFIG.info;
                return (
                  <motion.div key={insight.id} variants={itemV}>
                    <div className="relative bg-[#1A1A1A]/60 backdrop-blur-xl border border-[#2A2A2A] rounded-2xl p-4 sm:p-5 overflow-hidden hover:border-white/[0.08] transition-all">
                      {/* Severity accent */}
                      <div className="absolute top-0 left-0 w-1 h-full rounded-l-2xl" style={{ backgroundColor: config.color }} />

                      <div className="flex gap-3.5 ml-1">
                        <InsightIcon icon={insight.icon} color={config.color} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span
                              className="text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full"
                              style={{ color: config.color, backgroundColor: `${config.bg}15` }}
                            >
                              {t(config.label)}
                            </span>
                            {insight.change_pct !== null && (
                              <span
                                className="text-[10px] font-bold"
                                style={{ color: insight.change_pct >= 0 ? (insight.severity === 'success' ? '#00B894' : '#F59E0B') : '#00B894' }}
                              >
                                {insight.change_pct >= 0 ? '+' : ''}{insight.change_pct}%
                              </span>
                            )}
                          </div>
                          <h3 className="text-white font-semibold text-sm mb-1">{insight.title}</h3>
                          <p className="text-gray-400 text-xs leading-relaxed">{insight.description}</p>
                          {insight.value !== null && (
                            <p className="text-white font-bold text-lg mt-2">
                              ${insight.value.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </motion.div>
      </div>
    </AppLayout>
  );
};
