import { cloneElement, useId } from 'react'
import { AlertIcon } from './Icon'

// A labelled form control.
//
// The app had forty <label> elements and not one of them carried htmlFor, and
// forty-six inputs with no aria-label — so every field in the product, from the
// sign-in form to the story editor, announced itself to a screen reader as
// "edit text, blank". The fix has to be structural rather than a pass of manual
// id attributes, because a manual pass only holds until the next form is added.
//
// Field generates the id, wires it to the label, and attaches the hint and error
// through aria-describedby / aria-errormessage. A field written through this
// component cannot be unlabelled.
//
//   <Field label="Email" required error={errors.email} hint="We never share it.">
//     <input type="email" value={v} onChange={...} />
//   </Field>

export default function Field({
  label,
  hint,
  error,
  required = false,
  className = '',
  children,
  ...rest
}) {
  const id = useId()
  const hintId = `${id}-hint`
  const errorId = `${id}-error`

  // Only describe what is actually on screen — pointing aria-describedby at an
  // element that isn't rendered leaves the control describing nothing.
  const describedBy = [hint ? hintId : null, error ? errorId : null]
    .filter(Boolean).join(' ') || undefined

  const control = cloneElement(children, {
    id,
    required: required || children.props.required,
    'aria-describedby': describedBy,
    'aria-invalid': error ? true : undefined,
    className: [children.props.className || 'ct-input', error ? 'ct-input--invalid' : '']
      .filter(Boolean).join(' '),
  })

  return (
    <div className={`ct-field ${className}`} {...rest}>
      {label && (
        <label htmlFor={id} className="ct-label">
          {label}
          {/* The asterisk is decorative; the word is what gets read out. The
              input's own `required` is what assistive tech actually reports. */}
          {required && (
            <span className="ct-label__req" aria-hidden="true">*</span>
          )}
          {required && <span className="sr-only"> (required)</span>}
        </label>
      )}

      {control}

      {hint && <p id={hintId} className="ct-hint">{hint}</p>}

      {/* role="alert" so a validation failure is spoken when it appears, rather
          than sitting silently under a field the reader has already left. */}
      {error && (
        <p id={errorId} className="ct-error" role="alert">
          <AlertIcon size={14} />
          <span>{error}</span>
        </p>
      )}
    </div>
  )
}
