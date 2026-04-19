import AsyncStorage from '@react-native-async-storage/async-storage'
import { Platform } from 'react-native'

/**
 * Almacenamiento seguro para Expo Web (SSR/Static) y Native.
 * Previene el error "ReferenceError: window is not defined" durante el pre-renderizado.
 */
const isBrowser = typeof window !== 'undefined'

export const safeStorage = {
  getItem: async (key: string): Promise<string | null> => {
    if (Platform.OS === 'web' && !isBrowser) return null
    return AsyncStorage.getItem(key)
  },
  setItem: async (key: string, value: string): Promise<void> => {
    if (Platform.OS === 'web' && !isBrowser) return
    return AsyncStorage.setItem(key, value)
  },
  removeItem: async (key: string): Promise<void> => {
    if (Platform.OS === 'web' && !isBrowser) return
    return AsyncStorage.removeItem(key)
  },
  clear: async (): Promise<void> => {
    if (Platform.OS === 'web' && !isBrowser) return
    return AsyncStorage.clear()
  },
  getAllKeys: async (): Promise<readonly string[]> => {
    if (Platform.OS === 'web' && !isBrowser) return []
    return AsyncStorage.getAllKeys()
  },
  multiGet: async (keys: readonly string[]): Promise<readonly [string, string | null][]> => {
    if (Platform.OS === 'web' && !isBrowser) return []
    return AsyncStorage.multiGet(keys)
  },
  multiSet: async (keyValuePairs: [string, string][]): Promise<void> => {
    if (Platform.OS === 'web' && !isBrowser) return
    return AsyncStorage.multiSet(keyValuePairs)
  },
  multiRemove: async (keys: readonly string[]): Promise<void> => {
    if (Platform.OS === 'web' && !isBrowser) return
    return AsyncStorage.multiRemove(keys)
  }
}

export default safeStorage
