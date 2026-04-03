import type { Config } from "tailwindcss"

const config = {
  darkMode: ["class"],
  content: [
    './pages/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './app/**/*.{ts,tsx}',
    './src/**/*.{ts,tsx}',
  ],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
        // Product School brand colors (matching enterprise-pricing-app)
        'ps-blue': '#3B82F6', // Primary blue
        'ps-blue-50': '#EFF6FF', // Light blue background
        'ps-navy': '#1E3A8A', // Navy blue for hover states
        'ps-navy-50': '#EFF6FF', // Navy light background
        'ps-navy-100': '#DBEAFE', // Navy border
        // Product School color system (legacy vars - keeping for compatibility)
        ps: {
          'bg-primary': 'var(--color-bg-primary)',
          'bg-surface': 'var(--color-bg-surface)',
          'bg-elevated': 'var(--color-bg-elevated)',
          'text-primary': 'var(--color-text-primary)',
          'text-secondary': 'var(--color-text-secondary)',
          'accent': 'var(--color-accent)',
          'accent-hover': 'var(--color-accent-hover)',
          'border': 'var(--color-border)',
          'success': 'var(--color-success)',
          'destructive': 'var(--color-destructive)',
        },
        // Tailwind/shadcn compatibility
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        success: "hsl(var(--success))",
      },
      borderRadius: {
        lg: "var(--radius)", // 12px
        md: "calc(var(--radius) - 4px)", // 8px
        sm: "calc(var(--radius) - 8px)", // 4px
      },
      fontFamily: {
        sans: ['Lato', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
        heading: ['-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Helvetica Neue', 'sans-serif'], // Sofia Pro-like fallback
      },
      fontSize: {
        // Product School typography scale
        'heading-xl': ['48px', { lineHeight: '1.1', fontWeight: '800' }],
        'heading-l': ['32px', { lineHeight: '1.2', fontWeight: '700' }],
        'heading-m': ['24px', { lineHeight: '1.3', fontWeight: '600' }],
        'body': ['16px', { lineHeight: '1.6', fontWeight: '400' }],
        'meta': ['14px', { lineHeight: '1.5', fontWeight: '400' }],
        'label': ['12px', { lineHeight: '1.4', fontWeight: '600', letterSpacing: '0.08em' }],
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
      boxShadow: {
        // Override to disable shadows (except glow)
        'none': 'none',
        'glow-accent': '0 0 20px rgba(123, 47, 255, 0.3)',
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config

export default config
