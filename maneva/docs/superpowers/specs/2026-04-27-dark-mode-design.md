# Dark Mode — Diseño técnico
**Fecha:** 2026-04-27  
**Estado:** Aprobado  
**Alcance:** Sistema completo de dark mode con tokens semánticos para la app Maneva

---

## Decisiones de diseño

- **Control:** Solo manual. El usuario activa/desactiva desde Ajustes. La app ignora la preferencia del OS.
- **Toggle:** Ya existe en `app/(tabs)/settings/index.tsx`, conectado a `useUiStore`. Solo falta que propague el valor a NativeWind.
- **Enfoque:** Tokens semánticos. Los componentes usan nombres de rol (`bg-surface`, `text-foreground`), no colores concretos (`bg-premium-white`). La paleta vive en un único lugar.

---

## Paleta de colores

### Tokens semánticos

| Token Tailwind | Light | Dark | Uso |
|---|---|---|---|
| `background` | `#FAFAFA` | `#0D0D0D` | Fondo de pantalla (SafeAreaView, ScreenLayout) |
| `surface` | `#FFFFFF` | `#1A1A1A` | Cards, modales, inputs |
| `surface-raised` | `#F5F5F5` | `#222222` | Secciones elevadas, tab bar |
| `surface-overlay` | `#F3F4F6` | `#2A2A2A` | Overlays, tooltips, fondos de sección |
| `border` | `#ECECEC` | `#2A2A2A` | Bordes estándar |
| `border-strong` | `#E0E0E0` | `#3A3A3A` | Bordes con más peso visual |
| `foreground` | `#000000` | `#F0F0F0` | Texto principal |
| `foreground-muted` | `#6B7280` | `#8A8A8A` | Texto secundario |
| `foreground-subtle` | `#9CA3AF` | `#606060` | Texto terciario / placeholder |
| `gold` | `#D4AF37` | `#D4AF37` | Acento gold (invariante) |
| `gold-surface` | `#FAF3DF` | `rgba(212,175,55,0.12)` | Fondo tintado gold |
| `input-bg` | `#F3F4F6` | `#1E1E1E` | Fondo de inputs |
| `destructive` | `#EF4444` | `#F87171` | Errores (más brillante en dark para contraste) |

### Colores primitivos (sin cambio)
La capa primitiva de `src/constants/theme.ts` y `tailwind.config.js` no cambia. Los tokens semánticos son una capa adicional encima.

---

## Arquitectura

### Pieza 1 — `tailwind.config.js`

Añadir `darkMode: 'class'` y los tokens semánticos en `theme.extend.colors`:

```js
module.exports = {
  darkMode: 'class',
  // ...
  theme: {
    extend: {
      colors: {
        // Tokens semánticos — nueva capa
        background: 'var(--color-background)',  // O valores directos con dark:
        surface: '#FFFFFF',
        // etc.
        // Los primitivos existentes (gold, premium.*) permanecen intactos
      }
    }
  }
}
```

En NativeWind 4, el enfoque es definir los tokens semánticos como colores estáticos en `tailwind.config.js` y aplicar las variantes `dark:` directamente en los componentes. No se usan CSS variables (no compatibles con React Native). El `darkMode: 'class'` permite que NativeWind active las clases `dark:` cuando el root recibe el colorScheme correcto vía `useColorScheme().setColorScheme`.

### Pieza 2 — `src/constants/theme.ts`

Añadir objeto `DarkColors` paralelo al `Colors` existente, con los valores dark para uso en props de JS (iconos, estilos inline):

```ts
export const DarkColors = {
  gold: { DEFAULT: '#D4AF37', ... },  // igual que Colors
  foreground: '#F0F0F0',
  foreground_muted: '#8A8A8A',
  surface: '#1A1A1A',
  background: '#0D0D0D',
  border: '#2A2A2A',
  // ...
}
```

### Pieza 3 — `src/hooks/useThemeColors.ts` (nuevo)

Hook que devuelve el objeto de colores correcto según el tema activo. Sustituye los imports directos de `Colors` en componentes que necesitan colores en props JS:

```ts
import { useUiStore } from '@/store/uiStore'
import { Colors, DarkColors } from '@/constants/theme'

export function useThemeColors() {
  const colorScheme = useUiStore(s => s.colorScheme)
  return colorScheme === 'dark' ? DarkColors : Colors
}
```

### Pieza 4 — `app/_layout.tsx` (puente store → NativeWind)

Suscribirse al `colorScheme` del store y propagarlo a NativeWind en el root layout:

```ts
import { useColorScheme } from 'nativewind'
import { useUiStore } from '@/store/uiStore'

export default function RootLayout() {
  const { setColorScheme } = useColorScheme()
  const scheme = useUiStore(s => s.colorScheme)

  useEffect(() => {
    setColorScheme(scheme)
  }, [scheme, setColorScheme])

  // ...resto del layout
}
```

### Pieza 5 — Migración de componentes

Reemplazar clases de color concretas por tokens semánticos en todos los componentes y pantallas. Patrón de migración:

```tsx
// Antes
<View className="bg-premium-white border border-premium-divider">
  <Text className="text-premium-black">Título</Text>
  <Text className="text-premium-gray">Subtítulo</Text>

// Después
<View className="bg-surface border border-border">
  <Text className="text-foreground">Título</Text>
  <Text className="text-foreground-muted">Subtítulo</Text>
```

---

## Flujo de datos

```
Usuario activa toggle en Settings
        ↓
useUiStore.setColorScheme('dark')
        ↓
app/_layout.tsx useEffect detecta cambio
        ↓
nativewind.setColorScheme('dark')
        ↓
Todas las clases dark: del árbol de componentes se activan
        ↓ (en paralelo)
useThemeColors() devuelve DarkColors para iconos y props JS
```

---

## Orden de migración (de más a menos visible)

1. **Infraestructura** — `tailwind.config.js`, `theme.ts`, `useThemeColors.ts`, `_layout.tsx`
2. **Componentes UI base** — `ScreenLayout`, `Button`, `Card`, `Input`, `Typography`, `AppHeader`, `BrandHeader`
3. **Componentes de dominio** — `SalonCard`, `AppointmentCard`, `OfferCard`, `CampaignCard`, `Badge`, `RatingStars`
4. **Componentes modales/overlays** — `ConfirmDialog`, `SelectSheet`, `StylistPickerSheet`, `TutorialModal`
5. **Pantallas principales** — `home`, `search`, `bookings`, `inbox`, `profile`
6. **Pantallas secundarias** — `salon/[id]`, `booking/[id]`, `offer/[id]`, `campaign/[id]`, `chat`
7. **Pantallas de settings** — `settings/index`, `general-settings`, `notifications`, `booking-preferences`, `bookings-delegation`, `reference-cuts`
8. **Pantallas de auth/onboarding** — `login`, `register`, `welcome`, `onboarding/*`

---

## Reglas de implementación

1. **Nunca** añadir `dark:` a un componente si hay un token semántico que cubra ese caso. Los `dark:` son solo para excepciones puntuales (ej. un color rgba que no tiene token).
2. **Siempre** usar `useThemeColors()` para props de JS (color de iconos, estilos inline). Nunca `Colors` directamente en componentes.
3. Los colores primitivos (`gold.*`, `premium.*`) permanecen en `tailwind.config.js` y `theme.ts` sin modificación. No se eliminan, los componentes migrados simplemente dejan de usarlos directamente.
4. `ScreenLayout` es el cambio de mayor impacto: al migrar su `bg-premium-white-soft` a `bg-background`, todas las pantallas heredan el fondo correcto automáticamente.
5. Persistir el `colorScheme` seleccionado usando `zustand/middleware` `persist` con `safeStorage` en `uiStore.ts`, para que el tema sobreviva reinicios de la app. El store ya importa `safeStorage` de `@/lib/storage`.

---

## Ficheros nuevos

| Fichero | Descripción |
|---|---|
| `src/hooks/useThemeColors.ts` | Hook que retorna Colors o DarkColors según el tema |

## Ficheros modificados (principales)

| Fichero | Cambio |
|---|---|
| `tailwind.config.js` | `darkMode: 'class'` + tokens semánticos |
| `src/constants/theme.ts` | Añadir `DarkColors` |
| `app/_layout.tsx` | Puente store → NativeWind |
| `src/store/uiStore.ts` | Persistencia con `safeStorage` |
| `src/components/ui/*.tsx` | Migración a tokens semánticos (~8 ficheros) |
| `src/components/**/*.tsx` | Migración a tokens semánticos (~12 ficheros) |
| `app/**/*.tsx` | Migración a tokens semánticos (~25 ficheros) |
