// tailwind.config.js
/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        accent: {
          50:  '#eef4ff',
          100: '#dbe8ff',
          200: '#b8d0ff',
          300: '#85aeff',
          400: '#4d83ff',
          500: '#1d5af0',
          600: '#0d3fc7',
          700: '#0a319e',
          800: '#0a2a7e',
          900: '#0c2563',
        },
        slate: {
          850: '#101b33',
          900: '#0a1428',
          950: '#060e1c',
        },
        success: { 50: '#ecfdf5', 500: '#10b981', 600: '#059669', 700: '#047857' },
        warning: { 50: '#fffbeb', 500: '#f59e0b', 600: '#d97706', 700: '#b45309' },
        danger:  { 50: '#fef2f2', 500: '#ef4444', 600: '#dc2626', 700: '#b91c1c' },
      },
      fontFamily: {
        sans:    ['Inter', 'system-ui', 'sans-serif'],
        display: ['"Plus Jakarta Sans"', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        card: '0 1px 3px 0 rgb(0 0 0 / 0.06), 0 1px 2px -1px rgb(0 0 0 / 0.06)',
      },
    },
  },
  plugins: [],
};
