// The Craft&Tales mark. The artwork ships as two files — gold-on-ink for the
// dark theme, ink-on-gold for the light one — so both are rendered stacked and
// CSS cross-fades between them on the theme flip. Swapping `src` in JS instead
// would flash a blank frame the first time a theme is used.
//
// `alt` names the logo for assistive tech; leave it empty wherever a visible
// "Craft&Tales" wordmark already sits beside it, and the whole thing is hidden.

const SOURCES = {
  mark: ['/brand/mark-dark.png', '/brand/mark-light.png'],
  lockup: ['/brand/logo-dark.png', '/brand/logo-light.png'],
}

const RATIO = { mark: [481, 481], lockup: [539, 531] }

export default function Logo({ variant = 'mark', width = 40, alt = '', className = '' }) {
  const [dark, light] = SOURCES[variant]
  const [w, h] = RATIO[variant]
  const height = Math.round((width * h) / w)

  return (
    <span
      className={`ct-logo ${className}`.trim()}
      style={{ '--ct-logo-w': `${width}px` }}
      aria-hidden={alt ? undefined : 'true'}
    >
      <img className="ct-logo__art" src={dark} alt={alt} width={width} height={height} />
      <img
        className="ct-logo__art ct-logo__art--light"
        src={light}
        alt=""
        aria-hidden="true"
        width={width}
        height={height}
      />
    </span>
  )
}
