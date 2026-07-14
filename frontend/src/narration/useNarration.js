import { useCallback, useEffect, useRef, useState } from 'react'

// Voice narration on the browser's own speech engine (speechSynthesis) — no
// service, no keys, works offline with whatever voices the device ships.
//
// Text is spoken sentence by sentence rather than as one long utterance:
// Chrome silently kills utterances that run past ~15 seconds, and chunking
// also gives us a real progress position for free. Preferences (voice, rate,
// pitch) persist per device in localStorage.

const PREFS_KEY = 'inkwell_narration'

const loadPrefs = () => {
  try {
    const raw = JSON.parse(localStorage.getItem(PREFS_KEY) || '{}')
    return {
      voiceURI: typeof raw.voiceURI === 'string' ? raw.voiceURI : null,
      rate: typeof raw.rate === 'number' ? Math.min(1.6, Math.max(0.6, raw.rate)) : 1,
      pitch: typeof raw.pitch === 'number' ? Math.min(1.5, Math.max(0.6, raw.pitch)) : 1,
    }
  } catch {
    return { voiceURI: null, rate: 1, pitch: 1 }
  }
}

// Split prose into speakable sentences, keeping paragraph breaks as pauses.
const toSentences = (text) =>
  (text || '')
    .split(/\n+/)
    .flatMap((para) => para.match(/[^.!?…]+[.!?…]+["'”’)\]]*|[^.!?…]+$/g) || [])
    .map((s) => s.trim())
    .filter(Boolean)

export function useNarration() {
  const supported = typeof window !== 'undefined' && 'speechSynthesis' in window

  const [voices, setVoices] = useState([])
  const [prefs, setPrefsState] = useState(loadPrefs)
  const [playing, setPlaying] = useState(false)
  const [paused, setPaused] = useState(false)
  const [position, setPosition] = useState({ current: 0, total: 0 })

  // The queue lives in refs — speech events fire outside React's render cycle.
  const queueRef = useRef([])
  const indexRef = useRef(0)
  const activeRef = useRef(false)

  // Voices load asynchronously (and repeatedly) in most engines.
  useEffect(() => {
    if (!supported) return
    const synth = window.speechSynthesis
    const collect = () => {
      const list = synth.getVoices()
      if (list.length) setVoices(list)
    }
    collect()
    synth.addEventListener('voiceschanged', collect)
    return () => synth.removeEventListener('voiceschanged', collect)
  }, [supported])

  const setPrefs = useCallback((patch) => {
    setPrefsState((p) => {
      const next = { ...p, ...patch }
      try {
        localStorage.setItem(PREFS_KEY, JSON.stringify(next))
      } catch {
        /* private mode — the session still works, it just won't remember */
      }
      return next
    })
  }, [])

  const stop = useCallback(() => {
    activeRef.current = false
    queueRef.current = []
    indexRef.current = 0
    if (supported) window.speechSynthesis.cancel()
    setPlaying(false)
    setPaused(false)
    setPosition({ current: 0, total: 0 })
  }, [supported])

  // Speak the next sentence in the queue; chains itself from onend.
  const speakNext = useCallback(() => {
    if (!activeRef.current) return
    const queue = queueRef.current
    const i = indexRef.current
    if (i >= queue.length) {
      stop()
      return
    }

    const u = new SpeechSynthesisUtterance(queue[i])
    const voice = voices.find((v) => v.voiceURI === prefs.voiceURI)
    if (voice) {
      u.voice = voice
      u.lang = voice.lang
    }
    u.rate = prefs.rate
    u.pitch = prefs.pitch
    u.onend = () => {
      if (!activeRef.current) return
      indexRef.current = i + 1
      setPosition({ current: Math.min(i + 1, queue.length), total: queue.length })
      speakNext()
    }
    // An engine error mid-passage shouldn't strand the reader on a dead panel.
    u.onerror = () => activeRef.current && stop()

    setPosition({ current: i + 1, total: queue.length })
    window.speechSynthesis.speak(u)
  }, [voices, prefs, stop])

  const play = useCallback(
    (text) => {
      if (!supported) return
      window.speechSynthesis.cancel()
      const sentences = toSentences(text)
      if (!sentences.length) return
      queueRef.current = sentences
      indexRef.current = 0
      activeRef.current = true
      setPlaying(true)
      setPaused(false)
      speakNext()
    },
    [supported, speakNext]
  )

  const pause = useCallback(() => {
    if (!supported || !activeRef.current) return
    window.speechSynthesis.pause()
    setPaused(true)
  }, [supported])

  const resume = useCallback(() => {
    if (!supported || !activeRef.current) return
    window.speechSynthesis.resume()
    setPaused(false)
  }, [supported])

  // Never leave a voice talking over a page the reader has left.
  useEffect(() => stop, [stop])

  return { supported, voices, prefs, setPrefs, playing, paused, position, play, pause, resume, stop }
}
