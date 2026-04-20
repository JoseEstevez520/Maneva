import { supabase } from '@/lib/supabase'

/**
 * Devuelve la URL pública de un media_id, o null si no existe.
 */
export async function getMediaUrl(mediaId: string): Promise<string | null> {
  const { data, error } = await supabase
    .from('media')
    .select('media_url')
    .eq('id', mediaId)
    .single()

  if (error) return null
  return data?.media_url ?? null
}
