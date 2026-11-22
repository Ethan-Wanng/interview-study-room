-- 分享故事（参考 Z-Library 故事墙）与代码操场分享片段表
CREATE TABLE IF NOT EXISTS `stories` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text DEFAULT '' NOT NULL,
	`owner_hash` text DEFAULT '' NOT NULL,
	`author` text DEFAULT '匿名学友' NOT NULL,
	`role_tag` text DEFAULT '' NOT NULL,
	`category` text DEFAULT 'journey' NOT NULL,
	`quote` text DEFAULT '' NOT NULL,
	`title` text NOT NULL,
	`content` text NOT NULL,
	`likes` integer DEFAULT 0 NOT NULL,
	`featured` integer DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_stories_created` ON `stories` (`created_at`);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_stories_likes` ON `stories` (`likes`);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `story_likes` (
	`story_id` text NOT NULL,
	`voter_key` text NOT NULL,
	`created_at` integer NOT NULL,
	PRIMARY KEY(`story_id`, `voter_key`),
	FOREIGN KEY (`story_id`) REFERENCES `stories`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `playground_snippets` (
	`id` text PRIMARY KEY NOT NULL,
	`lang` text NOT NULL,
	`code` text NOT NULL,
	`title` text DEFAULT '' NOT NULL,
	`user_id` text DEFAULT '' NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_playground_snippets_created` ON `playground_snippets` (`created_at`);
