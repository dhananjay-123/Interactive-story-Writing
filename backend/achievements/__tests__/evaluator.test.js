// Pure unit tests for the unlock evaluator — no database required.
//   run: node --test   (from backend/)

const test = require('node:test')
const assert = require('node:assert/strict')

const { badgeProgress, satisfiedBadgeIds, resolveTier } = require('../evaluator')
const { AUTHOR_TRACK, READER_TRACK } = require('../catalog/tiers')

const single = (metric, target) => ({ id: `t_${metric}_${target}`, criteria: { metric, target } })

test('badgeProgress: below target reports partial progress, not satisfied', () => {
  const p = badgeProgress(single('stories_published', 5), { stories_published: 2 })
  assert.equal(p.satisfied, false)
  assert.equal(p.current, 2)
  assert.equal(p.target, 5)
  assert.equal(p.remaining, 3)
  assert.equal(p.percent, 40)
})

test('badgeProgress: at/over target is satisfied and caps at 100%', () => {
  const at = badgeProgress(single('followers', 10), { followers: 10 })
  assert.equal(at.satisfied, true)
  assert.equal(at.percent, 100)

  const over = badgeProgress(single('followers', 10), { followers: 25 })
  assert.equal(over.satisfied, true)
  assert.equal(over.percent, 100)
  assert.equal(over.remaining, 0)
})

test('badgeProgress: missing metric is treated as zero', () => {
  const p = badgeProgress(single('choices_made', 25), {})
  assert.equal(p.current, 0)
  assert.equal(p.satisfied, false)
})

test('badgeProgress: manual badges return null (nothing to compute)', () => {
  assert.equal(badgeProgress({ id: 'm', criteria: { manual: true } }, { anything: 9 }), null)
})

test('badgeProgress: composite is satisfied only when every leg is, bar tracks the weakest leg', () => {
  const badge = { id: 'c', criteria: { all: [{ metric: 'a', target: 10 }, { metric: 'b', target: 4 }] } }
  const partial = badgeProgress(badge, { a: 10, b: 1 })
  assert.equal(partial.satisfied, false)
  assert.equal(partial.percent, 25) // weakest leg: 1/4
  const done = badgeProgress(badge, { a: 10, b: 4 })
  assert.equal(done.satisfied, true)
})

test('satisfiedBadgeIds returns only auto badges whose thresholds are met', () => {
  const badges = [
    single('stories_published', 1),
    single('stories_published', 5),
    { id: 'manual_one', criteria: { manual: true } },
  ]
  const ids = satisfiedBadgeIds(badges, { stories_published: 3 })
  assert.deepEqual(ids, ['t_stories_published_1'])
})

test('resolveTier: base tier when metric is zero, with progress toward the next rung', () => {
  const r = resolveTier(READER_TRACK, 0)
  assert.equal(r.current.id, 'curious_reader')
  assert.equal(r.next.id, 'explorer')
  assert.equal(r.toNext, 1)
})

test('resolveTier: lands on the highest satisfied rung', () => {
  const r = resolveTier(AUTHOR_TRACK, 7) // >=6 world_builder, <12 master
  assert.equal(r.current.id, 'world_builder')
  assert.equal(r.next.id, 'master_author')
})

test('resolveTier: top rung has no next and reports 100%', () => {
  const r = resolveTier(READER_TRACK, 999)
  assert.equal(r.current.id, 'living_legend')
  assert.equal(r.next, null)
  assert.equal(r.percent, 100)
})

test('resolveTier: percent is progress between current and next rung', () => {
  // adventurer(min 5) → path_finder(min 15): value 10 is halfway.
  const r = resolveTier(READER_TRACK, 10)
  assert.equal(r.current.id, 'adventurer')
  assert.equal(r.percent, 50)
})
