import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import test from 'node:test';

function readJson(path) {
  return JSON.parse(readFileSync(path, 'utf8'));
}

test('the generated Worker bundle carries no build-machine paths', () => {
  if (!existsSync('dist/server/wrangler.json')) return;
  for (const entry of readdirSync('dist/server', { withFileTypes: true })) {
    if (!entry.isFile() || !entry.name.endsWith('.mjs')) continue;
    const source = readFileSync(`dist/server/${entry.name}`, 'utf8');
    assert.doesNotMatch(source, /\/(?:Users|home)\/[A-Za-z0-9._-]+\//, `dist/server/${entry.name} still embeds an absolute build path`);
  }
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
