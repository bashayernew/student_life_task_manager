-- Location: supabase/migrations/20251019200936_auth_staff_management.sql
-- Schema Analysis: Existing profiles, departments, tasks tables with role-based security
-- Integration Type: Addition - Adding authentication system for staff management
-- Dependencies: profiles (existing), departments (existing), tasks (existing)

-- Functions for automatic profile creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
SECURITY DEFINER
LANGUAGE plpgsql
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)), COALESCE(NEW.raw_user_meta_data->>'role', 'staff'));  
  RETURN NEW;
END;
$$;

-- Trigger for new user creation
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to create new staff member
CREATE OR REPLACE FUNCTION public.create_staff_member(
  member_email TEXT,
  member_password TEXT,
  member_name TEXT,
  member_role TEXT DEFAULT 'staff'
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  new_user_id UUID;
  result JSON;
BEGIN
  -- Only admins can create staff members
  IF NOT is_admin() THEN
    RETURN JSON_BUILD_OBJECT('error', 'Access denied: Admin privileges required');
  END IF;

  -- Validate role
  IF member_role NOT IN ('admin', 'manager', 'staff') THEN
    RETURN JSON_BUILD_OBJECT('error', 'Invalid role. Must be admin, manager, or staff');
  END IF;

  -- Generate new user ID
  new_user_id := gen_random_uuid();

  -- Insert into auth.users with all required fields
  INSERT INTO auth.users (
    id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
    created_at, updated_at, raw_user_meta_data, raw_app_meta_data,
    is_sso_user, is_anonymous, confirmation_token, confirmation_sent_at,
    recovery_token, recovery_sent_at, email_change_token_new, email_change,
    email_change_sent_at, email_change_token_current, email_change_confirm_status,
    reauthentication_token, reauthentication_sent_at, phone, phone_change,
    phone_change_token, phone_change_sent_at
  ) VALUES (
    new_user_id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
    member_email, crypt(member_password, gen_salt('bf', 10)), now(), now(), now(),
    JSON_BUILD_OBJECT('full_name', member_name, 'role', member_role)::jsonb, 
    JSON_BUILD_OBJECT('provider', 'email', 'providers', ARRAY['email'])::jsonb,
    false, false, '', null, '', null, '', '', null, '', 0, '', null, null, '', '', null
  );

  -- The trigger will automatically create the profile entry

  RETURN JSON_BUILD_OBJECT(
    'success', true, 
    'user_id', new_user_id,
    'email', member_email,
    'name', member_name,
    'role', member_role
  );

EXCEPTION
  WHEN unique_violation THEN
    RETURN JSON_BUILD_OBJECT('error', 'Email already exists');
  WHEN OTHERS THEN
    RETURN JSON_BUILD_OBJECT('error', 'Failed to create staff member: ' || SQLERRM);
END;
$$;

-- Mock data for testing - Admin and Staff users
DO $$
DECLARE
    admin_uuid UUID := gen_random_uuid();
    staff1_uuid UUID := gen_random_uuid();
    staff2_uuid UUID := gen_random_uuid();
BEGIN
    -- Create auth users with required fields
    INSERT INTO auth.users (
        id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
        created_at, updated_at, raw_user_meta_data, raw_app_meta_data,
        is_sso_user, is_anonymous, confirmation_token, confirmation_sent_at,
        recovery_token, recovery_sent_at, email_change_token_new, email_change,
        email_change_sent_at, email_change_token_current, email_change_confirm_status,
        reauthentication_token, reauthentication_sent_at, phone, phone_change,
        phone_change_token, phone_change_sent_at
    ) VALUES
        (admin_uuid, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
         'admin@taskmanager.com', crypt('admin123', gen_salt('bf', 10)), now(), now(), now(),
         '{"full_name": "Admin User", "role": "admin"}'::jsonb, '{"provider": "email", "providers": ["email"]}'::jsonb,
         false, false, '', null, '', null, '', '', null, '', 0, '', null, null, '', '', null),
        (staff1_uuid, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
         'john@taskmanager.com', crypt('staff123', gen_salt('bf', 10)), now(), now(), now(),
         '{"full_name": "John Smith", "role": "staff"}'::jsonb, '{"provider": "email", "providers": ["email"]}'::jsonb,
         false, false, '', null, '', null, '', '', null, '', 0, '', null, null, '', '', null),
        (staff2_uuid, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
         'sarah@taskmanager.com', crypt('staff123', gen_salt('bf', 10)), now(), now(), now(),
         '{"full_name": "Sarah Johnson", "role": "staff"}'::jsonb, '{"provider": "email", "providers": ["email"]}'::jsonb,
         false, false, '', null, '', null, '', '', null, '', 0, '', null, null, '', '', null);

EXCEPTION
    WHEN unique_violation THEN
        RAISE NOTICE 'Mock users already exist, skipping creation';
    WHEN OTHERS THEN
        RAISE NOTICE 'Error creating mock users: %', SQLERRM;
END $$;