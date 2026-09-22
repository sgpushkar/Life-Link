import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        mono: {
          950: '#000000',
          900: '#09090b',
          850: '#0c0c0e',
          800: '#141417',
          700: '#222226',
          600: '#38383e',
          500: '#52525b',
          400: '#71717a',
          300: '#a1a1aa',
          200: '#d4d4d8',
          100: '#f4f4f5',
          50: '#fafafa',
        },
        lifelink: {
          navy: {
            DEFAULT: '#0c0c0e',
            deep: '#000000',
            surface: '#141417',
            light: '#1f1f23',
          },
          teal: {
            DEFAULT: '#52525b',
            dark: '#27272a',
            light: '#71717a',
            card: 'rgba(255, 255, 255, 0.04)',
          },
          emerald: {
            DEFAULT: '#a1a1aa',
            glow: 'rgba(255, 255, 255, 0.04)',
            light: '#d4d4d8',
          },
          cyan: {
            DEFAULT: '#71717a',
            glow: 'rgba(255, 255, 255, 0.04)',
            accent: '#a1a1aa',
          },
          text: {
            DEFAULT: '#e4e4e7',
            muted: '#a1a1aa',
            dim: '#71717a',
          },
          critical: '#a1a1aa',
          amber: '#71717a',
          safe: '#d4d4d8',
        },
      },
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        display: ['"Plus Jakarta Sans"', 'Inter', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
    },
  },
  plugins: [],
};

export default config;
