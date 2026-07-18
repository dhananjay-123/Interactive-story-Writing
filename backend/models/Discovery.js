const db = require('../db')

// Which endings a reader has collected in a story. Recording is idempotent —
// re-reaching an ending is not a new discovery.
const record = async ({ userId, storyId, nodeId }) => {
  const { rowCount } = await db.query(
    `INSERT INTO ending_discoveries (user_id, story_id, node_id)
     VALUES ($1, $2, $3)
     ON CONFLICT DO NOTHING`,
    [userId, storyId, nodeId]
  )
  return rowCount > 0 // true the first time only
}

// The story's ending collection, seen through one viewer's eyes. Undiscovered
// endings deliberately carry no node id and no text: GET /api/nodes/:id is
// public, so shipping the id would hand out the spoiler with one extra request.
// They appear only as sealed slots with a rarity hint.
const collection = async (storyId, viewerId) => {
  const [{ rows: endings }, { rows: counts }, { rows: explorersRow }, found] = await Promise.all([
    db.query(
      `SELECT id, text FROM nodes
       WHERE story_id = $1 AND is_ending = TRUE
       ORDER BY created_at ASC`,
      [storyId]
    ),
    db.query(
      `SELECT node_id, COUNT(*)::int AS n
       FROM ending_discoveries WHERE story_id = $1 GROUP BY node_id`,
      [storyId]
    ),
    db.query(
      `SELECT COUNT(DISTINCT user_id)::int AS n
       FROM ending_discoveries WHERE story_id = $1`,
      [storyId]
    ),
    viewerId
      ? db
          .query(
            `SELECT node_id FROM ending_discoveries WHERE story_id = $1 AND user_id = $2`,
            [storyId, viewerId]
          )
          .then((r) => new Set(r.rows.map((row) => row.node_id)))
      : Promise.resolve(new Set()),
  ])

  const foundBy = new Map(counts.map((c) => [c.node_id, c.n]))
  const explorers = explorersRow[0].n

  const items = endings.map((e, i) => {
    const n = foundBy.get(e.id) || 0
    // Share of this story's explorers who have found this ending. An ending
    // under one-in-five is presented as rare.
    const share = explorers > 0 ? n / explorers : 0
    const base = { slot: i + 1, foundBy: n, rare: explorers >= 3 && share > 0 && share < 0.2 }
    if (!found.has(e.id)) return { ...base, found: false }
    return {
      ...base,
      found: true,
      nodeId: e.id,
      snippet: (e.text || '').replace(/\s+/g, ' ').trim().slice(0, 90),
    }
  })

  return {
    total: endings.length,
    foundCount: items.filter((e) => e.found).length,
    explorers,
    endings: items,
  }
}

module.exports = { record, collection }
