import { useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { Button, Field } from '../components/ui'

// Two changes worth noting beyond the styling.
//
// The fields are wired through Field, which generates the id/for pair — before
// this, both inputs announced themselves to a screen reader as "edit text,
// blank", and the same was true of every other form in the app.
//
// The submit button is no longer disabled until both boxes have content. A
// greyed-out button with no explanation is a dead end: you can see that you
// can't continue but not why. It now submits, validates, and says what's
// missing next to the field that's missing it.

export default function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const redirectTo = location.state?.from || '/stories'

  const [form, setForm] = useState({ email: '', password: '' })
  const [errors, setErrors] = useState({})
  const [submitting, setSubmitting] = useState(false)

  const update = (field, value) => {
    setForm((f) => ({ ...f, [field]: value }))
    // Clear a field's error as soon as it's being corrected, rather than making
    // the reader submit again to find out whether they've fixed it.
    if (errors[field]) setErrors((e) => ({ ...e, [field]: undefined }))
  }

  const validate = () => {
    const next = {}
    if (!form.email.trim()) next.email = 'Enter the email you signed up with.'
    else if (!/^\S+@\S+\.\S+$/.test(form.email.trim())) next.email = 'That doesn’t look like an email address.'
    if (!form.password) next.password = 'Enter your password.'
    return next
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const found = validate()
    if (Object.keys(found).length) { setErrors(found); return }

    setSubmitting(true)
    setErrors({})
    try {
      await login(form.email, form.password)
      navigate(redirectTo, { replace: true })
    } catch (err) {
      setErrors({ form: err.response?.data?.message || 'Could not sign in. Please try again.' })
      setSubmitting(false)
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-shell">
        <div className="animate-fadeUp auth-head">
          <p className="eyebrow">Welcome back</p>
          <h1 className="font-story auth-title">Sign in</h1>
        </div>

        <form onSubmit={handleSubmit} className="animate-fadeUp delay-100 auth-form" noValidate>
          <Field label="Email" error={errors.email} required>
            <input
              type="email"
              value={form.email}
              onChange={(e) => update('email', e.target.value)}
              autoComplete="email"
            />
          </Field>

          <div>
            <div className="auth-label-row">
              <Link to="/forgot-password" className="auth-aside-link">Forgot?</Link>
            </div>
            <Field label="Password" error={errors.password} required>
              <input
                type="password"
                value={form.password}
                onChange={(e) => update('password', e.target.value)}
                autoComplete="current-password"
              />
            </Field>
          </div>

          {/* A failure from the server belongs to the form, not to one field.
              role="alert" is what makes it spoken — previously this was a plain
              paragraph that no screen reader ever announced. */}
          {errors.form && (
            <p className="ct-error" role="alert">
              <span>{errors.form}</span>
            </p>
          )}

          <Button type="submit" variant="primary" disabled={submitting}>
            {submitting ? 'Signing in…' : 'Sign in'}
          </Button>
        </form>

        <p className="auth-foot">
          New here? <Link to="/register" className="auth-link">Create an account</Link>
        </p>
      </div>
    </div>
  )
}
