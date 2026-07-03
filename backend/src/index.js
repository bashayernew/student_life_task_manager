import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import './db.js';
import authRoutes from './routes/auth.js';
import taskRoutes from './routes/tasks.js';
import staffRoutes from './routes/staff.js';
import departmentRoutes from './routes/departments.js';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());

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

app.listen(PORT, () => {
  console.log(`API running at http://localhost:${PORT}`);
});
