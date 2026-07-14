// Leaderboards. Each board is a single indexed aggregate query returning a small
// ranked list, so they stay cheap to serve. Rarity lives in the cached catalogue
// (not the DB), so "rarest collectors" filters by the set of rare+ badge ids.

const db = require('../db')
const catalog = require('./catalog')
const { rarityRank } = require('./catalog/rarities')

const RARE_BADGE_IDS = catalog.BADGES.filter((b) => rarityRank(b.rarity) >= 3 && b.rarity !== 'hidden').map((b) => b.id)

const card = (r) => ({
  user: { username: r.username, displayName: r.display_name, avatarUrl: r.avatar_url || null },
  value: Number(r.value),
})

// Most badges unlocked.
const mostAchievements = async (limit = 10) => {
  const { rows } = await db.query(
    `SELECT u.username, u.display_name, u.avatar_url, COUNT(*)::int AS value
       FROM user_achievements ua JOIN users u ON u.id = ua.user_id
      GROUP BY u.id ORDER BY value DESC, MIN(ua.unlocked_at) ASC LIMIT $1`,
    [limit]
  )
  return rows.map(card)
}

// Most rare-or-better badges.
const rarestCollectors = async (limit = 10) => {
  if (!RARE_BADGE_IDS.length) return []
  const { rows } = await db.query(
    `SELECT u.username, u.display_name, u.avatar_url, COUNT(*)::int AS value
       FROM user_achievements ua JOIN users u ON u.id = ua.user_id
      WHERE ua.badge_id = ANY($2)
      GROUP BY u.id ORDER BY value DESC LIMIT $1`,
    [limit, RARE_BADGE_IDS]
  )
  return rows.map(card)
}

// Highest progression level reached on any track.
const highestTier = async (limit = 10) => {
  const { rows } = await db.query(
    `SELECT u.username, u.display_name, u.avatar_url, MAX(t.level)::int AS value
       FROM tier_state t JOIN users u ON u.id = t.user_id
      GROUP BY u.id ORDER BY value DESC, MIN(t.reached_at) ASC LIMIT $1`,
    [limit]
  )
  return rows.map(card)
}

// Readers by stories completed.
const topReaders = async (limit = 10) => {
  const { rows } = await db.query(
    `SELECT u.username, u.display_name, u.avatar_url, COUNT(*)::int AS value
       FROM reader_completions c JOIN users u ON u.id = c.user_id
      GROUP BY u.id ORDER BY value DESC LIMIT $1`,
    [limit]
  )
  return rows.map(card)
}

// Authors by followers gained in the last 30 days.
const fastestGrowingAuthors = async (limit = 10) => {
  const { rows } = await db.query(
    `SELECT u.username, u.display_name, u.avatar_url, COUNT(*)::int AS value
       FROM follows f JOIN users u ON u.id = f.following_id
      WHERE f.created_at > NOW() - INTERVAL '30 days'
      GROUP BY u.id ORDER BY value DESC LIMIT $1`,
    [limit]
  )
  return rows.map(card)
}

// Seasonal: most badges earned in the last 30 days.
const seasonal = async (limit = 10) => {
  const { rows } = await db.query(
    `SELECT u.username, u.display_name, u.avatar_url, COUNT(*)::int AS value
       FROM user_achievements ua JOIN users u ON u.id = ua.user_id
      WHERE ua.unlocked_at > NOW() - INTERVAL '30 days'
      GROUP BY u.id ORDER BY value DESC LIMIT $1`,
    [limit]
  )
  return rows.map(card)
}

const all = async (limit = 10) => {
  const [achievements, rarest, tier, readers, growing, season] = await Promise.all([
    mostAchievements(limit), rarestCollectors(limit), highestTier(limit),
    topReaders(limit), fastestGrowingAuthors(limit), seasonal(limit),
  ])
  return {
    mostAchievements: achievements,
    rarestCollectors: rarest,
    highestTier: tier,
    topReaders: readers,
    fastestGrowingAuthors: growing,
    seasonal: season,
  }
}

module.exports = { all, mostAchievements, rarestCollectors, highestTier, topReaders, fastestGrowingAuthors, seasonal }
