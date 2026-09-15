CREATE TABLE `auto_question_insert_receipts` (
	`batch_id` text NOT NULL,
	`sort_order` integer NOT NULL,
	`question_id` text NOT NULL,
	`snapshot` text NOT NULL,
	PRIMARY KEY(`batch_id`, `sort_order`),
	FOREIGN KEY (`question_id`) REFERENCES `managed_questions`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `practice_plan_questions` (
	`plan_id` text NOT NULL,
	`question_id` text NOT NULL,
	`sort_order` integer NOT NULL,
	PRIMARY KEY(`plan_id`, `sort_order`),
	FOREIGN KEY (`plan_id`) REFERENCES `practice_plans`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`question_id`) REFERENCES `managed_questions`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
-- Final transaction guard: the idempotency result is inserted only after all
-- questions, the plan and its links exist. RAISE aborts the entire D1 batch.
CREATE TRIGGER auto_question_set_commit_guard
BEFORE INSERT ON auto_question_keys
WHEN json_type(NEW.response,'$.questionSet') = 'object'
BEGIN
 SELECT (CASE WHEN NOT EXISTS (
  SELECT 1 FROM practice_plans WHERE id=json_extract(NEW.response,'$.questionSet.id') AND status='published'
 ) THEN RAISE(ABORT,'QUESTION_SET_CREATE_FAILED') END);
 SELECT (CASE WHEN
  (SELECT count(*) FROM auto_question_insert_receipts WHERE batch_id=json_extract(NEW.response,'$.questionSet.id')) != json_extract(NEW.response,'$.count') OR
  (SELECT count(*) FROM practice_plan_questions WHERE plan_id=json_extract(NEW.response,'$.questionSet.id')) != json_extract(NEW.response,'$.count') OR
  (SELECT coalesce(json_array_length(payload,'$.questions'),-1) FROM practice_plans WHERE id=json_extract(NEW.response,'$.questionSet.id')) != json_extract(NEW.response,'$.count')
 THEN RAISE(ABORT,'QUESTION_COUNT_MISMATCH') END);
 SELECT (CASE WHEN EXISTS (
  SELECT 1 FROM auto_question_insert_receipts r
  LEFT JOIN practice_plan_questions l ON l.plan_id=r.batch_id AND l.sort_order=r.sort_order AND l.question_id=r.question_id
  JOIN practice_plans p ON p.id=r.batch_id
  WHERE r.batch_id=json_extract(NEW.response,'$.questionSet.id') AND
   (l.question_id IS NULL OR r.question_id IS NOT json_extract(p.payload,'$.questions['||(r.sort_order-1)||'].question.id') OR
    r.question_id IS NOT json_extract(NEW.response,'$.ids['||(r.sort_order-1)||']'))
 ) THEN RAISE(ABORT,'QUESTION_LINK_FAILED') END);
 SELECT (CASE WHEN EXISTS (
  SELECT 1 FROM auto_question_insert_receipts r JOIN managed_questions q ON q.id=r.question_id
  WHERE r.batch_id=json_extract(NEW.response,'$.questionSet.id') AND (q.status!='published' OR q.kind!='practice')
 ) THEN RAISE(ABORT,'QUESTION_PUBLISH_VALIDATION_FAILED') END);
END;
