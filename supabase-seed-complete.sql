-- BarTrack Complete Seed Data with Stock and Historical Sessions
-- This script adds realistic stock levels and completed sessions for testing
-- Run this AFTER running supabase-schema.sql

-- First, let's update the drinks with realistic stock levels
-- Beers will have stock in multiples of 12 (cassiers) where possible
UPDATE drinks SET stock = 144, min_stock = 36 WHERE name = 'KADJI';  -- 12 cassiers
UPDATE drinks SET stock = 96, min_stock = 24 WHERE name = 'ISENBECK';  -- 8 cassiers
UPDATE drinks SET stock = 180, min_stock = 48 WHERE name = '"33" EXPORT';  -- 15 cassiers
UPDATE drinks SET stock = 120, min_stock = 36 WHERE name = 'MUTZIG';  -- 10 cassiers
UPDATE drinks SET stock = 60, min_stock = 24 WHERE name = 'DOPPEL';  -- 5 cassiers
UPDATE drinks SET stock = 18, min_stock = 24 WHERE name = 'CASTEL';  -- 1.5 cassiers (low stock alert!)
UPDATE drinks SET stock = 84, min_stock = 24 WHERE name = 'BEAUFORT LIGHT';  -- 7 cassiers
UPDATE drinks SET stock = 72, min_stock = 24 WHERE name = 'BEAUFORT ORDINAIRE';  -- 6 cassiers
UPDATE drinks SET stock = 48, min_stock = 12 WHERE name = 'PM GUINNESS';  -- 4 cassiers
UPDATE drinks SET stock = 96, min_stock = 24 WHERE name = 'GM GUINNESS';  -- 8 cassiers
UPDATE drinks SET stock = 36, min_stock = 12 WHERE name = 'SMOOTH GUINNESS';  -- 3 cassiers
UPDATE drinks SET stock = 24, min_stock = 12 WHERE name = 'ORIJIN';  -- 2 cassiers
UPDATE drinks SET stock = 48, min_stock = 12 WHERE name = 'HARP';  -- 4 cassiers
UPDATE drinks SET stock = 60, min_stock = 12 WHERE name = 'MADIBA';  -- 5 cassiers
UPDATE drinks SET stock = 72, min_stock = 12 WHERE name = 'BAVARIA';  -- 6 cassiers

-- Update sodas and other drinks with realistic stock
UPDATE drinks SET stock = 48, min_stock = 12 WHERE name = 'SUPERMONT';
UPDATE drinks SET stock = 36, min_stock = 12 WHERE name = 'REACTOR';
UPDATE drinks SET stock = 24, min_stock = 12 WHERE name = 'JUS BRASSERIE CASSABLE';
UPDATE drinks SET stock = 60, min_stock = 18 WHERE name = 'TOP BRASSERIE';
UPDATE drinks SET stock = 72, min_stock = 24 WHERE name = 'COCA COLA';
UPDATE drinks SET stock = 18, min_stock = 6 WHERE name = 'PAMBLEMOUSE UCB 1L';
UPDATE drinks SET stock = 30, min_stock = 12 WHERE name = 'ORANGINA / VIMTO';
UPDATE drinks SET stock = 40, min_stock = 12 WHERE name = 'DJINO';
UPDATE drinks SET stock = 16, min_stock = 12 WHERE name = 'VIMTO';
UPDATE drinks SET stock = 10, min_stock = 6 WHERE name = 'JUS UCB';
UPDATE drinks SET stock = 36, min_stock = 12 WHERE name = 'VODY';
UPDATE drinks SET stock = 20, min_stock = 12 WHERE name = 'BOOSTER COLA';
UPDATE drinks SET stock = 28, min_stock = 12 WHERE name = 'BOOSTER DJIN';
UPDATE drinks SET stock = 8, min_stock = 6 WHERE name = 'RACINE';  -- Low stock!
UPDATE drinks SET stock = 40, min_stock = 12 WHERE name = 'MANYAN';
UPDATE drinks SET stock = 24, min_stock = 12 WHERE name = 'CHILL';
UPDATE drinks SET stock = 20, min_stock = 12 WHERE name = 'SODA WATER';
UPDATE drinks SET stock = 16, min_stock = 12 WHERE name = 'TONIC';
UPDATE drinks SET stock = 14, min_stock = 6 WHERE name = 'ICE';
UPDATE drinks SET stock = 30, min_stock = 8 WHERE name = 'MALTA';
UPDATE drinks SET stock = 8, min_stock = 4 WHERE name = 'EL VINO';
UPDATE drinks SET stock = 6, min_stock = 3 WHERE name = 'MALTA VAMPOUR';
UPDATE drinks SET stock = 3, min_stock = 2 WHERE name = 'TOUR DE CANTELOUR';
UPDATE drinks SET stock = 100, min_stock = 20 WHERE name = 'CONSIGNA';

-- Now let's create some historical sessions (last 7 days)
-- We'll insert these with specific dates going backwards

-- Session 7 days ago
DO $$
DECLARE
  session_id UUID;
  drink_record RECORD;
BEGIN
  -- Create session
  INSERT INTO sessions (date, label, total_purchase, total_revenue, total_cost, total_profit, closed)
  VALUES (
    CURRENT_DATE - INTERVAL '7 days',
    'Session du ' || TO_CHAR(CURRENT_DATE - INTERVAL '7 days', 'DD/MM/YYYY'),
    45000,
    285000,
    120000,
    165000,
    true
  )
  RETURNING id INTO session_id;

  -- Add session lines for popular drinks
  INSERT INTO session_lines (session_id, drink_id, drink_name, opening_stock, purchased, sold, closing_stock, revenue, cost)
  SELECT
    session_id,
    id,
    name,
    CASE name
      WHEN 'KADJI' THEN 120
      WHEN '"33" EXPORT' THEN 140
      WHEN 'MUTZIG' THEN 100
      WHEN 'COCA COLA' THEN 50
      WHEN 'CASTEL' THEN 30
      WHEN 'PM GUINNESS' THEN 30
      ELSE stock
    END,
    CASE name
      WHEN 'KADJI' THEN 48
      WHEN '"33" EXPORT' THEN 60
      WHEN 'MUTZIG' THEN 36
      WHEN 'COCA COLA' THEN 36
      ELSE 0
    END,
    CASE name
      WHEN 'KADJI' THEN 24
      WHEN '"33" EXPORT' THEN 20
      WHEN 'MUTZIG' THEN 16
      WHEN 'COCA COLA' THEN 14
      WHEN 'CASTEL' THEN 12
      WHEN 'PM GUINNESS' THEN 6
      ELSE 0
    END,
    CASE name
      WHEN 'KADJI' THEN 144
      WHEN '"33" EXPORT' THEN 180
      WHEN 'MUTZIG' THEN 120
      WHEN 'COCA COLA' THEN 72
      WHEN 'CASTEL' THEN 18
      WHEN 'PM GUINNESS' THEN 24
      ELSE stock
    END,
    CASE name
      WHEN 'KADJI' THEN 24 * 500
      WHEN '"33" EXPORT' THEN 20 * 900
      WHEN 'MUTZIG' THEN 16 * 750
      WHEN 'COCA COLA' THEN 14 * 500
      WHEN 'CASTEL' THEN 12 * 750
      WHEN 'PM GUINNESS' THEN 6 * 1400
      ELSE 0
    END,
    CASE name
      WHEN 'KADJI' THEN 48 * 280
      WHEN '"33" EXPORT' THEN 60 * 500
      WHEN 'MUTZIG' THEN 36 * 420
      WHEN 'COCA COLA' THEN 36 * 300
      ELSE 0
    END
  FROM drinks
  WHERE name IN ('KADJI', '"33" EXPORT', 'MUTZIG', 'COCA COLA', 'CASTEL', 'PM GUINNESS');
END $$;

-- Session 6 days ago
DO $$
DECLARE
  session_id UUID;
BEGIN
  INSERT INTO sessions (date, label, total_purchase, total_revenue, total_cost, total_profit, closed)
  VALUES (
    CURRENT_DATE - INTERVAL '6 days',
    'Session du ' || TO_CHAR(CURRENT_DATE - INTERVAL '6 days', 'DD/MM/YYYY'),
    38000,
    310000,
    145000,
    165000,
    true
  )
  RETURNING id INTO session_id;

  INSERT INTO session_lines (session_id, drink_id, drink_name, opening_stock, purchased, sold, closing_stock, revenue, cost)
  SELECT
    session_id,
    id,
    name,
    stock,
    CASE name
      WHEN '"33" EXPORT' THEN 36
      WHEN 'MUTZIG' THEN 24
      WHEN 'GUINNESS' THEN 12
      ELSE 0
    END,
    CASE name
      WHEN 'KADJI' THEN 28
      WHEN '"33" EXPORT' THEN 25
      WHEN 'MUTZIG' THEN 18
      WHEN 'COCA COLA' THEN 16
      WHEN 'GM GUINNESS' THEN 8
      ELSE 0
    END,
    stock,
    CASE name
      WHEN 'KADJI' THEN 28 * 500
      WHEN '"33" EXPORT' THEN 25 * 900
      WHEN 'MUTZIG' THEN 18 * 750
      WHEN 'COCA COLA' THEN 16 * 500
      WHEN 'GM GUINNESS' THEN 8 * 850
      ELSE 0
    END,
    CASE name
      WHEN '"33" EXPORT' THEN 36 * 500
      WHEN 'MUTZIG' THEN 24 * 420
      ELSE 0
    END
  FROM drinks
  WHERE name IN ('KADJI', '"33" EXPORT', 'MUTZIG', 'COCA COLA', 'GM GUINNESS');
END $$;

-- Session 5 days ago
DO $$
DECLARE
  session_id UUID;
BEGIN
  INSERT INTO sessions (date, label, total_purchase, total_revenue, total_cost, total_profit, closed)
  VALUES (
    CURRENT_DATE - INTERVAL '5 days',
    'Session du ' || TO_CHAR(CURRENT_DATE - INTERVAL '5 days', 'DD/MM/YYYY'),
    42000,
    295000,
    135000,
    160000,
    true
  )
  RETURNING id INTO session_id;

  INSERT INTO session_lines (session_id, drink_id, drink_name, opening_stock, purchased, sold, closing_stock, revenue, cost)
  SELECT
    session_id,
    id,
    name,
    stock,
    CASE name
      WHEN 'KADJI' THEN 36
      WHEN 'MUTZIG' THEN 36
      ELSE 0
    END,
    CASE name
      WHEN 'KADJI' THEN 30
      WHEN '"33" EXPORT' THEN 22
      WHEN 'MUTZIG' THEN 20
      WHEN 'COCA COLA' THEN 18
      WHEN 'BEAUFORT LIGHT' THEN 7
      ELSE 0
    END,
    stock,
    CASE name
      WHEN 'KADJI' THEN 30 * 500
      WHEN '"33" EXPORT' THEN 22 * 900
      WHEN 'MUTZIG' THEN 20 * 750
      WHEN 'COCA COLA' THEN 18 * 500
      WHEN 'BEAUFORT LIGHT' THEN 7 * 750
      ELSE 0
    END,
    CASE name
      WHEN 'KADJI' THEN 36 * 280
      WHEN 'MUTZIG' THEN 36 * 420
      ELSE 0
    END
  FROM drinks
  WHERE name IN ('KADJI', '"33" EXPORT', 'MUTZIG', 'COCA COLA', 'BEAUFORT LIGHT');
END $$;

-- Session 4 days ago (Friday - busy day)
DO $$
DECLARE
  session_id UUID;
BEGIN
  INSERT INTO sessions (date, label, total_purchase, total_revenue, total_cost, total_profit, closed)
  VALUES (
    CURRENT_DATE - INTERVAL '4 days',
    'Session du ' || TO_CHAR(CURRENT_DATE - INTERVAL '4 days', 'DD/MM/YYYY'),
    55000,
    420000,
    180000,
    240000,
    true
  )
  RETURNING id INTO session_id;

  INSERT INTO session_lines (session_id, drink_id, drink_name, opening_stock, purchased, sold, closing_stock, revenue, cost)
  SELECT
    session_id,
    id,
    name,
    stock,
    CASE name
      WHEN 'KADJI' THEN 48
      WHEN '"33" EXPORT' THEN 48
      WHEN 'MUTZIG' THEN 48
      WHEN 'COCA COLA' THEN 24
      ELSE 0
    END,
    CASE name
      WHEN 'KADJI' THEN 45
      WHEN '"33" EXPORT' THEN 38
      WHEN 'MUTZIG' THEN 32
      WHEN 'COCA COLA' THEN 28
      WHEN 'PM GUINNESS' THEN 10
      WHEN 'CASTEL' THEN 14
      ELSE 0
    END,
    stock,
    CASE name
      WHEN 'KADJI' THEN 45 * 500
      WHEN '"33" EXPORT' THEN 38 * 900
      WHEN 'MUTZIG' THEN 32 * 750
      WHEN 'COCA COLA' THEN 28 * 500
      WHEN 'PM GUINNESS' THEN 10 * 1400
      WHEN 'CASTEL' THEN 14 * 750
      ELSE 0
    END,
    CASE name
      WHEN 'KADJI' THEN 48 * 280
      WHEN '"33" EXPORT' THEN 48 * 500
      WHEN 'MUTZIG' THEN 48 * 420
      WHEN 'COCA COLA' THEN 24 * 300
      ELSE 0
    END
  FROM drinks
  WHERE name IN ('KADJI', '"33" EXPORT', 'MUTZIG', 'COCA COLA', 'PM GUINNESS', 'CASTEL');
END $$;

-- Session 3 days ago (Saturday - very busy)
DO $$
DECLARE
  session_id UUID;
BEGIN
  INSERT INTO sessions (date, label, total_purchase, total_revenue, total_cost, total_profit, closed)
  VALUES (
    CURRENT_DATE - INTERVAL '3 days',
    'Session du ' || TO_CHAR(CURRENT_DATE - INTERVAL '3 days', 'DD/MM/YYYY'),
    68000,
    485000,
    210000,
    275000,
    true
  )
  RETURNING id INTO session_id;

  INSERT INTO session_lines (session_id, drink_id, drink_name, opening_stock, purchased, sold, closing_stock, revenue, cost)
  SELECT
    session_id,
    id,
    name,
    stock,
    CASE name
      WHEN 'KADJI' THEN 60
      WHEN '"33" EXPORT' THEN 60
      WHEN 'MUTZIG' THEN 48
      WHEN 'COCA COLA' THEN 36
      WHEN 'PM GUINNESS' THEN 12
      ELSE 0
    END,
    CASE name
      WHEN 'KADJI' THEN 52
      WHEN '"33" EXPORT' THEN 45
      WHEN 'MUTZIG' THEN 38
      WHEN 'COCA COLA' THEN 32
      WHEN 'PM GUINNESS' THEN 12
      WHEN 'BEAUFORT ORDINAIRE' THEN 9
      WHEN 'GM GUINNESS' THEN 10
      ELSE 0
    END,
    stock,
    CASE name
      WHEN 'KADJI' THEN 52 * 500
      WHEN '"33" EXPORT' THEN 45 * 900
      WHEN 'MUTZIG' THEN 38 * 750
      WHEN 'COCA COLA' THEN 32 * 500
      WHEN 'PM GUINNESS' THEN 12 * 1400
      WHEN 'BEAUFORT ORDINAIRE' THEN 9 * 800
      WHEN 'GM GUINNESS' THEN 10 * 850
      ELSE 0
    END,
    CASE name
      WHEN 'KADJI' THEN 60 * 280
      WHEN '"33" EXPORT' THEN 60 * 500
      WHEN 'MUTZIG' THEN 48 * 420
      WHEN 'COCA COLA' THEN 36 * 300
      WHEN 'PM GUINNESS' THEN 12 * 800
      ELSE 0
    END
  FROM drinks
  WHERE name IN ('KADJI', '"33" EXPORT', 'MUTZIG', 'COCA COLA', 'PM GUINNESS', 'BEAUFORT ORDINAIRE', 'GM GUINNESS');
END $$;

-- Session 2 days ago
DO $$
DECLARE
  session_id UUID;
BEGIN
  INSERT INTO sessions (date, label, total_purchase, total_revenue, total_cost, total_profit, closed)
  VALUES (
    CURRENT_DATE - INTERVAL '2 days',
    'Session du ' || TO_CHAR(CURRENT_DATE - INTERVAL '2 days', 'DD/MM/YYYY'),
    35000,
    265000,
    125000,
    140000,
    true
  )
  RETURNING id INTO session_id;

  INSERT INTO session_lines (session_id, drink_id, drink_name, opening_stock, purchased, sold, closing_stock, revenue, cost)
  SELECT
    session_id,
    id,
    name,
    stock,
    CASE name
      WHEN 'MUTZIG' THEN 24
      WHEN '"33" EXPORT' THEN 24
      ELSE 0
    END,
    CASE name
      WHEN 'KADJI' THEN 26
      WHEN '"33" EXPORT' THEN 20
      WHEN 'MUTZIG' THEN 18
      WHEN 'COCA COLA' THEN 15
      WHEN 'ISENBECK' THEN 8
      ELSE 0
    END,
    stock,
    CASE name
      WHEN 'KADJI' THEN 26 * 500
      WHEN '"33" EXPORT' THEN 20 * 900
      WHEN 'MUTZIG' THEN 18 * 750
      WHEN 'COCA COLA' THEN 15 * 500
      WHEN 'ISENBECK' THEN 8 * 750
      ELSE 0
    END,
    CASE name
      WHEN 'MUTZIG' THEN 24 * 420
      WHEN '"33" EXPORT' THEN 24 * 500
      ELSE 0
    END
  FROM drinks
  WHERE name IN ('KADJI', '"33" EXPORT', 'MUTZIG', 'COCA COLA', 'ISENBECK');
END $$;

-- Session yesterday
DO $$
DECLARE
  session_id UUID;
BEGIN
  INSERT INTO sessions (date, label, total_purchase, total_revenue, total_cost, total_profit, closed)
  VALUES (
    CURRENT_DATE - INTERVAL '1 day',
    'Session du ' || TO_CHAR(CURRENT_DATE - INTERVAL '1 day', 'DD/MM/YYYY'),
    48000,
    340000,
    155000,
    185000,
    true
  )
  RETURNING id INTO session_id;

  INSERT INTO session_lines (session_id, drink_id, drink_name, opening_stock, purchased, sold, closing_stock, revenue, cost)
  SELECT
    session_id,
    id,
    name,
    stock,
    CASE name
      WHEN 'KADJI' THEN 48
      WHEN '"33" EXPORT' THEN 36
      WHEN 'MUTZIG' THEN 36
      WHEN 'COCA COLA' THEN 24
      ELSE 0
    END,
    CASE name
      WHEN 'KADJI' THEN 35
      WHEN '"33" EXPORT' THEN 28
      WHEN 'MUTZIG' THEN 24
      WHEN 'COCA COLA' THEN 20
      WHEN 'BEAUFORT LIGHT' THEN 6
      WHEN 'BAVARIA' THEN 6
      ELSE 0
    END,
    stock,
    CASE name
      WHEN 'KADJI' THEN 35 * 500
      WHEN '"33" EXPORT' THEN 28 * 900
      WHEN 'MUTZIG' THEN 24 * 750
      WHEN 'COCA COLA' THEN 20 * 500
      WHEN 'BEAUFORT LIGHT' THEN 6 * 750
      WHEN 'BAVARIA' THEN 6 * 800
      ELSE 0
    END,
    CASE name
      WHEN 'KADJI' THEN 48 * 280
      WHEN '"33" EXPORT' THEN 36 * 500
      WHEN 'MUTZIG' THEN 36 * 420
      WHEN 'COCA COLA' THEN 24 * 300
      ELSE 0
    END
  FROM drinks
  WHERE name IN ('KADJI', '"33" EXPORT', 'MUTZIG', 'COCA COLA', 'BEAUFORT LIGHT', 'BAVARIA');
END $$;

-- Add some expenses for the last week
INSERT INTO expenses (date, description, category, amount) VALUES
  (CURRENT_DATE - INTERVAL '7 days', 'Approvisionnement Brasseries', 'Approvisionnement', 250000),
  (CURRENT_DATE - INTERVAL '6 days', 'Salaire gardien', 'Salaires', 45000),
  (CURRENT_DATE - INTERVAL '5 days', 'Électricité Eneo', 'Électricité/Eau', 35000),
  (CURRENT_DATE - INTERVAL '4 days', 'Réparation frigo', 'Réparations', 18000),
  (CURRENT_DATE - INTERVAL '3 days', 'Transport marchandises', 'Transport', 12000),
  (CURRENT_DATE - INTERVAL '2 days', 'Fournitures bar', 'Autre', 8500),
  (CURRENT_DATE - INTERVAL '1 day', 'Approvisionnement UCB', 'Approvisionnement', 180000);
