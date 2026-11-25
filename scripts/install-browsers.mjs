import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { chromium, webkit } from '@playwright/test';

// Install the two engines the browser stage runs, then prove both start.
//
// `--with-deps` installs the operating-system libraries through the system
// package manager, which needs root. A GitHub-hosted runner has it. The
// Cloudflare Workers Builds image publishes no root access and no package
// install step, so there the binaries are installed without it and both engines
// are launched once: a missing library fails here, naming the library, rather
// than surfacing later as a confusing test error or as a stage that did nothing.
const installWithDeps = process.platform === 'linux' && !process.env.WORKERS_CI;
const binary = 'node_modules/.bin/playwright';

if (!existsSync(binary)) {
  console.error('Playwright is not installed. Run npm ci before the browser stage.');
  process.exit(1);
}

const args = ['install', ...(installWithDeps ? ['--with-deps'] : []), 'chromium', 'webkit'];
const install = spawnSync(binary, args, { stdio: 'inherit', env: process.env });
if (install.status !== 0) {
  console.error(`The browser install failed (exit ${install.status ?? 'unknown'}). The stage does not continue without both engines.`);
  process.exit(install.status ?? 1);
}

const engines = [
  { name: 'Chromium', type: chromium },
  { name: 'WebKit', type: webkit }
];
const failures = [];
for (const engine of engines) {
  try {
    const browser = await engine.type.launch({ headless: true });
    const page = await browser.newPage();
    await page.setContent('<!doctype html><title>browser stage</title>');
    await browser.close();
  } catch (error) {
    failures.push(`${engine.name}: ${error instanceof Error ? error.message : String(error)}`);
  }
}

if (failures.length > 0) {
  console.error('An installed browser could not start:');
  for (const failure of failures) console.error(`  ${failure}`);
  console.error('Install the missing system libraries, or deploy through the GitHub Actions workflow (SETUP.md section 2).');
  process.exit(1);
}

console.log(`Chromium and WebKit are installed${installWithDeps ? ' with their system dependencies' : ''} and both start.`);
