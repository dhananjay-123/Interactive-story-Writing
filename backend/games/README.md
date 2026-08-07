# Story Games

A challenge layered onto an ordinary story. Same tree, same passages, same
renderer, same reader — a Story Game is one optional row keyed by `story_id`,
plus the clues its passages carry and the sessions readers build against them.

**Mode definitions live in config** (`catalog/`) and are validated once per
process; only per-reader state lives in the database. Adding a new flavour of
challenge — courtroom, escape, spy, whatever comes next — is a config record.
The engine never branches on `mode`.

## Design rules this module holds to

- **Reading comes first.** The engine's only reading-side hook is `onPassage`,
  called from the reading-progress save that already runs on every move. There
  is no extra request, nothing to opt into, and it returns `null` for stories
  without a game — which is nearly all of them.
- **Nothing here can break a read.** `onPassage` swallows and logs its own
  errors, exactly like `achievements.emit`.
- **The solution never leaves the server.** Only `store.findDesign` exposes
  `solution_key`, and only the story's team can reach the route that calls it. A
  wrong answer returns the miss and nothing else — no narrowing, no elimination,
  no accidental spoiler.
- **A reader who ignores the challenge loses nothing.** Their score is zero and
  their reading is untouched. A reader who engages but never accuses still banks
  every clue they noticed, because noticing things *is* reading.

## Modules

| File | Responsibility |
|------|----------------|
| `catalog/modes.js` | **The mode catalogue** — one record per flavour of challenge |
| `catalog/ranks.js` | Rank ladders (detective rank, standing at the bar, clearance…) |
| `catalog/scoring.js` | The default weights profile + per-mode overrides |
| `catalog/index.js` | Validates the config at load, caches + indexes it |
| `scoring.js` | Pure score/rank/answer math (no DB — unit tested) |
| `store.js` | Persistence: config, subjects, clues, sessions, discoveries, boards |
| `engine.js` | Orchestration: `onPassage`, `accuse`, `readerView`, rewards |
| `index.js` | Public façade — routes import from here |

## Flow

1. A signed-in reader moves through a passage. `PUT /api/stories/:id/progress`
   saves their place and calls `games.onPassage`.
2. The engine opens their session on first contact, banks every clue that
   passage carries (`(user_id, clue_id)` is the primary key, so walking back can
   never re-find one), and notices when an ending has revealed the answer.
3. It rescores from source and returns the new clues — which the reader sees as
   one quiet line under the prose, not a toast.
4. At any point the reader may submit an answer. Right before the reveal pays
   full marks; right after it pays less; wrong costs an attempt and some score,
   and the story carries on undisturbed.
5. Finishing pays platform points and emits `CLUE_FOUND` / `GAME_COMPLETED` /
   `GAME_SOLVED` to the achievement engine.

## Adding a mode

Append a record to `catalog/modes.js`:

```js
{ id: 'heist', label: 'Heist', blurb: '…',
  subject: { one: 'Crew member', many: 'The crew' },
  prompt: 'Who tipped them off?', accuseLabel: 'Call it',
  solvedLine: '…', missedLine: '…',
  answerKinds: ['subject', 'answer'], rank: 'clearance',
  scoring: { cluePoints: 30 } }
```

That's it — authoring UI, reader notebook, scoring and leaderboards all pick it
up. Reference an existing ladder in `catalog/ranks.js` or add one. `scoring` is
an optional partial override of the default weights; unknown keys are dropped, so
a typo can't silently invent a rule.

## Testing

```
node --test                 # pure scoring + catalogue-integrity tests (no DB)
```
