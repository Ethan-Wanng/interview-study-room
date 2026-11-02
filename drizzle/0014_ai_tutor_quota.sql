-- 每日 AI 老师（动手练习带练）额度：按用户和日期（北京时间）计数，每发一条消息算一次；游客 20 次、登录用户 200 次。
CREATE TABLE `ai_tutor_quota` (
	`user_id` text NOT NULL,
	`day` text NOT NULL,
	`count` integer DEFAULT 0 NOT NULL,
	PRIMARY KEY(`user_id`, `day`),
	FOREIGN KEY (`user_id`) REFERENCES `accounts`(`id`) ON UPDATE no action ON DELETE cascade
);
