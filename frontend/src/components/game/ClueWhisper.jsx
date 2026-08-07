import { useEffect, useState } from 'react'

// What "a clue was noted" looks like: one line, in the margin under the prose,
// that fades away on its own. No toast, no modal, no sound, nothing to dismiss —
// the reader's eyes stay where they were.
export default function ClueWhisper({ news, onDone }) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (!news) return
    setVisible(true)
    const t = setTimeout(() => {
      setVisible(false)
      // Let the fade finish before the line is taken out of the tree.
      setTimeout(() => onDone?.(), 400)
    }, 5200)
    return () => clearTimeout(t)
  }, [news, onDone])

  if (!news?.clues?.length) return null

  const count = news.clues.length
  const first = news.clues[0]

  return (
    <p
      aria-live="polite"
      style={{
        display: 'flex',
        alignItems: 'baseline',
        gap: '10px',
        margin: '-28px 0 34px',
        fontSize: '12.5px',
        lineHeight: 1.6,
        color: 'rgba(var(--text-rgb),var(--ta50))',
        opacity: visible ? 1 : 0,
        transition: 'opacity 0.4s ease',
      }}
    >
      <span aria-hidden="true" style={{ color: 'var(--gold)', opacity: 0.7 }}>—</span>
      <span>
        <span className="font-story" style={{ fontStyle: 'italic', color: 'rgba(var(--text-rgb),var(--ta70))' }}>
          {first.label}
        </span>
        <span style={{ color: 'rgba(var(--text-rgb),var(--ta40))' }}>
          {count > 1 ? ` and ${count - 1} more, noted.` : ' — noted.'}
        </span>
      </span>
    </p>
  )
}
