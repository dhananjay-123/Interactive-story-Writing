import { useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../api/client'
import { Button, Field, Logo } from '../components/ui'

// There's no reset-by-email on Craft&Tales. A locked-out writer leaves a request
// and an admin sets them a new password by hand.
export default function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [note, setNote] = useState('')
  const [errors, setErrors] = useState({})
  const [sent, setSent] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    if (!email.trim()) {
      setErrors({ email: 'Enter the email on the account.' })
      return
    }
    setSubmitting(true)
    setErrors({})
    try {
      await api.post('/api/auth/password-request', { email, note })
      setSent(true)
    } catch (err) {
      setErrors({ form: err?.response?.data?.message || 'Could not send your request. Try again.' })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-shell auth-shell--wide">
        <div className="animate-fadeUp auth-head">
          <Logo width={52} className="auth-logo" />
          <p className="eyebrow">Locked out</p>
          <h1 className="font-story auth-title">Forgot your password</h1>
        </div>

        {sent ? (
          // The confirmation is a live region: submitting swaps the form out for
          // this panel, and without it a screen reader is left on a page whose
          // content silently changed underneath it.
          <div className="animate-fadeUp" role="status">
            <p className="auth-sent">
              Your request is in. If that email belongs to an account, an admin will set a new
              password and pass it along to you.
            </p>
            <p className="auth-foot" style={{ marginTop: 0 }}>
              <Link to="/login" className="auth-link">Back to sign in</Link>
            </p>
          </div>
        ) : (
          <>
            <p className="animate-fadeUp auth-intro">
              We don't send reset emails. Leave your address and an admin will set you a new
              password, then get it to you the way you normally talk.
            </p>

            <form onSubmit={submit} className="animate-fadeUp delay-100 auth-form" noValidate>
              <Field label="Email" error={errors.email} required>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); if (errors.email) setErrors({}) }}
                  autoComplete="email"
                />
              </Field>

              <Field
                label="Anything the admin should know"
                hint="Optional — how to reach you, which account it is."
              >
                <textarea
                  rows={3}
                  maxLength={500}
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                />
              </Field>

              {errors.form && (
                <p className="ct-error" role="alert"><span>{errors.form}</span></p>
              )}

              <Button type="submit" variant="primary" disabled={submitting}>
                {submitting ? 'Sending…' : 'Request a reset'}
              </Button>
            </form>

            <p className="auth-foot">
              Remembered it? <Link to="/login" className="auth-link">Sign in</Link>
            </p>
          </>
        )}
      </div>
    </div>
  )
}
