// Shared analysis of a story's passage tree, consumed by the visual graph,
// the validator and the debugger. Everything here is pure — give it the raw
// nodes array + rootId from /api/nodes/story/:id/tree and it derives structure,
// a tidy layout and a list of issues. No dependencies, no side effects.

// Node box geometry (also used by the SVG graph to size the canvas).
export const NODE_W = 188
export const NODE_H = 62
const COL_GAP = 240 // horizontal distance between sibling columns
const ROW_GAP = 138 // vertical distance between depths

const isEmptyPassage = (node) =>
  !(node.text && node.text.trim()) && !node.content

const passageKind = (node, rootId) => {
  if (node._id === rootId) return 'opening'
  if ((node.choices || []).length === 0) return 'ending'
  return 'passage'
}

// Walk the tree from the root, recording reachability, depth and each node's
// parent. Guards against cycles (shouldn't happen in a strict tree, but a
// corrupt link mustn't hang the UI).
function traverse(map, rootId) {
  const reachable = new Set()
  const depth = {}
  const parentOf = {}
  if (!rootId || !map[rootId]) return { reachable, depth, parentOf }

  const queue = [rootId]
  reachable.add(rootId)
  depth[rootId] = 0
  while (queue.length) {
    const id = queue.shift()
    const node = map[id]
    if (!node) continue
    ;(node.choices || []).forEach((c, i) => {
      const next = c.nextNodeId
      if (next && map[next] && !reachable.has(next)) {
        reachable.add(next)
        depth[next] = depth[id] + 1
        parentOf[next] = { parentId: id, choiceIndex: i }
        queue.push(next)
      }
    })
  }
  return { reachable, depth, parentOf }
}

// Tidy top-down layout: leaves take the next free column, parents centre over
// their children. Returns pixel positions keyed by node id. Orphaned subtrees
// (unreachable from the root) are laid out after, so they still appear.
function layout(map, rootId, reachable) {
  const pos = {}
  let cursor = 0
  const placed = new Set()

  const place = (id, d) => {
    if (placed.has(id) || !map[id]) return null
    placed.add(id)
    const kids = (map[id].choices || [])
      .map((c) => c.nextNodeId)
      .filter((cid) => cid && map[cid] && !placed.has(cid))

    let col
    if (kids.length === 0) {
      col = cursor
      cursor += 1
    } else {
      const cols = kids.map((k) => place(k, d + 1)).filter((v) => v != null)
      col = cols.length ? (cols[0] + cols[cols.length - 1]) / 2 : (cursor += 1) - 1
    }
    pos[id] = { x: col * COL_GAP, y: d * ROW_GAP, col, depth: d }
    return col
  }

  if (rootId && map[rootId]) place(rootId, 0)

  // Any node the root can't reach: lay each remaining subtree root out to the
  // side so authors can still find and fix it.
  for (const id of Object.keys(map)) {
    if (!placed.has(id)) {
      cursor += 1 // a gap before the orphan strip
      place(id, 0)
    }
  }
  return pos
}

export function analyzeStory(nodes, rootId) {
  const map = {}
  for (const n of nodes || []) map[n._id] = n

  const { reachable, depth, parentOf } = traverse(map, rootId)
  const pos = layout(map, rootId, reachable)

  const issues = []
  let endings = 0
  let openPaths = 0
  let reachableEndings = 0
  let choiceTotal = 0
  let maxDepth = 0

  for (const node of Object.values(map)) {
    const kind = passageKind(node, rootId)
    const choices = node.choices || []
    choiceTotal += choices.length
    if (reachable.has(node._id)) maxDepth = Math.max(maxDepth, depth[node._id] || 0)

    if (kind === 'ending') {
      endings += 1
      if (reachable.has(node._id)) reachableEndings += 1
    }

    // Unreachable content — orphaned by a delete/detach.
    if (!reachable.has(node._id) && node._id !== rootId) {
      issues.push({
        level: 'error',
        code: 'unreachable',
        nodeId: node._id,
        title: 'Unreachable passage',
        detail: 'No path from the opening leads here. It was likely orphaned when a branch was removed.',
      })
    }

    // Empty passage body.
    if (isEmptyPassage(node)) {
      issues.push({
        level: 'warning',
        code: 'empty-passage',
        nodeId: node._id,
        title: 'Empty passage',
        detail: 'This passage has no text, image or embed.',
      })
    }

    choices.forEach((c, i) => {
      if (!c.text || !c.text.trim()) {
        issues.push({
          level: 'warning',
          code: 'empty-choice',
          nodeId: node._id,
          choiceIndex: i,
          title: 'Choice with no label',
          detail: `Choice ${String.fromCharCode(65 + i)} on this passage has no text.`,
        })
      }
      if (!c.nextNodeId) {
        openPaths += 1
        issues.push({
          level: 'warning',
          code: 'open-branch',
          nodeId: node._id,
          choiceIndex: i,
          title: 'Unwritten branch',
          detail: `“${(c.text || 'A choice').trim()}” leads nowhere yet — a reader hits a dead end.`,
        })
      } else if (!map[c.nextNodeId]) {
        issues.push({
          level: 'error',
          code: 'broken-link',
          nodeId: node._id,
          choiceIndex: i,
          title: 'Broken link',
          detail: 'This choice points at a passage that no longer exists.',
        })
      }
    })
  }

  // A story you can start but can never finish.
  if (rootId && map[rootId] && reachableEndings === 0) {
    issues.unshift({
      level: 'error',
      code: 'no-ending',
      nodeId: rootId,
      title: 'No reachable ending',
      detail: 'Every path from the opening runs into an unwritten branch — readers can never reach “The End”.',
    })
  }

  const total = Object.keys(map).length
  const order = { error: 0, warning: 1, info: 2 }
  issues.sort((a, b) => order[a.level] - order[b.level])

  return {
    map,
    pos,
    reachable,
    depth,
    parentOf,
    issues,
    stats: {
      passages: total,
      endings,
      reachableEndings,
      openPaths,
      orphans: total - reachable.size,
      maxDepth,
      avgChoices: total ? choiceTotal / total : 0,
      errors: issues.filter((i) => i.level === 'error').length,
      warnings: issues.filter((i) => i.level === 'warning').length,
    },
  }
}

export { passageKind, isEmptyPassage }
