-- Update admin user to use eyad123@eyad.com credentials
-- This ensures the admin can login with the specified email/password

DO $$
DECLARE
    admin_user_id UUID;
BEGIN
    -- Find existing admin user
    SELECT id INTO admin_user_id 
    FROM public.profiles 
    WHERE role = 'admin' 
    LIMIT 1;

    -- Update auth.users with new admin credentials
    IF admin_user_id IS NOT NULL THEN
        UPDATE auth.users 
        SET 
            email = 'eyad123@eyad.com',
            encrypted_password = crypt('Ey@d9090', gen_salt('bf', 10)),
            raw_user_meta_data = jsonb_build_object(
                'full_name', 'Admin User',
                'role', 'admin'
            ),
            updated_at = now()
        WHERE id = admin_user_id;

        -- Update profiles table to match
        UPDATE public.profiles
        SET 
            email = 'eyad123@eyad.com',
            full_name = 'Admin User',
            updated_at = now()
        WHERE id = admin_user_id;

        RAISE NOTICE 'Admin credentials updated successfully to eyad123@eyad.com';
    ELSE
        -- Create admin user if none exists
        admin_user_id := gen_random_uuid();
        
        INSERT INTO auth.users (
            id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
            created_at, updated_at, raw_user_meta_data, raw_app_meta_data,
            is_sso_user, is_anonymous, confirmation_token, confirmation_sent_at,
            recovery_token, recovery_sent_at, email_change_token_new, email_change,
            email_change_sent_at, email_change_token_current, email_change_confirm_status,
            reauthentication_token, reauthentication_sent_at, phone, phone_change,
            phone_change_token, phone_change_sent_at
        ) VALUES (
            admin_user_id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
            'eyad123@eyad.com', crypt('Ey@d9090', gen_salt('bf', 10)), now(), now(), now(),
            '{"full_name": "Admin User", "role": "admin"}'::jsonb, 
            '{"provider": "email", "providers": ["email"]}'::jsonb,
            false, false, '', null, '', null, '', '', null, '', 0, '', null, null, '', '', null
        );

        RAISE NOTICE 'New admin user created with eyad123@eyad.com';
    END IF;

EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Error updating admin credentials: %', SQLERRM;
END $$;

-- Ensure staff creation function works properly
-- This function allows the admin to create team member accounts
CREATE OR REPLACE FUNCTION public.create_staff_member(
    member_email text, 
    member_password text, 
    member_name text, 
    member_role text DEFAULT 'staff'::text
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  new_user_id UUID;
BEGIN
  -- Only admins can create staff members
  IF NOT is_admin() THEN
    RETURN JSON_BUILD_OBJECT('error', 'Access denied: Admin privileges required');
  END IF;

  -- Validate role
  IF member_role NOT IN ('admin', 'staff') THEN
    RETURN JSON_BUILD_OBJECT('error', 'Invalid role. Must be admin or staff');
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
    'role', member_role,
    'message', 'Staff member created successfully. They can now login with: ' || member_email
  );

EXCEPTION
  WHEN unique_violation THEN
    RETURN JSON_BUILD_OBJECT('error', 'Email already exists');
  WHEN OTHERS THEN
    RETURN JSON_BUILD_OBJECT('error', 'Failed to create staff member: ' || SQLERRM);
END;
$function$;