const db = require('../db')

const mapStory = (row) =>
  row && {
    _id: row.id,
    title: row.title,
    description: row.description,
    genre: row.genre,
    author: row.author,
    rootNodeId: row.root_node_id,
    branchCount: row.branch_count,
    published: row.published,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }

const findPublished = async () => {
  const { rows } = await db.query(
    'SELECT * FROM stories WHERE published = TRUE ORDER BY created_at DESC'
  )
  return rows.map(mapStory)
}

const findById = async (id) => {
  const { rows } = await db.query('SELECT * FROM stories WHERE id = $1', [id])
  return mapStory(rows[0])
}

const create = async ({ title, description, genre, author }) => {
  const { rows } = await db.query(
    `INSERT INTO stories (title, description, genre, author)
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
    [title, description || null, genre || 'fantasy', author || 'Anonymous']
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

const remove = async (id) => {
  await db.query('DELETE FROM stories WHERE id = $1', [id])
}

module.exports = { findPublished, findById, create, setRoot, remove }
