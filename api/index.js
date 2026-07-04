import 'dotenv/config';
import app from 'student-life-task-manager-api';
import { dbReady } from 'student-life-task-manager-api/db';

// Start schema/bootstrap on cold start; failures are logged and retried on next request.
dbReady.catch((err) => {
  console.error('[api] database bootstrap failed on cold start:', err?.message || err);
});

export default app;
