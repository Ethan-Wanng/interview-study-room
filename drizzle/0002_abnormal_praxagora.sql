CREATE TABLE `practice_days` (
	`user_id` text NOT NULL,
	`day` text NOT NULL,
	`seconds` integer DEFAULT 0 NOT NULL,
	PRIMARY KEY(`user_id`, `day`)
);
--> statement-breakpoint
CREATE TABLE `practice_preferences` (
	`user_id` text PRIMARY KEY NOT NULL,
	`minutes` integer DEFAULT 30 NOT NULL
);
--> statement-breakpoint
CREATE TABLE `practice_runs` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`status` text NOT NULL,
	`payload` text NOT NULL,
	`revision` integer DEFAULT 0 NOT NULL,
	`last_op` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `accounts`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_practice_runs_user_created` ON `practice_runs` (`user_id`,`created_at`);--> statement-breakpoint
CREATE UNIQUE INDEX `idx_practice_one_active` ON `practice_runs` (`user_id`) WHERE "practice_runs"."status" = 'active';