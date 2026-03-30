import { create } from 'zustand'

// TODO: Importar User de @supabase/supabase-js cuando se configure Supabase
type User = { id: string; email?: string }
type UserRole = 'client' | 'owner' | 'stylist'

type AuthStore = {
  user: User | null
  role: UserRole | null
  setUser: (user: User | null) => void
  setRole: (role: UserRole) => void
  clearAuth: () => void
}

export const useAuthStore = create<AuthStore>((set) => ({
  user: null,
  role: null,
  setUser: (user) => set({ user }),
  setRole: (role) => set({ role }),
  clearAuth: () => set({ user: null, role: null }),
}))
