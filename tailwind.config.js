/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      colors: {
        navy: {
          DEFAULT: "#142851",
          light:   "#E9EDF5",
          hover:   "#1a3366",
        },
        brand: {
          DEFAULT: "#F97015",
          light:   "#FFF3EC",
        },
      },
    },
  },
  plugins: [],
}
