// The Story Game engine — orchestration only. It reacts to a reader arriving at
// a passage, to an answer being submitted, and to a note being written; the
// catalogue supplies the vocabulary, `scoring` supplies the arithmetic and
// `store` supplies the persistence. Nothing here branches on which mode a story
// uses, which is what lets a new mode be a config record.
//
// It is defensive by design, exactly like the achievement engine: a Story Game is
// a layer on top of reading, so a failure inside it must never break the read
// that triggered it. `onPassage` is called from the reading-progress save on
// every move and swallows its own errors.
//
// The reader's own state is only ever assembled through `readerView`, which is
// built from the safe projections — the solution has no path to the client.

const catalog = require('./catalog')
const store = require('./store')
const { scoreSession, resolveRank, answerMatches } = require('./scoring')
const achievements = require('../achievements')
const points = require('../points')

// ── Scoring ───────────────────────────────────────────────────────────────────

// Recompute and persist a session's score from its current facts. `finish` closes
// the clock the first time the reader either solves it or reaches an ending;
// after that the score can still grow (they kept reading) but the time is fixed.
const rescore = async (userId, storyId, game, session, { finish = false } = {}) => {
  const profile = catalog.scoringFor(game.mode)
  const summary = await store.discoverySummary(userId, storyId)
  const wrongAttempts = Math.max(0, session.attempts - (session.solved ? 1 : 0))

  // While the session is open the clock is still running; once closed, the stored
  // elapsed time is the one that counts.
  const elapsedMs =
    session.elapsedMs ?? Math.max(0, Date.now() - new Date(session.startedAt).getTime())

  const { score, perfect, breakdown } = scoreSession(
    {
      solved: session.solved,
      solvedBeforeReveal: session.solvedBeforeReveal,
      requiredTotal: summary.requiredTotal,
      requiredFound: summary.requiredFound,
      requiredWeightFound: summary.requiredWeightFound,
      sideWeightFound: summary.sideWeightFound,
      wrongAttempts,
      elapsedMs,
    },
    profile
  )

  const ladder = catalog.ladder(catalog.mode(game.mode)?.rank)
  const { current } = resolveRank(ladder, score)
  const saved = await store.saveScore(userId, storyId, {
    score,
    rankId: current?.id || null,
    perfect,
    finish,
  })

  return { session: saved || session, summary, score, perfect, breakdown }
}

// ── Reading hooks ─────────────────────────────────────────────────────────────

/**
 * Called from the reading-progress save whenever a signed-in reader lands on a
 * passage. Opens the session on first contact, banks any clues the passage
 * carries, notices when an ending has given the answer away, and rescores.
 *
 * Returns a small payload for the reader's client, or null when the story has no
 * game (the overwhelmingly common case, so that check comes first and cheap).
 * Never throws.
 */
const onPassage = async ({ userId, storyId, node, isAuthor = false }) => {
  if (!userId || !node) return null
  try {
    const game = await store.findGame(storyId)
    if (!game || !game.published) return null
    // An author walking their own case already knows the answer; scoring their
    // run would put them at the top of their own board. Same rule the choice
    // analytics and ending discoveries follow.
    if (isAuthor) return null

    let session = await store.openSession(userId, storyId)

    // Bank this passage's clues. Only genuinely new ones are reported back.
    const clues = await store.cluesForNode(node._id)
    const newIds = clues.length
      ? await store.recordDiscoveries(userId, storyId, clues.map((c) => c._id))
      : []
    const found = clues.filter((c) => newIds.includes(c._id))

    // Reaching an ending is the reveal: from here the story has told them, so a
    // later correct answer is worth less.
    let justRevealed = false
    if (node.isEnding && !session.revealedAt) {
      const revealed = await store.markRevealed(userId, storyId)
      if (revealed) {
        session = revealed
        justRevealed = true
      }
    }

    const closing = Boolean(session.solved || session.revealedAt)
    const wasFinished = Boolean(session.finishedAt)
    const scored = await rescore(userId, storyId, game, session, { finish: closing })
    const completed = !wasFinished && Boolean(scored.session.finishedAt)

    await creditDiscoveries(userId, storyId, found)
    if (completed) await creditCompletion(userId, storyId, scored)

    return {
      found: found.map((c) => ({ label: c.label, kind: c.kind, optional: c.optional })),
      justRevealed,
      completed,
      score: scored.score,
      clues: { found: scored.summary.requiredFound + scored.summary.sideFound, total: scored.summary.requiredTotal + scored.summary.sideTotal },
    }
  } catch (err) {
    console.error('[games] onPassage failed:', err.message)
    return null
  }
}

// ── The accusation ────────────────────────────────────────────────────────────

/**
 * Submit an answer. Readers may do this at any point — before the reveal for full
 * marks, after it for less. A wrong answer costs score and an attempt, and tells
 * them nothing beyond "not that": the story goes on undisturbed.
 */
const accuse = async ({ userId, storyId, answer, isAuthor = false }) => {
  const design = await store.findDesign(storyId)
  if (!design || !design.published) return { ok: false, reason: 'no_game' }
  if (isAuthor) return { ok: false, reason: 'author' }
  if (!String(answer || '').trim()) return { ok: false, reason: 'empty' }

  let session = await store.openSession(userId, storyId)
  if (session.solved) return { ok: false, reason: 'already_solved' }
  if (session.attempts >= design.maxAttempts) return { ok: false, reason: 'no_attempts' }

  // A subject answer is matched on its key, so renaming a suspect in the editor
  // never invalidates the solution.
  const correct = answerMatches(answer, design.solutionKey)

  await store.recordAttempt(userId, storyId, answer, correct)
  session = await store.bumpAttempts(userId, storyId)

  if (correct) {
    const beforeReveal = !session.revealedAt
    session = (await store.markSolved(userId, storyId, beforeReveal)) || session
  }

  const closing = Boolean(session.solved || session.revealedAt)
  const wasFinished = Boolean(session.finishedAt)
  const scored = await rescore(userId, storyId, design, session, { finish: closing })
  const completed = !wasFinished && Boolean(scored.session.finishedAt)

  if (correct) {
    await creditSolve(userId, storyId, scored)
    if (completed) await creditCompletion(userId, storyId, scored)
  }

  return {
    ok: true,
    correct,
    attemptsLeft: Math.max(0, design.maxAttempts - scored.session.attempts),
    // A miss returns nothing but the miss — no narrowing, no elimination, no
    // accidental spoiler.
    result: correct ? resultOf(design, scored) : null,
  }
}

// ── Reader-facing state ───────────────────────────────────────────────────────

// The finished-case summary: score, its breakdown, the rank it earned and where
// it stands. Built only for a reader who has solved or finished.
const resultOf = (game, scored) => ({
  score: scored.score,
  perfect: scored.perfect,
  breakdown: scored.breakdown,
  rank: rankOf(game.mode, scored.score),
  elapsedMs: scored.session.elapsedMs,
  solved: scored.session.solved,
  solvedBeforeReveal: scored.session.solvedBeforeReveal,
})

const rankOf = (modeId, score) => {
  const ladder = catalog.ladder(catalog.mode(modeId)?.rank)
  const { current, next } = resolveRank(ladder, score)
  return { ladder: ladder?.label || null, current, next }
}

/**
 * Everything a reader's notebook needs, for one story, through one viewer's eyes.
 *
 * Anonymous readers get the objective and the cast — enough to know a challenge
 * exists and to decide whether to sign in for it — but no session and no notes.
 * Undiscovered clues are not included at all: the notebook is a record of what
 * this reader noticed, never a checklist of what they missed.
 */
const readerView = async (storyId, userId) => {
  const game = await store.findGame(storyId)
  if (!game || !game.published) return null

  const mode = catalog.publicMode(game.mode)
  const [subjects, clues] = await Promise.all([store.listSubjects(storyId), store.listClues(storyId)])

  const base = {
    storyId,
    mode,
    objective: game.objective,
    briefing: game.briefing,
    solutionKind: game.solutionKind,
    maxAttempts: game.maxAttempts,
    subjects: subjects.map((s) => ({ key: s.key, name: s.name, blurb: s.blurb })),
    clueTotal: clues.length,
  }

  if (!userId) return { ...base, session: null, notebook: [], notes: '', anonymous: true }

  const [session, discovered, standing] = await Promise.all([
    store.getSession(userId, storyId),
    store.discoveredIds(userId, storyId),
    store.standing(storyId, userId),
  ])
  if (!session) {
    return { ...base, session: null, notebook: [], notes: '', anonymous: false }
  }

  const notebook = clues
    .filter((c) => discovered.has(c._id))
    .map((c) => ({ id: c._id, label: c.label, detail: c.detail, kind: c.kind, optional: c.optional }))

  const finished = Boolean(session.finishedAt)
  return {
    ...base,
    anonymous: false,
    notebook,
    notes: session.notes,
    session: {
      solved: session.solved,
      solvedBeforeReveal: session.solvedBeforeReveal,
      revealed: Boolean(session.revealedAt),
      finished,
      attempts: session.attempts,
      attemptsLeft: Math.max(0, game.maxAttempts - session.attempts),
      score: session.score,
      elapsedMs: session.elapsedMs,
      rank: rankOf(game.mode, session.score),
      standing,
    },
  }
}

const saveNotes = async (userId, storyId, notes) => {
  await store.openSession(userId, storyId)
  const session = await store.saveNotes(userId, storyId, String(notes || '').slice(0, 4000))
  return session?.notes ?? ''
}

// ── Rewards ───────────────────────────────────────────────────────────────────
// Points and achievements are both fire-and-forget: a reader's discovery is
// recorded the moment it happens, and the reward following it a beat later can
// fail without costing them anything.

const creditDiscoveries = async (userId, storyId, found) => {
  for (const clue of found) {
    await points.award(userId, {
      kind: 'game_clue',
      ref: clue._id,
      points: points.VALUES.clueFound,
      meta: { storyId, label: clue.label },
    })
  }
  if (found.length) achievements.emit(userId, 'CLUE_FOUND', { storyId })
}

const creditCompletion = async (userId, storyId, scored) => {
  await points.award(userId, {
    kind: 'game_completed',
    ref: storyId,
    points: points.VALUES.gameCompleted,
    meta: { score: scored.score },
  })
  achievements.emit(userId, 'GAME_COMPLETED', { storyId })
}

const creditSolve = async (userId, storyId, scored) => {
  await points.award(userId, {
    kind: 'game_solved',
    ref: storyId,
    points: points.VALUES.gameSolved,
    meta: { score: scored.score },
  })
  if (scored.perfect) {
    await points.award(userId, {
      kind: 'game_perfect',
      ref: storyId,
      points: points.VALUES.gamePerfect,
      meta: { score: scored.score },
    })
  }
  achievements.emit(userId, 'GAME_SOLVED', { storyId })
}

module.exports = { onPassage, accuse, readerView, saveNotes, rescore, rankOf, resultOf }
