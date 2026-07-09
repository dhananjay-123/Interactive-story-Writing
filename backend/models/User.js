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
    passwordChangedAt: row.password_changed_at || null,
    banned: !!row.banned_at,
    bannedAt: row.banned_at || null,
  }

// Adds the moderation note. Admin surfaces only — never returned to the public.
const mapAdminUser = (row) => row && { ...mapUser(row), banReason: row.ban_reason || null }

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

// Same, by id — used when verifying the current password on a self-serve change.
const findByIdWithHash = async (id) => {
  const { rows } = await db.query('SELECT * FROM users WHERE id = $1', [id])
  return mapAuth(rows[0])
}

// Swap the hash and stamp the change, which invalidates tokens issued earlier.
const setPassword = async (id, passwordHash) => {
  const { rows } = await db.query(
    `UPDATE users SET password_hash = $2, password_changed_at = NOW()
     WHERE id = $1
     RETURNING *`,
    [id, passwordHash]
  )
  return mapUser(rows[0])
}

// Admin roster: every user with their published/total story counts, newest first.
const listAllForAdmin = async () => {
  const { rows } = await db.query(
    `SELECT u.*,
       (SELECT COUNT(*)::int FROM stories s WHERE s.author_id = u.id) AS story_count
     FROM users u
     ORDER BY u.created_at DESC`
  )
  return rows.map((row) => ({ ...mapAdminUser(row), storyCount: row.story_count }))
}

// Admin: one account with everything a moderator needs to judge it.
const findByIdForAdmin = async (id) => {
  const { rows } = await db.query(
    `SELECT u.*,
       (SELECT COUNT(*)::int FROM stories s WHERE s.author_id = u.id)                       AS story_count,
       (SELECT COUNT(*)::int FROM stories s WHERE s.author_id = u.id AND s.published)       AS published_count,
       (SELECT COUNT(*)::int FROM comments c WHERE c.user_id = u.id)                        AS comment_count,
       (SELECT COUNT(*)::int FROM follows f WHERE f.following_id = u.id)                    AS follower_count,
       (SELECT COUNT(*)::int FROM follows f WHERE f.follower_id = u.id)                     AS following_count,
       (SELECT COUNT(*)::int FROM likes l JOIN stories s ON s.id = l.story_id
          WHERE s.author_id = u.id)                                                         AS likes_received,
       (SELECT COUNT(*)::int FROM reports r JOIN stories s ON s.id = r.story_id
          WHERE s.author_id = u.id AND r.status = 'open')                                   AS open_reports
     FROM users u
     WHERE u.id = $1`,
    [id]
  )
  const row = rows[0]
  if (!row) return null
  return {
    ...mapAdminUser(row),
    storyCount: row.story_count,
    publishedCount: row.published_count,
    commentCount: row.comment_count,
    followerCount: row.follower_count,
    followingCount: row.following_count,
    likesReceived: row.likes_received,
    openReports: row.open_reports,
  }
}

// Admin: suspend or reinstate. Banning stamps banned_at, which requireAuth reads
// to reject tokens minted before the suspension.
const setBanned = async (id, banned, reason) => {
  const { rows } = await db.query(
    `UPDATE users
     SET banned_at = CASE WHEN $2 THEN NOW() ELSE NULL END,
         ban_reason = CASE WHEN $2 THEN $3 ELSE NULL END
     WHERE id = $1
     RETURNING *`,
    [id, banned, reason || null]
  )
  return mapAdminUser(rows[0])
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
  findByIdWithHash,
  setPassword,
  listAllForAdmin,
  findByIdForAdmin,
  setBanned,
  setRole,
  usernameOrEmailTaken,
}
