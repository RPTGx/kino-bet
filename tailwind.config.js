/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
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
        background: "#0f0f1a",
        foreground: "#ffffff",
        primary: {
          DEFAULT: "#4ecca3",
          foreground: "#ffffff",
          hover: "#3db390",
        },
        secondary: {
          DEFAULT: "#ff2e63",
          foreground: "#ffffff",
        },
        accent: {
          DEFAULT: "#ffd700",
          foreground: "#000000",
          hover: "#ffed4a",
        },
        muted: {
          DEFAULT: "#1a1a2a",
          foreground: "#ffffff",
        },
        border: "#2a2a3a",
      },
      keyframes: {
        "accordion-down": {
          from: { height: 0 },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: 0 },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
}
