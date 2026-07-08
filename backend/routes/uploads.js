const router = require('express').Router()
const cloudinary = require('cloudinary').v2
const { requireAuth } = require('../middleware/auth')

// Hands a signed-in author a short-lived signature so the browser can upload
// straight to Cloudinary — image bytes never pass through this server.
router.post('/sign', requireAuth, (req, res) => {
  const { CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET } = process.env
  if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_API_KEY || !CLOUDINARY_API_SECRET) {
    return res.status(503).json({ message: 'Image uploads are not configured yet.' })
  }

  const timestamp = Math.round(Date.now() / 1000)
  const folder = 'inkwell'
  const signature = cloudinary.utils.api_sign_request({ timestamp, folder }, CLOUDINARY_API_SECRET)

  res.json({
    timestamp,
    folder,
    signature,
    apiKey: CLOUDINARY_API_KEY,
    cloudName: CLOUDINARY_CLOUD_NAME,
  })
})

module.exports = router
