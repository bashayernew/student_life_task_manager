/**
 * Vite dev server for `vercel dev` (devCommand). Uses PORT from Vercel CLI.
 */
import { spawnSync } from 'node:child_process';

const port = process.env.PORT || '5173';
const npx = process.platform === 'win32' ? 'npx.cmd' : 'npx';
const result = spawnSync(
  npx,
  ['vite', '--port', port, '--host', '0.0.0.0'],
  { stdio: 'inherit', shell: true, cwd: process.cwd() }
);

process.exit(result.status ?? 1);
