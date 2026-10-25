CREATE TABLE `gallery_rate` (
	`key` text PRIMARY KEY NOT NULL,
	`hits` integer NOT NULL,
	`expires` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_gallery_rate_expiry` ON `gallery_rate` (`expires`);--> statement-breakpoint
CREATE TABLE `gallery_reports` (
	`song` text NOT NULL,
	`reporter` text NOT NULL,
	PRIMARY KEY(`song`, `reporter`)
);
--> statement-breakpoint
CREATE TABLE `gallery_songs` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`data` text NOT NULL,
	`created` integer NOT NULL,
	`bpm` integer NOT NULL,
	`bars` integer NOT NULL,
	`notes` integer NOT NULL,
	`hidden` integer DEFAULT 0 NOT NULL,
	`reports` integer DEFAULT 0 NOT NULL,
	`delete_hash` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_gallery_recent` ON `gallery_songs` (`hidden`,`created`,`id`);