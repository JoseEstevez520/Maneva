import { supabase } from '@/lib/supabase'

/**
 * Sube un archivo al bucket indicado y devuelve la URL pública.
 * @param bucket  Nombre del bucket de Supabase Storage
 * @param path    Ruta dentro del bucket (ej: "userId/foto.jpg")
 * @param uri     URI local del archivo (resultado de expo-image-picker)
 * @param mimeType Tipo MIME del archivo (ej: "image/jpeg")
 */
export async function uploadFile(
  bucket: string,
  path: string,
  uri: string,
  mimeType: string = 'image/jpeg',
): Promise<string> {
  const formData = new FormData()
  formData.append('file', {
    uri,
    type: mimeType,
    name: path.split('/').pop() ?? 'upload',
  } as unknown as Blob)

  const { error } = await supabase.storage
    .from(bucket)
    .upload(path, formData, { contentType: mimeType, upsert: true })

  if (error) throw new Error(error.message)

  const { data } = supabase.storage.from(bucket).getPublicUrl(path)
  return data.publicUrl
}

/**
 * Elimina un archivo del bucket indicado.
 * @param bucket Nombre del bucket
 * @param path   Ruta dentro del bucket
 */
export async function deleteFile(bucket: string, path: string): Promise<void> {
  const { error } = await supabase.storage.from(bucket).remove([path])
  if (error) throw new Error(error.message)
}
