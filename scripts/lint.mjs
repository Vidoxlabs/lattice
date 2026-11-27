import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

const roots = ['src', 'scripts', 'tests'];
const failures = [];

function visit(path) {
  if (!statSync(path, { throwIfNoEntry: false })) return;
  for (const entry of readdirSync(path, { withFileTypes: true })) {
    const child = join(path, entry.name);
    if (entry.isDirectory()) visit(child);
    else if (/\.(?:mjs|js|astro|css|json)$/.test(entry.name)) {
      const source = readFileSync(child, 'utf8');
      if (/^(?:<{7}|={7}|>{7})/m.test(source)) failures.push(`${child}: conflict marker`);
      source.split('\n').forEach((line, index) => {
        if (/[ \t]+$/.test(line)) failures.push(`${child}:${index + 1}: trailing whitespace`);
      });
      if (/\.mjs$/.test(entry.name)) {
        const checked = spawnSync(process.execPath, ['--check', child], { encoding: 'utf8' });
        if (checked.status !== 0) failures.push(`${child}: ${checked.stderr}`);
      }
    }
  }
}

roots.forEach(visit);
if (failures.length) {
  console.error(failures.join('\n'));
  process.exit(1);
}
console.log('Lint passed.');
