/**
 * useMediaUrl.ts
 * ────────────────────────────────────────────────────────────────
 * Hook para obtener URLs de imágenes desde Supabase Storage.
 * ────────────────────────────────────────────────────────────────
 */
import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'

const PLACEHOLDER_SALON = 'https://images.unsplash.com/photo-1560066984-138daaa0a5d5?w=400&h=300&fit=crop&q=80'
const PLACEHOLDER_EMPLOYEE =
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=300&h=300&fit=crop&q=80'
const PLACEHOLDER_CAMPAIGN =
  'https://images.unsplash.com/photo-1552664730-d307ca884978?w=400&h=300&fit=crop&q=80'

export function useMediaUrl(mediaId: string | null, entityType: 'salon' | 'employee' | 'campaign' = 'salon') {
  const [url, setUrl] = useState<string>(
    entityType === 'employee' ? PLACEHOLDER_EMPLOYEE : entityType === 'campaign' ? PLACEHOLDER_CAMPAIGN : PLACEHOLDER_SALON
  )
  const [loading, setLoading] = useState(false)

  const fetchMediaUrl = useCallback(async () => {
    if (!mediaId) {
      setUrl(entityType === 'employee' ? PLACEHOLDER_EMPLOYEE : entityType === 'campaign' ? PLACEHOLDER_CAMPAIGN : PLACEHOLDER_SALON)
      return
    }

    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('media')
        .select('media_url')
        .eq('id', mediaId)
        .single()

      if (error) throw error
      if (data?.media_url) {
        setUrl(data.media_url)
      }
    } catch (e) {
      console.warn('Error fetching media:', e)
    } finally {
      setLoading(false)
    }
  }, [mediaId, entityType])

  useEffect(() => {
    fetchMediaUrl()
  }, [fetchMediaUrl])

  return { url, loading }
}