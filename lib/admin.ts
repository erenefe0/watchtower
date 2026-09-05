import { all, db, first, now, run, statement, runtime } from '@/db/runtime';
import { eventDetail, acquireLock, releaseLock } from './store';
import { assertPublicHttps } from './fetch-source';
import { cleanText, hash, normalized } from './normalize';
import {
  CATEGORIES,
  COUNTRIES,
  type EventRecord,
  type SourceRecord,
} from './types';
import { HttpError } from './auth';
const str = (v: unknown, max = 400) =>
  typeof v === 'string' ? cleanText(v, max) : '';
const history = (
  eventId: string,
  action: string,
  description: string,
  actor: string,
  before: unknown,
  after: unknown,
) =>
  statement(
    'INSERT INTO history (id,eventId,action,description,actor,before,after,createdAt) VALUES (?,?,?,?,?,?,?,?)',
    [
      crypto.randomUUID(),
      eventId,
      action,
      description,
      actor,
      JSON.stringify(before),
      JSON.stringify(after),
      now(),
    ],
  );
export async function updateSource(input: Record<string, unknown>) {
  const id = str(input.id, 100);
  const source = await first<SourceRecord>('SELECT * FROM sources WHERE id=?', [
    id,
  ]);
  if (!source) throw new HttpError(404, 'Kaynak bulunamadı.');
  const enabled = input.enabled === true ? 1 : 0;
  if (source.isCandidate && enabled) {
    const url = str(input.url, 2000);
    assertPublicHttps(url);
    const original = new URL(source.url);
    if (new URL(url).hostname !== original.hostname)
      throw new HttpError(
        400,
        'Akış, keşfedilen yayıncının alan adında olmalı.',
      );
    if (!str(input.reuse, 1500))
      throw new HttpError(400, 'Kullanım koşulları için not gerekli.');
    await run(
      'UPDATE sources SET url=?,kind=?,isCandidate=0,enabled=1,status=?,reuse=?,nextFetch=NULL WHERE id=?',
      [url, 'rss', 'pending', str(input.reuse, 1500), id],
    );
  } else
    await run(
      'UPDATE sources SET enabled=?,nextFetch=NULL,status=? WHERE id=?',
      [enabled, enabled ? 'pending' : 'disabled', id],
    );
  return { ok: true };
}
export async function editEvent(input: Record<string, unknown>, actor: string) {
  const id = str(input.id, 100),
    detail = await eventDetail(id, true);
  if (!detail) throw new HttpError(404, 'Olay bulunamadı.');
  const e = detail.event;
  const title = str(input.title, 400) || e.title,
    summary =
      typeof input.summary === 'string' ? str(input.summary, 600) : e.summary;
  const category =
    typeof input.category === 'string' && input.category in CATEGORIES
      ? input.category
      : e.category;
  const status = ['reported', 'reviewed', 'disputed', 'withdrawn'].includes(
    String(input.status),
  )
    ? String(input.status)
    : e.status;
  const country =
    input.country === null || input.country === ''
      ? null
      : typeof input.country === 'string' && input.country in COUNTRIES
        ? input.country
        : e.country;
  const lat =
      input.lat === null || input.lat === ''
        ? null
        : input.lat === undefined
          ? e.lat
          : Number(input.lat),
    lon =
      input.lon === null || input.lon === ''
        ? null
        : input.lon === undefined
          ? e.lon
          : Number(input.lon);
  if (
    (lat === null) !== (lon === null) ||
    (lat !== null && (!Number.isFinite(lat) || Math.abs(lat) > 90)) ||
    (lon !== null && (!Number.isFinite(lon) || Math.abs(lon) > 180))
  )
    throw new HttpError(
      400,
      'Enlem ve boylam birlikte, geçerli aralıkta girilmeli.',
    );
  const place =
    input.place === null || input.place === ''
      ? null
      : typeof input.place === 'string'
        ? str(input.place, 120)
        : e.place;
  const precision =
    lat === null
      ? country
        ? 'country'
        : 'unknown'
      : input.precision === 'exact'
        ? 'exact'
        : 'city';
  const locationBasis = str(input.locationBasis, 400) || e.locationBasis;
  const token = await acquireLock('edit:' + id, 30);
  if (!token) throw new HttpError(409, 'Olay başka bir işlemde.');
  try {
    await db().batch([
      statement(
        'UPDATE events SET title=?,summary=?,category=?,status=?,country=?,place=?,lat=?,lon=?,precision=?,locationBasis=?,editorModified=1,updatedAt=? WHERE id=?',
        [
          title,
          summary,
          category,
          status,
          country,
          place,
          lat,
          lon,
          precision,
          locationBasis,
          now(),
          id,
        ],
      ),
      history(
        id,
        'edit',
        status === 'withdrawn'
          ? 'Olay yönetici tarafından geri çekildi.'
          : 'Olay yönetici tarafından düzenlendi.',
        actor,
        e,
        {
          title,
          summary,
          category,
          status,
          country,
          place,
          lat,
          lon,
          precision,
          locationBasis,
        },
      ),
    ]);
  } finally {
    await releaseLock('edit:' + id, token);
  }
  return { ok: true, id };
}
export async function mergeEvents(
  input: Record<string, unknown>,
  actor: string,
) {
  const target = str(input.targetId, 100),
    from = str(input.fromId, 100);
  if (!target || !from || target === from)
    throw new HttpError(400, 'Birleştirmek için iki farklı olay gerekli.');
  const ids = [target, from].sort(),
    locks: Record<string, string> = {};
  try {
    for (const id of ids) {
      const token = await acquireLock('edit:' + id, 30);
      if (!token) throw new HttpError(409, 'Olay başka bir işlemde.');
      locks[id] = token;
    }
    const a = await eventDetail(target, true),
      b = await eventDetail(from, true);
    if (
      !a ||
      !b ||
      a.event.status === 'withdrawn' ||
      b.event.status === 'withdrawn'
    )
      throw new HttpError(400, 'İki etkin olay gerekli.');
    await db().batch([
      statement('UPDATE event_reports SET eventId=? WHERE eventId=?', [
        target,
        from,
      ]),
      statement('UPDATE events SET editorModified=1,updatedAt=? WHERE id=?', [
        now(),
        target,
      ]),
      statement(
        'UPDATE events SET status=?,editorModified=1,updatedAt=? WHERE id=?',
        ['withdrawn', now(), from],
      ),
      history(
        target,
        'merge',
        'Başka bir olayın bildirimleri bu olayla birleştirildi.',
        actor,
        a,
        b,
      ),
      history(
        from,
        'merge',
        'Bildirimler başka olayla birleştirildi; bu kayıt geri çekildi.',
        actor,
        b,
        { targetId: target },
      ),
    ]);
    return { ok: true, id: target };
  } finally {
    for (const [id, token] of Object.entries(locks))
      await releaseLock('edit:' + id, token);
  }
}
export async function splitReport(
  input: Record<string, unknown>,
  actor: string,
) {
  const itemId = str(input.itemId, 100),
    eventId = str(input.id, 100);
  const token = await acquireLock('edit:' + eventId, 30);
  if (!token) throw new HttpError(409, 'Olay başka bir işlemde.');
  try {
    const detail = await eventDetail(eventId, true);
    if (!detail || detail.reports.length < 2)
      throw new HttpError(400, 'Ayırmak için en az iki bildirim gerekli.');
    const item = await first<Record<string, any>>(
      'SELECT i.* FROM items i JOIN event_reports r ON r.itemId=i.id WHERE i.id=? AND r.eventId=?',
      [itemId, eventId],
    );
    if (!item) throw new HttpError(404, 'Bildirim bulunamadı.');
    const g = JSON.parse(item.data),
      id = crypto.randomUUID();
    const cols =
      'title,summary,originalTitle,originalSummary,language,category,country,place,lat,lon,precision,locationBasis,occurredAt,publishedAt,retrievedAt,updatedAt,sortAt,translationStatus,sourceLabel,url,kind,fingerprint,primaryItemId';
    const vals = (r: Record<string, any>) => {
      const p = JSON.parse(r.data);
      return [
        r.title,
        r.summary,
        r.title,
        r.summary,
        r.language,
        p.category,
        p.country,
        p.place,
        p.lat,
        p.lon,
        p.precision,
        p.locationBasis,
        r.occurredAt,
        r.publishedAt,
        r.retrievedAt,
        now(),
        r.occurredAt ?? r.publishedAt ?? r.retrievedAt,
        r.language === 'tr'
          ? 'original'
          : runtime().CLOUDFLARE_AI_TOKEN
            ? 'pending'
            : 'connection_required',
        r.sourceLabel,
        r.url,
        r.kind,
        normalized(r.title),
        r.id,
      ];
    };
    const operations = [
      statement(
        `INSERT INTO events (id,${cols},editorModified) VALUES (${Array.from({ length: 25 }, () => '?').join(',')})`,
        [id, ...vals(item), 0],
      ),
      statement(
        'UPDATE event_reports SET eventId=? WHERE itemId=? AND eventId=?',
        [id, itemId, eventId],
      ),
      history(
        eventId,
        'split',
        'Bir kaynak bildirimi ayrı olaya taşındı.',
        actor,
        { itemId },
        { newEventId: id },
      ),
      history(
        id,
        'split',
        'Başka bir olaydan ayrılan kaynak bildirimiyle oluşturuldu.',
        actor,
        { eventId },
        { itemId },
      ),
    ];
    const original = await first<{ primaryItemId: string }>(
      'SELECT primaryItemId FROM events WHERE id=?',
      [eventId],
    );
    if (original?.primaryItemId === itemId) {
      const replacement = await first<Record<string, any>>(
        'SELECT i.* FROM items i JOIN event_reports r ON r.itemId=i.id WHERE r.eventId=? AND i.id!=? ORDER BY i.publishedAt DESC LIMIT 1',
        [eventId, itemId],
      );
      if (replacement)
        operations.push(
          statement(
            `UPDATE events SET ${cols
              .split(',')
              .map((c) => c + '=?')
              .join(',')},editorModified=0 WHERE id=?`,
            [...vals(replacement), eventId],
          ),
        );
    }
    await db().batch(operations);
    return { ok: true, id };
  } finally {
    await releaseLock('edit:' + eventId, token);
  }
}
