import { mkdir, writeFile } from 'node:fs/promises';
import { collectPipeline } from '../src/lib/content/pipeline.mjs';

const capturedAt = new Date().toISOString();
const pipeline = await collectPipeline({
  token: process.env.GITHUB_READ_TOKEN || '',
  allowSnapshot: false
});
const snapshot = { ...pipeline, capturedAt };
const snapshotDirectory = new URL('../src/data/snapshot/', import.meta.url);
const generatedDirectory = new URL('../src/data/generated/', import.meta.url);
await mkdir(snapshotDirectory, { recursive: true });
await mkdir(generatedDirectory, { recursive: true });
await writeFile(new URL('pipeline.json', snapshotDirectory), `${JSON.stringify(snapshot, null, 2)}\n`);
await writeFile(new URL('build-pipeline.json', generatedDirectory), `${JSON.stringify(pipeline, null, 2)}\n`);
console.log(`Snapshot refreshed at ${capturedAt}; status=${pipeline.sources.status}.`);
