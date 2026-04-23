import { useCallback, useEffect, useState } from 'react'
import { useAuthStore } from '@/store/authStore'
import {
  getAllActiveEmployees,
  addFavoriteEmployee,
  removeFavoriteEmployee,
  getFavoriteEmployeeIds,
  type EmployeeWithUser,
} from '@/services/users.service'

export type { EmployeeWithUser }

export function useFavoriteStylists() {
  const { user } = useAuthStore()
  const [employees, setEmployees] = useState<EmployeeWithUser[]>([])
  const [favoriteIds, setFavoriteIds] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchAll = useCallback(async () => {
    if (!user) return
    setLoading(true)
    setError(null)
    try {
      const [allEmployees, ids] = await Promise.all([
        getAllActiveEmployees(),
        getFavoriteEmployeeIds(user.id),
      ])
      setEmployees(allEmployees)
      setFavoriteIds(ids)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error cargando estilistas')
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => {
    fetchAll()
  }, [fetchAll])

  const toggle = async (employeeId: string) => {
    if (!user) return
    const isFav = favoriteIds.includes(employeeId)
    // Actualización optimista
    setFavoriteIds((prev) =>
      isFav ? prev.filter((id) => id !== employeeId) : [...prev, employeeId],
    )
    try {
      if (isFav) {
        await removeFavoriteEmployee(user.id, employeeId)
      } else {
        await addFavoriteEmployee(user.id, employeeId)
      }
    } catch (e: unknown) {
      // Revertir si falla
      setFavoriteIds((prev) =>
        isFav ? [...prev, employeeId] : prev.filter((id) => id !== employeeId),
      )
      setError(e instanceof Error ? e.message : 'Error actualizando favorito')
    }
  }

  const favorites = employees.filter((e) => favoriteIds.includes(e.id))

  return { employees, favoriteIds, favorites, loading, error, toggle, refresh: fetchAll }
}
