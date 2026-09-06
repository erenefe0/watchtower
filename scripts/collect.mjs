import { build } from 'esbuild';
import { createD1 } from './d1-http.mjs';
import { readFileSync } from 'node:fs';
const config = JSON.parse(readFileSync('wrangler.jsonc', 'utf8'));
globalThis.__collectorEnv = { DB: createD1({
  accountId: process.env.CLOUDFLARE_ACCOUNT_ID,
  databaseId: config.d1_databases.find(d => d.binding === 'DB').database_id,
  token: process.env.CLOUDFLARE_API_TOKEN,
}) };
await build({
  entryPoints: ['scripts/collector-entry.ts'], bundle: true, platform: 'node', format: 'esm',
  outfile: 'outputs/collector.mjs', packages: 'external',
  plugins: [{ name: 'collector-runtime', setup(b) {
    b.onResolve({ filter: /^cloudflare:workers$/ }, () => ({ path: 'runtime', namespace: 'collector' }));
    b.onLoad({ filter: /.*/, namespace: 'collector' }, () => ({ contents: 'export const env = globalThis.__collectorEnv;' }));
  } }],
});
await (await import('../outputs/collector.mjs')).collect();
