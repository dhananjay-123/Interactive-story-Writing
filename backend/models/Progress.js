const db = require('../db')

const mapProgress = (row) =>
  row && {
    storyId: row.story_id,
    currentNodeId: row.current_node_id,
    path: row.path || [],
    updatedAt: row.updated_at,
  }

// One bookmark per (reader, story) — moving through the story overwrites it.
const save = async ({ userId, storyId, currentNodeId, path }) => {
  const { rows } = await db.query(
    `INSERT INTO reading_progress (user_id, story_id, current_node_id, path, updated_at)
     VALUES ($1, $2, $3, $4::uuid[], NOW())
     ON CONFLICT (user_id, story_id) DO UPDATE
       SET current_node_id = EXCLUDED.current_node_id,
           path            = EXCLUDED.path,
           updated_at      = NOW()
     RETURNING *`,
    [userId, storyId, currentNodeId, path || []]
  )
  return mapProgress(rows[0])
}

const get = async (userId, storyId) => {
  const { rows } = await db.query(
    'SELECT * FROM reading_progress WHERE user_id = $1 AND story_id = $2',
    [userId, storyId]
  )
  return mapProgress(rows[0])
}

const clear = async (userId, storyId) => {
  await db.query('DELETE FROM reading_progress WHERE user_id = $1 AND story_id = $2', [
    userId,
    storyId,
  ])
}

// The "continue reading" shelf. Skips stories the reader has finished (an ending
// has no choices) and anything since unpublished.
const listForUser = async (userId, limit = 8) => {
  const { rows } = await db.query(
    `SELECT p.story_id, p.current_node_id, p.updated_at,
            cardinality(p.path) AS depth,
            n.is_ending,
            s.title, s.description, s.genre, s.author, s.author_id, s.tags
     FROM reading_progress p
     JOIN stories s ON s.id = p.story_id
     JOIN nodes   n ON n.id = p.current_node_id
     WHERE p.user_id = $1
       AND s.published = TRUE
       AND n.is_ending = FALSE
     ORDER BY p.updated_at DESC
     LIMIT $2`,
    [userId, limit]
  )
  return rows.map((row) => ({
    _id: row.story_id,
    title: row.title,
    description: row.description,
    genre: row.genre,
    author: row.author,
    authorId: row.author_id,
    tags: row.tags || [],
    currentNodeId: row.current_node_id,
    passagesIn: (row.depth || 0) + 1,
    updatedAt: row.updated_at,
  }))
}

module.exports = { save, get, clear, listForUser }
