import React from 'react';
import { useNavigate } from 'react-router-dom';
import { HeroSection } from '@/components/ui/hero-section-dark';

export const Onboarding: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-dark-bg flex flex-col">
      <HeroSection
        title="Personal Finance, Simplified"
        subtitle={{
          regular: "Take control of your money with ",
          gradient: "smart tracking & insights.",
        }}
        description="Track expenses, manage budgets, monitor investments, and reach your financial goals — all in one beautiful app."
        ctaText="Get Started"
        ctaHref="/register"
        bottomImage={{
          light: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=1200&q=80",
          dark: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=1200&q=80",
        }}
        gridOptions={{
          angle: 65,
          opacity: 0.4,
          cellSize: 50,
          lightLineColor: "#4a4a4a",
          darkLineColor: "#2a2a2a",
        }}
      />
      <div className="text-center pb-10">
        <p className="text-gray-500 text-sm">
          Already have an account?{' '}
          <button
            onClick={() => navigate('/login')}
            className="text-purple-400 font-semibold hover:text-purple-300 transition-colors"
          >
            Sign in
          </button>
        </p>
      </div>
    </div>
  );
};
