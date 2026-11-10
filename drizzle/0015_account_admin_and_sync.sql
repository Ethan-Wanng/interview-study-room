-- 管理员可以绑定一个网站账号：用这个账号登录网站后，进入后台不用再填管理密钥。
ALTER TABLE `administrators` ADD `account_id` text REFERENCES `accounts`(`id`) ON DELETE SET NULL;--> statement-breakpoint
CREATE UNIQUE INDEX `idx_administrators_account` ON `administrators` (`account_id`);--> statement-breakpoint
-- 学习进度云同步：闯关进度、试卷、技术栈选择、英语单词等原来只存在浏览器里的数据，按账号存一份，换域名、换设备都能看到。
CREATE TABLE `user_store` (
	`user_id` text NOT NULL,
	`key` text NOT NULL,
	`value` text NOT NULL,
	`updated_at` integer NOT NULL,
	PRIMARY KEY(`user_id`, `key`),
	FOREIGN KEY (`user_id`) REFERENCES `accounts`(`id`) ON UPDATE no action ON DELETE cascade
);
