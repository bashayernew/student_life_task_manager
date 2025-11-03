# Supabase Database Setup Guide

## Problem
You're getting a 400 Bad Request error when trying to login. This means your Supabase connection works, but the database tables and users haven't been created yet.

## Solution: Run Database Migrations

### Step 1: Open Supabase SQL Editor
1. Go to https://supabase.com/dashboard
2. Select your project
3. Click on "SQL Editor" in the left sidebar

### Step 2 Extreme: Run All Migrations
Copy and paste this complete SQL script into the SQL Editor and run it:

```sql
-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Step 1: Create profiles table (if it doesn't exist)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT,
    full_name TEXT,
    role TEXT DEFAULT 'staff',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Step 2: Create departments table (if it doesn't exist)
CREATE TABLE IF NOT EXISTS public.departments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT UNIQUE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Step 3: Create tasks table (if it doesn't exist)
CREATE TABLE IF NOT EXISTS public.tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT,
    status TEXT DEFAULT 'pending',
    priority TEXT DEFAULT 'medium',
    department_id UUID REFERENCES public.departments(id),
    created_by UUID REFERENCES public.profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    due_date TIMESTAMPTZ
);

-- Step 4: Create task_assignees table (if it doesn't exist)
CREATE TABLE IF NOT EXISTS public.task_assignees (
    task_id UUID REFERENCES public.tasks(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    status TEXT DEFAULT 'assigned',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (task_id, user_id)
);

-- Step 5: Run all migrations from the files

-- Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_assignees ENABLE ROW LEVEL SECURITY;

-- Create basic RLS policies (allow authenticated users to read)
CREATE POLICY "Allow authenticated read" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated read" ON public.departments FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated read" ON public.tasks FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated read" ON public.task_assignees FOR SELECT TO authenticated USING (true);

-- Now run the migration functions
-- (Continue with the migration SQL from the files)
```

### Step 3: Alternative - Run Migration Files One by One
1. Open each file from `supabase/migrations/` folder in order:
   - `20251019200936_auth_staff_management.sql`
   - `20251020065500_add_sample_departments.sql`
   - `20251020070500_update_admin_credentials.sql`
   - `20251020073542_fix_recursive_functions.sql`
2. Copy and paste each file's content into SQL Editor
3. Click "Run" for each one

### Step 4: Verify Setup
After running migrations, you should be able to login with:
- **Admin**: `eyad123@eyad.com` / `Ey@d9090`
- **Staff**: `john@taskmanager.com` / `password123`

## Quick Test Query
Run this in SQL Editor to verify users were created:
```sql
SELECT email, role FROM auth.users;
```

## Need Help?
If you see errors, make sure:
1. Your Supabase project is active (not paused)
2. You're running migrations in the correct order
3. All required tables exist before running functions

