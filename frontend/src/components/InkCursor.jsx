import { useEffect, useRef } from 'react'

// A quill nib for a cursor, with an ink ring trailing a beat behind it and a
// splash of ink where you click.
//
// Only the coordinates and a couple of state classes are set from JS — every
// transition, ease, and keyframe is declared in index.css. Nothing here runs an
// animation loop of its own beyond a rAF that throttles pointermove writes.
//
// It mounts only on real pointing devices, and never when the reader has asked
// for reduced motion: in both cases the OS cursor stays exactly as it was.
const INTERACTIVE = 'a, button, [role="button"], summary, label[for]'
const TEXTUAL = 'input:not([type="checkbox"]):not([type="radio"]), textarea, [contenteditable="true"]'

export default function InkCursor() {
  const nibRef = useRef(null)
  const ringRef = useRef(null)
  const splashRef = useRef(null)

  useEffect(() => {
    const fine = window.matchMedia('(hover: hover) and (pointer: fine)')
    const calm = window.matchMedia('(prefers-reduced-motion: reduce)')
    if (!fine.matches || calm.matches) return

    const nib = nibRef.current
    const ring = ringRef.current
    const splash = splashRef.current
    const root = document.documentElement

    // Hiding the OS cursor is done from JS on purpose: if this component never
    // mounts (no JS, reduced motion, touch), the native cursor is untouched.
    root.classList.add('ink-cursor')

    let x = -100
    let y = -100
    let frame = 0

    const draw = () => {
      frame = 0
      const transform = `translate3d(${x}px, ${y}px, 0)`
      nib.style.transform = transform
      ring.style.transform = transform
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
      root.classList.remove(
        'ink-cursor', 'ink-cursor-hot', 'ink-cursor-text', 'ink-cursor-down', 'ink-cursor-away'
      )
    }
  }, [])

  return (
    <>
      <div ref={ringRef} className="ink-ring" aria-hidden="true" />
      <div ref={splashRef} className="ink-splash" aria-hidden="true" />
      <div ref={nibRef} className="ink-nib" aria-hidden="true">
        {/* The nib's tip sits at 0,0 of the SVG, which sits at the pointer. */}
        <svg width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden="true">
          <path className="ink-nib-body" d="M1 1 L15.5 8.5 L8.5 15.5 Z" />
          <path className="ink-nib-slit" d="M1 1 L9.5 9.5" />
        </svg>
        <span className="ink-nib-caret" />
      </div>
    </>
  )
}
