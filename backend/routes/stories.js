const router = require('express').Router()
const Story = require('../models/Story')
const Node = require('../models/Node')
const { requireAuth } = require('../middleware/auth')
const { validateContent } = require('../utils/validateContent')

// GET all stories
router.get('/', async (req, res) => {
  try {
    const stories = await Story.findPublished()
    res.json(stories)
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

// GET single story
router.get('/:id', async (req, res) => {
  try {
    const story = await Story.findById(req.params.id)
    if (!story) return res.status(404).json({ message: 'Story not found' })
    res.json(story)
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

// POST create story with opening node — author comes from the signed-in user.
router.post('/', requireAuth, async (req, res) => {
  const { title, description, genre, openingText, openingContent, choices } = req.body

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
      author: req.user.displayName,
      authorId: req.user._id,
    })

    const rootNode = await Node.create({
      storyId: story._id,
      text: (openingText || '').trim(),
      content: openingContent,
      choices,
    })

    // branchCount counts passages beyond the opening — a new story has none yet.
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

module.exports = router
