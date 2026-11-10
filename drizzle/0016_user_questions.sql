-- 私人题库：用户自己添加的面试题，只有本人能看到。subject_id 为 mine（只在「我的题库」里）或某个公共学科的 id（同时出现在本人的该学科列表里）。
-- 复习进度和公共题一样记在 progress / activity 表，题号以 u- 开头。
CREATE TABLE `user_questions` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`subject_id` text DEFAULT 'mine' NOT NULL,
	`section` text DEFAULT '' NOT NULL,
	`title` text NOT NULL,
	`answer` text DEFAULT '' NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `accounts`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_user_questions_user` ON `user_questions` (`user_id`,`created_at`);
