const router = require('express').Router()
const Story = require('../models/Story')
const Node = require('../models/Node')
const Engagement = require('../models/Engagement')
const Comment = require('../models/Comment')
const Report = require('../models/Report')
const { requireAuth, optionalAuth } = require('../middleware/auth')
const { validateContent } = require('../utils/validateContent')

const REPORT_REASONS = ['spam', 'offensive', 'plagiarism', 'broken', 'other']

const viewerId = (req) => (req.user ? req.user._id : null)

// ── Discovery ────────────────────────────────────────────────────────────────

// GET /api/stories?genre=&tag=&q=&sort=  — filtered, sorted, viewer-aware.
router.get('/', optionalAuth, async (req, res) => {
  try {
    const { genre, tag, q, sort } = req.query
    const stories = await Story.findMany({ genre, tag, q, sort, viewerId: viewerId(req) })
    res.json(stories)
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

// GET /api/stories/tags/trending — most-loved tags for the discovery rail.
router.get('/tags/trending', async (req, res) => {
  try {
    res.json(await Story.trendingTags(12))
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

// GET /api/stories/recommendations — personalized when signed in, trending otherwise.
router.get('/recommendations', optionalAuth, async (req, res) => {
  try {
    res.json(await Story.recommend(viewerId(req), 6))
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

// GET /api/stories/featured?limit= — the admin-curated collection. The home rail
// asks for 6; the /featured page asks for the lot.
router.get('/featured', optionalAuth, async (req, res) => {
  const asked = Number.parseInt(req.query.limit, 10)
  const limit = Number.isFinite(asked) ? Math.min(Math.max(asked, 1), 60) : 6
  try {
    res.json(await Story.findFeatured(viewerId(req), limit))
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

// GET /api/stories/bookmarks — the signed-in reader's saved stories.
router.get('/bookmarks', requireAuth, async (req, res) => {
  try {
    res.json(await Story.bookmarkedBy(req.user._id))
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

// GET single story — viewer-aware so the reader's like/bookmark/rating come along.
router.get('/:id', optionalAuth, async (req, res) => {
  try {
    const story = await Story.findById(req.params.id, viewerId(req))
    if (!story) return res.status(404).json({ message: 'Story not found' })
    res.json(story)
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

// ── Authoring ────────────────────────────────────────────────────────────────

// POST create story with opening node — author comes from the signed-in user.
router.post('/', requireAuth, async (req, res) => {
  const { title, description, genre, tags, openingText, openingContent, choices } = req.body

  if (!title || (!openingText?.trim() && !openingContent)) {
    return res.status(400).json({ message: 'Title and opening text are required' })
  }
  if (openingContent && !validateContent(openingContent)) {
    return res.status(400).json({ message: 'Opening passage content is not valid.' })
  }

  try {
    const story = await Story.create({
      title,
      description,
      genre,
      tags,
      author: req.user.displayName,
      authorId: req.user._id,
    })

    const rootNode = await Node.create({
      storyId: story._id,
      text: (openingText || '').trim(),
      content: openingContent,
      choices,
    })

    const updated = await Story.setRoot(story._id, rootNode._id, 0)
    res.status(201).json(updated)
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

// PUT the story's background soundscape — owner only.
router.put('/:id/ambience', requireAuth, async (req, res) => {
  try {
    const story = await Story.findById(req.params.id)
    if (!story) return res.status(404).json({ message: 'Story not found' })
    if (story.authorId !== req.user._id) {
      return res.status(403).json({ message: 'You can only edit your own stories.' })
    }
    let { ambience } = req.body
    if (ambience === '' || ambience == null) {
      ambience = null
    } else if (typeof ambience !== 'string' || ambience.length > 32 || !/^[a-z]+_[a-z]+$/.test(ambience)) {
      return res.status(400).json({ message: 'Invalid soundscape.' })
    }
    const updated = await Story.setAmbience(req.params.id, ambience)
    res.json(updated)
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

// PUT the story's discovery tags — owner only.
router.put('/:id/tags', requireAuth, async (req, res) => {
  try {
    const story = await Story.findById(req.params.id)
    if (!story) return res.status(404).json({ message: 'Story not found' })
    if (story.authorId !== req.user._id) {
      return res.status(403).json({ message: 'You can only edit your own stories.' })
    }
    const updated = await Story.setTags(req.params.id, req.body.tags)
    res.json(updated)
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

// DELETE story — only the owner may delete (nodes cascade).
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const story = await Story.findById(req.params.id)
    if (!story) return res.status(404).json({ message: 'Story not found' })
    if (story.authorId !== req.user._id) {
      return res.status(403).json({ message: 'You can only delete your own stories.' })
    }
    await Story.remove(req.params.id)
    res.json({ message: 'Deleted' })
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

// ── Engagement ───────────────────────────────────────────────────────────────

// Guard: 404 if the story doesn't exist. Returns the story or null (after replying).
const ensureStory = async (req, res) => {
  const story = await Story.findById(req.params.id)
  if (!story) {
    res.status(404).json({ message: 'Story not found' })
    return null
  }
  return story
}

router.post('/:id/like', requireAuth, async (req, res) => {
  try {
    if (!(await ensureStory(req, res))) return
    await Engagement.like(req.user._id, req.params.id)
    res.json({ liked: true, likeCount: await Engagement.likeCount(req.params.id) })
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

router.delete('/:id/like', requireAuth, async (req, res) => {
  try {
    if (!(await ensureStory(req, res))) return
    await Engagement.unlike(req.user._id, req.params.id)
    res.json({ liked: false, likeCount: await Engagement.likeCount(req.params.id) })
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

router.post('/:id/bookmark', requireAuth, async (req, res) => {
  try {
    if (!(await ensureStory(req, res))) return
    await Engagement.bookmark(req.user._id, req.params.id)
    res.json({ bookmarked: true })
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

router.delete('/:id/bookmark', requireAuth, async (req, res) => {
  try {
    if (!(await ensureStory(req, res))) return
    await Engagement.unbookmark(req.user._id, req.params.id)
    res.json({ bookmarked: false })
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

router.put('/:id/rating', requireAuth, async (req, res) => {
  try {
    const value = Number(req.body.value)
    if (!Number.isInteger(value) || value < 1 || value > 5) {
      return res.status(400).json({ message: 'Rating must be a whole number from 1 to 5.' })
    }
    if (!(await ensureStory(req, res))) return
    await Engagement.rate(req.user._id, req.params.id, value)
    res.json({ myRating: value, ...(await Engagement.ratingSummary(req.params.id)) })
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

router.delete('/:id/rating', requireAuth, async (req, res) => {
  try {
    if (!(await ensureStory(req, res))) return
    await Engagement.unrate(req.user._id, req.params.id)
    res.json({ myRating: null, ...(await Engagement.ratingSummary(req.params.id)) })
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

// POST /:id/report — reader flags a story for admin review.
router.post('/:id/report', requireAuth, async (req, res) => {
  try {
    const { reason } = req.body || {}
    let { details } = req.body || {}
    if (!REPORT_REASONS.includes(reason)) {
      return res.status(400).json({ message: 'Choose a valid reason.' })
    }
    if (typeof details === 'string') {
      details = details.trim().slice(0, 1000)
    } else {
      details = null
    }
    if (!(await ensureStory(req, res))) return
    await Report.create({ storyId: req.params.id, reporterId: req.user._id, reason, details })
    res.status(201).json({ message: 'Thanks — our team will take a look.' })
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

// ── Comments ─────────────────────────────────────────────────────────────────

router.get('/:id/comments', async (req, res) => {
  try {
    res.json(await Comment.listByStory(req.params.id))
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

router.post('/:id/comments', requireAuth, async (req, res) => {
  try {
    const body = (req.body.body || '').trim()
    if (!body) return res.status(400).json({ message: 'Write something first.' })
    if (body.length > 2000) return res.status(400).json({ message: 'Comment is too long (2000 characters max).' })
    if (!(await ensureStory(req, res))) return
    const comment = await Comment.create({ storyId: req.params.id, userId: req.user._id, body })
    res.status(201).json(comment)
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

// A comment can be removed by its author or by the story's author.
router.delete('/:id/comments/:commentId', requireAuth, async (req, res) => {
  try {
    const comment = await Comment.findById(req.params.commentId)
    if (!comment || comment.storyId !== req.params.id) {
      return res.status(404).json({ message: 'Comment not found' })
    }
    const story = await Story.findById(req.params.id)
    const isOwner = comment.userId === req.user._id
    const isStoryAuthor = story && story.authorId === req.user._id
    if (!isOwner && !isStoryAuthor) {
      return res.status(403).json({ message: 'You can only delete your own comments.' })
    }
    await Comment.remove(req.params.commentId)
    res.json({ message: 'Deleted' })
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

module.exports = router
