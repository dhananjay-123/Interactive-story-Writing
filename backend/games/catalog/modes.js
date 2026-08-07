// Story Game modes — the config that makes one engine serve every flavour of
// challenge. A mode carries no logic: it names the vocabulary the interface
// borrows, which rank ladder the reader climbs, and (optionally) how the score is
// weighted. The engine reads these fields and never branches on `mode` itself.
//
// Adding a mode is a record here — Detective, Courtroom, Escape, Survival,
// Political Intrigue, Spy and Horror Investigation all arrived this way, and the
// next one will too.
//
// Fields
//   id           stable slug, stored on story_games.mode — never rename in place.
//   label        display name.
//   blurb        author-facing, shown when picking a mode.
//   subject      { one, many } — what the answer options are called, when the
//                answer is a choice from a list ("Suspect"/"Suspects").
//   prompt       the question the reader is answering, in the story's voice.
//   accuseLabel  the submit control's wording.
//   solvedLine   shown once they get it right.
//   missedLine   shown on a wrong answer — encouraging, and never a hint.
//   answerKinds  which solution shapes the mode allows: 'subject' (pick from the
//                list) and/or 'answer' (type it — puzzles, names, codes).
//   rank         a ladder id from catalog/ranks.
//   scoring      optional partial override of catalog/scoring's default profile.

const MODES = [
  {
    id: 'detective',
    label: 'Detective',
    blurb: 'A crime, a cast of suspects, and a reader who has to work out who did it before the story says so.',
    subject: { one: 'Suspect', many: 'Suspects' },
    prompt: 'Who was responsible?',
    accuseLabel: 'Name them',
    solvedLine: 'You had them before the story gave them up.',
    missedLine: 'Not them. Keep reading — the truth leaves marks.',
    answerKinds: ['subject', 'answer'],
    rank: 'detective',
  },
  {
    id: 'courtroom',
    label: 'Courtroom',
    blurb: 'Testimony that does not add up. The reader decides who is lying before the verdict lands.',
    subject: { one: 'Witness', many: 'Witnesses' },
    prompt: 'Who is lying?',
    accuseLabel: 'Deliver your finding',
    solvedLine: 'You caught the lie while it was still being told.',
    missedLine: 'Their story holds. Listen to the others again.',
    answerKinds: ['subject', 'answer'],
    rank: 'advocacy',
  },
  {
    id: 'escape',
    label: 'Escape',
    blurb: 'A place that will not let go. The reader finds the way out — a route, a mechanism, a word.',
    subject: { one: 'Way out', many: 'Ways out' },
    prompt: 'How do you get out?',
    accuseLabel: 'Try it',
    solvedLine: 'The way out was there the whole time. You found it first.',
    missedLine: 'That way stays shut. Something else in here gives.',
    answerKinds: ['answer', 'subject'],
    rank: 'escape',
    // The route is usually assembled from details rather than named outright, so
    // noticing counts for more here.
    scoring: { cluePoints: 35, sidePoints: 50 },
  },
  {
    id: 'survival',
    label: 'Survival',
    blurb: 'Scarcity and bad options. The reader works out what actually keeps someone alive.',
    subject: { one: 'Course of action', many: 'Courses of action' },
    prompt: 'What keeps you alive?',
    accuseLabel: 'Commit to it',
    solvedLine: 'You read the ground right.',
    missedLine: 'That would not have held. Something here still might.',
    answerKinds: ['subject', 'answer'],
    rank: 'survival',
  },
  {
    id: 'intrigue',
    label: 'Political intrigue',
    blurb: 'A court full of allies, one of whom is not. The reader names the traitor.',
    subject: { one: 'Courtier', many: 'The court' },
    prompt: 'Who is betraying you?',
    accuseLabel: 'Name the traitor',
    solvedLine: 'You saw the knife before it turned.',
    missedLine: 'Their loyalty holds. Someone else is counting differently.',
    answerKinds: ['subject', 'answer'],
    rank: 'intrigue',
  },
  {
    id: 'spy',
    label: 'Spy mission',
    blurb: 'An objective, a cover, and a mole. The reader works the mission out from the traffic.',
    subject: { one: 'Asset', many: 'Assets' },
    prompt: 'Who is compromised?',
    accuseLabel: 'Send the signal',
    solvedLine: 'Clean call. The network holds because of you.',
    missedLine: 'That asset is clean. The leak is elsewhere.',
    answerKinds: ['subject', 'answer'],
    rank: 'clearance',
  },
  {
    id: 'horror',
    label: 'Horror investigation',
    blurb: 'Something is wrong with this place. The reader works out what — and it is rarely the obvious thing.',
    subject: { one: 'Explanation', many: 'Explanations' },
    prompt: 'What is really happening here?',
    accuseLabel: 'Say it aloud',
    solvedLine: 'You named it. That is not nothing, in a place like this.',
    missedLine: 'No. Whatever it is, it is still behind you.',
    answerKinds: ['subject', 'answer'],
    rank: 'vigil',
    // Dread is built from small noticings, so side discoveries pay well here.
    scoring: { sidePoints: 55 },
  },
]

const byId = new Map(MODES.map((m) => [m.id, m]))

module.exports = {
  MODES,
  MODE_IDS: MODES.map((m) => m.id),
  mode: (id) => byId.get(id) || null,
  isMode: (id) => byId.has(id),
}
