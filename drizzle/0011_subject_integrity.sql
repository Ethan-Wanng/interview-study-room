-- Prevent a concurrent write from reusing a subject that has just been deleted.
CREATE TRIGGER subject_delete_guard BEFORE DELETE ON subjects
WHEN EXISTS(SELECT 1 FROM managed_questions WHERE subject_id=OLD.id)
 OR EXISTS(SELECT 1 FROM practice_plans p WHERE p.subject_id=OLD.id
 OR EXISTS(SELECT 1 FROM json_each(p.payload,'$.subjectIds') WHERE value=OLD.id)
 OR EXISTS(SELECT 1 FROM json_each(p.payload,'$.questions') WHERE json_extract(value,'$.question.track')=OLD.id))
BEGIN
 SELECT RAISE(ABORT,'SUBJECT_IN_USE');
END;
--> statement-breakpoint
CREATE TRIGGER managed_questions_subject_insert BEFORE INSERT ON managed_questions
WHEN NEW.subject_id NOT IN ('go','backend') AND NOT EXISTS(SELECT 1 FROM subjects WHERE id=NEW.subject_id)
BEGIN
 SELECT RAISE(ABORT,'SUBJECT_NOT_FOUND');
END;
--> statement-breakpoint
CREATE TRIGGER managed_questions_subject_update BEFORE UPDATE OF subject_id ON managed_questions
WHEN NEW.subject_id NOT IN ('go','backend') AND NOT EXISTS(SELECT 1 FROM subjects WHERE id=NEW.subject_id)
BEGIN
 SELECT RAISE(ABORT,'SUBJECT_NOT_FOUND');
END;
--> statement-breakpoint
CREATE TRIGGER practice_plans_subject_insert BEFORE INSERT ON practice_plans
WHEN NEW.subject_id NOT IN ('go','backend') AND NOT EXISTS(SELECT 1 FROM subjects WHERE id=NEW.subject_id)
BEGIN
 SELECT RAISE(ABORT,'SUBJECT_NOT_FOUND');
END;
--> statement-breakpoint
CREATE TRIGGER practice_plans_subject_update BEFORE UPDATE OF subject_id ON practice_plans
WHEN NEW.subject_id NOT IN ('go','backend') AND NOT EXISTS(SELECT 1 FROM subjects WHERE id=NEW.subject_id)
BEGIN
 SELECT RAISE(ABORT,'SUBJECT_NOT_FOUND');
END;
