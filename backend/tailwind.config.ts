import type {Config} from 'tailwindcss';

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
        // Design System: Inter primary, SF Pro fallback, system stack
        sans: [
          'Inter',
          'system-ui',
          '-apple-system',
          'BlinkMacSystemFont',
          '"Segoe UI"',
          'Roboto',
          'Helvetica',
          'Arial',
          'sans-serif',
        ],
        body: [
          'Inter',
          'system-ui',
          '-apple-system',
          'BlinkMacSystemFont',
          '"Segoe UI"',
          'Roboto',
          'Helvetica',
          'Arial',
          'sans-serif',
        ],
        headline: [
          'Inter',
          'system-ui',
          '-apple-system',
          'BlinkMacSystemFont',
          '"Segoe UI"',
          'Roboto',
          'Helvetica',
          'Arial',
          'sans-serif',
        ],
        // Design System: JetBrains Mono primary, SF Mono fallback stack
        mono: [
          '"JetBrains Mono"',
          'ui-monospace',
          '"SF Mono"',
          'Menlo',
          'Monaco',
          'Consolas',
          '"Liberation Mono"',
          '"Courier New"',
          'monospace',
        ],
        code: [
          '"JetBrains Mono"',
          'ui-monospace',
          '"SF Mono"',
          'Menlo',
          'Monaco',
          'Consolas',
          '"Liberation Mono"',
          '"Courier New"',
          'monospace',
        ],
      },
      colors: {
        // Digital Void Theme
        // Elite palette (dark-first)
        void: '#0B0C0F',
        glass: 'rgba(255, 255, 255, 0.04)',
        'brand-cyan': '#00E5FF',
        'brand-violet': '#7C3AED',
        'void-blue': '#0C1026',
        'void-dark': '#07080C',
        
        // Existing shadcn colors (kept for compatibility)
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
        surface: 'hsl(var(--card))'
      },
      borderRadius: {
        // Design System: 12px default, 16px prominent, 20-24px hero
        DEFAULT: '12px', // Default card radius
        lg: '16px', // Prominent cards/modals
        xl: '20px', // Hero surfaces
        '2xl': '24px', // Hero surfaces (alternative)
        md: '10px', // Buttons (Apple-ish)
        sm: '8px',
        full: '9999px',
      },
      spacing: {
        // Design System: 8pt system with 4pt micro spacing
        '0.5': '4px', // Micro spacing (icon-label gaps, tight padding)
        '1': '8px',
        '2': '16px',
        '3': '24px',
        '4': '32px',
        '5': '40px',
        '6': '48px',
      },
      backgroundImage: {
        'void-gradient': 'linear-gradient(135deg, #02040A 0%, #0A0E27 50%, #02040A 100%)',
        'void-radial': 'radial-gradient(ellipse at center, #0A0E27 0%, #02040A 100%)',
        'neon-glow-cyan': 'linear-gradient(135deg, rgba(0, 229, 255, 0.1) 0%, rgba(0, 229, 255, 0) 100%)',
        'neon-glow-purple': 'linear-gradient(135deg, rgba(98, 0, 234, 0.1) 0%, rgba(98, 0, 234, 0) 100%)',
      },
      boxShadow: {
        // Design System: Light card shadow
        'card-light': '0 1px 2px rgba(0,0,0,0.06), 0 8px 24px rgba(0,0,0,0.08)',
        // Design System: Dark card shadow
        'card-dark': '0 1px 2px rgba(0,0,0,0.50), 0 8px 24px rgba(0,0,0,0.35)',
        // Legacy neon shadows (keep for compatibility)
        'neon-cyan': '0 0 16px rgba(0, 229, 255, 0.15), 0 0 32px rgba(0, 229, 255, 0.06)',
        'neon-purple': '0 0 16px rgba(98, 0, 234, 0.15), 0 0 32px rgba(98, 0, 234, 0.06)',
        'neon-cyan-sm': '0 0 8px rgba(0, 229, 255, 0.1)',
        'neon-purple-sm': '0 0 8px rgba(98, 0, 234, 0.1)',
        'glass': '0 8px 32px 0 rgba(0, 0, 0, 0.37)',
      },
      keyframes: {
        'accordion-down': {
          from: {
            height: '0',
          },
          to: {
            height: 'var(--radix-accordion-content-height)',
          },
        },
        'accordion-up': {
          from: {
            height: 'var(--radix-accordion-content-height)',
          },
          to: {
            height: '0',
          },
        },
        'pulse-slow': {
          '0%, 100%': {
            opacity: '1',
          },
          '50%': {
            opacity: '0.6',
          },
        },
        'slide-up': {
          from: {
            opacity: '0',
            transform: 'translateY(10px)',
          },
          to: {
            opacity: '1',
            transform: 'translateY(0)',
          },
        },
        'fade-in': {
          from: {
            opacity: '0',
          },
          to: {
            opacity: '1',
          },
        },
        'glow-cyan': {
          '0%, 100%': {
            boxShadow: '0 0 20px rgba(0, 229, 255, 0.3), 0 0 40px rgba(0, 229, 255, 0.1)',
          },
          '50%': {
            boxShadow: '0 0 30px rgba(0, 229, 255, 0.5), 0 0 60px rgba(0, 229, 255, 0.2)',
          },
        },
        'glow-purple': {
          '0%, 100%': {
            boxShadow: '0 0 20px rgba(98, 0, 234, 0.3), 0 0 40px rgba(98, 0, 234, 0.1)',
          },
          '50%': {
            boxShadow: '0 0 30px rgba(98, 0, 234, 0.5), 0 0 60px rgba(98, 0, 234, 0.2)',
          },
        },
      },
      animation: {
        // Design System: Standard easing cubic-bezier(0.2, 0.0, 0.0, 1.0)
        'accordion-down': 'accordion-down 0.2s cubic-bezier(0.2, 0.0, 0.0, 1.0)',
        'accordion-up': 'accordion-up 0.2s cubic-bezier(0.2, 0.0, 0.0, 1.0)',
        // Design System: Small transitions 120-180ms
        'fade-in': 'fade-in 0.15s cubic-bezier(0.2, 0.0, 0.0, 1.0)',
        // Design System: Panel transitions 240-320ms
        'slide-up': 'slide-up 0.28s cubic-bezier(0.2, 0.0, 0.0, 1.0)',
        // Legacy animations (keep for compatibility)
        'pulse-slow': 'pulse-slow 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'glow-cyan': 'glow-cyan 2s ease-in-out infinite',
        'glow-purple': 'glow-purple 2s ease-in-out infinite',
      },
      transitionTimingFunction: {
        // Design System: Standard easing
        'standard': 'cubic-bezier(0.2, 0.0, 0.0, 1.0)',
      },
      transitionDuration: {
        // Design System timing
        'tap': '100ms', // Tap/press feedback: 80-120ms
        'small': '150ms', // Small transitions: 120-180ms
        'panel': '280ms', // Panel/dialog: 240-320ms
        'page': '350ms', // Page-level: 280-420ms
      },
    },
  },
  plugins: [require('tailwindcss-animate'), require('@tailwindcss/typography')],
} satisfies Config;
