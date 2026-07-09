const db = require('../db')

const mapComment = (row) =>
  row && {
    _id: row.id,
    storyId: row.story_id,
    body: row.body,
    createdAt: row.created_at,
    author: {
      _id: row.user_id,
      username: row.username,
      displayName: row.display_name,
      avatarUrl: row.avatar_url || null,
    },
  }

// Newest first, with the commenter's public identity joined in.
const listByStory = async (storyId) => {
  const { rows } = await db.query(
    `SELECT c.*, u.username, u.display_name, u.avatar_url
     FROM comments c
     JOIN users u ON u.id = c.user_id
     WHERE c.story_id = $1
     ORDER BY c.created_at DESC`,
    [storyId]
  )
  return rows.map(mapComment)
}

const create = async ({ storyId, userId, body }) => {
  const { rows } = await db.query(
    `INSERT INTO comments (story_id, user_id, body) VALUES ($1, $2, $3) RETURNING id`,
    [storyId, userId, body]
  )
  // Re-read with the author join so the client gets a fully-shaped comment.
  const { rows: full } = await db.query(
    `SELECT c.*, u.username, u.display_name, u.avatar_url
     FROM comments c JOIN users u ON u.id = c.user_id
     WHERE c.id = $1`,
    [rows[0].id]
  )
  return mapComment(full[0])
}

const findById = async (id) => {
  const { rows } = await db.query('SELECT * FROM comments WHERE id = $1', [id])
  return rows[0] && { _id: rows[0].id, storyId: rows[0].story_id, userId: rows[0].user_id }
}

const remove = async (id) => {
  await db.query('DELETE FROM comments WHERE id = $1', [id])
}

const countByStory = async (storyId) => {
  const { rows } = await db.query('SELECT COUNT(*)::int AS n FROM comments WHERE story_id = $1', [storyId])
  return rows[0].n
}

module.exports = { listByStory, create, findById, remove, countByStory }
