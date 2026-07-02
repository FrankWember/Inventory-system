-- ═══════════════════════════════════════════════════════════════════════════
-- BarTrack Clean Database Schema — Custom Auth (NO Supabase Auth)
-- ═══════════════════════════════════════════════════════════════════════════
-- Auth is fully owned by the app: a public.users table (hashed passwords) plus
-- Edge Functions that mint JWTs signed with the project's JWT secret. Postgres
-- RLS keeps isolating rows via auth.uid() (the JWT `sub` claim) exactly as
-- before — only the token ISSUER changed (our Edge Functions instead of GoTrue).
--
-- ⚠️  WARNING: This DROPS and recreates every table — ALL DATA IS WIPED.
--
-- Run in: Supabase Dashboard → SQL Editor → New query → Run
-- ═══════════════════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────────────────────────
-- STEP 1: EXTENSIONS
-- ─────────────────────────────────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ─────────────────────────────────────────────────────────────────────────────
-- STEP 2: DROP LEGACY OBJECTS (Supabase-Auth era) + EXISTING TABLES
-- ─────────────────────────────────────────────────────────────────────────────
-- Legacy triggers/functions that hung off auth.users are no longer used.
DROP TRIGGER IF EXISTS trg_initialize_new_user ON auth.users;
DROP FUNCTION IF EXISTS public.initialize_new_user() CASCADE;
DROP FUNCTION IF EXISTS public.get_email_by_phone(TEXT) CASCADE;

DROP TABLE IF EXISTS password_reset_tokens CASCADE;
DROP TABLE IF EXISTS auth_sessions CASCADE;
DROP TABLE IF EXISTS drink_templates CASCADE;
DROP TABLE IF EXISTS session_lines CASCADE;
DROP TABLE IF EXISTS sessions CASCADE;
DROP TABLE IF EXISTS expenses CASCADE;
DROP TABLE IF EXISTS drinks CASCADE;
DROP TABLE IF EXISTS settings CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- ─────────────────────────────────────────────────────────────────────────────
-- STEP 3: AUTH TABLES (owned by the app, touched only by Edge Functions)
-- ─────────────────────────────────────────────────────────────────────────────

-- Application users. Replaces auth.users. `id` is the identity that flows into
-- every data row's user_id and into the JWT `sub` claim.
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT NOT NULL,
  phone TEXT,
  password_hash TEXT NOT NULL,
  password_salt TEXT NOT NULL,
  display_name TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE UNIQUE INDEX idx_users_email ON users (lower(email));
CREATE UNIQUE INDEX idx_users_phone ON users (phone) WHERE phone IS NOT NULL;

-- Refresh tokens (opaque, stored only as a SHA-256 hash). Access JWTs are
-- short-lived; the client exchanges a refresh token here for a new access JWT.
CREATE TABLE auth_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  refresh_token_hash TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE INDEX idx_auth_sessions_user ON auth_sessions(user_id);

-- Password-reset tokens (single-use, short-lived, stored as a SHA-256 hash).
CREATE TABLE password_reset_tokens (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  used BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE INDEX idx_reset_tokens_user ON password_reset_tokens(user_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- STEP 4: DATA TABLES (now reference public.users instead of auth.users)
-- ─────────────────────────────────────────────────────────────────────────────

-- Drinks
CREATE TABLE drinks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
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

-- Sessions
CREATE TABLE sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  label TEXT NOT NULL,
  total_purchase INTEGER NOT NULL DEFAULT 0,
  total_revenue INTEGER NOT NULL DEFAULT 0,
  total_cost INTEGER NOT NULL DEFAULT 0,
  total_profit INTEGER NOT NULL DEFAULT 0,
  closed BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Session Lines
CREATE TABLE session_lines (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
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

-- Expenses
CREATE TABLE expenses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('Approvisionnement', 'Salaires', 'Loyer', 'Électricité/Eau', 'Réparations', 'Transport', 'Autre')),
  amount INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Settings (one row per user, seeded on signup by the trigger below)
CREATE TABLE settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  bar_name TEXT NOT NULL DEFAULT 'Mon Bar',
  currency TEXT NOT NULL DEFAULT 'FCFA',
  onboarding_completed BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────────────────────────────
-- STEP 5: INDEXES
-- ─────────────────────────────────────────────────────────────────────────────
CREATE INDEX idx_drinks_user_id ON drinks(user_id);
CREATE INDEX idx_drinks_category ON drinks(category);
CREATE INDEX idx_drinks_active ON drinks(active);
CREATE INDEX idx_drinks_rack_size ON drinks(rack_size);

CREATE INDEX idx_sessions_user_id ON sessions(user_id);
CREATE INDEX idx_sessions_date ON sessions(date);
CREATE INDEX idx_sessions_closed ON sessions(closed);

CREATE INDEX idx_session_lines_user_id ON session_lines(user_id);
CREATE INDEX idx_session_lines_session_id ON session_lines(session_id);
CREATE INDEX idx_session_lines_drink_id ON session_lines(drink_id);

CREATE INDEX idx_expenses_user_id ON expenses(user_id);
CREATE INDEX idx_expenses_date ON expenses(date);
CREATE INDEX idx_expenses_category ON expenses(category);

CREATE INDEX idx_settings_user_id ON settings(user_id);
CREATE INDEX idx_settings_onboarding ON settings(onboarding_completed);

-- ─────────────────────────────────────────────────────────────────────────────
-- STEP 6: ROW LEVEL SECURITY
-- ─────────────────────────────────────────────────────────────────────────────
-- Data tables: users may only touch their own rows (auth.uid() = our JWT sub).
ALTER TABLE drinks ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE session_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

-- Auth tables: RLS ON with NO policies → the anon/authenticated clients can
-- never read them. Only Edge Functions (service_role) bypass RLS and touch them.
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE auth_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE password_reset_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own_drinks" ON drinks FOR ALL
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "own_sessions" ON sessions FOR ALL
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "own_session_lines" ON session_lines FOR ALL
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "own_expenses" ON expenses FOR ALL
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "own_settings" ON settings FOR ALL
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- ─────────────────────────────────────────────────────────────────────────────
-- STEP 7: FUNCTIONS & TRIGGERS
-- ─────────────────────────────────────────────────────────────────────────────

-- Keep updated_at fresh.
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Seed a default settings row whenever a new app user is created.
CREATE OR REPLACE FUNCTION public.initialize_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO settings (user_id, bar_name, currency, onboarding_completed)
  VALUES (NEW.id, 'BarTrack', 'FCFA', false);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_initialize_new_user ON users;
CREATE TRIGGER trg_initialize_new_user
  AFTER INSERT ON users
  FOR EACH ROW EXECUTE FUNCTION public.initialize_new_user();

DROP TRIGGER IF EXISTS trg_update_users_updated_at ON users;
CREATE TRIGGER trg_update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS trg_update_drinks_updated_at ON drinks;
CREATE TRIGGER trg_update_drinks_updated_at
  BEFORE UPDATE ON drinks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ─────────────────────────────────────────────────────────────────────────────
-- STEP 8: DATA CONSTRAINTS
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE drinks
  ADD CONSTRAINT check_price_non_negative CHECK (price >= 0),
  ADD CONSTRAINT check_cost_non_negative CHECK (cost >= 0),
  ADD CONSTRAINT check_stock_non_negative CHECK (stock >= 0),
  ADD CONSTRAINT check_min_stock_non_negative CHECK (min_stock >= 0),
  ADD CONSTRAINT check_rack_size_positive CHECK (rack_size > 0),
  ADD CONSTRAINT check_cassier_quantity_positive CHECK (cassier_quantity > 0),
  ADD CONSTRAINT check_cassier_cost_non_negative CHECK (cassier_cost >= 0);

ALTER TABLE sessions
  ADD CONSTRAINT check_total_purchase_non_negative CHECK (total_purchase >= 0),
  ADD CONSTRAINT check_total_revenue_non_negative CHECK (total_revenue >= 0),
  ADD CONSTRAINT check_total_cost_non_negative CHECK (total_cost >= 0);

ALTER TABLE session_lines
  ADD CONSTRAINT check_opening_stock_non_negative CHECK (opening_stock >= 0),
  ADD CONSTRAINT check_purchased_non_negative CHECK (purchased >= 0),
  ADD CONSTRAINT check_sold_non_negative CHECK (sold >= 0),
  ADD CONSTRAINT check_closing_stock_non_negative CHECK (closing_stock >= 0),
  ADD CONSTRAINT check_revenue_non_negative CHECK (revenue >= 0),
  ADD CONSTRAINT check_line_cost_non_negative CHECK (cost >= 0);

ALTER TABLE expenses
  ADD CONSTRAINT check_amount_positive CHECK (amount > 0);

-- ─────────────────────────────────────────────────────────────────────────────
-- STEP 9: GRANTS
-- ─────────────────────────────────────────────────────────────────────────────
-- Clients (with our JWT → role `authenticated`) may touch data tables only;
-- RLS still restricts them to their own rows. Auth tables get NO grants.
GRANT USAGE ON SCHEMA public TO authenticated, anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON drinks TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON sessions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON session_lines TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON expenses TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON settings TO authenticated;

-- ─────────────────────────────────────────────────────────────────────────────
DO $$
BEGIN
  RAISE NOTICE '✅ BarTrack clean schema installed (custom auth, no Supabase Auth).';
  RAISE NOTICE '   Next: set Edge Function secrets and deploy the auth-* functions.';
END $$;
