// Rarity tiers, ordered from most common to rarest. `rank` drives sorting and
// "how impressive" comparisons; everything visual (border, glow, gradient) lives
// on the frontend so the server stays a plain data source.
//
// Adding a rarity is a config edit here plus a matching entry in the frontend
// rarity map — no engine change.

const RARITIES = [
  { id: 'common',        label: 'Common',                  rank: 1 },
  { id: 'uncommon',      label: 'Uncommon',                rank: 2 },
  { id: 'rare',          label: 'Rare',                    rank: 3 },
  { id: 'epic',          label: 'Epic',                    rank: 4 },
  { id: 'legendary',     label: 'Legendary',               rank: 5 },
  { id: 'mythic',        label: 'Mythic',                  rank: 6 },
  { id: 'administrator', label: 'Administrator Exclusive', rank: 7 },
  { id: 'hidden',        label: 'Hidden',                  rank: 8 },
]

const RARITY_IDS = RARITIES.map((r) => r.id)
const byId = new Map(RARITIES.map((r) => [r.id, r]))

const rarityRank = (id) => byId.get(id)?.rank ?? 0

module.exports = { RARITIES, RARITY_IDS, rarityRank, isRarity: (id) => byId.has(id) }
