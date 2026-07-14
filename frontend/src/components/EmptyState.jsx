import { Link } from 'react-router-dom'

// One consistent empty state across the app: a quiet serif line, an optional
// sub-line, and an optional action — so the library, the shelf and the boards
// all speak with the same voice instead of three different bare paragraphs.
export default function EmptyState({ title, hint, actionLabel, actionTo, onAction }) {
  return (
    <div
      className="animate-fadeUp"
      style={{ padding: '64px 24px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '14px' }}
    >
      <QuillMark />
      <p className="font-story" style={{ fontSize: '20px', color: 'rgba(var(--text-rgb),var(--ta60))', fontStyle: 'italic', margin: 0, lineHeight: 1.4 }}>
        {title}
      </p>
      {hint && (
        <p style={{ fontSize: '14px', color: 'rgba(var(--text-rgb),var(--ta45))', margin: 0, maxWidth: '340px', lineHeight: 1.6 }}>
          {hint}
        </p>
      )}
      {actionLabel && (actionTo || onAction) && (
        <div style={{ marginTop: '8px' }}>
          {actionTo ? (
            <Link to={actionTo} style={actionStyle}>{actionLabel}</Link>
          ) : (
            <button type="button" onClick={onAction} style={{ ...actionStyle, cursor: 'pointer' }}>{actionLabel}</button>
          )}
        </div>
      )}
    </div>
  )
}

const actionStyle = {
  display: 'inline-block',
  padding: '11px 24px',
  background: 'var(--gold-solid)',
  color: 'var(--on-gold)',
  textDecoration: 'none',
  fontSize: '12px',
  fontWeight: 600,
  letterSpacing: '0.1em',
  textTransform: 'uppercase',
  borderRadius: 'var(--r-sm)',
  border: 'none',
  fontFamily: 'inherit',
}

function QuillMark() {
  return (
    <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="rgba(var(--gold-rgb),0.5)" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M20 4c-6 1-10 5-12 11" />
      <path d="M8 15c4-1 7-4 9-8" />
      <path d="M4 20c1-3 2-4 4-5" />
    </svg>
  )
}
