# 🚀 BarTrack Setup Guide

Complete step-by-step guide to get BarTrack running on your phone.

## ⚠️ FIRST: Secure Your Supabase Keys

**CRITICAL**: The Supabase keys you shared are now exposed. You MUST:

1. Go to [supabase.com](https://supabase.com)
2. Log into your project
3. Navigate to **Settings → API**
4. Click **"Reset Database Password"** and **"Generate New Keys"**
5. Save the new keys securely

## 📋 Prerequisites Checklist

Before starting, make sure you have:

- [ ] Computer with Node.js 18+ installed ([nodejs.org](https://nodejs.org))
- [ ] Smartphone (iOS or Android)
- [ ] Supabase account ([supabase.com](https://supabase.com))
- [ ] Text editor (VS Code recommended)
- [ ] Terminal/Command Prompt access

## Step 1: Set Up Supabase (10 minutes)

### 1.1 Create a Supabase Project

1. Go to [supabase.com](https://supabase.com) and sign up/login
2. Click **"New Project"**
3. Enter:
   - **Name**: BarTrack
   - **Database Password**: Choose a strong password (save it!)
   - **Region**: Choose closest to Cameroon (Europe West recommended)
4. Click **"Create new project"**
5. Wait 2-3 minutes for project to initialize

### 1.2 Run the Database Migration

1. In your Supabase project, click **SQL Editor** (left sidebar)
2. Click **"New query"**
3. Open the file `supabase-schema.sql` from this project
4. Copy ALL contents and paste into the SQL Editor
5. Click **"Run"** (or press Ctrl/Cmd + Enter)
6. You should see "Success. No rows returned" - this is correct!

### 1.3 Verify the Setup

1. Click **"Table Editor"** (left sidebar)
2. You should see 5 tables:
   - `drinks` (should have 39 rows - the seed data)
   - `sessions`
   - `session_lines`
   - `expenses`
   - `settings` (should have 1 row)

### 1.4 Get Your API Keys

1. Click **Settings → API** (left sidebar)
2. Copy the following (you'll need these soon):
   - **Project URL** (looks like: `https://xxxxx.supabase.co`)
   - **anon public** key (long string starting with `eyJ...`)

## Step 2: Install Development Tools (5 minutes)

### 2.1 Install Node.js

- Download from [nodejs.org](https://nodejs.org) (LTS version)
- Run installer with default options
- Verify: Open terminal and run `node --version` (should show v18 or higher)

### 2.2 Install Expo CLI

Open terminal and run:
```bash
npm install -g expo-cli
```

Verify:
```bash
expo --version
```

### 2.3 Install Expo Go on Your Phone

- **iOS**: Download from App Store
- **Android**: Download from Google Play Store

Search for "Expo Go" - it's the official app from Expo.

## Step 3: Configure the Project (5 minutes)

### 3.1 Navigate to Project

Open terminal and navigate to the project folder:
```bash
cd "/Users/frankwember/Documents/Inventory system"
```

### 3.2 Install Dependencies

Run:
```bash
npm install
```

This will take 2-3 minutes. You'll see a progress bar.

### 3.3 Create Environment File

1. Duplicate `.env.example` and rename it to `.env`
   - On Mac/Linux: `cp .env.example .env`
   - On Windows: `copy .env.example .env`

2. Open `.env` in a text editor

3. Replace with your Supabase credentials:
   ```
   EXPO_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
   EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...your-actual-key
   ```

4. Save the file

**Example .env file**:
```
EXPO_PUBLIC_SUPABASE_URL=https://abcdefghijklmnop.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFiY2RlZmdoaWprbG1ub3AiLCJyb2xlIjoiYW5vbiIsImlhdCI6MTY5MDAwMDAwMCwiZXhwIjoyMDA1NTc2MDAwfQ.example-signature-here
```

## Step 4: Run the App (2 minutes)

### 4.1 Start Expo

In terminal (in the project folder), run:
```bash
npm start
```

You'll see:
- Expo DevTools opening in your browser
- A QR code in the terminal
- Console output showing "Metro waiting on..."

### 4.2 Open on Your Phone

**For iOS**:
1. Open Camera app
2. Point at QR code in terminal
3. Tap the notification that appears
4. Expo Go will open automatically

**For Android**:
1. Open Expo Go app
2. Tap "Scan QR code"
3. Point at QR code in terminal

### 4.3 Wait for Build

- First time: 1-2 minutes to build
- You'll see "Opening on..." then the app will load
- Subsequent launches are much faster

## Step 5: Verify Everything Works

### 5.1 Check Dashboard

You should see:
- Dashboard screen with KPIs
- 39 drinks in inventory
- Bottom navigation bar

### 5.2 Test Navigation

Tap each tab at the bottom:
- **Dashboard**: Shows KPIs
- **Inventory**: Lists all 39 drinks
- **Session**: Daily sales tracker
- **Trends**: Analytics
- **Finances**: P&L overview

### 5.3 Test Functionality

1. **View Inventory**:
   - Tap "Inventory" tab
   - Scroll through drinks
   - Tap "COCA COLA" to edit

2. **Add a Session**:
   - Tap "Session" tab
   - Use + buttons to add sales
   - Watch revenue update in real-time

3. **Close Session** (optional for now):
   - Scroll to bottom of Session screen
   - Tap "Clôturer la session"
   - Confirm
   - Stock levels will update

## 🎉 Success!

Your BarTrack app is now running! Here's what to do next:

- **Add your own data**: Start a new session and track real sales
- **Customize drinks**: Edit stock levels, prices
- **Monitor trends**: Check analytics after a few days

## 🆘 Troubleshooting

### Problem: "Unable to connect to Supabase"

**Solution**:
1. Check `.env` file has correct URL and key
2. Verify Supabase project is running (green status on supabase.com)
3. Make sure you saved `.env` file
4. Restart Expo: Press Ctrl+C in terminal, then `npm start` again

### Problem: "Module not found" errors

**Solution**:
```bash
rm -rf node_modules
npm install
npm start --clear
```

### Problem: "Network response timed out"

**Solution**:
1. Check your internet connection
2. Make sure phone and computer are on same WiFi network
3. Try tunnel mode: `expo start --tunnel`

### Problem: QR code not scanning

**Solution**:
- iOS: Make sure Camera has permission
- Android: Use Expo Go's built-in scanner
- Alternative: Click "Send link with email" in Expo DevTools

### Problem: App crashes on startup

**Solution**:
1. Check terminal for error messages
2. Verify all files were created correctly
3. Ensure `.env` has valid Supabase credentials
4. Try: `npm start --clear`

## 📱 Daily Usage

### Starting the App

1. Open terminal
2. Navigate to project: `cd "/Users/frankwember/Documents/Inventory system"`
3. Run: `npm start`
4. Scan QR code with phone

### Stopping the App

- Press `Ctrl + C` in terminal
- Close Expo Go on phone

## 🔄 Updating the App

When you make code changes:

1. Save the file in your editor
2. App will automatically reload on your phone
3. If it doesn't, shake phone and tap "Reload"

## 📊 Data Management

### Backup Data

Your data is stored in Supabase. To backup:
1. Go to Supabase Dashboard
2. Click "Table Editor"
3. For each table, click "..." → "Export as CSV"

### Reset Data

To start fresh:
1. Go to Supabase SQL Editor
2. Re-run `supabase-schema.sql`
3. This will reset to original 39 drinks

## 🚀 Next Steps

- **Production Build**: See README.md for creating APK/IPA
- **Add Authentication**: Implement Supabase Auth for security
- **Custom Branding**: Update app.json with your bar name
- **Add More Features**: Extend the code as needed

## 📞 Need Help?

- Check README.md for more details
- Review error messages in terminal
- Verify Supabase setup is correct
- Ensure all dependencies installed properly

---

**You're all set!** 🎊

Your BarTrack app is ready to use. Start tracking your bar inventory today!
