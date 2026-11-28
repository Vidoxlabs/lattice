import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
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
// The bundle records when it was built, so the pages and the status API can
// label every build-time value with the date it comes from.
pipeline.builtAt = new Date().toISOString();
const generated = new URL('../src/data/generated/', import.meta.url);
await mkdir(generated, { recursive: true });
// The layout runs inside the prerender bundle, where the project directory is
// not readable, so the brand inventory is generated here and imported.
const brandFiles = (await readdir(new URL('../public/brand/', import.meta.url))).filter((file) => file.endsWith('.svg')).sort();
await writeFile(new URL('brand-files.json', generated), `${JSON.stringify({ files: brandFiles }, null, 2)}\n`);
await writeFile(new URL('build-pipeline.json', generated), `${JSON.stringify(pipeline, null, 2)}\n`);
await writeFile(new URL('../src/data/docs-index.json', import.meta.url), `${JSON.stringify(pipeline.docsIndex, null, 2)}\n`);
console.log(`Content bundle: manifest=${pipeline.sources.manifest}, status=${pipeline.sources.status}, docs=${pipeline.docsPages.length} pages, snapshot=${pipeline.snapshot.used ? 'used' : 'not used'}.`);
