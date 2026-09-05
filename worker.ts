import handler from 'vinext/server/fetch-handler';
import { ingestBatch, maintenance } from './lib/ingest';
import { translateBatch } from './lib/translation';
import { run, now } from './db/runtime';
import { acquireLock, releaseLock, ensureRegistry } from './lib/store';
export default {
  fetch: handler.fetch,
  async scheduled() {
    const token = await acquireLock('scheduled', 180);
    if (!token) return;
    try {
      await ensureRegistry();
      await ingestBatch();
      await translateBatch();
      await maintenance();
      await run(
        'INSERT INTO state (key,value) VALUES (?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value',
        ['scheduler:lastTick', now()],
      );
    } finally {
      await releaseLock('scheduled', token);
    }
  },
};
