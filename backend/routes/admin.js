const router = require('express').Router()
const Story = require('../models/Story')
const User = require('../models/User')
const Report = require('../models/Report')
const { requireAuth, requireAdmin } = require('../middleware/auth')

// Every route here is admin-only.
router.use(requireAuth, requireAdmin)

// ── Analytics ────────────────────────────────────────────────────────────────

// GET /api/admin/stats — platform-wide totals + breakdowns for the dashboard.
router.get('/stats', async (req, res) => {
  try {
    const [totals, genres, top] = await Promise.all([
      Story.adminStats(),
      Story.genreBreakdown(),
      Story.topStories(5),
    ])
    res.json({ totals, genres, topStories: top })
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

// ── Story moderation ─────────────────────────────────────────────────────────

// GET /api/admin/stories?q=&filter=  — all stories (incl. unpublished).
router.get('/stories', async (req, res) => {
  try {
    const { q, filter } = req.query
    res.json(await Story.findAllForAdmin({ q, filter }))
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

// PUT /api/admin/stories/:id/featured  { featured: bool } — curate the home rail.
router.put('/stories/:id/featured', async (req, res) => {
  try {
    const story = await Story.findById(req.params.id)
    if (!story) return res.status(404).json({ message: 'Story not found' })
    const updated = await Story.setFeatured(req.params.id, !!req.body.featured)
    res.json(updated)
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

// PUT /api/admin/stories/:id/published  { published: bool } — hide/restore.
router.put('/stories/:id/published', async (req, res) => {
  try {
    const story = await Story.findById(req.params.id)
    if (!story) return res.status(404).json({ message: 'Story not found' })
    const updated = await Story.setPublished(req.params.id, !!req.body.published)
    res.json(updated)
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

// DELETE /api/admin/stories/:id — remove any story (nodes cascade).
router.delete('/stories/:id', async (req, res) => {
  try {
    const story = await Story.findById(req.params.id)
    if (!story) return res.status(404).json({ message: 'Story not found' })
    await Story.remove(req.params.id)
    res.json({ message: 'Deleted' })
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

// ── User management ──────────────────────────────────────────────────────────

// GET /api/admin/users — full roster with story counts.
router.get('/users', async (req, res) => {
  try {
    res.json(await User.listAllForAdmin())
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

// PUT /api/admin/users/:id/role  { role: 'admin' | 'author' }
router.put('/users/:id/role', async (req, res) => {
  const { role } = req.body || {}
  if (role !== 'admin' && role !== 'author') {
    return res.status(400).json({ message: 'Role must be admin or author.' })
  }
  if (req.params.id === req.user._id && role !== 'admin') {
    return res.status(400).json({ message: "You can't remove your own admin access." })
  }
  try {
    const user = await User.findById(req.params.id)
    if (!user) return res.status(404).json({ message: 'User not found' })
    res.json(await User.setRole(req.params.id, role))
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

// ── Reports ──────────────────────────────────────────────────────────────────

// GET /api/admin/reports?status=open|resolved|dismissed|all
router.get('/reports', async (req, res) => {
  try {
    res.json(await Report.listAll(req.query.status || 'open'))
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

// PUT /api/admin/reports/:id  { status: 'resolved' | 'dismissed' }
router.put('/reports/:id', async (req, res) => {
  const { status } = req.body || {}
  if (status !== 'resolved' && status !== 'dismissed') {
    return res.status(400).json({ message: 'Status must be resolved or dismissed.' })
  }
  try {
    const updated = await Report.resolve(req.params.id, status, req.user._id)
    if (!updated) return res.status(404).json({ message: 'Report not found' })
    res.json(updated)
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

module.exports = router
