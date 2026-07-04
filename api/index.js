import 'dotenv/config';
import serverless from 'serverless-http';
import app from 'student-life-task-manager-api';
import { dbReady } from 'student-life-task-manager-api/db';

// Start schema/bootstrap on cold start; failures are logged and retried on next request.
dbReady.catch((err) => {
  console.error('[api] database bootstrap failed on cold start:', err?.message || err);
});

const handler = serverless(app, {
  request(_request, _event, context) {
    if (context && typeof context === 'object') {
      context.callbackWaitsForEmptyEventLoop = false;
    }
  },
});

export default handler;
