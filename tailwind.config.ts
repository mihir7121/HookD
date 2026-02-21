import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: "#08080a",
        bg2: "#101015",
        bg3: "#18181f",
        border: "#252530",
        accent: "#c8ff00",
        accent2: "#ff4060",
        accent3: "#9b59ff",
        textdim: "#55555f",
        textmid: "#999",
      },
      fontFamily: {
        display: ["var(--font-display)"],
        mono: ["var(--font-mono)"],
        body: ["var(--font-body)"],
      },
    },
  },
  plugins: [],
};

export default config;
