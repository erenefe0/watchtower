import { build } from 'esbuild';
import { spawnSync } from 'node:child_process';
await build({
  entryPoints: ['tests/database.test.ts'],
  bundle: true,
  platform: 'node',
  format: 'esm',
  outfile: 'outputs/tests/database.mjs',
  packages: 'external',
  plugins: [
    {
      name: 'test-runtime',
      setup(b) {
        b.onResolve({ filter: /^cloudflare:workers$/ }, () => ({
          path: 'runtime',
          namespace: 'mock',
        }));
        b.onResolve({ filter: /^@\/app\/access-auth$/ }, () => ({
          path: 'auth',
          namespace: 'mock',
        }));
        b.onLoad({ filter: /.*/, namespace: 'mock' }, ({ path }) => ({
          contents:
            path === 'runtime'
              ? 'export const env = new Proxy({}, {get:(_,k)=>globalThis.__testEnv[k]});'
              : 'export const getAccessUser=async()=>null;',
        }));
      },
    },
  ],
});
const result = spawnSync(
  process.execPath,
  ['--test', 'outputs/tests/database.mjs'],
  { stdio: 'inherit' },
);
process.exitCode = result.status ?? 1;
