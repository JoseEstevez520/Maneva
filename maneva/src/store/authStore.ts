/**
 * authStore.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Store global (Zustand) para el estado de autenticación.
 * El Auth Guard en `app/_layout.tsx` escucha cambios de sesión de Supabase
 * y actualiza este store — los componentes leen de aquí, nunca de Supabase Auth.
 * ─────────────────────────────────────────────────────────────────────────────
 */
import { create } from 'zustand'
import { User } from '@supabase/supabase-js'

/** Roles posibles en la plataforma Maneva */
type UserRole = 'client' | 'owner' | 'stylist'

type AuthStore = {
  user: User | null
  role: UserRole | null
  setUser: (user: User | null) => void
  setRole: (role: UserRole) => void
  /** Limpia el estado de autenticación al cerrar sesión */
  clearAuth: () => void
}

export const useAuthStore = create<AuthStore>((set) => ({
  user: null,
  role: null,
  setUser: (user) => set({ user }),
  setRole: (role) => set({ role }),
  clearAuth: () => set({ user: null, role: null }),
}))

