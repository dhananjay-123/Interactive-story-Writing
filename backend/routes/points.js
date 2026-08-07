const router = require('express').Router()
const User = require('../models/User')
const points = require('../points')
const { requireAuth } = require('../middleware/auth')

// GET /api/points/me — the signed-in reader's balance and recent earnings.
router.get('/me', requireAuth, async (req, res) => {
  try {
    const [balance, ledger] = await Promise.all([
      points.balance(req.user._id),
      points.ledger(req.user._id, 20),
    ])
    res.json({ points: balance, ledger })
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

// GET /api/points/leaderboard — the platform-wide standings.
router.get('/leaderboard', async (req, res) => {
  try {
    res.json(await points.leaderboard(10))
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

// GET /api/points/user/:username — a public balance, for profiles. The ledger
// stays private; only the total is anyone else's business.
router.get('/user/:username', async (req, res) => {
  try {
    const user = await User.findByUsername(req.params.username)
    if (!user) return res.status(404).json({ message: 'User not found' })
    res.json({ points: await points.balance(user._id) })
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

module.exports = router
