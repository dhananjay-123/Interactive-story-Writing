/* Rewrites one story's passage graph (and its game clues) from a content module.
   Validates the graph first, backs up what is there, and does the swap in a
   transaction. Usage: node load-story.js boathouse.js [--apply] */

const fs = require('fs')
const path = require('path')
const BACKEND = path.join(__dirname, '..')
require('dotenv').config({ path: path.join(BACKEND, '.env'), quiet: true })
const { Pool } = require('pg')

if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL not found in', path.join(BACKEND, '.env'))
  process.exit(1)
}

const file = process.argv[2]
if (!file) {
  console.error('usage: node backend/content/load-story.js <content-file.js> [--apply]')
  process.exit(1)
}
const APPLY = process.argv.includes('--apply')
const content = require(path.resolve(__dirname, file))

// ── offline validation ──────────────────────────────────────────────────────
const validate = (c) => {
  const errs = []
  const keys = Object.keys(c.nodes)
  if (!c.nodes[c.root]) errs.push(`root "${c.root}" is not a passage`)
  for (const [k, n] of Object.entries(c.nodes)) {
    const choices = n.choices || []
    if (n.ending && choices.length) errs.push(`${k}: ending has choices`)
    if (!n.ending && !choices.length) errs.push(`${k}: dead end that is not marked as an ending`)
    // choice_events.choice_index is CHECKed BETWEEN 0 AND 5, so a seventh choice
    // would read fine and then fail to record when anyone took it.
    if (choices.length > 6) errs.push(`${k}: ${choices.length} choices (analytics records at most 6)`)
    choices.forEach(([label, target]) => {
      if (!c.nodes[target]) errs.push(`${k}: choice "${label}" points at missing "${target}"`)
    })
    if (!n.text || n.text.length < 80) errs.push(`${k}: passage is too short`)
  }
  // reachability
  const seen = new Set()
  const walk = (k) => { if (seen.has(k)) return; seen.add(k); (c.nodes[k].choices || []).forEach(([, t]) => walk(t)) }
  walk(c.root)
  keys.filter((k) => !seen.has(k)).forEach((k) => errs.push(`${k}: unreachable from the opening`))
  return errs
}

// ── how it actually plays ───────────────────────────────────────────────────
const simulate = (c, runs = 2000) => {
  const steps = []
  const clueCounts = []
  const endingsHit = new Map()
  for (let i = 0; i < runs; i++) {
    let at = c.root
    let n = 0
    const clues = new Set()
    while (n < 200) {
      const node = c.nodes[at]
      ;(node.clues || []).forEach((cl) => clues.add(cl[0]))
      const ch = node.choices || []
      if (!ch.length) { endingsHit.set(at, (endingsHit.get(at) || 0) + 1); break }
      at = ch[Math.floor(Math.random() * ch.length)][1]
      n++
    }
    steps.push(n)
    clueCounts.push(clues.size)
  }
  const med = (a) => a.slice().sort((x, y) => x - y)[Math.floor(a.length / 2)]
  return {
    moves: { min: Math.min(...steps), median: med(steps), max: Math.max(...steps) },
    clues: { min: Math.min(...clueCounts), median: med(clueCounts), max: Math.max(...clueCounts) },
    endingsReached: endingsHit.size,
  }
}

const shortestToEnding = (c) => {
  const q = [[c.root, 0]]
  const seen = new Set([c.root])
  while (q.length) {
    const [k, d] = q.shift()
    const ch = c.nodes[k].choices || []
    if (!ch.length) return d
    for (const [, t] of ch) if (!seen.has(t)) { seen.add(t); q.push([t, d + 1]) }
  }
  return -1
}

const backupPath = (title) => path.join(__dirname, `backup-${title.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}.json`)

/* Put back exactly what was there before the last --apply. The passages get new
   ids on the way back in, so the story's opening is repointed and anything that
   referenced the old ids (a reader's saved place, the choice counts) is gone
   either way — this restores the prose, the links and the clues, not the traffic. */
const revert = async () => {
  const file = backupPath(content.title)
  if (!fs.existsSync(file)) {
    console.error(`\n  no backup at ${file}\n`)
    process.exit(1)
  }
  const old = JSON.parse(fs.readFileSync(file, 'utf8'))
  const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } })
  const client = await pool.connect()
  try {
    const storyId = old.story[0].id
    await client.query('BEGIN')
    const current = (await client.query('SELECT id FROM nodes WHERE story_id = $1', [storyId])).rows.map((r) => r.id)

    const idFor = {}
    for (const n of old.nodes) {
      const { rows } = await client.query(
        `INSERT INTO nodes (story_id, text, content, choices, is_ending) VALUES ($1, $2, $3::jsonb, '[]'::jsonb, $4) RETURNING id`,
        [storyId, n.text, n.content ? JSON.stringify(n.content) : null, n.is_ending]
      )
      idFor[n.id] = rows[0].id
    }
    for (const n of old.nodes) {
      const choices = (n.choices || []).map((c) => ({ text: c.text, nextNodeId: c.nextNodeId ? idFor[c.nextNodeId] : null }))
      await client.query('UPDATE nodes SET choices = $2::jsonb WHERE id = $1', [idFor[n.id], JSON.stringify(choices)])
    }
    await client.query('UPDATE stories SET root_node_id = $2, branch_count = $3, updated_at = NOW() WHERE id = $1', [
      storyId, idFor[old.story[0].root_node_id], Math.max(0, old.nodes.length - 1),
    ])
    if (current.length) await client.query('DELETE FROM nodes WHERE id = ANY($1::uuid[])', [current])
    for (const c of old.clues) {
      await client.query(
        `INSERT INTO game_clues (story_id, node_id, label, detail, kind, weight, optional) VALUES ($1,$2,$3,$4,$5,$6,$7)`,
        [storyId, idFor[c.node_id], c.label, c.detail, c.kind, c.weight, c.optional]
      )
    }
    if (old.game[0]) {
      const g = old.game[0]
      await client.query(
        `UPDATE story_games SET objective=$2, briefing=$3, solution_key=$4, max_attempts=$5, updated_at=NOW() WHERE story_id=$1`,
        [storyId, g.objective, g.briefing, g.solution_key, g.max_attempts]
      )
    }
    await client.query('COMMIT')
    console.log(`\n  reverted "${content.title}" to ${old.nodes.length} passages, ${old.clues.length} clues\n`)
  } catch (e) {
    await client.query('ROLLBACK').catch(() => {})
    console.error('\n  REVERT FAILED, rolled back:', e.message, '\n')
    process.exitCode = 1
  } finally {
    client.release()
    await pool.end()
  }
}

const main = async () => {
  if (process.argv.includes('--revert')) return revert()
  const errs = validate(content)
  const totalClues = Object.values(content.nodes).reduce((a, n) => a + (n.clues || []).length, 0)
  const endings = Object.values(content.nodes).filter((n) => n.ending).length
  const choices = Object.values(content.nodes).reduce((a, n) => a + (n.choices || []).length, 0)

  console.log(`\n${content.title}`)
  console.log(`  passages ${Object.keys(content.nodes).length} | choices ${choices} | endings ${endings} | clues ${totalClues}`)
  console.log(`  shortest run to an ending: ${shortestToEnding(content)} moves`)
  const sim = simulate(content)
  console.log(`  random playthroughs — moves min/med/max ${sim.moves.min}/${sim.moves.median}/${sim.moves.max}`)
  console.log(`  random playthroughs — clues min/med/max ${sim.clues.min}/${sim.clues.median}/${sim.clues.max}`)
  console.log(`  endings reachable: ${sim.endingsReached}/${endings}`)
  if (errs.length) {
    console.log('\n  VALIDATION FAILED:')
    errs.forEach((e) => console.log('   -', e))
    process.exit(1)
  }
  console.log('  graph validates ✓')
  if (!APPLY) { console.log('\n  (dry run — pass --apply to write to the database)\n'); return }

  const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } })
  const client = await pool.connect()
  try {
    const story = (await client.query('SELECT id, title FROM stories WHERE title = $1', [content.title])).rows[0]
    if (!story) throw new Error(`no story titled "${content.title}"`)

    // Back up whatever is there now, in case the new prose is worse.
    const old = {
      nodes: (await client.query('SELECT * FROM nodes WHERE story_id = $1', [story.id])).rows,
      clues: (await client.query('SELECT * FROM game_clues WHERE story_id = $1', [story.id])).rows,
      game: (await client.query('SELECT * FROM story_games WHERE story_id = $1', [story.id])).rows,
      story: (await client.query('SELECT * FROM stories WHERE id = $1', [story.id])).rows,
    }
    const backup = backupPath(content.title)
    fs.writeFileSync(backup, JSON.stringify(old, null, 1))

    await client.query('BEGIN')
    const oldIds = old.nodes.map((n) => n.id)

    // 1. create every new passage without links
    const idFor = {}
    for (const [key, n] of Object.entries(content.nodes)) {
      const { rows } = await client.query(
        `INSERT INTO nodes (story_id, text, choices, is_ending) VALUES ($1, $2, '[]'::jsonb, $3) RETURNING id`,
        [story.id, n.text, !!n.ending]
      )
      idFor[key] = rows[0].id
    }
    // 2. wire them up
    for (const [key, n] of Object.entries(content.nodes)) {
      const choices = (n.choices || []).map(([text, target]) => ({ text, nextNodeId: idFor[target] }))
      await client.query('UPDATE nodes SET choices = $2::jsonb WHERE id = $1', [idFor[key], JSON.stringify(choices)])
    }
    // 3. point the story at the new opening, then drop the old graph
    await client.query('UPDATE stories SET root_node_id = $2, branch_count = $3, updated_at = NOW() WHERE id = $1', [
      story.id, idFor[content.root], Object.keys(content.nodes).length - 1,
    ])
    if (oldIds.length) await client.query('DELETE FROM nodes WHERE id = ANY($1::uuid[])', [oldIds])

    // 4. clues (the old ones went with their passages)
    let clueCount = 0
    for (const [key, n] of Object.entries(content.nodes)) {
      for (const [label, detail, kind = 'clue', weight = 1, optional = false] of n.clues || []) {
        await client.query(
          `INSERT INTO game_clues (story_id, node_id, label, detail, kind, weight, optional)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [story.id, idFor[key], label, detail, kind, weight, optional]
        )
        clueCount++
      }
    }
    // 5. the game record, if the content carries one
    if (content.game) {
      await client.query(
        `UPDATE story_games SET objective = $2, briefing = $3, solution_key = $4, max_attempts = $5, updated_at = NOW()
         WHERE story_id = $1`,
        [story.id, content.game.objective, content.game.briefing, content.game.solutionKey, content.game.maxAttempts]
      )
    }
    await client.query('COMMIT')
    console.log(`\n  applied: ${Object.keys(content.nodes).length} passages, ${clueCount} clues`)
    console.log(`  backup:  ${backup}\n`)
  } catch (e) {
    await client.query('ROLLBACK').catch(() => {})
    console.error('\n  FAILED, rolled back:', e.message, '\n')
    process.exitCode = 1
  } finally {
    client.release()
    await pool.end()
  }
}

main()
