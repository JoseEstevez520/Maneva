// Instancia única de Supabase. NUNCA crear otra fuera de este fichero.
import { createClient } from '@supabase/supabase-js'
import { safeStorage } from '@/lib/storage'
import { Database } from '@/types/database.types'

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!

// Solución definitiva para "ReferenceError: window is not defined" en Expo Web SSR
// Usamos safeStorage que gestiona los entornos Node.js (build) y Browser/Native.
const isBrowser = typeof window !== 'undefined'

export const supabase = createClient<Database>(
  supabaseUrl,
  supabaseAnonKey,
  {
    auth: {
      storage: safeStorage as any,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: isBrowser, // Solo detectar sesión en URL si estamos en un navegador
    },
  }
)
