// Badge categories. `audience` groups them for the profile ("author" badges show
// on author surfaces, "reader" on reader surfaces, "special" everywhere). Adding
// a category is a one-line edit — no engine or migration change.

const CATEGORIES = [
  { id: 'publishing',      label: 'Publishing',       audience: 'author' },
  { id: 'writing_quality', label: 'Writing Quality',  audience: 'author' },
  { id: 'story_design',    label: 'Story Design',     audience: 'author' },
  { id: 'community',       label: 'Community',        audience: 'author' },
  { id: 'popularity',      label: 'Popularity',       audience: 'author' },
  { id: 'retention',       label: 'Retention',        audience: 'author' },
  { id: 'reading',         label: 'Reading',          audience: 'reader' },
  { id: 'exploration',     label: 'Exploration',      audience: 'reader' },
  { id: 'engagement',      label: 'Engagement',       audience: 'reader' },
  { id: 'challenges',      label: 'Challenges',       audience: 'reader' },
  { id: 'genres',          label: 'Genres',           audience: 'reader' },
  { id: 'investigation',   label: 'Investigation',    audience: 'reader' },
  { id: 'seasonal',        label: 'Seasonal',         audience: 'special' },
  { id: 'special_events',  label: 'Special Events',   audience: 'special' },
  { id: 'platform_events', label: 'Platform Events',  audience: 'special' },
  { id: 'founder',         label: 'Founder',          audience: 'special' },
  { id: 'premium',         label: 'Premium',          audience: 'special' },
  { id: 'hidden',          label: 'Hidden',           audience: 'special' },
  { id: 'administrative',  label: 'Administrative',   audience: 'special' },
]

const byId = new Map(CATEGORIES.map((c) => [c.id, c]))

module.exports = { CATEGORIES, isCategory: (id) => byId.has(id), category: (id) => byId.get(id) }
