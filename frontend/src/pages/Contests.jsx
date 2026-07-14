import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../api/client'
import { useAuth } from '../context/AuthContext'
import ConnectingLoader from '../components/ConnectingLoader'

const GENRES = ['fantasy', 'mystery', 'sci_fi', 'romance', 'horror', 'thriller', 'literary']

// Rough time-left line for a card: precision matters less than the shape of it.
export function timeLeft(endsAt) {
  const ms = new Date(endsAt) - Date.now()
  if (ms <= 0) return 'ended'
  const d = Math.floor(ms / 86400000)
  if (d >= 2) return `${d} days left`
  const h = Math.floor(ms / 3600000)
  if (h >= 2) return `${h} hours left`
  const m = Math.max(1, Math.floor(ms / 60000))
  return `${m} min left`
}

export default function Contests() {
  const { user } = useAuth()
  const [contests, setContests] = useState(null)
  const [error, setError] = useState('')
  const [creating, setCreating] = useState(false)

  const load = () =>
    api
      .get('/api/contests')
      .then((r) => setContests(r.data))
      .catch(() => setError('Contests could not be loaded.'))

  useEffect(() => {
    load()
  }, [])

  if (error) {
    return (
      <PageShell>
        <p style={{ fontSize: '14px', color: 'rgba(var(--text-rgb),var(--ta50))' }}>{error}</p>
      </PageShell>
    )
  }
  if (!contests) return <ConnectingLoader message="Fetching the contests" />

  const groups = [
    ['Open now', contests.filter((c) => c.status === 'open')],
    ['Coming up', contests.filter((c) => c.status === 'upcoming')],
    ['Finished', contests.filter((c) => c.status === 'closed')],
  ].filter(([, list]) => list.length)

  return (
    <PageShell>
      <div className="animate-fadeUp" style={{ marginBottom: '40px' }}>
        <p style={{ fontSize: '10px', letterSpacing: '0.25em', color: 'var(--gold)', textTransform: 'uppercase', marginBottom: '12px', opacity: 0.7 }}>
          Writing contests
        </p>
        <h1 className="font-story" style={{ fontSize: 'clamp(28px, 4vw, 42px)', fontWeight: 400, color: 'var(--parchment)', letterSpacing: '-0.01em', marginBottom: '10px' }}>
          Put a story forward
        </h1>
        <p style={{ fontSize: '14px', color: 'rgba(var(--text-rgb),var(--ta50))', lineHeight: 1.6, maxWidth: '520px' }}>
          Themed rounds, one entry per author, one vote per reader. When the clock
          runs out, the votes decide.
        </p>
      </div>

      {user?.role === 'admin' && (
        <div style={{ marginBottom: '36px' }}>
          {creating ? (
            <NewContestForm
              onDone={() => {
                setCreating(false)
                load()
              }}
              onCancel={() => setCreating(false)}
            />
          ) : (
            <button
              onClick={() => setCreating(true)}
              style={{ background: 'none', border: '1px solid rgba(var(--gold-rgb),0.4)', color: 'var(--gold)', fontSize: '12px', letterSpacing: '0.12em', textTransform: 'uppercase', cursor: 'pointer', padding: '10px 22px', borderRadius: '4px', fontFamily: 'inherit' }}
            >
              + New contest
            </button>
          )}
        </div>
      )}

      {groups.length === 0 && (
        <p className="font-story" style={{ fontSize: '17px', fontStyle: 'italic', color: 'rgba(var(--text-rgb),var(--ta45))' }}>
          No contests yet — the first round is still being dreamt up.
        </p>
      )}

      {groups.map(([label, list]) => (
        <section key={label} style={{ marginBottom: '44px' }}>
          <p style={{ fontSize: '11px', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'rgba(var(--text-rgb),var(--ta40))', marginBottom: '18px' }}>
            {label}
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {list.map((c) => (
              <ContestCard key={c._id} contest={c} />
            ))}
          </div>
        </section>
      ))}
    </PageShell>
  )
}

function ContestCard({ contest }) {
  const open = contest.status === 'open'
  return (
    <Link
      to={`/contests/${contest._id}`}
      className="animate-fadeUp"
      style={{
        display: 'block',
        padding: '20px 22px',
        border: `1px solid ${open ? 'rgba(var(--gold-rgb),0.3)' : 'rgba(var(--panel-rgb),var(--pa10))'}`,
        borderRadius: '4px',
        background: open ? 'rgba(var(--gold-rgb),0.04)' : 'transparent',
        textDecoration: 'none',
        transition: 'border-color 0.2s ease',
      }}
      onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'rgba(var(--gold-rgb),0.55)')}
      onMouseLeave={(e) =>
        (e.currentTarget.style.borderColor = open ? 'rgba(var(--gold-rgb),0.3)' : 'rgba(var(--panel-rgb),var(--pa10))')
      }
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '16px', alignItems: 'baseline', flexWrap: 'wrap' }}>
        <h2 className="font-story" style={{ fontSize: '20px', fontWeight: 400, color: 'var(--parchment)' }}>
          {contest.title}
        </h2>
        <span style={{ fontSize: '11px', letterSpacing: '0.14em', textTransform: 'uppercase', color: open ? 'var(--gold)' : 'rgba(var(--text-rgb),var(--ta40))' }}>
          {contest.status === 'open' ? timeLeft(contest.endsAt) : contest.status === 'upcoming' ? 'opens soon' : 'ended'}
        </span>
      </div>
      {contest.theme && (
        <p style={{ fontSize: '14px', color: 'rgba(var(--text-rgb),var(--ta55))', lineHeight: 1.6, marginTop: '8px', maxWidth: '560px' }}>
          {contest.theme}
        </p>
      )}
      <p style={{ fontSize: '12px', color: 'rgba(var(--text-rgb),var(--ta35))', marginTop: '12px' }}>
        {contest.genre ? `${contest.genre.replace('_', '-')} only` : 'any genre'}
        {' · '}
        {contest.entryCount} {contest.entryCount === 1 ? 'entry' : 'entries'}
        {' · '}
        {contest.voteCount} {contest.voteCount === 1 ? 'vote' : 'votes'}
      </p>
    </Link>
  )
}

function NewContestForm({ onDone, onCancel }) {
  const [form, setForm] = useState({ title: '', theme: '', genre: '', endsAt: '' })
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const submit = async () => {
    setError('')
    setSaving(true)
    try {
      await api.post('/api/contests', {
        title: form.title,
        theme: form.theme,
        genre: form.genre || null,
        endsAt: form.endsAt ? new Date(form.endsAt).toISOString() : null,
      })
      onDone()
    } catch (err) {
      setError(err.response?.data?.message || 'Could not create the contest.')
      setSaving(false)
    }
  }

  return (
    <div className="animate-fadeUp" style={{ border: '1px solid rgba(var(--gold-rgb),0.25)', borderRadius: '4px', padding: '22px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <input
        style={fieldStyle}
        placeholder="Contest title"
        value={form.title}
        onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
      />
      <textarea
        style={{ ...fieldStyle, resize: 'vertical', minHeight: '70px' }}
        placeholder="Theme — what should the stories be about?"
        value={form.theme}
        onChange={(e) => setForm((f) => ({ ...f, theme: e.target.value }))}
      />
      <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap' }}>
        <label style={miniLabel}>
          Genre
          <select
            style={fieldStyle}
            value={form.genre}
            onChange={(e) => setForm((f) => ({ ...f, genre: e.target.value }))}
          >
            <option value="">Any genre</option>
            {GENRES.map((g) => (
              <option key={g} value={g}>
                {g.replace('_', '-')}
              </option>
            ))}
          </select>
        </label>
        <label style={miniLabel}>
          Ends
          <input
            type="datetime-local"
            style={fieldStyle}
            value={form.endsAt}
            onChange={(e) => setForm((f) => ({ ...f, endsAt: e.target.value }))}
          />
        </label>
      </div>
      {error && <p style={{ fontSize: '13px', color: 'var(--crimson)' }}>{error}</p>}
      <div style={{ display: 'flex', gap: '14px' }}>
        <button
          onClick={submit}
          disabled={saving || !form.title.trim() || !form.endsAt}
          style={{ padding: '10px 24px', background: 'var(--gold-solid)', color: 'var(--on-gold)', border: 'none', borderRadius: '4px', fontSize: '12px', fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', cursor: 'pointer', fontFamily: 'inherit', opacity: saving || !form.title.trim() || !form.endsAt ? 0.5 : 1 }}
        >
          {saving ? 'Opening…' : 'Open the round'}
        </button>
        <button
          onClick={onCancel}
          style={{ background: 'none', border: 'none', color: 'rgba(var(--text-rgb),var(--ta45))', fontSize: '12px', letterSpacing: '0.12em', textTransform: 'uppercase', cursor: 'pointer', fontFamily: 'inherit' }}
        >
          Cancel
        </button>
      </div>
    </div>
  )
}

function PageShell({ children }) {
  return (
    <div style={{ minHeight: '100vh', background: 'var(--ink)', paddingTop: '100px' }}>
      <div style={{ maxWidth: '760px', margin: '0 auto', padding: '0 24px 100px' }}>{children}</div>
    </div>
  )
}

const fieldStyle = {
  background: 'rgba(var(--panel-rgb),var(--pa04))',
  border: '1px solid rgba(var(--panel-rgb),var(--pa10))',
  borderRadius: '4px',
  padding: '11px 14px',
  color: 'var(--parchment)',
  fontSize: '14px',
  outline: 'none',
  fontFamily: 'inherit',
  width: '100%',
}

const miniLabel = {
  display: 'flex',
  flexDirection: 'column',
  gap: '6px',
  fontSize: '10px',
  letterSpacing: '0.15em',
  textTransform: 'uppercase',
  color: 'rgba(var(--text-rgb),var(--ta40))',
  flex: '1 1 200px',
}
