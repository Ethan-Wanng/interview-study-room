import {integer,sqliteTable,text,primaryKey,index,uniqueIndex} from 'drizzle-orm/sqlite-core';
import {sql} from 'drizzle-orm';
export const preferences=sqliteTable('preferences',{userId:text('user_id').primaryKey(),newGoal:integer('new_goal').notNull().default(10),reviewGoal:integer('review_goal').notNull().default(20)});
export const progress=sqliteTable('progress',{userId:text('user_id').notNull(),questionId:text('question_id').notNull(),stage:integer('stage').notNull().default(0),due:text('due').notNull(),lastDay:text('last_day').notNull(),firstDay:text('first_day').notNull(),rating:text('rating').notNull()},t=>[primaryKey({columns:[t.userId,t.questionId]})]);
export const activity=sqliteTable('activity',{userId:text('user_id').notNull(),questionId:text('question_id').notNull(),day:text('day').notNull(),kind:text('kind').notNull()},t=>[primaryKey({columns:[t.userId,t.questionId,t.day]})]);
export const accounts=sqliteTable('accounts',{id:text('id').primaryKey(),username:text('username').notNull().unique(),passwordHash:text('password_hash').notNull(),createdAt:integer('created_at').notNull(),isGuest:integer('is_guest').notNull().default(0),displayName:text('display_name')});
export const oauthIdentities=sqliteTable('oauth_identities',{provider:text('provider').notNull(),subject:text('subject').notNull(),accountId:text('account_id').notNull().references(()=>accounts.id,{onDelete:'cascade'}),email:text('email'),createdAt:integer('created_at').notNull()},t=>[primaryKey({columns:[t.provider,t.subject]}),index('idx_oauth_identities_account').on(t.accountId)]);
export const sessions=sqliteTable('sessions',{tokenHash:text('token_hash').primaryKey(),userId:text('user_id').notNull().references(()=>accounts.id,{onDelete:'cascade'}),expiresAt:integer('expires_at').notNull()});
export const authLimits=sqliteTable('auth_limits',{key:text('key').primaryKey(),count:integer('count').notNull(),resetAt:integer('reset_at').notNull()});
export const practiceRuns=sqliteTable('practice_runs',{
 id:text('id').primaryKey(),userId:text('user_id').notNull().references(()=>accounts.id,{onDelete:'cascade'}),
 status:text('status').notNull(),payload:text('payload').notNull(),revision:integer('revision').notNull().default(0),
 lastOp:text('last_op').notNull(),createdAt:integer('created_at').notNull(),updatedAt:integer('updated_at').notNull(),
},t=>[index('idx_practice_runs_user_created').on(t.userId,t.createdAt),uniqueIndex('idx_practice_one_active').on(t.userId).where(sql`${t.status} = 'active'`)]);
export const practicePreferences=sqliteTable('practice_preferences',{userId:text('user_id').primaryKey(),minutes:integer('minutes').notNull().default(30)});
export const practiceDays=sqliteTable('practice_days',{userId:text('user_id').notNull(),day:text('day').notNull(),seconds:integer('seconds').notNull().default(0)},t=>[primaryKey({columns:[t.userId,t.day]})]);
export const aiGradeQuota=sqliteTable('ai_grade_quota',{userId:text('user_id').notNull().references(()=>accounts.id,{onDelete:'cascade'}),day:text('day').notNull(),count:integer('count').notNull().default(0)},t=>[primaryKey({columns:[t.userId,t.day]})]);
export const aiTutorQuota=sqliteTable('ai_tutor_quota',{userId:text('user_id').notNull().references(()=>accounts.id,{onDelete:'cascade'}),day:text('day').notNull(),count:integer('count').notNull().default(0)},t=>[primaryKey({columns:[t.userId,t.day]})]);
export const administrators=sqliteTable('administrators',{id:text('id').primaryKey(),name:text('name').notNull(),keyHash:text('key_hash').notNull().unique(),role:text('role').notNull(),subjects:text('subjects').notNull(),enabled:integer('enabled').notNull().default(1),createdBy:text('created_by'),createdAt:integer('created_at').notNull(),accountId:text('account_id').references(()=>accounts.id,{onDelete:'set null'})},t=>[uniqueIndex('idx_administrators_account').on(t.accountId)]);
export const userQuestions=sqliteTable('user_questions',{id:text('id').primaryKey(),userId:text('user_id').notNull().references(()=>accounts.id,{onDelete:'cascade'}),subjectId:text('subject_id').notNull().default('mine'),section:text('section').notNull().default(''),title:text('title').notNull(),answer:text('answer').notNull().default(''),createdAt:integer('created_at').notNull(),updatedAt:integer('updated_at').notNull()},t=>[index('idx_user_questions_user').on(t.userId,t.createdAt)]);
export const notifications=sqliteTable('notifications',{id:text('id').primaryKey(),userId:text('user_id').notNull().references(()=>accounts.id,{onDelete:'cascade'}),kind:text('kind').notNull().default('feedback'),title:text('title').notNull(),body:text('body').notNull().default(''),link:text('link').notNull().default(''),createdAt:integer('created_at').notNull(),readAt:integer('read_at')},t=>[index('idx_notifications_user').on(t.userId,t.createdAt)]);
export const userStore=sqliteTable('user_store',{userId:text('user_id').notNull().references(()=>accounts.id,{onDelete:'cascade'}),key:text('key').notNull(),value:text('value').notNull(),updatedAt:integer('updated_at').notNull()},t=>[primaryKey({columns:[t.userId,t.key]})]);
export const adminSessions=sqliteTable('admin_sessions',{tokenHash:text('token_hash').primaryKey(),adminId:text('admin_id').notNull().references(()=>administrators.id,{onDelete:'cascade'}),expiresAt:integer('expires_at').notNull()});
export const adminInvites=sqliteTable('admin_invites',{id:text('id').primaryKey(),keyHash:text('key_hash').notNull().unique(),creatorId:text('creator_id').notNull(),subjects:text('subjects').notNull(),allowNew:integer('allow_new').notNull().default(0),expiresAt:integer('expires_at').notNull(),usedBy:text('used_by'),revoked:integer('revoked').notNull().default(0),createdAt:integer('created_at').notNull()},t=>[index('idx_admin_invites_creator').on(t.creatorId,t.createdAt)]);
export const subjects=sqliteTable('subjects',{id:text('id').primaryKey(),spaceId:text('space_id').notNull().default('go-interview'),name:text('name').notNull(),nameEn:text('name_en').notNull(),nameKey:text('name_key').notNull().unique(),createdBy:text('created_by').notNull()});
export const managedQuestions=sqliteTable('managed_questions',{id:text('id').primaryKey(),subjectId:text('subject_id').notNull(),kind:text('kind').notNull(),status:text('status').notNull(),payload:text('payload').notNull(),revision:integer('revision').notNull(),updatedBy:text('updated_by').notNull(),updatedAt:integer('updated_at').notNull()},t=>[index('idx_managed_questions_subject').on(t.subjectId)]);

export const practicePlans=sqliteTable('practice_plans',{id:text('id').primaryKey(),subjectId:text('subject_id').notNull(),status:text('status').notNull(),payload:text('payload').notNull(),createdBy:text('created_by').notNull(),createdAt:integer('created_at').notNull()},t=>[index('idx_practice_plans_status').on(t.status)]);

export const spaces=sqliteTable('spaces',{id:text('id').primaryKey(),name:text('name').notNull(),nameEn:text('name_en').notNull(),createdBy:text('created_by').notNull()});

export const autoQuestionKeys=sqliteTable('auto_question_keys',{
 key:text('key').primaryKey(),requestHash:text('request_hash').notNull(),response:text('response').notNull(),createdAt:integer('created_at').notNull(),
});
export const autoQuestionFingerprints=sqliteTable('auto_question_fingerprints',{
 fingerprint:text('fingerprint').primaryKey(),questionId:text('question_id').notNull().unique(),createdAt:integer('created_at').notNull(),
});
export const autoQuestionLogs=sqliteTable('auto_question_logs',{
 id:text('id').primaryKey(),key:text('key').notNull(),status:text('status').notNull(),count:integer('count').notNull(),detail:text('detail').notNull(),createdAt:integer('created_at').notNull(),metadata:text('metadata'),
},t=>[index('idx_auto_question_logs_created').on(t.createdAt)]);

// Transaction-local insertion receipts; removed before a successful batch commits.
export const autoQuestionInsertReceipts=sqliteTable('auto_question_insert_receipts',{
 batchId:text('batch_id').notNull(),sortOrder:integer('sort_order').notNull(),
 questionId:text('question_id').notNull().references(()=>managedQuestions.id),snapshot:text('snapshot').notNull(),
},t=>[primaryKey({columns:[t.batchId,t.sortOrder]})]);
export const practicePlanQuestions=sqliteTable('practice_plan_questions',{
 planId:text('plan_id').notNull().references(()=>practicePlans.id,{onDelete:'cascade'}),
 questionId:text('question_id').notNull().references(()=>managedQuestions.id),sortOrder:integer('sort_order').notNull(),
},t=>[primaryKey({columns:[t.planId,t.sortOrder]}),uniqueIndex('idx_plan_question_unique').on(t.planId,t.questionId)]);

// Names of newly created/renamed plans. Triggers also check legacy plan rows,
// so historical data needs no destructive deduplication or bulk backfill.
export const practicePlanNames=sqliteTable('practice_plan_names',{
 spaceId:text('space_id').notNull(),type:text('type').notNull(),name:text('name').notNull(),
 planId:text('plan_id').notNull().unique().references(()=>practicePlans.id,{onDelete:'cascade'}),
},t=>[primaryKey({columns:[t.spaceId,t.type,t.name]})]);
