// One icon set, one grid, one stroke weight.
//
// The app had thirty inline SVGs spread across twenty files, drawn at stroke
// widths of 1.4, 1.7, 1.8 and 2.4 — so two icons sitting next to each other in
// the same row could read as different weights of the same family. These are
// all 24×24, stroke 1.8, round caps and joins, and they inherit `currentColor`
// so a parent's hover or disabled state carries through without a prop.
//
// Deliberately hand-drawn rather than pulled from an icon library: the project
// ships no UI dependencies, and a recognisable third-party icon set is the
// fastest way to make a crafted interface look generated.

const BASE = {
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.8,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  'aria-hidden': 'true',
  focusable: 'false',
}

// Icons are decorative by default. When one is the only content of a control,
// the control itself carries the aria-label — never the glyph.
function Svg({ size = 16, children, ...rest }) {
  return (
    <svg {...BASE} width={size} height={size} {...rest}>
      {children}
    </svg>
  )
}

export const CheckIcon = (p) => (
  <Svg {...p}><path d="M20 6L9 17l-5-5" /></Svg>
)

export const AlertIcon = (p) => (
  <Svg {...p}><circle cx="12" cy="12" r="9" /><path d="M12 8v5M12 16.5v.01" /></Svg>
)

export const InfoIcon = (p) => (
  <Svg {...p}><circle cx="12" cy="12" r="9" /><path d="M12 11v5M12 7.5v.01" /></Svg>
)

export const CloseIcon = (p) => (
  <Svg {...p}><path d="M6 6l12 12M18 6L6 18" /></Svg>
)

export const CaretIcon = ({ open, ...p }) => (
  <Svg
    {...p}
    style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform var(--dur-2) var(--ease-out)' }}
  >
    <path d="M6 9l6 6 6-6" />
  </Svg>
)

export const SearchIcon = (p) => (
  <Svg {...p}><circle cx="11" cy="11" r="7" /><path d="M20 20l-3.5-3.5" /></Svg>
)

export const ChevronLeftIcon = (p) => (
  <Svg {...p}><path d="M15 18l-6-6 6-6" /></Svg>
)

export const ChevronRightIcon = (p) => (
  <Svg {...p}><path d="M9 6l6 6-6 6" /></Svg>
)

// Sort state is drawn, not coloured: both arrows dim when unsorted, and the
// active direction is the one that stays lit.
export const SortIcon = ({ dir, size = 12, ...p }) => (
  <Svg size={size} {...p}>
    <path d="M12 4l4 5H8l4-5z" fill={dir === 'asc' ? 'currentColor' : 'none'} opacity={dir === 'asc' ? 1 : 0.35} />
    <path d="M12 20l-4-5h8l-4 5z" fill={dir === 'desc' ? 'currentColor' : 'none'} opacity={dir === 'desc' ? 1 : 0.35} />
  </Svg>
)

export const TrashIcon = (p) => (
  <Svg {...p}><path d="M4 7h16M10 7V5a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v2M6 7l1 13h10l1-13" /></Svg>
)

export const EyeIcon = (p) => (
  <Svg {...p}><path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6-10-6-10-6z" /><circle cx="12" cy="12" r="2.5" /></Svg>
)

export const EyeOffIcon = (p) => (
  <Svg {...p}><path d="M4 4l16 16" /><path d="M9.9 5.2A9.6 9.6 0 0 1 12 5c6.5 0 10 6 10 6a17 17 0 0 1-3.4 4M6.5 7.6A17 17 0 0 0 2 11s3.5 6 10 6a9.7 9.7 0 0 0 3.6-.7" /></Svg>
)

export const StarIcon = (p) => (
  <Svg {...p}><path d="M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8-5.2-2.7-5.2 2.7 1-5.8L3.5 9.7l5.9-.9L12 3.5z" /></Svg>
)

export const QuillIcon = (p) => (
  <Svg {...p}><path d="M20 4c-6 1-10 5-12 11" /><path d="M8 15c4-1 7-4 9-8" /><path d="M4 20c1-3 2-4 4-5" /></Svg>
)

export default Svg
