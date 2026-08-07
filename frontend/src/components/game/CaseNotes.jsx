import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import CaseResolution from './CaseResolution'
import { clueLabel } from '../../games/format'

// The notebook. A small marker in the corner of the page, and a panel that slides
// in beside the story when someone asks for it — the prose is never covered,
// never dimmed, never paused.
//
// It holds exactly four things: what the reader is looking for, what they have
// noticed, who or what the answer might be, and their own notes. Nothing else
// belongs in here: no map of the story, no progress meter, no hint system.
export default function CaseNotes({ game, onAccuse, onSaveNotes }) {
  const [open, setOpen] = useState(false)

  // Escape closes it, the way every other dismissible surface on the web does.
  useEffect(() => {
    if (!open) return
    const onKey = (e) => e.key === 'Escape' && setOpen(false)
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  if (!game) return null

  const found = game.notebook?.length || 0
  const closed = Boolean(game.session?.finished)

  return (
    <>
      {/* The marker sits at 37px so it stays quiet; `tap-target` pads its hit
          area out to the 44px minimum on a coarse pointer without growing it. */}
      <button
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls="case-notes-panel"
        className="case-notes-tab tap-target"
      >
        <NotebookIcon />
        <span>Case notes</span>
        {found > 0 && <span className="case-notes-count">{found}</span>}
      </button>

      <div
        id="case-notes-panel"
        className={`case-notes-panel${open ? ' is-open' : ''}`}
        role="dialog"
        aria-label="Case notes"
        aria-hidden={!open}
      >
        <div className="case-notes-inner">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '12px' }}>
            <p style={{ fontSize: '10px', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--gold)', opacity: 0.85 }}>
              {game.mode.label}
            </p>
            <button onClick={() => setOpen(false)} style={quietButton} aria-label="Close case notes">
              Close
            </button>
          </div>

          <p className="font-story" style={{ fontSize: '16px', lineHeight: 1.55, color: 'var(--parchment)', margin: '10px 0 4px' }}>
            {game.objective}
          </p>

          {game.anonymous ? (
            <p style={{ fontSize: '13px', lineHeight: 1.7, color: 'rgba(var(--text-rgb),var(--ta50))', marginTop: '16px' }}>
              <Link to="/login" style={{ color: 'var(--gold)', textDecoration: 'none' }}>Sign in</Link>{' '}
              and your notes keep themselves as you read. Without an account the story is unchanged —
              you just won't have anywhere to put what you notice.
            </p>
          ) : (
            <>
              <Section title="What you have noticed" count={found}>
                {found === 0 ? (
                  <Empty>Nothing yet. Keep reading — it comes to you.</Empty>
                ) : (
                  <ul style={{ display: 'flex', flexDirection: 'column', gap: '10px', listStyle: 'none', margin: 0, padding: 0 }}>
                    {game.notebook.map((clue) => (
                      <ClueRow key={clue.id} clue={clue} />
                    ))}
                  </ul>
                )}
              </Section>

              {game.subjects?.length > 0 && (
                <Section title={game.mode.subject.many}>
                  <ul style={{ display: 'flex', flexDirection: 'column', gap: '8px', listStyle: 'none', margin: 0, padding: 0 }}>
                    {game.subjects.map((s) => (
                      <li key={s.key}>
                        <span className="font-story" style={{ fontSize: '14px', color: 'rgba(var(--text-rgb),var(--ta82))' }}>
                          {s.name}
                        </span>
                        {s.blurb && (
                          <span style={{ display: 'block', fontSize: '12px', lineHeight: 1.55, color: 'rgba(var(--text-rgb),var(--ta45))' }}>
                            {s.blurb}
                          </span>
                        )}
                      </li>
                    ))}
                  </ul>
                </Section>
              )}

              <Section title="Your own notes">
                <NotesField value={game.notes || ''} onSave={onSaveNotes} />
              </Section>

              {closed ? (
                // Solved, or read to an ending — either way the case is settled
                // and the reader gets their result here rather than having to go
                // and find it.
                <Section title="How it came out">
                  <CaseResolution game={game} signedIn bare />
                </Section>
              ) : (
                <Section title={game.mode.prompt}>
                  <AccusationForm game={game} onAccuse={onAccuse} />
                </Section>
              )}
            </>
          )}
        </div>
      </div>
    </>
  )
}

/* ── The answer ──
   Submittable at any point in the story. A miss says only that it was a miss —
   it never eliminates an option, never nudges toward another, and never lets on
   what the ending holds. */
function AccusationForm({ game, onAccuse }) {
  const [choice, setChoice] = useState('')
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const [missed, setMissed] = useState(false)
  const [error, setError] = useState('')

  const bySubject = game.solutionKind === 'subject'
  const answer = bySubject ? choice : text.trim()
  const left = game.session?.attemptsLeft ?? game.maxAttempts
  const spent = left <= 0

  const submit = async (e) => {
    e.preventDefault()
    if (!answer || busy || spent) return
    setBusy(true)
    setError('')
    setMissed(false)
    try {
      const result = await onAccuse(answer)
      if (!result.correct) {
        setMissed(true)
        setChoice('')
        setText('')
      }
    } catch (err) {
      setError(err.response?.data?.message || 'That answer could not be sent. Try again in a moment.')
    } finally {
      setBusy(false)
    }
  }

  if (spent) {
    return (
      <p style={{ fontSize: '13px', lineHeight: 1.7, color: 'rgba(var(--text-rgb),var(--ta50))' }}>
        You have used every answer on this one. The story still has its own to give — keep reading.
      </p>
    )
  }

  return (
    <form onSubmit={submit}>
      {bySubject ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {game.subjects.map((s) => (
            <label key={s.key} style={optionStyle(choice === s.key)}>
              <input
                type="radio"
                name="accusation"
                value={s.key}
                checked={choice === s.key}
                onChange={() => setChoice(s.key)}
                style={{ accentColor: 'var(--gold)' }}
              />
              <span className="font-story" style={{ fontSize: '14px' }}>{s.name}</span>
            </label>
          ))}
        </div>
      ) : (
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={game.mode.prompt}
          maxLength={120}
          style={{
            width: '100%',
            background: 'rgba(var(--panel-rgb),var(--pa04))',
            border: '1px solid rgba(var(--panel-rgb),var(--pa12))',
            borderRadius: 'var(--r-sm)',
            padding: '10px 12px',
            color: 'var(--parchment)',
            fontFamily: 'var(--serif)',
            fontSize: '15px',
            outline: 'none',
          }}
        />
      )}

      {missed && (
        <p className="animate-fadeIn font-story" style={{ fontSize: '13.5px', fontStyle: 'italic', lineHeight: 1.6, color: 'rgba(var(--text-rgb),var(--ta60))', marginTop: '12px' }}>
          {game.mode.missedLine}
        </p>
      )}
      {error && (
        <p style={{ fontSize: '12.5px', color: 'var(--crimson)', marginTop: '10px' }}>{error}</p>
      )}

      <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginTop: '14px', flexWrap: 'wrap' }}>
        <button type="submit" disabled={!answer || busy} style={submitStyle(!answer || busy)}>
          {busy ? 'Sending…' : game.mode.accuseLabel}
        </button>
        <span style={{ fontSize: '11px', letterSpacing: '0.08em', color: 'rgba(var(--text-rgb),var(--ta35))' }}>
          {left} {left === 1 ? 'answer' : 'answers'} left
        </span>
      </div>

      <p style={{ fontSize: '11.5px', lineHeight: 1.6, color: 'rgba(var(--text-rgb),var(--ta35))', marginTop: '12px' }}>
        Answering early is worth the most. Getting it wrong costs a little and changes nothing about the story.
      </p>
    </form>
  )
}

/* ── The reader's own notes ──
   Saved on a pause in typing, not on every keystroke, and never blocking. */
function NotesField({ value, onSave }) {
  const [draft, setDraft] = useState(value)
  const [saved, setSaved] = useState(false)
  const timer = useRef(null)
  const mounted = useRef(false)

  // Notes arriving from the server (first load, or another tab) win until the
  // reader starts typing here.
  useEffect(() => {
    if (!mounted.current) {
      setDraft(value)
      mounted.current = true
    }
  }, [value])

  useEffect(() => () => clearTimeout(timer.current), [])

  const change = (next) => {
    setDraft(next)
    setSaved(false)
    clearTimeout(timer.current)
    timer.current = setTimeout(() => {
      onSave(next)
      setSaved(true)
    }, 700)
  }

  return (
    <>
      <textarea
        value={draft}
        onChange={(e) => change(e.target.value)}
        placeholder="Anything you want to remember."
        rows={5}
        maxLength={4000}
        style={{
          width: '100%',
          resize: 'vertical',
          background: 'rgba(var(--panel-rgb),var(--pa04))',
          border: '1px solid rgba(var(--panel-rgb),var(--pa10))',
          borderRadius: 'var(--r-sm)',
          padding: '10px 12px',
          color: 'var(--parchment)',
          fontFamily: 'var(--serif)',
          fontSize: '14px',
          lineHeight: 1.65,
          outline: 'none',
        }}
      />
      <span style={{ display: 'block', fontSize: '11px', letterSpacing: '0.08em', color: 'rgba(var(--text-rgb),var(--ta30))', marginTop: '6px' }}>
        {saved ? 'Kept.' : 'Kept as you write.'}
      </span>
    </>
  )
}

function ClueRow({ clue }) {
  return (
    <li style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
      <Mark optional={clue.optional} />
      <span style={{ flex: 1, minWidth: 0 }}>
        <span className="font-story" style={{ display: 'block', fontSize: '14px', lineHeight: 1.5, color: 'rgba(var(--text-rgb),var(--ta82))' }}>
          {clue.label}
        </span>
        {clue.detail && (
          <span style={{ display: 'block', fontSize: '12.5px', lineHeight: 1.6, color: 'rgba(var(--text-rgb),var(--ta50))', marginTop: '2px' }}>
            {clue.detail}
          </span>
        )}
        <span style={{ display: 'block', fontSize: '10px', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(var(--text-rgb),var(--ta30))', marginTop: '4px' }}>
          {clue.optional ? 'Aside' : clueLabel(clue.kind)}
        </span>
      </span>
    </li>
  )
}

// An inked tick against the margin — hollow for an aside, filled for something
// that matters.
function Mark({ optional }) {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" aria-hidden="true" style={{ flexShrink: 0, marginTop: '4px' }}>
      <path
        d="M2.5 8.5 L6 12 L13.5 3.5"
        fill="none"
        stroke="var(--gold)"
        strokeWidth={optional ? 1.1 : 1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity={optional ? 0.5 : 0.9}
      />
    </svg>
  )
}

function Section({ title, count, children }) {
  return (
    <section style={{ marginTop: '24px', paddingTop: '20px', borderTop: '1px solid rgba(var(--panel-rgb),var(--pa06))' }}>
      <p style={{ fontSize: '10px', letterSpacing: '0.18em', textTransform: 'uppercase', color: 'rgba(var(--text-rgb),var(--ta45))', marginBottom: '12px' }}>
        {title}
        {count > 0 && <span style={{ color: 'var(--gold)' }}>  ·  {count}</span>}
      </p>
      {children}
    </section>
  )
}

function Empty({ children }) {
  return (
    <p className="font-story" style={{ fontSize: '13.5px', fontStyle: 'italic', lineHeight: 1.6, color: 'rgba(var(--text-rgb),var(--ta40))' }}>
      {children}
    </p>
  )
}

function NotebookIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M6 3h12a1 1 0 0 1 1 1v16a1 1 0 0 1-1 1H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z" />
      <path d="M9 3v18M12 8h4M12 12h4" />
    </svg>
  )
}

const optionStyle = (active) => ({
  display: 'flex',
  alignItems: 'center',
  gap: '10px',
  padding: '9px 11px',
  borderRadius: 'var(--r-sm)',
  border: `1px solid ${active ? 'rgba(var(--gold-rgb),0.45)' : 'rgba(var(--panel-rgb),var(--pa08))'}`,
  background: active ? 'rgba(var(--gold-rgb),0.06)' : 'transparent',
  color: active ? 'var(--parchment)' : 'rgba(var(--text-rgb),var(--ta70))',
  cursor: 'pointer',
  transition: 'border-color 0.2s ease, background 0.2s ease',
})

const submitStyle = (disabled) => ({
  padding: '10px 22px',
  background: 'var(--gold-solid)',
  color: 'var(--on-gold)',
  border: 'none',
  borderRadius: 'var(--r-sm)',
  fontSize: '12px',
  fontWeight: 600,
  letterSpacing: '0.12em',
  textTransform: 'uppercase',
  fontFamily: 'inherit',
  cursor: disabled ? 'not-allowed' : 'pointer',
  opacity: disabled ? 0.5 : 1,
})

const quietButton = {
  background: 'none',
  border: 'none',
  color: 'rgba(var(--text-rgb),var(--ta35))',
  fontSize: '11px',
  letterSpacing: '0.12em',
  textTransform: 'uppercase',
  cursor: 'pointer',
  padding: 0,
  fontFamily: 'inherit',
}
