const db = require('../db')

const mapSnapshot = (row) =>
  row && {
    _id: row.id,
    nodeId: row.node_id,
    storyId: row.story_id,
    text: row.text,
    content: row.content,
    choices: row.choices,
    isEnding: row.is_ending,
    editedBy: row.edited_by,
    editorName: row.editor_name, // present on list joins
    createdAt: row.created_at,
  }

// Keep a bounded history per passage so a heavily-edited node can't grow the
// table without limit. Oldest snapshots beyond the cap are pruned.
const KEEP_PER_NODE = 25

// Record the passage's CURRENT state as a prior version. Call this just before
// an edit/restore overwrites the node.
const record = async (node, editedBy) => {
  await db.query(
    `INSERT INTO node_snapshots (node_id, story_id, text, content, choices, is_ending, edited_by)
     VALUES ($1, $2, $3, $4::jsonb, $5::jsonb, $6, $7)`,
    [
      node._id,
      node.storyId,
      node.text || '',
      node.content ? JSON.stringify(node.content) : null,
      JSON.stringify(node.choices || []),
      (node.choices || []).length === 0,
      editedBy || null,
    ]
  )
  await db.query(
    `DELETE FROM node_snapshots
     WHERE node_id = $1
       AND id NOT IN (
         SELECT id FROM node_snapshots WHERE node_id = $1
         ORDER BY created_at DESC LIMIT $2
       )`,
    [node._id, KEEP_PER_NODE]
  )
}

const listForNode = async (nodeId) => {
  const { rows } = await db.query(
    `SELECT s.*, u.display_name AS editor_name
     FROM node_snapshots s
     LEFT JOIN users u ON u.id = s.edited_by
     WHERE s.node_id = $1
     ORDER BY s.created_at DESC`,
    [nodeId]
  )
  return rows.map(mapSnapshot)
}

const findById = async (id) => {
  const { rows } = await db.query('SELECT * FROM node_snapshots WHERE id = $1', [id])
  return mapSnapshot(rows[0])
}

module.exports = { record, listForNode, findById }
