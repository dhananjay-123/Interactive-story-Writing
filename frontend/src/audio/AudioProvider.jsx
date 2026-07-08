import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'

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
  let enabled = false // whether the master mix is currently audible
  let previewingMaster = false // editor preview raised the master while muted
  let ambienceId = null // the story soundscape currently playing, if any
  let current = null // { id, gain, stop } for the active soundscape

  // Gentle pentatonic melody that drifts over the home pad — the "welcome" tune.
  const MELODY = [523.25, 587.33, 659.25, 783.99, 880.0] // C5 D5 E5 G5 A5
  const PHRASE = [0, 2, 4, 3, 2, -1, 1, 3, 4, -1, 2, 1, 0, -1] // indices; -1 = a rest
  let mstep = 0
  const musicTimer = setInterval(() => {
    if (ctx.state !== 'running' || active !== 'home' || ambienceId) return
    const idx = PHRASE[mstep % PHRASE.length]
    mstep++
    if (idx < 0) return
    const f = MELODY[idx]
    voice(ctx, beds.home, f, { type: 'sine', peak: 0.12, attack: 0.06, hold: 0.14, release: 1.4 })
    // a soft note an octave below adds warmth, now and then
    if (Math.random() < 0.35) voice(ctx, beds.home, f / 2, { type: 'triangle', peak: 0.06, attack: 0.09, hold: 0.2, release: 1.7 })
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

  /* ══════════ Story soundscapes ══════════
     Procedural ambience, five presets per genre. Each builder gets its own
     gain node and returns a stop() that tears every layer down, so switching
     soundscapes leaves nothing running. Ids mirror src/audio/ambience.js. */

  const stopOsc = (o) => { try { o.stop() } catch { /* already stopped */ } o.disconnect() }

  const lfoHandle = (rate, depth, param) => {
    const o = ctx.createOscillator()
    o.frequency.value = rate
    const g = ctx.createGain()
    g.gain.value = depth
    o.connect(g); g.connect(param); o.start()
    return () => { stopOsc(o); g.disconnect() }
  }

  // Looping, filtered noise — wind, rain, room tone, water.
  const noiseLayer = (out, buf, { filter = 'lowpass', freq = 800, q, gain = 0.1, lfoRate = 0, lfoDepth = 0, ampRate = 0, ampDepth = 0 }) => {
    const s = ctx.createBufferSource(); s.buffer = buf; s.loop = true
    const f = bq(ctx, filter, freq, q)
    const g = ctx.createGain(); g.gain.value = gain
    s.connect(f); f.connect(g); g.connect(out)
    const stops = []
    if (lfoRate) stops.push(lfoHandle(lfoRate, lfoDepth, f.frequency))
    if (ampRate) stops.push(lfoHandle(ampRate, ampDepth, g.gain))
    s.start()
    return () => { try { s.stop() } catch { /* already stopped */ } s.disconnect(); f.disconnect(); g.disconnect(); stops.forEach((x) => x()) }
  }

  // Sustained, gently detuned oscillator drone — pads, hums, tones.
  const drone = (out, freqs, { type = 'sine', gain = 0.04, detune = 1.004, lp = 700, lfoRate = 0.03, lfoDepth = 60, ampRate = 0, ampDepth = 0 } = {}) => {
    const lpf = bq(ctx, 'lowpass', lp)
    const g = ctx.createGain(); g.gain.value = gain
    lpf.connect(g); g.connect(out)
    const oscs = []
    freqs.forEach((fr) => {
      const o = ctx.createOscillator(); o.type = type; o.frequency.value = fr
      const o2 = ctx.createOscillator(); o2.type = type; o2.frequency.value = fr * detune
      o.connect(lpf); o2.connect(lpf); o.start(); o2.start()
      oscs.push(o, o2)
    })
    const stops = []
    if (lfoRate) stops.push(lfoHandle(lfoRate, lfoDepth, lpf.frequency))
    if (ampRate) stops.push(lfoHandle(ampRate, ampDepth, g.gain))
    return () => { oscs.forEach(stopOsc); lpf.disconnect(); g.disconnect(); stops.forEach((x) => x()) }
  }

  // Sparse random events (drips, birds, beeps) and steady ones (clock ticks).
  const scatter = (everyMs, prob, fn) => {
    const iv = setInterval(() => { if (ctx.state === 'running' && Math.random() < prob) fn() }, everyMs)
    return () => clearInterval(iv)
  }
  const metronome = (everyMs, fn) => {
    const iv = setInterval(() => { if (ctx.state === 'running') fn() }, everyMs)
    return () => clearInterval(iv)
  }

  // ── one-shot event voices ──
  const rainDrop = (out) => burst(ctx, out, tick, { bpFreq: 600 + Math.random() * 2200, bpQ: 6 + Math.random() * 8, peak: 0.06 + Math.random() * 0.11, attack: 0.004, decay: 0.08 + Math.random() * 0.08 })
  const crackle = (out) => burst(ctx, out, tick, { hp: 1700 + Math.random() * 1600, peak: 0.05 + Math.random() * 0.08, attack: 0.003, decay: 0.03 + Math.random() * 0.045 })
  const thump = (out, freq, peak, dur) => {
    const t = ctx.currentTime
    const o = ctx.createOscillator(); o.type = 'sine'
    o.frequency.setValueAtTime(freq * 1.6, t)
    o.frequency.exponentialRampToValueAtTime(freq, t + 0.07)
    const g = ctx.createGain()
    g.gain.setValueAtTime(0.0001, t)
    g.gain.exponentialRampToValueAtTime(peak, t + 0.012)
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
    o.connect(g); g.connect(out); o.start(t); o.stop(t + dur + 0.05)
  }
  const chirp = (out) => {
    const t = ctx.currentTime
    const base = 1700 + Math.random() * 1500
    const o = ctx.createOscillator(); o.type = 'sine'
    o.frequency.setValueAtTime(base, t)
    o.frequency.exponentialRampToValueAtTime(base * 1.5, t + 0.05)
    o.frequency.exponentialRampToValueAtTime(base * 0.85, t + 0.12)
    const g = ctx.createGain()
    g.gain.setValueAtTime(0.0001, t)
    g.gain.exponentialRampToValueAtTime(0.08, t + 0.02)
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.16)
    o.connect(g); g.connect(out); o.start(t); o.stop(t + 0.2)
  }
  const cricket = (out) => {
    const t0 = ctx.currentTime
    for (let i = 0; i < 3; i++) {
      const t = t0 + i * 0.05
      const o = ctx.createOscillator(); o.type = 'square'; o.frequency.value = 4300
      const bp = bq(ctx, 'bandpass', 4300, 6)
      const g = ctx.createGain()
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.012, t + 0.005); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.03)
      o.connect(bp); bp.connect(g); g.connect(out); o.start(t); o.stop(t + 0.05)
    }
  }
  const beep = (out) => {
    const t = ctx.currentTime
    const o = ctx.createOscillator(); o.type = 'square'
    o.frequency.value = [440, 554, 659, 880][Math.floor(Math.random() * 4)]
    const lp = bq(ctx, 'lowpass', 2200)
    const g = ctx.createGain()
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.05, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.13)
    o.connect(lp); lp.connect(g); g.connect(out); o.start(t); o.stop(t + 0.16)
  }
  const clink = (out) => {
    const t = ctx.currentTime
    const o = ctx.createOscillator(); o.type = 'sine'; o.frequency.value = 2100 + Math.random() * 900
    const g = ctx.createGain()
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.035, t + 0.004); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.12)
    o.connect(g); g.connect(out); o.start(t); o.stop(t + 0.14)
  }
  const pageTurn = (out) => burst(ctx, out, tick, { hp: 1500, lp: 6500, peak: 0.03, attack: 0.02, decay: 0.12 })
  const bellHit = (out, base) => {
    ;[base, base * 2.01, base * 2.99].forEach((f, i) => {
      const t = ctx.currentTime
      const o = ctx.createOscillator(); o.type = 'sine'; o.frequency.value = f
      const peak = [0.14, 0.08, 0.05][i]
      const g = ctx.createGain()
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(peak, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + 2.4)
      o.connect(g); g.connect(out); o.start(t); o.stop(t + 2.5)
    })
  }
  const glow = (out, freq, peak = 0.06, dur = 1.0) => voice(ctx, out, freq, { type: 'sine', peak, attack: dur * 0.3, hold: dur * 0.3, release: dur })
  const foghorn = (out) => {
    const t = ctx.currentTime
    const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = 58
    const lp = bq(ctx, 'lowpass', 220)
    const g = ctx.createGain()
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.18, t + 0.6); g.gain.setValueAtTime(0.18, t + 1.6); g.gain.exponentialRampToValueAtTime(0.0001, t + 2.8)
    o.connect(lp); lp.connect(g); g.connect(out); o.start(t); o.stop(t + 2.9)
  }
  const gull = (out) => {
    const t = ctx.currentTime
    const o = ctx.createOscillator(); o.type = 'sawtooth'
    o.frequency.setValueAtTime(1400, t); o.frequency.exponentialRampToValueAtTime(900, t + 0.3)
    const bp = bq(ctx, 'bandpass', 1400, 4)
    const g = ctx.createGain()
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.05, t + 0.05); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.35)
    o.connect(bp); bp.connect(g); g.connect(out); o.start(t); o.stop(t + 0.4)
  }
  const siren = (out) => {
    const t = ctx.currentTime
    const o = ctx.createOscillator(); o.type = 'sine'
    o.frequency.setValueAtTime(660, t); o.frequency.linearRampToValueAtTime(880, t + 0.6); o.frequency.linearRampToValueAtTime(660, t + 1.2)
    const g = ctx.createGain()
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.02, t + 0.3); g.gain.exponentialRampToValueAtTime(0.0001, t + 1.4)
    o.connect(g); g.connect(out); o.start(t); o.stop(t + 1.5)
  }
  const creak = (out) => {
    const t = ctx.currentTime
    const o = ctx.createOscillator(); o.type = 'sawtooth'
    o.frequency.setValueAtTime(120, t); o.frequency.linearRampToValueAtTime(180, t + 0.5)
    const bp = bq(ctx, 'bandpass', 300, 8)
    const g = ctx.createGain()
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.02, t + 0.1); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.6)
    o.connect(bp); bp.connect(g); g.connect(out); o.start(t); o.stop(t + 0.7)
  }

  // ── continuous helper layers (return a stop fn) ──
  const heartbeat = (out) => metronome(1150, () => { thump(out, 55, 0.5, 0.2); setTimeout(() => thump(out, 48, 0.32, 0.17), 250) })
  const pulseLayer = (out, everyMs, freq, peak) => metronome(everyMs, () => thump(out, freq, peak, 0.24))
  const swellChord = (out, chord, everyMs = 5400) => {
    const play = () => chord.forEach((f, i) => glow(out, f, 0.045, 2.4 + i * 0.1))
    play()
    return metronome(everyMs, play)
  }
  const clock = (out) => {
    let hi = false
    return metronome(530, () => { burst(ctx, out, tick, { bpFreq: hi ? 2200 : 1900, bpQ: 6, peak: hi ? 0.05 : 0.06, attack: 0.002, decay: 0.03 }); hi = !hi })
  }
  const shimmer = (out) => scatter(1300, 0.6, () => {
    const notes = [1046.5, 1318.5, 1567.98, 2093]
    chime(ctx, out, [notes[Math.floor(Math.random() * notes.length)], notes[Math.floor(Math.random() * notes.length)]])
  })
  const murmur = (out, gain = 0.08) => noiseLayer(out, brown, { filter: 'bandpass', freq: 420, q: 0.7, gain, ampRate: 0.16, ampDepth: gain * 0.6 })
  const rainKit = (out, heavy = false) => [
    noiseLayer(out, white, { filter: 'highpass', freq: 800, gain: heavy ? 0.12 : 0.08, lfoRate: 0.1, lfoDepth: 900 }),
    noiseLayer(out, white, { filter: 'lowpass', freq: 900, gain: heavy ? 0.2 : 0.14 }),
    scatter(90, heavy ? 0.7 : 0.55, () => rainDrop(out)),
  ]
  const fireKit = (out) => [
    noiseLayer(out, brown, { filter: 'lowpass', freq: 680, gain: 0.14 }),
    scatter(110, 0.7, () => crackle(out)),
  ]

  const compose = (level, build) => (out) => {
    const stops = build(out).flat().filter(Boolean)
    return { level, stop: () => stops.forEach((s) => s()) }
  }

  const ambiencePresets = {
    // ── Fantasy ──
    fant_forest: compose(0.8, (o) => [drone(o, [196, 246.94], { gain: 0.028, lp: 700, lfoRate: 0.04, lfoDepth: 80 }), noiseLayer(o, brown, { freq: 500, gain: 0.05, lfoRate: 0.05, lfoDepth: 120 }), scatter(1700, 0.5, () => chirp(o)), scatter(5200, 0.35, () => chime(ctx, o, [880, 1046.5]))]),
    fant_tavern: compose(0.8, (o) => [...fireKit(o), murmur(o, 0.05), drone(o, [110, 164.81], { type: 'triangle', gain: 0.022, lp: 500, lfoRate: 0.03, lfoDepth: 40 })]),
    fant_castle: compose(0.82, (o) => [drone(o, [87.31, 130.81, 174.61], { gain: 0.032, lp: 600, lfoRate: 0.02, lfoDepth: 50 }), noiseLayer(o, brown, { freq: 420, gain: 0.06, lfoRate: 0.04, lfoDepth: 100 }), scatter(7000, 0.3, () => bellHit(o, 160))]),
    fant_magic: compose(0.78, (o) => [drone(o, [261.63, 329.63, 392], { gain: 0.026, lp: 1300, lfoRate: 0.05, lfoDepth: 220 }), shimmer(o), noiseLayer(o, white, { filter: 'highpass', freq: 6000, gain: 0.012, lfoRate: 0.1, lfoDepth: 2000 })]),
    fant_highlands: compose(0.82, (o) => [noiseLayer(o, brown, { filter: 'bandpass', freq: 500, q: 0.6, gain: 0.12, lfoRate: 0.05, lfoDepth: 320, ampRate: 0.08, ampDepth: 0.05 }), drone(o, [98, 146.83], { type: 'sawtooth', gain: 0.018, lp: 400, lfoRate: 0.03, lfoDepth: 30 })]),
    // ── Mystery ──
    myst_rain: compose(0.8, (o) => [...rainKit(o), drone(o, [110, 146.83], { gain: 0.02, lp: 400 })]),
    myst_clock: compose(0.8, (o) => [drone(o, [65.41, 98], { gain: 0.03, lp: 300, lfoRate: 0.02, lfoDepth: 20 }), clock(o)]),
    myst_noir: compose(0.8, (o) => [noiseLayer(o, brown, { freq: 300, gain: 0.09, lfoRate: 0.03, lfoDepth: 60 }), drone(o, [73.42, 110], { type: 'sawtooth', gain: 0.014, lp: 250 }), scatter(4200, 0.4, () => rainDrop(o))]),
    myst_fog: compose(0.82, (o) => [noiseLayer(o, white, { freq: 700, gain: 0.05, ampRate: 0.1, ampDepth: 0.03 }), scatter(9000, 0.6, () => foghorn(o)), scatter(6000, 0.3, () => gull(o))]),
    myst_suspense: compose(0.82, (o) => [drone(o, [55, 58.27], { gain: 0.05, lp: 220, lfoRate: 0.02, lfoDepth: 15 }), drone(o, [1244.5], { gain: 0.008, lp: 2000, lfoRate: 0, ampRate: 0.2, ampDepth: 0.006 }), scatter(6500, 0.35, () => glow(o, 1568, 0.02, 1.2))]),
    // ── Science Fiction ──
    sci_ship: compose(0.8, (o) => [drone(o, [55, 110], { type: 'sawtooth', gain: 0.038, lp: 300, lfoRate: 0.05, lfoDepth: 30 }), noiseLayer(o, brown, { freq: 200, gain: 0.08 }), scatter(3200, 0.4, () => beep(o))]),
    sci_console: compose(0.78, (o) => [noiseLayer(o, white, { filter: 'bandpass', freq: 1200, q: 0.5, gain: 0.02, lfoRate: 0.2, lfoDepth: 400 }), drone(o, [65.41], { gain: 0.02, lp: 200 }), scatter(1500, 0.6, () => beep(o))]),
    sci_space: compose(0.84, (o) => [drone(o, [36.71, 55, 82.41], { gain: 0.05, lp: 400, lfoRate: 0.015, lfoDepth: 80 }), noiseLayer(o, brown, { freq: 120, gain: 0.06 })]),
    sci_reactor: compose(0.8, (o) => [drone(o, [48], { type: 'sawtooth', gain: 0.03, lp: 200, lfoRate: 0.5, lfoDepth: 40 }), pulseLayer(o, 760, 46, 0.24), noiseLayer(o, white, { filter: 'highpass', freq: 4000, gain: 0.018, lfoRate: 0.3, lfoDepth: 1500 })]),
    sci_alien: compose(0.8, (o) => [drone(o, [110, 155.56], { type: 'triangle', gain: 0.028, lp: 900, lfoRate: 0.2, lfoDepth: 400 }), noiseLayer(o, brown, { filter: 'bandpass', freq: 600, q: 0.6, gain: 0.07, lfoRate: 0.07, lfoDepth: 300 }), scatter(3600, 0.4, () => glow(o, 200 + Math.random() * 600, 0.035, 0.9))]),
    // ── Romance ──
    rom_cafe: compose(0.78, (o) => [murmur(o, 0.055), drone(o, [196, 246.94, 293.66], { gain: 0.018, lp: 900, lfoRate: 0.05, lfoDepth: 60 }), scatter(2600, 0.4, () => clink(o))]),
    rom_rain: compose(0.8, (o) => [...rainKit(o), drone(o, [130.81, 164.81, 196], { gain: 0.02, lp: 700, lfoRate: 0.04, lfoDepth: 50 })]),
    rom_fire: compose(0.8, (o) => [...fireKit(o), drone(o, [110, 164.81, 220], { type: 'sawtooth', gain: 0.018, lp: 500, lfoRate: 0.03, lfoDepth: 40 })]),
    rom_shore: compose(0.82, (o) => [noiseLayer(o, white, { freq: 600, gain: 0.14, ampRate: 0.12, ampDepth: 0.1 }), drone(o, [164.81, 220], { gain: 0.018, lp: 700 }), scatter(8000, 0.3, () => gull(o))]),
    rom_waltz: compose(0.78, (o) => [swellChord(o, [261.63, 329.63, 392, 493.88]), noiseLayer(o, brown, { freq: 400, gain: 0.03 })]),
    // ── Horror ──
    hor_drone: compose(0.84, (o) => [drone(o, [43.65, 46.25], { type: 'sawtooth', gain: 0.05, lp: 220, lfoRate: 0.02, lfoDepth: 15 }), noiseLayer(o, brown, { freq: 120, gain: 0.07 }), scatter(9000, 0.3, () => bellHit(o, 110))]),
    hor_wind: compose(0.84, (o) => [noiseLayer(o, brown, { filter: 'bandpass', freq: 600, q: 0.5, gain: 0.16, lfoRate: 0.06, lfoDepth: 500, ampRate: 0.09, ampDepth: 0.08 }), scatter(4200, 0.4, () => creak(o))]),
    hor_heart: compose(0.82, (o) => [heartbeat(o), drone(o, [55], { gain: 0.03, lp: 200, lfoRate: 0.02, lfoDepth: 10 }), noiseLayer(o, white, { filter: 'highpass', freq: 5000, gain: 0.01, lfoRate: 0.2, lfoDepth: 2000 })]),
    hor_whisper: compose(0.82, (o) => [noiseLayer(o, white, { filter: 'bandpass', freq: 1500, q: 0.8, gain: 0.04, lfoRate: 0.3, lfoDepth: 800, ampRate: 0.4, ampDepth: 0.03 }), drone(o, [58.27, 61.74], { gain: 0.03, lp: 200 }), scatter(5200, 0.4, () => glow(o, 1200 + Math.random() * 800, 0.02, 0.7))]),
    hor_bells: compose(0.84, (o) => [scatter(6000, 0.5, () => bellHit(o, 90)), noiseLayer(o, brown, { freq: 150, gain: 0.07 })]),
    // ── Thriller ──
    thr_pulse: compose(0.82, (o) => [pulseLayer(o, 520, 58, 0.3), drone(o, [65.41, 98], { type: 'sawtooth', gain: 0.022, lp: 300, lfoRate: 0.05, lfoDepth: 30 })]),
    thr_city: compose(0.8, (o) => [noiseLayer(o, brown, { freq: 280, gain: 0.1, lfoRate: 0.03, lfoDepth: 50 }), scatter(11000, 0.35, () => siren(o)), scatter(5000, 0.3, () => rainDrop(o))]),
    thr_tension: compose(0.82, (o) => [drone(o, [1244.5, 1318.5], { gain: 0.009, lp: 2000, lfoRate: 0, ampRate: 0.5, ampDepth: 0.005 }), drone(o, [55], { gain: 0.03, lp: 200 }), clock(o)]),
    thr_stakeout: compose(0.8, (o) => [...rainKit(o), drone(o, [73.42], { type: 'sawtooth', gain: 0.02, lp: 250 })]),
    thr_countdown: compose(0.82, (o) => [metronome(1000, () => burst(ctx, o, tick, { bpFreq: 2000, bpQ: 6, peak: 0.06, attack: 0.002, decay: 0.04 })), drone(o, [110, 146.83], { type: 'sawtooth', gain: 0.02, lp: 400, lfoRate: 0.02, lfoDepth: 120 }), drone(o, [55], { gain: 0.03, lp: 200 })]),
    // ── Literary ──
    lit_cafe: compose(0.78, (o) => [murmur(o, 0.06), scatter(2400, 0.45, () => clink(o)), drone(o, [174.61, 220], { gain: 0.015, lp: 800 })]),
    lit_library: compose(0.76, (o) => [noiseLayer(o, brown, { freq: 250, gain: 0.04 }), scatter(6000, 0.4, () => pageTurn(o))]),
    lit_rain: compose(0.8, (o) => [...rainKit(o), drone(o, [130.81, 196], { gain: 0.018, lp: 700 })]),
    lit_garden: compose(0.78, (o) => [noiseLayer(o, brown, { freq: 500, gain: 0.045, lfoRate: 0.05, lfoDepth: 120 }), scatter(1500, 0.5, () => chirp(o)), drone(o, [196, 261.63], { gain: 0.016, lp: 800 })]),
    lit_night: compose(0.8, (o) => [noiseLayer(o, brown, { freq: 300, gain: 0.05 }), scatter(600, 0.5, () => cricket(o)), scatter(9000, 0.2, () => glow(o, 400, 0.03, 1.4))]),
  }

  // A compressor + makeup gain on the soundscape bus keeps the ambience present
  // and punchy — it evens out the texture and pushes it forward so it reads like
  // deliberate scoring, not faint background. (Music beds duck while it plays, so
  // there's plenty of headroom on the master.)
  const ambienceBus = ctx.createDynamicsCompressor()
  ambienceBus.threshold.value = -18
  ambienceBus.knee.value = 22
  ambienceBus.ratio.value = 3.5
  ambienceBus.attack.value = 0.004
  ambienceBus.release.value = 0.25
  const ambienceMakeup = ctx.createGain()
  ambienceMakeup.gain.value = 1.9
  ambienceBus.connect(ambienceMakeup)
  ambienceMakeup.connect(master)
  const AMBIENCE_BOOST = 1.4 // extra lift on each preset's level

  // Fade beds to silence while a soundscape plays; otherwise raise the active bed.
  const applyMix = () => {
    const t = ctx.currentTime
    Object.keys(beds).forEach((k) => {
      const g = beds[k].gain
      g.cancelScheduledValues(t)
      g.setTargetAtTime(ambienceId ? 0 : k === active ? beds[k]._level : 0, t, 0.9)
    })
  }

  const startAmbience = (id) => {
    if (current && current.id === id) { ambienceId = id; applyMix(); return }
    const t = ctx.currentTime
    if (current) {
      const old = current
      old.gain.gain.cancelScheduledValues(t)
      old.gain.gain.setTargetAtTime(0, t, 0.5)
      setTimeout(() => old.stop(), 1500)
    }
    const build = ambiencePresets[id]
    if (!build) { current = null; ambienceId = null; applyMix(); return }
    const g = ctx.createGain()
    g.gain.value = 0.0001
    g.connect(ambienceBus)
    const preset = build(g)
    current = { id, gain: g, stop: () => { preset.stop(); g.disconnect() } }
    ambienceId = id
    g.gain.setTargetAtTime(preset.level * AMBIENCE_BOOST, t, 0.7)
    applyMix()
  }

  const haltAmbience = () => {
    const t = ctx.currentTime
    if (current) {
      const old = current
      old.gain.gain.cancelScheduledValues(t)
      old.gain.gain.setTargetAtTime(0, t, 0.5)
      setTimeout(() => old.stop(), 1500)
    }
    current = null
    ambienceId = null
    applyMix()
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
    playBed(type) {
      active = BED_FOR[type] || 'home'
      applyMix()
    },
    playAmbience(id) {
      startAmbience(id)
    },
    stopAmbience() {
      haltAmbience()
    },
    previewAmbience(id) {
      if (ctx.state === 'suspended') ctx.resume()
      if (!enabled) {
        master.gain.cancelScheduledValues(ctx.currentTime)
        master.gain.setTargetAtTime(0.9, ctx.currentTime, 0.2)
        previewingMaster = true
      }
      startAmbience(id)
    },
    stopPreview() {
      if (previewingMaster) {
        master.gain.cancelScheduledValues(ctx.currentTime)
        master.gain.setTargetAtTime(0, ctx.currentTime, 0.25)
        previewingMaster = false
      }
      haltAmbience()
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
      clearInterval(timer)
      clearInterval(musicTimer)
      if (current) current.stop()
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
