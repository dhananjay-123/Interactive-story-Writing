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
  return uploaded.secure_url.replace('/upload/', '/upload/f_auto,q_auto,w_1200,c_limit/')
}
