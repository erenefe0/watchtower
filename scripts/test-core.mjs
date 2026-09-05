import { build } from 'esbuild';
import { spawnSync } from 'node:child_process';
await build({
  entryPoints: ['tests/core.test.ts'],
  bundle: true,
  platform: 'node',
  format: 'esm',
  outfile: 'outputs/tests/core.mjs',
  packages: 'external',
});
const result = spawnSync(
  process.execPath,
  ['--test', 'outputs/tests/core.mjs'],
  { stdio: 'inherit' },
);
process.exitCode = result.status ?? 1;
