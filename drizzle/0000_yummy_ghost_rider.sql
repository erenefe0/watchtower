CREATE TABLE `event_reports` (
	`itemId` text PRIMARY KEY NOT NULL,
	`eventId` text NOT NULL,
	FOREIGN KEY (`itemId`) REFERENCES `items`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`eventId`) REFERENCES `events`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_event_reports_event` ON `event_reports` (`eventId`);--> statement-breakpoint
CREATE TABLE `events` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`summary` text NOT NULL,
	`originalTitle` text NOT NULL,
	`originalSummary` text NOT NULL,
	`language` text NOT NULL,
	`category` text NOT NULL,
	`country` text,
	`place` text,
	`lat` real,
	`lon` real,
	`precision` text NOT NULL,
	`locationBasis` text NOT NULL,
	`occurredAt` text,
	`publishedAt` text,
	`retrievedAt` text NOT NULL,
	`updatedAt` text NOT NULL,
	`sortAt` text NOT NULL,
	`status` text DEFAULT 'reported' NOT NULL,
	`translationStatus` text DEFAULT 'pending' NOT NULL,
	`sourceLabel` text NOT NULL,
	`url` text NOT NULL,
	`kind` text NOT NULL,
	`fingerprint` text NOT NULL,
	`primaryItemId` text NOT NULL,
	`editorModified` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_events_status_sort` ON `events` (`status`,`sortAt`);--> statement-breakpoint
CREATE INDEX `idx_events_category_place` ON `events` (`category`,`place`,`sortAt`);--> statement-breakpoint
CREATE INDEX `idx_events_country_sort` ON `events` (`country`,`sortAt`);--> statement-breakpoint
CREATE INDEX `idx_events_fingerprint` ON `events` (`fingerprint`);--> statement-breakpoint
CREATE TABLE `history` (
	`id` text PRIMARY KEY NOT NULL,
	`eventId` text NOT NULL,
	`action` text NOT NULL,
	`description` text NOT NULL,
	`actor` text NOT NULL,
	`before` text,
	`after` text,
	`createdAt` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_history_event` ON `history` (`eventId`,`createdAt`);--> statement-breakpoint
CREATE TABLE `items` (
	`id` text PRIMARY KEY NOT NULL,
	`sourceId` text NOT NULL,
	`externalId` text NOT NULL,
	`sourceLabel` text NOT NULL,
	`publisherGroup` text NOT NULL,
	`title` text NOT NULL,
	`summary` text NOT NULL,
	`url` text NOT NULL,
	`canonicalUrl` text NOT NULL,
	`language` text NOT NULL,
	`publishedAt` text,
	`occurredAt` text,
	`retrievedAt` text NOT NULL,
	`updatedAt` text NOT NULL,
	`kind` text NOT NULL,
	`contentHash` text NOT NULL,
	`data` text NOT NULL,
	FOREIGN KEY (`sourceId`) REFERENCES `sources`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_items_source_external` ON `items` (`sourceId`,`externalId`);--> statement-breakpoint
CREATE INDEX `idx_items_canonical` ON `items` (`canonicalUrl`);--> statement-breakpoint
CREATE INDEX `idx_items_retrieved` ON `items` (`retrievedAt`);--> statement-breakpoint
CREATE TABLE `runs` (
	`id` text PRIMARY KEY NOT NULL,
	`sourceId` text NOT NULL,
	`startedAt` text NOT NULL,
	`finishedAt` text,
	`status` text NOT NULL,
	`received` integer DEFAULT 0 NOT NULL,
	`accepted` integer DEFAULT 0 NOT NULL,
	`message` text
);
--> statement-breakpoint
CREATE INDEX `idx_runs_started` ON `runs` (`startedAt`);--> statement-breakpoint
CREATE TABLE `sources` (
	`id` text PRIMARY KEY NOT NULL,
	`label` text NOT NULL,
	`publisherGroup` text NOT NULL,
	`language` text NOT NULL,
	`url` text NOT NULL,
	`kind` text NOT NULL,
	`intervalMinutes` integer NOT NULL,
	`topics` text NOT NULL,
	`reuse` text NOT NULL,
	`requires` text,
	`enabled` integer DEFAULT 1 NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`isCandidate` integer DEFAULT 0 NOT NULL,
	`lastSuccess` text,
	`lastAttempt` text,
	`lastError` text,
	`itemCount` integer DEFAULT 0 NOT NULL,
	`failures` integer DEFAULT 0 NOT NULL,
	`nextFetch` text,
	`etag` text,
	`lastModified` text
);
--> statement-breakpoint
CREATE INDEX `idx_sources_due` ON `sources` (`enabled`,`nextFetch`);--> statement-breakpoint
CREATE TABLE `state` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL,
	`expiresAt` text
);
--> statement-breakpoint
CREATE TABLE `translations` (
	`id` text PRIMARY KEY NOT NULL,
	`sourceLang` text NOT NULL,
	`original` text NOT NULL,
	`translated` text,
	`status` text NOT NULL,
	`updatedAt` text NOT NULL
);
