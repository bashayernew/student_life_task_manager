/**
 * Full-stack local dev: `npm run dev` → Vercel CLI (frontend + /api serverless).
 * package.json must NOT set "dev" to "vercel dev" (CLI recursion guard).
 */
import { spawnSync } from 'node:child_process';

const npx = process.platform === 'win32' ? 'npx.cmd' : 'npx';
const result = spawnSync(
  npx,
  ['vercel', 'dev', '--listen', '3000', '--yes'],
  { stdio: 'inherit', shell: true, cwd: process.cwd() }
);

process.exit(result.status ?? 1);
