import { all, first, run, statement, db, now } from '@/db/runtime';
import { SOURCES } from './sources';
import {
  EMPTY_EVENTS,
  type EventDetail,
  type EventRecord,
  type EventResponse,
  type SourceRecord,
} from './types';
export async function ensureRegistry() {
  await db().batch(
    SOURCES.map((s) =>
      statement(
        'INSERT OR IGNORE INTO sources (id,label,publisherGroup,language,url,kind,intervalMinutes,topics,reuse,requires,enabled,status) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)',
        [
          s.id,
          s.label,
          s.publisherGroup,
          s.language,
          s.url,
          s.kind,
          s.intervalMinutes,
          s.topics,
          s.reuse,
          s.requires ?? null,
          s.requires ? 0 : 1,
          s.requires ? 'connection_required' : 'pending',
        ],
      ),
    ),
  );
}
export async function listSources() {
  return all<SourceRecord>(
    'SELECT * FROM sources ORDER BY isCandidate, enabled DESC, publisherGroup, label',
  );
}
const columns = `e.*, (SELECT count(*) FROM event_reports r WHERE r.eventId=e.id) AS reportCount, (SELECT count(DISTINCT i.publisherGroup) FROM items i JOIN event_reports r ON r.itemId=i.id WHERE r.eventId=e.id) AS publisherCount`;
export async function eventDetail(
  id: string,
  includeWithdrawn = false,
): Promise<EventDetail | null> {
  const event = await first<EventRecord>(
    `SELECT ${columns} FROM events e WHERE e.id=? ${includeWithdrawn ? '' : "AND e.status!='withdrawn'"}`,
    [id],
  );
  if (!event) return null;
  return {
    event,
    reports: await all(
      'SELECT i.*,r.eventId FROM items i JOIN event_reports r ON r.itemId=i.id WHERE r.eventId=? ORDER BY i.publishedAt DESC,i.retrievedAt DESC',
      [id],
    ),
    history: await all(
      'SELECT id,description,createdAt FROM history WHERE eventId=? ORDER BY createdAt DESC LIMIT 50',
      [id],
    ),
  };
}
export function parseFilters(params: URLSearchParams) {
  const hours = Math.min(720, Math.max(1, Number(params.get('hours')) || 24)),
    page = Math.min(
      1000,
      Math.max(1, Math.floor(Number(params.get('page')) || 1)),
    );
  const where = ["e.status!='withdrawn'", 'e.sortAt>=?'];
  const args: unknown[] = [
    new Date(Date.now() - hours * 3600000).toISOString(),
  ];
  for (const key of ['category', 'country', 'status']) {
    const v = params.get(key);
    if (v && v !== 'all') {
      where.push(`e.${key}=?`);
      args.push(v.slice(0, 40));
    }
  }
  for (const key of ['source', 'language']) {
    const v = params.get(key);
    if (v && v !== 'all') {
      where.push(
        `EXISTS (SELECT 1 FROM event_reports er JOIN items i ON i.id=er.itemId WHERE er.eventId=e.id AND i.${key === 'source' ? 'sourceId' : 'language'}=?)`,
      );
      args.push(v.slice(0, 100));
    }
  }
  const q = (params.get('q') ?? '').slice(0, 120).trim();
  if (q) {
    where.push(
      "(e.title LIKE ? ESCAPE '\\' OR e.originalTitle LIKE ? ESCAPE '\\' OR e.place LIKE ? ESCAPE '\\')",
    );
    const search = '%' + q.replace(/[\\%_]/g, '\\$&') + '%';
    args.push(search, search, search);
  }
  return { sql: where.join(' AND '), args, page, hours };
}
export async function listEvents(
  params: URLSearchParams,
): Promise<EventResponse> {
  const f = parseFilters(params),
    w = `FROM events e WHERE ${f.sql}`;
  const total = await first<{ n: number }>(`SELECT count(*) n ${w}`, f.args);
  const pages = Math.ceil((total?.n ?? 0) / 25),
    page = Math.min(f.page, Math.max(1, pages));
  const [
    events,
    map,
    stats,
    histogram,
    last,
    sourceCount,
    tick,
    translationTick,
  ] =
    await Promise.all([
      all<EventRecord>(
        `SELECT ${columns} ${w} ORDER BY e.sortAt DESC,e.id LIMIT 25 OFFSET ?`,
        [...f.args, (page - 1) * 25],
      ),
      all<EventRecord>(
        `SELECT ${columns} ${w} AND e.lat IS NOT NULL AND e.precision!='country' ORDER BY e.sortAt DESC LIMIT 1001`,
        f.args,
      ),
      first<{ total: number; located: number; countries: number }>(
        `SELECT count(*) total,coalesce(sum(CASE WHEN e.lat IS NOT NULL AND e.precision!='country' THEN 1 ELSE 0 END),0) located,count(DISTINCT e.country) countries ${w}`,
        f.args,
      ),
      all<{ hour: string; count: number }>(
        `SELECT strftime('${f.hours > 168 ? '%Y-%m-%dT00:00:00.000Z' : '%Y-%m-%dT%H:00:00.000Z'}',e.sortAt) hour,count(*) count ${w} GROUP BY hour ORDER BY hour`,
        f.args,
      ),
      first<{ lastSuccess: string | null }>(
        'SELECT max(lastSuccess) lastSuccess FROM sources',
      ),
      first<{ n: number }>(
        'SELECT count(*) n FROM sources WHERE enabled=1 AND isCandidate=0',
      ),
      first<{ value: string }>('SELECT value FROM state WHERE key=?', [
        'scheduler:lastTick',
      ]),
      first<{ value: string }>('SELECT value FROM state WHERE key=?', [
        'translation:lastSuccess',
      ]),
    ]);
  const publishers = await first<{ n: number }>(
    `SELECT count(DISTINCT i.publisherGroup) n FROM items i JOIN event_reports r ON r.itemId=i.id WHERE r.eventId IN (SELECT e.id ${w})`,
    f.args,
  );
  return {
    events,
    total: total?.n ?? 0,
    page,
    pages,
    map: map.slice(0, 1000),
    mapTruncated: map.length > 1000,
    stats: { ...(stats ?? EMPTY_EVENTS.stats), publishers: publishers?.n ?? 0 },
    histogram,
    lastSuccess: last?.lastSuccess ?? null,
    sourceCount: sourceCount?.n ?? 0,
    connections: {
      scheduler: !!tick && Date.now() - Date.parse(tick.value) < 900000,
      translation:
        !!translationTick &&
        Date.now() - Date.parse(translationTick.value) < 86400000,
    },
  };
}
export async function acquireLock(key: string, seconds = 90) {
  const token = crypto.randomUUID(),
    time = now();
  const r = await run(
    'INSERT INTO state (key,value,expiresAt) VALUES (?,?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value,expiresAt=excluded.expiresAt WHERE state.expiresAt < ?',
    [key, token, new Date(Date.now() + seconds * 1000).toISOString(), time],
  );
  return r.meta.changes ? token : null;
}
export async function releaseLock(key: string, token: string) {
  await run('DELETE FROM state WHERE key=? AND value=?', [key, token]);
}
export async function prune() {
  const cutoff = new Date(Date.now() - 30 * 86400000).toISOString();
  await db().batch([
    statement('DELETE FROM events WHERE sortAt < ?', [cutoff]),
    statement(
      'DELETE FROM items WHERE NOT EXISTS (SELECT 1 FROM event_reports r WHERE r.itemId=items.id)',
    ),
    statement('DELETE FROM history WHERE createdAt < ?', [cutoff]),
    statement('DELETE FROM translations WHERE updatedAt < ?', [cutoff]),
    statement('DELETE FROM runs WHERE startedAt < ?', [cutoff]),
  ]);
}
