/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./www/**/*.{html,js}",
    "./www/index.html"
  ],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        'sans': ['Inter', 'system-ui', 'sans-serif'],
      },
      colors: {
        notion: {
          bg: '#ffffff',
          'bg-dark': '#191919',
          text: '#37352f',
          'text-dark': '#ffffff',
          gray: '#9b9a97',
          'gray-dark': '#6f6f6f',
          border: '#e9e9e7',
          'border-dark': '#373737',
        }
      },
      animation: {
        'slide-up': 'slideUp 0.3s ease-out',
        'fade-in': 'fadeIn 0.2s ease-out',
      },
      keyframes: {
        slideUp: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        }
      }
    },
  },
  plugins: [],
}
