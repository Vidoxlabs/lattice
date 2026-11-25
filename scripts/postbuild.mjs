import { readFileSync, writeFileSync } from 'node:fs';

const path = 'dist/client/wrangler.json';
const generated = JSON.parse(readFileSync(path, 'utf8'));
delete generated.configPath;
delete generated.userConfigPath;
delete generated.dev;
writeFileSync(path, `${JSON.stringify(generated)}\n`);
