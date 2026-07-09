const db = require('../db')

const mapRequest = (row) =>
  row && {
    _id: row.id,
    userId: row.user_id,
    note: row.note,
    status: row.status,
    createdAt: row.created_at,
    resolvedAt: row.resolved_at,
    user: row.username
      ? {
          _id: row.user_id,
          username: row.username,
          displayName: row.display_name,
          email: row.email,
          role: row.role,
        }
      : null,
  }

// Unique-violation on idx_prr_one_pending — the user already has an open request.
const UNIQUE_VIOLATION = '23505'

// Returns the new request, or null when one is already pending for this user.
// Callers must not surface the difference: it would leak whether an email exists.
const create = async ({ userId, note }) => {
  try {
    const { rows } = await db.query(
      `INSERT INTO password_reset_requests (user_id, note)
       VALUES ($1, $2)
       RETURNING *`,
      [userId, note || null]
    )
    return mapRequest(rows[0])
  } catch (err) {
    if (err.code === UNIQUE_VIOLATION) return null
    throw err
  }
}

// Admin queue, newest first, joined with the account that asked.
const listAll = async (status) => {
  const params = []
  let where = ''
  if (status && status !== 'all') {
    params.push(status)
    where = 'WHERE r.status = $1'
  }
  const { rows } = await db.query(
    `SELECT r.*, u.username, u.display_name, u.email, u.role
     FROM password_reset_requests r
     JOIN users u ON u.id = r.user_id
     ${where}
     ORDER BY r.created_at DESC`,
    params
  )
  return rows.map(mapRequest)
}

const findById = async (id) => {
  const { rows } = await db.query(
    `SELECT r.*, u.username, u.display_name, u.email, u.role
     FROM password_reset_requests r
     JOIN users u ON u.id = r.user_id
     WHERE r.id = $1`,
    [id]
  )
  return mapRequest(rows[0])
}

const resolve = async (id, status, adminId) => {
  const { rows } = await db.query(
    `UPDATE password_reset_requests
     SET status = $2, resolved_by = $3, resolved_at = NOW()
     WHERE id = $1
     RETURNING *`,
    [id, status, adminId]
  )
  return mapRequest(rows[0])
}

// Close whatever the user had open — called after any successful reset for them.
const resolveForUser = async (userId, adminId) => {
  await db.query(
    `UPDATE password_reset_requests
     SET status = 'resolved', resolved_by = $2, resolved_at = NOW()
     WHERE user_id = $1 AND status = 'pending'`,
    [userId, adminId]
  )
}

const pendingCount = async () => {
  const { rows } = await db.query(
    `SELECT COUNT(*)::int AS n FROM password_reset_requests WHERE status = 'pending'`
  )
  return rows[0].n
}

module.exports = { create, listAll, findById, resolve, resolveForUser, pendingCount }
