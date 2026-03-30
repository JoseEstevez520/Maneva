/** @type {import('tailwindcss').Config} */
module.exports = {
  // Le decimos que busque clases de tailwind en app y en src
  content: [
    "./app/**/*.{js,jsx,ts,tsx}",
    "./components/**/*.{js,jsx,ts,tsx}",
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        'gold': '#D4AF37',
        'premium-black': '#000000',
        'premium-white': '#FFFFFF',
        'soft-gray': '#F5F5F5',
      },
      fontFamily: {
        'display': ['Manrope_400Regular', 'sans-serif'],
      },
      boxShadow: {
        'premium': '0 15px 35px -5px rgba(0, 0, 0, 0.15), 0 8px 15px -3px rgba(0, 0, 0, 0.08)',
        'premium-gold': '0 10px 20px -5px rgba(212, 175, 55, 0.4)',
      }
    },
  },
  plugins: [],
}

