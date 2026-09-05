import { getAccessUser } from '@/app/access-auth';
import { runtime, run, now } from '@/db/runtime';
const list = (v: string | undefined) =>
  new Set(
    (v ?? '')
      .split(',')
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean),
  );
export async function adminIdentity() {
  const user = await getAccessUser();
  if (!user) return null;
  const e = runtime();
  return list(e.ADMIN_USER_IDS).has(user.userId.toLowerCase()) ||
    list(e.ADMIN_EMAILS).has(user.email.toLowerCase())
    ? user
    : null;
}
export async function authorizeAdmin(request: Request) {
  const user = await adminIdentity();
  if (!user)
    throw new HttpError(403, 'Bu işlem için yönetici erişimi gerekli.');
  const origin = request.headers.get('origin');
  if (origin && origin !== new URL(request.url).origin)
    throw new HttpError(403, 'Geçersiz istek kaynağı.');
  if (request.headers.get('content-type')?.split(';')[0] !== 'application/json')
    throw new HttpError(415, 'JSON isteği gerekli.');
  return user;
}
export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
export function json(value: unknown, status = 200, cache = false) {
  return Response.json(value, {
    status,
    headers: {
      'Cache-Control': cache ? 'public, max-age=30' : 'no-store',
      'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
    },
  });
}
export function failure(error: unknown) {
  return json(
    {
      error:
        error instanceof HttpError
          ? error.message
          : 'İşlem tamamlanamadı. Lütfen tekrar deneyin.',
    },
    error instanceof HttpError ? error.status : 500,
  );
}
export async function readBody(request: Request) {
  if (Number(request.headers.get('content-length') ?? 0) > 20000)
    throw new HttpError(413, 'İstek çok büyük.');
  const text = await request.text();
  if (text.length > 20000) throw new HttpError(413, 'İstek çok büyük.');
  let value;
  try {
    value = JSON.parse(text);
  } catch {
    throw new HttpError(400, 'Geçerli JSON gerekli.');
  }
  if (!value || Array.isArray(value) || typeof value !== 'object')
    throw new HttpError(400, 'Geçersiz istek.');
  return value as Record<string, unknown>;
}
async function equalSecret(a: string, b: string) {
  if (!a || !b) return false;
  const enc = new TextEncoder();
  const [aa, bb] = await Promise.all([
    crypto.subtle.digest('SHA-256', enc.encode(a)),
    crypto.subtle.digest('SHA-256', enc.encode(b)),
  ]);
  const x = new Uint8Array(aa),
    y = new Uint8Array(bb);
  let diff = 0;
  for (let i = 0; i < x.length; i++) diff |= x[i] ^ y[i];
  return diff === 0;
}
export async function authorizeInternal(request: Request, body: string) {
  const secret = runtime().INGEST_SECRET;
  if (!secret || secret.length < 32)
    throw new HttpError(503, 'Toplama bağlantısı yapılandırılmadı.');
  // Bearer is only for explicit setup/maintenance. Scheduled calls use timestamped HMAC.
  const bearer =
    request.headers.get('authorization')?.replace(/^Bearer /, '') ?? '';
  if (await equalSecret(bearer, secret)) return false;
  const timestamp = request.headers.get('x-watchtower-timestamp') ?? '',
    signature = request.headers.get('x-watchtower-signature') ?? '';
  if (
    !/^\d{13}$/.test(timestamp) ||
    Math.abs(Date.now() - Number(timestamp)) > 120000
  )
    throw new HttpError(401, 'Yetkisiz toplama isteği.');
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const bytes = await crypto.subtle.sign(
    'HMAC',
    key,
    new TextEncoder().encode(timestamp + '.' + body),
  );
  const expected = [...new Uint8Array(bytes)]
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
  if (!(await equalSecret(signature, expected)))
    throw new HttpError(401, 'Yetkisiz toplama isteği.');
  const r = await run(
    'INSERT OR IGNORE INTO state (key,value,expiresAt) VALUES (?,?,?)',
    ['nonce:' + signature, now(), new Date(Date.now() + 180000).toISOString()],
  );
  if (!r.meta.changes)
    throw new HttpError(409, 'Tekrarlanan zamanlayıcı isteği.');
  return true;
}
