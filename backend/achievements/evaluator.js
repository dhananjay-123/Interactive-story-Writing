// Pure evaluation logic — no database, no side effects. Given a badge/tier config
// and a plain map of the user's metric values, it decides what is satisfied and
// how far along everything is. Kept pure so the unlock rules can be unit-tested
// exhaustively without a database (see achievements/__tests__).

const val = (metrics, id) => Number(metrics?.[id] || 0)

// Progress toward a single auto badge. Manual badges return null (nothing to
// compute — an admin grants them).
//   { current, target, percent (0-100), satisfied, remaining }
const badgeProgress = (badge, metrics) => {
  const c = badge.criteria
  if (!c || c.manual) return null

  // Composite "reach every threshold": progress is the least-complete leg, so the
  // bar reflects the hardest remaining requirement.
  if (Array.isArray(c.all)) {
    const legs = c.all.map((leg) => {
      const current = val(metrics, leg.metric)
      return {
        metric: leg.metric,
        current,
        target: leg.target,
        percent: leg.target > 0 ? Math.min(100, Math.floor((current / leg.target) * 100)) : 100,
        satisfied: current >= leg.target,
        remaining: Math.max(0, leg.target - current),
      }
    })
    const weakest = legs.reduce((a, b) => (b.percent < a.percent ? b : a), legs[0])
    return {
      current: weakest.current,
      target: weakest.target,
      percent: weakest.percent,
      satisfied: legs.every((l) => l.satisfied),
      remaining: weakest.remaining,
      legs,
    }
  }

  const current = val(metrics, c.metric)
  const target = c.target
  return {
    current,
    target,
    percent: target > 0 ? Math.min(100, Math.floor((current / target) * 100)) : 100,
    satisfied: current >= target,
    remaining: Math.max(0, target - current),
  }
}

// Ids of every auto badge in `badges` the metrics now satisfy. The caller diffs
// this against what the user already holds to find *new* unlocks.
const satisfiedBadgeIds = (badges, metrics) =>
  badges.filter((b) => !b.criteria?.manual && badgeProgress(b, metrics)?.satisfied).map((b) => b.id)

// Where a user sits on a progression track given their driving metric value.
//   { current, next, currentValue, toNext, percent }
// `current` is the highest rung reached; `next` is the following rung (or null at
// the top); `percent` is progress from the current rung to the next.
const resolveTier = (track, metricValue) => {
  const value = Number(metricValue || 0)
  const tiers = track.tiers
  let idx = 0
  for (let i = 0; i < tiers.length; i++) {
    if (value >= tiers[i].min) idx = i
  }
  const current = tiers[idx]
  const next = tiers[idx + 1] || null
  let percent = 100
  let toNext = 0
  if (next) {
    const span = next.min - current.min
    toNext = Math.max(0, next.min - value)
    percent = span > 0 ? Math.min(100, Math.floor(((value - current.min) / span) * 100)) : 0
  }
  return { trackId: track.id, current, next, currentValue: value, toNext, percent }
}

module.exports = { badgeProgress, satisfiedBadgeIds, resolveTier }
