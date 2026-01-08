import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: ['class'],
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      // Fontes customizadas
      fontFamily: {
        sans: ['var(--font-inter)', 'system-ui', 'sans-serif'],
        display: ['var(--font-fredoka)', 'var(--font-inter)', 'system-ui', 'sans-serif'],
      },
      // Cores customizadas para o projeto
      colors: {
        // Status colors
        'status-up': '#22c55e',
        'status-down': '#ef4444',
        'status-degraded': '#f59e0b',
        'status-unknown': '#6b7280',
      },
      // Animações customizadas
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
    },
  },
  plugins: [],
}

export default config
