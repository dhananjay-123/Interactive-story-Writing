const db = require('../db')

// ── Likes ──────────────────────────────────────────────────────────────────
const like = async (userId, storyId) => {
  await db.query(
    `INSERT INTO likes (user_id, story_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
    [userId, storyId]
  )
}
const unlike = async (userId, storyId) => {
  await db.query('DELETE FROM likes WHERE user_id = $1 AND story_id = $2', [userId, storyId])
}
const likeCount = async (storyId) => {
  const { rows } = await db.query('SELECT COUNT(*)::int AS n FROM likes WHERE story_id = $1', [storyId])
  return rows[0].n
}

// ── Bookmarks ──────────────────────────────────────────────────────────────
const bookmark = async (userId, storyId) => {
  await db.query(
    `INSERT INTO bookmarks (user_id, story_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
    [userId, storyId]
  )
}
const unbookmark = async (userId, storyId) => {
  await db.query('DELETE FROM bookmarks WHERE user_id = $1 AND story_id = $2', [userId, storyId])
}

// ── Ratings ────────────────────────────────────────────────────────────────
// Upsert — rating again just changes the reader's existing score.
const rate = async (userId, storyId, value) => {
  await db.query(
    `INSERT INTO ratings (user_id, story_id, value)
     VALUES ($1, $2, $3)
     ON CONFLICT (user_id, story_id)
     DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()`,
    [userId, storyId, value]
  )
}
const unrate = async (userId, storyId) => {
  await db.query('DELETE FROM ratings WHERE user_id = $1 AND story_id = $2', [userId, storyId])
}
// { avg, count } — avg rounded to one decimal, 0 when unrated.
const ratingSummary = async (storyId) => {
  const { rows } = await db.query(
    `SELECT COALESCE(ROUND(AVG(value)::numeric, 1), 0)::float AS avg, COUNT(*)::int AS count
     FROM ratings WHERE story_id = $1`,
    [storyId]
  )
  return { avg: rows[0].avg, count: rows[0].count }
}

module.exports = {
  like, unlike, likeCount,
  bookmark, unbookmark,
  rate, unrate, ratingSummary,
}
