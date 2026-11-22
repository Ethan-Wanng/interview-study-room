-- 提示缓存表：缓存 Gemini 显式 Context Cache 句柄与确定性 AI 规范回答 / 评分 / 代码补全结果
CREATE TABLE IF NOT EXISTS `prompt_cache` (
	`cache_key` text PRIMARY KEY NOT NULL,
	`kind` text NOT NULL,
	`model` text DEFAULT '' NOT NULL,
	`payload` text NOT NULL,
	`hits` integer DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL,
	`expires_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_prompt_cache_expires` ON `prompt_cache` (`expires_at`);
