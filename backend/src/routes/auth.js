import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { sql } from '../db.js';
import { authMiddleware } from '../middleware/auth.js';
import { formatDepartmentsPayload } from '../utils/userDepartments.js';

const router = Router();

async function formatProfile(row) {
  if (!row) return null;
  const payload = await formatDepartmentsPayload(row);
  return {
    ...payload,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

router.post('/login', async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  const rows = await sql`
    SELECT * FROM users WHERE lower(email) = lower(${email.trim()})
  `;
  const user = rows[0];

  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    return res.status(401).json({ error: 'Invalid login credentials' });
  }

  const profile = await formatProfile(user);
  const token = jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );

  res.json({
    token,
    user: { id: user.id, email: user.email },
    profile,
  });
});

router.get('/me', authMiddleware, async (req, res) => {
  const rows = await sql`SELECT * FROM users WHERE id = ${req.user.id}`;
  const user = rows[0];
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }
  res.json({ user: { id: user.id, email: user.email }, profile: await formatProfile(user) });
});

router.put('/profile', authMiddleware, async (req, res) => {
  const { full_name, department_id } = req.body || {};
  const currentRows = await sql`SELECT role FROM users WHERE id = ${req.user.id}`;
  const currentUser = currentRows[0];

  if (currentUser?.role === 'admin' && department_id !== undefined) {
    await sql`
      UPDATE users SET
        full_name = COALESCE(${full_name ?? null}, full_name),
        department_id = ${department_id || null},
        updated_at = NOW()
      WHERE id = ${req.user.id}
    `;
  } else {
    await sql`
      UPDATE users SET
        full_name = COALESCE(${full_name ?? null}, full_name),
        updated_at = NOW()
      WHERE id = ${req.user.id}
    `;
  }

  const rows = await sql`SELECT * FROM users WHERE id = ${req.user.id}`;
  res.json({ profile: await formatProfile(rows[0]) });
});

router.patch('/password', authMiddleware, async (req, res) => {
  const { currentPassword, newPassword } = req.body || {};

  if (!currentPassword || !newPassword) {
    return res.status(400).json({ error: 'Current password and new password are required' });
  }

  if (String(newPassword).length < 6) {
    return res.status(400).json({ error: 'New password must be at least 6 characters' });
  }

  const rows = await sql`
    SELECT id, password_hash FROM users WHERE id = ${req.user.id}
  `;
  const user = rows[0];
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  if (!bcrypt.compareSync(currentPassword, user.password_hash)) {
    return res.status(401).json({ error: 'Current password is incorrect' });
  }

  if (bcrypt.compareSync(newPassword, user.password_hash)) {
    return res.status(400).json({ error: 'New password must be different from your current password' });
  }

  const passwordHash = bcrypt.hashSync(newPassword, 10);
  await sql`
    UPDATE users SET password_hash = ${passwordHash}, updated_at = NOW() WHERE id = ${user.id}
  `;

  res.json({ success: true, message: 'Password updated successfully' });
});

export default router;
