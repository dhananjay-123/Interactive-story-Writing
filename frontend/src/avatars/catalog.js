// Built-in avatars — a curated set of hand-drawn story motifs rendered as inline
// SVG. Everything here is original line art (no third-party assets, no external
// requests), so it's free to use and ships with the app. A chosen avatar is
// stored on the user as the token `avatar:<id>`; `avatarSrc` turns that token
// into a self-contained data URI that drops into any <img src>.

const BG = {
  ink: '#232338',
  plum: '#2c2440',
  pine: '#1e332c',
  wine: '#3a2231',
  teal: '#1d3138',
  umber: '#322a1d',
  slate: '#2a2f3c',
  aubergine: '#2f2038',
}

const GOLD = '#c9a84c'
const PARCH = '#ece4cf'

// Each glyph is inner SVG markup drawn on a 100×100 canvas. The token `FG` is
// swapped for the foreground colour at build time so filled accents (dots) match
// the stroke.
const AVATARS = [
  { id: 'quill', label: 'Quill', bg: BG.ink, fg: GOLD,
    glyph: `<path d="M30 72 C40 44 58 28 74 28 C74 46 58 66 40 68 Z"/><path d="M35 67 L72 30"/><path d="M46 55 L58 51 M41 63 L53 45"/>` },
  { id: 'book', label: 'Open book', bg: BG.wine, fg: PARCH,
    glyph: `<path d="M50 36 C43 30 31 29 24 32 L24 68 C31 65 43 66 50 72 C57 66 69 65 76 68 L76 32 C69 29 57 30 50 36 Z"/><path d="M50 36 L50 72"/>` },
  { id: 'moon', label: 'Crescent', bg: BG.aubergine, fg: GOLD,
    glyph: `<path d="M63 24 A28 28 0 1 0 63 76 A22 22 0 1 1 63 24 Z"/>` },
  { id: 'star', label: 'North star', bg: BG.slate, fg: GOLD,
    glyph: `<path d="M50 20 C53 40 60 47 80 50 C60 53 53 60 50 80 C47 60 40 53 20 50 C40 47 47 40 50 20 Z"/>` },
  { id: 'inkdrop', label: 'Ink drop', bg: BG.teal, fg: PARCH,
    glyph: `<path d="M50 22 C50 22 33 46 33 60 A17 17 0 0 0 67 60 C67 46 50 22 50 22 Z"/>` },
  { id: 'mountain', label: 'Mountains', bg: BG.pine, fg: PARCH,
    glyph: `<path d="M18 72 L38 42 L50 57 L64 36 L82 72 Z"/>` },
  { id: 'key', label: 'Key', bg: BG.umber, fg: GOLD,
    glyph: `<circle cx="40" cy="38" r="13"/><path d="M49 47 L70 68"/><path d="M60 58 L67 51 M54 52 L61 45"/>` },
  { id: 'leaf', label: 'Leaf', bg: BG.pine, fg: GOLD,
    glyph: `<path d="M32 68 C30 42 50 26 70 28 C72 52 52 70 32 68 Z"/><path d="M32 68 C44 58 58 46 66 34"/>` },
  { id: 'candle', label: 'Candle', bg: BG.ink, fg: GOLD,
    glyph: `<path d="M50 40 C45 34 47 26 50 22 C53 26 55 34 50 40 Z"/><line x1="50" y1="40" x2="50" y2="47"/><rect x="42" y="47" width="16" height="27" rx="2"/>` },
  { id: 'compass', label: 'Compass', bg: BG.slate, fg: GOLD,
    glyph: `<circle cx="50" cy="50" r="27"/><path d="M50 30 L57 50 L50 70 L43 50 Z"/><circle cx="50" cy="50" r="2.5" fill="FG"/>` },
  { id: 'anchor', label: 'Anchor', bg: BG.teal, fg: PARCH,
    glyph: `<circle cx="50" cy="28" r="6"/><line x1="50" y1="34" x2="50" y2="74"/><line x1="38" y1="44" x2="62" y2="44"/><path d="M28 56 A22 22 0 0 0 72 56"/><path d="M28 56 L27 49 M28 56 L35 58 M72 56 L73 49 M72 56 L65 58"/>` },
  { id: 'eye', label: 'Eye', bg: BG.aubergine, fg: PARCH,
    glyph: `<path d="M22 50 Q50 28 78 50 Q50 72 22 50 Z"/><circle cx="50" cy="50" r="10"/>` },
  { id: 'sun', label: 'Sun', bg: BG.umber, fg: GOLD,
    glyph: `<circle cx="50" cy="50" r="13"/><line x1="50" y1="22" x2="50" y2="30"/><line x1="50" y1="70" x2="50" y2="78"/><line x1="22" y1="50" x2="30" y2="50"/><line x1="70" y1="50" x2="78" y2="50"/><line x1="31" y1="31" x2="37" y2="37"/><line x1="63" y1="63" x2="69" y2="69"/><line x1="69" y1="31" x2="63" y2="37"/><line x1="37" y1="63" x2="31" y2="69"/>` },
  { id: 'hourglass', label: 'Hourglass', bg: BG.wine, fg: GOLD,
    glyph: `<path d="M34 26 L66 26 L52 50 L66 74 L34 74 L48 50 Z"/><line x1="30" y1="26" x2="70" y2="26"/><line x1="30" y1="74" x2="70" y2="74"/>` },
  { id: 'gulls', label: 'Gulls', bg: BG.teal, fg: PARCH,
    glyph: `<path d="M22 50 Q37 36 50 50 Q63 36 78 50"/><path d="M34 62 Q42 54 50 62 Q58 54 66 62"/>` },
  { id: 'lantern', label: 'Lantern', bg: BG.ink, fg: GOLD,
    glyph: `<rect x="38" y="36" width="24" height="32" rx="3"/><path d="M43 36 L45 30 L55 30 L57 36"/><line x1="50" y1="30" x2="50" y2="24"/><path d="M46 24 A4 4 0 0 1 54 24"/><line x1="44" y1="44" x2="44" y2="60"/><line x1="56" y1="44" x2="56" y2="60"/>` },
  { id: 'mask', label: 'Mask', bg: BG.plum, fg: PARCH,
    glyph: `<path d="M32 32 Q50 28 68 32 Q68 58 50 70 Q32 58 32 32 Z"/><path d="M40 44 Q44 40 48 44 M52 44 Q56 40 60 44"/><path d="M42 55 Q50 62 58 55"/>` },
  { id: 'rose', label: 'Rose', bg: BG.wine, fg: GOLD,
    glyph: `<circle cx="50" cy="44" r="15"/><path d="M43 44 a7 7 0 1 1 5 6 a4 4 0 1 1 -1 -8"/><path d="M42 57 L34 70 M57 55 L66 66"/>` },
  { id: 'waves', label: 'Waves', bg: BG.slate, fg: GOLD,
    glyph: `<path d="M18 46 q8 -12 16 0 t16 0 t16 0 t16 0"/><path d="M18 60 q8 -12 16 0 t16 0 t16 0 t16 0"/>` },
  { id: 'constellation', label: 'Constellation', bg: BG.aubergine, fg: GOLD,
    glyph: `<path d="M30 34 L52 28 L68 46 L46 54 L60 70 M46 54 L30 34"/><circle cx="30" cy="34" r="3" fill="FG" stroke="none"/><circle cx="52" cy="28" r="3" fill="FG" stroke="none"/><circle cx="68" cy="46" r="3" fill="FG" stroke="none"/><circle cx="46" cy="54" r="3" fill="FG" stroke="none"/><circle cx="60" cy="70" r="3" fill="FG" stroke="none"/>` },
]

const buildSvg = (a) => {
  const glyph = a.glyph.split('FG').join(a.fg)
  return (
    `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'>` +
    `<rect width='100' height='100' fill='${a.bg}'/>` +
    `<g fill='none' stroke='${a.fg}' stroke-width='5' stroke-linecap='round' stroke-linejoin='round'>${glyph}</g>` +
    `</svg>`
  )
}

const toDataUri = (a) =>
  `data:image/svg+xml,${encodeURIComponent(buildSvg(a))}`

const byId = new Map(AVATARS.map((a) => [a.id, a]))
const uriCache = new Map()

const uriFor = (a) => {
  if (!uriCache.has(a.id)) uriCache.set(a.id, toDataUri(a))
  return uriCache.get(a.id)
}

// Stable hash so an unknown token always maps to a real avatar rather than a
// broken image (defensive — the picker only ever emits known ids).
const pickFallback = (seed) => {
  let h = 0
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) | 0
  return AVATARS[Math.abs(h) % AVATARS.length]
}

export const AVATAR_PREFIX = 'avatar:'

export const isBuiltInAvatar = (value) =>
  typeof value === 'string' && value.startsWith(AVATAR_PREFIX)

// The one function every render site uses: token → data URI, real URL → itself,
// empty → null (so the initial-letter fallback shows).
export function avatarSrc(value) {
  if (!value) return null
  if (isBuiltInAvatar(value)) {
    const id = value.slice(AVATAR_PREFIX.length)
    return uriFor(byId.get(id) || pickFallback(id))
  }
  return value
}

// The gallery shown in the picker.
export const PICKABLE_AVATARS = AVATARS.map((a) => ({
  id: a.id,
  label: a.label,
  token: `${AVATAR_PREFIX}${a.id}`,
  src: uriFor(a),
}))
