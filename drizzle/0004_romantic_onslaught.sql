CREATE TABLE `admin_invites` (
	`id` text PRIMARY KEY NOT NULL,
	`key_hash` text NOT NULL,
	`creator_id` text NOT NULL,
	`subjects` text NOT NULL,
	`allow_new` integer DEFAULT 0 NOT NULL,
	`expires_at` integer NOT NULL,
	`used_by` text,
	`revoked` integer DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `admin_invites_key_hash_unique` ON `admin_invites` (`key_hash`);--> statement-breakpoint
CREATE INDEX `idx_admin_invites_creator` ON `admin_invites` (`creator_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `admin_sessions` (
	`token_hash` text PRIMARY KEY NOT NULL,
	`admin_id` text NOT NULL,
	`expires_at` integer NOT NULL,
	FOREIGN KEY (`admin_id`) REFERENCES `administrators`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `administrators` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`key_hash` text NOT NULL,
	`role` text NOT NULL,
	`subjects` text NOT NULL,
	`enabled` integer DEFAULT 1 NOT NULL,
	`created_by` text,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `administrators_key_hash_unique` ON `administrators` (`key_hash`);--> statement-breakpoint
CREATE TABLE `managed_questions` (
	`id` text PRIMARY KEY NOT NULL,
	`subject_id` text NOT NULL,
	`kind` text NOT NULL,
	`status` text NOT NULL,
	`payload` text NOT NULL,
	`revision` integer NOT NULL,
	`updated_by` text NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_managed_questions_subject` ON `managed_questions` (`subject_id`);--> statement-breakpoint
CREATE TABLE `subjects` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`name_en` text NOT NULL,
	`name_key` text NOT NULL,
	`created_by` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `subjects_name_key_unique` ON `subjects` (`name_key`);