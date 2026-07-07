const router = require('express').Router()
const Story = require('../models/Story')
const Node = require('../models/Node')

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

// POST create story with opening node
router.post('/', async (req, res) => {
  const { title, description, genre, author, openingText, choices } = req.body

  if (!title || !openingText) {
    return res.status(400).json({ message: 'Title and opening text are required' })
  }

  try {
    const story = await Story.create({ title, description, genre, author })

    const rootNode = await Node.create({
      storyId: story._id,
      text: openingText,
      choices,
    })

    const updated = await Story.setRoot(story._id, rootNode._id, (choices || []).length)

    res.status(201).json(updated)
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

// DELETE story (nodes are removed via ON DELETE CASCADE)
router.delete('/:id', async (req, res) => {
  try {
    await Story.remove(req.params.id)
    res.json({ message: 'Deleted' })
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

module.exports = router
