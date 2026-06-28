# BarTrack Database Setup Guide

Follow these steps to initialize your Supabase database with drinks, stock, and historical data.

## Step 1: Open Supabase SQL Editor

1. Go to https://supabase.com/dashboard
2. Select your project: `fhcmnewffyjxnysldgcg`
3. Click **SQL Editor** in the left sidebar
4. Click **New query**

## Step 2: Run the Schema (First Time Only)

1. Open the file: `supabase-schema.sql`
2. Copy ALL the contents
3. Paste into the SQL Editor
4. Click **Run** (or press Cmd/Ctrl + Enter)

This creates:
- 5 tables (drinks, sessions, session_lines, expenses, settings)
- 39 drinks with basic info
- Row Level Security policies (public access)
- Indexes for performance

## Step 3: Add Stock and Historical Data

1. Open the file: `supabase-seed-complete.sql`
2. Copy ALL the contents
3. Paste into a new SQL Editor query
4. Click **Run**

This adds:
- **Realistic stock levels** for all 39 drinks
  - Beers with cassiers (multiples of 12): KADJI has 144 (12 cassiers), 33 Export has 180 (15 cassiers)
  - Some drinks with low stock alerts: CASTEL has only 18 (1.5 cassiers) - below minimum!
- **7 completed sessions** with full transaction history
  - Sessions from last 7 days with purchases and sales
  - Friday & Saturday have higher sales volumes
  - Total revenue from last week: ~2,400,000 FCFA
- **7 expenses** including:
  - Approvisionnement (restocking)
  - Salaires (wages)
  - Électricité/Eau
  - Réparations
  - Transport

## Step 4: Verify Your Data

1. Go to **Table Editor** in Supabase
2. Check these tables:

### Drinks Table
- Should have **39 rows**
- Look for beers with stock in multiples of 12 (cassiers)
- CASTEL should show low stock alert (18 units, minimum is 24)

### Sessions Table
- Should have **7 rows** (last 7 days)
- Each with total_revenue, total_cost, total_profit
- All marked as `closed: true`

### Session Lines Table
- Should have **multiple rows** per session
- Shows opening_stock, purchased, sold, closing_stock for each drink

### Expenses Table
- Should have **7 rows**
- Various expense categories

## What You'll See in the App

### Dashboard
- **Today's Revenue**: Shows current day (will be 0 until you create today's session)
- **Last 7 Days Profit**: ~1,000,000 FCFA from the seeded sessions
- **Units Sold (7 days)**: ~1,000+ units
- **Stock Alerts**: 2 drinks (CASTEL and RACINE are below minimum)
- **Top 5 Drinks**: KADJI, 33 Export, MUTZIG, COCA COLA, PM GUINNESS

### Inventory
- **Total: 39 drinks**
- Filter by category: Bière (15), Soda (13), Jus (3), Eau (3), Vin (1), Autre (4)
- Beers show cassiers: "12 cassiers" or "12 cassiers + 6 unités"
- Red alerts for CASTEL and RACINE

### Session (Hero Screen)
- Ready to start today's session
- All drinks show opening stock with cassiers for beers
- Stepper controls to add purchases (+) and sales (-)
- Real-time calculation of closing stock and revenue

### Trends
- 7 days of historical data
- Revenue trend chart
- Top sellers analysis

### Finances
- Last 7 days: ~2,400,000 FCFA revenue
- ~548,500 FCFA expenses
- Net profit calculations

## Next Steps

1. Open your Expo app by scanning the QR code
2. Navigate through all screens to see the data
3. Try creating a new session today:
   - Go to **Session** tab
   - Add purchases (e.g., +48 for KADJI = +4 cassiers)
   - Add sales (e.g., -24 for KADJI = -2 cassiers)
   - Close the session to see it in history

## Cassier Examples in the Data

- **KADJI**: 144 units = 12 cassiers (full racks)
- **33 Export**: 180 units = 15 cassiers
- **MUTZIG**: 120 units = 10 cassiers
- **CASTEL**: 18 units = 1 cassier + 6 unités (LOW STOCK!)
- **SMOOTH GUINNESS**: 36 units = 3 cassiers

Non-beer drinks show regular unit counts.

---

Your database is now fully set up with realistic data! 🍺
