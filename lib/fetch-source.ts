export function assertPublicHttps(value: string) {
  const u = new URL(value);
  const host = u.hostname.toLowerCase();
  if (
    u.protocol !== 'https:' ||
    u.username ||
    u.password ||
    (u.port && u.port !== '443') ||
    !host.includes('.') ||
    host.includes(':') ||
    /^[\d.]+$/.test(host) ||
    /(^|\.)(localhost|local|internal|test|invalid|example)$/.test(host) ||
    host.endsWith('.localdomain') ||
    host.endsWith('.localhost')
  )
    throw new Error('Herkese açık HTTPS kaynak adresi gerekli.');
  return u;
}
export async function fetchSource(
  url: string,
  headers: Record<string, string> = {},
) {
  const initial = assertPublicHttps(url);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 12000);
  let current = url;
  try {
    for (let hop = 0; hop < 4; hop++) {
      const u = assertPublicHttps(current);
      if (u.hostname !== initial.hostname)
        throw new Error('Kaynak başka alan adına yönlendirdi.');
      const r = await fetch(current, {
        headers: {
          Accept:
            'application/rss+xml, application/atom+xml, application/xml, text/xml, application/json, text/csv;q=0.9, */*;q=0.1',
          'User-Agent':
            'Watchtower/1.0 (+https://github.com/erenefe0/watchtower)',
          ...headers,
        },
        redirect: 'manual',
        signal: controller.signal,
      });
      if (r.status === 304)
        return {
          body: '',
          status: 304,
          etag: r.headers.get('etag'),
          lastModified: r.headers.get('last-modified'),
        };
      if ([301, 302, 303, 307, 308].includes(r.status)) {
        const to = r.headers.get('location');
        await r.body?.cancel();
        if (!to) throw new Error('Geçersiz yönlendirme.');
        current = new URL(to, current).toString();
        continue;
      }
      if (!r.ok) {
        await r.body?.cancel();
        throw new Error(`Kaynak HTTP ${r.status} döndürdü.`);
      }
      if (Number(r.headers.get('content-length') ?? 0) > 2500000) {
        await r.body?.cancel();
        throw new Error('Kaynak yanıtı boyut sınırını aştı.');
      }
      if (!r.body) throw new Error('Kaynak boş yanıt döndürdü.');
      const reader = r.body.getReader();
      const chunks: Uint8Array[] = [];
      let length = 0;
      while (true) {
        const part = await reader.read();
        if (part.done) break;
        length += part.value.byteLength;
        if (length > 2500000) {
          await reader.cancel();
          throw new Error('Kaynak yanıtı boyut sınırını aştı.');
        }
        chunks.push(part.value);
      }
      const bytes = new Uint8Array(length);
      let offset = 0;
      for (const chunk of chunks) {
        bytes.set(chunk, offset);
        offset += chunk.length;
      }
      return {
        body: new TextDecoder().decode(bytes),
        status: r.status,
        etag: r.headers.get('etag'),
        lastModified: r.headers.get('last-modified'),
      };
    }
    throw new Error('Çok fazla yönlendirme.');
  } finally {
    clearTimeout(timer);
  }
}
