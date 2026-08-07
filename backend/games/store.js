// Persistence for Story Games: the author's configuration (game, subjects,
// clues) and each reader's session (discoveries, attempts, notes, score). Pure
// data access — the engine composes these into behaviour.
//
// Two things this file is careful about:
//   • `solution_key` never leaves through a reader-facing mapper. Only
//     `mapDesign` exposes it, and only the story's team can reach that path.
//   • Discovery is idempotent by primary key, so walking back over a passage can
//     never re-find a clue or inflate a score.

const db = require('../db')

// ── Configuration (author side) ───────────────────────────────────────────────

// The reader-safe projection. Deliberately missing solution_key and answer_hint.
const mapGame = (row) =>
  row && {
    storyId: row.story_id,
    mode: row.mode,
    objective: row.objective,
    briefing: row.briefing || null,
    solutionKind: row.solution_kind,
    maxAttempts: row.max_attempts,
    published: row.published,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }

// The authoring projection — includes the answer. Team-only.
const mapDesign = (row) =>
  row && { ...mapGame(row), solutionKey: row.solution_key, answerHint: row.answer_hint || null }

const mapSubject = (row) =>
  row && {
    _id: row.id,
    storyId: row.story_id,
    key: row.key,
    name: row.name,
    blurb: row.blurb || null,
    sortOrder: row.sort_order,
  }

const mapClue = (row) =>
  row && {
    _id: row.id,
    storyId: row.story_id,
    nodeId: row.node_id,
    label: row.label,
    detail: row.detail || null,
    kind: row.kind,
    weight: row.weight,
    optional: row.optional,
    createdAt: row.created_at,
  }

const findGame = async (storyId) => {
  const { rows } = await db.query('SELECT * FROM story_games WHERE story_id = $1', [storyId])
  return mapGame(rows[0])
}

const findDesign = async (storyId) => {
  const { rows } = await db.query('SELECT * FROM story_games WHERE story_id = $1', [storyId])
  return mapDesign(rows[0])
}

// Create or replace a story's game layer in one statement — the author edits one
// form, so a partial update has no meaning here.
const upsertGame = async (storyId, { mode, objective, briefing, solutionKind, solutionKey, answerHint, maxAttempts, published }) => {
  const { rows } = await db.query(
    `INSERT INTO story_games
       (story_id, mode, objective, briefing, solution_kind, solution_key, answer_hint, max_attempts, published, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
     ON CONFLICT (story_id) DO UPDATE
       SET mode = EXCLUDED.mode,
           objective = EXCLUDED.objective,
           briefing = EXCLUDED.briefing,
           solution_kind = EXCLUDED.solution_kind,
           solution_key = EXCLUDED.solution_key,
           answer_hint = EXCLUDED.answer_hint,
           max_attempts = EXCLUDED.max_attempts,
           published = EXCLUDED.published,
           updated_at = NOW()
     RETURNING *`,
    [storyId, mode, objective, briefing || null, solutionKind, solutionKey, answerHint || null, maxAttempts, published]
  )
  return mapDesign(rows[0])
}

const removeGame = async (storyId) => {
  await db.query('DELETE FROM story_games WHERE story_id = $1', [storyId])
}

// ── Subjects (the answer options: suspects, witnesses, exits…) ────────────────

const MAX_SUBJECTS = 12

const listSubjects = async (storyId) => {
  const { rows } = await db.query(
    'SELECT * FROM game_subjects WHERE story_id = $1 ORDER BY sort_order ASC, created_at ASC',
    [storyId]
  )
  return rows.map(mapSubject)
}

const countSubjects = async (storyId) => {
  const { rows } = await db.query('SELECT COUNT(*)::int AS n FROM game_subjects WHERE story_id = $1', [storyId])
  return rows[0].n
}

const createSubject = async (storyId, { key, name, blurb, sortOrder }) => {
  const { rows } = await db.query(
    `INSERT INTO game_subjects (story_id, key, name, blurb, sort_order)
     VALUES ($1, $2, $3, $4, $5) RETURNING *`,
    [storyId, key, name, blurb || null, sortOrder ?? 0]
  )
  return mapSubject(rows[0])
}

const updateSubject = async (id, { name, blurb, sortOrder }) => {
  const { rows } = await db.query(
    `UPDATE game_subjects SET name = $2, blurb = $3, sort_order = $4 WHERE id = $1 RETURNING *`,
    [id, name, blurb || null, sortOrder ?? 0]
  )
  return mapSubject(rows[0])
}

const findSubject = async (id) => {
  const { rows } = await db.query('SELECT * FROM game_subjects WHERE id = $1', [id])
  return mapSubject(rows[0])
}

const removeSubject = async (id) => {
  await db.query('DELETE FROM game_subjects WHERE id = $1', [id])
}

// ── Clues ─────────────────────────────────────────────────────────────────────

const MAX_CLUES = 60

const listClues = async (storyId) => {
  const { rows } = await db.query(
    'SELECT * FROM game_clues WHERE story_id = $1 ORDER BY created_at ASC',
    [storyId]
  )
  return rows.map(mapClue)
}

const cluesForNode = async (nodeId) => {
  const { rows } = await db.query('SELECT * FROM game_clues WHERE node_id = $1 ORDER BY created_at ASC', [nodeId])
  return rows.map(mapClue)
}

const countClues = async (storyId) => {
  const { rows } = await db.query('SELECT COUNT(*)::int AS n FROM game_clues WHERE story_id = $1', [storyId])
  return rows[0].n
}

const findClue = async (id) => {
  const { rows } = await db.query('SELECT * FROM game_clues WHERE id = $1', [id])
  return mapClue(rows[0])
}

const createClue = async (storyId, { nodeId, label, detail, kind, weight, optional }) => {
  const { rows } = await db.query(
    `INSERT INTO game_clues (story_id, node_id, label, detail, kind, weight, optional)
     VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
    [storyId, nodeId, label, detail || null, kind, weight, optional]
  )
  return mapClue(rows[0])
}

const updateClue = async (id, { nodeId, label, detail, kind, weight, optional }) => {
  const { rows } = await db.query(
    `UPDATE game_clues
       SET node_id = $2, label = $3, detail = $4, kind = $5, weight = $6, optional = $7
     WHERE id = $1 RETURNING *`,
    [id, nodeId, label, detail || null, kind, weight, optional]
  )
  return mapClue(rows[0])
}

const removeClue = async (id) => {
  await db.query('DELETE FROM game_clues WHERE id = $1', [id])
}

// ── Sessions ──────────────────────────────────────────────────────────────────

const mapSession = (row) =>
  row && {
    storyId: row.story_id,
    startedAt: row.started_at,
    finishedAt: row.finished_at || null,
    revealedAt: row.revealed_at || null,
    solvedAt: row.solved_at || null,
    attempts: row.attempts,
    solved: row.solved,
    solvedBeforeReveal: row.solved_before_reveal,
    perfect: row.perfect,
    score: row.score,
    rankId: row.rank_id || null,
    elapsedMs: row.elapsed_ms == null ? null : Number(row.elapsed_ms),
    notes: row.notes || '',
    updatedAt: row.updated_at,
  }

const getSession = async (userId, storyId) => {
  const { rows } = await db.query(
    'SELECT * FROM game_sessions WHERE user_id = $1 AND story_id = $2',
    [userId, storyId]
  )
  return mapSession(rows[0])
}

// Open a session the first time a reader touches a game story. Idempotent: a
// second call returns the session they already had, clock and all.
const openSession = async (userId, storyId) => {
  const { rows } = await db.query(
    `INSERT INTO game_sessions (user_id, story_id)
     VALUES ($1, $2)
     ON CONFLICT (user_id, story_id) DO UPDATE SET updated_at = game_sessions.updated_at
     RETURNING *`,
    [userId, storyId]
  )
  return mapSession(rows[0])
}

// Stamp the moment the story itself gave the answer away (an ending was reached).
// Only the first reveal counts — later endings don't move it.
const markRevealed = async (userId, storyId) => {
  const { rows } = await db.query(
    `UPDATE game_sessions SET revealed_at = NOW(), updated_at = NOW()
     WHERE user_id = $1 AND story_id = $2 AND revealed_at IS NULL
     RETURNING *`,
    [userId, storyId]
  )
  return mapSession(rows[0]) // null when it was already revealed
}

const markSolved = async (userId, storyId, beforeReveal) => {
  const { rows } = await db.query(
    `UPDATE game_sessions
       SET solved = TRUE, solved_at = NOW(), solved_before_reveal = $3, updated_at = NOW()
     WHERE user_id = $1 AND story_id = $2 AND NOT solved
     RETURNING *`,
    [userId, storyId, beforeReveal]
  )
  return mapSession(rows[0])
}

const bumpAttempts = async (userId, storyId) => {
  const { rows } = await db.query(
    `UPDATE game_sessions SET attempts = attempts + 1, updated_at = NOW()
     WHERE user_id = $1 AND story_id = $2 RETURNING *`,
    [userId, storyId]
  )
  return mapSession(rows[0])
}

// Write the score and rank. `finish` stamps finished_at + elapsed_ms the first
// time the session closes; afterwards the clock is left alone but the score keeps
// updating, so reading on past the answer is still rewarded.
const saveScore = async (userId, storyId, { score, rankId, perfect, finish }) => {
  const { rows } = await db.query(
    `UPDATE game_sessions
       SET score = $3,
           rank_id = $4,
           perfect = $5,
           finished_at = CASE WHEN $6 AND finished_at IS NULL THEN NOW() ELSE finished_at END,
           elapsed_ms = CASE
             WHEN $6 AND finished_at IS NULL
               THEN (EXTRACT(EPOCH FROM (NOW() - started_at)) * 1000)::bigint
             ELSE elapsed_ms END,
           updated_at = NOW()
     WHERE user_id = $1 AND story_id = $2
     RETURNING *`,
    [userId, storyId, score, rankId, Boolean(perfect), Boolean(finish)]
  )
  return mapSession(rows[0])
}

const saveNotes = async (userId, storyId, notes) => {
  const { rows } = await db.query(
    `UPDATE game_sessions SET notes = $3, updated_at = NOW()
     WHERE user_id = $1 AND story_id = $2 RETURNING *`,
    [userId, storyId, notes]
  )
  return mapSession(rows[0])
}

// ── Discoveries ───────────────────────────────────────────────────────────────

// Record every clue on a passage for this reader. The primary key makes it a
// no-op for clues they already hold, and RETURNING tells us which ones were
// genuinely new — that's what the reader gets told about.
const recordDiscoveries = async (userId, storyId, clueIds) => {
  if (!clueIds.length) return []
  const { rows } = await db.query(
    `INSERT INTO game_discoveries (user_id, story_id, clue_id)
     SELECT $1, $2, unnest($3::uuid[])
     ON CONFLICT DO NOTHING
     RETURNING clue_id`,
    [userId, storyId, clueIds]
  )
  return rows.map((r) => r.clue_id)
}

const discoveredIds = async (userId, storyId) => {
  const { rows } = await db.query(
    'SELECT clue_id FROM game_discoveries WHERE user_id = $1 AND story_id = $2',
    [userId, storyId]
  )
  return new Set(rows.map((r) => r.clue_id))
}

// Everything the scorer needs about one reader's discoveries, in one round-trip.
const discoverySummary = async (userId, storyId) => {
  const { rows } = await db.query(
    `SELECT
       COUNT(*) FILTER (WHERE NOT c.optional)::int                             AS required_total,
       COUNT(*) FILTER (WHERE NOT c.optional AND d.user_id IS NOT NULL)::int   AS required_found,
       COALESCE(SUM(c.weight) FILTER (WHERE NOT c.optional AND d.user_id IS NOT NULL), 0)::int AS required_weight_found,
       COUNT(*) FILTER (WHERE c.optional)::int                                 AS side_total,
       COUNT(*) FILTER (WHERE c.optional AND d.user_id IS NOT NULL)::int       AS side_found,
       COALESCE(SUM(c.weight) FILTER (WHERE c.optional AND d.user_id IS NOT NULL), 0)::int     AS side_weight_found
     FROM game_clues c
     LEFT JOIN game_discoveries d ON d.clue_id = c.id AND d.user_id = $2
     WHERE c.story_id = $1`,
    [storyId, userId]
  )
  const r = rows[0] || {}
  return {
    requiredTotal: r.required_total || 0,
    requiredFound: r.required_found || 0,
    requiredWeightFound: r.required_weight_found || 0,
    sideTotal: r.side_total || 0,
    sideFound: r.side_found || 0,
    sideWeightFound: r.side_weight_found || 0,
  }
}

// ── Attempts ──────────────────────────────────────────────────────────────────

const recordAttempt = async (userId, storyId, answer, correct) => {
  await db.query(
    'INSERT INTO game_attempts (user_id, story_id, answer, correct) VALUES ($1, $2, $3, $4)',
    [userId, storyId, String(answer).slice(0, 200), correct]
  )
}

const listAttempts = async (userId, storyId) => {
  const { rows } = await db.query(
    `SELECT answer, correct, created_at FROM game_attempts
      WHERE user_id = $1 AND story_id = $2 ORDER BY created_at ASC`,
    [userId, storyId]
  )
  return rows.map((r) => ({ answer: r.answer, correct: r.correct, createdAt: r.created_at }))
}

// ── Leaderboards ──────────────────────────────────────────────────────────────

const boardRow = (r, position) => ({
  position,
  user: { username: r.username, displayName: r.display_name, avatarUrl: r.avatar_url || null },
  score: r.score,
  elapsedMs: r.elapsed_ms == null ? null : Number(r.elapsed_ms),
  solved: r.solved,
  rankId: r.rank_id || null,
  finishedAt: r.finished_at,
})

// One board shape, three windows. `friends` is the reader's own follow graph —
// the same table the rest of the platform's social features already use.
const BOARD_FILTERS = {
  global: '',
  weekly: "AND g.finished_at > NOW() - INTERVAL '7 days'",
  friends: 'AND g.user_id IN (SELECT following_id FROM follows WHERE follower_id = $3)',
}

const leaderboard = async (storyId, board = 'global', viewerId = null, limit = 10) => {
  const filter = BOARD_FILTERS[board] ?? BOARD_FILTERS.global
  if (board === 'friends' && !viewerId) return []
  const params = [storyId, Math.min(Math.max(Number(limit) || 10, 1), 50)]
  if (board === 'friends') params.push(viewerId)

  const { rows } = await db.query(
    `SELECT u.username, u.display_name, u.avatar_url,
            g.score, g.elapsed_ms, g.solved, g.rank_id, g.finished_at
       FROM game_sessions g JOIN users u ON u.id = g.user_id
      WHERE g.story_id = $1 AND g.finished_at IS NOT NULL AND g.score > 0 ${filter}
      ORDER BY g.score DESC, g.elapsed_ms ASC NULLS LAST, g.finished_at ASC
      LIMIT $2`,
    params
  )
  return rows.map((r, i) => boardRow(r, i + 1))
}

// Where this reader stands on the global board, even when they're off the end of
// the top ten. Null until they finish.
const standing = async (storyId, userId) => {
  const { rows } = await db.query(
    `WITH ranked AS (
       SELECT user_id,
              ROW_NUMBER() OVER (ORDER BY score DESC, elapsed_ms ASC NULLS LAST, finished_at ASC) AS position,
              COUNT(*) OVER () AS total
         FROM game_sessions
        WHERE story_id = $1 AND finished_at IS NOT NULL AND score > 0
     )
     SELECT position::int, total::int FROM ranked WHERE user_id = $2`,
    [storyId, userId]
  )
  return rows[0] ? { position: rows[0].position, total: rows[0].total } : null
}

module.exports = {
  MAX_SUBJECTS,
  MAX_CLUES,
  findGame, findDesign, upsertGame, removeGame,
  listSubjects, countSubjects, createSubject, updateSubject, findSubject, removeSubject,
  listClues, cluesForNode, countClues, findClue, createClue, updateClue, removeClue,
  getSession, openSession, markRevealed, markSolved, bumpAttempts, saveScore, saveNotes,
  recordDiscoveries, discoveredIds, discoverySummary,
  recordAttempt, listAttempts,
  leaderboard, standing,
}
