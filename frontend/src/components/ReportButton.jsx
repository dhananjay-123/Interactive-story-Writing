import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../api/client'
import { useAuth } from '../context/AuthContext'

function FlagIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" />
      <line x1="4" y1="22" x2="4" y2="15" />
    </svg>
  )
}

const REASONS = [
  { id: 'spam', label: 'Spam or advertising' },
  { id: 'offensive', label: 'Offensive or harmful' },
  { id: 'plagiarism', label: 'Plagiarism' },
  { id: 'broken', label: 'Broken or buggy' },
  { id: 'other', label: 'Something else' },
]

// Lets a reader flag a story for admin review. Hidden from the story's own
// author — there's nothing to report on your own work.
export default function ReportButton({ storyId, isAuthor }) {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [reason, setReason] = useState('spam')
  const [details, setDetails] = useState('')
  const [state, setState] = useState('idle') // idle | sending | done

  if (isAuthor) return null

  const submit = async () => {
    if (!user) {
      navigate('/login', { state: { from: `/story/${storyId}` } })
      return
    }
    setState('sending')
    try {
      await api.post(`/api/stories/${storyId}/report`, { reason, details })
      setState('done')
    } catch {
      setState('idle')
    }
  }

  if (state === 'done') {
    return (
      <p style={{ marginTop: '16px', fontSize: '12.5px', color: 'rgba(var(--text-rgb),var(--ta45))' }}>
        Thanks — our team will take a look.
      </p>
    )
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        style={{
          marginTop: '16px',
          display: 'inline-flex',
          alignItems: 'center',
          gap: '7px',
          background: 'none',
          border: '1px solid rgba(var(--panel-rgb),var(--pa12))',
          borderRadius: '4px',
          padding: '7px 15px',
          cursor: 'pointer',
          fontFamily: 'inherit',
          fontSize: '12px',
          letterSpacing: '0.06em',
          color: 'rgba(var(--text-rgb),var(--ta50))',
          transition: 'color 0.2s ease, border-color 0.2s ease, background 0.2s ease',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.color = 'var(--crimson)'
          e.currentTarget.style.borderColor = 'rgba(139,26,46,0.5)'
          e.currentTarget.style.background = 'rgba(139,26,46,0.06)'
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.color = 'rgba(var(--text-rgb),var(--ta50))'
          e.currentTarget.style.borderColor = 'rgba(var(--panel-rgb),var(--pa12))'
          e.currentTarget.style.background = 'none'
        }}
      >
        <FlagIcon />
        Report this story
      </button>
    )
  }

  return (
    <div
      className="animate-fadeIn"
      style={{
        marginTop: '18px',
        padding: '18px',
        border: '1px solid rgba(var(--panel-rgb),var(--pa12))',
        borderRadius: '8px',
        background: 'rgba(var(--panel-rgb),var(--pa02))',
        maxWidth: '440px',
      }}
    >
      <p style={{ fontSize: '11px', letterSpacing: '0.16em', textTransform: 'uppercase', color: 'rgba(var(--text-rgb),var(--ta45))', marginBottom: '14px' }}>
        Report this story
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '14px' }}>
        {REASONS.map((r) => (
          <label key={r.id} style={{ display: 'flex', alignItems: 'center', gap: '9px', cursor: 'pointer', fontSize: '13.5px', color: 'rgba(var(--text-rgb),var(--ta65))' }}>
            <input
              type="radio"
              name="report-reason"
              value={r.id}
              checked={reason === r.id}
              onChange={() => setReason(r.id)}
              style={{ accentColor: 'var(--gold)' }}
            />
            {r.label}
          </label>
        ))}
      </div>

      <textarea
        value={details}
        onChange={(e) => setDetails(e.target.value)}
        placeholder="Add any detail that helps (optional)"
        rows={2}
        maxLength={1000}
        style={{
          width: '100%',
          background: 'rgba(var(--panel-rgb),var(--pa04))',
          border: '1px solid rgba(var(--panel-rgb),var(--pa10))',
          borderRadius: '4px',
          padding: '8px 12px',
          color: 'var(--parchment)',
          fontSize: '13.5px',
          fontFamily: 'inherit',
          outline: 'none',
          resize: 'vertical',
          marginBottom: '14px',
        }}
      />

      <div style={{ display: 'flex', gap: '10px' }}>
        <button
          onClick={submit}
          disabled={state === 'sending'}
          style={{
            padding: '8px 18px',
            fontSize: '12px',
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
            background: 'var(--crimson)',
            color: '#fff',
            border: 'none',
            borderRadius: '4px',
            cursor: state === 'sending' ? 'default' : 'pointer',
            opacity: state === 'sending' ? 0.6 : 1,
            fontFamily: 'inherit',
            fontWeight: 600,
          }}
        >
          {state === 'sending' ? 'Sending…' : 'Submit report'}
        </button>
        <button
          onClick={() => setOpen(false)}
          style={{
            padding: '8px 14px',
            fontSize: '12px',
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
            background: 'none',
            color: 'rgba(var(--text-rgb),var(--ta50))',
            border: 'none',
            cursor: 'pointer',
            fontFamily: 'inherit',
          }}
        >
          Cancel
        </button>
      </div>
    </div>
  )
}
