import { useState } from 'react'
import api from '../api/client'
import { useAuth } from '../context/AuthContext'
import { inputStyle, labelStyle, focusBorder, blurBorder } from './authStyles'

const EMPTY = { currentPassword: '', newPassword: '', confirmPassword: '' }

// Owner-only: change your own password without leaving your profile.
export default function ChangePasswordPanel() {
  const { authenticate } = useAuth()
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState(EMPTY)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)
  const [saving, setSaving] = useState(false)

  const update = (field, value) => setForm((f) => ({ ...f, [field]: value }))

  const close = () => {
    setOpen(false)
    setForm(EMPTY)
    setError('')
    setDone(false)
  }

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    if (form.newPassword !== form.confirmPassword) {
      setError("The two new passwords don't match.")
      return
    }
    setSaving(true)
    try {
      const { data } = await api.put('/api/auth/me/password', {
        currentPassword: form.currentPassword,
        newPassword: form.newPassword,
      })
      // The server rotates the token; store it or the next request 401s.
      authenticate(data.token, data.user)
      setForm(EMPTY)
      setDone(true)
    } catch (err) {
      setError(err?.response?.data?.message || 'Could not change your password.')
    } finally {
      setSaving(false)
    }
  }

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} style={linkButton}>
        Change password
      </button>
    )
  }

  const filled = form.currentPassword && form.newPassword && form.confirmPassword

  return (
    <div className="animate-fadeUp" style={panel}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '18px' }}>
        <h3 className="font-story" style={{ fontSize: '17px', fontWeight: 400, color: 'var(--parchment)' }}>
          Change password
        </h3>
        <button onClick={close} style={linkButton}>Close</button>
      </div>

      {done ? (
        <p style={{ fontSize: '13px', color: 'var(--gold)' }}>
          Password updated. Other devices signed in as you have been signed out.
        </p>
      ) : (
        <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={labelStyle}>Current password</label>
            <input
              type="password"
              style={inputStyle}
              value={form.currentPassword}
              onChange={(e) => update('currentPassword', e.target.value)}
              onFocus={focusBorder}
              onBlur={blurBorder}
              autoComplete="current-password"
            />
          </div>
          <div>
            <label style={labelStyle}>New password</label>
            <input
              type="password"
              style={inputStyle}
              value={form.newPassword}
              onChange={(e) => update('newPassword', e.target.value)}
              onFocus={focusBorder}
              onBlur={blurBorder}
              autoComplete="new-password"
            />
          </div>
          <div>
            <label style={labelStyle}>Confirm new password</label>
            <input
              type="password"
              style={inputStyle}
              value={form.confirmPassword}
              onChange={(e) => update('confirmPassword', e.target.value)}
              onFocus={focusBorder}
              onBlur={blurBorder}
              autoComplete="new-password"
            />
          </div>

          {error && <p style={{ fontSize: '13px', color: 'var(--crimson)', margin: 0 }}>{error}</p>}

          <button type="submit" disabled={saving || !filled} style={submitStyle(saving || !filled)}>
            {saving ? 'Saving…' : 'Update password'}
          </button>
        </form>
      )}
    </div>
  )
}

const panel = {
  background: 'rgba(var(--panel-rgb),var(--pa02))',
  border: '1px solid rgba(var(--panel-rgb),var(--pa08))',
  borderRadius: '8px',
  padding: '22px',
  maxWidth: '420px',
}

const linkButton = {
  background: 'none',
  border: 'none',
  padding: 0,
  fontFamily: 'inherit',
  fontSize: '13px',
  color: 'rgba(var(--text-rgb),var(--ta45))',
  cursor: 'pointer',
  textDecoration: 'underline',
  textUnderlineOffset: '3px',
}

const submitStyle = (disabled) => ({
  padding: '12px 28px',
  background: 'var(--gold-solid)',
  color: 'var(--on-gold)',
  border: 'none',
  fontSize: '12px',
  fontWeight: 600,
  letterSpacing: '0.12em',
  textTransform: 'uppercase',
  cursor: disabled ? 'default' : 'pointer',
  borderRadius: '4px',
  opacity: disabled ? 0.5 : 1,
  fontFamily: 'inherit',
  alignSelf: 'flex-start',
})
