// Catalogue registry: validates the config once at load, then serves cached,
// indexed views of it. Everything downstream (engine, evaluator, routes, admin)
// reads the catalogue through here so definitions are parsed and checked exactly
// once per process — satisfying the "cache badge/tier definitions" requirement.

const { RARITIES, isRarity } = require('./rarities')
const { CATEGORIES, isCategory } = require('./categories')
const { METRICS, isMetric } = require('./metrics')
const { TRACKS } = require('./tiers')
const { BADGES } = require('./badges')

// ── Validate (fail fast at boot on a bad config record) ──────────────────────

const criteriaMetrics = (criteria) => {
  if (!criteria) return []
  if (criteria.manual) return []
  if (criteria.metric) return [criteria.metric]
  if (Array.isArray(criteria.all)) return criteria.all.map((c) => c.metric)
  return null // malformed
}

const validate = () => {
  const seen = new Set()
  for (const b of BADGES) {
    if (!b.id) throw new Error('Badge missing id')
    if (seen.has(b.id)) throw new Error(`Duplicate badge id: ${b.id}`)
    seen.add(b.id)
    if (!isCategory(b.category)) throw new Error(`Badge ${b.id}: unknown category ${b.category}`)
    if (!isRarity(b.rarity)) throw new Error(`Badge ${b.id}: unknown rarity ${b.rarity}`)
    const metrics = criteriaMetrics(b.criteria)
    if (metrics === null) throw new Error(`Badge ${b.id}: malformed criteria`)
    for (const m of metrics) {
      if (!isMetric(m)) throw new Error(`Badge ${b.id}: unknown metric ${m}`)
    }
  }
  for (const track of TRACKS) {
    if (!isMetric(track.metric)) throw new Error(`Tier track ${track.id}: unknown metric ${track.metric}`)
    let last = -1
    for (const t of track.tiers) {
      if (t.min < last) throw new Error(`Tier track ${track.id}: tiers must ascend by min`)
      last = t.min
    }
  }
}

validate()

// ── Indexes (built once) ─────────────────────────────────────────────────────

const badgeById = new Map(BADGES.map((b) => [b.id, b]))

// metric id → badges whose unlock depends on it. Lets the engine re-check only
// the achievements a given event could possibly have moved.
const badgesByMetric = new Map()
for (const b of BADGES) {
  for (const m of criteriaMetrics(b.criteria) || []) {
    if (!badgesByMetric.has(m)) badgesByMetric.set(m, [])
    badgesByMetric.get(m).push(b)
  }
}

const autoBadges = BADGES.filter((b) => !b.criteria?.manual)
const manualBadges = BADGES.filter((b) => b.criteria?.manual)

module.exports = {
  RARITIES,
  CATEGORIES,
  METRICS,
  TRACKS,
  BADGES,
  autoBadges,
  manualBadges,
  criteriaMetrics,
  getBadge: (id) => badgeById.get(id) || null,
  badgesForMetric: (metricId) => badgesByMetric.get(metricId) || [],
}
