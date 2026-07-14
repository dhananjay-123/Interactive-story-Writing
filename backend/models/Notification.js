const db = require('../db')

// A notification carries the actor (who caused it) and the story it concerns,
// both joined fresh so display names and titles never go stale. actor may be
// null if that account was since deleted.
const mapRow = (row) =>
  row && {
    _id: row.id,
    type: row.type,
    seen: row.seen,
    createdAt: row.created_at,
    data: row.data || {},
    actor: row.actor_id
      ? {
          _id: row.actor_id,
          username: row.actor_username,
          displayName: row.actor_display_name,
          avatarUrl: row.actor_avatar_url || null,
        }
      : null,
    story: row.story_id ? { _id: row.story_id, title: row.story_title } : null,
  }

const SELECT = `
  SELECT n.id, n.type, n.seen, n.created_at, n.data,
         n.actor_id, a.username AS actor_username, a.display_name AS actor_display_name, a.avatar_url AS actor_avatar_url,
         n.story_id, s.title AS story_title
  FROM notifications n
  LEFT JOIN users a   ON a.id = n.actor_id
  LEFT JOIN stories s ON s.id = n.story_id
`

// Insert one notification and return it in the same enriched shape the list uses,
// so the live socket push and a later fetch look identical to the client.
const create = async ({ userId, type, actorId = null, storyId = null, data = {} }) => {
  const { rows } = await db.query(
    `INSERT INTO notifications (user_id, type, actor_id, story_id, data)
     VALUES ($1, $2, $3, $4, $5) RETURNING id`,
    [userId, type, actorId, storyId, data]
  )
  const { rows: full } = await db.query(`${SELECT} WHERE n.id = $1`, [rows[0].id])
  return mapRow(full[0])
}

const listForUser = async (userId, limit = 30) => {
  const { rows } = await db.query(
    `${SELECT} WHERE n.user_id = $1 ORDER BY n.created_at DESC LIMIT $2`,
    [userId, limit]
  )
  return rows.map(mapRow)
}

const unseenCount = async (userId) => {
  const { rows } = await db.query(
    'SELECT COUNT(*) AS n FROM notifications WHERE user_id = $1 AND NOT seen',
    [userId]
  )
  return Number(rows[0].n)
}

// Mark specific notifications seen, or all of them when no ids are given. Scoped
// to the owner so one user can never flip another's notifications.
const markSeen = async (userId, ids = null) => {
  if (Array.isArray(ids)) {
    if (!ids.length) return
    await db.query(
      'UPDATE notifications SET seen = TRUE WHERE user_id = $1 AND id = ANY($2::uuid[]) AND NOT seen',
      [userId, ids]
    )
  } else {
    await db.query('UPDATE notifications SET seen = TRUE WHERE user_id = $1 AND NOT seen', [userId])
  }
}

module.exports = { create, listForUser, unseenCount, markSeen }
