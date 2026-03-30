import { useState } from 'react'
import { useAuthStore } from '@/store/authStore'
import { signIn, signUp, signOut } from '@/services/auth.service'

export function useAuth() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { user, role } = useAuthStore()

  async function login(email: string, password: string) {
    setLoading(true)
    setError(null)
    try {
      await signIn(email, password)
      // El Auth Guard en _layout.tsx gestiona la redirección automáticamente
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  async function register(email: string, password: string, fullName: string) {
    setLoading(true)
    setError(null)
    try {
      await signUp(email, password, fullName)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  async function logout() {
    setLoading(true)
    setError(null)
    try {
      await signOut()
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  return { user, role, loading, error, login, register, logout }
}
