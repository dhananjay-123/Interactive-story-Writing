// `pending` is the choice the reader just took, while its passage is still on
// the wire. It stays lit while the others dim, so a slow response reads as the
// story turning rather than as nothing having happened.
//
// The lit state used to be a useState(hovered) here. That meant the choice a
// keyboard reader had focused looked identical to the three they hadn't — on
// the one screen where the whole interaction is choosing between them. It's CSS
// now: :hover and :focus-visible both light the card, and `pending` pins it lit
// through the wait.

export default function ChoiceCard({ choice, index, onSelect, disabled, pending, unwritten }) {
  const letter = String.fromCharCode(65 + index)

  return (
    <button
      onClick={() => !disabled && onSelect(choice, index)}
      disabled={disabled}
      aria-busy={pending || undefined}
      className={`animate-fadeUp choice-card${pending ? ' is-pending' : ''}`}
      style={{ animationDelay: `${index * 0.1}s` }}
    >
      <span className="font-story choice-card__letter" aria-hidden="true">{letter}.</span>

      <span className="choice-card__text">{choice.text}</span>

      {pending && (
        <span className="choice-card__status">Turning the page…</span>
      )}

      {unwritten && !pending && (
        <span className="choice-card__unwritten">
          Write →
          {/* The arrow reads as decoration; the intent needs saying. */}
          <span className="sr-only"> — this branch has not been written yet</span>
        </span>
      )}
    </button>
  )
}
