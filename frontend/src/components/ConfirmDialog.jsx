import Modal from './ui/Modal'
import Button from './ui/Button'

// A themed replacement for window.confirm — an ink-panel modal that keeps the
// crafted look on destructive actions instead of dropping to a raw OS dialog.
// Controlled: render it when `open` is true; call onConfirm / onCancel.
//
// The dialog behaviour itself (focus trap, focus restore, scroll lock, Escape,
// backdrop dismissal) now lives in Modal, so every dialog in the app gets it
// rather than only this one. The props are unchanged — existing call sites did
// not have to move.

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
  return (
    <Modal
      open={open}
      onClose={onCancel}
      title={title}
      size="sm"
      busy={busy}
      actions={
        <>
          <Button variant="ghost" onClick={onCancel} disabled={busy}>
            {cancelLabel}
          </Button>
          <Button
            variant={danger ? 'danger-solid' : 'primary'}
            onClick={onConfirm}
            disabled={busy}
          >
            {busy ? 'Working…' : confirmLabel}
          </Button>
        </>
      }
    >
      {message && <p className="ct-modal__body">{message}</p>}
    </Modal>
  )
}
