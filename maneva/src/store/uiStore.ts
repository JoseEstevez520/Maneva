import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { safeStorage } from '@/lib/storage'

type ColorScheme = 'light' | 'dark'

type UiStore = {
  colorScheme: ColorScheme
  hasSeenOnboarding: boolean
  setColorScheme: (scheme: ColorScheme) => void
  setHasSeenOnboarding: (seen: boolean) => void
}

export const useUiStore = create<UiStore>()(
  persist(
    (set) => ({
      colorScheme: 'light',
      hasSeenOnboarding: false,
      setColorScheme: (colorScheme) => set({ colorScheme }),
      setHasSeenOnboarding: (hasSeenOnboarding) => set({ hasSeenOnboarding }),
    }),
    {
      name: 'ui-store',
      storage: createJSONStorage(() => safeStorage),
    }
  )
)
