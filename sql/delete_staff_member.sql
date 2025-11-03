-- Function to delete staff member (admin only)
-- This deletes both the profile and the auth user
-- Run this in Supabase SQL Editor

CREATE OR REPLACE FUNCTION public.delete_staff_member(member_user_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  member_email TEXT;
BEGIN
  -- Only admins can delete staff members
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role = 'admin'
  ) THEN
    RETURN JSON_BUILD_OBJECT('error', 'Access denied: Admin privileges required');
  END IF;

  -- Prevent deleting yourself
  IF member_user_id = auth.uid() THEN
    RETURN JSON_BUILD_OBJECT('error', 'Cannot delete your own account');
  END IF;

  -- Prevent deleting other admins
  IF EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = member_user_id AND role = 'admin'
  ) THEN
    RETURN JSON_BUILD_OBJECT('error', 'Cannot delete admin accounts');
  END IF;

  -- Get email for logging
  SELECT email INTO member_email FROM public.profiles WHERE id = member_user_id;

  -- Delete from task_assignees first (if CASCADE doesn't handle it)
  DELETE FROM public.task_assignees WHERE user_id = member_user_id;
  
  -- Delete from profiles (this should cascade to auth.users if CASCADE is set up)
  DELETE FROM public.profiles WHERE id = member_user_id;

  -- Delete from auth.users directly (requires SECURITY DEFINER)
  DELETE FROM auth.users WHERE id = member_user_id;

  RETURN JSON_BUILD_OBJECT(
    'success', true,
    'message', 'Staff member deleted successfully',
    'email', member_email
  );

EXCEPTION
  WHEN OTHERS THEN
    RETURN JSON_BUILD_OBJECT('error', 'Failed to delete staff member: ' || SQLERRM);
END;
$$;

-- Grant execute permission to authenticated users
-- (The function checks for admin role internally)
GRANT EXECUTE ON FUNCTION public.delete_staff_member(UUID) TO authenticated;

-- Notify PostgREST
NOTIFY pgrst, 'reload schema';
