import imageCompression from 'browser-image-compression'
import api from './client'

// Shrinks an image in the browser, then uploads it straight to Cloudinary
// using a signature from our backend — the bytes never touch our server.
// Returns a CDN URL that serves the best format and size per reader.
export async function uploadImage(file) {
  if (!file.type.startsWith('image/')) {
    throw new Error('Please choose an image file.')
  }

  const compressed = await imageCompression(file, {
    maxWidthOrHeight: 1600,
    maxSizeMB: 0.4,
    fileType: 'image/webp',
    useWebWorker: true,
  })

  const { data: sig } = await api.post('/api/uploads/sign')

  const form = new FormData()
  form.append('file', compressed, 'passage.webp')
  form.append('api_key', sig.apiKey)
  form.append('timestamp', sig.timestamp)
  form.append('signature', sig.signature)
  form.append('folder', sig.folder)

  const res = await fetch(`https://api.cloudinary.com/v1_1/${sig.cloudName}/image/upload`, {
    method: 'POST',
    body: form,
  })
  if (!res.ok) throw new Error('The image could not be uploaded.')
  const uploaded = await res.json()

  // f_auto/q_auto lets the CDN pick AVIF or WebP per browser; w_1200 caps width.
  // publicId lets the editor clean up images that never make it into a saved passage.
  return {
    url: uploaded.secure_url.replace('/upload/', '/upload/f_auto,q_auto,w_1200,c_limit/'),
    publicId: uploaded.public_id,
  }
}

// Recovers a Cloudinary public_id from one of our delivery URLs, so a replaced
// image (e.g. an old profile picture) can be cleaned up. Returns null if it
// doesn't look like one of ours.
export function publicIdFromUrl(url) {
  try {
    const after = String(url).split('/upload/')[1]
    if (!after) return null
    const parts = after.split('/')
    // Drop leading transformation (contains a comma) and version (v123) segments.
    while (parts.length > 1 && (parts[0].includes(',') || /^v\d+$/.test(parts[0]))) parts.shift()
    return parts.join('/').replace(/\.[a-z0-9]+$/i, '') || null
  } catch {
    return null
  }
}

// Best-effort removal of orphaned uploads (images added to the editor but never
// saved into a passage). Failures are swallowed — cleanup shouldn't block anything.
export async function deleteImages(publicIds) {
  const ids = (publicIds || []).filter(Boolean)
  if (!ids.length) return
  try {
    await api.post('/api/uploads/delete', { publicIds: ids })
  } catch {
    /* ignore — a leftover image is harmless, and this is a background cleanup */
  }
}
