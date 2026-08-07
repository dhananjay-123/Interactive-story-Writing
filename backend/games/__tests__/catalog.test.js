// Integrity checks on the Story Game configuration. These are the tests that
// catch a bad mode record before a reader does — the catalogue is data, so it
// gets the same scrutiny code would.
//   run: node --test   (from backend/)

const test = require('node:test')
const assert = require('node:assert/strict')

const catalog = require('../catalog')
const { MODES } = require('../catalog/modes')
const { LADDERS } = require('../catalog/ranks')
const { DEFAULT_PROFILE } = require('../catalog/scoring')

test('every mode has the vocabulary the interface borrows from it', () => {
  for (const m of MODES) {
    assert.ok(m.label, `${m.id} has no label`)
    assert.ok(m.blurb, `${m.id} has no blurb`)
    assert.ok(m.prompt, `${m.id} has no prompt`)
    assert.ok(m.accuseLabel, `${m.id} has no accuse label`)
    assert.ok(m.solvedLine, `${m.id} has no solved line`)
    assert.ok(m.missedLine, `${m.id} has no missed line`)
    assert.ok(m.subject?.one && m.subject?.many, `${m.id} has an incomplete subject label`)
  }
})

test('every mode points at a rank ladder that exists', () => {
  for (const m of MODES) {
    assert.ok(catalog.ladder(m.rank), `${m.id} names an unknown ladder: ${m.rank}`)
  }
})

test('mode ids are unique', () => {
  assert.equal(new Set(MODES.map((m) => m.id)).size, MODES.length)
})

test('rank ladders ascend and start from zero, so every score has a rung', () => {
  for (const l of LADDERS) {
    assert.ok(l.rungs.length >= 2, `${l.id} needs more than one rung`)
    assert.equal(l.rungs[0].min, 0, `${l.id} does not start at 0`)
    for (let i = 1; i < l.rungs.length; i++) {
      assert.ok(l.rungs[i].min >= l.rungs[i - 1].min, `${l.id} rungs are out of order`)
    }
    assert.equal(new Set(l.rungs.map((r) => r.id)).size, l.rungs.length, `${l.id} has duplicate rung ids`)
  }
})

test('scoring overrides only ever touch known weights', () => {
  for (const m of MODES) {
    for (const key of Object.keys(m.scoring || {})) {
      assert.ok(key in DEFAULT_PROFILE, `${m.id} overrides an unknown weight: ${key}`)
    }
    const resolved = catalog.scoringFor(m.id)
    for (const key of Object.keys(DEFAULT_PROFILE)) {
      assert.equal(typeof resolved[key], 'number', `${m.id} resolved ${key} to a non-number`)
    }
  }
})

test('the solution never appears in a reader-facing mode payload', () => {
  for (const m of MODES) {
    const payload = JSON.stringify(catalog.publicMode(m.id))
    assert.ok(!payload.includes('solutionKey'))
    assert.ok(!payload.includes('solution_key'))
  }
})

test('the authoring catalogue exposes every mode with a resolved ladder', () => {
  const { modes, clueKinds } = catalog.publicCatalog()
  assert.equal(modes.length, MODES.length)
  for (const m of modes) {
    assert.ok(m.rank?.rungs?.length, `${m.id} came back without a ladder`)
  }
  assert.ok(clueKinds.every((k) => catalog.isClueKind(k.id)))
})

test('unknown modes resolve to a usable default rather than throwing', () => {
  assert.equal(catalog.mode('not_a_mode'), null)
  assert.equal(catalog.publicMode('not_a_mode'), null)
  assert.equal(typeof catalog.scoringFor('not_a_mode').solveBase, 'number')
})
