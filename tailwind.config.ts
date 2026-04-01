import type { Config } from "tailwindcss";

export default {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "#06111f",
        foreground: "#eef4ff",
        card: "rgba(10, 26, 48, 0.78)",
        line: "rgba(166, 192, 255, 0.18)",
        accent: "#7dd3fc",
        accent2: "#a78bfa",
        success: "#34d399",
      },
      boxShadow: {
        glow: "0 0 0 1px rgba(125, 211, 252, 0.12), 0 24px 80px rgba(6, 17, 31, 0.55)",
      },
      backgroundImage: {
        grid: "radial-gradient(circle at 1px 1px, rgba(255,255,255,0.08) 1px, transparent 0)",
      },
    },
  },
  plugins: [],
} satisfies Config;
