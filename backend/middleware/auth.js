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

// Rejects the request when no valid token is present.
const requireAuth = async (req, res, next) => {
  const token = readToken(req)
  if (!token) return res.status(401).json({ message: 'Sign in to continue.' })
  try {
    const payload = jwt.verify(token, SECRET)
    const user = await User.findById(payload.sub)
    if (!user) return res.status(401).json({ message: 'Session expired.' })
    req.user = user
    next()
  } catch {
    res.status(401).json({ message: 'Invalid or expired session.' })
  }
}

// Attaches req.user when a token is present, but never blocks the request.
const optionalAuth = async (req, res, next) => {
  const token = readToken(req)
  if (token) {
    try {
      const payload = jwt.verify(token, SECRET)
      req.user = await User.findById(payload.sub)
    } catch {
      /* ignore — treat as anonymous */
    }
  }
  next()
}

module.exports = { sign, requireAuth, optionalAuth }
