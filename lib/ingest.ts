import { all, first, run, statement, db, now, runtime } from '@/db/runtime';
import { acquireLock, ensureRegistry, releaseLock, prune } from './store';
import {
  parseFeed,
  canonicalUrl,
  cleanText,
  hash,
  normalized,
  classify,
  type RawItem,
} from './normalize';
import { locate } from './geo';
import { publisherGroup } from './sources';
import { fetchSource } from './fetch-source';
import type { EventRecord, SourceRecord, Category } from './types';
type Source = SourceRecord & {
  requires: string | null;
  etag: string | null;
  lastModified: string | null;
  failures: number;
};
export function similar(a: string, b: string) {
  const aa = new Set(
      normalized(a)
        .split(' ')
        .filter((s) => s.length > 2),
    ),
    bb = new Set(
      normalized(b)
        .split(' ')
        .filter((s) => s.length > 2),
    );
  if (aa.size < 6 || bb.size < 6) return false;
  const na = a.match(/\d+/g)?.join(',') ?? '',
    nb = b.match(/\d+/g)?.join(',') ?? '';
  if (na !== nb) return false;
  const overlap = [...aa].filter((s) => bb.has(s)).length;
  return overlap / new Set([...aa, ...bb]).size >= 0.88;
}
async function discover(raw: RawItem) {
  const group = publisherGroup(raw.url);
  if (group === 'unknown') return;
  const id = 'discovered-' + (await hash(group)).slice(0, 18);
  await run(
    'INSERT OR IGNORE INTO sources (id,label,publisherGroup,language,url,kind,intervalMinutes,topics,reuse,enabled,status,isCandidate) VALUES (?,?,?,?,?,?,?,?,?,0,?,1)',
    [
      id,
      raw.sourceLabel || group,
      group,
      raw.language,
      new URL(raw.url).origin,
      'candidate',
      30,
      '',
      'GDELT üzerinden bulundu. Doğrudan akış ve kullanım koşulları yönetici tarafından incelenmeli.',
      'candidate',
    ],
  );
}
async function writeItem(raw: RawItem, source: Source) {
  raw.url = canonicalUrl(cleanText(raw.url, 2000));
  raw.externalId = cleanText(raw.externalId, 2000);
  if (!raw.url || !raw.title) return false;
  const geo = locate(raw.title, raw.summary, raw.lat, raw.lon, raw.countryHint);
  if (!geo.regional) return false;
  const category =
    classify(`${raw.title} ${raw.summary}`, raw.kind) ??
    (source.kind === 'gdacs' ? 'disasters' : null);
  if (!category) return false;
  const time = now(),
    observed = raw.occurredAt ?? raw.publishedAt;
  if (
    observed &&
    (Date.parse(observed) < Date.now() - 30 * 86400000 ||
      Date.parse(observed) > Date.now() + 3600000)
  )
    return false;
  const id = (await hash(source.id + '|' + raw.externalId)).slice(0, 32),
    contentHash = await hash(JSON.stringify(raw));
  const old = await first<{
    contentHash: string;
    retrievedAt: string;
    eventId: string;
  }>(
    'SELECT i.contentHash,i.retrievedAt,r.eventId FROM items i LEFT JOIN event_reports r ON r.itemId=i.id WHERE i.id=?',
    [id],
  );
  if (old?.contentHash === contentHash) return false;
  const group = raw.publisherGroup ?? publisherGroup(raw.url),
    sourceLabel = raw.sourceLabel || source.label;
  const existing = old?.eventId
    ? { id: old.eventId }
    : ['thermal', 'measurement'].includes(raw.kind)
      ? null
      : await first<{ id: string }>(
          'SELECT r.eventId id FROM items i JOIN event_reports r ON r.itemId=i.id JOIN events e ON e.id=r.eventId WHERE i.canonicalUrl=? LIMIT 1',
          [raw.url],
        );
  let eventId = existing?.id;
  const fingerprint = await hash(normalized(raw.title));
  if (!eventId && raw.publishedAt && geo.place) {
    const candidates = await all<{
      id: string;
      originalTitle: string;
      language: string;
    }>(
      'SELECT id,originalTitle,language FROM events WHERE category=? AND place=? AND country=? AND publishedAt BETWEEN ? AND ? AND status=? LIMIT 40',
      [
        category,
        geo.place,
        geo.country,
        new Date(Date.parse(raw.publishedAt) - 21600000).toISOString(),
        new Date(Date.parse(raw.publishedAt) + 21600000).toISOString(),
        'reported',
      ],
    );
    eventId = candidates.find(
      (c) => c.language === raw.language && similar(raw.title, c.originalTitle),
    )?.id;
  }
  const freshEvent = !eventId;
  if (!eventId) eventId = crypto.randomUUID();
  const data = { ...geo, category, kind: raw.kind };
  const itemStmt = statement(
    'INSERT INTO items (id,sourceId,externalId,sourceLabel,publisherGroup,title,summary,url,canonicalUrl,language,publishedAt,occurredAt,retrievedAt,updatedAt,kind,contentHash,data) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET title=excluded.title,summary=excluded.summary,url=excluded.url,canonicalUrl=excluded.canonicalUrl,publishedAt=excluded.publishedAt,occurredAt=excluded.occurredAt,updatedAt=excluded.updatedAt,contentHash=excluded.contentHash,data=excluded.data',
    [
      id,
      source.id,
      raw.externalId,
      sourceLabel,
      group,
      raw.title,
      raw.summary,
      raw.url,
      raw.url,
      raw.language,
      raw.publishedAt,
      raw.occurredAt,
      old?.retrievedAt ?? time,
      time,
      raw.kind,
      contentHash,
      JSON.stringify(data),
    ],
  );
  const values = [
    raw.title,
    raw.summary,
    raw.title,
    raw.summary,
    raw.language,
    category,
    geo.country,
    geo.place,
    geo.lat,
    geo.lon,
    geo.precision,
    geo.locationBasis,
    raw.occurredAt,
    raw.publishedAt,
    old?.retrievedAt ?? time,
    time,
    raw.occurredAt ?? raw.publishedAt ?? old?.retrievedAt ?? time,
    raw.language === 'tr'
      ? 'original'
      : runtime().CLOUDFLARE_AI_TOKEN
        ? 'pending'
        : 'connection_required',
    sourceLabel,
    raw.url,
    raw.kind,
    fingerprint,
    id,
  ];
  const stmts = [itemStmt];
  if (freshEvent)
    stmts.push(
      statement(
        'INSERT INTO events (id,title,summary,originalTitle,originalSummary,language,category,country,place,lat,lon,precision,locationBasis,occurredAt,publishedAt,retrievedAt,updatedAt,sortAt,translationStatus,sourceLabel,url,kind,fingerprint,primaryItemId) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)',
        [eventId, ...values],
      ),
    );
  else if (old)
    stmts.push(
      statement(
        'UPDATE events SET title=?,summary=?,originalTitle=?,originalSummary=?,language=?,category=?,country=?,place=?,lat=?,lon=?,precision=?,locationBasis=?,occurredAt=?,publishedAt=?,retrievedAt=?,updatedAt=?,sortAt=?,translationStatus=?,sourceLabel=?,url=?,kind=?,fingerprint=?,primaryItemId=? WHERE id=? AND primaryItemId=? AND editorModified=0',
        [...values, eventId, id],
      ),
    );
  stmts.push(
    statement(
      'INSERT OR IGNORE INTO event_reports (itemId,eventId) VALUES (?,?)',
      [id, eventId],
    ),
  );
  if (old && old.contentHash !== contentHash)
    stmts.push(
      statement(
        'INSERT INTO history (id,eventId,action,description,actor,createdAt) VALUES (?,?,?,?,?,?)',
        [
          crypto.randomUUID(),
          eventId,
          'source_update',
          'Kaynak bildirimi güncellendi.',
          'source:' + source.id,
          time,
        ],
      ),
    );
  await db().batch(stmts);
  if (source.kind === 'gdelt') await discover(raw);
  return true;
}
function sourceUrl(s: Source) {
  const env = runtime();
  if (s.kind === 'reliefweb') {
    if (!env.RELIEFWEB_APPNAME)
      throw new Error('ReliefWeb bağlantısı bekleniyor.');
    return (
      s.url +
      '?' +
      new URLSearchParams({
        appname: env.RELIEFWEB_APPNAME,
        limit: '50',
        preset: 'latest',
        profile: 'list',
      })
    );
  }
  if (s.kind === 'firms') {
    if (!env.FIRMS_MAP_KEY) throw new Error('FIRMS bağlantısı bekleniyor.');
    return `https://firms.modaps.eosdis.nasa.gov/api/area/csv/${encodeURIComponent(env.FIRMS_MAP_KEY)}/VIIRS_NOAA20_NRT/24,12,64,44/1`;
  }
  return s.url;
}
export async function ingestSource(s: Source) {
  const lock = await acquireLock('source:' + s.id, 90);
  if (!lock) return { source: s.id, status: 'busy', accepted: 0 };
  const runId = crypto.randomUUID(),
    started = now();
  await run(
    'INSERT INTO runs (id,sourceId,startedAt,status) VALUES (?,?,?,?)',
    [runId, s.id, started, 'running'],
  );
  // Advance before external work so a terminated invocation cannot starve other feeds.
  await run('UPDATE sources SET lastAttempt=?,nextFetch=? WHERE id=?', [
    started, new Date(Date.now() + s.intervalMinutes * 60000).toISOString(), s.id,
  ]);
  try {
    if (
      s.requires &&
      !runtime()[s.requires as keyof ReturnType<typeof runtime>]
    ) {
      await run('UPDATE sources SET status=?,enabled=0 WHERE id=?', [
        'connection_required',
        s.id,
      ]);
      throw new Error('Bağlantı bilgileri eksik.');
    }
    const headers: Record<string, string> = {};
    if (s.etag) headers['If-None-Match'] = s.etag;
    if (s.lastModified) headers['If-Modified-Since'] = s.lastModified;
    const response = await fetchSource(sourceUrl(s), headers);
    const records = response.status === 304 ? [] : parseFeed(response.body, s);
    let accepted = 0;
    for (const raw of records) {
      if (await writeItem(raw, s)) accepted++;
    }
    const message =
      s.kind === 'gdelt' && records.length >= 150
        ? 'Sonuç sınırına ulaşıldı; kapsam kısmi olabilir.'
        : null;
    await db().batch([
      statement(
        'UPDATE sources SET status=?,lastSuccess=?,lastError=?,failures=0,nextFetch=?,etag=?,lastModified=?,itemCount=itemCount+? WHERE id=?',
        [
          'ok',
          now(),
          message,
          new Date(Date.now() + s.intervalMinutes * 60000).toISOString(),
          response.etag ?? s.etag,
          response.lastModified ?? s.lastModified,
          accepted,
          s.id,
        ],
      ),
      statement(
        'UPDATE runs SET finishedAt=?,status=?,received=?,accepted=?,message=? WHERE id=?',
        [now(), 'ok', records.length, accepted, message, runId],
      ),
    ]);
    return { source: s.id, status: 'ok', received: records.length, accepted };
  } catch (error) {
    const message =
      error instanceof Error &&
      /Kaynak|XML|yönlendirme|bilgileri|bağlantısı|HTTPS/.test(error.message)
        ? error.message
        : 'Kaynağa ulaşılamadı veya yanıt işlenemedi.';
    await db().batch([
      statement(
        'UPDATE sources SET status=?,lastError=?,failures=failures+1,nextFetch=? WHERE id=?',
        [
          s.requires &&
          !runtime()[s.requires as keyof ReturnType<typeof runtime>]
            ? 'connection_required'
            : 'error',
          message,
          new Date(
            Date.now() +
              Math.min(360, 5 * 2 ** Math.min(s.failures, 6)) * 60000,
          ).toISOString(),
          s.id,
        ],
      ),
      statement('UPDATE runs SET finishedAt=?,status=?,message=? WHERE id=?', [
        now(),
        'error',
        message,
        runId,
      ]),
    ]);
    return { source: s.id, status: 'error', accepted: 0, message };
  } finally {
    await releaseLock('source:' + s.id, lock);
  }
}
export async function ingestBatch(sourceId?: string) {
  await ensureRegistry();
  const selected = sourceId
    ? await all<Source>(
        'SELECT * FROM sources WHERE id=? AND enabled=1 AND isCandidate=0',
        [sourceId],
      )
    : await all<Source>(
        'SELECT * FROM sources WHERE enabled=1 AND isCandidate=0 AND (nextFetch IS NULL OR nextFetch<=?) ORDER BY nextFetch,lastAttempt LIMIT 2',
        [now()],
      );
  if (sourceId && !selected.length)
    throw new Error('Kaynak etkin değil veya bulunamadı.');
  const results = [];
  for (const source of selected) results.push(await ingestSource(source));
  return results;
}
export async function maintenance() {
  const last = await first<{ value: string }>(
    'SELECT value FROM state WHERE key=?',
    ['maintenance:last'],
  );
  if (!last || Date.now() - Date.parse(last.value) > 86400000) {
    await prune();
    await run(
      'INSERT INTO state (key,value) VALUES (?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value',
      ['maintenance:last', now()],
    );
  }
}
