const router = require('express').Router()
const Story = require('../models/Story')
const Node = require('../models/Node')
const Engagement = require('../models/Engagement')
const Comment = require('../models/Comment')
const Report = require('../models/Report')
const Progress = require('../models/Progress')
const ChoiceEvent = require('../models/ChoiceEvent')
const User = require('../models/User')
const Collaborator = require('../models/Collaborator')
const { requireAuth, optionalAuth } = require('../middleware/auth')
const { validateContent } = require('../utils/validateContent')
const { canEditStory } = require('../utils/permissions')
const achievements = require('../achievements')

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

// GET /api/stories/continue — stories the reader is part-way through.
// Declared before /:id so "continue" isn't swallowed as a story id.
router.get('/continue', requireAuth, async (req, res) => {
  try {
    res.json(await Progress.listForUser(req.user._id, 8))
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

// GET /api/stories/mine — the signed-in author's own catalogue, drafts included.
// Declared before /:id so "mine" isn't swallowed as a story id.
router.get('/mine', requireAuth, async (req, res) => {
  try {
    res.json(await Story.findMineForAuthor(req.user._id))
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

// GET /api/stories/collaborations — stories this user co-writes (doesn't own).
// Before /:id so "collaborations" isn't swallowed as a story id.
router.get('/collaborations', requireAuth, async (req, res) => {
  try {
    const ids = await Collaborator.storiesForUser(req.user._id)
    const stories = (await Promise.all(ids.map((sid) => Story.findById(sid, req.user._id))))
      .filter(Boolean)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    res.json(stories)
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
    // A new story is published by default — credit the author's publishing metrics.
    if (updated.published) achievements.emit(req.user._id, 'STORY_PUBLISHED', { storyId: story._id })
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

// PUT the story's published state — owner only. Lets an author hide a story
// from the library (and their public profile) or bring it back, from "My stories".
router.put('/:id/published', requireAuth, async (req, res) => {
  try {
    const story = await Story.findById(req.params.id)
    if (!story) return res.status(404).json({ message: 'Story not found' })
    if (story.authorId !== req.user._id) {
      return res.status(403).json({ message: 'You can only edit your own stories.' })
    }
    if (typeof req.body.published !== 'boolean') {
      return res.status(400).json({ message: 'published must be true or false.' })
    }
    const updated = await Story.setPublished(req.params.id, req.body.published)
    achievements.emit(story.authorId, req.body.published ? 'STORY_PUBLISHED' : 'STORY_UNPUBLISHED', { storyId: story._id })
    res.json(updated)
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

// ── Collaborators ─────────────────────────────────────────────────────────────

// GET /:id/collaborators — the co-authors on a story. Visible to the owner and
// to the collaborators themselves (they need to see who else is on it).
router.get('/:id/collaborators', requireAuth, async (req, res) => {
  try {
    const story = await Story.findById(req.params.id)
    if (!story) return res.status(404).json({ message: 'Story not found' })
    if (!(await canEditStory(story, req.user._id))) {
      return res.status(403).json({ message: 'Only the story team can see this.' })
    }
    res.json(await Collaborator.listForStory(req.params.id))
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

// POST /:id/collaborators { username } — invite a co-author. Owner only.
router.post('/:id/collaborators', requireAuth, async (req, res) => {
  try {
    const story = await Story.findById(req.params.id)
    if (!story) return res.status(404).json({ message: 'Story not found' })
    if (story.authorId !== req.user._id) {
      return res.status(403).json({ message: 'Only the story owner can add collaborators.' })
    }
    const username = (req.body.username || '').trim()
    if (!username) return res.status(400).json({ message: 'Enter a username.' })

    const invitee = await User.findByUsername(username)
    if (!invitee) return res.status(404).json({ message: 'No author by that username.' })
    if (invitee._id === story.authorId) {
      return res.status(400).json({ message: 'You already own this story.' })
    }

    await Collaborator.add(req.params.id, invitee._id)
    achievements.emit(invitee._id, 'COLLABORATOR_ADDED', { storyId: req.params.id })
    res.status(201).json(await Collaborator.listForStory(req.params.id))
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

// DELETE /:id/collaborators/:userId — remove a co-author. The owner can remove
// anyone; a collaborator can remove themselves (leave the story).
router.delete('/:id/collaborators/:userId', requireAuth, async (req, res) => {
  try {
    const story = await Story.findById(req.params.id)
    if (!story) return res.status(404).json({ message: 'Story not found' })
    const isOwner = story.authorId === req.user._id
    const isSelf = req.params.userId === req.user._id
    if (!isOwner && !isSelf) {
      return res.status(403).json({ message: 'You can only remove yourself.' })
    }
    await Collaborator.remove(req.params.id, req.params.userId)
    res.json(await Collaborator.listForStory(req.params.id))
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
    const story = await ensureStory(req, res)
    if (!story) return
    await Engagement.like(req.user._id, req.params.id)
    achievements.emit(req.user._id, 'LIKE_GIVEN', { storyId: story._id })
    // Don't credit an author for liking their own story.
    if (story.authorId && story.authorId !== req.user._id) {
      achievements.emit(story.authorId, 'LIKE_RECEIVED', { storyId: story._id })
    }
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
    achievements.emit(req.user._id, 'BOOKMARK_ADDED', { storyId: req.params.id })
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
    const story = await ensureStory(req, res)
    if (!story) return
    await Engagement.rate(req.user._id, req.params.id, value)
    achievements.emit(req.user._id, 'RATING_GIVEN', { storyId: story._id })
    if (story.authorId && story.authorId !== req.user._id) {
      achievements.emit(story.authorId, 'RATING_RECEIVED', { storyId: story._id })
    }
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
    const story = await ensureStory(req, res)
    if (!story) return
    const comment = await Comment.create({ storyId: req.params.id, userId: req.user._id, body })
    achievements.emit(req.user._id, 'COMMENT_POSTED', { storyId: story._id })
    if (story.authorId && story.authorId !== req.user._id) {
      achievements.emit(story.authorId, 'COMMENT_RECEIVED', { storyId: story._id })
    }
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

// ── Reading progress ─────────────────────────────────────────────────────────

// GET /api/stories/:id/progress — where this reader left off, or null.
router.get('/:id/progress', requireAuth, async (req, res) => {
  try {
    res.json(await Progress.get(req.user._id, req.params.id) || null)
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

// PUT /api/stories/:id/progress  { currentNodeId, path: [] }
// Called on every move through the story, so it must stay cheap and idempotent.
router.put('/:id/progress', requireAuth, async (req, res) => {
  const { currentNodeId, path } = req.body || {}
  if (!currentNodeId) return res.status(400).json({ message: 'currentNodeId is required.' })
  if (path != null && (!Array.isArray(path) || path.length > 200)) {
    return res.status(400).json({ message: 'path must be an array of at most 200 ids.' })
  }

  try {
    // The node must exist and belong to this story, or a reader could park their
    // bookmark on someone else's passage.
    const node = await Node.findById(currentNodeId)
    if (!node || node.storyId !== req.params.id) {
      return res.status(400).json({ message: 'That passage is not part of this story.' })
    }
    const saved = await Progress.save({
      userId: req.user._id,
      storyId: req.params.id,
      currentNodeId,
      path: path || [],
    })

    // Every save is a sign of reader activity; reaching an ending is a completion.
    achievements.emit(req.user._id, 'READING_PROGRESS', { storyId: req.params.id })
    if (node.isEnding) {
      const story = await Story.findById(req.params.id)
      achievements.emit(req.user._id, 'STORY_COMPLETED', {
        storyId: req.params.id,
        nodeId: node._id,
        genre: story?.genre || null,
      })
    }
    res.json(saved)
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

// DELETE /api/stories/:id/progress — "start over" forgets the bookmark.
router.delete('/:id/progress', requireAuth, async (req, res) => {
  try {
    await Progress.clear(req.user._id, req.params.id)
    res.json({ message: 'Cleared' })
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

// ── Choice analytics ─────────────────────────────────────────────────────────

// POST /api/stories/:id/choice  { fromNodeId, choiceIndex }
// Anonymous readers count too, so this is optionalAuth. The link is verified
// against the passage itself: you can only report a choice the story actually
// offers, which stops the endpoint from being a free-form counter.
router.post('/:id/choice', optionalAuth, async (req, res) => {
  const { fromNodeId, choiceIndex } = req.body || {}
  const index = Number(choiceIndex)
  if (!fromNodeId || !Number.isInteger(index) || index < 0 || index > 5) {
    return res.status(400).json({ message: 'fromNodeId and a valid choiceIndex are required.' })
  }

  try {
    const from = await Node.findById(fromNodeId)
    if (!from || from.storyId !== req.params.id) {
      return res.status(400).json({ message: 'That passage is not part of this story.' })
    }
    const choice = from.choices?.[index]
    if (!choice?.nextNodeId) {
      return res.status(400).json({ message: 'That choice does not lead anywhere yet.' })
    }

    await ChoiceEvent.record({
      storyId: req.params.id,
      fromNodeId,
      toNodeId: choice.nextNodeId,
      choiceIndex: index,
      userId: viewerId(req),
    })
    // Signed-in choices feed exploration achievements; anonymous ones don't count.
    if (req.user) achievements.emit(req.user._id, 'CHOICE_MADE', { storyId: req.params.id })
    res.status(201).json({ recorded: true })
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

// GET /api/stories/:id/analytics — which paths readers actually walk.
// The author's own numbers, or an admin's. Nobody else's business.
router.get('/:id/analytics', requireAuth, async (req, res) => {
  try {
    const story = await Story.findById(req.params.id)
    if (!story) return res.status(404).json({ message: 'Story not found' })
    if (story.authorId !== req.user._id && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Only the author can see reader paths.' })
    }

    const [nodes, dist, totals, endingList] = await Promise.all([
      Node.findByStory(req.params.id),
      ChoiceEvent.distribution(req.params.id),
      ChoiceEvent.summary(req.params.id),
      ChoiceEvent.endings(req.params.id),
    ])

    // counts[nodeId][choiceIndex] -> times taken
    const counts = new Map()
    for (const row of dist) {
      if (!counts.has(row.from_node_id)) counts.set(row.from_node_id, {})
      counts.get(row.from_node_id)[row.choice_index] = row.n
    }

    const passages = nodes
      .filter((n) => n.choices.length > 0)
      .map((n) => {
        const forNode = counts.get(n._id) || {}
        const taken = n.choices.reduce((sum, _, i) => sum + (forNode[i] || 0), 0)
        return {
          nodeId: n._id,
          isRoot: n._id === story.rootNodeId,
          snippet: (n.text || '').replace(/\s+/g, ' ').slice(0, 120),
          totalTaken: taken,
          choices: n.choices.map((c, i) => {
            const count = forNode[i] || 0
            return {
              index: i,
              text: c.text,
              nextNodeId: c.nextNodeId,
              count,
              // Share of readers who stood here and picked this. 0 when nobody has.
              share: taken > 0 ? count / taken : 0,
            }
          }),
        }
      })
      // Busiest passages first — that's where an author's attention belongs.
      .sort((a, b) => b.totalTaken - a.totalTaken)

    res.json({ totals, passages, endings: endingList })
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

module.exports = router
