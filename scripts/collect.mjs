import { readFileSync } from 'node:fs';
const base = process.argv[2] ?? 'http://localhost:3000';
const local = Object.fromEntries(
  readFileSync('.dev.vars', 'utf8')
    .split(/\r?\n/)
    .filter((l) => l.includes('='))
    .map((l) => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1)]),
);
const key = process.env.WATCHTOWER_INGEST_SECRET ?? local.INGEST_SECRET;
async function collect(id) {
  const r = await fetch(base + '/api/internal/tick', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: 'Bearer ' + key,
    },
    body: JSON.stringify({ sourceId: id }),
    signal: AbortSignal.timeout(90000),
  });
  const result = await r.json();
  console.log(JSON.stringify({ http: r.status, ...result }));
  if (!r.ok) throw new Error('Collection request failed.');
}
await collect('bbc-tr');
const sources = await (await fetch(base + '/api/sources')).json();
for (const s of sources.filter(
  (s) => s.enabled && !s.isCandidate && s.id !== 'bbc-tr',
))
  await collect(s.id);
const events = await (await fetch(base + '/api/events')).json();
console.log(JSON.stringify({ total: events.total, stats: events.stats }));
