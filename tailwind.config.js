/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'tern-navy': '#1B3A5C',
        'tern-teal': '#0D9488',
        'tern-ice':  '#F8FAFC',
      },
    },
  },
  plugins: [],
}
