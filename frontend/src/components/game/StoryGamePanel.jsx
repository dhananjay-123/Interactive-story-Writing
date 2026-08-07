import { useCallback, useEffect, useMemo, useState } from 'react'
import api from '../../api/client'
import { inputStyle, labelStyle, focusBorder, blurBorder } from '../authStyles'

// Where an author turns a story into a Story Game. One panel owns the whole
// layer — the objective, the cast the answer is chosen from, and the clues each
// passage gives away — so a writer never has to hold the shape of it in their
// head across two screens.
//
// It sits closed by default in the story map, because most stories are not games
// and the writing surface should not imply otherwise.
export default function StoryGamePanel({ storyId, nodes, rootId }) {
  const [open, setOpen] = useState(false)
  const [catalog, setCatalog] = useState(null)
  const [design, setDesign] = useState(null) // { game, subjects, clues }
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [{ data: cat }, { data: d }] = await Promise.all([
        api.get('/api/games/catalog'),
        api.get(`/api/games/${storyId}/design`),
      ])
      setCatalog(cat)
      setDesign(d)
    } catch (err) {
      setError(err.response?.data?.message || 'Could not open the challenge editor.')
    } finally {
      setLoading(false)
    }
  }, [storyId])

  // Loaded on mount, not on open: the header has to be able to say whether this
  // story already carries a challenge, and whether it is live, before an author
  // clicks anything.
  useEffect(() => {
    load()
  }, [load])

  const game = design?.game
  const mode = catalog?.modes.find((m) => m.id === (game?.mode || 'detective'))

  return (
    <div style={panelStyle}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '12px', flexWrap: 'wrap' }}>
        <div>
          <h2 className="font-story" style={{ fontSize: '18px', fontWeight: 400, color: 'var(--parchment)' }}>
            Story Game
          </h2>
          <p style={{ fontSize: '12px', color: 'rgba(var(--text-rgb),var(--ta40))', marginTop: '4px', maxWidth: '460px', lineHeight: 1.6 }}>
            Give readers something to work out while they read. Optional — the story reads exactly the
            same for anyone who ignores it.
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {game?.published && <LiveMark />}
          <button onClick={() => setOpen((v) => !v)} style={toggleStyle}>
            {open ? 'Hide' : game ? 'Edit' : 'Set one up'}
          </button>
        </div>
      </div>

      {open && (
        <div className="animate-fadeUp" style={{ marginTop: '22px' }}>
          {error && <p style={{ fontSize: '13px', color: 'var(--crimson)', marginBottom: '14px' }}>{error}</p>}
          {loading || !catalog ? (
            <p style={{ fontSize: '13px', color: 'rgba(var(--text-rgb),var(--ta35))' }}>Opening…</p>
          ) : (
            <>
              <SubjectsEditor
                storyId={storyId}
                mode={mode}
                subjects={design.subjects}
                solutionKey={game?.solutionKind === 'subject' ? game.solutionKey : null}
                onChange={(subjects) => setDesign((d) => ({ ...d, subjects }))}
              />
              <CluesEditor
                storyId={storyId}
                nodes={nodes}
                rootId={rootId}
                clueKinds={catalog.clueKinds}
                clues={design.clues}
                onChange={(clues) => setDesign((d) => ({ ...d, clues }))}
              />
              <GameForm
                storyId={storyId}
                catalog={catalog}
                game={game}
                subjects={design.subjects}
                clues={design.clues}
                onSaved={(saved) => setDesign((d) => ({ ...d, game: saved }))}
                onRemoved={() => setDesign((d) => ({ ...d, game: null }))}
              />
            </>
          )}
        </div>
      )}
    </div>
  )
}

/* ── The cast the answer is chosen from ── */
function SubjectsEditor({ storyId, mode, subjects, solutionKey, onChange }) {
  const [name, setName] = useState('')
  const [blurb, setBlurb] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const add = async () => {
    if (!name.trim() || busy) return
    setBusy(true)
    setError('')
    try {
      const { data } = await api.post(`/api/games/${storyId}/subjects`, { name: name.trim(), blurb: blurb.trim() })
      onChange([...subjects, data])
      setName('')
      setBlurb('')
    } catch (err) {
      setError(err.response?.data?.message || 'Could not add that.')
    } finally {
      setBusy(false)
    }
  }

  const remove = async (subject) => {
    setError('')
    try {
      await api.delete(`/api/games/${storyId}/subjects/${subject._id}`)
      onChange(subjects.filter((s) => s._id !== subject._id))
    } catch (err) {
      setError(err.response?.data?.message || 'Could not remove that.')
    }
  }

  return (
    <Section title={mode?.subject.many || 'The cast'}>
      <p style={hintStyle}>
        Who or what the reader picks between. Renaming one later is safe — the answer follows the entry,
        not its name.
      </p>

      {subjects.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '14px' }}>
          {subjects.map((s) => (
            <div key={s._id} style={rowStyle}>
              <span style={{ flex: 1, minWidth: 0 }}>
                <span className="font-story" style={{ fontSize: '14px', color: 'var(--parchment)' }}>{s.name}</span>
                {solutionKey === s.key && (
                  <span style={{ marginLeft: '10px', fontSize: '9px', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--gold)', border: '1px solid rgba(var(--gold-rgb),0.4)', borderRadius: '3px', padding: '2px 7px' }}>
                    the answer
                  </span>
                )}
                {s.blurb && (
                  <span style={{ display: 'block', fontSize: '12px', color: 'rgba(var(--text-rgb),var(--ta45))', marginTop: '2px' }}>{s.blurb}</span>
                )}
              </span>
              <button onClick={() => remove(s)} style={removeStyle} aria-label={`Remove ${s.name}`}>×</button>
            </div>
          ))}
        </div>
      )}

      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={mode?.subject.one || 'Name'}
          maxLength={60}
          style={{ ...inputStyle, flex: '1 1 160px' }}
          onFocus={focusBorder}
          onBlur={blurBorder}
        />
        <input
          value={blurb}
          onChange={(e) => setBlurb(e.target.value)}
          placeholder="A line about them (optional)"
          maxLength={200}
          style={{ ...inputStyle, flex: '2 1 220px' }}
          onFocus={focusBorder}
          onBlur={blurBorder}
        />
        <button onClick={add} disabled={!name.trim() || busy} style={addStyle(!name.trim() || busy)}>
          Add
        </button>
      </div>
      {error && <p style={{ fontSize: '12.5px', color: 'var(--crimson)', marginTop: '10px' }}>{error}</p>}
    </Section>
  )
}

/* ── Clues, each pinned to the passage that gives it away ── */
function CluesEditor({ storyId, nodes, rootId, clueKinds, clues, onChange }) {
  const [draft, setDraft] = useState({ nodeId: '', label: '', detail: '', kind: 'clue', weight: 1, optional: false })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  // Passages, opening first, each shown by its first line so an author can find
  // the one they mean without leaving the panel.
  const passages = useMemo(() => {
    const list = Object.values(nodes || {})
    return list
      .map((n) => ({
        id: n._id,
        label: `${n._id === rootId ? 'Opening — ' : ''}${(n.text || '').replace(/\s+/g, ' ').trim().slice(0, 60) || '(no text)'}`,
        isRoot: n._id === rootId,
      }))
      .sort((a, b) => (b.isRoot ? 1 : 0) - (a.isRoot ? 1 : 0))
  }, [nodes, rootId])

  const byNode = useMemo(() => {
    const map = new Map(passages.map((p) => [p.id, p.label]))
    return (id) => map.get(id) || 'a passage that no longer exists'
  }, [passages])

  const add = async () => {
    if (!draft.nodeId || !draft.label.trim() || busy) return
    setBusy(true)
    setError('')
    try {
      const { data } = await api.post(`/api/games/${storyId}/clues`, {
        ...draft,
        label: draft.label.trim(),
        detail: draft.detail.trim(),
      })
      onChange([...clues, data])
      setDraft({ nodeId: '', label: '', detail: '', kind: 'clue', weight: 1, optional: false })
    } catch (err) {
      setError(err.response?.data?.message || 'Could not add that clue.')
    } finally {
      setBusy(false)
    }
  }

  const remove = async (clue) => {
    try {
      await api.delete(`/api/games/${storyId}/clues/${clue._id}`)
      onChange(clues.filter((c) => c._id !== clue._id))
    } catch (err) {
      setError(err.response?.data?.message || 'Could not remove that clue.')
    }
  }

  const required = clues.filter((c) => !c.optional).length

  return (
    <Section title="Clues">
      <p style={hintStyle}>
        A clue is filed in the reader's notes the moment they reach the passage that holds it. Mark one
        as an aside and it becomes a side discovery — worth finding, never needed to solve the case.
      </p>

      {clues.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '14px' }}>
          {clues.map((c) => (
            <div key={c._id} style={rowStyle}>
              <span style={{ flex: 1, minWidth: 0 }}>
                <span className="font-story" style={{ fontSize: '14px', color: 'var(--parchment)' }}>{c.label}</span>
                <span style={{ display: 'block', fontSize: '11.5px', color: 'rgba(var(--text-rgb),var(--ta40))', marginTop: '3px' }}>
                  {c.optional ? 'aside' : c.kind} · weight {c.weight} · {byNode(c.nodeId)}
                </span>
              </span>
              <button onClick={() => remove(c)} style={removeStyle} aria-label={`Remove ${c.label}`}>×</button>
            </div>
          ))}
          <p style={{ fontSize: '11.5px', color: 'rgba(var(--text-rgb),var(--ta35))' }}>
            {required} required, {clues.length - required}{' '}
            {clues.length - required === 1 ? 'aside' : 'asides'}.
          </p>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <select
          value={draft.nodeId}
          onChange={(e) => setDraft({ ...draft, nodeId: e.target.value })}
          style={{ ...inputStyle, cursor: 'pointer' }}
        >
          <option value="">— which passage gives this away? —</option>
          {passages.map((p) => (
            <option key={p.id} value={p.id}>{p.label}</option>
          ))}
        </select>
        <input
          value={draft.label}
          onChange={(e) => setDraft({ ...draft, label: e.target.value })}
          placeholder="The line the reader will recognise"
          maxLength={90}
          style={inputStyle}
          onFocus={focusBorder}
          onBlur={blurBorder}
        />
        <input
          value={draft.detail}
          onChange={(e) => setDraft({ ...draft, detail: e.target.value })}
          placeholder="A little more, if it needs it (optional)"
          maxLength={300}
          style={inputStyle}
          onFocus={focusBorder}
          onBlur={blurBorder}
        />
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
          <select
            value={draft.kind}
            onChange={(e) => setDraft({ ...draft, kind: e.target.value })}
            style={{ ...inputStyle, width: 'auto', cursor: 'pointer' }}
          >
            {clueKinds.map((k) => (
              <option key={k.id} value={k.id}>{k.label}</option>
            ))}
          </select>
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: 'rgba(var(--text-rgb),var(--ta55))' }}>
            Weight
            <input
              type="number"
              min="1"
              max="5"
              value={draft.weight}
              onChange={(e) => setDraft({ ...draft, weight: Number(e.target.value) })}
              style={{ ...inputStyle, width: '68px' }}
            />
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: 'rgba(var(--text-rgb),var(--ta55))' }}>
            <input
              type="checkbox"
              checked={draft.optional}
              onChange={(e) => setDraft({ ...draft, optional: e.target.checked })}
              style={{ accentColor: 'var(--gold)' }}
            />
            An aside
          </label>
          <button onClick={add} disabled={!draft.nodeId || !draft.label.trim() || busy} style={addStyle(!draft.nodeId || !draft.label.trim() || busy)}>
            Add clue
          </button>
        </div>
      </div>
      {error && <p style={{ fontSize: '12.5px', color: 'var(--crimson)', marginTop: '10px' }}>{error}</p>}
    </Section>
  )
}

/* ── The objective, the mode and the answer ── */
function GameForm({ storyId, catalog, game, subjects, clues, onSaved, onRemoved }) {
  const [form, setForm] = useState(() => ({
    mode: game?.mode || 'detective',
    objective: game?.objective || '',
    briefing: game?.briefing || '',
    solutionKind: game?.solutionKind || 'subject',
    solutionKey: game?.solutionKey || '',
    maxAttempts: game?.maxAttempts ?? 3,
    published: game?.published ?? false,
  }))
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)

  const mode = catalog.modes.find((m) => m.id === form.mode)
  const set = (patch) => { setForm((f) => ({ ...f, ...patch })); setSaved(false) }

  // Switching to a mode that can't take the current answer shape moves it to one
  // the mode does allow, rather than leaving an invalid form the server rejects.
  const chooseMode = (id) => {
    const next = catalog.modes.find((m) => m.id === id)
    const kind = next?.answerKinds.includes(form.solutionKind) ? form.solutionKind : next.answerKinds[0]
    set({ mode: id, solutionKind: kind, solutionKey: kind === form.solutionKind ? form.solutionKey : '' })
  }

  const save = async () => {
    setBusy(true)
    setError('')
    try {
      const { data } = await api.put(`/api/games/${storyId}`, form)
      onSaved(data)
      setSaved(true)
    } catch (err) {
      setError(err.response?.data?.message || 'Could not save the challenge.')
    } finally {
      setBusy(false)
    }
  }

  const remove = async () => {
    setBusy(true)
    try {
      await api.delete(`/api/games/${storyId}`)
      onRemoved()
      setForm((f) => ({ ...f, published: false }))
    } catch (err) {
      setError(err.response?.data?.message || 'Could not remove the challenge.')
    } finally {
      setBusy(false)
    }
  }

  const noRequiredClues = clues.filter((c) => !c.optional).length === 0

  return (
    <Section title="The challenge">
      <label style={labelStyle}>Kind of game</label>
      <select value={form.mode} onChange={(e) => chooseMode(e.target.value)} style={{ ...inputStyle, cursor: 'pointer' }}>
        {catalog.modes.map((m) => (
          <option key={m.id} value={m.id}>{m.label}</option>
        ))}
      </select>
      {mode && <p style={{ ...hintStyle, marginTop: '8px' }}>{mode.blurb}</p>}

      <div style={{ marginTop: '16px' }}>
        <label style={labelStyle}>Objective</label>
        <input
          value={form.objective}
          onChange={(e) => set({ objective: e.target.value })}
          placeholder={mode?.prompt || 'What is the reader working out?'}
          maxLength={200}
          style={inputStyle}
          onFocus={focusBorder}
          onBlur={blurBorder}
        />
      </div>

      <div style={{ marginTop: '16px' }}>
        <label style={labelStyle}>Briefing (optional)</label>
        <textarea
          value={form.briefing}
          onChange={(e) => set({ briefing: e.target.value })}
          placeholder="A sentence or two of setup, shown once above the opening passage."
          rows={3}
          maxLength={600}
          style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.6 }}
          onFocus={focusBorder}
          onBlur={blurBorder}
        />
      </div>

      <div style={{ marginTop: '16px' }}>
        <label style={labelStyle}>How it is answered</label>
        <div style={{ display: 'flex', gap: '18px', flexWrap: 'wrap', marginBottom: '10px' }}>
          {mode?.answerKinds.map((kind) => (
            <label key={kind} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: 'rgba(var(--text-rgb),var(--ta65))' }}>
              <input
                type="radio"
                checked={form.solutionKind === kind}
                onChange={() => set({ solutionKind: kind, solutionKey: '' })}
                style={{ accentColor: 'var(--gold)' }}
              />
              {kind === 'subject' ? `Pick a ${mode.subject.one.toLowerCase()}` : 'Type an answer'}
            </label>
          ))}
        </div>

        {form.solutionKind === 'subject' ? (
          <select value={form.solutionKey} onChange={(e) => set({ solutionKey: e.target.value })} style={{ ...inputStyle, cursor: 'pointer' }}>
            <option value="">— the answer —</option>
            {subjects.map((s) => (
              <option key={s.key} value={s.key}>{s.name}</option>
            ))}
          </select>
        ) : (
          <>
            <input
              value={form.solutionKey}
              onChange={(e) => set({ solutionKey: e.target.value })}
              placeholder="the lighthouse | tower | beacon"
              maxLength={200}
              style={inputStyle}
              onFocus={focusBorder}
              onBlur={blurBorder}
            />
            <p style={hintStyle}>
              Separate alternatives with <code>|</code>. Case, punctuation and a leading "the" are all
              ignored when a reader answers.
            </p>
          </>
        )}
      </div>

      <div style={{ marginTop: '16px', display: 'flex', gap: '20px', alignItems: 'center', flexWrap: 'wrap' }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', color: 'rgba(var(--text-rgb),var(--ta65))' }}>
          Answers allowed
          <input
            type="number"
            min="1"
            max="10"
            value={form.maxAttempts}
            onChange={(e) => set({ maxAttempts: Number(e.target.value) })}
            style={{ ...inputStyle, width: '74px' }}
          />
        </label>
        <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', color: 'rgba(var(--text-rgb),var(--ta65))' }}>
          <input
            type="checkbox"
            checked={form.published}
            onChange={(e) => set({ published: e.target.checked })}
            style={{ accentColor: 'var(--gold)' }}
          />
          Live for readers
        </label>
      </div>

      {form.published && noRequiredClues && (
        <p style={{ fontSize: '12.5px', lineHeight: 1.6, color: 'rgba(var(--text-rgb),var(--ta55))', marginTop: '14px' }}>
          There are no required clues yet, so there is nothing for a reader to discover on the way — the
          challenge will work, but it will be pure guesswork.
        </p>
      )}
      {error && <p style={{ fontSize: '13px', color: 'var(--crimson)', marginTop: '14px' }}>{error}</p>}

      <div style={{ display: 'flex', gap: '18px', alignItems: 'center', marginTop: '20px', flexWrap: 'wrap' }}>
        <button onClick={save} disabled={busy} style={addStyle(busy)}>
          {busy ? 'Saving…' : 'Save challenge'}
        </button>
        {saved && <span style={{ fontSize: '12px', color: 'var(--gold)' }}>Saved.</span>}
        {game && (
          <button onClick={remove} disabled={busy} style={{ ...removeStyle, fontSize: '11px', letterSpacing: '0.12em', textTransform: 'uppercase' }}>
            Remove the challenge
          </button>
        )}
      </div>
    </Section>
  )
}

/* ── small pieces ── */

function Section({ title, children }) {
  return (
    <section style={{ marginBottom: '28px' }}>
      <p style={{ fontSize: '10px', letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--gold)', opacity: 0.8, marginBottom: '12px' }}>
        {title}
      </p>
      {children}
    </section>
  )
}

function LiveMark() {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '10px', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--gold)' }}>
      <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--gold)' }} />
      Live
    </span>
  )
}

const panelStyle = {
  margin: '0 0 36px',
  padding: '20px 22px',
  border: '1px solid rgba(var(--panel-rgb),var(--pa08))',
  borderRadius: '8px',
  background: 'rgba(var(--panel-rgb),var(--pa02))',
}

const toggleStyle = {
  background: 'none',
  border: '1px solid rgba(var(--panel-rgb),var(--pa12))',
  color: 'rgba(var(--text-rgb),var(--ta60))',
  borderRadius: '4px',
  padding: '6px 14px',
  fontSize: '12px',
  letterSpacing: '0.05em',
  cursor: 'pointer',
  fontFamily: 'inherit',
}

const rowStyle = {
  display: 'flex',
  alignItems: 'flex-start',
  gap: '12px',
  padding: '10px 12px',
  border: '1px solid rgba(var(--panel-rgb),var(--pa08))',
  borderRadius: 'var(--r-sm)',
}

const hintStyle = {
  fontSize: '12px',
  lineHeight: 1.6,
  color: 'rgba(var(--text-rgb),var(--ta40))',
  marginBottom: '12px',
}

const addStyle = (disabled) => ({
  padding: '10px 20px',
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

const removeStyle = {
  background: 'none',
  border: 'none',
  color: 'rgba(var(--text-rgb),var(--ta35))',
  fontSize: '18px',
  lineHeight: 1,
  cursor: 'pointer',
  padding: 0,
  fontFamily: 'inherit',
}
