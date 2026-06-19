// tailwind.config.js
/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // Deep slate — sidebar and dark surfaces
        slate: {
          850: '#172033',
          900: '#0f1729',
          950: '#0a0f1d',
        },
        // Violet accent — primary actions, active states
        accent: {
          50:  '#f3f1ff',
          100: '#e9e5ff',
          200: '#d4ccff',
          300: '#b3a3ff',
          400: '#8b6fff',
          500: '#6d3ffc',
          600: '#5b21db',
          700: '#4a18b5',
          800: '#3d1693',
          900: '#321278',
        },
        success: { 50: '#ecfdf5', 500: '#10b981', 600: '#059669', 700: '#047857' },
        warning: { 50: '#fffbeb', 500: '#f59e0b', 600: '#d97706', 700: '#b45309' },
        danger:  { 50: '#fef2f2', 500: '#ef4444', 600: '#dc2626', 700: '#b91c1c' },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['"Plus Jakarta Sans"', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        card: '0 1px 3px 0 rgb(0 0 0 / 0.06), 0 1px 2px -1px rgb(0 0 0 / 0.06)',
      },
      borderRadius: {
        xl: '0.875rem',
      },
    },
  },
  plugins: [],
};
