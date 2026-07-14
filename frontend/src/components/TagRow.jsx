import { useNavigate } from 'react-router-dom'

// A row of clickable tag chips. Clicking a tag jumps to the library filtered
// by it. Pass `onSelect` to override (e.g. filter in place on the list page).
export function TagRow({ tags, onSelect, size = 'sm', style }) {
  const navigate = useNavigate()
  if (!tags || tags.length === 0) return null

  const go = (tag, e) => {
    e.preventDefault()
    e.stopPropagation()
    if (onSelect) onSelect(tag)
    else navigate(`/stories?tag=${encodeURIComponent(tag)}`)
  }

  const pad = size === 'sm' ? '3px 9px' : '5px 12px'
  const fs = size === 'sm' ? '11px' : '12px'

  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', ...style }}>
      {tags.map((tag) => (
        <button
          key={tag}
          onClick={(e) => go(tag, e)}
          style={{
            padding: pad,
            fontSize: fs,
            letterSpacing: '0.03em',
            border: '1px solid rgba(var(--panel-rgb),var(--pa10))',
            background: 'rgba(var(--panel-rgb),var(--pa04))',
            color: 'rgba(var(--text-rgb),var(--ta55))',
            borderRadius: '4px',
            cursor: 'pointer',
            fontFamily: 'inherit',
            transition: 'all 0.2s ease',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'rgba(var(--gold-rgb),0.4)'; e.currentTarget.style.color = 'var(--gold)' }}
          onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'rgba(var(--panel-rgb),var(--pa10))'; e.currentTarget.style.color = 'rgba(var(--text-rgb),var(--ta55))' }}
        >
          #{tag}
        </button>
      ))}
    </div>
  )
}

export default TagRow
