CREATE TABLE `practice_plans` (
	`id` text PRIMARY KEY NOT NULL,
	`subject_id` text NOT NULL,
	`status` text NOT NULL,
	`payload` text NOT NULL,
	`created_by` text NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_practice_plans_status` ON `practice_plans` (`status`);