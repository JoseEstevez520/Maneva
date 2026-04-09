import { supabase } from '@/lib/supabase'

export async function signIn(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) throw error
  return data
}

export async function signUp(email: string, password: string, fullName: string) {
  // Separar nombre y apellido para el trigger de la base de datos
  const [firstName, ...lastNameParts] = fullName.split(' ')
  const lastName = lastNameParts.join(' ') || ''

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { 
      data: { 
        first_name: firstName,
        last_name: lastName,
        full_name: fullName // Mantenemos full_name por si acaso
      } 
    },
  })
  if (error) throw error
  return data
}

export async function signOut() {
  const { error } = await supabase.auth.signOut()
  if (error) throw error
}

export async function getSession() {
  const { data, error } = await supabase.auth.getSession()
  if (error) throw error
  return data.session
}

export async function getProfile(userId: string) {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', userId)
    .single()
  if (error) throw error
  return data
}
