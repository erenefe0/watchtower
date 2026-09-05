export const CATEGORIES = {
  conflict: { label: 'Çatışma', color: '#ff786e' },
  security: { label: 'Güvenlik', color: '#f3ac69' },
  diplomacy: { label: 'Diplomasi', color: '#849cff' },
  protests: { label: 'Protestolar', color: '#e0a5ee' },
  humanitarian: { label: 'İnsani durum', color: '#6dcbb5' },
  disasters: { label: 'Afetler', color: '#edcc77' },
  energy: { label: 'Enerji', color: '#8cccb9' },
  transport: { label: 'Ulaşım', color: '#6ebceb' },
} as const;
export type Category = keyof typeof CATEGORIES;
export const COUNTRIES: Record<string, string> = {
  TR: 'Türkiye',
  IR: 'İran',
  IQ: 'Irak',
  SY: 'Suriye',
  LB: 'Lübnan',
  IL: 'İsrail',
  PS: 'Filistin',
  JO: 'Ürdün',
  SA: 'Suudi Arabistan',
  YE: 'Yemen',
  OM: 'Umman',
  AE: 'BAE',
  QA: 'Katar',
  BH: 'Bahreyn',
  KW: 'Kuveyt',
  EG: 'Mısır',
  CY: 'Kıbrıs',
};
export const LANGUAGES: Record<string, string> = {
  tr: 'Türkçe',
  en: 'İngilizce',
  ar: 'Arapça',
  fa: 'Farsça',
  he: 'İbranice',
  unknown: 'Belirsiz',
};
export type EventRecord = {
  id: string;
  title: string;
  summary: string;
  originalTitle: string;
  originalSummary: string;
  language: string;
  category: Category;
  country: string | null;
  place: string | null;
  lat: number | null;
  lon: number | null;
  precision: 'exact' | 'city' | 'country' | 'unknown';
  locationBasis: string;
  occurredAt: string | null;
  publishedAt: string | null;
  retrievedAt: string;
  updatedAt: string;
  status: 'reported' | 'reviewed' | 'disputed' | 'withdrawn';
  translationStatus: string;
  reportCount: number;
  publisherCount: number;
  sourceLabel: string;
  kind: string;
  url: string;
};
export type SourceRecord = {
  id: string;
  label: string;
  publisherGroup: string;
  language: string;
  kind: string;
  url: string;
  intervalMinutes: number;
  enabled: number;
  status: string;
  lastSuccess: string | null;
  lastAttempt: string | null;
  lastError: string | null;
  itemCount: number;
  topics: string;
  reuse: string;
  isCandidate: number;
};
export type ReportRecord = {
  id: string;
  eventId: string;
  sourceId: string;
  sourceLabel: string;
  publisherGroup: string;
  title: string;
  summary: string;
  url: string;
  language: string;
  publishedAt: string | null;
  retrievedAt: string;
  kind: string;
};
export type HistoryRecord = {
  id: string;
  description: string;
  createdAt: string;
};
export type EventDetail = {
  event: EventRecord;
  reports: ReportRecord[];
  history: HistoryRecord[];
};
export type EventResponse = {
  events: EventRecord[];
  total: number;
  page: number;
  pages: number;
  map: EventRecord[];
  mapTruncated: boolean;
  stats: {
    total: number;
    located: number;
    countries: number;
    publishers: number;
  };
  histogram: { hour: string; count: number }[];
  lastSuccess: string | null;
  sourceCount: number;
  connections: { scheduler: boolean; translation: boolean };
};
export const EMPTY_EVENTS: EventResponse = {
  events: [],
  total: 0,
  page: 1,
  pages: 0,
  map: [],
  mapTruncated: false,
  stats: { total: 0, located: 0, countries: 0, publishers: 0 },
  histogram: [],
  lastSuccess: null,
  sourceCount: 0,
  connections: { scheduler: false, translation: false },
};
