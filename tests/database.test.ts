import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import { ensureRegistry, eventDetail, listEvents } from '../lib/store';
import { ingestSource } from '../lib/ingest';
import { mergeEvents, splitReport, editEvent } from '../lib/admin';
const sqlite = new DatabaseSync(':memory:');
sqlite.exec(readFileSync('drizzle/0000_yummy_ghost_rider.sql', 'utf8'));
sqlite.exec('PRAGMA foreign_keys=ON');
class Statement {
  args: any[] = [];
  constructor(public sql: string) {}
  bind(...args: any[]) {
    this.args = args;
    return this;
  }
  async all() {
    return { results: sqlite.prepare(this.sql).all(...this.args) };
  }
  async first() {
    return sqlite.prepare(this.sql).get(...this.args) ?? null;
  }
  async run() {
    const r = sqlite.prepare(this.sql).run(...this.args);
    return { meta: { changes: Number(r.changes) } };
  }
}
(globalThis as any).__testEnv = {
  DB: {
    prepare: (s: string) => new Statement(s),
    batch: async (statements: Statement[]) => {
      sqlite.exec('BEGIN');
      try {
        const results = [];
        for (const s of statements) results.push(await s.run());
        sqlite.exec('COMMIT');
        return results;
      } catch (e) {
        sqlite.exec('ROLLBACK');
        throw e;
      }
    },
  },
};
test('persistent ingestion is idempotent; editor merge, split, withdrawal and history remain coherent', async () => {
  await ensureRegistry();
  const source = sqlite
    .prepare("SELECT * FROM sources WHERE id='bbc-tr'")
    .get() as any;
  let body = '';
  globalThis.fetch = async () =>
    new Response(body, { headers: { 'content-type': 'application/rss+xml' } });
  const feed = (
    id: string,
    title: string,
    url = 'https://publisher.org/' + id,
  ) =>
    `<rss><channel><item><guid>${id}</guid><title>${title}</title><link>${url}</link></item></channel></rss>`;
  body = feed('one', 'Tahran füze saldırısı');
  assert.equal((await ingestSource(source)).accepted, 1);
  assert.equal((await ingestSource(source)).accepted, 0);
  body = feed('two', 'Bağdat petrol hattında yangın');
  assert.equal((await ingestSource(source)).accepted, 1);
  const initial = await listEvents(new URLSearchParams());
  assert.equal(initial.total, 2);
  const a = initial.events.find((e) => e.place === 'Tahran')!,
    b = initial.events.find((e) => e.id !== a.id)!;
  await mergeEvents({ targetId: a.id, fromId: b.id }, 'test');
  assert.equal((await listEvents(new URLSearchParams())).total, 1);
  let detail = (await eventDetail(a.id))!;
  assert.equal(detail.reports.length, 2);
  assert.equal(await eventDetail(b.id), null);
  const split = await splitReport(
    {
      id: a.id,
      itemId: detail.reports.find((r) => r.title.includes('Bağdat'))!.id,
    },
    'test',
  );
  assert.equal((await listEvents(new URLSearchParams())).total, 2);
  assert.equal((await eventDetail(split.id))!.reports.length, 1);
  await editEvent({ id: a.id, status: 'withdrawn' }, 'test');
  body = feed('mirror', 'Tahran füze saldırısı', 'https://publisher.org/one');
  assert.equal((await ingestSource(source)).accepted, 1);
  assert.equal(await eventDetail(a.id), null);
  assert.equal((await listEvents(new URLSearchParams())).total, 1);
  assert.ok((await eventDetail(a.id, true))!.history.length >= 3);
  assert.equal(sqlite.prepare('PRAGMA foreign_key_check').all().length, 0);
});
