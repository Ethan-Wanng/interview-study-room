-- 站内通知：发给某个用户的消息（比如反馈处理结果）。全站广播（版本更新）写在代码里的 lib/releases.ts，不进这张表。
CREATE TABLE `notifications` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`kind` text DEFAULT 'feedback' NOT NULL,
	`title` text NOT NULL,
	`body` text DEFAULT '' NOT NULL,
	`link` text DEFAULT '' NOT NULL,
	`created_at` integer NOT NULL,
	`read_at` integer,
	FOREIGN KEY (`user_id`) REFERENCES `accounts`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_notifications_user` ON `notifications` (`user_id`,`created_at`);
