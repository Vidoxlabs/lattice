import { spawnSync } from 'node:child_process';

const steps = ['lint', 'content:build', 'typecheck', 'test:unit', 'build', 'test:built', 'scan', 'test:routes'];
for (const script of steps) {
  const result = spawnSync('npm', ['run', script], { stdio: 'inherit', env: process.env });
  if (result.status !== 0) process.exit(result.status ?? 1);
}

if (process.env.CI || process.env.WORKERS_CI) {
  const result = spawnSync('npm', ['run', 'test:browser'], { stdio: 'inherit', env: process.env });
  process.exit(result.status ?? 1);
}

console.log('Browser stage skipped locally. Set CI=1 or WORKERS_CI=1 to require Chromium and WebKit.');
