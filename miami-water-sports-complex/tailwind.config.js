/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // Paleta acuática — inspirada en el lago y el cable park
        lagoon: {
          50: '#ecfeff',
          100: '#cffafe',
          200: '#a5f3fc',
          300: '#67e8f9',
          400: '#22d3ee',
          500: '#06b6d4',
          600: '#0891b2',
          700: '#0e7490',
          800: '#155e75',
          900: '#164e63',
          950: '#083344',
        },
        deep: {
          50: '#f1f5f9',
          100: '#e2e8f0',
          700: '#1e3a5f',
          800: '#152c47',
          900: '#0d1f33',
          950: '#071523',
        },
        sunset: {
          400: '#fb923c',
          500: '#f97316',
          600: '#ea580c',
        },
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        card: '0 1px 2px 0 rgb(13 31 51 / 0.04), 0 4px 16px -4px rgb(13 31 51 / 0.08)',
        pop: '0 8px 32px -8px rgb(13 31 51 / 0.24)',
      },
      keyframes: {
        'fade-in': { from: { opacity: '0', transform: 'translateY(4px)' }, to: { opacity: '1', transform: 'none' } },
        ripple: { '0%': { transform: 'scale(0.9)', opacity: '0.7' }, '100%': { transform: 'scale(1.6)', opacity: '0' } },
      },
      animation: {
        'fade-in': 'fade-in .25s ease-out both',
        ripple: 'ripple 1.8s ease-out infinite',
      },
    },
  },
  plugins: [],
};
