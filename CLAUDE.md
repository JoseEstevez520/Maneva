# CLAUDE.md — App de Peluquería (Marketplace)

Lee este fichero entero antes de escribir cualquier línea de código.
Es la única fuente de verdad del proyecto.

---

## Stack

| Tecnología | Versión | Uso |
|---|---|---|
| React Native | via Expo SDK 52 | Base de la app |
| Expo Router | v3 | Navegación por ficheros |
| NativeWind | 4.2.3 | Estilos con clases Tailwind (⚠️ REQUIERE tailwindcss@3.4.x exacto, ni 3.3 ni 4.0) |
| Supabase | latest | Auth, DB, Storage, Realtime |
| Zustand | latest | Estado global |
| React Hook Form + Zod | latest | Formularios y validación |
| date-fns | latest | Fechas y horas |
| lucide-react-native | latest | Iconos |
| @react-native-async-storage/async-storage | latest | Persistencia de sesión |

---

## Estructura de carpetas

```
/
├── app/                        ← Rutas (Expo Router). El nombre del fichero ES la ruta.
│   ├── _layout.tsx             ← Root layout. Auth guard y listener de sesión aquí.
│   ├── index.tsx               ← Redirect inicial según sesión
│   ├── login.tsx
│   ├── register.tsx
│   └── (tabs)/
│       ├── _layout.tsx         ← Tab bar con 5 tabs
│       ├── home.tsx
│       ├── search.tsx
│       ├── bookings.tsx
│       ├── chat.tsx
│       └── profile.tsx
│
├── src/
│   ├── components/
│   │   ├── ui/                 ← Componentes base reutilizables (Button, Input, Card...)
│   │   ├── salon/              ← Componentes específicos de salones
│   │   ├── booking/            ← Componentes del flujo de reserva
│   │   └── chat/               ← Componentes del chat
│   │
│   ├── hooks/                  ← Un hook por dominio. Gestiona loading/error/data.
│   │   ├── useAuth.ts
│   │   ├── useSalons.ts
│   │   ├── useBookings.ts
│   │   └── useChat.ts
│   │
│   ├── services/               ← Única capa que habla con Supabase.
│   │   ├── auth.service.ts
│   │   ├── salons.service.ts
│   │   ├── bookings.service.ts
│   │   ├── chat.service.ts
│   │   ├── storage.service.ts
│   │   └── ai.service.ts       ← Llama al webhook de n8n
│   │
│   ├── store/                  ← Solo estado verdaderamente global
│   │   ├── authStore.ts        ← Usuario autenticado y rol
│   │   └── uiStore.ts          ← Tema, preferencias
│   │
│   ├── lib/
│   │   ├── supabase.ts         ← Una sola instancia del cliente. Nunca crear otra.
│   │   └── constants.ts        ← Constantes globales de la app
│   │
│   └── types/
│       └── database.types.ts   ← GENERADO por Supabase CLI. Nunca editar a mano.
│
├── assets/
├── CLAUDE.md
├── CONTRIBUTING.md
├── tailwind.config.js
├── app.json
├── tsconfig.json
└── .env.example
```

---

## Variables de entorno

En Expo, las variables públicas DEBEN llevar el prefijo `EXPO_PUBLIC_`.

```bash
# .env
EXPO_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJ...
EXPO_PUBLIC_N8N_WEBHOOK_URL=https://tu-n8n.com/webhook/...
```

Nunca hardcodear estas variables en el código.
El fichero `.env` nunca va al repositorio. El `.env.example` sí.

---

## Configuración de Supabase

```typescript
// src/lib/supabase.ts — ÚNICA instancia en todo el proyecto
import { createClient } from '@supabase/supabase-js'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { Database } from '@/types/database.types'

export const supabase = createClient<Database>(
  process.env.EXPO_PUBLIC_SUPABASE_URL!,
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!,
  {
    auth: {
      storage: AsyncStorage,       // Persiste sesión entre cierres de app
      autoRefreshToken: true,      // Renueva el token automáticamente
      persistSession: true,        // Mantiene la sesión activa
      detectSessionInUrl: false,   // No es una web
    },
  }
)
```

**Regla absoluta:** nadie importa `supabase` fuera de `src/services/`. Ni hooks, ni pantallas, ni stores.

---

## Tipos generados

Ejecutar este comando cada vez que se cambie algo en Supabase:

```bash
npx supabase gen types typescript --project-id TU_PROJECT_ID > src/types/database.types.ts
```

Nunca escribir tipos de base de datos a mano.

---

## Alias de imports

Usar siempre `@/` en vez de rutas relativas.

```typescript
// ❌ Nunca
import { Button } from '../../../components/ui/Button'

// ✅ Siempre
import { Button } from '@/components/ui/Button'
```

Configurado en `tsconfig.json`:
```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": { "@/*": ["src/*"] }
  }
}
```

---

## Iconos

```typescript
// src/components/ui/icons.tsx — único fichero de iconos
import {
  Scissors, Calendar, Star, MapPin, MessageCircle,
  ChevronRight, Plus, X, Check, User, Clock, Search,
} from 'lucide-react-native'

export {
  Scissors     as IconScissors,
  Calendar     as IconCalendar,
  Star         as IconStar,
  MapPin       as IconLocation,
  MessageCircle as IconChat,
  ChevronRight as IconChevron,
  Plus         as IconAdd,
  X            as IconClose,
  Check        as IconCheck,
  User         as IconUser,
  Clock        as IconClock,
  Search       as IconSearch,
}
```

Si se cambia la librería de iconos, solo se toca este fichero.

---

## Componentes UI base

Viven en `src/components/ui/`. Nadie los modifica salvo quien hizo el boilerplate.
Los demás los importan y usan tal cual.

### Button.tsx
```typescript
type ButtonProps = {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
  size?: 'sm' | 'md' | 'lg'
  loading?: boolean
  disabled?: boolean
  onPress: () => void
  children: React.ReactNode
}
```

### Input.tsx
```typescript
type InputProps = {
  label?: string
  error?: string
  leftIcon?: React.ReactNode
  secureTextEntry?: boolean
  placeholder?: string
  value: string
  onChangeText: (text: string) => void
}
```

### Card.tsx
```typescript
type CardProps = {
  onPress?: () => void   // Si se pasa, es tocable
  className?: string
  children: React.ReactNode
}
```

### ScreenLayout.tsx
Wrapper estándar para todas las pantallas. Incluye SafeAreaView, scroll y padding.

### ErrorMessage.tsx y LoadingSpinner.tsx
Usarlos en todas las pantallas con este patrón:
```typescript
const { data, loading, error } = useAlgo()
if (loading) return <LoadingSpinner />
if (error) return <ErrorMessage message={error} />
return <ContenidoNormal />
```

---

## Estructura de servicios

Cada servicio exporta funciones puras. Sin estado, sin side effects.

```typescript
// src/services/bookings.service.ts
import { supabase } from '@/lib/supabase'
import { Database } from '@/types/database.types'

type Booking = Database['public']['Tables']['bookings']['Row']

export async function getBookings(): Promise<Booking[]> {
  const { data, error } = await supabase
    .from('bookings')
    .select('*')
    .order('starts_at', { ascending: true })

  if (error) throw error
  return data
}

export async function createBooking(payload: Partial<Booking>): Promise<Booking> {
  const { data, error } = await supabase
    .from('bookings')
    .insert(payload)
    .select()
    .single()

  if (error) throw error
  return data
}
```

---

## Estructura de hooks

El hook gestiona loading/error y llama al servicio. La pantalla solo consume el hook.

```typescript
// src/hooks/useBookings.ts
import { useState, useEffect } from 'react'
import { getBookings, createBooking } from '@/services/bookings.service'

export function useBookings() {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => { fetch() }, [])

  async function fetch() {
    setLoading(true)
    try {
      const result = await getBookings()
      setData(result)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  async function create(payload: any) {
    setLoading(true)
    try {
      await createBooking(payload)
      await fetch()
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  return { data, loading, error, create, refresh: fetch }
}
```

---

## Auth guard (root layout)

```typescript
// app/_layout.tsx
import { useEffect } from 'react'
import { useRouter, useSegments } from 'expo-router'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'

export default function RootLayout() {
  const router = useRouter()
  const segments = useSegments()
  const { setUser } = useAuthStore()

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setUser(session?.user ?? null)
        const inAuthGroup = segments[0] === '(tabs)'

        if (session && !inAuthGroup) {
          router.replace('/(tabs)/home')
        } else if (!session && inAuthGroup) {
          router.replace('/login')
        }
      }
    )
    return () => subscription.unsubscribe()
  }, [])

  return <Slot />
}
```

---

## Zustand — estado global

Solo dos stores. Todo lo demás es `useState`.

```typescript
// src/store/authStore.ts
import { create } from 'zustand'
import { User } from '@supabase/supabase-js'

type Role = 'client' | 'owner' | 'stylist'

type AuthStore = {
  user: User | null
  role: Role | null
  setUser: (user: User | null) => void
  setRole: (role: Role) => void
}

export const useAuthStore = create<AuthStore>((set) => ({
  user: null,
  role: null,
  setUser: (user) => set({ user }),
  setRole: (role) => set({ role }),
}))
```

**Regla:** ¿Lo necesitan 3+ pantallas no relacionadas? → Zustand. ¿Lo usa solo una pantalla? → useState.

---

## Constantes

```typescript
// src/lib/constants.ts
export const BOOKING_SLOT_DURATION = 30 // minutos
export const MAX_PHOTOS_PER_SALON = 10
export const SERVICE_CATEGORIES = ['cut', 'color', 'beard', 'treatment'] as const
export const BOOKING_STATUSES = ['pending', 'confirmed', 'cancelled', 'done'] as const
export const USER_ROLES = ['client', 'owner', 'stylist'] as const
```

---

## Fechas — siempre UTC en Supabase

```typescript
import { format, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'

// Guardar en Supabase: siempre ISO 8601 UTC
const isoDate = new Date().toISOString() // "2026-04-15T10:30:00.000Z"

// Mostrar al usuario: convertir a local
format(parseISO(booking.starts_at), "dd 'de' MMMM 'a las' HH:mm", { locale: es })
// → "15 de abril a las 12:30"
```

Nunca guardar strings de fecha formateados en la base de datos.

---

## IA — llamada a n8n

```typescript
// src/services/ai.service.ts
export async function getRecommendation(payload: {
  user_preferences: string[]
  location: { lat: number; lng: number }
}) {
  const response = await fetch(process.env.EXPO_PUBLIC_N8N_WEBHOOK_URL!, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  if (!response.ok) throw new Error('Error en el servicio de IA')
  return response.json()
}
```

---

## Reglas que nunca se rompen

1. **Supabase solo en `/services/`** — nunca en hooks, pantallas ni stores
2. **Una sola instancia** de `supabase` en `src/lib/supabase.ts`
3. **Tipos siempre generados** con el CLI, nunca escritos a mano
4. **Alias `@/`** siempre, nunca rutas relativas con `../`
5. **No `any`** — si TypeScript se queja, busca el tipo correcto
6. **Lógica fuera de pantallas** — las pantallas solo renderizan, llaman hooks y navegan
7. **Fechas en UTC** en Supabase, convertir a local solo al mostrar
8. **Commits pequeños** — un commit por funcionalidad que funciona
9. **Buscar antes de crear** — comprobar si el componente o servicio ya existe
10. **No optimizar antes de que funcione** — primero funcional, luego eficiente

---

## Cómo añadir un módulo nuevo

1. Crear `src/services/nuevo.service.ts` con las funciones que hablan con Supabase
2. Crear `src/hooks/useNuevo.ts` que llama al servicio y gestiona loading/error
3. Crear `src/components/nuevo/` con los componentes específicos
4. Crear la pantalla en `app/` que consume el hook
5. Si hay estado global, añadirlo al store correspondiente
6. Regenerar tipos si se cambió la base de datos

---

## Roles de usuario

La app tiene tres roles. El rol se guarda en la tabla `profiles` de Supabase.

| Rol | Acceso |
|---|---|
| `client` | Buscar salones, reservar, ver historial, chat |
| `owner` | Gestionar salón, ver reservas del salón, chat |
| `stylist` | Ver su agenda, gestionar su disponibilidad |

El rol se carga al iniciar sesión y se guarda en `authStore`.

---

## Realtime — chat

```typescript
// Suscripción a mensajes nuevos en un canal
const channel = supabase
  .channel(`chat:${bookingId}`)
  .on('postgres_changes', {
    event: 'INSERT',
    schema: 'public',
    table: 'messages',
    filter: `booking_id=eq.${bookingId}`,
  }, (payload) => {
    setMessages(prev => [...prev, payload.new])
  })
  .subscribe()

// Limpiar al desmontar
return () => { supabase.removeChannel(channel) }
```

---

## Solución de Problemas (Troubleshooting)

### Emulador de Android bloqueado o con errores de caché
Si el emulador no arranca, se queda en negro o da errores extraños de carga, usa este comando en PowerShell para forzar un inicio limpio (borrando los datos temporales):

```powershell
& "$env:LOCALAPPDATA\Android\Sdk\emulator\emulator.exe" -avd "Medium_Phone_API_36.1" -wipe-data
```

**Cuándo usarlo:**
- El emulador no pasa de la pantalla de carga.
- Errores de "System UI not responding".
- Quieres probar la app desde cero (limpiar almacenamiento local del emulador).

