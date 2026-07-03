# Setup Instructions

## 1️⃣ Create or Fix Your .env File

At the project root (`student_life_task_manager/`), make sure you have a `.env` file with:

```env
VITE_SUPABASE_URL=https://<your-project-ref>.supabase.co
VITE_SUPABASE_ANON_KEY=<your-anon-key>
```

**To get these values:**
1. Go to https://supabase.com/dashboard
2. Select your project
3. Go to **Project Settings → API**
4. Copy the **Project URL** and **anon public** key

## 2️⃣ Install Dependencies

In the terminal, run:

```bash
npm install
```

Wait until it finishes (you'll see "added xxx packages").

## 3️⃣ Start Local Server

The project uses Vite. Run:

```bash
npm start
```

Or if you prefer the `dev` command, add this to `package.json` scripts:
```json
"dev": "vite"
```

Then run:
```bash
npm run dev
```

Wait until you see:
```
Local: http://localhost:4028/
```

**Note:** The server runs on port 4028 (as configured in `vite.config.mjs`), not the default 5173.

Click that link — your site will open in your browser.

## 4️⃣ Set Up Login for Testing

### Option A: Using SQL Editor (Recommended)

In Supabase SQL Editor, run this (one time only):

```sql
select auth.admin.create_user(
  jsonb_build_object(
    'email','eyad123@eyad.com',
    'password','YOUR_ADMIN_PASSWORD',
    'email_confirm', true,
    'user_metadata', jsonb_build_object('full_name','Admin','role','admin')
  )
);
```

### Option B: Run Migration Files

If you haven't run your migrations yet, execute these in order in Supabase SQL Editor:

1. `supabase/migrations/20251019200936_auth_staff_management.sql`
2. `supabase/migrations/20251020065500_add_sample_departments.sql`
3. `supabase/migrations/20251020070500_update_admin_credentials.sql` (creates admin user)
4. `supabase/migrations/20251020073542_fix_recursive_functions.sql`

### Then Login:

Go to your local site → click "Login" →
- **Email:** eyad123@eyad.com
- **Password:** set via Supabase dashboard or your chosen admin password

## 5️⃣ (Optional) If You Have an Edge Function

If your code calls an edge function like `create_staff_user`, you need to either:

### Option A: Deploy to Supabase
Deploy your edge function to Supabase so it's available in production.

### Option B: Run Locally
If you have Supabase CLI set up, open a new terminal and run:

```bash
supabase functions serve create_staff_user
```

Then it'll run locally at:
```
http://localhost:54321/functions/v1/create_staff_user
```

**Note:** You'll need to update your `staffService.js` to point to the local function URL during development, or configure Supabase CLI properly.

## Current Configuration

- **Port:** 4028 (configured in `vite.config.mjs`)
- **Environment Variables:** `.env` file should exist
- **Routes:**
  - `/login` - Login page
  - `/dashboard` - Main dashboard with task counters
  - `/tasks` - Tasks table with filters
  - `/task/:id` - Task detail page
  - `/staff` - Staff management (admin only)

## Troubleshooting

- **Connection errors:** Make sure your Supabase project is active (not paused)
- **Port already in use:** Change the port in `vite.config.mjs` or kill the process using port 4028
- **Login fails:** Verify the admin user was created in Supabase SQL Editor
- **404 on routes:** Make sure you're accessing `/dashboard` not `/admin-dashboard`

