import { useState, useEffect, useCallback } from 'react'
import { getUserProfile, updateUserProfile } from '@/services/users.service'
import { useAuthStore } from '@/store/authStore'
import { Database } from '@/types/database.types'

type UserProfile = Database['public']['Tables']['user_profiles']['Row']

export function useUserProfile() {
  const [data, setData] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { user } = useAuthStore()

  const fetchProfile = useCallback(async () => {
    if (!user) return
    setLoading(true)
    setError(null)
    try {
      const result = await getUserProfile(user.id)
      setData(result)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error')
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => {
    fetchProfile()
  }, [fetchProfile])

  const updateProfile = async (updates: Partial<UserProfile>) => {
    if (!user) return
    setLoading(true)
    setError(null)
    try {
      await updateUserProfile(user.id, updates)
      await fetchProfile()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error')
      throw e
    } finally {
      setLoading(false)
    }
  }

  return { data, loading, error, refresh: fetchProfile, updateProfile }
}
