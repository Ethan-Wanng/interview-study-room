CREATE TABLE `auto_question_fingerprints` (
	`fingerprint` text PRIMARY KEY NOT NULL,
	`question_id` text NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `auto_question_fingerprints_question_id_unique` ON `auto_question_fingerprints` (`question_id`);--> statement-breakpoint
CREATE TABLE `auto_question_keys` (
	`key` text PRIMARY KEY NOT NULL,
	`request_hash` text NOT NULL,
	`response` text NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `auto_question_logs` (
	`id` text PRIMARY KEY NOT NULL,
	`key` text NOT NULL,
	`status` text NOT NULL,
	`count` integer NOT NULL,
	`detail` text NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_auto_question_logs_created` ON `auto_question_logs` (`created_at`);