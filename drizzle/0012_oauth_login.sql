-- Sign-in moves to GitHub / Google. Username-password accounts and their records are removed; guest accounts stay.
CREATE TABLE `oauth_identities` (
	`provider` text NOT NULL,
	`subject` text NOT NULL,
	`account_id` text NOT NULL,
	`email` text,
	`created_at` integer NOT NULL,
	PRIMARY KEY(`provider`, `subject`),
	FOREIGN KEY (`account_id`) REFERENCES `accounts`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_oauth_identities_account` ON `oauth_identities` (`account_id`);--> statement-breakpoint
ALTER TABLE `accounts` ADD `display_name` text;--> statement-breakpoint
DELETE FROM `progress` WHERE `user_id` IN (SELECT `id` FROM `accounts` WHERE `is_guest`=0);--> statement-breakpoint
DELETE FROM `activity` WHERE `user_id` IN (SELECT `id` FROM `accounts` WHERE `is_guest`=0);--> statement-breakpoint
DELETE FROM `preferences` WHERE `user_id` IN (SELECT `id` FROM `accounts` WHERE `is_guest`=0);--> statement-breakpoint
DELETE FROM `practice_days` WHERE `user_id` IN (SELECT `id` FROM `accounts` WHERE `is_guest`=0);--> statement-breakpoint
DELETE FROM `practice_preferences` WHERE `user_id` IN (SELECT `id` FROM `accounts` WHERE `is_guest`=0);--> statement-breakpoint
DELETE FROM `practice_runs` WHERE `user_id` IN (SELECT `id` FROM `accounts` WHERE `is_guest`=0);--> statement-breakpoint
DELETE FROM `sessions` WHERE `user_id` IN (SELECT `id` FROM `accounts` WHERE `is_guest`=0);--> statement-breakpoint
DELETE FROM `accounts` WHERE `is_guest`=0;
