const router = require('express').Router()
const User = require('../models/User')
const achievements = require('../achievements')
const { requireAuth, optionalAuth } = require('../middleware/auth')

const MAX_SHOWCASE = 8

// ── The signed-in user's own achievements ────────────────────────────────────

// GET /api/achievements/me — full profile: tiers, badge wall, stats, showcase.
router.get('/me', requireAuth, async (req, res) => {
  try {
    res.json(await achievements.buildSelfProfile(req.user._id))
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

// GET /api/achievements/me/timeline?limit=&offset= — paginated unlock history.
router.get('/me/timeline', requireAuth, async (req, res) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 20, 100)
    const offset = Math.max(Number(req.query.offset) || 0, 0)
    res.json(await achievements.store.listTimeline(req.user._id, { limit, offset }))
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

// GET /api/achievements/me/notifications — the notification centre.
router.get('/me/notifications', requireAuth, async (req, res) => {
  try {
    const [items, unseen] = await Promise.all([
      achievements.store.listNotifications(req.user._id, 20),
      achievements.store.unseenCount(req.user._id),
    ])
    res.json({ items, unseen })
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

// POST /api/achievements/me/notifications/seen  { ids?: [] } — mark read.
router.post('/me/notifications/seen', requireAuth, async (req, res) => {
  try {
    const ids = Array.isArray(req.body?.ids) ? req.body.ids : null
    await achievements.store.markSeen(req.user._id, ids)
    res.json({ ok: true })
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

// POST /api/achievements/me/active — lightweight daily heartbeat that advances the
// reading streak. The client calls this once per session, so streaks update
// without any polling.
router.post('/me/active', requireAuth, async (req, res) => {
  try {
    const result = await achievements.record(req.user._id, 'DAILY_ACTIVE')
    res.json({ ok: true, unlocked: result.badges.map((b) => b.id), tier: result.tier })
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

// PUT /api/achievements/me/showcase  { badgeIds: [] } — pin/reorder featured
// badges. Server-validated: you can only feature badges you actually hold.
router.put('/me/showcase', requireAuth, async (req, res) => {
  try {
    const ids = Array.isArray(req.body?.badgeIds) ? req.body.badgeIds.slice(0, MAX_SHOWCASE) : []
    const held = await achievements.store.unlockedIds(req.user._id)
    const invalid = ids.find((id) => !held.has(id))
    if (invalid) return res.status(400).json({ message: 'You can only showcase badges you have earned.' })
    await achievements.store.setShowcaseOrder(req.user._id, ids)
    res.json({ ok: true, showcase: ids })
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

// ── Public / shared ───────────────────────────────────────────────────────────

// GET /api/achievements/catalog — the full badge/tier/rarity catalogue (for the
// badge browser and admin preview). Public, cached in memory server-side.
router.get('/catalog', (req, res) => {
  res.json(achievements.publicCatalog())
})

// GET /api/achievements/leaderboard — the ranked boards.
router.get('/leaderboard', async (req, res) => {
  try {
    res.json(await achievements.leaderboard.all(10))
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

// GET /api/achievements/user/:username — a public achievement profile (earned
// badges, tiers, showcase). Progress on locked badges stays private.
router.get('/user/:username', optionalAuth, async (req, res) => {
  try {
    const user = await User.findByUsername(req.params.username)
    if (!user) return res.status(404).json({ message: 'User not found' })
    res.json(await achievements.buildPublicProfile(user._id))
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

module.exports = router
