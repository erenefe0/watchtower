import {
  adminIdentity,
  authorizeAdmin,
  failure,
  json,
  readBody,
  HttpError,
} from '@/lib/auth';
import { ensureRegistry, listSources, eventDetail } from '@/lib/store';
import { all, first, runtime } from '@/db/runtime';
import { ingestBatch } from '@/lib/ingest';
import { translateBatch } from '@/lib/translation';
import { editEvent, mergeEvents, splitReport, updateSource } from '@/lib/admin';
export async function GET(request: Request) {
  try {
    const user = await adminIdentity();
    if (!user) throw new HttpError(403, 'Yönetici erişimi gerekli.');
    await ensureRegistry();
    const id = new URL(request.url).searchParams.get('event');
    if (id) return json(await eventDetail(id, true));
    const [schedulerTick, translationTick] = await Promise.all([
      first<{ value: string }>('SELECT value FROM state WHERE key=?', [
        'scheduler:lastTick',
      ]),
      first<{ value: string }>('SELECT value FROM state WHERE key=?', [
        'translation:lastSuccess',
      ]),
    ]);
    return json({
      sources: await listSources(),
      events: await all(
        'SELECT id,title,status,sourceLabel FROM events ORDER BY updatedAt DESC LIMIT 80',
      ),
      runs: await all('SELECT * FROM runs ORDER BY startedAt DESC LIMIT 30'),
      connections: {
        translation:
          !!runtime().AI ||
          (!!translationTick &&
            Date.now() - Date.parse(translationTick.value) < 86400000),
        reliefweb: !!runtime().RELIEFWEB_APPNAME,
        firms: !!runtime().FIRMS_MAP_KEY,
        scheduler:
          !!schedulerTick &&
          Date.now() - Date.parse(schedulerTick.value) < 900000,
      },
    });
  } catch (e) {
    return failure(e);
  }
}
export async function POST(request: Request) {
  try {
    const user = await authorizeAdmin(request),
      body = await readBody(request);
    switch (body.action) {
      case 'refresh':
        return json({
          results: await ingestBatch(
            typeof body.sourceId === 'string' ? body.sourceId : undefined,
          ),
        });
      case 'translate':
        return json(await translateBatch());
      case 'source':
        return json(await updateSource(body));
      case 'edit':
        return json(await editEvent(body, user.userId));
      case 'merge':
        return json(await mergeEvents(body, user.userId));
      case 'split':
        return json(await splitReport(body, user.userId));
      default:
        throw new HttpError(400, 'Bilinmeyen işlem.');
    }
  } catch (e) {
    return failure(e);
  }
}
