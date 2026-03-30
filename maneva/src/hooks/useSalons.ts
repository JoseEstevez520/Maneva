/**
 * useSalons.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Hooks de estado para la carga de salones/sedes.
 * - `useSalons()` → lista completa de sedes activas (Home, Buscar)
 * - `useSalon(id)` → detalle de una sede concreta (próxima pantalla de detalle)
 * ─────────────────────────────────────────────────────────────────────────────
 */
import { useState, useEffect, useCallback } from 'react'
import { getSalons, getSalonById, UnifiedSalon } from '@/services/salons.service'

/** Hook principal — devuelve todas las sedes activas con refresh */
export function useSalons() {
  const [data, setData] = useState<UnifiedSalon[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchSalons = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await getSalons()
      setData(result)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error al cargar salones')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchSalons()
  }, [fetchSalons])

  return { data, loading, error, refresh: fetchSalons }
}

/** Hook de detalle — devuelve una sede por ID */
export function useSalon(id: string) {
  const [data, setData] = useState<UnifiedSalon | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchSalon = useCallback(async () => {
    if (!id) return
    setLoading(true)
    setError(null)
    try {
      const result = await getSalonById(id)
      setData(result)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error al cargar salón')
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    fetchSalon()
  }, [fetchSalon])

  return { data, loading, error, refresh: fetchSalon }
}

