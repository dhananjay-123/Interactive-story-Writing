const router = require('express').Router()
const Contest = require('../models/Contest')
const Story = require('../models/Story')
const { requireAuth, requireAdmin, optionalAuth } = require('../middleware/auth')

const GENRES = ['fantasy', 'mystery', 'sci_fi', 'romance', 'horror', 'thriller', 'literary']

// Guard: 404 unless the contest exists. Replies itself and returns null on miss.
const ensureContest = async (req, res) => {
  const contest = await Contest.findById(req.params.id)
  if (!contest) {
    res.status(404).json({ message: 'Contest not found' })
    return null
  }
  return contest
}

// ── Public ───────────────────────────────────────────────────────────────────

// GET /api/contests — every round, open first.
router.get('/', async (req, res) => {
  try {
    res.json(await Contest.list())
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

// GET /api/contests/:id — the round + its entry board, viewer-aware.
router.get('/:id', optionalAuth, async (req, res) => {
  try {
    const contest = await ensureContest(req, res)
    if (!contest) return
    const board = await Contest.entries(req.params.id, req.user ? req.user._id : null)
    res.json({ ...contest, entries: board })
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

// ── Admin ────────────────────────────────────────────────────────────────────

// POST /api/contests — open a new round.
router.post('/', requireAuth, requireAdmin, async (req, res) => {
  const { title, theme, genre, startsAt, endsAt } = req.body || {}
  if (!title?.trim()) return res.status(400).json({ message: 'Give the contest a title.' })
  if (genre && !GENRES.includes(genre)) return res.status(400).json({ message: 'Unknown genre.' })
  const ends = new Date(endsAt)
  if (!endsAt || Number.isNaN(ends.getTime())) {
    return res.status(400).json({ message: 'A valid end date is required.' })
  }
  if (ends <= new Date(startsAt || Date.now())) {
    return res.status(400).json({ message: 'The contest must end after it starts.' })
  }

  try {
    const contest = await Contest.create({
      title: title.trim().slice(0, 120),
      theme: (theme || '').trim().slice(0, 1000) || null,
      genre: genre || null,
      startsAt: startsAt || null,
      endsAt,
      createdBy: req.user._id,
    })
    res.status(201).json(contest)
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

// PUT /api/contests/:id — adjust a round (extend the deadline, fix the theme).
router.put('/:id', requireAuth, requireAdmin, async (req, res) => {
  const { title, theme, genre, endsAt } = req.body || {}
  if (genre && !GENRES.includes(genre)) return res.status(400).json({ message: 'Unknown genre.' })
  if (endsAt && Number.isNaN(new Date(endsAt).getTime())) {
    return res.status(400).json({ message: 'Invalid end date.' })
  }
  try {
    if (!(await ensureContest(req, res))) return
    res.json(await Contest.update(req.params.id, { title, theme, genre, endsAt }))
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

// DELETE /api/contests/:id — entries and votes cascade away with it.
router.delete('/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    if (!(await ensureContest(req, res))) return
    await Contest.remove(req.params.id)
    res.json({ message: 'Deleted' })
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

// ── Entering ─────────────────────────────────────────────────────────────────

// POST /api/contests/:id/enter { storyId } — enter one of your published stories.
router.post('/:id/enter', requireAuth, async (req, res) => {
  const { storyId } = req.body || {}
  if (!storyId) return res.status(400).json({ message: 'Pick a story to enter.' })

  try {
    const contest = await ensureContest(req, res)
    if (!contest) return
    if (contest.status !== 'open') {
      return res.status(400).json({ message: 'This contest is not taking entries.' })
    }

    const story = await Story.findById(storyId)
    if (!story) return res.status(404).json({ message: 'Story not found' })
    if (story.authorId !== req.user._id) {
      return res.status(403).json({ message: 'You can only enter your own stories.' })
    }
    if (!story.published) {
      return res.status(400).json({ message: 'Only published stories can be entered.' })
    }
    if (contest.genre && story.genre !== contest.genre) {
      return res.status(400).json({ message: `This contest only takes ${contest.genre.replace('_', '-')} stories.` })
    }

    await Contest.enter(req.params.id, storyId, req.user._id)
    res.status(201).json(await Contest.entries(req.params.id, req.user._id))
  } catch (err) {
    // Unique violation: this author already has an entry in the round.
    if (err.code === '23505') {
      return res.status(409).json({ message: 'You already have an entry in this contest.' })
    }
    res.status(500).json({ message: err.message })
  }
})

// DELETE /api/contests/:id/enter — withdraw (while entries are open).
router.delete('/:id/enter', requireAuth, async (req, res) => {
  try {
    const contest = await ensureContest(req, res)
    if (!contest) return
    if (contest.status !== 'open') {
      return res.status(400).json({ message: 'This contest is no longer open.' })
    }
    await Contest.withdraw(req.params.id, req.user._id)
    res.json(await Contest.entries(req.params.id, req.user._id))
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

// ── Voting ───────────────────────────────────────────────────────────────────

// POST /api/contests/:id/vote { storyId } — one vote per reader; voting again moves it.
router.post('/:id/vote', requireAuth, async (req, res) => {
  const { storyId } = req.body || {}
  if (!storyId) return res.status(400).json({ message: 'Pick an entry to vote for.' })

  try {
    const contest = await ensureContest(req, res)
    if (!contest) return
    if (contest.status !== 'open') {
      return res.status(400).json({ message: 'Voting has closed for this contest.' })
    }

    const entry = await Contest.findEntry(req.params.id, storyId)
    if (!entry) return res.status(404).json({ message: 'That story is not entered here.' })
    if (entry.user_id === req.user._id) {
      return res.status(400).json({ message: 'You can’t vote for your own entry.' })
    }

    await Contest.vote(req.params.id, req.user._id, storyId)
    res.json(await Contest.entries(req.params.id, req.user._id))
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

// DELETE /api/contests/:id/vote — take the vote back (while open).
router.delete('/:id/vote', requireAuth, async (req, res) => {
  try {
    const contest = await ensureContest(req, res)
    if (!contest) return
    if (contest.status !== 'open') {
      return res.status(400).json({ message: 'Voting has closed for this contest.' })
    }
    await Contest.unvote(req.params.id, req.user._id)
    res.json(await Contest.entries(req.params.id, req.user._id))
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

module.exports = router
