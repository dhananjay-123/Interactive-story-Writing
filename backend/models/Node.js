const db = require('../db')

const mapNode = (row) =>
  row && {
    _id: row.id,
    storyId: row.story_id,
    text: row.text,
    content: row.content,
    choices: row.choices,
    isEnding: row.is_ending,
    placeId: row.place_id || null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }

const normalizeChoices = (choices) =>
  (choices || []).map((c) => ({ text: c.text, nextNodeId: c.nextNodeId ?? null }))

const create = async ({ storyId, text, content, choices }) => {
  const normalized = normalizeChoices(choices)
  const { rows } = await db.query(
    `INSERT INTO nodes (story_id, text, content, choices, is_ending)
     VALUES ($1, $2, $3::jsonb, $4::jsonb, $5)
     RETURNING *`,
    [storyId, text, content ? JSON.stringify(content) : null, JSON.stringify(normalized), normalized.length === 0]
  )
  return mapNode(rows[0])
}

const findById = async (id) => {
  const { rows } = await db.query('SELECT * FROM nodes WHERE id = $1', [id])
  return mapNode(rows[0])
}

const countByStory = async (storyId) => {
  const { rows } = await db.query(
    'SELECT COUNT(*)::int AS n FROM nodes WHERE story_id = $1',
    [storyId]
  )
  return rows[0].n
}

const findByStory = async (storyId) => {
  const { rows } = await db.query(
    'SELECT * FROM nodes WHERE story_id = $1 ORDER BY created_at ASC',
    [storyId]
  )
  return rows.map(mapNode)
}

// Edit an existing passage's text and choice labels. Callers pass the full
// choices array (each with its nextNodeId preserved) so existing links survive.
const update = async (id, { text, content, choices }) => {
  const normalized = (choices || []).map((c) => ({
    text: c.text,
    nextNodeId: c.nextNodeId ?? null,
  }))
  const { rows } = await db.query(
    `UPDATE nodes
     SET text = $2, content = $3::jsonb, choices = $4::jsonb, is_ending = $5, updated_at = NOW()
     WHERE id = $1
     RETURNING *`,
    [id, text, content ? JSON.stringify(content) : null, JSON.stringify(normalized), normalized.length === 0]
  )
  return mapNode(rows[0])
}

// Point a parent choice back at nothing (used when a branch is deleted).
const detachChild = async (parentId, choiceIndex) => {
  await db.query(
    `UPDATE nodes
     SET choices = jsonb_set(choices, ARRAY[$2::text, 'nextNodeId'], 'null'::jsonb),
         updated_at = NOW()
     WHERE id = $1
       AND jsonb_array_length(choices) > $2`,
    [parentId, choiceIndex]
  )
}

/* Delete a passage and everything that existed only underneath it.
   A story is a graph rather than a strictly a tree — several leads can rejoin at
   the same passage, which is how the investigation stories are built — so walking
   the children and deleting blindly would take out the shared passage and every
   other lead with it. Anything still reachable from the opening survives, and
   passages that were already orphaned elsewhere are left alone. */
const deleteSubtree = async (id) => {
  const node = await findById(id)
  if (!node) return

  const { rows } = await db.query('SELECT id, choices FROM nodes WHERE story_id = $1', [node.storyId])
  const links = new Map(rows.map((r) => [r.id, (r.choices || []).map((c) => c.nextNodeId).filter(Boolean)]))

  // Everything under the passage being removed, cycles included.
  const doomed = new Set()
  const collect = (from) => {
    if (doomed.has(from)) return
    doomed.add(from)
    ;(links.get(from) || []).forEach(collect)
  }
  collect(id)

  // Everything the reader can still get to without passing through it.
  const { rows: storyRows } = await db.query('SELECT root_node_id FROM stories WHERE id = $1', [node.storyId])
  const root = storyRows[0]?.root_node_id
  const kept = new Set()
  const reach = (from) => {
    if (!from || from === id || kept.has(from)) return
    kept.add(from)
    ;(links.get(from) || []).forEach(reach)
  }
  reach(root)

  const gone = [...doomed].filter((n) => !kept.has(n))
  if (gone.length) await db.query('DELETE FROM nodes WHERE id = ANY($1::uuid[])', [gone])
}

// Pin a passage to a place on the story's world map (or null to unpin).
const setPlace = async (id, placeId) => {
  const { rows } = await db.query(
    `UPDATE nodes SET place_id = $2, updated_at = NOW() WHERE id = $1 RETURNING *`,
    [id, placeId || null]
  )
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

module.exports = {
  create,
  findById,
  countByStory,
  findByStory,
  update,
  setPlace,
  attachChild,
  detachChild,
  deleteSubtree,
}
