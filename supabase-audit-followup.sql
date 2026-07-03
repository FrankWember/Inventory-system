-- ═══════════════════════════════════════════════════════════════════════════
-- BarTrack — Audit follow-up (2026-07-03). SAFE to run on live data:
-- no table is dropped; only constraints + housekeeping.
-- Run in: Supabase Dashboard → SQL Editor → New query → Run
-- ═══════════════════════════════════════════════════════════════════════════

-- 1. Enforce one settings row per user (the app assumes it; the signup trigger
--    seeds it — but nothing prevented duplicates until now).
--    Dedupe first (keep the oldest row), then add the unique index.
DELETE FROM settings s
USING settings older
WHERE s.user_id = older.user_id
  AND s.created_at > older.created_at;

CREATE UNIQUE INDEX IF NOT EXISTS idx_settings_user_unique ON settings(user_id);

-- 2. Housekeeping: expired/used auth artifacts accumulate forever otherwise.
DELETE FROM auth_sessions WHERE expires_at < NOW();
DELETE FROM password_reset_tokens WHERE used = true OR expires_at < NOW();

-- 3. (Optional, recommended) Schedule the housekeeping daily with pg_cron.
--    Enable the extension first: Dashboard → Database → Extensions → pg_cron.
-- SELECT cron.schedule('bartrack-auth-cleanup', '10 3 * * *', $$
--   DELETE FROM auth_sessions WHERE expires_at < NOW();
--   DELETE FROM password_reset_tokens WHERE used = true OR expires_at < NOW();
-- $$);

-- 4. (Optional) Remove the QA account created during the 2026-07-03 audit.
--    Cascades clean up its settings/auth_sessions/data rows automatically.
-- DELETE FROM users WHERE email = 'qa-claude-audit@example.com';

DO $$
BEGIN
  RAISE NOTICE '✅ Audit follow-up applied: settings uniqueness + auth housekeeping.';
END $$;
