const db = require('../db')

const record = async ({ storyId, fromNodeId, toNodeId, choiceIndex, userId }) => {
  const { rows } = await db.query(
    `INSERT INTO choice_events (story_id, from_node_id, to_node_id, choice_index, user_id)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id`,
    [storyId, fromNodeId, toNodeId, choiceIndex, userId || null]
  )
  return rows[0].id
}

// How often each choice was taken, per passage. The reader-facing text lives on
// nodes.choices, so callers zip this against the story's nodes.
const distribution = async (storyId) => {
  const { rows } = await db.query(
    `SELECT from_node_id, choice_index, COUNT(*)::int AS n
     FROM choice_events
     WHERE story_id = $1
     GROUP BY from_node_id, choice_index`,
    [storyId]
  )
  return rows
}

// Headline numbers. Anonymous readers can't be told apart, so "readers" counts
// distinct signed-in accounts and we report the anonymous share separately.
const summary = async (storyId) => {
  const { rows } = await db.query(
    `SELECT
       COUNT(*)::int                                              AS choices,
       COUNT(DISTINCT e.user_id)::int                             AS readers,
       COUNT(*) FILTER (WHERE e.user_id IS NULL)::int             AS anonymous_choices,
       COUNT(*) FILTER (WHERE n.is_ending)::int                   AS endings_reached
     FROM choice_events e
     JOIN nodes n ON n.id = e.to_node_id
     WHERE e.story_id = $1`,
    [storyId]
  )
  const r = rows[0]
  return {
    choices: r.choices,
    readers: r.readers,
    anonymousChoices: r.anonymous_choices,
    endingsReached: r.endings_reached,
  }
}

// Which endings readers actually land on, most-reached first.
const endings = async (storyId) => {
  const { rows } = await db.query(
    `SELECT e.to_node_id AS node_id, n.text, COUNT(*)::int AS n
     FROM choice_events e
     JOIN nodes n ON n.id = e.to_node_id
     WHERE e.story_id = $1 AND n.is_ending = TRUE
     GROUP BY e.to_node_id, n.text
     ORDER BY n DESC`,
    [storyId]
  )
  return rows.map((r) => ({ nodeId: r.node_id, text: r.text, count: r.n }))
}

module.exports = { record, distribution, summary, endings }
