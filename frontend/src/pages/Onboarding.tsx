import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

// SVG illustration components matching Stitch design
const Illustration1 = () => (
  <svg viewBox="0 0 280 200" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
    {/* Teal gradient background */}
    <defs>
      <linearGradient id="bg1" x1="0" y1="0" x2="280" y2="200" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#4ECDC4"/>
        <stop offset="100%" stopColor="#2ECC71"/>
      </linearGradient>
      <linearGradient id="coin1" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="#F9CA24"/>
        <stop offset="100%" stopColor="#F0932B"/>
      </linearGradient>
      <linearGradient id="coin2" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="#FFEAA7"/>
        <stop offset="100%" stopColor="#FDCB6E"/>
      </linearGradient>
      <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
        <feDropShadow dx="0" dy="4" stdDeviation="4" floodColor="#00000040"/>
      </filter>
    </defs>
    {/* Background */}
    <rect width="280" height="200" rx="20" fill="url(#bg1)"/>
    {/* Decorative circles */}
    <circle cx="240" cy="30" r="25" fill="white" fillOpacity="0.15"/>
    <circle cx="250" cy="60" r="12" fill="white" fillOpacity="0.1"/>
    <circle cx="30" cy="160" r="18" fill="white" fillOpacity="0.12"/>
    <circle cx="15" cy="140" r="8" fill="white" fillOpacity="0.08"/>
    {/* Gold coin large */}
    <ellipse cx="140" cy="95" rx="42" ry="42" fill="url(#coin1)" filter="url(#shadow)"/>
    <ellipse cx="140" cy="88" rx="36" ry="36" fill="url(#coin2)"/>
    <text x="140" y="94" textAnchor="middle" fontSize="28" fontWeight="bold" fill="#B7791F">$</text>
    {/* Small coins scattered */}
    <ellipse cx="64" cy="75" rx="22" ry="22" fill="url(#coin1)" filter="url(#shadow)" transform="rotate(-15 64 75)"/>
    <ellipse cx="64" cy="70" rx="18" ry="18" fill="url(#coin2)" transform="rotate(-15 64 70)"/>
    <text x="64" y="75" textAnchor="middle" fontSize="14" fontWeight="bold" fill="#B7791F" transform="rotate(-15 64 75)">$</text>
    <ellipse cx="216" cy="110" rx="18" ry="18" fill="url(#coin1)" filter="url(#shadow)" transform="rotate(20 216 110)"/>
    <ellipse cx="216" cy="106" rx="14" ry="14" fill="url(#coin2)" transform="rotate(20 216 106)"/>
    <text x="216" y="112" textAnchor="middle" fontSize="12" fontWeight="bold" fill="#B7791F" transform="rotate(20 216 110)">$</text>
    {/* Card */}
    <rect x="80" y="140" width="120" height="42" rx="10" fill="white" fillOpacity="0.25" filter="url(#shadow)"/>
    <rect x="88" y="150" width="32" height="6" rx="3" fill="white" fillOpacity="0.6"/>
    <rect x="88" y="162" width="50" height="4" rx="2" fill="white" fillOpacity="0.4"/>
    {/* Stars */}
    <text x="195" y="55" fontSize="16" fill="white" fillOpacity="0.7">✦</text>
    <text x="50" y="115" fontSize="10" fill="white" fillOpacity="0.5">✦</text>
    <text x="170" y="38" fontSize="8" fill="white" fillOpacity="0.6">✦</text>
  </svg>
);

const Illustration2 = () => (
  <svg viewBox="0 0 280 200" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
    <defs>
      <linearGradient id="bg2" x1="0" y1="0" x2="280" y2="200" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#F5C518"/>
        <stop offset="100%" stopColor="#FFD93D"/>
      </linearGradient>
      <filter id="sh2" x="-20%" y="-20%" width="140%" height="140%">
        <feDropShadow dx="0" dy="4" stdDeviation="5" floodColor="#00000050"/>
      </filter>
    </defs>
    <rect width="280" height="200" rx="20" fill="url(#bg2)"/>
    <circle cx="245" cy="25" r="30" fill="white" fillOpacity="0.12"/>
    <circle cx="35" cy="170" r="22" fill="white" fillOpacity="0.1"/>
    {/* Phone/card mockup */}
    <rect x="80" y="20" width="120" height="160" rx="16" fill="white" fillOpacity="0.15" filter="url(#sh2)"/>
    <rect x="88" y="32" width="104" height="60" rx="10" fill="#1A1D27"/>
    <text x="96" y="52" fontSize="8" fill="#9CA3AF">Total Balance</text>
    <text x="96" y="72" fontSize="16" fontWeight="bold" fill="white">$4,250.00</text>
    {/* Income row */}
    <rect x="88" y="100" width="104" height="24" rx="8" fill="white" fillOpacity="0.1"/>
    <circle cx="100" cy="112" r="7" fill="#00B894"/>
    <text x="113" y="116" fontSize="8" fill="white">+$1,200</text>
    <text x="165" y="116" fontSize="8" fill="#9CA3AF">Income</text>
    {/* Expense row */}
    <rect x="88" y="130" width="104" height="24" rx="8" fill="white" fillOpacity="0.1"/>
    <circle cx="100" cy="142" r="7" fill="#E17055"/>
    <text x="113" y="146" fontSize="8" fill="white">-$350</text>
    <text x="158" y="146" fontSize="8" fill="#9CA3AF">Expenses</text>
    {/* Bar chart bottom */}
    <rect x="88" y="162" width="14" height="10" rx="3" fill="white" fillOpacity="0.5"/>
    <rect x="106" y="155" width="14" height="17" rx="3" fill="#00B894" fillOpacity="0.8"/>
    <rect x="124" y="158" width="14" height="14" rx="3" fill="white" fillOpacity="0.3"/>
    <rect x="142" y="150" width="14" height="22" rx="3" fill="#F5C518" fillOpacity="0.9"/>
    <rect x="160" y="160" width="14" height="12" rx="3" fill="white" fillOpacity="0.3"/>
    <text x="195" y="45" fontSize="16" fill="white" fillOpacity="0.6">✦</text>
    <text x="45" y="90" fontSize="10" fill="white" fillOpacity="0.5">✦</text>
  </svg>
);

const Illustration3 = () => (
  <svg viewBox="0 0 280 200" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
    <defs>
      <linearGradient id="bg3" x1="0" y1="0" x2="280" y2="200" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#00B894"/>
        <stop offset="100%" stopColor="#00CEC9"/>
      </linearGradient>
      <filter id="sh3" x="-20%" y="-20%" width="140%" height="140%">
        <feDropShadow dx="0" dy="4" stdDeviation="5" floodColor="#00000040"/>
      </filter>
    </defs>
    <rect width="280" height="200" rx="20" fill="url(#bg3)"/>
    <circle cx="248" cy="32" r="28" fill="white" fillOpacity="0.12"/>
    <circle cx="32" cy="165" r="20" fill="white" fillOpacity="0.1"/>
    {/* Target / Goal ring */}
    <circle cx="140" cy="95" r="55" stroke="white" strokeOpacity="0.2" strokeWidth="2"/>
    <circle cx="140" cy="95" r="42" stroke="white" strokeOpacity="0.15" strokeWidth="2"/>
    {/* Progress arc — 65% */}
    <circle cx="140" cy="95" r="50" stroke="white" strokeOpacity="0.9" strokeWidth="8"
      strokeLinecap="round"
      strokeDasharray="204 314"
      strokeDashoffset="0"
      transform="rotate(-90 140 95)"/>
    {/* Center */}
    <circle cx="140" cy="95" r="30" fill="white" fillOpacity="0.2" filter="url(#sh3)"/>
    <text x="140" y="90" textAnchor="middle" fontSize="10" fill="white" fontWeight="600">Goal</text>
    <text x="140" y="104" textAnchor="middle" fontSize="14" fill="white" fontWeight="bold">65%</text>
    {/* Rocket */}
    <text x="215" y="60" fontSize="32" filter="url(#sh3)">🚀</text>
    {/* Trophy */}
    <text x="42" y="80" fontSize="24">🏆</text>
    {/* Stars */}
    <text x="190" y="150" fontSize="16" fill="white" fillOpacity="0.7">✦</text>
    <text x="60" y="130" fontSize="10" fill="white" fillOpacity="0.5">✦</text>
    <text x="170" y="35" fontSize="8" fill="white" fillOpacity="0.6">✦</text>
  </svg>
);

export const Onboarding: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [current, setCurrent] = useState(0);
  const [fading, setFading] = useState(false);

  const slides = [
    { id: 0, illustration: <Illustration1 />, title: t('onboarding.slide1Title'), subtitle: t('onboarding.slide1Desc') },
    { id: 1, illustration: <Illustration2 />, title: t('onboarding.slide2Title'), subtitle: t('onboarding.slide2Desc') },
    { id: 2, illustration: <Illustration3 />, title: t('onboarding.slide3Title'), subtitle: t('onboarding.slide3Desc') },
  ];

  // Fix stale-closure: use functional updater so interval never captures stale state
  const advance = useCallback(() => {
    setFading(true);
    setTimeout(() => {
      setCurrent((prev) => (prev + 1) % slides.length);
      setFading(false);
    }, 250);
  }, []);

  useEffect(() => {
    const id = setInterval(advance, 4000);
    return () => clearInterval(id);
  }, [advance]);

  const goTo = (index: number) => {
    if (index === current) return;
    setFading(true);
    setTimeout(() => {
      setCurrent(index);
      setFading(false);
    }, 200);
  };

  const slide = slides[current];

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 relative overflow-hidden">
      {/* Ambient background glows */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-brand-purple/8 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-0 translate-x-1/3 translate-y-1/3 w-64 h-64 bg-teal-500/5 rounded-full blur-3xl pointer-events-none" />

      {/* Card — matches Stitch design */}
      <div className="w-full max-w-sm bg-white/[0.04] border border-white/[0.07] rounded-3xl overflow-hidden shadow-xl animate-fade-in">

        {/* Illustration */}
        <div
          className="p-5 pb-3 transition-opacity duration-200"
          style={{ opacity: fading ? 0 : 1 }}
        >
          <div className="w-full h-44 rounded-2xl overflow-hidden">
            {slide.illustration}
          </div>
        </div>

        {/* Title + Subtitle */}
        <div
          className="px-7 pt-2 pb-1 text-center transition-opacity duration-200"
          style={{ opacity: fading ? 0 : 1 }}
        >
          <h1 className="text-2xl font-bold text-white mb-1.5 tracking-tight">{slide.title}</h1>
          <p className="text-gray-400 text-sm leading-relaxed">{slide.subtitle}</p>
        </div>

        {/* Pagination dots */}
        <div className="flex justify-center items-center gap-2 py-5">
          {slides.map((_, i) => (
            <button
              key={i}
              onClick={() => goTo(i)}
              className="rounded-full transition-all duration-300"
              style={{
                width: i === current ? 24 : 8,
                height: 8,
                backgroundColor: i === current ? '#F5C518' : 'rgba(255,255,255,0.10)',
              }}
              aria-label={`Go to slide ${i + 1}`}
            />
          ))}
        </div>

        {/* CTA Buttons */}
        <div className="px-6 pb-8 space-y-3">
          <button
            onClick={() => navigate('/register')}
            className="w-full py-4 rounded-2xl font-semibold text-white text-base transition-all duration-150 active:scale-95"
            style={{
              background: '#F5C518',
              color: '#000000',
              boxShadow: '0 8px 24px rgba(245,197,24,0.4)',
            }}
          >
            {t('onboarding.getStarted')}
          </button>
          <p className="text-center text-gray-500 text-sm">
            <button
              onClick={() => navigate('/login')}
              className="text-white font-semibold hover:text-brand-purple transition-colors"
            >
              {t('onboarding.login')}
            </button>
          </p>
        </div>
      </div>

      {/* Footer */}
      <p className="mt-6 text-gray-600 text-xs">
        © 2025 FinPulse Financial Inc. Secure &amp; Encrypted.
      </p>
    </div>
  );
};
