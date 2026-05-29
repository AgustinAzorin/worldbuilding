import { createClient } from './client'

const BUCKET = 'article-assets'
const MAX_BYTES = 10 * 1024 * 1024 // 10 MB
const ALLOWED = ['image/png', 'image/jpeg', 'image/webp', 'image/gif', 'image/svg+xml']

export interface UploadedImage {
  url: string
  path: string
}

function randomId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID()
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`
}

function sanitizeName(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(-80)
}

/**
 * Sube una imagen al bucket público `map-images` y devuelve su URL pública.
 */
export async function uploadMapImage(
  worldId: string,
  file: File,
): Promise<UploadedImage> {
  if (!ALLOWED.includes(file.type)) {
    throw new Error(`Tipo de archivo no soportado: ${file.type || 'desconocido'}`)
  }
  if (file.size > MAX_BYTES) {
    throw new Error(`La imagen supera ${Math.round(MAX_BYTES / 1024 / 1024)} MB`)
  }

  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Debés iniciar sesión para subir imágenes')

  const path = `${user.id}/${worldId}/${randomId()}-${sanitizeName(file.name)}`

  const { error } = await supabase.storage
    .from('map-images')
    .upload(path, file, {
      cacheControl: '3600',
      contentType: file.type,
      upsert: false,
    })

  if (error) throw new Error(error.message)

  const { data } = supabase.storage.from('map-images').getPublicUrl(path)
  return { url: data.publicUrl, path }
}

/**
 * Sube una imagen al bucket público `article-assets` y devuelve su URL pública.
 * Lanza si el archivo excede el límite o el MIME no está permitido.
 */
export async function uploadArticleImage(
  worldId: string,
  file: File,
): Promise<UploadedImage> {
  if (!ALLOWED.includes(file.type)) {
    throw new Error(`Tipo de archivo no soportado: ${file.type || 'desconocido'}`)
  }
  if (file.size > MAX_BYTES) {
    throw new Error(`La imagen supera ${Math.round(MAX_BYTES / 1024 / 1024)} MB`)
  }

  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Debés iniciar sesión para subir imágenes')

  const path = `${user.id}/${worldId}/${randomId()}-${sanitizeName(file.name)}`

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, {
      cacheControl: '3600',
      contentType: file.type,
      upsert: false,
    })

  if (error) throw new Error(error.message)

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path)
  return { url: data.publicUrl, path }
}
