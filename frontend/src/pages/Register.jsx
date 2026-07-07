import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { inputStyle, labelStyle, focusBorder, blurBorder } from '../components/authStyles'

export default function Register() {
  const { register } = useAuth()
  const navigate = useNavigate()

  const [form, setForm] = useState({
    displayName: '',
    username: '',
    email: '',
    password: '',
  })
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const update = (field, value) => setForm((f) => ({ ...f, [field]: value }))

  const valid =
    form.displayName.trim() &&
    /^[a-zA-Z0-9_]{3,20}$/.test(form.username) &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email) &&
    form.password.length >= 8

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    setError('')
    try {
      const user = await register(form)
      navigate(`/author/${user.username}`, { replace: true })
    } catch (err) {
      setError(err.response?.data?.message || 'Could not create your account. Please try again.')
      setSubmitting(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--ink)', paddingTop: '120px' }}>
      <div style={{ maxWidth: '400px', margin: '0 auto', padding: '0 24px 100px' }}>
        <div className="animate-fadeUp mb-10">
          <p style={{ fontSize: '10px', letterSpacing: '0.25em', color: 'var(--gold)', textTransform: 'uppercase', marginBottom: '12px', opacity: 0.7 }}>
            Join the guild
          </p>
          <h1 className="font-story" style={{ fontSize: 'clamp(28px, 4vw, 40px)', fontWeight: 400, color: 'var(--parchment)', letterSpacing: '-0.01em' }}>
            Create an account
          </h1>
        </div>

        <form onSubmit={handleSubmit} className="animate-fadeUp delay-100" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div>
            <label style={labelStyle}>Pen name</label>
            <input
              style={inputStyle}
              placeholder="How readers will see you"
              value={form.displayName}
              onChange={(e) => update('displayName', e.target.value)}
              onFocus={focusBorder}
              onBlur={blurBorder}
            />
          </div>

          <div>
            <label style={labelStyle}>Username</label>
            <input
              style={inputStyle}
              placeholder="3–20 letters, numbers, underscores"
              value={form.username}
              onChange={(e) => update('username', e.target.value.replace(/\s/g, ''))}
              onFocus={focusBorder}
              onBlur={blurBorder}
              autoComplete="username"
            />
          </div>

          <div>
            <label style={labelStyle}>Email</label>
            <input
              type="email"
              style={inputStyle}
              value={form.email}
              onChange={(e) => update('email', e.target.value)}
              onFocus={focusBorder}
              onBlur={blurBorder}
              autoComplete="email"
            />
          </div>

          <div>
            <label style={labelStyle}>Password</label>
            <input
              type="password"
              style={inputStyle}
              placeholder="At least 8 characters"
              value={form.password}
              onChange={(e) => update('password', e.target.value)}
              onFocus={focusBorder}
              onBlur={blurBorder}
              autoComplete="new-password"
            />
          </div>

          {error && <p style={{ fontSize: '13px', color: 'var(--crimson)', margin: 0 }}>{error}</p>}

          <button
            type="submit"
            disabled={submitting || !valid}
            style={{
              padding: '13px 32px',
              background: 'var(--gold)',
              color: 'var(--on-gold)',
              border: 'none',
              fontSize: '12px',
              fontWeight: 600,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              cursor: submitting || !valid ? 'default' : 'pointer',
              borderRadius: '3px',
              transition: 'background 0.2s ease',
              opacity: submitting || !valid ? 0.5 : 1,
              marginTop: '4px',
            }}
          >
            {submitting ? 'Creating…' : 'Create account'}
          </button>
        </form>

        <p style={{ fontSize: '13px', color: 'rgba(var(--text-rgb),0.4)', marginTop: '28px' }}>
          Already have an account?{' '}
          <Link to="/login" style={{ color: 'var(--gold)', textDecoration: 'none' }}>
            Sign in
          </Link>
        </p>
      </div>
    </div>
  )
}
