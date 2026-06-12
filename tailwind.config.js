/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50:  "#fff7ed",
          100: "#ffedd5",
          500: "#f97316",
          600: "#ea6910",
          700: "#c2560c",
        },
      },
    },
  },
  plugins: [],
}

