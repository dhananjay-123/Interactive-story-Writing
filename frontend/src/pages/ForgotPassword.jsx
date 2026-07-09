import { useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../api/client'
import { inputStyle, labelStyle, focusBorder, blurBorder } from '../components/authStyles'

// There's no reset-by-email on Inkwell. A locked-out writer leaves a request and
// an admin sets them a new password by hand.
export default function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [note, setNote] = useState('')
  const [error, setError] = useState('')
  const [sent, setSent] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    setError('')
    try {
      await api.post('/api/auth/password-request', { email, note })
      setSent(true)
    } catch (err) {
      setError(err?.response?.data?.message || 'Could not send your request. Try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--ink)', paddingTop: '120px' }}>
      <div style={{ maxWidth: '440px', margin: '0 auto', padding: '0 24px 100px' }}>
        <div className="animate-fadeUp mb-10">
          <p style={{ fontSize: '10px', letterSpacing: '0.25em', color: 'var(--gold)', textTransform: 'uppercase', marginBottom: '12px', opacity: 0.7 }}>
            Locked out
          </p>
          <h1 className="font-story" style={{ fontSize: 'clamp(28px, 4vw, 40px)', fontWeight: 400, color: 'var(--parchment)', letterSpacing: '-0.01em' }}>
            Forgot your password
          </h1>
        </div>

        {sent ? (
          <div className="animate-fadeUp">
            <p style={{ fontSize: '15px', color: 'var(--parchment)', lineHeight: 1.7, marginBottom: '16px' }}>
              Your request is in. If that email belongs to an account, an admin will set a new
              password and pass it along to you.
            </p>
            <p style={{ fontSize: '13px', color: 'rgba(var(--text-rgb),var(--ta40))' }}>
              <Link to="/login" style={{ color: 'var(--gold)', textDecoration: 'none' }}>
                Back to sign in
              </Link>
            </p>
          </div>
        ) : (
          <>
            <p className="animate-fadeUp" style={{ fontSize: '14px', color: 'rgba(var(--text-rgb),var(--ta45))', lineHeight: 1.7, marginBottom: '28px' }}>
              We don't send reset emails. Leave your address and an admin will set you a new
              password, then get it to you the way you normally talk.
            </p>

            <form onSubmit={submit} className="animate-fadeUp delay-100" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div>
                <label style={labelStyle}>Email</label>
                <input
                  type="email"
                  style={inputStyle}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onFocus={focusBorder}
                  onBlur={blurBorder}
                  autoComplete="email"
                />
              </div>

              <div>
                <label style={labelStyle}>Anything the admin should know (optional)</label>
                <textarea
                  rows={3}
                  maxLength={500}
                  style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.6 }}
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  onFocus={focusBorder}
                  onBlur={blurBorder}
                  placeholder="How to reach you, which account it is…"
                />
              </div>

              {error && <p style={{ fontSize: '13px', color: 'var(--crimson)', margin: 0 }}>{error}</p>}

              <button
                type="submit"
                disabled={submitting || !email}
                style={{
                  padding: '13px 32px',
                  background: 'var(--gold)',
                  color: 'var(--on-gold)',
                  border: 'none',
                  fontSize: '12px',
                  fontWeight: 600,
                  letterSpacing: '0.12em',
                  textTransform: 'uppercase',
                  cursor: submitting ? 'default' : 'pointer',
                  borderRadius: '3px',
                  opacity: submitting || !email ? 0.5 : 1,
                  marginTop: '4px',
                  fontFamily: 'inherit',
                }}
              >
                {submitting ? 'Sending…' : 'Request a reset'}
              </button>
            </form>

            <p style={{ fontSize: '13px', color: 'rgba(var(--text-rgb),var(--ta40))', marginTop: '28px' }}>
              Remembered it?{' '}
              <Link to="/login" style={{ color: 'var(--gold)', textDecoration: 'none' }}>
                Sign in
              </Link>
            </p>
          </>
        )}
      </div>
    </div>
  )
}
