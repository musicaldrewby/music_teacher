CREATE TABLE `jobs` (
	`id` text PRIMARY KEY NOT NULL,
	`owner` text NOT NULL,
	`scene_id` text NOT NULL,
	`snapshot` text NOT NULL,
	`kind` text NOT NULL,
	`status` text NOT NULL,
	`progress` integer NOT NULL,
	`result` text,
	`error` text,
	`created` text NOT NULL,
	`updated` text NOT NULL,
	`lease` text
);
--> statement-breakpoint
CREATE TABLE `scenes` (
	`id` text PRIMARY KEY NOT NULL,
	`owner` text NOT NULL,
	`name` text NOT NULL,
	`revision` integer NOT NULL,
	`data` text NOT NULL,
	`updated` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `versions` (
	`scene_id` text NOT NULL,
	`revision` integer NOT NULL,
	`data` text NOT NULL,
	`created` text NOT NULL,
	PRIMARY KEY(`scene_id`, `revision`)
);
