const router = require('express').Router()
const bcrypt = require('bcryptjs')
const User = require('../models/User')
const PasswordRequest = require('../models/PasswordRequest')
const { validatePassword } = require('../utils/password')
const { sign, requireAuth } = require('../middleware/auth')
const achievements = require('../achievements')

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
  const pwError = validatePassword(password)
  if (pwError) return res.status(400).json({ message: pwError })

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

    // Only tell a suspended user after they've proven the password: otherwise
    // the message reveals that the address is registered.
    if (record.banned) {
      return res.status(403).json({ message: 'This account has been suspended.' })
    }

    const { passwordHash, ...user } = record
    // A login counts as a day of activity, keeping reading streaks alive.
    achievements.emit(user._id, 'DAILY_ACTIVE')
    res.json({ token: sign(user), user })
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

// GET /api/auth/me
router.get('/me', requireAuth, (req, res) => {
  res.json({ user: req.user })
})

// PUT /api/auth/me/password — change your own password, proving you know the old one.
router.put('/me/password', requireAuth, async (req, res) => {
  const { currentPassword, newPassword } = req.body || {}
  if (!currentPassword) {
    return res.status(400).json({ message: 'Enter your current password.' })
  }
  const pwError = validatePassword(newPassword)
  if (pwError) return res.status(400).json({ message: pwError })
  if (currentPassword === newPassword) {
    return res.status(400).json({ message: 'The new password must be different.' })
  }

  try {
    const record = await User.findByIdWithHash(req.user._id)
    const ok = record && (await bcrypt.compare(currentPassword, record.passwordHash))
    if (!ok) return res.status(401).json({ message: 'Current password is incorrect.' })

    const user = await User.setPassword(req.user._id, await bcrypt.hash(newPassword, 10))
    // Changing the password invalidates every earlier token, including the one
    // that authorised this call — hand back a fresh one so the tab stays alive.
    res.json({ token: sign(user), user })
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

// POST /api/auth/password-request — locked out: ask an admin to set a new password.
// Always answers the same way, so this can't be used to discover which emails exist.
router.post('/password-request', async (req, res) => {
  const { email, note } = req.body || {}
  const accepted = { message: 'If that account exists, an admin will review your request.' }

  if (!email || !EMAIL_RE.test(email)) {
    return res.status(400).json({ message: 'Enter a valid email address.' })
  }
  if (note != null && (typeof note !== 'string' || note.length > 500)) {
    return res.status(400).json({ message: 'Message is too long.' })
  }

  try {
    const record = await User.findByEmailWithHash(email)
    // No account, or one request already pending — same response either way.
    if (record) await PasswordRequest.create({ userId: record._id, note: note?.trim() || null })
    res.json(accepted)
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
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
