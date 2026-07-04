import express from 'express';
import cors from 'cors';
import { ensureDbReady } from './db.js';
import authRoutes from './routes/auth.js';
import taskRoutes from './routes/tasks.js';
import staffRoutes from './routes/staff.js';
import departmentRoutes from './routes/departments.js';

const app = express();

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());

app.use((req, res, next) => {
  if (!process.env.DATABASE_URL && !process.env.POSTGRES_URL) {
    return res.status(503).json({
      error: 'Server misconfigured',
      detail:
        'DATABASE_URL is not set. Add it in Vercel → Settings → Environment Variables or in root .env for local dev.',
    });
  }
  if (!process.env.JWT_SECRET) {
    return res.status(503).json({
      error: 'Server misconfigured',
      detail: 'JWT_SECRET is not set.',
    });
  }
  next();
});

app.use(async (req, res, next) => {
  try {
    await ensureDbReady();
    next();
  } catch (err) {
    next(err);
  }
});

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.use('/api/auth', authRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/staff', staffRoutes);
app.use('/api/departments', departmentRoutes);

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

export default app;
