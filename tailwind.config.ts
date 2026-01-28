import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: ["./pages/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    screens: {
      'xs': '400px',
      'sm': '640px',
      'md': '768px',
      'lg': '1024px',
      'xl': '1280px',
      '2xl': '1536px',
    },
    extend: {
      fontFamily: {
        'heading': ['Roboto', 'Inter', 'sans-serif'],
        'body': ['Roboto', 'Inter', 'sans-serif'],
      },
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        
        /* Semantic surfaces */
        bg: "hsl(var(--bg))",
        "bg-soft": "hsl(var(--bg-soft))",
        surface: "hsl(var(--surface))",
        "surface-alt": "hsl(var(--surface-alt))",
        
        /* Text colors */
        "text-primary": "hsl(var(--text-primary))",
        "text-secondary": "hsl(var(--text-secondary))",
        "text-muted": "hsl(var(--text-muted))",
        
        /* Brand colors */
        brand: {
          DEFAULT: "hsl(var(--brand))",
          600: "hsl(var(--brand-600))",
          500: "hsl(var(--brand-500))",
          400: "hsl(var(--brand-400))",
          100: "hsl(var(--brand-100))",
          50: "hsl(var(--brand-50))",
        },
        
        /* Status colors — мягкие, не агрессивные */
        success: {
          DEFAULT: "hsl(var(--success))",
          600: "hsl(var(--success-600))",
          100: "hsl(var(--success-100))",
          50: "hsl(var(--success-50))",
        },
        warning: {
          DEFAULT: "hsl(var(--warning))",
          600: "hsl(var(--warning-600))",
          100: "hsl(var(--warning-100))",
          50: "hsl(var(--warning-50))",
        },
        danger: {
          DEFAULT: "hsl(var(--danger))",
          600: "hsl(var(--danger-600))",
          100: "hsl(var(--danger-100))",
          50: "hsl(var(--danger-50))",
        },
        info: {
          DEFAULT: "hsl(var(--info))",
          600: "hsl(var(--info-600))",
          100: "hsl(var(--info-100))",
          50: "hsl(var(--info-50))",
        },
        neutral: {
          DEFAULT: "hsl(var(--neutral))",
          500: "hsl(var(--neutral-500))",
          100: "hsl(var(--neutral-100))",
          50: "hsl(var(--neutral-50))",
        },
        
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
          hover: "hsl(var(--primary-hover))",
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
        sidebar: {
          DEFAULT: "hsl(var(--sidebar-background))",
          foreground: "hsl(var(--sidebar-foreground))",
          primary: "hsl(var(--sidebar-primary))",
          "primary-foreground": "hsl(var(--sidebar-primary-foreground))",
          accent: "hsl(var(--sidebar-accent))",
          "accent-foreground": "hsl(var(--sidebar-accent-foreground))",
          border: "hsl(var(--sidebar-border))",
          ring: "hsl(var(--sidebar-ring))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "var(--radius-md)",
        sm: "var(--radius-sm)",
        xl: "var(--radius-lg)",
      },
      boxShadow: {
        'elev-1': 'var(--elev-1)',
        'elev-2': 'var(--elev-2)',
        'elev-3': 'var(--elev-3)',
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0", opacity: "0" },
          to: { height: "var(--radix-accordion-content-height)", opacity: "1" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)", opacity: "1" },
          to: { height: "0", opacity: "0" },
        },
        "fade-in": {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" }
        },
        "fade-out": {
          "0%": { opacity: "1", transform: "translateY(0)" },
          "100%": { opacity: "0", transform: "translateY(8px)" }
        },
        "message-enter": {
          "0%": { opacity: "0", transform: "translateY(12px) scale(0.97)" },
          "100%": { opacity: "1", transform: "translateY(0) scale(1)" }
        },
        "message-send": {
          "0%": { 
            opacity: "0", 
            transform: "translateY(16px) scale(0.95)"
          },
          "100%": { 
            opacity: "1", 
            transform: "translateY(0) scale(1)"
          }
        },
        "scale-in": {
          "0%": { transform: "scale(0.95)", opacity: "0" },
          "100%": { transform: "scale(1)", opacity: "1" }
        },
        "scale-out": {
          "0%": { transform: "scale(1)", opacity: "1" },
          "100%": { transform: "scale(0.95)", opacity: "0" }
        },
        "slide-in-right": {
          "0%": { transform: "translateX(100%)" },
          "100%": { transform: "translateX(0)" }
        },
        "slide-out-right": {
          "0%": { transform: "translateX(0)" },
          "100%": { transform: "translateX(100%)" }
        },
        "look-around": {
          "0%, 100%": { transform: "translate(0, 0)" },
          "15%": { transform: "translate(2px, 0)" },
          "30%": { transform: "translate(2px, 1px)" },
          "45%": { transform: "translate(-1px, 1px)" },
          "60%": { transform: "translate(-1px, 0)" },
          "75%": { transform: "translate(1px, -1px)" },
          "90%": { transform: "translate(0, -1px)" },
        },
        "blink": {
          "0%, 90%, 100%": { transform: "scaleY(1)" },
          "95%": { transform: "scaleY(0.1)" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "fade-in": "fade-in 0.25s ease-out",
        "fade-out": "fade-out 0.2s ease-out",
        "scale-in": "scale-in 0.2s ease-out",
        "scale-out": "scale-out 0.2s ease-out",
        "slide-in-right": "slide-in-right 0.3s ease-out",
        "slide-out-right": "slide-out-right 0.3s ease-out",
        "enter": "fade-in 0.2s ease-out, scale-in 0.2s ease-out",
        "exit": "fade-out 0.2s ease-out, scale-out 0.2s ease-out",
        "message-enter": "message-enter 0.3s cubic-bezier(0.22, 1, 0.36, 1)",
        "message-send": "message-send 0.4s cubic-bezier(0.22, 1, 0.36, 1) forwards",
        "look-around": "look-around 3s ease-in-out infinite",
        "blink": "blink 4s ease-in-out infinite",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;
