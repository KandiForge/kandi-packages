-- KandiForge Packages API Database Setup
-- Project: KandiForge Packages API Database
-- Run this in the Supabase SQL Editor after creating the project
--
-- This is the same migration as docs/migrations/001_users_table.sql
-- tailored for the packages test environment.

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS users (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email           TEXT UNIQUE NOT NULL,
    name            TEXT,
    display_name    TEXT,
    avatar_url      TEXT,
    email_verified  BOOLEAN DEFAULT false,
    role            TEXT DEFAULT 'user',

    -- OAuth provider subject IDs
    google_sub      TEXT UNIQUE,
    apple_sub       TEXT UNIQUE,
    facebook_sub    TEXT UNIQUE,
    hellocoop_sub   TEXT UNIQUE,

    -- Test persona provider
    test_sub        TEXT UNIQUE,

    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_google_sub ON users(google_sub) WHERE google_sub IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_users_apple_sub ON users(apple_sub) WHERE apple_sub IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_users_facebook_sub ON users(facebook_sub) WHERE facebook_sub IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_users_hellocoop_sub ON users(hellocoop_sub) WHERE hellocoop_sub IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_users_test_sub ON users(test_sub) WHERE test_sub IS NOT NULL;

-- Auto-update updated_at
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

-- Verify
SELECT 'Setup complete. Table "users" created with ' || count(*)::text || ' columns.'
FROM information_schema.columns
WHERE table_name = 'users';
