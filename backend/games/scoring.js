// Pure scoring — no database, no side effects. Given a plain summary of what a
// reader did and a weights profile, it produces the score, the breakdown behind
// it and the rank that score earns. Kept pure so the rules can be unit-tested
// exhaustively without a database (see games/__tests__).
//
// Two properties the rest of the system relies on:
//   • the score is never negative — wrong guesses can cost you the win, never
//     the reading you did to get there;
//   • a reader who ignores the challenge entirely still scores their discoveries,
//     because noticing things IS reading.

const int = (n) => Math.max(0, Math.round(Number(n) || 0))

// Small, and it decays: full below `timeBonusFullMs`, nothing above
// `timeBonusZeroMs`, linear between. Reading fast is worth a nod, not a strategy.
const timeBonus = (elapsedMs, profile) => {
  if (!Number.isFinite(elapsedMs) || elapsedMs <= 0) return 0
  const { timeBonusMax, timeBonusFullMs, timeBonusZeroMs } = profile
  if (elapsedMs <= timeBonusFullMs) return timeBonusMax
  if (elapsedMs >= timeBonusZeroMs) return 0
  const span = timeBonusZeroMs - timeBonusFullMs
  return Math.round(timeBonusMax * ((timeBonusZeroMs - elapsedMs) / span))
}

/**
 * Score one reader's session.
 *
 * @param {object} p
 * @param {boolean} p.solved                 they submitted the right answer
 * @param {boolean} p.solvedBeforeReveal     …and did it before an ending told them
 * @param {number}  p.requiredWeightFound    weight of the required clues they hold
 * @param {number}  p.requiredTotal          how many required clues exist
 * @param {number}  p.requiredFound          how many of them they hold
 * @param {number}  p.sideWeightFound        weight of the optional clues they hold
 * @param {number}  p.wrongAttempts          accusations that missed
 * @param {number}  p.elapsedMs              time from first passage to finish
 * @param {object}  profile                  a catalog/scoring weights profile
 * @returns {{score:number, perfect:boolean, breakdown:Array<{key:string,label:string,points:number}>}}
 */
const scoreSession = (p, profile) => {
  const solved = Boolean(p.solved)
  const beforeReveal = solved && Boolean(p.solvedBeforeReveal)

  const solution = solved
    ? Math.round(profile.solveBase * (beforeReveal ? 1 : profile.lateSolveFactor))
    : 0
  const clues = int(p.requiredWeightFound) * profile.cluePoints
  const side = int(p.sideWeightFound) * profile.sidePoints
  const penalty = int(p.wrongAttempts) * profile.attemptPenalty
  const time = solved ? timeBonus(p.elapsedMs, profile) : 0

  // Everything noticed, first guess, ahead of the story. Only meaningful when the
  // author actually planted required clues.
  const perfect =
    beforeReveal &&
    int(p.wrongAttempts) === 0 &&
    int(p.requiredTotal) > 0 &&
    int(p.requiredFound) >= int(p.requiredTotal)
  const perfection = perfect ? profile.perfectBonus : 0

  const score = Math.max(0, solution + clues + side + time + perfection - penalty)

  // Only lines that actually moved the number, so the score screen reads as an
  // explanation rather than a spreadsheet.
  const breakdown = [
    { key: 'solution', label: beforeReveal ? 'Solved before the reveal' : 'Solved', points: solution },
    { key: 'clues', label: 'Clues discovered', points: clues },
    { key: 'side', label: 'Side discoveries', points: side },
    { key: 'time', label: 'Pace', points: time },
    { key: 'perfect', label: 'Nothing missed', points: perfection },
    { key: 'attempts', label: 'Wrong answers', points: -penalty },
  ].filter((line) => line.points !== 0)

  return { score, perfect, breakdown }
}

// The highest rung the score has cleared, plus the one after it (null at the top)
// so the reader can see what the next rank asks for.
const resolveRank = (ladder, score) => {
  const value = Number(score) || 0
  const rungs = ladder?.rungs || []
  if (!rungs.length) return { current: null, next: null }
  let idx = 0
  for (let i = 0; i < rungs.length; i++) {
    if (value >= rungs[i].min) idx = i
  }
  return { current: rungs[idx], next: rungs[idx + 1] || null }
}

// Answers are compared on meaning, not typing: case, punctuation, articles and
// runs of whitespace all fall away. An author may list alternatives with `|`
// ("the lighthouse | lighthouse | tower").
const normalizeAnswer = (value) =>
  String(value ?? '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\b(the|a|an)\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

const answerMatches = (submitted, solutionKey) => {
  const given = normalizeAnswer(submitted)
  if (!given) return false
  return String(solutionKey ?? '')
    .split('|')
    .map(normalizeAnswer)
    .filter(Boolean)
    .includes(given)
}

module.exports = { scoreSession, resolveRank, normalizeAnswer, answerMatches, timeBonus }
