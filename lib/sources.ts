export type SourceDefinition = {
  id: string;
  label: string;
  publisherGroup: string;
  language: string;
  url: string;
  kind: string;
  intervalMinutes: number;
  topics: string;
  requires?: string;
  reuse: string;
};
const newsReuse =
  'Yayıncıya atıf ve özgün bağlantı. Yalnızca akışın sağladığı başlık ve kısa açıklama; tam metin veya medya arşivlenmez. Yayıncı koşulları geçerlidir.';
const rss = (
  id: string,
  label: string,
  publisherGroup: string,
  language: string,
  url: string,
  topics = 'conflict,diplomacy,humanitarian,security',
  intervalMinutes = 15,
): SourceDefinition => ({
  id,
  label,
  publisherGroup,
  language,
  url,
  kind: 'rss',
  intervalMinutes,
  topics,
  reuse: newsReuse,
});
export const SOURCES: SourceDefinition[] = [
  rss(
    'bbc-tr',
    'BBC Türkçe',
    'bbc',
    'tr',
    'https://feeds.bbci.co.uk/turkce/rss.xml',
  ),
  rss(
    'bbc-ar',
    'BBC Arabic',
    'bbc',
    'ar',
    'https://feeds.bbci.co.uk/arabic/rss.xml',
  ),
  rss(
    'bbc-fa',
    'BBC Persian',
    'bbc',
    'fa',
    'https://feeds.bbci.co.uk/persian/rss.xml',
  ),
  rss(
    'aj-en',
    'Al Jazeera English',
    'al-jazeera',
    'en',
    'https://www.aljazeera.com/xml/rss/all.xml',
  ),
  rss(
    'aj-ar',
    'Al Jazeera Arabic',
    'al-jazeera',
    'ar',
    'https://www.aljazeera.net/aljazeerarss/a7c186be-1baa-4bd4-9d80-a84db769f779/73d0e1b4-532f-45ef-b135-bfdff8b8cab9',
  ),
  rss(
    'f24-en',
    'France 24 English',
    'france24',
    'en',
    'https://www.france24.com/en/rss',
  ),
  rss(
    'f24-ar',
    'France 24 Arabic',
    'france24',
    'ar',
    'https://www.france24.com/ar/rss',
  ),
  rss('mehr-fa', 'Mehr Persian', 'mehr', 'fa', 'https://www.mehrnews.com/rss'),
  rss('mehr-en', 'Mehr English', 'mehr', 'en', 'https://en.mehrnews.com/rss'),
  rss(
    'guardian-me',
    'Guardian Middle East',
    'guardian',
    'en',
    'https://www.theguardian.com/world/middleeast/rss',
  ),
  rss(
    'gcaptain',
    'gCaptain',
    'gcaptain',
    'en',
    'https://gcaptain.com/feed/',
    'transport,energy,security',
    30,
  ),
  rss(
    'ynet-news',
    'Ynet Haberler',
    'ynet',
    'he',
    'https://www.ynet.co.il/Integration/StoryRss2.xml',
  ),
  rss(
    'ynet-breaking',
    'Ynet Kısa Haberler',
    'ynet',
    'he',
    'https://www.ynet.co.il/Integration/StoryRss1854.xml',
  ),
  rss(
    'eia-energy',
    'EIA Today in Energy',
    'eia',
    'en',
    'https://www.eia.gov/rss/todayinenergy.xml',
    'energy,transport',
    60,
  ),
  rss(
    'jpost-me',
    'Jerusalem Post Middle East',
    'jerusalem-post',
    'en',
    'https://www.jpost.com/rss/rssfeedsmiddleeastnews.aspx',
  ),
  rss(
    'trt-world',
    'TRT Haber Dünya',
    'trt',
    'tr',
    'https://www.trthaber.com/dunya_articles.rss',
  ),
  rss(
    'trt-agenda',
    'TRT Haber Gündem',
    'trt',
    'tr',
    'https://www.trthaber.com/gundem_articles.rss',
    'security,diplomacy,protests',
  ),
  rss(
    'trt-economy',
    'TRT Haber Ekonomi',
    'trt',
    'tr',
    'https://www.trthaber.com/ekonomi_articles.rss',
    'energy,transport',
    30,
  ),
  {
    ...rss(
      'gdacs',
      'GDACS Afet Uyarıları',
      'gdacs',
      'en',
      'https://www.gdacs.org/xml/rss.xml',
      'disasters',
      5,
    ),
    kind: 'gdacs',
    reuse:
      'GDACS kurumsal afet uyarısı; GDACS atfı ve kaynak bağlantısı korunur.',
  },
  {
    ...rss(
      'usgs',
      'USGS Deprem Gözlemleri',
      'usgs',
      'en',
      'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/2.5_day.geojson',
      'disasters',
      2,
    ),
    kind: 'usgs',
    reuse:
      'USGS ölçüm kaydı; ilk ölçümler değişebilir. Kaynak kimliği ve güncellemeler korunur.',
  },
  {
    ...rss(
      'gdelt-levant',
      'GDELT · Levant ve İran',
      'gdelt',
      'multi',
      'https://api.gdeltproject.org/api/v2/doc/doc?' +
        new URLSearchParams({
          query:
            '(Iran OR Iraq OR Syria OR Lebanon OR Israel OR Palestine OR Gaza OR Jordan)',
          mode: 'artlist',
          format: 'json',
          timespan: '2h',
          maxrecords: '150',
          sort: 'datedesc',
        }),
    ),
    kind: 'gdelt',
  },
  {
    ...rss(
      'gdelt-gulf',
      'GDELT · Körfez ve deniz yolları',
      'gdelt',
      'multi',
      'https://api.gdeltproject.org/api/v2/doc/doc?' +
        new URLSearchParams({
          query:
            '(Yemen OR "Saudi Arabia" OR "United Arab Emirates" OR Qatar OR Bahrain OR Kuwait OR Oman OR "Red Sea" OR Hormuz OR Turkey OR Turkiye OR Egypt)',
          mode: 'artlist',
          format: 'json',
          timespan: '2h',
          maxrecords: '150',
          sort: 'datedesc',
        }),
    ),
    kind: 'gdelt',
  },
  {
    ...rss(
      'reliefweb',
      'ReliefWeb',
      'reliefweb',
      'en',
      'https://api.reliefweb.int/v2/reports',
      'humanitarian',
      30,
    ),
    kind: 'reliefweb',
    requires: 'RELIEFWEB_APPNAME',
  },
  {
    ...rss(
      'firms',
      'NASA FIRMS · Termal anomaliler',
      'nasa',
      'en',
      'https://firms.modaps.eosdis.nasa.gov/api/area/',
      'disasters',
      60,
    ),
    kind: 'firms',
    requires: 'FIRMS_MAP_KEY',
    reuse:
      'NASA FIRMS termal gözlemi. Yangın veya saldırı nedeni belirlemez; gözlem zamanı ve atıf korunur.',
  },
];
export const SOURCE_HOST_GROUPS: Record<string, string> = {
  'bbc.com': 'bbc',
  'bbc.co.uk': 'bbc',
  'bbci.co.uk': 'bbc',
  'aljazeera.com': 'al-jazeera',
  'aljazeera.net': 'al-jazeera',
  'france24.com': 'france24',
  'mehrnews.com': 'mehr',
  'theguardian.com': 'guardian',
  'gcaptain.com': 'gcaptain',
  'ynet.co.il': 'ynet',
  'eia.gov': 'eia',
  'jpost.com': 'jerusalem-post',
  'trthaber.com': 'trt',
};
export function publisherGroup(url: string) {
  let host = 'unknown';
  try {
    host = new URL(url).hostname.toLowerCase().replace(/^www\./, '');
  } catch {}
  for (const [d, g] of Object.entries(SOURCE_HOST_GROUPS))
    if (host === d || host.endsWith('.' + d)) return g;
  return host;
}
