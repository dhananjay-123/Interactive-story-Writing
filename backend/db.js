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

const query = (text, params) => pool.query(text, params)

// gen_random_uuid() is a core function in PostgreSQL 13+; no extension needed.
const initDb = async () => {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS stories (
      id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      title         TEXT NOT NULL,
      description   TEXT,
      genre         TEXT NOT NULL DEFAULT 'fantasy'
                      CHECK (genre IN ('fantasy','mystery','sci_fi','romance','horror','thriller','literary')),
      author        TEXT NOT NULL DEFAULT 'Anonymous',
      root_node_id  UUID,
      branch_count  INTEGER NOT NULL DEFAULT 0,
      published     BOOLEAN NOT NULL DEFAULT TRUE,
      created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS nodes (
      id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      story_id    UUID NOT NULL REFERENCES stories(id) ON DELETE CASCADE,
      text        TEXT NOT NULL,
      choices     JSONB NOT NULL DEFAULT '[]'::jsonb,
      is_ending   BOOLEAN NOT NULL DEFAULT FALSE,
      created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_nodes_story_id ON nodes (story_id);
    CREATE INDEX IF NOT EXISTS idx_stories_published_created ON stories (published, created_at DESC);
  `)
}

module.exports = { pool, query, initDb }
