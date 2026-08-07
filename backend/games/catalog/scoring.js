// Scoring weights. One default profile; a mode may override any subset of it
// (see modes.js), so a puzzle-heavy escape story can lean on clues while a
// courtroom drama leans on the verdict — without touching the scoring code.
//
// The shape of the reward is deliberate: the solution is worth the most, but a
// reader who never accuses still banks everything they noticed. Nothing here can
// make a score negative — the floor is zero, always.

const DEFAULT_PROFILE = {
  // The solution itself.
  solveBase: 500,
  // Solving *after* the story has already shown its hand is still worth
  // something, just not the prize for getting there first.
  lateSolveFactor: 0.4,

  // Discovery. Both are multiplied by the clue's weight (1-5).
  cluePoints: 25,
  sidePoints: 40,

  // Each wrong accusation costs, so guessing through the list is never the
  // cheapest route to the answer.
  attemptPenalty: 60,

  // "Small bonus only" — full at fastMs or under, nothing at slowMs or over.
  timeBonusMax: 50,
  timeBonusFullMs: 10 * 60 * 1000,
  timeBonusZeroMs: 90 * 60 * 1000,

  // Every required clue, first guess, before the reveal.
  perfectBonus: 75,
}

// Merge a mode's overrides over the defaults. Unknown keys are dropped so a typo
// in a mode config can't silently invent a scoring rule.
const profileFor = (overrides) => {
  const profile = { ...DEFAULT_PROFILE }
  for (const key of Object.keys(DEFAULT_PROFILE)) {
    if (overrides && typeof overrides[key] === 'number') profile[key] = overrides[key]
  }
  return profile
}

module.exports = { DEFAULT_PROFILE, profileFor }
