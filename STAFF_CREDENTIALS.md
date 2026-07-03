# Staff Member Credentials

## Important Security Note

Passwords are hashed before storage and cannot be retrieved in plain text.

To create or reset accounts, use the admin **Staff Management** page in the app, or run the backend seed script with passwords set in `backend/.env` (see `backend/.env.example`).

Do not commit real passwords to git.

---

## Local development seed accounts

When you run `npm run seed` in the `backend/` folder, default demo emails are created using passwords from your local `backend/.env`:

| Role | Email |
|------|-------|
| Admin | Value of `SEED_ADMIN_EMAIL` (default `superadmin@admin.com`) |
| Manager | `manager@taskmanager.com` |
| Staff | `john@taskmanager.com`, `sarah@taskmanager.com` |

Set `SEED_ADMIN_PASSWORD`, `SEED_MANAGER_PASSWORD`, and `SEED_STAFF_PASSWORD` in `backend/.env` before seeding.

---

## How to Get All Current Staff Emails

### Method 1: Via Application (Admin Dashboard)

1. Log in as admin
2. Go to **Manage Staff**
3. View the staff list table

### Method 2: Via API (Admin)

```bash
curl -H "Authorization: Bearer YOUR_TOKEN" http://localhost:4000/api/staff
```

---

## Password reset

Use the in-app **Account** page (current password required) or ask an admin to create a new staff account.
