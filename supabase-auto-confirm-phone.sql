-- Phone accounts sign up with a synthetic address (+237XXXXXXXXX@phone.bartrack.app)
-- that has no inbox, so Supabase's "Confirm email" requirement can never be
-- satisfied for them. This migration auto-confirms phone accounts at signup and
-- unblocks any that are already stuck.
--
-- Run this in the Supabase SQL editor (Dashboard → SQL Editor → New query).
-- Alternative: disable "Confirm email" globally under
-- Authentication → Providers → Email, if you don't need it for email accounts.

-- 1. Unblock existing phone accounts that are waiting for a confirmation
--    email that will never arrive.
UPDATE auth.users
SET email_confirmed_at = NOW()
WHERE email LIKE '%@phone.bartrack.app'
  AND email_confirmed_at IS NULL;

-- 2. Auto-confirm future phone signups.
CREATE OR REPLACE FUNCTION public.auto_confirm_phone_accounts()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NEW.email LIKE '%@phone.bartrack.app' AND NEW.email_confirmed_at IS NULL THEN
    NEW.email_confirmed_at := NOW();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_auto_confirm_phone ON auth.users;
CREATE TRIGGER trg_auto_confirm_phone
  BEFORE INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_confirm_phone_accounts();
