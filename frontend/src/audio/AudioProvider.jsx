import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import { createSoundscapes } from './soundscapes'

const AudioContextValue = createContext({
  enabled: false,
  toggle: () => {},
  playBed: () => {},
  sting: () => {},
  playAmbience: () => {},
  stopAmbience: () => {},
  previewAmbience: () => {},
  stopPreview: () => {},
})

export const useAudio = () => useContext(AudioContextValue)

// White noise for the home room tone and the UI cues. (The richer noise the
// story soundscapes need is generated in ./soundscapes.js.)
const makeNoise = (ctx, seconds) => {
  const len = Math.floor(seconds * ctx.sampleRate)
  const buf = ctx.createBuffer(1, len, ctx.sampleRate)
  const d = buf.getChannelData(0)
  for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1
  return buf
}

const bq = (ctx, type, freq, q) => {
  const f = ctx.createBiquadFilter()
  f.type = type
  f.frequency.value = freq
  if (q != null) f.Q.value = q
  return f
}

const lfo = (ctx, rate, depth, param) => {
  const o = ctx.createOscillator()
  o.frequency.value = rate
  const g = ctx.createGain()
  g.gain.value = depth
  o.connect(g)
  g.connect(param)
  o.start()
}

const burst = (ctx, dest, tick, { hp, lp, bpFreq, bpQ, peak, attack, decay }) => {
  const t = ctx.currentTime
  const src = ctx.createBufferSource()
  src.buffer = tick
  let node = src
  if (hp) { const f = bq(ctx, 'highpass', hp); node.connect(f); node = f }
  if (lp) { const f = bq(ctx, 'lowpass', lp); node.connect(f); node = f }
  if (bpFreq) { const f = bq(ctx, 'bandpass', bpFreq, bpQ || 4); node.connect(f); node = f }
  const g = ctx.createGain()
  g.gain.setValueAtTime(0.0001, t)
  g.gain.exponentialRampToValueAtTime(peak, t + attack)
  g.gain.exponentialRampToValueAtTime(0.0001, t + attack + decay)
  node.connect(g)
  g.connect(dest)
  src.start(t)
  src.stop(t + attack + decay + 0.05)
}

const chime = (ctx, dest, freqs) => {
  const t0 = ctx.currentTime
  freqs.forEach((f, i) => {
    const t = t0 + i * 0.12
    const o = ctx.createOscillator()
    o.type = 'sine'
    o.frequency.value = f
    const g = ctx.createGain()
    g.gain.setValueAtTime(0.0001, t)
    g.gain.exponentialRampToValueAtTime(0.11, t + 0.04)
    g.gain.exponentialRampToValueAtTime(0.0001, t + 1.1)
    o.connect(g)
    g.connect(dest)
    o.start(t)
    o.stop(t + 1.2)
  })
}

// A single soft musical note with a gentle attack/hold/release envelope.
const voice = (ctx, dest, freq, { type = 'sine', peak = 0.07, attack = 0.06, hold = 0.16, release = 1.3, detune = 0 } = {}) => {
  const t = ctx.currentTime
  const o = ctx.createOscillator()
  o.type = type
  o.frequency.value = freq
  if (detune) o.detune.value = detune
  const g = ctx.createGain()
  g.gain.setValueAtTime(0.0001, t)
  g.gain.exponentialRampToValueAtTime(peak, t + attack)
  g.gain.setValueAtTime(peak, t + attack + hold)
  g.gain.exponentialRampToValueAtTime(0.0001, t + attack + hold + release)
  o.connect(g)
  g.connect(dest)
  o.start(t)
  o.stop(t + attack + hold + release + 0.05)
}

const swell = (ctx, dest, tick) => {
  const t = ctx.currentTime
  const s = ctx.createBufferSource()
  s.buffer = tick
  s.loop = true
  const filter = bq(ctx, 'bandpass', 380, 0.7)
  const g = ctx.createGain()
  g.gain.setValueAtTime(0.0001, t)
  g.gain.linearRampToValueAtTime(0.16, t + 0.5)
  g.gain.exponentialRampToValueAtTime(0.0001, t + 1.7)
  s.connect(filter)
  filter.connect(g)
  g.connect(dest)
  s.start(t)
  s.stop(t + 1.8)

  const o = ctx.createOscillator()
  o.type = 'sine'
  o.frequency.setValueAtTime(68, t)
  o.frequency.exponentialRampToValueAtTime(150, t + 1.2)
  const og = ctx.createGain()
  og.gain.setValueAtTime(0.0001, t)
  og.gain.exponentialRampToValueAtTime(0.13, t + 0.3)
  og.gain.exponentialRampToValueAtTime(0.0001, t + 1.6)
  o.connect(og)
  og.connect(dest)
  o.start(t)
  o.stop(t + 1.7)
}

function buildEngine() {
  const AC = window.AudioContext || window.webkitAudioContext
  if (!AC) return null
  const ctx = new AC()
  const master = ctx.createGain()
  master.gain.value = 0
  master.connect(ctx.destination)

  const white = makeNoise(ctx, 2)
  const tick = makeNoise(ctx, 0.25)

  const beds = {}
  const makeBed = (level) => {
    const g = ctx.createGain()
    g.gain.value = 0
    g.connect(master)
    g._level = level
    return g
  }
  const loop = (buf) => {
    const s = ctx.createBufferSource()
    s.buffer = buf
    s.loop = true
    s.start()
    return s
  }

  // ── Home: warm "welcome" music — a Cmaj9 pad the melody plays over ──
  beds.home = makeBed(0.72)
  ;[130.81, 164.81, 196.0, 246.94, 293.66].forEach((f, i) => {
    // C3  E3  G3  B3  D4
    const o = ctx.createOscillator()
    o.type = i < 2 ? 'triangle' : 'sine'
    o.frequency.value = f
    const detune = ctx.createOscillator()
    detune.type = 'sine'
    detune.frequency.value = f * 1.003
    const g = ctx.createGain()
    g.gain.value = 0.03
    const lp = bq(ctx, 'lowpass', 900)
    o.connect(g)
    detune.connect(g)
    g.connect(lp)
    lp.connect(beds.home)
    lfo(ctx, 0.04 + i * 0.008, 110, lp.frequency)
    o.start()
    detune.start()
  })
  {
    const room = loop(white)
    const lp = bq(ctx, 'lowpass', 440)
    const g = ctx.createGain()
    g.gain.value = 0.06
    room.connect(lp)
    lp.connect(g)
    g.connect(beds.home)
    lfo(ctx, 0.05, 150, lp.frequency)
  }

  let lastUi = 0 // debounce for UI click cues
  let enabled = false // whether the master mix is currently audible
  let previewingMaster = false // editor preview raised the master while muted

  // Gentle pentatonic melody that drifts over the home pad — the "welcome" tune.
  const MELODY = [523.25, 587.33, 659.25, 783.99, 880.0] // C5 D5 E5 G5 A5
  const PHRASE = [0, 2, 4, 3, 2, -1, 1, 3, 4, -1, 2, 1, 0, -1] // indices; -1 = a rest
  let mstep = 0
  const musicTimer = setInterval(() => {
    if (ctx.state !== 'running' || scapes.playing()) return
    const idx = PHRASE[mstep % PHRASE.length]
    mstep++
    if (idx < 0) return
    const f = MELODY[idx]
    voice(ctx, beds.home, f, { type: 'sine', peak: 0.12, attack: 0.06, hold: 0.14, release: 1.4 })
    // a soft note an octave below adds warmth, now and then
    if (Math.random() < 0.35) voice(ctx, beds.home, f / 2, { type: 'triangle', peak: 0.06, attack: 0.09, hold: 0.2, release: 1.7 })
  }, 660)

  /* Story soundscapes live in ./soundscapes.js — the author picks one per story
     and every reader hears it. The welcome music ducks away while one plays. */
  const scapes = createSoundscapes(ctx, master)

  // Raise the home music unless a soundscape has the floor.
  const applyMix = () => {
    const t = ctx.currentTime
    beds.home.gain.cancelScheduledValues(t)
    beds.home.gain.setTargetAtTime(scapes.playing() ? 0 : beds.home._level, t, 0.9)
  }

  return {
    ctx,
    enable() {
      enabled = true
      previewingMaster = false
      if (ctx.state === 'suspended') ctx.resume()
      master.gain.cancelScheduledValues(ctx.currentTime)
      master.gain.setTargetAtTime(0.9, ctx.currentTime, 0.5)
    },
    mute() {
      enabled = false
      master.gain.cancelScheduledValues(ctx.currentTime)
      master.gain.setTargetAtTime(0, ctx.currentTime, 0.3)
    },
    playBed() {
      // Only the welcome music exists as a bed; this keeps it at the right level.
      applyMix()
    },
    playAmbience(id) {
      scapes.start(id)
      applyMix()
    },
    stopAmbience() {
      scapes.stop()
      applyMix()
    },
    previewAmbience(id) {
      if (ctx.state === 'suspended') ctx.resume()
      if (!enabled) {
        master.gain.cancelScheduledValues(ctx.currentTime)
        master.gain.setTargetAtTime(0.9, ctx.currentTime, 0.2)
        previewingMaster = true
      }
      scapes.start(id)
      applyMix()
    },
    stopPreview() {
      if (previewingMaster) {
        master.gain.cancelScheduledValues(ctx.currentTime)
        master.gain.setTargetAtTime(0, ctx.currentTime, 0.25)
        previewingMaster = false
      }
      scapes.stop()
      applyMix()
    },
    sting(type) {
      if (type === 'enter') chime(ctx, master, [523.25, 784])
      else if (type === 'storyEnter') swell(ctx, master, tick)
      else if (type === 'choice') burst(ctx, master, tick, { bpFreq: 1200, bpQ: 3, peak: 0.07, attack: 0.005, decay: 0.14 })
      else if (type === 'click' || type === 'primary') {
        // Guard against a UI cue stacking on itself (double-fired listeners, rapid taps).
        if (ctx.currentTime - lastUi < 0.04) return
        lastUi = ctx.currentTime
        if (type === 'click') {
          // Crisp, tactile UI tick — a short blip plus a filtered noise transient.
          voice(ctx, master, 1046.5, { type: 'sine', peak: 0.13, attack: 0.003, hold: 0.016, release: 0.1 })
          burst(ctx, master, tick, { bpFreq: 2700, bpQ: 3, peak: 0.06, attack: 0.002, decay: 0.035 })
          return
        }
      }
      if (type === 'primary') {
        // A touch richer for confirming actions (publish, save, sign in).
        voice(ctx, master, 659.25, { type: 'sine', peak: 0.13, attack: 0.004, hold: 0.024, release: 0.15 })
        voice(ctx, master, 987.77, { type: 'sine', peak: 0.11, attack: 0.03, hold: 0.024, release: 0.18 })
      }
    },
    dispose() {
      clearInterval(musicTimer)
      scapes.dispose()
      ctx.close()
    },
  }
}

export function AudioProvider({ children }) {
  const engineRef = useRef(null)
  const enabledRef = useRef(false)
  const pendingBed = useRef('home')
  const pendingAmbience = useRef(null) // story soundscape to resume once sound is on
  const [enabled, setEnabled] = useState(false)

  useEffect(() => () => engineRef.current && engineRef.current.dispose(), [])

  // Browsers block autoplay, so if the visitor had sound on last time we resume
  // it on their first interaction with the page rather than forcing it on load.
  useEffect(() => {
    let saved
    try {
      saved = localStorage.getItem('ct-sound')
    } catch {
      saved = null
    }
    if (saved !== 'on') return
    const start = () => {
      if (enabledRef.current) return
      if (!engineRef.current) engineRef.current = buildEngine()
      const eng = engineRef.current
      if (!eng) return
      enabledRef.current = true
      setEnabled(true)
      eng.enable()
      eng.playBed(pendingBed.current)
      if (pendingAmbience.current) eng.playAmbience(pendingAmbience.current)
      window.removeEventListener('pointerdown', start)
      window.removeEventListener('keydown', start)
    }
    window.addEventListener('pointerdown', start)
    window.addEventListener('keydown', start)
    return () => {
      window.removeEventListener('pointerdown', start)
      window.removeEventListener('keydown', start)
    }
  }, [])

  // A soft click on any button or link, once sound is enabled. Submit buttons
  // get the slightly richer "primary" cue.
  useEffect(() => {
    const onDown = (e) => {
      if (!enabledRef.current || !engineRef.current) return
      const el = e.target.closest?.('button, a, [role="button"]')
      if (!el || el.disabled || el.getAttribute('aria-disabled') === 'true') return
      engineRef.current.sting(el.type === 'submit' ? 'primary' : 'click')
    }
    document.addEventListener('pointerdown', onDown)
    return () => document.removeEventListener('pointerdown', onDown)
  }, [])

  const toggle = useCallback(() => {
    if (!engineRef.current) engineRef.current = buildEngine()
    const eng = engineRef.current
    if (!eng) return
    const next = !enabledRef.current
    enabledRef.current = next
    setEnabled(next)
    if (next) {
      eng.enable()
      eng.playBed(pendingBed.current)
      if (pendingAmbience.current) eng.playAmbience(pendingAmbience.current)
      eng.sting('enter')
    } else {
      eng.mute()
    }
    try {
      localStorage.setItem('ct-sound', next ? 'on' : 'off')
    } catch {
      /* ignore */
    }
  }, [])

  const playBed = useCallback((type) => {
    pendingBed.current = type
    if (engineRef.current && enabledRef.current) engineRef.current.playBed(type)
  }, [])

  const sting = useCallback((type) => {
    if (engineRef.current && enabledRef.current) engineRef.current.sting(type)
  }, [])

  // The reader sets a story's soundscape; it plays now if sound is on, or is
  // remembered so it starts the moment the visitor enables sound.
  const playAmbience = useCallback((id) => {
    pendingAmbience.current = id || null
    if (engineRef.current && enabledRef.current && id) engineRef.current.playAmbience(id)
  }, [])

  const stopAmbience = useCallback(() => {
    pendingAmbience.current = null
    if (engineRef.current) engineRef.current.stopAmbience()
  }, [])

  // The editor test player — previews a soundscape even if global sound is off
  // (the click that starts it counts as the gesture browsers require).
  const previewAmbience = useCallback((id) => {
    if (!engineRef.current) engineRef.current = buildEngine()
    if (engineRef.current) engineRef.current.previewAmbience(id)
  }, [])

  const stopPreview = useCallback(() => {
    if (engineRef.current) engineRef.current.stopPreview()
  }, [])

  return (
    <AudioContextValue.Provider
      value={{ enabled, toggle, playBed, sting, playAmbience, stopAmbience, previewAmbience, stopPreview }}
    >
      {children}
    </AudioContextValue.Provider>
  )
}
