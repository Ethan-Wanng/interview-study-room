-- 页面出错记录：浏览器里发生的报错（尤其是考试期间）上报到这里，方便定位问题、找回答卷。
CREATE TABLE `client_errors` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text DEFAULT '' NOT NULL,
	`username` text DEFAULT '' NOT NULL,
	`path` text DEFAULT '' NOT NULL,
	`exam_id` text DEFAULT '' NOT NULL,
	`message` text NOT NULL,
	`stack` text DEFAULT '' NOT NULL,
	`context` text DEFAULT '' NOT NULL,
	`user_agent` text DEFAULT '' NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_client_errors_time` ON `client_errors` (`created_at`);
