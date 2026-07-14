// Metric definitions — the vocabulary every badge and tier is written against.
//
// A metric is a single named number for one user (e.g. "stories_published" = 7).
// Badges/tiers unlock when a metric reaches a target, so adding an achievement
// never touches evaluation code: you reference an existing metric, or add one
// metric (metadata here + a source query in engine/metrics.js) and reuse it
// forever.
//
//   audience  'author' | 'reader'  — which profile surfaces the metric belongs to.
//   source    'query'  — recomputed from source tables on the events listed.
//             'counter' — maintained by the engine (streaks, activity days).
//   label/unit — display only.

const METRICS = [
  // ── Author ────────────────────────────────────────────────────────────────
  { id: 'stories_published',        audience: 'author', source: 'query',   label: 'Stories published',      unit: 'stories' },
  { id: 'stories_created',          audience: 'author', source: 'query',   label: 'Stories written',        unit: 'stories' },
  { id: 'total_branches',           audience: 'author', source: 'query',   label: 'Branches authored',      unit: 'branches' },
  { id: 'total_passages',           audience: 'author', source: 'query',   label: 'Passages written',       unit: 'passages' },
  { id: 'total_endings',            audience: 'author', source: 'query',   label: 'Endings crafted',        unit: 'endings' },
  { id: 'distinct_genres_written',  audience: 'author', source: 'query',   label: 'Genres written in',      unit: 'genres' },
  { id: 'likes_received',           audience: 'author', source: 'query',   label: 'Likes received',         unit: 'likes' },
  { id: 'comments_received',        audience: 'author', source: 'query',   label: 'Comments received',      unit: 'comments' },
  { id: 'ratings_received',         audience: 'author', source: 'query',   label: 'Ratings received',       unit: 'ratings' },
  { id: 'five_star_received',       audience: 'author', source: 'query',   label: 'Five-star ratings',      unit: 'ratings' },
  { id: 'followers',                audience: 'author', source: 'query',   label: 'Followers',              unit: 'followers' },
  { id: 'featured_stories',         audience: 'author', source: 'query',   label: 'Featured stories',       unit: 'stories' },
  { id: 'collaborations',           audience: 'author', source: 'query',   label: 'Co-written stories',     unit: 'stories' },

  // ── Reader ────────────────────────────────────────────────────────────────
  { id: 'stories_started',          audience: 'reader', source: 'query',   label: 'Stories started',        unit: 'stories' },
  { id: 'stories_completed',        audience: 'reader', source: 'query',   label: 'Stories completed',      unit: 'stories' },
  { id: 'distinct_genres_read',     audience: 'reader', source: 'query',   label: 'Genres explored',        unit: 'genres' },
  { id: 'genres_completed',         audience: 'reader', source: 'query',   label: 'Genres completed',       unit: 'genres' },
  { id: 'choices_made',             audience: 'reader', source: 'query',   label: 'Choices made',           unit: 'choices' },
  { id: 'likes_given',              audience: 'reader', source: 'query',   label: 'Likes given',            unit: 'likes' },
  { id: 'bookmarks',                audience: 'reader', source: 'query',   label: 'Bookmarks',              unit: 'stories' },
  { id: 'comments_posted',          audience: 'reader', source: 'query',   label: 'Comments posted',        unit: 'comments' },
  { id: 'ratings_given',            audience: 'reader', source: 'query',   label: 'Ratings given',          unit: 'ratings' },
  { id: 'following',                audience: 'reader', source: 'query',   label: 'Authors followed',       unit: 'authors' },
  { id: 'reading_streak',           audience: 'reader', source: 'counter', label: 'Day reading streak',     unit: 'days' },
  { id: 'active_days',              audience: 'reader', source: 'counter', label: 'Active days',            unit: 'days' },
]

const byId = new Map(METRICS.map((m) => [m.id, m]))

module.exports = {
  METRICS,
  metric: (id) => byId.get(id),
  isMetric: (id) => byId.has(id),
  metricIds: METRICS.map((m) => m.id),
}
