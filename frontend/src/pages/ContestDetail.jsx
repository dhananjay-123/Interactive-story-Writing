import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import api from '../api/client'
import { useAuth } from '../context/AuthContext'
import ConnectingLoader from '../components/ConnectingLoader'
import { timeLeft } from './Contests'

export default function ContestDetail() {
  const { id } = useParams()
  const { user } = useAuth()
  const [contest, setContest] = useState(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState('')
  // Re-render every 30s so the countdown and open/closed state stay honest.
  const [, setTick] = useState(0)

  useEffect(() => {
    api
      .get(`/api/contests/${id}`)
      .then((r) => setContest(r.data))
      .catch(() => setError('This contest could not be found.'))
  }, [id, user])

  useEffect(() => {
    const t = setInterval(() => setTick((n) => n + 1), 30000)
    return () => clearInterval(t)
  }, [])

  const isOpen = contest && contest.status === 'open' && new Date(contest.endsAt) > new Date()
  const myEntry = contest?.entries.find((e) => e.isMine)
  const winners = useMemo(() => {
    if (!contest || contest.status !== 'closed') return new Map()
    const m = new Map()
    let rank = 0
    for (const e of contest.entries) {
      if (e.votes <= 0) break
      rank += 1
      if (rank > 3) break
      m.set(e.storyId, rank)
    }
    return m
  }, [contest])

  const act = async (fn) => {
    if (busy) return
    setBusy(true)
    setNotice('')
    try {
      const { data } = await fn()
      setContest((c) => ({ ...c, entries: data }))
    } catch (err) {
      setNotice(err.response?.data?.message || 'That didn’t work — try again.')
    } finally {
      setBusy(false)
    }
  }

  const voteFor = (entry) =>
    act(() =>
      entry.myVote
        ? api.delete(`/api/contests/${id}/vote`)
        : api.post(`/api/contests/${id}/vote`, { storyId: entry.storyId })
    )

  if (error) {
    return (
      <Shell>
        <p style={{ fontSize: '14px', color: 'rgba(var(--text-rgb),var(--ta50))' }}>{error}</p>
        <Link to="/contests" style={backLink}>
          ← All contests
        </Link>
      </Shell>
    )
  }
  if (!contest) return <ConnectingLoader message="Fetching the contest" />

  return (
    <Shell>
      <Link to="/contests" style={backLink}>
        ← All contests
      </Link>

      <div className="animate-fadeUp" style={{ margin: '28px 0 36px' }}>
        <p style={{ fontSize: '10px', letterSpacing: '0.25em', color: 'var(--gold)', textTransform: 'uppercase', marginBottom: '12px', opacity: 0.7 }}>
          {contest.status === 'open'
            ? timeLeft(contest.endsAt)
            : contest.status === 'upcoming'
              ? 'opens soon'
              : 'the votes are in'}
        </p>
        <h1 className="font-story" style={{ fontSize: 'clamp(26px, 4vw, 40px)', fontWeight: 400, color: 'var(--parchment)', letterSpacing: '-0.01em', marginBottom: '12px' }}>
          {contest.title}
        </h1>
        {contest.theme && (
          <p className="font-story" style={{ fontSize: '16px', fontStyle: 'italic', color: 'rgba(var(--text-rgb),var(--ta60))', lineHeight: 1.7, maxWidth: '560px' }}>
            {contest.theme}
          </p>
        )}
        <p style={{ fontSize: '12px', color: 'rgba(var(--text-rgb),var(--ta35))', marginTop: '14px' }}>
          {contest.genre ? `${contest.genre.replace('_', '-')} only` : 'any genre'} · one entry per
          author · one vote per reader
        </p>
      </div>

      {isOpen && user && (
        <EntryBox
          contest={contest}
          myEntry={myEntry}
          busy={busy}
          onEnter={(storyId) => act(() => api.post(`/api/contests/${id}/enter`, { storyId }))}
          onWithdraw={() => act(() => api.delete(`/api/contests/${id}/enter`))}
        />
      )}
      {isOpen && !user && (
        <p style={{ fontSize: '13px', color: 'rgba(var(--text-rgb),var(--ta45))', marginBottom: '32px' }}>
          <Link to="/login" style={{ color: 'var(--gold)', textDecoration: 'none' }}>
            Sign in
          </Link>{' '}
          to enter a story or cast your vote.
        </p>
      )}

      {notice && (
        <p className="animate-fadeIn" style={{ fontSize: '13px', color: 'var(--crimson)', marginBottom: '20px' }}>
          {notice}
        </p>
      )}

      <section>
        <p style={{ fontSize: '11px', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'rgba(var(--text-rgb),var(--ta40))', marginBottom: '18px' }}>
          {contest.status === 'closed' ? 'Final standings' : 'Entries'}
          {contest.entries.length > 0 && ` — ${contest.entries.length}`}
        </p>

        {contest.entries.length === 0 ? (
          <p className="font-story" style={{ fontSize: '16px', fontStyle: 'italic', color: 'rgba(var(--text-rgb),var(--ta45))' }}>
            No entries yet{isOpen ? ' — the field is wide open.' : '.'}
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {contest.entries.map((e) => (
              <EntryRow
                key={e.storyId}
                entry={e}
                rank={winners.get(e.storyId)}
                canVote={isOpen && !!user && !e.isMine}
                busy={busy}
                onVote={() => voteFor(e)}
              />
            ))}
          </div>
        )}
      </section>
    </Shell>
  )
}

function EntryBox({ contest, myEntry, busy, onEnter, onWithdraw }) {
  const [stories, setStories] = useState(null)
  const [pick, setPick] = useState('')

  useEffect(() => {
    if (myEntry) return
    api
      .get('/api/stories/mine')
      .then((r) => setStories(r.data))
      .catch(() => setStories([]))
  }, [myEntry])

  if (myEntry) {
    return (
      <div className="animate-fadeUp" style={boxStyle}>
        <p style={{ fontSize: '14px', color: 'rgba(var(--text-rgb),var(--ta70))', lineHeight: 1.6, marginBottom: '12px' }}>
          You're in — <strong style={{ color: 'var(--parchment)' }}>{myEntry.title}</strong> carries
          your colours in this round.
        </p>
        <button onClick={onWithdraw} disabled={busy} style={quietButton}>
          Withdraw my entry
        </button>
      </div>
    )
  }

  const eligible = (stories || []).filter(
    (s) => s.published !== false && (!contest.genre || s.genre === contest.genre)
  )

  return (
    <div className="animate-fadeUp" style={boxStyle}>
      <p style={{ fontSize: '11px', letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--gold)', opacity: 0.8, marginBottom: '12px' }}>
        Enter the round
      </p>
      {stories === null ? (
        <p style={{ fontSize: '13px', color: 'rgba(var(--text-rgb),var(--ta45))' }}>Fetching your stories…</p>
      ) : eligible.length === 0 ? (
        <p style={{ fontSize: '13px', color: 'rgba(var(--text-rgb),var(--ta50))', lineHeight: 1.6 }}>
          You have no eligible published stories
          {contest.genre ? ` in ${contest.genre.replace('_', '-')}` : ''} yet.{' '}
          <Link to="/create" style={{ color: 'var(--gold)', textDecoration: 'none' }}>
            Write one →
          </Link>
        </p>
      ) : (
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
          <select
            value={pick}
            onChange={(e) => setPick(e.target.value)}
            style={{ flex: '1 1 240px', background: 'rgba(var(--panel-rgb),var(--pa04))', border: '1px solid rgba(var(--panel-rgb),var(--pa10))', borderRadius: '4px', padding: '10px 12px', color: 'var(--parchment)', fontSize: '14px', fontFamily: 'inherit', outline: 'none' }}
          >
            <option value="">Choose a story…</option>
            {eligible.map((s) => (
              <option key={s._id} value={s._id}>
                {s.title}
              </option>
            ))}
          </select>
          <button
            onClick={() => pick && onEnter(pick)}
            disabled={busy || !pick}
            style={{ padding: '10px 24px', background: 'var(--gold-solid)', color: 'var(--on-gold)', border: 'none', borderRadius: '4px', fontSize: '12px', fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', cursor: 'pointer', fontFamily: 'inherit', opacity: busy || !pick ? 0.5 : 1 }}
          >
            Enter
          </button>
        </div>
      )}
    </div>
  )
}

function EntryRow({ entry, rank, canVote, busy, onVote }) {
  const laurels = ['', '1st', '2nd', '3rd']
  return (
    <div
      className="animate-fadeUp"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '16px',
        padding: '16px 18px',
        border: `1px solid ${rank ? 'rgba(var(--gold-rgb),0.45)' : 'rgba(var(--panel-rgb),var(--pa10))'}`,
        borderRadius: '4px',
        background: rank === 1 ? 'rgba(var(--gold-rgb),0.07)' : 'transparent',
      }}
    >
      {rank && (
        <span className="font-story" style={{ fontSize: '15px', color: 'var(--gold)', minWidth: '34px' }}>
          {laurels[rank]}
        </span>
      )}
      <div style={{ minWidth: 0, flex: 1 }}>
        <Link
          to={`/story/${entry.storyId}`}
          className="font-story"
          style={{ fontSize: '17px', color: 'var(--parchment)', textDecoration: 'none' }}
        >
          {entry.title}
        </Link>
        <p style={{ fontSize: '12px', color: 'rgba(var(--text-rgb),var(--ta40))', marginTop: '4px' }}>
          by {entry.author.displayName}
          {entry.isMine && <span style={{ color: 'var(--gold)' }}> — your entry</span>}
          {' · '}
          {entry.branchCount} {entry.branchCount === 1 ? 'branch' : 'branches'}
        </p>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexShrink: 0 }}>
        <span style={{ fontSize: '13px', color: 'rgba(var(--text-rgb),var(--ta55))' }}>
          {entry.votes} {entry.votes === 1 ? 'vote' : 'votes'}
        </span>
        {canVote && (
          <button
            onClick={onVote}
            disabled={busy}
            style={{
              padding: '7px 16px',
              background: entry.myVote ? 'var(--gold)' : 'transparent',
              color: entry.myVote ? 'var(--on-gold)' : 'var(--gold)',
              border: '1px solid rgba(var(--gold-rgb),0.5)',
              borderRadius: '4px',
              fontSize: '11px',
              fontWeight: 600,
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              cursor: 'pointer',
              fontFamily: 'inherit',
              transition: 'all 0.2s ease',
            }}
          >
            {entry.myVote ? 'Voted ✓' : 'Vote'}
          </button>
        )}
      </div>
    </div>
  )
}

function Shell({ children }) {
  return (
    <div style={{ minHeight: '100vh', background: 'var(--ink)', paddingTop: '100px' }}>
      <div style={{ maxWidth: '760px', margin: '0 auto', padding: '0 24px 100px' }}>{children}</div>
    </div>
  )
}

const boxStyle = {
  border: '1px solid rgba(var(--gold-rgb),0.25)',
  borderRadius: '4px',
  background: 'rgba(var(--gold-rgb),0.04)',
  padding: '20px 22px',
  marginBottom: '36px',
}

const quietButton = {
  background: 'none',
  border: 'none',
  padding: 0,
  fontFamily: 'inherit',
  fontSize: '12px',
  letterSpacing: '0.12em',
  textTransform: 'uppercase',
  color: 'rgba(var(--text-rgb),var(--ta45))',
  cursor: 'pointer',
}

const backLink = {
  fontSize: '12px',
  letterSpacing: '0.15em',
  textTransform: 'uppercase',
  color: 'rgba(var(--text-rgb),var(--ta35))',
  textDecoration: 'none',
}
