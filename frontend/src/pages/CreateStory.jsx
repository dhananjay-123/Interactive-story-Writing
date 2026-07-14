import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../api/client'
import { useAuth } from '../context/AuthContext'
import RichTextEditor from '../components/RichTextEditor'
import SparkPanel from '../components/SparkPanel'

const GENRES = ['fantasy', 'mystery', 'sci_fi', 'romance', 'horror', 'thriller', 'literary']

export default function CreateStory() {
  const navigate = useNavigate()
  const { user, loading } = useAuth()
  const [step, setStep] = useState(1)
  const [form, setForm] = useState({
    title: '',
    description: '',
    genre: '',
    tags: [],
    openingText: '',
    openingContent: null,
    openingEmpty: true,
    choices: [{ text: '' }, { text: '' }],
  })
  const [tagInput, setTagInput] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const addTag = (raw) => {
    const tag = raw.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
    if (!tag || tag.length > 24) return
    setForm((f) => (f.tags.includes(tag) || f.tags.length >= 6 ? f : { ...f, tags: [...f.tags, tag] }))
    setTagInput('')
  }

  const onTagKey = (e) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      addTag(tagInput)
    } else if (e.key === 'Backspace' && !tagInput && form.tags.length) {
      setForm((f) => ({ ...f, tags: f.tags.slice(0, -1) }))
    }
  }

  const removeTag = (t) => setForm((f) => ({ ...f, tags: f.tags.filter((x) => x !== t) }))

  // Writing requires an account — send guests to sign in first.
  useEffect(() => {
    if (!loading && !user) {
      navigate('/login', { replace: true, state: { from: '/create' } })
    }
  }, [loading, user, navigate])

  const update = (field, value) => setForm(f => ({ ...f, [field]: value }))

  const updateChoice = (i, val) => {
    const choices = [...form.choices]
    choices[i] = { text: val }
    setForm(f => ({ ...f, choices }))
  }

  const addChoice = () => {
    if (form.choices.length >= 4) return
    setForm(f => ({ ...f, choices: [...f.choices, { text: '' }] }))
  }

  const removeChoice = (i) => {
    if (form.choices.length <= 2) return
    setForm(f => ({ ...f, choices: f.choices.filter((_, idx) => idx !== i) }))
  }

  const canProceed = () => {
    if (step === 1) return form.title.trim() && form.genre
    if (step === 2) return form.description.trim() && !form.openingEmpty
    if (step === 3) return form.choices.every(c => c.text.trim())
    return true
  }

  const handleSubmit = async () => {
    setSubmitting(true)
    setError('')
    try {
      const res = await api.post('/api/stories', form)
      // Straight into the story map so the author can build out the branches.
      navigate(`/story/${res.data._id}/edit`)
    } catch (err) {
      setError(err.response?.data?.message || 'Could not publish. Please try again.')
      setSubmitting(false)
    }
  }

  const inputStyle = {
    width: '100%',
    background: 'rgba(var(--panel-rgb),var(--pa04))',
    border: '1px solid rgba(var(--panel-rgb),var(--pa10))',
    borderRadius: '4px',
    padding: '12px 16px',
    color: 'var(--parchment)',
    fontSize: '15px',
    outline: 'none',
    transition: 'border-color 0.2s ease',
    fontFamily: 'inherit',
  }

  const labelStyle = {
    display: 'block',
    fontSize: '11px',
    letterSpacing: '0.15em',
    textTransform: 'uppercase',
    color: 'rgba(var(--text-rgb),var(--ta40))',
    marginBottom: '8px',
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--ink)', paddingTop: '100px' }}>
      <div style={{ maxWidth: '680px', margin: '0 auto', padding: '0 24px 100px' }}>

        <div className="animate-fadeUp mb-12">
          <p style={{ fontSize: '10px', letterSpacing: '0.25em', color: 'var(--gold)', textTransform: 'uppercase', marginBottom: '12px', opacity: 0.7 }}>
            New story
          </p>
          <h1 className="font-story" style={{ fontSize: 'clamp(28px, 4vw, 42px)', fontWeight: 400, color: 'var(--parchment)', letterSpacing: '-0.01em' }}>
            Tell your story
          </h1>
        </div>

        {/* Step indicator */}
        <div className="animate-fadeIn delay-100 flex gap-3 mb-12">
          {[1, 2, 3].map(s => (
            <div key={s} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div
                style={{
                  width: '24px',
                  height: '24px',
                  borderRadius: '50%',
                  border: `1px solid ${step >= s ? 'var(--gold)' : 'rgba(var(--panel-rgb),var(--pa12))'}`,
                  background: step > s ? 'rgba(var(--gold-rgb),0.2)' : 'transparent',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '11px',
                  color: step >= s ? 'var(--gold)' : 'rgba(var(--panel-rgb),var(--pa30))',
                  transition: 'all 0.3s ease',
                }}
              >
                {step > s ? '✓' : s}
              </div>
              <span style={{ fontSize: '11px', letterSpacing: '0.1em', textTransform: 'uppercase', color: step === s ? 'var(--parchment)' : 'rgba(var(--panel-rgb),var(--pa25))', transition: 'color 0.3s ease' }}>
                {['Details', 'Content', 'Choices'][s - 1]}
              </span>
              {s < 3 && <div style={{ width: '32px', height: '1px', background: step > s ? 'rgba(var(--gold-rgb),0.3)' : 'rgba(var(--panel-rgb),var(--pa08))', marginLeft: '4px', transition: 'background 0.3s ease' }} />}
            </div>
          ))}
        </div>

        <div className="animate-pageFlip">
          {step === 1 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              <div>
                <label style={labelStyle}>Title</label>
                <input
                  style={inputStyle}
                  placeholder="What is your story called?"
                  value={form.title}
                  onChange={e => update('title', e.target.value)}
                  onFocus={e => e.target.style.borderColor = 'rgba(var(--gold-rgb),0.4)'}
                  onBlur={e => e.target.style.borderColor = 'rgba(var(--panel-rgb),var(--pa10))'}
                />
              </div>

              <div>
                <label style={labelStyle}>Genre</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {GENRES.map(g => (
                    <button
                      key={g}
                      onClick={() => update('genre', g)}
                      style={{
                        padding: '8px 16px',
                        fontSize: '12px',
                        letterSpacing: '0.08em',
                        border: `1px solid ${form.genre === g ? 'var(--gold)' : 'rgba(var(--panel-rgb),var(--pa10))'}`,
                        background: form.genre === g ? 'rgba(var(--gold-rgb),0.12)' : 'transparent',
                        color: form.genre === g ? 'var(--gold)' : 'rgba(var(--text-rgb),var(--ta50))',
                        cursor: 'pointer',
                        borderRadius: '4px',
                        transition: 'all 0.2s ease',
                        textTransform: 'capitalize',
                      }}
                    >
                      {g.replace('_', '-')}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label style={labelStyle}>Tags <span style={{ textTransform: 'none', letterSpacing: 0, color: 'rgba(var(--text-rgb),var(--ta25))' }}>— up to 6, help readers find you</span></label>
                <div
                  style={{ ...inputStyle, display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center', cursor: 'text' }}
                  onClick={(e) => e.currentTarget.querySelector('input')?.focus()}
                >
                  {form.tags.map((t) => (
                    <span key={t} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '3px 8px', fontSize: '12px', borderRadius: '4px', background: 'rgba(var(--gold-rgb),0.12)', color: 'var(--gold)', border: '1px solid rgba(var(--gold-rgb),0.3)' }}>
                      #{t}
                      <button type="button" onClick={() => removeTag(t)} style={{ background: 'none', border: 'none', color: 'var(--gold)', cursor: 'pointer', padding: 0, fontSize: '14px', lineHeight: 1 }}>×</button>
                    </span>
                  ))}
                  {form.tags.length < 6 && (
                    <input
                      value={tagInput}
                      onChange={(e) => setTagInput(e.target.value)}
                      onKeyDown={onTagKey}
                      onBlur={() => tagInput && addTag(tagInput)}
                      placeholder={form.tags.length ? 'Add another…' : 'e.g. dragons, slow-burn, heist'}
                      style={{ flex: 1, minWidth: '140px', background: 'transparent', border: 'none', outline: 'none', color: 'var(--parchment)', fontSize: '14px', fontFamily: 'inherit' }}
                    />
                  )}
                </div>
                <p style={{ fontSize: '11px', color: 'rgba(var(--text-rgb),var(--ta25))', marginTop: '8px' }}>
                  Press Enter or comma to add each tag.
                </p>
              </div>

              <SparkPanel genre={form.genre} />
            </div>
          )}

          {step === 2 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              <div>
                <label style={labelStyle}>Short description</label>
                <textarea
                  style={{ ...inputStyle, resize: 'vertical', minHeight: '80px' }}
                  placeholder="A few sentences to hook the reader..."
                  value={form.description}
                  onChange={e => update('description', e.target.value)}
                  onFocus={e => e.target.style.borderColor = 'rgba(var(--gold-rgb),0.4)'}
                  onBlur={e => e.target.style.borderColor = 'rgba(var(--panel-rgb),var(--pa10))'}
                />
              </div>

              <div>
                <label style={labelStyle}>Opening passage</label>
                <RichTextEditor
                  initialContent={form.openingContent || undefined}
                  placeholder="Begin your story here. Set the scene. End at a moment of decision..."
                  minHeight="220px"
                  onUpdate={ed => setForm(f => ({
                    ...f,
                    openingText: ed.getText(),
                    openingContent: ed.getJSON(),
                    openingEmpty: ed.isEmpty,
                  }))}
                />
                <p style={{ fontSize: '11px', color: 'rgba(var(--text-rgb),var(--ta25))', marginTop: '8px' }}>
                  {form.openingText.trim().length} characters
                </p>
              </div>
            </div>
          )}

          {step === 3 && (
            <div>
              <p style={{ fontSize: '14px', color: 'rgba(var(--text-rgb),var(--ta50))', marginBottom: '24px', lineHeight: 1.6 }}>
                Write 2–4 choices that readers can make at the end of your opening passage.
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '20px' }}>
                {form.choices.map((choice, i) => (
                  <div key={i} style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                    <span
                      className="font-story"
                      style={{ color: 'var(--gold)', opacity: 0.7, fontSize: '16px', marginTop: '12px', minWidth: '20px' }}
                    >
                      {String.fromCharCode(65 + i)}.
                    </span>
                    <input
                      style={{ ...inputStyle, flex: 1 }}
                      placeholder={`Choice ${String.fromCharCode(65 + i)}`}
                      value={choice.text}
                      onChange={e => updateChoice(i, e.target.value)}
                      onFocus={e => e.target.style.borderColor = 'rgba(var(--gold-rgb),0.4)'}
                      onBlur={e => e.target.style.borderColor = 'rgba(var(--panel-rgb),var(--pa10))'}
                    />
                    {form.choices.length > 2 && (
                      <button
                        onClick={() => removeChoice(i)}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: 'rgba(var(--text-rgb),var(--ta25))',
                          cursor: 'pointer',
                          fontSize: '16px',
                          marginTop: '10px',
                          transition: 'color 0.2s ease',
                        }}
                        onMouseEnter={e => e.currentTarget.style.color = 'var(--crimson)'}
                        onMouseLeave={e => e.currentTarget.style.color = 'rgba(var(--text-rgb),var(--ta25))'}
                      >
                        ×
                      </button>
                    )}
                  </div>
                ))}
              </div>

              {form.choices.length < 4 && (
                <button
                  onClick={addChoice}
                  style={{
                    background: 'none',
                    border: '1px dashed rgba(var(--panel-rgb),var(--pa12))',
                    color: 'rgba(var(--text-rgb),var(--ta35))',
                    fontSize: '12px',
                    letterSpacing: '0.1em',
                    textTransform: 'uppercase',
                    cursor: 'pointer',
                    padding: '10px 20px',
                    borderRadius: '4px',
                    transition: 'all 0.2s ease',
                    width: '100%',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(var(--gold-rgb),0.3)'; e.currentTarget.style.color = 'var(--gold)' }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(var(--panel-rgb),var(--pa12))'; e.currentTarget.style.color = 'rgba(var(--text-rgb),var(--ta35))' }}
                >
                  + Add choice
                </button>
              )}
            </div>
          )}
        </div>

        {/* Navigation */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '40px' }}>
          <button
            onClick={() => step > 1 && setStep(s => s - 1)}
            style={{
              background: 'none',
              border: 'none',
              color: step > 1 ? 'rgba(var(--text-rgb),var(--ta40))' : 'transparent',
              fontSize: '12px',
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              cursor: step > 1 ? 'pointer' : 'default',
              padding: 0,
              transition: 'color 0.2s ease',
            }}
            onMouseEnter={e => step > 1 && (e.currentTarget.style.color = 'var(--parchment)')}
            onMouseLeave={e => (e.currentTarget.style.color = 'rgba(var(--text-rgb),var(--ta40))')}
          >
            ← Back
          </button>

          {error && <p style={{ fontSize: '13px', color: 'var(--crimson)' }}>{error}</p>}

          {step < 3 ? (
            <button
              onClick={() => canProceed() && setStep(s => s + 1)}
              disabled={!canProceed()}
              style={{
                padding: '12px 32px',
                background: canProceed() ? 'var(--gold)' : 'rgba(var(--gold-rgb),0.2)',
                color: canProceed() ? 'var(--on-gold)' : 'rgba(var(--text-rgb),var(--ta30))',
                border: 'none',
                fontSize: '12px',
                fontWeight: 600,
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
                cursor: canProceed() ? 'pointer' : 'not-allowed',
                borderRadius: '4px',
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={e => canProceed() && (e.currentTarget.style.background = 'var(--gold-dark)')}
              onMouseLeave={e => canProceed() && (e.currentTarget.style.background = 'var(--gold)')}
            >
              Next →
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={!canProceed() || submitting}
              style={{
                padding: '12px 32px',
                background: canProceed() ? 'var(--gold)' : 'rgba(var(--gold-rgb),0.2)',
                color: canProceed() ? 'var(--on-gold)' : 'rgba(var(--text-rgb),var(--ta30))',
                border: 'none',
                fontSize: '12px',
                fontWeight: 600,
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
                cursor: canProceed() && !submitting ? 'pointer' : 'not-allowed',
                borderRadius: '4px',
                transition: 'all 0.2s ease',
              }}
            >
              {submitting ? 'Publishing...' : 'Publish'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
