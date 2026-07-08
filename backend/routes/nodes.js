const router = require('express').Router()
const Node = require('../models/Node')
const Story = require('../models/Story')
const { requireAuth } = require('../middleware/auth')
const { validateContent } = require('../utils/validateContent')

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

// GET the whole tree of a story — every passage, for the map/editor view.
router.get('/story/:storyId/tree', async (req, res) => {
  try {
    const story = await Story.findById(req.params.storyId)
    if (!story) return res.status(404).json({ message: 'Story not found' })
    const nodes = await Node.findByStory(story._id)
    res.json({ story, nodes })
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

// POST add a child passage — only the story's author may extend the tree.
router.post('/', requireAuth, async (req, res) => {
  const { storyId, text, content, choices, parentNodeId, choiceIndex } = req.body

  if (!storyId || (!text?.trim() && !content)) {
    return res.status(400).json({ message: 'storyId and passage text are required' })
  }
  if (content && !validateContent(content)) {
    return res.status(400).json({ message: 'Passage content is not valid.' })
  }
  if (parentNodeId == null || choiceIndex == null) {
    return res.status(400).json({ message: 'parentNodeId and choiceIndex are required' })
  }

  try {
    const story = await Story.findById(storyId)
    if (!story) return res.status(404).json({ message: 'Story not found' })
    if (story.authorId !== req.user._id) {
      return res.status(403).json({ message: 'You can only extend your own stories.' })
    }

    const parent = await Node.findById(parentNodeId)
    if (!parent || parent.storyId !== storyId) {
      return res.status(404).json({ message: 'Parent passage not found' })
    }
    const target = parent.choices[choiceIndex]
    if (!target) return res.status(400).json({ message: 'That choice does not exist.' })
    if (target.nextNodeId) {
      return res.status(409).json({ message: 'That path already continues somewhere.' })
    }

    const node = await Node.create({ storyId, text: (text || '').trim(), content, choices })
    await Node.attachChild(parentNodeId, choiceIndex, node._id)

    // Keep the story's branch count in sync (passages beyond the opening).
    await Story.setBranchCount(storyId, (await Node.countByStory(storyId)) - 1)

    res.status(201).json(node)
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

// Load a node together with its owning story, or send an error response.
const loadOwned = async (req, res) => {
  const node = await Node.findById(req.params.id)
  if (!node) {
    res.status(404).json({ message: 'Passage not found' })
    return null
  }
  const story = await Story.findById(node.storyId)
  if (!story || story.authorId !== req.user._id) {
    res.status(403).json({ message: 'You can only edit your own stories.' })
    return null
  }
  return { node, story }
}

// PUT edit a passage's text and choice labels (existing branch links are preserved).
router.put('/:id', requireAuth, async (req, res) => {
  const { text, content, choices } = req.body
  if (!text?.trim() && !content) return res.status(400).json({ message: 'Passage text is required' })
  if (content && !validateContent(content)) {
    return res.status(400).json({ message: 'Passage content is not valid.' })
  }

  try {
    const owned = await loadOwned(req, res)
    if (!owned) return
    const { node, story } = owned

    const oldLinks = (node.choices || []).filter((c) => c.nextNodeId).map((c) => c.nextNodeId)
    const newLinks = (choices || []).filter((c) => c.nextNodeId).map((c) => c.nextNodeId)

    // A choice may only keep a link that already existed — no relinking or inventing.
    if (newLinks.some((l) => !oldLinks.includes(l))) {
      return res.status(400).json({ message: 'Choices cannot be relinked here.' })
    }
    // Written branches can't be dropped by editing — delete the branch instead.
    if (oldLinks.some((l) => !newLinks.includes(l))) {
      return res.status(409).json({ message: 'Delete a written branch before removing its choice.' })
    }

    const updated = await Node.update(node._id, { text: (text || '').trim(), content, choices })
    await Story.setBranchCount(story._id, (await Node.countByStory(story._id)) - 1)
    res.json(updated)
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

// DELETE a passage and everything beneath it, detaching it from its parent choice.
router.delete('/:id', requireAuth, async (req, res) => {
  const { parentNodeId, choiceIndex } = req.body || {}
  try {
    const owned = await loadOwned(req, res)
    if (!owned) return
    const { node, story } = owned

    if (story.rootNodeId === node._id) {
      return res.status(400).json({ message: 'The opening passage cannot be deleted.' })
    }
    if (parentNodeId != null && choiceIndex != null) {
      await Node.detachChild(parentNodeId, choiceIndex)
    }
    await Node.deleteSubtree(node._id)
    await Story.setBranchCount(story._id, (await Node.countByStory(story._id)) - 1)
    res.json({ message: 'Deleted' })
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

module.exports = router
