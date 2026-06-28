# Deployment Guide

This guide will help you deploy BarTrack to GitHub and Vercel.

## Prerequisites

- GitHub account
- Vercel account (free tier works great)
- Git configured on your machine

## Step 1: Create GitHub Repository

1. Go to [GitHub](https://github.com) and sign in
2. Click the "+" icon in the top right and select "New repository"
3. Fill in the repository details:
   - Repository name: `bartrack` (or your preferred name)
   - Description: "Professional inventory management system for bars and restaurants"
   - Choose **Private** or **Public** based on your preference
   - **DO NOT** initialize with README, .gitignore, or license (we already have these)
4. Click "Create repository"

## Step 2: Push Code to GitHub

After creating the repository, GitHub will show you commands. Run these in your terminal:

```bash
cd "/Users/frankwember/Documents/Inventory system"

# Add the remote repository (replace YOUR_USERNAME with your GitHub username)
git remote add origin https://github.com/YOUR_USERNAME/bartrack.git

# Push the code
git branch -M main
git push -u origin main
```

**Alternative with SSH:**
```bash
git remote add origin git@github.com:YOUR_USERNAME/bartrack.git
git branch -M main
git push -u origin main
```

## Step 3: Deploy to Vercel

### Option A: Vercel Dashboard (Recommended)

1. Go to [Vercel](https://vercel.com) and sign in
2. Click "Add New" → "Project"
3. Import your GitHub repository (`YOUR_USERNAME/bartrack`)
4. Vercel will auto-detect the settings, but verify:
   - **Build Command**: `npx expo export --platform web`
   - **Output Directory**: `dist`
   - **Install Command**: `npm install`
5. Add Environment Variables:
   - Click "Environment Variables"
   - Add: `EXPO_PUBLIC_SUPABASE_URL` = your Supabase URL
   - Add: `EXPO_PUBLIC_SUPABASE_ANON_KEY` = your Supabase key
6. Click "Deploy"

### Option B: Vercel CLI

```bash
# Install Vercel CLI (if not already installed)
npm i -g vercel

# Login to Vercel
vercel login

# Deploy
vercel

# For production deployment
vercel --prod
```

## Step 4: Configure Environment Variables (Vercel)

After deployment, ensure environment variables are set:

1. Go to your project in Vercel Dashboard
2. Settings → Environment Variables
3. Add the following variables:
   - `EXPO_PUBLIC_SUPABASE_URL`
   - `EXPO_PUBLIC_SUPABASE_ANON_KEY`
4. Click "Save"
5. Redeploy if necessary

## Continuous Deployment

Once connected, Vercel will automatically deploy:
- **Production**: Every push to `main` branch
- **Preview**: Every push to other branches or pull requests

## Custom Domain (Optional)

1. In Vercel project settings, go to "Domains"
2. Add your custom domain
3. Follow DNS configuration instructions
4. Wait for DNS propagation (usually 5-30 minutes)

## Updating Your Deployment

Simply push to GitHub:

```bash
git add .
git commit -m "Your update message"
git push
```

Vercel will automatically build and deploy!

## Troubleshooting

### Build Fails

- Check build logs in Vercel dashboard
- Ensure all environment variables are set
- Try building locally first: `npx expo export --platform web`

### Environment Variables Not Working

- Make sure variable names start with `EXPO_PUBLIC_`
- Redeploy after adding/changing environment variables
- Check that variables are set for the correct environment (Production/Preview)

### App Not Loading

- Check browser console for errors
- Verify Supabase credentials are correct
- Check that CORS is enabled in your Supabase project

## Support

For issues specific to:
- **Vercel**: [Vercel Documentation](https://vercel.com/docs)
- **Expo Web**: [Expo Web Documentation](https://docs.expo.dev/guides/web/)
- **Supabase**: [Supabase Documentation](https://supabase.com/docs)
