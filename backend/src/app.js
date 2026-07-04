import express from 'express';
import cors from 'cors';
import { ensureDbReady, getDatabaseUrl } from './db.js';
import authRoutes from './routes/auth.js';
import taskRoutes from './routes/tasks.js';
import staffRoutes from './routes/staff.js';
import departmentRoutes from './routes/departments.js';

const app = express();

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());

function hasDatabaseConfig() {
  return Boolean(process.env.POSTGRES_URL?.trim() || process.env.DATABASE_URL?.trim());
}

app.use((req, res, next) => {
  if (!hasDatabaseConfig()) {
    return res.status(503).json({
      error: 'Server misconfigured',
      detail:
        'POSTGRES_URL or DATABASE_URL is not set. Use the Neon pooled connection string (host contains -pooler).',
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

app.get('/api/health', async (_req, res, next) => {
  try {
    await ensureDbReady();
    res.json({
      status: 'ok',
      database: getDatabaseUrl().includes('-pooler') ? 'pooled' : 'direct',
    });
  } catch (err) {
    next(err);
  }
});

app.use('/api/auth', authRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/staff', staffRoutes);
app.use('/api/departments', departmentRoutes);

app.use((_req, res) => {
  res.status(404).json({ error: 'Not found' });
});

app.use((err, _req, res, _next) => {
  console.error(err);
  if (res.headersSent) return;
  res.status(500).json({
    error: 'Internal server error',
    detail: process.env.VERCEL ? undefined : err?.message,
  });
});

export default app;
