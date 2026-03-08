-- kandi-login: User table with OAuth provider linking
-- Compatible with: PostgreSQL 14+, Supabase, Neon, CockroachDB
--
-- This migration creates the users table with columns for each supported
-- OAuth provider's subject ID. Account linking works by matching email
-- across providers. The test_sub column supports kandi-login's test personas.
--
-- Usage:
--   psql $DATABASE_URL -f 001_users_table.sql
--   OR run via Supabase SQL editor
--   OR adapt for your migration tool (knex, drizzle, etc.)

-- Enable UUID generation if not already available
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS users (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email           TEXT UNIQUE NOT NULL,
    name            TEXT,
    display_name    TEXT,
    avatar_url      TEXT,
    email_verified  BOOLEAN DEFAULT false,
    role            TEXT DEFAULT 'user',

    -- OAuth provider subject IDs (one per provider)
    -- Each is unique — a provider account can only link to one user
    google_sub      TEXT UNIQUE,
    apple_sub       TEXT UNIQUE,
    facebook_sub    TEXT UNIQUE,
    hellocoop_sub   TEXT UNIQUE,

    -- Test persona provider (kandi-login dev/test system)
    test_sub        TEXT UNIQUE,

    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Index for email lookups (account linking)
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- Index for provider lookups
CREATE INDEX IF NOT EXISTS idx_users_google_sub ON users(google_sub) WHERE google_sub IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_users_apple_sub ON users(apple_sub) WHERE apple_sub IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_users_facebook_sub ON users(facebook_sub) WHERE facebook_sub IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_users_hellocoop_sub ON users(hellocoop_sub) WHERE hellocoop_sub IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_users_test_sub ON users(test_sub) WHERE test_sub IS NOT NULL;

-- Auto-update updated_at on row modification
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_updated_at ON users;
CREATE TRIGGER set_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
