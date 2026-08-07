const { Pool } = require('pg')

// Neon hangs up on connections that have been idle for a while. Retire our own
// clients well before that happens and keep the sockets warm, so the pool hands
// out a live connection instead of one the server has already closed.
const resilience = {
  idleTimeoutMillis: 10000,
  keepAlive: true,
  keepAliveInitialDelayMillis: 5000,
  max: 10,
}

const pool = process.env.DATABASE_URL
  ? new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.PGSSL === 'true' ? { rejectUnauthorized: false } : undefined,
      ...resilience,
    })
  : new Pool({
      host: process.env.PGHOST || 'localhost',
      port: Number(process.env.PGPORT) || 5432,
      user: process.env.PGUSER || 'postgres',
      password: process.env.PGPASSWORD || 'postgres',
      database: process.env.PGDATABASE || 'inkwell',
      ...resilience,
    })

// Without this handler, a dropped idle client emits an 'error' on the pool with
// no listener, which crashes the whole process. Log it and let the pool recycle
// the connection instead.
pool.on('error', (err) => {
  console.error('Unexpected PG pool error (idle client dropped):', err.message)
})

// A connection can still die between the pool handing it over and the query
// reaching the server — the timeouts above shrink that window but can't close
// it. Those failures are the connection, not the statement, so the same query
// on a fresh client succeeds. Retrying once here is the difference between a
// reader seeing their page and seeing a 500.
const DEAD_CONNECTION = new Set([
  'ECONNRESET', 'EPIPE', 'ETIMEDOUT', 'ENOTFOUND', 'ECONNREFUSED',
  'CONNECTION_TERMINATED', 'CONNECTION_ENDED', '57P01',
])
const isDeadConnection = (err) =>
  DEAD_CONNECTION.has(err?.code) ||
  /Connection terminated|Client has encountered a connection error|server closed the connection/i.test(err?.message || '')

const query = async (text, params) => {
  try {
    return await pool.query(text, params)
  } catch (err) {
    if (!isDeadConnection(err)) throw err
    console.warn('Retrying query on a fresh connection:', err.message)
    return pool.query(text, params)
  }
}

// gen_random_uuid() is a core function in PostgreSQL 13+; no extension needed.
const initDb = async () => {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      username       TEXT NOT NULL UNIQUE,
      email          TEXT NOT NULL UNIQUE,
      password_hash  TEXT NOT NULL,
      display_name   TEXT NOT NULL,
      bio            TEXT,
      avatar_url     TEXT,
      role           TEXT NOT NULL DEFAULT 'author'
                       CHECK (role IN ('author','admin')),
      created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    -- Profile picture (a Cloudinary URL), added after the users table existed.
    ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url TEXT;

    -- Stamped whenever the password changes. Tokens issued before this moment
    -- are rejected, so a reset logs out every existing session.
    ALTER TABLE users ADD COLUMN IF NOT EXISTS password_changed_at TIMESTAMPTZ;

    -- Suspension. banned_at NULL means the account is in good standing; setting
    -- it blocks login and kills live sessions the same way a password change does.
    ALTER TABLE users ADD COLUMN IF NOT EXISTS banned_at TIMESTAMPTZ;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS ban_reason TEXT;

    CREATE TABLE IF NOT EXISTS stories (
      id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      title         TEXT NOT NULL,
      description   TEXT,
      genre         TEXT NOT NULL DEFAULT 'fantasy'
                      CHECK (genre IN ('fantasy','mystery','sci_fi','romance','horror','thriller','literary')),
      author        TEXT NOT NULL DEFAULT 'Anonymous',
      author_id     UUID REFERENCES users(id) ON DELETE SET NULL,
      root_node_id  UUID,
      branch_count  INTEGER NOT NULL DEFAULT 0,
      ambience      TEXT,
      published     BOOLEAN NOT NULL DEFAULT TRUE,
      created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    -- Backfill for databases created before author ownership existed.
    ALTER TABLE stories ADD COLUMN IF NOT EXISTS author_id UUID REFERENCES users(id) ON DELETE SET NULL;
    -- Per-story background soundscape (an ambience preset id, or null for silence).
    ALTER TABLE stories ADD COLUMN IF NOT EXISTS ambience TEXT;
    -- Free-form discovery tags (lowercase slugs), for trending + filtering.
    ALTER TABLE stories ADD COLUMN IF NOT EXISTS tags TEXT[] NOT NULL DEFAULT '{}';
    -- Editorial "featured" flag, set by admins; surfaced on the home page.
    ALTER TABLE stories ADD COLUMN IF NOT EXISTS featured BOOLEAN NOT NULL DEFAULT FALSE;
    ALTER TABLE stories ADD COLUMN IF NOT EXISTS featured_at TIMESTAMPTZ;

    CREATE TABLE IF NOT EXISTS nodes (
      id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      story_id    UUID NOT NULL REFERENCES stories(id) ON DELETE CASCADE,
      text        TEXT NOT NULL,
      choices     JSONB NOT NULL DEFAULT '[]'::jsonb,
      is_ending   BOOLEAN NOT NULL DEFAULT FALSE,
      created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    -- Rich passage content (Tiptap JSON). Older passages only have plain text.
    ALTER TABLE nodes ADD COLUMN IF NOT EXISTS content JSONB;

    CREATE INDEX IF NOT EXISTS idx_nodes_story_id ON nodes (story_id);
    CREATE INDEX IF NOT EXISTS idx_stories_published_created ON stories (published, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_stories_author ON stories (author_id, created_at DESC);

    -- Follower graph: one row per (follower → following) relationship.
    CREATE TABLE IF NOT EXISTS follows (
      follower_id   UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      following_id  UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      PRIMARY KEY (follower_id, following_id),
      CHECK (follower_id <> following_id)
    );

    -- Look up "who follows X" and "who X follows" quickly, newest first.
    CREATE INDEX IF NOT EXISTS idx_follows_following ON follows (following_id, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_follows_follower ON follows (follower_id, created_at DESC);

    -- Reader engagement ------------------------------------------------------

    -- One like per (reader, story).
    CREATE TABLE IF NOT EXISTS likes (
      user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      story_id   UUID NOT NULL REFERENCES stories(id) ON DELETE CASCADE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      PRIMARY KEY (user_id, story_id)
    );

    -- Private "saved for later" list.
    CREATE TABLE IF NOT EXISTS bookmarks (
      user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      story_id   UUID NOT NULL REFERENCES stories(id) ON DELETE CASCADE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      PRIMARY KEY (user_id, story_id)
    );

    -- One star rating (1-5) per (reader, story); upserted on change.
    CREATE TABLE IF NOT EXISTS ratings (
      user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      story_id   UUID NOT NULL REFERENCES stories(id) ON DELETE CASCADE,
      value      SMALLINT NOT NULL CHECK (value BETWEEN 1 AND 5),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      PRIMARY KEY (user_id, story_id)
    );

    CREATE TABLE IF NOT EXISTS comments (
      id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      story_id   UUID NOT NULL REFERENCES stories(id) ON DELETE CASCADE,
      user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      body       TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_likes_story ON likes (story_id);
    CREATE INDEX IF NOT EXISTS idx_bookmarks_user ON bookmarks (user_id, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_ratings_story ON ratings (story_id);
    CREATE INDEX IF NOT EXISTS idx_comments_story ON comments (story_id, created_at DESC);
    -- GIN index makes "stories carrying tag X" lookups fast.
    CREATE INDEX IF NOT EXISTS idx_stories_tags ON stories USING GIN (tags);
    -- Featured rail on the home page pulls the newest-featured first.
    CREATE INDEX IF NOT EXISTS idx_stories_featured ON stories (featured, featured_at DESC) WHERE featured;

    -- Moderation ------------------------------------------------------------

    -- Reader-submitted content reports, triaged by admins.
    CREATE TABLE IF NOT EXISTS reports (
      id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      story_id     UUID NOT NULL REFERENCES stories(id) ON DELETE CASCADE,
      reporter_id  UUID REFERENCES users(id) ON DELETE SET NULL,
      reason       TEXT NOT NULL
                     CHECK (reason IN ('spam','offensive','plagiarism','broken','other')),
      details      TEXT,
      status       TEXT NOT NULL DEFAULT 'open'
                     CHECK (status IN ('open','resolved','dismissed')),
      resolved_by  UUID REFERENCES users(id) ON DELETE SET NULL,
      resolved_at  TIMESTAMPTZ,
      created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_reports_status ON reports (status, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_reports_story ON reports (story_id);

    -- Reading progress + choice analytics -------------------------------------

    -- Where a signed-in reader left off in a story. current_node_id cascades, so
    -- if the author deletes that passage the bookmark disappears rather than
    -- pointing at nothing.
    CREATE TABLE IF NOT EXISTS reading_progress (
      user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      story_id        UUID NOT NULL REFERENCES stories(id) ON DELETE CASCADE,
      current_node_id UUID NOT NULL REFERENCES nodes(id) ON DELETE CASCADE,
      -- The passages walked to get here, oldest first. Lets "go back" survive a reload.
      path            UUID[] NOT NULL DEFAULT '{}',
      updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      PRIMARY KEY (user_id, story_id)
    );

    CREATE INDEX IF NOT EXISTS idx_progress_user ON reading_progress (user_id, updated_at DESC);

    -- One row per choice taken. user_id is nullable: anonymous readers count too,
    -- they just can't be told apart from one another.
    CREATE TABLE IF NOT EXISTS choice_events (
      id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      story_id     UUID NOT NULL REFERENCES stories(id) ON DELETE CASCADE,
      from_node_id UUID NOT NULL REFERENCES nodes(id) ON DELETE CASCADE,
      to_node_id   UUID NOT NULL REFERENCES nodes(id) ON DELETE CASCADE,
      choice_index SMALLINT NOT NULL CHECK (choice_index BETWEEN 0 AND 5),
      user_id      UUID REFERENCES users(id) ON DELETE SET NULL,
      created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    -- The analytics query groups by (from_node_id, choice_index); the story index
    -- serves the totals.
    CREATE INDEX IF NOT EXISTS idx_choice_events_node ON choice_events (from_node_id, choice_index);
    CREATE INDEX IF NOT EXISTS idx_choice_events_story ON choice_events (story_id, created_at DESC);

    -- Ending discovery ---------------------------------------------------------

    -- One row per (reader, ending reached). Distinct from reader_completions,
    -- which records that a story was finished at all — this tracks WHICH endings
    -- a reader has collected, so a branching story stays replayable ("4 of 9
    -- endings found"). The node FK cascades: delete an ending and its
    -- discoveries vanish with it.
    CREATE TABLE IF NOT EXISTS ending_discoveries (
      user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      story_id   UUID NOT NULL REFERENCES stories(id) ON DELETE CASCADE,
      node_id    UUID NOT NULL REFERENCES nodes(id) ON DELETE CASCADE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      PRIMARY KEY (user_id, node_id)
    );
    CREATE INDEX IF NOT EXISTS idx_discoveries_user_story ON ending_discoveries (user_id, story_id);
    CREATE INDEX IF NOT EXISTS idx_discoveries_story ON ending_discoveries (story_id);

    -- World map ----------------------------------------------------------------

    -- Named places an author pins onto their story's map. Coordinates are
    -- percentages of the map canvas (0-100), so the same pin works at any
    -- rendered size. Passages point at a place via nodes.place_id; the reader's
    -- map lights up the places their trail has passed through.
    CREATE TABLE IF NOT EXISTS story_places (
      id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      story_id   UUID NOT NULL REFERENCES stories(id) ON DELETE CASCADE,
      name       TEXT NOT NULL,
      blurb      TEXT,
      x          REAL NOT NULL CHECK (x >= 0 AND x <= 100),
      y          REAL NOT NULL CHECK (y >= 0 AND y <= 100),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_places_story ON story_places (story_id, created_at ASC);

    -- Where a passage takes place. SET NULL: deleting a place unpins its
    -- passages instead of deleting prose.
    ALTER TABLE nodes ADD COLUMN IF NOT EXISTS place_id UUID REFERENCES story_places(id) ON DELETE SET NULL;

    -- Account recovery -------------------------------------------------------

    -- A locked-out reader asks an admin to set them a new password. We store no
    -- token and mail nothing — an admin fulfils the request by hand.
    CREATE TABLE IF NOT EXISTS password_reset_requests (
      id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      note        TEXT,
      status      TEXT NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending','resolved','dismissed')),
      resolved_by UUID REFERENCES users(id) ON DELETE SET NULL,
      resolved_at TIMESTAMPTZ,
      created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    -- At most one open request per account, so the form can't be used to flood
    -- the admin queue.
    CREATE UNIQUE INDEX IF NOT EXISTS idx_prr_one_pending
      ON password_reset_requests (user_id) WHERE status = 'pending';
    CREATE INDEX IF NOT EXISTS idx_prr_status
      ON password_reset_requests (status, created_at DESC);

    -- Collaborative writing --------------------------------------------------

    -- Co-authors a story owner has invited to edit the branching tree with them.
    -- The owner is NOT listed here (they own the row in the stories table); this
    -- table is only the people they have granted edit access to.
    CREATE TABLE IF NOT EXISTS story_collaborators (
      story_id  UUID NOT NULL REFERENCES stories(id) ON DELETE CASCADE,
      user_id   UUID NOT NULL REFERENCES users(id)   ON DELETE CASCADE,
      added_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      PRIMARY KEY (story_id, user_id)
    );

    -- "Who can I edit with" and "which stories can I help write" — both directions.
    CREATE INDEX IF NOT EXISTS idx_collab_story ON story_collaborators (story_id);
    CREATE INDEX IF NOT EXISTS idx_collab_user  ON story_collaborators (user_id, added_at DESC);

    -- Version history --------------------------------------------------------

    -- A prior version of a passage, written just before an edit or restore
    -- overwrites it. Cascades with the node, so deleting a passage clears its
    -- history too. edited_by is SET NULL so a removed account leaves the trail
    -- readable. Restores only revert prose + choice labels (never relink the
    -- tree), so the choices JSON here is a record, not something replayed blindly.
    CREATE TABLE IF NOT EXISTS node_snapshots (
      id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      node_id     UUID NOT NULL REFERENCES nodes(id) ON DELETE CASCADE,
      story_id    UUID NOT NULL REFERENCES stories(id) ON DELETE CASCADE,
      text        TEXT NOT NULL DEFAULT '',
      content     JSONB,
      choices     JSONB NOT NULL DEFAULT '[]'::jsonb,
      is_ending   BOOLEAN NOT NULL DEFAULT FALSE,
      edited_by   UUID REFERENCES users(id) ON DELETE SET NULL,
      created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_node_snapshots_node ON node_snapshots (node_id, created_at DESC);

    -- Social notifications ---------------------------------------------------

    -- One row per (recipient, event). Distinct from achievement_notifications,
    -- which is badge/tier-only; this covers the social side — comments on your
    -- story, being added as a co-author, and new stories from authors you follow.
    -- actor_id (who caused it) is SET NULL on delete so a removed account leaves
    -- the notice readable; story_id cascades since a deleted story's notices are
    -- moot. data carries a small denormalized snapshot (e.g. a comment snippet).
    CREATE TABLE IF NOT EXISTS notifications (
      id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      type       TEXT NOT NULL CHECK (type IN ('comment','collaborator','story')),
      actor_id   UUID REFERENCES users(id) ON DELETE SET NULL,
      story_id   UUID REFERENCES stories(id) ON DELETE CASCADE,
      data       JSONB NOT NULL DEFAULT '{}'::jsonb,
      seen       BOOLEAN NOT NULL DEFAULT FALSE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications (user_id, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_notifications_unseen ON notifications (user_id) WHERE NOT seen;

    -- Writing contests --------------------------------------------------------

    -- Admin-created rounds. Status is derived from the clock (upcoming / open /
    -- closed), never stored, so nothing needs a scheduler to flip it. genre NULL
    -- means any genre may enter.
    CREATE TABLE IF NOT EXISTS contests (
      id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      title      TEXT NOT NULL,
      theme      TEXT,
      genre      TEXT CHECK (genre IN ('fantasy','mystery','sci_fi','romance','horror','thriller','literary')),
      starts_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      ends_at    TIMESTAMPTZ NOT NULL,
      created_by UUID REFERENCES users(id) ON DELETE SET NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      CHECK (ends_at > starts_at)
    );
    CREATE INDEX IF NOT EXISTS idx_contests_ends ON contests (ends_at DESC);

    -- One story per author per contest (the UNIQUE), each story at most once (the PK).
    CREATE TABLE IF NOT EXISTS contest_entries (
      contest_id UUID NOT NULL REFERENCES contests(id) ON DELETE CASCADE,
      story_id   UUID NOT NULL REFERENCES stories(id) ON DELETE CASCADE,
      user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      PRIMARY KEY (contest_id, story_id),
      UNIQUE (contest_id, user_id)
    );

    -- One vote per reader per contest (the PK); the composite FK guarantees a
    -- vote can only land on a real entry, and withdrawing an entry takes its
    -- votes with it.
    CREATE TABLE IF NOT EXISTS contest_votes (
      contest_id UUID NOT NULL,
      story_id   UUID NOT NULL,
      voter_id   UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      PRIMARY KEY (contest_id, voter_id),
      FOREIGN KEY (contest_id, story_id)
        REFERENCES contest_entries(contest_id, story_id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS idx_contest_votes_entry ON contest_votes (contest_id, story_id);
  `)

  await initAchievements()
  await initGames()
}

// ── Achievements, badges & progression ──────────────────────────────────────
// A self-contained schema block so the whole feature can be read (and reasoned
// about) in one place. Badge/tier *definitions* live in code (achievements/
// catalog) and are cached; only per-user state is stored here. All additive and
// idempotent — safe to run on every boot against an existing database.
const initAchievements = async () => {
  await pool.query(`
    -- Per-user metric snapshot. metrics is a { metricId: number } map, refreshed
    -- from source tables by the engine as events land, so it never drifts. The
    -- streak columns are the one genuinely stateful bit (they can't be recomputed
    -- from a single query), maintained on each day of activity.
    CREATE TABLE IF NOT EXISTS user_stats (
      user_id        UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
      metrics        JSONB NOT NULL DEFAULT '{}'::jsonb,
      last_active_on DATE,
      streak_days    INTEGER NOT NULL DEFAULT 0,
      longest_streak INTEGER NOT NULL DEFAULT 0,
      updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    -- Normalized source of truth for "stories finished". One row per reader+story,
    -- so finishing the same story twice can never inflate the count. genre is
    -- denormalized so genres_completed is a cheap DISTINCT.
    CREATE TABLE IF NOT EXISTS reader_completions (
      user_id    UUID NOT NULL REFERENCES users(id)   ON DELETE CASCADE,
      story_id   UUID NOT NULL REFERENCES stories(id) ON DELETE CASCADE,
      node_id    UUID REFERENCES nodes(id) ON DELETE SET NULL,
      genre      TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      PRIMARY KEY (user_id, story_id)
    );
    CREATE INDEX IF NOT EXISTS idx_completions_user ON reader_completions (user_id, created_at DESC);

    -- One row per unlocked badge. The composite primary key is the duplicate-unlock
    -- guard: a second insert for the same (user, badge) is a no-op via ON CONFLICT.
    CREATE TABLE IF NOT EXISTS user_achievements (
      user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      badge_id    TEXT NOT NULL,
      source      TEXT NOT NULL DEFAULT 'auto' CHECK (source IN ('auto','manual')),
      unlocked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      granted_by  UUID REFERENCES users(id) ON DELETE SET NULL,
      frozen      BOOLEAN NOT NULL DEFAULT FALSE,
      featured    BOOLEAN NOT NULL DEFAULT FALSE,
      pin_order   INTEGER,
      context     JSONB NOT NULL DEFAULT '{}'::jsonb,
      PRIMARY KEY (user_id, badge_id)
    );
    CREATE INDEX IF NOT EXISTS idx_userach_user ON user_achievements (user_id, unlocked_at DESC);
    CREATE INDEX IF NOT EXISTS idx_userach_badge ON user_achievements (badge_id);
    -- Fast "who to feature" lookups for a user's showcase.
    CREATE INDEX IF NOT EXISTS idx_userach_featured ON user_achievements (user_id, pin_order) WHERE featured;

    -- Live progress toward in-flight auto badges, so the profile can show bars
    -- without recomputing. Cleared to 100%/absent once the badge unlocks.
    CREATE TABLE IF NOT EXISTS achievement_progress (
      user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      badge_id   TEXT NOT NULL,
      current    INTEGER NOT NULL DEFAULT 0,
      target     INTEGER NOT NULL DEFAULT 0,
      percent    INTEGER NOT NULL DEFAULT 0,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      PRIMARY KEY (user_id, badge_id)
    );

    -- Current tier per user per track (author / reader).
    CREATE TABLE IF NOT EXISTS tier_state (
      user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      track_id   TEXT NOT NULL,
      tier_id    TEXT NOT NULL,
      level      INTEGER NOT NULL DEFAULT 0,
      reached_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      PRIMARY KEY (user_id, track_id)
    );

    -- Every promotion, for the timeline.
    CREATE TABLE IF NOT EXISTS tier_history (
      id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      track_id   TEXT NOT NULL,
      from_tier  TEXT,
      to_tier    TEXT NOT NULL,
      level      INTEGER NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_tierhist_user ON tier_history (user_id, created_at DESC);

    -- Append-only unlock timeline (badges + promotions), with the triggering event
    -- and story where known.
    CREATE TABLE IF NOT EXISTS unlock_history (
      id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      kind       TEXT NOT NULL CHECK (kind IN ('badge','tier')),
      badge_id   TEXT,
      track_id   TEXT,
      tier_id    TEXT,
      source     TEXT,
      event      TEXT,
      story_id   UUID REFERENCES stories(id) ON DELETE SET NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_unlockhist_user ON unlock_history (user_id, created_at DESC);

    -- Notification center. seen flips when the user opens the tray.
    CREATE TABLE IF NOT EXISTS achievement_notifications (
      id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      kind       TEXT NOT NULL CHECK (kind IN ('badge','tier')),
      badge_id   TEXT,
      track_id   TEXT,
      tier_id    TEXT,
      title      TEXT NOT NULL,
      body       TEXT,
      seen       BOOLEAN NOT NULL DEFAULT FALSE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_notif_user ON achievement_notifications (user_id, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_notif_unseen ON achievement_notifications (user_id) WHERE NOT seen;

    -- Audit log for every manual admin action against the achievement system.
    CREATE TABLE IF NOT EXISTS achievement_audit (
      id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      actor_id       UUID REFERENCES users(id) ON DELETE SET NULL,
      target_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
      action         TEXT NOT NULL,
      badge_id       TEXT,
      track_id       TEXT,
      detail         JSONB NOT NULL DEFAULT '{}'::jsonb,
      created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_ach_audit_target ON achievement_audit (target_user_id, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_ach_audit_actor  ON achievement_audit (actor_id, created_at DESC);
  `)

  // Bootstrap the first admin from env, so a fresh deploy has someone who can
  // reach the dashboard. Safe to run every boot — it only touches one account.
  if (process.env.ADMIN_EMAIL) {
    const { rowCount } = await pool.query(
      `UPDATE users SET role = 'admin' WHERE LOWER(email) = LOWER($1) AND role <> 'admin'`,
      [process.env.ADMIN_EMAIL]
    )
    if (rowCount > 0) console.log(`Promoted ${process.env.ADMIN_EMAIL} to admin`)
  }
}

// ── Story Games & platform points ───────────────────────────────────────────
// A Story Game is a challenge layered onto an ordinary story — same tree, same
// passages, same reader. Nothing here alters how a story is stored or read: the
// game is one optional row keyed by story_id, plus the clues its passages carry
// and the sessions readers build. A story without a row is untouched by all of
// it, which is the point.
//
// Mode ids are validated in code against games/catalog (the same discipline the
// badge catalogue follows) rather than by a CHECK constraint, so adding a mode
// stays a config edit and never needs a schema change.
const initGames = async () => {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS story_games (
      story_id      UUID PRIMARY KEY REFERENCES stories(id) ON DELETE CASCADE,
      mode          TEXT NOT NULL,
      objective     TEXT NOT NULL,
      briefing      TEXT,
      -- 'subject' → the answer is one of game_subjects; 'answer' → free text.
      solution_kind TEXT NOT NULL DEFAULT 'subject'
                      CHECK (solution_kind IN ('subject','answer')),
      -- A subject key, or the accepted answer(s) separated by '|'. Never sent to
      -- a reader: only the authoring projection in games/store exposes it.
      solution_key  TEXT NOT NULL,
      answer_hint   TEXT,
      max_attempts  SMALLINT NOT NULL DEFAULT 3 CHECK (max_attempts BETWEEN 1 AND 10),
      -- The game layer goes live separately from the story, so an author can
      -- publish the tale while the challenge is still half-built.
      published     BOOLEAN NOT NULL DEFAULT FALSE,
      created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    -- The answer options: suspects, witnesses, exits, assets — the mode names
    -- them. The key is stable and is what solution_key points at, so renaming a
    -- suspect in the editor can never invalidate the solution.
    CREATE TABLE IF NOT EXISTS game_subjects (
      id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      story_id   UUID NOT NULL REFERENCES stories(id) ON DELETE CASCADE,
      key        TEXT NOT NULL,
      name       TEXT NOT NULL,
      blurb      TEXT,
      sort_order SMALLINT NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE (story_id, key)
    );
    CREATE INDEX IF NOT EXISTS idx_game_subjects_story ON game_subjects (story_id, sort_order ASC);

    -- What a passage gives away. The reader collects a clue by reaching the
    -- passage that carries it, so clues cascade with the passage: delete the
    -- prose and the note that came from it goes too. An optional clue marks a side
    -- discovery — worth points, never required to solve the case.
    CREATE TABLE IF NOT EXISTS game_clues (
      id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      story_id   UUID NOT NULL REFERENCES stories(id) ON DELETE CASCADE,
      node_id    UUID NOT NULL REFERENCES nodes(id) ON DELETE CASCADE,
      label      TEXT NOT NULL,
      detail     TEXT,
      kind       TEXT NOT NULL DEFAULT 'clue'
                   CHECK (kind IN ('clue','evidence','observation')),
      weight     SMALLINT NOT NULL DEFAULT 1 CHECK (weight BETWEEN 1 AND 5),
      optional   BOOLEAN NOT NULL DEFAULT FALSE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    -- The hot path: "what does this passage reveal", asked on every move.
    CREATE INDEX IF NOT EXISTS idx_game_clues_node  ON game_clues (node_id);
    CREATE INDEX IF NOT EXISTS idx_game_clues_story ON game_clues (story_id, created_at ASC);

    -- One reader's run at one game. Opened the first time they touch the story,
    -- closed when they solve it or an ending gives the answer away — whichever
    -- comes first. notes is their own notebook text, kept here rather than in a
    -- table of its own because it is exactly one blob per (reader, game).
    CREATE TABLE IF NOT EXISTS game_sessions (
      user_id              UUID NOT NULL REFERENCES users(id)   ON DELETE CASCADE,
      story_id             UUID NOT NULL REFERENCES stories(id) ON DELETE CASCADE,
      started_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      finished_at          TIMESTAMPTZ,
      -- When the story itself revealed the answer (an ending was reached).
      revealed_at          TIMESTAMPTZ,
      solved_at            TIMESTAMPTZ,
      attempts             SMALLINT NOT NULL DEFAULT 0,
      solved               BOOLEAN NOT NULL DEFAULT FALSE,
      solved_before_reveal BOOLEAN NOT NULL DEFAULT FALSE,
      -- Every required clue, first answer, ahead of the reveal. Stored rather
      -- than re-derived so "flawless cases" is one indexed count.
      perfect              BOOLEAN NOT NULL DEFAULT FALSE,
      score                INTEGER NOT NULL DEFAULT 0,
      rank_id              TEXT,
      elapsed_ms           BIGINT,
      notes                TEXT NOT NULL DEFAULT '',
      updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      PRIMARY KEY (user_id, story_id)
    );
    -- Serves every leaderboard window in one shape; the partial predicate keeps
    -- in-flight sessions out of the boards entirely.
    CREATE INDEX IF NOT EXISTS idx_game_sessions_board
      ON game_sessions (story_id, score DESC, elapsed_ms ASC) WHERE finished_at IS NOT NULL;
    CREATE INDEX IF NOT EXISTS idx_game_sessions_user
      ON game_sessions (user_id, updated_at DESC);

    -- Which clues a reader holds. The primary key is the anti-inflation guard:
    -- walking back over a passage can never re-find what it gave you.
    CREATE TABLE IF NOT EXISTS game_discoveries (
      user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      story_id   UUID NOT NULL REFERENCES stories(id) ON DELETE CASCADE,
      clue_id    UUID NOT NULL REFERENCES game_clues(id) ON DELETE CASCADE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      PRIMARY KEY (user_id, clue_id)
    );
    CREATE INDEX IF NOT EXISTS idx_game_discoveries_user_story
      ON game_discoveries (user_id, story_id);

    -- Every answer submitted, right or wrong. The session carries the count that
    -- scoring uses; this is the record behind it.
    CREATE TABLE IF NOT EXISTS game_attempts (
      id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id    UUID NOT NULL REFERENCES users(id)   ON DELETE CASCADE,
      story_id   UUID NOT NULL REFERENCES stories(id) ON DELETE CASCADE,
      answer     TEXT NOT NULL,
      correct    BOOLEAN NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_game_attempts_user
      ON game_attempts (user_id, story_id, created_at DESC);

    -- Platform points ---------------------------------------------------------

    -- An append-only ledger. (user_id, kind, ref) is UNIQUE, which is what makes
    -- every payout idempotent: the same clue, game or badge can only ever pay
    -- once, however many times the request that earned it is retried.
    CREATE TABLE IF NOT EXISTS point_events (
      id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      kind       TEXT NOT NULL,
      ref        TEXT NOT NULL,
      points     INTEGER NOT NULL,
      meta       JSONB NOT NULL DEFAULT '{}'::jsonb,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE (user_id, kind, ref)
    );
    CREATE INDEX IF NOT EXISTS idx_point_events_user ON point_events (user_id, created_at DESC);

    -- A cache of the ledger's sum, recomputed from it on every award rather than
    -- incremented — so it can never drift from the rows behind it.
    CREATE TABLE IF NOT EXISTS user_points (
      user_id    UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
      points     INTEGER NOT NULL DEFAULT 0,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_user_points_board ON user_points (points DESC) WHERE points > 0;
  `)
}

module.exports = { pool, query, initDb }
