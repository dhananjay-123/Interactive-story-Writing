import { Link } from 'react-router-dom'

// The one button in the app.
//
// Before this, every button re-declared its own padding, font size, letter
// spacing and hover handler — which is why the same "primary" action came out
// at 13px in one place and 14px in another. All of that now lives in .ct-btn
// and its modifiers, and hover/active are CSS, so no button re-renders on
// mouse-over and every one of them responds to keyboard focus.
//
// Renders a <button>, a router <Link> (pass `to`) or an <a> (pass `href`),
// because a navigation dressed as a button must still be a real link —
// middle-click, copy-address and screen-reader semantics all depend on it.

const VARIANTS = ['primary', 'secondary', 'ghost', 'danger', 'danger-solid']

export default function Button({
  variant = 'secondary',
  size,
  block = false,
  to,
  href,
  className = '',
  children,
  ...rest
}) {
  const v = VARIANTS.includes(variant) ? variant : 'secondary'
  const classes = [
    'ct-btn',
    `ct-btn--${v}`,
    size ? `ct-btn--${size}` : '',
    block ? 'ct-btn--block' : '',
    className,
  ].filter(Boolean).join(' ')

  if (to) {
    return <Link to={to} className={classes} {...rest}>{children}</Link>
  }
  if (href) {
    return <a href={href} className={classes} {...rest}>{children}</a>
  }
  // Default to type="button": an unmarked button inside a form submits it, which
  // has caused more than one accidental save.
  return <button type={rest.type || 'button'} className={classes} {...rest}>{children}</button>
}

// An icon-only control. `label` is required rather than optional — a bare glyph
// with no accessible name is invisible to a screen reader, and making the prop
// mandatory is the only reliable way to stop that happening.
export function IconButton({ label, active, className = '', children, ...rest }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      aria-pressed={active}
      className={`ct-icon-btn tap-target ${className}`}
      {...rest}
    >
      {children}
    </button>
  )
}
