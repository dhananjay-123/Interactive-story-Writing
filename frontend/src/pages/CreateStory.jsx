import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../api/client'
import { useAuth } from '../context/AuthContext'
import RichTextEditor from '../components/RichTextEditor'
import SparkPanel from '../components/SparkPanel'
import { Button, Field, GENRE_LABELS, CloseIcon, useToast } from '../components/ui'

const GENRES = ['fantasy', 'mystery', 'sci_fi', 'romance', 'horror', 'thriller', 'literary']
const STEPS = ['Details', 'Content', 'Choices']

// A three-step wizard. What changed:
//
//  • Every control is labelled. The genre row is a radiogroup rather than seven
//    unrelated buttons, and the tag box — which is a div dressed as an input —
//    now says so with a group role and an owned text field.
//  • "Next" no longer sits greyed out with no explanation. It stays live, and
//    pressing it on an incomplete step points at what's missing.
//  • The step indicator reports progress ("Step 2 of 3") instead of being three
//    decorative circles.

export default function CreateStory() {
  const navigate = useNavigate()
  const { user, loading } = useAuth()
  const toast = useToast()
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
  const [errors, setErrors] = useState({})

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

  const update = (field, value) => {
    setForm((f) => ({ ...f, [field]: value }))
    if (errors[field]) setErrors((e) => ({ ...e, [field]: undefined }))
  }

  const updateChoice = (i, val) => {
    const choices = [...form.choices]
    choices[i] = { text: val }
    setForm((f) => ({ ...f, choices }))
    if (errors.choices) setErrors((e) => ({ ...e, choices: undefined }))
  }

  const addChoice = () => {
    if (form.choices.length >= 4) return
    setForm((f) => ({ ...f, choices: [...f.choices, { text: '' }] }))
  }

  const removeChoice = (i) => {
    if (form.choices.length <= 2) return
    setForm((f) => ({ ...f, choices: f.choices.filter((_, idx) => idx !== i) }))
  }

  // Returns the problems on the current step, keyed by field.
  const problemsOn = (which) => {
    const found = {}
    if (which === 1) {
      if (!form.title.trim()) found.title = 'Your story needs a title.'
      if (!form.genre) found.genre = 'Pick a genre so readers can find it.'
    }
    if (which === 2) {
      if (!form.description.trim()) found.description = 'A short description is what readers see on the shelf.'
      if (form.openingEmpty) found.opening = 'Write the opening passage before moving on.'
    }
    if (which === 3) {
      if (!form.choices.every((c) => c.text.trim())) found.choices = 'Every choice needs text — or remove the empty one.'
    }
    return found
  }

  const goNext = () => {
    const found = problemsOn(step)
    if (Object.keys(found).length) { setErrors(found); return }
    setErrors({})
    setStep((s) => s + 1)
  }

  const handleSubmit = async () => {
    const found = problemsOn(3)
    if (Object.keys(found).length) { setErrors(found); return }

    setSubmitting(true)
    setErrors({})
    try {
      const res = await api.post('/api/stories', form)
      toast.success('Your story is live. Now build out the branches.')
      // Straight into the story map so the author can build out the branches.
      navigate(`/story/${res.data._id}/edit`)
    } catch (err) {
      const message = err.response?.data?.message || 'Could not publish. Please try again.'
      setErrors({ form: message })
      toast.error(message)
      setSubmitting(false)
    }
  }

  return (
    <div className="page-shell">
      <div className="page-shell__inner page-shell__inner--form">

        <div className="animate-fadeUp page-head">
          <p className="eyebrow">New story</p>
          <h1 className="font-story page-title">Tell your story</h1>
        </div>

        {/* Progress. The visible circles are decorative; the sentence beside
            them is what a screen reader actually reports. */}
        <div className="animate-fadeIn delay-100 wizard-steps">
          <p className="sr-only" aria-live="polite">
            Step {step} of {STEPS.length}: {STEPS[step - 1]}
          </p>
          {STEPS.map((labelText, idx) => {
            const s = idx + 1
            return (
              <div key={labelText} className="wizard-step" aria-hidden="true">
                <span className={`wizard-step__dot${step >= s ? ' is-reached' : ''}${step > s ? ' is-done' : ''}`}>
                  {step > s ? '✓' : s}
                </span>
                <span className={`wizard-step__label${step === s ? ' is-current' : ''}`}>{labelText}</span>
                {s < STEPS.length && <span className={`wizard-step__rule${step > s ? ' is-done' : ''}`} />}
              </div>
            )
          })}
        </div>

        <div className="animate-pageFlip">
          {step === 1 && (
            <div className="wizard-panel">
              <Field label="Title" error={errors.title} required>
                <input
                  placeholder="What is your story called?"
                  value={form.title}
                  onChange={(e) => update('title', e.target.value)}
                />
              </Field>

              {/* A single choice out of seven — that's a radiogroup, and saying
                  so is what lets a screen-reader user arrow through it. */}
              <fieldset className="wizard-fieldset">
                <legend className="ct-label">
                  Genre<span className="ct-label__req" aria-hidden="true">*</span>
                  <span className="sr-only"> (required)</span>
                </legend>
                <div className="wizard-chips" role="radiogroup" aria-label="Genre">
                  {GENRES.map((g) => (
                    <button
                      key={g}
                      type="button"
                      role="radio"
                      aria-checked={form.genre === g}
                      onClick={() => update('genre', g)}
                      className="ct-chip"
                      data-selected={form.genre === g || undefined}
                    >
                      {GENRE_LABELS[g]}
                    </button>
                  ))}
                </div>
                {errors.genre && (
                  <p className="ct-error" role="alert"><span>{errors.genre}</span></p>
                )}
              </fieldset>

              <Field
                label="Tags"
                hint="Up to 6. Press Enter or comma to add each one — they help readers find you."
              >
                {/* The visible box is a div, so the real input inside it carries
                    the id and the label points at that. Clicking anywhere in the
                    box focuses it, the way a native field behaves. */}
                <div
                  className="tag-box"
                  onClick={(e) => e.currentTarget.querySelector('input')?.focus()}
                >
                  {form.tags.map((t) => (
                    <span key={t} className="tag-chip">
                      #{t}
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); removeTag(t) }}
                        aria-label={`Remove tag ${t}`}
                        className="tag-chip__remove"
                      >
                        <CloseIcon size={11} />
                      </button>
                    </span>
                  ))}
                  {form.tags.length < 6 && (
                    <input
                      className="tag-box__input"
                      value={tagInput}
                      onChange={(e) => setTagInput(e.target.value)}
                      onKeyDown={onTagKey}
                      onBlur={() => tagInput && addTag(tagInput)}
                      placeholder={form.tags.length ? 'Add another…' : 'e.g. dragons, slow-burn, heist'}
                    />
                  )}
                </div>
              </Field>

              <SparkPanel genre={form.genre} />
            </div>
          )}

          {step === 2 && (
            <div className="wizard-panel">
              <Field label="Short description" error={errors.description} required>
                <textarea
                  placeholder="A few sentences to hook the reader..."
                  value={form.description}
                  onChange={(e) => update('description', e.target.value)}
                />
              </Field>

              <div className="ct-field">
                <span className="ct-label" id="opening-label">
                  Opening passage<span className="ct-label__req" aria-hidden="true">*</span>
                  <span className="sr-only"> (required)</span>
                </span>
                <RichTextEditor
                  initialContent={form.openingContent || undefined}
                  placeholder="Begin your story here. Set the scene. End at a moment of decision..."
                  minHeight="220px"
                  aria-labelledby="opening-label"
                  onUpdate={(ed) => setForm((f) => ({
                    ...f,
                    openingText: ed.getText(),
                    openingContent: ed.getJSON(),
                    openingEmpty: ed.isEmpty,
                  }))}
                />
                <p className="ct-hint" aria-live="polite">
                  {form.openingText.trim().length} characters
                </p>
                {errors.opening && (
                  <p className="ct-error" role="alert"><span>{errors.opening}</span></p>
                )}
              </div>
            </div>
          )}

          {step === 3 && (
            <div>
              <p className="wizard-intro">
                Write 2–4 choices that readers can make at the end of your opening passage.
              </p>

              <div className="choice-rows">
                {form.choices.map((choice, i) => {
                  const letter = String.fromCharCode(65 + i)
                  return (
                    <div key={i} className="choice-row">
                      <span className="font-story choice-row__letter" aria-hidden="true">{letter}.</span>
                      <input
                        className="ct-input"
                        aria-label={`Choice ${letter}`}
                        placeholder={`Choice ${letter}`}
                        value={choice.text}
                        onChange={(e) => updateChoice(i, e.target.value)}
                      />
                      {form.choices.length > 2 && (
                        <button
                          type="button"
                          onClick={() => removeChoice(i)}
                          aria-label={`Remove choice ${letter}`}
                          className="choice-row__remove tap-target"
                        >
                          <CloseIcon size={14} />
                        </button>
                      )}
                    </div>
                  )
                })}
              </div>

              {errors.choices && (
                <p className="ct-error" role="alert"><span>{errors.choices}</span></p>
              )}

              {form.choices.length < 4 && (
                <button type="button" onClick={addChoice} className="add-choice">
                  + Add choice
                </button>
              )}
            </div>
          )}
        </div>

        <div className="wizard-nav">
          {step > 1 ? (
            <Button variant="ghost" onClick={() => setStep((s) => s - 1)}>← Back</Button>
          ) : <span />}

          <div className="wizard-nav__end">
            {errors.form && (
              <p className="ct-error" role="alert"><span>{errors.form}</span></p>
            )}
            {step < STEPS.length ? (
              <Button variant="primary" onClick={goNext}>Next →</Button>
            ) : (
              <Button variant="primary" onClick={handleSubmit} disabled={submitting}>
                {submitting ? 'Publishing…' : 'Publish'}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
