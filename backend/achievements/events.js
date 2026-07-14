// Event vocabulary. Each event names the metrics it could have moved and the
// progression track it belongs to, so the engine re-evaluates only the affected
// achievements instead of everything on every request.
//
//   track    'author' | 'reader' — which tier ladder to re-check.
//   metrics  the query metrics to refresh from source.
//   activity true → also counts as a day of reader activity (advances streaks).
//
// Events always concern ONE user; the caller decides whose id to pass (e.g. a
// like refreshes the *author's* likes_received, and separately the liker's
// likes_given via LIKE_GIVEN).

const EVENTS = {
  // ── Author ────────────────────────────────────────────────────────────────
  STORY_PUBLISHED:    { track: 'author', metrics: ['stories_published', 'stories_created', 'distinct_genres_written', 'total_branches', 'total_passages', 'total_endings'] },
  STORY_UPDATED:      { track: 'author', metrics: ['total_branches', 'total_passages', 'total_endings', 'distinct_genres_written'] },
  STORY_UNPUBLISHED:  { track: 'author', metrics: ['stories_published', 'distinct_genres_written', 'featured_stories'] },
  STORY_FEATURED:     { track: 'author', metrics: ['featured_stories'] },
  LIKE_RECEIVED:      { track: 'author', metrics: ['likes_received'] },
  COMMENT_RECEIVED:   { track: 'author', metrics: ['comments_received'] },
  RATING_RECEIVED:    { track: 'author', metrics: ['ratings_received', 'five_star_received'] },
  FOLLOWER_ADDED:     { track: 'author', metrics: ['followers'] },
  COLLABORATOR_ADDED: { track: 'author', metrics: ['collaborations'] },

  // ── Reader ────────────────────────────────────────────────────────────────
  LIKE_GIVEN:      { track: 'reader', metrics: ['likes_given'], activity: true },
  COMMENT_POSTED:  { track: 'reader', metrics: ['comments_posted'], activity: true },
  RATING_GIVEN:    { track: 'reader', metrics: ['ratings_given'], activity: true },
  BOOKMARK_ADDED:  { track: 'reader', metrics: ['bookmarks'] },
  FOLLOWING_ADDED: { track: 'reader', metrics: ['following'] },
  READING_PROGRESS:{ track: 'reader', metrics: ['stories_started', 'distinct_genres_read'], activity: true },
  STORY_COMPLETED: { track: 'reader', metrics: ['stories_completed', 'genres_completed'], activity: true },
  CHOICE_MADE:     { track: 'reader', metrics: ['choices_made'], activity: true },
  DAILY_ACTIVE:    { track: 'reader', metrics: [], activity: true },
}

const isEvent = (name) => Object.prototype.hasOwnProperty.call(EVENTS, name)

module.exports = { EVENTS, isEvent }
