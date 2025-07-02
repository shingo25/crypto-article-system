import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        chart: {
          "1": "hsl(var(--chart-1))",
          "2": "hsl(var(--chart-2))",
          "3": "hsl(var(--chart-3))",
          "4": "hsl(var(--chart-4))",
          "5": "hsl(var(--chart-5))",
        },
        // Neural Genesis Color System
        neural: {
          void: "hsl(var(--neural-void))",
          surface: "hsl(var(--neural-surface))",
          elevated: "hsl(var(--neural-elevated))",
          cyan: "hsl(var(--neural-cyan))",
          orchid: "hsl(var(--neural-orchid))",
          amber: "hsl(var(--neural-amber))",
          text: {
            primary: "hsl(var(--neural-text-primary))",
            secondary: "hsl(var(--neural-text-secondary))",
            muted: "hsl(var(--neural-text-muted))",
          },
          success: "hsl(var(--neural-success))",
          warning: "hsl(var(--neural-warning))",
          error: "hsl(var(--neural-error))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      // Neural Genesis Animations
      animation: {
        aurora: 'aurora 60s linear infinite',
        'aurora-alt': 'aurora-alt 80s linear infinite',
        'neural-pulse': 'neural-pulse 4s ease-in-out infinite',
        'neural-float': 'neural-float 6s ease-in-out infinite',
      },
      keyframes: {
        aurora: {
          '0%': {
            transform: 'translate(5vw, 5vh) scale(1) rotate(0deg)',
            opacity: '0.2',
          },
          '25%': {
            transform: 'translate(10vw, 15vh) scale(1.2) rotate(90deg)',
            opacity: '0.4',
          },
          '50%': {
            transform: 'translate(-5vw, 10vh) scale(0.8) rotate(180deg)',
            opacity: '0.5',
          },
          '75%': {
            transform: 'translate(-10vw, 5vh) scale(1.1) rotate(270deg)',
            opacity: '0.3',
          },
          '100%': {
            transform: 'translate(5vw, 5vh) scale(1) rotate(360deg)',
            opacity: '0.2',
          },
        },
        'aurora-alt': {
          '0%': {
            transform: 'translate(-10vw, 20vh) scale(0.9) rotate(0deg)',
            opacity: '0.15',
          },
          '30%': {
            transform: 'translate(15vw, 5vh) scale(1.3) rotate(108deg)',
            opacity: '0.35',
          },
          '60%': {
            transform: 'translate(5vw, 25vh) scale(0.7) rotate(216deg)',
            opacity: '0.45',
          },
          '100%': {
            transform: 'translate(-10vw, 20vh) scale(0.9) rotate(360deg)',
            opacity: '0.15',
          },
        },
        'neural-pulse': {
          '0%, 100%': {
            opacity: '0.8',
            transform: 'scale(1)',
          },
          '50%': {
            opacity: '1',
            transform: 'scale(1.05)',
          },
        },
        'neural-float': {
          '0%, 100%': {
            transform: 'translateY(0px)',
          },
          '50%': {
            transform: 'translateY(-10px)',
          },
        },
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;