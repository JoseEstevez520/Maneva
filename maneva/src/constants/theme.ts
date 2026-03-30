/**
 * Paleta de colores Premium de Maneva.
 * Mantenida sincronizada con tailwind.config.js para usos donde NativeWind no llega (ej: props de color en algunos componentes nativos).
 */

export const Colors = {
  gold: {
    DEFAULT: '#D4AF37',
    light: '#F4E0A0',
    dark: '#A48A27',
  },
  premium: {
    black: '#000000',
    blackSoft: '#121212',
    white: '#FFFFFF',
    whiteSoft: '#FAFAFA',
    gray: {
      DEFAULT: '#737373',
      light: '#E5E5E5',
      dark: '#404040',
    }
  },
  semantic: {
    error: '#EF4444',    // red-500
    success: '#10B981',  // emerald-500
    warning: '#F59E0B',  // amber-500
  }
};
