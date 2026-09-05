import { existsSync, writeFileSync, readFileSync } from 'node:fs';
import { randomBytes } from 'node:crypto';
if (!existsSync('.dev.vars')) {
  const text = readFileSync('.env.example', 'utf8').replace(
    'INGEST_SECRET=',
    'INGEST_SECRET=' + randomBytes(32).toString('hex'),
  );
  writeFileSync('.dev.vars', text);
  writeFileSync('.env', text);
  console.log('Local runtime settings initialized. Secrets were not printed.');
} else console.log('Existing local settings preserved.');
