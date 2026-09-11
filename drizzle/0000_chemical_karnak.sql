CREATE TABLE `activity` (
	`user_id` text NOT NULL,
	`question_id` text NOT NULL,
	`day` text NOT NULL,
	`kind` text NOT NULL,
	PRIMARY KEY(`user_id`, `question_id`, `day`)
);
--> statement-breakpoint
CREATE TABLE `preferences` (
	`user_id` text PRIMARY KEY NOT NULL,
	`new_goal` integer DEFAULT 10 NOT NULL,
	`review_goal` integer DEFAULT 20 NOT NULL
);
--> statement-breakpoint
CREATE TABLE `progress` (
	`user_id` text NOT NULL,
	`question_id` text NOT NULL,
	`stage` integer DEFAULT 0 NOT NULL,
	`due` text NOT NULL,
	`last_day` text NOT NULL,
	`first_day` text NOT NULL,
	`rating` text NOT NULL,
	PRIMARY KEY(`user_id`, `question_id`)
);
