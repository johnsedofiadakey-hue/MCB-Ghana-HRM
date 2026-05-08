/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        display: ['Syne', 'sans-serif'],
        sans: ['DM Sans', 'sans-serif'],
      },
      colors: {
        surface: { DEFAULT: '#0f172a', 2: '#1e293b', 3: '#273449' },
        primary: { DEFAULT: 'var(--primary)', light: 'var(--primary-light)', dark: 'var(--primary-dark)' },
        accent: { DEFAULT: 'var(--accent)', warm: '#f59e0b' },
        success: '#10b981',
        danger: '#f43f5e',
      },
      boxShadow: {
        'glow': '0 0 20px rgba(99,102,241,0.3)',
        'glow-sm': '0 0 10px rgba(99,102,241,0.2)',
      },
      animation: {
        'fade-up': 'fadeUp 0.35s ease forwards',
        'gradient-x': 'gradientX 3s ease infinite',
      },
      keyframes: {
        fadeUp: {
          from: { opacity: '0', transform: 'translateY(12px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        gradientX: {
          '0%, 100%': { 'background-size': '200% 200%', 'background-position': 'left center' },
          '50%': { 'background-size': '200% 200%', 'background-position': 'right center' },
        },
      },
    },
  },
  plugins: [],
};
