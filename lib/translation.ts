import { all, first, run, runtime, now } from '@/db/runtime';
import { hash, cleanText } from './normalize';
import { acquireLock, releaseLock } from './store';
const MODEL = '@cf/meta/m2m100-1.2b';
export async function translateText(text: string, lang: string) {
  if (!text || lang === 'tr') return text;
  if (!['en', 'ar', 'fa', 'he'].includes(lang)) return null;
  const env = runtime();
  if (!env.CLOUDFLARE_ACCOUNT_ID || !env.CLOUDFLARE_AI_TOKEN) return null;
  const id = await hash(MODEL + '|' + lang + '|tr|' + text.trim());
  const cached = await first<{ translated: string }>(
    'SELECT translated FROM translations WHERE id=? AND status=?',
    [id, 'translated'],
  );
  if (cached) return cached.translated;
  const until = await first<{ value: string }>(
    'SELECT value FROM state WHERE key=?',
    ['translation:pausedUntil'],
  );
  if (until && Date.parse(until.value) > Date.now()) return null;
  const response = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${encodeURIComponent(env.CLOUDFLARE_ACCOUNT_ID)}/ai/run/${MODEL}`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.CLOUDFLARE_AI_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ text, source_lang: lang, target_lang: 'tr' }),
      signal: AbortSignal.timeout(12000),
    },
  );
  const result = (await response.json()) as {
    result?: { translated_text?: string };
    errors?: { code: number }[];
  };
  if (!response.ok) {
    const quota = result.errors?.some((e) => e.code === 3036);
    const capacity = result.errors?.some((e) => e.code === 3040);
    if (quota || response.status === 429 || capacity) {
      const reset = new Date();
      if (quota) reset.setUTCHours(24, 0, 0, 0);
      else reset.setTime(Date.now() + 300000);
      await run(
        'INSERT INTO state (key,value) VALUES (?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value',
        ['translation:pausedUntil', reset.toISOString()],
      );
    }
    return null;
  }
  const translated = cleanText(result.result?.translated_text, 1000);
  if (!translated) return null;
  await run(
    'INSERT INTO translations (id,sourceLang,original,translated,status,updatedAt) VALUES (?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET translated=excluded.translated,status=excluded.status,updatedAt=excluded.updatedAt',
    [id, lang, text, translated, 'translated', now()],
  );
  return translated;
}
export async function translateBatch() {
  if (!runtime().CLOUDFLARE_AI_TOKEN || !runtime().CLOUDFLARE_ACCOUNT_ID)
    return { status: 'connection_required', translated: 0 };
  const token = await acquireLock('translation', 90);
  if (!token) return { status: 'busy', translated: 0 };
  let count = 0;
  try {
    const events = await all<{
      id: string;
      originalTitle: string;
      originalSummary: string;
      language: string;
      translationStatus: string;
    }>(
      'SELECT id,originalTitle,originalSummary,language,translationStatus FROM events WHERE language IN (?,?,?,?) AND translationStatus!=? AND editorModified=0 AND status!=? ORDER BY sortAt DESC LIMIT 3',
      ['en', 'ar', 'fa', 'he', 'translated', 'withdrawn'],
    );
    const summaries = [];
    for (const e of events) {
      try {
        const title = await translateText(e.originalTitle, e.language);
        if (title) {
          await run(
            'UPDATE events SET title=?,translationStatus=? WHERE id=? AND editorModified=0',
            [
              title,
              e.originalSummary ? 'title_translated' : 'translated',
              e.id,
            ],
          );
          summaries.push(e);
          count++;
        }
      } catch {
        await run('UPDATE events SET translationStatus=? WHERE id=?', [
          'failed',
          e.id,
        ]);
      }
    }
    for (const e of summaries) {
      if (!e.originalSummary) continue;
      try {
        const summary = await translateText(
          e.originalSummary.slice(0, 400),
          e.language,
        );
        if (summary)
          await run(
            'UPDATE events SET summary=?,translationStatus=? WHERE id=? AND editorModified=0',
            [summary, 'translated', e.id],
          );
      } catch {
        /* Original summary remains available. */
      }
    }
    return { status: 'ok', translated: count };
  } finally {
    await releaseLock('translation', token);
  }
}
