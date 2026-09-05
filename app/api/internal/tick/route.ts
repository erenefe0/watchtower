import { authorizeInternal, json, failure, HttpError } from '@/lib/auth';
import { ingestBatch, maintenance } from '@/lib/ingest';
import { translateBatch } from '@/lib/translation';
import { run, now } from '@/db/runtime';
export async function POST(request: Request) {
  try {
    const body = await request.text();
    if (body.length > 2000) throw new HttpError(413, 'İstek çok büyük.');
    const scheduled = await authorizeInternal(request, body);
    let payload: { action?: string; sourceId?: string };
    try {
      payload = JSON.parse(body || '{}');
    } catch {
      throw new HttpError(400, 'Geçersiz istek.');
    }
    if (scheduled)
      await run(
        'INSERT INTO state (key,value) VALUES (?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value',
        ['scheduler:lastTick', now()],
      );
    if (payload.action === 'translate') return json(await translateBatch());
    if (payload.action === 'maintenance') {
      await maintenance();
      await run('DELETE FROM state WHERE key LIKE ? AND expiresAt < ?', [
        'nonce:%',
        now(),
      ]);
      return json({ status: 'ok' });
    }
    return json({
      results: await ingestBatch(
        typeof payload.sourceId === 'string' ? payload.sourceId : undefined,
      ),
    });
  } catch (e) {
    return failure(e);
  }
}
