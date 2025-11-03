-- Fix RLS Policies for Task Manager Application
-- Run this in your Supabase SQL Editor to fix 500 errors

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Allow authenticated read" ON public.profiles;
DROP POLICY IF EXISTS "Allow authenticated read" ON public.departments;
DROP POLICY IF EXISTS "Allow authenticated read" ON public.tasks;
DROP POLICY IF EXISTS "Allow authenticated read" ON public.task_assignees;
DROP POLICY IF EXISTS "Allow authenticated insert" ON public.profiles;
DROP POLICY IF EXISTS "Allow authenticated insert" ON public.departments;
DROP POLICY IF EXISTS "Allow authenticated update" ON public.profiles;
DROP POLICY IF EXISTS "Allow authenticated update" ON public.departments;

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_assignees ENABLE ROW LEVEL SECURITY;

-- Profiles policies
-- Allow authenticated users to read all profiles
CREATE POLICY "profiles_select_all" ON public.profiles
  FOR SELECT TO authenticated
  USING (true);

-- Allow authenticated users to update their own profile
CREATE POLICY "profiles_update_own" ON public.profiles
  FOR UPDATE TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Allow admins to insert profiles (for staff creation)
CREATE POLICY "profiles_insert_admin" ON public.profiles
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Allow admins to update any profile
CREATE POLICY "profiles_update_admin" ON public.profiles
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Departments policies
-- Allow authenticated users to read all departments
CREATE POLICY "departments_select_all" ON public.departments
  FOR SELECT TO authenticated
  USING (true);

-- Allow authenticated users to insert departments (for auto-creation)
CREATE POLICY "departments_insert_authenticated" ON public.departments
  FOR INSERT TO authenticated
  WITH CHECK (true);

-- Allow authenticated users to update departments (for admins mainly)
CREATE POLICY "departments_update_authenticated" ON public.departments
  FOR UPDATE TO authenticated
  USING (true)
  WITH CHECK (true);

-- Tasks policies
-- Allow authenticated users to read all tasks
CREATE POLICY "tasks_select_all" ON public.tasks
  FOR SELECT TO authenticated
  USING (true);

-- Allow authenticated users to insert tasks
CREATE POLICY "tasks_insert_authenticated" ON public.tasks
  FOR INSERT TO authenticated
  WITH CHECK (true);

-- Allow authenticated users to update tasks
CREATE POLICY "tasks_update_authenticated" ON public.tasks
  FOR UPDATE TO authenticated
  USING (true)
  WITH CHECK (true);

-- Task assignees policies
-- Allow authenticated users to read all task assignees
CREATE POLICY "task_assignees_select_all" ON public.task_assignees
  FOR SELECT TO authenticated
  USING (true);

-- Allow authenticated users to insert task assignees
CREATE POLICY "task_assignees_insert_authenticated" ON public.task_assignees
  FOR INSERT TO authenticated
  WITH CHECK (true);

-- Allow authenticated users to update task assignees
CREATE POLICY "task_assignees_update_authenticated" ON public.task_assignees
  FOR UPDATE TO authenticated
  USING (true)
  WITH CHECK (true);

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON public.profiles TO authenticated;
GRANT ALL ON public.departments TO authenticated;
GRANT ALL ON public.tasks TO authenticated;
GRANT ALL ON public.task_assignees TO authenticated;

-- Verify policies were created
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE schemaname = 'public' 
  AND tablename IN ('profiles', 'departments', 'tasks', 'task_assignees')
ORDER BY tablename, policyname;

