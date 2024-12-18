import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "#0A0A0A",
        surface: "#1A1A1A",
        primary: {
          DEFAULT: "#FFFFFF",
          muted: "#A0A0A0"
        },
        accent: {
          DEFAULT: "#4F46E5",
          hover: "#4338CA"
        }
      },
      borderRadius: {
        'xl': '1rem',
      }
    },
  },
  plugins: [],
}
export default config
