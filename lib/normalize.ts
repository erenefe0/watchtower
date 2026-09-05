import { XMLParser, XMLValidator } from 'fast-xml-parser';
import type { Category } from './types';
export type RawItem = {
  externalId: string;
  title: string;
  summary: string;
  url: string;
  language: string;
  publishedAt: string | null;
  occurredAt: string | null;
  lat: number | null;
  lon: number | null;
  placeHint?: string;
  countryHint?: string;
  kind: string;
  publisherGroup?: string;
  sourceLabel?: string;
};
export function cleanText(value: unknown, limit = 400): string {
  let s = String(value ?? '')
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ');
  const entities: Record<string, string> = {
    amp: '&',
    lt: '<',
    gt: '>',
    quot: '"',
    apos: "'",
    nbsp: ' ',
    rsquo: '’',
    lsquo: '‘',
    rdquo: '”',
    ldquo: '“',
    ndash: '–',
    mdash: '—',
  };
  s = s.replace(/&(#x[\da-f]+|#\d+|[a-z]+);/gi, (m, k: string) => {
    if (k[0] === '#') {
      const n =
        k[1] === 'x' ? parseInt(k.slice(2), 16) : parseInt(k.slice(1), 10);
      return Number.isFinite(n) && n > 0 && n <= 0x10ffff
        ? String.fromCodePoint(n)
        : '';
    }
    return entities[k.toLowerCase()] ?? m;
  });
  return s
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(
      /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u202a-\u202e\u2066-\u2069]/g,
      '',
    )
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, limit);
}
export function dateOrNull(v: unknown): string | null {
  if (v === undefined || v === null || v === '') return null;
  const d = typeof v === 'number' ? new Date(v) : new Date(String(v));
  return Number.isFinite(d.getTime()) ? d.toISOString() : null;
}
export function canonicalUrl(value: string) {
  try {
    const u = new URL(value);
    if (!['https:', 'http:'].includes(u.protocol) || u.username || u.password)
      return '';
    u.hash = '';
    for (const k of [...u.searchParams.keys()])
      if (/^(utm_|fbclid|gclid|mc_cid|mc_eid)/i.test(k))
        u.searchParams.delete(k);
    u.searchParams.sort();
    u.hostname = u.hostname.toLowerCase();
    return u.toString();
  } catch {
    return '';
  }
}
export function normalized(value: string) {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/ı/g, 'i')
    .replace(/ي/g, 'ی')
    .replace(/ك/g, 'ک')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}
export async function hash(value: string) {
  return [
    ...new Uint8Array(
      await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value)),
    ),
  ]
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}
const arr = (v: any): any[] => (v == null ? [] : Array.isArray(v) ? v : [v]);
function text(v: any): string {
  return typeof v === 'object' ? String(v?.['#text'] ?? '') : String(v ?? '');
}
const coord = (v: any): number | null => {
  if (v === undefined || v === null || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};
export function parseFeed(
  body: string,
  source: { id: string; kind: string; language: string },
): RawItem[] {
  if (source.kind === 'usgs') {
    const j = JSON.parse(body);
    return (j.features ?? [])
      .slice(0, 300)
      .map((f: any) => ({
        externalId: String(f.id),
        title: `M ${f.properties.mag} — ${cleanText(f.properties.place)}`,
        summary: `USGS deprem ölçümü. Büyüklük: ${f.properties.mag}. Derinlik: ${f.geometry.coordinates[2]} km. Ölçümler güncellenebilir.`,
        url: f.properties.url,
        language: 'tr',
        publishedAt: null,
        occurredAt: dateOrNull(f.properties.time),
        lat: coord(f.geometry.coordinates[1]),
        lon: coord(f.geometry.coordinates[0]),
        placeHint: cleanText(f.properties.place),
        kind: 'measurement',
      }));
  }
  if (source.kind === 'gdelt') {
    const j = JSON.parse(body);
    const langs: Record<string, string> = {
      English: 'en',
      Arabic: 'ar',
      Turkish: 'tr',
      Persian: 'fa',
      Farsi: 'fa',
      Hebrew: 'he',
    };
    return (j.articles ?? [])
      .slice(0, 150)
      .map((a: any) => ({
        externalId: a.url,
        title: cleanText(a.title),
        summary: '',
        url: a.url,
        language: langs[a.language] ?? 'unknown',
        publishedAt: null,
        occurredAt: null,
        lat: null,
        lon: null,
        kind: 'report',
        sourceLabel: a.domain,
      }));
  }
  if (source.kind === 'reliefweb') {
    const j = JSON.parse(body);
    return (j.data ?? []).map((a: any) => ({
      externalId: String(a.id),
      title: cleanText(a.fields.title),
      summary: '',
      url: a.fields.url,
      language:
        (
          {
            English: 'en',
            Arabic: 'ar',
            French: 'fr',
            Turkish: 'tr',
          } as Record<string, string>
        )[a.fields.language?.[0]?.name] ?? 'unknown',
      publishedAt: dateOrNull(a.fields.date?.original),
      occurredAt: null,
      lat: null,
      lon: null,
      countryHint:
        a.fields.primary_country?.iso3 ??
        a.fields.country?.find((c: any) => c.primary)?.iso3,
      sourceLabel:
        cleanText(a.fields.source?.map((v: any) => v.name).join(', ')) ||
        'ReliefWeb',
      publisherGroup: a.fields.source?.[0]?.homepage
        ? new URL(a.fields.source[0].homepage).hostname
        : 'reliefweb',
      kind: 'institutional',
    }));
  }
  if (source.kind === 'firms') {
    const lines = body.trim().split(/\r?\n/);
    const fields = lines.shift()!.split(',');
    return lines.slice(0, 150).map((line) => {
      const v = Object.fromEntries(
        line.split(',').map((s, i) => [fields[i], s]),
      );
      const t = String(v.acq_time).padStart(4, '0');
      return {
        externalId: `${v.latitude}:${v.longitude}:${v.acq_date}:${t}`,
        title: 'NASA FIRMS · Termal anomali',
        summary: `VIIRS NOAA-20 termal gözlemi. Güven sınıfı: ${v.confidence}. Bu ölçüm, yangın veya saldırı nedenini belirlemez.`,
        url: 'https://firms.modaps.eosdis.nasa.gov/map/',
        language: 'tr',
        publishedAt: null,
        occurredAt: dateOrNull(
          `${v.acq_date}T${t.slice(0, 2)}:${t.slice(2)}:00Z`,
        ),
        lat: coord(v.latitude),
        lon: coord(v.longitude),
        kind: 'thermal',
      };
    });
  }
  if (/<!DOCTYPE|<!ENTITY/i.test(body))
    throw new Error('Desteklenmeyen XML bildirimi.');
  if (XMLValidator.validate(body) !== true)
    throw new Error('Kaynak geçerli XML döndürmedi.');
  const j = new XMLParser({
    ignoreAttributes: false,
    processEntities: false,
    parseTagValue: false,
    trimValues: true,
  }).parse(body);
  const list = arr(j.rss?.channel?.item ?? j.feed?.entry ?? j['rdf:RDF']?.item);
  return list
    .slice(0, source.kind === 'gdacs' ? 450 : 100)
    .map((v) => {
      const link =
        typeof v.link === 'string'
          ? v.link
          : arr(v.link).find(
              (l) => !l['@_rel'] || l['@_rel'] === 'alternate',
            )?.['@_href'];
      const point = text(v['georss:point']).split(/\s+/);
      const lat = coord(v['geo:lat'] ?? (point.length === 2 ? point[0] : null)),
        lon = coord(v['geo:long'] ?? (point.length === 2 ? point[1] : null));
      return {
        externalId:
          cleanText(text(v.guid ?? v.id), 2000) || link || text(v.title),
        title: cleanText(text(v.title)),
        summary: cleanText(text(v.description ?? v.summary)),
        url: cleanText(link || '', 2000),
        language: source.language,
        publishedAt: dateOrNull(text(v.pubDate ?? v.published ?? v['dc:date'])),
        occurredAt:
          source.kind === 'gdacs'
            ? dateOrNull(text(v['gdacs:fromdate']))
            : null,
        lat,
        lon,
        countryHint: text(v['gdacs:iso3']),
        kind: source.kind === 'gdacs' ? 'institutional' : 'report',
      };
    })
    .filter((v) => v.title && canonicalUrl(v.url));
}
const words: Record<Category, string[]> = {
  conflict: [
    'attack',
    'strike',
    'missile',
    'war',
    'bomb',
    'killed',
    'ceasefire',
    'military',
    'saldiri',
    'savas',
    'ateskes',
    'fuze',
    'ordu',
    'oldur',
    'vuruldu',
    'هجوم',
    'قصف',
    'حرب',
    'غارة',
    'قتل',
    'حمله',
    'موشک',
    'جنگ',
    'תקיפה',
    'מלחמה',
    'טיל',
  ],
  security: [
    'security',
    'arrest',
    'border',
    'terror',
    'guvenlik',
    'gozalti',
    'sinir',
    'polis',
    'أمن',
    'اعتقال',
    'امنیت',
    'بازداشت',
    'ביטחון',
  ],
  diplomacy: [
    'diploma',
    'minister',
    'president',
    'talks',
    'summit',
    'negotiat',
    'bakan',
    'cumhurbaskani',
    'gorusme',
    'zirve',
    'anlasma',
    'وزير',
    'رئيس',
    'مفاوض',
    'مذاکر',
    'دیدار',
    'رئیس',
    'שיחות',
    'נשיא',
  ],
  protests: [
    'protest',
    'demonstration',
    'protesto',
    'gosteri',
    'احتجاج',
    'تظاهرات',
    'اعتراض',
    'מחאה',
  ],
  humanitarian: [
    'humanitarian',
    'refugee',
    'aid',
    'hunger',
    'hospital',
    'insani',
    'multeci',
    'yardim',
    'aclik',
    'hastane',
    'إنساني',
    'لاجئ',
    'مساعد',
    'نازح',
    'پناهنده',
    'کمک',
    'סיוע',
  ],
  disasters: [
    'earthquake',
    'flood',
    'wildfire',
    'storm',
    'thermal',
    'deprem',
    'sel',
    'yangin',
    'afet',
    'termal',
    'زلزال',
    'فيضانات',
    'حريق',
    'سیل',
    'زلزله',
    'רעידת',
    'שריפה',
  ],
  energy: [
    'energy',
    'oil',
    'gas',
    'petrol',
    'enerji',
    'dogalgaz',
    'pipeline',
    'نفط',
    'طاقة',
    'نفت',
    'گاز',
    'انرژی',
    'נפט',
    'אנרגיה',
  ],
  transport: [
    'shipping',
    'vessel',
    'ship',
    'port',
    'flight',
    'airport',
    'transport',
    'gemi',
    'liman',
    'ucus',
    'havalimani',
    'ulasim',
    'سفينة',
    'ميناء',
    'طيران',
    'کشتی',
    'بندر',
    'پرواز',
    'נמל',
    'טיסה',
  ],
};
export function classify(value: string, kind = 'report'): Category | null {
  if (['measurement', 'thermal'].includes(kind)) return 'disasters';
  const n = normalized(value);
  let best: Category | null = null,
    score = 0;
  for (const [c, terms] of Object.entries(words)) {
    const hits = terms.reduce((a, t) => {
      const v = normalized(t);
      const stem = v.length >= 5 ? '[\\p{L}]*' : '';
      return (
        a +
        (new RegExp(
          `(^|[^\\p{L}\\p{N}])${v}${stem}($|[^\\p{L}\\p{N}])`,
          'u',
        ).test(n)
          ? 1
          : 0)
      );
    }, 0);
    if (hits > score) {
      score = hits;
      best = c as Category;
    }
  }
  return best;
}
