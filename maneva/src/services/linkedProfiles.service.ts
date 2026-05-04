import { supabase } from '@/lib/supabase'
import { Database, Json } from '@/types/database.types'

type LinkedProfileRow = Database['public']['Tables']['linked_profiles']['Row']
type LinkedProfileInsert = Database['public']['Tables']['linked_profiles']['Insert']
type UserRow = Database['public']['Tables']['users']['Row']

export type LinkedProfilePermissions = {
  canCreate: boolean
  canModify: boolean
  relationLabel: string | null
}

export type LinkedProfileWithUser = {
  link: LinkedProfileRow
  user: UserRow
  permissions: LinkedProfilePermissions
}

function isJsonObject(value: Json): value is { [key: string]: Json | undefined } {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function toPermissions(value: Json): LinkedProfilePermissions {
  if (!isJsonObject(value)) {
    return { canCreate: true, canModify: true, relationLabel: null }
  }

  const canCreateValue = value.can_create
  const canModifyValue = value.can_modify
  const relationValue = value.relation_label

  return {
    canCreate: typeof canCreateValue === 'boolean' ? canCreateValue : true,
    canModify: typeof canModifyValue === 'boolean' ? canModifyValue : true,
    relationLabel: typeof relationValue === 'string' && relationValue.trim().length > 0 ? relationValue.trim() : null,
  }
}

function toPermissionsJson(permissions: LinkedProfilePermissions): Json {
  return {
    can_create: permissions.canCreate,
    can_modify: permissions.canModify,
    relation_label: permissions.relationLabel,
  }
}

async function getUsersByIds(ids: string[]): Promise<Record<string, UserRow>> {
  if (ids.length === 0) return {}

  const { data, error } = await supabase
    .from('users')
    .select('*')
    .in('id', ids)

  if (error) throw error

  const byId: Record<string, UserRow> = {}
  for (const user of data ?? []) {
    byId[user.id] = user
  }

  return byId
}

function sanitizePhone(phone: string): string {
  return phone.replace(/\s+/g, '')
}

export async function findUserByPhone(phone: string): Promise<UserRow | null> {
  const trimmed = phone.trim()
  const compact = sanitizePhone(trimmed)
  const candidates = Array.from(new Set([trimmed, compact]))

  const { data, error } = await supabase
    .from('users')
    .select('*')
    .in('phone', candidates)
    .is('deleted_at', null)
    .limit(1)
    .maybeSingle()

  if (error) throw error
  return data
}

export async function getProfilesWhoCanManageMe(primaryUserId: string): Promise<LinkedProfileWithUser[]> {
  const { data, error } = await supabase
    .from('linked_profiles')
    .select('*')
    .eq('primary_user_id', primaryUserId)
    .eq('active', true)
    .order('created_at', { ascending: false })

  if (error) throw error

  const links = data ?? []
  const secondaryIds = links.map((link) => link.secondary_user_id)
  const usersById = await getUsersByIds(secondaryIds)

  return links
    .map((link) => {
      const user = usersById[link.secondary_user_id]
      if (!user) return null

      return {
        link,
        user,
        permissions: toPermissions(link.permissions),
      }
    })
    .filter((item): item is LinkedProfileWithUser => item !== null)
}

export async function getProfilesManagedByMe(secondaryUserId: string): Promise<LinkedProfileWithUser[]> {
  const { data, error } = await supabase
    .from('linked_profiles')
    .select('*')
    .eq('secondary_user_id', secondaryUserId)
    .eq('active', true)
    .order('created_at', { ascending: false })

  if (error) throw error

  const links = data ?? []
  const primaryIds = links.map((link) => link.primary_user_id)
  const usersById = await getUsersByIds(primaryIds)

  return links
    .map((link) => {
      const user = usersById[link.primary_user_id]
      if (!user) return null

      return {
        link,
        user,
        permissions: toPermissions(link.permissions),
      }
    })
    .filter((item): item is LinkedProfileWithUser => item !== null)
}

export async function addProfileManagerByPhone(params: {
  primaryUserId: string
  phone: string
  relationLabel?: string
  canModify: boolean
}): Promise<void> {
  const relationLabel = params.relationLabel?.trim() || null
  const targetUser = await findUserByPhone(params.phone)

  if (!targetUser) {
    throw new Error('Non existe un usuario rexistrado con ese teléfono.')
  }

  if (targetUser.id === params.primaryUserId) {
    throw new Error('No puedes asignarte permisos a ti mismo.')
  }

  const { data: existing, error: existingError } = await supabase
    .from('linked_profiles')
    .select('*')
    .eq('primary_user_id', params.primaryUserId)
    .eq('secondary_user_id', targetUser.id)
    .limit(1)
    .maybeSingle()

  if (existingError) throw existingError

  const nextPermissions: LinkedProfilePermissions = {
    canCreate: true,
    canModify: params.canModify,
    relationLabel,
  }

  if (existing) {
    const { error: updateError } = await supabase
      .from('linked_profiles')
      .update({
        active: true,
        permissions: toPermissionsJson(nextPermissions),
      })
      .eq('id', existing.id)

    if (updateError) throw updateError
    return
  }

  const payload: LinkedProfileInsert = {
    primary_user_id: params.primaryUserId,
    secondary_user_id: targetUser.id,
    active: true,
    permissions: toPermissionsJson(nextPermissions),
  }

  const { error: insertError } = await supabase
    .from('linked_profiles')
    .insert(payload)

  if (insertError) throw insertError
}

export async function updateLinkedProfilePermissions(params: {
  linkedProfileId: string
  canModify: boolean
  relationLabel?: string | null
}): Promise<void> {
  const relationLabel = params.relationLabel?.trim() || null
  const nextPermissions: LinkedProfilePermissions = {
    canCreate: true,
    canModify: params.canModify,
    relationLabel,
  }

  const { error } = await supabase
    .from('linked_profiles')
    .update({ permissions: toPermissionsJson(nextPermissions) })
    .eq('id', params.linkedProfileId)

  if (error) throw error
}

export async function deactivateLinkedProfile(linkedProfileId: string): Promise<void> {
  const { error } = await supabase
    .from('linked_profiles')
    .update({ active: false })
    .eq('id', linkedProfileId)

  if (error) throw error
}

export function formatPermissionsLabel(permissions: LinkedProfilePermissions): string {
  if (permissions.canCreate && permissions.canModify) return 'Crear e modificar'
  if (permissions.canCreate) return 'Crear'
  return 'Sen permisos'
}
