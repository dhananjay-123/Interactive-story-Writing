const router = require('express').Router()
const Story = require('../models/Story')
const Node = require('../models/Node')
const { requireAuth } = require('../middleware/auth')

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
  const { title, description, genre, openingText, choices } = req.body

  if (!title || !openingText) {
    return res.status(400).json({ message: 'Title and opening text are required' })
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
      text: openingText,
      choices,
    })

    // branchCount counts passages beyond the opening — a new story has none yet.
    const updated = await Story.setRoot(story._id, rootNode._id, 0)

    res.status(201).json(updated)
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
