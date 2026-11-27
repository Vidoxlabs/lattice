import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import test from 'node:test';
import { pathToFileURL } from 'node:url';

function readJson(path) {
  return JSON.parse(readFileSync(path, 'utf8'));
}

const projectRoot = process.cwd().replace(/[\\/]+$/, '');
const projectUrl = pathToFileURL(projectRoot).href;

/**
 * Every generated Worker module, including the framework's chunk directory.
 * @param {string} directory
 * @returns {string[]}
 */
function bundleModules(directory) {
  const modules = [];
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const path = `${directory}/${entry.name}`;
    if (entry.isDirectory()) modules.push(...bundleModules(path));
    else if (entry.name.endsWith('.mjs')) modules.push(path);
  }
  return modules;
}

test('the generated Worker bundle carries no build-machine paths', () => {
  if (!existsSync('dist/server/wrangler.json')) return;
  const modules = bundleModules('dist/server');
  assert.ok(modules.length > 0, 'the Worker deploy must ship at least one module');
  for (const path of modules) {
    const source = readFileSync(path, 'utf8');
    // The checkout can live anywhere with any folder name, so the assertion is
    // against this build's actual root rather than a home-directory pattern.
    assert.equal(source.includes(projectRoot), false, `${path} still embeds this checkout's absolute path`);
    assert.equal(source.includes(projectUrl), false, `${path} still embeds this checkout's file URL`);
    assert.doesNotMatch(source, /\/(?:Users|home)\/[A-Za-z0-9._-]+\//, `${path} still embeds another machine's home path`);
    assert.doesNotMatch(source, /\bworkers\.dev\b/i, `${path} still embeds a preview host`);
    assert.doesNotMatch(source, /\bdash\.cloudflare\.com\b/i, `${path} still embeds a hosting dashboard`);
  }
});

test('the deploy configuration carries the production custom domains only', () => {
  const source = readFileSync('wrangler.jsonc', 'utf8');
  const committed = JSON.parse(source.replace(/^\s*\/\/.*$/gm, ''));
  assert.equal(committed.workers_dev, false, 'the developer subdomain stays off');
  const config = readJson('dist/server/wrangler.json');
  assert.equal(config.workers_dev, false);
  // The committed value is the only place the preview switch is decided, so the
  // test follows it: a preview address is public on the account's shared Workers
  // subdomain unless Cloudflare Access protects it, and SETUP.md carries the
  // owner step. Turning it back on is a one-line change that this test reads.
  assert.equal(typeof committed.preview_urls, 'boolean', 'the preview setting is stated rather than inherited from a default');
  assert.equal(config.preview_urls, committed.preview_urls, 'the built configuration follows the committed preview setting');
  const patterns = (config.routes ?? []).map((route) => route.pattern).sort();
  assert.deepEqual(patterns, ['vidoxlabs.com', 'vidoxlabs.dev', 'www.vidoxlabs.com', 'www.vidoxlabs.dev']);
  assert.ok((config.routes ?? []).every((route) => route.custom_domain === true), 'each host is a custom domain');
  // The local runtime serves a configured custom domain itself and rewrites the
  // request host, which would hide the canonical-host redirect from the browser
  // stage, so the browser stage runs a copy without routes.
  const dev = readJson('dist/server/wrangler.dev.json');
  assert.ok(!('routes' in dev) && !('route' in dev), 'the local runtime copy carries no custom-domain routes');
  assert.equal(dev.main, 'host-entry.mjs');
  assert.equal(dev.assets.run_worker_first, true);
  assert.deepEqual(dev.vars, config.vars, 'the local copy keeps the same variables');
});

test('the generated deploy configuration is sanitized and host-checked', () => {
  if (existsSync('dist/server/wrangler.json')) {
    const config = readJson('dist/server/wrangler.json');
    assert.equal(config.main, 'host-entry.mjs');
    assert.equal(config.assets.run_worker_first, true);
    for (const key of ['configPath', 'userConfigPath', 'dev']) assert.ok(!(key in config), `${key} must not be published`);
    const entry = readFileSync('dist/server/host-entry.mjs', 'utf8');
    assert.match(entry, /import server from '\.\/entry\.mjs'/);
    assert.match(entry, /import \{ canonicalRedirect \} from '\.\/host\.mjs'/);
    assert.match(entry, /Response\.redirect\(destination, 301\)/);
  } else {
    assert.ok(existsSync('dist/client/wrangler.json'), 'No deploy configuration was generated.');
    const config = readJson('dist/client/wrangler.json');
    for (const key of ['configPath', 'userConfigPath', 'dev']) assert.ok(!(key in config), `${key} must not be published`);
    assert.ok(!('run_worker_first' in (config.assets ?? {})), 'run_worker_first requires a Worker script');
    assert.ok(!('main' in config), 'an assets-only deploy has no Worker entry');
  }
});
