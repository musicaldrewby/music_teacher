CREATE TABLE `motion_outputs` (
	`id` text PRIMARY KEY NOT NULL,
	`owner` text NOT NULL,
	`mime` text NOT NULL,
	`bytes` integer NOT NULL,
	`created` integer NOT NULL
);
