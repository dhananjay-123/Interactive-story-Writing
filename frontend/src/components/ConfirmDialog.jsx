import { useEffect, useRef } from 'react'

// A themed replacement for window.confirm — an ink-panel modal that keeps the
// crafted look on destructive actions instead of dropping to a raw OS dialog.
// Controlled: render it when `open` is true; call onConfirm / onCancel.
export default function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  danger = false,
  busy = false,
  onConfirm,
  onCancel,
}) {
  const confirmRef = useRef(null)

  // Escape to dismiss; move focus to the primary action on open.
  useEffect(() => {
    if (!open) return
    const onKey = (e) => { if (e.key === 'Escape' && !busy) onCancel?.() }
    window.addEventListener('keydown', onKey)
    confirmRef.current?.focus()
    return () => window.removeEventListener('keydown', onKey)
  }, [open, busy, onCancel])

  if (!open) return null

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      onClick={() => !busy && onCancel?.()}
      style={{
        position: 'fixed', inset: 0, zIndex: 300,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '24px',
        background: 'rgba(var(--shadow-rgb),0.55)',
        backdropFilter: 'blur(3px)',
      }}
    >
      <div
        className="animate-unlockPop"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%', maxWidth: '420px',
          background: 'var(--ink-soft)',
          border: '1px solid rgba(var(--gold-rgb),0.2)',
          borderRadius: 'var(--r-lg)',
          boxShadow: 'var(--card-shadow-hover)',
          padding: '28px',
        }}
      >
        <h2 className="font-story" style={{ fontSize: '22px', fontWeight: 400, color: 'var(--parchment)', margin: '0 0 12px' }}>
          {title}
        </h2>
        {message && (
          <p style={{ fontSize: '14.5px', color: 'rgba(var(--text-rgb),var(--ta65))', lineHeight: 1.6, margin: '0 0 24px' }}>
            {message}
          </p>
        )}
        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
          <button type="button" onClick={onCancel} disabled={busy} style={ghostBtn}>
            {cancelLabel}
          </button>
          <button
            ref={confirmRef}
            type="button"
            onClick={onConfirm}
            disabled={busy}
            style={{
              padding: '10px 22px',
              fontSize: '12px', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase',
              border: 'none', borderRadius: 'var(--r-sm)', fontFamily: 'inherit',
              cursor: busy ? 'default' : 'pointer', opacity: busy ? 0.6 : 1,
              background: danger ? 'var(--crimson)' : 'var(--gold-solid)',
              color: danger ? '#faf8f3' : 'var(--on-gold)',
            }}
          >
            {busy ? 'Working…' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

const ghostBtn = {
  padding: '10px 22px',
  fontSize: '12px', fontWeight: 500, letterSpacing: '0.1em', textTransform: 'uppercase',
  border: '1px solid rgba(var(--panel-rgb),var(--pa15))', borderRadius: 'var(--r-sm)',
  background: 'transparent', color: 'rgba(var(--text-rgb),var(--ta65))',
  fontFamily: 'inherit', cursor: 'pointer',
}
