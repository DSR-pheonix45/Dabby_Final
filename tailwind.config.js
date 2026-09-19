/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    screens: {
      'xs': '480px',    // Extra small devices
      'sm': '640px',    // Mobile landscape / small tablets
      'md': '768px',    // Tablets
      'lg': '1024px',   // Desktop
      'xl': '1280px',   // Large desktop
      '2xl': '1536px',  // Extra large desktop
    },
    extend: {
      colors: {
        // Core Palette Swatches
        platinum: '#E8EAED',
        palesky: '#BDCCDB',
        pacific: '#66ACB7',
        charcoal: '#373F51',
        onyx: '#121317',

        // Override standard teal to Pacific Blue (#66ACB7) across all components
        teal: {
          50: '#F0F7F8',
          100: '#DDEEEE',
          200: '#BDCCDB',
          300: '#8BC4CC',
          400: '#66ACB7',
          500: '#66ACB7',
          600: '#5298A3',
          700: '#3D7A84',
          800: '#373F51',
          900: '#121317',
          DEFAULT: '#66ACB7',
        },

        // Primary Brand Colors (Pacific Blue #66ACB7 as main accent)
        primary: {
          DEFAULT: '#66ACB7',
          light: '#66ACB7',
          dark: '#66ACB7',
          50: '#F0F7F8',
          100: '#DDEEEE',
          200: '#BDCCDB',
          300: '#94C1C8',
          400: '#66ACB7',
          500: '#4A929E',
          600: '#373F51',
          700: '#2A303F',
          800: '#1E232E',
          900: '#121317',
        },
        brand: {
          DEFAULT: '#66ACB7',
          light: '#66ACB7',
          dark: '#66ACB7',
        },
        sidebar: {
          light: '#E8EAED',
          dark: '#373F51'
        },
        chat: {
          light: '#FFFFFF',
          dark: '#121317'
        },
        message: {
          light: '#E8EAED',
          dark: '#373F51'
        },
        border: {
          light: '#BDCCDB',
          dark: '#373F51'
        },
        text: {
          light: {
            primary: '#373F51',
            secondary: '#66ACB7'
          },
          dark: {
            primary: '#E8EAED',
            secondary: '#BDCCDB'
          },
          settings: {
            light: {
              bg: '#FFFFFF',
              card: '#E8EAED',
              text: '#373F51',
              border: '#BDCCDB'
            },
            dark: {
              bg: '#121317',
              card: '#373F51',
              text: '#E8EAED',
              border: '#BDCCDB'
            }
          }
        }
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
      },
      fontFamily: {
        'inter': ['Inter', 'sans-serif'],
        'dm-sans': ['DM Sans', 'system-ui', 'sans-serif'],
        'dm-mono': ['DM Mono', 'monospace'],
      },
      keyframes: {
        // Landing page animations
        scroll: {
          '0%': { transform: 'translateX(0)' },
          '100%': { transform: 'translateX(-50%)' }
        },
        shine: {
          '0%': { 'background-position': '200% center' },
          '100%': { 'background-position': '-200% center' }
        },
        borderShine: {
          '0%': { 'background-position': '0% 50%' },
          '100%': { 'background-position': '200% 50%' }
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-20px)' }
        },
        // App animations
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' }
        },
        slideInFromBottom: {
          '0%': { transform: 'translateY(0.5rem)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' }
        },
        loading: {
          '0%': { width: '0%' },
          '100%': { width: '100%' }
        }
      },
      animation: {
        // Landing page animations
        scroll: 'scroll var(--scroll-duration) linear infinite',
        shine: 'shine 5s linear infinite',
        borderShine: 'borderShine 3s linear infinite',
        float: 'float 6s ease-in-out infinite',
        // App animations
        'fade-in': 'fadeIn 0.3s ease-in-out',
        'slide-in-from-bottom-2': 'slideInFromBottom 0.5s ease-out',
        'loading': 'loading 2s ease-in-out'
      }
    },
  },
  plugins: [],
}