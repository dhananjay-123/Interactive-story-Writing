const router = require('express').Router()
const bcrypt = require('bcryptjs')
const User = require('../models/User')
const { sign, requireAuth } = require('../middleware/auth')

const USERNAME_RE = /^[a-zA-Z0-9_]{3,20}$/
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

// POST /api/auth/register
router.post('/register', async (req, res) => {
  const { username, email, password, displayName, bio } = req.body || {}

  if (!username || !email || !password) {
    return res.status(400).json({ message: 'Username, email, and password are required.' })
  }
  if (!USERNAME_RE.test(username)) {
    return res.status(400).json({ message: 'Username must be 3–20 letters, numbers, or underscores.' })
  }
  if (!EMAIL_RE.test(email)) {
    return res.status(400).json({ message: 'Enter a valid email address.' })
  }
  if (password.length < 8) {
    return res.status(400).json({ message: 'Password must be at least 8 characters.' })
  }

  try {
    const taken = await User.usernameOrEmailTaken(username, email)
    if (taken.username) return res.status(409).json({ message: 'That username is taken.' })
    if (taken.email) return res.status(409).json({ message: 'That email is already registered.' })

    const passwordHash = await bcrypt.hash(password, 10)
    const user = await User.create({ username, email, passwordHash, displayName, bio })
    res.status(201).json({ token: sign(user), user })
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

// POST /api/auth/login
router.post('/login', async (req, res) => {
  const { email, password } = req.body || {}
  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password are required.' })
  }

  try {
    const record = await User.findByEmailWithHash(email)
    // Same response for unknown email and wrong password — don't leak which failed.
    const ok = record && (await bcrypt.compare(password, record.passwordHash))
    if (!ok) return res.status(401).json({ message: 'Incorrect email or password.' })

    const { passwordHash, ...user } = record
    res.json({ token: sign(user), user })
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

// GET /api/auth/me
router.get('/me', requireAuth, (req, res) => {
  res.json({ user: req.user })
})

// PUT /api/auth/me/avatar — set or clear the signed-in user's profile picture.
router.put('/me/avatar', requireAuth, async (req, res) => {
  let { avatarUrl } = req.body || {}
  if (avatarUrl === '' || avatarUrl == null) {
    avatarUrl = null
  } else if (
    typeof avatarUrl !== 'string' ||
    avatarUrl.length > 400 ||
    !/^https:\/\/res\.cloudinary\.com\//.test(avatarUrl)
  ) {
    return res.status(400).json({ message: 'Invalid image URL.' })
  }
  try {
    const user = await User.setAvatar(req.user._id, avatarUrl)
    res.json({ user })
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

module.exports = router
