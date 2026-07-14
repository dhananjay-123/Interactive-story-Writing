import { useEffect, useState } from 'react'

// The house curtain, parting once when a visitor first arrives in a tab.
//
// Like the cursor, the motion is entirely CSS: this component only decides
// whether to render, and tears itself out of the DOM when the cloth has
// finished travelling. It never blocks a click — the overlay is pointer-events:
// none for its whole life — so even a mid-animation click lands on the page.
const SEEN_KEY = 'ct_curtain_seen'

export default function CurtainReveal() {
  // Decide once, synchronously, so the panels are painted on the very first
  // frame. Deciding in an effect would flash the page before the cloth lands.
  const [showing, setShowing] = useState(() => {
    if (typeof window === 'undefined') return false
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return false
    return sessionStorage.getItem(SEEN_KEY) !== '1'
  })

  useEffect(() => {
    if (!showing) return
    sessionStorage.setItem(SEEN_KEY, '1')

    // Hold the page still while the curtain travels, then hand scrolling back.
    const { overflow } = document.body.style
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = overflow }
  }, [showing])

  if (!showing) return null

  // The panels start together; when the last one lands, the curtain is gone.
  // A timer would drift against the CSS — let the animation say when it's done.
  return (
    <div className="curtain" aria-hidden="true">
      <div className="curtain-panel curtain-left" />
      <div
        className="curtain-panel curtain-right"
        onAnimationEnd={() => setShowing(false)}
      />
      <span className="curtain-seam" />
      <span className="curtain-title">Craft&Tales</span>
    </div>
  )
}
