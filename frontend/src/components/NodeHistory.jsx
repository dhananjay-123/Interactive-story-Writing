import { useEffect, useState } from 'react'
import api from '../api/client'

// Prior versions of a single passage. Collapsed until asked for, then it fetches
// the passage's snapshots and lets the author preview or restore any of them.
// Restoring reverts the prose + choice labels only (the tree stays linked).
export default function NodeHistory({ nodeId, onRestored }) {
  const [open, setOpen] = useState(false)
  const [items, setItems] = useState(null)
  const [error, setError] = useState('')
  const [preview, setPreview] = useState(null) // snapshotId being previewed
  const [busy, setBusy] = useState(null) // snapshotId being restored

  useEffect(() => {
    if (!open || items) return
    let cancelled = false
    api
      .get(`/api/nodes/${nodeId}/history`)
      .then(({ data }) => { if (!cancelled) setItems(data) })
      .catch(() => { if (!cancelled) setError('Could not load history.') })
    return () => { cancelled = true }
  }, [open, items, nodeId])

  const restore = async (snapshotId) => {
    setBusy(snapshotId)
    try {
      await api.post(`/api/nodes/${nodeId}/restore`, { snapshotId })
      onRestored?.()
    } catch {
      setError('Could not restore that version.')
      setBusy(null)
    }
  }

  return (
    <div style={{ marginTop: '18px', borderTop: '1px solid rgba(var(--panel-rgb),var(--pa08))', paddingTop: '14px' }}>
      <button
        onClick={() => setOpen((v) => !v)}
        style={{
          background: 'none',
          border: 'none',
          padding: 0,
          cursor: 'pointer',
          fontFamily: 'inherit',
          fontSize: '11px',
          letterSpacing: '0.14em',
          textTransform: 'uppercase',
          color: 'rgba(var(--text-rgb),var(--ta50))',
          display: 'inline-flex',
          alignItems: 'center',
          gap: '7px',
        }}
      >
        <span style={{ color: 'var(--gold)' }}>{open ? '▾' : '▸'}</span>
        Version history{items ? ` · ${items.length}` : ''}
      </button>

      {open && (
        <div className="animate-fadeIn" style={{ marginTop: '14px' }}>
          {error && <p style={{ fontSize: '12px', color: 'var(--crimson)' }}>{error}</p>}
          {!items && !error && (
            <p style={{ fontSize: '12px', color: 'rgba(var(--text-rgb),var(--ta40))' }}>Loading…</p>
          )}
          {items && items.length === 0 && (
            <p style={{ fontSize: '12.5px', color: 'rgba(var(--text-rgb),var(--ta45))', fontStyle: 'italic' }} className="font-story">
              No earlier versions yet — history starts the first time you save an edit.
            </p>
          )}
          {items && items.length > 0 && (
            <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {items.map((s) => (
                <li
                  key={s._id}
                  style={{
                    border: '1px solid rgba(var(--panel-rgb),var(--pa10))',
                    borderRadius: 'var(--r-sm)',
                    padding: '10px 12px',
                    background: 'rgba(var(--panel-rgb),var(--pa02))',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '10px' }}>
                    <span style={{ fontSize: '12px', color: 'rgba(var(--text-rgb),var(--ta65))' }}>
                      {when(s.createdAt)}
                      {s.editorName && <span style={{ color: 'rgba(var(--text-rgb),var(--ta40))' }}> · {s.editorName}</span>}
                    </span>
                    <span style={{ display: 'inline-flex', gap: '12px' }}>
                      <button onClick={() => setPreview(preview === s._id ? null : s._id)} style={miniLink}>
                        {preview === s._id ? 'hide' : 'preview'}
                      </button>
                      <button
                        onClick={() => restore(s._id)}
                        disabled={busy === s._id}
                        style={{ ...miniLink, color: 'var(--gold)' }}
                      >
                        {busy === s._id ? 'restoring…' : 'restore'}
                      </button>
                    </span>
                  </div>
                  {preview === s._id && (
                    <p className="font-story animate-fadeIn" style={{ fontSize: '13px', lineHeight: 1.6, color: 'rgba(var(--text-rgb),var(--ta70))', marginTop: '10px', whiteSpace: 'pre-wrap' }}>
                      {s.text?.trim() || '(an image or embed, no text)'}
                    </p>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}

const miniLink = {
  background: 'none',
  border: 'none',
  padding: 0,
  cursor: 'pointer',
  fontFamily: 'inherit',
  fontSize: '11px',
  letterSpacing: '0.06em',
  color: 'rgba(var(--text-rgb),var(--ta55))',
}

// Compact relative time — "3m ago", "2h ago", "Jun 20".
function when(iso) {
  const d = new Date(iso)
  const diff = (Date.now() - d.getTime()) / 1000
  if (diff < 60) return 'just now'
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}
