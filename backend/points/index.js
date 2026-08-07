// Platform points — one append-only ledger, one cached balance.
//
// Points are the platform's shared currency: Story Games pay them out, badges pay
// them out, and anything later (cosmetics, profile levels, unlockable bonus
// content) can spend or read them without knowing where they came from.
//
// Two rules make the number trustworthy:
//   • Every award names what it was for — (user_id, kind, ref) is UNIQUE, so
//     re-finishing a game, a replayed badge unlock or a retried request can never
//     pay twice. `award` reports whether the row was genuinely new.
//   • The balance is recomputed from the ledger on every award rather than
//     incremented, so `user_points` is a cache that cannot drift from its source
//     — the same discipline the achievement metrics use.
//
// Like achievements, awarding is fire-and-forget from a request's point of view:
// a failure to pay points must never fail the read that earned them.

const db = require('../db')

// What points are paid for. Values live here so the economy is legible in one
// place and tunable without hunting through call sites.
const VALUES = {
  // Story Games
  clueFound: 5,
  gameCompleted: 25,
  gameSolved: 100,
  gamePerfect: 50,

  // Achievements, by rarity. Administrator badges are internal, so they pay
  // nothing — they mark a role, not an accomplishment.
  badgeByRarity: {
    common: 10,
    uncommon: 20,
    rare: 40,
    epic: 75,
    legendary: 150,
    mythic: 300,
    hidden: 150,
    administrator: 0,
  },
}

// Human labels for the ledger view. Unknown kinds fall back to the raw slug
// rather than disappearing.
const KIND_LABELS = {
  game_clue: 'Clue discovered',
  game_completed: 'Story Game finished',
  game_solved: 'Story Game solved',
  game_perfect: 'A flawless case',
  badge: 'Badge unlocked',
}

/**
 * Credit a user, once, for one specific thing.
 * @returns {Promise<{awarded:boolean, points:number, balance:number}>}
 */
const award = async (userId, { kind, ref, points, meta = {} }) => {
  const value = Math.round(Number(points) || 0)
  if (!userId || !kind || !ref || value <= 0) return { awarded: false, points: 0, balance: 0 }

  try {
    const { rowCount } = await db.query(
      `INSERT INTO point_events (user_id, kind, ref, points, meta)
       VALUES ($1, $2, $3, $4, $5::jsonb)
       ON CONFLICT (user_id, kind, ref) DO NOTHING`,
      [userId, kind, String(ref), value, JSON.stringify(meta)]
    )
    // Recompute from the ledger either way: cheap, and it self-heals a balance
    // that a half-failed earlier award left behind.
    const balance = await refresh(userId)
    return { awarded: rowCount > 0, points: rowCount > 0 ? value : 0, balance }
  } catch (err) {
    console.error('[points] award failed:', err.message)
    return { awarded: false, points: 0, balance: 0 }
  }
}

// Convenience for the achievement engine: pays a badge by its rarity.
const awardBadge = (userId, badge) =>
  award(userId, {
    kind: 'badge',
    ref: badge.id,
    points: VALUES.badgeByRarity[badge.rarity] ?? 0,
    meta: { rarity: badge.rarity, name: badge.name },
  })

// Rebuild the cached balance from the ledger. Returns the balance.
const refresh = async (userId) => {
  const { rows } = await db.query(
    `INSERT INTO user_points (user_id, points, updated_at)
     VALUES ($1, (SELECT COALESCE(SUM(points), 0)::int FROM point_events WHERE user_id = $1), NOW())
     ON CONFLICT (user_id) DO UPDATE
       SET points = EXCLUDED.points, updated_at = NOW()
     RETURNING points`,
    [userId]
  )
  return rows[0]?.points ?? 0
}

const balance = async (userId) => {
  if (!userId) return 0
  const { rows } = await db.query('SELECT points FROM user_points WHERE user_id = $1', [userId])
  return rows[0]?.points ?? 0
}

// Recent earnings, newest first — "where did these come from".
const ledger = async (userId, limit = 20) => {
  const { rows } = await db.query(
    `SELECT kind, ref, points, meta, created_at
       FROM point_events WHERE user_id = $1
      ORDER BY created_at DESC LIMIT $2`,
    [userId, Math.min(Math.max(Number(limit) || 20, 1), 100)]
  )
  return rows.map((r) => ({
    kind: r.kind,
    label: KIND_LABELS[r.kind] || r.kind,
    ref: r.ref,
    points: r.points,
    meta: r.meta || {},
    createdAt: r.created_at,
  }))
}

// The platform-wide standings. Quiet by design — points are a reason to explore,
// not a race.
const leaderboard = async (limit = 10) => {
  const { rows } = await db.query(
    `SELECT u.username, u.display_name, u.avatar_url, p.points::int AS value
       FROM user_points p JOIN users u ON u.id = p.user_id
      WHERE p.points > 0
      ORDER BY p.points DESC, u.username ASC
      LIMIT $1`,
    [Math.min(Math.max(Number(limit) || 10, 1), 50)]
  )
  return rows.map((r) => ({
    user: { username: r.username, displayName: r.display_name, avatarUrl: r.avatar_url || null },
    value: r.value,
  }))
}

module.exports = { VALUES, award, awardBadge, balance, ledger, leaderboard, refresh }
