-- Migration: add rack_size to drinks
-- The app (types, SessionScreen, AddDrink, EditDrink) relies on drinks.rack_size
-- but earlier schema versions never created the column. Run this once on any
-- existing BarTrack database in the Supabase SQL editor.

ALTER TABLE drinks
  ADD COLUMN IF NOT EXISTS rack_size INTEGER NOT NULL DEFAULT 12;

-- Non-beer items are usually counted by the unit, not by cassier.
UPDATE drinks SET rack_size = 1 WHERE category <> 'Bière';
