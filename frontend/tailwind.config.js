/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        dark: {
          bg: '#050510',
          card: 'rgba(255,255,255,0.04)',
          border: 'rgba(255,255,255,0.07)',
          hover: 'rgba(255,255,255,0.06)',
        },
        /* Brand colors */
        brand: {
          purple: '#F5C518',
          'purple-light': '#FFD93D',
          'purple-dark': '#D4A810',
          orange: '#F0932B',
          'orange-light': '#F9CA24',
        },
        semantic: {
          income: '#00B894',
          'income-light': '#00D2A0',
          expense: '#E17055',
          'expense-light': '#FF8066',
          success: '#00B894',
          error: '#E17055',
          warning: '#FDCB6E',
          info: '#F5C518',
        },
        category: {
          orange: '#FF6B35',
          blue: '#4A90E2',
          green: '#27AE60',
          pink: '#E84393',
          teal: '#1DD1A1',
          purple: '#F5C518',
          red: '#E17055',
          yellow: '#FDCB6E',
        },
      },
      fontFamily: {
        sans: ['Poppins', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      borderRadius: {
        'sm': '8px',
        'DEFAULT': '12px',
        'lg': '16px',
        'xl': '20px',
        '2xl': '24px',
        '3xl': '32px',
        'full': '9999px',
      },
      boxShadow: {
        'sm': '0 1px 3px rgba(0,0,0,0.3)',
        'DEFAULT': '0 4px 6px rgba(0,0,0,0.4)',
        'md': '0 4px 6px rgba(0,0,0,0.4)',
        'lg': '0 10px 15px rgba(0,0,0,0.5)',
        'xl': '0 20px 25px rgba(0,0,0,0.6)',
        'glow': '0 0 20px rgba(245,197,24,0.5)',
        'glow-sm': '0 0 10px rgba(245,197,24,0.3)',
        'glow-purple': '0 0 30px rgba(124,58,237,0.15)',
        'glow-blue': '0 0 30px rgba(14,165,233,0.15)',
        'glass': '0 8px 32px rgba(0,0,0,0.3)',
        'glass-lg': '0 16px 48px rgba(0,0,0,0.4)',
        'income': '0 8px 24px rgba(0,184,148,0.35)',
        'expense': '0 8px 24px rgba(225,112,85,0.35)',
        'purple': '0 8px 24px rgba(245,197,24,0.35)',
      },
      keyframes: {
        'slide-up': {
          '0%': { transform: 'translateY(100%)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'fade-in-up': {
          '0%': { opacity: '0', transform: 'translateY(16px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'scale-in': {
          '0%': { opacity: '0', transform: 'scale(0.95)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        'pulse-soft': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.6' },
        },
        'shimmer': {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
      },
      animation: {
        'slide-up': 'slide-up 0.3s cubic-bezier(0.32,0.72,0,1) forwards',
        'fade-in': 'fade-in 0.2s ease-out forwards',
        'fade-in-up': 'fade-in-up 0.3s ease-out forwards',
        'scale-in': 'scale-in 0.2s ease-out forwards',
        'pulse-soft': 'pulse-soft 2s ease-in-out infinite',
        'shimmer': 'shimmer 3s ease-in-out infinite',
      },
    },
  },
  plugins: [],
}
