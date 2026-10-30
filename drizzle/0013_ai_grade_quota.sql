-- 每日 AI 评分额度：按用户和日期（北京时间）计数，游客 5 次、登录用户 100 次。
CREATE TABLE `ai_grade_quota` (
	`user_id` text NOT NULL,
	`day` text NOT NULL,
	`count` integer DEFAULT 0 NOT NULL,
	PRIMARY KEY(`user_id`, `day`),
	FOREIGN KEY (`user_id`) REFERENCES `accounts`(`id`) ON UPDATE no action ON DELETE cascade
);
