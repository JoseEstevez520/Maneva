import { useState } from 'react'

// TODO: Conectar con auth.service y authStore cuando Supabase esté configurado
export function useAuth() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function login(_email: string, _password: string) {
    // TODO
  }

  async function register(_email: string, _password: string) {
    // TODO
  }

  async function logout() {
    // TODO
  }

  return { user: null, role: null, loading, error, login, register, logout }
}
