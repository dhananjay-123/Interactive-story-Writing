const jwt = require('jsonwebtoken')
const User = require('../models/User')

const SECRET = process.env.JWT_SECRET || 'dev-secret-change-me'

const sign = (user) =>
  jwt.sign({ sub: user._id, username: user.username, role: user.role }, SECRET, {
    expiresIn: '7d',
  })

const readToken = (req) => {
  const header = req.headers.authorization || ''
  return header.startsWith('Bearer ') ? header.slice(7) : null
}

// A token minted before the account's last password change is dead. `iat` has
// one-second resolution, so allow a second of slack: the token handed back by a
// self-serve change is signed in the same second it stamps password_changed_at.
const STALE_SLACK_MS = 1000
const outlivedPassword = (payload, user) => {
  if (!user.passwordChangedAt || !payload.iat) return false
  return payload.iat * 1000 < new Date(user.passwordChangedAt).getTime() - STALE_SLACK_MS
}

// Rejects the request when no valid token is present.
const requireAuth = async (req, res, next) => {
  const token = readToken(req)
  if (!token) return res.status(401).json({ message: 'Sign in to continue.' })
  try {
    const payload = jwt.verify(token, SECRET)
    const user = await User.findById(payload.sub)
    if (!user) return res.status(401).json({ message: 'Session expired.' })
    if (outlivedPassword(payload, user)) {
      return res.status(401).json({ message: 'Your password changed. Sign in again.' })
    }
    // A suspension takes effect immediately, not when the token expires.
    if (user.banned) return res.status(403).json({ message: 'This account is suspended.' })
    req.user = user
    next()
  } catch {
    res.status(401).json({ message: 'Invalid or expired session.' })
  }
}

// Gate for admin-only routes. Chain after requireAuth so req.user is populated.
const requireAdmin = (req, res, next) => {
  if (!req.user) return res.status(401).json({ message: 'Sign in to continue.' })
  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Admin access required.' })
  }
  next()
}

// Attaches req.user when a token is present, but never blocks the request.
const optionalAuth = async (req, res, next) => {
  const token = readToken(req)
  if (token) {
    try {
      const payload = jwt.verify(token, SECRET)
      const user = await User.findById(payload.sub)
      if (user && !user.banned && !outlivedPassword(payload, user)) req.user = user
    } catch {
      /* ignore — treat as anonymous */
    }
  }
  next()
}

module.exports = { sign, requireAuth, requireAdmin, optionalAuth }
