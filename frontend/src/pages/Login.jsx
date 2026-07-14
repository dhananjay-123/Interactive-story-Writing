import { useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { inputStyle, labelStyle, focusBorder, blurBorder } from '../components/authStyles'

export default function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const redirectTo = location.state?.from || '/stories'

  const [form, setForm] = useState({ email: '', password: '' })
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const update = (field, value) => setForm((f) => ({ ...f, [field]: value }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    setError('')
    try {
      await login(form.email, form.password)
      navigate(redirectTo, { replace: true })
    } catch (err) {
      setError(err.response?.data?.message || 'Could not sign in. Please try again.')
      setSubmitting(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--ink)', paddingTop: '120px' }}>
      <div style={{ maxWidth: '400px', margin: '0 auto', padding: '0 24px 100px' }}>
        <div className="animate-fadeUp mb-10">
          <p className="eyebrow">Welcome back</p>
          <h1 className="font-story" style={{ fontSize: 'clamp(28px, 4vw, 40px)', fontWeight: 400, color: 'var(--parchment)', letterSpacing: '-0.01em' }}>
            Sign in
          </h1>
        </div>

        <form onSubmit={handleSubmit} className="animate-fadeUp delay-100" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
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
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <label style={labelStyle}>Password</label>
              <Link
                to="/forgot-password"
                style={{ fontSize: '11px', color: 'rgba(var(--text-rgb),var(--ta40))', textDecoration: 'none', marginBottom: '8px' }}
              >
                Forgot?
              </Link>
            </div>
            <input
              type="password"
              style={inputStyle}
              value={form.password}
              onChange={(e) => update('password', e.target.value)}
              onFocus={focusBorder}
              onBlur={blurBorder}
              autoComplete="current-password"
            />
          </div>

          {error && <p style={{ fontSize: '13px', color: 'var(--crimson)', margin: 0 }}>{error}</p>}

          <button
            type="submit"
            disabled={submitting || !form.email || !form.password}
            style={{
              padding: '13px 32px',
              background: 'var(--gold-solid)',
              color: 'var(--on-gold)',
              border: 'none',
              fontSize: '12px',
              fontWeight: 600,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              cursor: submitting ? 'default' : 'pointer',
              borderRadius: '4px',
              transition: 'background 0.2s ease',
              opacity: submitting || !form.email || !form.password ? 0.5 : 1,
              marginTop: '4px',
            }}
          >
            {submitting ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        <p style={{ fontSize: '13px', color: 'rgba(var(--text-rgb),var(--ta40))', marginTop: '28px' }}>
          New here?{' '}
          <Link to="/register" style={{ color: 'var(--gold)', textDecoration: 'none' }}>
            Create an account
          </Link>
        </p>
      </div>
    </div>
  )
}
