import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import db from '../db.js';
import { authMiddleware } from '../middleware/auth.js';
import { formatDepartmentsPayload } from '../utils/userDepartments.js';

const router = Router();

function formatProfile(row) {
  if (!row) return null;
  const payload = formatDepartmentsPayload(row);
  return {
    ...payload,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

router.post('/login', (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  const user = db.prepare('SELECT * FROM users WHERE lower(email) = lower(?)').get(email.trim());
  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    return res.status(401).json({ error: 'Invalid login credentials' });
  }

  const profile = formatProfile(user);
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

router.get('/me', authMiddleware, (req, res) => {
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }
  res.json({ user: { id: user.id, email: user.email }, profile: formatProfile(user) });
});

router.put('/profile', authMiddleware, (req, res) => {
  const { full_name, department_id } = req.body || {};
  const currentUser = db.prepare('SELECT role FROM users WHERE id = ?').get(req.user.id);

  if (currentUser?.role === 'admin' && department_id !== undefined) {
    db.prepare(`
      UPDATE users SET
        full_name = COALESCE(?, full_name),
        department_id = ?,
        updated_at = datetime('now')
      WHERE id = ?
    `).run(full_name ?? null, department_id || null, req.user.id);
  } else {
    db.prepare(`
      UPDATE users SET
        full_name = COALESCE(?, full_name),
        updated_at = datetime('now')
      WHERE id = ?
    `).run(full_name ?? null, req.user.id);
  }

  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
  res.json({ profile: formatProfile(user) });
});

router.patch('/password', authMiddleware, (req, res) => {
  const { currentPassword, newPassword } = req.body || {};

  if (!currentPassword || !newPassword) {
    return res.status(400).json({ error: 'Current password and new password are required' });
  }

  if (String(newPassword).length < 6) {
    return res.status(400).json({ error: 'New password must be at least 6 characters' });
  }

  const user = db.prepare('SELECT id, password_hash FROM users WHERE id = ?').get(req.user.id);
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
  db.prepare(`
    UPDATE users SET password_hash = ?, updated_at = datetime('now') WHERE id = ?
  `).run(passwordHash, user.id);

  res.json({ success: true, message: 'Password updated successfully' });
});

export default router;
