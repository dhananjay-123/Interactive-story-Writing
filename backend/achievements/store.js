// Persistence for per-user achievement state: unlocks, progress, tiers, timeline,
// notifications and the audit log. Pure data access — the engine composes these
// into behaviour. Duplicate unlocks are impossible here: insertUnlock relies on
// the (user_id, badge_id) primary key and reports whether the row was new.

const db = require('../db')

// ── Unlocks ──────────────────────────────────────────────────────────────────

const mapUnlock = (r) =>
  r && {
    badgeId: r.badge_id,
    source: r.source,
    unlockedAt: r.unlocked_at,
    grantedBy: r.granted_by || null,
    frozen: r.frozen,
    featured: r.featured,
    pinOrder: r.pin_order,
    context: r.context || {},
  }

const listUnlocked = async (userId) => {
  const { rows } = await db.query(
    'SELECT * FROM user_achievements WHERE user_id=$1 ORDER BY unlocked_at DESC',
    [userId]
  )
  return rows.map(mapUnlock)
}

const unlockedIds = async (userId) => {
  const { rows } = await db.query('SELECT badge_id FROM user_achievements WHERE user_id=$1', [userId])
  return new Set(rows.map((r) => r.badge_id))
}

// Insert an unlock, or do nothing if it already exists. Returns true only on a
// genuinely new unlock — the single source of truth for "did this just happen".
const insertUnlock = async (userId, badgeId, { source = 'auto', grantedBy = null, context = {} } = {}) => {
  const { rowCount } = await db.query(
    `INSERT INTO user_achievements (user_id, badge_id, source, granted_by, context)
     VALUES ($1, $2, $3, $4, $5::jsonb)
     ON CONFLICT (user_id, badge_id) DO NOTHING`,
    [userId, badgeId, source, grantedBy, JSON.stringify(context)]
  )
  return rowCount > 0
}

const removeUnlock = async (userId, badgeId) => {
  const { rowCount } = await db.query(
    'DELETE FROM user_achievements WHERE user_id=$1 AND badge_id=$2',
    [userId, badgeId]
  )
  return rowCount > 0
}

const setFrozen = async (userId, badgeId, frozen) => {
  await db.query('UPDATE user_achievements SET frozen=$3 WHERE user_id=$1 AND badge_id=$2', [userId, badgeId, !!frozen])
}

// Pin/unpin a badge to the showcase. pinOrder keeps the drag order.
const setFeatured = async (userId, badgeId, featured, pinOrder = null) => {
  await db.query(
    'UPDATE user_achievements SET featured=$3, pin_order=$4 WHERE user_id=$1 AND badge_id=$2',
    [userId, badgeId, !!featured, pinOrder]
  )
}

// Rewrite the whole showcase ordering in one shot from an ordered list of badge
// ids (used by drag-and-drop reordering).
const setShowcaseOrder = async (userId, orderedBadgeIds) => {
  await db.query('UPDATE user_achievements SET featured=FALSE, pin_order=NULL WHERE user_id=$1', [userId])
  for (let i = 0; i < orderedBadgeIds.length; i++) {
    await db.query(
      'UPDATE user_achievements SET featured=TRUE, pin_order=$3 WHERE user_id=$1 AND badge_id=$2',
      [userId, orderedBadgeIds[i], i]
    )
  }
}

// ── Progress ─────────────────────────────────────────────────────────────────

const listProgress = async (userId) => {
  const { rows } = await db.query('SELECT * FROM achievement_progress WHERE user_id=$1', [userId])
  return rows.map((r) => ({ badgeId: r.badge_id, current: r.current, target: r.target, percent: r.percent, updatedAt: r.updated_at }))
}

// Batch upsert progress rows in a single statement (no N+1).
const upsertProgress = async (userId, entries) => {
  if (!entries.length) return
  const values = []
  const params = [userId]
  for (const e of entries) {
    const b = params.push(e.badgeId)
    const c = params.push(e.current)
    const t = params.push(e.target)
    const p = params.push(e.percent)
    values.push(`($1, $${b}, $${c}, $${t}, $${p}, NOW())`)
  }
  await db.query(
    `INSERT INTO achievement_progress (user_id, badge_id, current, target, percent, updated_at)
     VALUES ${values.join(', ')}
     ON CONFLICT (user_id, badge_id) DO UPDATE
       SET current=EXCLUDED.current, target=EXCLUDED.target, percent=EXCLUDED.percent, updated_at=NOW()`,
    params
  )
}

const clearProgress = async (userId, badgeId) => {
  await db.query('DELETE FROM achievement_progress WHERE user_id=$1 AND badge_id=$2', [userId, badgeId])
}

// ── Tiers ────────────────────────────────────────────────────────────────────

const getTiers = async (userId) => {
  const { rows } = await db.query('SELECT * FROM tier_state WHERE user_id=$1', [userId])
  const out = {}
  for (const r of rows) out[r.track_id] = { tierId: r.tier_id, level: r.level, reachedAt: r.reached_at }
  return out
}

const setTier = async (userId, trackId, tierId, level) => {
  await db.query(
    `INSERT INTO tier_state (user_id, track_id, tier_id, level, reached_at)
     VALUES ($1, $2, $3, $4, NOW())
     ON CONFLICT (user_id, track_id) DO UPDATE
       SET tier_id=EXCLUDED.tier_id, level=EXCLUDED.level, reached_at=NOW()`,
    [userId, trackId, tierId, level]
  )
}

const addTierHistory = async (userId, trackId, fromTier, toTier, level) => {
  await db.query(
    `INSERT INTO tier_history (user_id, track_id, from_tier, to_tier, level) VALUES ($1,$2,$3,$4,$5)`,
    [userId, trackId, fromTier, toTier, level]
  )
}

// ── Timeline (unlock history) ────────────────────────────────────────────────

const addUnlockHistory = async (userId, { kind, badgeId = null, trackId = null, tierId = null, source = null, event = null, storyId = null }) => {
  await db.query(
    `INSERT INTO unlock_history (user_id, kind, badge_id, track_id, tier_id, source, event, story_id)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
    [userId, kind, badgeId, trackId, tierId, source, event, storyId]
  )
}

const listTimeline = async (userId, { limit = 20, offset = 0 } = {}) => {
  const { rows } = await db.query(
    `SELECT h.*, s.title AS story_title
       FROM unlock_history h
       LEFT JOIN stories s ON s.id = h.story_id
      WHERE h.user_id=$1
      ORDER BY h.created_at DESC
      LIMIT $2 OFFSET $3`,
    [userId, Math.min(limit, 100), offset]
  )
  return rows.map((r) => ({
    id: r.id, kind: r.kind, badgeId: r.badge_id, trackId: r.track_id, tierId: r.tier_id,
    source: r.source, event: r.event, storyId: r.story_id, storyTitle: r.story_title || null,
    createdAt: r.created_at,
  }))
}

// ── Notifications ────────────────────────────────────────────────────────────

const addNotification = async (userId, { kind, badgeId = null, trackId = null, tierId = null, title, body = null }) => {
  const { rows } = await db.query(
    `INSERT INTO achievement_notifications (user_id, kind, badge_id, track_id, tier_id, title, body)
     VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
    [userId, kind, badgeId, trackId, tierId, title, body]
  )
  return rows[0]
}

const listNotifications = async (userId, limit = 20) => {
  const { rows } = await db.query(
    'SELECT * FROM achievement_notifications WHERE user_id=$1 ORDER BY created_at DESC LIMIT $2',
    [userId, Math.min(limit, 50)]
  )
  return rows.map((r) => ({
    id: r.id, kind: r.kind, badgeId: r.badge_id, trackId: r.track_id, tierId: r.tier_id,
    title: r.title, body: r.body, seen: r.seen, createdAt: r.created_at,
  }))
}

const unseenCount = async (userId) => {
  const { rows } = await db.query('SELECT COUNT(*)::int n FROM achievement_notifications WHERE user_id=$1 AND NOT seen', [userId])
  return rows[0].n
}

const markSeen = async (userId, ids = null) => {
  if (ids && ids.length) {
    await db.query('UPDATE achievement_notifications SET seen=TRUE WHERE user_id=$1 AND id = ANY($2::uuid[])', [userId, ids])
  } else {
    await db.query('UPDATE achievement_notifications SET seen=TRUE WHERE user_id=$1 AND NOT seen', [userId])
  }
}

// ── Audit ────────────────────────────────────────────────────────────────────

const addAudit = async ({ actorId, targetUserId, action, badgeId = null, trackId = null, detail = {} }) => {
  await db.query(
    `INSERT INTO achievement_audit (actor_id, target_user_id, action, badge_id, track_id, detail)
     VALUES ($1,$2,$3,$4,$5,$6::jsonb)`,
    [actorId, targetUserId, action, badgeId, trackId, JSON.stringify(detail)]
  )
}

const listAudit = async ({ targetUserId = null, limit = 50, offset = 0 } = {}) => {
  const where = targetUserId ? 'WHERE a.target_user_id=$3' : ''
  const params = targetUserId ? [Math.min(limit, 200), offset, targetUserId] : [Math.min(limit, 200), offset]
  const { rows } = await db.query(
    `SELECT a.*, actor.username AS actor_username, target.username AS target_username
       FROM achievement_audit a
       LEFT JOIN users actor  ON actor.id  = a.actor_id
       LEFT JOIN users target ON target.id = a.target_user_id
       ${where}
      ORDER BY a.created_at DESC
      LIMIT $1 OFFSET $2`,
    params
  )
  return rows.map((r) => ({
    id: r.id, action: r.action, badgeId: r.badge_id, trackId: r.track_id, detail: r.detail || {},
    actorId: r.actor_id, actorUsername: r.actor_username, targetUserId: r.target_user_id,
    targetUsername: r.target_username, createdAt: r.created_at,
  }))
}

module.exports = {
  listUnlocked, unlockedIds, insertUnlock, removeUnlock, setFrozen, setFeatured, setShowcaseOrder,
  listProgress, upsertProgress, clearProgress,
  getTiers, setTier, addTierHistory,
  addUnlockHistory, listTimeline,
  addNotification, listNotifications, unseenCount, markSeen,
  addAudit, listAudit,
}
