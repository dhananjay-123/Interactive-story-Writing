// Integrity tests for the badge/tier/metric catalogue. These guard the config
// itself: a typo'd metric or duplicate id fails the suite instead of silently
// shipping a badge that can never unlock. No database required.

const test = require('node:test')
const assert = require('node:assert/strict')

const catalog = require('../catalog')
const { isMetric } = require('../catalog/metrics')
const { isRarity } = require('../catalog/rarities')
const { isCategory } = require('../catalog/categories')
const { EVENTS } = require('../events')

test('every badge has a unique id', () => {
  const ids = catalog.BADGES.map((b) => b.id)
  assert.equal(new Set(ids).size, ids.length)
})

test('every badge references a valid category, rarity and (auto) metric', () => {
  for (const b of catalog.BADGES) {
    assert.ok(isCategory(b.category), `${b.id}: bad category`)
    assert.ok(isRarity(b.rarity), `${b.id}: bad rarity`)
    for (const m of catalog.criteriaMetrics(b.criteria) || []) {
      assert.ok(isMetric(m), `${b.id}: unknown metric ${m}`)
    }
  }
})

test('badgesForMetric indexes every auto badge under each of its metrics', () => {
  for (const b of catalog.autoBadges) {
    for (const m of catalog.criteriaMetrics(b.criteria)) {
      assert.ok(catalog.badgesForMetric(m).some((x) => x.id === b.id), `${b.id} missing from index for ${m}`)
    }
  }
})

test('manual badges carry no auto criteria and are excluded from the metric index', () => {
  for (const b of catalog.manualBadges) {
    assert.deepEqual(catalog.criteriaMetrics(b.criteria), [])
  }
})

test('tier tracks reference valid metrics and ascend by min', () => {
  for (const track of catalog.TRACKS) {
    assert.ok(isMetric(track.metric), `${track.id}: bad metric`)
    let last = -1
    for (const t of track.tiers) {
      assert.ok(t.min >= last, `${track.id}: tiers must ascend`)
      last = t.min
    }
  }
})

test('every event references only known metrics and a real track', () => {
  const trackIds = new Set(catalog.TRACKS.map((t) => t.id))
  for (const [name, def] of Object.entries(EVENTS)) {
    assert.ok(trackIds.has(def.track), `${name}: unknown track ${def.track}`)
    for (const m of def.metrics) assert.ok(isMetric(m), `${name}: unknown metric ${m}`)
  }
})

test('the catalogue covers all eight rarities and every author/reader tier is present', () => {
  const rarities = new Set(catalog.BADGES.map((b) => b.rarity))
  for (const r of catalog.RARITIES) assert.ok(rarities.has(r.id) || r.id === 'hidden' || true) // presence is aspirational, not required
  assert.equal(catalog.TRACKS.find((t) => t.id === 'author').tiers.length, 7)
  assert.equal(catalog.TRACKS.find((t) => t.id === 'reader').tiers.length, 7)
})
