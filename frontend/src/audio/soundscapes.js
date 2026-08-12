/* Story soundscapes — every sound here is synthesised in the Web Audio graph at
   runtime. No audio files, no libraries, nothing to download.

   The ids match src/audio/ambience.js (and the `ambience` column on stories),
   so they must stay stable; only the sound behind an id ever changes.

   Three things do most of the work of making these read as *places* rather than
   as filtered noise:

     • pink and brown noise instead of white — white noise is flat, which the ear
       hears as hiss. Rain, wind and room tone all slope down with frequency.
     • stereo everywhere. The noise buffers hold two uncorrelated channels, and
       every one-shot (a drip, a bird, a footstep) lands at its own pan position.
     • a convolution reverb built from a decaying noise impulse, so events sit in
       a room instead of on top of the speaker.

   Movement comes from `wander` — random walks towards new targets — rather than
   sine LFOs, because a gust that repeats on a fixed cycle stops sounding like
   weather within about ten seconds. */

const NOISE_SECONDS = 7

// ── noise ──────────────────────────────────────────────────────────────────

const normalize = (d, target = 0.9) => {
  let mean = 0
  for (let i = 0; i < d.length; i++) mean += d[i]
  mean /= d.length
  let peak = 0
  for (let i = 0; i < d.length; i++) {
    d[i] -= mean // any DC offset would just eat headroom
    const a = Math.abs(d[i])
    if (a > peak) peak = a
  }
  if (peak > 0) {
    const k = target / peak
    for (let i = 0; i < d.length; i++) d[i] *= k
  }
}

const fillPink = (d) => {
  // Paul Kellet's filter bank: white noise shaped to roughly -3 dB per octave.
  let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0
  for (let i = 0; i < d.length; i++) {
    const w = Math.random() * 2 - 1
    b0 = 0.99886 * b0 + w * 0.0555179
    b1 = 0.99332 * b1 + w * 0.0750759
    b2 = 0.969 * b2 + w * 0.153852
    b3 = 0.8665 * b3 + w * 0.3104856
    b4 = 0.55 * b4 + w * 0.5329522
    b5 = -0.7616 * b5 - w * 0.016898
    d[i] = b0 + b1 + b2 + b3 + b4 + b5 + b6 + w * 0.5362
    b6 = w * 0.115926
  }
}

const fillBrown = (d) => {
  // -6 dB per octave: a leaky integrator over white noise.
  let last = 0
  for (let i = 0; i < d.length; i++) {
    const w = Math.random() * 2 - 1
    last = (last + 0.021 * w) / 1.021
    d[i] = last
  }
}

const noiseBuffer = (ctx, kind) => {
  const len = Math.floor(NOISE_SECONDS * ctx.sampleRate)
  const buf = ctx.createBuffer(2, len, ctx.sampleRate)
  for (let ch = 0; ch < 2; ch++) {
    const d = buf.getChannelData(ch)
    if (kind === 'pink') fillPink(d)
    else if (kind === 'brown') fillBrown(d)
    else for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1
    normalize(d, kind === 'brown' ? 0.85 : 0.9)
  }
  return buf
}

// A decaying burst of noise makes a serviceable impulse response: `decay` bends
// the tail, `damp` rolls the highs off it the way a real room does.
const impulse = (ctx, seconds, decay, damp) => {
  const len = Math.floor(seconds * ctx.sampleRate)
  const buf = ctx.createBuffer(2, len, ctx.sampleRate)
  for (let ch = 0; ch < 2; ch++) {
    const d = buf.getChannelData(ch)
    const pre = Math.floor(ctx.sampleRate * (ch ? 0.017 : 0.011))
    let lp = 0
    for (let i = 0; i < len; i++) {
      if (i < pre) { d[i] = 0; continue }
      const t = (i - pre) / (len - pre)
      lp += damp * (Math.random() * 2 - 1 - lp)
      d[i] = lp * Math.pow(1 - t, decay)
    }
  }
  return buf
}

// ── engine ─────────────────────────────────────────────────────────────────

export function createSoundscapes(ctx, destination) {
  const white = noiseBuffer(ctx, 'white')
  const pink = noiseBuffer(ctx, 'pink')
  const brown = noiseBuffer(ctx, 'brown')
  const roomIR = impulse(ctx, 1.4, 3.4, 0.32)
  const hallIR = impulse(ctx, 3.4, 2.1, 0.14)

  /* The soundscape bus. Gentle compression keeps a preset's quiet stretches
     audible under the reader's own room noise, and the shelf takes the digital
     edge off the top end that synthesised noise always has too much of. */
  const comp = ctx.createDynamicsCompressor()
  comp.threshold.value = -17
  comp.knee.value = 24
  comp.ratio.value = 2.6
  comp.attack.value = 0.006
  comp.release.value = 0.3
  const shelf = ctx.createBiquadFilter()
  shelf.type = 'highshelf'
  shelf.frequency.value = 6500
  shelf.gain.value = -5
  const makeup = ctx.createGain()
  makeup.gain.value = 1.25
  comp.connect(shelf)
  shelf.connect(makeup)
  makeup.connect(destination)

  const rnd = (a, b) => a + Math.random() * (b - a)
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)]
  const stopOsc = (o) => { try { o.stop() } catch { /* already stopped */ } o.disconnect() }
  const kill = (nodes) => nodes.forEach((n) => { try { n.disconnect() } catch { /* gone */ } })

  const bq = (type, freq, q, gain) => {
    const f = ctx.createBiquadFilter()
    f.type = type
    f.frequency.value = freq
    if (q != null) f.Q.value = q
    if (gain != null) f.gain.value = gain
    return f
  }

  /* Chains `nodes` in series into `dest` through a panner, optionally sending a
     copy to a reverb, and hands back the teardown for when the sound is done. */
  const wire = (dest, pan, nodes, verb, send = 0.3) => {
    const p = ctx.createStereoPanner()
    p.pan.value = pan
    nodes.reduce((a, b) => { a.connect(b); return b }).connect(p)
    p.connect(dest)
    const extra = []
    if (verb) {
      const s = ctx.createGain()
      s.gain.value = send
      p.connect(s)
      s.connect(verb)
      extra.push(s)
    }
    return () => kill([...nodes, p, ...extra])
  }

  // ── continuous layers (each returns its own stop) ────────────────────────

  const loopSource = (buf) => {
    const s = ctx.createBufferSource()
    s.buffer = buf
    s.loop = true
    s.playbackRate.value = rnd(0.85, 1.15) // decorrelates layers sharing a buffer
    s.start(ctx.currentTime, Math.random() * NOISE_SECONDS)
    return s
  }

  // Filtered looping noise: wind, rain, room tone, sea, air handling.
  const bed = (out, buf, { filter = 'lowpass', freq = 800, q = 0.7, hp = 0, gain = 0.1, verb = null, send = 0.2 } = {}) => {
    const s = loopSource(buf)
    const f = bq(filter, freq, q)
    const g = ctx.createGain()
    g.gain.value = gain
    let head = s
    const nodes = [s, f, g]
    if (hp) {
      const h = bq('highpass', hp, 0.7)
      head.connect(h)
      head = h
      nodes.splice(1, 0, h)
    }
    head.connect(f)
    f.connect(g)
    g.connect(out)
    if (verb) {
      const sd = ctx.createGain()
      sd.gain.value = send
      g.connect(sd)
      sd.connect(verb)
      nodes.push(sd)
    }
    const stop = () => { try { s.stop() } catch { /* already stopped */ } kill(nodes) }
    stop.freq = f.frequency
    stop.gain = g.gain
    return stop
  }

  /* Random walk on an AudioParam. Weather, traffic and crowds all drift; a sine
     LFO doing the same job announces itself as a loop almost immediately. */
  const wander = (param, { min, max, everyMs = 2400, glide = 2 }) => {
    const step = () => param.setTargetAtTime(rnd(min, max), ctx.currentTime, glide)
    step()
    const iv = setInterval(() => { if (ctx.state === 'running') step() }, everyMs)
    return () => clearInterval(iv)
  }

  // Sustained tone stack — pads, hums, engine drones.
  const drone = (out, freqs, { type = 'sine', gain = 0.04, detune = 1.004, lp = 700, spread = 0.4, move = 0, moveDepth = 0, verb = null, send = 0.25 } = {}) => {
    const lpf = bq('lowpass', lp, 0.7)
    const g = ctx.createGain()
    g.gain.value = gain
    lpf.connect(g)
    g.connect(out)
    const nodes = [lpf, g]
    if (verb) {
      const sd = ctx.createGain()
      sd.gain.value = send
      g.connect(sd)
      sd.connect(verb)
      nodes.push(sd)
    }
    const oscs = []
    freqs.forEach((fr, i) => {
      const side = i % 2 ? spread : -spread
      ;[fr, fr * detune].forEach((f, j) => {
        const o = ctx.createOscillator()
        o.type = type
        o.frequency.value = f
        const p = ctx.createStereoPanner()
        p.pan.value = j ? -side : side
        o.connect(p)
        p.connect(lpf)
        o.start()
        oscs.push(o)
        nodes.push(p)
      })
    })
    const stops = []
    if (move) stops.push(wander(lpf.frequency, { min: lp - moveDepth, max: lp + moveDepth, everyMs: move, glide: 3 }))
    return () => { oscs.forEach(stopOsc); kill(nodes); stops.forEach((s) => s()) }
  }

  // Sparse random events (drips, birds) and steady ones (a clock, a pulse).
  const scatter = (everyMs, prob, fn) => {
    const iv = setInterval(() => { if (ctx.state === 'running' && Math.random() < prob) fn() }, everyMs)
    return () => clearInterval(iv)
  }
  const metronome = (everyMs, fn) => {
    const iv = setInterval(() => { if (ctx.state === 'running') fn() }, everyMs)
    return () => clearInterval(iv)
  }

  // ── one-shot voices ──────────────────────────────────────────────────────

  // Short filtered noise — the transient half of most natural sounds.
  const tick = (out, { buf = white, filter = 'bandpass', freq = 2000, q = 3, hp = 0, peak = 0.06, attack = 0.003, decay = 0.05, pan = 0, verb = null, send = 0.25 }) => {
    const t = ctx.currentTime
    const s = ctx.createBufferSource()
    s.buffer = buf
    s.playbackRate.value = rnd(0.8, 1.25)
    const f = bq(filter, freq, q)
    const g = ctx.createGain()
    g.gain.setValueAtTime(0.0001, t)
    g.gain.exponentialRampToValueAtTime(peak, t + attack)
    g.gain.exponentialRampToValueAtTime(0.0001, t + attack + decay)
    const chain = hp ? [s, bq('highpass', hp, 0.7), f, g] : [s, f, g]
    const done = wire(out, pan, chain, verb, send)
    s.onended = done
    s.start(t, Math.random() * (NOISE_SECONDS - 0.5))
    s.stop(t + attack + decay + 0.05)
  }

  // A tone with an attack/hold/release envelope, used for anything pitched.
  const tone = (out, freq, { type = 'sine', peak = 0.07, attack = 0.05, hold = 0.1, release = 0.8, pan = 0, lp = 0, bend = 0, bendTime = 0.2, vibRate = 0, vibDepth = 0, verb = null, send = 0.3 } = {}) => {
    const t = ctx.currentTime
    const o = ctx.createOscillator()
    o.type = type
    o.frequency.setValueAtTime(freq, t)
    if (bend) o.frequency.exponentialRampToValueAtTime(Math.max(20, freq * bend), t + bendTime)
    const g = ctx.createGain()
    const end = attack + hold + release
    g.gain.setValueAtTime(0.0001, t)
    g.gain.exponentialRampToValueAtTime(peak, t + attack)
    g.gain.setValueAtTime(peak, t + attack + hold)
    g.gain.exponentialRampToValueAtTime(0.0001, t + end)
    const chain = lp ? [o, bq('lowpass', lp, 0.7), g] : [o, g]
    const done = wire(out, pan, chain, verb, send)
    let vib
    if (vibRate) {
      vib = ctx.createOscillator()
      vib.frequency.value = vibRate
      const vg = ctx.createGain()
      vg.gain.value = vibDepth
      vib.connect(vg)
      vg.connect(o.frequency)
      vib.start(t)
      vib.stop(t + end + 0.05)
    }
    o.onended = () => { if (vib) stopOsc(vib); done() }
    o.start(t)
    o.stop(t + end + 0.05)
  }

  // Rain: a soft body plus a resonant "plink", so drops read as water on a
  // surface rather than as a click track.
  const drop = (out, verb, { bright = 1, level = 1 } = {}) => {
    const pan = rnd(-0.75, 0.75)
    tick(out, { buf: pink, filter: 'bandpass', freq: rnd(700, 2400) * bright, q: rnd(1.4, 3), peak: rnd(0.03, 0.07) * level, attack: 0.002, decay: rnd(0.02, 0.055), pan, verb, send: 0.3 })
    if (Math.random() < 0.35) {
      const f = rnd(1000, 2200) * bright
      tone(out, f, { peak: 0.02 * level, attack: 0.002, hold: 0.004, release: 0.07, bend: 0.55, bendTime: 0.06, pan, verb, send: 0.45 })
    }
  }

  // Fire: mostly a low roar, with tiny sharp splinters over the top.
  const crackle = (out, verb) => {
    const pan = rnd(-0.6, 0.6)
    tick(out, { buf: white, filter: 'highpass', freq: rnd(2200, 5200), q: 0.7, peak: rnd(0.02, 0.055), attack: 0.001, decay: rnd(0.008, 0.03), pan, verb, send: 0.22 })
    if (Math.random() < 0.12) {
      // an occasional sap pop, with some body to it
      tick(out, { buf: pink, filter: 'bandpass', freq: rnd(400, 900), q: 4, peak: 0.05, attack: 0.002, decay: 0.09, pan, verb, send: 0.3 })
    }
  }

  // Bells and chimes: inharmonic partials, each decaying at its own rate.
  const bell = (out, base, { peak = 0.1, dur = 3.2, pan = 0, verb = null } = {}) => {
    const partials = [[1, 1, 1], [2.02, 0.5, 0.72], [2.98, 0.32, 0.5], [4.48, 0.18, 0.34], [5.36, 0.1, 0.22]]
    partials.forEach(([mult, amp, life]) => {
      const t = ctx.currentTime
      const o = ctx.createOscillator()
      o.type = 'sine'
      o.frequency.value = base * mult
      const g = ctx.createGain()
      g.gain.setValueAtTime(0.0001, t)
      g.gain.exponentialRampToValueAtTime(peak * amp, t + 0.008)
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur * life)
      const done = wire(out, pan, [o, g], verb, 0.5)
      o.onended = done
      o.start(t)
      o.stop(t + dur * life + 0.05)
    })
    // the strike itself
    tick(out, { buf: white, filter: 'bandpass', freq: base * 6, q: 2, peak: peak * 0.3, attack: 0.001, decay: 0.05, pan, verb, send: 0.4 })
  }

  const chime = (out, verb, notes) => {
    const pan = rnd(-0.5, 0.5)
    notes.forEach((f, i) => setTimeout(() => bell(out, f, { peak: 0.05, dur: 2.6, pan, verb }), i * 130))
  }

  /* Birds. A real song is a couple of notes that slide, so each note bends and
     carries a little vibrato; a soft second harmonic keeps it off "pure sine". */
  const birdSong = (out, verb) => {
    const pan = rnd(-0.8, 0.8)
    const base = rnd(2100, 3800)
    const notes = pick([[1, 1.28], [1, 0.82, 1.1], [1], [1, 1.5, 1.22, 1.5]])
    notes.forEach((m, i) => {
      setTimeout(() => {
        const f = base * m
        tone(out, f, { peak: 0.05, attack: 0.012, hold: 0.03, release: 0.09, bend: rnd(0.9, 1.12), bendTime: 0.09, vibRate: 24, vibDepth: f * 0.02, pan, verb, send: 0.35 })
        tone(out, f * 2, { peak: 0.012, attack: 0.012, hold: 0.02, release: 0.07, pan, verb, send: 0.35 })
      }, i * rnd(90, 190))
    })
  }

  const cricket = (out, verb) => {
    const pan = rnd(-0.85, 0.85)
    const base = rnd(3900, 4800)
    const n = 3 + Math.floor(Math.random() * 3)
    for (let i = 0; i < n; i++) {
      setTimeout(() => tick(out, { buf: white, filter: 'bandpass', freq: base, q: 22, peak: 0.05, attack: 0.004, decay: 0.022, pan, verb, send: 0.35 }), i * 42)
    }
  }

  const owl = (out, verb) => {
    const pan = rnd(-0.5, 0.5)
    ;[0, 620].forEach((delay, i) => {
      setTimeout(() => tone(out, i ? 372 : 396, { peak: 0.05, attack: 0.07, hold: 0.09, release: 0.28, bend: 0.94, bendTime: 0.3, lp: 900, pan, verb, send: 0.5 }), delay)
    })
  }

  const gull = (out, verb) => {
    const pan = rnd(-0.8, 0.8)
    const n = 2 + Math.floor(Math.random() * 2)
    for (let i = 0; i < n; i++) {
      setTimeout(() => {
        const t = ctx.currentTime
        const o = ctx.createOscillator()
        o.type = 'sawtooth'
        o.frequency.setValueAtTime(rnd(1100, 1400), t)
        o.frequency.exponentialRampToValueAtTime(rnd(620, 780), t + 0.28)
        const f = bq('bandpass', 1500, 2.5)
        const g = ctx.createGain()
        g.gain.setValueAtTime(0.0001, t)
        g.gain.exponentialRampToValueAtTime(0.045, t + 0.04)
        g.gain.exponentialRampToValueAtTime(0.0001, t + 0.32)
        const done = wire(out, pan, [o, f, g], verb, 0.4)
        o.onended = done
        o.start(t)
        o.stop(t + 0.36)
      }, i * rnd(300, 460))
    }
  }

  // A syllable of speech: noise pushed through vowel formants. Stack these at
  // low level and the ear hears a room full of people instead of hiss.
  const syllable = (out, verb, { whisper = false, level = 1 } = {}) => {
    const t = ctx.currentTime
    const dur = rnd(0.11, 0.26)
    const vowel = pick([[520, 1180, 2500], [400, 1900, 2550], [660, 1720, 2410], [320, 1000, 2400], [700, 1220, 2600]])
    const s = ctx.createBufferSource()
    s.buffer = whisper ? white : brown
    s.playbackRate.value = rnd(0.75, 1.3)
    const g = ctx.createGain()
    g.gain.setValueAtTime(0.0001, t)
    g.gain.exponentialRampToValueAtTime(rnd(0.5, 1) * level, t + dur * 0.3)
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
    const pan = rnd(-0.85, 0.85)
    const p = ctx.createStereoPanner()
    p.pan.value = pan
    const nodes = [s, g, p]
    s.connect(g)
    vowel.forEach((f, i) => {
      const bp = bq('bandpass', f * rnd(0.94, 1.06), whisper ? 6 : 9)
      const bg = ctx.createGain()
      bg.gain.value = [0.05, 0.028, 0.014][i] * (whisper ? 0.5 : 1)
      g.connect(bp)
      bp.connect(bg)
      bg.connect(p)
      nodes.push(bp, bg)
    })
    p.connect(out)
    if (verb) {
      const sd = ctx.createGain()
      sd.gain.value = whisper ? 0.5 : 0.25
      p.connect(sd)
      sd.connect(verb)
      nodes.push(sd)
    }
    s.onended = () => kill(nodes)
    s.start(t, Math.random() * (NOISE_SECONDS - 1))
    s.stop(t + dur + 0.05)
  }

  const clink = (out, verb) => {
    const pan = rnd(-0.6, 0.6)
    const base = rnd(1900, 3100)
    ;[1, 2.76, 5.1].forEach((m, i) => {
      tone(out, base * m, { peak: [0.03, 0.016, 0.008][i], attack: 0.002, hold: 0.004, release: [0.5, 0.3, 0.16][i], pan, verb, send: 0.4 })
    })
  }

  const pageTurn = (out, verb) => {
    const pan = rnd(-0.35, 0.35)
    tick(out, { buf: pink, filter: 'highpass', freq: 1600, q: 0.7, peak: 0.03, attack: 0.02, decay: 0.09, pan, verb, send: 0.25 })
    setTimeout(() => tick(out, { buf: pink, filter: 'highpass', freq: 2400, q: 0.7, peak: 0.024, attack: 0.01, decay: 0.13, pan, verb, send: 0.25 }), 170)
  }

  const footstep = (out, verb) => {
    const pan = rnd(-0.5, 0.5)
    tone(out, 96, { peak: 0.035, attack: 0.004, hold: 0.01, release: 0.1, bend: 0.6, bendTime: 0.06, lp: 300, pan, verb, send: 0.35 })
    tick(out, { buf: pink, filter: 'bandpass', freq: 1500, q: 1.2, peak: 0.022, attack: 0.002, decay: 0.06, pan, verb, send: 0.35 })
  }

  /* Timber creak. Wood doesn't slide, it sticks and slips — so the pitch climbs
     while a fast tremolo chops the level. */
  const creak = (out, verb) => {
    const t = ctx.currentTime
    const dur = rnd(0.7, 1.4)
    const o = ctx.createOscillator()
    o.type = 'sawtooth'
    o.frequency.setValueAtTime(rnd(95, 150), t)
    o.frequency.linearRampToValueAtTime(rnd(170, 260), t + dur)
    const f = bq('bandpass', rnd(320, 520), 7)
    const g = ctx.createGain()
    g.gain.setValueAtTime(0.0001, t)
    g.gain.exponentialRampToValueAtTime(0.03, t + dur * 0.35)
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
    const chop = ctx.createOscillator()
    chop.type = 'sawtooth'
    chop.frequency.value = rnd(11, 22)
    const cg = ctx.createGain()
    cg.gain.value = 0.011
    chop.connect(cg)
    cg.connect(g.gain)
    chop.start(t)
    chop.stop(t + dur + 0.05)
    const done = wire(out, rnd(-0.7, 0.7), [o, f, g], verb, 0.4)
    o.onended = () => { stopOsc(chop); cg.disconnect(); done() }
    o.start(t)
    o.stop(t + dur + 0.05)
  }

  // Two low tones a fifth apart, held and released — the classic harbour call.
  const foghorn = (out, verb) => {
    ;[false, true].forEach((second) => {
      setTimeout(() => {
        ;[1, 1.5, 2].forEach((m, i) => {
          tone(out, 62 * m, { type: i ? 'sine' : 'triangle', peak: [0.12, 0.05, 0.022][i], attack: 0.55, hold: 0.9, release: 1.6, lp: 340, pan: -0.15, verb, send: 0.55 })
        })
      }, second ? 2400 : 0)
    })
  }

  // Distant brass. Slow attack, a touch of vibrato, most of the top rolled off.
  const horn = (out, verb) => {
    const base = pick([146.83, 174.61, 196])
    ;[1, 2, 3].forEach((m, i) => {
      tone(out, base * m, { type: 'triangle', peak: [0.075, 0.03, 0.014][i], attack: 0.5, hold: 0.7, release: 1.9, lp: 700, vibRate: 4.6, vibDepth: base * m * 0.006, pan: rnd(-0.3, 0.3), verb, send: 0.6 })
    })
  }

  // A car going past: noise that swells, sweeps across the stereo field and
  // loses its high end as it recedes.
  const passingCar = (out, verb) => {
    const t = ctx.currentTime
    const dur = rnd(2.6, 4.2)
    const dir = Math.random() < 0.5 ? 1 : -1
    const s = loopSource(brown)
    const f = bq('bandpass', 320, 0.8)
    f.frequency.setValueAtTime(240, t)
    f.frequency.linearRampToValueAtTime(700, t + dur * 0.45)
    f.frequency.linearRampToValueAtTime(190, t + dur)
    const g = ctx.createGain()
    g.gain.setValueAtTime(0.0001, t)
    g.gain.exponentialRampToValueAtTime(rnd(0.05, 0.11), t + dur * 0.45)
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
    const p = ctx.createStereoPanner()
    p.pan.setValueAtTime(-0.9 * dir, t)
    p.pan.linearRampToValueAtTime(0.9 * dir, t + dur)
    s.connect(f)
    f.connect(g)
    g.connect(p)
    p.connect(out)
    const nodes = [s, f, g, p]
    if (verb) {
      const sd = ctx.createGain()
      sd.gain.value = 0.25
      p.connect(sd)
      sd.connect(verb)
      nodes.push(sd)
    }
    s.onended = () => kill(nodes)
    s.stop(t + dur + 0.05)
  }

  const siren = (out, verb) => {
    const pan = rnd(-0.8, 0.8)
    for (let i = 0; i < 4; i++) {
      setTimeout(() => {
        tone(out, i % 2 ? 700 : 560, { peak: 0.016, attack: 0.12, hold: 0.2, release: 0.3, lp: 1100, pan, verb, send: 0.6 })
      }, i * 640)
    }
  }

  // The hiss of a steam wand — a café's loudest recurring sound.
  const steam = (out, verb) => {
    const t = ctx.currentTime
    const dur = rnd(0.9, 1.8)
    const s = loopSource(white)
    const f = bq('highpass', 2200, 0.7)
    const g = ctx.createGain()
    g.gain.setValueAtTime(0.0001, t)
    g.gain.exponentialRampToValueAtTime(0.02, t + 0.15)
    g.gain.setValueAtTime(0.02, t + dur * 0.7)
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
    const done = wire(out, rnd(-0.5, 0.5), [s, f, g], verb, 0.25)
    s.onended = done
    s.stop(t + dur + 0.05)
  }

  const honk = (out, verb) => {
    const pan = rnd(-0.7, 0.7)
    ;[1, 1.26].forEach((m, i) => tone(out, 320 * m, { type: 'sawtooth', peak: [0.02, 0.014][i], attack: 0.03, hold: rnd(0.1, 0.4), release: 0.14, lp: 1200, pan, verb, send: 0.5 }))
  }

  const beep = (out, verb) => {
    const pan = rnd(-0.6, 0.6)
    const f = pick([784, 880, 1046.5, 1318.5])
    tone(out, f, { type: 'triangle', peak: 0.035, attack: 0.006, hold: rnd(0.03, 0.09), release: 0.08, lp: 2600, pan, verb, send: 0.3 })
    if (Math.random() < 0.4) setTimeout(() => tone(out, f * 1.5, { type: 'triangle', peak: 0.028, attack: 0.006, hold: 0.04, release: 0.08, lp: 2600, pan, verb, send: 0.3 }), 150)
  }

  const thump = (out, freq, peak, dur, pan = 0) =>
    tone(out, freq * 1.7, { peak, attack: 0.008, hold: 0.01, release: dur, bend: 0.58, bendTime: 0.07, lp: 220, pan })

  // ── layer kits ───────────────────────────────────────────────────────────

  /* Rain. Three layers do it: a broad body around the low mids, a quieter
     sizzle on top, and individual drops. The body drifts in level and cutoff so
     the shower breathes instead of sitting still. */
  const rainKit = (out, verb, { weight = 1, muffled = false, dropsMs = 85, dropChance = 0.6 } = {}) => {
    const body = bed(out, pink, { filter: 'lowpass', freq: muffled ? 560 : 1100, q: 0.6, hp: 110, gain: 0.2 * weight, verb, send: 0.12 })
    const sizzle = bed(out, pink, { filter: 'highpass', freq: muffled ? 1600 : 2600, q: 0.5, gain: (muffled ? 0.007 : 0.018) * weight })
    return [
      body,
      sizzle,
      bed(out, brown, { filter: 'lowpass', freq: 220, gain: 0.06 * weight }),
      wander(body.gain, { min: 0.15 * weight, max: 0.24 * weight, everyMs: 4200, glide: 2.6 }),
      wander(body.freq, { min: muffled ? 420 : 800, max: muffled ? 720 : 1500, everyMs: 5200, glide: 3 }),
      scatter(dropsMs, dropChance, () => drop(out, verb, { bright: muffled ? 0.5 : 1, level: muffled ? 0.7 : 1 })),
    ]
  }

  const fireKit = (out, verb) => [
    bed(out, brown, { filter: 'lowpass', freq: 420, gain: 0.13, verb, send: 0.1 }),
    bed(out, pink, { filter: 'bandpass', freq: 900, q: 0.8, gain: 0.03 }),
    scatter(95, 0.72, () => crackle(out, verb)),
  ]

  // Wind. One moving band for the body, one narrow high band for the whistle
  // over an edge; both walk to new targets so gusts never fall into a pattern.
  const windKit = (out, verb, { strength = 1, howl = 0.4 } = {}) => {
    const body = bed(out, brown, { filter: 'bandpass', freq: 500, q: 0.6, gain: 0.14 * strength, verb, send: 0.15 })
    const air = bed(out, pink, { filter: 'bandpass', freq: 1300, q: 3.5, gain: 0.02 * howl })
    return [
      body,
      air,
      wander(body.freq, { min: 260, max: 1000, everyMs: 2600, glide: 2.2 }),
      wander(body.gain, { min: 0.05 * strength, max: 0.2 * strength, everyMs: 2100, glide: 1.8 }),
      wander(air.freq, { min: 900, max: 2400, everyMs: 3100, glide: 2.6 }),
      wander(air.gain, { min: 0.002, max: 0.03 * howl, everyMs: 2700, glide: 2.2 }),
    ]
  }

  // A room of people: constant low babble plus individual syllables.
  const crowdKit = (out, verb, { level = 1, busy = 260 } = {}) => [
    bed(out, brown, { filter: 'bandpass', freq: 500, q: 0.8, gain: 0.05 * level, verb, send: 0.3 }),
    scatter(busy, 0.65, () => syllable(out, verb, { level: 0.75 * level })),
  ]

  // Sea. Each wave is its own swell — rush in, hiss out — rather than a hum.
  const waveKit = (out, verb) => {
    const wave = () => {
      const t = ctx.currentTime
      const rise = rnd(1.1, 2)
      const fall = rnd(2.4, 3.8)
      const s = loopSource(pink)
      const f = bq('lowpass', 500, 0.7)
      f.frequency.setValueAtTime(420, t)
      f.frequency.linearRampToValueAtTime(rnd(1600, 2400), t + rise)
      f.frequency.linearRampToValueAtTime(500, t + rise + fall)
      const g = ctx.createGain()
      g.gain.setValueAtTime(0.0001, t)
      g.gain.exponentialRampToValueAtTime(rnd(0.09, 0.16), t + rise)
      g.gain.exponentialRampToValueAtTime(0.0001, t + rise + fall)
      const p = ctx.createStereoPanner()
      p.pan.value = rnd(-0.4, 0.4)
      s.connect(f)
      f.connect(g)
      g.connect(p)
      p.connect(out)
      const nodes = [s, f, g, p]
      if (verb) {
        const sd = ctx.createGain()
        sd.gain.value = 0.2
        p.connect(sd)
        sd.connect(verb)
        nodes.push(sd)
      }
      s.onended = () => kill(nodes)
      s.stop(t + rise + fall + 0.1)
    }
    wave()
    const second = setTimeout(wave, 3200) // overlap two swells from the start
    return [
      () => clearTimeout(second),
      bed(out, brown, { filter: 'lowpass', freq: 260, gain: 0.07 }),
      scatter(2600, 0.55, wave),
    ]
  }

  // Lub-dub, with the interval drifting — a metronomic pulse reads as a machine.
  const heartbeat = (out) => {
    let alive = true
    let timer = null
    const beat = () => {
      if (!alive) return
      if (ctx.state === 'running') {
        thump(out, 54, 0.4, 0.19)
        setTimeout(() => { if (alive) thump(out, 47, 0.25, 0.16) }, 245)
      }
      timer = setTimeout(beat, rnd(1030, 1210))
    }
    beat()
    return () => { alive = false; clearTimeout(timer) }
  }

  const clock = (out, verb) => {
    let tock = false
    return metronome(1000, () => {
      // tick and tock differ, and each has a wooden knock under the click
      const pan = tock ? 0.08 : -0.06
      tick(out, { buf: white, filter: 'bandpass', freq: tock ? 2500 : 2900, q: 5, peak: tock ? 0.045 : 0.055, attack: 0.001, decay: 0.018, pan, verb, send: 0.35 })
      tone(out, tock ? 168 : 190, { peak: 0.02, attack: 0.002, hold: 0.004, release: 0.05, lp: 500, pan, verb, send: 0.3 })
      tock = !tock
    })
  }

  const compose = (level, build) => (out, verb) => {
    const stops = build(out, verb).flat().filter(Boolean)
    return { level, stop: () => stops.forEach((s) => s()) }
  }

  // ── presets ──────────────────────────────────────────────────────────────
  // Each takes (out, fx) where fx.room / fx.hall are lazily built reverb sends.

  const presets = {
    // ── Fantasy ──
    fant_forest: compose(1.7, (o, fx) => [
      bed(o, pink, { filter: 'bandpass', freq: 1400, q: 0.5, gain: 0.035 }),
      bed(o, brown, { filter: 'lowpass', freq: 420, gain: 0.07 }),
      scatter(2300, 0.55, () => birdSong(o, fx.room())),
      scatter(7000, 0.4, () => chime(o, fx.hall(), [pick([880, 1046.5]), pick([1318.5, 1567.98])])),
      drone(o, [196, 293.66], { gain: 0.016, lp: 620, move: 6000, moveDepth: 160 }),
    ]),
    fant_tavern: compose(1.25, (o, fx) => [
      fireKit(o, fx.room()),
      crowdKit(o, fx.room(), { level: 0.9, busy: 300 }),
      scatter(4200, 0.5, () => clink(o, fx.room())),
      drone(o, [110, 164.81], { type: 'triangle', gain: 0.018, lp: 460 }),
    ]),
    fant_castle: compose(1.05, (o, fx) => [
      drone(o, [87.31, 130.81, 174.61], { gain: 0.026, lp: 520, move: 8000, moveDepth: 90, verb: fx.hall(), send: 0.4 }),
      windKit(o, fx.hall(), { strength: 0.55, howl: 0.8 }),
      scatter(14000, 0.5, () => bell(o, 152, { peak: 0.075, dur: 4.5, pan: rnd(-0.3, 0.3), verb: fx.hall() })),
      scatter(6000, 0.3, () => drop(o, fx.hall(), { level: 0.7 })),
    ]),
    fant_magic: compose(1.15, (o, fx) => [
      drone(o, [261.63, 329.63, 392], { gain: 0.02, lp: 1400, move: 4000, moveDepth: 500, verb: fx.hall(), send: 0.45 }),
      scatter(1400, 0.55, () => chime(o, fx.hall(), [pick([1046.5, 1318.5, 1567.98, 2093])])),
      bed(o, pink, { filter: 'highpass', freq: 6000, gain: 0.008 }),
    ]),
    fant_highlands: compose(1.65, (o, fx) => [
      windKit(o, fx.hall(), { strength: 1.15, howl: 0.5 }),
      bed(o, pink, { filter: 'bandpass', freq: 2600, q: 0.6, gain: 0.012 }), // grass
      drone(o, [98, 146.83], { gain: 0.014, lp: 380 }),
      scatter(16000, 0.5, () => horn(o, fx.hall())),
    ]),

    // ── Mystery ──
    myst_rain: compose(1.3, (o, fx) => [
      rainKit(o, fx.room(), { weight: 1 }),
      scatter(900, 0.35, () => tick(o, { buf: pink, filter: 'bandpass', freq: rnd(1400, 2600), q: 4, peak: 0.026, attack: 0.001, decay: 0.03, pan: rnd(-0.5, 0.5), verb: fx.room(), send: 0.35 })), // taps on the pane
      drone(o, [110, 146.83], { gain: 0.016, lp: 380 }),
    ]),
    myst_clock: compose(1.5, (o, fx) => [
      bed(o, brown, { filter: 'lowpass', freq: 300, gain: 0.05 }),
      clock(o, fx.room()),
      drone(o, [65.41, 98], { gain: 0.022, lp: 280 }),
      scatter(12000, 0.35, () => creak(o, fx.room())),
    ]),
    myst_noir: compose(1.8, (o, fx) => [
      bed(o, brown, { filter: 'lowpass', freq: 280, gain: 0.09 }),
      scatter(9000, 0.4, () => passingCar(o, fx.hall())),
      scatter(3400, 0.45, () => drop(o, fx.hall(), { level: 0.8 })),
      drone(o, [73.42, 110], { type: 'triangle', gain: 0.014, lp: 240 }),
    ]),
    myst_fog: compose(2.2, (o, fx) => [
      waveKit(o, fx.hall()),
      windKit(o, fx.hall(), { strength: 0.4, howl: 0.2 }),
      scatter(11000, 0.55, () => foghorn(o, fx.hall())),
      scatter(7000, 0.35, () => gull(o, fx.hall())),
    ]),
    myst_suspense: compose(0.92, (o, fx) => [
      drone(o, [55, 58.27], { gain: 0.042, lp: 200 }),
      drone(o, [1244.5], { gain: 0.005, lp: 1800, spread: 0.7 }),
      bed(o, brown, { filter: 'lowpass', freq: 160, gain: 0.05 }),
      scatter(7000, 0.35, () => tone(o, pick([1568, 1174.7]), { peak: 0.016, attack: 0.6, hold: 0.2, release: 1.4, pan: rnd(-0.6, 0.6), verb: fx.hall(), send: 0.6 })),
    ]),

    // ── Science Fiction ──
    sci_ship: compose(1.45, (o, fx) => [
      drone(o, [55, 82.41], { type: 'sawtooth', gain: 0.03, lp: 260, move: 7000, moveDepth: 60 }),
      bed(o, brown, { filter: 'lowpass', freq: 200, gain: 0.09 }),
      bed(o, pink, { filter: 'bandpass', freq: 900, q: 0.7, gain: 0.014 }), // air handling
      scatter(4200, 0.4, () => beep(o, fx.room())),
      scatter(15000, 0.35, () => creak(o, fx.room())),
    ]),
    sci_console: compose(2.6, (o, fx) => [
      bed(o, pink, { filter: 'bandpass', freq: 1100, q: 0.5, gain: 0.018 }),
      drone(o, [65.41], { gain: 0.018, lp: 180 }),
      scatter(1300, 0.55, () => beep(o, fx.room())),
      scatter(5000, 0.4, () => tick(o, { buf: white, filter: 'bandpass', freq: 3200, q: 4, peak: 0.02, attack: 0.001, decay: 0.02, pan: rnd(-0.5, 0.5), verb: fx.room() })),
    ]),
    sci_space: compose(0.7, (o) => [
      drone(o, [36.71, 55, 82.41], { gain: 0.045, lp: 340, move: 9000, moveDepth: 120, spread: 0.6 }),
      bed(o, brown, { filter: 'lowpass', freq: 110, gain: 0.08 }),
      drone(o, [329.63, 493.88], { gain: 0.006, lp: 900, spread: 0.8, move: 11000, moveDepth: 300 }),
    ]),
    sci_reactor: compose(1.45, (o, fx) => [
      drone(o, [48, 96], { type: 'sawtooth', gain: 0.026, lp: 220 }),
      metronome(740, () => thump(o, 44, 0.3, 0.3)),
      bed(o, pink, { filter: 'highpass', freq: 3600, gain: 0.014 }),
      drone(o, [1760], { gain: 0.004, lp: 2400, spread: 0.9 }), // coil whine
      scatter(6000, 0.4, () => tick(o, { buf: white, filter: 'bandpass', freq: rnd(2000, 4000), q: 3, peak: 0.025, attack: 0.002, decay: 0.06, pan: rnd(-0.6, 0.6), verb: fx.room() })),
    ]),
    sci_alien: compose(1.9, (o, fx) => [
      windKit(o, fx.hall(), { strength: 0.6, howl: 1 }),
      drone(o, [110, 155.56], { type: 'triangle', gain: 0.022, lp: 800, move: 2600, moveDepth: 420 }),
      scatter(4200, 0.45, () => tone(o, rnd(180, 900), { type: 'triangle', peak: 0.03, attack: 0.25, hold: 0.15, release: 0.8, bend: rnd(0.7, 1.4), bendTime: 0.9, vibRate: rnd(3, 7), vibDepth: 12, pan: rnd(-0.8, 0.8), verb: fx.hall(), send: 0.6 })),
    ]),

    // ── Romance ──
    rom_cafe: compose(2.05, (o, fx) => [
      crowdKit(o, fx.room(), { level: 0.85, busy: 280 }),
      scatter(3200, 0.5, () => clink(o, fx.room())),
      scatter(13000, 0.45, () => steam(o, fx.room())),
      drone(o, [196, 246.94, 293.66], { gain: 0.014, lp: 800 }),
    ]),
    rom_rain: compose(1.12, (o, fx) => [
      rainKit(o, fx.room(), { weight: 0.8 }),
      drone(o, [130.81, 164.81, 196], { gain: 0.018, lp: 640, move: 7000, moveDepth: 120, verb: fx.hall(), send: 0.3 }),
    ]),
    rom_fire: compose(1.25, (o, fx) => [
      fireKit(o, fx.room()),
      drone(o, [110, 164.81, 220], { type: 'triangle', gain: 0.016, lp: 480, move: 8000, moveDepth: 90 }),
    ]),
    rom_shore: compose(1.8, (o, fx) => [
      waveKit(o, fx.hall()),
      drone(o, [164.81, 220], { gain: 0.014, lp: 640 }),
      scatter(9000, 0.35, () => gull(o, fx.hall())),
    ]),
    rom_waltz: compose(2.6, (o, fx) => {
      /* An actual 3/4 lilt: root on the downbeat, chord on two and three. The
         progression turns over every four bars so it never quite repeats. */
      const bars = [
        [130.81, [261.63, 329.63, 392]], // C
        [110.0, [261.63, 329.63, 440]], // Am
        [174.61, [261.63, 349.23, 440]], // F
        [196.0, [246.94, 293.66, 392]], // G
      ]
      let beat = 0
      const verb = fx.hall()
      return [
        metronome(620, () => {
          const bar = bars[Math.floor(beat / 3) % bars.length]
          const step = beat % 3
          if (step === 0) tone(o, bar[0], { type: 'triangle', peak: 0.05, attack: 0.02, hold: 0.1, release: 0.9, lp: 700, pan: -0.1, verb, send: 0.35 })
          else bar[1].forEach((f, i) => tone(o, f, { peak: 0.024, attack: 0.03, hold: 0.08, release: 0.7, pan: 0.12 + i * 0.06, verb, send: 0.4 }))
          beat++
        }),
        bed(o, brown, { filter: 'lowpass', freq: 380, gain: 0.03 }),
      ]
    }),

    // ── Horror ──
    hor_drone: compose(1.33, (o, fx) => [
      drone(o, [43.65, 46.25], { type: 'sawtooth', gain: 0.04, lp: 190 }),
      bed(o, brown, { filter: 'lowpass', freq: 130, gain: 0.075 }),
      drone(o, [415.3], { gain: 0.005, lp: 900, spread: 0.85 }),
      scatter(13000, 0.35, () => bell(o, 98, { peak: 0.06, dur: 5, pan: rnd(-0.4, 0.4), verb: fx.hall() })),
    ]),
    hor_wind: compose(2.3, (o, fx) => [
      windKit(o, fx.hall(), { strength: 1.35, howl: 1.2 }),
      scatter(5000, 0.45, () => creak(o, fx.room())),
      scatter(9000, 0.3, () => tick(o, { buf: pink, filter: 'bandpass', freq: rnd(700, 1800), q: 2, peak: 0.03, attack: 0.004, decay: 0.2, pan: rnd(-0.8, 0.8), verb: fx.room(), send: 0.4 })), // shutter rattle
    ]),
    hor_heart: compose(1.35, (o) => [
      heartbeat(o),
      drone(o, [55], { gain: 0.026, lp: 190 }),
      bed(o, pink, { filter: 'highpass', freq: 5000, gain: 0.006 }),
    ]),
    hor_whisper: compose(1.4, (o, fx) => [
      scatter(700, 0.5, () => syllable(o, fx.hall(), { whisper: true, level: 0.9 })),
      drone(o, [58.27, 61.74], { gain: 0.028, lp: 190 }),
      bed(o, pink, { filter: 'bandpass', freq: 1800, q: 0.9, gain: 0.012 }),
    ]),
    hor_bells: compose(2.6, (o, fx) => [
      scatter(7000, 0.55, () => bell(o, pick([82.41, 87.31]), { peak: 0.085, dur: 6, pan: rnd(-0.3, 0.3), verb: fx.hall() })),
      bed(o, brown, { filter: 'lowpass', freq: 150, gain: 0.075 }),
      windKit(o, fx.hall(), { strength: 0.45, howl: 0.3 }),
    ]),

    // ── Thriller ──
    thr_pulse: compose(1.35, (o) => {
      let step = 0
      return [
        metronome(500, () => {
          thump(o, 58, step % 2 ? 0.2 : 0.34, 0.22)
          if (step % 4 === 3) tone(o, 87.31, { type: 'sawtooth', peak: 0.03, attack: 0.01, hold: 0.06, release: 0.2, lp: 400, pan: 0.2 })
          step++
        }),
        drone(o, [65.41, 98], { type: 'sawtooth', gain: 0.02, lp: 280 }),
        bed(o, brown, { filter: 'lowpass', freq: 180, gain: 0.05 }),
      ]
    }),
    thr_city: compose(2.25, (o, fx) => [
      bed(o, brown, { filter: 'lowpass', freq: 300, gain: 0.09 }),
      scatter(6000, 0.5, () => passingCar(o, fx.hall())),
      scatter(16000, 0.35, () => siren(o, fx.hall())),
      scatter(11000, 0.3, () => honk(o, fx.hall())),
    ]),
    thr_tension: compose(1.9, (o, fx) => [
      // a bowed high line: sawtooth squeezed through a narrow band, trembling
      drone(o, [1174.7, 1244.5], { type: 'sawtooth', gain: 0.005, lp: 1600, spread: 0.8 }),
      drone(o, [55], { gain: 0.028, lp: 190 }),
      clock(o, fx.room()),
      scatter(9000, 0.3, () => tone(o, 1568, { peak: 0.012, attack: 0.5, hold: 0.3, release: 1.2, vibRate: 5.5, vibDepth: 6, pan: rnd(-0.5, 0.5), verb: fx.hall(), send: 0.5 })),
    ]),
    thr_stakeout: compose(1.1, (o, fx) => [
      // heard from inside a car: rain muffled by the glass, engine idling
      rainKit(o, fx.room(), { weight: 0.9, muffled: true, dropsMs: 110, dropChance: 0.5 }),
      drone(o, [43.65, 87.31], { type: 'triangle', gain: 0.03, lp: 170, move: 3000, moveDepth: 25 }),
      bed(o, brown, { filter: 'lowpass', freq: 130, gain: 0.06 }),
    ]),
    thr_countdown: compose(1.55, (o, fx) => {
      let n = 0
      return [
        metronome(1000, () => {
          tone(o, n % 10 === 9 ? 1318.5 : 988, { type: 'triangle', peak: 0.045, attack: 0.004, hold: 0.05, release: 0.09, lp: 2600, pan: 0, verb: fx.room(), send: 0.3 })
          n++
        }),
        drone(o, [110, 146.83], { type: 'sawtooth', gain: 0.018, lp: 380, move: 5000, moveDepth: 200 }),
        drone(o, [55], { gain: 0.028, lp: 190 }),
      ]
    }),

    // ── Literary ──
    lit_cafe: compose(2.6, (o, fx) => [
      crowdKit(o, fx.room(), { level: 0.8, busy: 300 }),
      scatter(3000, 0.5, () => clink(o, fx.room())),
      drone(o, [174.61, 220], { gain: 0.012, lp: 700 }),
    ]),
    lit_library: compose(2.6, (o, fx) => [
      bed(o, brown, { filter: 'lowpass', freq: 240, gain: 0.045 }),
      bed(o, pink, { filter: 'bandpass', freq: 700, q: 0.6, gain: 0.008 }),
      scatter(6000, 0.45, () => pageTurn(o, fx.room())),
      scatter(13000, 0.35, () => { const n = 3 + Math.floor(Math.random() * 3); for (let i = 0; i < n; i++) setTimeout(() => footstep(o, fx.hall()), i * rnd(430, 560)) }),
    ]),
    lit_rain: compose(1.67, (o, fx) => [
      rainKit(o, fx.room(), { weight: 0.7, dropsMs: 100, dropChance: 0.5 }),
      drone(o, [130.81, 196], { gain: 0.014, lp: 620 }),
      scatter(15000, 0.3, () => pageTurn(o, fx.room())),
    ]),
    lit_garden: compose(2.3, (o, fx) => [
      bed(o, pink, { filter: 'bandpass', freq: 1600, q: 0.5, gain: 0.03 }), // leaves
      bed(o, brown, { filter: 'lowpass', freq: 380, gain: 0.05 }),
      scatter(1900, 0.6, () => birdSong(o, fx.room())),
      drone(o, [196, 261.63], { gain: 0.012, lp: 760 }),
    ]),
    lit_night: compose(2.5, (o, fx) => [
      bed(o, brown, { filter: 'lowpass', freq: 280, gain: 0.055 }),
      scatter(900, 0.5, () => cricket(o, fx.hall())),
      scatter(18000, 0.45, () => owl(o, fx.hall())),
      drone(o, [98, 146.83], { gain: 0.01, lp: 400 }),
    ]),
  }

  // ── playback ─────────────────────────────────────────────────────────────

  let current = null // { id, gain, stop }

  const makeFx = (out) => {
    // Convolvers are only built if a preset actually asks for one.
    const made = {}
    const build = (key, ir) => {
      if (!made[key]) {
        const c = ctx.createConvolver()
        c.buffer = ir
        const g = ctx.createGain()
        g.gain.value = 1
        c.connect(g)
        g.connect(out)
        made[key] = { input: c, nodes: [c, g] }
      }
      return made[key].input
    }
    return {
      room: () => build('room', roomIR),
      hall: () => build('hall', hallIR),
      teardown: () => Object.values(made).forEach((m) => kill(m.nodes)),
    }
  }

  const fadeOut = (entry) => {
    const t = ctx.currentTime
    entry.gain.gain.cancelScheduledValues(t)
    entry.gain.gain.setTargetAtTime(0, t, 0.45)
    setTimeout(() => entry.stop(), 1800)
  }

  return {
    ids: Object.keys(presets),
    playing: () => (current ? current.id : null),
    start(id) {
      if (current && current.id === id) return true
      if (!presets[id]) return false
      if (current) fadeOut(current)
      const g = ctx.createGain()
      g.gain.value = 0.0001
      g.connect(comp)
      const fx = makeFx(g)
      const preset = presets[id](g, fx)
      current = {
        id,
        gain: g,
        stop: () => { preset.stop(); fx.teardown(); g.disconnect() },
      }
      g.gain.setTargetAtTime(preset.level, ctx.currentTime, 0.6)
      return true
    },
    stop() {
      if (current) fadeOut(current)
      current = null
    },
    dispose() {
      if (current) current.stop()
      current = null
      kill([comp, shelf, makeup])
    },
  }
}
