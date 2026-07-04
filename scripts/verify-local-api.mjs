/**
 * Smoke-test the Express app exported by `api/index.js` (same code path as Vercel).
 * Requires root `.env` with DATABASE_URL and JWT_SECRET.
 */
import dotenv from 'dotenv';
import http from 'node:http';

dotenv.config();

if (!process.env.DATABASE_URL && !process.env.POSTGRES_URL) {
  console.error(
    'Missing DATABASE_URL in .env — copy .env.example to .env and set Neon connection string.'
  );
  process.exit(1);
}

const { default: app } = await import('../backend/src/app.js');

const port = 3999;
const server = http.createServer(app);

server.listen(port, async () => {
  try {
    const health = await fetch(`http://127.0.0.1:${port}/api/health`);
    const healthJson = await health.json();
    console.log('GET /api/health', health.status, healthJson);

    const login = await fetch(`http://127.0.0.1:${port}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: process.env.SUPERADMIN_EMAIL || 'superadmin@admin.com',
        password: process.env.SUPERADMIN_PASSWORD || 'Adm!n@123',
      }),
    });
    const loginJson = await login.json();
    console.log(
      'POST /api/auth/login',
      login.status,
      loginJson.token ? 'token received' : loginJson
    );

    if (health.ok && login.ok && loginJson.token) {
      console.log('Local API verification passed.');
      process.exit(0);
    }
    console.error('Local API verification failed.');
    process.exit(1);
  } catch (err) {
    console.error(err);
    process.exit(1);
  } finally {
    server.close();
  }
});
