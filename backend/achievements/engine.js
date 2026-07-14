// The unlock engine — orchestration only. It reacts to one event for one user by
// refreshing just the affected metrics, re-checking only the achievements those
// metrics could have moved, unlocking anything newly satisfied, advancing tiers,
// and emitting notifications + timeline entries. Everything it needs is delegated
// (catalog / metrics / evaluator / store), so this file stays a thin conductor.
//
// It is defensive by design: record() never throws into the request that
// triggered it. A failure to award a badge must not fail a like or a page load.

const catalog = require('./catalog')
const { EVENTS, isEvent } = require('./events')
const metrics = require('./metrics')
const store = require('./store')
const { badgeProgress, resolveTier } = require('./evaluator')
const { track: getTrack } = require('./catalog/tiers')

// Award any newly-satisfied badges among `candidates`, and refresh progress bars
// for the ones still in flight. Returns the list of badges unlocked this pass.
const evaluateBadges = async (userId, candidates, metricMap, { event, storyId } = {}) => {
  if (!candidates.length) return []
  const held = await store.unlockedIds(userId)
  const newlyUnlocked = []
  const progressRows = []

  for (const badge of candidates) {
    if (held.has(badge.id)) continue
    const p = badgeProgress(badge, metricMap)
    if (!p) continue // manual badge — not our job
    if (p.satisfied) {
      const inserted = await store.insertUnlock(userId, badge.id, {
        source: 'auto',
        context: { event, storyId: storyId || null },
      })
      if (inserted) {
        await store.clearProgress(userId, badge.id)
        await store.addUnlockHistory(userId, { kind: 'badge', badgeId: badge.id, source: 'auto', event, storyId })
        await store.addNotification(userId, {
          kind: 'badge',
          badgeId: badge.id,
          title: badge.name,
          body: badge.description,
        })
        newlyUnlocked.push(badge)
      }
    } else {
      progressRows.push({ badgeId: badge.id, current: p.current, target: p.target, percent: p.percent })
    }
  }

  if (progressRows.length) await store.upsertProgress(userId, progressRows)
  return newlyUnlocked
}

// Promote a user on one track if their metric now clears a higher rung.
// Returns the promotion ({ track, from, to }) or null.
const evaluateTier = async (userId, trackId, metricMap, { event, storyId } = {}) => {
  const track = getTrack(trackId)
  if (!track) return null

  const resolved = resolveTier(track, metricMap[track.metric])
  const tiers = await store.getTiers(userId)
  const storedLevel = tiers[trackId]?.level ?? -1 // -1 so even the base tier registers once

  if (resolved.current.level <= storedLevel) return null

  const fromTierId = tiers[trackId]?.tierId || null
  await store.setTier(userId, trackId, resolved.current.id, resolved.current.level)

  // Only announce a genuine climb (skip the silent seeding of the base tier).
  if (storedLevel >= 0 || resolved.current.level > 0) {
    await store.addTierHistory(userId, trackId, fromTierId, resolved.current.id, resolved.current.level)
    await store.addUnlockHistory(userId, { kind: 'tier', trackId, tierId: resolved.current.id, source: 'auto', event, storyId })
    await store.addNotification(userId, {
      kind: 'tier',
      trackId,
      tierId: resolved.current.id,
      title: `${resolved.current.label}`,
      body: `You reached a new ${track.label.toLowerCase()} tier.`,
    })
    return { track: trackId, from: fromTierId, to: resolved.current.id, tier: resolved.current }
  }

  return null // base tier seeded silently
}

// The single entry point. Fire-and-forget friendly: returns a summary of what
// changed, and swallows/logs its own errors so a caller can `void record(...)`.
//   ctx: { storyId, nodeId, genre } — optional context for completion/timeline.
const record = async (userId, eventName, ctx = {}) => {
  const result = { badges: [], tier: null }
  if (!userId || !isEvent(eventName)) return result
  const def = EVENTS[eventName]

  try {
    // Completion is a normalized fact — write it first so stories_completed and
    // genres_completed reflect it when we refresh.
    if (eventName === 'STORY_COMPLETED' && ctx.storyId) {
      await metrics.recordCompletion(userId, ctx.storyId, ctx.nodeId, ctx.genre)
    }
    if (def.activity) await metrics.recordActivity(userId)

    const metricMap = await metrics.refreshMetrics(userId, def.metrics)

    // Candidate badges = those tied to any metric this event touched (plus streak
    // badges when the event counted as activity).
    const candidateMetrics = new Set(def.metrics)
    if (def.activity) candidateMetrics.add('reading_streak')
    const candidates = []
    const seen = new Set()
    for (const m of candidateMetrics) {
      for (const b of catalog.badgesForMetric(m)) {
        if (!seen.has(b.id)) { seen.add(b.id); candidates.push(b) }
      }
    }

    result.badges = await evaluateBadges(userId, candidates, metricMap, { event: eventName, storyId: ctx.storyId })
    result.tier = await evaluateTier(userId, def.track, metricMap, { event: eventName, storyId: ctx.storyId })
  } catch (err) {
    console.error(`[achievements] record(${eventName}) failed for ${userId}:`, err.message)
  }

  return result
}

// Convenience: refresh and re-evaluate everything for a user from scratch. Used by
// admin "recalculate" and by manual grants that should also settle tiers. Never
// removes anything a user already earned.
const recomputeUser = async (userId, { actorId = null } = {}) => {
  const summary = { badgesUnlocked: 0, progressTracked: 0 }
  try {
    const metricMap = await metrics.recomputeAll(userId)

    const held = await store.unlockedIds(userId)
    const progressRows = []
    for (const badge of catalog.autoBadges) {
      if (held.has(badge.id)) continue
      const p = badgeProgress(badge, metricMap)
      if (!p) continue
      if (p.satisfied) {
        const inserted = await store.insertUnlock(userId, badge.id, { source: 'auto', context: { event: 'recompute' } })
        if (inserted) {
          await store.clearProgress(userId, badge.id)
          await store.addUnlockHistory(userId, { kind: 'badge', badgeId: badge.id, source: 'auto', event: 'recompute' })
          await store.addNotification(userId, { kind: 'badge', badgeId: badge.id, title: badge.name, body: badge.description })
          summary.badgesUnlocked++
        }
      } else {
        progressRows.push({ badgeId: badge.id, current: p.current, target: p.target, percent: p.percent })
      }
    }
    if (progressRows.length) await store.upsertProgress(userId, progressRows)
    summary.progressTracked = progressRows.length

    for (const track of catalog.TRACKS) {
      await evaluateTier(userId, track.id, metricMap, { event: 'recompute' })
    }

    if (actorId) await store.addAudit({ actorId, targetUserId: userId, action: 'recalculate', detail: summary })
  } catch (err) {
    console.error(`[achievements] recomputeUser failed for ${userId}:`, err.message)
  }
  return summary
}

module.exports = { record, recomputeUser, evaluateTier }
