// End-to-end engine tests against a REAL Postgres — schema, unlock, dedupe, tier
// promotion and manual grant. Guarded: it only runs when TEST_DATABASE_URL is set,
// and it points the app's pool at THAT database, never the app's own. Run with:
//
//   TEST_DATABASE_URL=postgres://user:pass@localhost:5432/inkwell_test node --test
//
// Skips cleanly (green) when the variable is absent, so the default suite is safe
// to run anywhere, including a machine wired to the production database.

const test = require('node:test')
const assert = require('node:assert/strict')

const HAS_DB = !!process.env.TEST_DATABASE_URL
if (HAS_DB) process.env.DATABASE_URL = process.env.TEST_DATABASE_URL

test('engine end-to-end: unlock, dedupe, tier, manual grant', { skip: HAS_DB ? false : 'set TEST_DATABASE_URL to run' }, async () => {
  const db = require('../../db')
  const User = require('../../models/User')
  const Story = require('../../models/Story')
  const Node = require('../../models/Node')
  const engine = require('../engine')
  const store = require('../store')
  const admin = require('../admin')

  await db.initDb() // creates every table, idempotently — also a migration smoke test

  const stamp = Date.now()
  const user = await User.create({
    username: `t_${stamp}`, email: `t_${stamp}@example.com`, passwordHash: 'x', displayName: 'Test',
  })

  try {
    // Publish one story with an opening passage.
    const story = await Story.create({ title: 'A Tale', genre: 'fantasy', author: 'Test', authorId: user._id })
    const root = await Node.create({ storyId: story._id, text: 'Once upon a time.', choices: [] })
    await Story.setRoot(story._id, root._id, 0)

    // First publish unlocks "first_tale" and seeds the Storyteller tier.
    const r1 = await engine.record(user._id, 'STORY_PUBLISHED', { storyId: story._id })
    assert.ok(r1.badges.some((b) => b.id === 'first_tale'), 'first_tale should unlock')
    assert.equal(r1.tier?.to, 'storyteller', 'author tier should reach storyteller')

    // Re-firing the same event must NOT unlock it again (duplicate guard).
    const r2 = await engine.record(user._id, 'STORY_PUBLISHED', { storyId: story._id })
    assert.equal(r2.badges.length, 0, 'no duplicate unlock on re-fire')

    const held = await store.unlockedIds(user._id)
    assert.ok(held.has('first_tale'))
    const tiers = await store.getTiers(user._id)
    assert.equal(tiers.author.tierId, 'storyteller')

    // Manual admin grant of an admin/founder badge.
    const g = await admin.grantBadge(user._id /* acting as self for the test */, user._id, 'founding_author')
    assert.equal(g.granted, true)
    const held2 = await store.unlockedIds(user._id)
    assert.ok(held2.has('founding_author'))

    // Granting again is idempotent.
    const g2 = await admin.grantBadge(user._id, user._id, 'founding_author')
    assert.equal(g2.granted, false)

    // The audit trail recorded the grant.
    const audit = await store.listAudit({ targetUserId: user._id })
    assert.ok(audit.some((a) => a.action === 'grant_badge' && a.badgeId === 'founding_author'))
  } finally {
    // Cascades to stories, nodes, achievements, audit, everything.
    await db.query('DELETE FROM users WHERE id=$1', [user._id])
    await db.pool.end()
  }
})
