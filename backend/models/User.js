const db = require('../db')

// Public shape — never leak the password hash to the client.
const mapUser = (row) =>
  row && {
    _id: row.id,
    username: row.username,
    email: row.email,
    displayName: row.display_name,
    bio: row.bio,
    avatarUrl: row.avatar_url || null,
    role: row.role,
    createdAt: row.created_at,
  }

// Internal shape used only for password verification.
const mapAuth = (row) =>
  row && { ...mapUser(row), passwordHash: row.password_hash }

const create = async ({ username, email, passwordHash, displayName, bio }) => {
  const { rows } = await db.query(
    `INSERT INTO users (username, email, password_hash, display_name, bio)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [username, email, passwordHash, displayName || username, bio || null]
  )
  return mapUser(rows[0])
}

const findById = async (id) => {
  const { rows } = await db.query('SELECT * FROM users WHERE id = $1', [id])
  return mapUser(rows[0])
}

const setAvatar = async (id, avatarUrl) => {
  const { rows } = await db.query(
    'UPDATE users SET avatar_url = $2 WHERE id = $1 RETURNING *',
    [id, avatarUrl]
  )
  return mapUser(rows[0])
}

const findByUsername = async (username) => {
  const { rows } = await db.query(
    'SELECT * FROM users WHERE LOWER(username) = LOWER($1)',
    [username]
  )
  return mapUser(rows[0])
}

// Returns the auth shape (with hash) — for login only.
const findByEmailWithHash = async (email) => {
  const { rows } = await db.query(
    'SELECT * FROM users WHERE LOWER(email) = LOWER($1)',
    [email]
  )
  return mapAuth(rows[0])
}

// Admin roster: every user with their published/total story counts, newest first.
const listAllForAdmin = async () => {
  const { rows } = await db.query(
    `SELECT u.*,
       (SELECT COUNT(*)::int FROM stories s WHERE s.author_id = u.id) AS story_count
     FROM users u
     ORDER BY u.created_at DESC`
  )
  return rows.map((row) => ({ ...mapUser(row), storyCount: row.story_count }))
}

// Admin: promote to admin or demote to author.
const setRole = async (id, role) => {
  const { rows } = await db.query(
    'UPDATE users SET role = $2 WHERE id = $1 RETURNING *',
    [id, role]
  )
  return mapUser(rows[0])
}

const usernameOrEmailTaken = async (username, email) => {
  const { rows } = await db.query(
    'SELECT username, email FROM users WHERE LOWER(username) = LOWER($1) OR LOWER(email) = LOWER($2)',
    [username, email]
  )
  const taken = { username: false, email: false }
  for (const r of rows) {
    if (r.username.toLowerCase() === username.toLowerCase()) taken.username = true
    if (r.email.toLowerCase() === email.toLowerCase()) taken.email = true
  }
  return taken
}

module.exports = {
  create,
  findById,
  setAvatar,
  findByUsername,
  findByEmailWithHash,
  listAllForAdmin,
  setRole,
  usernameOrEmailTaken,
}
