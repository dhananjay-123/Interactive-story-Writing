const router = require('express').Router()
const Story = require('../models/Story')
const Node = require('../models/Node')
const games = require('../games')
const { requireAuth, optionalAuth } = require('../middleware/auth')
const { canEditStory } = require('../utils/permissions')

const viewerId = (req) => (req.user ? req.user._id : null)

// ── Discovery ────────────────────────────────────────────────────────────────

// GET /api/games — published stories carrying a live game layer. Same story
// projection the library uses, so the cards render identically.
router.get('/', optionalAuth, async (req, res) => {
  try {
    const { genre, mode, q, sort } = req.query
    res.json(await Story.findMany({ genre, q, sort, gameMode: mode, game: true, viewerId: viewerId(req) }))
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

// GET /api/games/catalog — the modes an author can pick, with their rank ladders.
// Public and cached in memory server-side; declared before /:storyId so
// "catalog" isn't swallowed as a story id.
router.get('/catalog', (req, res) => {
  res.json(games.publicCatalog())
})

// ── Playing ──────────────────────────────────────────────────────────────────

// GET /api/games/:storyId — the reader's own view: objective, cast, the clues
// they have found, their notes and where their session stands. 204 when the
// story has no game, so the reader's client can simply render nothing.
router.get('/:storyId', optionalAuth, async (req, res) => {
  try {
    const view = await games.readerView(req.params.storyId, viewerId(req))
    if (!view) return res.status(204).end()
    res.json(view)
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

// POST /api/games/:storyId/accuse  { answer }
// The answer may be submitted at any point in the story. A miss returns nothing
// but the miss — never a narrowing hint, never a hint of the ending.
router.post('/:storyId/accuse', requireAuth, async (req, res) => {
  try {
    const story = await Story.findById(req.params.storyId)
    if (!story) return res.status(404).json({ message: 'Story not found' })

    const result = await games.accuse({
      userId: req.user._id,
      storyId: req.params.storyId,
      answer: req.body?.answer,
      isAuthor: story.authorId === req.user._id,
    })

    if (!result.ok) {
      const messages = {
        no_game: 'This story has no challenge to answer.',
        author: 'You wrote this one — the answer is already yours.',
        empty: 'Choose an answer first.',
        already_solved: 'You have already solved this.',
        no_attempts: 'You have used every answer on this case.',
      }
      const status = result.reason === 'no_game' ? 404 : 400
      return res.status(status).json({ message: messages[result.reason] || 'That answer could not be submitted.' })
    }
    res.json(result)
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

// PUT /api/games/:storyId/notes  { notes } — the reader's own notebook text.
router.put('/:storyId/notes', requireAuth, async (req, res) => {
  try {
    const view = await games.readerView(req.params.storyId, req.user._id)
    if (!view) return res.status(404).json({ message: 'This story has no challenge.' })
    const notes = await games.saveNotes(req.user._id, req.params.storyId, req.body?.notes)
    res.json({ notes })
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

// GET /api/games/:storyId/leaderboard?board=global|weekly|friends
// Each Story Game has its own rankings. `friends` reads the viewer's follow
// graph and needs a signed-in viewer; it comes back empty rather than erroring
// for a signed-out one.
router.get('/:storyId/leaderboard', optionalAuth, async (req, res) => {
  const board = ['global', 'weekly', 'friends'].includes(req.query.board) ? req.query.board : 'global'
  try {
    const [rows, standing] = await Promise.all([
      games.leaderboard(req.params.storyId, board, viewerId(req), 10),
      req.user ? games.standing(req.params.storyId, req.user._id) : Promise.resolve(null),
    ])
    res.json({ board, rows, standing })
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

// ── Authoring ────────────────────────────────────────────────────────────────

// Owner or collaborator may build the challenge — the same gate that governs the
// passages it is built on. Returns the story, or null after replying.
const loadEditableStory = async (req, res) => {
  const story = await Story.findById(req.params.storyId)
  if (!story) {
    res.status(404).json({ message: 'Story not found' })
    return null
  }
  if (!(await canEditStory(story, req.user._id))) {
    res.status(403).json({ message: 'You can only edit stories you own or collaborate on.' })
    return null
  }
  return story
}

// GET /api/games/:storyId/design — the full configuration, solution included.
// Team-only: this is the one path the answer travels down.
router.get('/:storyId/design', requireAuth, async (req, res) => {
  try {
    const story = await loadEditableStory(req, res)
    if (!story) return
    const [game, subjects, clues] = await Promise.all([
      games.store.findDesign(story._id),
      games.store.listSubjects(story._id),
      games.store.listClues(story._id),
    ])
    res.json({ game, subjects, clues })
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

const trimmed = (v, max) => String(v ?? '').trim().slice(0, max)

// PUT /api/games/:storyId — create or replace the game layer.
router.put('/:storyId', requireAuth, async (req, res) => {
  const { mode, objective, briefing, solutionKind, solutionKey, answerHint, maxAttempts, published } = req.body || {}

  const modeDef = games.catalog.mode(mode)
  if (!modeDef) return res.status(400).json({ message: 'Choose one of the listed game modes.' })
  if (!modeDef.answerKinds.includes(solutionKind)) {
    return res.status(400).json({ message: `A ${modeDef.label} game cannot be answered that way.` })
  }
  const objectiveText = trimmed(objective, 200)
  if (!objectiveText) return res.status(400).json({ message: 'Give the reader an objective.' })
  const key = trimmed(solutionKey, 200)
  if (!key) return res.status(400).json({ message: 'Set the answer before publishing the challenge.' })

  const attempts = Number.parseInt(maxAttempts, 10)
  if (!Number.isInteger(attempts) || attempts < 1 || attempts > 10) {
    return res.status(400).json({ message: 'Allow between 1 and 10 answers.' })
  }

  try {
    const story = await loadEditableStory(req, res)
    if (!story) return

    // A subject answer must name a subject that exists, or the game is
    // unsolvable the moment it goes live.
    if (solutionKind === 'subject') {
      const subjects = await games.store.listSubjects(story._id)
      if (!subjects.some((s) => s.key === key)) {
        return res.status(400).json({ message: `Add that ${modeDef.subject.one.toLowerCase()} first, then set it as the answer.` })
      }
    }

    const saved = await games.store.upsertGame(story._id, {
      mode,
      objective: objectiveText,
      briefing: trimmed(briefing, 600) || null,
      solutionKind,
      solutionKey: key,
      answerHint: trimmed(answerHint, 160) || null,
      maxAttempts: attempts,
      published: Boolean(published),
    })
    res.json(saved)
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

// DELETE /api/games/:storyId — remove the challenge. The story keeps every
// passage; only the layer on top of it goes (sessions and clues cascade).
router.delete('/:storyId', requireAuth, async (req, res) => {
  try {
    const story = await loadEditableStory(req, res)
    if (!story) return
    await games.store.removeGame(story._id)
    res.json({ message: 'Removed' })
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

// ── Subjects ─────────────────────────────────────────────────────────────────

// Stable, url-safe key derived from the name. It is what the solution points at,
// so it is generated once at creation and never rewritten by a rename.
const toKey = (name) =>
  String(name).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40)

router.post('/:storyId/subjects', requireAuth, async (req, res) => {
  const name = trimmed(req.body?.name, 60)
  if (!name) return res.status(400).json({ message: 'Give them a name.' })
  try {
    const story = await loadEditableStory(req, res)
    if (!story) return
    if ((await games.store.countSubjects(story._id)) >= games.store.MAX_SUBJECTS) {
      return res.status(400).json({ message: `A case holds at most ${games.store.MAX_SUBJECTS} of these.` })
    }
    const existing = await games.store.listSubjects(story._id)
    let key = toKey(name) || 'subject'
    // Two people can share a name; their keys can't.
    if (existing.some((s) => s.key === key)) key = `${key}-${existing.length + 1}`.slice(0, 48)

    const subject = await games.store.createSubject(story._id, {
      key,
      name,
      blurb: trimmed(req.body?.blurb, 200) || null,
      sortOrder: existing.length,
    })
    res.status(201).json(subject)
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

router.put('/:storyId/subjects/:subjectId', requireAuth, async (req, res) => {
  const name = trimmed(req.body?.name, 60)
  if (!name) return res.status(400).json({ message: 'Give them a name.' })
  try {
    const story = await loadEditableStory(req, res)
    if (!story) return
    const subject = await games.store.findSubject(req.params.subjectId)
    if (!subject || subject.storyId !== story._id) {
      return res.status(404).json({ message: 'That is not part of this case.' })
    }
    res.json(
      await games.store.updateSubject(subject._id, {
        name,
        blurb: trimmed(req.body?.blurb, 200) || null,
        sortOrder: Number.isInteger(req.body?.sortOrder) ? req.body.sortOrder : subject.sortOrder,
      })
    )
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

router.delete('/:storyId/subjects/:subjectId', requireAuth, async (req, res) => {
  try {
    const story = await loadEditableStory(req, res)
    if (!story) return
    const subject = await games.store.findSubject(req.params.subjectId)
    if (!subject || subject.storyId !== story._id) {
      return res.status(404).json({ message: 'That is not part of this case.' })
    }
    // Deleting the answer would leave a live, unsolvable game. Stand the
    // challenge down first rather than silently breaking it for readers.
    const game = await games.store.findDesign(story._id)
    if (game?.solutionKind === 'subject' && game.solutionKey === subject.key) {
      return res.status(409).json({ message: 'That is the answer to this case. Pick a different answer first.' })
    }
    await games.store.removeSubject(subject._id)
    res.json({ message: 'Removed' })
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

// ── Clues ────────────────────────────────────────────────────────────────────

// Validate a clue body against the passage it is pinned to. Returns the parsed
// fields, or null after replying.
const readClueBody = async (req, res, storyId) => {
  const label = trimmed(req.body?.label, 90)
  if (!label) {
    res.status(400).json({ message: 'A clue needs a line the reader will recognise.' })
    return null
  }

  const nodeId = req.body?.nodeId
  const node = nodeId ? await Node.findById(nodeId) : null
  if (!node || node.storyId !== storyId) {
    res.status(400).json({ message: 'Pin the clue to a passage in this story.' })
    return null
  }
  const kind = games.catalog.isClueKind(req.body?.kind) ? req.body.kind : 'clue'
  const weight = Number.parseInt(req.body?.weight, 10)
  if (!Number.isInteger(weight) || weight < 1 || weight > 5) {
    res.status(400).json({ message: 'Weight a clue from 1 to 5.' })
    return null
  }
  return {
    nodeId: node._id,
    label,
    detail: trimmed(req.body?.detail, 300) || null,
    kind,
    weight,
    optional: Boolean(req.body?.optional),
  }
}

router.post('/:storyId/clues', requireAuth, async (req, res) => {
  try {
    const story = await loadEditableStory(req, res)
    if (!story) return
    if ((await games.store.countClues(story._id)) >= games.store.MAX_CLUES) {
      return res.status(400).json({ message: `A case holds at most ${games.store.MAX_CLUES} clues.` })
    }
    const body = await readClueBody(req, res, story._id)
    if (!body) return
    res.status(201).json(await games.store.createClue(story._id, body))
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

router.put('/:storyId/clues/:clueId', requireAuth, async (req, res) => {
  try {
    const story = await loadEditableStory(req, res)
    if (!story) return
    const clue = await games.store.findClue(req.params.clueId)
    if (!clue || clue.storyId !== story._id) {
      return res.status(404).json({ message: 'That clue is not part of this case.' })
    }
    const body = await readClueBody(req, res, story._id)
    if (!body) return
    res.json(await games.store.updateClue(clue._id, body))
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

router.delete('/:storyId/clues/:clueId', requireAuth, async (req, res) => {
  try {
    const story = await loadEditableStory(req, res)
    if (!story) return
    const clue = await games.store.findClue(req.params.clueId)
    if (!clue || clue.storyId !== story._id) {
      return res.status(404).json({ message: 'That clue is not part of this case.' })
    }
    await games.store.removeClue(clue._id)
    res.json({ message: 'Removed' })
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

module.exports = router
