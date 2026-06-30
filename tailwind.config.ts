import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    // Include Tremor so Tailwind purges its classes correctly
    "./node_modules/@tremor/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      // ── Humrahi brand tokens (mirrored from assets/site.css :root) ──
      colors: {
        cloud: "#F0EDE6",      // 60 % — dominant background
        red: "#BB1C2A",        // 20 % — primary accent (Sindoor Red)
        crimson: "#7E1A20",    // hover / pressed state of red
        ink: "#2C2827",        // 12 % — primary text
        sand: "#E5D9C2",       // card / section backgrounds
        taupe: "#B8A78D",      // secondary text, borders
        whisper: "#F8F6F1",    // lightest surface
        soft: "#5A4F4A",       // body text on light bg
        "taupe-dark": "#6B5D45", // accessible taupe (WCAG AA on light bg)
      },
      fontFamily: {
        // Self-hosted fonts from the static site's /assets/fonts/
        // In the app we'll load from Google Fonts as a fast interim until
        // we copy the woff2 files across.
        lora: ["Lora", "Georgia", "serif"],
        inter: ["Inter", "system-ui", "sans-serif"],
        sans: ["Inter", "system-ui", "sans-serif"],
        serif: ["Lora", "Georgia", "serif"],
      },
      borderRadius: {
        // Brand uses gentle rounding — match the static site's card radius
        card: "0.75rem",
      },
      boxShadow: {
        card: "0 2px 16px 0 rgba(44,40,39,0.07)",
        "card-hover": "0 6px 28px 0 rgba(44,40,39,0.13)",
      },
      animation: {
        "ring-fill": "ring-fill 1.2s cubic-bezier(.4,0,.2,1) both",
      },
      keyframes: {
        "ring-fill": {
          from: { strokeDashoffset: "1" },
          to: { strokeDashoffset: "var(--ring-offset)" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
