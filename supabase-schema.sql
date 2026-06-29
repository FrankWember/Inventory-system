-- BarTrack Supabase Database Schema
-- Run this in your Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Drinks table
CREATE TABLE drinks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('Bière', 'Soda', 'Jus', 'Eau', 'Vin', 'Autre')),
  price INTEGER NOT NULL DEFAULT 0,
  cost INTEGER NOT NULL DEFAULT 0,
  stock INTEGER NOT NULL DEFAULT 0,
  min_stock INTEGER NOT NULL DEFAULT 0,
  rack_size INTEGER NOT NULL DEFAULT 12,  -- units per cassier (12 for beers)
  supplier TEXT DEFAULT '',
  notes TEXT DEFAULT '',
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Sessions table
CREATE TABLE sessions (
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

-- Session lines table (tracks individual drink movements per session)
CREATE TABLE session_lines (
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

-- Expenses table
CREATE TABLE expenses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  date DATE NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('Approvisionnement', 'Salaires', 'Loyer', 'Électricité/Eau', 'Réparations', 'Transport', 'Autre')),
  amount INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Settings table (single row)
CREATE TABLE settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  bar_name TEXT NOT NULL DEFAULT 'Mon Bar',
  currency TEXT NOT NULL DEFAULT 'FCFA',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default settings
INSERT INTO settings (bar_name, currency) VALUES ('Mon Bar', 'FCFA');

-- Create indexes for better query performance
CREATE INDEX idx_drinks_category ON drinks(category);
CREATE INDEX idx_drinks_active ON drinks(active);
CREATE INDEX idx_sessions_date ON sessions(date);
CREATE INDEX idx_session_lines_session_id ON session_lines(session_id);
CREATE INDEX idx_session_lines_drink_id ON session_lines(drink_id);
CREATE INDEX idx_expenses_date ON expenses(date);
CREATE INDEX idx_expenses_category ON expenses(category);

-- Enable Row Level Security (RLS)
ALTER TABLE drinks ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE session_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

-- Create policies (allow all operations without authentication since you don't want auth)
CREATE POLICY "Allow all operations on drinks" ON drinks FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations on sessions" ON sessions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations on session_lines" ON session_lines FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations on expenses" ON expenses FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations on settings" ON settings FOR ALL USING (true) WITH CHECK (true);

-- Insert seed data (39 drinks from the original spec)
INSERT INTO drinks (name, category, price, cost, stock, min_stock, supplier, notes) VALUES
  ('SUPERMONT', 'Eau', 500, 300, 24, 6, '', ''),
  ('REACTOR', 'Soda', 500, 280, 18, 6, '', ''),
  ('JUS BRASSERIE CASSABLE', 'Jus', 500, 280, 12, 6, 'Brasseries du Cameroun', ''),
  ('TOP BRASSERIE', 'Soda', 350, 200, 30, 8, 'Brasseries du Cameroun', ''),
  ('COCA COLA', 'Soda', 500, 300, 36, 12, '', ''),
  ('PAMBLEMOUSE UCB 1L', 'Jus', 700, 400, 9, 6, '', '1 litre'),
  ('ORANGINA / VIMTO', 'Soda', 600, 350, 15, 6, '', ''),
  ('DJINO', 'Soda', 800, 450, 20, 6, '', ''),
  ('VIMTO', 'Soda', 700, 400, 8, 6, '', ''),
  ('JUS UCB', 'Jus', 800, 450, 4, 6, 'UCB', ''),
  ('KADJI', 'Bière', 500, 280, 48, 12, 'Kadji Beer', ''),
  ('ISENBECK', 'Bière', 750, 420, 36, 12, '', ''),
  ('"33" EXPORT', 'Bière', 900, 500, 60, 12, 'Brasseries du Cameroun', ''),
  ('MUTZIG', 'Bière', 750, 420, 48, 12, 'Brasseries du Cameroun', ''),
  ('DOPPEL', 'Bière', 750, 420, 24, 8, '', ''),
  ('CASTEL', 'Bière', 750, 400, 5, 8, 'Castel', ''),
  ('BEAUFORT LIGHT', 'Bière', 750, 420, 30, 8, '', ''),
  ('BEAUFORT ORDINAIRE', 'Bière', 800, 450, 24, 8, '', ''),
  ('VODY', 'Eau', 750, 400, 18, 6, '', ''),
  ('BOOSTER COLA', 'Soda', 750, 400, 10, 6, '', ''),
  ('BOOSTER DJIN', 'Soda', 500, 280, 14, 6, '', ''),
  ('RACINE', 'Soda', 600, 320, 6, 6, '', ''),
  ('MANYAN', 'Soda', 600, 320, 20, 6, '', ''),
  ('CHILL', 'Soda', 500, 280, 12, 6, '', ''),
  ('SODA WATER', 'Eau', 400, 220, 10, 6, '', ''),
  ('TONIC', 'Soda', 800, 450, 8, 6, '', ''),
  ('PM GUINNESS', 'Bière', 1400, 800, 24, 6, 'Guinness Cameroun', 'Pinte'),
  ('GM GUINNESS', 'Bière', 850, 480, 36, 8, 'Guinness Cameroun', ''),
  ('SMOOTH GUINNESS', 'Bière', 800, 450, 18, 6, 'Guinness Cameroun', ''),
  ('ORIJIN', 'Bière', 800, 450, 12, 6, '', ''),
  ('HARP', 'Bière', 1000, 560, 20, 6, '', ''),
  ('ICE', 'Autre', 650, 350, 7, 4, '', ''),
  ('MALTA', 'Soda', 1500, 850, 15, 4, '', '1 litre'),
  ('EL VINO', 'Vin', 1000, 600, 5, 3, '', ''),
  ('MALTA VAMPOUR', 'Soda', 3500, 2000, 4, 2, '', ''),
  ('TOUR DE CANTELOUR', 'Autre', 3500, 2000, 2, 1, '', ''),
  ('CONSIGNA', 'Autre', 300, 0, 50, 10, '', 'Consigne bouteille'),
  ('MADIBA', 'Bière', 1000, 580, 16, 6, '', ''),
  ('BAVARIA', 'Bière', 800, 450, 22, 6, '', '');
