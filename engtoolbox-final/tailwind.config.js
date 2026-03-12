/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        mono: ['JetBrains Mono', 'monospace'],
        display: ['Rajdhani', 'sans-serif'],
        body: ['Inter', 'sans-serif'],
      },
      colors: {
        slate: { 950: '#020617' },
        eng: {
          blue: '#3b82f6',
          cyan: '#06b6d4',
          amber: '#f59e0b',
          green: '#10b981',
          red: '#ef4444',
        }
      }
    }
  },
  plugins: []
}
