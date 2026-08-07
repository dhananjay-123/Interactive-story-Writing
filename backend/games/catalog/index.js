// Catalogue registry for Story Games — validated once at load, then served as
// cached, indexed views. Everything downstream (engine, scoring, routes) reads
// the configuration through here, so a bad mode record fails the boot rather than
// a reader's request.
//
// Mirrors achievements/catalog: definitions live in code, only per-reader state
// lives in the database.

const { MODES, MODE_IDS, mode, isMode } = require('./modes')
const { LADDERS, ladder, isLadder } = require('./ranks')
const { DEFAULT_PROFILE, profileFor } = require('./scoring')

const ANSWER_KINDS = ['subject', 'answer']

// Mirrors the CHECK constraint on game_clues.kind. Purely how the notebook files
// a note — it has no effect on scoring.
const CLUE_KINDS = [
  { id: 'clue', label: 'Clue' },
  { id: 'evidence', label: 'Evidence' },
  { id: 'observation', label: 'Observation' },
]

const validate = () => {
  const seen = new Set()
  for (const m of MODES) {
    if (!m.id) throw new Error('Game mode missing id')
    if (seen.has(m.id)) throw new Error(`Duplicate game mode id: ${m.id}`)
    seen.add(m.id)
    if (!isLadder(m.rank)) throw new Error(`Game mode ${m.id}: unknown rank ladder ${m.rank}`)
    if (!Array.isArray(m.answerKinds) || m.answerKinds.length === 0) {
      throw new Error(`Game mode ${m.id}: answerKinds must list at least one kind`)
    }
    for (const kind of m.answerKinds) {
      if (!ANSWER_KINDS.includes(kind)) throw new Error(`Game mode ${m.id}: unknown answer kind ${kind}`)
    }
    if (!m.subject?.one || !m.subject?.many) {
      throw new Error(`Game mode ${m.id}: subject needs both one and many labels`)
    }
  }
  for (const l of LADDERS) {
    let last = -1
    for (const rung of l.rungs) {
      if (rung.min < last) throw new Error(`Rank ladder ${l.id}: rungs must ascend by min`)
      last = rung.min
    }
  }
}

validate()

// Scoring profiles are resolved once per mode rather than per session — they
// never change at runtime.
const profiles = new Map(MODES.map((m) => [m.id, Object.freeze(profileFor(m.scoring))]))

// Everything the reader's client needs to render a mode, and nothing more. The
// solution never travels through here.
const publicMode = (id) => {
  const m = mode(id)
  if (!m) return null
  const l = ladder(m.rank)
  return {
    id: m.id,
    label: m.label,
    subject: m.subject,
    prompt: m.prompt,
    accuseLabel: m.accuseLabel,
    solvedLine: m.solvedLine,
    missedLine: m.missedLine,
    answerKinds: m.answerKinds,
    rank: { id: l.id, label: l.label, rungs: l.rungs },
  }
}

// The authoring catalogue: every mode a writer can pick, with its ladder.
const publicCatalog = () => ({
  modes: MODES.map((m) => ({
    id: m.id,
    label: m.label,
    blurb: m.blurb,
    subject: m.subject,
    prompt: m.prompt,
    accuseLabel: m.accuseLabel,
    answerKinds: m.answerKinds,
    rank: ladder(m.rank),
  })),
  clueKinds: CLUE_KINDS,
})

module.exports = {
  MODES,
  MODE_IDS,
  LADDERS,
  CLUE_KINDS,
  ANSWER_KINDS,
  DEFAULT_PROFILE,
  mode,
  isMode,
  ladder,
  isLadder,
  isClueKind: (id) => CLUE_KINDS.some((k) => k.id === id),
  scoringFor: (modeId) => profiles.get(modeId) || Object.freeze(profileFor(null)),
  publicMode,
  publicCatalog,
}
