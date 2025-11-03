# Vercel Deployment Guide

This guide will help you deploy the Student Life Task Manager to Vercel.

## Prerequisites

1. A Vercel account (sign up at [vercel.com](https://vercel.com))
2. Your Supabase project URL and anon key
3. Git repository (GitHub, GitLab, or Bitbucket)

## Step 1: Prepare Your Repository

Make sure your code is committed and pushed to a Git repository.

## Step 2: Set Up Environment Variables in Vercel

Before deploying, you need to add your Supabase credentials as environment variables:

1. Go to your Vercel dashboard
2. Select your project (or create a new one)
3. Go to **Settings** → **Environment Variables**
4. Add the following variables:

   ```
   VITE_SUPABASE_URL=your_supabase_project_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

   **Important:** Make sure to add these for **Production**, **Preview**, and **Development** environments.

## Step 3: Deploy to Vercel

### Option A: Deploy via Vercel Dashboard

1. Go to [vercel.com/new](https://vercel.com/new)
2. Import your Git repository
3. Vercel will auto-detect Vite and configure the project
4. Verify the settings:
   - **Framework Preset:** Vite
   - **Build Command:** `npm run build`
   - **Output Directory:** `build`
   - **Install Command:** `npm install`
5. Click **Deploy**

### Option B: Deploy via Vercel CLI

1. Install Vercel CLI:
   ```bash
   npm i -g vercel
   ```

2. Navigate to your project directory:
   ```bash
   cd student_life_task_manager
   ```

3. Login to Vercel:
   ```bash
   vercel login
   ```

4. Deploy:
   ```bash
   vercel
   ```

5. For production deployment:
   ```bash
   vercel --prod
   ```

## Step 4: Verify Deployment

1. After deployment, Vercel will provide you with a URL
2. Visit the URL and test:
   - Login functionality
   - Task creation
   - Task assignment
   - Dashboard stats

## Step 5: Configure Custom Domain (Optional)

1. Go to your project settings in Vercel
2. Navigate to **Domains**
3. Add your custom domain
4. Follow the DNS configuration instructions

## Important Notes

### Environment Variables

- Never commit `.env` files to Git
- Always use Vercel's environment variables for sensitive data
- The `VITE_` prefix is required for Vite to expose variables to the client

### Supabase Configuration

- Ensure your Supabase project allows requests from your Vercel domain
- You may need to add your Vercel domain to Supabase's allowed origins in the dashboard

### Database Setup

- Make sure all SQL migrations are run in your Supabase database
- Verify RLS policies are in place
- Ensure the `delete_staff_member` RPC function is created

## Troubleshooting

### Build Fails

- Check that all dependencies are in `package.json`
- Verify Node.js version (Vercel uses Node 18+ by default)
- Check build logs in Vercel dashboard

### Environment Variables Not Working

- Ensure variables start with `VITE_` prefix
- Redeploy after adding environment variables
- Clear Vercel cache if needed

### Routing Issues (404 on refresh)

- The `vercel.json` file includes rewrites for SPA routing
- Ensure `vercel.json` is in the root directory

### Supabase Connection Errors

- Verify environment variables are set correctly
- Check Supabase project status
- Ensure CORS is configured in Supabase dashboard

## Support

For issues with:
- **Vercel deployment:** Check [Vercel documentation](https://vercel.com/docs)
- **Project issues:** Check the project README.md
- **Supabase:** Check [Supabase documentation](https://supabase.com/docs)

