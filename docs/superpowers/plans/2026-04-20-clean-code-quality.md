porq# Clean Code & Quality Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Corregir todas las violaciones de arquitectura y clean code identificadas en la revisión, y actualizar el CLAUDE.md con reglas prácticas de clean code.

**Architecture:** Separación estricta de capas (services → hooks → screens), tipado TypeScript sin `any`, consistencia de patrones en toda la app. Cada corrección es independiente y se commitea por separado.

**Tech Stack:** React Native + Expo 54, Expo Router v6, NativeWind 4.2.3, Supabase JS v2, Zustand, date-fns, lucide-react-native.

---

## Archivos que se tocan

| Acción | Archivo |
|--------|---------|
| Modificar | `CLAUDE.md` |
| Modificar | `maneva/src/services/auth.service.ts` |
| Crear    | `maneva/src/services/media.service.ts` |
| Modificar | `maneva/src/hooks/useMediaUrl.ts` |
| Modificar | `maneva/src/hooks/useAuth.ts` |
| Crear    | `maneva/src/hooks/useLocationAndSalons.ts` |
| Eliminar | `maneva/src/services/useLocationAndSalons.ts` |
| Modificar | `maneva/src/components/ui/icons.tsx` |
| Modificar | `maneva/src/components/ui/TutorialModal.tsx` |
| Modificar | `maneva/src/components/ui/Button.tsx` |
| Modificar | `maneva/app/onboarding/location.tsx` |
| Modificar | `maneva/app/onboarding/preferences.tsx` |
| Modificar | `maneva/app/campaign/[id].tsx` |
| Modificar | `maneva/app/salon/[id].tsx` |
| Modificar | `maneva/app/search.tsx` |
| Modificar | `maneva/app/(tabs)/index.tsx` |

---

## Task 1: Actualizar CLAUDE.md con reglas de clean code

**Files:**
- Modify: `CLAUDE.md`

- [ ] **Step 1: Añadir sección "Clean Code — Reglas adicionales" en CLAUDE.md**

Insertar antes de la sección `## Cómo añadir un módulo nuevo`:

```markdown
## Clean Code — Reglas adicionales

### Tipado estricto
- **Prohibido `any`** — si TypeScript no infiere el tipo, búscalo en `database.types.ts` o en la librería.
- **Prohibido `as unknown as X`** — si hace falta un cast doble, significa que faltan tipos o hay que regenerarlos.
- **No index signatures `[key: string]: any`** — extiende el tipo concreto o usa `Record<string, string>`.

### Separación de capas (obligatoria)
```
Supabase  →  services/  →  hooks/  →  screens / components
```
- Los **servicios** exportan funciones puras async. Sin `useState`, sin `useEffect`.
- Los **hooks** llaman servicios, gestionan `loading/error/data`. Nunca importan `supabase` directamente.
- Las **pantallas** solo renderizan, llaman hooks y navegan. Ninguna lógica de negocio.
- Los **componentes UI** (`src/components/ui/`) no conocen Supabase ni stores de dominio.

### AsyncStorage / Storage
- Usar siempre `safeStorage` de `@/lib/storage`. **Nunca** `AsyncStorage` directamente.

### Fechas
- Siempre `date-fns` + `parseISO`. **Nunca** `.toLocaleString()` nativo.
```typescript
import { format, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'
format(parseISO(isoString), "d 'de' MMMM yyyy", { locale: es })
```

### Iconos
- Todos los iconos se importan desde `@/components/ui/icons`.
- Si un icono no existe ahí, **primero** se añade a ese fichero y luego se usa.
- Nunca importar de `lucide-react-native` directamente en pantallas o componentes.

### Colores
- Usar siempre `Colors.gold.DEFAULT`, `Colors.premium.gray.DEFAULT`, etc.
- `Colors.gold` es un objeto `{ DEFAULT, light, dark }`, no un string. Usar `Colors.gold` donde se espera un string es un bug silencioso.

### Archivos de hooks
- Los hooks viven en `src/hooks/`. Si un fichero empieza por `use`, no puede estar en `src/services/`.

### Manejo de errores en pantallas
```typescript
const { data, loading, error } = useAlgo()
if (loading) return <LoadingSpinner />
if (error) return <ErrorMessage message={error} />
return <ContenidoNormal />
```

### Funcionalidades pendientes (UI stub)
Si una sección de UI existe pero la lógica no está implementada, añadir comentario `// TODO:` prominente **y** deshabilitar visualmente la UI para no engañar al usuario.
```

- [ ] **Step 2: Commit**

```bash
cd maneva && git add ../CLAUDE.md && git commit -m "docs: añadir reglas de clean code al CLAUDE.md"
```

---

## Task 2: Añadir `getCurrentUser` a auth.service.ts y arreglar cast en `deleteMyAccount`

**Files:**
- Modify: `maneva/src/services/auth.service.ts`

- [ ] **Step 1: Añadir `getCurrentUser` y arreglar `deleteMyAccount`**

Reemplazar el contenido completo de `maneva/src/services/auth.service.ts`:

```typescript
import { supabase } from "@/lib/supabase";

export async function signIn(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  if (error) throw error;
  return data;
}

export async function signUp(
  email: string,
  password: string,
  fullName: string,
  phone?: string,
) {
  const [firstName, ...lastNameParts] = fullName.split(" ");
  const lastName = lastNameParts.join(" ") || "";

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        first_name: firstName,
        last_name: lastName,
        full_name: fullName,
        phone: phone ?? "",
      },
    },
  });
  if (error) throw error;

  if (!data.session) {
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (signInError) throw signInError;
  }

  if (phone?.trim()) {
    const { data: sessionData } = await supabase.auth.getUser();
    if (sessionData?.user) {
      await supabase
        .from("users")
        .update({ phone: phone.trim() })
        .eq("id", sessionData.user.id);
    }
  }

  return data;
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

/**
 * Devuelve el usuario autenticado actual.
 * Usar este helper en lugar de llamar a supabase.auth.getUser() fuera de services/.
 */
export async function getCurrentUser() {
  const { data, error } = await supabase.auth.getUser();
  if (error) throw error;
  return data.user;
}

/**
 * Elimina la cuenta del usuario actual via RPC.
 * Nota: 'delete_my_account' existe en la BD pero aún no está en los tipos generados.
 * Regenerar con: npx supabase gen types typescript --project-id <ID> > src/types/database.types.ts
 */
export async function deleteMyAccount() {
  const { error } = await supabase.rpc("delete_my_account" as never);
  if (error) throw error;
}

export async function getSession() {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  return data.session;
}

export async function getProfile(userId: string) {
  const { data, error } = await supabase
    .from("users")
    .select("*")
    .eq("id", userId)
    .single();
  if (error) throw error;
  return data;
}
```

- [ ] **Step 2: Commit**

```bash
git add src/services/auth.service.ts && git commit -m "feat(auth): añadir getCurrentUser y limpiar cast de deleteMyAccount"
```

---

## Task 3: Quitar `supabase` de `onboarding/location.tsx`

**Files:**
- Modify: `maneva/app/onboarding/location.tsx`

- [ ] **Step 1: Reemplazar el import de `supabase` por `getCurrentUser`**

Eliminar la línea:
```typescript
import { supabase } from "@/lib/supabase";
```

Sustituir por:
```typescript
import { getCurrentUser } from "@/services/auth.service";
```

- [ ] **Step 2: Reemplazar el uso de `supabase.auth.getUser()` en `handleSave`**

Cambiar (línea ~284):
```typescript
const currentUser = user ?? (await supabase.auth.getUser()).data.user;
```

Por:
```typescript
const currentUser = user ?? await getCurrentUser();
```

- [ ] **Step 3: Commit**

```bash
git add app/onboarding/location.tsx && git commit -m "fix(onboarding): eliminar import directo de supabase en location"
```

---

## Task 4: Quitar `supabase` de `onboarding/preferences.tsx`

**Files:**
- Modify: `maneva/app/onboarding/preferences.tsx`

- [ ] **Step 1: Reemplazar el import de `supabase` por `getCurrentUser`**

Eliminar:
```typescript
import { supabase } from "@/lib/supabase";
```

Añadir:
```typescript
import { getCurrentUser } from "@/services/auth.service";
```

- [ ] **Step 2: Reemplazar el uso en `handleContinue`**

Cambiar (línea ~62):
```typescript
const currentUser = user ?? (await supabase.auth.getUser()).data.user;
```

Por:
```typescript
const currentUser = user ?? await getCurrentUser();
```

- [ ] **Step 3: Commit**

```bash
git add app/onboarding/preferences.tsx && git commit -m "fix(onboarding): eliminar import directo de supabase en preferences"
```

---

## Task 5: Limpiar `TutorialModal.tsx` — quitar supabase y AsyncStorage

**Files:**
- Modify: `maneva/src/components/ui/TutorialModal.tsx`

- [ ] **Step 1: Cambiar los imports**

Eliminar:
```typescript
import { supabase } from "@/lib/supabase";
import AsyncStorage from "@react-native-async-storage/async-storage";
```

Añadir:
```typescript
import { getCurrentUser } from "@/services/auth.service";
import { safeStorage } from "@/lib/storage";
```

- [ ] **Step 2: Reemplazar usos en `checkTutorial` y `finishTutorial`**

En `checkTutorial` (línea ~156), cambiar:
```typescript
const resolvedUser = user ?? (await supabase.auth.getUser()).data.user;
// ...
const hasSeenAppTour = await AsyncStorage.getItem(key);
```

Por:
```typescript
const resolvedUser = user ?? await getCurrentUser();
// ...
const hasSeenAppTour = await safeStorage.getItem(key);
```

En `finishTutorial` (línea ~187), cambiar:
```typescript
await AsyncStorage.setItem(storageKey, "true");
```

Por:
```typescript
await safeStorage.setItem(storageKey, "true");
```

- [ ] **Step 3: Commit**

```bash
git add src/components/ui/TutorialModal.tsx && git commit -m "fix(ui): eliminar supabase y AsyncStorage directo de TutorialModal"
```

---

## Task 6: Crear `media.service.ts` y desacoplar `useMediaUrl.ts`

**Files:**
- Create: `maneva/src/services/media.service.ts`
- Modify: `maneva/src/hooks/useMediaUrl.ts`

- [ ] **Step 1: Crear `maneva/src/services/media.service.ts`**

```typescript
import { supabase } from '@/lib/supabase'

/**
 * Devuelve la URL pública de un media_id, o null si no existe.
 */
export async function getMediaUrl(mediaId: string): Promise<string | null> {
  const { data, error } = await supabase
    .from('media')
    .select('media_url')
    .eq('id', mediaId)
    .single()

  if (error) return null
  return data?.media_url ?? null
}
```

- [ ] **Step 2: Actualizar `maneva/src/hooks/useMediaUrl.ts`**

```typescript
import { useState, useEffect, useCallback } from 'react'
import { getMediaUrl } from '@/services/media.service'

const PLACEHOLDER_SALON = 'https://images.unsplash.com/photo-1560066984-138daaa0a5d5?w=400&h=300&fit=crop&q=80'
const PLACEHOLDER_EMPLOYEE = 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=300&h=300&fit=crop&q=80'
const PLACEHOLDER_CAMPAIGN = 'https://images.unsplash.com/photo-1552664730-d307ca884978?w=400&h=300&fit=crop&q=80'

function getPlaceholder(entityType: 'salon' | 'employee' | 'campaign'): string {
  if (entityType === 'employee') return PLACEHOLDER_EMPLOYEE
  if (entityType === 'campaign') return PLACEHOLDER_CAMPAIGN
  return PLACEHOLDER_SALON
}

export function useMediaUrl(
  mediaId: string | null,
  entityType: 'salon' | 'employee' | 'campaign' = 'salon',
) {
  const [url, setUrl] = useState<string>(getPlaceholder(entityType))
  const [loading, setLoading] = useState(false)

  const fetchMediaUrl = useCallback(async () => {
    if (!mediaId) {
      setUrl(getPlaceholder(entityType))
      return
    }

    try {
      setLoading(true)
      const mediaUrl = await getMediaUrl(mediaId)
      if (mediaUrl) setUrl(mediaUrl)
    } catch (e) {
      console.warn('Error fetching media:', e)
    } finally {
      setLoading(false)
    }
  }, [mediaId, entityType])

  useEffect(() => {
    fetchMediaUrl()
  }, [fetchMediaUrl])

  return { url, loading }
}
```

- [ ] **Step 3: Commit**

```bash
git add src/services/media.service.ts src/hooks/useMediaUrl.ts && git commit -m "fix(media): crear media.service y desacoplar supabase de useMediaUrl"
```

---

## Task 7: Mover `useLocationAndSalons` de services/ a hooks/ y eliminar `any`

**Files:**
- Create: `maneva/src/hooks/useLocationAndSalons.ts`
- Delete: `maneva/src/services/useLocationAndSalons.ts`

- [ ] **Step 1: Crear `maneva/src/hooks/useLocationAndSalons.ts`**

```typescript
import { useState, useEffect } from 'react'
import { useSalonsWithRating } from '@/hooks/useSalons'
import { useLocation } from '@/hooks/useLocation'
import { calculateDistance, formatDistance } from '@/lib/location.utils'
import type { UnifiedSalon } from '@/services/salons.service'

type SalonWithRating = UnifiedSalon & { avgRating: number | null }

export type SalonWithDistance = SalonWithRating & {
  distance: string
  distanceKm: number
}

interface UseLocationAndSalonsReturn {
  salons: SalonWithDistance[]
  loading: boolean
  error: string | null
  userLocation: { latitude: number; longitude: number } | null
}

export function useLocationAndSalons(): UseLocationAndSalonsReturn {
  const { data: salonsData, loading: salonsLoading, error: salonsError } = useSalonsWithRating()
  const { coords: userCoords, loading: locationLoading, error: locationError } = useLocation()
  const [salonsWithDistance, setSalonsWithDistance] = useState<SalonWithDistance[]>([])

  useEffect(() => {
    if (userCoords && salonsData.length > 0) {
      const enhanced: SalonWithDistance[] = salonsData.map((salon) => {
        const distanceKm = calculateDistance(
          userCoords.latitude,
          userCoords.longitude,
          salon.latitude ?? 0,
          salon.longitude ?? 0,
        )
        return { ...salon, distance: formatDistance(distanceKm), distanceKm }
      })
      enhanced.sort((a, b) => a.distanceKm - b.distanceKm)
      setSalonsWithDistance(enhanced)
    }
  }, [userCoords, salonsData])

  return {
    salons: salonsWithDistance,
    loading: salonsLoading || locationLoading,
    error: salonsError || locationError,
    userLocation: userCoords,
  }
}
```

- [ ] **Step 2: Buscar si algún fichero importa desde `services/useLocationAndSalons`**

```bash
grep -r "services/useLocationAndSalons" src/ app/ --include="*.ts" --include="*.tsx"
```

Actualizar cada import que aparezca, cambiando `@/services/useLocationAndSalons` por `@/hooks/useLocationAndSalons`.

- [ ] **Step 3: Eliminar el fichero antiguo**

```bash
rm src/services/useLocationAndSalons.ts
```

- [ ] **Step 4: Commit**

```bash
git add src/hooks/useLocationAndSalons.ts src/services/useLocationAndSalons.ts && git commit -m "fix(hooks): mover useLocationAndSalons de services a hooks y eliminar any"
```

---

## Task 8: Añadir icono `IconBack` al catálogo y arreglar `campaign/[id].tsx`

**Files:**
- Modify: `maneva/src/components/ui/icons.tsx`
- Modify: `maneva/app/campaign/[id].tsx`

- [ ] **Step 1: Añadir `ArrowLeft` al catálogo de iconos**

En `maneva/src/components/ui/icons.tsx`, añadir `ArrowLeft` al import de lucide:
```typescript
import {
  // ... existentes ...
  ArrowLeft,
} from 'lucide-react-native'
```

Y al final de los exports:
```typescript
  ArrowLeft as IconBack,
```

- [ ] **Step 2: Arreglar imports en `campaign/[id].tsx`**

Cambiar:
```typescript
import {
  IconArrowLeft,
  IconCalendar,
  IconTag,
  IconMapPin,
  IconPhone,
} from '@/components/ui/icons'
```

Por:
```typescript
import {
  IconBack,
  IconCalendar,
  IconTag,
  IconLocation,
  IconPhone,
} from '@/components/ui/icons'
```

- [ ] **Step 3: Reemplazar usos del icono en el JSX de `campaign/[id].tsx`**

Cambiar `<IconArrowLeft` por `<IconBack` y `<IconMapPin` por `<IconLocation` en todo el fichero.

- [ ] **Step 4: Añadir manejo del error del hook**

En `campaign/[id].tsx`, la desestructuración del hook (línea ~28):
```typescript
const { data: campaign, loading } = useCampaignDetail(id)
```

Cambiar por:
```typescript
const { data: campaign, loading, error } = useCampaignDetail(id)
```

Añadir el bloque de error justo después del bloque `if (loading)`:
```typescript
if (error) {
  return (
    <SafeAreaView className="flex-1 bg-premium-white items-center justify-center px-6">
      <Body className="text-premium-gray text-center">{error}</Body>
    </SafeAreaView>
  )
}
```

- [ ] **Step 5: Arreglar formato de fechas con date-fns**

Añadir al bloque de imports al inicio del fichero:
```typescript
import { format, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'
```

Eliminar la función `formatDate` local (~línea 55-60):
```typescript
const formatDate = (date: Date) => {
  const day = date.getDate()
  const month = date.toLocaleString('es-ES', { month: 'short' })
  const year = date.getFullYear()
  return `${day} ${month} ${year}`
}
```

Cambiar las variables de fecha (~línea 50-51):
```typescript
const startDate = new Date(campaign.start_date)
const endDate = new Date(campaign.end_date)
```

Por:
```typescript
const startFormatted = format(parseISO(campaign.start_date), "d 'de' MMMM yyyy", { locale: es })
const endFormatted = format(parseISO(campaign.end_date), "d 'de' MMMM yyyy", { locale: es })
const isActive = new Date() <= parseISO(campaign.end_date)
```

Reemplazar los usos de `formatDate(startDate)` por `startFormatted` y `formatDate(endDate)` por `endFormatted`. Eliminar la línea `const isActive = ...` que estaba antes ya que ahora está arriba.

- [ ] **Step 6: Commit**

```bash
git add src/components/ui/icons.tsx app/campaign/[id].tsx && git commit -m "fix(campaign): arreglar iconos, error handling y formato de fechas"
```

---

## Task 9: Arreglar `Colors.gold` → `Colors.gold.DEFAULT` en `salon/[id].tsx`

**Files:**
- Modify: `maneva/app/salon/[id].tsx`

- [ ] **Step 1: Reemplazar todas las ocurrencias de `Colors.gold` usadas como string de color**

Buscar en el fichero todos los usos de `color={Colors.gold}` y `fill={Colors.gold}` y sustituirlos por `color={Colors.gold.DEFAULT}` y `fill={Colors.gold.DEFAULT}`.

```bash
# Verificar cuántas ocurrencias hay
grep -n "Colors\.gold[^.]" app/salon/\[id\].tsx
```

En cada línea que aparezca `Colors.gold` seguido de algo que no sea `.` (es decir, no `.DEFAULT`, `.light`, `.dark`), reemplazar por `Colors.gold.DEFAULT`.

- [ ] **Step 2: Commit**

```bash
git add "app/salon/[id].tsx" && git commit -m "fix(salon): corregir Colors.gold a Colors.gold.DEFAULT"
```

---

## Task 10: Arreglar `AsyncStorage` → `safeStorage` en `useAuth.ts`

**Files:**
- Modify: `maneva/src/hooks/useAuth.ts`

- [ ] **Step 1: Reemplazar el import**

Eliminar:
```typescript
import AsyncStorage from "@react-native-async-storage/async-storage";
```

Añadir:
```typescript
import { safeStorage } from "@/lib/storage";
```

- [ ] **Step 2: Reemplazar el uso en `register`**

Cambiar (línea ~49):
```typescript
await AsyncStorage.setItem("hasSeenOnboarding", "false");
```

Por:
```typescript
await safeStorage.setItem("hasSeenOnboarding", "false");
```

- [ ] **Step 3: Commit**

```bash
git add src/hooks/useAuth.ts && git commit -m "fix(auth): usar safeStorage en vez de AsyncStorage directo"
```

---

## Task 11: Eliminar `any` en `search.tsx` y `(tabs)/index.tsx`

**Files:**
- Modify: `maneva/app/search.tsx`
- Modify: `maneva/app/(tabs)/index.tsx`

- [ ] **Step 1: Tipar `SalonResultRow` en `search.tsx`**

Añadir el import de tipo al inicio del fichero:
```typescript
import type { SalonWithDistance } from '@/hooks/useLocationAndSalons'
```

Cambiar la firma del componente (~línea 387):
```typescript
function SalonResultRow({ salon }: { salon: any }) {
```

Por:
```typescript
function SalonResultRow({ salon }: { salon: SalonWithDistance }) {
```

- [ ] **Step 2: Tipar `OfferCard` en `(tabs)/index.tsx`**

Añadir el import de tipo al inicio del fichero:
```typescript
import type { CampaignWithSalon } from '@/services/campaigns.service'
```

Cambiar la firma del componente (~línea 319):
```typescript
function OfferCard({ offer }: { offer: any }) {
```

Por:
```typescript
function OfferCard({ offer }: { offer: CampaignWithSalon }) {
```

También actualizar el formato de fecha en `OfferCard`. Cambiar la función `formatDate` local:
```typescript
const formatDate = (date: Date) => {
  const day = date.getDate()
  const month = date.toLocaleString('es-ES', { month: 'short' })
  return `${day} ${month}`
}
```

Y los usos de `new Date(offer.end_date)` por:
```typescript
import { format, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'
// ...
const endFormatted = format(parseISO(offer.end_date), "d MMM", { locale: es })
const daysRemaining = Math.ceil(
  (parseISO(offer.end_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
)
```

Y sustituir `formatDate(endDate)` por `endFormatted`.

- [ ] **Step 3: Commit**

```bash
git add app/search.tsx "app/(tabs)/index.tsx" && git commit -m "fix(types): eliminar any en SalonResultRow y OfferCard"
```

---

## Task 12: Añadir variante `ghost` a `Button.tsx`

**Files:**
- Modify: `maneva/src/components/ui/Button.tsx`

- [ ] **Step 1: Añadir la variante `ghost`**

Cambiar el tipo `Variant`:
```typescript
type Variant = "primary" | "secondary" | "ghost" | "danger";
```

Añadir estilos para `ghost` en `variantStyles`:
```typescript
const variantStyles: Record<Variant, string> = {
  primary: "bg-gold border-0",
  secondary: "bg-premium-white border-4 border-premium-black shadow-xl",
  ghost: "bg-transparent border-0",
  danger: "bg-red-600 border-0",
};
```

Añadir estilos de texto para `ghost` en `textStyles`:
```typescript
const textStyles: Record<Variant, string> = {
  primary: "text-premium-black",
  secondary: "text-premium-black",
  ghost: "text-premium-gray",
  danger: "text-white",
};
```

- [ ] **Step 2: Commit**

```bash
git add src/components/ui/Button.tsx && git commit -m "feat(ui): añadir variante ghost al Button"
```

---

## Task 13: Documentar filtros pendientes en `search.tsx`

**Files:**
- Modify: `maneva/app/search.tsx`

- [ ] **Step 1: Añadir comentarios TODO y deshabilitar chips de filtros no implementados**

En `search.tsx`, localizar los bloques de filtros vacíos (~líneas 120-132):

```typescript
// Filtro de precio - simplificado
if (filters.priceRange > 0) {
  // Mantener activo el filtro sin aplicar lógica de precio aún
}

if (filters.gender) {
  // Mantener activo el filtro sin aplicar lógica de género aún
}

if (filters.selectedServices.length > 0) {
  // Mantener activo el filtro sin aplicar lógica de servicios aún
}
```

Reemplazar por:

```typescript
// TODO: Filtro por precio — requiere columna `price_range` en salon_locations.
// Hasta que esté implementado, el chip se muestra deshabilitado en la UI.

// TODO: Filtro por género — requiere columna `gender_focus` en salon_locations.
// Hasta que esté implementado, el chip se muestra deshabilitado en la UI.

// TODO: Filtro por servicios — requiere join con tabla `services` en la query de salones.
// Hasta que esté implementado, el chip se muestra deshabilitado en la UI.
```

Buscar los chips de `priceRange`, `gender` y `selectedServices` en el JSX y añadirles `disabled` con estilo de opacidad para indicar que no están activos:

En cada chip correspondiente, añadir `opacity-40 pointer-events-none` a su className, o bien `disabled={true}` si usa `TouchableOpacity`.

- [ ] **Step 2: Commit**

```bash
git add app/search.tsx && git commit -m "fix(search): documentar filtros pendientes y deshabilitar UI engañosa"
```

---

## Verificación final

- [ ] **Verificar que no quedan imports de `supabase` fuera de `src/services/`**

```bash
grep -r "from '@/lib/supabase'" src/hooks/ src/components/ app/ --include="*.ts" --include="*.tsx"
```

Resultado esperado: sin coincidencias.

- [ ] **Verificar que no quedan usos de `any`**

```bash
grep -rn ": any" src/ app/ --include="*.ts" --include="*.tsx"
```

Revisar cada resultado. Los únicos aceptables son en comentarios o en ficheros `database.types.ts` (generado).

- [ ] **Verificar que no quedan `AsyncStorage` directos**

```bash
grep -rn "AsyncStorage" src/ app/ --include="*.ts" --include="*.tsx"
```

Resultado esperado: sin coincidencias.
