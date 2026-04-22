import { useCallback, useEffect, useState } from 'react'
import { useAuthStore } from '@/store/authStore'
import { safeStorage } from '@/lib/storage'

export type OffersScope = 'all' | 'favorites' | 'none'

const OFFERS_SCOPE_KEY = 'notifications_offers_scope'
const HOME_SERVICE_KEY = 'notifications_home_service'

function buildUserScopedKey(userId: string, key: string): string {
  return `notifications:${userId}:${key}`
}

function isOffersScope(value: string): value is OffersScope {
  return value === 'all' || value === 'favorites' || value === 'none'
}

export function useNotificationSettings() {
  const { user } = useAuthStore()
  const [offersScope, setOffersScope] = useState<OffersScope>('favorites')
  const [homeServiceEnabled, setHomeServiceEnabled] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    if (!user) return

    setLoading(true)
    setError(null)

    try {
      const [offersValue, homeServiceValue] = await Promise.all([
        safeStorage.getItem(buildUserScopedKey(user.id, OFFERS_SCOPE_KEY)),
        safeStorage.getItem(buildUserScopedKey(user.id, HOME_SERVICE_KEY)),
      ])

      const rawScope = offersValue ?? 'favorites'
      setOffersScope(isOffersScope(rawScope) ? rawScope : 'favorites')
      setHomeServiceEnabled(homeServiceValue === 'true')
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error cargando notificaciones')
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => {
    refresh()
  }, [refresh])

  const saveOffersScope = async (nextScope: OffersScope): Promise<boolean> => {
    if (!user) return false

    setError(null)
    const previous = offersScope
    setOffersScope(nextScope)

    try {
      await safeStorage.setItem(
        buildUserScopedKey(user.id, OFFERS_SCOPE_KEY),
        nextScope,
      )
      return true
    } catch (e: unknown) {
      setOffersScope(previous)
      setError(e instanceof Error ? e.message : 'Error guardando preferencia de ofertas')
      return false
    }
  }

  const saveHomeServiceEnabled = async (nextValue: boolean): Promise<boolean> => {
    if (!user) return false

    setError(null)
    const previous = homeServiceEnabled
    setHomeServiceEnabled(nextValue)

    try {
      await safeStorage.setItem(
        buildUserScopedKey(user.id, HOME_SERVICE_KEY),
        String(nextValue),
      )
      return true
    } catch (e: unknown) {
      setHomeServiceEnabled(previous)
      setError(e instanceof Error ? e.message : 'Error guardando notificaciones a domicilio')
      return false
    }
  }

  return {
    offersScope,
    homeServiceEnabled,
    loading,
    error,
    refresh,
    saveOffersScope,
    saveHomeServiceEnabled,
  }
}
