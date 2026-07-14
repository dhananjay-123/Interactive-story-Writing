import { useEffect, useRef } from 'react'

// A fountain-pen nib for a cursor: it leaves a thread of wet ink behind as it
// travels, the ink ring trails a beat behind, and a click flicks a splatter of
// droplets onto the page — the small theatre of writing by hand.
//
// Only coordinates, a couple of state classes, and the trail droplets are set
// from JS — every transition, ease, and keyframe is declared in index.css.
// Nothing here runs an animation loop of its own beyond a rAF that throttles
// pointermove writes; each ink droplet animates entirely in CSS and removes
// itself when its keyframe ends.
//
// It mounts only on real pointing devices, and never when the reader has asked
// for reduced motion: in both cases the OS cursor stays exactly as it was.
const INTERACTIVE = 'a, button, [role="button"], summary, label[for]'
const TEXTUAL = 'input:not([type="checkbox"]):not([type="radio"]), textarea, [contenteditable="true"]'

// How far the nib must travel before it lays down the next drop of ink, and how
// far apart click-splatter droplets can land.
const TRAIL_GAP = 22

export default function InkCursor() {
  const nibRef = useRef(null)
  const ringRef = useRef(null)
  const splashRef = useRef(null)
  const trailRef = useRef(null)

  useEffect(() => {
    const fine = window.matchMedia('(hover: hover) and (pointer: fine)')
    const calm = window.matchMedia('(prefers-reduced-motion: reduce)')
    if (!fine.matches || calm.matches) return

    const nib = nibRef.current
    const ring = ringRef.current
    const splash = splashRef.current
    const trail = trailRef.current
    const root = document.documentElement

    // Hiding the OS cursor is done from JS on purpose: if this component never
    // mounts (no JS, reduced motion, touch), the native cursor is untouched.
    root.classList.add('ink-cursor')

    let x = -100
    let y = -100
    let inkX = x
    let inkY = y
    let frame = 0

    // Drop a single spot of ink at (px, py). It fades and dries via CSS, then
    // clears itself out — nothing accumulates in the DOM.
    const dropInk = (px, py, opts = {}) => {
      const dot = document.createElement('span')
      dot.className = 'ink-trail-dot'
      const size = opts.size ?? 3 + Math.random() * 3
      dot.style.width = `${size}px`
      dot.style.height = `${size}px`
      dot.style.transform = `translate3d(${px - size / 2}px, ${py - size / 2}px, 0)`
      if (opts.spatter) dot.classList.add('is-spatter')
      dot.addEventListener('animationend', () => dot.remove(), { once: true })
      trail.appendChild(dot)
    }

    const draw = () => {
      frame = 0
      const transform = `translate3d(${x}px, ${y}px, 0)`
      nib.style.transform = transform
      ring.style.transform = transform

      // Lay ink down at a steady spacing rather than every frame, so fast and
      // slow strokes leave a similar bead of dots.
      const dx = x - inkX
      const dy = y - inkY
      if (dx * dx + dy * dy >= TRAIL_GAP * TRAIL_GAP) {
        inkX = x
        inkY = y
        if (!root.classList.contains('ink-cursor-text')) dropInk(x, y)
      }
    }

    const onMove = (e) => {
      x = e.clientX
      y = e.clientY
      if (!frame) frame = requestAnimationFrame(draw)
    }

    // One delegated listener rather than per-element handlers, so it keeps
    // working for anything React renders later.
    const onOver = (e) => {
      const el = e.target instanceof Element ? e.target : null
      if (!el) return
      const overText = !!el.closest(TEXTUAL)
      const overHot = !overText && !!el.closest(INTERACTIVE)
      root.classList.toggle('ink-cursor-text', overText)
      root.classList.toggle('ink-cursor-hot', overHot)
    }

    const onDown = () => {
      root.classList.add('ink-cursor-down')
      splash.style.transform = `translate3d(${x}px, ${y}px, 0)`
      // Restart the keyframe: drop the class, force reflow, add it back.
      splash.classList.remove('is-splashing')
      void splash.offsetWidth
      splash.classList.add('is-splashing')
      // Flick a few droplets outward — the spray a nib throws when it's tapped.
      const n = 3 + Math.floor(Math.random() * 3)
      for (let i = 0; i < n; i++) {
        const a = Math.random() * Math.PI * 2
        const r = 6 + Math.random() * 16
        dropInk(x + Math.cos(a) * r, y + Math.sin(a) * r, { size: 2 + Math.random() * 3, spatter: true })
      }
    }
    const onUp = () => root.classList.remove('ink-cursor-down')

    // The cursor would otherwise freeze mid-screen when the pointer leaves.
    const onLeave = () => root.classList.add('ink-cursor-away')
    const onEnter = () => root.classList.remove('ink-cursor-away')

    window.addEventListener('pointermove', onMove, { passive: true })
    window.addEventListener('pointerover', onOver, { passive: true })
    window.addEventListener('pointerdown', onDown, { passive: true })
    window.addEventListener('pointerup', onUp, { passive: true })
    document.addEventListener('mouseleave', onLeave)
    document.addEventListener('mouseenter', onEnter)

    return () => {
      if (frame) cancelAnimationFrame(frame)
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerover', onOver)
      window.removeEventListener('pointerdown', onDown)
      window.removeEventListener('pointerup', onUp)
      document.removeEventListener('mouseleave', onLeave)
      document.removeEventListener('mouseenter', onEnter)
      if (trail) trail.replaceChildren()
      root.classList.remove(
        'ink-cursor', 'ink-cursor-hot', 'ink-cursor-text', 'ink-cursor-down', 'ink-cursor-away'
      )
    }
  }, [])

  return (
    <>
      {/* Ink laid down by the nib as it moves and where it's clicked. */}
      <div ref={trailRef} className="ink-trail" aria-hidden="true" />
      <div ref={ringRef} className="ink-ring" aria-hidden="true" />
      <div ref={splashRef} className="ink-splash" aria-hidden="true" />
      <div ref={nibRef} className="ink-nib" aria-hidden="true">
        {/* The nib's tip sits at 0,0 of the SVG, which sits at the pointer. */}
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          {/* A fountain-pen nib: a tapered blade, a slit down its spine, and the
              round breather hole where the two tines meet. */}
          <path className="ink-nib-body" d="M1.5 1.5 L15 8.5 L17 12.5 L12.5 17 L8.5 15 Z" />
          <path className="ink-nib-slit" d="M1.5 1.5 L10.5 10.5" />
          <circle className="ink-nib-vent" cx="11.4" cy="11.4" r="1.5" />
        </svg>
        <span className="ink-nib-caret" />
      </div>
    </>
  )
}
