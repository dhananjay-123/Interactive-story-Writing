// Every badge glyph, drawn by hand as simple SVG line-art in a 24×24 grid. No
// icon pack, no external assets — just original paths rendered in currentColor so
// each one inherits the medallion's ink/parchment tone. Add a badge shape by
// adding one case here.

const S = {
  quill: (
    <g fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 20c6-1 8-3 12-9 2-3 3-6 3-8-3 1-6 2-9 4-5 4-6 8-6 13z" />
      <path d="M8 16l5-5" /><path d="M4 20l4-1" />
    </g>
  ),
  scroll: (
    <g fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M7 4h10a2 2 0 0 1 2 2v11a3 3 0 0 1-3 3H8" />
      <path d="M7 4a2 2 0 0 0-2 2v0a2 2 0 0 0 2 2h3" />
      <path d="M17 20a3 3 0 0 0 3-3v0a2 2 0 0 0-2-2h-4" />
      <path d="M9 9h6M9 12h6" />
    </g>
  ),
  book: (
    <g fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 6c-1.5-1.2-4-2-7-2v13c3 0 5.5.8 7 2" />
      <path d="M12 6c1.5-1.2 4-2 7-2v13c-3 0-5.5.8-7 2z" />
      <path d="M12 6v13" />
    </g>
  ),
  trophy: (
    <g fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M8 4h8v5a4 4 0 0 1-8 0z" />
      <path d="M8 5H5v2a3 3 0 0 0 3 3M16 5h3v2a3 3 0 0 1-3 3" />
      <path d="M12 13v3M9 20h6M10 20l.5-4h3l.5 4" />
    </g>
  ),
  heart: (
    <path fill="currentColor" d="M12 20s-6.5-4.2-8.5-8C2 9 3.2 5.8 6.3 5.8c1.8 0 3 1 3.7 2.2.7-1.2 1.9-2.2 3.7-2.2 3.1 0 4.3 3.2 2.8 6.2-2 3.8-8.5 8-8.5 8z" transform="translate(0 -1)" />
  ),
  star: (
    <path fill="currentColor" d="M12 3l2.5 5.5 6 .7-4.5 4 1.3 5.9L12 21l-5.3 3.1 1.3-5.9-4.5-4 6-.7z" transform="scale(0.92) translate(1 0)" />
  ),
  gem: (
    <g fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round">
      <path d="M6 5h12l3 5-9 10-9-10z" />
      <path d="M3 10h18M9 5l-3 5 6 10M15 5l3 5-6 10" />
    </g>
  ),
  map: (
    <g fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 4L3.5 6v14L9 18l6 2 5.5-2V4L15 6z" />
      <path d="M9 4v14M15 6v14" />
    </g>
  ),
  compass: (
    <g fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9" />
      <path d="M15.5 8.5l-2 5-5 2 2-5z" fill="currentColor" stroke="none" />
      <circle cx="12" cy="12" r="0.6" fill="currentColor" />
    </g>
  ),
  key: (
    <g fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="8" cy="8" r="4" />
      <path d="M11 11l8 8M16 16l2-2M18 18l2-2" />
    </g>
  ),
  globe: (
    <g fill="none" stroke="currentColor" strokeWidth="1.4">
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18" />
    </g>
  ),
  chat: (
    <g fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H9l-4 4v-4H6a2 2 0 0 1-2-2z" />
      <path d="M8 9h8M8 12h5" />
    </g>
  ),
  people: (
    <g fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="9" cy="8" r="3" /><path d="M4 19c0-3 2.5-5 5-5s5 2 5 5" />
      <path d="M16 6a3 3 0 0 1 0 6M15 14c3 0 5 2 5 5" />
    </g>
  ),
  ribbon: (
    <g fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="9" r="5" />
      <path d="M9.5 13.5L8 21l4-2.5L16 21l-1.5-7.5" />
    </g>
  ),
  sparkle: (
    <path fill="currentColor" d="M12 2c.6 4.4 2.6 6.4 7 7-4.4.6-6.4 2.6-7 7-.6-4.4-2.6-6.4-7-7 4.4-.6 6.4-2.6 7-7z" transform="translate(0 1) scale(0.95) translate(0.6 0)" />
  ),
  phoenix: (
    <g fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 21c-1-3-1-6 0-9 1 3 1 6 0 9z" fill="currentColor" stroke="none" />
      <path d="M12 12c-2-2-5-2-8-1 2 2 4 3 6 3M12 12c2-2 5-2 8-1-2 2-4 3-6 3" />
      <path d="M12 12c-1-2-1-5 0-7 1 2 1 5 0 7z" fill="currentColor" stroke="none" />
    </g>
  ),
  leaf: (
    <g fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 19c0-8 6-14 14-14 0 8-6 14-14 14z" />
      <path d="M5 19C9 15 13 11 17 9" />
    </g>
  ),
  flame: (
    <path fill="currentColor" d="M13 2c.5 3-1.5 4.5-3 6.5S7 13 8 16c-2-1-3-3-3-5 0 0-1 1-1 3a6 6 0 0 0 12 0c0-3-2-5-3.5-7C11 5 12.5 3.5 13 2z" transform="translate(0 1) scale(0.92) translate(1 0)" />
  ),
  chalice: (
    <g fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 4h12l-1 5a5 5 0 0 1-10 0z" />
      <path d="M12 14v4M8 20h8M9 4c.5 2 1.5 3 3 3s2.5-1 3-3" />
    </g>
  ),
  infinity: (
    <g fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
      <path d="M8 12c0-2 4-2 4 0s4 2 4 0-4-2-4 0-4 2-4 0z" transform="scale(1.4) translate(-3.4 -3.5)" />
    </g>
  ),
  bookmark: (
    <g fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M7 3h10v18l-5-4-5 4z" />
    </g>
  ),
  sun: (
    <g fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2 2M17.1 17.1l2 2M19.1 4.9l-2 2M6.9 17.1l-2 2" />
    </g>
  ),
  moon: (
    <path fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" d="M20 13a8 8 0 1 1-9-9 6.5 6.5 0 0 0 9 9z" />
  ),
  diamond: (
    <g fill="currentColor">
      <path d="M12 3l7 7-7 11-7-11z" transform="scale(0.94) translate(0.8 0.4)" />
    </g>
  ),
  shield: (
    <g fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3l7 2.5v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9v-6z" />
      <path d="M9 12l2 2 4-4" />
    </g>
  ),
  crown: (
    <g fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 8l3 8h10l3-8-5 3-3-5-3 5z" />
      <path d="M6 19h12" />
    </g>
  ),
  eye: (
    <g fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6-10-6-10-6z" />
      <circle cx="12" cy="12" r="2.5" />
    </g>
  ),
  seedling: (
    <g fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 20v-7" />
      <path d="M12 13c0-3-2-5-6-5 0 3 2 5 6 5z" />
      <path d="M12 13c0-3 2-5 6-5 0 3-2 5-6 5z" />
    </g>
  ),
  lock: (
    <g fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="5" y="10" width="14" height="10" rx="2" />
      <path d="M8 10V7a4 4 0 0 1 8 0v3M12 14v2" />
    </g>
  ),
}

export default function BadgeIcon({ shape, size = 26, className }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} aria-hidden="true">
      {S[shape] || S.star}
    </svg>
  )
}
