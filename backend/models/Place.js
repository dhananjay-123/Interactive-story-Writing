const db = require('../db')

const mapPlace = (row) =>
  row && {
    _id: row.id,
    storyId: row.story_id,
    name: row.name,
    blurb: row.blurb,
    x: row.x,
    y: row.y,
    createdAt: row.created_at,
  }

const clampPct = (v) => Math.min(100, Math.max(0, Number(v)))

const findByStory = async (storyId) => {
  const { rows } = await db.query(
    'SELECT * FROM story_places WHERE story_id = $1 ORDER BY created_at ASC',
    [storyId]
  )
  return rows.map(mapPlace)
}

const findById = async (id) => {
  const { rows } = await db.query('SELECT * FROM story_places WHERE id = $1', [id])
  return mapPlace(rows[0])
}

const create = async ({ storyId, name, blurb, x, y }) => {
  const { rows } = await db.query(
    `INSERT INTO story_places (story_id, name, blurb, x, y)
     VALUES ($1, $2, $3, $4, $5) RETURNING *`,
    [storyId, name.trim(), (blurb || '').trim() || null, clampPct(x), clampPct(y)]
  )
  return mapPlace(rows[0])
}

const update = async (id, { name, blurb, x, y }) => {
  const { rows } = await db.query(
    `UPDATE story_places SET name = $2, blurb = $3, x = $4, y = $5
     WHERE id = $1 RETURNING *`,
    [id, name.trim(), (blurb || '').trim() || null, clampPct(x), clampPct(y)]
  )
  return mapPlace(rows[0])
}

const remove = async (id) => {
  await db.query('DELETE FROM story_places WHERE id = $1', [id])
}

// How many places a story may pin — enough for a rich map, bounded on a public
// write path.
const MAX_PER_STORY = 20

const countByStory = async (storyId) => {
  const { rows } = await db.query(
    'SELECT COUNT(*)::int AS n FROM story_places WHERE story_id = $1',
    [storyId]
  )
  return rows[0].n
}

module.exports = { findByStory, findById, create, update, remove, countByStory, MAX_PER_STORY }
