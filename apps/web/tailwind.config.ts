import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Irongate City palette — dark industrial theme
        iron: {
          950: '#0d0d10',   // page background
          900: '#14141a',   // sidebar / header background
          800: '#1e1e26',   // card background — noticeably lifted above page
          700: '#2a2a35',   // card borders, dividers
          600: '#3d3d4d',   // muted borders
          500: '#5a5a6e',   // subdued labels
          400: '#7e7e96',   // secondary text — readable on card bg
          300: '#a8a8be',   // body text
          200: '#ccccd8',   // prominent labels
          100: '#eeeef2',   // headings / high emphasis
        },
        // Fascist — blood red + steel black. Dark, forbidding, authoritarian.
        fascist: {
          DEFAULT: '#991b1b',   // blood red
          dark:    '#450a0a',   // near-black red
          light:   '#f87171',   // rose highlight
          glow:    'rgba(153,27,27,0.25)',
        },
        // Communist — bright Soviet red + gold star. Revolutionary energy.
        communist: {
          DEFAULT: '#dc2626',   // Soviet red
          dark:    '#7f1d1d',   // deep red
          light:   '#fbbf24',   // gold star accent
          glow:    'rgba(220,38,38,0.25)',
        },
        // Democrat — navy blue + sky. Institutional, liberal.
        democrat: {
          DEFAULT: '#1d4ed8',   // royal blue
          dark:    '#1e3a8a',   // navy
          light:   '#93c5fd',   // sky highlight
          glow:    'rgba(29,78,216,0.25)',
        },
        gold: {
          DEFAULT: '#d4af37',
          light: '#f1c40f',
          dark: '#9a7d0a',
        },
      },
      fontFamily: {
        mono: ['var(--font-mono)', 'Courier New', 'monospace'],
        sans: ['var(--font-sans)', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};

export default config;
