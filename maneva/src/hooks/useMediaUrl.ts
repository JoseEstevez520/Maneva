import { useState, useEffect, useCallback } from 'react'
import { getMediaUrl } from '@/services/media.service'

const PLACEHOLDER_SALON = 'https://images.unsplash.com/photo-1560066984-138daaa0a5d5?w=400&h=300&fit=crop&q=80'
const PLACEHOLDER_EMPLOYEE = 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=300&h=300&fit=crop&q=80'
const PLACEHOLDER_CAMPAIGN = 'https://images.unsplash.com/photo-1552664730-d307ca884978?w=400&h=300&fit=crop&q=80'

function getPlaceholder(entityType: 'salon' | 'employee' | 'campaign'): string {
  if (entityType === 'employee') return PLACEHOLDER_EMPLOYEE
  if (entityType === 'campaign') return PLACEHOLDER_CAMPAIGN
  return PLACEHOLDER_SALON
}

export function useMediaUrl(
  mediaId: string | null,
  entityType: 'salon' | 'employee' | 'campaign' = 'salon',
) {
  const [url, setUrl] = useState<string>(getPlaceholder(entityType))
  const [loading, setLoading] = useState(false)

  const fetchMediaUrl = useCallback(async () => {
    if (!mediaId) {
      setUrl(getPlaceholder(entityType))
      return
    }

    try {
      setLoading(true)
      const mediaUrl = await getMediaUrl(mediaId)
      if (mediaUrl) setUrl(mediaUrl)
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