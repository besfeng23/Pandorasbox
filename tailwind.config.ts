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
        body: ['Inter', 'system-ui', 'sans-serif'],
        headline: ['Inter', 'system-ui', 'sans-serif'],
        code: ['"JetBrains Mono"', 'monospace'],
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
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      backgroundImage: {
        'void-gradient': 'linear-gradient(135deg, #02040A 0%, #0A0E27 50%, #02040A 100%)',
        'void-radial': 'radial-gradient(ellipse at center, #0A0E27 0%, #02040A 100%)',
        'neon-glow-cyan': 'linear-gradient(135deg, rgba(0, 229, 255, 0.1) 0%, rgba(0, 229, 255, 0) 100%)',
        'neon-glow-purple': 'linear-gradient(135deg, rgba(98, 0, 234, 0.1) 0%, rgba(98, 0, 234, 0) 100%)',
      },
      boxShadow: {
        // Keep legacy keys but reduce intensity for premium feel
        'neon-cyan': '0 0 0 1px rgba(0, 229, 255, 0.10), 0 0 24px rgba(0, 229, 255, 0.08)',
        'neon-purple': '0 0 0 1px rgba(124, 58, 237, 0.10), 0 0 24px rgba(124, 58, 237, 0.08)',
        'neon-cyan-sm': '0 0 0 1px rgba(0, 229, 255, 0.10)',
        'neon-purple-sm': '0 0 0 1px rgba(124, 58, 237, 0.10)',
        'glass': '0 10px 30px rgba(0, 0, 0, 0.35)',
        'elev-1': '0 1px 0 rgba(255, 255, 255, 0.04), 0 12px 28px rgba(0, 0, 0, 0.42)',
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
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
        'pulse-slow': 'pulse-slow 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'slide-up': 'slide-up 0.3s ease-out',
        'fade-in': 'fade-in 0.3s ease-out',
        'glow-cyan': 'glow-cyan 2s ease-in-out infinite',
        'glow-purple': 'glow-purple 2s ease-in-out infinite',
      },
    },
  },
  plugins: [require('tailwindcss-animate'), require('@tailwindcss/typography')],
} satisfies Config;
