-- ═══════════════════════════════════════════════════════════════════════════
-- BarTrack Complete Database Schema - Fresh Install
-- ═══════════════════════════════════════════════════════════════════════════
-- This file contains the COMPLETE database schema for BarTrack.
-- Run this on a FRESH Supabase database to set up everything.
--
-- ⚠️  WARNING: This will DROP and recreate all tables, deleting all data!
--
-- Features:
-- ✅ Multi-user support with user isolation
-- ✅ Email + Phone authentication
-- ✅ Onboarding tracking (database-backed)
-- ✅ Rack/Cassier support for bulk purchases
-- ✅ Row Level Security (RLS) for data privacy
-- ✅ Phone-based login support
--
-- Run this in: Supabase Dashboard → SQL Editor → New query → Run
-- ═══════════════════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────────────────────────
-- STEP 1: ENABLE EXTENSIONS
-- ─────────────────────────────────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ─────────────────────────────────────────────────────────────────────────────
-- STEP 2: DROP EXISTING TABLES (FRESH START)
-- ─────────────────────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS drink_templates CASCADE;
DROP TABLE IF EXISTS session_lines CASCADE;
DROP TABLE IF EXISTS sessions CASCADE;
DROP TABLE IF EXISTS expenses CASCADE;
DROP TABLE IF EXISTS drinks CASCADE;
DROP TABLE IF EXISTS settings CASCADE;

-- ─────────────────────────────────────────────────────────────────────────────
-- STEP 3: CREATE TABLES
-- ─────────────────────────────────────────────────────────────────────────────

-- Drinks Table
CREATE TABLE drinks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('Bière', 'Soda', 'Jus', 'Eau', 'Vin', 'Autre')),
  price INTEGER NOT NULL DEFAULT 0,
  cost INTEGER NOT NULL DEFAULT 0,
  stock INTEGER NOT NULL DEFAULT 0,
  min_stock INTEGER NOT NULL DEFAULT 0,
  rack_size INTEGER NOT NULL DEFAULT 12,
  cassier_quantity INTEGER NOT NULL DEFAULT 12,
  cassier_cost INTEGER NOT NULL DEFAULT 0,
  supplier TEXT DEFAULT '',
  notes TEXT DEFAULT '',
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Sessions Table
CREATE TABLE sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  label TEXT NOT NULL,
  total_purchase INTEGER NOT NULL DEFAULT 0,
  total_revenue INTEGER NOT NULL DEFAULT 0,
  total_cost INTEGER NOT NULL DEFAULT 0,
  total_profit INTEGER NOT NULL DEFAULT 0,
  closed BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Session Lines Table
CREATE TABLE session_lines (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id UUID REFERENCES sessions(id) ON DELETE CASCADE,
  drink_id UUID REFERENCES drinks(id) ON DELETE CASCADE,
  drink_name TEXT NOT NULL,
  opening_stock INTEGER NOT NULL DEFAULT 0,
  purchased INTEGER NOT NULL DEFAULT 0,
  sold INTEGER NOT NULL DEFAULT 0,
  closing_stock INTEGER NOT NULL DEFAULT 0,
  revenue INTEGER NOT NULL DEFAULT 0,
  cost INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Expenses Table
CREATE TABLE expenses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('Approvisionnement', 'Salaires', 'Loyer', 'Électricité/Eau', 'Réparations', 'Transport', 'Autre')),
  amount INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Settings Table
CREATE TABLE settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  bar_name TEXT NOT NULL DEFAULT 'Mon Bar',
  currency TEXT NOT NULL DEFAULT 'FCFA',
  onboarding_completed BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────────────────────────────
-- STEP 4: CREATE INDEXES FOR PERFORMANCE
-- ─────────────────────────────────────────────────────────────────────────────

-- Drinks indexes
CREATE INDEX idx_drinks_user_id ON drinks(user_id);
CREATE INDEX idx_drinks_category ON drinks(category);
CREATE INDEX idx_drinks_active ON drinks(active);
CREATE INDEX idx_drinks_rack_size ON drinks(rack_size);

-- Sessions indexes
CREATE INDEX idx_sessions_user_id ON sessions(user_id);
CREATE INDEX idx_sessions_date ON sessions(date);
CREATE INDEX idx_sessions_closed ON sessions(closed);

-- Session lines indexes
CREATE INDEX idx_session_lines_user_id ON session_lines(user_id);
CREATE INDEX idx_session_lines_session_id ON session_lines(session_id);
CREATE INDEX idx_session_lines_drink_id ON session_lines(drink_id);

-- Expenses indexes
CREATE INDEX idx_expenses_user_id ON expenses(user_id);
CREATE INDEX idx_expenses_date ON expenses(date);
CREATE INDEX idx_expenses_category ON expenses(category);

-- Settings indexes
CREATE INDEX idx_settings_user_id ON settings(user_id);
CREATE INDEX idx_settings_onboarding ON settings(onboarding_completed);

-- ─────────────────────────────────────────────────────────────────────────────
-- STEP 5: ENABLE ROW LEVEL SECURITY (RLS)
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE drinks ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE session_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────────────────────
-- STEP 6: CREATE RLS POLICIES (USER ISOLATION)
-- ─────────────────────────────────────────────────────────────────────────────

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

-- ─────────────────────────────────────────────────────────────────────────────
-- STEP 7: CREATE HELPER FUNCTIONS
-- ─────────────────────────────────────────────────────────────────────────────

-- Function to get email by phone number (for phone-based login)
CREATE OR REPLACE FUNCTION public.get_email_by_phone(phone_number TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_email TEXT;
BEGIN
  SELECT email INTO user_email
  FROM auth.users
  WHERE raw_user_meta_data->>'phone' = phone_number
  LIMIT 1;

  RETURN user_email;
END;
$$;

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Function to initialize new users
CREATE OR REPLACE FUNCTION public.initialize_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Only create default settings for new user (empty inventory)
  INSERT INTO settings (user_id, bar_name, currency, onboarding_completed)
  VALUES (NEW.id, 'BarTrack', 'FCFA', false);

  RETURN NEW;
END;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- STEP 8: CREATE TRIGGERS
-- ─────────────────────────────────────────────────────────────────────────────

-- Trigger to initialize new users
DROP TRIGGER IF EXISTS trg_initialize_new_user ON auth.users;
CREATE TRIGGER trg_initialize_new_user
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.initialize_new_user();

-- Trigger to auto-update drinks.updated_at
DROP TRIGGER IF EXISTS trg_update_drinks_updated_at ON drinks;
CREATE TRIGGER trg_update_drinks_updated_at
  BEFORE UPDATE ON drinks
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- ─────────────────────────────────────────────────────────────────────────────
-- STEP 9: ADD DATA CONSTRAINTS
-- ─────────────────────────────────────────────────────────────────────────────

-- Drinks table constraints
ALTER TABLE drinks
  ADD CONSTRAINT check_price_non_negative CHECK (price >= 0),
  ADD CONSTRAINT check_cost_non_negative CHECK (cost >= 0),
  ADD CONSTRAINT check_stock_non_negative CHECK (stock >= 0),
  ADD CONSTRAINT check_min_stock_non_negative CHECK (min_stock >= 0),
  ADD CONSTRAINT check_rack_size_positive CHECK (rack_size > 0),
  ADD CONSTRAINT check_cassier_quantity_positive CHECK (cassier_quantity > 0),
  ADD CONSTRAINT check_cassier_cost_non_negative CHECK (cassier_cost >= 0);

-- Sessions table constraints
ALTER TABLE sessions
  ADD CONSTRAINT check_total_purchase_non_negative CHECK (total_purchase >= 0),
  ADD CONSTRAINT check_total_revenue_non_negative CHECK (total_revenue >= 0),
  ADD CONSTRAINT check_total_cost_non_negative CHECK (total_cost >= 0);

-- Session lines table constraints
ALTER TABLE session_lines
  ADD CONSTRAINT check_opening_stock_non_negative CHECK (opening_stock >= 0),
  ADD CONSTRAINT check_purchased_non_negative CHECK (purchased >= 0),
  ADD CONSTRAINT check_sold_non_negative CHECK (sold >= 0),
  ADD CONSTRAINT check_closing_stock_non_negative CHECK (closing_stock >= 0),
  ADD CONSTRAINT check_revenue_non_negative CHECK (revenue >= 0),
  ADD CONSTRAINT check_cost_non_negative CHECK (cost >= 0);

-- Expenses table constraints
ALTER TABLE expenses
  ADD CONSTRAINT check_amount_positive CHECK (amount > 0);

-- Note: Unique phone constraint cannot be enforced at database level
-- because auth.users is managed by Supabase. Phone uniqueness must be
-- validated in the application code before signup.

-- ─────────────────────────────────────────────────────────────────────────────
-- STEP 10: GRANT PERMISSIONS
-- ─────────────────────────────────────────────────────────────────────────────
GRANT USAGE ON SCHEMA public TO authenticated, anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON drinks TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON sessions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON session_lines TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON expenses TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON settings TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_email_by_phone TO authenticated, anon;

-- ─────────────────────────────────────────────────────────────────────────────
-- INSTALLATION COMPLETE
-- ─────────────────────────────────────────────────────────────────────────────
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '═══════════════════════════════════════════════════════════════';
  RAISE NOTICE '✅ BarTrack Database Installation Complete!';
  RAISE NOTICE '═══════════════════════════════════════════════════════════════';
  RAISE NOTICE '';
  RAISE NOTICE 'What was installed:';
  RAISE NOTICE '  ✅ All database tables (drinks, sessions, expenses, settings)';
  RAISE NOTICE '  ✅ User isolation with Row Level Security (RLS)';
  RAISE NOTICE '  ✅ Empty inventory initialization trigger';
  RAISE NOTICE '  ✅ Phone-based login function';
  RAISE NOTICE '  ✅ Auto-update triggers (updated_at)';
  RAISE NOTICE '  ✅ Data validation constraints';
  RAISE NOTICE '  ✅ Performance indexes';
  RAISE NOTICE '';
  RAISE NOTICE 'Features:';
  RAISE NOTICE '  📱 Email + Phone signup';
  RAISE NOTICE '  🔐 Login with either email OR phone';
  RAISE NOTICE '  🔒 Multi-user isolation (RLS)';
  RAISE NOTICE '  📦 Rack/Cassier bulk purchase support';
  RAISE NOTICE '  📊 Session-based inventory tracking';
  RAISE NOTICE '  💰 Revenue/Cost/Profit calculations';
  RAISE NOTICE '';
  RAISE NOTICE 'Next steps:';
  RAISE NOTICE '  1. Test signup with email+phone';
  RAISE NOTICE '  2. Test login with both email and phone';
  RAISE NOTICE '  3. Complete onboarding flow';
  RAISE NOTICE '  4. Verify RLS policies work correctly';
  RAISE NOTICE '';
  RAISE NOTICE '═══════════════════════════════════════════════════════════════';
END $$;
