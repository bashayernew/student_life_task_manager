-- Create Admin User for Testing
-- Run this in Supabase SQL Editor (one time only)
-- This creates an admin user with email: eyad123@eyad.com and password: YOUR_ADMIN_PASSWORD

select auth.admin.create_user(
  jsonb_build_object(
    'email','eyad123@eyad.com',
    'password','YOUR_ADMIN_PASSWORD',
    'email_confirm', true,
    'user_metadata', jsonb_build_object('full_name','Admin','role','admin')
  )
);

-- After running, you should see a success message
-- Then you can login at your local site with:
-- Email: eyad123@eyad.com
-- Password: set YOUR_ADMIN_PASSWORD when running this script

