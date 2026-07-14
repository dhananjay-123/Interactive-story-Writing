// Manual administration. Every function validates against the cached catalogue,
// mutates through the store, and writes an audit row — so nothing an admin does to
// a user's achievements is untraceable. These are the only sanctioned way to
// grant, revoke, freeze, feature, re-tier, reset or recalculate by hand.

const catalog = require('./catalog')
const store = require('./store')
const engine = require('./engine')
const db = require('../db')
const { track: getTrack } = require('./catalog/tiers')

// Grant a badge by hand (works for manual-only badges and as an override for auto
// ones). Idempotent — granting a held badge is a no-op that still audits.
const grantBadge = async (actorId, targetUserId, badgeId, { note } = {}) => {
  const badge = catalog.getBadge(badgeId)
  if (!badge) return { ok: false, reason: 'unknown_badge' }

  const inserted = await store.insertUnlock(targetUserId, badgeId, {
    source: 'manual',
    grantedBy: actorId,
    context: { note: note || null },
  })
  if (inserted) {
    await store.clearProgress(targetUserId, badgeId)
    await store.addUnlockHistory(targetUserId, { kind: 'badge', badgeId, source: 'manual' })
    await store.addNotification(targetUserId, { kind: 'badge', badgeId, title: badge.name, body: badge.description })
  }
  await store.addAudit({ actorId, targetUserId, action: 'grant_badge', badgeId, detail: { note: note || null, alreadyHeld: !inserted } })
  return { ok: true, granted: inserted }
}

const revokeBadge = async (actorId, targetUserId, badgeId) => {
  const removed = await store.removeUnlock(targetUserId, badgeId)
  await store.addAudit({ actorId, targetUserId, action: 'revoke_badge', badgeId, detail: { removed } })
  return { ok: true, removed }
}

const setFrozen = async (actorId, targetUserId, badgeId, frozen) => {
  await store.setFrozen(targetUserId, badgeId, frozen)
  await store.addAudit({ actorId, targetUserId, action: frozen ? 'freeze_badge' : 'unfreeze_badge', badgeId })
  return { ok: true }
}

// Admin-driven showcase feature (distinct from a user pinning their own badge).
const setFeatured = async (actorId, targetUserId, badgeId, featured) => {
  await store.setFeatured(targetUserId, badgeId, featured)
  await store.addAudit({ actorId, targetUserId, action: featured ? 'feature_badge' : 'unfeature_badge', badgeId })
  return { ok: true }
}

// Assign a tier by hand — validated against the ladder. Records history + notifies.
const assignTier = async (actorId, targetUserId, trackId, tierId) => {
  const track = getTrack(trackId)
  if (!track) return { ok: false, reason: 'unknown_track' }
  const tier = track.tiers.find((t) => t.id === tierId)
  if (!tier) return { ok: false, reason: 'unknown_tier' }

  const current = (await store.getTiers(targetUserId))[trackId]
  await store.setTier(targetUserId, trackId, tier.id, tier.level)
  await store.addTierHistory(targetUserId, trackId, current?.tierId || null, tier.id, tier.level)
  await store.addUnlockHistory(targetUserId, { kind: 'tier', trackId, tierId: tier.id, source: 'manual' })
  await store.addNotification(targetUserId, { kind: 'tier', trackId, tierId: tier.id, title: tier.label, body: `An admin set your ${track.label.toLowerCase()} tier.` })
  await store.addAudit({ actorId, targetUserId, action: 'assign_tier', trackId, detail: { tierId: tier.id, from: current?.tierId || null } })
  return { ok: true }
}

// Wipe a user's *computed* achievement state so it can be rebuilt from source.
// Manual grants are preserved (they represent decisions, not computed facts).
const resetProgress = async (actorId, targetUserId) => {
  await db.query('DELETE FROM achievement_progress WHERE user_id=$1', [targetUserId])
  await db.query("DELETE FROM user_achievements WHERE user_id=$1 AND source='auto'", [targetUserId])
  await db.query('DELETE FROM tier_state WHERE user_id=$1', [targetUserId])
  await db.query("UPDATE user_stats SET metrics='{}'::jsonb, streak_days=0, updated_at=NOW() WHERE user_id=$1", [targetUserId])
  await store.addAudit({ actorId, targetUserId, action: 'reset_progress' })
  return { ok: true }
}

// Recompute everything from source (also settles tiers). Never removes earned
// badges; used after a reset, or to backfill after data changes.
const recalculate = async (actorId, targetUserId) => {
  const summary = await engine.recomputeUser(targetUserId, { actorId })
  return { ok: true, ...summary }
}

module.exports = { grantBadge, revokeBadge, setFrozen, setFeatured, assignTier, resetProgress, recalculate }
