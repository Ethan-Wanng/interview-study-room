import type {StarterMap} from './types';

// SQL 代码题（vector-db-7、be-e1-24、be-p1-c01）的作答框架。
export const sqlStarters:StarterMap={
'vector-db-7':{
sql:String.raw`CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE chunks (
  id        bigserial PRIMARY KEY,
  doc_id    text NOT NULL,
  -- TODO 1：补充租户字段与 1024 维向量列（vector(1024)）
  ...
);

-- TODO 2：为向量列创建 HNSW 余弦索引（vector_cosine_ops），并按需为租户列建索引
...

-- TODO 3：查询租户 'acme' 下与参数 $1 余弦距离最小的 5 条切块
SELECT id, doc_id, content, ... AS similarity
FROM chunks
WHERE ...
ORDER BY ...
LIMIT 5;`,
},

'be-e1-24':{
sql:String.raw`-- 表结构：scores(student_id, subject, score)
-- 查出每门科目分数最高的前 3 名学生（同分并列都保留）
SELECT subject, student_id, score
FROM (
    SELECT subject, student_id, score,
           -- TODO 1：使用窗口函数按科目分区、按分数降序计算排名（保留并列）
           ... AS rk
    FROM scores
) t
-- TODO 2：在外层过滤出前 3 名，并按科目、名次排序
WHERE ...
ORDER BY ...;`,
},

'be-p1-c01':{
sql:String.raw`-- 表结构：scores(student_id, course, score)
-- 查出每门课程分数排名前 3 的学生（同分并列都保留），返回 course, student_id, score, rk
SELECT course, student_id, score, rk
FROM (
  SELECT course, student_id, score,
         -- TODO 1：按 course 分区、按 score 降序使用 DENSE_RANK/RANK 计算名次
         ... AS rk
  FROM scores
) t
-- TODO 2：外层筛选 rk <= 3，并按 course、rk 排序
WHERE ...
ORDER BY ...;`,
},
};
