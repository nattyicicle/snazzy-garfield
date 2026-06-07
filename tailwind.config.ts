import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./hooks/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      colors: {
        ink: "#101113",
        panel: "#191b1f",
        rail: "#25282e",
        amberline: "#f2b84b",
        mintline: "#58d6a5"
      }
    }
  },
  plugins: []
};

export default config;
