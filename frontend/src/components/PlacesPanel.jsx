import { useState } from 'react'
import api from '../api/client'
import { MapCanvas } from './WorldMap'
import { inputStyle, labelStyle, focusBorder, blurBorder } from './authStyles'

// The author's side of the world map: pin places onto the parchment, name
// them, move them, remove them. Readers then watch the same map light up as
// they travel. Places are held by the parent (StoryEditor) so the passage
// editor can offer them too.
export default function PlacesPanel({ storyId, places, onChange, usage = {} }) {
  const [open, setOpen] = useState(false)
  const [mode, setMode] = useState(null) // 'add' | placeId being edited | null
  const [draft, setDraft] = useState(null) // { name, blurb, x, y, _id? }
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const startAdd = () => { setMode('add'); setDraft(null); setError('') }

  const handleMapClick = ({ x, y }) => {
    if (mode === 'add' && !draft) {
      setDraft({ name: '', blurb: '', x, y })
    } else if (draft) {
      // Repositioning: while a form is open, a map click moves the pin.
      setDraft((d) => ({ ...d, x, y }))
    }
  }

  const handlePinClick = (place) => {
    setMode(place._id)
    setDraft({ ...place })
    setError('')
  }

  const cancel = () => { setMode(null); setDraft(null); setError('') }

  const save = async () => {
    if (!draft?.name.trim() || busy) return
    setBusy(true)
    setError('')
    try {
      if (mode === 'add') {
        const { data } = await api.post(`/api/stories/${storyId}/places`, draft)
        onChange([...places, data])
      } else {
        const { data } = await api.put(`/api/stories/${storyId}/places/${draft._id}`, draft)
        onChange(places.map((p) => (p._id === data._id ? data : p)))
      }
      cancel()
    } catch (err) {
      setError(err.response?.data?.message || 'Could not save the place.')
    } finally {
      setBusy(false)
    }
  }

  const remove = async () => {
    if (busy || mode === 'add') return
    setBusy(true)
    try {
      await api.delete(`/api/stories/${storyId}/places/${draft._id}`)
      onChange(places.filter((p) => p._id !== draft._id))
      cancel()
    } catch {
      setError('Could not remove the place.')
    } finally {
      setBusy(false)
    }
  }

  // Show the draft pin live on the canvas.
  const shown = draft && mode === 'add' ? [...places, { ...draft, _id: '__draft' }] : draft
    ? places.map((p) => (p._id === draft._id ? { ...draft } : p))
    : places

  return (
    <div style={{ margin: '0 0 36px', padding: '20px 22px', border: '1px solid rgba(var(--panel-rgb),var(--pa08))', borderRadius: 'var(--r-md)', background: 'rgba(var(--panel-rgb),var(--pa02))' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '12px', flexWrap: 'wrap' }}>
        <div>
          <h2 className="font-story" style={{ fontSize: '18px', fontWeight: 400, color: 'var(--parchment)' }}>
            World map
          </h2>
          <p style={{ fontSize: '12px', color: 'rgba(var(--text-rgb),var(--ta40))', marginTop: '4px' }}>
            Pin the places your story happens. Readers watch the map light up as their path reaches them.
          </p>
        </div>
        <button
          onClick={() => setOpen((v) => !v)}
          style={{ background: 'none', border: '1px solid rgba(var(--panel-rgb),var(--pa12))', color: 'rgba(var(--text-rgb),var(--ta60))', borderRadius: 'var(--r-sm)', padding: '6px 14px', fontSize: '12px', letterSpacing: '0.05em', cursor: 'pointer', fontFamily: 'inherit' }}
        >
          {open ? 'Hide' : places.length ? `Show · ${places.length}` : 'Draw it'}
        </button>
      </div>

      {open && (
        <div className="animate-fadeUp" style={{ marginTop: '20px' }}>
          <MapCanvas
            seedKey={storyId}
            places={shown}
            visited={null}
            selectedId={draft?._id}
            onMapClick={mode ? handleMapClick : null}
            onPinClick={handlePinClick}
          />

          {!mode && (
            <button
              onClick={startAdd}
              style={{ marginTop: '12px', background: 'none', border: '1px dashed rgba(var(--gold-rgb),0.35)', color: 'var(--gold)', fontSize: '11px', letterSpacing: '0.12em', textTransform: 'uppercase', cursor: 'pointer', padding: '8px 14px', borderRadius: 'var(--r-sm)' }}
            >
              ＋ Add a place
            </button>
          )}

          {mode === 'add' && !draft && (
            <p style={{ fontSize: '12.5px', color: 'var(--gold)', marginTop: '12px' }}>
              Click anywhere on the map to set the place.{' '}
              <button onClick={cancel} style={miniLink}>never mind</button>
            </p>
          )}

          {draft && (
            <div className="animate-fadeIn" style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={labelStyle}>Place name</label>
                <input
                  style={inputStyle}
                  value={draft.name}
                  maxLength={60}
                  autoFocus
                  onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
                  onFocus={focusBorder}
                  onBlur={blurBorder}
                  placeholder="The Salt Quay"
                />
              </div>
              <div>
                <label style={labelStyle}>A line about it (optional)</label>
                <input
                  style={inputStyle}
                  value={draft.blurb || ''}
                  maxLength={140}
                  onChange={(e) => setDraft((d) => ({ ...d, blurb: e.target.value }))}
                  onFocus={focusBorder}
                  onBlur={blurBorder}
                  placeholder="Where the ferry waits"
                />
              </div>
              <p style={{ fontSize: '11.5px', color: 'rgba(var(--text-rgb),var(--ta40))' }}>
                Click the map again to move the pin.
              </p>
              {error && <p style={{ fontSize: '12.5px', color: 'var(--crimson)' }}>{error}</p>}
              <div style={{ display: 'flex', gap: '14px', alignItems: 'center' }}>
                <button
                  onClick={save}
                  disabled={!draft.name.trim() || busy}
                  style={{ padding: '9px 20px', background: 'var(--gold-solid)', color: 'var(--on-gold)', border: 'none', fontSize: '11px', fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', borderRadius: 'var(--r-sm)', cursor: draft.name.trim() && !busy ? 'pointer' : 'not-allowed', opacity: draft.name.trim() && !busy ? 1 : 0.5 }}
                >
                  {busy ? 'Saving…' : mode === 'add' ? 'Pin it' : 'Save place'}
                </button>
                {mode !== 'add' && (
                  <button onClick={remove} disabled={busy} style={{ ...miniLink, color: 'var(--crimson)' }}>
                    remove
                  </button>
                )}
                <button onClick={cancel} style={miniLink}>cancel</button>
              </div>
            </div>
          )}

          {places.length > 0 && (
            <div style={{ marginTop: '18px', paddingTop: '14px', borderTop: '1px solid rgba(var(--panel-rgb),var(--pa06))' }}>
              {places.map((p) => {
                const n = usage[p._id] || 0
                return (
                  <div key={p._id} style={{ display: 'flex', alignItems: 'baseline', gap: '10px', padding: '5px 0' }}>
                    <button onClick={() => handlePinClick(p)} className="font-story" style={{ ...miniLink, textTransform: 'none', letterSpacing: 0, fontSize: '14px', color: 'rgba(var(--text-rgb),var(--ta75))' }}>
                      {p.name}
                    </button>
                    <span style={{ fontSize: '11px', letterSpacing: '0.08em', textTransform: 'uppercase', color: n ? 'rgba(var(--text-rgb),var(--ta35))' : 'var(--gold)' }}>
                      {n ? `${n} ${n === 1 ? 'passage' : 'passages'}` : 'no passage yet — readers can’t reach it'}
                    </span>
                  </div>
                )
              })}
            </div>
          )}

          <p style={{ fontSize: '11.5px', color: 'rgba(var(--text-rgb),var(--ta35))', marginTop: '14px' }}>
            Then pin each passage to a place while editing it — that's how the reader's map knows where they are.
            A passage you leave unpinned keeps the last place the reader reached.
          </p>
        </div>
      )}
    </div>
  )
}

const miniLink = {
  background: 'none',
  border: 'none',
  padding: 0,
  cursor: 'pointer',
  fontFamily: 'inherit',
  fontSize: '11px',
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
  color: 'rgba(var(--text-rgb),var(--ta50))',
}
