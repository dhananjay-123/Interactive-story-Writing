// Achievement analytics for the admin dashboard. Aggregate queries joined against
// the cached catalogue so each badge comes back with its display metadata.

const db = require('../db')
const catalog = require('./catalog')

const overview = async () => {
  const { rows } = await db.query(`
    SELECT
      (SELECT COUNT(*)::int FROM user_achievements)                              AS total_unlocks,
      (SELECT COUNT(*)::int FROM user_achievements WHERE source='manual')        AS manual_grants,
      (SELECT COUNT(DISTINCT user_id)::int FROM user_achievements)               AS users_with_badges,
      (SELECT COUNT(*)::int FROM user_achievements WHERE unlocked_at > NOW() - INTERVAL '7 days') AS unlocks_this_week,
      (SELECT COUNT(*)::int FROM reader_completions)                             AS total_completions
  `)
  const r = rows[0]
  return {
    totalUnlocks: r.total_unlocks,
    manualGrants: r.manual_grants,
    usersWithBadges: r.users_with_badges,
    unlocksThisWeek: r.unlocks_this_week,
    totalCompletions: r.total_completions,
  }
}

// Holders per badge, annotated with catalogue metadata. Covers every defined
// badge (0 holders included) so the admin sees the whole catalogue.
const badgeBreakdown = async () => {
  const { rows } = await db.query(
    `SELECT badge_id, COUNT(*)::int AS holders FROM user_achievements GROUP BY badge_id`
  )
  const holders = new Map(rows.map((r) => [r.badge_id, r.holders]))
  return catalog.BADGES.map((b) => ({
    id: b.id, name: b.name, category: b.category, rarity: b.rarity, hidden: b.hidden,
    manual: !!b.criteria?.manual, holders: holders.get(b.id) || 0,
  })).sort((a, b) => b.holders - a.holders)
}

// Tier occupancy per track.
const tierDistribution = async () => {
  const { rows } = await db.query(
    `SELECT track_id, tier_id, COUNT(*)::int AS n FROM tier_state GROUP BY track_id, tier_id`
  )
  return rows.map((r) => ({ trackId: r.track_id, tierId: r.tier_id, count: r.n }))
}

module.exports = { overview, badgeBreakdown, tierDistribution }
