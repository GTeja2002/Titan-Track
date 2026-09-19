/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: 'var(--color-primary)',
          hover: 'var(--color-primary-hover)',
          pressed: 'var(--color-primary-pressed)',
          soft: 'var(--color-primary-soft)',
        },
        success: {
          DEFAULT: 'var(--color-success)',
          soft: 'var(--color-success-soft)',
        },
        water: {
          DEFAULT: 'var(--color-water)',
          soft: 'var(--color-water-soft)',
          empty: 'var(--color-water-empty)',
        },
        warning: {
          DEFAULT: 'var(--color-warning)',
          soft: 'var(--color-warning-soft)',
        },
        danger: {
          DEFAULT: 'var(--color-danger)',
          soft: 'var(--color-danger-soft)',
        },
        steps: {
          DEFAULT: 'var(--color-steps)',
          soft: 'var(--color-steps-soft)',
        },
        app: {
          bg: 'var(--color-bg)',
          'bg-secondary': 'var(--color-bg-secondary)',
          'bg-hero': 'var(--color-bg-hero)',
          surface: 'var(--color-surface)',
          'surface-elevated': 'var(--color-surface-elevated)',
          border: 'var(--color-border)',
          'border-strong': 'var(--color-border-strong)',
          'border-subtle': 'var(--color-border-subtle)',
          'text-primary': 'var(--color-text-primary)',
          'text-secondary': 'var(--color-text-secondary)',
          'text-muted': 'var(--color-text-muted)',
          'text-subtle': 'var(--color-text-subtle)',
        }
      },
    },
  },
  plugins: [],
};
