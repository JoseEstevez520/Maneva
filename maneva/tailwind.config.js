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
        'gold': {
          DEFAULT: '#D4AF37',
          light: '#F4E0A0',
          dark: '#A48A27',
        },
        'premium': {
          black: '#000000',
          'black-soft': '#121212',
          white: '#FFFFFF',
          'white-soft': '#FAFAFA',
          gray: {
            DEFAULT: '#737373',
            light: '#E5E5E5',
            dark: '#404040',
          }
        },
      },
      fontFamily: {
        manrope: ['Manrope_400Regular'],
        'manrope-medium': ['Manrope_500Medium'],
        'manrope-semibold': ['Manrope_600SemiBold'],
        'manrope-bold': ['Manrope_700Bold'],
        'manrope-extrabold': ['Manrope_800ExtraBold'],
      },
      boxShadow: {
        'premium-gold': '0 10px 25px -5px rgba(212, 175, 55, 0.4)',
        'premium-black': '0 20px 40px -12px rgba(0, 0, 0, 0.3)',
        'premium-soft': '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
      },
      borderRadius: {
        'premium-sm': '12px',
        'premium-md': '20px',
        'premium-lg': '28px',
        'premium-xl': '36px',
      }
    },
  },
  plugins: [],
}

