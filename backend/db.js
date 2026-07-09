const { Pool } = require('pg')

const pool = process.env.DATABASE_URL
  ? new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.PGSSL === 'true' ? { rejectUnauthorized: false } : undefined,
    })
  : new Pool({
      host: process.env.PGHOST || 'localhost',
      port: Number(process.env.PGPORT) || 5432,
      user: process.env.PGUSER || 'postgres',
      password: process.env.PGPASSWORD || 'postgres',
      database: process.env.PGDATABASE || 'inkwell',
    })

// Neon's free tier closes idle connections. Without this handler, a dropped
// idle client emits an 'error' on the pool with no listener, which crashes the
// whole process. Log it and let the pool recycle the connection instead.
pool.on('error', (err) => {
  console.error('Unexpected PG pool error (idle client dropped):', err.message)
})

const query = (text, params) => pool.query(text, params)

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

module.exports = { pool, query, initDb }
