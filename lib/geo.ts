import { normalized } from './normalize';
import { COUNTRIES } from './types';
type Place = {
  name: string;
  country: string;
  lat: number;
  lon: number;
  aliases: string[];
};
// Curated city centroids. These are approximate place references, never incident coordinates.
export const PLACES: Place[] = [
  ['Gazze', 'PS', 31.5, 34.47, 'gaza|gazze|غزة|غزه|עזה'],
  ['Refah', 'PS', 31.29, 34.25, 'rafah|refah|رفح|רפיח'],
  [
    'Han Yunus',
    'PS',
    31.34,
    34.3,
    'khan younis|khan yunis|han yunus|خان يونس|خان یونس',
  ],
  ['Ramallah', 'PS', 31.9, 35.2, 'ramallah|ramallah|رام الله'],
  ['Kudüs', 'IL', 31.78, 35.23, 'jerusalem|kudus|القدس|ירושלים'],
  ['Tel Aviv', 'IL', 32.08, 34.78, 'tel aviv|تل أبيب|תל אביב'],
  ['Hayfa', 'IL', 32.79, 34.99, 'haifa|hayfa|حيفا|חיפה'],
  ['Beyrut', 'LB', 33.89, 35.5, 'beirut|beyrut|بيروت|ביירות'],
  ['Sur', 'LB', 33.27, 35.2, 'tyre|صور'],
  ['Şam', 'SY', 33.51, 36.29, 'damascus|sam|دمشق|דמשק'],
  ['Halep', 'SY', 36.2, 37.16, 'aleppo|halep|حلب'],
  ['İdlib', 'SY', 35.93, 36.63, 'idlib|إدلب|ادلب'],
  ['Dera', 'SY', 32.62, 36.1, 'daraa|deraa|درعا'],
  ['Tahran', 'IR', 35.69, 51.39, 'tehran|tahran|طهران|تهران|טהרן'],
  ['İsfahan', 'IR', 32.65, 51.67, 'isfahan|esfahan|isfahan|اصفهان'],
  ['Tebriz', 'IR', 38.08, 46.29, 'tabriz|tebriz|تبریز'],
  [
    'Bender Abbas',
    'IR',
    27.19,
    56.28,
    'bandar abbas|bender abbas|بندرعباس|بندر عباس',
  ],
  ['Meşhed', 'IR', 36.3, 59.61, 'mashhad|meshed|مشهد'],
  ['Bağdat', 'IQ', 33.32, 44.37, 'baghdad|bagdat|بغداد|בגדד'],
  ['Erbil', 'IQ', 36.19, 44.01, 'erbil|arbil|أربيل|اربيل|اربیل'],
  ['Musul', 'IQ', 36.34, 43.13, 'mosul|musul|الموصل|موصل'],
  ['Basra', 'IQ', 30.5, 47.81, 'basra|basrah|البصرة'],
  ['Ankara', 'TR', 39.93, 32.86, 'ankara|أنقرة|آنکارا'],
  ['İstanbul', 'TR', 41.01, 28.98, 'istanbul|اسطنبول|إسطنبول|استانبول'],
  ['Diyarbakır', 'TR', 37.91, 40.24, 'diyarbakir'],
  ['Gaziantep', 'TR', 37.07, 37.38, 'gaziantep'],
  ['Hatay', 'TR', 36.2, 36.16, 'hatay|antakya'],
  ['Kahire', 'EG', 30.04, 31.24, 'cairo|kahire|القاهرة|قاهره'],
  ['Süveyş', 'EG', 29.97, 32.55, 'suez|suveys|السويس'],
  ['Amman', 'JO', 31.95, 35.93, 'amman|عمان الأردن|عمّان'],
  ['Riyad', 'SA', 24.71, 46.68, 'riyadh|riyad|الرياض|ریاض'],
  ['Cidde', 'SA', 21.49, 39.19, 'jeddah|cidde|جدة'],
  ['Mekke', 'SA', 21.42, 39.83, 'mecca|mekke|مكة'],
  ['Sana', 'YE', 15.35, 44.21, 'sanaa|sana a|صنعاء'],
  ['Aden', 'YE', 12.79, 45.02, 'aden|عدن'],
  ['Hudeyde', 'YE', 14.8, 42.95, 'hodeidah|hudaydah|hudeyde|الحديدة'],
  ['Dubai', 'AE', 25.2, 55.27, 'dubai|دبي|دبی'],
  ['Abu Dabi', 'AE', 24.45, 54.38, 'abu dhabi|abu dabi|أبوظبي|ابوظبی'],
  ['Doha', 'QA', 25.29, 51.53, 'doha|الدوحة|دوحه'],
  ['Manama', 'BH', 26.22, 50.59, 'manama|المنامة'],
  ['Maskat', 'OM', 23.59, 58.4, 'muscat|maskat|مسقط'],
  ['Kuveyt', 'KW', 29.38, 47.99, 'kuwait city|مدينة الكويت'],
  ['Lefkoşa', 'CY', 35.18, 33.38, 'nicosia|lefkosa|نيقوسيا'],
].map(([name, country, lat, lon, aliases]) => ({
  name: String(name),
  country: String(country),
  lat: Number(lat),
  lon: Number(lon),
  aliases: String(aliases).split('|'),
}));
const countryAliases: Record<string, string[]> = {
  TR: [
    'turkey',
    'turkiye',
    'turkiye',
    'turkish',
    'türkiye',
    'تركيا',
    'ترکیه',
    'טורקיה',
  ],
  IR: ['iran', 'iranian', 'ایران', 'إيران', 'איראן'],
  IQ: ['iraq', 'iraqi', 'irak', 'العراق', 'عراق', 'עיראק'],
  SY: ['syria', 'syrian', 'suriye', 'سوريا', 'سورية', 'سوریه', 'סוריה'],
  LB: ['lebanon', 'lebanese', 'lubnan', 'لبنان', 'לבנון'],
  IL: ['israel', 'israeli', 'israil', 'إسرائيل', 'اسرائیل', 'ישראל'],
  PS: [
    'palestine',
    'palestinian',
    'filistin',
    'gaza',
    'gazze',
    'west bank',
    'bati seria',
    'فلسطين',
    'فلسطین',
    'غزة',
    'غزه',
    'פלסטין',
    'עזה',
  ],
  JO: ['jordan', 'jordanian', 'urdun', 'الأردن', 'اردن', 'ירדן'],
  SA: ['saudi', 'suudi', 'السعودية', 'عربستان', 'סעודיה'],
  YE: ['yemen', 'yemeni', 'اليمن', 'یمن', 'תימן'],
  OM: ['oman', 'omani', 'umman', 'سلطنة عمان', 'עומאן'],
  AE: ['uae', 'emirates', 'emirlik', 'الإمارات', 'امارات'],
  QA: ['qatar', 'kat ar', 'katar', 'قطر'],
  BH: ['bahrain', 'bahreyn', 'البحرين', 'بحرین'],
  KW: ['kuwait', 'kuveyt', 'الكويت', 'کویت'],
  EG: ['egypt', 'egyptian', 'misir', 'مصر', 'מצרים'],
  CY: ['cyprus', 'kibris', 'قبرص', 'קפריסין'],
};
function match(value: string, term: string) {
  const t = normalized(term);
  if (!t) return false;
  return new RegExp(
    `(^|[^\\p{L}\\p{N}])${t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}($|[^\\p{L}\\p{N}])`,
    'u',
  ).test(value);
}
const iso3: Record<string, string> = {
  TUR: 'TR',
  IRN: 'IR',
  IRQ: 'IQ',
  SYR: 'SY',
  LBN: 'LB',
  ISR: 'IL',
  PSE: 'PS',
  JOR: 'JO',
  SAU: 'SA',
  YEM: 'YE',
  OMN: 'OM',
  ARE: 'AE',
  QAT: 'QA',
  BHR: 'BH',
  KWT: 'KW',
  EGY: 'EG',
  CYP: 'CY',
};
export function locate(
  title: string,
  summary: string,
  lat: number | null = null,
  lon: number | null = null,
  hint = '',
) {
  const headline = normalized(title),
    body = normalized(`${title} ${summary}`);
  const cities = PLACES.filter((p) =>
    p.aliases.some((a) => match(headline, a)),
  );
  const countries = Object.entries(countryAliases)
    .filter(([, a]) => a.some((v) => match(body, v)))
    .map(([c]) => c);
  const hinted =
    iso3[hint.toUpperCase()] ??
    (COUNTRIES[hint.toUpperCase()] ? hint.toUpperCase() : null);
  const broad =
    lat !== null &&
    lon !== null &&
    lat >= 12 &&
    lat <= 43 &&
    lon >= 24 &&
    lon <= 64;
  const regional =
    cities.length > 0 ||
    countries.length > 0 ||
    !!hinted ||
    broad ||
    /hormuz|hürmüz|red sea|kizildeniz|ortadogu|middle east|الشرق الأوسط|هرمز|خاورمیانه/.test(
      body,
    );
  if (
    lat !== null &&
    lon !== null &&
    lat >= -90 &&
    lat <= 90 &&
    lon >= -180 &&
    lon <= 180
  )
    return {
      regional: regional && broad,
      country: hinted ?? (countries.length === 1 ? countries[0] : null),
      place: cities.length === 1 ? cities[0].name : null,
      lat,
      lon,
      precision: 'exact' as const,
      locationBasis: 'Kaynağın sağladığı gözlem / uyarı koordinatı.',
    };
  if (cities.length === 1) {
    const p = cities[0];
    return {
      regional,
      country: p.country,
      place: p.name,
      lat: p.lat,
      lon: p.lon,
      precision: 'city' as const,
      locationBasis:
        'Başlıkta geçen şehir adı; işaret şehir merkezidir, olay yeri doğrulanmamıştır.',
    };
  }
  return {
    regional,
    country: hinted ?? (countries.length === 1 ? countries[0] : null),
    place: null,
    lat: null,
    lon: null,
    precision:
      countries.length === 1 ? ('country' as const) : ('unknown' as const),
    locationBasis:
      cities.length > 1
        ? 'Birden fazla yer adı var; konum belirsiz.'
        : countries.length === 1
          ? 'Ülke anılıyor; kesin olay konumu yok.'
          : 'Konum için yeterli açık bilgi bulunmuyor.',
  };
}
