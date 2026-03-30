# Guía de Estilos: Maneva Premium

Este documento define la estética visual (UI/UX) oficial de la aplicación Maneva. Todos los componentes de la aplicación deben ceñirse estrictamente a estas reglas para mantener un look "Premium".

## Paleta de Colores

| Nombre | Valor HEX | Uso principal | Clase Tailwind |
| --- | --- | --- | --- |
| **Premium Black** | `#000000` | Fondos de tarjetas, textos principales, botones secundarios | `bg-premium-black`, `text-premium-black` |
| **Gold** | `#D4AF37` | Botones principales (Call to Action), acentos, iconos destacados | `bg-gold`, `text-gold` |
| **Premium White** | `#FFFFFF` | Fondo principal de la app, textos sobre fondos negros | `bg-premium-white`, `text-premium-white` |
| **Soft Gray** | `#F5F5F5` | Fondos secundarios, líneas separadoras | `bg-soft-gray`, `text-soft-gray` |

## Tipografía

Toda la aplicación usa **Manrope** importada desde Google Fonts.

*   `font-display` mapea a Manrope.
*   **Pesos permitidos:**
    *   `font-medium` (500) - Textos secundarios y descripciones
    *   `font-extrabold` (800) - Títulos, Botones (siempre en mayúsculas)

## Sombras y Bordes (Formas)

La estética de Stitch se caracteriza por ser muy redondeada y tener sombras pronunciadas en las interacciones principales.

*   **Tarjetas y Bloques:** `rounded-3xl`
*   **Botones:** `rounded-2xl` o `rounded-3xl`
*   **Sombras Principales:**
    *   `shadow-premium`: Para tarjetas y modales (`0 15px 35px -5px rgba(0, 0, 0, 0.15), ...`)
    *   `shadow-premium-gold`: Resplandor dorado para el botón principal (`0 10px 20px -5px rgba(212, 175, 55, 0.4)`)

## Reglas de Componentes

### Botones Principales (Primary)
*   **Fondo:** Gold
*   **Texto:** Premium Black, Uppercase, ExtraBold.
*   **Efectos:** `shadow-premium-gold` y `active:scale-95` para el feedback táctil.
*   **Iconos:** Grandes, `material-symbols-outlined` o equivalentes.

### Botones Secundarios
*   **Fondo:** Premium White (Transparente o blanco)
*   **Borde:** 4px sólido de color Premium Black (`border-4 border-premium-black`)
*   **Texto:** Premium Black, Uppercase, ExtraBold.
*   **Efectos:** `shadow-xl` y `active:scale-95`.

### Tarjetas (Cards)
*   Las tarjetas prominentes tienen fondo `premium-black` y texto `premium-white` o `gold`. Borde redondeado a `3xl` (`rounded-3xl`), con relleno amplio (`p-8`).
