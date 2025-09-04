/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{html,js,svelte,ts}'],
  theme: {
    extend: {
      colors: {
        // KongSwap Background Colors - Dark navy theme
        'kong-bg': {
          primary: 'rgb(9 12 23)',      // #0C0F17
          secondary: 'rgb(26 32 50)',   // #1A2032
          tertiary: 'rgb(24 28 42)',    // #181C2A
        },
        
        // Text Colors
        'kong-text': {
          primary: 'rgb(249 250 251)',    // #F9FAFB
          secondary: 'rgb(176 182 197)',  // #B0B6C5
          disabled: 'rgb(107 114 128)',   // #6B7280
        },
        
        // Brand Colors - The lime green dominance!
        'kong-accent': {
          green: 'rgb(0 214 143)',        // #00D68F - Main lime green
          blue: 'rgb(59 130 246)',        // #3B82F6 - Secondary blue
        },
        
        // Semantic Colors
        'kong-success': {
          DEFAULT: 'rgb(0 214 143)',      // #00D68F
          hover: 'rgb(0 183 122)',        // #00B77A
        },
        'kong-error': {
          DEFAULT: 'rgb(244 63 94)',      // #F43F5E
          hover: 'rgb(225 29 72)',        // #E11D48
        },
        'kong-warning': {
          DEFAULT: 'rgb(245 158 11)',     // #F59E0B
          hover: 'rgb(217 119 6)',        // #D97706
        },
        'kong-info': {
          DEFAULT: 'rgb(59 130 246)',     // #3B82F6
          hover: 'rgb(37 99 235)',        // #2563EB
        },
        
        // UI Elements
        'kong-border': {
          DEFAULT: 'rgb(28 32 46)',       // #1C202E
          light: 'rgb(35 39 53)',         // #232735
        },
      },
      
      fontFamily: {
        'exo': ['Exo 2', 'Space Grotesk', 'system-ui', 'sans-serif'],
        'space': ['Space Grotesk', 'system-ui', 'sans-serif'],
        'pixel': ['"Press Start 2P"', 'monospace'],
        'mono': ['"Roboto Mono"', '"Fira Code"', 'Courier', 'monospace'],
      },
      
      borderRadius: {
        'kong-panel': '0.75rem',    // 12px - main panel radius
        'kong-button': '90rem',     // nearly full rounded for buttons
      },
      
      animation: {
        'glow': 'glow 2s ease-in-out infinite',
        'shine': 'shine 2s infinite linear',
        'shimmer': 'shimmer 2s infinite',
        'spin-slow': 'spin 2s linear infinite',
      },
      
      keyframes: {
        glow: {
          '0%': { 
            filter: 'drop-shadow(0 0 2px rgb(0 214 143 / 0.5)) brightness(0.95)',
            opacity: '0.8',
            transform: 'scale(0.98)',
          },
          '50%': { 
            filter: 'drop-shadow(0 0 5px rgb(0 214 143 / 0.9)) brightness(1.1)',
            opacity: '1',
            transform: 'scale(1.02)',
          },
          '100%': { 
            filter: 'drop-shadow(0 0 2px rgb(0 214 143 / 0.5)) brightness(0.95)',
            opacity: '0.8',
            transform: 'scale(0.98)',
          },
        },
        shine: {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(50%)' },
        },
        shimmer: {
          '100%': { transform: 'translateX(100%)' },
        },
      },
      
      backgroundImage: {
        'gradient-kong': 'linear-gradient(135deg, rgb(59 130 246) 0%, rgb(0 214 143) 100%)',
        'gradient-button': 'linear-gradient(135deg, rgb(0 214 143) 0%, rgb(0 183 122) 100%)',
        'gradient-error': 'linear-gradient(135deg, rgb(244 63 94) 0%, rgb(225 29 72) 100%)',
        'gradient-page': 'linear-gradient(135deg, #050813 0%, #080b18 25%, #0a0e1b 50%, #080b18 75%, #050813 100%)',
      },
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
    require('@tailwindcss/typography'),
  ],
};