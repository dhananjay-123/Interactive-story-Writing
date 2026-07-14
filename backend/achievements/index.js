// Public façade for the achievement subsystem. Routes and other modules import
// from here, not from the internals, so the surface stays small and stable.
//
//   emit(...)  — fire-and-forget event recorder for request handlers. It never
//                throws and never blocks the response: award work happens after
//                the handler has what it needs. This is the ONLY function the rest
//                of the app should call to drive achievements.

const engine = require('./engine')
const profile = require('./profile')
const admin = require('./admin')
const leaderboard = require('./leaderboard')
const analytics = require('./analytics')
const store = require('./store')
const catalog = require('./catalog')

// Record an event without making the caller wait or handle failure. Returns the
// promise so callers *may* await (e.g. tests), but production paths just call it.
const emit = (userId, eventName, ctx) => {
  const p = engine.record(userId, eventName, ctx)
  p.catch((err) => console.error('[achievements] emit failed:', err.message))
  return p
}

// Serializable public catalogue for admin preview / badge browser UIs.
const publicCatalog = () => ({
  rarities: catalog.RARITIES,
  categories: catalog.CATEGORIES,
  tracks: catalog.TRACKS,
  badges: catalog.BADGES.map((b) => ({
    id: b.id, name: b.name, description: b.description, hint: b.hint,
    category: b.category, rarity: b.rarity, icon: b.icon, hidden: b.hidden,
    audience: b.audience, manual: !!b.criteria?.manual, criteria: b.criteria,
  })),
})

module.exports = {
  emit,
  record: engine.record,
  recomputeUser: engine.recomputeUser,
  buildSelfProfile: profile.buildSelf,
  buildPublicProfile: profile.buildPublic,
  admin,
  leaderboard,
  analytics,
  store,
  catalog,
  publicCatalog,
}
