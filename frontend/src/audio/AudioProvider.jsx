import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'

const AudioContextValue = createContext({
  enabled: false,
  toggle: () => {},
  playBed: () => {},
  sting: () => {},
})

export const useAudio = () => useContext(AudioContextValue)

const makeNoise = (ctx, seconds, type) => {
  const len = Math.floor(seconds * ctx.sampleRate)
  const buf = ctx.createBuffer(1, len, ctx.sampleRate)
  const d = buf.getChannelData(0)
  if (type === 'brown') {
    let last = 0
    for (let i = 0; i < len; i++) {
      const w = Math.random() * 2 - 1
      last = (last + 0.02 * w) / 1.02
      d[i] = last * 3.2
    }
  } else {
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1
  }
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

  const white = makeNoise(ctx, 2, 'white')
  const brown = makeNoise(ctx, 2, 'brown')
  const tick = makeNoise(ctx, 0.25, 'white')

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
  beds.home = makeBed(0.5)
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

  // ── Reading: a calmer, darker Am pad for every page but home (no melody) ──
  beds.reading = makeBed(0.44)
  ;[110.0, 130.81, 164.81, 220.0].forEach((f) => {
    // A2  C3  E3  A3
    const o = ctx.createOscillator()
    o.type = 'sine'
    o.frequency.value = f
    const detune = ctx.createOscillator()
    detune.type = 'sine'
    detune.frequency.value = f * 1.004
    const g = ctx.createGain()
    g.gain.value = 0.045
    const lp = bq(ctx, 'lowpass', 500)
    o.connect(g)
    detune.connect(g)
    g.connect(lp)
    lp.connect(beds.reading)
    lfo(ctx, 0.03, 80, lp.frequency)
    o.start()
    detune.start()
  })
  {
    const air = loop(brown)
    const lp = bq(ctx, 'lowpass', 360)
    const g = ctx.createGain()
    g.gain.value = 0.09
    air.connect(lp)
    lp.connect(g)
    g.connect(beds.reading)
  }

  beds.rain = makeBed(0.5)
  {
    const hiss = loop(white)
    const hp = bq(ctx, 'highpass', 700)
    const lp = bq(ctx, 'lowpass', 6500)
    hiss.connect(hp)
    hp.connect(lp)
    lp.connect(beds.rain)
    lfo(ctx, 0.1, 900, lp.frequency)
    const body = loop(white)
    const blp = bq(ctx, 'lowpass', 900)
    const bg = ctx.createGain()
    bg.gain.value = 0.5
    body.connect(blp)
    blp.connect(bg)
    bg.connect(beds.rain)
  }

  beds.fire = makeBed(0.4)
  {
    const rumble = loop(brown)
    const lp = bq(ctx, 'lowpass', 680)
    rumble.connect(lp)
    lp.connect(beds.fire)
  }

  beds.wind = makeBed(0.44)
  {
    const w = loop(brown)
    const bp = bq(ctx, 'bandpass', 500, 0.6)
    const inner = ctx.createGain()
    inner.gain.value = 0.7
    w.connect(bp)
    bp.connect(inner)
    inner.connect(beds.wind)
    lfo(ctx, 0.05, 320, bp.frequency)
    lfo(ctx, 0.08, 0.25, inner.gain)
  }

  beds.static = makeBed(0.26)
  {
    const s = loop(white)
    const bp = bq(ctx, 'bandpass', 2400, 0.5)
    s.connect(bp)
    bp.connect(beds.static)
    const hum = ctx.createOscillator()
    hum.type = 'sawtooth'
    hum.frequency.value = 120
    const hg = ctx.createGain()
    hg.gain.value = 0.015
    hum.connect(hg)
    hg.connect(beds.static)
    hum.start()
  }

  const BED_FOR = { home: 'home', reading: 'reading', rain: 'rain', embers: 'fire', frost: 'wind', static: 'static' }
  let active = 'home'
  let lastUi = 0 // debounce for UI click cues

  // Gentle pentatonic melody that drifts over the home pad — the "welcome" tune.
  const MELODY = [523.25, 587.33, 659.25, 783.99, 880.0] // C5 D5 E5 G5 A5
  const PHRASE = [0, 2, 4, 3, 2, -1, 1, 3, 4, -1, 2, 1, 0, -1] // indices; -1 = a rest
  let mstep = 0
  const musicTimer = setInterval(() => {
    if (ctx.state !== 'running' || active !== 'home') return
    const idx = PHRASE[mstep % PHRASE.length]
    mstep++
    if (idx < 0) return
    const f = MELODY[idx]
    voice(ctx, beds.home, f, { type: 'sine', peak: 0.09, attack: 0.06, hold: 0.14, release: 1.4 })
    // a soft note an octave below adds warmth, now and then
    if (Math.random() < 0.35) voice(ctx, beds.home, f / 2, { type: 'triangle', peak: 0.045, attack: 0.09, hold: 0.2, release: 1.7 })
  }, 660)

  const timer = setInterval(() => {
    if (ctx.state !== 'running') return
    if (active === 'rain' && Math.random() < 0.5)
      burst(ctx, beds.rain, tick, { bpFreq: 600 + Math.random() * 2000, bpQ: 6 + Math.random() * 8, peak: 0.04 + Math.random() * 0.09, attack: 0.005, decay: 0.1 + Math.random() * 0.08 })
    else if (active === 'fire' && Math.random() < 0.6)
      burst(ctx, beds.fire, tick, { hp: 1800 + Math.random() * 1500, peak: 0.03 + Math.random() * 0.06, attack: 0.003, decay: 0.03 + Math.random() * 0.04 })
    else if (active === 'static' && Math.random() < 0.12)
      burst(ctx, beds.static, tick, { bpFreq: 2500 + Math.random() * 2500, bpQ: 2, peak: 0.05, attack: 0.004, decay: 0.05 })
  }, 180)

  return {
    ctx,
    enable() {
      if (ctx.state === 'suspended') ctx.resume()
      master.gain.cancelScheduledValues(ctx.currentTime)
      master.gain.setTargetAtTime(0.9, ctx.currentTime, 0.5)
    },
    mute() {
      master.gain.cancelScheduledValues(ctx.currentTime)
      master.gain.setTargetAtTime(0, ctx.currentTime, 0.3)
    },
    playBed(type) {
      const key = BED_FOR[type] || 'home'
      active = key
      const t = ctx.currentTime
      Object.keys(beds).forEach((k) => {
        const g = beds[k].gain
        g.cancelScheduledValues(t)
        g.setTargetAtTime(k === key ? beds[k]._level : 0, t, 0.9)
      })
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
          // Soft, tactile UI tick — a short blip plus a faint filtered noise transient.
          voice(ctx, master, 1046.5, { type: 'sine', peak: 0.05, attack: 0.004, hold: 0.012, release: 0.085 })
          burst(ctx, master, tick, { bpFreq: 2700, bpQ: 3, peak: 0.022, attack: 0.002, decay: 0.03 })
          return
        }
      }
      if (type === 'primary') {
        // A touch richer for confirming actions (publish, save, sign in).
        voice(ctx, master, 659.25, { type: 'sine', peak: 0.05, attack: 0.004, hold: 0.02, release: 0.13 })
        voice(ctx, master, 987.77, { type: 'sine', peak: 0.045, attack: 0.03, hold: 0.02, release: 0.16 })
      }
    },
    dispose() {
      clearInterval(timer)
      clearInterval(musicTimer)
      ctx.close()
    },
  }
}

export function AudioProvider({ children }) {
  const engineRef = useRef(null)
  const enabledRef = useRef(false)
  const pendingBed = useRef('home')
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

  return (
    <AudioContextValue.Provider value={{ enabled, toggle, playBed, sting }}>
      {children}
    </AudioContextValue.Provider>
  )
}
