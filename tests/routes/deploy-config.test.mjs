import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import test from 'node:test';

function readJson(path) {
  return JSON.parse(readFileSync(path, 'utf8'));
}

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
