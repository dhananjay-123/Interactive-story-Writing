// Assembles the achievement profile a client renders: tiers with progress, the
// full badge wall (locked / in-progress / unlocked, hidden ones masked until
// earned), showcase, statistics and completion. One place decides what a viewer
// is allowed to see, so reader/author/public routes stay thin.

const catalog = require('./catalog')
const metrics = require('./metrics')
const store = require('./store')
const { badgeProgress, resolveTier } = require('./evaluator')
const { rarityRank } = require('./catalog/rarities')

// A hidden badge the user hasn't earned reveals nothing but its shape.
const maskHidden = (badge) => ({
  id: badge.id,
  name: 'Hidden Achievement',
  description: 'Keep exploring — this one reveals itself once earned.',
  hint: null,
  category: 'hidden',
  rarity: 'hidden',
  icon: { shape: 'lock' },
  hidden: true,
  audience: badge.audience,
})

// Public projection of a badge definition (no criteria internals leaked).
const publicBadge = (badge) => ({
  id: badge.id,
  name: badge.name,
  description: badge.description,
  hint: badge.hint,
  category: badge.category,
  rarity: badge.rarity,
  icon: badge.icon,
  hidden: badge.hidden,
  audience: badge.audience,
})

const buildTiers = (metricMap, storedTiers) =>
  catalog.TRACKS.map((track) => {
    const resolved = resolveTier(track, metricMap[track.metric])
    return {
      trackId: track.id,
      label: track.label,
      metric: track.metric,
      value: resolved.currentValue,
      current: resolved.current,
      next: resolved.next,
      toNext: resolved.toNext,
      percent: resolved.percent,
      reachedAt: storedTiers[track.id]?.reachedAt || null,
    }
  })

// Full profile for the owner: every badge with live progress + personal stats.
const buildSelf = async (userId) => {
  const [{ metrics: metricMap, longestStreak }, unlocked, progress, storedTiers] = await Promise.all([
    metrics.getStats(userId),
    store.listUnlocked(userId),
    store.listProgress(userId),
    store.getTiers(userId),
  ])

  const unlockedMap = new Map(unlocked.map((u) => [u.badgeId, u]))
  const progressMap = new Map(progress.map((p) => [p.badgeId, p]))

  const badges = catalog.BADGES.map((badge) => {
    const owned = unlockedMap.get(badge.id)
    if (badge.hidden && !owned) {
      return { ...maskHidden(badge), state: 'locked', progress: null }
    }
    const base = publicBadge(badge)
    if (owned) {
      return { ...base, state: 'unlocked', unlockedAt: owned.unlockedAt, source: owned.source,
        featured: owned.featured, frozen: owned.frozen, pinOrder: owned.pinOrder }
    }
    const live = progressMap.get(badge.id)
    const p = live
      ? { current: live.current, target: live.target, percent: live.percent }
      : badgeProgress(badge, metricMap) // manual badges → null
    return { ...base, state: p && p.percent > 0 ? 'progress' : 'locked', progress: p }
  })

  return {
    tiers: buildTiers(metricMap, storedTiers),
    badges,
    stats: statBlock(metricMap, longestStreak),
    showcase: showcaseFrom(badges),
    summary: summarize(badges),
  }
}

// Public view for someone else's profile: tiers, earned badges + showcase only.
const buildPublic = async (userId) => {
  const [{ metrics: metricMap, longestStreak }, unlocked, storedTiers] = await Promise.all([
    metrics.getStats(userId),
    store.listUnlocked(userId),
    store.getTiers(userId),
  ])

  const earned = unlocked
    .map((u) => {
      const badge = catalog.getBadge(u.badgeId)
      if (!badge) return null
      return { ...publicBadge(badge), state: 'unlocked', unlockedAt: u.unlockedAt, featured: u.featured, pinOrder: u.pinOrder }
    })
    .filter(Boolean)
    .sort((a, b) => rarityRank(b.rarity) - rarityRank(a.rarity))

  return {
    tiers: buildTiers(metricMap, storedTiers),
    badges: earned,
    stats: statBlock(metricMap, longestStreak),
    showcase: showcaseFrom(earned),
    summary: summarize(earned, catalog.BADGES.length),
  }
}

const statBlock = (m, longestStreak) => ({
  author: {
    storiesPublished: n(m.stories_published), branches: n(m.total_branches), passages: n(m.total_passages),
    endings: n(m.total_endings), genres: n(m.distinct_genres_written), likesReceived: n(m.likes_received),
    commentsReceived: n(m.comments_received), ratingsReceived: n(m.ratings_received), followers: n(m.followers),
    featured: n(m.featured_stories), collaborations: n(m.collaborations),
  },
  reader: {
    storiesStarted: n(m.stories_started), storiesCompleted: n(m.stories_completed), genresRead: n(m.distinct_genres_read),
    genresCompleted: n(m.genres_completed), choices: n(m.choices_made), likesGiven: n(m.likes_given),
    bookmarks: n(m.bookmarks), commentsPosted: n(m.comments_posted), ratingsGiven: n(m.ratings_given),
    following: n(m.following), streak: n(m.reading_streak), longestStreak: n(longestStreak),
  },
})

const showcaseFrom = (badges) =>
  badges
    .filter((b) => b.state === 'unlocked' && b.featured)
    .sort((a, b) => (a.pinOrder ?? 999) - (b.pinOrder ?? 999))

const summarize = (badges, totalOverride) => {
  const unlocked = badges.filter((b) => b.state === 'unlocked')
  const byRarity = {}
  for (const b of unlocked) byRarity[b.rarity] = (byRarity[b.rarity] || 0) + 1
  const total = totalOverride ?? catalog.BADGES.length
  return {
    total,
    unlocked: unlocked.length,
    completion: total > 0 ? Math.floor((unlocked.length / total) * 100) : 0,
    byRarity,
    hiddenFound: unlocked.filter((b) => b.hidden).length,
  }
}

const n = (v) => Number(v || 0)

module.exports = { buildSelf, buildPublic }
