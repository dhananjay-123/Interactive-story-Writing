import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { Button, Field, Logo } from '../components/ui'

// The rules that used to live in a single `valid` boolean — which only ever
// expressed itself by greying out the button — are now per-field messages. The
// reader is told which rule they've missed and where, instead of being left to
// work out why the button won't light up.

const RULES = {
  displayName: (v) => (!v.trim() ? 'Readers need something to call you.' : null),
  username: (v) => {
    if (!v.trim()) return 'Pick a username.'
    if (!/^[a-zA-Z0-9_]{3,20}$/.test(v)) return '3–20 characters: letters, numbers and underscores only.'
    return null
  },
  email: (v) => {
    if (!v.trim()) return 'We need an email to reach you.'
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) return 'That doesn’t look like an email address.'
    return null
  },
  password: (v) => (v.length < 8 ? 'At least 8 characters.' : null),
}

export default function Register() {
  const { register } = useAuth()
  const navigate = useNavigate()

  const [form, setForm] = useState({ displayName: '', username: '', email: '', password: '' })
  const [errors, setErrors] = useState({})
  const [submitting, setSubmitting] = useState(false)

  const update = (field, value) => {
    setForm((f) => ({ ...f, [field]: value }))
    if (errors[field]) setErrors((e) => ({ ...e, [field]: undefined }))
  }

  // Validate on blur as well as on submit, so a mistake in the username is
  // caught while the reader is still looking at that field.
  const checkField = (field) => {
    const message = RULES[field](form[field])
    setErrors((e) => ({ ...e, [field]: message || undefined }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const found = {}
    for (const [field, rule] of Object.entries(RULES)) {
      const message = rule(form[field])
      if (message) found[field] = message
    }
    if (Object.keys(found).length) { setErrors(found); return }

    setSubmitting(true)
    setErrors({})
    try {
      const user = await register(form)
      navigate(`/author/${user.username}`, { replace: true })
    } catch (err) {
      setErrors({ form: err.response?.data?.message || 'Could not create your account. Please try again.' })
      setSubmitting(false)
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-shell">
        <div className="animate-fadeUp auth-head">
          <Logo width={52} className="auth-logo" />
          <p className="eyebrow">Join the guild</p>
          <h1 className="font-story auth-title">Create an account</h1>
        </div>

        <form onSubmit={handleSubmit} className="animate-fadeUp delay-100 auth-form" noValidate>
          <Field label="Pen name" error={errors.displayName} required>
            <input
              placeholder="How readers will see you"
              value={form.displayName}
              onChange={(e) => update('displayName', e.target.value)}
              onBlur={() => checkField('displayName')}
              autoComplete="nickname"
            />
          </Field>

          <Field
            label="Username"
            hint="3–20 characters. Letters, numbers and underscores."
            error={errors.username}
            required
          >
            <input
              value={form.username}
              onChange={(e) => update('username', e.target.value.replace(/\s/g, ''))}
              onBlur={() => checkField('username')}
              autoComplete="username"
            />
          </Field>

          <Field label="Email" error={errors.email} required>
            <input
              type="email"
              value={form.email}
              onChange={(e) => update('email', e.target.value)}
              onBlur={() => checkField('email')}
              autoComplete="email"
            />
          </Field>

          <Field label="Password" hint="At least 8 characters." error={errors.password} required>
            <input
              type="password"
              value={form.password}
              onChange={(e) => update('password', e.target.value)}
              onBlur={() => checkField('password')}
              autoComplete="new-password"
            />
          </Field>

          {errors.form && (
            <p className="ct-error" role="alert"><span>{errors.form}</span></p>
          )}

          <Button type="submit" variant="primary" disabled={submitting}>
            {submitting ? 'Creating…' : 'Create account'}
          </Button>
        </form>

        <p className="auth-foot">
          Already have an account? <Link to="/login" className="auth-link">Sign in</Link>
        </p>
      </div>
    </div>
  )
}
