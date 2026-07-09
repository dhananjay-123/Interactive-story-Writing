const router = require('express').Router()
const bcrypt = require('bcryptjs')
const Story = require('../models/Story')
const User = require('../models/User')
const Report = require('../models/Report')
const PasswordRequest = require('../models/PasswordRequest')
const { validatePassword } = require('../utils/password')
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
    const { q, filter, authorId } = req.query
    res.json(await Story.findAllForAdmin({ q, filter, authorId }))
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

// GET /api/admin/users/:id — one account in full, with its stories.
router.get('/users/:id', async (req, res) => {
  try {
    const user = await User.findByIdForAdmin(req.params.id)
    if (!user) return res.status(404).json({ message: 'User not found' })
    const stories = await Story.findAllForAdmin({ authorId: user._id })
    res.json({ user, stories })
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

// PUT /api/admin/users/:id/ban  { banned: bool, reason?: string }
// Suspending signs the account out everywhere and blocks future logins. Their
// stories stay up — hide or delete those separately from the Stories tab.
router.put('/users/:id/ban', async (req, res) => {
  const { banned, reason } = req.body || {}
  if (typeof banned !== 'boolean') {
    return res.status(400).json({ message: 'banned must be true or false.' })
  }
  if (reason != null && (typeof reason !== 'string' || reason.length > 300)) {
    return res.status(400).json({ message: 'Reason is too long.' })
  }
  if (req.params.id === req.user._id) {
    return res.status(400).json({ message: "You can't suspend your own account." })
  }
  try {
    const user = await User.findById(req.params.id)
    if (!user) return res.status(404).json({ message: 'User not found' })
    // Admins can't ban each other — demote first. Stops two admins from locking
    // one another out of the platform in a race.
    if (banned && user.role === 'admin') {
      return res.status(400).json({ message: 'Revoke admin access before suspending this account.' })
    }
    res.json(await User.setBanned(user._id, banned, reason))
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

// PUT /api/admin/users/:id/password  { newPassword, requestId? }
// Sets a password on any account. The reset stamps password_changed_at, which
// signs the target out of every device — they must sign in with the new one.
router.put('/users/:id/password', async (req, res) => {
  const { newPassword, requestId } = req.body || {}
  const pwError = validatePassword(newPassword)
  if (pwError) return res.status(400).json({ message: pwError })

  try {
    const user = await User.findById(req.params.id)
    if (!user) return res.status(404).json({ message: 'User not found' })

    await User.setPassword(user._id, await bcrypt.hash(newPassword, 10))
    // Close the matching request (and any other open one for this account).
    await PasswordRequest.resolveForUser(user._id, req.user._id)
    if (requestId) {
      const request = await PasswordRequest.findById(requestId)
      if (request && request.status === 'pending') {
        await PasswordRequest.resolve(requestId, 'resolved', req.user._id)
      }
    }
    res.json({ message: `Password reset for ${user.username}.` })
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

// ── Password reset requests ──────────────────────────────────────────────────

// GET /api/admin/password-requests?status=pending|resolved|dismissed|all
router.get('/password-requests', async (req, res) => {
  try {
    res.json(await PasswordRequest.listAll(req.query.status || 'pending'))
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

// PUT /api/admin/password-requests/:id  { status: 'dismissed' | 'resolved' }
router.put('/password-requests/:id', async (req, res) => {
  const { status } = req.body || {}
  if (status !== 'resolved' && status !== 'dismissed') {
    return res.status(400).json({ message: 'Status must be resolved or dismissed.' })
  }
  try {
    const updated = await PasswordRequest.resolve(req.params.id, status, req.user._id)
    if (!updated) return res.status(404).json({ message: 'Request not found' })
    res.json(updated)
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
