import { create } from 'zustand'

type ColorScheme = 'light' | 'dark'

type UiStore = {
  colorScheme: ColorScheme
  setColorScheme: (scheme: ColorScheme) => void
}

export const useUiStore = create<UiStore>((set) => ({
  colorScheme: 'light',
  setColorScheme: (colorScheme) => set({ colorScheme }),
}))
