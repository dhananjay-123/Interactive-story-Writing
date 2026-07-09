const db = require('../db')

const mapReport = (row) =>
  row && {
    _id: row.id,
    storyId: row.story_id,
    reason: row.reason,
    details: row.details,
    status: row.status,
    createdAt: row.created_at,
    resolvedAt: row.resolved_at,
    reporter: row.reporter_username
      ? { username: row.reporter_username, displayName: row.reporter_display_name }
      : null,
    story: row.story_title
      ? {
          _id: row.story_id,
          title: row.story_title,
          published: row.story_published,
          authorUsername: row.story_author_username,
        }
      : null,
  }

const create = async ({ storyId, reporterId, reason, details }) => {
  const { rows } = await db.query(
    `INSERT INTO reports (story_id, reporter_id, reason, details)
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
    [storyId, reporterId || null, reason, details || null]
  )
  return mapReport(rows[0])
}

// Admin queue, newest first, joined with the reported story + reporter identity.
const listAll = async (status) => {
  const params = []
  let where = ''
  if (status && status !== 'all') {
    params.push(status)
    where = `WHERE r.status = $1`
  }
  const { rows } = await db.query(
    `SELECT r.*,
       ru.username AS reporter_username, ru.display_name AS reporter_display_name,
       s.title AS story_title, s.published AS story_published,
       su.username AS story_author_username
     FROM reports r
     LEFT JOIN users ru ON ru.id = r.reporter_id
     LEFT JOIN stories s ON s.id = r.story_id
     LEFT JOIN users su ON su.id = s.author_id
     ${where}
     ORDER BY r.created_at DESC`,
    params
  )
  return rows.map(mapReport)
}

// Mark a report resolved or dismissed, recording who closed it.
const resolve = async (id, status, adminId) => {
  const { rows } = await db.query(
    `UPDATE reports
     SET status = $2, resolved_by = $3, resolved_at = NOW()
     WHERE id = $1
     RETURNING *`,
    [id, status, adminId]
  )
  return mapReport(rows[0])
}

const openCount = async () => {
  const { rows } = await db.query(`SELECT COUNT(*)::int AS n FROM reports WHERE status = 'open'`)
  return rows[0].n
}

module.exports = { create, listAll, resolve, openCount }
