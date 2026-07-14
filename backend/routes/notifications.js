const router = require('express').Router()
const Notification = require('../models/Notification')
const { requireAuth } = require('../middleware/auth')

// GET /api/notifications — the signed-in user's tray, newest first, with the
// current unseen count so the bell can render its badge in one round-trip.
router.get('/', requireAuth, async (req, res) => {
  try {
    const [items, unseen] = await Promise.all([
      Notification.listForUser(req.user._id, 30),
      Notification.unseenCount(req.user._id),
    ])
    res.json({ items, unseen })
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

// GET /api/notifications/unseen-count — cheap badge poll / fallback.
router.get('/unseen-count', requireAuth, async (req, res) => {
  try {
    res.json({ unseen: await Notification.unseenCount(req.user._id) })
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

// POST /api/notifications/seen { ids? } — mark the given notifications seen, or
// all of them when no ids are sent (opening the tray).
router.post('/seen', requireAuth, async (req, res) => {
  try {
    const ids = Array.isArray(req.body.ids) ? req.body.ids : null
    await Notification.markSeen(req.user._id, ids)
    res.json({ unseen: await Notification.unseenCount(req.user._id) })
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

module.exports = router
