/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        'viktoria-blue': '#003366',
        'viktoria-blue-light': '#354992',
        'viktoria-yellow': '#FFD700',
        'viktoria-green': '#00A86B',
        // Dark mode colors
        'viktoria-dark': '#101010',
        'viktoria-dark-light': '#1a1a1a',
        'viktoria-dark-lighter': '#2a2a2a',
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'system-ui', 'sans-serif'],
        'permanent-marker': ['var(--font-permanent-marker)', 'cursive'],
      },
      animation: {
        'fade-in': 'fadeIn 0.6s ease-in-out',
        'slide-up': 'slideUp 0.6s ease-out',
        'slide-in-left': 'slideInLeft 0.6s ease-out',
        'slide-in-right': 'slideInRight 0.6s ease-out',
        'shimmer': 'shimmer 3s ease-in-out infinite',
        'shimmer-slow': 'shimmerSlow 4s ease-in-out infinite',
        'prisma-shift': 'prismaShift 5s ease-in-out infinite',
        'scroll-left': 'scrollLeft 20s linear infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(30px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        slideInLeft: {
          '0%': { transform: 'translateX(-30px)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' },
        },
        slideInRight: {
          '0%': { transform: 'translateX(30px)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' },
        },
        shimmer: {
          '0%': { transform: 'translateX(-100%)', opacity: '0' },
          '50%': { transform: 'translateX(100%)', opacity: '1' },
          '100%': { transform: 'translateX(200%)', opacity: '0' },
        },
        shimmerSlow: {
          '0%': { transform: 'translateX(-100%)', opacity: '0' },
          '30%': { transform: 'translateX(50%)', opacity: '0.3' },
          '70%': { transform: 'translateX(150%)', opacity: '0.3' },
          '100%': { transform: 'translateX(300%)', opacity: '0' },
        },
        prismaShift: {
          '0%': { transform: 'translateX(-100%) rotate(0deg)', opacity: '0' },
          '25%': { transform: 'translateX(-25%) rotate(45deg)', opacity: '0.4' },
          '50%': { transform: 'translateX(50%) rotate(90deg)', opacity: '0.6' },
          '75%': { transform: 'translateX(125%) rotate(135deg)', opacity: '0.4' },
          '100%': { transform: 'translateX(200%) rotate(180deg)', opacity: '0' },
        },
        scrollLeft: {
          '0%': { transform: 'translateX(100%)' },
          '100%': { transform: 'translateX(-100%)' },
        },
      },
    },
  },
  plugins: [
    function({ addUtilities }) {
      addUtilities({
        '.scrollbar-hide': {
          /* IE and Edge */
          '-ms-overflow-style': 'none',
          /* Firefox */
          'scrollbar-width': 'none',
          /* Safari and Chrome */
          '&::-webkit-scrollbar': {
            display: 'none'
          }
        }
      })
    }
  ],
} 