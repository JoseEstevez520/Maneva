import { create } from 'zustand'

type ColorScheme = 'light' | 'dark'

type UiStore = {
  colorScheme: ColorScheme
  hasSeenOnboarding: boolean
  setColorScheme: (scheme: ColorScheme) => void
  setHasSeenOnboarding: (seen: boolean) => void
}

export const useUiStore = create<UiStore>((set) => ({
  colorScheme: 'light',
  hasSeenOnboarding: false,
  setColorScheme: (colorScheme) => set({ colorScheme }),
  setHasSeenOnboarding: (hasSeenOnboarding) => set({ hasSeenOnboarding }),
}))
