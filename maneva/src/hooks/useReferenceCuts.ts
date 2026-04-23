import { useCallback, useEffect, useState } from 'react'
import * as ImagePicker from 'expo-image-picker'
import { useAuthStore } from '@/store/authStore'
import { getReferenceCuts, addReferenceCut, removeReferenceCut } from '@/services/users.service'
import { uploadFile, deleteFile } from '@/services/storage.service'

const BUCKET = 'reference-cuts'

function storagePathFromUrl(url: string): string | null {
  // La URL pública tiene el formato: .../storage/v1/object/public/<bucket>/<path>
  const marker = `/public/${BUCKET}/`
  const idx = url.indexOf(marker)
  if (idx === -1) return null
  return url.slice(idx + marker.length)
}

export function useReferenceCuts() {
  const { user } = useAuthStore()
  const [cuts, setCuts] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchCuts = useCallback(async () => {
    if (!user) return
    setLoading(true)
    setError(null)
    try {
      const urls = await getReferenceCuts(user.id)
      setCuts(urls)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error cargando cortes')
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => {
    fetchCuts()
  }, [fetchCuts])

  const pickAndUpload = async (): Promise<void> => {
    if (!user) return

    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync()
    if (!permission.granted) {
      setError('Se necesita permiso para acceder a la galería.')
      return
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 5],
      quality: 0.8,
    })

    if (result.canceled) return

    const asset = result.assets[0]
    setUploading(true)
    setError(null)
    try {
      const ext = asset.uri.split('.').pop() ?? 'jpg'
      const path = `${user.id}/${Date.now()}.${ext}`
      const mimeType = asset.mimeType ?? 'image/jpeg'

      const publicUrl = await uploadFile(BUCKET, path, asset.uri, mimeType)
      await addReferenceCut(user.id, publicUrl)
      setCuts((prev) => [...prev, publicUrl])
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error subiendo imagen')
    } finally {
      setUploading(false)
    }
  }

  const remove = async (url: string): Promise<void> => {
    if (!user) return
    // Actualización optimista
    setCuts((prev) => prev.filter((u) => u !== url))
    try {
      await removeReferenceCut(user.id, url)
      // Intentar borrar del storage (fallo silencioso si la ruta no coincide)
      const path = storagePathFromUrl(url)
      if (path) await deleteFile(BUCKET, path).catch(() => {})
    } catch (e: unknown) {
      setCuts((prev) => [...prev, url])
      setError(e instanceof Error ? e.message : 'Error eliminando imagen')
    }
  }

  return { cuts, loading, uploading, error, pickAndUpload, remove }
}
