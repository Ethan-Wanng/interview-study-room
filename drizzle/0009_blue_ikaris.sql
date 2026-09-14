CREATE TABLE `practice_plan_names` (
	`space_id` text NOT NULL,
	`type` text NOT NULL,
	`name` text NOT NULL,
	`plan_id` text NOT NULL,
	PRIMARY KEY(`space_id`, `type`, `name`),
	FOREIGN KEY (`plan_id`) REFERENCES `practice_plans`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `practice_plan_names_plan_id_unique` ON `practice_plan_names` (`plan_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `idx_plan_question_unique` ON `practice_plan_questions` (`plan_id`,`question_id`);
--> statement-breakpoint
CREATE TRIGGER practice_plan_name_check_insert BEFORE INSERT ON practice_plans
WHEN CASE json_extract(NEW.payload,'$.mode') WHEN 'random' THEN 'training' WHEN 'interview' THEN 'mock' WHEN 'exam' THEN 'exam' END IS NOT NULL
BEGIN
 SELECT CASE WHEN EXISTS(SELECT 1 FROM practice_plans p LEFT JOIN subjects s ON s.id=p.subject_id
 WHERE coalesce(s.space_id,CASE WHEN p.subject_id IN ('go','backend') THEN 'go-interview' ELSE p.subject_id END)=coalesce((SELECT space_id FROM subjects WHERE id=NEW.subject_id),CASE WHEN NEW.subject_id IN ('go','backend') THEN 'go-interview' ELSE NEW.subject_id END) AND json_extract(p.payload,'$.mode')=json_extract(NEW.payload,'$.mode')
 AND trim(json_extract(p.payload,'$.title'))=trim(json_extract(NEW.payload,'$.title')))
 THEN RAISE(ABORT,'QUESTION_SET_ALREADY_EXISTS') END;
END;
--> statement-breakpoint
CREATE TRIGGER practice_plan_name_reserve_insert AFTER INSERT ON practice_plans
BEGIN
 DELETE FROM practice_plan_names WHERE plan_id=NEW.id;
 INSERT INTO practice_plan_names(space_id,type,name,plan_id)
 SELECT coalesce((SELECT space_id FROM subjects WHERE id=NEW.subject_id),CASE WHEN NEW.subject_id IN ('go','backend') THEN 'go-interview' ELSE NEW.subject_id END),CASE json_extract(NEW.payload,'$.mode') WHEN 'random' THEN 'training' WHEN 'interview' THEN 'mock' WHEN 'exam' THEN 'exam' END,trim(json_extract(NEW.payload,'$.title')),NEW.id
 WHERE CASE json_extract(NEW.payload,'$.mode') WHEN 'random' THEN 'training' WHEN 'interview' THEN 'mock' WHEN 'exam' THEN 'exam' END IS NOT NULL;
END;

--> statement-breakpoint
CREATE TRIGGER practice_plan_name_check_update BEFORE UPDATE OF payload,subject_id ON practice_plans
WHEN CASE json_extract(NEW.payload,'$.mode') WHEN 'random' THEN 'training' WHEN 'interview' THEN 'mock' WHEN 'exam' THEN 'exam' END IS NOT NULL
BEGIN
 SELECT CASE WHEN EXISTS(SELECT 1 FROM practice_plans p LEFT JOIN subjects s ON s.id=p.subject_id
 WHERE coalesce(s.space_id,CASE WHEN p.subject_id IN ('go','backend') THEN 'go-interview' ELSE p.subject_id END)=coalesce((SELECT space_id FROM subjects WHERE id=NEW.subject_id),CASE WHEN NEW.subject_id IN ('go','backend') THEN 'go-interview' ELSE NEW.subject_id END) AND json_extract(p.payload,'$.mode')=json_extract(NEW.payload,'$.mode')
 AND trim(json_extract(p.payload,'$.title'))=trim(json_extract(NEW.payload,'$.title')) AND p.id<>OLD.id)
 THEN RAISE(ABORT,'QUESTION_SET_ALREADY_EXISTS') END;
END;
--> statement-breakpoint
CREATE TRIGGER practice_plan_name_reserve_update AFTER UPDATE OF payload,subject_id ON practice_plans
BEGIN
 DELETE FROM practice_plan_names WHERE plan_id=NEW.id;
 INSERT INTO practice_plan_names(space_id,type,name,plan_id)
 SELECT coalesce((SELECT space_id FROM subjects WHERE id=NEW.subject_id),CASE WHEN NEW.subject_id IN ('go','backend') THEN 'go-interview' ELSE NEW.subject_id END),CASE json_extract(NEW.payload,'$.mode') WHEN 'random' THEN 'training' WHEN 'interview' THEN 'mock' WHEN 'exam' THEN 'exam' END,trim(json_extract(NEW.payload,'$.title')),NEW.id
 WHERE CASE json_extract(NEW.payload,'$.mode') WHEN 'random' THEN 'training' WHEN 'interview' THEN 'mock' WHEN 'exam' THEN 'exam' END IS NOT NULL;
END;
