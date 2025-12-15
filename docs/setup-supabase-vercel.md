# Supabase & Vercel Setup Guide

This guide will walk you through setting up Supabase authentication and deploying your Next.js application to Vercel, including proper callback configuration for authentication flows.

## Table of Contents

1. [Supabase Setup](#1-supabase-setup)
2. [Supabase Authentication Configuration](#2-supabase-authentication-configuration)
3. [Environment Variables](#3-environment-variables)
4. [Vercel Deployment](#4-vercel-deployment)
5. [Troubleshooting](#5-troubleshooting)

---

## 1. Supabase Setup

### Step 1.1: Create a Supabase Project

1. Go to [Supabase Dashboard](https://app.supabase.com)
2. Click **"New Project"**
3. Fill in the project details:
   - **Name**: Choose a descriptive name (e.g., "The Rookie Dance Studio")
   - **Database Password**: Create a strong password (save this securely - you'll need it for direct database access)
   - **Region**: Choose the closest region to your users
   - **Pricing Plan**: Select your plan (Free tier is fine for development)
4. Click **"Create new project"**
5. Wait for the project to finish provisioning (this takes 1-2 minutes)

### Step 1.2: Get Your API Keys

1. In your Supabase project dashboard, navigate to **Settings** (gear icon) > **API**
2. You'll find two important values:
   - **Project URL**: `https://xxxxxxxxxxxxx.supabase.co`
   - **anon public key**: A long string starting with `eyJ...`

Save these values - you'll need them for environment variables.

---

## 2. Supabase Authentication Configuration

### Step 2.1: Configure Site URL

The Site URL is the base URL where your application will be hosted. This is crucial for authentication redirects.

#### For Local Development:

1. Go to **Authentication** > **URL Configuration**
2. Set **Site URL** to: `http://localhost:3000`

#### For Production (Vercel):

1. Go to **Authentication** > **URL Configuration**
2. Set **Site URL** to your Vercel deployment URL (e.g., `https://your-app.vercel.app`)

**Important**: You can only set one Site URL at a time. During development, switch between localhost and production URLs as needed, or use the redirect URLs method below for multiple environments.

### Step 2.2: Configure Redirect URLs

Redirect URLs determine where Supabase sends users after authentication actions (login, signup, password reset, OAuth, etc.).

1. Go to **Authentication** > **URL Configuration**
2. In the **Redirect URLs** section, add the following URLs:

#### Development URLs:
```
http://localhost:3000/auth/callback
http://localhost:3000/*
```

#### Production URLs (replace with your actual Vercel domain):
```
https://your-app.vercel.app/auth/callback
https://your-app.vercel.app/*
```

**Note**: The `/*` wildcard pattern allows redirects to any route on your domain, which is useful for OAuth flows that might redirect to different pages based on the `next` parameter.

### Step 2.3: Configure Email Authentication (Default)

Email/Password authentication is enabled by default in Supabase.

1. Go to **Authentication** > **Providers**
2. Ensure **Email** provider is enabled
3. Configure email templates if needed (optional):
   - Go to **Authentication** > **Email Templates**
   - Customize confirmation, password reset, and magic link emails

### Step 2.4: Configure OAuth Providers (Optional - Google OAuth Example)

If you want to enable Google OAuth authentication:

1. Go to **Authentication** > **Providers**
2. Find **Google** in the list and click to configure
3. Enable the provider
4. Get OAuth credentials from Google Cloud Console:
   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Create a new project or select existing one
   - Enable **Google+ API**
   - Go to **Credentials** > **Create Credentials** > **OAuth 2.0 Client ID**
   - Set **Application type** to "Web application"
   - Add **Authorized redirect URIs**:
     - For development: `https://xxxxxxxxxxxxx.supabase.co/auth/v1/callback`
     - For production: `https://xxxxxxxxxxxxx.supabase.co/auth/v1/callback` (same for both)
   - Copy the **Client ID** and **Client Secret**
5. In Supabase, paste the Client ID and Client Secret
6. Click **Save**

**Important**: The Supabase callback URL (`https://your-project.supabase.co/auth/v1/callback`) is the same for all environments. Supabase handles the redirect to your application based on the Site URL and Redirect URLs you configured.

### Step 2.5: Configure Auth Flow Settings

1. Go to **Authentication** > **URL Configuration**
2. Review and configure these settings:

- **Enable email confirmations**: Recommended for production (users must verify email before logging in)
- **Enable email change confirmations**: Recommended for security
- **Secure email change**: Enable this for additional security

For development, you might want to disable email confirmations to speed up testing.

---

## 3. Environment Variables

### Step 3.1: Local Development (.env.local)

Create a `.env.local` file in your project root:

```bash
# .env.local
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxxxxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
```

**Where to find these values:**
- `NEXT_PUBLIC_SUPABASE_URL`: From Supabase Dashboard > Settings > API > Project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: From Supabase Dashboard > Settings > API > anon public key

**Security Note**: The `NEXT_PUBLIC_` prefix means these variables are exposed to the browser. This is safe for Supabase anonymous keys, which are designed to be public. Your data is protected by Row-Level Security (RLS) policies in Supabase.

### Step 3.2: Add .env.local to .gitignore

Ensure `.env.local` is in your `.gitignore` to prevent committing secrets:

```bash
# .gitignore
.env.local
.env*.local
```

---

## 4. Vercel Deployment

### Step 4.1: Prepare Your Project

1. Ensure your code is pushed to a Git repository (GitHub, GitLab, or Bitbucket)
2. Make sure you have a `package.json` with the following scripts:
   ```json
   {
     "scripts": {
       "dev": "next dev",
       "build": "next build",
       "start": "next start"
     }
   }
   ```

### Step 4.2: Deploy to Vercel

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Click **"Add New..."** > **"Project"**
3. Import your Git repository:
   - Connect your Git provider if not already connected
   - Select your repository
   - Click **"Import"**
4. Configure your project:
   - **Framework Preset**: Should auto-detect as Next.js
   - **Root Directory**: Leave as `./` (unless your Next.js app is in a subdirectory)
   - **Build Command**: `npm run build` (usually auto-filled)
   - **Output Directory**: `.next` (usually auto-filled)
   - **Install Command**: `npm install` (usually auto-filled)
5. **Important**: Before clicking "Deploy", add environment variables (see Step 4.3)
6. Click **"Deploy"**

### Step 4.3: Configure Environment Variables in Vercel

**Before your first deployment**, configure environment variables:

1. In the Vercel project setup page, scroll down to **"Environment Variables"**
2. Add the following variables:

| Variable Name | Value | Environment |
|--------------|-------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://xxxxxxxxxxxxx.supabase.co` | Production, Preview, Development |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `your_anon_key_here` | Production, Preview, Development |

3. Click **"Add"** for each variable
4. Make sure to select all three environments (Production, Preview, Development) for each variable

**After deployment**, you can also add/update environment variables:
1. Go to your project in Vercel Dashboard
2. Navigate to **Settings** > **Environment Variables**
3. Add or edit variables as needed
4. Redeploy your application for changes to take effect

### Step 4.4: Update Supabase Redirect URLs After Deployment

After deploying to Vercel, you'll get a production URL (e.g., `https://your-app.vercel.app`):

1. Go to Supabase Dashboard > **Authentication** > **URL Configuration**
2. Update **Site URL** to your Vercel URL: `https://your-app.vercel.app`
3. Add your production callback URL to **Redirect URLs**:
   ```
   https://your-app.vercel.app/auth/callback
   https://your-app.vercel.app/*
   ```
4. Click **Save**

### Step 4.5: Update Site URL for Different Environments (Optional)

If you want separate configurations for production and preview deployments:

**Option A: Use Vercel Preview URLs**
- Add preview URLs to Supabase Redirect URLs: `https://your-app-git-*.vercel.app/auth/callback`
- Note: This can get complex with many preview deployments

**Option B: Environment-Specific Site URLs (Recommended)**
- Use Vercel's environment variables to dynamically set redirect URLs
- Requires code changes to handle different URLs per environment
- More complex but more flexible

**For most use cases**, using your production domain for Site URL and allowing wildcard redirect URLs works best.

---

## 5. Troubleshooting

### Common Issues and Solutions

#### Issue 1: "MIDDLEWARE_INVOCATION_FAILED" Error on Vercel

**Symptoms**: 500 error with code `MIDDLEWARE_INVOCATION_FAILED`

**Causes & Solutions**:
- **Missing environment variables**: Ensure `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are set in Vercel
- **Invalid environment variables**: Double-check the values match your Supabase project
- **Solution**: Go to Vercel Dashboard > Project Settings > Environment Variables and verify both variables are set correctly

#### Issue 2: "Invalid callback URL" or "Redirect URL mismatch"

**Symptoms**: Users can't complete login/signup, redirected to error page

**Causes & Solutions**:
- **Callback URL not in Supabase Redirect URLs list**: The URL Supabase tries to redirect to must be in your Redirect URLs
- **Site URL mismatch**: Site URL should match your application's base URL
- **Solution**: 
  1. Check your Vercel deployment URL
  2. Go to Supabase > Authentication > URL Configuration
  3. Ensure Site URL matches: `https://your-app.vercel.app`
  4. Ensure Redirect URLs includes: `https://your-app.vercel.app/auth/callback`

#### Issue 3: OAuth (Google) Not Working

**Symptoms**: Google login button doesn't work or redirects to error

**Causes & Solutions**:
- **OAuth credentials not configured**: Ensure Client ID and Client Secret are set in Supabase
- **Google OAuth redirect URI mismatch**: Google Cloud Console redirect URI must be: `https://your-project.supabase.co/auth/v1/callback`
- **Solution**: 
  1. Verify Google OAuth is enabled in Supabase > Authentication > Providers
  2. Check Google Cloud Console > Credentials > Authorized redirect URIs includes Supabase callback
  3. Ensure Site URL and Redirect URLs are correctly set in Supabase

#### Issue 4: Email Verification Not Working

**Symptoms**: Users don't receive verification emails or emails go to spam

**Causes & Solutions**:
- **Email templates not configured**: Check Supabase > Authentication > Email Templates
- **SMTP not configured**: Supabase free tier uses their email service, which may have rate limits
- **Emails in spam folder**: Check spam/junk folder
- **Solution**: 
  - For production, consider configuring custom SMTP in Supabase > Settings > Auth > SMTP Settings
  - Check Supabase logs: Authentication > Logs to see if emails are being sent

#### Issue 5: Users Redirected to Wrong Page After Login

**Symptoms**: After login, users are redirected to `/` instead of `/profile` or expected page

**Causes & Solutions**:
- **Callback route handling**: Check `src/app/auth/callback/route.ts` - it should redirect to `/profile` after successful login
- **Next.js redirect logic**: Verify your middleware and auth actions redirect correctly
- **Solution**: 
  - Check `src/app/auth/actions.ts` - login action should redirect to `/profile`
  - Verify callback route handles the `next` parameter correctly

#### Issue 6: Environment Variables Not Available at Build Time

**Symptoms**: Build succeeds but runtime errors about missing environment variables

**Causes & Solutions**:
- **Variables not prefixed with NEXT_PUBLIC_**: Non-public variables aren't available in the browser
- **Variables not set for all environments**: Check Vercel environment variable settings
- **Solution**: 
  - Ensure variables start with `NEXT_PUBLIC_` for client-side access
  - In Vercel, set variables for Production, Preview, AND Development environments
  - Redeploy after adding environment variables

### Verification Checklist

After setup, verify everything works:

- [ ] Environment variables are set in Vercel
- [ ] Supabase Site URL matches your Vercel deployment URL
- [ ] Supabase Redirect URLs includes your callback URL: `https://your-app.vercel.app/auth/callback`
- [ ] Application builds successfully on Vercel
- [ ] Users can register with email/password
- [ ] Users receive verification emails (if enabled)
- [ ] Users can log in after email verification
- [ ] Users are redirected to `/profile` after login
- [ ] OAuth login works (if configured)
- [ ] Logout works correctly
- [ ] Middleware doesn't throw errors (check Vercel function logs)

### Getting Help

If you encounter issues:

1. **Check Vercel Function Logs**: 
   - Go to Vercel Dashboard > Your Project > Functions tab
   - Look for errors in middleware or API routes

2. **Check Supabase Auth Logs**:
   - Go to Supabase Dashboard > Authentication > Logs
   - Review authentication attempts and errors

3. **Check Browser Console**:
   - Open browser DevTools > Console
   - Look for client-side errors

4. **Verify Environment Variables**:
   - In Vercel, check Settings > Environment Variables
   - Ensure variables are set for the correct environment (Production/Preview)

---

## Quick Reference

### Supabase Configuration URLs

- **Site URL**: Your application's base URL (e.g., `https://your-app.vercel.app`)
- **Redirect URLs**: 
  - `https://your-app.vercel.app/auth/callback`
  - `https://your-app.vercel.app/*` (wildcard for flexibility)

### Vercel Environment Variables

```bash
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxxxxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
```

### Callback Route

Your application should have a callback route at:
- **Path**: `/auth/callback`
- **File**: `src/app/auth/callback/route.ts`
- **Purpose**: Exchanges authentication code for session

### Authentication Flow

1. User clicks login/signup
2. Supabase handles authentication
3. Supabase redirects to: `https://your-app.vercel.app/auth/callback?code=xxx`
4. Your callback route exchanges code for session
5. User is redirected to intended destination (e.g., `/profile`)

---

## Additional Resources

- [Supabase Auth Documentation](https://supabase.com/docs/guides/auth)
- [Next.js Authentication with Supabase](https://supabase.com/docs/guides/auth/auth-helpers/nextjs)
- [Vercel Deployment Documentation](https://vercel.com/docs)
- [Supabase SSR Guide](https://supabase.com/docs/guides/auth/server-side/nextjs)

