import type { Config } from 'tailwindcss';

export default {
  darkMode: ['class'],
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        // Design System: Inter primary, SF Pro fallback
        sans: [
          'Inter',
          'SF Pro Text',
          '-apple-system',
          'BlinkMacSystemFont',
          'system-ui',
          'sans-serif',
        ],
        // Design System: SF Mono / JetBrains Mono
        mono: [
          'SF Mono',
          'JetBrains Mono',
          'ui-monospace',
          'monospace',
        ],
      },
      colors: {
        // Materials
        glass: 'rgba(255, 255, 255, 0.04)',

        // System Colors
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        chart: {
          '1': 'hsl(var(--chart-1))',
          '2': 'hsl(var(--chart-2))',
          '3': 'hsl(var(--chart-3))',
          '4': 'hsl(var(--chart-4))',
          '5': 'hsl(var(--chart-5))',
        },
      },
      borderRadius: {
        DEFAULT: '12px',
        lg: '16px', // Prominent cards/modals
        xl: '20px', // Hero surfaces
        '2xl': '24px', // Hero surfaces
        md: '10px', // Buttons
        sm: '8px',
        full: '9999px',
      },
      spacing: {
        // 8pt Grid System
        '0.5': '4px',
        '1': '8px',
        '2': '16px',
        '3': '24px',
        '4': '32px',
        '5': '40px',
        '6': '48px',
      },
      boxShadow: {
        'card-light': '0 1px 2px rgba(0,0,0,0.06), 0 8px 24px rgba(0,0,0,0.08)',
        'card-dark': '0 1px 2px rgba(0,0,0,0.50), 0 8px 24px rgba(0,0,0,0.35)',
        'glass': '0 8px 32px 0 rgba(0, 0, 0, 0.37)',
      },
      fontSize: {
        // Type Scale (size / line-height, weight)
        'large-title': ['34px', { lineHeight: '41px', fontWeight: '600' }],
        'title-1': ['28px', { lineHeight: '34px', fontWeight: '600' }],
        'title-2': ['22px', { lineHeight: '28px', fontWeight: '600' }],
        'title-3': ['20px', { lineHeight: '25px', fontWeight: '600' }],
        'headline': ['17px', { lineHeight: '22px', fontWeight: '600' }],
        'body': ['17px', { lineHeight: '24px', fontWeight: '400' }],
        'callout': ['16px', { lineHeight: '22px', fontWeight: '400' }],
        'subhead': ['15px', { lineHeight: '20px', fontWeight: '400' }],
        'footnote': ['13px', { lineHeight: '18px', fontWeight: '400' }],
        'caption': ['12px', { lineHeight: '16px', fontWeight: '400' }],
      },
      transitionDuration: {
        'tap': '100ms',
        'small': '150ms',
        'panel': '280ms',
        'page': '350ms',
      },
      transitionTimingFunction: {
        'standard': 'cubic-bezier(0.2, 0.0, 0.0, 1.0)',
      },
      keyframes: {
        'accordion-down': {
          from: { height: '0' },
          to: { height: 'var(--radix-accordion-content-height)' },
        },
        'accordion-up': {
          from: { height: 'var(--radix-accordion-content-height)' },
          to: { height: '0' },
        },
        'modal-enter': {
          from: { opacity: '0', transform: 'translateY(12px) scale(0.98)' },
          to: { opacity: '1', transform: 'translateY(0) scale(1)' },
        },
        'fade-in': {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        'slide-up': {
          from: { opacity: '0', transform: 'translateY(10px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s cubic-bezier(0.2, 0.0, 0.0, 1.0)',
        'accordion-up': 'accordion-up 0.2s cubic-bezier(0.2, 0.0, 0.0, 1.0)',
        'modal-enter': 'modal-enter 0.28s cubic-bezier(0.2, 0.0, 0.0, 1.0)',
        'fade-in': 'fade-in 0.15s cubic-bezier(0.2, 0.0, 0.0, 1.0)',
        'slide-up': 'slide-up 0.28s cubic-bezier(0.2, 0.0, 0.0, 1.0)',
      },
    },
  },
  plugins: [
    require('tailwindcss-animate'),
    require('@tailwindcss/typography'),
    // Custom plugin for interactions
    function ({ addUtilities }: any) {
      addUtilities({
        '.press-animation': {
          transition: 'transform 100ms cubic-bezier(0.2, 0.0, 0.0, 1.0), opacity 100ms cubic-bezier(0.2, 0.0, 0.0, 1.0)',
          '&:active': {
            transform: 'scale(0.98)',
            opacity: '0.9',
          },
        },
        '.card-hover': {
          transition: 'transform 150ms cubic-bezier(0.2, 0.0, 0.0, 1.0), box-shadow 150ms cubic-bezier(0.2, 0.0, 0.0, 1.0)',
          '&:hover': {
            transform: 'translateY(-2px)',
          },
        },
        '.focus-ring': {
          '&:focus-visible': {
            outline: '2px solid',
            outlineColor: 'hsl(var(--ring))',
            outlineOffset: '2px',
            boxShadow: '0 0 0 4px hsl(var(--ring) / 0.3)',
          },
        },
        '.glass-surface': {
          '@apply backdrop-blur-xl bg-white/80 border border-white/20': {},
        },
      });
    },
  ],
} satisfies Config;
