import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./app/**/*.{ts,tsx}",
    "./src/**/*.{ts,tsx}",
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
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
          hover: "hsl(var(--primary-hover))",
          muted: "hsl(var(--primary-muted))",
          "muted-foreground": "hsl(var(--primary-muted-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
          muted: "hsl(var(--destructive-muted))",
          "muted-foreground": "hsl(var(--destructive-muted-foreground))",
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
        glass: {
          bg: "hsl(var(--glass-bg))",
          border: "hsl(var(--glass-border))",
          shadow: "hsl(var(--glass-shadow))",
        },
        success: {
          DEFAULT: "hsl(var(--success))",
          foreground: "hsl(var(--success-foreground))",
        },
        warning: {
          DEFAULT: "hsl(var(--warning))",
          foreground: "hsl(var(--warning-foreground))",
          muted: "hsl(var(--warning-muted))",
          "muted-foreground": "hsl(var(--warning-muted-foreground))",
        },
        "live-connected": "hsl(var(--live-connected))",
        "live-connecting": "hsl(var(--live-connecting))",
        "live-disconnected": "hsl(var(--live-disconnected))",
        "live-glow": "hsl(var(--live-glow))",
        sidebar: {
          DEFAULT: "hsl(var(--sidebar))",
          foreground: "hsl(var(--sidebar-foreground))",
          border: "hsl(var(--sidebar-border))",
          accent: "hsl(var(--sidebar-accent))",
          "accent-foreground": "hsl(var(--sidebar-accent-foreground))",
          ring: "hsl(var(--sidebar-ring))",
        },
      },
      backgroundImage: {
        "gradient-primary": "var(--gradient-primary)",
        "gradient-hero": "var(--gradient-hero)",
        "gradient-card": "var(--gradient-card)",
        "gradient-card-subtle": "var(--gradient-card-subtle)",
        "gradient-destructive": "var(--gradient-destructive)",
      },
      backgroundColor: {
        "glass-subtle": "var(--glass-subtle)",
        "glass-intense": "var(--glass-intense)",
        "glass-dark": "var(--glass-dark)",
      },
      boxShadow: {
        soft: "var(--shadow-soft)",
        medium: "var(--shadow-medium)",
        glow: "var(--shadow-glow)",
        "glow-intense": "var(--shadow-glow-intense)",
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
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
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(30px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "fade-in": {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        "scale-in": {
          "0%": { opacity: "0", transform: "scale(0.8)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
        glow: {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.5" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "fade-up": "fade-up 0.6s ease-out",
        "fade-in": "fade-in 0.4s ease-out",
        "scale-in": "scale-in 0.2s ease-out",
        glow: "glow 2s ease-in-out infinite",
      },
      typography: () => ({
        mood: {
          css: {
            "--tw-prose-body": "hsl(var(--on-container-foreground))",
            "--tw-prose-headings": "hsl(var(--on-gradient-foreground))",
            "--tw-prose-bold": "hsl(var(--on-gradient-foreground))",
            "--tw-prose-links": "hsl(var(--on-gradient-foreground))",
            "--tw-prose-code": "hsl(var(--on-gradient-foreground))",
            "--tw-prose-quotes": "hsl(var(--on-container-foreground))",
            "--tw-prose-quote-borders": "hsl(var(--on-container-border))",
            "--tw-prose-captions": "hsl(var(--on-container-muted-foreground))",
            "--tw-prose-th-borders": "hsl(var(--on-container-border))",
            "--tw-prose-td-borders": "hsl(var(--on-container-border))",
            color: "hsl(var(--on-container-foreground))",
            a: {
              color: "hsl(var(--on-gradient-foreground))",
              textDecorationColor: "hsl(var(--on-gradient-border))",
              textUnderlineOffset: "6px",
              fontWeight: "500",
            },
            "a:hover": {
              color: "hsl(var(--on-gradient-foreground))",
              textDecorationColor: "hsl(var(--on-gradient-ring))",
            },
            blockquote: {
              color: "hsl(var(--on-container-foreground))",
              borderLeftColor: "hsl(var(--on-container-border))",
            },
            code: {
              color: "hsl(var(--on-gradient-foreground))",
              fontWeight: "500",
            },
            "pre code": {
              color: "hsl(var(--on-container-foreground))",
            },
          },
        },
      }),
    },
  },
  plugins: [require("tailwindcss-animate"), require("@tailwindcss/typography")],
};

export default config;
