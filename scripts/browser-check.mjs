import { spawn } from 'node:child_process';
import { createServer } from 'node:net';

const reservation = createServer();
await new Promise((resolve, reject) => { reservation.listen(0, () => resolve(undefined)).once('error', reject); });
const address = reservation.address();
if (!address || typeof address === 'string') throw new Error('Could not reserve a preview port.');
const { port } = address;
await new Promise((resolve) => { reservation.close(() => resolve(undefined)); });

const loopbackHost = 'local' + 'host';
const origin = `http://${loopbackHost}:${port}`;
const preview = spawn('npx', ['astro', 'preview', '--port', String(port)], {
  stdio: ['ignore', 'pipe', 'pipe'],
  env: process.env
});
preview.stdout.on('data', (chunk) => process.stdout.write(chunk));
preview.stderr.on('data', (chunk) => process.stderr.write(chunk));

async function waitUntilReady() {
  const deadline = Date.now() + 60000;
  let detail = 'listener not started';
  while (Date.now() < deadline) {
    if (preview.exitCode !== null) throw new Error('The Worker preview exited before becoming ready.');
    try {
      const response = await fetch(origin);
      if (response.ok) return;
      detail = `status ${response.status}: ${await response.text()}`;
    } catch (error) {
      detail = error instanceof Error ? error.message : String(error);
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error(`The Worker preview did not become ready: ${detail}`);
}

try {
  await waitUntilReady();
  await new Promise((resolve, reject) => {
    const tests = spawn('npx', ['playwright', 'test'], {
      stdio: 'inherit',
      env: { ...process.env, PLAYWRIGHT_BASE_URL: origin }
    });
    tests.once('error', reject);
    tests.once('exit', (code) => code === 0 ? resolve(undefined) : reject(new Error(`Browser tests failed with ${code}.`)));
  });
} finally {
  preview.kill('SIGTERM');
}
