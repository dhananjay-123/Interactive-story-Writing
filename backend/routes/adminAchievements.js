const router = require('express').Router()
const db = require('../db')
const User = require('../models/User')
const achievements = require('../achievements')
const { requireAuth, requireAdmin } = require('../middleware/auth')

// Everything here is admin-only.
router.use(requireAuth, requireAdmin)

// ── Analytics & catalogue ─────────────────────────────────────────────────────

// GET /api/admin/achievements/overview — dashboard metrics + per-badge holders.
router.get('/overview', async (req, res) => {
  try {
    const [overview, badges, tiers] = await Promise.all([
      achievements.analytics.overview(),
      achievements.analytics.badgeBreakdown(),
      achievements.analytics.tierDistribution(),
    ])
    res.json({ overview, badges, tiers })
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

// GET /api/admin/achievements/catalog — full definitions for preview/creation UI.
router.get('/catalog', (req, res) => res.json(achievements.publicCatalog()))

// GET /api/admin/achievements/audit?targetUserId=&limit=&offset=
router.get('/audit', async (req, res) => {
  try {
    const { targetUserId } = req.query
    const limit = Math.min(Number(req.query.limit) || 50, 200)
    const offset = Math.max(Number(req.query.offset) || 0, 0)
    res.json(await achievements.store.listAudit({ targetUserId: targetUserId || null, limit, offset }))
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

// ── Per-user management ───────────────────────────────────────────────────────

// Resolve :id to a user or reply 404. Accepts a UUID or a username for convenience.
const loadTarget = async (id) => {
  const byId = /^[0-9a-f-]{36}$/i.test(id) ? await User.findById(id) : null
  return byId || (await User.findByUsername(id))
}

// GET /api/admin/achievements/users/:id — full achievement view of one user,
// plus their recent timeline and the audit trail against them.
router.get('/users/:id', async (req, res) => {
  try {
    const target = await loadTarget(req.params.id)
    if (!target) return res.status(404).json({ message: 'User not found' })
    const [profile, timeline, audit] = await Promise.all([
      achievements.buildSelfProfile(target._id),
      achievements.store.listTimeline(target._id, { limit: 30 }),
      achievements.store.listAudit({ targetUserId: target._id, limit: 30 }),
    ])
    res.json({ user: { _id: target._id, username: target.username, displayName: target.displayName }, profile, timeline, audit })
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

const withTarget = (handler) => async (req, res) => {
  try {
    const target = await loadTarget(req.params.id)
    if (!target) return res.status(404).json({ message: 'User not found' })
    await handler(req, res, target)
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
}

// POST .../grant  { badgeId, note? }
router.post('/users/:id/grant', withTarget(async (req, res, target) => {
  const { badgeId, note } = req.body || {}
  if (!badgeId) return res.status(400).json({ message: 'badgeId is required.' })
  const result = await achievements.admin.grantBadge(req.user._id, target._id, badgeId, { note })
  if (!result.ok) return res.status(400).json({ message: 'Unknown badge.' })
  res.json(result)
}))

// POST .../revoke  { badgeId }
router.post('/users/:id/revoke', withTarget(async (req, res, target) => {
  const { badgeId } = req.body || {}
  if (!badgeId) return res.status(400).json({ message: 'badgeId is required.' })
  res.json(await achievements.admin.revokeBadge(req.user._id, target._id, badgeId))
}))

// POST .../freeze  { badgeId, frozen }
router.post('/users/:id/freeze', withTarget(async (req, res, target) => {
  const { badgeId, frozen } = req.body || {}
  if (!badgeId) return res.status(400).json({ message: 'badgeId is required.' })
  res.json(await achievements.admin.setFrozen(req.user._id, target._id, badgeId, !!frozen))
}))

// POST .../feature  { badgeId, featured }
router.post('/users/:id/feature', withTarget(async (req, res, target) => {
  const { badgeId, featured } = req.body || {}
  if (!badgeId) return res.status(400).json({ message: 'badgeId is required.' })
  res.json(await achievements.admin.setFeatured(req.user._id, target._id, badgeId, !!featured))
}))

// POST .../tier  { trackId, tierId }
router.post('/users/:id/tier', withTarget(async (req, res, target) => {
  const { trackId, tierId } = req.body || {}
  if (!trackId || !tierId) return res.status(400).json({ message: 'trackId and tierId are required.' })
  const result = await achievements.admin.assignTier(req.user._id, target._id, trackId, tierId)
  if (!result.ok) return res.status(400).json({ message: 'Unknown track or tier.' })
  res.json(result)
}))

// POST .../reset — wipe computed state (manual grants preserved).
router.post('/users/:id/reset', withTarget(async (req, res, target) => {
  res.json(await achievements.admin.resetProgress(req.user._id, target._id))
}))

// POST .../recalculate — rebuild from source.
router.post('/users/:id/recalculate', withTarget(async (req, res, target) => {
  res.json(await achievements.admin.recalculate(req.user._id, target._id))
}))

// POST /api/admin/achievements/recalculate-all — bulk rebuild. Sequential to stay
// gentle on the connection pool; audited once per user by the engine.
router.post('/recalculate-all', async (req, res) => {
  try {
    const { rows } = await db.query('SELECT id FROM users ORDER BY created_at ASC')
    let processed = 0
    for (const r of rows) {
      await achievements.recomputeUser(r.id, { actorId: req.user._id })
      processed++
    }
    res.json({ ok: true, processed })
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

module.exports = router
