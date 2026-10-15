/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        cream: {
          50: '#FDFCF7',
          100: '#FAF7EE',
          200: '#F3EDDC',
          300: '#E8DDC3',
          400: '#D8C5A0',
          500: '#C2A87A',
          600: '#A6895C',
          700: '#846944',
          800: '#644F35',
          900: '#433423',
        },
        brand: {
          50: '#FFF7ED',
          100: '#FFEDD5',
          200: '#FED7AA',
          300: '#FDBA74',
          400: '#FB923C',
          500: '#F97316',
          600: '#EA580C',
          700: '#C2410C',
          800: '#9A3412',
          900: '#7C2D12',
          DEFAULT: '#EA580C',
        },
        surface: {
          DEFAULT: '#FFFFFF',
          subtle: '#FAF9F5',
          card: '#FFFFFF',
          border: '#E8E5DF',
        },
      },
      fontFamily: {
        sans: [
          'Inter',
          '-apple-system',
          'BlinkMacSystemFont',
          'Segoe UI',
          'Roboto',
          'sans-serif',
        ],
        serif: [
          'Playfair Display',
          'Georgia',
          'Cambria',
          'serif',
        ],
      },
      boxShadow: {
        'warm-sm': '0 1px 3px rgba(67, 52, 35, 0.05), 0 1px 2px rgba(67, 52, 35, 0.03)',
        'warm': '0 4px 12px rgba(67, 52, 35, 0.06), 0 1px 2px rgba(67, 52, 35, 0.04)',
        'warm-md': '0 8px 24px rgba(67, 52, 35, 0.08), 0 2px 4px rgba(67, 52, 35, 0.04)',
        'warm-lg': '0 16px 36px rgba(67, 52, 35, 0.10), 0 4px 8px rgba(67, 52, 35, 0.05)',
      },
      borderRadius: {
        'xl': '0.875rem',
        '2xl': '1.125rem',
        '3xl': '1.5rem',
      },
    },
  },
  plugins: [],
};
