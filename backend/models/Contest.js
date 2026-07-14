const db = require('../db')

// Status is always computed from the clock, in SQL, so lists and details agree
// and nothing ever needs a cron to flip a contest closed.
const STATUS_SQL = `
  CASE
    WHEN NOW() < c.starts_at THEN 'upcoming'
    WHEN NOW() < c.ends_at   THEN 'open'
    ELSE 'closed'
  END
`

const mapContest = (row) =>
  row && {
    _id: row.id,
    title: row.title,
    theme: row.theme || '',
    genre: row.genre || null,
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    status: row.status,
    entryCount: Number(row.entry_count || 0),
    voteCount: Number(row.vote_count || 0),
    createdAt: row.created_at,
  }

// All contests, open rounds first, then upcoming, then the archive.
const list = async () => {
  const { rows } = await db.query(`
    SELECT c.*, ${STATUS_SQL} AS status,
      (SELECT COUNT(*) FROM contest_entries e WHERE e.contest_id = c.id) AS entry_count,
      (SELECT COUNT(*) FROM contest_votes v WHERE v.contest_id = c.id) AS vote_count
    FROM contests c
    ORDER BY
      CASE ${STATUS_SQL} WHEN 'open' THEN 0 WHEN 'upcoming' THEN 1 ELSE 2 END,
      c.ends_at DESC
  `)
  return rows.map(mapContest)
}

const findById = async (id) => {
  const { rows } = await db.query(
    `SELECT c.*, ${STATUS_SQL} AS status,
       (SELECT COUNT(*) FROM contest_entries e WHERE e.contest_id = c.id) AS entry_count,
       (SELECT COUNT(*) FROM contest_votes v WHERE v.contest_id = c.id) AS vote_count
     FROM contests c WHERE c.id = $1`,
    [id]
  )
  return mapContest(rows[0])
}

// The entries board: story + author + vote tally, most-voted first (earliest
// entry breaks ties). viewerId flags which entry is mine and where my vote sits.
const entries = async (contestId, viewerId = null) => {
  const { rows } = await db.query(
    `SELECT e.story_id, e.user_id, e.created_at,
       s.title, s.description, s.genre, s.branch_count,
       u.username, u.display_name, u.avatar_url,
       (SELECT COUNT(*) FROM contest_votes v
         WHERE v.contest_id = e.contest_id AND v.story_id = e.story_id) AS votes,
       (e.user_id = $2) AS is_mine,
       EXISTS (SELECT 1 FROM contest_votes v
         WHERE v.contest_id = e.contest_id AND v.story_id = e.story_id AND v.voter_id = $2) AS my_vote
     FROM contest_entries e
     JOIN stories s ON s.id = e.story_id
     JOIN users u   ON u.id = e.user_id
     WHERE e.contest_id = $1
     ORDER BY votes DESC, e.created_at ASC`,
    [contestId, viewerId]
  )
  return rows.map((r) => ({
    storyId: r.story_id,
    title: r.title,
    description: r.description || '',
    genre: r.genre,
    branchCount: r.branch_count,
    author: {
      _id: r.user_id,
      username: r.username,
      displayName: r.display_name,
      avatarUrl: r.avatar_url || null,
    },
    votes: Number(r.votes),
    isMine: r.is_mine,
    myVote: r.my_vote,
    enteredAt: r.created_at,
  }))
}

const create = async ({ title, theme, genre, startsAt, endsAt, createdBy }) => {
  const { rows } = await db.query(
    `INSERT INTO contests (title, theme, genre, starts_at, ends_at, created_by)
     VALUES ($1, $2, $3, COALESCE($4, NOW()), $5, $6) RETURNING id`,
    [title, theme || null, genre || null, startsAt || null, endsAt, createdBy]
  )
  return findById(rows[0].id)
}

const update = async (id, { title, theme, genre, endsAt }) => {
  await db.query(
    `UPDATE contests SET
       title  = COALESCE($2, title),
       theme  = COALESCE($3, theme),
       genre  = $4,
       ends_at = COALESCE($5, ends_at)
     WHERE id = $1`,
    [id, title || null, theme ?? null, genre || null, endsAt || null]
  )
  return findById(id)
}

const remove = (id) => db.query('DELETE FROM contests WHERE id = $1', [id])

// Throws pg error 23505 when the author already has an entry in this contest —
// the route turns that into a 409 rather than pre-checking racily.
const enter = (contestId, storyId, userId) =>
  db.query(
    'INSERT INTO contest_entries (contest_id, story_id, user_id) VALUES ($1, $2, $3)',
    [contestId, storyId, userId]
  )

const withdraw = (contestId, userId) =>
  db.query('DELETE FROM contest_entries WHERE contest_id = $1 AND user_id = $2', [
    contestId,
    userId,
  ])

const findEntry = async (contestId, storyId) => {
  const { rows } = await db.query(
    'SELECT user_id FROM contest_entries WHERE contest_id = $1 AND story_id = $2',
    [contestId, storyId]
  )
  return rows[0] || null
}

// One vote per contest; voting again simply moves it.
const vote = (contestId, voterId, storyId) =>
  db.query(
    `INSERT INTO contest_votes (contest_id, story_id, voter_id)
     VALUES ($1, $2, $3)
     ON CONFLICT (contest_id, voter_id)
       DO UPDATE SET story_id = EXCLUDED.story_id, created_at = NOW()`,
    [contestId, storyId, voterId]
  )

const unvote = (contestId, voterId) =>
  db.query('DELETE FROM contest_votes WHERE contest_id = $1 AND voter_id = $2', [
    contestId,
    voterId,
  ])

module.exports = { list, findById, entries, create, update, remove, enter, withdraw, findEntry, vote, unvote }
