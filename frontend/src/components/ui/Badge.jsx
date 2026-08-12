// A status marker.
//
// `tone` covers the semantic set (gold, success, warning, danger, info,
// neutral). `genre` is separate because genre isn't a status — it's a taxonomy,
// and it needs its own palette that re-themes with the page.

const GENRES = ['fantasy', 'mystery', 'sci_fi', 'romance', 'horror', 'thriller', 'literary']

// Genre labels are written out rather than derived, so "sci_fi" never reaches a
// reader as "sci fi" and a new genre can't slip through with an ugly default.
export const GENRE_LABELS = {
  fantasy: 'Fantasy',
  mystery: 'Mystery',
  sci_fi: 'Sci-Fi',
  romance: 'Romance',
  horror: 'Horror',
  thriller: 'Thriller',
  literary: 'Literary',
}

// Four files had each grown their own copy of this one-liner. One copy now.
export const genreLabel = (g) => GENRE_LABELS[g] || (g ? g.charAt(0).toUpperCase() + g.slice(1) : 'Story')

export default function Badge({ tone = 'neutral', className = '', children, ...rest }) {
  return (
    <span className={`ct-badge ct-badge--${tone} ${className}`} {...rest}>
      {children}
    </span>
  )
}

// The genre chip that used to be hardcoded hex in StoryCard. It now points the
// shared --genre variable at the right token set and lets the stylesheet derive
// text, fill and border from that one value — which is what makes it re-theme.
export function GenreBadge({ genre, className = '', ...rest }) {
  const known = GENRES.includes(genre)
  const style = known ? { '--genre': `var(--genre-${genre}-rgb)` } : undefined

  return (
    <span
      className={`ct-badge ${known ? 'ct-badge--genre' : 'ct-badge--gold'} ${className}`}
      style={style}
      {...rest}
    >
      {known ? GENRE_LABELS[genre] : 'Story'}
    </span>
  )
}
