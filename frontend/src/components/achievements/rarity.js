// Visual identity per rarity. Muted, aged jewel tones so badges feel like pressed
// wax seals and gilt medallions on a manuscript, not neon game trophies. Each
// rarity gets a two-stop gradient for the medallion, a ring colour and a glow.
// Gold (the brand accent) is reserved for Legendary so it stays special.
//
// Colours are chosen to read on both the dark ink and light parchment themes.

export const RARITY = {
  common:        { label: 'Common',                  hi: '#b9b3c4', lo: '#7c7690', ring: '#8a8496', glow: 'rgba(138,132,150,0.35)' },
  uncommon:      { label: 'Uncommon',                hi: '#7bb291', lo: '#3f6f57', ring: '#5b8c6e', glow: 'rgba(91,140,110,0.40)' },
  rare:          { label: 'Rare',                    hi: '#6f9ed6', lo: '#375d8c', ring: '#4a72a8', glow: 'rgba(74,114,168,0.45)' },
  epic:          { label: 'Epic',                    hi: '#b184d0', lo: '#6a3f8c', ring: '#8a5ba8', glow: 'rgba(138,91,168,0.48)' },
  legendary:     { label: 'Legendary',               hi: '#e6cd80', lo: '#a8882e', ring: '#c9a84c', glow: 'rgba(201,168,76,0.55)' },
  mythic:        { label: 'Mythic',                  hi: '#e0a24c', lo: '#a5314a', ring: '#c56a4a', glow: 'rgba(197,106,74,0.55)' },
  administrator: { label: 'Administrator Exclusive', hi: '#4f9c92', lo: '#204f49', ring: '#2f6b63', glow: 'rgba(47,107,99,0.50)' },
  hidden:        { label: 'Hidden',                  hi: '#5b566f', lo: '#33304a', ring: '#4a4560', glow: 'rgba(74,69,96,0.40)' },
}

export const rarityRank = {
  common: 1, uncommon: 2, rare: 3, epic: 4, legendary: 5, mythic: 6, administrator: 7, hidden: 8,
}

export const rarityOf = (id) => RARITY[id] || RARITY.common

// Legendary+ get the shimmering sweep; commoner tiers stay calm.
export const isRadiant = (id) => rarityRank[id] >= 5
