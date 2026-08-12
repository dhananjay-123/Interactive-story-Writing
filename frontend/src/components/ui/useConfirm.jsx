import { useCallback, useRef, useState } from 'react'
import ConfirmDialog from '../ConfirmDialog'

// Promise-shaped confirmation, so retiring a window.confirm is a one-line change.
//
// window.confirm blocks the thread and returns a boolean, which is exactly why
// it survived in ten places: any themed replacement meant restructuring the
// handler around a callback. This keeps the original shape —
//
//   if (!await confirm({ title: '…' })) return
//
// — while rendering a real modal with a focus trap. Drop {dialog} anywhere in
// the component's tree; it renders nothing until asked.

export default function useConfirm() {
  const [state, setState] = useState(null)
  const [busy, setBusy] = useState(false)
  const resolver = useRef(null)

  const confirm = useCallback((options) => {
    setState(typeof options === 'string' ? { message: options } : options)
    return new Promise((resolve) => { resolver.current = resolve })
  }, [])

  const settle = useCallback((answer) => {
    setState(null)
    setBusy(false)
    resolver.current?.(answer)
    resolver.current = null
  }, [])

  // The caller may hand back a promise (the delete request itself). Holding the
  // dialog open in its busy state until that settles means the reader never
  // watches a dialog close onto a list that hasn't changed yet.
  const onConfirm = useCallback(async () => {
    if (!state?.onConfirm) { settle(true); return }
    setBusy(true)
    try {
      await state.onConfirm()
      settle(true)
    } catch {
      settle(false)
    }
  }, [state, settle])

  const dialog = (
    <ConfirmDialog
      open={!!state}
      title={state?.title || 'Are you sure?'}
      message={state?.message}
      confirmLabel={state?.confirmLabel || 'Confirm'}
      cancelLabel={state?.cancelLabel || 'Cancel'}
      danger={state?.danger}
      busy={busy}
      onConfirm={onConfirm}
      onCancel={() => !busy && settle(false)}
    />
  )

  return { confirm, dialog }
}
