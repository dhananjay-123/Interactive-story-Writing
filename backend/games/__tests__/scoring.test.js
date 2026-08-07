// Pure unit tests for Story Game scoring — no database required.
//   run: node --test   (from backend/)

const test = require('node:test')
const assert = require('node:assert/strict')

const { scoreSession, resolveRank, normalizeAnswer, answerMatches, timeBonus } = require('../scoring')
const catalog = require('../catalog')

const profile = catalog.scoringFor('detective')

// A reader who found nothing, answered nothing, and simply read.
const blank = {
  solved: false,
  solvedBeforeReveal: false,
  requiredTotal: 4,
  requiredFound: 0,
  requiredWeightFound: 0,
  sideWeightFound: 0,
  wrongAttempts: 0,
  elapsedMs: 20 * 60 * 1000,
}

const run = (patch) => scoreSession({ ...blank, ...patch }, profile)

test('a reader who ignores the challenge scores nothing and loses nothing', () => {
  const r = run({})
  assert.equal(r.score, 0)
  assert.equal(r.perfect, false)
  assert.deepEqual(r.breakdown, [])
})

test('clues score on their own — noticing counts even without an answer', () => {
  const r = run({ requiredFound: 3, requiredWeightFound: 5 })
  assert.equal(r.score, 5 * profile.cluePoints)
  assert.equal(r.breakdown.find((l) => l.key === 'clues').points, 5 * profile.cluePoints)
})

test('solving before the reveal pays the full solution award', () => {
  const r = run({ solved: true, solvedBeforeReveal: true })
  const time = timeBonus(blank.elapsedMs, profile)
  assert.equal(r.score, profile.solveBase + time)
})

test('solving after the reveal pays the reduced award', () => {
  const before = run({ solved: true, solvedBeforeReveal: true }).score
  const after = run({ solved: true, solvedBeforeReveal: false }).score
  assert.ok(after < before)
  assert.equal(
    after - timeBonus(blank.elapsedMs, profile),
    Math.round(profile.solveBase * profile.lateSolveFactor)
  )
})

test('wrong answers cost score but can never push it below zero', () => {
  const r = run({ wrongAttempts: 50 })
  assert.equal(r.score, 0)
})

test('a perfect run needs every required clue, no misses, and the reveal unspent', () => {
  const perfect = run({ solved: true, solvedBeforeReveal: true, requiredFound: 4, requiredWeightFound: 6 })
  assert.equal(perfect.perfect, true)

  const missedAClue = run({ solved: true, solvedBeforeReveal: true, requiredFound: 3, requiredWeightFound: 4 })
  assert.equal(missedAClue.perfect, false)

  const guessedOnce = run({ solved: true, solvedBeforeReveal: true, requiredFound: 4, requiredWeightFound: 6, wrongAttempts: 1 })
  assert.equal(guessedOnce.perfect, false)

  const afterReveal = run({ solved: true, solvedBeforeReveal: false, requiredFound: 4, requiredWeightFound: 6 })
  assert.equal(afterReveal.perfect, false)
})

test('a story with no required clues can never be "perfect"', () => {
  const r = run({ solved: true, solvedBeforeReveal: true, requiredTotal: 0, requiredFound: 0 })
  assert.equal(r.perfect, false)
})

test('the time bonus is small, capped, and gone by the slow end', () => {
  assert.equal(timeBonus(60 * 1000, profile), profile.timeBonusMax)
  assert.equal(timeBonus(profile.timeBonusZeroMs + 1, profile), 0)
  assert.ok(timeBonus(30 * 60 * 1000, profile) < profile.timeBonusMax)
  // Never larger than a single clue — it's a nod, not a strategy.
  assert.ok(profile.timeBonusMax <= profile.cluePoints * 2)
})

test('unsolved sessions earn no time bonus', () => {
  const r = run({ requiredWeightFound: 2, elapsedMs: 1000 })
  assert.equal(r.score, 2 * profile.cluePoints)
})

test('the breakdown lists only lines that moved the number', () => {
  const r = run({ solved: true, solvedBeforeReveal: true, requiredWeightFound: 2, wrongAttempts: 1 })
  const keys = r.breakdown.map((l) => l.key)
  assert.ok(keys.includes('solution'))
  assert.ok(keys.includes('clues'))
  assert.ok(keys.includes('attempts'))
  assert.ok(!keys.includes('side')) // nothing optional was found
})

test('resolveRank returns the highest rung cleared and the one after it', () => {
  const ladder = catalog.ladder('detective')
  const low = resolveRank(ladder, 0)
  assert.equal(low.current.id, 'constable')
  assert.equal(low.next.id, 'sergeant')

  const top = resolveRank(ladder, 99999)
  assert.equal(top.current.id, 'master')
  assert.equal(top.next, null)
})

test('answers match on meaning, not on typing', () => {
  assert.equal(normalizeAnswer('  The  Lighthouse!  '), 'lighthouse')
  assert.ok(answerMatches('The Lighthouse', 'lighthouse'))
  assert.ok(answerMatches('lighthouse', 'the lighthouse | tower | beacon'))
  assert.ok(answerMatches('BEACON', 'the lighthouse | tower | beacon'))
  assert.ok(!answerMatches('barn', 'the lighthouse | tower'))
  assert.ok(!answerMatches('', 'lighthouse'))
  assert.ok(!answerMatches('   ', 'lighthouse'))
})
