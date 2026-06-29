-- ═══════════════════════════════════════════════════════════════════════════
-- BarTrack Complete Database Migration & Sync
-- This file contains ALL schema updates to sync your Supabase database
-- Run this in your Supabase SQL Editor
-- ═══════════════════════════════════════════════════════════════════════════

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. DRINKS TABLE
-- ─────────────────────────────────────────────────────────────────────────────

-- Create drinks table if it doesn't exist
CREATE TABLE IF NOT EXISTS drinks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('Bière', 'Soda', 'Jus', 'Eau', 'Vin', 'Autre')),
  price INTEGER NOT NULL DEFAULT 0,
  cost INTEGER NOT NULL DEFAULT 0,
  stock INTEGER NOT NULL DEFAULT 0,
  min_stock INTEGER NOT NULL DEFAULT 0,
  supplier TEXT DEFAULT '',
  notes TEXT DEFAULT '',
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add rack_size column if it doesn't exist (migration from old schema)
ALTER TABLE drinks
  ADD COLUMN IF NOT EXISTS rack_size INTEGER NOT NULL DEFAULT 12;

-- Set rack_size to 1 for non-beer items (they're counted individually)
UPDATE drinks SET rack_size = 1 WHERE category <> 'Bière' AND rack_size = 12;

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. SESSIONS TABLE
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  date DATE NOT NULL,
  label TEXT NOT NULL,
  total_purchase INTEGER NOT NULL DEFAULT 0,
  total_revenue INTEGER NOT NULL DEFAULT 0,
  total_cost INTEGER NOT NULL DEFAULT 0,
  total_profit INTEGER NOT NULL DEFAULT 0,
  closed BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. SESSION LINES TABLE
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS session_lines (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
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

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. EXPENSES TABLE
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS expenses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  date DATE NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('Approvisionnement', 'Salaires', 'Loyer', 'Électricité/Eau', 'Réparations', 'Transport', 'Autre')),
  amount INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────────────────────────────
-- 5. SETTINGS TABLE
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  bar_name TEXT NOT NULL DEFAULT 'Mon Bar',
  currency TEXT NOT NULL DEFAULT 'FCFA',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default settings if table is empty
INSERT INTO settings (bar_name, currency)
SELECT 'BarTrack', 'FCFA'
WHERE NOT EXISTS (SELECT 1 FROM settings);

-- ─────────────────────────────────────────────────────────────────────────────
-- 6. CREATE INDEXES FOR PERFORMANCE
-- ─────────────────────────────────────────────────────────────────────────────

-- Drop existing indexes if they exist (to avoid conflicts)
DROP INDEX IF EXISTS idx_drinks_category;
DROP INDEX IF EXISTS idx_drinks_active;
DROP INDEX IF EXISTS idx_sessions_date;
DROP INDEX IF EXISTS idx_session_lines_session_id;
DROP INDEX IF EXISTS idx_session_lines_drink_id;
DROP INDEX IF EXISTS idx_expenses_date;
DROP INDEX IF EXISTS idx_expenses_category;

-- Create indexes for better query performance
CREATE INDEX idx_drinks_category ON drinks(category);
CREATE INDEX idx_drinks_active ON drinks(active);
CREATE INDEX idx_drinks_rack_size ON drinks(rack_size);
CREATE INDEX idx_sessions_date ON sessions(date);
CREATE INDEX idx_sessions_closed ON sessions(closed);
CREATE INDEX idx_session_lines_session_id ON session_lines(session_id);
CREATE INDEX idx_session_lines_drink_id ON session_lines(drink_id);
CREATE INDEX idx_expenses_date ON expenses(date);
CREATE INDEX idx_expenses_category ON expenses(category);

-- ─────────────────────────────────────────────────────────────────────────────
-- 7. ENABLE ROW LEVEL SECURITY (RLS)
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE drinks ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE session_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────────────────────
-- 8. DROP OLD POLICIES (if they exist)
-- ─────────────────────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "Allow all operations on drinks" ON drinks;
DROP POLICY IF EXISTS "Allow all operations on sessions" ON sessions;
DROP POLICY IF EXISTS "Allow all operations on session_lines" ON session_lines;
DROP POLICY IF EXISTS "Allow all operations on expenses" ON expenses;
DROP POLICY IF EXISTS "Allow all operations on settings" ON settings;

-- Drop any authenticated user policies
DROP POLICY IF EXISTS "Allow authenticated users all operations on drinks" ON drinks;
DROP POLICY IF EXISTS "Allow authenticated users all operations on sessions" ON sessions;
DROP POLICY IF EXISTS "Allow authenticated users all operations on session_lines" ON session_lines;
DROP POLICY IF EXISTS "Allow authenticated users all operations on expenses" ON expenses;
DROP POLICY IF EXISTS "Allow authenticated users all operations on settings" ON settings;

-- ─────────────────────────────────────────────────────────────────────────────
-- 9. CREATE NEW POLICIES (Authenticated Users Only)
-- ─────────────────────────────────────────────────────────────────────────────

-- Only authenticated users can access the data
CREATE POLICY "Authenticated users can manage drinks"
  ON drinks FOR ALL
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can manage sessions"
  ON sessions FOR ALL
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can manage session_lines"
  ON session_lines FOR ALL
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can manage expenses"
  ON expenses FOR ALL
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can manage settings"
  ON settings FOR ALL
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

-- ─────────────────────────────────────────────────────────────────────────────
-- 10. MIGRATION COMPLETE
-- ─────────────────────────────────────────────────────────────────────────────

-- Display completion message
DO $$
BEGIN
  RAISE NOTICE '✓ Database schema sync completed successfully!';
  RAISE NOTICE '✓ All tables created/updated';
  RAISE NOTICE '✓ Indexes created';
  RAISE NOTICE '✓ Row Level Security enabled';
  RAISE NOTICE '✓ Policies configured for authenticated users';
  RAISE NOTICE '';
  RAISE NOTICE 'Next steps:';
  RAISE NOTICE '1. Run supabase-create-user.sql to create Frank Wember user';
  RAISE NOTICE '2. Run supabase-seed-complete.sql to populate with sample data';
END $$;
