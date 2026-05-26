import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/sections/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        surface: "var(--surface)",
        muted: "var(--muted)",
        accent: "var(--accent)",
        border: "var(--border)",
      },
      fontFamily: {
        sans:    ["var(--font-saira)", "system-ui", "sans-serif"],
        mono:    ["var(--font-geist-mono)", "monospace"],
        display: ["var(--font-saira-stencil)", "Impact", "sans-serif"],
        script:  ["var(--font-cormorant)", "Georgia", "serif"],
        cinzel:    ["var(--font-cinzel)", "Georgia", "serif"],
        fraunces:  ["var(--font-fraunces)", "Georgia", "serif"],
        handwritten: ["var(--font-just-another-hand)", "cursive"],
      },
      screens: {
        "3xl": "1920px",
      },
    },
  },
  plugins: [],
};

export default config;
