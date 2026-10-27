/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Material You Dynamic Palette
        cortex: {
          primary: 'var(--cortex-primary, #6750A4)',
          'primary-container': 'var(--cortex-primary-container, #EADDFF)',
          'on-primary': 'var(--cortex-on-primary, #FFFFFF)',
          'on-primary-container': 'var(--cortex-on-primary-container, #21005D)',
          surface: 'var(--cortex-surface, #141218)',
          'surface-container': 'var(--cortex-surface-container, #211F26)',
          'surface-container-high': 'var(--cortex-surface-container-high, #2B2930)',
          'surface-bright': 'var(--cortex-surface-bright, #3B383E)',
          'surface-card': 'var(--cortex-surface-card, rgba(33, 31, 38, 0.8))',
          thinking: 'var(--cortex-thinking, #D0BCFF)',
          acting: 'var(--cortex-acting, #4CAF50)',
          reflecting: 'var(--cortex-reflecting, #FFB74D)',
          error: 'var(--cortex-error, #F2B8B5)',
        },
      },
      animation: {
        'pulse-subtle': 'pulseSubtle 2.5s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'fade-in': 'fadeIn 0.25s ease-out forwards',
        'slide-up': 'slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards',
      },
      keyframes: {
        pulseSubtle: {
          '0%, 100%': { opacity: '1', transform: 'scale(1)' },
          '50%': { opacity: '0.82', transform: 'scale(1.02)' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
};
