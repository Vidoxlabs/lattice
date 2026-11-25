import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { collectPipeline } from '../src/lib/content/pipeline.mjs';

const snapshotPath = new URL('../src/data/snapshot/pipeline.json', import.meta.url);
let snapshot = null;
try {
  snapshot = JSON.parse(await readFile(snapshotPath, 'utf8'));
} catch (error) {
  if (error.code !== 'ENOENT') throw error;
}

const pipeline = await collectPipeline({
  token: process.env.GITHUB_READ_TOKEN || '',
  snapshot
});
const generated = new URL('../src/data/generated/', import.meta.url);
await mkdir(generated, { recursive: true });
await writeFile(new URL('build-pipeline.json', generated), `${JSON.stringify(pipeline, null, 2)}\n`);
console.log(`Content bundle: manifest=${pipeline.sources.manifest}, status=${pipeline.sources.status}, snapshot=${pipeline.snapshot.used ? 'used' : 'not used'}.`);
