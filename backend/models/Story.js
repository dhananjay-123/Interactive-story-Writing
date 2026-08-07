const db = require('../db')

const mapStory = (row) =>
  row && {
    _id: row.id,
    title: row.title,
    description: row.description,
    genre: row.genre,
    author: row.author,
    authorId: row.author_id,
    authorUsername: row.author_username || null,
    rootNodeId: row.root_node_id,
    branchCount: row.branch_count,
    ambience: row.ambience || null,
    tags: row.tags || [],
    published: row.published,
    featured: row.featured ?? false,
    featuredAt: row.featured_at ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    // Engagement aggregates (present on enriched reads; default to empty otherwise).
    likeCount: row.like_count ?? 0,
    commentCount: row.comment_count ?? 0,
    ratingCount: row.rating_count ?? 0,
    ratingAvg: row.rating_avg ?? 0,
    // Viewer-relative flags (null viewer → all falsey).
    liked: row.liked ?? false,
    bookmarked: row.bookmarked ?? false,
    myRating: row.my_rating ?? null,
    // Co-authors (owner excluded) — present on enriched reads, [] otherwise.
    collaborators: row.collaborators || [],
    // The Story Game layer, when the story carries a live one. Null for the
    // overwhelming majority of stories, which are read exactly as before.
    gameMode: row.game_mode || null,
  }

// Enriched projection. `v` is the SQL placeholder holding the viewer's id
// (or a literal NULL) so counts + viewer flags come back in one round-trip.
const enriched = (v) => `
  SELECT s.*, u.username AS author_username,
    (SELECT COUNT(*) FROM likes l    WHERE l.story_id = s.id)::int AS like_count,
    (SELECT COUNT(*) FROM comments c WHERE c.story_id = s.id)::int AS comment_count,
    (SELECT COUNT(*) FROM ratings r  WHERE r.story_id = s.id)::int AS rating_count,
    COALESCE((SELECT ROUND(AVG(value)::numeric, 1) FROM ratings r WHERE r.story_id = s.id), 0)::float AS rating_avg,
    EXISTS(SELECT 1 FROM likes l     WHERE l.story_id = s.id AND l.user_id = ${v}) AS liked,
    EXISTS(SELECT 1 FROM bookmarks b WHERE b.story_id = s.id AND b.user_id = ${v}) AS bookmarked,
    (SELECT value FROM ratings r     WHERE r.story_id = s.id AND r.user_id = ${v}) AS my_rating,
    COALESCE((
      SELECT json_agg(json_build_object('username', cu.username, 'displayName', cu.display_name) ORDER BY sc.added_at)
      FROM story_collaborators sc JOIN users cu ON cu.id = sc.user_id
      WHERE sc.story_id = s.id
    ), '[]'::json) AS collaborators,
    (SELECT g.mode FROM story_games g WHERE g.story_id = s.id AND g.published) AS game_mode
  FROM stories s
  LEFT JOIN users u ON u.id = s.author_id
`

const ORDERS = {
  newest: 'created_at DESC',
  most_liked: 'like_count DESC, created_at DESC',
  top_rated: 'rating_avg DESC, rating_count DESC, created_at DESC',
  trending: '(like_count * 3 + comment_count * 2 + rating_count * 2) DESC, created_at DESC',
}

// Discovery query: genre + tag + text filters and a sort, viewer-aware.
// `game` narrows to stories carrying a live Story Game; `gameMode` narrows
// further to one flavour of it. Both are EXISTS predicates rather than filters on
// the game_mode alias, which isn't in scope in the inner query's WHERE.
const findMany = async ({ genre, tag, q, sort, game, gameMode, viewerId } = {}) => {
  const params = [viewerId ?? null] // $1 = viewer
  const add = (val) => { params.push(val); return '$' + params.length }

  const where = ['s.published = TRUE']
  if (genre && genre !== 'all') where.push(`s.genre = ${add(genre)}`)
  if (tag) where.push(`${add(tag)} = ANY(s.tags)`)
  if (gameMode) {
    where.push(`EXISTS(SELECT 1 FROM story_games g WHERE g.story_id = s.id AND g.published AND g.mode = ${add(gameMode)})`)
  } else if (game) {
    where.push('EXISTS(SELECT 1 FROM story_games g WHERE g.story_id = s.id AND g.published)')
  }
  if (q && q.trim()) {
    const p = add('%' + q.trim() + '%')
    where.push(`(s.title ILIKE ${p} OR s.description ILIKE ${p})`)
  }

  const order = ORDERS[sort] || ORDERS.trending
  const sql = `
    SELECT * FROM (${enriched('$1')} WHERE ${where.join(' AND ')}) sub
    ORDER BY ${order}
  `
  const { rows } = await db.query(sql, params)
  return rows.map(mapStory)
}

// Kept for callers that just want every published story (viewer-agnostic).
const findPublished = () => findMany({ sort: 'newest' })

const findById = async (id, viewerId = null) => {
  const { rows } = await db.query(`${enriched('$1')} WHERE s.id = $2`, [viewerId, id])
  return mapStory(rows[0])
}

const findByAuthorId = async (authorId, viewerId = null) => {
  const { rows } = await db.query(
    `SELECT * FROM (${enriched('$1')} WHERE s.author_id = $2 AND s.published = TRUE) sub
     ORDER BY created_at DESC`,
    [viewerId, authorId]
  )
  return rows.map(mapStory)
}

// The signed-in author's own catalogue — every story they own, INCLUDING
// unpublished/hidden ones, so the "My stories" dashboard is complete. Viewer is
// the author themselves, so their like/bookmark/rating flags come back too.
const findMineForAuthor = async (authorId) => {
  const { rows } = await db.query(
    `SELECT * FROM (${enriched('$1')} WHERE s.author_id = $1) sub
     ORDER BY created_at DESC`,
    [authorId]
  )
  return rows.map(mapStory)
}

// Admin-curated rail: published stories flagged as featured, newest pick first.
const findFeatured = async (viewerId = null, limit = 6) => {
  const { rows } = await db.query(
    `SELECT * FROM (${enriched('$1')} WHERE s.published = TRUE AND s.featured = TRUE) sub
     ORDER BY featured_at DESC NULLS LAST, created_at DESC
     LIMIT $2`,
    [viewerId, limit]
  )
  return rows.map(mapStory)
}

// Moderation view: every story (including unpublished), optional text search.
// Admin-only — not viewer-scoped, so the viewer flags come back falsey.
const findAllForAdmin = async ({ q, filter, authorId } = {}) => {
  const params = [null]
  const add = (val) => { params.push(val); return '$' + params.length }
  const where = []
  if (filter === 'featured') where.push('s.featured = TRUE')
  if (filter === 'unpublished') where.push('s.published = FALSE')
  if (authorId) where.push(`s.author_id = ${add(authorId)}`)
  if (q && q.trim()) {
    const p = add('%' + q.trim() + '%')
    where.push(`(s.title ILIKE ${p} OR s.author ILIKE ${p})`)
  }
  const sql = `
    SELECT * FROM (${enriched('$1')}${where.length ? ' WHERE ' + where.join(' AND ') : ''}) sub
    ORDER BY created_at DESC
  `
  const { rows } = await db.query(sql, params)
  return rows.map(mapStory)
}

// Platform-wide analytics for the admin dashboard.
const adminStats = async () => {
  const { rows } = await db.query(`
    SELECT
      (SELECT COUNT(*)::int FROM stories)                          AS total_stories,
      (SELECT COUNT(*)::int FROM stories WHERE published)          AS published_stories,
      (SELECT COUNT(*)::int FROM stories WHERE featured)           AS featured_stories,
      (SELECT COUNT(*)::int FROM users)                            AS total_users,
      (SELECT COUNT(*)::int FROM users WHERE role = 'admin')       AS admin_users,
      (SELECT COUNT(*)::int FROM likes)                            AS total_likes,
      (SELECT COUNT(*)::int FROM comments)                         AS total_comments,
      (SELECT COUNT(*)::int FROM ratings)                          AS total_ratings,
      (SELECT COUNT(*)::int FROM reports WHERE status = 'open')    AS open_reports,
      (SELECT COUNT(*)::int FROM stories WHERE created_at > NOW() - INTERVAL '7 days')  AS stories_this_week,
      (SELECT COUNT(*)::int FROM users   WHERE created_at > NOW() - INTERVAL '7 days')  AS users_this_week
  `)
  const r = rows[0]
  return {
    totalStories: r.total_stories,
    publishedStories: r.published_stories,
    featuredStories: r.featured_stories,
    totalUsers: r.total_users,
    adminUsers: r.admin_users,
    totalLikes: r.total_likes,
    totalComments: r.total_comments,
    totalRatings: r.total_ratings,
    openReports: r.open_reports,
    storiesThisWeek: r.stories_this_week,
    usersThisWeek: r.users_this_week,
  }
}

// Genre distribution, for the analytics breakdown.
const genreBreakdown = async () => {
  const { rows } = await db.query(
    `SELECT genre, COUNT(*)::int AS count FROM stories GROUP BY genre ORDER BY count DESC`
  )
  return rows.map((r) => ({ genre: r.genre, count: r.count }))
}

// Most-engaged stories, for the analytics leaderboard.
const topStories = async (limit = 5) => {
  const { rows } = await db.query(
    `SELECT * FROM (${enriched('NULL')}) sub
     ORDER BY (like_count * 3 + comment_count * 2 + rating_count * 2) DESC, created_at DESC
     LIMIT $1`,
    [limit]
  )
  return rows.map(mapStory)
}

// Stories the viewer has bookmarked, most-recently-saved first.
const bookmarkedBy = async (viewerId) => {
  const { rows } = await db.query(
    `SELECT sub.* FROM (${enriched('$1')} WHERE s.published = TRUE) sub
     JOIN bookmarks b ON b.story_id = sub.id
     WHERE b.user_id = $1
     ORDER BY b.created_at DESC`,
    [viewerId]
  )
  return rows.map(mapStory)
}

// Most-used tags, nudged by recent likes so the list reads as "trending".
const trendingTags = async (limit = 12) => {
  const { rows } = await db.query(
    `SELECT t.tag, COUNT(DISTINCT t.id)::int AS count
     FROM (SELECT id, unnest(tags) AS tag FROM stories WHERE published = TRUE) t
     LEFT JOIN LATERAL (
       SELECT COUNT(*) AS recent FROM likes lk
       WHERE lk.story_id = t.id AND lk.created_at > NOW() - INTERVAL '30 days'
     ) l ON true
     GROUP BY t.tag
     ORDER BY (COUNT(DISTINCT t.id) + COALESCE(SUM(l.recent), 0)) DESC, COUNT(DISTINCT t.id) DESC, t.tag ASC
     LIMIT $1`,
    [limit]
  )
  return rows.map((r) => ({ tag: r.tag, count: r.count }))
}

// Personalized picks. Signed-in readers get stories matching the genres/tags
// they've liked or saved, or by authors they follow; everyone else (and anyone
// with too little history) gets the trending list. Own + already-liked excluded.
const recommend = async (viewerId, limit = 6) => {
  if (!viewerId) {
    return (await findMany({ sort: 'trending', viewerId: null })).slice(0, limit)
  }

  const { rows } = await db.query(
    `WITH seen AS (
       SELECT story_id FROM likes     WHERE user_id = $1
       UNION SELECT story_id FROM bookmarks WHERE user_id = $1
     ),
     taste_genres AS (SELECT DISTINCT genre FROM stories WHERE id IN (SELECT story_id FROM seen)),
     taste_tags   AS (SELECT DISTINCT unnest(tags) AS tag FROM stories WHERE id IN (SELECT story_id FROM seen))
     SELECT * FROM (${enriched('$1')} WHERE s.published = TRUE) sub
     WHERE sub.author_id IS DISTINCT FROM $1
       AND sub.id NOT IN (SELECT story_id FROM likes WHERE user_id = $1)
       AND (
         sub.genre IN (SELECT genre FROM taste_genres)
         OR sub.tags && ARRAY(SELECT tag FROM taste_tags)
         OR sub.author_id IN (SELECT following_id FROM follows WHERE follower_id = $1)
       )
     ORDER BY (like_count * 3 + comment_count * 2 + rating_count * 2) DESC, created_at DESC
     LIMIT $2`,
    [viewerId, limit]
  )
  let recs = rows.map(mapStory)

  // Top up with trending picks the reader hasn't liked, if taste was too thin.
  if (recs.length < limit) {
    const have = new Set(recs.map((s) => s._id))
    const filler = await findMany({ sort: 'trending', viewerId })
    for (const s of filler) {
      if (recs.length >= limit) break
      if (!have.has(s._id) && !s.liked && s.authorId !== viewerId) recs.push(s)
    }
  }
  return recs
}

// Normalize free-form tag input into up to 6 lowercase slugs.
const normalizeTags = (input) => {
  const arr = Array.isArray(input)
    ? input
    : typeof input === 'string'
    ? input.split(',')
    : []
  const seen = new Set()
  const out = []
  for (const raw of arr) {
    const tag = String(raw).trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
    if (tag && tag.length <= 24 && !seen.has(tag)) {
      seen.add(tag)
      out.push(tag)
      if (out.length >= 6) break
    }
  }
  return out
}

const create = async ({ title, description, genre, author, authorId, tags }) => {
  const { rows } = await db.query(
    `INSERT INTO stories (title, description, genre, author, author_id, tags)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [title, description || null, genre || 'fantasy', author || 'Anonymous', authorId || null, normalizeTags(tags)]
  )
  return mapStory(rows[0])
}

const setRoot = async (id, rootNodeId, branchCount) => {
  const { rows } = await db.query(
    `UPDATE stories
     SET root_node_id = $2, branch_count = $3, updated_at = NOW()
     WHERE id = $1
     RETURNING *`,
    [id, rootNodeId, branchCount]
  )
  return mapStory(rows[0])
}

const setBranchCount = async (id, count) => {
  await db.query(
    'UPDATE stories SET branch_count = $2, updated_at = NOW() WHERE id = $1',
    [id, count]
  )
}

const setAmbience = async (id, ambience) => {
  const { rows } = await db.query(
    `UPDATE stories SET ambience = $2, updated_at = NOW() WHERE id = $1 RETURNING *`,
    [id, ambience]
  )
  return mapStory(rows[0])
}

const setTags = async (id, tags) => {
  const { rows } = await db.query(
    `UPDATE stories SET tags = $2, updated_at = NOW() WHERE id = $1 RETURNING *`,
    [id, normalizeTags(tags)]
  )
  return mapStory(rows[0])
}

// Admin: flip the editorial featured flag. Stamps featured_at so the rail
// can order by most-recently-featured.
const setFeatured = async (id, featured) => {
  const { rows } = await db.query(
    `UPDATE stories
     SET featured = $2, featured_at = CASE WHEN $2 THEN NOW() ELSE NULL END
     WHERE id = $1
     RETURNING *`,
    [id, featured]
  )
  return mapStory(rows[0])
}

// Admin: publish or hide a story (moderation).
const setPublished = async (id, published) => {
  const { rows } = await db.query(
    `UPDATE stories SET published = $2, updated_at = NOW() WHERE id = $1 RETURNING *`,
    [id, published]
  )
  return mapStory(rows[0])
}

const remove = async (id) => {
  await db.query('DELETE FROM stories WHERE id = $1', [id])
}

module.exports = {
  findMany, findPublished, findById, findByAuthorId, findMineForAuthor, bookmarkedBy,
  trendingTags, recommend, normalizeTags,
  findFeatured, findAllForAdmin, adminStats, genreBreakdown, topStories,
  create, setRoot, setBranchCount, setAmbience, setTags,
  setFeatured, setPublished, remove,
}
