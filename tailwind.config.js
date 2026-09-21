/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        waldo: {
          red: "#E11D48",
          blue: "#2563EB",
          light: "#F8FAFC",
          dark: "#0F172A",
          gold: "#F59E0B"
        }
      },
      animation: {
        'pulse-fast': 'pulse 1s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'ping-slow': 'ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite',
        'bounce-short': 'bounce 0.5s ease-in-out 3',
      }
    },
  },
  plugins: [],
};
