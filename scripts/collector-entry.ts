import { all, run, now } from '../db/runtime';
import { acquireLock, releaseLock, ensureRegistry } from '../lib/store';
import { ingestBatch, maintenance } from '../lib/ingest';

export async function collect() {
  const token = await acquireLock('scheduled', 900);
  if (!token) { console.log('Another collector is active; skipping.'); return; }
  try {
    await ensureRegistry();
    const deadline = Date.now() + 8 * 60000;
    for (let batch = 0; batch < 15 && Date.now() < deadline; batch++) {
      const due = await all('SELECT id FROM sources WHERE enabled=1 AND isCandidate=0 AND (nextFetch IS NULL OR nextFetch<=?) LIMIT 1', [now()]);
      if (!due.length) break;
      console.log(JSON.stringify(await ingestBatch()));
      await run('INSERT INTO state (key,value) VALUES (?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value', ['scheduler:lastTick', now()]);
    }
    await maintenance();
    await run('INSERT INTO state (key,value) VALUES (?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value', ['scheduler:lastTick', now()]);
  } finally { await releaseLock('scheduled', token); }
}
