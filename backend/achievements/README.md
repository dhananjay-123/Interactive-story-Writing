# Achievements, badges & progression

An event-driven achievement engine. Badge and tier **definitions live in config**
(`catalog/`) and are cached once per process; only **per-user state** lives in the
database. Adding a new achievement is a config edit, not a code change.

## Modules

| File | Responsibility |
|------|----------------|
| `catalog/rarities.js` | Rarity tiers (common → hidden) |
| `catalog/categories.js` | Badge categories + audience (author/reader/special) |
| `catalog/metrics.js` | The metric vocabulary badges/tiers are written against |
| `catalog/tiers.js` | Author & reader progression ladders |
| `catalog/badges.js` | **The badge catalogue** — one record per badge |
| `catalog/index.js` | Validates the config at boot, caches + indexes it |
| `metrics.js` | Computes metrics from source tables; stats store; streaks |
| `events.js` | Event → affected-metrics + tier-track routing |
| `evaluator.js` | Pure unlock/tier math (no DB — unit tested) |
| `store.js` | Persistence: unlocks, progress, tiers, timeline, notifications, audit |
| `engine.js` | Orchestration: `record(userId, event, ctx)` |
| `admin.js` | Manual grant/revoke/freeze/feature/tier/reset/recalculate (audited) |
| `profile.js` | Assembles the profile payload (self vs public) |
| `leaderboard.js` / `analytics.js` | Ranked boards / admin analytics |
| `index.js` | Public façade — routes import `emit`, `record`, etc. from here |

## Flow

A request handler calls `achievements.emit(userId, EVENT, ctx)` (fire-and-forget —
it never throws into or blocks the request). The engine then:

1. refreshes only the metrics that event could have moved (single-user, indexed
   queries — no drift, no N+1);
2. re-checks only the badges tied to those metrics, unlocking anything newly
   satisfied (the `(user_id, badge_id)` primary key makes duplicate unlocks
   impossible);
3. advances the relevant tier ladder if a higher rung is cleared;
4. writes timeline + notification + (for manual actions) audit rows.

## Adding a badge

Append a record to `catalog/badges.js`:

```js
{ id: 'marathon_reader', name: 'Marathon', category: 'reading', rarity: 'epic',
  icon: { shape: 'flame' }, description: '…', hint: 'Finish 50 stories.',
  criteria: { metric: 'stories_completed', target: 50 } }
```

That's it — the engine, evaluator, profile, admin tools and UI pick it up. Use an
existing metric, or add one (metadata in `catalog/metrics.js` + a source query in
`metrics.js`) and reuse it forever. `criteria: { manual: true }` makes a badge
admin-granted only.

## Testing

```
node --test                 # pure unit + catalogue-integrity tests (no DB)
TEST_DATABASE_URL=… node --test   # also runs the end-to-end engine test
```

The integration test points the pool at `TEST_DATABASE_URL` only, and skips when
it is unset — never run it against the production database.
