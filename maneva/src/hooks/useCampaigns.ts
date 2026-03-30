/**
 * useCampaigns.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Hook para cargar las campañas/ofertas activas de la plataforma.
 * Usado en la sección "OFERTAS ESPECIALES" de la HomeScreen.
 * ─────────────────────────────────────────────────────────────────────────────
 */
import { useState, useEffect, useCallback } from 'react'
import { getAllActiveCampaigns } from '@/services/campaigns.service'
import { Database } from '@/types/database.types'

type Campaign = Database['public']['Tables']['campaigns']['Row']

export function useActiveCampaigns() {
  const [data, setData] = useState<Campaign[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetch = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await getAllActiveCampaigns()
      setData(result)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error al cargar ofertas')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetch()
  }, [fetch])

  return { data, loading, error, refresh: fetch }
}
