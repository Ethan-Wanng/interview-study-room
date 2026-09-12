import {integer,sqliteTable,text,primaryKey,index,uniqueIndex} from 'drizzle-orm/sqlite-core';
import {sql} from 'drizzle-orm';
export const preferences=sqliteTable('preferences',{userId:text('user_id').primaryKey(),newGoal:integer('new_goal').notNull().default(10),reviewGoal:integer('review_goal').notNull().default(20)});
export const progress=sqliteTable('progress',{userId:text('user_id').notNull(),questionId:text('question_id').notNull(),stage:integer('stage').notNull().default(0),due:text('due').notNull(),lastDay:text('last_day').notNull(),firstDay:text('first_day').notNull(),rating:text('rating').notNull()},t=>[primaryKey({columns:[t.userId,t.questionId]})]);
export const activity=sqliteTable('activity',{userId:text('user_id').notNull(),questionId:text('question_id').notNull(),day:text('day').notNull(),kind:text('kind').notNull()},t=>[primaryKey({columns:[t.userId,t.questionId,t.day]})]);
export const accounts=sqliteTable('accounts',{id:text('id').primaryKey(),username:text('username').notNull().unique(),passwordHash:text('password_hash').notNull(),createdAt:integer('created_at').notNull()});
export const sessions=sqliteTable('sessions',{tokenHash:text('token_hash').primaryKey(),userId:text('user_id').notNull().references(()=>accounts.id,{onDelete:'cascade'}),expiresAt:integer('expires_at').notNull()});
export const authLimits=sqliteTable('auth_limits',{key:text('key').primaryKey(),count:integer('count').notNull(),resetAt:integer('reset_at').notNull()});
export const practiceRuns=sqliteTable('practice_runs',{
 id:text('id').primaryKey(),userId:text('user_id').notNull().references(()=>accounts.id,{onDelete:'cascade'}),
 status:text('status').notNull(),payload:text('payload').notNull(),revision:integer('revision').notNull().default(0),
 lastOp:text('last_op').notNull(),createdAt:integer('created_at').notNull(),updatedAt:integer('updated_at').notNull(),
},t=>[index('idx_practice_runs_user_created').on(t.userId,t.createdAt),uniqueIndex('idx_practice_one_active').on(t.userId).where(sql`${t.status} = 'active'`)]);
export const practicePreferences=sqliteTable('practice_preferences',{userId:text('user_id').primaryKey(),minutes:integer('minutes').notNull().default(30)});
export const practiceDays=sqliteTable('practice_days',{userId:text('user_id').notNull(),day:text('day').notNull(),seconds:integer('seconds').notNull().default(0)},t=>[primaryKey({columns:[t.userId,t.day]})]);
