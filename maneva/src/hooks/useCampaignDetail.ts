/**
 * useCampaignDetail.ts
 * ────────────────────────────────────────────────────────────────
 * Hook para cargar detalles de una campaña específica.
 * ────────────────────────────────────────────────────────────────
 */
import { useState, useEffect, useCallback } from 'react'
import { getCampaignById, CampaignWithSalon } from '@/services/campaigns.service'

export function useCampaignDetail(id: string) {
  const [data, setData] = useState<CampaignWithSalon | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetch = useCallback(async () => {
    if (!id) return
    setLoading(true)
    setError(null)
    try {
      const result = await getCampaignById(id)
      setData(result)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error al cargar campaña')
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    fetch()
  }, [fetch])

  return { data, loading, error, refresh: fetch }
}