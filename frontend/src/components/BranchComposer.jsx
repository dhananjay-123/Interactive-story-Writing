import { useState } from 'react'
import api from '../api/client'
import { inputStyle, labelStyle, focusBorder, blurBorder } from './authStyles'

// Inline editor for writing a new passage at the end of an unwritten choice.
// Used by both the reader (write-as-you-read) and the story map editor.
export default function BranchComposer({ storyId, parentNodeId, choiceIndex, choiceText, onCancel, onDone, compact }) {
  const [text, setText] = useState('')
  const [choices, setChoices] = useState(['', ''])
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const setChoice = (i, v) => setChoices((c) => c.map((x, idx) => (idx === i ? v : x)))
  const addChoice = () => setChoices((c) => (c.length >= 4 ? c : [...c, '']))
  const removeChoice = (i) => setChoices((c) => c.filter((_, idx) => idx !== i))

  const filledChoices = choices.map((c) => c.trim()).filter(Boolean)
  const canSubmit = text.trim().length > 0 && !submitting

  const submit = async () => {
    if (!canSubmit) return
    setSubmitting(true)
    setError('')
    try {
      const { data: newNode } = await api.post('/api/nodes', {
        storyId,
        text: text.trim(),
        choices: filledChoices.map((t) => ({ text: t })),
        parentNodeId,
        choiceIndex,
      })
      onDone(newNode)
    } catch (err) {
      setError(err.response?.data?.message || 'Could not save this passage.')
      setSubmitting(false)
    }
  }

  return (
    <div className="animate-fadeIn">
      <p style={{ fontSize: '11px', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'rgba(var(--gold-rgb),0.6)', marginBottom: '6px' }}>
        Continue this path
      </p>
      {choiceText && (
        <p style={{ fontSize: '14px', color: 'rgba(var(--text-rgb),var(--ta50))', marginBottom: '18px', fontStyle: 'italic' }}>
          “{choiceText}”
        </p>
      )}

      <label style={labelStyle}>What happens next</label>
      <textarea
        style={{ ...inputStyle, resize: 'vertical', minHeight: compact ? '120px' : '180px', fontFamily: 'Georgia, serif', lineHeight: 1.7 }}
        placeholder="Write the next passage. End at a decision, or leave no choices to make this an ending…"
        value={text}
        onChange={(e) => setText(e.target.value)}
        onFocus={focusBorder}
        onBlur={blurBorder}
      />

      <div style={{ marginTop: '20px' }}>
        <label style={labelStyle}>Choices from here (leave empty to end the story)</label>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {choices.map((c, i) => (
            <div key={i} style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
              <span className="font-story" style={{ color: 'var(--gold)', opacity: 0.7, minWidth: '18px' }}>
                {String.fromCharCode(65 + i)}.
              </span>
              <input
                style={{ ...inputStyle, flex: 1 }}
                placeholder={`Choice ${String.fromCharCode(65 + i)}`}
                value={c}
                onChange={(e) => setChoice(i, e.target.value)}
                onFocus={focusBorder}
                onBlur={blurBorder}
              />
              {choices.length > 1 && (
                <button onClick={() => removeChoice(i)} aria-label="Remove choice"
                  style={{ background: 'none', border: 'none', color: 'rgba(var(--text-rgb),var(--ta30))', cursor: 'pointer', fontSize: '18px' }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--crimson)')}
                  onMouseLeave={(e) => (e.currentTarget.style.color = 'rgba(var(--text-rgb),var(--ta30))')}
                >×</button>
              )}
            </div>
          ))}
        </div>
        {choices.length < 4 && (
          <button onClick={addChoice}
            style={{ marginTop: '10px', background: 'none', border: '1px dashed rgba(var(--panel-rgb),var(--pa15))', color: 'rgba(var(--text-rgb),var(--ta40))', fontSize: '12px', letterSpacing: '0.1em', textTransform: 'uppercase', cursor: 'pointer', padding: '9px 18px', borderRadius: '3px' }}
          >+ Add choice</button>
        )}
      </div>

      {error && <p style={{ fontSize: '13px', color: 'var(--crimson)', marginTop: '16px' }}>{error}</p>}

      <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginTop: '24px' }}>
        <button onClick={submit} disabled={!canSubmit}
          style={{ padding: '11px 26px', background: 'var(--gold)', color: 'var(--on-gold)', border: 'none', fontSize: '12px', fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', borderRadius: '3px', cursor: canSubmit ? 'pointer' : 'not-allowed', opacity: canSubmit ? 1 : 0.5 }}
        >
          {submitting ? 'Saving…' : filledChoices.length ? 'Add passage' : 'Add ending'}
        </button>
        <button onClick={onCancel}
          style={{ background: 'none', border: 'none', color: 'rgba(var(--text-rgb),var(--ta35))', fontSize: '12px', letterSpacing: '0.15em', textTransform: 'uppercase', cursor: 'pointer', padding: 0, fontFamily: 'inherit', transition: 'color 0.2s ease' }}
          onMouseEnter={(e) => (e.currentTarget.style.color = 'rgba(var(--text-rgb),var(--ta60))')}
          onMouseLeave={(e) => (e.currentTarget.style.color = 'rgba(var(--text-rgb),var(--ta35))')}
        >
          Cancel
        </button>
      </div>
    </div>
  )
}
