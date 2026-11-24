// 项目实战“复刻面试自习室”第 17 关：笔记本、自建题库与全站检索。
import type {AiLevel} from '../journey';

export const pjNotes:AiLevel={
  id:'pj-notes',
  title:'笔记本、自建题库与全站检索',
  summary:'实现学习笔记关联题目与 AI 报告收藏、个人自建题库按用户数据隔离，以及聚合题库、自建题与笔记的统一关键词检索',
  lessons:[
    {
      title:'这一关做什么：从“刷过就忘”到沉淀自己的知识库',
      body:'前面第 6、7 关做出了公共题库和按科目分页查询，第 9 关加上了账号与会话体系，第 16 关接入了 AI 流式输出，能在答题页实时生成解析和复盘报告。\n但刷题时常常遇到两个痛点：\n一、刚看完第 16 关 AI 流式输出的一段精辟总结，或者踩到一道公共题的坑，过两天就忘了当时记住了什么；\n二、自己面试时被问到的真实问题，想存进自己的私密题库反复背诵，又不能直接塞进公共题库让所有人看到。\n这一关把自习室从“只读题库”升级为“个人知识库”，做三件事：\n一、个人笔记本（`/api/notes`）：支持 Markdown 内容、标签筛选，以及反向关联公共题库、自建题库或 AI 报告；\n二、个人自建题库（`/api/my-questions`）：每个用户维护自己的私有面试题，读写删全部按当前登录用户隔离；\n三、全站统一检索（`GET /api/search`）：用一个搜索框同时查公共题库、个人自建题和学习笔记，返回各分类计数和带关键词上下文的摘要。\n另外，页面上的“加入笔记”按钮与统一搜索栏遵循极简界面原则，只保留清晰标签、操作按钮和结果状态，不堆砌冗余提示。',
    },
    {
      title:'笔记表设计：来源反向关联与标签检索',
      body:'一篇学习笔记既可能是手写的总结，也可能是在刷第 6 关公共题、看第 16 关 AI 流式输出报告或整理自建题时顺手收藏下来的。如果给 `notes` 表直接加一个指向 `questions(id)` 的外键，来源一多就会卡住：自建题和 AI 报告并不在 `questions` 表里。\n常用的做法是“多态反向关联”：用 `source_type` 和 `source_id` 两个字段一起描述来源：\n- `manual`：手写独立笔记，`source_id` 为 `NULL`；\n- `question`：来自第 6 关公共题库，`source_id` 存对应题目编号；\n- `custom`：来自个人自建题库，`source_id` 存对应自建题编号；\n- `ai_report`：来自第 16 关 AI 流式输出生成的点评或报告，`source_id` 可选记录关联编号。\n标签为了保持单表结构简单，先在写入时做规范化（按中英文逗号拆分、去首尾空白、去重后用 `,` 拼成 `"go,并发"`）。查询某个标签时，用 `\',\' || tags || \',\' LIKE \'%,' + 'tag' + ',%\'` 加边界逗号匹配，就不会在搜 `go` 时误命中 `golang`。',
      code:`CREATE TABLE IF NOT EXISTS notes (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id     INTEGER NOT NULL REFERENCES users(id),
    title       TEXT    NOT NULL,
    content     TEXT    NOT NULL,
    tags        TEXT    NOT NULL DEFAULT '',
    source_type TEXT    NOT NULL DEFAULT 'manual',
    source_id   INTEGER,
    created_at  TEXT    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at  TEXT    NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_notes_user ON notes(user_id, updated_at DESC);

-- 按精确标签筛选（防止搜 "go" 误命中 "golang"）
SELECT id, title, content, tags, source_type, source_id, created_at, updated_at
FROM notes
WHERE user_id = ?
  AND (? = '' OR (',' || tags || ',') LIKE '%,' || ? || ',%' ESCAPE '\\')
ORDER BY updated_at DESC, id DESC;`,
      explain:[
        {at:'CREATE TABLE IF NOT EXISTS notes (',to:'id          INTEGER PRIMARY KEY AUTOINCREMENT,',text:'新建 notes 表，主键 id 自动递增。'},
        {at:'user_id     INTEGER NOT NULL REFERENCES users(id),',text:'关联第 9 关的 users 表，标明这篇笔记属于哪位用户。'},
        {at:'title       TEXT    NOT NULL,',to:'tags        TEXT    NOT NULL DEFAULT \'\',',text:'标题、Markdown 正文和规范化后的逗号分隔标签。'},
        {at:'source_type TEXT    NOT NULL DEFAULT \'manual\',',to:'source_id   INTEGER,',text:'来源反向关联：source_type 区分 manual、question、custom 或 ai_report；source_id 允许为空（独立笔记为 NULL）。'},
        {at:'created_at  TEXT    NOT NULL DEFAULT CURRENT_TIMESTAMP,',to:');',text:'记录创建和最后修改时间，方便按最近更新排序。'},
        {at:'CREATE INDEX IF NOT EXISTS idx_notes_user',text:'按 user_id 和更新时间建复合索引，查询个人笔记列表时更快。'},
        {at:'SELECT id, title, content, tags, source_type, source_id, created_at, updated_at',to:'FROM notes',text:'只列出需要的字段。'},
        {at:'WHERE user_id = ?',text:'所有个人笔记查询必须把 user_id 锁定为当前登录用户。'},
        {at:"AND (? = '' OR (',' || tags || ',') LIKE '%,' || ? || ',%' ESCAPE '\\')",text:'左右各拼一个逗号再匹配，确保只命中完整标签，并用 ESCAPE 转义特殊字符。'},
        {at:'ORDER BY updated_at DESC, id DESC;',text:'最近修改的笔记排在最前面，同一秒修改时按 id 倒序保持稳定。'},
      ],
    },
    {
      title:'自建题库：私有题目的归属隔离',
      body:'第 6 关的 `questions` 表是所有用户共用的公共题库，只有管理员（第 15/16 关权限控制）才能修改。用户自己的私有题目则单独存进 `my_questions` 表，字段结构和公共题库保持一致，只多出 `user_id` 与时间戳。\n私有数据最重要的安全红线是防越权（IDOR，不安全的直接对象引用）：\n一、读取用户身份只能依靠第 9 关会话中间件查出的 `user_id`，绝不信任请求参数或 JSON 体里传来的 `userId`；\n二、查询、修改、删除单条数据时，SQL 必须写成 `WHERE id = ? AND user_id = ?`，不能只写 `WHERE id = ?` 后再在代码里“顺便判断”；\n三、碰到别人的资源编号时，统一返回 404（或 403/404 拦截），返回 404 还能避免向攻击者透露这个编号是否存在。\n另外，第 7 关已经用参数化查询防住了单引号 `\'` 造成的 SQL 注入；但在 `LIKE` 模糊查询里，如果用户输入 `%` 或 `_`，它们依然会被数据库当作通配符（搜 `%` 会拖出整张表）。所以必须在代码里把 `\\`、`%`、`_` 转义掉，并在 SQL 里声明 `ESCAPE \'\\\'`。',
      code:`CREATE TABLE IF NOT EXISTS my_questions (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id    INTEGER NOT NULL REFERENCES users(id),
    category   TEXT    NOT NULL,
    title      TEXT    NOT NULL,
    answer     TEXT    NOT NULL,
    difficulty INTEGER NOT NULL DEFAULT 1,
    created_at TEXT    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT    NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_my_questions_user ON my_questions(user_id, id DESC);

-- 修改或删除私有题目时，必须同时限制 id 与 user_id
UPDATE my_questions
SET category = ?, title = ?, answer = ?, difficulty = ?, updated_at = CURRENT_TIMESTAMP
WHERE id = ? AND user_id = ?;

-- 安全的 LIKE 模糊查询：参数化防止单引号注入，ESCAPE '\\' 防止 % 和 _ 通配整表
SELECT id, category, title, answer, difficulty, created_at, updated_at
FROM my_questions
WHERE user_id = ?
  AND (title LIKE '%' || ? || '%' ESCAPE '\\' OR answer LIKE '%' || ? || '%' ESCAPE '\\')
ORDER BY id DESC;`,
      explain:[
        {at:'CREATE TABLE IF NOT EXISTS my_questions (',to:'user_id    INTEGER NOT NULL REFERENCES users(id),',text:'自建题库表，通过 user_id 绑定创建者，与公共题库 questions 彻底分开。'},
        {at:'category   TEXT    NOT NULL,',to:');',text:'题目字段沿用第 6 关设计（科目、标题、答案、难度）并补充时间戳。'},
        {at:'CREATE INDEX IF NOT EXISTS idx_my_questions_user',text:'按用户和 id 倒序建立索引，加速个人题库列表读取。'},
        {at:'UPDATE my_questions',to:'WHERE id = ? AND user_id = ?;',text:'更新（以及删除、详情查询）把归属条件直接写进 SQL，影响行数为 0 就说明不存在或不属于当前用户。'},
        {at:'SELECT id, category, title, answer, difficulty, created_at, updated_at',to:'WHERE user_id = ?',text:'关键词检索同样先按 user_id 隔离，绝不查到别人的私有题。'},
        {at:'AND (title LIKE',to:'ORDER BY id DESC;',text:'占位符防住单引号注入，ESCAPE \'\\\' 配合代码转义让 % 和 _ 只匹配字面字符。'},
      ],
    },
    {
      title:'一键加入笔记与全站统一检索',
      body:'当用户在公共题目详情页点击“加入笔记”，或在看完第 16 关 AI 流式输出的复盘报告后点“收藏到笔记”，前端只需把 `title`、`content`、`tags` 和 `sourceType` / `sourceId` 发给 `POST /api/notes`。后端如果看到 `sourceType` 是 `question` 或 `custom` 且带了 `sourceId`，会先确认那道题存在（自建题还要确认属于当前用户），不存在就返回 404，防止出现悬空引用。\n全站统一检索 `GET /api/search?q=...&type=all|question|custom|note&page=1&size=10` 要把三类数据聚合到一个列表里：\n一、匿名访问时只搜公共题库 `questions`，不暴露任何人的私有笔记或自建题；已登录时则聚合公共题库 + 自己的自建题 + 自己的笔记；\n二、先分别统计三类命中总数 `counts`，再按 `type` 过滤并分页切片；这样前端在“全部”“题库”“自建题”“笔记”四个标签上都能显示准确的命中数；\n三、摘要高亮要防 XSS：后端从正文里截取关键词前后的一段纯文本 `snippet`（带 `…` 省略号），绝不拼装 HTML 返回；前端用文本节点或 JSX `<mark>` 安全渲染高亮。',
      code:`# 笔记接口（全部需登录，未登录 401；他人资源 404）
GET    /api/notes?q=&tag=&sourceType=    → 200 {"items": [Note, ...]}
POST   /api/notes                         → 201 Note（关联题不存在 404；参数不合法 400）
GET    /api/notes/{id}                    → 200 Note / 404
PUT    /api/notes/{id}                    → 200 Note / 400 / 404
DELETE /api/notes/{id}                    → 204 / 404

# 自建题库接口（全部需登录，未登录 401；他人资源 404）
GET    /api/my-questions?category=&q=     → 200 {"items": [CustomQuestion, ...]}
POST   /api/my-questions                  → 201 CustomQuestion / 400
PUT    /api/my-questions/{id}             → 200 CustomQuestion / 400 / 404
DELETE /api/my-questions/{id}             → 204 / 404

# 全站统一检索（未登录只搜公共题库；已登录聚合三类数据）
GET    /api/search?q=defer&type=all&page=1&size=10
→ 200 {
  "items": [{"type": "question|custom|note", "id": 1, "title": "…", "snippet": "…", "category": "go", "tags": "", "sourceType": "", "sourceId": null, "updatedAt": "…"}],
  "total": 3, "page": 1, "size": 10,
  "counts": {"question": 1, "custom": 1, "note": 1}
}
→ 400 {"error": "参数不合法"}`,
      explain:[
        {at:'GET    /api/notes?q=&tag=&sourceType=',to:'DELETE /api/notes/{id}                    → 204 / 404',text:'个人笔记本的 5 个接口：支持关键词、精确标签和来源类型筛选，单条操作严格按当前用户隔离。'},
        {at:'GET    /api/my-questions?category=&q=',to:'DELETE /api/my-questions/{id}             → 204 / 404',text:'自建题库的 4 个接口：增删改查都校验登录态与题目归属，参数沿用第 16 关题库规范。'},
        {at:'GET    /api/search?q=defer&type=all&page=1&size=10',to:'"counts": {"question": 1, "custom": 1, "note": 1}',text:'统一搜索接口：返回当前页命中的混合列表、当前过滤条件下的总数、分页信息以及三类命中计数。'},
        {at:'→ 400 {"error": "参数不合法"}',text:'type 非法、page 小于 1 或 size 超出 1..50 时返回 400，防止拖库或异常偏移。'},
      ],
    },
    {
      title:'任务一：笔记本与自建题库的数据访问层',
      body:'先把 `notes` 和 `my_questions` 两张表建起来，再实现它们的数据访问层：笔记和自建题的增删改查、归属隔离（`WHERE id = ? AND user_id = ?`），以及带通配符安全转义的跨表搜索查询。',
      variants:{
        go:{
          body:'Go 版本在 `internal/store/notes.go` 里新增 `NoteStore`，复用第 6 关的 `qs.DB()` 连接池。注意 `Note.SourceID` 用 `*int` 表达可空的 `source_id`，查询三类来源的 SQL 统一用 `ESCAPE \'\\\'` 配合 `EscapeLike`。',
          practice:{
            steps:[
              '新建 internal/store/notes.go，读懂建表语句和扫描函数，补完 TODO 1 到 5。',
              '运行 go build ./internal/store/... 确认数据访问层编译无误。',
            ],
            expect:'go build ./internal/store/... 没有输出报错',
          },
          code:`// internal/store/notes.go
package store

import (
    "database/sql"
    "errors"
    "strings"
)

type Note struct {
    ID         int    \`json:"id"\`
    Title      string \`json:"title"\`
    Content    string \`json:"content"\`
    Tags       string \`json:"tags"\`
    SourceType string \`json:"sourceType"\`
    SourceID   *int   \`json:"sourceId"\`
    CreatedAt  string \`json:"createdAt"\`
    UpdatedAt  string \`json:"updatedAt"\`
}

type CustomQuestion struct {
    ID         int    \`json:"id"\`
    Category   string \`json:"category"\`
    Title      string \`json:"title"\`
    Answer     string \`json:"answer"\`
    Difficulty int    \`json:"difficulty"\`
    CreatedAt  string \`json:"createdAt"\`
    UpdatedAt  string \`json:"updatedAt"\`
}

type SearchRaw struct {
    Type       string
    ID         int
    Title      string
    Body       string
    Category   string
    Tags       string
    SourceType string
    SourceID   *int
    UpdatedAt  string
}

var noteSchema = []string{
    \`CREATE TABLE IF NOT EXISTS notes (
        id          INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id     INTEGER NOT NULL REFERENCES users(id),
        title       TEXT    NOT NULL,
        content     TEXT    NOT NULL,
        tags        TEXT    NOT NULL DEFAULT '',
        source_type TEXT    NOT NULL DEFAULT 'manual',
        source_id   INTEGER,
        created_at  TEXT    NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at  TEXT    NOT NULL DEFAULT CURRENT_TIMESTAMP
    )\`,
    \`CREATE INDEX IF NOT EXISTS idx_notes_user ON notes(user_id, updated_at DESC)\`,
    \`CREATE TABLE IF NOT EXISTS my_questions (
        id         INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id    INTEGER NOT NULL REFERENCES users(id),
        category   TEXT    NOT NULL,
        title      TEXT    NOT NULL,
        answer     TEXT    NOT NULL,
        difficulty INTEGER NOT NULL DEFAULT 1,
        created_at TEXT    NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT    NOT NULL DEFAULT CURRENT_TIMESTAMP
    )\`,
    \`CREATE INDEX IF NOT EXISTS idx_my_questions_user ON my_questions(user_id, id DESC)\`,
}

type NoteStore struct {
    db *sql.DB
}

func NewNoteStore(db *sql.DB) (*NoteStore, error) {
    for _, stmt := range noteSchema {
        if _, err := db.Exec(stmt); err != nil {
            return nil, err
        }
    }
    return &NoteStore{db: db}, nil
}

// EscapeLike 先转义反斜杠，再转义 % 和 _，配合 SQL 里的 ESCAPE '\\'。
func EscapeLike(s string) string {
    // TODO 1：用 strings.NewReplacer 把 "\\" -> "\\\\", "%" -> "\\%", "_" -> "\\_"
    return s
}

func scanNote(row interface{ Scan(...any) error }) (Note, error) {
    var n Note
    err := row.Scan(&n.ID, &n.Title, &n.Content, &n.Tags, &n.SourceType, &n.SourceID, &n.CreatedAt, &n.UpdatedAt)
    return n, err
}

func (s *NoteStore) CreateNote(userID int, n Note) (Note, error) {
    // TODO 2：INSERT INTO notes (user_id, title, content, tags, source_type, source_id) VALUES (?, ?, ?, ?, ?, ?)，
    //         拿到 LastInsertId 后调用 s.GetNote(userID, int(id)) 返回完整记录
    return Note{}, nil
}

func (s *NoteStore) GetNote(userID, id int) (Note, error) {
    n, err := scanNote(s.db.QueryRow(\`SELECT id, title, content, tags, source_type, source_id, created_at, updated_at
        FROM notes WHERE id = ? AND user_id = ?\`, id, userID))
    if errors.Is(err, sql.ErrNoRows) {
        return Note{}, ErrNotFound
    }
    return n, err
}

func (s *NoteStore) ListNotes(userID int, keyword, tag, sourceType string) ([]Note, error) {
    kw := EscapeLike(keyword)
    tg := EscapeLike(tag)
    rows, err := s.db.Query(\`SELECT id, title, content, tags, source_type, source_id, created_at, updated_at FROM notes
        WHERE user_id = ?
          AND (? = '' OR title LIKE '%' || ? || '%' ESCAPE '\\' OR content LIKE '%' || ? || '%' ESCAPE '\\')
          AND (? = '' OR (',' || tags || ',') LIKE '%,' || ? || ',%' ESCAPE '\\')
          AND (? = '' OR source_type = ?)
        ORDER BY updated_at DESC, id DESC\`, userID, kw, kw, kw, tg, tg, sourceType, sourceType)
    if err != nil {
        return nil, err
    }
    defer rows.Close()
    items := []Note{}
    for rows.Next() {
        n, err := scanNote(rows)
        if err != nil {
            return nil, err
        }
        items = append(items, n)
    }
    return items, rows.Err()
}

func (s *NoteStore) UpdateNote(userID, id int, title, content, tags string) (Note, error) {
    // TODO 3：UPDATE notes SET title = ?, content = ?, tags = ?, updated_at = CURRENT_TIMESTAMP
    //         WHERE id = ? AND user_id = ?；RowsAffected 为 0 返回 ErrNotFound，否则返回 s.GetNote
    return Note{}, nil
}

func (s *NoteStore) DeleteNote(userID, id int) error {
    res, err := s.db.Exec("DELETE FROM notes WHERE id = ? AND user_id = ?", id, userID)
    if err != nil {
        return err
    }
    if n, err := res.RowsAffected(); err != nil || n == 0 {
        return ErrNotFound
    }
    return nil
}

func (s *NoteStore) CreateCustom(userID int, q CustomQuestion) (CustomQuestion, error) {
    res, err := s.db.Exec(\`INSERT INTO my_questions (user_id, category, title, answer, difficulty)
        VALUES (?, ?, ?, ?, ?)\`, userID, q.Category, q.Title, q.Answer, q.Difficulty)
    if err != nil {
        return q, err
    }
    id, err := res.LastInsertId()
    if err != nil {
        return q, err
    }
    return s.GetCustom(userID, int(id))
}

func (s *NoteStore) GetCustom(userID, id int) (CustomQuestion, error) {
    var q CustomQuestion
    err := s.db.QueryRow(\`SELECT id, category, title, answer, difficulty, created_at, updated_at
        FROM my_questions WHERE id = ? AND user_id = ?\`, id, userID).
        Scan(&q.ID, &q.Category, &q.Title, &q.Answer, &q.Difficulty, &q.CreatedAt, &q.UpdatedAt)
    if errors.Is(err, sql.ErrNoRows) {
        return q, ErrNotFound
    }
    return q, err
}

func (s *NoteStore) ListCustom(userID int, category, keyword string) ([]CustomQuestion, error) {
    kw := EscapeLike(keyword)
    rows, err := s.db.Query(\`SELECT id, category, title, answer, difficulty, created_at, updated_at
        FROM my_questions WHERE user_id = ? AND (? = '' OR category = ?)
          AND (? = '' OR title LIKE '%' || ? || '%' ESCAPE '\\' OR answer LIKE '%' || ? || '%' ESCAPE '\\')
        ORDER BY id DESC\`, userID, category, category, kw, kw, kw)
    if err != nil {
        return nil, err
    }
    defer rows.Close()
    items := []CustomQuestion{}
    for rows.Next() {
        var q CustomQuestion
        if err := rows.Scan(&q.ID, &q.Category, &q.Title, &q.Answer, &q.Difficulty, &q.CreatedAt, &q.UpdatedAt); err != nil {
            return nil, err
        }
        items = append(items, q)
    }
    return items, rows.Err()
}

func (s *NoteStore) UpdateCustom(userID, id int, q CustomQuestion) (CustomQuestion, error) {
    // TODO 4：UPDATE my_questions SET category = ?, title = ?, answer = ?, difficulty = ?, updated_at = CURRENT_TIMESTAMP
    //         WHERE id = ? AND user_id = ?；RowsAffected 为 0 返回 ErrNotFound，否则返回 s.GetCustom
    return CustomQuestion{}, nil
}

func (s *NoteStore) DeleteCustom(userID, id int) error {
    res, err := s.db.Exec("DELETE FROM my_questions WHERE id = ? AND user_id = ?", id, userID)
    if err != nil {
        return err
    }
    if n, err := res.RowsAffected(); err != nil || n == 0 {
        return ErrNotFound
    }
    return nil
}

// SearchSources 聚合查询公共题库、个人自建题和个人笔记，userID 为 0 时只返回公共题库。
func (s *NoteStore) SearchSources(userID int, keyword string) ([]SearchRaw, error) {
    // TODO 5：用 EscapeLike 转义 keyword，在单个 UNION ALL 查询里按 LIKE '%' || ? || '%' ESCAPE '\\'
    //         检索 questions（'question'）、my_questions（'custom'，user_id = ?）和 notes（'note'，user_id = ?），
    //         逐行 Scan 成 SearchRaw 切片返回
    return []SearchRaw{}, nil
}`,
          explain:[
            {at:'// internal/store/notes.go',to:'"strings"',text:'新建数据访问层文件，导入数据库、错误与字符串工具包。'},
            {at:'type Note struct {',to:'type CustomQuestion struct {',text:'Note 结构体对应笔记返回结构，SourceID 用 *int 区分 NULL 与 0。'},
            {at:'ID         int    `json:"id"`',to:'type SearchRaw struct {',text:'CustomQuestion 表示用户私有自建题目。'},
            {at:'Type       string',to:'var noteSchema = []string{',text:'SearchRaw 统一装下三种来源的检索命中原始行，方便业务层算计数、截取摘要并分页。'},
            {at:'`CREATE TABLE IF NOT EXISTS notes (',to:'`CREATE INDEX IF NOT EXISTS idx_my_questions_user ON my_questions(user_id, id DESC)`',text:'建表与索引脚本：笔记表带来源关联与标签，自建题表按 user_id 隔离。'},
            {at:'type NoteStore struct {',to:'return &NoteStore{db: db}, nil',text:'NoteStore 初始化时依次执行建表和索引语句。'},
            {at:'func EscapeLike(s string) string {',to:'func scanNote(',text:'EscapeLike 是通配符转义助手，待你补全 TODO 1；scanNote 复用单行/多行扫描逻辑。'},
            {at:'var n Note',to:'return n, err',text:'把查询出来的笔记行依次写进 Note 字段。'},
            {at:'func (s *NoteStore) CreateNote(',to:'return Note{}, nil',text:'新增笔记方法，待补全 TODO 2。'},
            {at:'func (s *NoteStore) GetNote(',to:'return n, err',text:'按 id 和 user_id 一起查单条笔记，别人的笔记也返回 ErrNotFound。'},
            {at:'func (s *NoteStore) ListNotes(',to:'return items, rows.Err()',text:'支持关键词（匹配标题或正文）、精确标签（逗号边界匹配）和来源类型筛选。'},
            {at:'func (s *NoteStore) UpdateNote(',to:'return Note{}, nil',text:'更新笔记方法，待补全 TODO 3。'},
            {at:'func (s *NoteStore) DeleteNote(',to:'return nil',text:'删除笔记时同样限制 user_id，受影响行数为 0 返回 ErrNotFound。'},
            {at:'func (s *NoteStore) CreateCustom(',to:'return s.GetCustom(userID, int(id))',text:'新增自建题后回查一次，把数据库填好的时间戳一并返回。'},
            {at:'func (s *NoteStore) GetCustom(',to:'return q, err',text:'按 id 与 user_id 查单条自建题，防止越权查看。'},
            {at:'func (s *NoteStore) ListCustom(',to:'return items, rows.Err()',text:'按科目与安全转义后的关键词列出个人自建题。'},
            {at:'func (s *NoteStore) UpdateCustom(',to:'return CustomQuestion{}, nil',text:'修改自建题方法，待补全 TODO 4。'},
            {at:'func (s *NoteStore) DeleteCustom(',to:'return nil',text:'删除自建题，受影响行数为 0 返回 ErrNotFound。'},
            {at:'func (s *NoteStore) SearchSources(',to:'return []SearchRaw{}, nil',text:'跨三张来源表的聚合检索方法，待补全 TODO 5。'},
          ],
          solution:{
            code:`// internal/store/notes.go
package store

import (
    "database/sql"
    "errors"
    "strings"
)

type Note struct {
    ID         int    \`json:"id"\`
    Title      string \`json:"title"\`
    Content    string \`json:"content"\`
    Tags       string \`json:"tags"\`
    SourceType string \`json:"sourceType"\`
    SourceID   *int   \`json:"sourceId"\`
    CreatedAt  string \`json:"createdAt"\`
    UpdatedAt  string \`json:"updatedAt"\`
}

type CustomQuestion struct {
    ID         int    \`json:"id"\`
    Category   string \`json:"category"\`
    Title      string \`json:"title"\`
    Answer     string \`json:"answer"\`
    Difficulty int    \`json:"difficulty"\`
    CreatedAt  string \`json:"createdAt"\`
    UpdatedAt  string \`json:"updatedAt"\`
}

type SearchRaw struct {
    Type       string
    ID         int
    Title      string
    Body       string
    Category   string
    Tags       string
    SourceType string
    SourceID   *int
    UpdatedAt  string
}

var noteSchema = []string{
    \`CREATE TABLE IF NOT EXISTS notes (
        id          INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id     INTEGER NOT NULL REFERENCES users(id),
        title       TEXT    NOT NULL,
        content     TEXT    NOT NULL,
        tags        TEXT    NOT NULL DEFAULT '',
        source_type TEXT    NOT NULL DEFAULT 'manual',
        source_id   INTEGER,
        created_at  TEXT    NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at  TEXT    NOT NULL DEFAULT CURRENT_TIMESTAMP
    )\`,
    \`CREATE INDEX IF NOT EXISTS idx_notes_user ON notes(user_id, updated_at DESC)\`,
    \`CREATE TABLE IF NOT EXISTS my_questions (
        id         INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id    INTEGER NOT NULL REFERENCES users(id),
        category   TEXT    NOT NULL,
        title      TEXT    NOT NULL,
        answer     TEXT    NOT NULL,
        difficulty INTEGER NOT NULL DEFAULT 1,
        created_at TEXT    NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT    NOT NULL DEFAULT CURRENT_TIMESTAMP
    )\`,
    \`CREATE INDEX IF NOT EXISTS idx_my_questions_user ON my_questions(user_id, id DESC)\`,
}

type NoteStore struct {
    db *sql.DB
}

func NewNoteStore(db *sql.DB) (*NoteStore, error) {
    for _, stmt := range noteSchema {
        if _, err := db.Exec(stmt); err != nil {
            return nil, err
        }
    }
    return &NoteStore{db: db}, nil
}

// EscapeLike 先转义反斜杠，再转义 % 和 _，配合 SQL 里的 ESCAPE '\\'。
func EscapeLike(s string) string {
    return strings.NewReplacer("\\\\", "\\\\\\\\", "%", "\\\\%", "_", "\\\\_").Replace(s)
}

func scanNote(row interface{ Scan(...any) error }) (Note, error) {
    var n Note
    err := row.Scan(&n.ID, &n.Title, &n.Content, &n.Tags, &n.SourceType, &n.SourceID, &n.CreatedAt, &n.UpdatedAt)
    return n, err
}

func (s *NoteStore) CreateNote(userID int, n Note) (Note, error) {
    res, err := s.db.Exec(\`INSERT INTO notes (user_id, title, content, tags, source_type, source_id)
        VALUES (?, ?, ?, ?, ?, ?)\`, userID, n.Title, n.Content, n.Tags, n.SourceType, n.SourceID)
    if err != nil {
        return Note{}, err
    }
    id, err := res.LastInsertId()
    if err != nil {
        return Note{}, err
    }
    return s.GetNote(userID, int(id))
}

func (s *NoteStore) GetNote(userID, id int) (Note, error) {
    n, err := scanNote(s.db.QueryRow(\`SELECT id, title, content, tags, source_type, source_id, created_at, updated_at
        FROM notes WHERE id = ? AND user_id = ?\`, id, userID))
    if errors.Is(err, sql.ErrNoRows) {
        return Note{}, ErrNotFound
    }
    return n, err
}

func (s *NoteStore) ListNotes(userID int, keyword, tag, sourceType string) ([]Note, error) {
    kw := EscapeLike(keyword)
    tg := EscapeLike(tag)
    rows, err := s.db.Query(\`SELECT id, title, content, tags, source_type, source_id, created_at, updated_at FROM notes
        WHERE user_id = ?
          AND (? = '' OR title LIKE '%' || ? || '%' ESCAPE '\\' OR content LIKE '%' || ? || '%' ESCAPE '\\')
          AND (? = '' OR (',' || tags || ',') LIKE '%,' || ? || ',%' ESCAPE '\\')
          AND (? = '' OR source_type = ?)
        ORDER BY updated_at DESC, id DESC\`, userID, kw, kw, kw, tg, tg, sourceType, sourceType)
    if err != nil {
        return nil, err
    }
    defer rows.Close()
    items := []Note{}
    for rows.Next() {
        n, err := scanNote(rows)
        if err != nil {
            return nil, err
        }
        items = append(items, n)
    }
    return items, rows.Err()
}

func (s *NoteStore) UpdateNote(userID, id int, title, content, tags string) (Note, error) {
    res, err := s.db.Exec(\`UPDATE notes SET title = ?, content = ?, tags = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ? AND user_id = ?\`, title, content, tags, id, userID)
    if err != nil {
        return Note{}, err
    }
    if n, err := res.RowsAffected(); err != nil || n == 0 {
        return Note{}, ErrNotFound
    }
    return s.GetNote(userID, id)
}

func (s *NoteStore) DeleteNote(userID, id int) error {
    res, err := s.db.Exec("DELETE FROM notes WHERE id = ? AND user_id = ?", id, userID)
    if err != nil {
        return err
    }
    if n, err := res.RowsAffected(); err != nil || n == 0 {
        return ErrNotFound
    }
    return nil
}

func (s *NoteStore) CreateCustom(userID int, q CustomQuestion) (CustomQuestion, error) {
    res, err := s.db.Exec(\`INSERT INTO my_questions (user_id, category, title, answer, difficulty)
        VALUES (?, ?, ?, ?, ?)\`, userID, q.Category, q.Title, q.Answer, q.Difficulty)
    if err != nil {
        return q, err
    }
    id, err := res.LastInsertId()
    if err != nil {
        return q, err
    }
    return s.GetCustom(userID, int(id))
}

func (s *NoteStore) GetCustom(userID, id int) (CustomQuestion, error) {
    var q CustomQuestion
    err := s.db.QueryRow(\`SELECT id, category, title, answer, difficulty, created_at, updated_at
        FROM my_questions WHERE id = ? AND user_id = ?\`, id, userID).
        Scan(&q.ID, &q.Category, &q.Title, &q.Answer, &q.Difficulty, &q.CreatedAt, &q.UpdatedAt)
    if errors.Is(err, sql.ErrNoRows) {
        return q, ErrNotFound
    }
    return q, err
}

func (s *NoteStore) ListCustom(userID int, category, keyword string) ([]CustomQuestion, error) {
    kw := EscapeLike(keyword)
    rows, err := s.db.Query(\`SELECT id, category, title, answer, difficulty, created_at, updated_at
        FROM my_questions WHERE user_id = ? AND (? = '' OR category = ?)
          AND (? = '' OR title LIKE '%' || ? || '%' ESCAPE '\\' OR answer LIKE '%' || ? || '%' ESCAPE '\\')
        ORDER BY id DESC\`, userID, category, category, kw, kw, kw)
    if err != nil {
        return nil, err
    }
    defer rows.Close()
    items := []CustomQuestion{}
    for rows.Next() {
        var q CustomQuestion
        if err := rows.Scan(&q.ID, &q.Category, &q.Title, &q.Answer, &q.Difficulty, &q.CreatedAt, &q.UpdatedAt); err != nil {
            return nil, err
        }
        items = append(items, q)
    }
    return items, rows.Err()
}

func (s *NoteStore) UpdateCustom(userID, id int, q CustomQuestion) (CustomQuestion, error) {
    res, err := s.db.Exec(\`UPDATE my_questions SET category = ?, title = ?, answer = ?, difficulty = ?,
        updated_at = CURRENT_TIMESTAMP WHERE id = ? AND user_id = ?\`,
        q.Category, q.Title, q.Answer, q.Difficulty, id, userID)
    if err != nil {
        return q, err
    }
    if n, err := res.RowsAffected(); err != nil || n == 0 {
        return q, ErrNotFound
    }
    return s.GetCustom(userID, id)
}

func (s *NoteStore) DeleteCustom(userID, id int) error {
    res, err := s.db.Exec("DELETE FROM my_questions WHERE id = ? AND user_id = ?", id, userID)
    if err != nil {
        return err
    }
    if n, err := res.RowsAffected(); err != nil || n == 0 {
        return ErrNotFound
    }
    return nil
}

// SearchSources 聚合查询公共题库、个人自建题和个人笔记，userID 为 0 时只返回公共题库。
func (s *NoteStore) SearchSources(userID int, keyword string) ([]SearchRaw, error) {
    kw := EscapeLike(keyword)
    rows, err := s.db.Query(\`
        SELECT 'question', id, title, answer, category, '', '', NULL, ''
        FROM questions
        WHERE title LIKE '%' || ? || '%' ESCAPE '\\' OR answer LIKE '%' || ? || '%' ESCAPE '\\'
        UNION ALL
        SELECT 'custom', id, title, answer, category, '', '', NULL, updated_at
        FROM my_questions
        WHERE user_id = ? AND (title LIKE '%' || ? || '%' ESCAPE '\\' OR answer LIKE '%' || ? || '%' ESCAPE '\\')
        UNION ALL
        SELECT 'note', id, title, content, '', tags, source_type, source_id, updated_at
        FROM notes
        WHERE user_id = ? AND (title LIKE '%' || ? || '%' ESCAPE '\\'
          OR content LIKE '%' || ? || '%' ESCAPE '\\' OR tags LIKE '%' || ? || '%' ESCAPE '\\')\`,
        kw, kw, userID, kw, kw, userID, kw, kw, kw)
    if err != nil {
        return nil, err
    }
    defer rows.Close()
    hits := []SearchRaw{}
    for rows.Next() {
        var r SearchRaw
        if err := rows.Scan(&r.Type, &r.ID, &r.Title, &r.Body, &r.Category, &r.Tags,
            &r.SourceType, &r.SourceID, &r.UpdatedAt); err != nil {
            return nil, err
        }
        hits = append(hits, r)
    }
    return hits, rows.Err()
}`,
            explain:[
              {at:'// internal/store/notes.go',to:'"strings"',text:'新建数据访问层文件，导入数据库、错误与字符串工具包。'},
              {at:'type Note struct {',to:'type CustomQuestion struct {',text:'Note 结构体对应笔记返回结构，SourceID 用 *int 区分 NULL 与 0。'},
              {at:'ID         int    `json:"id"`',to:'type SearchRaw struct {',text:'CustomQuestion 表示用户私有自建题目。'},
              {at:'Type       string',to:'var noteSchema = []string{',text:'SearchRaw 统一装下三种来源的检索命中原始行，方便业务层算计数、截取摘要并分页。'},
              {at:'`CREATE TABLE IF NOT EXISTS notes (',to:'`CREATE INDEX IF NOT EXISTS idx_my_questions_user ON my_questions(user_id, id DESC)`',text:'建表与索引脚本：笔记表带来源关联与标签，自建题表按 user_id 隔离。'},
              {at:'type NoteStore struct {',to:'return &NoteStore{db: db}, nil',text:'NoteStore 初始化时依次执行建表和索引语句。'},
              {at:'func EscapeLike(s string) string {',to:'return strings.NewReplacer(',text:'必须先把反斜杠替换为双反斜杠，再转义 % 和 _，否则后面加的反斜杠会被自己再次转义。'},
              {at:'func scanNote(',to:'return n, err',text:'把查询出来的笔记行依次写进 Note 字段。'},
              {at:'func (s *NoteStore) CreateNote(',to:'return s.GetNote(userID, int(id))',text:'插入笔记并绑定 userID，然后用 LastInsertId 回查完整结构。'},
              {at:'func (s *NoteStore) GetNote(',to:'return n, err',text:'按 id 和 user_id 一起查单条笔记，别人的笔记也返回 ErrNotFound。'},
              {at:'func (s *NoteStore) ListNotes(',to:'return items, rows.Err()',text:'支持关键词（匹配标题或正文）、精确标签（逗号边界匹配）和来源类型筛选。'},
              {at:'func (s *NoteStore) UpdateNote(',to:'return s.GetNote(userID, id)',text:'更新时同时更新 updated_at 并限制 user_id，受影响行数为 0 返回 ErrNotFound。'},
              {at:'func (s *NoteStore) DeleteNote(',to:'return nil',text:'删除笔记时同样限制 user_id，受影响行数为 0 返回 ErrNotFound。'},
              {at:'func (s *NoteStore) CreateCustom(',to:'return s.GetCustom(userID, int(id))',text:'新增自建题后回查一次，把数据库填好的时间戳一并返回。'},
              {at:'func (s *NoteStore) GetCustom(',to:'return q, err',text:'按 id 与 user_id 查单条自建题，防止越权查看。'},
              {at:'func (s *NoteStore) ListCustom(',to:'return items, rows.Err()',text:'按科目与安全转义后的关键词列出个人自建题。'},
              {at:'func (s *NoteStore) UpdateCustom(',to:'return s.GetCustom(userID, id)',text:'更新私有题目，RowsAffected 为 0 时返回 ErrNotFound。'},
              {at:'func (s *NoteStore) DeleteCustom(',to:'return nil',text:'删除自建题，受影响行数为 0 返回 ErrNotFound。'},
              {at:'func (s *NoteStore) SearchSources(',to:'return hits, rows.Err()',text:'用 UNION ALL 把三类来源的字段对齐查询；未登录传 userID=0 时自建题与笔记自然命中 0 条，绝不泄露隐私。'},
            ],
          },
        },
        java:{
          body:'Java 版本在 `schema.sql` 末尾追加建表语句，新建 `repository/NoteRepository.java`。注意可空列 `source_id` 要先判断 `rs.getObject("source_id") == null` 再转成 `Integer`，插入方法加 `@Transactional` 保证 `last_insert_rowid()` 在同一个连接上执行。',
          practice:{
            steps:[
              '打开 src/main/resources/schema.sql，在末尾加上两张表和索引。',
              '新建 repository/NoteRepository.java，补完 TODO 1 到 5。',
              '运行 mvnw test-compile（或 IDEA 构建）确认编译通过。',
            ],
            expect:'BUILD SUCCESS，没有语法或类型错误',
          },
          code:`-- src/main/resources/schema.sql（加在文件最后）
CREATE TABLE IF NOT EXISTS notes (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id     INTEGER NOT NULL REFERENCES users(id),
    title       TEXT    NOT NULL,
    content     TEXT    NOT NULL,
    tags        TEXT    NOT NULL DEFAULT '',
    source_type TEXT    NOT NULL DEFAULT 'manual',
    source_id   INTEGER,
    created_at  TEXT    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at  TEXT    NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_notes_user ON notes(user_id, updated_at DESC);

CREATE TABLE IF NOT EXISTS my_questions (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id    INTEGER NOT NULL REFERENCES users(id),
    category   TEXT    NOT NULL,
    title      TEXT    NOT NULL,
    answer     TEXT    NOT NULL,
    difficulty INTEGER NOT NULL DEFAULT 1,
    created_at TEXT    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT    NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_my_questions_user ON my_questions(user_id, id DESC);

// repository/NoteRepository.java
package com.example.zixishi.repository;

import java.util.List;
import java.util.Optional;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

@Repository
public class NoteRepository {

    public record Note(int id, String title, String content, String tags, String sourceType,
                       Integer sourceId, String createdAt, String updatedAt) {}

    public record CustomQuestion(int id, String category, String title, String answer,
                                 int difficulty, String createdAt, String updatedAt) {}

    public record SearchRaw(String type, int id, String title, String body, String category,
                            String tags, String sourceType, Integer sourceId, String updatedAt) {}

    private static final RowMapper<Note> NOTE_MAPPER = (rs, i) -> new Note(
        rs.getInt("id"), rs.getString("title"), rs.getString("content"),
        rs.getString("tags"), rs.getString("source_type"),
        rs.getObject("source_id") == null ? null : rs.getInt("source_id"),
        rs.getString("created_at"), rs.getString("updated_at"));

    private static final RowMapper<CustomQuestion> CUSTOM_MAPPER = (rs, i) -> new CustomQuestion(
        rs.getInt("id"), rs.getString("category"), rs.getString("title"),
        rs.getString("answer"), rs.getInt("difficulty"),
        rs.getString("created_at"), rs.getString("updated_at"));

    private final JdbcTemplate jdbc;

    public NoteRepository(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    public static String escapeLike(String s) {
        // TODO 1：先替换反斜杠 "\\" -> "\\\\"，再替换 "%" -> "\\%" 和 "_" -> "\\_"
        return s;
    }

    @Transactional
    public Note createNote(int userId, String title, String content, String tags, String sourceType, Integer sourceId) {
        // TODO 2：INSERT INTO notes (user_id, title, content, tags, source_type, source_id)，
        //         再用 SELECT last_insert_rowid() 取回 id 并调用 findNote(userId, id).orElseThrow()
        return null;
    }

    public Optional<Note> findNote(int userId, int id) {
        return jdbc.query("SELECT id, title, content, tags, source_type, source_id, created_at, updated_at "
            + "FROM notes WHERE id = ? AND user_id = ?", NOTE_MAPPER, id, userId).stream().findFirst();
    }

    public List<Note> listNotes(int userId, String keyword, String tag, String sourceType) {
        String kw = escapeLike(keyword);
        String tg = escapeLike(tag);
        return jdbc.query("""
            SELECT id, title, content, tags, source_type, source_id, created_at, updated_at FROM notes
            WHERE user_id = ?
              AND (? = '' OR title LIKE '%' || ? || '%' ESCAPE '\\' OR content LIKE '%' || ? || '%' ESCAPE '\\')
              AND (? = '' OR (',' || tags || ',') LIKE '%,' || ? || ',%' ESCAPE '\\')
              AND (? = '' OR source_type = ?)
            ORDER BY updated_at DESC, id DESC""",
            NOTE_MAPPER, userId, kw, kw, kw, tg, tg, sourceType, sourceType);
    }

    public Optional<Note> updateNote(int userId, int id, String title, String content, String tags) {
        // TODO 3：UPDATE notes SET title = ?, content = ?, tags = ?, updated_at = CURRENT_TIMESTAMP
        //         WHERE id = ? AND user_id = ?；影响行数为 0 返回 Optional.empty()，否则返回 findNote
        return Optional.empty();
    }

    public boolean deleteNote(int userId, int id) {
        return jdbc.update("DELETE FROM notes WHERE id = ? AND user_id = ?", id, userId) > 0;
    }

    @Transactional
    public CustomQuestion createCustom(int userId, String category, String title, String answer, int difficulty) {
        jdbc.update("INSERT INTO my_questions (user_id, category, title, answer, difficulty) VALUES (?, ?, ?, ?, ?)",
            userId, category, title, answer, difficulty);
        int id = jdbc.queryForObject("SELECT last_insert_rowid()", Integer.class);
        return findCustom(userId, id).orElseThrow();
    }

    public Optional<CustomQuestion> findCustom(int userId, int id) {
        return jdbc.query("SELECT id, category, title, answer, difficulty, created_at, updated_at "
            + "FROM my_questions WHERE id = ? AND user_id = ?", CUSTOM_MAPPER, id, userId).stream().findFirst();
    }

    public List<CustomQuestion> listCustom(int userId, String category, String keyword) {
        String kw = escapeLike(keyword);
        return jdbc.query("""
            SELECT id, category, title, answer, difficulty, created_at, updated_at FROM my_questions
            WHERE user_id = ? AND (? = '' OR category = ?)
              AND (? = '' OR title LIKE '%' || ? || '%' ESCAPE '\\' OR answer LIKE '%' || ? || '%' ESCAPE '\\')
            ORDER BY id DESC""", CUSTOM_MAPPER, userId, category, category, kw, kw, kw);
    }

    public Optional<CustomQuestion> updateCustom(int userId, int id, String category, String title, String answer, int difficulty) {
        // TODO 4：UPDATE my_questions SET category = ?, title = ?, answer = ?, difficulty = ?, updated_at = CURRENT_TIMESTAMP
        //         WHERE id = ? AND user_id = ?；影响行数为 0 返回 Optional.empty()，否则返回 findCustom
        return Optional.empty();
    }

    public boolean deleteCustom(int userId, int id) {
        return jdbc.update("DELETE FROM my_questions WHERE id = ? AND user_id = ?", id, userId) > 0;
    }

    public List<SearchRaw> searchSources(int userId, String keyword) {
        // TODO 5：用 escapeLike(keyword) 转义，执行 UNION ALL 查 questions、my_questions（user_id = ?）与 notes（user_id = ?）
        return List.of();
    }
}`,
          explain:[
            {at:'-- src/main/resources/schema.sql（加在文件最后）',to:'CREATE INDEX IF NOT EXISTS idx_my_questions_user ON my_questions(user_id, id DESC);',text:'把 notes 和 my_questions 两张表及索引加进 schema.sql，启动时自动初始化。'},
            {at:'// repository/NoteRepository.java',to:'public class NoteRepository {',text:'新建仓库类，定义在 repository 包下。'},
            {at:'public record Note(',to:'String sourceType, Integer sourceId, String updatedAt) {}',text:'三种内部 record：Note、CustomQuestion 和跨表搜索行 SearchRaw。'},
            {at:'private static final RowMapper<Note> NOTE_MAPPER',to:'private static final RowMapper<CustomQuestion> CUSTOM_MAPPER',text:'NOTE_MAPPER 里先判断 source_id 是否为 NULL，避免空值被 getInt 读成 0。'},
            {at:'rs.getInt("id"), rs.getString("category")',to:'this.jdbc = jdbc;',text:'CUSTOM_MAPPER 映射自建题字段，构造方法注入 JdbcTemplate。'},
            {at:'public static String escapeLike(String s) {',to:'return s;',text:'LIKE 通配符转义助手，待补全 TODO 1。'},
            {at:'@Transactional',to:'return null;',text:'新增笔记，待补全 TODO 2；@Transactional 确保插入与 last_insert_rowid() 共用连接。'},
            {at:'public Optional<Note> findNote(',to:'NOTE_MAPPER, id, userId).stream().findFirst();',text:'同时限制 id 和 user_id 查询单条笔记。'},
            {at:'public List<Note> listNotes(',to:'NOTE_MAPPER, userId, kw, kw, kw, tg, tg, sourceType, sourceType);',text:'按关键词、逗号边界标签和来源类型过滤个人笔记列表。'},
            {at:'public Optional<Note> updateNote(',to:'return Optional.empty();',text:'更新笔记，待补全 TODO 3。'},
            {at:'public boolean deleteNote(',to:'public CustomQuestion createCustom(',text:'删除笔记返回受影响行数是否大于 0；新增自建题用 @Transactional 取回新编号。'},
            {at:'jdbc.update("INSERT INTO my_questions',to:'return findCustom(userId, id).orElseThrow();',text:'插入后立即查回含数据库时间戳的自建题对象。'},
            {at:'public Optional<CustomQuestion> findCustom(',to:'public List<CustomQuestion> listCustom(',text:'按归属隔离查单条自建题，以及按科目与转义关键词列出自建题。'},
            {at:'String kw = escapeLike(keyword);',to:'ORDER BY id DESC""", CUSTOM_MAPPER, userId, category, category, kw, kw, kw);',text:'SQLite 文本块里的 \\\\ 表示把单个反斜杠传给 SQLite 的 ESCAPE 子句。'},
            {at:'public Optional<CustomQuestion> updateCustom(',to:'return Optional.empty();',text:'更新自建题，待补全 TODO 4。'},
            {at:'public boolean deleteCustom(',to:'public List<SearchRaw> searchSources(',text:'删除自建题；searchSources 聚合检索三张表，待补全 TODO 5。'},
            {at:'return List.of();',text:'完成后返回真实的 SearchRaw 列表。'},
          ],
          solution:{
            code:`-- src/main/resources/schema.sql（加在文件最后）
CREATE TABLE IF NOT EXISTS notes (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id     INTEGER NOT NULL REFERENCES users(id),
    title       TEXT    NOT NULL,
    content     TEXT    NOT NULL,
    tags        TEXT    NOT NULL DEFAULT '',
    source_type TEXT    NOT NULL DEFAULT 'manual',
    source_id   INTEGER,
    created_at  TEXT    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at  TEXT    NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_notes_user ON notes(user_id, updated_at DESC);

CREATE TABLE IF NOT EXISTS my_questions (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id    INTEGER NOT NULL REFERENCES users(id),
    category   TEXT    NOT NULL,
    title      TEXT    NOT NULL,
    answer     TEXT    NOT NULL,
    difficulty INTEGER NOT NULL DEFAULT 1,
    created_at TEXT    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT    NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_my_questions_user ON my_questions(user_id, id DESC);

// repository/NoteRepository.java
package com.example.zixishi.repository;

import java.util.List;
import java.util.Optional;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

@Repository
public class NoteRepository {

    public record Note(int id, String title, String content, String tags, String sourceType,
                       Integer sourceId, String createdAt, String updatedAt) {}

    public record CustomQuestion(int id, String category, String title, String answer,
                                 int difficulty, String createdAt, String updatedAt) {}

    public record SearchRaw(String type, int id, String title, String body, String category,
                            String tags, String sourceType, Integer sourceId, String updatedAt) {}

    private static final RowMapper<Note> NOTE_MAPPER = (rs, i) -> new Note(
        rs.getInt("id"), rs.getString("title"), rs.getString("content"),
        rs.getString("tags"), rs.getString("source_type"),
        rs.getObject("source_id") == null ? null : rs.getInt("source_id"),
        rs.getString("created_at"), rs.getString("updated_at"));

    private static final RowMapper<CustomQuestion> CUSTOM_MAPPER = (rs, i) -> new CustomQuestion(
        rs.getInt("id"), rs.getString("category"), rs.getString("title"),
        rs.getString("answer"), rs.getInt("difficulty"),
        rs.getString("created_at"), rs.getString("updated_at"));

    private final JdbcTemplate jdbc;

    public NoteRepository(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    public static String escapeLike(String s) {
        return s.replace("\\\\", "\\\\\\\\").replace("%", "\\\\%").replace("_", "\\\\_");
    }

    @Transactional
    public Note createNote(int userId, String title, String content, String tags, String sourceType, Integer sourceId) {
        jdbc.update("INSERT INTO notes (user_id, title, content, tags, source_type, source_id) VALUES (?, ?, ?, ?, ?, ?)",
            userId, title, content, tags, sourceType, sourceId);
        int id = jdbc.queryForObject("SELECT last_insert_rowid()", Integer.class);
        return findNote(userId, id).orElseThrow();
    }

    public Optional<Note> findNote(int userId, int id) {
        return jdbc.query("SELECT id, title, content, tags, source_type, source_id, created_at, updated_at "
            + "FROM notes WHERE id = ? AND user_id = ?", NOTE_MAPPER, id, userId).stream().findFirst();
    }

    public List<Note> listNotes(int userId, String keyword, String tag, String sourceType) {
        String kw = escapeLike(keyword);
        String tg = escapeLike(tag);
        return jdbc.query("""
            SELECT id, title, content, tags, source_type, source_id, created_at, updated_at FROM notes
            WHERE user_id = ?
              AND (? = '' OR title LIKE '%' || ? || '%' ESCAPE '\\' OR content LIKE '%' || ? || '%' ESCAPE '\\')
              AND (? = '' OR (',' || tags || ',') LIKE '%,' || ? || ',%' ESCAPE '\\')
              AND (? = '' OR source_type = ?)
            ORDER BY updated_at DESC, id DESC""",
            NOTE_MAPPER, userId, kw, kw, kw, tg, tg, sourceType, sourceType);
    }

    public Optional<Note> updateNote(int userId, int id, String title, String content, String tags) {
        int rows = jdbc.update("UPDATE notes SET title = ?, content = ?, tags = ?, updated_at = CURRENT_TIMESTAMP "
            + "WHERE id = ? AND user_id = ?", title, content, tags, id, userId);
        return rows > 0 ? findNote(userId, id) : Optional.empty();
    }

    public boolean deleteNote(int userId, int id) {
        return jdbc.update("DELETE FROM notes WHERE id = ? AND user_id = ?", id, userId) > 0;
    }

    @Transactional
    public CustomQuestion createCustom(int userId, String category, String title, String answer, int difficulty) {
        jdbc.update("INSERT INTO my_questions (user_id, category, title, answer, difficulty) VALUES (?, ?, ?, ?, ?)",
            userId, category, title, answer, difficulty);
        int id = jdbc.queryForObject("SELECT last_insert_rowid()", Integer.class);
        return findCustom(userId, id).orElseThrow();
    }

    public Optional<CustomQuestion> findCustom(int userId, int id) {
        return jdbc.query("SELECT id, category, title, answer, difficulty, created_at, updated_at "
            + "FROM my_questions WHERE id = ? AND user_id = ?", CUSTOM_MAPPER, id, userId).stream().findFirst();
    }

    public List<CustomQuestion> listCustom(int userId, String category, String keyword) {
        String kw = escapeLike(keyword);
        return jdbc.query("""
            SELECT id, category, title, answer, difficulty, created_at, updated_at FROM my_questions
            WHERE user_id = ? AND (? = '' OR category = ?)
              AND (? = '' OR title LIKE '%' || ? || '%' ESCAPE '\\' OR answer LIKE '%' || ? || '%' ESCAPE '\\')
            ORDER BY id DESC""", CUSTOM_MAPPER, userId, category, category, kw, kw, kw);
    }

    public Optional<CustomQuestion> updateCustom(int userId, int id, String category, String title, String answer, int difficulty) {
        int rows = jdbc.update("UPDATE my_questions SET category = ?, title = ?, answer = ?, difficulty = ?, "
            + "updated_at = CURRENT_TIMESTAMP WHERE id = ? AND user_id = ?", category, title, answer, difficulty, id, userId);
        return rows > 0 ? findCustom(userId, id) : Optional.empty();
    }

    public boolean deleteCustom(int userId, int id) {
        return jdbc.update("DELETE FROM my_questions WHERE id = ? AND user_id = ?", id, userId) > 0;
    }

    public List<SearchRaw> searchSources(int userId, String keyword) {
        String kw = escapeLike(keyword);
        return jdbc.query("""
            SELECT 'question' AS type, id, title, answer AS body, category, '' AS tags, '' AS source_type, NULL AS source_id, '' AS updated_at
            FROM questions WHERE title LIKE '%' || ? || '%' ESCAPE '\\' OR answer LIKE '%' || ? || '%' ESCAPE '\\'
            UNION ALL
            SELECT 'custom', id, title, answer, category, '', '', NULL, updated_at
            FROM my_questions WHERE user_id = ? AND (title LIKE '%' || ? || '%' ESCAPE '\\' OR answer LIKE '%' || ? || '%' ESCAPE '\\')
            UNION ALL
            SELECT 'note', id, title, content, '', tags, source_type, source_id, updated_at
            FROM notes WHERE user_id = ? AND (title LIKE '%' || ? || '%' ESCAPE '\\'
              OR content LIKE '%' || ? || '%' ESCAPE '\\' OR tags LIKE '%' || ? || '%' ESCAPE '\\')""",
            (rs, i) -> new SearchRaw(rs.getString("type"), rs.getInt("id"), rs.getString("title"), rs.getString("body"),
                rs.getString("category"), rs.getString("tags"), rs.getString("source_type"),
                rs.getObject("source_id") == null ? null : rs.getInt("source_id"), rs.getString("updated_at")),
            kw, kw, userId, kw, kw, userId, kw, kw, kw);
    }
}`,
            explain:[
              {at:'-- src/main/resources/schema.sql（加在文件最后）',to:'CREATE INDEX IF NOT EXISTS idx_my_questions_user ON my_questions(user_id, id DESC);',text:'把 notes 和 my_questions 两张表及索引加进 schema.sql，启动时自动初始化。'},
              {at:'// repository/NoteRepository.java',to:'public class NoteRepository {',text:'新建仓库类，定义在 repository 包下。'},
              {at:'public record Note(',to:'String sourceType, Integer sourceId, String updatedAt) {}',text:'三种内部 record：Note、CustomQuestion 和跨表搜索行 SearchRaw。'},
              {at:'private static final RowMapper<Note> NOTE_MAPPER',to:'private static final RowMapper<CustomQuestion> CUSTOM_MAPPER',text:'NOTE_MAPPER 里先判断 source_id 是否为 NULL，避免空值被 getInt 读成 0。'},
              {at:'rs.getInt("id"), rs.getString("category")',to:'this.jdbc = jdbc;',text:'CUSTOM_MAPPER 映射自建题字段，构造方法注入 JdbcTemplate。'},
              {at:'public static String escapeLike(String s) {',to:'return s.replace(',text:'先转义反斜杠，再依次转义 % 和 _。'},
              {at:'@Transactional',to:'return findNote(userId, id).orElseThrow();',text:'插入后立刻取回自增主键并回查完整的 Note，整个过程包在同一事务内。'},
              {at:'public Optional<Note> findNote(',to:'NOTE_MAPPER, id, userId).stream().findFirst();',text:'同时限制 id 和 user_id 查询单条笔记。'},
              {at:'public List<Note> listNotes(',to:'NOTE_MAPPER, userId, kw, kw, kw, tg, tg, sourceType, sourceType);',text:'按关键词、逗号边界标签和来源类型过滤个人笔记列表。'},
              {at:'public Optional<Note> updateNote(',to:'return rows > 0 ? findNote(userId, id) : Optional.empty();',text:'受影响行数为 0 说明笔记不存在或不属于该用户，返回空 Optional。'},
              {at:'public boolean deleteNote(',to:'public CustomQuestion createCustom(',text:'删除笔记返回受影响行数是否大于 0；新增自建题用 @Transactional 取回新编号。'},
              {at:'jdbc.update("INSERT INTO my_questions',to:'return findCustom(userId, id).orElseThrow();',text:'插入后立即查回含数据库时间戳的自建题对象。'},
              {at:'public Optional<CustomQuestion> findCustom(',to:'public List<CustomQuestion> listCustom(',text:'按归属隔离查单条自建题，以及按科目与转义关键词列出自建题。'},
              {at:'String kw = escapeLike(keyword);',to:'ORDER BY id DESC""", CUSTOM_MAPPER, userId, category, category, kw, kw, kw);',text:'SQLite 文本块里的 \\\\ 表示把单个反斜杠传给 SQLite 的 ESCAPE 子句。'},
              {at:'public Optional<CustomQuestion> updateCustom(',to:'return rows > 0 ? findCustom(userId, id) : Optional.empty();',text:'修改自建题同样看 update 返回的受影响行数，防止越权修改。'},
              {at:'public boolean deleteCustom(',to:'public List<SearchRaw> searchSources(',text:'删除自建题；searchSources 使用 UNION ALL 同时查三张来源表。'},
              {at:'String kw = escapeLike(keyword);',to:'kw, kw, userId, kw, kw, userId, kw, kw, kw);',text:'把参数依次绑定到 UNION ALL 三段查询的占位符；匿名访问传入 userId=0 时不会命中任何私有数据。'},
            ],
          },
        },
        node:{
          body:'Node.js 版本在 `src/db/database.js` 里建好两张表，然后在 `src/db/notes.js` 里用 `better-sqlite3` 的同步 API 完成所有增删改查和 `searchSources`。注意用 `AS sourceType` 等列别名让返回对象直接对齐接口约定的驼峰命名。',
          practice:{
            steps:[
              '在 src/db/database.js 的建表代码后面加上 notes 和 my_questions 的建表语句。',
              '新建 src/db/notes.js，补完 TODO 1 到 5。',
              '在项目目录运行 node -e "require(\'./src/db/notes\')" 确认启动建表不报错。',
            ],
            expect:'没有报错输出，data/zixishi.db 里出现 notes 和 my_questions 表',
          },
          code:`// src/db/database.js（加在建表 db.exec 后面）
db.exec(\`
  CREATE TABLE IF NOT EXISTS notes (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id     INTEGER NOT NULL REFERENCES users(id),
    title       TEXT    NOT NULL,
    content     TEXT    NOT NULL,
    tags        TEXT    NOT NULL DEFAULT '',
    source_type TEXT    NOT NULL DEFAULT 'manual',
    source_id   INTEGER,
    created_at  TEXT    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at  TEXT    NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
  CREATE INDEX IF NOT EXISTS idx_notes_user ON notes(user_id, updated_at DESC);
  CREATE TABLE IF NOT EXISTS my_questions (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id    INTEGER NOT NULL REFERENCES users(id),
    category   TEXT    NOT NULL,
    title      TEXT    NOT NULL,
    answer     TEXT    NOT NULL,
    difficulty INTEGER NOT NULL DEFAULT 1,
    created_at TEXT    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT    NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
  CREATE INDEX IF NOT EXISTS idx_my_questions_user ON my_questions(user_id, id DESC);
\`);

// src/db/notes.js
const { db } = require("./database");

const NOTE_COLS = \`id, title, content, tags, source_type AS sourceType, source_id AS sourceId,
  created_at AS createdAt, updated_at AS updatedAt\`;
const CUSTOM_COLS = \`id, category, title, answer, difficulty, created_at AS createdAt, updated_at AS updatedAt\`;

function escapeLike(s) {
  // TODO 1：把反斜杠、% 和 _ 分别转义成 \\\\、\\%、\\_
  return s;
}

function createNote(userId, note) {
  // TODO 2：INSERT INTO notes (...) VALUES (...)，拿到 Number(res.lastInsertRowid) 后调用 getNote 返回
}

function getNote(userId, id) {
  return db.prepare(\`SELECT \${NOTE_COLS} FROM notes WHERE id = ? AND user_id = ?\`).get(id, userId);
}

function listNotes(userId, { q = "", tag = "", sourceType = "" } = {}) {
  const kw = escapeLike(q);
  const tg = escapeLike(tag);
  return db.prepare(\`SELECT \${NOTE_COLS} FROM notes WHERE user_id = ?
    AND (? = '' OR title LIKE '%' || ? || '%' ESCAPE '\\' OR content LIKE '%' || ? || '%' ESCAPE '\\')
    AND (? = '' OR (',' || tags || ',') LIKE '%,' || ? || ',%' ESCAPE '\\')
    AND (? = '' OR source_type = ?)
    ORDER BY updated_at DESC, id DESC\`).all(userId, kw, kw, kw, tg, tg, sourceType, sourceType);
}

function updateNote(userId, id, { title, content, tags }) {
  // TODO 3：UPDATE notes SET title = ?, content = ?, tags = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND user_id = ?；
  //         changes > 0 时返回 getNote(userId, id)，否则返回 undefined
}

function deleteNote(userId, id) {
  return db.prepare("DELETE FROM notes WHERE id = ? AND user_id = ?").run(id, userId).changes > 0;
}

function createCustom(userId, q) {
  const res = db.prepare(\`INSERT INTO my_questions (user_id, category, title, answer, difficulty)
    VALUES (?, ?, ?, ?, ?)\`).run(userId, q.category, q.title, q.answer, q.difficulty);
  return getCustom(userId, Number(res.lastInsertRowid));
}

function getCustom(userId, id) {
  return db.prepare(\`SELECT \${CUSTOM_COLS} FROM my_questions WHERE id = ? AND user_id = ?\`).get(id, userId);
}

function listCustom(userId, { category = "", q = "" } = {}) {
  const kw = escapeLike(q);
  return db.prepare(\`SELECT \${CUSTOM_COLS} FROM my_questions WHERE user_id = ?
    AND (? = '' OR category = ?)
    AND (? = '' OR title LIKE '%' || ? || '%' ESCAPE '\\' OR answer LIKE '%' || ? || '%' ESCAPE '\\')
    ORDER BY id DESC\`).all(userId, category, category, kw, kw, kw);
}

function updateCustom(userId, id, q) {
  // TODO 4：UPDATE my_questions SET category = ?, title = ?, answer = ?, difficulty = ?, updated_at = CURRENT_TIMESTAMP
  //         WHERE id = ? AND user_id = ?；changes > 0 返回 getCustom(userId, id)
}

function deleteCustom(userId, id) {
  return db.prepare("DELETE FROM my_questions WHERE id = ? AND user_id = ?").run(id, userId).changes > 0;
}

function searchSources(userId, keyword) {
  // TODO 5：用 escapeLike(keyword) 转义，通过 UNION ALL 查询 questions、my_questions（user_id = ?）和 notes（user_id = ?）
  return [];
}

module.exports = {
  escapeLike, createNote, getNote, listNotes, updateNote, deleteNote,
  createCustom, getCustom, listCustom, updateCustom, deleteCustom, searchSources,
};`,
          explain:[
            {at:'// src/db/database.js（加在建表 db.exec 后面）',to:'`);',text:'在 database.js 里补充 notes 和 my_questions 两张表及索引，启动时自动创建。'},
            {at:'// src/db/notes.js',to:'const CUSTOM_COLS =',text:'新建数据访问模块，并用 AS 列别名把下划线字段直接映射成接口约定的驼峰命名。'},
            {at:'function escapeLike(s) {',to:'return s;',text:'通配符转义助手，待补全 TODO 1。'},
            {at:'function createNote(userId, note) {',to:'function getNote(userId, id) {',text:'新增笔记待补全 TODO 2；getNote 同时限制 id 和 user_id。'},
            {at:'return db.prepare(',text:'用 better-sqlite3 的 get 查询单行，找不到返回 undefined。'},
            {at:'function listNotes(',to:'ORDER BY updated_at DESC, id DESC',text:'按关键词、逗号边界标签和来源类型筛选个人笔记。'},
            {at:'function updateNote(',to:'function deleteNote(userId, id) {',text:'更新笔记待补全 TODO 3；deleteNote 通过 changes > 0 判断是否删除成功。'},
            {at:'return db.prepare("DELETE FROM notes',text:'只删除归属当前用户的笔记。'},
            {at:'function createCustom(',to:'return getCustom(userId, Number(res.lastInsertRowid));',text:'新增自建题并转换 lastInsertRowid 后回查完整记录。'},
            {at:'function getCustom(',to:'function listCustom(',text:'查单条自建题和按科目、关键词筛选自建题列表。'},
            {at:'const kw = escapeLike(q);',to:'ORDER BY id DESC',text:'用参数化占位符和 ESCAPE 防注入、防通配符误匹配。'},
            {at:'function updateCustom(',to:'function deleteCustom(userId, id) {',text:'更新自建题待补全 TODO 4；删除自建题直接判断 changes。'},
            {at:'return db.prepare("DELETE FROM my_questions',text:'只删除属于当前用户的自建题。'},
            {at:'function searchSources(userId, keyword) {',to:'return [];',text:'三路来源联合查询，待补全 TODO 5。'},
            {at:'module.exports = {',to:'};',text:'导出所有数据访问函数。'},
          ],
          solution:{
            code:`// src/db/database.js（加在建表 db.exec 后面）
db.exec(\`
  CREATE TABLE IF NOT EXISTS notes (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id     INTEGER NOT NULL REFERENCES users(id),
    title       TEXT    NOT NULL,
    content     TEXT    NOT NULL,
    tags        TEXT    NOT NULL DEFAULT '',
    source_type TEXT    NOT NULL DEFAULT 'manual',
    source_id   INTEGER,
    created_at  TEXT    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at  TEXT    NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
  CREATE INDEX IF NOT EXISTS idx_notes_user ON notes(user_id, updated_at DESC);
  CREATE TABLE IF NOT EXISTS my_questions (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id    INTEGER NOT NULL REFERENCES users(id),
    category   TEXT    NOT NULL,
    title      TEXT    NOT NULL,
    answer     TEXT    NOT NULL,
    difficulty INTEGER NOT NULL DEFAULT 1,
    created_at TEXT    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT    NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
  CREATE INDEX IF NOT EXISTS idx_my_questions_user ON my_questions(user_id, id DESC);
\`);

// src/db/notes.js
const { db } = require("./database");

const NOTE_COLS = \`id, title, content, tags, source_type AS sourceType, source_id AS sourceId,
  created_at AS createdAt, updated_at AS updatedAt\`;
const CUSTOM_COLS = \`id, category, title, answer, difficulty, created_at AS createdAt, updated_at AS updatedAt\`;

function escapeLike(s) {
  return s.replace(/[\\\\%_]/g, (ch) => "\\\\" + ch);
}

function createNote(userId, note) {
  const res = db.prepare(\`INSERT INTO notes (user_id, title, content, tags, source_type, source_id)
    VALUES (?, ?, ?, ?, ?, ?)\`).run(userId, note.title, note.content, note.tags, note.sourceType, note.sourceId ?? null);
  return getNote(userId, Number(res.lastInsertRowid));
}

function getNote(userId, id) {
  return db.prepare(\`SELECT \${NOTE_COLS} FROM notes WHERE id = ? AND user_id = ?\`).get(id, userId);
}

function listNotes(userId, { q = "", tag = "", sourceType = "" } = {}) {
  const kw = escapeLike(q);
  const tg = escapeLike(tag);
  return db.prepare(\`SELECT \${NOTE_COLS} FROM notes WHERE user_id = ?
    AND (? = '' OR title LIKE '%' || ? || '%' ESCAPE '\\' OR content LIKE '%' || ? || '%' ESCAPE '\\')
    AND (? = '' OR (',' || tags || ',') LIKE '%,' || ? || ',%' ESCAPE '\\')
    AND (? = '' OR source_type = ?)
    ORDER BY updated_at DESC, id DESC\`).all(userId, kw, kw, kw, tg, tg, sourceType, sourceType);
}

function updateNote(userId, id, { title, content, tags }) {
  const { changes } = db.prepare(\`UPDATE notes SET title = ?, content = ?, tags = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ? AND user_id = ?\`).run(title, content, tags, id, userId);
  return changes > 0 ? getNote(userId, id) : undefined;
}

function deleteNote(userId, id) {
  return db.prepare("DELETE FROM notes WHERE id = ? AND user_id = ?").run(id, userId).changes > 0;
}

function createCustom(userId, q) {
  const res = db.prepare(\`INSERT INTO my_questions (user_id, category, title, answer, difficulty)
    VALUES (?, ?, ?, ?, ?)\`).run(userId, q.category, q.title, q.answer, q.difficulty);
  return getCustom(userId, Number(res.lastInsertRowid));
}

function getCustom(userId, id) {
  return db.prepare(\`SELECT \${CUSTOM_COLS} FROM my_questions WHERE id = ? AND user_id = ?\`).get(id, userId);
}

function listCustom(userId, { category = "", q = "" } = {}) {
  const kw = escapeLike(q);
  return db.prepare(\`SELECT \${CUSTOM_COLS} FROM my_questions WHERE user_id = ?
    AND (? = '' OR category = ?)
    AND (? = '' OR title LIKE '%' || ? || '%' ESCAPE '\\' OR answer LIKE '%' || ? || '%' ESCAPE '\\')
    ORDER BY id DESC\`).all(userId, category, category, kw, kw, kw);
}

function updateCustom(userId, id, q) {
  const { changes } = db.prepare(\`UPDATE my_questions SET category = ?, title = ?, answer = ?, difficulty = ?,
    updated_at = CURRENT_TIMESTAMP WHERE id = ? AND user_id = ?\`).run(q.category, q.title, q.answer, q.difficulty, id, userId);
  return changes > 0 ? getCustom(userId, id) : undefined;
}

function deleteCustom(userId, id) {
  return db.prepare("DELETE FROM my_questions WHERE id = ? AND user_id = ?").run(id, userId).changes > 0;
}

function searchSources(userId, keyword) {
  const kw = escapeLike(keyword);
  return db.prepare(\`
    SELECT 'question' AS type, id, title, answer AS body, category, '' AS tags, '' AS sourceType, NULL AS sourceId, '' AS updatedAt
    FROM questions WHERE title LIKE '%' || ? || '%' ESCAPE '\\' OR answer LIKE '%' || ? || '%' ESCAPE '\\'
    UNION ALL
    SELECT 'custom', id, title, answer, category, '', '', NULL, updated_at
    FROM my_questions WHERE user_id = ? AND (title LIKE '%' || ? || '%' ESCAPE '\\' OR answer LIKE '%' || ? || '%' ESCAPE '\\')
    UNION ALL
    SELECT 'note', id, title, content, '', tags, source_type, source_id, updated_at
    FROM notes WHERE user_id = ? AND (title LIKE '%' || ? || '%' ESCAPE '\\'
      OR content LIKE '%' || ? || '%' ESCAPE '\\' OR tags LIKE '%' || ? || '%' ESCAPE '\\')\`).all(
    kw, kw, userId, kw, kw, userId, kw, kw, kw);
}

module.exports = {
  escapeLike, createNote, getNote, listNotes, updateNote, deleteNote,
  createCustom, getCustom, listCustom, updateCustom, deleteCustom, searchSources,
};`,
            explain:[
              {at:'// src/db/database.js（加在建表 db.exec 后面）',to:'`);',text:'在 database.js 里补充 notes 和 my_questions 两张表及索引，启动时自动创建。'},
              {at:'// src/db/notes.js',to:'const CUSTOM_COLS =',text:'新建数据访问模块，并用 AS 列别名把下划线字段直接映射成接口约定的驼峰命名。'},
              {at:'function escapeLike(s) {',to:'return s.replace(',text:'用正则一次性把 \\、% 和 _ 前都加上反斜杠，避免链式 replace 出现顺序问题。'},
              {at:'function createNote(userId, note) {',to:'return getNote(userId, Number(res.lastInsertRowid));',text:'插入笔记并回查完整对象；lastInsertRowid 转成普通数字再查。'},
              {at:'function getNote(userId, id) {',to:'return db.prepare(',text:'同时按 id 与 user_id 查询单条笔记。'},
              {at:'function listNotes(',to:'ORDER BY updated_at DESC, id DESC',text:'按关键词、逗号边界标签和来源类型筛选个人笔记。'},
              {at:'function updateNote(',to:'return changes > 0 ? getNote(userId, id) : undefined;',text:'修改笔记后根据 changes 判断是否命中属于自己的行。'},
              {at:'function deleteNote(userId, id) {',to:'return db.prepare("DELETE FROM notes',text:'只删除归属当前用户的笔记。'},
              {at:'function createCustom(',to:'return getCustom(userId, Number(res.lastInsertRowid));',text:'新增自建题并回查。'},
              {at:'function getCustom(',to:'return db.prepare(',text:'按 id 和 user_id 查询单条自建题。'},
              {at:'function listCustom(',to:'ORDER BY id DESC',text:'按科目与转义关键词列出自建题。'},
              {at:'function updateCustom(',to:'return changes > 0 ? getCustom(userId, id) : undefined;',text:'修改自建题后根据 changes 判断是否成功。'},
              {at:'function deleteCustom(userId, id) {',to:'return db.prepare("DELETE FROM my_questions',text:'只删除属于当前用户的自建题。'},
              {at:'function searchSources(userId, keyword) {',to:'kw, kw, userId, kw, kw, userId, kw, kw, kw);',text:'用 UNION ALL 一次查完三个来源，匿名 userId=0 不会匹配到任何私有表行。'},
              {at:'module.exports = {',to:'};',text:'导出所有数据访问函数。'},
            ],
          },
        },
        python:{
          body:'Python 版本把新表加入 `app/database.py` 的 `SCHEMA`，然后在 `app/notes.py` 里实现数据访问函数。修改和删除需要判断 `cur.rowcount > 0`，所以用 `with closing(connect()) as conn:` 直接拿到游标检查影响行数。',
          practice:{
            steps:[
              '在 app/database.py 的 SCHEMA 字符串末尾加入 notes 和 my_questions 建表语句。',
              '新建 app/notes.py，补完 TODO 1 到 5。',
              '运行 python -c "from app.database import init_db; init_db(); from app import notes" 确认建表与导入无误。',
            ],
            expect:'没有异常输出，数据库中已建好 notes 与 my_questions',
          },
          code:`# app/database.py（加在 SCHEMA 最后）
CREATE TABLE IF NOT EXISTS notes (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id     INTEGER NOT NULL REFERENCES users(id),
    title       TEXT    NOT NULL,
    content     TEXT    NOT NULL,
    tags        TEXT    NOT NULL DEFAULT '',
    source_type TEXT    NOT NULL DEFAULT 'manual',
    source_id   INTEGER,
    created_at  TEXT    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at  TEXT    NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_notes_user ON notes(user_id, updated_at DESC);

CREATE TABLE IF NOT EXISTS my_questions (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id    INTEGER NOT NULL REFERENCES users(id),
    category   TEXT    NOT NULL,
    title      TEXT    NOT NULL,
    answer     TEXT    NOT NULL,
    difficulty INTEGER NOT NULL DEFAULT 1,
    created_at TEXT    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT    NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_my_questions_user ON my_questions(user_id, id DESC);

# app/notes.py
from contextlib import closing

from app.database import connect, execute, query_all, query_one

NOTE_COLS = (
    "id, title, content, tags, source_type AS sourceType, "
    "source_id AS sourceId, created_at AS createdAt, updated_at AS updatedAt"
)
CUSTOM_COLS = "id, category, title, answer, difficulty, created_at AS createdAt, updated_at AS updatedAt"


def escape_like(s):
    """转义 LIKE 通配符：先反斜杠，再 % 和 _"""
    # TODO 1：返回转义后的字符串
    return s


def create_note(user_id, title, content, tags, source_type, source_id):
    # TODO 2：用 execute 插入 notes，拿回新 id 后调用 get_note(user_id, nid) 返回
    return None


def get_note(user_id, nid):
    return query_one(f"SELECT {NOTE_COLS} FROM notes WHERE id = ? AND user_id = ?", (nid, user_id))


def list_notes(user_id, q="", tag="", source_type=""):
    kw = escape_like(q)
    tg = escape_like(tag)
    return query_all(
        f"SELECT {NOTE_COLS} FROM notes WHERE user_id = ? "
        "AND (? = '' OR title LIKE '%' || ? || '%' ESCAPE '\\' OR content LIKE '%' || ? || '%' ESCAPE '\\') "
        "AND (? = '' OR (',' || tags || ',') LIKE '%,' || ? || ',%' ESCAPE '\\') "
        "AND (? = '' OR source_type = ?) ORDER BY updated_at DESC, id DESC",
        (user_id, kw, kw, kw, tg, tg, source_type, source_type),
    )


def update_note(user_id, nid, title, content, tags):
    # TODO 3：用 with closing(connect()) as conn 执行 UPDATE notes ... WHERE id = ? AND user_id = ?，
    #         cur.rowcount > 0 返回 get_note(user_id, nid)，否则返回 None
    return None


def delete_note(user_id, nid):
    with closing(connect()) as conn:
        with conn:
            cur = conn.execute("DELETE FROM notes WHERE id = ? AND user_id = ?", (nid, user_id))
    return cur.rowcount > 0


def create_custom(user_id, category, title, answer, difficulty):
    cid = execute(
        "INSERT INTO my_questions (user_id, category, title, answer, difficulty) VALUES (?, ?, ?, ?, ?)",
        (user_id, category, title, answer, difficulty),
    )
    return get_custom(user_id, cid)


def get_custom(user_id, cid):
    return query_one(f"SELECT {CUSTOM_COLS} FROM my_questions WHERE id = ? AND user_id = ?", (cid, user_id))


def list_custom(user_id, category="", q=""):
    kw = escape_like(q)
    return query_all(
        f"SELECT {CUSTOM_COLS} FROM my_questions WHERE user_id = ? AND (? = '' OR category = ?) "
        "AND (? = '' OR title LIKE '%' || ? || '%' ESCAPE '\\' OR answer LIKE '%' || ? || '%' ESCAPE '\\') "
        "ORDER BY id DESC",
        (user_id, category, category, kw, kw, kw),
    )


def update_custom(user_id, cid, category, title, answer, difficulty):
    # TODO 4：UPDATE my_questions SET ... WHERE id = ? AND user_id = ?；rowcount > 0 返回 get_custom
    return None


def delete_custom(user_id, cid):
    with closing(connect()) as conn:
        with conn:
            cur = conn.execute("DELETE FROM my_questions WHERE id = ? AND user_id = ?", (cid, user_id))
    return cur.rowcount > 0


def search_sources(user_id, keyword):
    """聚合检索公共题库、个人自建题与个人笔记"""
    # TODO 5：转义 keyword 后执行 UNION ALL 查询三张表，并返回列表
    return []`,
          explain:[
            {at:'# app/database.py（加在 SCHEMA 最后）',to:'CREATE INDEX IF NOT EXISTS idx_my_questions_user ON my_questions(user_id, id DESC);',text:'把 notes 和 my_questions 建表语句加入 SCHEMA，启动初始化时自动建表。'},
            {at:'# app/notes.py',to:'CUSTOM_COLS =',text:'导入数据库辅助函数，并用 AS 列别名让返回字典直接对齐 JSON 字段名。'},
            {at:'def escape_like(s):',to:'return s',text:'LIKE 通配符转义，待补全 TODO 1。'},
            {at:'def create_note(',to:'return None',text:'新增笔记，待补全 TODO 2。'},
            {at:'def get_note(',to:'def list_notes(',text:'查单条笔记与筛选列表，WHERE 子句固定锁住 user_id。'},
            {at:'kw = escape_like(q)',to:'(user_id, kw, kw, kw, tg, tg, source_type, source_type),',text:'同时支持关键词检索、逗号边界标签筛选和来源类型过滤。'},
            {at:'def update_note(',to:'return None',text:'更新笔记，待补全 TODO 3。'},
            {at:'def delete_note(',to:'return cur.rowcount > 0',text:'用 rowcount > 0 判断是否真正删掉了属于当前用户的笔记。'},
            {at:'def create_custom(',to:'return get_custom(user_id, cid)',text:'新增自建题后立刻回查返回完整字典。'},
            {at:'def get_custom(',to:'def list_custom(',text:'查单条自建题和按科目、关键词筛选自建题列表。'},
            {at:'kw = escape_like(q)',to:'(user_id, category, category, kw, kw, kw),',text:'所有用户输入的关键词都先经 escape_like 转义再传入占位符。'},
            {at:'def update_custom(',to:'return None',text:'更新自建题，待补全 TODO 4。'},
            {at:'def delete_custom(',to:'return cur.rowcount > 0',text:'删除自建题，检查 rowcount 防止越权。'},
            {at:'def search_sources(',to:'return []',text:'三路来源联合查询，待补全 TODO 5。'},
          ],
          solution:{
            code:`# app/database.py（加在 SCHEMA 最后）
CREATE TABLE IF NOT EXISTS notes (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id     INTEGER NOT NULL REFERENCES users(id),
    title       TEXT    NOT NULL,
    content     TEXT    NOT NULL,
    tags        TEXT    NOT NULL DEFAULT '',
    source_type TEXT    NOT NULL DEFAULT 'manual',
    source_id   INTEGER,
    created_at  TEXT    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at  TEXT    NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_notes_user ON notes(user_id, updated_at DESC);

CREATE TABLE IF NOT EXISTS my_questions (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id    INTEGER NOT NULL REFERENCES users(id),
    category   TEXT    NOT NULL,
    title      TEXT    NOT NULL,
    answer     TEXT    NOT NULL,
    difficulty INTEGER NOT NULL DEFAULT 1,
    created_at TEXT    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT    NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_my_questions_user ON my_questions(user_id, id DESC);

# app/notes.py
from contextlib import closing

from app.database import connect, execute, query_all, query_one

NOTE_COLS = (
    "id, title, content, tags, source_type AS sourceType, "
    "source_id AS sourceId, created_at AS createdAt, updated_at AS updatedAt"
)
CUSTOM_COLS = "id, category, title, answer, difficulty, created_at AS createdAt, updated_at AS updatedAt"


def escape_like(s):
    """转义 LIKE 通配符：先反斜杠，再 % 和 _"""
    return s.replace("\\\\", "\\\\\\\\").replace("%", "\\\\%").replace("_", "\\\\_")


def create_note(user_id, title, content, tags, source_type, source_id):
    nid = execute(
        "INSERT INTO notes (user_id, title, content, tags, source_type, source_id) VALUES (?, ?, ?, ?, ?, ?)",
        (user_id, title, content, tags, source_type, source_id),
    )
    return get_note(user_id, nid)


def get_note(user_id, nid):
    return query_one(f"SELECT {NOTE_COLS} FROM notes WHERE id = ? AND user_id = ?", (nid, user_id))


def list_notes(user_id, q="", tag="", source_type=""):
    kw = escape_like(q)
    tg = escape_like(tag)
    return query_all(
        f"SELECT {NOTE_COLS} FROM notes WHERE user_id = ? "
        "AND (? = '' OR title LIKE '%' || ? || '%' ESCAPE '\\' OR content LIKE '%' || ? || '%' ESCAPE '\\') "
        "AND (? = '' OR (',' || tags || ',') LIKE '%,' || ? || ',%' ESCAPE '\\') "
        "AND (? = '' OR source_type = ?) ORDER BY updated_at DESC, id DESC",
        (user_id, kw, kw, kw, tg, tg, source_type, source_type),
    )


def update_note(user_id, nid, title, content, tags):
    with closing(connect()) as conn:
        with conn:
            cur = conn.execute(
                "UPDATE notes SET title = ?, content = ?, tags = ?, updated_at = CURRENT_TIMESTAMP "
                "WHERE id = ? AND user_id = ?",
                (title, content, tags, nid, user_id),
            )
    return get_note(user_id, nid) if cur.rowcount > 0 else None


def delete_note(user_id, nid):
    with closing(connect()) as conn:
        with conn:
            cur = conn.execute("DELETE FROM notes WHERE id = ? AND user_id = ?", (nid, user_id))
    return cur.rowcount > 0


def create_custom(user_id, category, title, answer, difficulty):
    cid = execute(
        "INSERT INTO my_questions (user_id, category, title, answer, difficulty) VALUES (?, ?, ?, ?, ?)",
        (user_id, category, title, answer, difficulty),
    )
    return get_custom(user_id, cid)


def get_custom(user_id, cid):
    return query_one(f"SELECT {CUSTOM_COLS} FROM my_questions WHERE id = ? AND user_id = ?", (cid, user_id))


def list_custom(user_id, category="", q=""):
    kw = escape_like(q)
    return query_all(
        f"SELECT {CUSTOM_COLS} FROM my_questions WHERE user_id = ? AND (? = '' OR category = ?) "
        "AND (? = '' OR title LIKE '%' || ? || '%' ESCAPE '\\' OR answer LIKE '%' || ? || '%' ESCAPE '\\') "
        "ORDER BY id DESC",
        (user_id, category, category, kw, kw, kw),
    )


def update_custom(user_id, cid, category, title, answer, difficulty):
    with closing(connect()) as conn:
        with conn:
            cur = conn.execute(
                "UPDATE my_questions SET category = ?, title = ?, answer = ?, difficulty = ?, "
                "updated_at = CURRENT_TIMESTAMP WHERE id = ? AND user_id = ?",
                (category, title, answer, difficulty, cid, user_id),
            )
    return get_custom(user_id, cid) if cur.rowcount > 0 else None


def delete_custom(user_id, cid):
    with closing(connect()) as conn:
        with conn:
            cur = conn.execute("DELETE FROM my_questions WHERE id = ? AND user_id = ?", (cid, user_id))
    return cur.rowcount > 0


def search_sources(user_id, keyword):
    """聚合检索公共题库、个人自建题与个人笔记"""
    kw = escape_like(keyword)
    return query_all(
        "SELECT 'question' AS type, id, title, answer AS body, category, '' AS tags, "
        "'' AS sourceType, NULL AS sourceId, '' AS updatedAt "
        "FROM questions WHERE title LIKE '%' || ? || '%' ESCAPE '\\' OR answer LIKE '%' || ? || '%' ESCAPE '\\' "
        "UNION ALL "
        "SELECT 'custom', id, title, answer, category, '', '', NULL, updated_at "
        "FROM my_questions WHERE user_id = ? AND "
        "(title LIKE '%' || ? || '%' ESCAPE '\\' OR answer LIKE '%' || ? || '%' ESCAPE '\\') "
        "UNION ALL "
        "SELECT 'note', id, title, content, '', tags, source_type, source_id, updated_at "
        "FROM notes WHERE user_id = ? AND (title LIKE '%' || ? || '%' ESCAPE '\\' "
        "OR content LIKE '%' || ? || '%' ESCAPE '\\' OR tags LIKE '%' || ? || '%' ESCAPE '\\')",
        (kw, kw, user_id, kw, kw, user_id, kw, kw, kw),
    )`,
            explain:[
              {at:'# app/database.py（加在 SCHEMA 最后）',to:'CREATE INDEX IF NOT EXISTS idx_my_questions_user ON my_questions(user_id, id DESC);',text:'把 notes 和 my_questions 建表语句加入 SCHEMA，启动初始化时自动建表。'},
              {at:'# app/notes.py',to:'CUSTOM_COLS =',text:'导入数据库辅助函数，并用 AS 列别名让返回字典直接对齐 JSON 字段名。'},
              {at:'def escape_like(s):',to:'return s.replace(',text:'先替换反斜杠再替换 % 和 _，防止转义斜杠被自己二次转义。'},
              {at:'def create_note(',to:'return get_note(user_id, nid)',text:'执行插入并用 lastrowid 回查完整笔记字典。'},
              {at:'def get_note(',to:'def list_notes(',text:'查单条笔记与筛选列表，WHERE 子句固定锁住 user_id。'},
              {at:'kw = escape_like(q)',to:'(user_id, kw, kw, kw, tg, tg, source_type, source_type),',text:'同时支持关键词检索、逗号边界标签筛选和来源类型过滤。'},
              {at:'def update_note(',to:'return get_note(user_id, nid) if cur.rowcount > 0 else None',text:'在事务中更新并检查 rowcount，0 行返回 None。'},
              {at:'def delete_note(',to:'return cur.rowcount > 0',text:'用 rowcount > 0 判断是否真正删掉了属于当前用户的笔记。'},
              {at:'def create_custom(',to:'return get_custom(user_id, cid)',text:'新增自建题后立刻回查返回完整字典。'},
              {at:'def get_custom(',to:'def list_custom(',text:'查单条自建题和按科目、关键词筛选自建题列表。'},
              {at:'kw = escape_like(q)',to:'(user_id, category, category, kw, kw, kw),',text:'所有用户输入的关键词都先经 escape_like 转义再传入占位符。'},
              {at:'def update_custom(',to:'return get_custom(user_id, cid) if cur.rowcount > 0 else None',text:'更新自建题同样检查 rowcount，防止越权修改。'},
              {at:'def delete_custom(',to:'return cur.rowcount > 0',text:'删除自建题，检查 rowcount 防止越权。'},
              {at:'def search_sources(',to:'(kw, kw, user_id, kw, kw, user_id, kw, kw, kw),',text:'用 UNION ALL 聚合三类来源；未登录传 user_id=0 时不会返回任何私有记录。'},
            ],
          },
        },
      },
    },
    {
      title:'任务二：校验、权限校验与统一搜索接口',
      body:'这一步在业务逻辑层与接口层把 `/api/notes`、`/api/my-questions` 和 `/api/search` 串起来：先检查登录状态与输入合法性，在创建关联笔记时校验原题存在且有权访问；统一搜索里则负责规范化标签与关键词、计算 `counts`、截取摘要 `snippet` 并完成分页。',
      variants:{
        go:{
          body:'Go 版本新建 `internal/service/notes.go` 和 `internal/handler/notes.go`，并在 `handler.go` 与 `main.go` 里注册 9 条路由。按字符数计算长度继续用 `utf8.RuneCountInString`。',
          practice:{
            steps:[
              '新建 internal/service/notes.go 和 internal/handler/notes.go，补完 TODO 1 到 5。',
              '按末尾注释更新 handler.go（字段、New 参数、Routes）与 main.go。',
              'go run . 启动后用 curl 测试未登录访问 /api/notes 返回 401，登录后创建笔记和搜索正常。',
            ],
            expect:'GET /api/notes → 401 {"error":"请先登录"}\nGET /api/search?q=defer → 200 {"items":[...],"counts":{"question":...}}',
          },
          code:`// internal/service/notes.go
package service

import (
    "errors"
    "regexp"
    "strings"
    "unicode/utf8"

    "zixishi/internal/store"
)

var (
    ErrBadNote       = errors.New("标题 1–120 字，内容 1–10000 字，来源类型不合法")
    ErrBadCustom     = errors.New("科目 1–20 位小写字母/数字/横线，题目 1–200 字，答案 1–2000 字，难度 1–3")
    ErrBadSearch     = errors.New("搜索参数不合法：type 仅限 all/question/custom/note，size 最大 50")
    ErrSourceMissing = errors.New("关联的题目不存在")
)

var customCatPat = regexp.MustCompile(\`^[a-z0-9-]{1,20}$\`)

type SearchHit struct {
    Type       string \`json:"type"\`
    ID         int    \`json:"id"\`
    Title      string \`json:"title"\`
    Snippet    string \`json:"snippet"\`
    Category   string \`json:"category"\`
    Tags       string \`json:"tags"\`
    SourceType string \`json:"sourceType"\`
    SourceID   *int   \`json:"sourceId"\`
    UpdatedAt  string \`json:"updatedAt"\`
}

type SearchResult struct {
    Items  []SearchHit    \`json:"items"\`
    Total  int            \`json:"total"\`
    Page   int            \`json:"page"\`
    Size   int            \`json:"size"\`
    Counts map[string]int \`json:"counts"\`
}

type NoteService struct {
    notes     *store.NoteStore
    questions *store.QuestionStore
}

func NewNoteService(notes *store.NoteStore, questions *store.QuestionStore) *NoteService {
    return &NoteService{notes: notes, questions: questions}
}

// NormalizeTags 按中英文逗号拆分、去空白、去重，最多保留 10 个标签。
func NormalizeTags(raw string) string {
    // TODO 1：把 "，" 替换成 "," 后拆分，去掉空字符串、长度超过 20 字的截断并去重，最后用 "," 拼接
    return ""
}

// MakeSnippet 折叠空白并围绕关键词（不区分大小写）截取最多前后约 20 / 60 字的纯文本摘要。
func MakeSnippet(text, q string) string {
    // TODO 2：按 rune 切片寻找关键词首次出现的位置；找不到时最多返回前 80 字，超出部分加 "…"
    return ""
}

func cleanNoteText(title, content, tags string) (string, string, string, error) {
    t, c := strings.TrimSpace(title), strings.TrimSpace(content)
    tl, cl := utf8.RuneCountInString(t), utf8.RuneCountInString(c)
    if tl < 1 || tl > 120 || cl < 1 || cl > 10000 {
        return "", "", "", ErrBadNote
    }
    return t, c, NormalizeTags(tags), nil
}

func (s *NoteService) CreateNote(userID int, n store.Note) (store.Note, error) {
    // TODO 3：调用 cleanNoteText，校验 SourceType（空时默认 "manual"，限 manual/question/custom/ai_report）；
    //         若为 "question" 且 SourceID != nil 检查 s.questions.Get；若为 "custom" 且 SourceID != nil 检查 s.notes.GetCustom；
    //         找不到统一返回 ErrSourceMissing，最后调用 s.notes.CreateNote
    return store.Note{}, nil
}

func (s *NoteService) UpdateNote(userID, id int, title, content, tags string) (store.Note, error) {
    t, c, tg, err := cleanNoteText(title, content, tags)
    if err != nil {
        return store.Note{}, err
    }
    return s.notes.UpdateNote(userID, id, t, c, tg)
}

func cleanCustom(q store.CustomQuestion) (store.CustomQuestion, error) {
    q.Category = strings.TrimSpace(q.Category)
    q.Title = strings.TrimSpace(q.Title)
    q.Answer = strings.TrimSpace(q.Answer)
    tl, al := utf8.RuneCountInString(q.Title), utf8.RuneCountInString(q.Answer)
    if !customCatPat.MatchString(q.Category) || tl < 1 || tl > 200 || al < 1 || al > 2000 || q.Difficulty < 1 || q.Difficulty > 3 {
        return q, ErrBadCustom
    }
    return q, nil
}

func (s *NoteService) CreateCustom(userID int, q store.CustomQuestion) (store.CustomQuestion, error) {
    cleaned, err := cleanCustom(q)
    if err != nil {
        return q, err
    }
    return s.notes.CreateCustom(userID, cleaned)
}

func (s *NoteService) UpdateCustom(userID, id int, q store.CustomQuestion) (store.CustomQuestion, error) {
    cleaned, err := cleanCustom(q)
    if err != nil {
        return q, err
    }
    return s.notes.UpdateCustom(userID, id, cleaned)
}

func (s *NoteService) Search(userID int, rawQ, typ string, page, size int) (SearchResult, error) {
    // TODO 4：校验 typ（""/"all"/"question"/"custom"/"note"）与 page>=1、1<=size<=50（不合法返回 ErrBadSearch）；
    //         q 为空直接返回空列表与全 0 counts；否则调用 s.notes.SearchSources，统计 counts，
    //         过滤类型、按 page/size 分页切片，并用 MakeSnippet 生成摘要
    return SearchResult{}, nil
}

// internal/handler/notes.go
package handler

import (
    "encoding/json"
    "errors"
    "net/http"
    "strconv"
    "strings"

    "zixishi/internal/service"
    "zixishi/internal/store"
)

func (h *Handler) noteError(w http.ResponseWriter, err error) {
    switch {
    case errors.Is(err, service.ErrBadNote), errors.Is(err, service.ErrBadCustom), errors.Is(err, service.ErrBadSearch):
        writeJSON(w, http.StatusBadRequest, map[string]string{"error": err.Error()})
    case errors.Is(err, store.ErrNotFound), errors.Is(err, service.ErrSourceMissing):
        writeJSON(w, http.StatusNotFound, map[string]string{"error": "资源不存在"})
    default:
        h.serverError(w, err)
    }
}

func (h *Handler) listNotes(w http.ResponseWriter, r *http.Request) {
    u, ok := h.requireUser(w, r)
    if !ok {
        return
    }
    q := r.URL.Query()
    items, err := h.noteStore.ListNotes(u.ID, strings.TrimSpace(q.Get("q")), strings.TrimSpace(q.Get("tag")), q.Get("sourceType"))
    if err != nil {
        h.noteError(w, err)
        return
    }
    writeJSON(w, http.StatusOK, map[string]any{"items": items})
}

func (h *Handler) createNote(w http.ResponseWriter, r *http.Request) {
    // TODO 5：requireUser；解析 JSON 进 store.Note；调用 h.notes.CreateNote，成功返回 201
}

func (h *Handler) getNote(w http.ResponseWriter, r *http.Request) {
    u, ok := h.requireUser(w, r)
    if !ok {
        return
    }
    id, err := strconv.Atoi(r.PathValue("id"))
    if err != nil || id < 1 {
        h.noteError(w, store.ErrNotFound)
        return
    }
    n, err := h.noteStore.GetNote(u.ID, id)
    if err != nil {
        h.noteError(w, err)
        return
    }
    writeJSON(w, http.StatusOK, n)
}

func (h *Handler) updateNote(w http.ResponseWriter, r *http.Request) {
    u, ok := h.requireUser(w, r)
    if !ok {
        return
    }
    id, err := strconv.Atoi(r.PathValue("id"))
    if err != nil || id < 1 {
        h.noteError(w, store.ErrNotFound)
        return
    }
    var body struct {
        Title   string \`json:"title"\`
        Content string \`json:"content"\`
        Tags    string \`json:"tags"\`
    }
    if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
        h.noteError(w, service.ErrBadNote)
        return
    }
    n, err := h.notes.UpdateNote(u.ID, id, body.Title, body.Content, body.Tags)
    if err != nil {
        h.noteError(w, err)
        return
    }
    writeJSON(w, http.StatusOK, n)
}

func (h *Handler) deleteNote(w http.ResponseWriter, r *http.Request) {
    u, ok := h.requireUser(w, r)
    if !ok {
        return
    }
    id, err := strconv.Atoi(r.PathValue("id"))
    if err != nil || id < 1 {
        h.noteError(w, store.ErrNotFound)
        return
    }
    if err := h.noteStore.DeleteNote(u.ID, id); err != nil {
        h.noteError(w, err)
        return
    }
    w.WriteHeader(http.StatusNoContent)
}

func (h *Handler) listCustomQuestions(w http.ResponseWriter, r *http.Request) {
    u, ok := h.requireUser(w, r)
    if !ok {
        return
    }
    q := r.URL.Query()
    items, err := h.noteStore.ListCustom(u.ID, strings.TrimSpace(q.Get("category")), strings.TrimSpace(q.Get("q")))
    if err != nil {
        h.noteError(w, err)
        return
    }
    writeJSON(w, http.StatusOK, map[string]any{"items": items})
}

func (h *Handler) createCustomQuestion(w http.ResponseWriter, r *http.Request) {
    u, ok := h.requireUser(w, r)
    if !ok {
        return
    }
    var body store.CustomQuestion
    if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
        h.noteError(w, service.ErrBadCustom)
        return
    }
    created, err := h.notes.CreateCustom(u.ID, body)
    if err != nil {
        h.noteError(w, err)
        return
    }
    writeJSON(w, http.StatusCreated, created)
}

func (h *Handler) updateCustomQuestion(w http.ResponseWriter, r *http.Request) {
    u, ok := h.requireUser(w, r)
    if !ok {
        return
    }
    id, err := strconv.Atoi(r.PathValue("id"))
    if err != nil || id < 1 {
        h.noteError(w, store.ErrNotFound)
        return
    }
    var body store.CustomQuestion
    if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
        h.noteError(w, service.ErrBadCustom)
        return
    }
    updated, err := h.notes.UpdateCustom(u.ID, id, body)
    if err != nil {
        h.noteError(w, err)
        return
    }
    writeJSON(w, http.StatusOK, updated)
}

func (h *Handler) deleteCustomQuestion(w http.ResponseWriter, r *http.Request) {
    u, ok := h.requireUser(w, r)
    if !ok {
        return
    }
    id, err := strconv.Atoi(r.PathValue("id"))
    if err != nil || id < 1 {
        h.noteError(w, store.ErrNotFound)
        return
    }
    if err := h.noteStore.DeleteCustom(u.ID, id); err != nil {
        h.noteError(w, err)
        return
    }
    w.WriteHeader(http.StatusNoContent)
}

func (h *Handler) searchAll(w http.ResponseWriter, r *http.Request) {
    userID := 0
    if u, err := h.auth.CurrentUser(sessionToken(r)); err == nil {
        userID = u.ID
    }
    page, ok1 := positiveInt(r, "page", 1)
    size, ok2 := positiveInt(r, "size", 10)
    if !ok1 || !ok2 {
        h.noteError(w, service.ErrBadSearch)
        return
    }
    q := r.URL.Query()
    res, err := h.notes.Search(userID, q.Get("q"), q.Get("type"), page, size)
    if err != nil {
        h.noteError(w, err)
        return
    }
    writeJSON(w, http.StatusOK, res)
}

// 组装：Handler 加上 noteStore *store.NoteStore 和 notes *service.NoteService；Routes 注册：
//     mux.HandleFunc("GET /api/notes", h.listNotes)
//     mux.HandleFunc("POST /api/notes", h.createNote)
//     mux.HandleFunc("GET /api/notes/{id}", h.getNote)
//     mux.HandleFunc("PUT /api/notes/{id}", h.updateNote)
//     mux.HandleFunc("DELETE /api/notes/{id}", h.deleteNote)
//     mux.HandleFunc("GET /api/my-questions", h.listCustomQuestions)
//     mux.HandleFunc("POST /api/my-questions", h.createCustomQuestion)
//     mux.HandleFunc("PUT /api/my-questions/{id}", h.updateCustomQuestion)
//     mux.HandleFunc("DELETE /api/my-questions/{id}", h.deleteCustomQuestion)
//     mux.HandleFunc("GET /api/search", h.searchAll)`,
          explain:[
            {at:'// internal/service/notes.go',to:'"zixishi/internal/store"',text:'新建业务逻辑层，专门负责校验、标签规范化、摘要截取与搜索聚合。'},
            {at:'var (',to:'ErrSourceMissing = errors.New("关联的题目不存在")',text:'定义四种语义清晰的业务错误，交给处理器翻译成 400 或 404。'},
            {at:'var customCatPat =',to:'type SearchResult struct {',text:'校验自建题科目的正则，以及搜索命中项和统一分页响应结构。'},
            {at:'Items  []SearchHit',to:'return &NoteService{notes: notes, questions: questions}',text:'NoteService 同时持有笔记仓库与公共题库仓库，方便创建关联笔记时校验证明题目存在。'},
            {at:'func NormalizeTags(raw string) string {',to:'return ""',text:'标签规范化函数，待补全 TODO 1。'},
            {at:'func MakeSnippet(text, q string) string {',to:'return ""',text:'摘要生成函数，待补全 TODO 2。'},
            {at:'func cleanNoteText(',to:'return t, c, NormalizeTags(tags), nil',text:'去掉首尾空格并按字数检查笔记标题与正文。'},
            {at:'func (s *NoteService) CreateNote(',to:'return store.Note{}, nil',text:'创建笔记（含来源存在性及归属校验），待补全 TODO 3。'},
            {at:'func (s *NoteService) UpdateNote(',to:'return s.notes.UpdateNote(userID, id, t, c, tg)',text:'修改笔记先做合法性清洗再交由仓库层按 user_id 隔离更新。'},
            {at:'func cleanCustom(',to:'return q, nil',text:'自建题的清洗与长度/难度校验与第 16 关公共题库一致。'},
            {at:'func (s *NoteService) CreateCustom(',to:'return s.notes.UpdateCustom(userID, id, cleaned)',text:'创建和更新自建题前先经过 cleanCustom 校验。'},
            {at:'func (s *NoteService) Search(',to:'return SearchResult{}, nil',text:'统一搜索聚合方法，待补全 TODO 4。'},
            {at:'// internal/handler/notes.go',to:'"zixishi/internal/store"',text:'接口层处理函数所在文件。'},
            {at:'func (h *Handler) noteError(',to:'h.serverError(w, err)',text:'把业务层和仓库层错误映射成 400、404 或 500。'},
            {at:'func (h *Handler) listNotes(',to:'writeJSON(w, http.StatusOK, map[string]any{"items": items})',text:'列出当前用户的笔记，支持按关键词、标签和来源类型过滤。'},
            {at:'func (h *Handler) createNote(',to:'}',text:'新增笔记接口，待补全 TODO 5。'},
            {at:'func (h *Handler) getNote(',to:'writeJSON(w, http.StatusOK, n)',text:'获取单条笔记，路径 id 非正整数或不属于自己一律 404。'},
            {at:'func (h *Handler) updateNote(',to:'writeJSON(w, http.StatusOK, n)',text:'更新单条笔记。'},
            {at:'func (h *Handler) deleteNote(',to:'w.WriteHeader(http.StatusNoContent)',text:'删除笔记成功返回 204 无正文。'},
            {at:'func (h *Handler) listCustomQuestions(',to:'writeJSON(w, http.StatusOK, map[string]any{"items": items})',text:'列出当前用户的自建题库。'},
            {at:'func (h *Handler) createCustomQuestion(',to:'writeJSON(w, http.StatusCreated, created)',text:'新增自建题成功返回 201。'},
            {at:'func (h *Handler) updateCustomQuestion(',to:'writeJSON(w, http.StatusOK, updated)',text:'更新自建题，校验通过且归属匹配返回 200。'},
            {at:'func (h *Handler) deleteCustomQuestion(',to:'w.WriteHeader(http.StatusNoContent)',text:'删除自建题成功返回 204。'},
            {at:'func (h *Handler) searchAll(',to:'writeJSON(w, http.StatusOK, res)',text:'统一检索使用可选认证：未登录传 userID=0，已登录才带上用户身份检索私有数据。'},
          ],
          solution:{
            code:`// internal/service/notes.go
package service

import (
    "errors"
    "regexp"
    "strings"
    "unicode/utf8"

    "zixishi/internal/store"
)

var (
    ErrBadNote       = errors.New("标题 1–120 字，内容 1–10000 字，来源类型不合法")
    ErrBadCustom     = errors.New("科目 1–20 位小写字母/数字/横线，题目 1–200 字，答案 1–2000 字，难度 1–3")
    ErrBadSearch     = errors.New("搜索参数不合法：type 仅限 all/question/custom/note，size 最大 50")
    ErrSourceMissing = errors.New("关联的题目不存在")
)

var customCatPat = regexp.MustCompile(\`^[a-z0-9-]{1,20}$\`)

type SearchHit struct {
    Type       string \`json:"type"\`
    ID         int    \`json:"id"\`
    Title      string \`json:"title"\`
    Snippet    string \`json:"snippet"\`
    Category   string \`json:"category"\`
    Tags       string \`json:"tags"\`
    SourceType string \`json:"sourceType"\`
    SourceID   *int   \`json:"sourceId"\`
    UpdatedAt  string \`json:"updatedAt"\`
}

type SearchResult struct {
    Items  []SearchHit    \`json:"items"\`
    Total  int            \`json:"total"\`
    Page   int            \`json:"page"\`
    Size   int            \`json:"size"\`
    Counts map[string]int \`json:"counts"\`
}

type NoteService struct {
    notes     *store.NoteStore
    questions *store.QuestionStore
}

func NewNoteService(notes *store.NoteStore, questions *store.QuestionStore) *NoteService {
    return &NoteService{notes: notes, questions: questions}
}

// NormalizeTags 按中英文逗号拆分、去空白、去重，最多保留 10 个标签。
func NormalizeTags(raw string) string {
    seen := map[string]bool{}
    out := []string{}
    for _, part := range strings.Split(strings.ReplaceAll(raw, "，", ","), ",") {
        t := strings.TrimSpace(part)
        if t == "" || seen[t] {
            continue
        }
        if runes := []rune(t); len(runes) > 20 {
            t = string(runes[:20])
        }
        seen[t] = true
        out = append(out, t)
        if len(out) >= 10 {
            break
        }
    }
    return strings.Join(out, ",")
}

// MakeSnippet 折叠空白并围绕关键词（不区分大小写）截取最多前后约 20 / 60 字的纯文本摘要。
func MakeSnippet(text, q string) string {
    runes := []rune(strings.Join(strings.Fields(text), " "))
    lower := []rune(strings.ToLower(string(runes)))
    qRunes := []rune(strings.ToLower(q))
    idx := -1
    if len(qRunes) > 0 {
        for i := 0; i+len(qRunes) <= len(lower); i++ {
            if string(lower[i:i+len(qRunes)]) == string(qRunes) {
                idx = i
                break
            }
        }
    }
    if idx < 0 {
        if len(runes) > 80 {
            return string(runes[:80]) + "…"
        }
        return string(runes)
    }
    start, end := max(0, idx-20), min(len(runes), idx+len(qRunes)+60)
    out := string(runes[start:end])
    if start > 0 {
        out = "…" + out
    }
    if end < len(runes) {
        out += "…"
    }
    return out
}

func cleanNoteText(title, content, tags string) (string, string, string, error) {
    t, c := strings.TrimSpace(title), strings.TrimSpace(content)
    tl, cl := utf8.RuneCountInString(t), utf8.RuneCountInString(c)
    if tl < 1 || tl > 120 || cl < 1 || cl > 10000 {
        return "", "", "", ErrBadNote
    }
    return t, c, NormalizeTags(tags), nil
}

func (s *NoteService) CreateNote(userID int, n store.Note) (store.Note, error) {
    t, c, tg, err := cleanNoteText(n.Title, n.Content, n.Tags)
    if err != nil {
        return store.Note{}, err
    }
    st := strings.TrimSpace(n.SourceType)
    if st == "" {
        st = "manual"
    }
    switch st {
    case "manual", "ai_report":
    case "question":
        if n.SourceID == nil {
            return store.Note{}, ErrBadNote
        }
        if _, err := s.questions.Get(*n.SourceID); err != nil {
            return store.Note{}, ErrSourceMissing
        }
    case "custom":
        if n.SourceID == nil {
            return store.Note{}, ErrBadNote
        }
        if _, err := s.notes.GetCustom(userID, *n.SourceID); err != nil {
            return store.Note{}, ErrSourceMissing
        }
    default:
        return store.Note{}, ErrBadNote
    }
    return s.notes.CreateNote(userID, store.Note{Title: t, Content: c, Tags: tg, SourceType: st, SourceID: n.SourceID})
}

func (s *NoteService) UpdateNote(userID, id int, title, content, tags string) (store.Note, error) {
    t, c, tg, err := cleanNoteText(title, content, tags)
    if err != nil {
        return store.Note{}, err
    }
    return s.notes.UpdateNote(userID, id, t, c, tg)
}

func cleanCustom(q store.CustomQuestion) (store.CustomQuestion, error) {
    q.Category = strings.TrimSpace(q.Category)
    q.Title = strings.TrimSpace(q.Title)
    q.Answer = strings.TrimSpace(q.Answer)
    tl, al := utf8.RuneCountInString(q.Title), utf8.RuneCountInString(q.Answer)
    if !customCatPat.MatchString(q.Category) || tl < 1 || tl > 200 || al < 1 || al > 2000 || q.Difficulty < 1 || q.Difficulty > 3 {
        return q, ErrBadCustom
    }
    return q, nil
}

func (s *NoteService) CreateCustom(userID int, q store.CustomQuestion) (store.CustomQuestion, error) {
    cleaned, err := cleanCustom(q)
    if err != nil {
        return q, err
    }
    return s.notes.CreateCustom(userID, cleaned)
}

func (s *NoteService) UpdateCustom(userID, id int, q store.CustomQuestion) (store.CustomQuestion, error) {
    cleaned, err := cleanCustom(q)
    if err != nil {
        return q, err
    }
    return s.notes.UpdateCustom(userID, id, cleaned)
}

func (s *NoteService) Search(userID int, rawQ, typ string, page, size int) (SearchResult, error) {
    if typ == "" {
        typ = "all"
    }
    if (typ != "all" && typ != "question" && typ != "custom" && typ != "note") || page < 1 || size < 1 || size > 50 {
        return SearchResult{}, ErrBadSearch
    }
    counts := map[string]int{"question": 0, "custom": 0, "note": 0}
    q := strings.TrimSpace(rawQ)
    if q == "" {
        return SearchResult{Items: []SearchHit{}, Total: 0, Page: page, Size: size, Counts: counts}, nil
    }
    if runes := []rune(q); len(runes) > 100 {
        q = string(runes[:100])
    }
    rows, err := s.notes.SearchSources(userID, q)
    if err != nil {
        return SearchResult{}, err
    }
    filtered := []SearchHit{}
    for _, r := range rows {
        counts[r.Type]++
        if typ == "all" || r.Type == typ {
            filtered = append(filtered, SearchHit{
                Type: r.Type, ID: r.ID, Title: r.Title, Snippet: MakeSnippet(r.Body, q),
                Category: r.Category, Tags: r.Tags, SourceType: r.SourceType, SourceID: r.SourceID, UpdatedAt: r.UpdatedAt,
            })
        }
    }
    total := len(filtered)
    start := min((page-1)*size, total)
    end := min(start+size, total)
    return SearchResult{Items: filtered[start:end], Total: total, Page: page, Size: size, Counts: counts}, nil
}

// internal/handler/notes.go
package handler

import (
    "encoding/json"
    "errors"
    "net/http"
    "strconv"
    "strings"

    "zixishi/internal/service"
    "zixishi/internal/store"
)

func (h *Handler) noteError(w http.ResponseWriter, err error) {
    switch {
    case errors.Is(err, service.ErrBadNote), errors.Is(err, service.ErrBadCustom), errors.Is(err, service.ErrBadSearch):
        writeJSON(w, http.StatusBadRequest, map[string]string{"error": err.Error()})
    case errors.Is(err, store.ErrNotFound), errors.Is(err, service.ErrSourceMissing):
        writeJSON(w, http.StatusNotFound, map[string]string{"error": "资源不存在"})
    default:
        h.serverError(w, err)
    }
}

func (h *Handler) listNotes(w http.ResponseWriter, r *http.Request) {
    u, ok := h.requireUser(w, r)
    if !ok {
        return
    }
    q := r.URL.Query()
    items, err := h.noteStore.ListNotes(u.ID, strings.TrimSpace(q.Get("q")), strings.TrimSpace(q.Get("tag")), q.Get("sourceType"))
    if err != nil {
        h.noteError(w, err)
        return
    }
    writeJSON(w, http.StatusOK, map[string]any{"items": items})
}

func (h *Handler) createNote(w http.ResponseWriter, r *http.Request) {
    u, ok := h.requireUser(w, r)
    if !ok {
        return
    }
    var body store.Note
    if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
        h.noteError(w, service.ErrBadNote)
        return
    }
    created, err := h.notes.CreateNote(u.ID, body)
    if err != nil {
        h.noteError(w, err)
        return
    }
    writeJSON(w, http.StatusCreated, created)
}

func (h *Handler) getNote(w http.ResponseWriter, r *http.Request) {
    u, ok := h.requireUser(w, r)
    if !ok {
        return
    }
    id, err := strconv.Atoi(r.PathValue("id"))
    if err != nil || id < 1 {
        h.noteError(w, store.ErrNotFound)
        return
    }
    n, err := h.noteStore.GetNote(u.ID, id)
    if err != nil {
        h.noteError(w, err)
        return
    }
    writeJSON(w, http.StatusOK, n)
}

func (h *Handler) updateNote(w http.ResponseWriter, r *http.Request) {
    u, ok := h.requireUser(w, r)
    if !ok {
        return
    }
    id, err := strconv.Atoi(r.PathValue("id"))
    if err != nil || id < 1 {
        h.noteError(w, store.ErrNotFound)
        return
    }
    var body struct {
        Title   string \`json:"title"\`
        Content string \`json:"content"\`
        Tags    string \`json:"tags"\`
    }
    if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
        h.noteError(w, service.ErrBadNote)
        return
    }
    n, err := h.notes.UpdateNote(u.ID, id, body.Title, body.Content, body.Tags)
    if err != nil {
        h.noteError(w, err)
        return
    }
    writeJSON(w, http.StatusOK, n)
}

func (h *Handler) deleteNote(w http.ResponseWriter, r *http.Request) {
    u, ok := h.requireUser(w, r)
    if !ok {
        return
    }
    id, err := strconv.Atoi(r.PathValue("id"))
    if err != nil || id < 1 {
        h.noteError(w, store.ErrNotFound)
        return
    }
    if err := h.noteStore.DeleteNote(u.ID, id); err != nil {
        h.noteError(w, err)
        return
    }
    w.WriteHeader(http.StatusNoContent)
}

func (h *Handler) listCustomQuestions(w http.ResponseWriter, r *http.Request) {
    u, ok := h.requireUser(w, r)
    if !ok {
        return
    }
    q := r.URL.Query()
    items, err := h.noteStore.ListCustom(u.ID, strings.TrimSpace(q.Get("category")), strings.TrimSpace(q.Get("q")))
    if err != nil {
        h.noteError(w, err)
        return
    }
    writeJSON(w, http.StatusOK, map[string]any{"items": items})
}

func (h *Handler) createCustomQuestion(w http.ResponseWriter, r *http.Request) {
    u, ok := h.requireUser(w, r)
    if !ok {
        return
    }
    var body store.CustomQuestion
    if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
        h.noteError(w, service.ErrBadCustom)
        return
    }
    created, err := h.notes.CreateCustom(u.ID, body)
    if err != nil {
        h.noteError(w, err)
        return
    }
    writeJSON(w, http.StatusCreated, created)
}

func (h *Handler) updateCustomQuestion(w http.ResponseWriter, r *http.Request) {
    u, ok := h.requireUser(w, r)
    if !ok {
        return
    }
    id, err := strconv.Atoi(r.PathValue("id"))
    if err != nil || id < 1 {
        h.noteError(w, store.ErrNotFound)
        return
    }
    var body store.CustomQuestion
    if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
        h.noteError(w, service.ErrBadCustom)
        return
    }
    updated, err := h.notes.UpdateCustom(u.ID, id, body)
    if err != nil {
        h.noteError(w, err)
        return
    }
    writeJSON(w, http.StatusOK, updated)
}

func (h *Handler) deleteCustomQuestion(w http.ResponseWriter, r *http.Request) {
    u, ok := h.requireUser(w, r)
    if !ok {
        return
    }
    id, err := strconv.Atoi(r.PathValue("id"))
    if err != nil || id < 1 {
        h.noteError(w, store.ErrNotFound)
        return
    }
    if err := h.noteStore.DeleteCustom(u.ID, id); err != nil {
        h.noteError(w, err)
        return
    }
    w.WriteHeader(http.StatusNoContent)
}

func (h *Handler) searchAll(w http.ResponseWriter, r *http.Request) {
    userID := 0
    if u, err := h.auth.CurrentUser(sessionToken(r)); err == nil {
        userID = u.ID
    }
    page, ok1 := positiveInt(r, "page", 1)
    size, ok2 := positiveInt(r, "size", 10)
    if !ok1 || !ok2 {
        h.noteError(w, service.ErrBadSearch)
        return
    }
    q := r.URL.Query()
    res, err := h.notes.Search(userID, q.Get("q"), q.Get("type"), page, size)
    if err != nil {
        h.noteError(w, err)
        return
    }
    writeJSON(w, http.StatusOK, res)
}

// 组装：Handler 加上 noteStore *store.NoteStore 和 notes *service.NoteService；Routes 注册：
//     mux.HandleFunc("GET /api/notes", h.listNotes)
//     mux.HandleFunc("POST /api/notes", h.createNote)
//     mux.HandleFunc("GET /api/notes/{id}", h.getNote)
//     mux.HandleFunc("PUT /api/notes/{id}", h.updateNote)
//     mux.HandleFunc("DELETE /api/notes/{id}", h.deleteNote)
//     mux.HandleFunc("GET /api/my-questions", h.listCustomQuestions)
//     mux.HandleFunc("POST /api/my-questions", h.createCustomQuestion)
//     mux.HandleFunc("PUT /api/my-questions/{id}", h.updateCustomQuestion)
//     mux.HandleFunc("DELETE /api/my-questions/{id}", h.deleteCustomQuestion)
//     mux.HandleFunc("GET /api/search", h.searchAll)`,
            explain:[
              {at:'// internal/service/notes.go',to:'"zixishi/internal/store"',text:'新建业务逻辑层，专门负责校验、标签规范化、摘要截取与搜索聚合。'},
              {at:'var (',to:'ErrSourceMissing = errors.New("关联的题目不存在")',text:'定义四种语义清晰的业务错误，交给处理器翻译成 400 或 404。'},
              {at:'var customCatPat =',to:'type SearchResult struct {',text:'校验自建题科目的正则，以及搜索命中项和统一分页响应结构。'},
              {at:'Items  []SearchHit',to:'return &NoteService{notes: notes, questions: questions}',text:'NoteService 同时持有笔记仓库与公共题库仓库，方便创建关联笔记时校验题目存在。'},
              {at:'func NormalizeTags(raw string) string {',to:'return strings.Join(out, ",")',text:'兼容中英文逗号，用 map 去重、按 rune 截断超长标签，最多保留 10 个。'},
              {at:'func MakeSnippet(text, q string) string {',to:'return out',text:'折叠空白后按 rune 下标寻找关键词，避免截断多字节汉字并加上省略号。'},
              {at:'func cleanNoteText(',to:'return t, c, NormalizeTags(tags), nil',text:'去掉首尾空格并按字数检查笔记标题与正文。'},
              {at:'func (s *NoteService) CreateNote(',to:'return s.notes.CreateNote(',text:'校验 sourceType，遇到 question 或 custom 时分别校验公共题库与个人自建题存在且有权关联。'},
              {at:'func (s *NoteService) UpdateNote(',to:'return s.notes.UpdateNote(userID, id, t, c, tg)',text:'修改笔记先做合法性清洗再交由仓库层按 user_id 隔离更新。'},
              {at:'func cleanCustom(',to:'return q, nil',text:'自建题的清洗与长度/难度校验与第 16 关公共题库一致。'},
              {at:'func (s *NoteService) CreateCustom(',to:'return s.notes.UpdateCustom(userID, id, cleaned)',text:'创建和更新自建题前先经过 cleanCustom 校验。'},
              {at:'func (s *NoteService) Search(',to:'return SearchResult{Items: filtered[start:end]',text:'先统计三类命中总数 counts，再按 type 过滤、按 page/size 切片并生成 snippet。'},
              {at:'// internal/handler/notes.go',to:'"zixishi/internal/store"',text:'接口层处理函数所在文件。'},
              {at:'func (h *Handler) noteError(',to:'h.serverError(w, err)',text:'把业务层和仓库层错误映射成 400、404 或 500。'},
              {at:'func (h *Handler) listNotes(',to:'writeJSON(w, http.StatusOK, map[string]any{"items": items})',text:'列出当前用户的笔记，支持按关键词、标签和来源类型过滤。'},
              {at:'func (h *Handler) createNote(',to:'writeJSON(w, http.StatusCreated, created)',text:'先用 requireUser 认人，解析 JSON 后交给业务逻辑层校验并保存，成功返回 201。'},
              {at:'func (h *Handler) getNote(',to:'writeJSON(w, http.StatusOK, n)',text:'获取单条笔记，路径 id 非正整数或不属于自己一律 404。'},
              {at:'func (h *Handler) updateNote(',to:'writeJSON(w, http.StatusOK, n)',text:'更新单条笔记。'},
              {at:'func (h *Handler) deleteNote(',to:'w.WriteHeader(http.StatusNoContent)',text:'删除笔记成功返回 204 无正文。'},
              {at:'func (h *Handler) listCustomQuestions(',to:'writeJSON(w, http.StatusOK, map[string]any{"items": items})',text:'列出当前用户的自建题库。'},
              {at:'func (h *Handler) createCustomQuestion(',to:'writeJSON(w, http.StatusCreated, created)',text:'新增自建题成功返回 201。'},
              {at:'func (h *Handler) updateCustomQuestion(',to:'writeJSON(w, http.StatusOK, updated)',text:'更新自建题，校验通过且归属匹配返回 200。'},
              {at:'func (h *Handler) deleteCustomQuestion(',to:'w.WriteHeader(http.StatusNoContent)',text:'删除自建题成功返回 204。'},
              {at:'func (h *Handler) searchAll(',to:'writeJSON(w, http.StatusOK, res)',text:'统一检索使用可选认证：未登录传 userID=0，已登录才带上用户身份检索私有数据。'},
            ],
          },
        },
        java:{
          body:'Java 版本新建 `service/NoteService.java` 和 `controller/NoteController.java`，直接复用第 10 关已在 `GlobalErrors.java` 注册过的 `StudyService.StudyException`，不用再改全局异常处理器。',
          practice:{
            steps:[
              '新建 service/NoteService.java，补完 TODO 1 到 4。',
              '新建 controller/NoteController.java，补完 TODO 5。',
              '运行 mvnw spring-boot:run 启动服务，用 curl 试一下未登录访问与搜索。',
            ],
            expect:'GET /api/notes → 401 {"error":"请先登录"}\nGET /api/search?q=defer → 200 {"items":[...],"counts":{"question":...}}',
          },
          code:`// service/NoteService.java
package com.example.zixishi.service;

import com.example.zixishi.repository.NoteRepository;
import com.example.zixishi.repository.NoteRepository.CustomQuestion;
import com.example.zixishi.repository.NoteRepository.Note;
import com.example.zixishi.repository.NoteRepository.SearchRaw;
import com.example.zixishi.repository.QuestionRepository;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.regex.Pattern;
import org.springframework.stereotype.Service;

@Service
public class NoteService {

    private static final Pattern CATEGORY = Pattern.compile("[a-z0-9-]{1,20}");
    private static final Set<String> SOURCE_TYPES = Set.of("manual", "question", "custom", "ai_report");

    public record SearchHit(String type, int id, String title, String snippet, String category,
                            String tags, String sourceType, Integer sourceId, String updatedAt) {}

    public record SearchResult(List<SearchHit> items, int total, int page, int size, Map<String, Integer> counts) {}

    private final NoteRepository notes;
    private final QuestionRepository questions;

    public NoteService(NoteRepository notes, QuestionRepository questions) {
        this.notes = notes;
        this.questions = questions;
    }

    private static StudyService.StudyException error(int status, String message) {
        return new StudyService.StudyException(status, message);
    }

    public static String normalizeTags(String raw) {
        // TODO 1：把 null 当成 ""，兼容中文逗号 "，"，去首尾空白、去重并限制最多 10 个标签，用 "," 拼接
        return "";
    }

    public static String makeSnippet(String text, String q) {
        // TODO 2：折叠连续空白，不区分大小写寻找 q；截取匹配前后约 20 / 60 个字符并按需加 "…"
        return "";
    }

    public Note createNote(int userId, String title, String content, String tags, String sourceType, Integer sourceId) {
        // TODO 3：校验 title（1–120 字）、content（1–10000 字）和 sourceType（默认 "manual"）；
        //         若关联了 question 或 custom 题目，先查存在性与归属权，找不到抛出 error(404, "关联的题目不存在")
        return null;
    }

    public Note updateNote(int userId, int id, String title, String content, String tags) {
        String t = title == null ? "" : title.strip();
        String c = content == null ? "" : content.strip();
        if (t.isEmpty() || t.codePointCount(0, t.length()) > 120 || c.isEmpty() || c.codePointCount(0, c.length()) > 10000) {
            throw error(400, "标题 1–120 字，内容 1–10000 字");
        }
        return notes.updateNote(userId, id, t, c, normalizeTags(tags))
            .orElseThrow(() -> error(404, "笔记不存在"));
    }

    public CustomQuestion createCustom(int userId, String category, String title, String answer, Integer difficulty) {
        String c = category == null ? "" : category.strip();
        String t = title == null ? "" : title.strip();
        String a = answer == null ? "" : answer.strip();
        if (!CATEGORY.matcher(c).matches() || t.isEmpty() || t.codePointCount(0, t.length()) > 200
                || a.isEmpty() || a.codePointCount(0, a.length()) > 2000 || difficulty == null || difficulty < 1 || difficulty > 3) {
            throw error(400, "自建题字段不合法");
        }
        return notes.createCustom(userId, c, t, a, difficulty);
    }

    public CustomQuestion updateCustom(int userId, int id, String category, String title, String answer, Integer difficulty) {
        String c = category == null ? "" : category.strip();
        String t = title == null ? "" : title.strip();
        String a = answer == null ? "" : answer.strip();
        if (!CATEGORY.matcher(c).matches() || t.isEmpty() || t.codePointCount(0, t.length()) > 200
                || a.isEmpty() || a.codePointCount(0, a.length()) > 2000 || difficulty == null || difficulty < 1 || difficulty > 3) {
            throw error(400, "自建题字段不合法");
        }
        return notes.updateCustom(userId, id, c, t, a, difficulty)
            .orElseThrow(() -> error(404, "自建题不存在"));
    }

    public SearchResult search(int userId, String rawQ, String type, int page, int size) {
        // TODO 4：校验 type（空时视为 "all"，限 all/question/custom/note）和 page >= 1、1 <= size <= 50；
        //         调用 notes.searchSources，统计 counts，过滤类型并分页，调用 makeSnippet 生成摘要
        return null;
    }
}

// controller/NoteController.java
package com.example.zixishi.controller;

import com.example.zixishi.repository.NoteRepository;
import com.example.zixishi.repository.NoteRepository.CustomQuestion;
import com.example.zixishi.repository.NoteRepository.Note;
import com.example.zixishi.service.AuthService;
import com.example.zixishi.service.NoteService;
import com.example.zixishi.service.StudyService;
import java.util.List;
import java.util.Map;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api")
public class NoteController {

    public record NoteBody(String title, String content, String tags, String sourceType, Integer sourceId) {}

    public record CustomBody(String category, String title, String answer, Integer difficulty) {}

    private final AuthService auth;
    private final NoteRepository repo;
    private final NoteService service;

    public NoteController(AuthService auth, NoteRepository repo, NoteService service) {
        this.auth = auth;
        this.repo = repo;
        this.service = service;
    }

    private int optionalUserId(String token) {
        if (token == null || token.isBlank()) {
            return 0;
        }
        try {
            return auth.currentUser(token).id();
        } catch (AuthService.AuthException e) {
            return 0;
        }
    }

    @GetMapping("/notes")
    public Map<String, List<Note>> listNotes(@CookieValue(name = "session", required = false) String token,
                                             @RequestParam(defaultValue = "") String q,
                                             @RequestParam(defaultValue = "") String tag,
                                             @RequestParam(defaultValue = "") String sourceType) {
        int uid = auth.currentUser(token).id();
        return Map.of("items", repo.listNotes(uid, q.strip(), tag.strip(), sourceType.strip()));
    }

    @PostMapping("/notes")
    public ResponseEntity<Note> createNote(@CookieValue(name = "session", required = false) String token,
                                           @RequestBody NoteBody body) {
        // TODO 5：用 auth.currentUser 拿到用户 id，调用 service.createNote 并返回 201
        return null;
    }

    @GetMapping("/notes/{id}")
    public Note getNote(@CookieValue(name = "session", required = false) String token, @PathVariable int id) {
        int uid = auth.currentUser(token).id();
        return repo.findNote(uid, id).orElseThrow(() -> new StudyService.StudyException(404, "笔记不存在"));
    }

    @PutMapping("/notes/{id}")
    public Note updateNote(@CookieValue(name = "session", required = false) String token,
                           @PathVariable int id, @RequestBody NoteBody body) {
        return service.updateNote(auth.currentUser(token).id(), id, body.title(), body.content(), body.tags());
    }

    @DeleteMapping("/notes/{id}")
    public ResponseEntity<Void> deleteNote(@CookieValue(name = "session", required = false) String token,
                                           @PathVariable int id) {
        if (!repo.deleteNote(auth.currentUser(token).id(), id)) {
            throw new StudyService.StudyException(404, "笔记不存在");
        }
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/my-questions")
    public Map<String, List<CustomQuestion>> listCustom(@CookieValue(name = "session", required = false) String token,
                                                        @RequestParam(defaultValue = "") String category,
                                                        @RequestParam(defaultValue = "") String q) {
        int uid = auth.currentUser(token).id();
        return Map.of("items", repo.listCustom(uid, category.strip(), q.strip()));
    }

    @PostMapping("/my-questions")
    public ResponseEntity<CustomQuestion> createCustom(@CookieValue(name = "session", required = false) String token,
                                                       @RequestBody CustomBody body) {
        int uid = auth.currentUser(token).id();
        return ResponseEntity.status(201).body(
            service.createCustom(uid, body.category(), body.title(), body.answer(), body.difficulty()));
    }

    @PutMapping("/my-questions/{id}")
    public CustomQuestion updateCustom(@CookieValue(name = "session", required = false) String token,
                                       @PathVariable int id, @RequestBody CustomBody body) {
        return service.updateCustom(auth.currentUser(token).id(), id, body.category(), body.title(),
            body.answer(), body.difficulty());
    }

    @DeleteMapping("/my-questions/{id}")
    public ResponseEntity<Void> deleteCustom(@CookieValue(name = "session", required = false) String token,
                                             @PathVariable int id) {
        if (!repo.deleteCustom(auth.currentUser(token).id(), id)) {
            throw new StudyService.StudyException(404, "自建题不存在");
        }
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/search")
    public NoteService.SearchResult search(@CookieValue(name = "session", required = false) String token,
                                           @RequestParam(defaultValue = "") String q,
                                           @RequestParam(defaultValue = "all") String type,
                                           @RequestParam(defaultValue = "1") int page,
                                           @RequestParam(defaultValue = "10") int size) {
        return service.search(optionalUserId(token), q, type, page, size);
    }
}`,
          explain:[
            {at:'// service/NoteService.java',to:'public class NoteService {',text:'业务逻辑层服务类，组合仓库和题库校验。'},
            {at:'private static final Pattern CATEGORY',to:'private final QuestionRepository questions;',text:'定义校验规则、搜索结果 record 和注入的仓库依赖。'},
            {at:'public NoteService(NoteRepository notes',to:'return new StudyService.StudyException(status, message);',text:'复用第 10 关的 StudyException 携带 HTTP 状态码。'},
            {at:'public static String normalizeTags(',to:'return "";',text:'标签规范化助手，待补全 TODO 1。'},
            {at:'public static String makeSnippet(',to:'return "";',text:'摘要生成助手，待补全 TODO 2。'},
            {at:'public Note createNote(',to:'return null;',text:'创建笔记（含来源存在性与归属校验），待补全 TODO 3。'},
            {at:'public Note updateNote(',to:'.orElseThrow(() -> error(404, "笔记不存在"));',text:'更新笔记先清洗标题和正文，找不到或越权抛出 404。'},
            {at:'public CustomQuestion createCustom(',to:'return notes.createCustom(userId, c, t, a, difficulty);',text:'新增自建题前检查科目格式、字数和难度。'},
            {at:'public CustomQuestion updateCustom(',to:'.orElseThrow(() -> error(404, "自建题不存在"));',text:'修改自建题同样先做校验，不属于当前用户则抛出 404。'},
            {at:'public SearchResult search(',to:'return null;',text:'全站统一搜索聚合方法，待补全 TODO 4。'},
            {at:'// controller/NoteController.java',to:'public class NoteController {',text:'控制器把路径统一挂在 /api 下。'},
            {at:'public record NoteBody(',to:'this.service = service;',text:'定义请求体 record 并注入所需服务与仓库。'},
            {at:'private int optionalUserId(',to:'catch (AuthService.AuthException e) {',text:'给统一搜索用的可选认人方法：未登录或 Cookie 失效时捕获异常。'},
            {at:'catch (AuthService.AuthException e) {',to:'return 0;',text:'未登录统一返回 0（仅检索公共题库）。'},
            {at:'@GetMapping("/notes")',to:'return Map.of("items", repo.listNotes(uid, q.strip(), tag.strip(), sourceType.strip()));',text:'笔记列表接口，必先经 auth.currentUser 校验登录。'},
            {at:'@PostMapping("/notes")',to:'return null;',text:'新增笔记接口，待补全 TODO 5。'},
            {at:'@GetMapping("/notes/{id}")',to:'return service.updateNote(auth.currentUser(token).id(), id, body.title(), body.content(), body.tags());',text:'查询与修改单条笔记，用户 id 全部取自 session。'},
            {at:'@DeleteMapping("/notes/{id}")',to:'return ResponseEntity.noContent().build();',text:'删除笔记找不到或非本人返回 404，成功返回 204。'},
            {at:'@GetMapping("/my-questions")',to:'body.answer(), body.difficulty());',text:'自建题库的列表、新增与修改接口。'},
            {at:'@DeleteMapping("/my-questions/{id}")',to:'return service.search(optionalUserId(token), q, type, page, size);',text:'删除自建题返回 204，统一搜索按可选身份聚合返回。'},
          ],
          solution:{
            code:`// service/NoteService.java
package com.example.zixishi.service;

import com.example.zixishi.repository.NoteRepository;
import com.example.zixishi.repository.NoteRepository.CustomQuestion;
import com.example.zixishi.repository.NoteRepository.Note;
import com.example.zixishi.repository.NoteRepository.SearchRaw;
import com.example.zixishi.repository.QuestionRepository;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.regex.Pattern;
import org.springframework.stereotype.Service;

@Service
public class NoteService {

    private static final Pattern CATEGORY = Pattern.compile("[a-z0-9-]{1,20}");
    private static final Set<String> SOURCE_TYPES = Set.of("manual", "question", "custom", "ai_report");

    public record SearchHit(String type, int id, String title, String snippet, String category,
                            String tags, String sourceType, Integer sourceId, String updatedAt) {}

    public record SearchResult(List<SearchHit> items, int total, int page, int size, Map<String, Integer> counts) {}

    private final NoteRepository notes;
    private final QuestionRepository questions;

    public NoteService(NoteRepository notes, QuestionRepository questions) {
        this.notes = notes;
        this.questions = questions;
    }

    private static StudyService.StudyException error(int status, String message) {
        return new StudyService.StudyException(status, message);
    }

    public static String normalizeTags(String raw) {
        if (raw == null || raw.isBlank()) {
            return "";
        }
        Set<String> set = new LinkedHashSet<>();
        for (String part : raw.replace('，', ',').split(",")) {
            String t = part.strip();
            if (t.isEmpty()) {
                continue;
            }
            if (t.codePointCount(0, t.length()) > 20) {
                t = t.substring(0, t.offsetByCodePoints(0, 20));
            }
            set.add(t);
            if (set.size() >= 10) {
                break;
            }
        }
        return String.join(",", set);
    }

    public static String makeSnippet(String text, String q) {
        String clean = (text == null ? "" : text).replaceAll("\\\\s+", " ").strip();
        if (q == null || q.isEmpty()) {
            return clean.length() > 80 ? clean.substring(0, 80) + "…" : clean;
        }
        int idx = clean.toLowerCase().indexOf(q.toLowerCase());
        if (idx < 0) {
            return clean.length() > 80 ? clean.substring(0, 80) + "…" : clean;
        }
        int start = Math.max(0, idx - 20);
        int end = Math.min(clean.length(), idx + q.length() + 60);
        return (start > 0 ? "…" : "") + clean.substring(start, end) + (end < clean.length() ? "…" : "");
    }

    public Note createNote(int userId, String title, String content, String tags, String sourceType, Integer sourceId) {
        String t = title == null ? "" : title.strip();
        String c = content == null ? "" : content.strip();
        if (t.isEmpty() || t.codePointCount(0, t.length()) > 120 || c.isEmpty() || c.codePointCount(0, c.length()) > 10000) {
            throw error(400, "标题 1–120 字，内容 1–10000 字");
        }
        String st = (sourceType == null || sourceType.isBlank()) ? "manual" : sourceType.strip();
        if (!SOURCE_TYPES.contains(st)) {
            throw error(400, "来源类型不合法");
        }
        if ("question".equals(st)) {
            if (sourceId == null) {
                throw error(400, "关联题目缺少 sourceId");
            }
            if (questions.findById(sourceId).isEmpty()) {
                throw error(404, "关联的题目不存在");
            }
        } else if ("custom".equals(st)) {
            if (sourceId == null) {
                throw error(400, "关联自建题缺少 sourceId");
            }
            if (notes.findCustom(userId, sourceId).isEmpty()) {
                throw error(404, "关联的题目不存在");
            }
        }
        return notes.createNote(userId, t, c, normalizeTags(tags), st, sourceId);
    }

    public Note updateNote(int userId, int id, String title, String content, String tags) {
        String t = title == null ? "" : title.strip();
        String c = content == null ? "" : content.strip();
        if (t.isEmpty() || t.codePointCount(0, t.length()) > 120 || c.isEmpty() || c.codePointCount(0, c.length()) > 10000) {
            throw error(400, "标题 1–120 字，内容 1–10000 字");
        }
        return notes.updateNote(userId, id, t, c, normalizeTags(tags))
            .orElseThrow(() -> error(404, "笔记不存在"));
    }

    public CustomQuestion createCustom(int userId, String category, String title, String answer, Integer difficulty) {
        String c = category == null ? "" : category.strip();
        String t = title == null ? "" : title.strip();
        String a = answer == null ? "" : answer.strip();
        if (!CATEGORY.matcher(c).matches() || t.isEmpty() || t.codePointCount(0, t.length()) > 200
                || a.isEmpty() || a.codePointCount(0, a.length()) > 2000 || difficulty == null || difficulty < 1 || difficulty > 3) {
            throw error(400, "自建题字段不合法");
        }
        return notes.createCustom(userId, c, t, a, difficulty);
    }

    public CustomQuestion updateCustom(int userId, int id, String category, String title, String answer, Integer difficulty) {
        String c = category == null ? "" : category.strip();
        String t = title == null ? "" : title.strip();
        String a = answer == null ? "" : answer.strip();
        if (!CATEGORY.matcher(c).matches() || t.isEmpty() || t.codePointCount(0, t.length()) > 200
                || a.isEmpty() || a.codePointCount(0, a.length()) > 2000 || difficulty == null || difficulty < 1 || difficulty > 3) {
            throw error(400, "自建题字段不合法");
        }
        return notes.updateCustom(userId, id, c, t, a, difficulty)
            .orElseThrow(() -> error(404, "自建题不存在"));
    }

    public SearchResult search(int userId, String rawQ, String type, int page, int size) {
        String typ = (type == null || type.isBlank()) ? "all" : type.strip();
        if (!Set.of("all", "question", "custom", "note").contains(typ) || page < 1 || size < 1 || size > 50) {
            throw error(400, "搜索参数不合法");
        }
        String q = rawQ == null ? "" : rawQ.strip();
        if (q.isEmpty()) {
            return new SearchResult(List.of(), 0, page, size, Map.of("question", 0, "custom", 0, "note", 0));
        }
        if (q.length() > 100) {
            q = q.substring(0, 100);
        }
        int qCount = 0, cCount = 0, nCount = 0;
        List<SearchHit> filtered = new ArrayList<>();
        for (SearchRaw r : notes.searchSources(userId, q)) {
            if ("question".equals(r.type())) qCount++;
            else if ("custom".equals(r.type())) cCount++;
            else if ("note".equals(r.type())) nCount++;
            if ("all".equals(typ) || typ.equals(r.type())) {
                filtered.add(new SearchHit(r.type(), r.id(), r.title(), makeSnippet(r.body(), q),
                    r.category(), r.tags(), r.sourceType(), r.sourceId(), r.updatedAt()));
            }
        }
        int start = Math.min((page - 1) * size, filtered.size());
        int end = Math.min(start + size, filtered.size());
        return new SearchResult(filtered.subList(start, end), filtered.size(), page, size,
            Map.of("question", qCount, "custom", cCount, "note", nCount));
    }
}

// controller/NoteController.java
package com.example.zixishi.controller;

import com.example.zixishi.repository.NoteRepository;
import com.example.zixishi.repository.NoteRepository.CustomQuestion;
import com.example.zixishi.repository.NoteRepository.Note;
import com.example.zixishi.service.AuthService;
import com.example.zixishi.service.NoteService;
import com.example.zixishi.service.StudyService;
import java.util.List;
import java.util.Map;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api")
public class NoteController {

    public record NoteBody(String title, String content, String tags, String sourceType, Integer sourceId) {}

    public record CustomBody(String category, String title, String answer, Integer difficulty) {}

    private final AuthService auth;
    private final NoteRepository repo;
    private final NoteService service;

    public NoteController(AuthService auth, NoteRepository repo, NoteService service) {
        this.auth = auth;
        this.repo = repo;
        this.service = service;
    }

    private int optionalUserId(String token) {
        if (token == null || token.isBlank()) {
            return 0;
        }
        try {
            return auth.currentUser(token).id();
        } catch (AuthService.AuthException e) {
            return 0;
        }
    }

    @GetMapping("/notes")
    public Map<String, List<Note>> listNotes(@CookieValue(name = "session", required = false) String token,
                                             @RequestParam(defaultValue = "") String q,
                                             @RequestParam(defaultValue = "") String tag,
                                             @RequestParam(defaultValue = "") String sourceType) {
        int uid = auth.currentUser(token).id();
        return Map.of("items", repo.listNotes(uid, q.strip(), tag.strip(), sourceType.strip()));
    }

    @PostMapping("/notes")
    public ResponseEntity<Note> createNote(@CookieValue(name = "session", required = false) String token,
                                           @RequestBody NoteBody body) {
        int uid = auth.currentUser(token).id();
        return ResponseEntity.status(201).body(
            service.createNote(uid, body.title(), body.content(), body.tags(), body.sourceType(), body.sourceId()));
    }

    @GetMapping("/notes/{id}")
    public Note getNote(@CookieValue(name = "session", required = false) String token, @PathVariable int id) {
        int uid = auth.currentUser(token).id();
        return repo.findNote(uid, id).orElseThrow(() -> new StudyService.StudyException(404, "笔记不存在"));
    }

    @PutMapping("/notes/{id}")
    public Note updateNote(@CookieValue(name = "session", required = false) String token,
                           @PathVariable int id, @RequestBody NoteBody body) {
        return service.updateNote(auth.currentUser(token).id(), id, body.title(), body.content(), body.tags());
    }

    @DeleteMapping("/notes/{id}")
    public ResponseEntity<Void> deleteNote(@CookieValue(name = "session", required = false) String token,
                                           @PathVariable int id) {
        if (!repo.deleteNote(auth.currentUser(token).id(), id)) {
            throw new StudyService.StudyException(404, "笔记不存在");
        }
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/my-questions")
    public Map<String, List<CustomQuestion>> listCustom(@CookieValue(name = "session", required = false) String token,
                                                        @RequestParam(defaultValue = "") String category,
                                                        @RequestParam(defaultValue = "") String q) {
        int uid = auth.currentUser(token).id();
        return Map.of("items", repo.listCustom(uid, category.strip(), q.strip()));
    }

    @PostMapping("/my-questions")
    public ResponseEntity<CustomQuestion> createCustom(@CookieValue(name = "session", required = false) String token,
                                                       @RequestBody CustomBody body) {
        int uid = auth.currentUser(token).id();
        return ResponseEntity.status(201).body(
            service.createCustom(uid, body.category(), body.title(), body.answer(), body.difficulty()));
    }

    @PutMapping("/my-questions/{id}")
    public CustomQuestion updateCustom(@CookieValue(name = "session", required = false) String token,
                                       @PathVariable int id, @RequestBody CustomBody body) {
        return service.updateCustom(auth.currentUser(token).id(), id, body.category(), body.title(),
            body.answer(), body.difficulty());
    }

    @DeleteMapping("/my-questions/{id}")
    public ResponseEntity<Void> deleteCustom(@CookieValue(name = "session", required = false) String token,
                                             @PathVariable int id) {
        if (!repo.deleteCustom(auth.currentUser(token).id(), id)) {
            throw new StudyService.StudyException(404, "自建题不存在");
        }
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/search")
    public NoteService.SearchResult search(@CookieValue(name = "session", required = false) String token,
                                           @RequestParam(defaultValue = "") String q,
                                           @RequestParam(defaultValue = "all") String type,
                                           @RequestParam(defaultValue = "1") int page,
                                           @RequestParam(defaultValue = "10") int size) {
        return service.search(optionalUserId(token), q, type, page, size);
    }
}`,
            explain:[
              {at:'// service/NoteService.java',to:'public class NoteService {',text:'业务逻辑层服务类，组合仓库和题库校验。'},
              {at:'private static final Pattern CATEGORY',to:'private final QuestionRepository questions;',text:'定义校验规则、搜索结果 record 和注入的仓库依赖。'},
              {at:'public NoteService(NoteRepository notes',to:'return new StudyService.StudyException(status, message);',text:'复用第 10 关的 StudyException 携带 HTTP 状态码。'},
              {at:'public static String normalizeTags(',to:'return String.join(",", set);',text:'使用 LinkedHashSet 保留原标签顺序并去重，同时截断超长标签。'},
              {at:'public static String makeSnippet(',to:'return (start > 0 ? "…" : "") + clean.substring(start, end) + (end < clean.length() ? "…" : "");',text:'折叠空白后不区分大小写定位关键词，截取上下文并在两端按需加省略号。'},
              {at:'public Note createNote(',to:'return notes.createNote(userId, t, c, normalizeTags(tags), st, sourceId);',text:'校验文本长度、sourceType 与对应关联题目的存在性和归属权。'},
              {at:'public Note updateNote(',to:'.orElseThrow(() -> error(404, "笔记不存在"));',text:'更新笔记先清洗标题和正文，找不到或越权抛出 404。'},
              {at:'public CustomQuestion createCustom(',to:'return notes.createCustom(userId, c, t, a, difficulty);',text:'新增自建题前检查科目格式、字数和难度。'},
              {at:'public CustomQuestion updateCustom(',to:'.orElseThrow(() -> error(404, "自建题不存在"));',text:'修改自建题同样先做校验，不属于当前用户则抛出 404。'},
              {at:'public SearchResult search(',to:'Map.of("question", qCount, "custom", cCount, "note", nCount));',text:'统一搜索先校验分页和类型参数，统计全部三类命中数后再做过滤和 subList 切片。'},
              {at:'// controller/NoteController.java',to:'public class NoteController {',text:'控制器把路径统一挂在 /api 下。'},
              {at:'public record NoteBody(',to:'this.service = service;',text:'定义请求体 record 并注入所需服务与仓库。'},
              {at:'private int optionalUserId(',to:'catch (AuthService.AuthException e) {',text:'给统一搜索用的可选认人方法：未登录或 Cookie 失效时捕获异常。'},
              {at:'catch (AuthService.AuthException e) {',to:'return 0;',text:'未登录统一返回 0（仅检索公共题库）。'},
              {at:'@GetMapping("/notes")',to:'return Map.of("items", repo.listNotes(uid, q.strip(), tag.strip(), sourceType.strip()));',text:'笔记列表接口，必先经 auth.currentUser 校验登录。'},
              {at:'@PostMapping("/notes")',to:'service.createNote(uid, body.title(), body.content(), body.tags(), body.sourceType(), body.sourceId()));',text:'先确认登录态拿到用户 id，再创建笔记并返回 201 状态码。'},
              {at:'@GetMapping("/notes/{id}")',to:'return service.updateNote(auth.currentUser(token).id(), id, body.title(), body.content(), body.tags());',text:'查询与修改单条笔记，用户 id 全部取自 session。'},
              {at:'@DeleteMapping("/notes/{id}")',to:'return ResponseEntity.noContent().build();',text:'删除笔记找不到或非本人返回 404，成功返回 204。'},
              {at:'@GetMapping("/my-questions")',to:'body.answer(), body.difficulty());',text:'自建题库的列表、新增与修改接口。'},
              {at:'@DeleteMapping("/my-questions/{id}")',to:'return service.search(optionalUserId(token), q, type, page, size);',text:'删除自建题返回 204，统一搜索按可选身份聚合返回。'},
            ],
          },
        },
        node:{
          body:'Node.js 版本新建 `src/services/notes.js` 和 `src/routes/notes.js`，并在 `app.js` 里注册在兜底 `notFound` 之前。按字数统计使用 `[...text].length`，确保汉字和表情都按 1 个字算。',
          practice:{
            steps:[
              '新建 src/services/notes.js，补完 TODO 1 到 4。',
              '新建 src/routes/notes.js，补完 TODO 5，并在 app.js 里挂上路由。',
              '重启服务后用 curl 测试未登录访问 /api/notes 返回 401，登录后创建笔记和搜索正常。',
            ],
            expect:'GET /api/notes → 401 {"error":"请先登录"}\nGET /api/search?q=defer → 200 {"items":[...],"counts":{"question":...}}',
          },
          code:`// src/services/notes.js
const { getQuestion } = require("../db/questions");
const store = require("../db/notes");

class NoteError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

const CATEGORY = /^[a-z0-9-]{1,20}$/;
const SOURCE_TYPES = new Set(["manual", "question", "custom", "ai_report"]);

function normalizeTags(raw) {
  // TODO 1：把中文逗号替换成英文逗号后拆分、去空白、去重、单标签最多 20 字、最多 10 个，用 "," 拼接
  return "";
}

function makeSnippet(text, q) {
  // TODO 2：把连续空白折叠成单个空格，不区分大小写找 q 的位置，截取前后约 20 / 60 字并按需加 "…"
  return "";
}

function cleanNoteText(body) {
  const title = String(body?.title ?? "").trim();
  const content = String(body?.content ?? "").trim();
  const tags = normalizeTags(String(body?.tags ?? ""));
  if (!title || [...title].length > 120 || !content || [...content].length > 10000) {
    throw new NoteError(400, "标题 1–120 字，内容 1–10000 字");
  }
  return { title, content, tags };
}

function createNote(userId, body) {
  // TODO 3：调用 cleanNoteText，校验 sourceType（默认 "manual"）和可选 sourceId 对应的原题是否存在（不存在抛出 404）；
  //         然后调用 store.createNote
}

function updateNote(userId, id, body) {
  const updated = store.updateNote(userId, id, cleanNoteText(body));
  if (!updated) throw new NoteError(404, "笔记不存在");
  return updated;
}

function cleanCustom(body) {
  const category = String(body?.category ?? "").trim();
  const title = String(body?.title ?? "").trim();
  const answer = String(body?.answer ?? "").trim();
  const difficulty = body?.difficulty;
  if (!CATEGORY.test(category) || !title || [...title].length > 200 || !answer
      || [...answer].length > 2000 || !Number.isInteger(difficulty) || difficulty < 1 || difficulty > 3) {
    throw new NoteError(400, "自建题字段不合法");
  }
  return { category, title, answer, difficulty };
}

function createCustom(userId, body) {
  return store.createCustom(userId, cleanCustom(body));
}

function updateCustom(userId, id, body) {
  const updated = store.updateCustom(userId, id, cleanCustom(body));
  if (!updated) throw new NoteError(404, "自建题不存在");
  return updated;
}

function search(userId, { q = "", type = "all", page = 1, size = 10 } = {}) {
  // TODO 4：校验 type（"" 视为 "all"，限 all/question/custom/note）与正整数 page、1..50 的 size；
  //         统计 counts，过滤类型并分页切片，每条附上 makeSnippet(r.body, query)
}

module.exports = { NoteError, normalizeTags, makeSnippet, createNote, updateNote, createCustom, updateCustom, search };

// src/routes/notes.js
const express = require("express");
const auth = require("../services/auth");
const notes = require("../services/notes");
const store = require("../db/notes");
const { requireUser } = require("../middleware");

const router = express.Router();

function handle(status, fn) {
  return (req, res, next) => {
    try {
      const data = fn(req);
      if (status === 204) return res.status(204).end();
      res.status(status).json(data);
    } catch (err) {
      if (err instanceof notes.NoteError) return res.status(err.status).json({ error: err.message });
      next(err);
    }
  };
}

function optionalUserId(req) {
  try {
    return auth.currentUser(req.cookies?.session).id;
  } catch {
    return 0;
  }
}

router.get("/notes", requireUser, handle(200, (req) => ({
  items: store.listNotes(req.user.id, {
    q: (req.query.q || "").trim(),
    tag: (req.query.tag || "").trim(),
    sourceType: (req.query.sourceType || "").trim(),
  }),
})));
// TODO 5：注册 POST /notes（201）、GET /notes/:id（不存在 404）、PUT /notes/:id、DELETE /notes/:id（204）、
//         GET /my-questions、POST /my-questions（201）、PUT /my-questions/:id、DELETE /my-questions/:id（204）
router.get("/search", handle(200, (req) => {
  const p = req.query.page === undefined ? 1 : Number(req.query.page);
  const s = req.query.size === undefined ? 10 : Number(req.query.size);
  return notes.search(optionalUserId(req), { q: req.query.q || "", type: req.query.type || "all", page: p, size: s });
}));

module.exports = router;

// app.js（加在 app.use("/api", notFound) 前面）
app.use("/api", require("./src/routes/notes"));`,
          explain:[
            {at:'// src/services/notes.js',to:'const SOURCE_TYPES =',text:'引入题目与笔记数据访问层，定义 NoteError、科目正则与允许的来源类型集合。'},
            {at:'function normalizeTags(raw) {',to:'return "";',text:'标签规范化函数，待补全 TODO 1。'},
            {at:'function makeSnippet(text, q) {',to:'return "";',text:'摘要生成函数，待补全 TODO 2。'},
            {at:'function cleanNoteText(body) {',to:'return { title, content, tags };',text:'去掉首尾空白并校验标题 1–120 字、正文 1–10000 字。'},
            {at:'function createNote(userId, body) {',to:'function updateNote(userId, id, body) {',text:'创建笔记待补全 TODO 3；updateNote 找不到或非本人笔记时抛出 404。'},
            {at:'const updated =',to:'return updated;',text:'把修改后的结果返回给路由层。'},
            {at:'function cleanCustom(body) {',to:'return { category, title, answer, difficulty };',text:'校验自建题科目格式、字数和整数难度（1–3）。'},
            {at:'function createCustom(',to:'return updated;',text:'创建和修改自建题都先经过 cleanCustom，更新失败返回 404。'},
            {at:'function search(userId, {',to:'module.exports = {',text:'统一搜索聚合函数待补全 TODO 4；最后导出业务错误与各业务函数。'},
            {at:'// src/routes/notes.js',to:'const router = express.Router();',text:'新建路由文件，引入 auth、notes 业务层、数据库层与认人中间件。'},
            {at:'function handle(status, fn) {',to:'function optionalUserId(req) {',text:'handle 统一包装响应状态码和 NoteError；optionalUserId 用于搜索接口的可选认证。'},
            {at:'try {',to:'router.get("/notes", requireUser,',text:'Cookie 无效或未登录时返回 0，确保只搜公共题库。'},
            {at:'items: store.listNotes(',to:'router.get("/search", handle(200,',text:'列表接口走 requireUser；中间 TODO 5 需要补齐增改删与自建题路由。'},
            {at:'const p =',to:'module.exports = router;',text:'解析分页参数后调用 notes.search，最后导出路由。'},
            {at:'// app.js（加在 app.use("/api", notFound) 前面）',to:'app.use("/api", require("./src/routes/notes"));',text:'把新路由挂载到 /api 路径下。'},
          ],
          solution:{
            code:`// src/services/notes.js
const { getQuestion } = require("../db/questions");
const store = require("../db/notes");

class NoteError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

const CATEGORY = /^[a-z0-9-]{1,20}$/;
const SOURCE_TYPES = new Set(["manual", "question", "custom", "ai_report"]);

function normalizeTags(raw) {
  const seen = new Set();
  for (const part of String(raw || "").replace(/，/g, ",").split(",")) {
    const t = part.trim();
    if (!t) continue;
    seen.add([...t].slice(0, 20).join(""));
    if (seen.size >= 10) break;
  }
  return [...seen].join(",");
}

function makeSnippet(text, q) {
  const clean = String(text || "").replace(/\\s+/g, " ").trim();
  if (!q) return [...clean].slice(0, 80).join("") + ([...clean].length > 80 ? "…" : "");
  const idx = clean.toLowerCase().indexOf(q.toLowerCase());
  if (idx < 0) return [...clean].slice(0, 80).join("") + ([...clean].length > 80 ? "…" : "");
  const start = Math.max(0, idx - 20);
  const end = Math.min(clean.length, idx + q.length + 60);
  return (start > 0 ? "…" : "") + clean.slice(start, end) + (end < clean.length ? "…" : "");
}

function cleanNoteText(body) {
  const title = String(body?.title ?? "").trim();
  const content = String(body?.content ?? "").trim();
  const tags = normalizeTags(String(body?.tags ?? ""));
  if (!title || [...title].length > 120 || !content || [...content].length > 10000) {
    throw new NoteError(400, "标题 1–120 字，内容 1–10000 字");
  }
  return { title, content, tags };
}

function createNote(userId, body) {
  const { title, content, tags } = cleanNoteText(body);
  const sourceType = String(body?.sourceType || "manual").trim();
  if (!SOURCE_TYPES.has(sourceType)) throw new NoteError(400, "来源类型不合法");
  let sourceId = body?.sourceId ?? null;
  if (sourceId !== null) {
    sourceId = Number(sourceId);
    if (!Number.isInteger(sourceId) || sourceId < 1) throw new NoteError(400, "sourceId 不合法");
  }
  if (sourceType === "question") {
    if (sourceId === null) throw new NoteError(400, "关联题目缺少 sourceId");
    if (!getQuestion(sourceId)) throw new NoteError(404, "关联的题目不存在");
  } else if (sourceType === "custom") {
    if (sourceId === null) throw new NoteError(400, "关联自建题缺少 sourceId");
    if (!store.getCustom(userId, sourceId)) throw new NoteError(404, "关联的题目不存在");
  }
  return store.createNote(userId, { title, content, tags, sourceType, sourceId });
}

function updateNote(userId, id, body) {
  const updated = store.updateNote(userId, id, cleanNoteText(body));
  if (!updated) throw new NoteError(404, "笔记不存在");
  return updated;
}

function cleanCustom(body) {
  const category = String(body?.category ?? "").trim();
  const title = String(body?.title ?? "").trim();
  const answer = String(body?.answer ?? "").trim();
  const difficulty = body?.difficulty;
  if (!CATEGORY.test(category) || !title || [...title].length > 200 || !answer
      || [...answer].length > 2000 || !Number.isInteger(difficulty) || difficulty < 1 || difficulty > 3) {
    throw new NoteError(400, "自建题字段不合法");
  }
  return { category, title, answer, difficulty };
}

function createCustom(userId, body) {
  return store.createCustom(userId, cleanCustom(body));
}

function updateCustom(userId, id, body) {
  const updated = store.updateCustom(userId, id, cleanCustom(body));
  if (!updated) throw new NoteError(404, "自建题不存在");
  return updated;
}

function search(userId, { q = "", type = "all", page = 1, size = 10 } = {}) {
  const typ = type || "all";
  if (!["all", "question", "custom", "note"].includes(typ)
      || !Number.isInteger(page) || page < 1 || !Number.isInteger(size) || size < 1 || size > 50) {
    throw new NoteError(400, "搜索参数不合法");
  }
  const counts = { question: 0, custom: 0, note: 0 };
  const query = String(q).trim().slice(0, 100);
  if (!query) return { items: [], total: 0, page, size, counts };
  const filtered = [];
  for (const r of store.searchSources(userId, query)) {
    counts[r.type] += 1;
    if (typ === "all" || r.type === typ) {
      filtered.push({ ...r, snippet: makeSnippet(r.body, query) });
      delete filtered[filtered.length - 1].body;
    }
  }
  const start = (page - 1) * size;
  return { items: filtered.slice(start, start + size), total: filtered.length, page, size, counts };
}

module.exports = { NoteError, normalizeTags, makeSnippet, createNote, updateNote, createCustom, updateCustom, search };

// src/routes/notes.js
const express = require("express");
const auth = require("../services/auth");
const notes = require("../services/notes");
const store = require("../db/notes");
const { requireUser } = require("../middleware");

const router = express.Router();

function handle(status, fn) {
  return (req, res, next) => {
    try {
      const data = fn(req);
      if (status === 204) return res.status(204).end();
      res.status(status).json(data);
    } catch (err) {
      if (err instanceof notes.NoteError) return res.status(err.status).json({ error: err.message });
      next(err);
    }
  };
}

function optionalUserId(req) {
  try {
    return auth.currentUser(req.cookies?.session).id;
  } catch {
    return 0;
  }
}

router.get("/notes", requireUser, handle(200, (req) => ({
  items: store.listNotes(req.user.id, {
    q: (req.query.q || "").trim(),
    tag: (req.query.tag || "").trim(),
    sourceType: (req.query.sourceType || "").trim(),
  }),
})));
router.post("/notes", requireUser, handle(201, (req) => notes.createNote(req.user.id, req.body)));
router.get("/notes/:id", requireUser, handle(200, (req) => {
  const n = store.getNote(req.user.id, Number(req.params.id));
  if (!n) throw new notes.NoteError(404, "笔记不存在");
  return n;
}));
router.put("/notes/:id", requireUser, handle(200, (req) => notes.updateNote(req.user.id, Number(req.params.id), req.body)));
router.delete("/notes/:id", requireUser, handle(204, (req) => {
  if (!store.deleteNote(req.user.id, Number(req.params.id))) throw new notes.NoteError(404, "笔记不存在");
}));
router.get("/my-questions", requireUser, handle(200, (req) => ({
  items: store.listCustom(req.user.id, { category: (req.query.category || "").trim(), q: (req.query.q || "").trim() }),
})));
router.post("/my-questions", requireUser, handle(201, (req) => notes.createCustom(req.user.id, req.body)));
router.put("/my-questions/:id", requireUser, handle(200, (req) => notes.updateCustom(req.user.id, Number(req.params.id), req.body)));
router.delete("/my-questions/:id", requireUser, handle(204, (req) => {
  if (!store.deleteCustom(req.user.id, Number(req.params.id))) throw new notes.NoteError(404, "自建题不存在");
}));
router.get("/search", handle(200, (req) => {
  const p = req.query.page === undefined ? 1 : Number(req.query.page);
  const s = req.query.size === undefined ? 10 : Number(req.query.size);
  return notes.search(optionalUserId(req), { q: req.query.q || "", type: req.query.type || "all", page: p, size: s });
}));

module.exports = router;

// app.js（加在 app.use("/api", notFound) 前面）
app.use("/api", require("./src/routes/notes"));`,
            explain:[
              {at:'// src/services/notes.js',to:'const SOURCE_TYPES =',text:'引入题目与笔记数据访问层，定义 NoteError、科目正则与允许的来源类型集合。'},
              {at:'function normalizeTags(raw) {',to:'return [...seen].join(",");',text:'用 Set 自动去重并保留先后顺序，同时截断超长或超出 10 个的标签。'},
              {at:'function makeSnippet(text, q) {',to:'return (start > 0 ? "…" : "") + clean.slice(start, end) + (end < clean.length ? "…" : "");',text:'折叠空白并在匹配位置前后各留一段上下文，避免返回整篇正文。'},
              {at:'function cleanNoteText(body) {',to:'return { title, content, tags };',text:'去掉首尾空白并校验标题 1–120 字、正文 1–10000 字。'},
              {at:'function createNote(userId, body) {',to:'return store.createNote(userId, { title, content, tags, sourceType, sourceId });',text:'校验来源类型，关联 question 或 custom 时核实原题存在与归属。'},
              {at:'function updateNote(',to:'return updated;',text:'更新找不到或越权时抛出 404。'},
              {at:'function cleanCustom(body) {',to:'return { category, title, answer, difficulty };',text:'校验自建题科目格式、字数和整数难度（1–3）。'},
              {at:'function createCustom(',to:'return updated;',text:'创建和修改自建题都先经过 cleanCustom，更新失败返回 404。'},
              {at:'function search(userId, {',to:'return { items: filtered.slice(start, start + size), total: filtered.length, page, size, counts };',text:'统计三类命中计数后再做类型过滤与分页切片，返回统一搜索结果并去掉内部 body 字段。'},
        {at:'module.exports = { NoteError,',text:'导出笔记业务错误与各业务函数。'},
              {at:'// src/routes/notes.js',to:'const router = express.Router();',text:'新建路由文件，引入 auth、notes 业务层、数据库层与认人中间件。'},
              {at:'function handle(status, fn) {',to:'function optionalUserId(req) {',text:'handle 统一包装响应状态码和 NoteError；optionalUserId 用于搜索接口的可选认证。'},
              {at:'try {',to:'router.get("/notes", requireUser,',text:'Cookie 无效或未登录时返回 0，确保只搜公共题库。'},
              {at:'items: store.listNotes(',to:'if (!store.deleteNote(req.user.id, Number(req.params.id))) throw new notes.NoteError(404, "笔记不存在");',text:'笔记的查询、创建（201）、详情、修改、删除（204）接口，全部经由 requireUser 认人。'},
              {at:'router.get("/my-questions", requireUser,',to:'if (!store.deleteCustom(req.user.id, Number(req.params.id))) throw new notes.NoteError(404, "自建题不存在");',text:'自建题库的列表、创建（201）、修改、删除（204）接口。'},
              {at:'router.get("/search", handle(200,',to:'module.exports = router;',text:'统一搜索接口读取页码与每页条数，走可选用户身份检索，最后导出路由。'},
              {at:'// app.js（加在 app.use("/api", notFound) 前面）',to:'app.use("/api", require("./src/routes/notes"));',text:'把新路由挂载到 /api 路径下。'},
            ],
          },
        },
        python:{
          body:'Python 版本新建 `app/services/notes.py` 和 `app/routers/notes.py`，在 `main.py` 里挂上路由并注册 `NoteError` 的异常处理器，确保参数错误和资源不存在统一返回 `{"error": ...}`。',
          practice:{
            steps:[
              '新建 app/services/notes.py，补完 TODO 1 到 4。',
              '新建 app/routers/notes.py，补完 TODO 5，并在 main.py 里注册路由和 NoteError 处理器。',
              '启动服务后用 curl 测试未登录访问 /api/notes 返回 401，登录后创建笔记和搜索正常。',
            ],
            expect:'GET /api/notes → 401 {"error":"请先登录"}\nGET /api/search?q=defer → 200 {"items":[...],"counts":{"question":...}}',
          },
          code:`# app/services/notes.py
import re

from app import notes as store
from app.db import get_question

CATEGORY = re.compile(r"[a-z0-9-]{1,20}")
SOURCE_TYPES = {"manual", "question", "custom", "ai_report"}


class NoteError(Exception):
    def __init__(self, status, message):
        super().__init__(message)
        self.status = status
        self.message = message


def normalize_tags(raw):
    # TODO 1：兼容中文逗号 "，"，拆分、去首尾空格、去重（可用 dict.fromkeys 保持顺序）、最多 10 个，用 "," 拼接
    return ""


def make_snippet(text, q):
    # TODO 2：折叠空白，不区分大小写寻找 q 的首次位置，截取前后约 20 / 60 字并按需加 "…"
    return ""


def _clean_note(title, content, tags):
    t, c = (title or "").strip(), (content or "").strip()
    if not 1 <= len(t) <= 120 or not 1 <= len(c) <= 10000:
        raise NoteError(400, "标题 1–120 字，内容 1–10000 字")
    return t, c, normalize_tags(tags)


def create_note(user_id, title, content, tags="", source_type="manual", source_id=None):
    # TODO 3：调用 _clean_note，校验 source_type（空时视为 "manual"），
    #         关联 "question" 或 "custom" 时核实原题存在与归属（不存在抛出 NoteError(404, "关联的题目不存在")）
    return None


def update_note(user_id, nid, title, content, tags=""):
    t, c, tg = _clean_note(title, content, tags)
    updated = store.update_note(user_id, nid, t, c, tg)
    if updated is None:
        raise NoteError(404, "笔记不存在")
    return updated


def _clean_custom(category, title, answer, difficulty):
    c, t, a = (category or "").strip(), (title or "").strip(), (answer or "").strip()
    if not CATEGORY.fullmatch(c) or not 1 <= len(t) <= 200 or not 1 <= len(a) <= 2000 or difficulty not in (1, 2, 3):
        raise NoteError(400, "自建题字段不合法")
    return c, t, a, difficulty


def create_custom(user_id, category, title, answer, difficulty):
    return store.create_custom(user_id, *_clean_custom(category, title, answer, difficulty))


def update_custom(user_id, cid, category, title, answer, difficulty):
    updated = store.update_custom(user_id, cid, *_clean_custom(category, title, answer, difficulty))
    if updated is None:
        raise NoteError(404, "自建题不存在")
    return updated


def search(user_id, raw_q="", typ="all", page=1, size=10):
    # TODO 4：校验 typ（"" 视为 "all"，限 all/question/custom/note）以及 page >= 1、1 <= size <= 50；
    #         调用 store.search_sources，统计 counts，按类型过滤与分页，生成 snippet
    return {}


# app/routers/notes.py
from fastapi import APIRouter, Depends, Request, Response
from pydantic import BaseModel

from app import notes as store
from app.routers.study import require_user
from app.services import auth
from app.services import notes as service
from app.services.notes import NoteError

router = APIRouter(prefix="/api")


class NoteBody(BaseModel):
    title: str = ""
    content: str = ""
    tags: str = ""
    sourceType: str = "manual"
    sourceId: int | None = None


class CustomBody(BaseModel):
    category: str = ""
    title: str = ""
    answer: str = ""
    difficulty: int = 0


def optional_user_id(request: Request):
    try:
        return auth.current_user(request.cookies.get("session"))["id"]
    except auth.AuthError:
        return 0


@router.get("/notes")
def list_notes(q: str = "", tag: str = "", sourceType: str = "", user=Depends(require_user)):
    return {"items": store.list_notes(user["id"], q.strip(), tag.strip(), sourceType.strip())}


@router.post("/notes", status_code=201)
def create_note(body: NoteBody, user=Depends(require_user)):
    # TODO 5：调用 service.create_note 创建笔记并返回
    return None


@router.get("/notes/{nid}")
def get_note(nid: int, user=Depends(require_user)):
    note = store.get_note(user["id"], nid)
    if note is None:
        raise NoteError(404, "笔记不存在")
    return note


@router.put("/notes/{nid}")
def update_note(nid: int, body: NoteBody, user=Depends(require_user)):
    return service.update_note(user["id"], nid, body.title, body.content, body.tags)


@router.delete("/notes/{nid}", status_code=204)
def delete_note(nid: int, user=Depends(require_user)):
    if not store.delete_note(user["id"], nid):
        raise NoteError(404, "笔记不存在")
    return Response(status_code=204)


@router.get("/my-questions")
def list_custom(category: str = "", q: str = "", user=Depends(require_user)):
    return {"items": store.list_custom(user["id"], category.strip(), q.strip())}


@router.post("/my-questions", status_code=201)
def create_custom(body: CustomBody, user=Depends(require_user)):
    return service.create_custom(user["id"], body.category, body.title, body.answer, body.difficulty)


@router.put("/my-questions/{cid}")
def update_custom(cid: int, body: CustomBody, user=Depends(require_user)):
    return service.update_custom(user["id"], cid, body.category, body.title, body.answer, body.difficulty)


@router.delete("/my-questions/{cid}", status_code=204)
def delete_custom(cid: int, user=Depends(require_user)):
    if not store.delete_custom(user["id"], cid):
        raise NoteError(404, "自建题不存在")
    return Response(status_code=204)


@router.get("/search")
def search_all(request: Request, q: str = "", type: str = "all", page: int = 1, size: int = 10):
    return service.search(optional_user_id(request), q, type, page, size)


# main.py（加在兜底路由前面）
from app.routers import notes as notes_routes
from app.services.notes import NoteError

app.include_router(notes_routes.router)


@app.exception_handler(NoteError)
async def note_error(request: Request, exc: NoteError):
    return JSONResponse({"error": exc.message}, status_code=exc.status)`,
          explain:[
            {at:'# app/services/notes.py',to:'SOURCE_TYPES = {"manual", "question", "custom", "ai_report"}',text:'引入数据库层与第 6 关题库查询，定义科目正则与合法来源集合。'},
            {at:'class NoteError(Exception):',to:'self.message = message',text:'携带 HTTP 状态码的业务异常。'},
            {at:'def normalize_tags(raw):',to:'return ""',text:'标签规范化函数，待补全 TODO 1。'},
            {at:'def make_snippet(text, q):',to:'return ""',text:'摘要生成函数，待补全 TODO 2。'},
            {at:'def _clean_note(title, content, tags):',to:'return t, c, normalize_tags(tags)',text:'清洗笔记标题和正文并校验字数范围。'},
            {at:'def create_note(',to:'return None',text:'创建关联笔记，待补全 TODO 3。'},
            {at:'def update_note(',to:'return updated',text:'更新找不到或非本人笔记时抛出 404。'},
            {at:'def _clean_custom(',to:'def update_custom(',text:'校验自建题字段合法性并完成新增与更新。'},
            {at:'updated = store.update_custom(',to:'return updated',text:'更新自建题找不到时返回 404。'},
            {at:'def search(',to:'return {}',text:'全站统一搜索聚合，待补全 TODO 4。'},
            {at:'# app/routers/notes.py',to:'router = APIRouter(prefix="/api")',text:'接口层路由定义在 /api 下。'},
            {at:'class NoteBody(BaseModel):',to:'difficulty: int = 0',text:'声明笔记和自建题请求体模型。'},
            {at:'def optional_user_id(request: Request):',to:'return 0',text:'搜索接口用的可选身份提取，未登录退回 0。'},
            {at:'@router.get("/notes")',to:'return {"items": store.list_notes(user["id"], q.strip(), tag.strip(), sourceType.strip())}',text:'列表接口必须通过 Depends(require_user) 校验登录。'},
            {at:'@router.post("/notes", status_code=201)',to:'return None',text:'新增笔记接口，待补全 TODO 5。'},
            {at:'@router.get("/notes/{nid}")',to:'return Response(status_code=204)',text:'笔记详情、修改与删除接口，越权或不存在均返回 404。'},
            {at:'@router.get("/my-questions")',to:'return Response(status_code=204)',text:'自建题库列表、新增、修改与删除接口。'},
            {at:'@router.get("/search")',to:'return service.search(optional_user_id(request), q, type, page, size)',text:'全站统一搜索接口。'},
            {at:'# main.py（加在兜底路由前面）',to:'return JSONResponse({"error": exc.message}, status_code=exc.status)',text:'在 main.py 注册路由，并把 NoteError 统一转换成 JSON 错误响应。'},
          ],
          solution:{
            code:`# app/services/notes.py
import re

from app import notes as store
from app.db import get_question

CATEGORY = re.compile(r"[a-z0-9-]{1,20}")
SOURCE_TYPES = {"manual", "question", "custom", "ai_report"}


class NoteError(Exception):
    def __init__(self, status, message):
        super().__init__(message)
        self.status = status
        self.message = message


def normalize_tags(raw):
    tags = []
    for part in (raw or "").replace("，", ",").split(","):
        t = part.strip()
        if t:
            tags.append(t[:20])
    return ",".join(list(dict.fromkeys(tags))[:10])


def make_snippet(text, q):
    clean = " ".join((text or "").split())
    if not q:
        return clean[:80] + ("…" if len(clean) > 80 else "")
    idx = clean.lower().find(q.lower())
    if idx < 0:
        return clean[:80] + ("…" if len(clean) > 80 else "")
    start = max(0, idx - 20)
    end = min(len(clean), idx + len(q) + 60)
    return ("…" if start > 0 else "") + clean[start:end] + ("…" if end < len(clean) else "")


def _clean_note(title, content, tags):
    t, c = (title or "").strip(), (content or "").strip()
    if not 1 <= len(t) <= 120 or not 1 <= len(c) <= 10000:
        raise NoteError(400, "标题 1–120 字，内容 1–10000 字")
    return t, c, normalize_tags(tags)


def create_note(user_id, title, content, tags="", source_type="manual", source_id=None):
    t, c, tg = _clean_note(title, content, tags)
    st = (source_type or "manual").strip()
    if st not in SOURCE_TYPES:
        raise NoteError(400, "来源类型不合法")
    if st == "question":
        if source_id is None:
            raise NoteError(400, "关联题目缺少 sourceId")
        if get_question(source_id) is None:
            raise NoteError(404, "关联的题目不存在")
    elif st == "custom":
        if source_id is None:
            raise NoteError(400, "关联自建题缺少 sourceId")
        if store.get_custom(user_id, source_id) is None:
            raise NoteError(404, "关联的题目不存在")
    return store.create_note(user_id, t, c, tg, st, source_id)


def update_note(user_id, nid, title, content, tags=""):
    t, c, tg = _clean_note(title, content, tags)
    updated = store.update_note(user_id, nid, t, c, tg)
    if updated is None:
        raise NoteError(404, "笔记不存在")
    return updated


def _clean_custom(category, title, answer, difficulty):
    c, t, a = (category or "").strip(), (title or "").strip(), (answer or "").strip()
    if not CATEGORY.fullmatch(c) or not 1 <= len(t) <= 200 or not 1 <= len(a) <= 2000 or difficulty not in (1, 2, 3):
        raise NoteError(400, "自建题字段不合法")
    return c, t, a, difficulty


def create_custom(user_id, category, title, answer, difficulty):
    return store.create_custom(user_id, *_clean_custom(category, title, answer, difficulty))


def update_custom(user_id, cid, category, title, answer, difficulty):
    updated = store.update_custom(user_id, cid, *_clean_custom(category, title, answer, difficulty))
    if updated is None:
        raise NoteError(404, "自建题不存在")
    return updated


def search(user_id, raw_q="", typ="all", page=1, size=10):
    typ = typ or "all"
    if typ not in ("all", "question", "custom", "note") or page < 1 or not 1 <= size <= 50:
        raise NoteError(400, "搜索参数不合法")
    counts = {"question": 0, "custom": 0, "note": 0}
    q = (raw_q or "").strip()[:100]
    if not q:
        return {"items": [], "total": 0, "page": page, "size": size, "counts": counts}
    filtered = []
    for r in store.search_sources(user_id, q):
        counts[r["type"]] += 1
        if typ == "all" or r["type"] == typ:
            hit = {k: v for k, v in r.items() if k != "body"}
            hit["snippet"] = make_snippet(r["body"], q)
            filtered.append(hit)
    start = (page - 1) * size
    return {"items": filtered[start:start + size], "total": len(filtered), "page": page, "size": size, "counts": counts}


# app/routers/notes.py
from fastapi import APIRouter, Depends, Request, Response
from pydantic import BaseModel

from app import notes as store
from app.routers.study import require_user
from app.services import auth
from app.services import notes as service
from app.services.notes import NoteError

router = APIRouter(prefix="/api")


class NoteBody(BaseModel):
    title: str = ""
    content: str = ""
    tags: str = ""
    sourceType: str = "manual"
    sourceId: int | None = None


class CustomBody(BaseModel):
    category: str = ""
    title: str = ""
    answer: str = ""
    difficulty: int = 0


def optional_user_id(request: Request):
    try:
        return auth.current_user(request.cookies.get("session"))["id"]
    except auth.AuthError:
        return 0


@router.get("/notes")
def list_notes(q: str = "", tag: str = "", sourceType: str = "", user=Depends(require_user)):
    return {"items": store.list_notes(user["id"], q.strip(), tag.strip(), sourceType.strip())}


@router.post("/notes", status_code=201)
def create_note(body: NoteBody, user=Depends(require_user)):
    return service.create_note(user["id"], body.title, body.content, body.tags, body.sourceType, body.sourceId)


@router.get("/notes/{nid}")
def get_note(nid: int, user=Depends(require_user)):
    note = store.get_note(user["id"], nid)
    if note is None:
        raise NoteError(404, "笔记不存在")
    return note


@router.put("/notes/{nid}")
def update_note(nid: int, body: NoteBody, user=Depends(require_user)):
    return service.update_note(user["id"], nid, body.title, body.content, body.tags)


@router.delete("/notes/{nid}", status_code=204)
def delete_note(nid: int, user=Depends(require_user)):
    if not store.delete_note(user["id"], nid):
        raise NoteError(404, "笔记不存在")
    return Response(status_code=204)


@router.get("/my-questions")
def list_custom(category: str = "", q: str = "", user=Depends(require_user)):
    return {"items": store.list_custom(user["id"], category.strip(), q.strip())}


@router.post("/my-questions", status_code=201)
def create_custom(body: CustomBody, user=Depends(require_user)):
    return service.create_custom(user["id"], body.category, body.title, body.answer, body.difficulty)


@router.put("/my-questions/{cid}")
def update_custom(cid: int, body: CustomBody, user=Depends(require_user)):
    return service.update_custom(user["id"], cid, body.category, body.title, body.answer, body.difficulty)


@router.delete("/my-questions/{cid}", status_code=204)
def delete_custom(cid: int, user=Depends(require_user)):
    if not store.delete_custom(user["id"], cid):
        raise NoteError(404, "自建题不存在")
    return Response(status_code=204)


@router.get("/search")
def search_all(request: Request, q: str = "", type: str = "all", page: int = 1, size: int = 10):
    return service.search(optional_user_id(request), q, type, page, size)


# main.py（加在兜底路由前面）
from app.routers import notes as notes_routes
from app.services.notes import NoteError

app.include_router(notes_routes.router)


@app.exception_handler(NoteError)
async def note_error(request: Request, exc: NoteError):
    return JSONResponse({"error": exc.message}, status_code=exc.status)`,
            explain:[
              {at:'# app/services/notes.py',to:'SOURCE_TYPES = {"manual", "question", "custom", "ai_report"}',text:'引入数据库层与第 6 关题库查询，定义科目正则与合法来源集合。'},
              {at:'class NoteError(Exception):',to:'self.message = message',text:'携带 HTTP 状态码的业务异常。'},
              {at:'def normalize_tags(raw):',to:'return ",".join(list(dict.fromkeys(tags))[:10])',text:'dict.fromkeys 在去重的同时保留原有顺序，最多保留 10 个标签。'},
              {at:'def make_snippet(text, q):',to:'return ("…" if start > 0 else "") + clean[start:end] + ("…" if end < len(clean) else "")',text:'折叠空白后不区分大小写定位关键词，按窗口截取并补省略号。'},
              {at:'def _clean_note(title, content, tags):',to:'return t, c, normalize_tags(tags)',text:'清洗笔记标题和正文并校验字数范围。'},
              {at:'def create_note(',to:'return store.create_note(user_id, t, c, tg, st, source_id)',text:'校验 source_type 及关联公共题或自建题是否存在，存在再写入。'},
              {at:'def update_note(',to:'return updated',text:'更新找不到或非本人笔记时抛出 404。'},
              {at:'def _clean_custom(',to:'def update_custom(',text:'校验自建题字段合法性并完成新增与更新。'},
              {at:'updated = store.update_custom(',to:'return updated',text:'更新自建题找不到时返回 404。'},
              {at:'def search(',to:'return {"items": filtered[start:start + size]',text:'先统计三类总数 counts，再按 typ 过滤并切片返回分页结果。'},
              {at:'# app/routers/notes.py',to:'router = APIRouter(prefix="/api")',text:'接口层路由定义在 /api 下。'},
              {at:'class NoteBody(BaseModel):',to:'difficulty: int = 0',text:'声明笔记和自建题请求体模型。'},
              {at:'def optional_user_id(request: Request):',to:'return 0',text:'搜索接口用的可选身份提取，未登录退回 0。'},
              {at:'@router.get("/notes")',to:'return {"items": store.list_notes(user["id"], q.strip(), tag.strip(), sourceType.strip())}',text:'列表接口必须通过 Depends(require_user) 校验登录。'},
              {at:'@router.post("/notes", status_code=201)',to:'return service.create_note(user["id"], body.title, body.content, body.tags, body.sourceType, body.sourceId)',text:'调用业务逻辑层完成校验并创建，成功返回 201。'},
              {at:'@router.get("/notes/{nid}")',to:'return Response(status_code=204)',text:'笔记详情、修改与删除接口，越权或不存在均返回 404。'},
              {at:'@router.get("/my-questions")',to:'return Response(status_code=204)',text:'自建题库列表、新增、修改与删除接口。'},
              {at:'@router.get("/search")',to:'return service.search(optional_user_id(request), q, type, page, size)',text:'全站统一搜索接口。'},
              {at:'# main.py（加在兜底路由前面）',to:'return JSONResponse({"error": exc.message}, status_code=exc.status)',text:'在 main.py 注册路由，并把 NoteError 统一转换成 JSON 错误响应。'},
            ],
          },
        },
      },
    },
    {
      title:'任务三：页面上的“加入笔记”按钮与全站搜索框',
      body:'接口跑通后，把功能放到页面上：\n一、首页全站统一搜索栏：支持切换全部 / 题库 / 自建题 / 笔记，展示各分类命中数，并用安全的高亮方式标出关键词；\n二、题目详情页（包含第 16 关 AI 流式输出的结果区域）加上“加入笔记”按钮，一键带入题目或 AI 报告并反向关联来源；\n三、独立的笔记本与自建题库页面：查看、按标签过滤、新建自建题以及删除记录。页面保持简洁克制，不放多余说明文字。',
      variants:{
        html:{
          body:'原生 HTML + JS 实现三块页面联动：在 `index.html` 加全站搜索栏与 `search.js`；在 `question.html` / `question.js` 加上“加入笔记”按钮；再新建 `notes.html` 和 `notes.js` 管理个人笔记与自建题库。高亮关键词时，用 `document.createElement("mark")` 搭配 `document.createTextNode` 拼接，绝不用 `innerHTML`。',
          practice:{
            steps:[
              '在 index.html 加入全站搜索表单与结果区，引入 search.js，补完 TODO 1 和 2。',
              '在 question.html 加上“加入笔记”按钮，在 question.js 补完 TODO 3（收藏题目与 AI 输出）。',
              '新建 notes.html 与 notes.js 管理笔记本和自建题，补完 TODO 4；并在首页用户栏加上 <a href="notes.html">笔记本</a>。',
              '登录后：先在题库详情页点“加入笔记”，再在笔记页新增一道自建题，最后回首页用全站搜索框搜索并切换分类筛选。',
            ],
            expect:'搜索结果按分类显示命中计数，关键词以 <mark> 安全高亮；加入笔记和自建题写入后可立即搜到',
          },
          code:`<!-- index.html：在原有题库列表上方加上全站搜索区 -->
<section>
  <h2>全站搜索</h2>
  <form id="globalSearch">
    <input name="q" placeholder="搜索关键词" required>
    <select name="type">
      <option value="all">全部</option>
      <option value="question">题库</option>
      <option value="custom">自建题</option>
      <option value="note">笔记</option>
    </select>
    <button>搜索</button>
  </form>
  <p id="searchCounts"></p>
  <ul id="searchList"></ul>
</section>
<script src="search.js"></script>

// search.js
const searchForm = document.getElementById("globalSearch");
const searchCounts = document.getElementById("searchCounts");
const searchList = document.getElementById("searchList");

// 安全高亮：把纯文本拆成普通文本节点与 <mark> 节点，彻底防 XSS
function renderHighlighted(parent, text, query) {
  // TODO 1：不区分大小写查找 query，匹配片段放进 document.createElement("mark")，其余放 document.createTextNode
}

searchForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const fd = new FormData(searchForm);
  const q = fd.get("q").trim();
  const type = fd.get("type");
  if (!q) return;
  // TODO 2：请求 /api/search?q=...&type=...，更新 searchCounts（题库 N · 自建题 N · 笔记 N），
  //         空结果时显示“暂无匹配结果”，否则用 renderHighlighted 渲染标题与摘要
});

<!-- question.html：在 </article> 前面加上 -->
<p><button id="addNoteBtn" type="button" hidden>加入笔记</button> <span id="noteHint"></span></p>

// question.js：在题目加载成功后加入（aiResult 为第 16 关 AI 流式输出区域的容器）
const addNoteBtn = document.getElementById("addNoteBtn");
const noteHint = document.getElementById("noteHint");
addNoteBtn.hidden = false;
addNoteBtn.addEventListener("click", async () => {
  // TODO 3：收集题目、答案以及第 16 关 AI 流式输出（如有），POST /api/notes（sourceType: "question", sourceId: q.id）；
  //         401 跳去 login.html，成功显示“已加入笔记”
});

<!-- notes.html -->
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <title>笔记本与自建题库 - 面试自习室</title>
</head>
<body>
  <p><a href="/">← 返回题库</a></p>
  <h1>笔记本</h1>
  <form id="noteFilter">
    <input name="tag" placeholder="按标签筛选">
    <button>筛选</button>
  </form>
  <ul id="noteList"></ul>
  <h2>自建题目</h2>
  <form id="customForm">
    <input name="category" placeholder="go" required>
    <input name="title" placeholder="题目标题" required>
    <input name="answer" placeholder="参考答案" required>
    <select name="difficulty"><option>1</option><option>2</option><option>3</option></select>
    <button>新建题目</button>
  </form>
  <ul id="customList"></ul>
  <p id="notesMsg"></p>
  <script src="notes.js"></script>
</body>
</html>

// notes.js
async function api(method, url, body) {
  const res = await fetch(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (res.status === 401) {
    location.href = "login.html";
    return null;
  }
  const data = res.status === 204 ? null : await res.json();
  if (!res.ok) throw new Error(data?.error || "请求失败");
  return data;
}

async function refresh(tag = "") {
  // TODO 4：分别请求 /api/notes（带 tag）和 /api/my-questions，空列表显示“暂无笔记”/“暂无自建题”，
  //         为每条记录附上“删除”按钮（调用 DELETE 后刷新）
}

document.getElementById("noteFilter").addEventListener("submit", (e) => {
  e.preventDefault();
  refresh(new FormData(e.target).get("tag").trim());
});

document.getElementById("customForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const fd = new FormData(e.target);
  try {
    await api("POST", "/api/my-questions", {
      category: fd.get("category"),
      title: fd.get("title"),
      answer: fd.get("answer"),
      difficulty: Number(fd.get("difficulty")),
    });
    e.target.reset();
    refresh();
  } catch (err) {
    document.getElementById("notesMsg").textContent = err.message;
  }
});

refresh();`,
          explain:[
            {at:'<!-- index.html：在原有题库列表上方加上全站搜索区 -->',to:'<script src="search.js"></script>',text:'在首页增加紧凑的全站搜索表单、计数行与结果列表，并引入 search.js。'},
            {at:'// search.js',to:'const searchList = document.getElementById("searchList");',text:'获取搜索表单与展示容器。'},
            {at:'function renderHighlighted(',to:'}',text:'安全高亮辅助函数，待补全 TODO 1。'},
            {at:'searchForm.addEventListener("submit", async (event) => {',to:'});',text:'监听搜索表单提交并请求统一检索接口，待补全 TODO 2。'},
            {at:'<!-- question.html：在 </article> 前面加上 -->',to:'<p><button id="addNoteBtn"',text:'在题目详情页放一个隐藏的“加入笔记”按钮与状态提示。'},
            {at:'// question.js：',to:'});',text:'题目加载后显示按钮，点击一键收藏并关联题目或 AI 输出，待补全 TODO 3。'},
            {at:'<!-- notes.html -->',to:'</html>',text:'新建笔记本与自建题管理页面，只保留标签筛选、自建题表单和列表。'},
            {at:'// notes.js',to:'return data;',text:'公共请求辅助函数，遇到 401 自动跳回登录页，204 跳过 JSON 解析。'},
            {at:'async function refresh(tag = "") {',to:'}',text:'加载个人笔记与自建题库列表，待补全 TODO 4。'},
            {at:'document.getElementById("noteFilter")',to:'    refresh();',text:'绑定标签筛选与新建自建题表单提交，成功后刷新列表。'},
            {at:'  } catch (err) {',to:'refresh();',text:'出错时显示提示，并在进入页面时首次加载笔记本和自建题列表。'},
          ],
          solution:{
            code:`<!-- index.html：在原有题库列表上方加上全站搜索区 -->
<section>
  <h2>全站搜索</h2>
  <form id="globalSearch">
    <input name="q" placeholder="搜索关键词" required>
    <select name="type">
      <option value="all">全部</option>
      <option value="question">题库</option>
      <option value="custom">自建题</option>
      <option value="note">笔记</option>
    </select>
    <button>搜索</button>
  </form>
  <p id="searchCounts"></p>
  <ul id="searchList"></ul>
</section>
<script src="search.js"></script>

// search.js
const searchForm = document.getElementById("globalSearch");
const searchCounts = document.getElementById("searchCounts");
const searchList = document.getElementById("searchList");

// 安全高亮：把纯文本拆成普通文本节点与 <mark> 节点，彻底防 XSS
function renderHighlighted(parent, text, query) {
  if (!query) {
    parent.append(document.createTextNode(text));
    return;
  }
  const lower = text.toLowerCase();
  const qLower = query.toLowerCase();
  let pos = 0;
  while (pos < text.length) {
    const idx = lower.indexOf(qLower, pos);
    if (idx < 0) {
      parent.append(document.createTextNode(text.slice(pos)));
      break;
    }
    if (idx > pos) parent.append(document.createTextNode(text.slice(pos, idx)));
    const mark = document.createElement("mark");
    mark.textContent = text.slice(idx, idx + query.length);
    parent.append(mark);
    pos = idx + query.length;
  }
}

searchForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const fd = new FormData(searchForm);
  const q = fd.get("q").trim();
  const type = fd.get("type");
  if (!q) return;
  const params = new URLSearchParams({ q, type });
  const res = await fetch(\`/api/search?\${params}\`);
  const data = await res.json();
  if (!res.ok) {
    searchCounts.textContent = data.error || "检索失败";
    return;
  }
  searchCounts.textContent = \`题库 \${data.counts.question} · 自建题 \${data.counts.custom} · 笔记 \${data.counts.note}\`;
  if (!data.items.length) {
    const empty = document.createElement("li");
    empty.textContent = "暂无匹配结果";
    searchList.replaceChildren(empty);
    return;
  }
  searchList.replaceChildren(...data.items.map((item) => {
    const li = document.createElement("li");
    const tag = document.createElement("strong");
    tag.textContent = \`[\${item.type}] \`;
    const title = document.createElement("span");
    renderHighlighted(title, item.title, q);
    const br = document.createElement("br");
    const snip = document.createElement("small");
    renderHighlighted(snip, item.snippet, q);
    li.append(tag, title, br, snip);
    return li;
  }));
});

<!-- question.html：在 </article> 前面加上 -->
<p><button id="addNoteBtn" type="button" hidden>加入笔记</button> <span id="noteHint"></span></p>

// question.js：在题目加载成功后加入（aiResult 为第 16 关 AI 流式输出区域的容器）
const addNoteBtn = document.getElementById("addNoteBtn");
const noteHint = document.getElementById("noteHint");
addNoteBtn.hidden = false;
addNoteBtn.addEventListener("click", async () => {
  const aiText = document.getElementById("aiResult")?.textContent?.trim() || "";
  const content = aiText ? \`## 参考答案\\n\${q.answer}\\n\\n## AI 解析\\n\${aiText}\` : q.answer;
  const res = await fetch("/api/notes", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      title: q.title,
      content,
      tags: q.category,
      sourceType: "question",
      sourceId: q.id,
    }),
  });
  if (res.status === 401) {
    location.href = "login.html";
    return;
  }
  const data = await res.json();
  noteHint.textContent = res.ok ? "已加入笔记" : (data.error || "保存失败");
});

<!-- notes.html -->
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <title>笔记本与自建题库 - 面试自习室</title>
</head>
<body>
  <p><a href="/">← 返回题库</a></p>
  <h1>笔记本</h1>
  <form id="noteFilter">
    <input name="tag" placeholder="按标签筛选">
    <button>筛选</button>
  </form>
  <ul id="noteList"></ul>
  <h2>自建题目</h2>
  <form id="customForm">
    <input name="category" placeholder="go" required>
    <input name="title" placeholder="题目标题" required>
    <input name="answer" placeholder="参考答案" required>
    <select name="difficulty"><option>1</option><option>2</option><option>3</option></select>
    <button>新建题目</button>
  </form>
  <ul id="customList"></ul>
  <p id="notesMsg"></p>
  <script src="notes.js"></script>
</body>
</html>

// notes.js
async function api(method, url, body) {
  const res = await fetch(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (res.status === 401) {
    location.href = "login.html";
    return null;
  }
  const data = res.status === 204 ? null : await res.json();
  if (!res.ok) throw new Error(data?.error || "请求失败");
  return data;
}

async function refresh(tag = "") {
  const qs = tag ? \`?tag=\${encodeURIComponent(tag)}\` : "";
  const [nData, cData] = await Promise.all([api("GET", \`/api/notes\${qs}\`), api("GET", "/api/my-questions")]);
  if (!nData || !cData) return;
  const noteList = document.getElementById("noteList");
  const customList = document.getElementById("customList");
  noteList.replaceChildren(...(nData.items.length ? nData.items.map((n) => {
    const li = document.createElement("li");
    const del = document.createElement("button");
    del.textContent = "删除";
    del.addEventListener("click", () => api("DELETE", \`/api/notes/\${n.id}\`).then(() => refresh(tag)));
    li.append(\`[\${n.sourceType}] \${n.title} (\${n.tags || "无标签"}) \`, del);
    return li;
  }) : ["暂无笔记"]));
  customList.replaceChildren(...(cData.items.length ? cData.items.map((c) => {
    const li = document.createElement("li");
    const del = document.createElement("button");
    del.textContent = "删除";
    del.addEventListener("click", () => api("DELETE", \`/api/my-questions/\${c.id}\`).then(() => refresh(tag)));
    li.append(\`[\${c.category}] \${c.title} \`, del);
    return li;
  }) : ["暂无自建题"]));
}

document.getElementById("noteFilter").addEventListener("submit", (e) => {
  e.preventDefault();
  refresh(new FormData(e.target).get("tag").trim());
});

document.getElementById("customForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const fd = new FormData(e.target);
  try {
    await api("POST", "/api/my-questions", {
      category: fd.get("category"),
      title: fd.get("title"),
      answer: fd.get("answer"),
      difficulty: Number(fd.get("difficulty")),
    });
    e.target.reset();
    refresh();
  } catch (err) {
    document.getElementById("notesMsg").textContent = err.message;
  }
});

refresh();`,
            explain:[
              {at:'<!-- index.html：在原有题库列表上方加上全站搜索区 -->',to:'<script src="search.js"></script>',text:'在首页增加紧凑的全站搜索表单、计数行与结果列表，并引入 search.js。'},
              {at:'// search.js',to:'const searchList = document.getElementById("searchList");',text:'获取搜索表单与展示容器。'},
              {at:'function renderHighlighted(',to:'pos = idx + query.length;',text:'逐段查找关键词位置，只把普通片段放进 TextNode、命中片段放进 <mark> 的 textContent，彻底杜绝 XSS。'},
              {at:'searchForm.addEventListener("submit", async (event) => {',to:'if (!q) return;',text:'提交搜索时读取关键词和过滤类型。'},
              {at:'const params = new URLSearchParams(',to:'`题库 ${data.counts.question}',text:'请求 /api/search 后更新三类命中数展示。'},
              {at:'if (!data.items.length) {',to:'return;',text:'空结果只给出一句极简空状态提示。'},
              {at:'searchList.replaceChildren(...data.items.map((item) => {',to:'}));',text:'渲染搜索结果的标题与高亮摘要。'},
              {at:'<!-- question.html：在 </article> 前面加上 -->',to:'<p><button id="addNoteBtn"',text:'在题目详情页放一个隐藏的“加入笔记”按钮与状态提示。'},
              {at:'// question.js：',to:'noteHint.textContent = res.ok ? "已加入笔记" : (data.error || "保存失败");',text:'顺手把参考答案与第 16 关 AI 流式输出拼进 Markdown 笔记并关联原题，未登录跳转到登录页。'},
              {at:'<!-- notes.html -->',to:'</html>',text:'新建笔记本与自建题管理页面，只保留标签筛选、自建题表单和列表。'},
              {at:'// notes.js',to:'return data;',text:'公共请求辅助函数，遇到 401 自动跳回登录页，204 跳过 JSON 解析。'},
              {at:'async function refresh(tag = "") {',to:'}) : ["暂无自建题"]));',text:'并发拉取笔记与自建题，带标签过滤并绑定删除操作；列表为空时只显示极简空状态。'},
              {at:'document.getElementById("noteFilter")',to:'    refresh();',text:'绑定标签筛选与新建自建题表单提交。'},
              {at:'  } catch (err) {',to:'refresh();',text:'出错时显示提示，并在进入页面时首次加载笔记本和自建题列表。'},
            ],
          },
        },
        react:{
          body:'React 版本新建 `GlobalSearch.jsx`、`NotesPage.jsx`，并在 `QuestionDetail.jsx` 加入“加入笔记”按钮、在 `App.jsx` 挂载 `/?page=notes`。组件同样遵循极简界面：不添加额外说明文字，并用 `<mark>` 元素安全拆段高亮关键词。',
          practice:{
            steps:[
              '新建 src/GlobalSearch.jsx（补完 TODO 1 和 2）并在 QuestionList 顶部引入渲染。',
              '在 src/QuestionDetail.jsx 里加入“加入笔记”逻辑（补完 TODO 3）。',
              '新建 src/NotesPage.jsx（补完 TODO 4），并在 src/App.jsx 增加 /?page=notes 路由和 UserBar 导航链接。',
              'npm run dev 启动后：在详情页加入笔记，在笔记页新建自建题，在首页全站搜索框测试分类筛选与关键词高亮。',
            ],
            expect:'分类标签上展示实时计数，命中摘要高亮关键词，笔记本与自建题增删和检索流畅联动',
          },
          code:`// src/GlobalSearch.jsx
import { useState } from "react";

function Highlight({ text, query }) {
  // TODO 1：把 text 按 query（不区分大小写）切分，命中部分用 <mark> 包裹，其余直接渲染纯文本
  return <>{text}</>;
}

export default function GlobalSearch() {
  const [input, setInput] = useState("");
  const [query, setQuery] = useState("");
  const [type, setType] = useState("all");
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

  async function runSearch(q, typ) {
    // TODO 2：请求 /api/search?q=...&type=...，成功后更新 query 与 result，失败 setError
  }

  function submit(e) {
    e.preventDefault();
    if (input.trim()) runSearch(input.trim(), type);
  }

  return (
    <section>
      <h2>全站搜索</h2>
      <form onSubmit={submit}>
        <input value={input} onChange={(e) => setInput(e.target.value)} placeholder="搜索关键词" required />
        <button>搜索</button>
      </form>
      {error && <p>{error}</p>}
      {result && (
        <>
          <nav>
            {[
              ["all", \`全部 (\${result.counts.question + result.counts.custom + result.counts.note})\`],
              ["question", \`题库 (\${result.counts.question})\`],
              ["custom", \`自建题 (\${result.counts.custom})\`],
              ["note", \`笔记 (\${result.counts.note})\`],
            ].map(([k, label]) => (
              <button key={k} type="button" disabled={type === k} onClick={() => { setType(k); runSearch(query, k); }}>
                {label}
              </button>
            ))}
          </nav>
          {result.items.length === 0 ? <p>暂无匹配结果</p> : (
            <ul>
              {result.items.map((item) => (
                <li key={\`\${item.type}-\${item.id}\`}>
                  <strong>[{item.type}]</strong> <Highlight text={item.title} query={query} />
                  <br />
                  <small><Highlight text={item.snippet} query={query} /></small>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </section>
  );
}

// src/QuestionDetail.jsx（在答案和第 16 关 AI 流式输出区域下方加上“加入笔记”按钮）
const [noteHint, setNoteHint] = useState("");

async function saveToNote(aiReport = "") {
  // TODO 3：POST /api/notes（sourceType: "question", sourceId: question.id，正文合并参考答案与 aiReport）；
  //         401 跳转到 /?page=login，成功 setNoteHint("已加入笔记")
}

// JSX：<button onClick={() => saveToNote(aiText)}>加入笔记</button> {noteHint && <span>{noteHint}</span>}

// src/NotesPage.jsx（在 App.jsx 里加一行：if (params.get("page") === "notes") return <NotesPage />;）
import { useEffect, useState } from "react";

export default function NotesPage() {
  const [notes, setNotes] = useState([]);
  const [customs, setCustoms] = useState([]);
  const [tag, setTag] = useState("");
  const [form, setForm] = useState({ category: "", title: "", answer: "", difficulty: "1" });
  const [error, setError] = useState("");

  async function load(filterTag = tag) {
    // TODO 4：GET /api/notes（带 tag）和 GET /api/my-questions；401 跳 /?page=login；更新 notes 与 customs
  }

  useEffect(() => { load(""); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function createCustom(e) {
    e.preventDefault();
    const res = await fetch("/api/my-questions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, difficulty: Number(form.difficulty) }),
    });
    const data = await res.json();
    if (!res.ok) return setError(data.error || "保存失败");
    setForm({ category: "", title: "", answer: "", difficulty: "1" });
    setError("");
    load(tag);
  }

  async function remove(url) {
    await fetch(url, { method: "DELETE" });
    load(tag);
  }

  return (
    <main>
      <p><a href="/">← 返回题库</a></p>
      <h1>笔记本</h1>
      <form onSubmit={(e) => { e.preventDefault(); load(tag.trim()); }}>
        <input value={tag} onChange={(e) => setTag(e.target.value)} placeholder="按标签筛选" />
        <button>筛选</button>
      </form>
      {notes.length === 0 ? <p>暂无笔记</p> : (
        <ul>
          {notes.map((n) => (
            <li key={n.id}>
              [{n.sourceType}] {n.title} ({n.tags || "无标签"}){" "}
              <button type="button" onClick={() => remove(\`/api/notes/\${n.id}\`)}>删除</button>
            </li>
          ))}
        </ul>
      )}
      <h2>自建题目</h2>
      <form onSubmit={createCustom}>
        <input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} placeholder="go" required />
        <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="题目标题" required />
        <input value={form.answer} onChange={(e) => setForm({ ...form, answer: e.target.value })} placeholder="参考答案" required />
        <select value={form.difficulty} onChange={(e) => setForm({ ...form, difficulty: e.target.value })}>
          <option>1</option><option>2</option><option>3</option>
        </select>
        <button>新建题目</button>
      </form>
      {error && <p>{error}</p>}
      {customs.length === 0 ? <p>暂无自建题</p> : (
        <ul>
          {customs.map((c) => (
            <li key={c.id}>
              [{c.category}] {c.title}{" "}
              <button type="button" onClick={() => remove(\`/api/my-questions/\${c.id}\`)}>删除</button>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}`,
          explain:[
            {at:'// src/GlobalSearch.jsx',to:'function Highlight({ text, query }) {',text:'新建全站搜索组件。Highlight 组件负责把纯文本拆成普通片段与高亮标记。'},
            {at:'return <>{text}</>;',to:'export default function GlobalSearch() {',text:'TODO 1 处改成按关键词切分并包上 <mark>。'},
            {at:'const [input, setInput] = useState("");',to:'const [error, setError] = useState("");',text:'维护输入框、已提交关键词、过滤类型、返回结果和错误信息。'},
            {at:'async function runSearch(q, typ) {',to:'function submit(e) {',text:'runSearch 待补全 TODO 2；submit 阻止默认提交后触发检索。'},
            {at:'e.preventDefault();',to:'return (',text:'防止空关键词请求接口。'},
            {at:'<section>',to:'</section>',text:'紧凑的搜索框、四类计数切换按钮、空状态和带高亮的命中列表。'},
            {at:'// src/QuestionDetail.jsx',to:'async function saveToNote(aiReport = "") {',text:'详情页加上保存笔记状态与“加入笔记”处理函数，待补全 TODO 3。'},
            {at:'// src/NotesPage.jsx',to:'const [error, setError] = useState("");',text:'笔记本与自建题库页面组件，维护笔记列表、自建题列表、标签筛选和表单状态。'},
            {at:'async function load(filterTag = tag) {',to:'async function createCustom(e) {',text:'load 方法待补全 TODO 4；组件首次挂载时触发加载。'},
            {at:'e.preventDefault();',to:'async function remove(url) {',text:'提交新建自建题并在成功后重置表单、刷新列表；remove 负责删除单条记录。'},
            {at:'await fetch(url, { method: "DELETE" });',to:'</main>',text:'极简页面布局：返回链接、标签筛选、笔记列表、自建题表单和自建题列表。'},
          ],
          solution:{
            code:`// src/GlobalSearch.jsx
import { useState } from "react";

function Highlight({ text, query }) {
  if (!query) return <>{text}</>;
  const parts = [];
  const lower = text.toLowerCase();
  const qLower = query.toLowerCase();
  let pos = 0;
  while (pos < text.length) {
    const idx = lower.indexOf(qLower, pos);
    if (idx < 0) {
      parts.push(text.slice(pos));
      break;
    }
    if (idx > pos) parts.push(text.slice(pos, idx));
    parts.push(<mark key={idx}>{text.slice(idx, idx + query.length)}</mark>);
    pos = idx + query.length;
  }
  return <>{parts}</>;
}

export default function GlobalSearch() {
  const [input, setInput] = useState("");
  const [query, setQuery] = useState("");
  const [type, setType] = useState("all");
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

  async function runSearch(q, typ) {
    const params = new URLSearchParams({ q, type: typ });
    const res = await fetch(\`/api/search?\${params}\`);
    const data = await res.json();
    if (!res.ok) return setError(data.error || "检索失败");
    setQuery(q);
    setResult(data);
    setError("");
  }

  function submit(e) {
    e.preventDefault();
    if (input.trim()) runSearch(input.trim(), type);
  }

  return (
    <section>
      <h2>全站搜索</h2>
      <form onSubmit={submit}>
        <input value={input} onChange={(e) => setInput(e.target.value)} placeholder="搜索关键词" required />
        <button>搜索</button>
      </form>
      {error && <p>{error}</p>}
      {result && (
        <>
          <nav>
            {[
              ["all", \`全部 (\${result.counts.question + result.counts.custom + result.counts.note})\`],
              ["question", \`题库 (\${result.counts.question})\`],
              ["custom", \`自建题 (\${result.counts.custom})\`],
              ["note", \`笔记 (\${result.counts.note})\`],
            ].map(([k, label]) => (
              <button key={k} type="button" disabled={type === k} onClick={() => { setType(k); runSearch(query, k); }}>
                {label}
              </button>
            ))}
          </nav>
          {result.items.length === 0 ? <p>暂无匹配结果</p> : (
            <ul>
              {result.items.map((item) => (
                <li key={\`\${item.type}-\${item.id}\`}>
                  <strong>[{item.type}]</strong> <Highlight text={item.title} query={query} />
                  <br />
                  <small><Highlight text={item.snippet} query={query} /></small>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </section>
  );
}

// src/QuestionDetail.jsx（在答案和第 16 关 AI 流式输出区域下方加上“加入笔记”按钮）
const [noteHint, setNoteHint] = useState("");

async function saveToNote(aiReport = "") {
  const content = aiReport.trim()
    ? \`## 参考答案\\n\${question.answer}\\n\\n## AI 解析\\n\${aiReport.trim()}\`
    : question.answer;
  const res = await fetch("/api/notes", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      title: question.title,
      content,
      tags: question.category,
      sourceType: "question",
      sourceId: question.id,
    }),
  });
  if (res.status === 401) {
    window.location.href = "/?page=login";
    return;
  }
  const data = await res.json();
  setNoteHint(res.ok ? "已加入笔记" : (data.error || "保存失败"));
}

// JSX：<button onClick={() => saveToNote(aiText)}>加入笔记</button> {noteHint && <span>{noteHint}</span>}

// src/NotesPage.jsx（在 App.jsx 里加一行：if (params.get("page") === "notes") return <NotesPage />;）
import { useEffect, useState } from "react";

export default function NotesPage() {
  const [notes, setNotes] = useState([]);
  const [customs, setCustoms] = useState([]);
  const [tag, setTag] = useState("");
  const [form, setForm] = useState({ category: "", title: "", answer: "", difficulty: "1" });
  const [error, setError] = useState("");

  async function load(filterTag = tag) {
    const qs = filterTag ? \`?tag=\${encodeURIComponent(filterTag)}\` : "";
    const [r1, r2] = await Promise.all([fetch(\`/api/notes\${qs}\`), fetch("/api/my-questions")]);
    if (r1.status === 401 || r2.status === 401) {
      window.location.href = "/?page=login";
      return;
    }
    const [d1, d2] = await Promise.all([r1.json(), r2.json()]);
    setNotes(d1.items || []);
    setCustoms(d2.items || []);
  }

  useEffect(() => { load(""); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function createCustom(e) {
    e.preventDefault();
    const res = await fetch("/api/my-questions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, difficulty: Number(form.difficulty) }),
    });
    const data = await res.json();
    if (!res.ok) return setError(data.error || "保存失败");
    setForm({ category: "", title: "", answer: "", difficulty: "1" });
    setError("");
    load(tag);
  }

  async function remove(url) {
    await fetch(url, { method: "DELETE" });
    load(tag);
  }

  return (
    <main>
      <p><a href="/">← 返回题库</a></p>
      <h1>笔记本</h1>
      <form onSubmit={(e) => { e.preventDefault(); load(tag.trim()); }}>
        <input value={tag} onChange={(e) => setTag(e.target.value)} placeholder="按标签筛选" />
        <button>筛选</button>
      </form>
      {notes.length === 0 ? <p>暂无笔记</p> : (
        <ul>
          {notes.map((n) => (
            <li key={n.id}>
              [{n.sourceType}] {n.title} ({n.tags || "无标签"}){" "}
              <button type="button" onClick={() => remove(\`/api/notes/\${n.id}\`)}>删除</button>
            </li>
          ))}
        </ul>
      )}
      <h2>自建题目</h2>
      <form onSubmit={createCustom}>
        <input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} placeholder="go" required />
        <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="题目标题" required />
        <input value={form.answer} onChange={(e) => setForm({ ...form, answer: e.target.value })} placeholder="参考答案" required />
        <select value={form.difficulty} onChange={(e) => setForm({ ...form, difficulty: e.target.value })}>
          <option>1</option><option>2</option><option>3</option>
        </select>
        <button>新建题目</button>
      </form>
      {error && <p>{error}</p>}
      {customs.length === 0 ? <p>暂无自建题</p> : (
        <ul>
          {customs.map((c) => (
            <li key={c.id}>
              [{c.category}] {c.title}{" "}
              <button type="button" onClick={() => remove(\`/api/my-questions/\${c.id}\`)}>删除</button>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}`,
            explain:[
              {at:'// src/GlobalSearch.jsx',to:'function Highlight({ text, query }) {',text:'新建全站搜索组件。Highlight 组件负责把纯文本拆成普通片段与高亮标记。'},
              {at:'if (!query) return <>{text}</>;',to:'return <>{parts}</>;',text:'用数组拼出纯文本与 <mark> JSX 节点，不依赖 dangerouslySetInnerHTML，彻底安全。'},
              {at:'export default function GlobalSearch() {',to:'const [error, setError] = useState("");',text:'维护输入框、已提交关键词、过滤类型、返回结果和错误信息。'},
              {at:'async function runSearch(q, typ) {',to:'function submit(e) {',text:'请求统一搜索接口并同步 query 与 result；submit 阻止默认刷新。'},
              {at:'e.preventDefault();',to:'return (',text:'防止空关键词请求接口。'},
              {at:'<section>',to:'</section>',text:'紧凑的搜索框、四类计数切换按钮、空状态和带高亮的命中列表。'},
              {at:'// src/QuestionDetail.jsx',to:'setNoteHint(res.ok ? "已加入笔记" : (data.error || "保存失败"));',text:'把参考答案和可选的 AI 输出写入个人笔记并反向关联当前题目，401 时引导登录。'},
              {at:'// src/NotesPage.jsx',to:'const [error, setError] = useState("");',text:'笔记本与自建题库页面组件，维护笔记列表、自建题列表、标签筛选和表单状态。'},
              {at:'async function load(filterTag = tag) {',to:'useEffect(() => { load(""); }, []);',text:'并发加载笔记和自建题列表，遇到 401 自动跳去登录页。'},
              {at:'async function createCustom(e) {',to:'async function remove(url) {',text:'提交新建自建题并在成功后重置表单、刷新列表；remove 负责删除单条记录。'},
              {at:'await fetch(url, { method: "DELETE" });',to:'</main>',text:'极简页面布局：返回链接、标签筛选、笔记列表、自建题表单和自建题列表。'},
            ],
          },
        },
      },
    },
    {
      title:'验收：检查笔记关联、数据隔离与统一搜索',
      body:'运行下面的 Python 验收脚本，它会注册两个随机用户 `user_a` 与 `user_b`，依次检验：未登录拦截、笔记关联公共题库与标签过滤、自建题库增改与参数校验、跨用户 403/404 越权隔离、全站三路聚合搜索与类型过滤、特殊字符 `%` 与单引号 `\'` 的安全转义不误匹配，以及删除后不可再查到或搜到。',
      practice:{
        steps:[
          '保持后端服务运行（端口 8080）。',
          '将下面代码保存为 checks/check_l17.py，运行 python checks/check_l17.py（Mac 用 python3）。',
          '全部 8 项打 ✓ 并输出“通过 8 / 8”后，提交 Git：git add . && git commit -m "第 17 关：笔记本、自建题库与全站检索"。',
        ],
        expect:`✓ 健康检查仍然正常
✓ 未登录不能访问个人笔记和自建题库
✓ 笔记创建、来源关联与标签筛选正常
✓ 自建题库支持增改查与参数校验
✓ 跨用户数据完全隔离（403/404 越权拦截）
✓ 全站统一搜索聚合题库、自建题与笔记
✓ 特殊字符 % 和单引号检索安全且不误匹配
✓ 删除笔记与自建题后生效且不可再检索

通过 8 / 8`,
      },
      code:`import http.cookiejar
import json
import random
import sys
import urllib.error
import urllib.parse
import urllib.request

BASE = sys.argv[1] if len(sys.argv) > 1 else "http://localhost:8080"
passed = 0


def check(name, ok):
    global passed
    print(("✓ " if ok else "✗ ") + name)
    passed += bool(ok)


def new_client():
    opener = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(http.cookiejar.CookieJar()))

    def call(method, path, body=None):
        data = json.dumps(body).encode("utf-8") if body is not None else None
        req = urllib.request.Request(BASE + path, data=data, method=method, headers={"Content-Type": "application/json"})
        try:
            with opener.open(req, timeout=10) as r:
                status, raw = r.status, r.read()
        except urllib.error.HTTPError as e:
            status, raw = e.code, e.read()
        except OSError as e:
            sys.exit(f"连不上 {BASE}，服务启动了吗？（{e}）")
        try:
            return status, json.loads(raw.decode("utf-8") or "null")
        except ValueError:
            return status, None

    return call


def obj(v):
    return v if isinstance(v, dict) else {}


anon, user_a, user_b = new_client(), new_client(), new_client()
tag = random.randint(100000, 999999)
for client, name in ((user_a, f"note_a_{tag}"), (user_b, f"note_b_{tag}")):
    cred = {"username": name, "password": "password123"}
    client("POST", "/api/register", cred)
    client("POST", "/api/login", cred)

s_health, d_health = anon("GET", "/api/health")
check("健康检查仍然正常", s_health == 200 and obj(d_health).get("status") == "ok")

check("未登录不能访问个人笔记和自建题库",
      anon("GET", "/api/notes")[0] == 401 and anon("POST", "/api/notes", {"title": "t", "content": "c"})[0] == 401
      and anon("GET", "/api/my-questions")[0] == 401
      and anon("POST", "/api/my-questions", {"category": "go", "title": "t", "answer": "a", "difficulty": 1})[0] == 401)

token = f"uniq_defer_{tag}"
s_note, note = user_a("POST", "/api/notes", {
    "title": f"笔记 {token}",
    "content": f"结合第 16 关 AI 流式输出整理的 defer 要点（{token}）",
    "tags": "go, 并发, go",
    "sourceType": "question",
    "sourceId": 1,
})
nid = obj(note).get("id")
_, listed_notes = user_a("GET", "/api/notes?tag=go")
n_items = obj(listed_notes).get("items", [])
s_bad_src, _ = user_a("POST", "/api/notes", {"title": "坏来源", "content": "c", "sourceType": "question", "sourceId": 99999})
s_bad_note, _ = user_a("POST", "/api/notes", {"title": "   ", "content": "c"})
check("笔记创建、来源关联与标签筛选正常",
      s_note == 201 and isinstance(nid, int) and obj(note).get("sourceId") == 1
      and any(obj(x).get("id") == nid for x in n_items) and s_bad_src == 404 and s_bad_note == 400)

s_cq, cq = user_a("POST", "/api/my-questions", {
    "category": "go",
    "title": f"自建题 {token}",
    "answer": f"defer 后进先出 {token}",
    "difficulty": 2,
})
cid = obj(cq).get("id")
s_cq_put, cq_up = user_a("PUT", f"/api/my-questions/{cid}", {
    "category": "go",
    "title": f"自建题已更新 {token}",
    "answer": f"defer 后进先出 {token}",
    "difficulty": 3,
})
s_cq_bad, _ = user_a("POST", "/api/my-questions", {"category": "Bad Cat", "title": "t", "answer": "a", "difficulty": 9})
check("自建题库支持增改查与参数校验",
      s_cq == 201 and isinstance(cid, int) and s_cq_put == 200
      and obj(cq_up).get("difficulty") == 3 and s_cq_bad == 400)

b_get_n, _ = user_b("GET", f"/api/notes/{nid}")
b_put_n, _ = user_b("PUT", f"/api/notes/{nid}", {"title": "越权改", "content": "x"})
b_del_n, _ = user_b("DELETE", f"/api/notes/{nid}")
b_put_c, _ = user_b("PUT", f"/api/my-questions/{cid}", {"category": "go", "title": "改", "answer": "a", "difficulty": 1})
b_del_c, _ = user_b("DELETE", f"/api/my-questions/{cid}")
_, b_search = user_b("GET", f"/api/search?q={urllib.parse.quote(token)}")
_, anon_search = anon("GET", f"/api/search?q={urllib.parse.quote(token)}")
check("跨用户数据完全隔离（403/404 越权拦截）",
      all(s in (403, 404) for s in (b_get_n, b_put_n, b_del_n, b_put_c, b_del_c))
      and obj(b_search).get("total") == 0 and obj(anon_search).get("total") == 0)

s_search_d, res_defer = user_a("GET", "/api/search?q=defer&type=all&page=1&size=10")
counts = obj(obj(res_defer).get("counts"))
s_search_t, res_tok = user_a("GET", f"/api/search?q={urllib.parse.quote(token)}&type=note")
t_items = obj(res_tok).get("items", [])
check("全站统一搜索聚合题库、自建题与笔记",
      s_search_d == 200 and counts.get("question", 0) >= 1 and counts.get("custom", 0) >= 1 and counts.get("note", 0) >= 1
      and s_search_t == 200 and len(t_items) == 1 and t_items[0].get("type") == "note"
      and bool(t_items[0].get("snippet")))

_, sp_note = user_a("POST", "/api/notes", {"title": f"特符 {tag}", "content": f"缓存命中率 100% 与 O'Reilly {tag}"})
_, pl_note = user_a("POST", "/api/notes", {"title": f"普通 {tag}", "content": f"没有任何特殊符号的复盘 {tag}"})
sp_id, pl_id = obj(sp_note).get("id"), obj(pl_note).get("id")
s_pct, res_pct = user_a("GET", f"/api/search?q={urllib.parse.quote('%')}&type=note")
s_qot, res_qot = user_a("GET", f"/api/search?q={urllib.parse.quote(chr(39))}&type=note")
pct_ids = {obj(x).get("id") for x in obj(res_pct).get("items", [])}
qot_ids = {obj(x).get("id") for x in obj(res_qot).get("items", [])}
check("特殊字符 % 和单引号检索安全且不误匹配",
      s_pct == 200 and sp_id in pct_ids and pl_id not in pct_ids
      and s_qot == 200 and sp_id in qot_ids and pl_id not in qot_ids)

d_n, _ = user_a("DELETE", f"/api/notes/{nid}")
d_c, _ = user_a("DELETE", f"/api/my-questions/{cid}")
user_a("DELETE", f"/api/notes/{sp_id}")
user_a("DELETE", f"/api/notes/{pl_id}")
_, after_del = user_a("GET", f"/api/search?q={urllib.parse.quote(token)}")
check("删除笔记与自建题后生效且不可再检索",
      d_n == 204 and d_c == 204
      and user_a("GET", f"/api/notes/{nid}")[0] == 404
      and obj(after_del).get("total") == 0)

print(f"\\n通过 {passed} / 8")`,
      explain:[
        {at:'import http.cookiejar',to:'import urllib.request',text:'仅使用 Python 标准库发请求、编码 URL 参数和管理 Cookie 罐，无需安装第三方依赖。'},
        {at:'BASE = sys.argv[1]',to:'passed += bool(ok)',text:'读取目标服务地址并定义逐项打印 ✓ / ✗ 和统计通过数的 check 助手。'},
        {at:'def new_client():',to:'return call',text:'为每个虚拟用户创建独立 CookieJar，模拟多用户浏览器并发隔离测试。'},
        {at:'def obj(v):',to:'return v if isinstance(v, dict) else {}',text:'安全读取字典字段，防止后端返回格式异常时脚本直接报错中断。'},
        {at:'anon, user_a, user_b = new_client(), new_client(), new_client()',to:'client("POST", "/api/login", cred)',text:'构造匿名访客及两个随机新账号 user_a 与 user_b 并完成注册登录。'},
        {at:'s_health, d_health = anon("GET", "/api/health")',to:'check("健康检查仍然正常"',text:'确认基础健康检查正常。'},
        {at:'check("未登录不能访问个人笔记和自建题库",',to:'and anon("POST", "/api/my-questions"',text:'第 1–2 项：未登录访问个人笔记本与自建题库接口必须被 401 拦截。'},
        {at:'token = f"uniq_defer_{tag}"',to:'and any(obj(x).get("id") == nid for x in n_items) and s_bad_src == 404 and s_bad_note == 400)',text:'第 3 项：创建关联第 6 关 1 号题目的笔记并验证精确标签筛选、不存在来源 404 与空标题 400。'},
        {at:'s_cq, cq = user_a("POST", "/api/my-questions", {',to:'and obj(cq_up).get("difficulty") == 3 and s_cq_bad == 400)',text:'第 4 项：创建并修改私有自建题，同时验证不合法科目/难度返回 400。'},
        {at:'b_get_n, _ = user_b("GET", f"/api/notes/{nid}")',to:'and obj(b_search).get("total") == 0 and obj(anon_search).get("total") == 0)',text:'第 5 项：验证跨用户 GET/PUT/DELETE 均被 403/404 拦截，且他人和匿名搜索不到私有内容。'},
        {at:'s_search_d, res_defer = user_a("GET", "/api/search?q=defer&type=all&page=1&size=10")',to:'and bool(t_items[0].get("snippet")))',text:'第 6 项：校验全站检索三路命中统计 counts、类型过滤与摘要 snippet 输出。'},
        {at:'_, sp_note = user_a("POST", "/api/notes",',to:'and s_qot == 200 and sp_id in qot_ids and pl_id not in qot_ids)',text:'第 7 项：写入含 % 和单引号的笔记与普通对照笔记，验证 ESCAPE 转义不会把 % 当成通配符拖出无关笔记。'},
        {at:'d_n, _ = user_a("DELETE", f"/api/notes/{nid}")',to:'and obj(after_del).get("total") == 0)',text:'第 8 项：清理删除自己的笔记与自建题，确认删除后详情 404 且不再被搜到。'},
        {at:'print(f"\\n通过 {passed} / 8")',text:'打印最终通过项汇总。'},
      ],
    },
    {
      title:'这一关学到了什么',
      body:'一、用 `source_type` + `source_id` 实现多态反向关联，让笔记既能独立手写，也能关联第 6 关公共题库、个人自建题或第 16 关 AI 流式输出报告；\n二、私有数据必须严格按登录态 `user_id` 隔离：绝不信任前端传入的 `userId`，单条读写删在 SQL 层面始终带上 `WHERE id = ? AND user_id = ?`，他人资源统一返回 404 防止越权与探测；\n三、参数化查询能防 SQL 注入，但模糊查询 `LIKE` 里的 `%`、`_` 仍会被当作通配符，必须先转义 `\\`、`%`、`_` 并配合 `ESCAPE \'\\\'`；\n四、统一检索接口应先聚合三路结果算出各类型计数 `counts`，再做类型过滤与分页；摘要 `snippet` 由后端截取纯文本、前端用 DOM/JSX `<mark>` 节点安全高亮以防 XSS。\n下一关预告（第 18 关：在线编程实验场与代码沙箱）：我们将把自习室接入浏览器端与服务端的代码运行环境，让学习者可以直接编写、运行并安全验证算法与工程代码题。',
    },
  ],
  quiz:[
    {
      id:'pj-notes-1',
      q:'为什么 `notes` 表用 `source_type` 加可空的 `source_id` 关联来源，而不直接给 `source_id` 加指向 `questions(id)` 的外键？',
      options:[
        '外键会导致 SQLite 无法按关键词检索正文',
        '笔记还可能来自自建题、AI 报告或手写创建',
        '外键约束会让数据库自动删除用户笔记内容',
        '加了外键后每次查询都必须返回完整题目文本',
      ],
      why:[
        '外键只约束引用完整性，不影响 LIKE 或全文检索。',
        '',
        '只有配置 ON DELETE CASCADE 时删除主表行才会级联删除，默认不会。',
        '查询哪些字段由 SELECT 决定，与是否建立外键无关。',
      ],
      answer:1,
      explain:'笔记的来源不止公共题库 `questions`，还可能来自 `my_questions`、第 16 关的 AI 报告，或是独立手写（`source_id` 为 `NULL`）。单个外键只能指向一张表，所以用 `source_type + source_id` 做多态反向关联，并在业务层按类型校验原题存在性。',
    },
    {
      id:'pj-notes-2',
      type:'multi',
      q:'为了防止用户越权读取或修改别人的笔记和自建题，下面哪些做法是有效的？（多选）',
      options:[
        'user_id 仅从会话中读取',
        '查询只按 id 查，找到后直接返回数据',
        '单条读写删都加 AND user_id = ?',
        '遇到他人编号返回 404 不透露是否存在',
      ],
      why:[
        '',
        '只按 id 查并直接返回属于典型的水平越权（IDOR）漏洞。',
        '',
        '',
      ],
      answers:[0,2,3],
      explain:'防越权的核心是：身份必须来自服务端可信会话（而不是请求参数），SQL 语句层面用 `WHERE id = ? AND user_id = ?` 锁定归属，并且对他人资源返回 404，避免暴露编号存在与否。',
    },
    {
      id:'pj-notes-3',
      type:'judge',
      q:'只要 SQL 语句使用了参数化占位符（如 `title LIKE \'%\' || ? || \'%\'`），用户输入 `%` 或 `_` 时就已经不会影响匹配逻辑了。',
      answer:false,
      explain:'错误。参数化占位符能防住单引号 `\'` 等导致的 SQL 注入，但 `%` 和 `_` 在 `LIKE` 的模式字符串里依然具有通配符含义。不转义直接搜索 `%` 会匹配所有非空记录，必须先转义 `\\`、`%`、`_` 并配合 `ESCAPE \'\\\'`。',
    },
    {
      id:'pj-notes-4',
      q:'在转义用户搜索词 `q` 用于 `LIKE` 模糊匹配时，为什么必须先把 `\\` 转义成 `\\\\`，再去转义 `%` 和 `_`？',
      options:[
        'SQLite 规定反斜杠占两个字节需要提前对齐',
        '这样可以顺便把用户输入里的单引号一起删掉',
        '防止后插入的转义反斜杠被再次替换成双斜杠',
        '否则参数化查询在绑定字符串时会抛出编码异常',
      ],
      why:[
        '反斜杠是 1 个 ASCII 字节，与字节对齐无关。',
        '转义函数并不删除单引号，单引号安全靠参数化占位符保证。',
        '',
        '绑定参数不解析字符串内容，不会因为顺序问题抛编码异常。',
      ],
      answer:2,
      explain:'如果先将 `%` 替换成 `\\%`，再将 `\\` 替换成 `\\\\`，原本为了转义 `%` 而加上去的反斜杠就会被第二次替换变成 `\\\\`，结果变成匹配字面量 `\\` 加任意字符 `%`，转义完全失效。',
    },
    {
      id:'pj-notes-5',
      type:'fill',
      q:'在 SQLite 的 LIKE 模糊查询中，为了让转义后的 \\% 和 \\_ 按普通字符匹配，需要在模式串后补充关键字 ＿ 并指定转义字符。',
      accepted:['ESCAPE','escape'],
      explain:'SQL 标准与 SQLite 默认不把反斜杠当作 `LIKE` 转义符，必须显式写出 `ESCAPE \'\\\'`（例如 `title LIKE \'%\' || ? || \'%\' ESCAPE \'\\\'`）。',
    },
    {
      id:'pj-notes-6',
      type:'multi',
      q:'关于全站统一检索 `GET /api/search` 的实现与展示，下面哪些说法是正确的？（多选）',
      options:[
        '后端直接拼好 `<mark>` HTML，前端用 innerHTML 插入最快',
        '前端用文本节点或 JSX `<mark>` 拆分渲染摘要，避免 XSS',
        '未登录时只检索公共题库，不返回任何用户的笔记与自建题',
        '先做分页切片后再统计 counts，能减少前端渲染的计算量',
      ],
      why:[
        '若正文里含 `<script>` 等标签，直接 innerHTML 会触发 XSS 跨站脚本攻击。',
        '',
        '',
        '分页后只剩当前页最多 10 条，无法反映全部命中的各类型总数 counts。',
      ],
      answers:[1,2],
      explain:'后端返回纯文本 `snippet`，由前端通过 `createTextNode` + `createElement("mark")` 或 React JSX 渲染高亮，既准确又防 XSS；同时必须先统计全部匹配结果的 `counts`，再按 `type` 过滤和分页；匿名请求则严格排除私有表。',
    },
    {
      id:'pj-notes-7',
      type:'judge',
      q:'将规范化后的标签存成逗号分隔文本，并用 `\',\' || tags || \',\' LIKE \'%,' + 'go' + ',%\'` 查询，可以避免搜索标签 `go` 时误命中 `golang`。',
      answer:true,
      explain:'正确。在存储字段前后和查询词前后同时加上逗号边界（注意查询词本身也应转义并禁用输入逗号），`go` 就只会匹配 `,go,`，不会误匹配 `,golang,`。',
    },
    {
      id:'pj-notes-8',
      type:'short',
      q:'请说明 `GET /api/search` 为什么要在过滤 `type` 和分页之前统计 `counts`，以及当请求带与不带登录态时检索范围分别是怎样控制的。',
      reference:'1. 先在全部匹配结果上统计 question、custom、note 的命中数 counts，再按 type 过滤并按 page/size 分页切片，这样即使用户切换到“只看笔记”或翻到第 2 页，页面顶部的各分类计数标签依然显示完整准确的命中数。\n2. 身份通过可选会话解析得到：未登录（或会话无效）时 user_id 设为 0，SQL 只会命中公共题库 questions，私有表 my_questions 和 notes 返回 0 条；已登录时仅用当前会话的 user_id 过滤私有表，实现数据隔离。',
      points:[
        '先统计全部三类来源的命中计数 counts',
        '再按 type 过滤并分页切片 items',
        '未登录时仅检索公共题库（user_id 为 0 不命中私有数据）',
        '已登录时仅结合会话中的 user_id 检索本人私有题与笔记',
      ],
      explain:'把“全量计数”与“过滤分页”分两步处理，再配合基于可信会话的按用户过滤，就能同时兼顾前端交互体验与数据隔离安全。',
    },
    {
      id:'pj-notes-code-1',
      type:'code',
      q:'实现全站统一搜索的辅助处理逻辑：1）编写 `escape_like(q)` 对反斜杠、`%`、`_` 转义；2）编写 `make_snippet(text, q)` 折叠空白并在关键词首次出现位置前后截取上下文摘要；3）编写 `merge_search(q, type_filter, page, size, questions, customs, notes)`，对清洗后的关键词不区分大小写匹配三路数据，先统计 `counts` 再按 `type_filter` 过滤并分页返回 `{items, total, page, size, counts}`。',
      code:`def escape_like(q: str) -> str:
    # TODO 1：去掉首尾空格后，先转义 \\ 再转义 % 和 _
    ...

def make_snippet(text: str, q: str) -> str:
    # TODO 2：折叠空白，不区分大小写找 q，截取前后 15 / 45 字符并按需加 "…"
    ...

def merge_search(q: str, type_filter: str, page: int, size: int, questions, customs, notes):
    # TODO 3：清洗 q（为空返回空结果），匹配三路数据，统计 counts，按 type_filter 过滤并分页
    ...`,
      reference:`def escape_like(q: str) -> str:
    s = q.strip()
    return s.replace("\\\\", "\\\\\\\\").replace("%", "\\\\%").replace("_", "\\\\_")


def make_snippet(text: str, q: str) -> str:
    clean = " ".join((text or "").split())
    if not q:
        return clean[:60] + ("…" if len(clean) > 60 else "")
    idx = clean.lower().find(q.lower())
    if idx < 0:
        return clean[:60] + ("…" if len(clean) > 60 else "")
    start = max(0, idx - 15)
    end = min(len(clean), idx + len(q) + 45)
    return ("…" if start > 0 else "") + clean[start:end] + ("…" if end < len(clean) else "")


def merge_search(q: str, type_filter: str, page: int, size: int, questions, customs, notes):
    kw = q.strip()
    counts = {"question": 0, "custom": 0, "note": 0}
    if not kw:
        return {"items": [], "total": 0, "page": page, "size": size, "counts": counts}
    kl = kw.lower()
    typ = type_filter or "all"
    hits = []
    sources = [
        ("question", questions, lambda r: (r["title"], r["answer"])),
        ("custom", customs, lambda r: (r["title"], r["answer"])),
        ("note", notes, lambda r: (r["title"], r["content"] + " " + r.get("tags", ""))),
    ]
    for kind, rows, fields in sources:
        for r in rows:
            title, body = fields(r)
            if kl in title.lower() or kl in body.lower():
                counts[kind] += 1
                if typ == "all" or typ == kind:
                    hits.append({
                        "type": kind,
                        "id": r["id"],
                        "title": title,
                        "snippet": make_snippet(body, kw),
                    })
    start = max(0, (page - 1) * size)
    return {"items": hits[start:start + size], "total": len(hits), "page": page, "size": size, "counts": counts}`,
      points:[
        'escape_like 先转义反斜杠再转义 % 和 _',
        'make_snippet 折叠空白并做不区分大小写窗口截取且处理边界省略号',
        'merge_search 对空关键词直接返回空分页与全 0 counts',
        '先统计三路命中计数 counts，再按 type_filter 过滤并计算 total 与分页切片',
      ],
      explain:'这道题把第 17 关搜索层的三个纯函数逻辑合在一起考察：转义顺序决定通配符会不会失效，摘要截取保证纯文本输出无 XSS 风险，而先计数再过滤分页保证分类计数准确。',
    },
    {
      id:'pj-notes-go-1',
      stack:'go',
      q:'Go 版本里 `Note` 结构体的 `SourceID` 字段为什么声明为 `*int` 而不是 `int`？',
      options:[
        'Go 的 json 库无法把普通 int 字段转成 JSON 数字',
        'SQLite 里的 INTEGER 主键可能超出 int 的表示范围',
        '只有指针类型才能传进 database/sql 的 Exec 作为参数',
        '独立笔记没有来源编号，*int 为 nil 可区分 NULL 和 0',
      ],
      why:[
        'encoding/json 完全支持直接序列化 int 字段。',
        '64 位平台下 Go 的 int 是 64 位，足以装下 SQLite 的 INTEGER。',
        'database/sql 的 Exec 支持直接传入普通值类型的 int。',
        '',
      ],
      answer:3,
      explain:'`int` 的零值是 `0`，无法表达数据库里的 `NULL`（无关联来源）。使用 `*int` 时，数据库中的 `NULL` 会被 `Scan` 读成 `nil`，序列化成 JSON 就是 `null`。',
    },
    {
      id:'pj-notes-java-1',
      stack:'java',
      q:'Java 版本的 `NOTE_MAPPER` 中为什么写 `rs.getObject("source_id") == null ? null : rs.getInt("source_id")`，而不是直接调用 `rs.getInt("source_id")`？',
      options:[
        '数据库该列为 NULL 时 getInt 会悄悄返回 0',
        'getInt 遇到 NULL 值时会直接抛出空指针异常',
        'RowMapper 接口规定整数列必须先调用 getObject',
        'sqlite-jdbc 的 getInt 只支持读取布尔类型列',
      ],
      why:[
        '',
        'JDBC 的 ResultSet.getInt 在列为 NULL 时按规范返回 0，不会抛空指针异常。',
        'RowMapper 没有这项规定，对非空整数列可以直接用 getInt。',
        'getInt 就是用来读取整数列的，只是无法区分 NULL 与 0。',
      ],
      answer:0,
      explain:'JDBC 规范规定 `rs.getInt` 遇到 SQL `NULL` 会返回 `0`。为了让独立笔记的 `sourceId` 在 JSON 里准确表现为 `null` 而不是 `0`，必须先用 `rs.getObject("source_id") == null` 判空。',
    },
    {
      id:'pj-notes-node-1',
      stack:'node',
      q:'Node.js 使用 `better-sqlite3` 执行 `UPDATE notes ... WHERE id = ? AND user_id = ?` 时，如何判断这条笔记确实存在且属于当前用户？',
      options:[
        '检查返回对象里的 lastInsertRowid 是否大于 0',
        '判断 db.prepare 是否返回了 undefined',
        '检查 run() 返回结果里的 changes 是否大于 0',
        '如果记录不属于该用户，run() 会直接抛出异常',
      ],
      why:[
        'lastInsertRowid 只在 INSERT 插入新行时才有意义，UPDATE 不会更新它。',
        'db.prepare 返回语句对象，只要 SQL 语法合法就不会是 undefined。',
        '',
        'WHERE 条件未命中任何行时 UPDATE 会正常执行结束，不会抛异常。',
      ],
      answer:2,
      explain:'`better-sqlite3` 的 `.run()` 会返回一个包含 `changes` 和 `lastInsertRowid` 的对象。对于带 `WHERE id = ? AND user_id = ?` 的 `UPDATE` 或 `DELETE`，`changes === 0` 说明不存在或不属于当前用户，据此返回 404。',
    },
    {
      id:'pj-notes-python-1',
      stack:'python',
      q:'Python 版本在 `list_notes` 与 `search_sources` 中，为什么坚持把 `(user_id, kw, kw, ...)` 作为参数元组传给 `sqlite3`，而不是用 f-string 拼进 SQL？',
      options:[
        '占位符传参让数据库把单引号当纯文本防 SQL 注入',
        'sqlite3 模块的 execute 方法不支持传入 f-string 字符串',
        '用参数元组可以让 LIKE 模糊匹配自动跳过 % 转义',
        '参数元组会自动为查询结果加上 createdAt 和 updatedAt',
      ],
      why:[
        '',
        'execute 语法上可以接收任意字符串，正因如此才要自觉避免拼接 SQL。',
        '参数绑定只隔离 SQL 结构与数据，LIKE 里的 % 和 _ 仍需 escape_like 转义。',
        '时间字段是表定义中的 DEFAULT CURRENT_TIMESTAMP 自动填充的。',
      ],
      answer:0,
      explain:'参数化占位符会把用户输入严格当成字符串值处理，就算包含单引号 `\'` 或 `--` 也不会改变 SQL 语法结构，从而彻底防住 SQL 注入；配合 `escape_like` 与 `ESCAPE \'\\\'` 则进一步防住通配符误匹配。',
    },
  ],
};
