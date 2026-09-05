import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  canonicalUrl,
  cleanText,
  parseFeed,
  classify,
  dateOrNull,
  normalized,
} from '../lib/normalize';
import { locate } from '../lib/geo';
import { assertPublicHttps } from '../lib/fetch-source';
const source = { id: 'test', kind: 'rss', language: 'en' };
test('RSS preserves missing publication date and decodes publisher URL', () => {
  const [r] = parseFeed(
    '<rss><channel><item><title>Iran flood warning</title><link>https://publisher.org/item?id=1&amp;lang=en</link><description>&lt;p&gt;A flood advisory&lt;/p&gt;</description></item></channel></rss>',
    source,
  );
  assert.equal(r.publishedAt, null);
  assert.equal(r.title, 'Iran flood warning');
  assert.equal(r.url, 'https://publisher.org/item?id=1&lang=en');
  assert.equal(r.summary, 'A flood advisory');
});
test('date parsing does not invent invalid or missing dates', () => {
  for (const s of [undefined, null, '', 'invalid'])
    assert.equal(dateOrNull(s), null);
  assert.equal(
    dateOrNull('2026-09-05T12:00:00+03:00'),
    '2026-09-05T09:00:00.000Z',
  );
});
test('Atom modification is not presented as publication', () => {
  const [r] = parseFeed(
    '<feed><entry><id>a</id><title>Iran aid</title><link href="https://publisher.org/a"/><updated>2026-09-05T12:00:00Z</updated></entry></feed>',
    source,
  );
  assert.equal(r.publishedAt, null);
});
test('source text is sanitized including encoded markup and bidi controls', () => {
  assert.equal(
    cleanText('&lt;script&gt;alert(1)&lt;/script&gt;<b>Title</b>\u202e'),
    'Title',
  );
  assert.equal(cleanText('AT&amp;T'), 'AT&T');
});
test('malicious XML entity declarations are rejected', () => {
  assert.throws(() =>
    parseFeed(
      '<!DOCTYPE rss [<!ENTITY x SYSTEM "file:///etc/passwd">]><rss/>',
      source,
    ),
  );
  assert.throws(() => parseFeed('<rss><broken>', source));
});
test('canonical links remove tracking and reject executable schemes', () => {
  assert.equal(
    canonicalUrl('https://publisher.org/a?utm_source=x&id=2#track'),
    'https://publisher.org/a?id=2',
  );
  assert.equal(canonicalUrl('javascript:alert(1)'), '');
  assert.equal(canonicalUrl('https://user:pass@publisher.org/'), '');
});
test('short category terms do not match inside unrelated words', () => {
  assert.equal(classify('Iran flood warning'), 'disasters');
  assert.equal(classify('Reports from Iran'), null);
  assert.equal(classify('Chairman said Iran won the tournament'), null);
  assert.equal(classify('Iran missile attack'), 'conflict');
  assert.equal(classify('Türkiye petrol fiyatları'), 'energy');
});
test('ambiguous places do not become precise coordinates', () => {
  const a = locate('Talks in Tehran and Baghdad', '');
  assert.equal(a.lat, null);
  assert.equal(a.precision, 'unknown');
  const b = locate('Iran flood warning', '');
  assert.equal(b.country, 'IR');
  assert.equal(b.lat, null);
});
test('single named city yields labeled centroid while provider coords stay explicit', () => {
  const a = locate('Air strike reported in Tehran', '');
  assert.equal(a.place, 'Tahran');
  assert.equal(a.precision, 'city');
  assert.match(a.locationBasis, /doğrulanmamıştır/);
  const b = locate('Iran earthquake', '', 30.3, 55.2);
  assert.equal(b.precision, 'exact');
  assert.equal(b.lat, 30.3);
});
test('foreign place names render and match without fabricated translations', () => {
  for (const name of ['تهران', 'טהרן', 'Tahran'])
    assert.equal(locate(name, '').place, 'Tahran');
  assert.equal(normalized('İran'), normalized('Iran'));
});
test('out of region observations are filtered', () => {
  assert.equal(locate('California earthquake', '', 35, -120).regional, false);
});
test('feed requests reject local networks, credentials, and alternate ports', () => {
  for (const url of [
    'http://example.org/feed',
    'https://127.0.0.1/a',
    'https://[::1]/',
    'https://x.local/feed',
    'https://localhost/',
    'https://user:pw@publisher.org/',
    'https://publisher.org:8443/',
  ])
    assert.throws(() => assertPublicHttps(url));
  assert.equal(
    assertPublicHttps('https://feeds.bbci.co.uk/turkce/rss.xml').hostname,
    'feeds.bbci.co.uk',
  );
});
test('USGS measurements keep occurrence separate from source revision', () => {
  const [r] = parseFeed(
    JSON.stringify({
      features: [
        {
          id: 'q1',
          properties: {
            mag: 3.2,
            place: 'southern Iran',
            url: 'https://earthquake.usgs.gov/earthquakes/eventpage/q1',
            time: 1788600000000,
            updated: 1788600060000,
          },
          geometry: { coordinates: [55, 30, 10] },
        },
      ],
    }),
    { ...source, kind: 'usgs' },
  );
  assert.equal(r.publishedAt, null);
  assert.equal(r.occurredAt, '2026-09-05T09:20:00.000Z');
  assert.equal(r.lat, 30);
});
