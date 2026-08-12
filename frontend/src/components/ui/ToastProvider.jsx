import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react'
import { AlertIcon, CheckIcon, CloseIcon, InfoIcon } from './Icon'

// Non-blocking confirmation.
//
// The app could tell you when something went wrong — inline, next to the field —
// but it had no way to tell you when something went right. Saving a story,
// posting a comment, adding a collaborator: all silent, or announced by an OS
// alert box. Two components had grown private toast implementations of their
// own (achievements, the clue whisper), which is the usual sign that a shared
// one is overdue.
//
// Rules this follows:
//  • A toast is never the only copy of an error. Field-level validation stays
//    where it is; a toast is a receipt, not a diagnosis.
//  • Anything destructive offers `undo` rather than a second confirmation.
//  • The stack is a live region, so a sighted-mouse confirmation is also spoken.
//  • Timers pause on hover and on focus — a toast should not expire while it is
//    being read, or while a keyboard user is tabbing to its action.

const ToastContext = createContext(null)

const DEFAULT_MS = 5000
const ICONS = { success: CheckIcon, error: AlertIcon, info: InfoIcon }

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])
  const timers = useRef(new Map())

  const dismiss = useCallback((id) => {
    const timer = timers.current.get(id)
    if (timer) { clearTimeout(timer.handle); timers.current.delete(id) }
    // Mark it leaving first so the exit animation can run, then drop it.
    setToasts((list) => list.map((t) => (t.id === id ? { ...t, leaving: true } : t)))
    setTimeout(() => setToasts((list) => list.filter((t) => t.id !== id)), 200)
  }, [])

  const startTimer = useCallback((id, ms) => {
    if (ms === 0) return
    const handle = setTimeout(() => dismiss(id), ms)
    timers.current.set(id, { handle, ms, startedAt: Date.now() })
  }, [dismiss])

  const push = useCallback((message, options = {}) => {
    const { tone = 'info', duration = DEFAULT_MS, action, actionLabel = 'Undo' } = options
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
    setToasts((list) => {
      // Cap the stack. Four is already more than anyone reads; older ones go.
      const next = [...list, { id, message, tone, action, actionLabel }]
      return next.length > 4 ? next.slice(next.length - 4) : next
    })
    startTimer(id, duration)
    return id
  }, [startTimer])

  const pause = useCallback((id) => {
    const timer = timers.current.get(id)
    if (!timer) return
    clearTimeout(timer.handle)
    timers.current.set(id, { ...timer, remaining: timer.ms - (Date.now() - timer.startedAt) })
  }, [])

  const resume = useCallback((id) => {
    const timer = timers.current.get(id)
    if (!timer || timer.remaining == null) return
    const handle = setTimeout(() => dismiss(id), Math.max(timer.remaining, 800))
    timers.current.set(id, { ...timer, handle, startedAt: Date.now(), ms: timer.remaining })
  }, [dismiss])

  const api = useMemo(() => ({
    toast: push,
    success: (msg, opts) => push(msg, { ...opts, tone: 'success' }),
    error: (msg, opts) => push(msg, { ...opts, tone: 'error', duration: opts?.duration ?? 7000 }),
    info: (msg, opts) => push(msg, { ...opts, tone: 'info' }),
    dismiss,
  }), [push, dismiss])

  return (
    <ToastContext.Provider value={api}>
      {children}
      {/* aria-live="polite" waits for a pause rather than cutting across whatever
          the reader is in the middle of. Errors are announced the same way,
          because their authoritative copy is already inline on the field. */}
      <div className="ct-toast-stack" role="status" aria-live="polite" aria-atomic="false">
        {toasts.map((t) => {
          const Icon = ICONS[t.tone] || InfoIcon
          return (
            <div
              key={t.id}
              className={`ct-toast ct-toast--${t.tone}${t.leaving ? ' ct-toast--leaving' : ''}`}
              onMouseEnter={() => pause(t.id)}
              onMouseLeave={() => resume(t.id)}
              onFocusCapture={() => pause(t.id)}
              onBlurCapture={() => resume(t.id)}
            >
              <span className="ct-toast__icon"><Icon size={16} /></span>
              <div className="ct-toast__body">
                <p className="ct-toast__msg">{t.message}</p>
                {t.action && (
                  <button
                    type="button"
                    className="ct-toast__action"
                    onClick={() => { t.action(); dismiss(t.id) }}
                  >
                    {t.actionLabel}
                  </button>
                )}
              </div>
              <button
                type="button"
                className="ct-toast__close tap-target"
                onClick={() => dismiss(t.id)}
                aria-label="Dismiss notification"
              >
                <CloseIcon size={14} />
              </button>
            </div>
          )
        })}
      </div>
    </ToastContext.Provider>
  )
}

// Returns a no-op shaped like the real thing when no provider is mounted, so a
// component pulled into a test or a story doesn't explode on a missing context.
const NOOP = { toast: () => {}, success: () => {}, error: () => {}, info: () => {}, dismiss: () => {} }

export function useToast() {
  return useContext(ToastContext) || NOOP
}
