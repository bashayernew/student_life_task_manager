-- Create Admin User for Testing
-- Run this in Supabase SQL Editor (one time only)
-- This creates an admin user with email: eyad123@eyad.com, password: Ey@d9090

select auth.admin.create_user(
  jsonb_build_object(
    'email','eyad123@eyad.com',
    'password','Ey@d9090',
    'email_confirm', true,
    'user_metadata', jsonb_build_object('full_name','Admin','role','admin')
  )
);

-- After running, you should see a success message
-- Then you can login at your local site with:
-- Email: eyad123@eyad.com
-- Password: Ey@d9090

