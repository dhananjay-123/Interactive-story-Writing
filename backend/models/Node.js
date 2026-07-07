const db = require('../db')

const mapNode = (row) =>
  row && {
    _id: row.id,
    storyId: row.story_id,
    text: row.text,
    choices: row.choices,
    isEnding: row.is_ending,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }

const normalizeChoices = (choices) =>
  (choices || []).map((c) => ({ text: c.text, nextNodeId: c.nextNodeId ?? null }))

const create = async ({ storyId, text, choices }) => {
  const normalized = normalizeChoices(choices)
  const { rows } = await db.query(
    `INSERT INTO nodes (story_id, text, choices, is_ending)
     VALUES ($1, $2, $3::jsonb, $4)
     RETURNING *`,
    [storyId, text, JSON.stringify(normalized), normalized.length === 0]
  )
  return mapNode(rows[0])
}

const findById = async (id) => {
  const { rows } = await db.query('SELECT * FROM nodes WHERE id = $1', [id])
  return mapNode(rows[0])
}

const attachChild = async (parentId, choiceIndex, childId) => {
  await db.query(
    `UPDATE nodes
     SET choices = jsonb_set(choices, ARRAY[$2::text, 'nextNodeId'], to_jsonb($3::text)),
         updated_at = NOW()
     WHERE id = $1
       AND jsonb_array_length(choices) > $2`,
    [parentId, choiceIndex, childId]
  )
}

module.exports = { create, findById, attachChild }
