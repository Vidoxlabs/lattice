import { spawn } from 'node:child_process';
import { createServer } from 'node:net';
import { existsSync } from 'node:fs';

const reservation = createServer();
await new Promise((resolve, reject) => { reservation.listen(0, () => resolve(undefined)).once('error', reject); });
const address = reservation.address();
if (!address || typeof address === 'string') throw new Error('Could not reserve a preview port.');
const { port } = address;
await new Promise((resolve) => { reservation.close(() => resolve(undefined)); });

const server = spawn('node_modules/.bin/wrangler', [
  'dev',
  ...(existsSync('dist/server/wrangler.dev.json') ? ['--config', 'dist/server/wrangler.dev.json'] : []),
  '--port',
  String(port)
], {
  stdio: ['ignore', 'pipe', 'pipe'],
  env: { ...process.env, WRANGLER_SEND_METRICS: 'false' },
  detached: true
});
server.stdout.setEncoding('utf8');
server.stderr.setEncoding('utf8');

async function stopServer() {
  if (server.exitCode === null) {
    try { process.kill(-server.pid, 'SIGTERM'); } catch { /* the group is already gone */ }
    const grace = setTimeout(() => {
      try { process.kill(-server.pid, 'SIGKILL'); } catch { /* the group is already gone */ }
    }, 2000);
    grace.unref();
    await new Promise((resolve) => server.once('exit', resolve));
  }
  server.stdout.destroy();
  server.stderr.destroy();
}

async function readServerOrigin() {
  let buffer = '';
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('The local Worker runtime did not report its address.')), 90000);
    const collect = (chunk) => {
      buffer += chunk;
      const match = buffer.match(/Ready on (https?:\/\/[^\s]+)/);
      if (match) {
        clearTimeout(timer);
        resolve(match[1]);
      }
    };
    server.stdout.on('data', collect);
    server.stderr.on('data', collect);
    server.once('exit', () => {
      clearTimeout(timer);
      reject(new Error('The local Worker runtime exited before reporting its address.'));
    });
  });
}

let exitCode = 1;
try {
  const origin = await readServerOrigin();
  exitCode = await new Promise((resolve) => {
    const tests = spawn('npx', ['playwright', 'test'], {
      stdio: 'inherit',
      env: { ...process.env, PLAYWRIGHT_BASE_URL: origin }
    });
    tests.once('error', () => resolve(1));
    tests.once('exit', (code) => resolve(code ?? 1));
  });
} finally {
  await stopServer();
}
process.exit(exitCode);
