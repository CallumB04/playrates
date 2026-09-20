-- citext: case-insensitive usernames and slugs, so "Callum" and "callum" can't
-- both exist without a functional index on lower().
-- pg_trgm: trigram indexes for substring title search.

--   pgcrypto crypt()/gen_salt(), used by supabase/seed.sql to create local dev
--            accounts. Supabase enables it by default; declared here so a
--            `db reset` on a bare Postgres still works.

-- The extensions schema is not on the search path on hosted projects, only on
-- the local CLI stack. Always write extensions.citext, or this applies locally
-- and fails on deploy.
create extension if not exists citext with schema extensions;
create extension if not exists pg_trgm with schema extensions;
create extension if not exists pgcrypto with schema extensions;
