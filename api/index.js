import 'dotenv/config';
import serverless from 'serverless-http';
import app from 'student-life-task-manager-api';

export default serverless(app);
