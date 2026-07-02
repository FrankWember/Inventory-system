-- =============================================================================
-- USER ISOLATION MIGRATION
-- =============================================================================
-- This migration adds user_id columns to all data tables and implements
-- Row Level Security policies to isolate each user's data.
--
-- IMPORTANT: This will DELETE all existing data and start fresh.
-- Each user will get their own isolated inventory, sessions, and expenses.
--
-- Run this in: Supabase Dashboard → SQL Editor → New query → Run
-- =============================================================================

-- -----------------------------------------------------------------------------
-- STEP 1: DELETE ALL EXISTING DATA (Fresh Start)
-- -----------------------------------------------------------------------------
TRUNCATE TABLE session_lines CASCADE;
TRUNCATE TABLE sessions CASCADE;
TRUNCATE TABLE expenses CASCADE;
TRUNCATE TABLE drinks CASCADE;
TRUNCATE TABLE settings CASCADE;

-- -----------------------------------------------------------------------------
-- STEP 2: ADD user_id COLUMNS TO ALL TABLES
-- -----------------------------------------------------------------------------

-- Add user_id to drinks table
ALTER TABLE drinks
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Add user_id to sessions table
ALTER TABLE sessions
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Add user_id to session_lines table
ALTER TABLE session_lines
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Add user_id to expenses table
ALTER TABLE expenses
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Add user_id to settings table
ALTER TABLE settings
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Make user_id NOT NULL (now that tables are empty)
ALTER TABLE drinks ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE sessions ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE session_lines ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE expenses ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE settings ALTER COLUMN user_id SET NOT NULL;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_drinks_user_id ON drinks(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_session_lines_user_id ON session_lines(user_id);
CREATE INDEX IF NOT EXISTS idx_expenses_user_id ON expenses(user_id);
CREATE INDEX IF NOT EXISTS idx_settings_user_id ON settings(user_id);

-- -----------------------------------------------------------------------------
-- STEP 3: DROP OLD RLS POLICIES
-- -----------------------------------------------------------------------------

DROP POLICY IF EXISTS "Authenticated users can manage drinks" ON drinks;
DROP POLICY IF EXISTS "Authenticated users can manage sessions" ON sessions;
DROP POLICY IF EXISTS "Authenticated users can manage session lines" ON session_lines;
DROP POLICY IF EXISTS "Authenticated users can manage expenses" ON expenses;
DROP POLICY IF EXISTS "Authenticated users can manage settings" ON settings;

-- -----------------------------------------------------------------------------
-- STEP 4: CREATE NEW USER-ISOLATED RLS POLICIES
-- -----------------------------------------------------------------------------

-- Drinks: Users can only access their own drinks
CREATE POLICY "Users can only access their own drinks"
  ON drinks FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Sessions: Users can only access their own sessions
CREATE POLICY "Users can only access their own sessions"
  ON sessions FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Session Lines: Users can only access their own session lines
CREATE POLICY "Users can only access their own session lines"
  ON session_lines FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Expenses: Users can only access their own expenses
CREATE POLICY "Users can only access their own expenses"
  ON expenses FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Settings: Users can only access their own settings
CREATE POLICY "Users can only access their own settings"
  ON settings FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- -----------------------------------------------------------------------------
-- STEP 5: CREATE USER INITIALIZATION SYSTEM
-- -----------------------------------------------------------------------------

-- Function to initialize a new user's data with template drinks (stock = 0)
CREATE OR REPLACE FUNCTION public.initialize_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  template_drinks jsonb;
BEGIN
  -- Define template drinks with 0 stock
  template_drinks := '[
    {"name": "KADJI", "category": "Bière", "price": 600, "cost": 400, "min_stock": 36},
    {"name": "ISENBECK", "category": "Bière", "price": 600, "cost": 400, "min_stock": 24},
    {"name": "CASTEL", "category": "Bière", "price": 600, "cost": 400, "min_stock": 24},
    {"name": "33 EXPORT", "category": "Bière", "price": 600, "cost": 400, "min_stock": 24},
    {"name": "BEAUFORT", "category": "Bière", "price": 600, "cost": 400, "min_stock": 24},
    {"name": "GUINNESS", "category": "Bière", "price": 1000, "cost": 700, "min_stock": 12},
    {"name": "HEINEKEN", "category": "Bière", "price": 1000, "cost": 700, "min_stock": 12},
    {"name": "DESPERADOS", "category": "Bière", "price": 1000, "cost": 700, "min_stock": 12},
    {"name": "MUTZIG", "category": "Bière", "price": 600, "cost": 400, "min_stock": 24},
    {"name": "SODA", "category": "Soft", "price": 500, "cost": 300, "min_stock": 48},
    {"name": "EAU MINÉRALE", "category": "Soft", "price": 300, "cost": 200, "min_stock": 24},
    {"name": "JUS", "category": "Soft", "price": 700, "cost": 450, "min_stock": 24},
    {"name": "WHISKY", "category": "Spiritueux", "price": 2000, "cost": 1500, "min_stock": 6},
    {"name": "VODKA", "category": "Spiritueux", "price": 1800, "cost": 1300, "min_stock": 6},
    {"name": "GIN", "category": "Spiritueux", "price": 1800, "cost": 1300, "min_stock": 6},
    {"name": "VIN ROUGE", "category": "Vin", "price": 1500, "cost": 1000, "min_stock": 12},
    {"name": "VIN BLANC", "category": "Vin", "price": 1500, "cost": 1000, "min_stock": 12},
    {"name": "CHAMPAGNE", "category": "Vin", "price": 5000, "cost": 3500, "min_stock": 6}
  ]'::jsonb;

  -- Insert template drinks for new user
  INSERT INTO drinks (user_id, name, category, price, cost, stock, min_stock, active, updated_at)
  SELECT
    NEW.id,
    (drink->>'name')::text,
    (drink->>'category')::text,
    (drink->>'price')::integer,
    (drink->>'cost')::integer,
    0, -- Stock starts at 0
    (drink->>'min_stock')::integer,
    true,
    NOW()
  FROM jsonb_array_elements(template_drinks) AS drink;

  -- Insert default settings for new user
  INSERT INTO settings (user_id, bar_name, currency)
  VALUES (NEW.id, 'Mon Bar', 'FCFA');

  RETURN NEW;
END;
$$;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS trg_initialize_new_user ON auth.users;

-- Create trigger to initialize new users automatically
CREATE TRIGGER trg_initialize_new_user
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.initialize_new_user();

-- -----------------------------------------------------------------------------
-- STEP 6: GRANT NECESSARY PERMISSIONS
-- -----------------------------------------------------------------------------

-- Grant usage on schema (if needed)
GRANT USAGE ON SCHEMA public TO authenticated;

-- Grant permissions on tables
GRANT SELECT, INSERT, UPDATE, DELETE ON drinks TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON sessions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON session_lines TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON expenses TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON settings TO authenticated;

-- -----------------------------------------------------------------------------
-- MIGRATION COMPLETE
-- -----------------------------------------------------------------------------
-- ✅ All tables now have user_id columns with NOT NULL constraint
-- ✅ Foreign keys reference auth.users(id) with CASCADE DELETE
-- ✅ RLS policies isolate data per user
-- ✅ New users get auto-initialized with template drinks (stock=0)
-- ✅ Each user has their own settings
--
-- NEXT STEPS:
-- 1. Run this migration in Supabase SQL Editor
-- 2. Update application code to include user_id in all INSERT operations
-- 3. Test with multiple accounts to verify isolation
-- =============================================================================
