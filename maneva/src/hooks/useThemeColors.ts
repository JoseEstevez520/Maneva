import { useUiStore } from '@/store/uiStore'
import { Colors, DarkColors } from '@/constants/theme'

/**
 * Devuelve el objeto de colores correcto según el tema activo.
 * Usar en componentes que necesitan colores en props JS (iconos, estilos inline).
 * Para clases Tailwind usar dark: prefix directamente en className.
 */
export function useThemeColors() {
  const colorScheme = useUiStore(s => s.colorScheme)
  return colorScheme === 'dark' ? DarkColors : Colors
}
