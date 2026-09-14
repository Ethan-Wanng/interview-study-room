CREATE TABLE `spaces` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`name_en` text NOT NULL,
	`created_by` text NOT NULL
);
--> statement-breakpoint
ALTER TABLE `subjects` ADD `space_id` text DEFAULT 'go-interview' NOT NULL;