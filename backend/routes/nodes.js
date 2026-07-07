const router = require('express').Router()
const Node = require('../models/Node')
const Story = require('../models/Story')

// GET node by id (with populated choices)
router.get('/:id', async (req, res) => {
  try {
    const node = await Node.findById(req.params.id)
    if (!node) return res.status(404).json({ message: 'Node not found' })
    res.json(node)
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

// GET root node of a story
router.get('/story/:storyId/root', async (req, res) => {
  try {
    const story = await Story.findById(req.params.storyId)
    if (!story || !story.rootNodeId) return res.status(404).json({ message: 'Root node not found' })
    const node = await Node.findById(story.rootNodeId)
    res.json(node)
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

// POST add child node
router.post('/', async (req, res) => {
  const { storyId, text, choices, parentNodeId, choiceIndex } = req.body

  if (!storyId || !text) return res.status(400).json({ message: 'storyId and text are required' })

  try {
    const node = await Node.create({ storyId, text, choices })

    if (parentNodeId != null && choiceIndex != null) {
      await Node.attachChild(parentNodeId, choiceIndex, node._id)
    }

    res.status(201).json(node)
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

module.exports = router
