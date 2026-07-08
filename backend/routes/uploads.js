const router = require('express').Router()
const cloudinary = require('cloudinary').v2
const { requireAuth } = require('../middleware/auth')

// Returns the Cloudinary credentials, or null if they aren't configured yet.
const credentials = () => {
  const { CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET } = process.env
  if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_API_KEY || !CLOUDINARY_API_SECRET) return null
  return { CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET }
}

// Hands a signed-in author a short-lived signature so the browser can upload
// straight to Cloudinary — image bytes never pass through this server.
router.post('/sign', requireAuth, (req, res) => {
  const env = credentials()
  if (!env) return res.status(503).json({ message: 'Image uploads are not configured yet.' })

  const timestamp = Math.round(Date.now() / 1000)
  const folder = 'inkwell'
  const signature = cloudinary.utils.api_sign_request({ timestamp, folder }, env.CLOUDINARY_API_SECRET)

  res.json({
    timestamp,
    folder,
    signature,
    apiKey: env.CLOUDINARY_API_KEY,
    cloudName: env.CLOUDINARY_CLOUD_NAME,
  })
})

// Deletes images the author uploaded but never saved (or later removed), so
// abandoned uploads don't pile up in Cloudinary. Restricted to our own folder.
router.post('/delete', requireAuth, async (req, res) => {
  const env = credentials()
  if (!env) return res.status(503).json({ message: 'Image uploads are not configured yet.' })

  const ids = Array.isArray(req.body.publicIds) ? req.body.publicIds : []
  const safe = ids.filter(
    (id) => typeof id === 'string' && id.startsWith('inkwell/') && id.length < 200
  )
  if (!safe.length) return res.json({ deleted: 0 })

  cloudinary.config({
    cloud_name: env.CLOUDINARY_CLOUD_NAME,
    api_key: env.CLOUDINARY_API_KEY,
    api_secret: env.CLOUDINARY_API_SECRET,
  })

  try {
    await Promise.all(safe.map((id) => cloudinary.uploader.destroy(id).catch(() => null)))
    res.json({ deleted: safe.length })
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

module.exports = router
