// Metric computation and the per-user stats store.
//
// Every "query" metric has one single-user, index-backed SQL here. The engine
// refreshes only the metrics an event could have moved (see events.js), writes
// them into user_stats.metrics, and evaluates from there — so counters are always
// derived from source tables and can never drift. "counter" metrics (streaks,
// active days) genuinely need running state and are maintained by recordActivity.

const db = require('../db')
const { METRICS } = require('./catalog')

const one = async (sql, params) => {
  const { rows } = await db.query(sql, params)
  return Number(rows[0]?.n || 0)
}

// metricId → async (userId) => number. Query metrics only.
const SOURCE = {
  // Author
  stories_published:       (u) => one(`SELECT COUNT(*)::int n FROM stories WHERE author_id=$1 AND published`, [u]),
  stories_created:         (u) => one(`SELECT COUNT(*)::int n FROM stories WHERE author_id=$1`, [u]),
  total_branches:          (u) => one(`SELECT COALESCE(SUM(branch_count),0)::int n FROM stories WHERE author_id=$1`, [u]),
  total_passages:          (u) => one(`SELECT COUNT(*)::int n FROM nodes n JOIN stories s ON s.id=n.story_id WHERE s.author_id=$1`, [u]),
  total_endings:           (u) => one(`SELECT COUNT(*)::int n FROM nodes n JOIN stories s ON s.id=n.story_id WHERE s.author_id=$1 AND n.is_ending`, [u]),
  distinct_genres_written: (u) => one(`SELECT COUNT(DISTINCT genre)::int n FROM stories WHERE author_id=$1 AND published`, [u]),
  likes_received:          (u) => one(`SELECT COUNT(*)::int n FROM likes l JOIN stories s ON s.id=l.story_id WHERE s.author_id=$1`, [u]),
  comments_received:       (u) => one(`SELECT COUNT(*)::int n FROM comments c JOIN stories s ON s.id=c.story_id WHERE s.author_id=$1`, [u]),
  ratings_received:        (u) => one(`SELECT COUNT(*)::int n FROM ratings r JOIN stories s ON s.id=r.story_id WHERE s.author_id=$1`, [u]),
  five_star_received:      (u) => one(`SELECT COUNT(*)::int n FROM ratings r JOIN stories s ON s.id=r.story_id WHERE s.author_id=$1 AND r.value=5`, [u]),
  followers:               (u) => one(`SELECT COUNT(*)::int n FROM follows WHERE following_id=$1`, [u]),
  featured_stories:        (u) => one(`SELECT COUNT(*)::int n FROM stories WHERE author_id=$1 AND featured`, [u]),
  collaborations:          (u) => one(`SELECT COUNT(*)::int n FROM story_collaborators WHERE user_id=$1`, [u]),

  // Reader
  stories_started:         (u) => one(`SELECT COUNT(*)::int n FROM reading_progress WHERE user_id=$1`, [u]),
  stories_completed:       (u) => one(`SELECT COUNT(*)::int n FROM reader_completions WHERE user_id=$1`, [u]),
  distinct_genres_read:    (u) => one(`SELECT COUNT(DISTINCT s.genre)::int n FROM reading_progress p JOIN stories s ON s.id=p.story_id WHERE p.user_id=$1`, [u]),
  genres_completed:        (u) => one(`SELECT COUNT(DISTINCT genre)::int n FROM reader_completions WHERE user_id=$1 AND genre IS NOT NULL`, [u]),
  choices_made:            (u) => one(`SELECT COUNT(*)::int n FROM choice_events WHERE user_id=$1`, [u]),
  likes_given:             (u) => one(`SELECT COUNT(*)::int n FROM likes WHERE user_id=$1`, [u]),
  bookmarks:               (u) => one(`SELECT COUNT(*)::int n FROM bookmarks WHERE user_id=$1`, [u]),
  comments_posted:         (u) => one(`SELECT COUNT(*)::int n FROM comments WHERE user_id=$1`, [u]),
  ratings_given:           (u) => one(`SELECT COUNT(*)::int n FROM ratings WHERE user_id=$1`, [u]),
  following:               (u) => one(`SELECT COUNT(*)::int n FROM follows WHERE follower_id=$1`, [u]),

  // Story Games. Sessions only close once, so these can't be inflated by
  // re-reading; "perfect" is stamped by the game engine at scoring time.
  games_played:            (u) => one(`SELECT COUNT(*)::int n FROM game_sessions WHERE user_id=$1 AND finished_at IS NOT NULL`, [u]),
  games_solved:            (u) => one(`SELECT COUNT(*)::int n FROM game_sessions WHERE user_id=$1 AND solved`, [u]),
  games_perfect:           (u) => one(`SELECT COUNT(*)::int n FROM game_sessions WHERE user_id=$1 AND perfect`, [u]),
  clues_found:             (u) => one(`SELECT COUNT(*)::int n FROM game_discoveries WHERE user_id=$1`, [u]),
}

const QUERY_METRIC_IDS = METRICS.filter((m) => m.source === 'query').map((m) => m.id)

// Read the stored stats row, or a blank one. `metrics` always comes back as an
// object, `reading_streak`/`active_days` folded in from the streak columns so
// callers see one flat metric map.
const getStats = async (userId) => {
  // Read last_active_on as a plain 'YYYY-MM-DD' string so streak comparisons never
  // depend on how a DATE round-trips through a JS Date in the server's timezone.
  const { rows } = await db.query(
    `SELECT *, to_char(last_active_on, 'YYYY-MM-DD') AS last_active_key FROM user_stats WHERE user_id=$1`,
    [userId]
  )
  const row = rows[0]
  const metrics = row?.metrics || {}
  return {
    metrics: {
      ...metrics,
      reading_streak: row?.streak_days || 0,
      active_days: Number(metrics.active_days || 0),
    },
    streakDays: row?.streak_days || 0,
    longestStreak: row?.longest_streak || 0,
    lastActiveKey: row?.last_active_key || null,
    updatedAt: row?.updated_at || null,
  }
}

// Recompute the given query metrics from source and persist them, returning the
// merged metric map. Unknown/counter metrics are ignored here.
const refreshMetrics = async (userId, metricIds) => {
  const ids = [...new Set(metricIds)].filter((id) => SOURCE[id])
  if (ids.length === 0) return (await getStats(userId)).metrics

  const values = await Promise.all(ids.map((id) => SOURCE[id](userId)))
  const patch = {}
  ids.forEach((id, i) => { patch[id] = values[i] })

  // Merge the freshly computed values into the JSONB map in one round-trip.
  await db.query(
    `INSERT INTO user_stats (user_id, metrics, updated_at)
     VALUES ($1, $2::jsonb, NOW())
     ON CONFLICT (user_id) DO UPDATE
       SET metrics = user_stats.metrics || EXCLUDED.metrics, updated_at = NOW()`,
    [userId, JSON.stringify(patch)]
  )
  return (await getStats(userId)).metrics
}

// Full recompute from source — used by admin "recalculate" and as a safety net.
const recomputeAll = (userId) => refreshMetrics(userId, QUERY_METRIC_IDS)

// Record a day of reader activity and advance the streak. Idempotent within a
// day. Returns the new streak length.
const recordActivity = async (userId, today = new Date()) => {
  const stats = await getStats(userId)
  // Work entirely in UTC 'YYYY-MM-DD' keys, matching how getStats reads the column.
  const key = (d) => new Date(d).toISOString().slice(0, 10)
  const todayStr = key(today)

  if (stats.lastActiveKey === todayStr) {
    return stats.streakDays // already counted today
  }

  const yesterday = key(new Date(new Date(todayStr + 'T00:00:00Z').getTime() - 86400000))
  const continues = stats.lastActiveKey === yesterday
  const streak = continues ? stats.streakDays + 1 : 1
  const longest = Math.max(streak, stats.longestStreak)
  const activeDays = Number(stats.metrics.active_days || 0) + 1

  await db.query(
    `INSERT INTO user_stats (user_id, metrics, last_active_on, streak_days, longest_streak, updated_at)
     VALUES ($1, jsonb_build_object('active_days', $2::int), $3::date, $4, $5, NOW())
     ON CONFLICT (user_id) DO UPDATE
       SET metrics        = user_stats.metrics || jsonb_build_object('active_days', $2::int),
           last_active_on = EXCLUDED.last_active_on,
           streak_days    = EXCLUDED.streak_days,
           longest_streak = GREATEST(user_stats.longest_streak, EXCLUDED.longest_streak),
           updated_at     = NOW()`,
    [userId, activeDays, todayStr, streak, longest]
  )
  return streak
}

// Mark a story finished for a reader. Idempotent (PK guard), so re-finishing never
// double-counts. Returns true only the first time.
const recordCompletion = async (userId, storyId, nodeId, genre) => {
  const { rowCount } = await db.query(
    `INSERT INTO reader_completions (user_id, story_id, node_id, genre)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (user_id, story_id) DO NOTHING`,
    [userId, storyId, nodeId || null, genre || null]
  )
  return rowCount > 0
}

module.exports = {
  getStats,
  refreshMetrics,
  recomputeAll,
  recordActivity,
  recordCompletion,
  QUERY_METRIC_IDS,
}
