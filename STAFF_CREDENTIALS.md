# Staff Member Credentials

## ⚠️ Important Security Note
**Passwords are encrypted and stored securely in Supabase. They cannot be retrieved in plain text.**

If you need to reset a password:
1. Go to Supabase Dashboard → Authentication → Users
2. Find the user by email
3. Click "Reset Password" to send them a password reset email

---

## Test Users (from migrations)

These are test accounts that were created during database setup:

### Admin Account
- **Email**: `eyad123@eyad.com`
- **Password**: `Ey@d9090`
- **Role**: admin

### Staff Accounts (Sample - may not exist)
- **Email**: `john@taskmanager.com`
- **Password**: `staff123`
- **Role**: staff

- **Email**: `sarah@taskmanager.com`
- **Password**: `staff123`
- **Role**: staff

---

## How to Get All Current Staff Emails

### Method 1: Via Application (Admin Dashboard)
1. Log in as admin
2. Go to "Manage Staff" page (`/staff`)
3. View the table with all staff emails
4. Click "Copy Email" to copy any email to clipboard

### Method 2: Via Supabase SQL Editor
1. Go to Supabase Dashboard → SQL Editor
2. Run this query:
```sql
SELECT 
  email,
  raw_user_meta_data->>'full_name' as full_name,
  raw_user_meta_data->>'role' as role,
  created_at
FROM auth.users
ORDER BY email;
```

### Method 3: Via Browser Console (while logged in as admin)
Open browser console (F12) and run:
```javascript
const { data } = await supabase.from('profiles').select('email, full_name, role').order('email');
console.table(data);
```

---

## Creating New Staff Members

When creating new staff members through the admin panel:
1. You set the initial password (min 6 characters)
2. The password is encrypted before storage
3. **Save the password securely** when creating - it cannot be retrieved later!
4. Staff members can change their password after first login

---

## Password Reset Options

### Option 1: Send Password Reset Email (Recommended)
- Supabase Dashboard → Authentication → Users → Select user → Reset Password
- User receives email with reset link

### Option 2: Update Password via SQL (Admin Only)
**⚠️ Warning: Only use this if absolutely necessary!**
```sql
-- Replace 'user@example.com' and 'NewPassword123' with actual values
UPDATE auth.users 
SET encrypted_password = crypt('NewPassword123', gen_salt('bf', 10))
WHERE email = 'user@example.com';
```

---

## Current Staff List

To see the current list of staff members, check the "Manage Staff" page in the application when logged in as admin.
