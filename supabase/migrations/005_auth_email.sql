-- ────────────────────────────────────────────────────────────
-- 005_auth_email.sql — email-first sign-in (removes SMS dependency)
--
-- Launch auth is email magic-link. Phone is no longer required at signup
-- (kept optional for later WhatsApp linking — see docs/whatsapp-otp.md).
-- ────────────────────────────────────────────────────────────

-- Phone: was `not null unique`. Make it nullable; keep the unique constraint
-- (Postgres allows multiple NULLs under a UNIQUE constraint, so email-first
-- users with no phone don't collide).
alter table humrahis alter column phone drop not null;

-- Store the sign-in email on the profile for the admin console + display.
-- auth.users already holds the canonical email; this is a convenience copy.
alter table humrahis add column if not exists email text;

-- Optional: dedupe by email when present (NULLs allowed multiple times).
create unique index if not exists humrahis_email_key
  on humrahis (lower(email)) where email is not null;
