import type { Config } from "tailwindcss";

export default {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#3A5BA0',
          50: '#E8EDF7',
          100: '#D1DBEF',
          200: '#A3B7DF',
          300: '#7593CF',
          400: '#476FBF',
          500: '#3A5BA0',
          600: '#2E4980',
          700: '#233760',
          800: '#172540',
          900: '#0C1220',
        },
        accent: {
          DEFAULT: '#E89B3C',
          50: '#FDF6ED',
          100: '#FBECD7',
          200: '#F7D9AF',
          300: '#F3C687',
          400: '#EFB35F',
          500: '#E89B3C',
          600: '#D67E1A',
          700: '#A66114',
          800: '#77450E',
          900: '#472908',
        },
      },
    },
  },
  plugins: [],
} satisfies Config;
