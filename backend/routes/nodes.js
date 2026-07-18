const router = require('express').Router()
const Node = require('../models/Node')
const Story = require('../models/Story')
const Snapshot = require('../models/Snapshot')
const Place = require('../models/Place')
const { requireAuth, optionalAuth } = require('../middleware/auth')
const { validateContent } = require('../utils/validateContent')
const { canEditStory } = require('../utils/permissions')
const achievements = require('../achievements')

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
// optionalAuth so the response can tell the caller whether they may edit it
// (the owner, or a collaborator the owner invited).
router.get('/story/:storyId/tree', optionalAuth, async (req, res) => {
  try {
    const story = await Story.findById(req.params.storyId)
    if (!story) return res.status(404).json({ message: 'Story not found' })
    const nodes = await Node.findByStory(story._id)
    const canEdit = req.user ? await canEditStory(story, req.user._id) : false
    res.json({ story: { ...story, canEdit }, nodes })
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
    if (!(await canEditStory(story, req.user._id))) {
      return res.status(403).json({ message: 'You can only extend stories you own or collaborate on.' })
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
    // A larger tree moves the owner's story-design metrics (branches/passages/endings).
    achievements.emit(story.authorId, 'STORY_UPDATED', { storyId })

    // Tell anyone co-writing this story to pull in the new passage.
    req.app.get('collab')?.notifyChanged(storyId, { by: req.user._id, action: 'create' })

    res.status(201).json(node)
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

// Load a node together with its story, gating on edit rights (owner or an
// invited collaborator), or send an error response.
const loadEditable = async (req, res) => {
  const node = await Node.findById(req.params.id)
  if (!node) {
    res.status(404).json({ message: 'Passage not found' })
    return null
  }
  const story = await Story.findById(node.storyId)
  if (!story || !(await canEditStory(story, req.user._id))) {
    res.status(403).json({ message: 'You can only edit stories you own or collaborate on.' })
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
    const owned = await loadEditable(req, res)
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

    // Keep the pre-edit version so the author can roll back later.
    await Snapshot.record(node, req.user._id)

    const updated = await Node.update(node._id, { text: (text || '').trim(), content, choices })
    await Story.setBranchCount(story._id, (await Node.countByStory(story._id)) - 1)
    achievements.emit(story.authorId, 'STORY_UPDATED', { storyId: story._id })

    req.app.get('collab')?.notifyChanged(story._id, { by: req.user._id, action: 'edit', nodeId: node._id })

    res.json(updated)
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

// DELETE a passage and everything beneath it, detaching it from its parent choice.
router.delete('/:id', requireAuth, async (req, res) => {
  const { parentNodeId, choiceIndex } = req.body || {}
  try {
    const owned = await loadEditable(req, res)
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
    achievements.emit(story.authorId, 'STORY_UPDATED', { storyId: story._id })

    // Free the deleted passage's soft lock and tell collaborators to reload.
    const collab = req.app.get('collab')
    collab?.releaseNodeLock(story._id, node._id)
    collab?.notifyChanged(story._id, { by: req.user._id, action: 'delete', nodeId: node._id })

    res.json({ message: 'Deleted' })
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

// PUT set (or clear) which world-map place a passage happens at.
router.put('/:id/place', requireAuth, async (req, res) => {
  const { placeId } = req.body || {}
  try {
    const owned = await loadEditable(req, res)
    if (!owned) return
    const { node, story } = owned

    if (placeId) {
      const place = await Place.findById(placeId)
      if (!place || place.storyId !== story._id) {
        return res.status(400).json({ message: 'That place is not on this story’s map.' })
      }
    }
    const updated = await Node.setPlace(node._id, placeId || null)
    req.app.get('collab')?.notifyChanged(story._id, { by: req.user._id, action: 'edit', nodeId: node._id })
    res.json(updated)
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

// GET a passage's edit history (prior versions). Owner/collaborator only.
router.get('/:id/history', requireAuth, async (req, res) => {
  try {
    const owned = await loadEditable(req, res)
    if (!owned) return
    const snapshots = await Snapshot.listForNode(owned.node._id)
    res.json(snapshots)
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

// POST restore a prior version. To keep the tree intact this only reverts the
// passage's prose and its choice *labels* (matched by position) — it never
// relinks or changes the number of branches. The current state is snapshotted
// first, so a restore is itself undoable.
router.post('/:id/restore', requireAuth, async (req, res) => {
  const { snapshotId } = req.body || {}
  if (!snapshotId) return res.status(400).json({ message: 'snapshotId is required' })
  try {
    const owned = await loadEditable(req, res)
    if (!owned) return
    const { node, story } = owned

    const snap = await Snapshot.findById(snapshotId)
    if (!snap || snap.nodeId !== node._id) {
      return res.status(404).json({ message: 'That version does not belong to this passage.' })
    }

    // Preserve the live tree: keep each current choice's link + count, but pull
    // the label back from the snapshot where a choice still exists at that slot.
    const snapChoices = snap.choices || []
    const choices = (node.choices || []).map((c, i) => ({
      text: (snapChoices[i]?.text ?? c.text) || '',
      nextNodeId: c.nextNodeId ?? null,
    }))

    await Snapshot.record(node, req.user._id) // make the restore reversible
    const updated = await Node.update(node._id, {
      text: snap.text || '',
      content: snap.content || null,
      choices,
    })
    achievements.emit(story.authorId, 'STORY_UPDATED', { storyId: story._id })
    req.app.get('collab')?.notifyChanged(story._id, { by: req.user._id, action: 'edit', nodeId: node._id })

    res.json(updated)
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

module.exports = router
