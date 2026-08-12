import { useCallback, useEffect, useId, useRef } from 'react'

// A modal that actually holds focus.
//
// The previous dialog handled Escape, outside-click and initial focus, which is
// most of the way there — but Tab still walked straight out of it into the page
// behind, the page kept scrolling under the backdrop, and focus never came back
// to the control that opened it. Those three are what separate a styled overlay
// from a real dialog.

const FOCUSABLE = [
  'a[href]', 'button:not([disabled])', 'input:not([disabled])',
  'textarea:not([disabled])', 'select:not([disabled])', '[tabindex]:not([tabindex="-1"])',
].join(',')

export default function Modal({
  open,
  onClose,
  title,
  size = 'sm',
  closeOnBackdrop = true,
  busy = false,
  children,
  actions,
}) {
  const panelRef = useRef(null)
  const restoreRef = useRef(null)
  const titleId = useId()

  // Remember whoever had focus so it can be handed back on close. Without this
  // a keyboard user is dumped at the top of the document every time.
  useEffect(() => {
    if (!open) return
    restoreRef.current = document.activeElement
    return () => {
      const el = restoreRef.current
      if (el && typeof el.focus === 'function') el.focus()
    }
  }, [open])

  // Lock the page behind the modal, preserving the scrollbar's width so the
  // layout doesn't jump sideways as it disappears.
  useEffect(() => {
    if (!open) return
    const { body, documentElement } = document
    const prev = body.style.overflow
    const gap = window.innerWidth - documentElement.clientWidth
    const prevPad = body.style.paddingRight
    body.style.overflow = 'hidden'
    if (gap > 0) body.style.paddingRight = `${gap}px`
    return () => { body.style.overflow = prev; body.style.paddingRight = prevPad }
  }, [open])

  // Move focus in, then keep it in: Tab off either end wraps to the other.
  useEffect(() => {
    if (!open) return
    const panel = panelRef.current
    if (!panel) return

    const first = panel.querySelector(FOCUSABLE)
    ;(first || panel).focus()

    const onKey = (e) => {
      if (e.key === 'Escape' && !busy) { onClose?.(); return }
      if (e.key !== 'Tab') return
      const items = [...panel.querySelectorAll(FOCUSABLE)].filter((el) => el.offsetParent !== null)
      if (items.length === 0) { e.preventDefault(); return }
      const firstEl = items[0]
      const lastEl = items[items.length - 1]
      if (e.shiftKey && document.activeElement === firstEl) {
        e.preventDefault(); lastEl.focus()
      } else if (!e.shiftKey && document.activeElement === lastEl) {
        e.preventDefault(); firstEl.focus()
      }
    }

    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, busy, onClose])

  const onBackdrop = useCallback((e) => {
    if (!closeOnBackdrop || busy) return
    if (e.target === e.currentTarget) onClose?.()
  }, [closeOnBackdrop, busy, onClose])

  if (!open) return null

  return (
    <div className="ct-modal-backdrop" onMouseDown={onBackdrop}>
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
        tabIndex={-1}
        className={`ct-modal ct-modal--${size}`}
      >
        {title && <h2 id={titleId} className="ct-modal__title">{title}</h2>}
        {children}
        {actions && <div className="ct-modal__actions">{actions}</div>}
      </div>
    </div>
  )
}
