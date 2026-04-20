import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        navy: {
          950: "#071024",
          900: "#0A1730",
          800: "#10223F"
        }
      },
      boxShadow: {
        glass: "0 10px 30px rgba(0, 0, 0, 0.25)"
      }
    }
  },
  plugins: []
};

export default config;
