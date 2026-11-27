import { execFileSync } from 'node:child_process';
import { scanPaths } from './scrub-lib.mjs';

const { failures, scanned } = scanPaths(process.argv.slice(2));
try {
  const message = execFileSync('git', ['log', '-1', '--format=%B'], { encoding: 'utf8' });
  if (/^\s*Co-authored-by:/im.test(message)) failures.push('latest commit: co-author trailer');
} catch {
  // A source archive has no Git metadata to inspect.
}

if (failures.length) {
  console.error(failures.join('\n'));
  process.exit(1);
}
console.log(`Public-safety scan passed for ${scanned} files.`);
