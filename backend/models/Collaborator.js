const db = require('../db')

// The people a story owner has invited to co-write, newest first, with the
// public bits of each account the editor UI needs to render them.
const listForStory = async (storyId) => {
  const { rows } = await db.query(
    `SELECT u.id, u.username, u.display_name, u.avatar_url, c.added_at
     FROM story_collaborators c
     JOIN users u ON u.id = c.user_id
     WHERE c.story_id = $1
     ORDER BY c.added_at ASC`,
    [storyId]
  )
  return rows.map((r) => ({
    _id: r.id,
    username: r.username,
    displayName: r.display_name,
    avatarUrl: r.avatar_url || null,
    addedAt: r.added_at,
  }))
}

// True when this user is a collaborator (not the owner) on the story.
const isCollaborator = async (storyId, userId) => {
  if (!userId) return false
  const { rowCount } = await db.query(
    'SELECT 1 FROM story_collaborators WHERE story_id = $1 AND user_id = $2',
    [storyId, userId]
  )
  return rowCount > 0
}

// Idempotent — inviting someone already on the story is a no-op.
const add = async (storyId, userId) => {
  await db.query(
    `INSERT INTO story_collaborators (story_id, user_id)
     VALUES ($1, $2)
     ON CONFLICT (story_id, user_id) DO NOTHING`,
    [storyId, userId]
  )
}

const remove = async (storyId, userId) => {
  await db.query(
    'DELETE FROM story_collaborators WHERE story_id = $1 AND user_id = $2',
    [storyId, userId]
  )
}

// The stories this user has been invited to help write (they don't own these).
const storiesForUser = async (userId) => {
  const { rows } = await db.query(
    'SELECT story_id FROM story_collaborators WHERE user_id = $1',
    [userId]
  )
  return rows.map((r) => r.story_id)
}

module.exports = { listForStory, isCollaborator, add, remove, storiesForUser }
