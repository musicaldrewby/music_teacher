CREATE TABLE `motion_commands` (
	`id` text PRIMARY KEY NOT NULL,
	`owner` text NOT NULL,
	`session_id` text NOT NULL,
	`nonce` text NOT NULL,
	`kind` text NOT NULL,
	`payload` text NOT NULL,
	`status` text NOT NULL,
	`result` text,
	`progress` integer DEFAULT 0 NOT NULL,
	`cancelled` integer DEFAULT 0 NOT NULL,
	`created` integer NOT NULL,
	`updated` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `motion_command_nonce` ON `motion_commands` (`owner`,`nonce`);--> statement-breakpoint
CREATE TABLE `motion_projects` (
	`id` text PRIMARY KEY NOT NULL,
	`owner` text NOT NULL,
	`name` text NOT NULL,
	`revision` integer NOT NULL,
	`object_key` text NOT NULL,
	`updated` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `motion_sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`owner` text NOT NULL,
	`name` text NOT NULL,
	`revision` integer NOT NULL,
	`summary` text NOT NULL,
	`enabled` integer NOT NULL,
	`updated` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `motion_versions` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`owner` text NOT NULL,
	`revision` integer NOT NULL,
	`object_key` text NOT NULL,
	`created` integer NOT NULL
);
