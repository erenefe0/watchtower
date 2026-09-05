import {
  sqliteTable,
  text,
  integer,
  real,
  index,
  uniqueIndex,
} from 'drizzle-orm/sqlite-core';
export const sources = sqliteTable(
  'sources',
  {
    id: text().primaryKey(),
    label: text().notNull(),
    publisherGroup: text().notNull(),
    language: text().notNull(),
    url: text().notNull(),
    kind: text().notNull(),
    intervalMinutes: integer().notNull(),
    topics: text().notNull(),
    reuse: text().notNull(),
    requires: text(),
    enabled: integer().notNull().default(1),
    status: text().notNull().default('pending'),
    isCandidate: integer().notNull().default(0),
    lastSuccess: text(),
    lastAttempt: text(),
    lastError: text(),
    itemCount: integer().notNull().default(0),
    failures: integer().notNull().default(0),
    nextFetch: text(),
    etag: text(),
    lastModified: text(),
  },
  (t) => [index('idx_sources_due').on(t.enabled, t.nextFetch)],
);
export const events = sqliteTable(
  'events',
  {
    id: text().primaryKey(),
    title: text().notNull(),
    summary: text().notNull(),
    originalTitle: text().notNull(),
    originalSummary: text().notNull(),
    language: text().notNull(),
    category: text().notNull(),
    country: text(),
    place: text(),
    lat: real(),
    lon: real(),
    precision: text().notNull(),
    locationBasis: text().notNull(),
    occurredAt: text(),
    publishedAt: text(),
    retrievedAt: text().notNull(),
    updatedAt: text().notNull(),
    sortAt: text().notNull(),
    status: text().notNull().default('reported'),
    translationStatus: text().notNull().default('pending'),
    sourceLabel: text().notNull(),
    url: text().notNull(),
    kind: text().notNull(),
    fingerprint: text().notNull(),
    primaryItemId: text().notNull(),
    editorModified: integer().notNull().default(0),
  },
  (t) => [
    index('idx_events_status_sort').on(t.status, t.sortAt),
    index('idx_events_category_place').on(t.category, t.place, t.sortAt),
    index('idx_events_country_sort').on(t.country, t.sortAt),
    index('idx_events_fingerprint').on(t.fingerprint),
  ],
);
export const items = sqliteTable(
  'items',
  {
    id: text().primaryKey(),
    sourceId: text()
      .notNull()
      .references(() => sources.id),
    externalId: text().notNull(),
    sourceLabel: text().notNull(),
    publisherGroup: text().notNull(),
    title: text().notNull(),
    summary: text().notNull(),
    url: text().notNull(),
    canonicalUrl: text().notNull(),
    language: text().notNull(),
    publishedAt: text(),
    occurredAt: text(),
    retrievedAt: text().notNull(),
    updatedAt: text().notNull(),
    kind: text().notNull(),
    contentHash: text().notNull(),
    data: text().notNull(),
  },
  (t) => [
    uniqueIndex('idx_items_source_external').on(t.sourceId, t.externalId),
    index('idx_items_canonical').on(t.canonicalUrl),
    index('idx_items_retrieved').on(t.retrievedAt),
  ],
);
export const eventReports = sqliteTable(
  'event_reports',
  {
    itemId: text()
      .primaryKey()
      .references(() => items.id, { onDelete: 'cascade' }),
    eventId: text()
      .notNull()
      .references(() => events.id, { onDelete: 'cascade' }),
  },
  (t) => [index('idx_event_reports_event').on(t.eventId)],
);
export const translations = sqliteTable('translations', {
  id: text().primaryKey(),
  sourceLang: text().notNull(),
  original: text().notNull(),
  translated: text(),
  status: text().notNull(),
  updatedAt: text().notNull(),
});
export const history = sqliteTable(
  'history',
  {
    id: text().primaryKey(),
    eventId: text().notNull(),
    action: text().notNull(),
    description: text().notNull(),
    actor: text().notNull(),
    before: text(),
    after: text(),
    createdAt: text().notNull(),
  },
  (t) => [index('idx_history_event').on(t.eventId, t.createdAt)],
);
export const runs = sqliteTable(
  'runs',
  {
    id: text().primaryKey(),
    sourceId: text().notNull(),
    startedAt: text().notNull(),
    finishedAt: text(),
    status: text().notNull(),
    received: integer().notNull().default(0),
    accepted: integer().notNull().default(0),
    message: text(),
  },
  (t) => [index('idx_runs_started').on(t.startedAt)],
);
export const state = sqliteTable('state', {
  key: text().primaryKey(),
  value: text().notNull(),
  expiresAt: text(),
});
