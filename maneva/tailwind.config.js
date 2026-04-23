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
        gold: {
          DEFAULT: '#D4AF37',
          light: '#F4E0A0',
          dark: '#A48A27',
          border: '#E4D39C',      // Gold-tinted border (badge, input ring)
          'border-alt': '#E8D49E', // Alternate gold border
          bg: '#FAF3DF',          // Gold-tinted background
          'bg-soft': '#F9F7F0',   // Subtle gold background (add-button area)
          text: '#8D6C1A',        // Dark gold text
          decor: '#E8DCC0',       // Gold decoration element
          check: '#C4A35A',       // Check icon / selected indicator
        },
        premium: {
          black: '#000000',
          'black-soft': '#121212',
          white: '#FFFFFF',
          'white-soft': '#FAFAFA',
          'white-pale': '#F9FAFB',
          'white-dim': '#F7F7F7',
          gray: {
            DEFAULT: '#6B7280',       // Body / secondary text
            light: '#E5E5E5',         // Light gray (Switch track, empty stars)
            dark: '#404040',          // Dark gray
            secondary: '#9CA3AF',     // Placeholder / muted text
            caption: '#94A3B8',       // Caption-level text
            'caption-alt': '#B2BAC8', // Blue-gray caption
            medium: '#8E8E8E',        // Tab inactive labels
            soft: '#A7A7A7',          // Very faint text
            faint: '#A3A3A3',         // Soft/faint text
            icon: '#737373',          // Form field icons
            'icon-muted': '#C7CBD1',  // Chevron / secondary icons
            pale: '#D1D5DB',          // Empty stars / rating inactive
            track: '#D4D4D4',         // Slider max track
          },
          surface: {
            DEFAULT: '#F5F5F5',  // Main card / surface background
            alt: '#F4F4F4',      // Alt surface (info boxes, time picker)
            soft: '#F3F4F6',     // Input / subtle section background
            section: '#F1F1F1', // Section divider fill
            pale: '#FBFBFB',     // Very pale surface
          },
          divider: {
            DEFAULT: '#ECECEC',  // Standard settings divider
            subtle: '#F0F0F0',   // Subtle card border
            soft: '#E9E9E9',     // Soft border
            faint: '#EAEAEA',    // Faint border
            lighter: '#EFEFEF',  // Lighter border
            medium: '#E0E0E0',   // Sheet handles
            strong: '#E5E7EB',   // Chat / stronger border
            muted: '#DDDDDD',    // Muted border
            'fav-btn': '#E6E6E6', // Favorite button ring
            disabled: '#D0D0D0', // Disabled state border
            switch: '#D9DDE2',   // Switch track (off)
          },
        },
        error: {
          DEFAULT: '#EF4444',
          dark: '#DC2626',
          bg: '#FDECEC',
          campaign: '#F44336',  // Material Red (campaign expired badge)
        },
        success: {
          DEFAULT: '#10B981',
          text: '#16A34A',
          campaign: '#4CAF50', // Material Green (campaign active badge)
        },
        warning: {
          DEFAULT: '#F59E0B',
          text: '#D97706',
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
