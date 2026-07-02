-- =============================================================================
-- ADD ONBOARDING TRACKING TO SETTINGS TABLE
-- =============================================================================
-- This migration adds onboarding_completed field to track whether a user
-- has completed the onboarding process. This ensures onboarding state persists
-- across devices and sessions.
--
-- Run this in: Supabase Dashboard → SQL Editor → New query → Run
-- =============================================================================

-- Add onboarding_completed column to settings table
ALTER TABLE settings
  ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT false;

-- Set existing users to completed (to avoid forcing them through onboarding again)
-- New users will default to false and must complete onboarding
UPDATE settings
  SET onboarding_completed = true
  WHERE onboarding_completed IS NULL;

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_settings_onboarding ON settings(onboarding_completed);

-- =============================================================================
-- MIGRATION COMPLETE
-- =============================================================================
-- ✅ settings table now has onboarding_completed field
-- ✅ Existing users marked as completed
-- ✅ New users will default to false
-- ✅ Index created for performance
-- =============================================================================
