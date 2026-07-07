const db = require('../db')

const mapStory = (row) =>
  row && {
    _id: row.id,
    title: row.title,
    description: row.description,
    genre: row.genre,
    author: row.author,
    authorId: row.author_id,
    authorUsername: row.author_username || null,
    rootNodeId: row.root_node_id,
    branchCount: row.branch_count,
    published: row.published,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }

// Joins the author's username so the frontend can link to their profile.
const SELECT_WITH_AUTHOR = `
  SELECT s.*, u.username AS author_username
  FROM stories s
  LEFT JOIN users u ON u.id = s.author_id
`

const findPublished = async () => {
  const { rows } = await db.query(
    `${SELECT_WITH_AUTHOR} WHERE s.published = TRUE ORDER BY s.created_at DESC`
  )
  return rows.map(mapStory)
}

const findById = async (id) => {
  const { rows } = await db.query(`${SELECT_WITH_AUTHOR} WHERE s.id = $1`, [id])
  return mapStory(rows[0])
}

const findByAuthorId = async (authorId) => {
  const { rows } = await db.query(
    `${SELECT_WITH_AUTHOR} WHERE s.author_id = $1 AND s.published = TRUE ORDER BY s.created_at DESC`,
    [authorId]
  )
  return rows.map(mapStory)
}

const create = async ({ title, description, genre, author, authorId }) => {
  const { rows } = await db.query(
    `INSERT INTO stories (title, description, genre, author, author_id)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [title, description || null, genre || 'fantasy', author || 'Anonymous', authorId || null]
  )
  return mapStory(rows[0])
}

const setRoot = async (id, rootNodeId, branchCount) => {
  const { rows } = await db.query(
    `UPDATE stories
     SET root_node_id = $2, branch_count = $3, updated_at = NOW()
     WHERE id = $1
     RETURNING *`,
    [id, rootNodeId, branchCount]
  )
  return mapStory(rows[0])
}

const setBranchCount = async (id, count) => {
  await db.query(
    'UPDATE stories SET branch_count = $2, updated_at = NOW() WHERE id = $1',
    [id, count]
  )
}

const remove = async (id) => {
  await db.query('DELETE FROM stories WHERE id = $1', [id])
}

module.exports = { findPublished, findById, findByAuthorId, create, setRoot, setBranchCount, remove }
