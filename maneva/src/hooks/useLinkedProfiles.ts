import { useCallback, useEffect, useState } from 'react'
import { useAuthStore } from '@/store/authStore'
import {
  addProfileManagerByPhone,
  deactivateLinkedProfile,
  formatPermissionsLabel,
  getProfilesManagedByMe,
  getProfilesWhoCanManageMe,
  LinkedProfileWithUser,
  updateLinkedProfilePermissions,
} from '@/services/linkedProfiles.service'

type AddManagerPayload = {
  phone: string
  relationLabel?: string
  canModify: boolean
}

export function useLinkedProfiles() {
  const { user } = useAuthStore()
  const [delegates, setDelegates] = useState<LinkedProfileWithUser[]>([])
  const [managedUsers, setManagedUsers] = useState<LinkedProfileWithUser[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    if (!user) return

    setLoading(true)
    setError(null)

    try {
      const [canManageMe, iManage] = await Promise.all([
        getProfilesWhoCanManageMe(user.id),
        getProfilesManagedByMe(user.id),
      ])
      setDelegates(canManageMe)
      setManagedUsers(iManage)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error cargando relaciones de gestión de citas')
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => {
    refresh()
  }, [refresh])

  const addManager = async (payload: AddManagerPayload) => {
    if (!user) return

    setLoading(true)
    setError(null)

    try {
      await addProfileManagerByPhone({
        primaryUserId: user.id,
        phone: payload.phone,
        relationLabel: payload.relationLabel,
        canModify: payload.canModify,
      })
      await refresh()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'No se pudo añadir la persona')
      throw e
    } finally {
      setLoading(false)
    }
  }

  const toggleDelegatePermissions = async (linkedProfile: LinkedProfileWithUser) => {
    setLoading(true)
    setError(null)

    try {
      await updateLinkedProfilePermissions({
        linkedProfileId: linkedProfile.link.id,
        canModify: !linkedProfile.permissions.canModify,
        relationLabel: linkedProfile.permissions.relationLabel,
      })
      await refresh()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'No se pudo actualizar el permiso')
      throw e
    } finally {
      setLoading(false)
    }
  }

  const removeDelegate = async (linkedProfileId: string) => {
    setLoading(true)
    setError(null)

    try {
      await deactivateLinkedProfile(linkedProfileId)
      await refresh()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'No se pudo eliminar el permiso')
      throw e
    } finally {
      setLoading(false)
    }
  }

  const stopManaging = async (linkedProfileId: string) => {
    setLoading(true)
    setError(null)

    try {
      await deactivateLinkedProfile(linkedProfileId)
      await refresh()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'No se pudo dejar de gestionar')
      throw e
    } finally {
      setLoading(false)
    }
  }

  return {
    delegates,
    managedUsers,
    loading,
    error,
    refresh,
    addManager,
    toggleDelegatePermissions,
    removeDelegate,
    stopManaging,
    formatPermissionsLabel,
  }
}
