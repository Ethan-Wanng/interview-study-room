// 项目实战“复刻面试自习室”第 21 关：通知中心、学习故事与反馈闭环。
import type {AiLevel} from '../journey';

export const pjCommunity:AiLevel={id:'pj-community',title:'通知中心、学习故事与反馈',summary:'实现站内未读通知与幂等已读、学习故事 XSS 防护与防刷点赞，以及带限流去重的用户反馈收集闭环',lessons:[
  {title:'这一关做什么：让自习室有社区温度和反馈渠道',body:'第 20 关（第三方登录与账号系统）让更多同学用 GitHub 或 Google 账号快速加入了自习室。有了稳定的账号体系，这一关把自习室从“一个人刷题的工具”升级为有互动、有反馈闭环的社区：\n一、站内通知中心：接收点赞等系统提醒，头部小铃铛显示未读计数，支持分页查看、单条与全部标为已读（幂等），并且严格隔离不同账号的通知；\n二、学习故事社区：同学可以发布刷题或面试故事、给别人点赞。后端对输入做 HTML 转义清洗，前端只按纯文本安全渲染，配合点赞联合主键防刷赞；\n三、配置与反馈闭环：提供用户反馈抽屉与前端全局报错自动收集（client_error），通过指纹去重聚合重复错误、限制载荷体积并接入滑动窗口限流。\n收集到的反馈、报错和社区内容，将在下一关（第 22 关：管理后台、运营看板与权限控制）接入管理员看板进行排查与状态流转。'},
  {title:'站内通知设计：未读计数、分页与幂等已读',body:'通知表 notifications 记录谁（user_id）收到了什么类型（kind）的消息，核心设计有三点：\n一、用 read_at 时间戳代替布尔值 is_read：NULL 表示未读，非 NULL 既表示已读又保留了阅读时间；\n二、把复合索引建在 (user_id, read_at, created_at DESC, id DESC) 上：查未读计数（WHERE user_id = ? AND read_at IS NULL）和按时间倒序分页查询都能命中同一个索引前缀，不用全表扫描；\n三、标为已读必须幂等且严格隔离：用 COALESCE(read_at, CURRENT_TIMESTAMP) 配合 WHERE id = ? AND user_id = ? 更新。首次调用写入当前时间；网络重试再次调用时保留第一次的 read_at，返回 200 且不破坏未读计数；尝试修改他人通知时影响 0 行，返回 404（或显式检查归属返回 403），绝不泄露他人通知。',code:`CREATE TABLE IF NOT EXISTS notifications (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id    INTEGER NOT NULL REFERENCES users(id),
    kind       TEXT    NOT NULL,
    title      TEXT    NOT NULL,
    body       TEXT    NOT NULL DEFAULT '',
    link       TEXT    NOT NULL DEFAULT '',
    read_at    TEXT,
    created_at TEXT    NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_notifications_user_read_created
    ON notifications(user_id, read_at, created_at DESC, id DESC);

GET  /api/notifications?unreadOnly=0&page=1&size=20
→ 200 {"items": [...], "unreadCount": 2, "total": 5, "page": 1, "size": 20}

POST /api/notifications/{id}/read
→ 200 {"id": 7, "readAt": "2026-11-24 07:10:00", "unreadCount": 1}
→ 404 通知不存在或不属于当前用户（显式校验归属时可返回 403）

POST /api/notifications/read-all
→ 200 {"updated": 1, "unreadCount": 0}`,explain:[{at:'CREATE TABLE IF NOT EXISTS notifications (',to:');',text:'notifications 表：read_at 为空表示未读；kind 区分通知类型（如 story_like）；link 存点击后跳转的页面地址。'},{at:'CREATE INDEX IF NOT EXISTS idx_notifications_user_read_created',to:'ON notifications(user_id, read_at, created_at DESC, id DESC);',text:'复合索引按“用户 → 已读时间 → 创建时间倒序”排列，同时加速未读数统计（read_at IS NULL）和收件箱分页查询。'},{at:'GET  /api/notifications?unreadOnly=0&page=1&size=20',to:'→ 200 {"items": [...], "unreadCount": 2, "total": 5, "page": 1, "size": 20}',text:'通知列表接口：需要登录（401）。支持 unreadOnly=1 只看未读，同时返回总未读数供前端小铃铛角标使用。'},{at:'POST /api/notifications/{id}/read',to:'→ 404 通知不存在或不属于当前用户（显式校验归属时可返回 403）',text:'单条标为已读：用 COALESCE(read_at, CURRENT_TIMESTAMP) 保证重复请求幂等并保留首次已读时间；按 id 和 user_id 一起过滤防止越权。'},{at:'POST /api/notifications/read-all',to:'→ 200 {"updated": 1, "unreadCount": 0}',text:'一键全部已读：只更新 read_at IS NULL 的行，重复调用时 updated 为 0、unreadCount 为 0，同样幂等。'}]},
  {title:'学习故事分享：内容清洗（防 XSS）与防刷限流',body:'学习故事来自用户自己填写，必须防住两类常见攻击：\n一、XSS（跨站脚本）：如果用户在故事里写入 <script>alert(1)</script> 或 <img src=x onerror=…>，直接拼进 HTML 就会在他人浏览器执行。我们采用“后端清洗 + 前端安全渲染”双层防线：后端先去除首尾空白并校验长度（标题 1–80 字、正文 1–2000 字），再对 & < > " \' 做 HTML 实体转义，保证原始 <script> 不会出现在接口返回和存储中（若未来支持富文本或 Markdown，需使用白名单清洗库如 bluemonday、DOMPurify 或 bleach，不要自己写黑名单正则）；前端依然坚持用 textContent 或 JSX 文本插值，绝不用 innerHTML；\n二、防刷赞：建 story_likes 表并设联合主键 PRIMARY KEY (story_id, user_id)。在事务里先执行 INSERT OR IGNORE，只有确实插入新行（受影响行数 > 0）才给 stories.likes_count 加 1 并给作者发一条站内通知，连续点击或并发请求也不会重复计数；\n三、防刷限流：相比固定时间窗口在跨分钟边界可能放行两倍突发流量，我们用“滑动窗口”按时间戳精确控制每分钟请求上限。',code:`CREATE TABLE IF NOT EXISTS stories (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id     INTEGER NOT NULL REFERENCES users(id),
    title       TEXT    NOT NULL,
    content     TEXT    NOT NULL,
    likes_count INTEGER NOT NULL DEFAULT 0,
    created_at  TEXT    NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS story_likes (
    story_id   INTEGER NOT NULL REFERENCES stories(id),
    user_id    INTEGER NOT NULL REFERENCES users(id),
    created_at TEXT    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (story_id, user_id)
);

GET  /api/stories?page=1&size=20      → 200 {"items": [...], "total": 1, "page": 1, "size": 20}
POST /api/stories                     → 201 {"id": 1, "title": "&lt;script&gt;…", ...}
POST /api/stories/{id}/like           → 200 {"storyId": 1, "likesCount": 1, "liked": true}

滑动窗口限流规则（窗口 windowMs，上限 limit）：
1. cutoff = nowMs - windowMs，丢弃所有 < cutoff 的旧时间戳
2. 若 limit <= 0 或剩余数量 >= limit，拒绝并返回 false（不写入 nowMs）
3. 否则追加 nowMs 并返回 true`,explain:[{at:'CREATE TABLE IF NOT EXISTS stories (',to:');',text:'stories 表保存学习故事和冗余计数 likes_count，避免每次列表都要 COUNT JOIN 点赞表。'},{at:'CREATE TABLE IF NOT EXISTS story_likes (',to:');',text:'点赞关系表：联合主键 (story_id, user_id) 从数据库层面保证同一个用户对同一篇故事只能点一次赞。'},{at:'GET  /api/stories?page=1&size=20',to:'POST /api/stories/{id}/like           → 200 {"storyId": 1, "likesCount": 1, "liked": true}',text:'故事列表公开可读；发布与点赞需要登录（401）。发布时转义 HTML 特殊字符；首次点赞时才加一并通知作者（自己赞自己不发通知）。'},{at:'滑动窗口限流规则（窗口 windowMs，上限 limit）：',to:'3. 否则追加 nowMs 并返回 true',text:'滑动窗口算法：先清理窗口之外的旧记录，再判断是否超限；被拒绝的请求绝不记录进窗口，防止重试把窗口永远堵死。'}]},
  {title:'配置与错误收集：让问题在用户开口前被发现',body:'很多线上 bug 用户不会专门反馈，而是直接关掉网页。这一关把“主动反馈（bug / idea）”和“前端自动捕获报错（client_error）”统一收到 feedback 表里：\n一、前端全局监听：在浏览器监听 error 和 unhandledrejection 事件，页面一报错就静默上报页面路径与错误信息；\n二、载荷大小限制：单次上报请求体限制在 16 KB 以内（超出返回 413），message 最长 1000 字、page 最长 200 字，防止恶意发送超大堆栈撑爆 SQLite；\n三、指纹去重（deduplication key）：同一个页面上的同一个 JS 报错可能在一小时内触发几百次。我们对 client_error 用“页面 + 首行报错”生成 SHA-256 指纹 fingerprint，并建立部分唯一索引 WHERE fingerprint != \'\' AND status = \'open\'。重复报错不再新建行，而是用 ON CONFLICT … DO UPDATE 把 occurrences 加 1；\n四、滑动窗口限流：按当前用户（或匿名请求 IP）限流，默认每 60 秒最多 5 次（FEEDBACK_RATE_LIMIT），超限返回 429；\n五、衔接第 22 关：所有收集上来的记录默认 status = \'open\'，第 22 关管理后台会按 occurrences 排障并支持标记为 resolved；一旦解决后再次复发，部分唯一索引会自动允许新建一条待处理工单。',code:`CREATE TABLE IF NOT EXISTS feedback (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id     INTEGER REFERENCES users(id),
    kind        TEXT    NOT NULL,
    message     TEXT    NOT NULL,
    page        TEXT    NOT NULL DEFAULT '',
    fingerprint TEXT    NOT NULL DEFAULT '',
    occurrences INTEGER NOT NULL DEFAULT 1,
    status      TEXT    NOT NULL DEFAULT 'open',
    created_at  TEXT    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at  TEXT    NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_feedback_open_fp
    ON feedback(kind, fingerprint)
    WHERE fingerprint != '' AND status = 'open';

POST /api/feedback  {"kind": "client_error", "message": "TypeError: …", "page": "/question.html"}
→ 201 / 200 {"id": 1, "kind": "client_error", "occurrences": 2, "status": "open"}
→ 400 类型或长度不合法 · 413 载荷超过 16 KB · 429 超过滑动窗口限流

GET  /api/feedback  → 200 [{"id": 3, "kind": "idea", "message": "…", "status": "open", ...}]`,explain:[{at:'CREATE TABLE IF NOT EXISTS feedback (',to:');',text:'feedback 表：user_id 可为空（未登录页面报错也能收集）；occurrences 记录同类错误累计触发了多少次；status 预留给第 22 关管理员处理。'},{at:'CREATE UNIQUE INDEX IF NOT EXISTS idx_feedback_open_fp',to:"WHERE fingerprint != '' AND status = 'open';",text:'部分唯一索引：只对带有非空 fingerprint 且未解决（open）的记录去重；普通手工反馈（fingerprint 为空）或已解决（resolved）后复发的错误仍会各自成行。'},{at:'POST /api/feedback',to:'→ 400 类型或长度不合法 · 413 载荷超过 16 KB · 429 超过滑动窗口限流',text:'统一收集接口：先校验体大小与格式，再走滑动窗口限流，最后用 UPSERT 合并相同报错。'},{at:'GET  /api/feedback',to:'"status": "open", ...}]',text:'个人反馈列表需要登录（401），只返回当前用户自己的提交记录，方便查看管理员处理进展。'}]},
  {title:'任务一：通知列表、已读和反馈数据访问层',body:'新建社区数据访问层，建好 notifications、stories、story_likes、feedback 四张表及索引，并补全幂等已读、事务点赞和错误指纹 UPSERT 四个核心数据库操作。',variants:{go:{practice:{steps:['新建 internal/store/community.go，读懂表结构与列表查询，补完 TODO 1 到 4。','运行 go build ./... 确认能通过编译。'],expect:'go build ./... 没有输出'},code:`// internal/store/community.go
package store

import (
    "database/sql"
    "errors"
)

type Notification struct {
    ID        int     \`json:"id"\`
    Kind      string  \`json:"kind"\`
    Title     string  \`json:"title"\`
    Body      string  \`json:"body"\`
    Link      string  \`json:"link"\`
    ReadAt    *string \`json:"readAt"\`
    CreatedAt string  \`json:"createdAt"\`
}

type Story struct {
    ID         int    \`json:"id"\`
    UserID     int    \`json:"userId"\`
    Author     string \`json:"author"\`
    Title      string \`json:"title"\`
    Content    string \`json:"content"\`
    LikesCount int    \`json:"likesCount"\`
    LikedByMe  bool   \`json:"likedByMe"\`
    CreatedAt  string \`json:"createdAt"\`
}

type FeedbackItem struct {
    ID          int    \`json:"id"\`
    Kind        string \`json:"kind"\`
    Message     string \`json:"message"\`
    Page        string \`json:"page"\`
    Occurrences int    \`json:"occurrences"\`
    Status      string \`json:"status"\`
    CreatedAt   string \`json:"createdAt"\`
    UpdatedAt   string \`json:"updatedAt"\`
}

var communitySchema = []string{
    \`CREATE TABLE IF NOT EXISTS notifications (
        id         INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id    INTEGER NOT NULL REFERENCES users(id),
        kind       TEXT    NOT NULL,
        title      TEXT    NOT NULL,
        body       TEXT    NOT NULL DEFAULT '',
        link       TEXT    NOT NULL DEFAULT '',
        read_at    TEXT,
        created_at TEXT    NOT NULL DEFAULT CURRENT_TIMESTAMP
    )\`,
    \`CREATE INDEX IF NOT EXISTS idx_notifications_user_read_created
        ON notifications(user_id, read_at, created_at DESC, id DESC)\`,
    \`CREATE TABLE IF NOT EXISTS stories (
        id          INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id     INTEGER NOT NULL REFERENCES users(id),
        title       TEXT    NOT NULL,
        content     TEXT    NOT NULL,
        likes_count INTEGER NOT NULL DEFAULT 0,
        created_at  TEXT    NOT NULL DEFAULT CURRENT_TIMESTAMP
    )\`,
    \`CREATE TABLE IF NOT EXISTS story_likes (
        story_id   INTEGER NOT NULL REFERENCES stories(id),
        user_id    INTEGER NOT NULL REFERENCES users(id),
        created_at TEXT    NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (story_id, user_id)
    )\`,
    \`CREATE TABLE IF NOT EXISTS feedback (
        id          INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id     INTEGER REFERENCES users(id),
        kind        TEXT    NOT NULL,
        message     TEXT    NOT NULL,
        page        TEXT    NOT NULL DEFAULT '',
        fingerprint TEXT    NOT NULL DEFAULT '',
        occurrences INTEGER NOT NULL DEFAULT 1,
        status      TEXT    NOT NULL DEFAULT 'open',
        created_at  TEXT    NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at  TEXT    NOT NULL DEFAULT CURRENT_TIMESTAMP
    )\`,
    \`CREATE UNIQUE INDEX IF NOT EXISTS idx_feedback_open_fp
        ON feedback(kind, fingerprint) WHERE fingerprint != '' AND status = 'open'\`,
}

type CommunityStore struct {
    db *sql.DB
}

func NewCommunityStore(db *sql.DB) (*CommunityStore, error) {
    for _, stmt := range communitySchema {
        if _, err := db.Exec(stmt); err != nil {
            return nil, err
        }
    }
    return &CommunityStore{db: db}, nil
}

func (s *CommunityStore) CreateNotification(userID int, kind, title, body, link string) error {
    _, err := s.db.Exec(
        "INSERT INTO notifications (user_id, kind, title, body, link) VALUES (?, ?, ?, ?, ?)",
        userID, kind, title, body, link,
    )
    return err
}

func (s *CommunityStore) UnreadCount(userID int) (int, error) {
    var n int
    err := s.db.QueryRow("SELECT COUNT(*) FROM notifications WHERE user_id = ? AND read_at IS NULL", userID).Scan(&n)
    return n, err
}

func (s *CommunityStore) ListNotifications(userID int, unreadOnly bool, page, size int) ([]Notification, int, int, error) {
    unreadFlag := 0
    if unreadOnly {
        unreadFlag = 1
    }
    var total int
    err := s.db.QueryRow(
        "SELECT COUNT(*) FROM notifications WHERE user_id = ? AND (? = 0 OR read_at IS NULL)",
        userID, unreadFlag,
    ).Scan(&total)
    if err != nil {
        return nil, 0, 0, err
    }
    unread, err := s.UnreadCount(userID)
    if err != nil {
        return nil, 0, 0, err
    }
    rows, err := s.db.Query(
        \`SELECT id, kind, title, body, link, read_at, created_at
         FROM notifications
         WHERE user_id = ? AND (? = 0 OR read_at IS NULL)
         ORDER BY created_at DESC, id DESC LIMIT ? OFFSET ?\`,
        userID, unreadFlag, size, (page-1)*size,
    )
    if err != nil {
        return nil, 0, 0, err
    }
    defer rows.Close()
    items := []Notification{}
    for rows.Next() {
        var n Notification
        if err := rows.Scan(&n.ID, &n.Kind, &n.Title, &n.Body, &n.Link, &n.ReadAt, &n.CreatedAt); err != nil {
            return nil, 0, 0, err
        }
        items = append(items, n)
    }
    return items, unread, total, rows.Err()
}

// MarkNotificationRead 幂等把一条通知标为已读；不存在或不属于该用户返回 ErrNotFound。
func (s *CommunityStore) MarkNotificationRead(userID, notifID int) (Notification, error) {
    // TODO 1：用 UPDATE notifications SET read_at = COALESCE(read_at, CURRENT_TIMESTAMP)
    //         WHERE id = ? AND user_id = ? RETURNING id, kind, title, body, link, read_at, created_at；
    //         Scan 返回 sql.ErrNoRows 时返回 ErrNotFound
    return Notification{}, nil
}

// MarkAllNotificationsRead 把当前用户的未读通知全部标为已读，返回本次更新条数。
func (s *CommunityStore) MarkAllNotificationsRead(userID int) (int, error) {
    // TODO 2：执行 UPDATE notifications SET read_at = CURRENT_TIMESTAMP WHERE user_id = ? AND read_at IS NULL，
    //         用 RowsAffected() 返回更新的条数
    return 0, nil
}

func (s *CommunityStore) CreateStory(userID int, title, content string) (Story, error) {
    var st Story
    err := s.db.QueryRow(
        \`INSERT INTO stories (user_id, title, content) VALUES (?, ?, ?)
         RETURNING id, user_id, title, content, likes_count, created_at\`,
        userID, title, content,
    ).Scan(&st.ID, &st.UserID, &st.Title, &st.Content, &st.LikesCount, &st.CreatedAt)
    if err != nil {
        return st, err
    }
    _ = s.db.QueryRow("SELECT username FROM users WHERE id = ?", userID).Scan(&st.Author)
    return st, nil
}

func (s *CommunityStore) ListStories(viewerID, page, size int) ([]Story, int, error) {
    var total int
    if err := s.db.QueryRow("SELECT COUNT(*) FROM stories").Scan(&total); err != nil {
        return nil, 0, err
    }
    rows, err := s.db.Query(
        \`SELECT s.id, s.user_id, u.username, s.title, s.content, s.likes_count,
                EXISTS(SELECT 1 FROM story_likes l WHERE l.story_id = s.id AND l.user_id = ?),
                s.created_at
         FROM stories s JOIN users u ON u.id = s.user_id
         ORDER BY s.id DESC LIMIT ? OFFSET ?\`,
        viewerID, size, (page-1)*size,
    )
    if err != nil {
        return nil, 0, err
    }
    defer rows.Close()
    items := []Story{}
    for rows.Next() {
        var st Story
        if err := rows.Scan(&st.ID, &st.UserID, &st.Author, &st.Title, &st.Content,
            &st.LikesCount, &st.LikedByMe, &st.CreatedAt); err != nil {
            return nil, 0, err
        }
        items = append(items, st)
    }
    return items, total, rows.Err()
}

// LikeStory 在事务里完成去重点赞并更新计数，返回最新赞数、是否首次点赞、作者 ID 与标题。
func (s *CommunityStore) LikeStory(userID, storyID int) (likesCount int, newlyLiked bool, authorID int, title string, err error) {
    // TODO 3：开启事务（defer tx.Rollback()）；先查故事的 user_id 和 title（sql.ErrNoRows 返回 ErrNotFound）；
    //         执行 INSERT OR IGNORE INTO story_likes (story_id, user_id) VALUES (?, ?)；
    //         RowsAffected() > 0 时才把 newlyLiked 设为 true 并更新 stories.likes_count = likes_count + 1；
    //         再查最新的 likes_count 并 tx.Commit()
    return 0, false, 0, "", errors.New("not implemented")
}

// SubmitFeedback 保存反馈或客户端报错；若存在相同未关闭的指纹则累加 occurrences。
func (s *CommunityStore) SubmitFeedback(userID *int, kind, message, page, fingerprint string) (FeedbackItem, error) {
    // TODO 4：执行 INSERT INTO feedback (user_id, kind, message, page, fingerprint) VALUES (?, ?, ?, ?, ?)
    //         ON CONFLICT(kind, fingerprint) WHERE fingerprint != '' AND status = 'open'
    //         DO UPDATE SET occurrences = occurrences + 1, updated_at = CURRENT_TIMESTAMP
    //         RETURNING id, kind, message, page, occurrences, status, created_at, updated_at
    return FeedbackItem{}, nil
}

func (s *CommunityStore) ListMyFeedback(userID int) ([]FeedbackItem, error) {
    rows, err := s.db.Query(
        \`SELECT id, kind, message, page, occurrences, status, created_at, updated_at
         FROM feedback WHERE user_id = ? ORDER BY id DESC LIMIT 50\`,
        userID,
    )
    if err != nil {
        return nil, err
    }
    defer rows.Close()
    items := []FeedbackItem{}
    for rows.Next() {
        var f FeedbackItem
        if err := rows.Scan(&f.ID, &f.Kind, &f.Message, &f.Page, &f.Occurrences,
            &f.Status, &f.CreatedAt, &f.UpdatedAt); err != nil {
            return nil, err
        }
        items = append(items, f)
    }
    return items, rows.Err()
}`,explain:[{at:'// internal/store/community.go',to:')',text:'新建社区数据访问层，负责通知、学习故事和反馈三组表。'},{at:'type Notification struct {',to:'}',text:'通知结构体：ReadAt 用 *string 指针，未读时对应数据库 NULL，JSON 序列化为 null。'},{at:'type Story struct {',to:'}',text:'学习故事结构体：包含作者名和当前查看者是否点过赞（LikedByMe）。'},{at:'type FeedbackItem struct {',to:'}',text:'反馈与客户端报错条目：occurrences 记录相同报错累计发生了几次。'},{at:'var communitySchema = []string{',to:'}',text:'四张表与两个关键索引：通知复合索引加速未读和分页；feedback 的部分唯一索引对带指纹的未关闭报错做去重。'},{at:'type CommunityStore struct {',to:'return &CommunityStore{db: db}, nil',text:'沿用现有 db 连接池并在启动时建表。'},{at:'func (s *CommunityStore) CreateNotification(',to:'return err',text:'写入一条新通知（例如有人点赞你的故事时触发）。'},{at:'func (s *CommunityStore) UnreadCount(',to:'return n, err',text:'统计某用户的未读通知数量，命中 (user_id, read_at) 索引前缀。'},{at:'func (s *CommunityStore) ListNotifications(',to:'return items, unread, total, rows.Err()',text:'分页查询通知：通过 unreadFlag 参数在一个 SQL 里同时支持“全部”和“仅未读”，并返回当前未读总数。'},{at:'func (s *CommunityStore) MarkNotificationRead(',to:'return Notification{}, nil',text:'单条幂等已读，要你补全。'},{at:'func (s *CommunityStore) MarkAllNotificationsRead(',to:'return 0, nil',text:'全部已读，要你补全。'},{at:'func (s *CommunityStore) CreateStory(',to:'return st, nil',text:'插入故事并用 RETURNING 拿回自增 ID 与时间戳，再补查作者用户名。'},{at:'func (s *CommunityStore) ListStories(',to:'return items, total, rows.Err()',text:'分页查询故事：EXISTS 子查询检查当前登录用户（未登录传 0）是否赞过该故事。'},{at:'func (s *CommunityStore) LikeStory(',to:'return 0, false, 0, "", errors.New("not implemented")',text:'事务点赞与防重，要你补全。'},{at:'func (s *CommunityStore) SubmitFeedback(',to:'return FeedbackItem{}, nil',text:'反馈与报错去重 UPSERT，要你补全。'},{at:'func (s *CommunityStore) ListMyFeedback(',to:'return items, rows.Err()',text:'查询当前用户提交的反馈列表，按最新倒序最多 50 条。'}],solution:{code:`// internal/store/community.go
package store

import (
    "database/sql"
    "errors"
)

type Notification struct {
    ID        int     \`json:"id"\`
    Kind      string  \`json:"kind"\`
    Title     string  \`json:"title"\`
    Body      string  \`json:"body"\`
    Link      string  \`json:"link"\`
    ReadAt    *string \`json:"readAt"\`
    CreatedAt string  \`json:"createdAt"\`
}

type Story struct {
    ID         int    \`json:"id"\`
    UserID     int    \`json:"userId"\`
    Author     string \`json:"author"\`
    Title      string \`json:"title"\`
    Content    string \`json:"content"\`
    LikesCount int    \`json:"likesCount"\`
    LikedByMe  bool   \`json:"likedByMe"\`
    CreatedAt  string \`json:"createdAt"\`
}

type FeedbackItem struct {
    ID          int    \`json:"id"\`
    Kind        string \`json:"kind"\`
    Message     string \`json:"message"\`
    Page        string \`json:"page"\`
    Occurrences int    \`json:"occurrences"\`
    Status      string \`json:"status"\`
    CreatedAt   string \`json:"createdAt"\`
    UpdatedAt   string \`json:"updatedAt"\`
}

var communitySchema = []string{
    \`CREATE TABLE IF NOT EXISTS notifications (
        id         INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id    INTEGER NOT NULL REFERENCES users(id),
        kind       TEXT    NOT NULL,
        title      TEXT    NOT NULL,
        body       TEXT    NOT NULL DEFAULT '',
        link       TEXT    NOT NULL DEFAULT '',
        read_at    TEXT,
        created_at TEXT    NOT NULL DEFAULT CURRENT_TIMESTAMP
    )\`,
    \`CREATE INDEX IF NOT EXISTS idx_notifications_user_read_created
        ON notifications(user_id, read_at, created_at DESC, id DESC)\`,
    \`CREATE TABLE IF NOT EXISTS stories (
        id          INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id     INTEGER NOT NULL REFERENCES users(id),
        title       TEXT    NOT NULL,
        content     TEXT    NOT NULL,
        likes_count INTEGER NOT NULL DEFAULT 0,
        created_at  TEXT    NOT NULL DEFAULT CURRENT_TIMESTAMP
    )\`,
    \`CREATE TABLE IF NOT EXISTS story_likes (
        story_id   INTEGER NOT NULL REFERENCES stories(id),
        user_id    INTEGER NOT NULL REFERENCES users(id),
        created_at TEXT    NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (story_id, user_id)
    )\`,
    \`CREATE TABLE IF NOT EXISTS feedback (
        id          INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id     INTEGER REFERENCES users(id),
        kind        TEXT    NOT NULL,
        message     TEXT    NOT NULL,
        page        TEXT    NOT NULL DEFAULT '',
        fingerprint TEXT    NOT NULL DEFAULT '',
        occurrences INTEGER NOT NULL DEFAULT 1,
        status      TEXT    NOT NULL DEFAULT 'open',
        created_at  TEXT    NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at  TEXT    NOT NULL DEFAULT CURRENT_TIMESTAMP
    )\`,
    \`CREATE UNIQUE INDEX IF NOT EXISTS idx_feedback_open_fp
        ON feedback(kind, fingerprint) WHERE fingerprint != '' AND status = 'open'\`,
}

type CommunityStore struct {
    db *sql.DB
}

func NewCommunityStore(db *sql.DB) (*CommunityStore, error) {
    for _, stmt := range communitySchema {
        if _, err := db.Exec(stmt); err != nil {
            return nil, err
        }
    }
    return &CommunityStore{db: db}, nil
}

func (s *CommunityStore) CreateNotification(userID int, kind, title, body, link string) error {
    _, err := s.db.Exec(
        "INSERT INTO notifications (user_id, kind, title, body, link) VALUES (?, ?, ?, ?, ?)",
        userID, kind, title, body, link,
    )
    return err
}

func (s *CommunityStore) UnreadCount(userID int) (int, error) {
    var n int
    err := s.db.QueryRow("SELECT COUNT(*) FROM notifications WHERE user_id = ? AND read_at IS NULL", userID).Scan(&n)
    return n, err
}

func (s *CommunityStore) ListNotifications(userID int, unreadOnly bool, page, size int) ([]Notification, int, int, error) {
    unreadFlag := 0
    if unreadOnly {
        unreadFlag = 1
    }
    var total int
    err := s.db.QueryRow(
        "SELECT COUNT(*) FROM notifications WHERE user_id = ? AND (? = 0 OR read_at IS NULL)",
        userID, unreadFlag,
    ).Scan(&total)
    if err != nil {
        return nil, 0, 0, err
    }
    unread, err := s.UnreadCount(userID)
    if err != nil {
        return nil, 0, 0, err
    }
    rows, err := s.db.Query(
        \`SELECT id, kind, title, body, link, read_at, created_at
         FROM notifications
         WHERE user_id = ? AND (? = 0 OR read_at IS NULL)
         ORDER BY created_at DESC, id DESC LIMIT ? OFFSET ?\`,
        userID, unreadFlag, size, (page-1)*size,
    )
    if err != nil {
        return nil, 0, 0, err
    }
    defer rows.Close()
    items := []Notification{}
    for rows.Next() {
        var n Notification
        if err := rows.Scan(&n.ID, &n.Kind, &n.Title, &n.Body, &n.Link, &n.ReadAt, &n.CreatedAt); err != nil {
            return nil, 0, 0, err
        }
        items = append(items, n)
    }
    return items, unread, total, rows.Err()
}

// MarkNotificationRead 幂等把一条通知标为已读；不存在或不属于该用户返回 ErrNotFound。
func (s *CommunityStore) MarkNotificationRead(userID, notifID int) (Notification, error) {
    var n Notification
    err := s.db.QueryRow(
        \`UPDATE notifications SET read_at = COALESCE(read_at, CURRENT_TIMESTAMP)
         WHERE id = ? AND user_id = ?
         RETURNING id, kind, title, body, link, read_at, created_at\`,
        notifID, userID,
    ).Scan(&n.ID, &n.Kind, &n.Title, &n.Body, &n.Link, &n.ReadAt, &n.CreatedAt)
    if errors.Is(err, sql.ErrNoRows) {
        return n, ErrNotFound
    }
    return n, err
}

// MarkAllNotificationsRead 把当前用户的未读通知全部标为已读，返回本次更新条数。
func (s *CommunityStore) MarkAllNotificationsRead(userID int) (int, error) {
    res, err := s.db.Exec(
        "UPDATE notifications SET read_at = CURRENT_TIMESTAMP WHERE user_id = ? AND read_at IS NULL",
        userID,
    )
    if err != nil {
        return 0, err
    }
    n, err := res.RowsAffected()
    return int(n), err
}

func (s *CommunityStore) CreateStory(userID int, title, content string) (Story, error) {
    var st Story
    err := s.db.QueryRow(
        \`INSERT INTO stories (user_id, title, content) VALUES (?, ?, ?)
         RETURNING id, user_id, title, content, likes_count, created_at\`,
        userID, title, content,
    ).Scan(&st.ID, &st.UserID, &st.Title, &st.Content, &st.LikesCount, &st.CreatedAt)
    if err != nil {
        return st, err
    }
    _ = s.db.QueryRow("SELECT username FROM users WHERE id = ?", userID).Scan(&st.Author)
    return st, nil
}

func (s *CommunityStore) ListStories(viewerID, page, size int) ([]Story, int, error) {
    var total int
    if err := s.db.QueryRow("SELECT COUNT(*) FROM stories").Scan(&total); err != nil {
        return nil, 0, err
    }
    rows, err := s.db.Query(
        \`SELECT s.id, s.user_id, u.username, s.title, s.content, s.likes_count,
                EXISTS(SELECT 1 FROM story_likes l WHERE l.story_id = s.id AND l.user_id = ?),
                s.created_at
         FROM stories s JOIN users u ON u.id = s.user_id
         ORDER BY s.id DESC LIMIT ? OFFSET ?\`,
        viewerID, size, (page-1)*size,
    )
    if err != nil {
        return nil, 0, err
    }
    defer rows.Close()
    items := []Story{}
    for rows.Next() {
        var st Story
        if err := rows.Scan(&st.ID, &st.UserID, &st.Author, &st.Title, &st.Content,
            &st.LikesCount, &st.LikedByMe, &st.CreatedAt); err != nil {
            return nil, 0, err
        }
        items = append(items, st)
    }
    return items, total, rows.Err()
}

// LikeStory 在事务里完成去重点赞并更新计数，返回最新赞数、是否首次点赞、作者 ID 与标题。
func (s *CommunityStore) LikeStory(userID, storyID int) (likesCount int, newlyLiked bool, authorID int, title string, err error) {
    tx, err := s.db.Begin()
    if err != nil {
        return 0, false, 0, "", err
    }
    defer tx.Rollback()
    err = tx.QueryRow("SELECT user_id, title FROM stories WHERE id = ?", storyID).Scan(&authorID, &title)
    if errors.Is(err, sql.ErrNoRows) {
        return 0, false, 0, "", ErrNotFound
    }
    if err != nil {
        return 0, false, 0, "", err
    }
    res, err := tx.Exec("INSERT OR IGNORE INTO story_likes (story_id, user_id) VALUES (?, ?)", storyID, userID)
    if err != nil {
        return 0, false, 0, "", err
    }
    added, err := res.RowsAffected()
    if err != nil {
        return 0, false, 0, "", err
    }
    if added > 0 {
        newlyLiked = true
        if _, err := tx.Exec("UPDATE stories SET likes_count = likes_count + 1 WHERE id = ?", storyID); err != nil {
            return 0, false, 0, "", err
        }
    }
    if err := tx.QueryRow("SELECT likes_count FROM stories WHERE id = ?", storyID).Scan(&likesCount); err != nil {
        return 0, false, 0, "", err
    }
    return likesCount, newlyLiked, authorID, title, tx.Commit()
}

// SubmitFeedback 保存反馈或客户端报错；若存在相同未关闭的指纹则累加 occurrences。
func (s *CommunityStore) SubmitFeedback(userID *int, kind, message, page, fingerprint string) (FeedbackItem, error) {
    var f FeedbackItem
    err := s.db.QueryRow(
        \`INSERT INTO feedback (user_id, kind, message, page, fingerprint) VALUES (?, ?, ?, ?, ?)
         ON CONFLICT(kind, fingerprint) WHERE fingerprint != '' AND status = 'open'
         DO UPDATE SET occurrences = occurrences + 1, updated_at = CURRENT_TIMESTAMP
         RETURNING id, kind, message, page, occurrences, status, created_at, updated_at\`,
        userID, kind, message, page, fingerprint,
    ).Scan(&f.ID, &f.Kind, &f.Message, &f.Page, &f.Occurrences, &f.Status, &f.CreatedAt, &f.UpdatedAt)
    return f, err
}

func (s *CommunityStore) ListMyFeedback(userID int) ([]FeedbackItem, error) {
    rows, err := s.db.Query(
        \`SELECT id, kind, message, page, occurrences, status, created_at, updated_at
         FROM feedback WHERE user_id = ? ORDER BY id DESC LIMIT 50\`,
        userID,
    )
    if err != nil {
        return nil, err
    }
    defer rows.Close()
    items := []FeedbackItem{}
    for rows.Next() {
        var f FeedbackItem
        if err := rows.Scan(&f.ID, &f.Kind, &f.Message, &f.Page, &f.Occurrences,
            &f.Status, &f.CreatedAt, &f.UpdatedAt); err != nil {
            return nil, err
        }
        items = append(items, f)
    }
    return items, rows.Err()
}`,explain:[{at:'// internal/store/community.go',to:')',text:'新建社区数据访问层，负责通知、学习故事和反馈三组表。'},{at:'type Notification struct {',to:'}',text:'通知结构体：ReadAt 用 *string 指针，未读时对应数据库 NULL，JSON 序列化为 null。'},{at:'type Story struct {',to:'}',text:'学习故事结构体：包含作者名和当前查看者是否点过赞（LikedByMe）。'},{at:'type FeedbackItem struct {',to:'}',text:'反馈与客户端报错条目：occurrences 记录相同报错累计发生了几次。'},{at:'var communitySchema = []string{',to:'}',text:'四张表与两个关键索引：通知复合索引加速未读和分页；feedback 的部分唯一索引对带指纹的未关闭报错做去重。'},{at:'type CommunityStore struct {',to:'return &CommunityStore{db: db}, nil',text:'沿用现有 db 连接池并在启动时建表。'},{at:'func (s *CommunityStore) CreateNotification(',to:'return err',text:'写入一条新通知（例如有人点赞你的故事时触发）。'},{at:'func (s *CommunityStore) UnreadCount(',to:'return n, err',text:'统计某用户的未读通知数量，命中 (user_id, read_at) 索引前缀。'},{at:'func (s *CommunityStore) ListNotifications(',to:'return items, unread, total, rows.Err()',text:'分页查询通知：通过 unreadFlag 参数在一个 SQL 里同时支持“全部”和“仅未读”，并返回当前未读总数。'},{at:'func (s *CommunityStore) MarkNotificationRead(',to:'return n, err',text:'用 COALESCE(read_at, CURRENT_TIMESTAMP) 保证重复已读不覆盖第一次时间；同时限定 user_id 防止越权，不存在或非本人返回 ErrNotFound。'},{at:'func (s *CommunityStore) MarkAllNotificationsRead(',to:'return int(n), err',text:'只更新未读行（read_at IS NULL），并用 RowsAffected() 统计本次实际改了几条。'},{at:'func (s *CommunityStore) CreateStory(',to:'return st, nil',text:'插入故事并用 RETURNING 拿回自增 ID 与时间戳，再补查作者用户名。'},{at:'func (s *CommunityStore) ListStories(',to:'return items, total, rows.Err()',text:'分页查询故事：EXISTS 子查询检查当前登录用户（未登录传 0）是否赞过该故事。'},{at:'func (s *CommunityStore) LikeStory(',to:'return 0, false, 0, "", ErrNotFound',text:'开启事务后先确认故事存在并拿到作者与标题；不存在时返回 ErrNotFound。'},{at:'return 0, false, 0, "", ErrNotFound',to:'res, err := tx.Exec("INSERT OR IGNORE INTO story_likes',text:'其余数据库查询错误直接返回。'},{at:'res, err := tx.Exec("INSERT OR IGNORE INTO story_likes',to:'return likesCount, newlyLiked, authorID, title, tx.Commit()',text:'INSERT OR IGNORE 配合联合主键去重；只有首次插入成功（added > 0）才给 likes_count 加 1 并标记 newlyLiked，最后查出最新赞数并提交。'},{at:'func (s *CommunityStore) SubmitFeedback(',to:'return f, err',text:'利用部分唯一索引和 ON CONFLICT … DO UPDATE 原子完成“新反馈插入 / 同指纹报错次数累加”，通过 RETURNING 拿回最新记录。'},{at:'func (s *CommunityStore) ListMyFeedback(',to:'return items, rows.Err()',text:'查询当前用户提交的反馈列表，按最新倒序最多 50 条。'}]}},java:{practice:{steps:['按代码第一部分在 schema.sql 最后添加表和索引。','新建 repository/CommunityRepository.java，补完 TODO 1 到 4。','运行 mvnw test 确认能通过编译。'],expect:'BUILD SUCCESS；下一个任务把它们接入服务与控制器'},code:`-- schema.sql（加在文件最后）
CREATE TABLE IF NOT EXISTS notifications (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id    INTEGER NOT NULL REFERENCES users(id),
    kind       TEXT    NOT NULL,
    title      TEXT    NOT NULL,
    body       TEXT    NOT NULL DEFAULT '',
    link       TEXT    NOT NULL DEFAULT '',
    read_at    TEXT,
    created_at TEXT    NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_notifications_user_read_created
    ON notifications(user_id, read_at, created_at DESC, id DESC);
CREATE TABLE IF NOT EXISTS stories (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id     INTEGER NOT NULL REFERENCES users(id),
    title       TEXT    NOT NULL,
    content     TEXT    NOT NULL,
    likes_count INTEGER NOT NULL DEFAULT 0,
    created_at  TEXT    NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS story_likes (
    story_id   INTEGER NOT NULL REFERENCES stories(id),
    user_id    INTEGER NOT NULL REFERENCES users(id),
    created_at TEXT    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (story_id, user_id)
);
CREATE TABLE IF NOT EXISTS feedback (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id     INTEGER REFERENCES users(id),
    kind        TEXT    NOT NULL,
    message     TEXT    NOT NULL,
    page        TEXT    NOT NULL DEFAULT '',
    fingerprint TEXT    NOT NULL DEFAULT '',
    occurrences INTEGER NOT NULL DEFAULT 1,
    status      TEXT    NOT NULL DEFAULT 'open',
    created_at  TEXT    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at  TEXT    NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_feedback_open_fp
    ON feedback(kind, fingerprint) WHERE fingerprint != '' AND status = 'open';

// repository/CommunityRepository.java
package com.example.zixishi.repository;

import java.util.List;
import java.util.Optional;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

@Repository
public class CommunityRepository {

    public record Notification(int id, String kind, String title, String body, String link, String readAt, String createdAt) {}

    public record Story(int id, int userId, String author, String title, String content,
                        int likesCount, boolean likedByMe, String createdAt) {}

    public record LikeResult(int likesCount, boolean newlyLiked, int authorId, String title) {}

    public record FeedbackItem(int id, String kind, String message, String page,
                               int occurrences, String status, String createdAt, String updatedAt) {}

    private static final RowMapper<Notification> NOTIF_MAPPER = (rs, i) -> new Notification(
        rs.getInt("id"), rs.getString("kind"), rs.getString("title"), rs.getString("body"),
        rs.getString("link"), rs.getString("read_at"), rs.getString("created_at"));

    private static final RowMapper<FeedbackItem> FEEDBACK_MAPPER = (rs, i) -> new FeedbackItem(
        rs.getInt("id"), rs.getString("kind"), rs.getString("message"), rs.getString("page"),
        rs.getInt("occurrences"), rs.getString("status"), rs.getString("created_at"), rs.getString("updated_at"));

    private final JdbcTemplate jdbc;

    public CommunityRepository(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    public void createNotification(int userId, String kind, String title, String body, String link) {
        jdbc.update("INSERT INTO notifications (user_id, kind, title, body, link) VALUES (?, ?, ?, ?, ?)",
            userId, kind, title, body, link);
    }

    public int unreadCount(int userId) {
        return jdbc.queryForObject(
            "SELECT COUNT(*) FROM notifications WHERE user_id = ? AND read_at IS NULL",
            Integer.class, userId);
    }

    public int countNotifications(int userId, boolean unreadOnly) {
        int flag = unreadOnly ? 1 : 0;
        return jdbc.queryForObject(
            "SELECT COUNT(*) FROM notifications WHERE user_id = ? AND (? = 0 OR read_at IS NULL)",
            Integer.class, userId, flag);
    }

    public List<Notification> listNotifications(int userId, boolean unreadOnly, int page, int size) {
        int flag = unreadOnly ? 1 : 0;
        return jdbc.query("""
            SELECT id, kind, title, body, link, read_at, created_at FROM notifications
            WHERE user_id = ? AND (? = 0 OR read_at IS NULL)
            ORDER BY created_at DESC, id DESC LIMIT ? OFFSET ?""",
            NOTIF_MAPPER, userId, flag, size, (page - 1) * size);
    }

    // 幂等把一条通知标为已读；不存在或不属于该用户返回空 Optional
    public Optional<Notification> markRead(int userId, int notifId) {
        // TODO 1：用 UPDATE notifications SET read_at = COALESCE(read_at, CURRENT_TIMESTAMP)
        //         WHERE id = ? AND user_id = ? RETURNING id, kind, title, body, link, read_at, created_at
        return Optional.empty();
    }

    // 把当前用户的未读通知全部标为已读，返回更新条数
    public int markAllRead(int userId) {
        // TODO 2：用 jdbc.update 执行 UPDATE notifications SET read_at = CURRENT_TIMESTAMP WHERE user_id = ? AND read_at IS NULL
        return 0;
    }

    public Story createStory(int userId, String title, String content) {
        String author = jdbc.queryForObject("SELECT username FROM users WHERE id = ?", String.class, userId);
        return jdbc.queryForObject("""
            INSERT INTO stories (user_id, title, content) VALUES (?, ?, ?)
            RETURNING id, user_id, title, content, likes_count, created_at""",
            (rs, i) -> new Story(rs.getInt("id"), rs.getInt("user_id"), author, rs.getString("title"),
                rs.getString("content"), rs.getInt("likes_count"), false, rs.getString("created_at")),
            userId, title, content);
    }

    public int countStories() {
        return jdbc.queryForObject("SELECT COUNT(*) FROM stories", Integer.class);
    }

    public List<Story> listStories(int viewerId, int page, int size) {
        return jdbc.query("""
            SELECT s.id, s.user_id, u.username, s.title, s.content, s.likes_count,
                   EXISTS(SELECT 1 FROM story_likes l WHERE l.story_id = s.id AND l.user_id = ?) AS liked,
                   s.created_at
            FROM stories s JOIN users u ON u.id = s.user_id
            ORDER BY s.id DESC LIMIT ? OFFSET ?""",
            (rs, i) -> new Story(rs.getInt("id"), rs.getInt("user_id"), rs.getString("username"),
                rs.getString("title"), rs.getString("content"), rs.getInt("likes_count"),
                rs.getInt("liked") > 0, rs.getString("created_at")),
            viewerId, size, (page - 1) * size);
    }

    // 在事务里完成去重点赞并更新计数，故事不存在时返回空 Optional
    @Transactional
    public Optional<LikeResult> likeStory(int userId, int storyId) {
        // TODO 3：先查故事的 user_id 和 title（为空返回 Optional.empty()）；
        //         用 INSERT OR IGNORE INTO story_likes (story_id, user_id) VALUES (?, ?)，
        //         影响行数 > 0 时给 stories.likes_count 加一；最后查出最新 likes_count 返回
        return Optional.empty();
    }

    // 保存反馈或客户端报错；若存在相同未关闭的指纹则累加 occurrences
    public FeedbackItem submitFeedback(Integer userId, String kind, String message, String page, String fingerprint) {
        // TODO 4：执行 INSERT INTO feedback … ON CONFLICT(kind, fingerprint) WHERE fingerprint != '' AND status = 'open'
        //         DO UPDATE SET occurrences = occurrences + 1, updated_at = CURRENT_TIMESTAMP RETURNING …
        return null;
    }

    public List<FeedbackItem> listMyFeedback(int userId) {
        return jdbc.query("""
            SELECT id, kind, message, page, occurrences, status, created_at, updated_at
            FROM feedback WHERE user_id = ? ORDER BY id DESC LIMIT 50""",
            FEEDBACK_MAPPER, userId);
    }
}`,explain:[{at:'-- schema.sql（加在文件最后）',to:"WHERE fingerprint != '' AND status = 'open';",text:'在 schema.sql 最后添加通知、学习故事、点赞和反馈表及对应索引。'},{at:'// repository/CommunityRepository.java',to:'public class CommunityRepository {',text:'新建社区仓库类，封装全部 JDBC 操作。'},{at:'public record Notification(',to:'int occurrences, String status, String createdAt, String updatedAt) {}',text:'四个结果 record，字段名与 JSON 契约一一对应。'},{at:'private static final RowMapper<Notification>',to:'this.jdbc = jdbc;',text:'定义 RowMapper 并注入 JdbcTemplate。'},{at:'public void createNotification(',to:'userId, kind, title, body, link);',text:'插入一条新通知。'},{at:'public int unreadCount(',to:'Integer.class, userId);',text:'统计某用户的未读通知条数。'},{at:'public int countNotifications(',to:'NOTIF_MAPPER, userId, flag, size, (page - 1) * size);',text:'统计通知总数并按时间倒序分页读取，flag 控制是否只看未读。'},{at:'public Optional<Notification> markRead(',to:'return Optional.empty();',text:'单条幂等已读，要你补全。'},{at:'public int markAllRead(',to:'return 0;',text:'全部已读，要你补全。'},{at:'public Story createStory(',to:'userId, title, content);',text:'插入故事并用 RETURNING 拿回自增 ID 与创建时间。'},{at:'public int countStories()',to:'viewerId, size, (page - 1) * size);',text:'查询故事总数和分页列表，同时算出当前用户是否赞过每条故事。'},{at:'@Transactional',to:'return Optional.empty();',text:'事务点赞与防重，要你补全。'},{at:'public FeedbackItem submitFeedback(',to:'return null;',text:'反馈与报错去重 UPSERT，要你补全。'},{at:'public List<FeedbackItem> listMyFeedback(',to:'FEEDBACK_MAPPER, userId);',text:'查询当前用户提交的反馈历史。'}],solution:{code:`-- schema.sql（加在文件最后）
CREATE TABLE IF NOT EXISTS notifications (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id    INTEGER NOT NULL REFERENCES users(id),
    kind       TEXT    NOT NULL,
    title      TEXT    NOT NULL,
    body       TEXT    NOT NULL DEFAULT '',
    link       TEXT    NOT NULL DEFAULT '',
    read_at    TEXT,
    created_at TEXT    NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_notifications_user_read_created
    ON notifications(user_id, read_at, created_at DESC, id DESC);
CREATE TABLE IF NOT EXISTS stories (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id     INTEGER NOT NULL REFERENCES users(id),
    title       TEXT    NOT NULL,
    content     TEXT    NOT NULL,
    likes_count INTEGER NOT NULL DEFAULT 0,
    created_at  TEXT    NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS story_likes (
    story_id   INTEGER NOT NULL REFERENCES stories(id),
    user_id    INTEGER NOT NULL REFERENCES users(id),
    created_at TEXT    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (story_id, user_id)
);
CREATE TABLE IF NOT EXISTS feedback (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id     INTEGER REFERENCES users(id),
    kind        TEXT    NOT NULL,
    message     TEXT    NOT NULL,
    page        TEXT    NOT NULL DEFAULT '',
    fingerprint TEXT    NOT NULL DEFAULT '',
    occurrences INTEGER NOT NULL DEFAULT 1,
    status      TEXT    NOT NULL DEFAULT 'open',
    created_at  TEXT    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at  TEXT    NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_feedback_open_fp
    ON feedback(kind, fingerprint) WHERE fingerprint != '' AND status = 'open';

// repository/CommunityRepository.java
package com.example.zixishi.repository;

import java.util.List;
import java.util.Optional;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

@Repository
public class CommunityRepository {

    public record Notification(int id, String kind, String title, String body, String link, String readAt, String createdAt) {}

    public record Story(int id, int userId, String author, String title, String content,
                        int likesCount, boolean likedByMe, String createdAt) {}

    public record LikeResult(int likesCount, boolean newlyLiked, int authorId, String title) {}

    public record FeedbackItem(int id, String kind, String message, String page,
                               int occurrences, String status, String createdAt, String updatedAt) {}

    private static final RowMapper<Notification> NOTIF_MAPPER = (rs, i) -> new Notification(
        rs.getInt("id"), rs.getString("kind"), rs.getString("title"), rs.getString("body"),
        rs.getString("link"), rs.getString("read_at"), rs.getString("created_at"));

    private static final RowMapper<FeedbackItem> FEEDBACK_MAPPER = (rs, i) -> new FeedbackItem(
        rs.getInt("id"), rs.getString("kind"), rs.getString("message"), rs.getString("page"),
        rs.getInt("occurrences"), rs.getString("status"), rs.getString("created_at"), rs.getString("updated_at"));

    private final JdbcTemplate jdbc;

    public CommunityRepository(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    public void createNotification(int userId, String kind, String title, String body, String link) {
        jdbc.update("INSERT INTO notifications (user_id, kind, title, body, link) VALUES (?, ?, ?, ?, ?)",
            userId, kind, title, body, link);
    }

    public int unreadCount(int userId) {
        return jdbc.queryForObject(
            "SELECT COUNT(*) FROM notifications WHERE user_id = ? AND read_at IS NULL",
            Integer.class, userId);
    }

    public int countNotifications(int userId, boolean unreadOnly) {
        int flag = unreadOnly ? 1 : 0;
        return jdbc.queryForObject(
            "SELECT COUNT(*) FROM notifications WHERE user_id = ? AND (? = 0 OR read_at IS NULL)",
            Integer.class, userId, flag);
    }

    public List<Notification> listNotifications(int userId, boolean unreadOnly, int page, int size) {
        int flag = unreadOnly ? 1 : 0;
        return jdbc.query("""
            SELECT id, kind, title, body, link, read_at, created_at FROM notifications
            WHERE user_id = ? AND (? = 0 OR read_at IS NULL)
            ORDER BY created_at DESC, id DESC LIMIT ? OFFSET ?""",
            NOTIF_MAPPER, userId, flag, size, (page - 1) * size);
    }

    public Optional<Notification> markRead(int userId, int notifId) {
        return jdbc.query("""
            UPDATE notifications SET read_at = COALESCE(read_at, CURRENT_TIMESTAMP)
            WHERE id = ? AND user_id = ?
            RETURNING id, kind, title, body, link, read_at, created_at""",
            NOTIF_MAPPER, notifId, userId).stream().findFirst();
    }

    public int markAllRead(int userId) {
        return jdbc.update(
            "UPDATE notifications SET read_at = CURRENT_TIMESTAMP WHERE user_id = ? AND read_at IS NULL",
            userId);
    }

    public Story createStory(int userId, String title, String content) {
        String author = jdbc.queryForObject("SELECT username FROM users WHERE id = ?", String.class, userId);
        return jdbc.queryForObject("""
            INSERT INTO stories (user_id, title, content) VALUES (?, ?, ?)
            RETURNING id, user_id, title, content, likes_count, created_at""",
            (rs, i) -> new Story(rs.getInt("id"), rs.getInt("user_id"), author, rs.getString("title"),
                rs.getString("content"), rs.getInt("likes_count"), false, rs.getString("created_at")),
            userId, title, content);
    }

    public int countStories() {
        return jdbc.queryForObject("SELECT COUNT(*) FROM stories", Integer.class);
    }

    public List<Story> listStories(int viewerId, int page, int size) {
        return jdbc.query("""
            SELECT s.id, s.user_id, u.username, s.title, s.content, s.likes_count,
                   EXISTS(SELECT 1 FROM story_likes l WHERE l.story_id = s.id AND l.user_id = ?) AS liked,
                   s.created_at
            FROM stories s JOIN users u ON u.id = s.user_id
            ORDER BY s.id DESC LIMIT ? OFFSET ?""",
            (rs, i) -> new Story(rs.getInt("id"), rs.getInt("user_id"), rs.getString("username"),
                rs.getString("title"), rs.getString("content"), rs.getInt("likes_count"),
                rs.getInt("liked") > 0, rs.getString("created_at")),
            viewerId, size, (page - 1) * size);
    }

    @Transactional
    public Optional<LikeResult> likeStory(int userId, int storyId) {
        var meta = jdbc.query("SELECT user_id, title FROM stories WHERE id = ?",
            (rs, i) -> new Object[]{rs.getInt("user_id"), rs.getString("title")}, storyId);
        if (meta.isEmpty()) {
            return Optional.empty();
        }
        int authorId = (int) meta.get(0)[0];
        String title = (String) meta.get(0)[1];
        int added = jdbc.update("INSERT OR IGNORE INTO story_likes (story_id, user_id) VALUES (?, ?)", storyId, userId);
        if (added > 0) {
            jdbc.update("UPDATE stories SET likes_count = likes_count + 1 WHERE id = ?", storyId);
        }
        int likesCount = jdbc.queryForObject("SELECT likes_count FROM stories WHERE id = ?", Integer.class, storyId);
        return Optional.of(new LikeResult(likesCount, added > 0, authorId, title));
    }

    public FeedbackItem submitFeedback(Integer userId, String kind, String message, String page, String fingerprint) {
        return jdbc.query("""
            INSERT INTO feedback (user_id, kind, message, page, fingerprint) VALUES (?, ?, ?, ?, ?)
            ON CONFLICT(kind, fingerprint) WHERE fingerprint != '' AND status = 'open'
            DO UPDATE SET occurrences = occurrences + 1, updated_at = CURRENT_TIMESTAMP
            RETURNING id, kind, message, page, occurrences, status, created_at, updated_at""",
            FEEDBACK_MAPPER, userId, kind, message, page, fingerprint).get(0);
    }

    public List<FeedbackItem> listMyFeedback(int userId) {
        return jdbc.query("""
            SELECT id, kind, message, page, occurrences, status, created_at, updated_at
            FROM feedback WHERE user_id = ? ORDER BY id DESC LIMIT 50""",
            FEEDBACK_MAPPER, userId);
    }
}`,explain:[{at:'-- schema.sql（加在文件最后）',to:"WHERE fingerprint != '' AND status = 'open';",text:'在 schema.sql 最后添加通知、学习故事、点赞和反馈表及对应索引。'},{at:'// repository/CommunityRepository.java',to:'public class CommunityRepository {',text:'新建社区仓库类，封装全部 JDBC 操作。'},{at:'public record Notification(',to:'int occurrences, String status, String createdAt, String updatedAt) {}',text:'四个结果 record，字段名与 JSON 契约一一对应。'},{at:'private static final RowMapper<Notification>',to:'this.jdbc = jdbc;',text:'定义 RowMapper 并注入 JdbcTemplate。'},{at:'public void createNotification(',to:'userId, kind, title, body, link);',text:'插入一条新通知。'},{at:'public int unreadCount(',to:'Integer.class, userId);',text:'统计某用户的未读通知条数。'},{at:'public int countNotifications(',to:'NOTIF_MAPPER, userId, flag, size, (page - 1) * size);',text:'统计通知总数并按时间倒序分页读取，flag 控制是否只看未读。'},{at:'public Optional<Notification> markRead(',to:'NOTIF_MAPPER, notifId, userId).stream().findFirst();',text:'COALESCE 保留首次阅读时间，同时限定 id 与 user_id；无匹配行时返回空 Optional。'},{at:'public int markAllRead(',to:'userId);',text:'只把 read_at IS NULL 的行置为当前时间，并返回修改行数。'},{at:'public Story createStory(',to:'userId, title, content);',text:'插入故事并用 RETURNING 拿回自增 ID 与创建时间。'},{at:'public int countStories()',to:'viewerId, size, (page - 1) * size);',text:'查询故事总数和分页列表，同时算出当前用户是否赞过每条故事。'},{at:'@Transactional',to:'return Optional.of(new LikeResult(likesCount, added > 0, authorId, title));',text:'先确认故事存在，再用 INSERT OR IGNORE 配合 @Transactional 保证同一用户只加一次赞并返回最新总数。'},{at:'public FeedbackItem submitFeedback(',to:'FEEDBACK_MAPPER, userId, kind, message, page, fingerprint).get(0);',text:'用部分唯一索引与 ON CONFLICT … DO UPDATE 原地合并同指纹未关闭错误并拿回更新后记录。'},{at:'public List<FeedbackItem> listMyFeedback(',to:'FEEDBACK_MAPPER, userId);',text:'查询当前用户提交的反馈历史。'}]}},node:{practice:{steps:['新建 src/db/community.js，补完 TODO 1 到 4。'],expect:'文件保存好即可，下一个任务把它接入路由'},code:`// src/db/community.js
const { db } = require("./database");

db.exec(\`
  CREATE TABLE IF NOT EXISTS notifications (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id    INTEGER NOT NULL REFERENCES users(id),
    kind       TEXT    NOT NULL,
    title      TEXT    NOT NULL,
    body       TEXT    NOT NULL DEFAULT '',
    link       TEXT    NOT NULL DEFAULT '',
    read_at    TEXT,
    created_at TEXT    NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
  CREATE INDEX IF NOT EXISTS idx_notifications_user_read_created
    ON notifications(user_id, read_at, created_at DESC, id DESC);
  CREATE TABLE IF NOT EXISTS stories (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id     INTEGER NOT NULL REFERENCES users(id),
    title       TEXT    NOT NULL,
    content     TEXT    NOT NULL,
    likes_count INTEGER NOT NULL DEFAULT 0,
    created_at  TEXT    NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS story_likes (
    story_id   INTEGER NOT NULL REFERENCES stories(id),
    user_id    INTEGER NOT NULL REFERENCES users(id),
    created_at TEXT    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (story_id, user_id)
  );
  CREATE TABLE IF NOT EXISTS feedback (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id     INTEGER REFERENCES users(id),
    kind        TEXT    NOT NULL,
    message     TEXT    NOT NULL,
    page        TEXT    NOT NULL DEFAULT '',
    fingerprint TEXT    NOT NULL DEFAULT '',
    occurrences INTEGER NOT NULL DEFAULT 1,
    status      TEXT    NOT NULL DEFAULT 'open',
    created_at  TEXT    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at  TEXT    NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
  CREATE UNIQUE INDEX IF NOT EXISTS idx_feedback_open_fp
    ON feedback(kind, fingerprint) WHERE fingerprint != '' AND status = 'open';
\`);

function createNotification(userId, kind, title, body = "", link = "") {
  db.prepare("INSERT INTO notifications (user_id, kind, title, body, link) VALUES (?, ?, ?, ?, ?)")
    .run(userId, kind, title, body, link);
}

function unreadCount(userId) {
  return db.prepare("SELECT COUNT(*) AS n FROM notifications WHERE user_id = ? AND read_at IS NULL").get(userId).n;
}

function listNotifications(userId, unreadOnly, page, size) {
  const flag = unreadOnly ? 1 : 0;
  const total = db
    .prepare("SELECT COUNT(*) AS n FROM notifications WHERE user_id = ? AND (? = 0 OR read_at IS NULL)")
    .get(userId, flag).n;
  const items = db
    .prepare(\`SELECT id, kind, title, body, link, read_at AS readAt, created_at AS createdAt
              FROM notifications WHERE user_id = ? AND (? = 0 OR read_at IS NULL)
              ORDER BY created_at DESC, id DESC LIMIT ? OFFSET ?\`)
    .all(userId, flag, size, (page - 1) * size);
  return { items, unreadCount: unreadCount(userId), total };
}

// 幂等把一条通知标为已读；不存在或不属于该用户返回 undefined
function markNotificationRead(userId, notifId) {
  // TODO 1：用 UPDATE notifications SET read_at = COALESCE(read_at, CURRENT_TIMESTAMP)
  //         WHERE id = ? AND user_id = ? RETURNING id, kind, title, body, link, read_at AS readAt, created_at AS createdAt
}

// 把当前用户的未读通知全部标为已读，返回更新条数
function markAllNotificationsRead(userId) {
  // TODO 2：UPDATE notifications SET read_at = CURRENT_TIMESTAMP WHERE user_id = ? AND read_at IS NULL，返回 result.changes
}

function createStory(userId, title, content) {
  const row = db
    .prepare(\`INSERT INTO stories (user_id, title, content) VALUES (?, ?, ?)
              RETURNING id, user_id AS userId, title, content, likes_count AS likesCount, created_at AS createdAt\`)
    .get(userId, title, content);
  const author = db.prepare("SELECT username FROM users WHERE id = ?").get(userId)?.username || "";
  return { ...row, author, likedByMe: false };
}

function listStories(viewerId, page, size) {
  const total = db.prepare("SELECT COUNT(*) AS n FROM stories").get().n;
  const rows = db
    .prepare(\`SELECT s.id, s.user_id AS userId, u.username AS author, s.title, s.content, s.likes_count AS likesCount,
                     EXISTS(SELECT 1 FROM story_likes l WHERE l.story_id = s.id AND l.user_id = ?) AS likedByMe,
                     s.created_at AS createdAt
              FROM stories s JOIN users u ON u.id = s.user_id
              ORDER BY s.id DESC LIMIT ? OFFSET ?\`)
    .all(viewerId, size, (page - 1) * size);
  return { items: rows.map((r) => ({ ...r, likedByMe: Boolean(r.likedByMe) })), total };
}

// 在事务里完成去重点赞并更新计数，故事不存在时返回 null
const likeStory = db.transaction((userId, storyId) => {
  // TODO 3：先查故事的 user_id 和 title（不存在返回 null）；
  //         用 INSERT OR IGNORE INTO story_likes (story_id, user_id) VALUES (?, ?)，
  //         changes > 0 时更新 stories.likes_count = likes_count + 1；返回 { likesCount, newlyLiked, authorId, title }
});

// 保存反馈或客户端报错；若存在相同未关闭的指纹则累加 occurrences
function submitFeedback(userId, kind, message, page, fingerprint) {
  // TODO 4：执行 INSERT INTO feedback … ON CONFLICT(kind, fingerprint) WHERE fingerprint != '' AND status = 'open'
  //         DO UPDATE SET occurrences = occurrences + 1, updated_at = CURRENT_TIMESTAMP RETURNING …
}

function listMyFeedback(userId) {
  return db
    .prepare(\`SELECT id, kind, message, page, occurrences, status, created_at AS createdAt, updated_at AS updatedAt
              FROM feedback WHERE user_id = ? ORDER BY id DESC LIMIT 50\`)
    .all(userId);
}

module.exports = {
  createNotification, unreadCount, listNotifications, markNotificationRead, markAllNotificationsRead,
  createStory, listStories, likeStory, submitFeedback, listMyFeedback,
};`,explain:[{at:'// src/db/community.js',to:'db.exec(`',text:'新建社区数据访问层，沿用第 6 关的同步 SQLite 连接。'},{at:'CREATE TABLE IF NOT EXISTS notifications (',to:'`);',text:'一次建好四张表及通知复合索引、错误去重部分唯一索引。'},{at:'function createNotification(',to:'function unreadCount(',text:'创建通知与统计当前未读数。'},{at:'return db.prepare("SELECT COUNT(*) AS n',to:'return { items, unreadCount: unreadCount(userId), total };',text:'分页查询通知列表，支持 unreadOnly 过滤并返回未读数。'},{at:'function markNotificationRead(',to:'// 把当前用户的未读通知全部标为已读，返回更新条数',text:'单条幂等已读，要你补全。'},{at:'function markAllNotificationsRead(',to:'function createStory(',text:'全部已读，要你补全。'},{at:'const row = db',to:'return { ...row, author, likedByMe: false };',text:'插入学习故事并返回完整展示字段。'},{at:'function listStories(',to:'return { items: rows.map((r) => ({ ...r, likedByMe: Boolean(r.likedByMe) })), total };',text:'分页列出学习故事，用 EXISTS 标出当前查看者是否已经点过赞。'},{at:'const likeStory = db.transaction(',to:'});',text:'事务点赞与防重，要你补全。'},{at:'function submitFeedback(',to:'function listMyFeedback(',text:'反馈与报错去重 UPSERT，要你补全。'},{at:'return db',to:'};',text:'查询个人反馈列表并导出所有数据层函数。'}],solution:{code:`// src/db/community.js
const { db } = require("./database");

db.exec(\`
  CREATE TABLE IF NOT EXISTS notifications (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id    INTEGER NOT NULL REFERENCES users(id),
    kind       TEXT    NOT NULL,
    title      TEXT    NOT NULL,
    body       TEXT    NOT NULL DEFAULT '',
    link       TEXT    NOT NULL DEFAULT '',
    read_at    TEXT,
    created_at TEXT    NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
  CREATE INDEX IF NOT EXISTS idx_notifications_user_read_created
    ON notifications(user_id, read_at, created_at DESC, id DESC);
  CREATE TABLE IF NOT EXISTS stories (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id     INTEGER NOT NULL REFERENCES users(id),
    title       TEXT    NOT NULL,
    content     TEXT    NOT NULL,
    likes_count INTEGER NOT NULL DEFAULT 0,
    created_at  TEXT    NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS story_likes (
    story_id   INTEGER NOT NULL REFERENCES stories(id),
    user_id    INTEGER NOT NULL REFERENCES users(id),
    created_at TEXT    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (story_id, user_id)
  );
  CREATE TABLE IF NOT EXISTS feedback (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id     INTEGER REFERENCES users(id),
    kind        TEXT    NOT NULL,
    message     TEXT    NOT NULL,
    page        TEXT    NOT NULL DEFAULT '',
    fingerprint TEXT    NOT NULL DEFAULT '',
    occurrences INTEGER NOT NULL DEFAULT 1,
    status      TEXT    NOT NULL DEFAULT 'open',
    created_at  TEXT    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at  TEXT    NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
  CREATE UNIQUE INDEX IF NOT EXISTS idx_feedback_open_fp
    ON feedback(kind, fingerprint) WHERE fingerprint != '' AND status = 'open';
\`);

function createNotification(userId, kind, title, body = "", link = "") {
  db.prepare("INSERT INTO notifications (user_id, kind, title, body, link) VALUES (?, ?, ?, ?, ?)")
    .run(userId, kind, title, body, link);
}

function unreadCount(userId) {
  return db.prepare("SELECT COUNT(*) AS n FROM notifications WHERE user_id = ? AND read_at IS NULL").get(userId).n;
}

function listNotifications(userId, unreadOnly, page, size) {
  const flag = unreadOnly ? 1 : 0;
  const total = db
    .prepare("SELECT COUNT(*) AS n FROM notifications WHERE user_id = ? AND (? = 0 OR read_at IS NULL)")
    .get(userId, flag).n;
  const items = db
    .prepare(\`SELECT id, kind, title, body, link, read_at AS readAt, created_at AS createdAt
              FROM notifications WHERE user_id = ? AND (? = 0 OR read_at IS NULL)
              ORDER BY created_at DESC, id DESC LIMIT ? OFFSET ?\`)
    .all(userId, flag, size, (page - 1) * size);
  return { items, unreadCount: unreadCount(userId), total };
}

function markNotificationRead(userId, notifId) {
  return db
    .prepare(\`UPDATE notifications SET read_at = COALESCE(read_at, CURRENT_TIMESTAMP)
              WHERE id = ? AND user_id = ?
              RETURNING id, kind, title, body, link, read_at AS readAt, created_at AS createdAt\`)
    .get(notifId, userId);
}

function markAllNotificationsRead(userId) {
  return db
    .prepare("UPDATE notifications SET read_at = CURRENT_TIMESTAMP WHERE user_id = ? AND read_at IS NULL")
    .run(userId).changes;
}

function createStory(userId, title, content) {
  const row = db
    .prepare(\`INSERT INTO stories (user_id, title, content) VALUES (?, ?, ?)
              RETURNING id, user_id AS userId, title, content, likes_count AS likesCount, created_at AS createdAt\`)
    .get(userId, title, content);
  const author = db.prepare("SELECT username FROM users WHERE id = ?").get(userId)?.username || "";
  return { ...row, author, likedByMe: false };
}

function listStories(viewerId, page, size) {
  const total = db.prepare("SELECT COUNT(*) AS n FROM stories").get().n;
  const rows = db
    .prepare(\`SELECT s.id, s.user_id AS userId, u.username AS author, s.title, s.content, s.likes_count AS likesCount,
                     EXISTS(SELECT 1 FROM story_likes l WHERE l.story_id = s.id AND l.user_id = ?) AS likedByMe,
                     s.created_at AS createdAt
              FROM stories s JOIN users u ON u.id = s.user_id
              ORDER BY s.id DESC LIMIT ? OFFSET ?\`)
    .all(viewerId, size, (page - 1) * size);
  return { items: rows.map((r) => ({ ...r, likedByMe: Boolean(r.likedByMe) })), total };
}

const likeStory = db.transaction((userId, storyId) => {
  const story = db.prepare("SELECT user_id, title FROM stories WHERE id = ?").get(storyId);
  if (!story) return null;
  const info = db.prepare("INSERT OR IGNORE INTO story_likes (story_id, user_id) VALUES (?, ?)").run(storyId, userId);
  if (info.changes > 0) {
    db.prepare("UPDATE stories SET likes_count = likes_count + 1 WHERE id = ?").run(storyId);
  }
  const latest = db.prepare("SELECT likes_count AS likesCount FROM stories WHERE id = ?").get(storyId);
  return { likesCount: latest.likesCount, newlyLiked: info.changes > 0, authorId: story.user_id, title: story.title };
});

function submitFeedback(userId, kind, message, page, fingerprint) {
  return db
    .prepare(\`INSERT INTO feedback (user_id, kind, message, page, fingerprint) VALUES (?, ?, ?, ?, ?)
              ON CONFLICT(kind, fingerprint) WHERE fingerprint != '' AND status = 'open'
              DO UPDATE SET occurrences = occurrences + 1, updated_at = CURRENT_TIMESTAMP
              RETURNING id, kind, message, page, occurrences, status, created_at AS createdAt, updated_at AS updatedAt\`)
    .get(userId, kind, message, page, fingerprint);
}

function listMyFeedback(userId) {
  return db
    .prepare(\`SELECT id, kind, message, page, occurrences, status, created_at AS createdAt, updated_at AS updatedAt
              FROM feedback WHERE user_id = ? ORDER BY id DESC LIMIT 50\`)
    .all(userId);
}

module.exports = {
  createNotification, unreadCount, listNotifications, markNotificationRead, markAllNotificationsRead,
  createStory, listStories, likeStory, submitFeedback, listMyFeedback,
};`,explain:[{at:'// src/db/community.js',to:'db.exec(`',text:'新建社区数据访问层，沿用第 6 关的同步 SQLite 连接。'},{at:'CREATE TABLE IF NOT EXISTS notifications (',to:'`);',text:'一次建好四张表及通知复合索引、错误去重部分唯一索引。'},{at:'function createNotification(',to:'function unreadCount(',text:'创建通知与统计当前未读数。'},{at:'return db.prepare("SELECT COUNT(*) AS n',to:'return { items, unreadCount: unreadCount(userId), total };',text:'分页查询通知列表，支持 unreadOnly 过滤并返回未读数。'},{at:'function markNotificationRead(',to:'.get(notifId, userId);',text:'COALESCE 保留首次已读时间；按 id 和 user_id 一起过滤，不属于当前用户时返回 undefined。'},{at:'function markAllNotificationsRead(',to:'.run(userId).changes;',text:'只更新未读行并返回受影响条数。'},{at:'function createStory(',to:'return { ...row, author, likedByMe: false };',text:'插入学习故事并返回完整展示字段。'},{at:'function listStories(',to:'return { items: rows.map((r) => ({ ...r, likedByMe: Boolean(r.likedByMe) })), total };',text:'分页列出学习故事，用 EXISTS 标出当前查看者是否已经点过赞。'},{at:'const likeStory = db.transaction(',to:'});',text:'在事务里先确认故事存在，再用 INSERT OR IGNORE 插入点赞表；只有首次插入成功（changes > 0）才更新 likes_count，保证计数精确。'},{at:'function submitFeedback(',to:'.get(userId, kind, message, page, fingerprint);',text:'利用部分唯一索引和 ON CONFLICT … DO UPDATE 原子完成插入或次数累加，并返回最新行。'},{at:'function listMyFeedback(',to:'};',text:'查询个人反馈列表并导出所有数据层函数。'}]}},python:{practice:{steps:['按代码第一部分在 app/database.py 的 SCHEMA 里加上表和索引。','新建 app/community_db.py，补完 TODO 1 到 4。'],expect:'文件保存好即可，下一个任务把它接入路由'},code:`# app/database.py（在 SCHEMA 字符串最后加上）
CREATE TABLE IF NOT EXISTS notifications (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id    INTEGER NOT NULL REFERENCES users(id),
    kind       TEXT    NOT NULL,
    title      TEXT    NOT NULL,
    body       TEXT    NOT NULL DEFAULT '',
    link       TEXT    NOT NULL DEFAULT '',
    read_at    TEXT,
    created_at TEXT    NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_notifications_user_read_created
    ON notifications(user_id, read_at, created_at DESC, id DESC);
CREATE TABLE IF NOT EXISTS stories (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id     INTEGER NOT NULL REFERENCES users(id),
    title       TEXT    NOT NULL,
    content     TEXT    NOT NULL,
    likes_count INTEGER NOT NULL DEFAULT 0,
    created_at  TEXT    NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS story_likes (
    story_id   INTEGER NOT NULL REFERENCES stories(id),
    user_id    INTEGER NOT NULL REFERENCES users(id),
    created_at TEXT    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (story_id, user_id)
);
CREATE TABLE IF NOT EXISTS feedback (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id     INTEGER REFERENCES users(id),
    kind        TEXT    NOT NULL,
    message     TEXT    NOT NULL,
    page        TEXT    NOT NULL DEFAULT '',
    fingerprint TEXT    NOT NULL DEFAULT '',
    occurrences INTEGER NOT NULL DEFAULT 1,
    status      TEXT    NOT NULL DEFAULT 'open',
    created_at  TEXT    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at  TEXT    NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_feedback_open_fp
    ON feedback(kind, fingerprint) WHERE fingerprint != '' AND status = 'open';

# app/community_db.py
from contextlib import closing

from app.database import connect, query_all, query_one


def create_notification(user_id, kind, title, body="", link=""):
    with closing(connect()) as conn:
        with conn:
            conn.execute(
                "INSERT INTO notifications (user_id, kind, title, body, link) VALUES (?, ?, ?, ?, ?)",
                (user_id, kind, title, body, link),
            )


def unread_count(user_id):
    row = query_one("SELECT COUNT(*) AS n FROM notifications WHERE user_id = ? AND read_at IS NULL", (user_id,))
    return row["n"] if row else 0


def list_notifications(user_id, unread_only, page, size):
    flag = 1 if unread_only else 0
    total = query_one(
        "SELECT COUNT(*) AS n FROM notifications WHERE user_id = ? AND (? = 0 OR read_at IS NULL)",
        (user_id, flag),
    )["n"]
    items = query_all(
        "SELECT id, kind, title, body, link, read_at AS readAt, created_at AS createdAt "
        "FROM notifications WHERE user_id = ? AND (? = 0 OR read_at IS NULL) "
        "ORDER BY created_at DESC, id DESC LIMIT ? OFFSET ?",
        (user_id, flag, size, (page - 1) * size),
    )
    return {"items": items, "unreadCount": unread_count(user_id), "total": total}


def mark_notification_read(user_id, notif_id):
    # TODO 1：在 with conn 里用 UPDATE notifications SET read_at = COALESCE(read_at, CURRENT_TIMESTAMP)
    #         WHERE id = ? AND user_id = ? RETURNING id, kind, title, body, link, read_at AS readAt, created_at AS createdAt；
    #         返回 dict(row) 或 None
    return None


def mark_all_notifications_read(user_id):
    # TODO 2：在 with conn 里执行 UPDATE notifications SET read_at = CURRENT_TIMESTAMP
    #         WHERE user_id = ? AND read_at IS NULL，返回 cur.rowcount
    return 0


def create_story(user_id, title, content):
    with closing(connect()) as conn:
        with conn:
            row = conn.execute(
                "INSERT INTO stories (user_id, title, content) VALUES (?, ?, ?) "
                "RETURNING id, user_id AS userId, title, content, likes_count AS likesCount, created_at AS createdAt",
                (user_id, title, content),
            ).fetchone()
    user = query_one("SELECT username FROM users WHERE id = ?", (user_id,))
    return {**dict(row), "author": user["username"] if user else "", "likedByMe": False}


def list_stories(viewer_id, page, size):
    total = query_one("SELECT COUNT(*) AS n FROM stories")["n"]
    rows = query_all(
        "SELECT s.id, s.user_id AS userId, u.username AS author, s.title, s.content, s.likes_count AS likesCount, "
        "EXISTS(SELECT 1 FROM story_likes l WHERE l.story_id = s.id AND l.user_id = ?) AS likedByMe, "
        "s.created_at AS createdAt FROM stories s JOIN users u ON u.id = s.user_id "
        "ORDER BY s.id DESC LIMIT ? OFFSET ?",
        (viewer_id, size, (page - 1) * size),
    )
    for r in rows:
        r["likedByMe"] = bool(r["likedByMe"])
    return {"items": rows, "total": total}


def like_story(user_id, story_id):
    # TODO 3：在同一个 with conn 里：先查故事的 user_id 和 title（没有返回 None）；
    #         用 INSERT OR IGNORE INTO story_likes (story_id, user_id) VALUES (?, ?)，
    #         cur.rowcount > 0 时更新 stories.likes_count = likes_count + 1；
    #         再查最新赞数，返回 {"likesCount", "newlyLiked", "authorId", "title"}
    return None


def submit_feedback(user_id, kind, message, page, fingerprint):
    # TODO 4：在 with conn 里执行 INSERT INTO feedback … ON CONFLICT(kind, fingerprint)
    #         WHERE fingerprint != '' AND status = 'open' DO UPDATE SET occurrences = occurrences + 1,
    #         updated_at = CURRENT_TIMESTAMP RETURNING …，返回 dict(row)
    return None


def list_my_feedback(user_id):
    return query_all(
        "SELECT id, kind, message, page, occurrences, status, created_at AS createdAt, updated_at AS updatedAt "
        "FROM feedback WHERE user_id = ? ORDER BY id DESC LIMIT 50",
        (user_id,),
    )`,explain:[{at:'# app/database.py（在 SCHEMA 字符串最后加上）',to:"WHERE fingerprint != '' AND status = 'open';",text:'把社区与反馈相关的四张表和两个索引加进 SCHEMA。'},{at:'# app/community_db.py',to:'from app.database import connect, query_all, query_one',text:'新建数据访问模块，复用第 6 关的连接与查询工具。'},{at:'def create_notification(',to:'return row["n"] if row else 0',text:'创建通知和查询未读数量。'},{at:'def list_notifications(',to:'return {"items": items, "unreadCount": unread_count(user_id), "total": total}',text:'分页查询通知列表，支持仅未读过滤并返回当前未读总数。'},{at:'def mark_notification_read(',to:'return None',text:'单条幂等已读，要你补全。'},{at:'def mark_all_notifications_read(',to:'return 0',text:'全部已读，要你补全。'},{at:'def create_story(',to:'return {**dict(row), "author": user["username"] if user else "", "likedByMe": False}',text:'保存故事并用 RETURNING 拿回编号和时间戳，再补全作者名。'},{at:'def list_stories(',to:'return {"items": rows, "total": total}',text:'分页查询故事，同时利用 EXISTS 判断当前用户是否已经点过赞。'},{at:'def like_story(',to:'return None',text:'事务点赞与防重，要你补全。'},{at:'def submit_feedback(',to:'return None',text:'反馈与报错去重 UPSERT，要你补全。'},{at:'def list_my_feedback(',to:'(user_id,),',text:'查询当前用户的反馈列表，最多 50 条。'}],solution:{code:`# app/database.py（在 SCHEMA 字符串最后加上）
CREATE TABLE IF NOT EXISTS notifications (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id    INTEGER NOT NULL REFERENCES users(id),
    kind       TEXT    NOT NULL,
    title      TEXT    NOT NULL,
    body       TEXT    NOT NULL DEFAULT '',
    link       TEXT    NOT NULL DEFAULT '',
    read_at    TEXT,
    created_at TEXT    NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_notifications_user_read_created
    ON notifications(user_id, read_at, created_at DESC, id DESC);
CREATE TABLE IF NOT EXISTS stories (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id     INTEGER NOT NULL REFERENCES users(id),
    title       TEXT    NOT NULL,
    content     TEXT    NOT NULL,
    likes_count INTEGER NOT NULL DEFAULT 0,
    created_at  TEXT    NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS story_likes (
    story_id   INTEGER NOT NULL REFERENCES stories(id),
    user_id    INTEGER NOT NULL REFERENCES users(id),
    created_at TEXT    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (story_id, user_id)
);
CREATE TABLE IF NOT EXISTS feedback (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id     INTEGER REFERENCES users(id),
    kind        TEXT    NOT NULL,
    message     TEXT    NOT NULL,
    page        TEXT    NOT NULL DEFAULT '',
    fingerprint TEXT    NOT NULL DEFAULT '',
    occurrences INTEGER NOT NULL DEFAULT 1,
    status      TEXT    NOT NULL DEFAULT 'open',
    created_at  TEXT    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at  TEXT    NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_feedback_open_fp
    ON feedback(kind, fingerprint) WHERE fingerprint != '' AND status = 'open';

# app/community_db.py
from contextlib import closing

from app.database import connect, query_all, query_one


def create_notification(user_id, kind, title, body="", link=""):
    with closing(connect()) as conn:
        with conn:
            conn.execute(
                "INSERT INTO notifications (user_id, kind, title, body, link) VALUES (?, ?, ?, ?, ?)",
                (user_id, kind, title, body, link),
            )


def unread_count(user_id):
    row = query_one("SELECT COUNT(*) AS n FROM notifications WHERE user_id = ? AND read_at IS NULL", (user_id,))
    return row["n"] if row else 0


def list_notifications(user_id, unread_only, page, size):
    flag = 1 if unread_only else 0
    total = query_one(
        "SELECT COUNT(*) AS n FROM notifications WHERE user_id = ? AND (? = 0 OR read_at IS NULL)",
        (user_id, flag),
    )["n"]
    items = query_all(
        "SELECT id, kind, title, body, link, read_at AS readAt, created_at AS createdAt "
        "FROM notifications WHERE user_id = ? AND (? = 0 OR read_at IS NULL) "
        "ORDER BY created_at DESC, id DESC LIMIT ? OFFSET ?",
        (user_id, flag, size, (page - 1) * size),
    )
    return {"items": items, "unreadCount": unread_count(user_id), "total": total}


def mark_notification_read(user_id, notif_id):
    with closing(connect()) as conn:
        with conn:
            row = conn.execute(
                "UPDATE notifications SET read_at = COALESCE(read_at, CURRENT_TIMESTAMP) "
                "WHERE id = ? AND user_id = ? "
                "RETURNING id, kind, title, body, link, read_at AS readAt, created_at AS createdAt",
                (notif_id, user_id),
            ).fetchone()
    return dict(row) if row else None


def mark_all_notifications_read(user_id):
    with closing(connect()) as conn:
        with conn:
            cur = conn.execute(
                "UPDATE notifications SET read_at = CURRENT_TIMESTAMP WHERE user_id = ? AND read_at IS NULL",
                (user_id,),
            )
    return cur.rowcount


def create_story(user_id, title, content):
    with closing(connect()) as conn:
        with conn:
            row = conn.execute(
                "INSERT INTO stories (user_id, title, content) VALUES (?, ?, ?) "
                "RETURNING id, user_id AS userId, title, content, likes_count AS likesCount, created_at AS createdAt",
                (user_id, title, content),
            ).fetchone()
    user = query_one("SELECT username FROM users WHERE id = ?", (user_id,))
    return {**dict(row), "author": user["username"] if user else "", "likedByMe": False}


def list_stories(viewer_id, page, size):
    total = query_one("SELECT COUNT(*) AS n FROM stories")["n"]
    rows = query_all(
        "SELECT s.id, s.user_id AS userId, u.username AS author, s.title, s.content, s.likes_count AS likesCount, "
        "EXISTS(SELECT 1 FROM story_likes l WHERE l.story_id = s.id AND l.user_id = ?) AS likedByMe, "
        "s.created_at AS createdAt FROM stories s JOIN users u ON u.id = s.user_id "
        "ORDER BY s.id DESC LIMIT ? OFFSET ?",
        (viewer_id, size, (page - 1) * size),
    )
    for r in rows:
        r["likedByMe"] = bool(r["likedByMe"])
    return {"items": rows, "total": total}


def like_story(user_id, story_id):
    with closing(connect()) as conn:
        with conn:
            story = conn.execute("SELECT user_id, title FROM stories WHERE id = ?", (story_id,)).fetchone()
            if story is None:
                return None
            cur = conn.execute("INSERT OR IGNORE INTO story_likes (story_id, user_id) VALUES (?, ?)", (story_id, user_id))
            if cur.rowcount > 0:
                conn.execute("UPDATE stories SET likes_count = likes_count + 1 WHERE id = ?", (story_id,))
            latest = conn.execute("SELECT likes_count FROM stories WHERE id = ?", (story_id,)).fetchone()
    return {"likesCount": latest["likes_count"], "newlyLiked": cur.rowcount > 0, "authorId": story["user_id"], "title": story["title"]}


def submit_feedback(user_id, kind, message, page, fingerprint):
    with closing(connect()) as conn:
        with conn:
            row = conn.execute(
                "INSERT INTO feedback (user_id, kind, message, page, fingerprint) VALUES (?, ?, ?, ?, ?) "
                "ON CONFLICT(kind, fingerprint) WHERE fingerprint != '' AND status = 'open' "
                "DO UPDATE SET occurrences = occurrences + 1, updated_at = CURRENT_TIMESTAMP "
                "RETURNING id, kind, message, page, occurrences, status, created_at AS createdAt, updated_at AS updatedAt",
                (user_id, kind, message, page, fingerprint),
            ).fetchone()
    return dict(row)


def list_my_feedback(user_id):
    return query_all(
        "SELECT id, kind, message, page, occurrences, status, created_at AS createdAt, updated_at AS updatedAt "
        "FROM feedback WHERE user_id = ? ORDER BY id DESC LIMIT 50",
        (user_id,),
    )`,explain:[{at:'# app/database.py（在 SCHEMA 字符串最后加上）',to:"WHERE fingerprint != '' AND status = 'open';",text:'把社区与反馈相关的四张表和两个索引加进 SCHEMA。'},{at:'# app/community_db.py',to:'from app.database import connect, query_all, query_one',text:'新建数据访问模块，复用第 6 关的连接与查询工具。'},{at:'def create_notification(',to:'return row["n"] if row else 0',text:'创建通知和查询未读数量。'},{at:'def list_notifications(',to:'return {"items": items, "unreadCount": unread_count(user_id), "total": total}',text:'分页查询通知列表，支持仅未读过滤并返回当前未读总数。'},{at:'def mark_notification_read(',to:'return dict(row) if row else None',text:'COALESCE 保留首次已读时间，同时限定 user_id 隔离他人通知；无匹配行返回 None。'},{at:'def mark_all_notifications_read(',to:'return cur.rowcount',text:'只把未读通知设为已读，并返回更新的行数。'},{at:'def create_story(',to:'return {**dict(row), "author": user["username"] if user else "", "likedByMe": False}',text:'保存故事并用 RETURNING 拿回编号和时间戳，再补全作者名。'},{at:'def list_stories(',to:'return {"items": rows, "total": total}',text:'分页查询故事，同时利用 EXISTS 判断当前用户是否已经点过赞。'},{at:'def like_story(',to:'return {"likesCount": latest["likes_count"],',text:'在一个 with conn 事务内完成查询校验、OR IGNORE 去重插表与计数加一，避免并发重复计数。'},{at:'def submit_feedback(',to:'return dict(row)',text:'利用部分唯一索引和 ON CONFLICT … DO UPDATE 原子合并相同报错，并通过 RETURNING 返回结果。'},{at:'def list_my_feedback(',to:'(user_id,),',text:'查询当前用户的反馈列表，最多 50 条。'}]}}}},
  {title:'任务二：学习故事、防刷限流与通知接口',body:'实现业务逻辑层与路由：包含滑动窗口限流器、故事 HTML 转义、点赞触发通知、报错指纹去重和载荷体积拦截，并把 /api/notifications、/api/stories、/api/feedback 挂载到服务上。',variants:{go:{practice:{steps:['新建 internal/service/community.go，补完 TODO 1 到 4。','新建 internal/handler/community.go（完整给出），按末尾注释在 handler.go 和 main.go 中完成装配。','运行 go vet ./... 和 go test ./...，然后启动服务准备联调。'],expect:'go vet ./... 无报错，服务正常启动'},code:`// internal/service/community.go
package service

import (
    "crypto/sha256"
    "encoding/hex"
    "errors"
    "html"
    "strings"
    "sync"
    "time"
    "unicode/utf8"

    "zixishi/internal/store"
)

var (
    ErrBadCommunityInput = errors.New("输入内容格式或长度不合法")
    ErrRateLimited       = errors.New("操作太频繁，请稍后再试")
)

// AllowRequest 实现滑动窗口限流：清理严格早于 nowMs - windowMs 的时间戳，未超限才记录 nowMs。
func AllowRequest(timestamps []int64, nowMs, windowMs int64, limit int) ([]int64, bool) {
    // TODO 1：算出 cutoff := nowMs - windowMs，保留所有 >= cutoff 的时间戳到 kept；
    //         若 limit <= 0 或 len(kept) >= limit 返回 kept, false；否则追加 nowMs 返回 kept, true
    return timestamps, true
}

type RateLimiter struct {
    mu       sync.Mutex
    windowMs int64
    limit    int
    hits     map[string][]int64
}

func NewRateLimiter(windowSec, limit int) *RateLimiter {
    if windowSec < 1 {
        windowSec = 60
    }
    if limit < 1 {
        limit = 5
    }
    return &RateLimiter{windowMs: int64(windowSec) * 1000, limit: limit, hits: map[string][]int64{}}
}

func (l *RateLimiter) Allow(key string) bool {
    l.mu.Lock()
    defer l.mu.Unlock()
    next, ok := AllowRequest(l.hits[key], time.Now().UnixMilli(), l.windowMs, l.limit)
    l.hits[key] = next
    return ok
}

type NotificationPage struct {
    Items       []store.Notification \`json:"items"\`
    UnreadCount int                  \`json:"unreadCount"\`
    Total       int                  \`json:"total"\`
    Page        int                  \`json:"page"\`
    Size        int                  \`json:"size"\`
}

type StoryPage struct {
    Items []store.Story \`json:"items"\`
    Total int           \`json:"total"\`
    Page  int           \`json:"page"\`
    Size  int           \`json:"size"\`
}

type CommunityService struct {
    store   *store.CommunityStore
    limiter *RateLimiter
}

func NewCommunityService(s *store.CommunityStore, limiter *RateLimiter) *CommunityService {
    return &CommunityService{store: s, limiter: limiter}
}

func (s *CommunityService) ListNotifications(userID int, unreadOnly bool, page, size int) (NotificationPage, error) {
    page, size = max(page, 1), min(max(size, 1), 50)
    items, unread, total, err := s.store.ListNotifications(userID, unreadOnly, page, size)
    return NotificationPage{Items: items, UnreadCount: unread, Total: total, Page: page, Size: size}, err
}

func (s *CommunityService) MarkRead(userID, notifID int) (store.Notification, int, error) {
    n, err := s.store.MarkNotificationRead(userID, notifID)
    if err != nil {
        return n, 0, err
    }
    unread, err := s.store.UnreadCount(userID)
    return n, unread, err
}

func (s *CommunityStore) _unused() {}

func (s *CommunityService) MarkAllRead(userID int) (int, error) {
    return s.store.MarkAllNotificationsRead(userID)
}

func (s *CommunityService) CreateStory(userID int, title, content string) (store.Story, error) {
    // TODO 2：去掉首尾空格后检查 title 为 1–80 字、content 为 1–2000 字（不合要求返回 ErrBadCommunityInput）；
    //         对 title 和 content 调用 html.EscapeString(...) 转义防 XSS，再调用 s.store.CreateStory
    return store.Story{}, nil
}

func (s *CommunityService) ListStories(viewerID, page, size int) (StoryPage, error) {
    page, size = max(page, 1), min(max(size, 1), 50)
    items, total, err := s.store.ListStories(viewerID, page, size)
    return StoryPage{Items: items, Total: total, Page: page, Size: size}, err
}

func (s *CommunityService) LikeStory(userID int, username string, storyID int) (int, error) {
    // TODO 3：调用 s.store.LikeStory；若 newlyLiked && authorID != userID，
    //         用 s.store.CreateNotification 给作者发一条 kind="story_like" 的通知，返回 likesCount
    return 0, nil
}

func fingerprintFor(kind, message, page string) string {
    if kind != "client_error" {
        return ""
    }
    firstLine, _, _ := strings.Cut(message, "\\n")
    sum := sha256.Sum256([]byte(page + "|" + firstLine))
    return hex.EncodeToString(sum[:16])
}

func (s *CommunityService) SubmitFeedback(userID *int, rateKey, kind, message, page string) (store.FeedbackItem, error) {
    // TODO 4：检查 kind 必须是 bug / idea / client_error、message 1–1000 字、page <= 200 字（否则返回 ErrBadCommunityInput）；
    //         校验 s.limiter.Allow(rateKey)（为 false 返回 ErrRateLimited）；
    //         用 fingerprintFor 算出指纹并调用 s.store.SubmitFeedback（message/page 做 html.EscapeString）
    return store.FeedbackItem{}, nil
}

func (s *CommunityService) ListMyFeedback(userID int) ([]store.FeedbackItem, error) {
    return s.store.ListMyFeedback(userID)
}

// internal/handler/community.go
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

func (h *Handler) optionalUser(r *http.Request) *store.User {
    u, err := h.auth.CurrentUser(sessionToken(r))
    if err != nil {
        return nil
    }
    return &u
}

func (h *Handler) communityError(w http.ResponseWriter, err error) {
    switch {
    case errors.Is(err, service.ErrBadCommunityInput):
        writeJSON(w, http.StatusBadRequest, map[string]string{"error": err.Error()})
    case errors.Is(err, service.ErrRateLimited):
        writeJSON(w, http.StatusTooManyRequests, map[string]string{"error": err.Error()})
    case errors.Is(err, store.ErrNotFound):
        writeJSON(w, http.StatusNotFound, map[string]string{"error": "资源不存在"})
    default:
        h.serverError(w, err)
    }
}

func (h *Handler) listNotifications(w http.ResponseWriter, r *http.Request) {
    u, ok := h.requireUser(w, r)
    if !ok {
        return
    }
    q := r.URL.Query()
    unreadOnly := q.Get("unreadOnly") == "1" || q.Get("unreadOnly") == "true"
    page, _ := strconv.Atoi(q.Get("page"))
    size, _ := strconv.Atoi(q.Get("size"))
    res, err := h.community.ListNotifications(u.ID, unreadOnly, page, size)
    if err != nil {
        h.communityError(w, err)
        return
    }
    writeJSON(w, http.StatusOK, res)
}

func (h *Handler) markNotificationRead(w http.ResponseWriter, r *http.Request) {
    u, ok := h.requireUser(w, r)
    if !ok {
        return
    }
    id, err := strconv.Atoi(r.PathValue("id"))
    if err != nil || id <= 0 {
        h.communityError(w, store.ErrNotFound)
        return
    }
    n, unread, err := h.community.MarkRead(u.ID, id)
    if err != nil {
        h.communityError(w, err)
        return
    }
    writeJSON(w, http.StatusOK, map[string]any{"id": n.ID, "readAt": n.ReadAt, "unreadCount": unread})
}

func (h *Handler) markAllNotificationsRead(w http.ResponseWriter, r *http.Request) {
    u, ok := h.requireUser(w, r)
    if !ok {
        return
    }
    updated, err := h.community.MarkAllRead(u.ID)
    if err != nil {
        h.communityError(w, err)
        return
    }
    writeJSON(w, http.StatusOK, map[string]any{"updated": updated, "unreadCount": 0})
}

func (h *Handler) listStories(w http.ResponseWriter, r *http.Request) {
    viewerID := 0
    if u := h.optionalUser(r); u != nil {
        viewerID = u.ID
    }
    q := r.URL.Query()
    page, _ := strconv.Atoi(q.Get("page"))
    size, _ := strconv.Atoi(q.Get("size"))
    res, err := h.community.ListStories(viewerID, page, size)
    if err != nil {
        h.communityError(w, err)
        return
    }
    writeJSON(w, http.StatusOK, res)
}

func (h *Handler) createStory(w http.ResponseWriter, r *http.Request) {
    u, ok := h.requireUser(w, r)
    if !ok {
        return
    }
    var body struct {
        Title   string \`json:"title"\`
        Content string \`json:"content"\`
    }
    if err := json.NewDecoder(http.MaxBytesReader(w, r.Body, 16<<10)).Decode(&body); err != nil {
        writeJSON(w, http.StatusBadRequest, map[string]string{"error": "请求正文不合法"})
        return
    }
    st, err := h.community.CreateStory(u.ID, body.Title, body.Content)
    if err != nil {
        h.communityError(w, err)
        return
    }
    writeJSON(w, http.StatusCreated, st)
}

func (h *Handler) likeStory(w http.ResponseWriter, r *http.Request) {
    u, ok := h.requireUser(w, r)
    if !ok {
        return
    }
    id, err := strconv.Atoi(r.PathValue("id"))
    if err != nil || id <= 0 {
        h.communityError(w, store.ErrNotFound)
        return
    }
    likesCount, err := h.community.LikeStory(u.ID, u.Username, id)
    if err != nil {
        h.communityError(w, err)
        return
    }
    writeJSON(w, http.StatusOK, map[string]any{"storyId": id, "likesCount": likesCount, "liked": true})
}

func (h *Handler) submitFeedback(w http.ResponseWriter, r *http.Request) {
    r.Body = http.MaxBytesReader(w, r.Body, 16<<10)
    var body struct {
        Kind    string \`json:"kind"\`
        Message string \`json:"message"\`
        Page    string \`json:"page"\`
    }
    if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
        var maxErr *http.MaxBytesError
        if errors.As(err, &maxErr) {
            writeJSON(w, http.StatusRequestEntityTooLarge, map[string]string{"error": "请求体不能超过 16 KB"})
            return
        }
        writeJSON(w, http.StatusBadRequest, map[string]string{"error": "请求正文不合法"})
        return
    }
    var userID *int
    rateKey := "ip:" + strings.Split(r.RemoteAddr, ":")[0]
    if u := h.optionalUser(r); u != nil {
        userID = &u.ID
        rateKey = "u:" + strconv.Itoa(u.ID)
    }
    item, err := h.community.SubmitFeedback(userID, rateKey, body.Kind, body.Message, body.Page)
    if err != nil {
        h.communityError(w, err)
        return
    }
    writeJSON(w, http.StatusCreated, item)
}

func (h *Handler) listMyFeedback(w http.ResponseWriter, r *http.Request) {
    u, ok := h.requireUser(w, r)
    if !ok {
        return
    }
    items, err := h.community.ListMyFeedback(u.ID)
    if err != nil {
        h.communityError(w, err)
        return
    }
    writeJSON(w, http.StatusOK, items)
}

// 组装：internal/handler/handler.go 的 Handler 增加字段 community *service.CommunityService，Routes() 注册：
//     mux.HandleFunc("GET /api/notifications", h.listNotifications)
//     mux.HandleFunc("POST /api/notifications/{id}/read", h.markNotificationRead)
//     mux.HandleFunc("POST /api/notifications/read-all", h.markAllNotificationsRead)
//     mux.HandleFunc("GET /api/stories", h.listStories)
//     mux.HandleFunc("POST /api/stories", h.createStory)
//     mux.HandleFunc("POST /api/stories/{id}/like", h.likeStory)
//     mux.HandleFunc("POST /api/feedback", h.submitFeedback)
//     mux.HandleFunc("GET /api/feedback", h.listMyFeedback)
// main.go：创建 store.NewCommunityStore(qs.DB())、service.NewRateLimiter(60, envOr("FEEDBACK_RATE_LIMIT", 5)) 与 CommunityService`,explain:[{at:'// internal/service/community.go',to:'"zixishi/internal/store"',text:'社区业务逻辑层：包含滑动窗口限流、HTML 转义和报错指纹计算。'},{at:'var (',to:'ErrRateLimited       = errors.New("操作太频繁，请稍后再试")',text:'定义输入不合法（400）与限流（429）两种业务错误。'},{at:'func AllowRequest(',to:'return timestamps, true',text:'纯函数滑动窗口核心，要你补全；单元测试和代码题可以直接测试它。'},{at:'type RateLimiter struct {',to:'return ok',text:'用互斥锁保护的限流器，按用户 ID 或 IP 分别维护时间戳切片。'},{at:'type NotificationPage struct {',to:'return &CommunityService{store: s, limiter: limiter}',text:'定义分页返回结构并组装 CommunityService。'},{at:'func (s *CommunityService) ListNotifications(',to:'return s.store.MarkAllNotificationsRead(userID)',text:'通知列表查询与单条/全部已读；page 至少为 1，size 限制在 1–50。'},{at:'func (s *CommunityService) CreateStory(',to:'return store.Story{}, nil',text:'发布故事（校验长度 + HTML 转义），要你补全。'},{at:'func (s *CommunityService) ListStories(',to:'return StoryPage{Items: items, Total: total, Page: page, Size: size}, err',text:'分页列出学习故事。'},{at:'func (s *CommunityService) LikeStory(',to:'return 0, nil',text:'点赞并触发通知，要你补全。'},{at:'func fingerprintFor(',to:'return hex.EncodeToString(sum[:16])',text:'只对 client_error 计算指纹：取 page 和第一行错误信息做 SHA-256 截断。'},{at:'func (s *CommunityService) SubmitFeedback(',to:'return s.store.ListMyFeedback(userID)',text:'反馈提交（TODO 4 要你补全）和个人反馈列表查询。'},{at:'// internal/handler/community.go',to:'return &u',text:'HTTP 处理层：optionalUser 尝试读会话，没登录时返回 nil，用于故事列表和未登录页面报错上报。'},{at:'func (h *Handler) communityError(',to:'h.serverError(w, err)',text:'把业务错误翻译为 400、429、404 或 500。'},{at:'func (h *Handler) listNotifications(',to:'writeJSON(w, http.StatusOK, map[string]any{"updated": updated, "unreadCount": 0})',text:'通知收件箱、单条已读与全部已读三个接口，全部先通过 requireUser 认人。'},{at:'func (h *Handler) listStories(',to:'writeJSON(w, http.StatusOK, map[string]any{"storyId": id, "likesCount": likesCount, "liked": true})',text:'故事列表（公开）、发布故事（用 MaxBytesReader 防大包）与点赞接口。'},{at:'func (h *Handler) submitFeedback(',to:'writeJSON(w, http.StatusOK, items)',text:'反馈接口先用 MaxBytesReader 限制 16 KB（超限返回 413），按登录用户或 IP 算限流键；最后是个人反馈查询与路由装配注释。'}],solution:{code:`// internal/service/community.go
package service

import (
    "crypto/sha256"
    "encoding/hex"
    "errors"
    "html"
    "strings"
    "sync"
    "time"
    "unicode/utf8"

    "zixishi/internal/store"
)

var (
    ErrBadCommunityInput = errors.New("输入内容格式或长度不合法")
    ErrRateLimited       = errors.New("操作太频繁，请稍后再试")
)

// AllowRequest 实现滑动窗口限流：清理严格早于 nowMs - windowMs 的时间戳，未超限才记录 nowMs。
func AllowRequest(timestamps []int64, nowMs, windowMs int64, limit int) ([]int64, bool) {
    cutoff := nowMs - windowMs
    kept := make([]int64, 0, len(timestamps)+1)
    for _, ts := range timestamps {
        if ts >= cutoff {
            kept = append(kept, ts)
        }
    }
    if limit <= 0 || len(kept) >= limit {
        return kept, false
    }
    kept = append(kept, nowMs)
    return kept, true
}

type RateLimiter struct {
    mu       sync.Mutex
    windowMs int64
    limit    int
    hits     map[string][]int64
}

func NewRateLimiter(windowSec, limit int) *RateLimiter {
    if windowSec < 1 {
        windowSec = 60
    }
    if limit < 1 {
        limit = 5
    }
    return &RateLimiter{windowMs: int64(windowSec) * 1000, limit: limit, hits: map[string][]int64{}}
}

func (l *RateLimiter) Allow(key string) bool {
    l.mu.Lock()
    defer l.mu.Unlock()
    next, ok := AllowRequest(l.hits[key], time.Now().UnixMilli(), l.windowMs, l.limit)
    l.hits[key] = next
    return ok
}

type NotificationPage struct {
    Items       []store.Notification \`json:"items"\`
    UnreadCount int                  \`json:"unreadCount"\`
    Total       int                  \`json:"total"\`
    Page        int                  \`json:"page"\`
    Size        int                  \`json:"size"\`
}

type StoryPage struct {
    Items []store.Story \`json:"items"\`
    Total int           \`json:"total"\`
    Page  int           \`json:"page"\`
    Size  int           \`json:"size"\`
}

type CommunityService struct {
    store   *store.CommunityStore
    limiter *RateLimiter
}

func NewCommunityService(s *store.CommunityStore, limiter *RateLimiter) *CommunityService {
    return &CommunityService{store: s, limiter: limiter}
}

func (s *CommunityService) ListNotifications(userID int, unreadOnly bool, page, size int) (NotificationPage, error) {
    page, size = max(page, 1), min(max(size, 1), 50)
    items, unread, total, err := s.store.ListNotifications(userID, unreadOnly, page, size)
    return NotificationPage{Items: items, UnreadCount: unread, Total: total, Page: page, Size: size}, err
}

func (s *CommunityService) MarkRead(userID, notifID int) (store.Notification, int, error) {
    n, err := s.store.MarkNotificationRead(userID, notifID)
    if err != nil {
        return n, 0, err
    }
    unread, err := s.store.UnreadCount(userID)
    return n, unread, err
}

func (s *CommunityService) MarkAllRead(userID int) (int, error) {
    return s.store.MarkAllNotificationsRead(userID)
}

func (s *CommunityService) CreateStory(userID int, title, content string) (store.Story, error) {
    title = strings.TrimSpace(title)
    content = strings.TrimSpace(content)
    tLen, cLen := utf8.RuneCountInString(title), utf8.RuneCountInString(content)
    if tLen < 1 || tLen > 80 || cLen < 1 || cLen > 2000 {
        return store.Story{}, ErrBadCommunityInput
    }
    return s.store.CreateStory(userID, html.EscapeString(title), html.EscapeString(content))
}

func (s *CommunityService) ListStories(viewerID, page, size int) (StoryPage, error) {
    page, size = max(page, 1), min(max(size, 1), 50)
    items, total, err := s.store.ListStories(viewerID, page, size)
    return StoryPage{Items: items, Total: total, Page: page, Size: size}, err
}

func (s *CommunityService) LikeStory(userID int, username string, storyID int) (int, error) {
    likesCount, newlyLiked, authorID, title, err := s.store.LikeStory(userID, storyID)
    if err != nil {
        return 0, err
    }
    if newlyLiked && authorID != userID {
        _ = s.store.CreateNotification(authorID, "story_like", username+" 赞了你的学习故事", title, "/?page=stories")
    }
    return likesCount, nil
}

func fingerprintFor(kind, message, page string) string {
    if kind != "client_error" {
        return ""
    }
    firstLine, _, _ := strings.Cut(message, "\\n")
    sum := sha256.Sum256([]byte(page + "|" + firstLine))
    return hex.EncodeToString(sum[:16])
}

func (s *CommunityService) SubmitFeedback(userID *int, rateKey, kind, message, page string) (store.FeedbackItem, error) {
    message = strings.TrimSpace(message)
    page = strings.TrimSpace(page)
    if kind != "bug" && kind != "idea" && kind != "client_error" {
        return store.FeedbackItem{}, ErrBadCommunityInput
    }
    mLen, pLen := utf8.RuneCountInString(message), utf8.RuneCountInString(page)
    if mLen < 1 || mLen > 1000 || pLen > 200 {
        return store.FeedbackItem{}, ErrBadCommunityInput
    }
    if !s.limiter.Allow(rateKey) {
        return store.FeedbackItem{}, ErrRateLimited
    }
    fp := fingerprintFor(kind, message, page)
    return s.store.SubmitFeedback(userID, kind, html.EscapeString(message), html.EscapeString(page), fp)
}

func (s *CommunityService) ListMyFeedback(userID int) ([]store.FeedbackItem, error) {
    return s.store.ListMyFeedback(userID)
}

// internal/handler/community.go
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

func (h *Handler) optionalUser(r *http.Request) *store.User {
    u, err := h.auth.CurrentUser(sessionToken(r))
    if err != nil {
        return nil
    }
    return &u
}

func (h *Handler) communityError(w http.ResponseWriter, err error) {
    switch {
    case errors.Is(err, service.ErrBadCommunityInput):
        writeJSON(w, http.StatusBadRequest, map[string]string{"error": err.Error()})
    case errors.Is(err, service.ErrRateLimited):
        writeJSON(w, http.StatusTooManyRequests, map[string]string{"error": err.Error()})
    case errors.Is(err, store.ErrNotFound):
        writeJSON(w, http.StatusNotFound, map[string]string{"error": "资源不存在"})
    default:
        h.serverError(w, err)
    }
}

func (h *Handler) listNotifications(w http.ResponseWriter, r *http.Request) {
    u, ok := h.requireUser(w, r)
    if !ok {
        return
    }
    q := r.URL.Query()
    unreadOnly := q.Get("unreadOnly") == "1" || q.Get("unreadOnly") == "true"
    page, _ := strconv.Atoi(q.Get("page"))
    size, _ := strconv.Atoi(q.Get("size"))
    res, err := h.community.ListNotifications(u.ID, unreadOnly, page, size)
    if err != nil {
        h.communityError(w, err)
        return
    }
    writeJSON(w, http.StatusOK, res)
}

func (h *Handler) markNotificationRead(w http.ResponseWriter, r *http.Request) {
    u, ok := h.requireUser(w, r)
    if !ok {
        return
    }
    id, err := strconv.Atoi(r.PathValue("id"))
    if err != nil || id <= 0 {
        h.communityError(w, store.ErrNotFound)
        return
    }
    n, unread, err := h.community.MarkRead(u.ID, id)
    if err != nil {
        h.communityError(w, err)
        return
    }
    writeJSON(w, http.StatusOK, map[string]any{"id": n.ID, "readAt": n.ReadAt, "unreadCount": unread})
}

func (h *Handler) markAllNotificationsRead(w http.ResponseWriter, r *http.Request) {
    u, ok := h.requireUser(w, r)
    if !ok {
        return
    }
    updated, err := h.community.MarkAllRead(u.ID)
    if err != nil {
        h.communityError(w, err)
        return
    }
    writeJSON(w, http.StatusOK, map[string]any{"updated": updated, "unreadCount": 0})
}

func (h *Handler) listStories(w http.ResponseWriter, r *http.Request) {
    viewerID := 0
    if u := h.optionalUser(r); u != nil {
        viewerID = u.ID
    }
    q := r.URL.Query()
    page, _ := strconv.Atoi(q.Get("page"))
    size, _ := strconv.Atoi(q.Get("size"))
    res, err := h.community.ListStories(viewerID, page, size)
    if err != nil {
        h.communityError(w, err)
        return
    }
    writeJSON(w, http.StatusOK, res)
}

func (h *Handler) createStory(w http.ResponseWriter, r *http.Request) {
    u, ok := h.requireUser(w, r)
    if !ok {
        return
    }
    var body struct {
        Title   string \`json:"title"\`
        Content string \`json:"content"\`
    }
    if err := json.NewDecoder(http.MaxBytesReader(w, r.Body, 16<<10)).Decode(&body); err != nil {
        writeJSON(w, http.StatusBadRequest, map[string]string{"error": "请求正文不合法"})
        return
    }
    st, err := h.community.CreateStory(u.ID, body.Title, body.Content)
    if err != nil {
        h.communityError(w, err)
        return
    }
    writeJSON(w, http.StatusCreated, st)
}

func (h *Handler) likeStory(w http.ResponseWriter, r *http.Request) {
    u, ok := h.requireUser(w, r)
    if !ok {
        return
    }
    id, err := strconv.Atoi(r.PathValue("id"))
    if err != nil || id <= 0 {
        h.communityError(w, store.ErrNotFound)
        return
    }
    likesCount, err := h.community.LikeStory(u.ID, u.Username, id)
    if err != nil {
        h.communityError(w, err)
        return
    }
    writeJSON(w, http.StatusOK, map[string]any{"storyId": id, "likesCount": likesCount, "liked": true})
}

func (h *Handler) submitFeedback(w http.ResponseWriter, r *http.Request) {
    r.Body = http.MaxBytesReader(w, r.Body, 16<<10)
    var body struct {
        Kind    string \`json:"kind"\`
        Message string \`json:"message"\`
        Page    string \`json:"page"\`
    }
    if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
        var maxErr *http.MaxBytesError
        if errors.As(err, &maxErr) {
            writeJSON(w, http.StatusRequestEntityTooLarge, map[string]string{"error": "请求体不能超过 16 KB"})
            return
        }
        writeJSON(w, http.StatusBadRequest, map[string]string{"error": "请求正文不合法"})
        return
    }
    var userID *int
    rateKey := "ip:" + strings.Split(r.RemoteAddr, ":")[0]
    if u := h.optionalUser(r); u != nil {
        userID = &u.ID
        rateKey = "u:" + strconv.Itoa(u.ID)
    }
    item, err := h.community.SubmitFeedback(userID, rateKey, body.Kind, body.Message, body.Page)
    if err != nil {
        h.communityError(w, err)
        return
    }
    writeJSON(w, http.StatusCreated, item)
}

func (h *Handler) listMyFeedback(w http.ResponseWriter, r *http.Request) {
    u, ok := h.requireUser(w, r)
    if !ok {
        return
    }
    items, err := h.community.ListMyFeedback(u.ID)
    if err != nil {
        h.communityError(w, err)
        return
    }
    writeJSON(w, http.StatusOK, items)
}

// 组装：internal/handler/handler.go 的 Handler 增加字段 community *service.CommunityService，Routes() 注册：
//     mux.HandleFunc("GET /api/notifications", h.listNotifications)
//     mux.HandleFunc("POST /api/notifications/{id}/read", h.markNotificationRead)
//     mux.HandleFunc("POST /api/notifications/read-all", h.markAllNotificationsRead)
//     mux.HandleFunc("GET /api/stories", h.listStories)
//     mux.HandleFunc("POST /api/stories", h.createStory)
//     mux.HandleFunc("POST /api/stories/{id}/like", h.likeStory)
//     mux.HandleFunc("POST /api/feedback", h.submitFeedback)
//     mux.HandleFunc("GET /api/feedback", h.listMyFeedback)
// main.go：创建 store.NewCommunityStore(qs.DB())、service.NewRateLimiter(60, envOr("FEEDBACK_RATE_LIMIT", 5)) 与 CommunityService`,explain:[{at:'// internal/service/community.go',to:'"zixishi/internal/store"',text:'社区业务逻辑层：包含滑动窗口限流、HTML 转义和报错指纹计算。'},{at:'var (',to:'ErrRateLimited       = errors.New("操作太频繁，请稍后再试")',text:'定义输入不合法（400）与限流（429）两种业务错误。'},{at:'func AllowRequest(',to:'return kept, true',text:'按 cutoff 过滤过期时间戳，到达 limit 时拒绝且不追加 nowMs，否则记入当前时间戳。'},{at:'type RateLimiter struct {',to:'return ok',text:'用互斥锁保护并发访问，把滑动窗口算法封装成线程安全的按 key 限流器。'},{at:'type NotificationPage struct {',to:'return &CommunityService{store: s, limiter: limiter}',text:'定义分页返回结构并组装 CommunityService。'},{at:'func (s *CommunityService) ListNotifications(',to:'return s.store.MarkAllNotificationsRead(userID)',text:'通知列表查询与单条/全部已读；page 至少为 1，size 限制在 1–50。'},{at:'func (s *CommunityService) CreateStory(',to:'return s.store.CreateStory(userID, html.EscapeString(title), html.EscapeString(content))',text:'用 RuneCountInString 按字数校验标题与正文长度，并用 html.EscapeString 转义特殊字符防 XSS。'},{at:'func (s *CommunityService) ListStories(',to:'return StoryPage{Items: items, Total: total, Page: page, Size: size}, err',text:'分页列出学习故事。'},{at:'func (s *CommunityService) LikeStory(',to:'return likesCount, nil',text:'只有首次点赞且不是作者自己时才创建站内通知，避免重复刷通知。'},{at:'func fingerprintFor(',to:'return hex.EncodeToString(sum[:16])',text:'只对 client_error 计算指纹：取 page 和第一行错误信息做 SHA-256 截断。'},{at:'func (s *CommunityService) SubmitFeedback(',to:'return s.store.ListMyFeedback(userID)',text:'先检查 kind 与文本长度，再执行滑动窗口限流（超限返回 ErrRateLimited），最后生成指纹并转义入库。'},{at:'// internal/handler/community.go',to:'return &u',text:'HTTP 处理层：optionalUser 尝试读会话，没登录时返回 nil，用于故事列表和未登录页面报错上报。'},{at:'func (h *Handler) communityError(',to:'h.serverError(w, err)',text:'把业务错误翻译为 400、429、404 或 500。'},{at:'func (h *Handler) listNotifications(',to:'writeJSON(w, http.StatusOK, map[string]any{"updated": updated, "unreadCount": 0})',text:'通知收件箱、单条已读与全部已读三个接口，全部先通过 requireUser 认人。'},{at:'func (h *Handler) listStories(',to:'writeJSON(w, http.StatusOK, map[string]any{"storyId": id, "likesCount": likesCount, "liked": true})',text:'故事列表（公开）、发布故事（用 MaxBytesReader 防大包）与点赞接口。'},{at:'func (h *Handler) submitFeedback(',to:'writeJSON(w, http.StatusOK, items)',text:'反馈接口先用 MaxBytesReader 限制 16 KB（超限返回 413），按登录用户或 IP 算限流键；最后是个人反馈查询与路由装配注释。'}]}},java:{practice:{steps:['新建 service/CommunityService.java，补完 TODO 1 到 4。','新建 controller/CommunityController.java，在 application.properties 里加上 feedback.rate-limit=${FEEDBACK_RATE_LIMIT:5}。','启动服务确认无报错。'],expect:'Started ZixishiApplication'},code:`// service/CommunityService.java
package com.example.zixishi.service;

import com.example.zixishi.repository.CommunityRepository;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HexFormat;
import java.util.List;
import java.util.Map;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

@Service
public class CommunityService {

    public record NotificationPage(List<CommunityRepository.Notification> items, int unreadCount, int total, int page, int size) {}

    public record StoryPage(List<CommunityRepository.Story> items, int total, int page, int size) {}

    private final CommunityRepository repo;
    private final int rateLimit;
    private final long windowMs = 60_000L;
    private final Map<String, List<Long>> hits = new HashMap<>();

    public CommunityService(CommunityRepository repo, @Value("\${feedback.rate-limit:5}") int rateLimit) {
        this.repo = repo;
        this.rateLimit = Math.max(rateLimit, 1);
    }

    private static StudyService.StudyException error(int status, String message) {
        return new StudyService.StudyException(status, message);
    }

    public static String escapeHtml(String text) {
        if (text == null) return "";
        return text.replace("&", "&amp;").replace("<", "&lt;")
            .replace(">", "&gt;").replace("\\"", "&quot;").replace("'", "&#39;");
    }

    // 滑动窗口限流判断：清理严格早于 nowMs - windowMs 的时间戳，未超限才追加 nowMs
    public synchronized boolean allowRequest(String key, long nowMs) {
        // TODO 1：取出 hits.getOrDefault(key, List.of()) 中所有 >= nowMs - windowMs 的时间戳；
        //         若数量 >= rateLimit 返回 false；否则追加 nowMs 存回 hits 并返回 true
        return true;
    }

    public NotificationPage listNotifications(int userId, boolean unreadOnly, int page, int size) {
        int p = Math.max(page, 1), s = Math.min(Math.max(size, 1), 50);
        return new NotificationPage(repo.listNotifications(userId, unreadOnly, p, s),
            repo.unreadCount(userId), repo.countNotifications(userId, unreadOnly), p, s);
    }

    public Map<String, Object> markRead(int userId, int notifId) {
        var n = repo.markRead(userId, notifId).orElseThrow(() -> error(404, "通知不存在"));
        return Map.of("id", n.id(), "readAt", n.readAt(), "unreadCount", repo.unreadCount(userId));
    }

    public Map<String, Object> markAllRead(int userId) {
        return Map.of("updated", repo.markAllRead(userId), "unreadCount", 0);
    }

    public CommunityRepository.Story createStory(int userId, String title, String content) {
        // TODO 2：strip 后检查 title 1–80 字、content 1–2000 字（不合法抛出 error(400, …)）；
        //         调用 escapeHtml 转义后交给 repo.createStory
        return null;
    }

    public StoryPage listStories(int viewerId, int page, int size) {
        int p = Math.max(page, 1), s = Math.min(Math.max(size, 1), 50);
        return new StoryPage(repo.listStories(viewerId, p, s), repo.countStories(), p, s);
    }

    public int likeStory(int userId, String username, int storyId) {
        // TODO 3：repo.likeStory(userId, storyId) 为空抛出 error(404, "故事不存在")；
        //         若 res.newlyLiked() && res.authorId() != userId 则调用 repo.createNotification；返回 likesCount
        return 0;
    }

    private static String fingerprintFor(String kind, String message, String page) {
        if (!"client_error".equals(kind)) return "";
        try {
            String first = message.split("\\\\R", 2)[0];
            byte[] hash = MessageDigest.getInstance("SHA-256").digest((page + "|" + first).getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(hash).substring(0, 32);
        } catch (Exception e) {
            throw new IllegalStateException(e);
        }
    }

    public CommunityRepository.FeedbackItem submitFeedback(Integer userId, String rateKey, String kind, String message, String page) {
        // TODO 4：校验 kind 属于 bug / idea / client_error、message 1–1000 字、page <= 200 字（否则 400）；
        //         调用 allowRequest(rateKey, System.currentTimeMillis())，false 时抛出 error(429, "操作太频繁，请稍后再试")；
        //         算指纹并转义后交给 repo.submitFeedback
        return null;
    }

    public List<CommunityRepository.FeedbackItem> listMyFeedback(int userId) {
        return repo.listMyFeedback(userId);
    }
}

// controller/CommunityController.java
package com.example.zixishi.controller;

import com.example.zixishi.model.User;
import com.example.zixishi.repository.CommunityRepository;
import com.example.zixishi.service.AuthService;
import com.example.zixishi.service.CommunityService;
import com.example.zixishi.service.StudyService;
import jakarta.servlet.http.HttpServletRequest;
import java.util.List;
import java.util.Map;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api")
public class CommunityController {

    public record StoryBody(String title, String content) {}

    public record FeedbackBody(String kind, String message, String page) {}

    private final AuthService auth;
    private final CommunityService community;

    public CommunityController(AuthService auth, CommunityService community) {
        this.auth = auth;
        this.community = community;
    }

    private User optionalUser(String token) {
        try {
            return auth.currentUser(token);
        } catch (AuthService.AuthException e) {
            return null;
        }
    }

    @GetMapping("/notifications")
    public CommunityService.NotificationPage listNotifications(
            @CookieValue(name = "session", required = false) String token,
            @RequestParam(defaultValue = "false") boolean unreadOnly,
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "20") int size) {
        return community.listNotifications(auth.currentUser(token).id(), unreadOnly, page, size);
    }

    @PostMapping("/notifications/{id}/read")
    public Map<String, Object> markRead(@CookieValue(name = "session", required = false) String token, @PathVariable int id) {
        return community.markRead(auth.currentUser(token).id(), id);
    }

    @PostMapping("/notifications/read-all")
    public Map<String, Object> markAllRead(@CookieValue(name = "session", required = false) String token) {
        return community.markAllRead(auth.currentUser(token).id());
    }

    @GetMapping("/stories")
    public CommunityService.StoryPage listStories(
            @CookieValue(name = "session", required = false) String token,
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "20") int size) {
        User u = optionalUser(token);
        return community.listStories(u == null ? 0 : u.id(), page, size);
    }

    @PostMapping("/stories")
    public ResponseEntity<CommunityRepository.Story> createStory(
            @CookieValue(name = "session", required = false) String token,
            @RequestBody StoryBody body) {
        User u = auth.currentUser(token);
        return ResponseEntity.status(201).body(community.createStory(u.id(), body.title(), body.content()));
    }

    @PostMapping("/stories/{id}/like")
    public Map<String, Object> likeStory(@CookieValue(name = "session", required = false) String token, @PathVariable int id) {
        User u = auth.currentUser(token);
        return Map.of("storyId", id, "likesCount", community.likeStory(u.id(), u.username(), id), "liked", true);
    }

    @PostMapping("/feedback")
    public ResponseEntity<CommunityRepository.FeedbackItem> submitFeedback(
            @CookieValue(name = "session", required = false) String token,
            @RequestBody FeedbackBody body,
            HttpServletRequest request) {
        if (request.getContentLengthLong() > 16384) {
            throw new StudyService.StudyException(413, "请求体不能超过 16 KB");
        }
        User u = optionalUser(token);
        String key = u != null ? "u:" + u.id() : "ip:" + request.getRemoteAddr();
        return ResponseEntity.status(201).body(
            community.submitFeedback(u == null ? null : u.id(), key, body.kind(), body.message(), body.page()));
    }

    @GetMapping("/feedback")
    public List<CommunityRepository.FeedbackItem> listMyFeedback(@CookieValue(name = "session", required = false) String token) {
        return community.listMyFeedback(auth.currentUser(token).id());
    }
}`,explain:[{at:'// service/CommunityService.java',to:'public class CommunityService {',text:'社区业务服务：配置滑动窗口限流参数并保存各用户请求时间戳。'},{at:'public record NotificationPage(',to:'this.rateLimit = Math.max(rateLimit, 1);',text:'定义分页返回结构并从配置读出反馈限流阈值（默认每 60 秒 5 次）。'},{at:'private static StudyService.StudyException error(',to:'replace("\'", "&#39;");',text:'复用带状态码的 StudyException（GlobalErrors 已映射），并写出 HTML 实体转义工具。'},{at:'public synchronized boolean allowRequest(',to:'return true;',text:'滑动窗口限流核心（synchronized 保证线程安全），要你补全。'},{at:'public NotificationPage listNotifications(',to:'return Map.of("updated", repo.markAllRead(userId), "unreadCount", 0);',text:'通知列表查询、单条与全部已读实现。'},{at:'public CommunityRepository.Story createStory(',to:'return null;',text:'故事长度校验与 XSS 转义，要你补全。'},{at:'public StoryPage listStories(',to:'return 0;',text:'故事列表查询与点赞通知逻辑（TODO 3 要你补全）。'},{at:'private static String fingerprintFor(',to:'return repo.listMyFeedback(userId);',text:'报错指纹计算、反馈校验限流（TODO 4 要你补全）以及个人反馈查询。'},{at:'// controller/CommunityController.java',to:'return null;',text:'控制器暴露三组接口，optionalUser 在未登录时返回 null，不拦截公开列表和前端未登录报错。'},{at:'@GetMapping("/notifications")',to:'return community.markAllRead(auth.currentUser(token).id());',text:'通知相关三个接口，全部强制通过 auth.currentUser 校验登录态。'},{at:'@GetMapping("/stories")',to:'return Map.of("storyId", id, "likesCount", community.likeStory(u.id(), u.username(), id), "liked", true);',text:'故事列表（公开）、发布故事（201）与点赞接口。'},{at:'@PostMapping("/feedback")',to:'return community.listMyFeedback(auth.currentUser(token).id());',text:'反馈提交先检查请求体体积上限 16 KB，再按登录用户或来源 IP 限流；GET /api/feedback 只查本人提交记录。'}],solution:{code:`// service/CommunityService.java
package com.example.zixishi.service;

import com.example.zixishi.repository.CommunityRepository;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HexFormat;
import java.util.List;
import java.util.Map;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

@Service
public class CommunityService {

    public record NotificationPage(List<CommunityRepository.Notification> items, int unreadCount, int total, int page, int size) {}

    public record StoryPage(List<CommunityRepository.Story> items, int total, int page, int size) {}

    private final CommunityRepository repo;
    private final int rateLimit;
    private final long windowMs = 60_000L;
    private final Map<String, List<Long>> hits = new HashMap<>();

    public CommunityService(CommunityRepository repo, @Value("\${feedback.rate-limit:5}") int rateLimit) {
        this.repo = repo;
        this.rateLimit = Math.max(rateLimit, 1);
    }

    private static StudyService.StudyException error(int status, String message) {
        return new StudyService.StudyException(status, message);
    }

    public static String escapeHtml(String text) {
        if (text == null) return "";
        return text.replace("&", "&amp;").replace("<", "&lt;")
            .replace(">", "&gt;").replace("\\"", "&quot;").replace("'", "&#39;");
    }

    // 滑动窗口限流判断：清理严格早于 nowMs - windowMs 的时间戳，未超限才追加 nowMs
    public synchronized boolean allowRequest(String key, long nowMs) {
        long cutoff = nowMs - windowMs;
        List<Long> kept = new ArrayList<>();
        for (long ts : hits.getOrDefault(key, List.of())) {
            if (ts >= cutoff) {
                kept.add(ts);
            }
        }
        if (kept.size() >= rateLimit) {
            hits.put(key, kept);
            return false;
        }
        kept.add(nowMs);
        hits.put(key, kept);
        return true;
    }

    public NotificationPage listNotifications(int userId, boolean unreadOnly, int page, int size) {
        int p = Math.max(page, 1), s = Math.min(Math.max(size, 1), 50);
        return new NotificationPage(repo.listNotifications(userId, unreadOnly, p, s),
            repo.unreadCount(userId), repo.countNotifications(userId, unreadOnly), p, s);
    }

    public Map<String, Object> markRead(int userId, int notifId) {
        var n = repo.markRead(userId, notifId).orElseThrow(() -> error(404, "通知不存在"));
        return Map.of("id", n.id(), "readAt", n.readAt(), "unreadCount", repo.unreadCount(userId));
    }

    public Map<String, Object> markAllRead(int userId) {
        return Map.of("updated", repo.markAllRead(userId), "unreadCount", 0);
    }

    public CommunityRepository.Story createStory(int userId, String title, String content) {
        String t = title == null ? "" : title.strip();
        String c = content == null ? "" : content.strip();
        int tLen = t.codePointCount(0, t.length()), cLen = c.codePointCount(0, c.length());
        if (tLen < 1 || tLen > 80 || cLen < 1 || cLen > 2000) {
            throw error(400, "标题 1–80 字，正文 1–2000 字");
        }
        return repo.createStory(userId, escapeHtml(t), escapeHtml(c));
    }

    public StoryPage listStories(int viewerId, int page, int size) {
        int p = Math.max(page, 1), s = Math.min(Math.max(size, 1), 50);
        return new StoryPage(repo.listStories(viewerId, p, s), repo.countStories(), p, s);
    }

    public int likeStory(int userId, String username, int storyId) {
        var res = repo.likeStory(userId, storyId).orElseThrow(() -> error(404, "故事不存在"));
        if (res.newlyLiked() && res.authorId() != userId) {
            repo.createNotification(res.authorId(), "story_like", username + " 赞了你的学习故事", res.title(), "/?page=stories");
        }
        return res.likesCount();
    }

    private static String fingerprintFor(String kind, String message, String page) {
        if (!"client_error".equals(kind)) return "";
        try {
            String first = message.split("\\\\R", 2)[0];
            byte[] hash = MessageDigest.getInstance("SHA-256").digest((page + "|" + first).getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(hash).substring(0, 32);
        } catch (Exception e) {
            throw new IllegalStateException(e);
        }
    }

    public CommunityRepository.FeedbackItem submitFeedback(Integer userId, String rateKey, String kind, String message, String page) {
        String m = message == null ? "" : message.strip();
        String p = page == null ? "" : page.strip();
        if (!"bug".equals(kind) && !"idea".equals(kind) && !"client_error".equals(kind)) {
            throw error(400, "反馈类型不合法");
        }
        int mLen = m.codePointCount(0, m.length()), pLen = p.codePointCount(0, p.length());
        if (mLen < 1 || mLen > 1000 || pLen > 200) {
            throw error(400, "内容 1–1000 字，页面路径不超过 200 字");
        }
        if (!allowRequest(rateKey, System.currentTimeMillis())) {
            throw error(429, "操作太频繁，请稍后再试");
        }
        String fp = fingerprintFor(kind, m, p);
        return repo.submitFeedback(userId, kind, escapeHtml(m), escapeHtml(p), fp);
    }

    public List<CommunityRepository.FeedbackItem> listMyFeedback(int userId) {
        return repo.listMyFeedback(userId);
    }
}

// controller/CommunityController.java
package com.example.zixishi.controller;

import com.example.zixishi.model.User;
import com.example.zixishi.repository.CommunityRepository;
import com.example.zixishi.service.AuthService;
import com.example.zixishi.service.CommunityService;
import com.example.zixishi.service.StudyService;
import jakarta.servlet.http.HttpServletRequest;
import java.util.List;
import java.util.Map;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api")
public class CommunityController {

    public record StoryBody(String title, String content) {}

    public record FeedbackBody(String kind, String message, String page) {}

    private final AuthService auth;
    private final CommunityService community;

    public CommunityController(AuthService auth, CommunityService community) {
        this.auth = auth;
        this.community = community;
    }

    private User optionalUser(String token) {
        try {
            return auth.currentUser(token);
        } catch (AuthService.AuthException e) {
            return null;
        }
    }

    @GetMapping("/notifications")
    public CommunityService.NotificationPage listNotifications(
            @CookieValue(name = "session", required = false) String token,
            @RequestParam(defaultValue = "false") boolean unreadOnly,
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "20") int size) {
        return community.listNotifications(auth.currentUser(token).id(), unreadOnly, page, size);
    }

    @PostMapping("/notifications/{id}/read")
    public Map<String, Object> markRead(@CookieValue(name = "session", required = false) String token, @PathVariable int id) {
        return community.markRead(auth.currentUser(token).id(), id);
    }

    @PostMapping("/notifications/read-all")
    public Map<String, Object> markAllRead(@CookieValue(name = "session", required = false) String token) {
        return community.markAllRead(auth.currentUser(token).id());
    }

    @GetMapping("/stories")
    public CommunityService.StoryPage listStories(
            @CookieValue(name = "session", required = false) String token,
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "20") int size) {
        User u = optionalUser(token);
        return community.listStories(u == null ? 0 : u.id(), page, size);
    }

    @PostMapping("/stories")
    public ResponseEntity<CommunityRepository.Story> createStory(
            @CookieValue(name = "session", required = false) String token,
            @RequestBody StoryBody body) {
        User u = auth.currentUser(token);
        return ResponseEntity.status(201).body(community.createStory(u.id(), body.title(), body.content()));
    }

    @PostMapping("/stories/{id}/like")
    public Map<String, Object> likeStory(@CookieValue(name = "session", required = false) String token, @PathVariable int id) {
        User u = auth.currentUser(token);
        return Map.of("storyId", id, "likesCount", community.likeStory(u.id(), u.username(), id), "liked", true);
    }

    @PostMapping("/feedback")
    public ResponseEntity<CommunityRepository.FeedbackItem> submitFeedback(
            @CookieValue(name = "session", required = false) String token,
            @RequestBody FeedbackBody body,
            HttpServletRequest request) {
        if (request.getContentLengthLong() > 16384) {
            throw new StudyService.StudyException(413, "请求体不能超过 16 KB");
        }
        User u = optionalUser(token);
        String key = u != null ? "u:" + u.id() : "ip:" + request.getRemoteAddr();
        return ResponseEntity.status(201).body(
            community.submitFeedback(u == null ? null : u.id(), key, body.kind(), body.message(), body.page()));
    }

    @GetMapping("/feedback")
    public List<CommunityRepository.FeedbackItem> listMyFeedback(@CookieValue(name = "session", required = false) String token) {
        return community.listMyFeedback(auth.currentUser(token).id());
    }
}`,explain:[{at:'// service/CommunityService.java',to:'public class CommunityService {',text:'社区业务服务：配置滑动窗口限流参数并保存各用户请求时间戳。'},{at:'public record NotificationPage(',to:'this.rateLimit = Math.max(rateLimit, 1);',text:'定义分页返回结构并从配置读出反馈限流阈值（默认每 60 秒 5 次）。'},{at:'private static StudyService.StudyException error(',to:'replace("\'", "&#39;");',text:'复用带状态码的 StudyException（GlobalErrors 已映射），并写出 HTML 实体转义工具。'},{at:'public synchronized boolean allowRequest(',to:'return true;',text:'先过滤出 windowMs 内的有效时间戳；达到上限时只保存清理结果并返回 false，否则追加当前时间戳放行。'},{at:'public NotificationPage listNotifications(',to:'return Map.of("updated", repo.markAllRead(userId), "unreadCount", 0);',text:'通知列表查询、单条与全部已读实现。'},{at:'public CommunityRepository.Story createStory(',to:'return repo.createStory(userId, escapeHtml(t), escapeHtml(c));',text:'用 codePointCount 按字符数校验标题与正文长度，再做 HTML 转义并入库。'},{at:'public StoryPage listStories(',to:'return res.likesCount();',text:'故事列表分页与去重通知：只有首次点赞且不是作者自己时才生成站内通知。'},{at:'private static String fingerprintFor(',to:'return repo.listMyFeedback(userId);',text:'先校验反馈类型与长度，再经过滑动窗口限流（429），对 client_error 生成指纹并转义入库。'},{at:'// controller/CommunityController.java',to:'return null;',text:'控制器暴露三组接口，optionalUser 在未登录时返回 null，不拦截公开列表和前端未登录报错。'},{at:'@GetMapping("/notifications")',to:'return community.markAllRead(auth.currentUser(token).id());',text:'通知相关三个接口，全部强制通过 auth.currentUser 校验登录态。'},{at:'@GetMapping("/stories")',to:'return Map.of("storyId", id, "likesCount", community.likeStory(u.id(), u.username(), id), "liked", true);',text:'故事列表（公开）、发布故事（201）与点赞接口。'},{at:'@PostMapping("/feedback")',to:'return community.listMyFeedback(auth.currentUser(token).id());',text:'反馈提交先检查请求体体积上限 16 KB，再按登录用户或来源 IP 限流；GET /api/feedback 只查本人提交记录。'}]}},node:{practice:{steps:['新建 src/services/community.js，补完 TODO 1 到 4。','新建 src/routes/community.js，并在 app.js 的 notFound 之前挂载 app.use("/api", require("./src/routes/community"))。','运行 node --test 确认原有测试通过，再启动服务。'],expect:'服务正常启动，原有测试全部通过'},code:`// src/services/community.js
const crypto = require("node:crypto");
const store = require("../db/community");

class CommunityError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

const RATE_LIMIT = Math.max(Number(process.env.FEEDBACK_RATE_LIMIT) || 5, 1);
const WINDOW_MS = 60_000;
const hits = new Map();

function escapeHtml(text) {
  return String(text ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

// 滑动窗口限流检查：清理严格早于 nowMs - windowMs 的时间戳，未超限才记录 nowMs
function allowRequest(timestamps, nowMs, windowMs, limit) {
  // TODO 1：过滤出 >= nowMs - windowMs 的元素到 kept；
  //         若 limit <= 0 或 kept.length >= limit 返回 { timestamps: kept, allowed: false }；
  //         否则 push(nowMs) 返回 { timestamps: kept, allowed: true }
  return { timestamps, allowed: true };
}

function listNotifications(userId, unreadOnly, page, size) {
  const p = Math.max(Number(page) || 1, 1);
  const s = Math.min(Math.max(Number(size) || 20, 1), 50);
  return { ...store.listNotifications(userId, unreadOnly, p, s), page: p, size: s };
}

function markRead(userId, notifId) {
  const n = store.markNotificationRead(userId, notifId);
  if (!n) throw new CommunityError(404, "通知不存在");
  return { id: n.id, readAt: n.readAt, unreadCount: store.unreadCount(userId) };
}

function markAllRead(userId) {
  return { updated: store.markAllNotificationsRead(userId), unreadCount: 0 };
}

function createStory(userId, title, content) {
  // TODO 2：trim 后检查 title 1–80 字、content 1–2000 字（用 [...s].length 数字数，不合要求抛 400）；
  //         调用 escapeHtml 后交给 store.createStory
}

function listStories(viewerId, page, size) {
  const p = Math.max(Number(page) || 1, 1);
  const s = Math.min(Math.max(Number(size) || 20, 1), 50);
  return { ...store.listStories(viewerId, p, s), page: p, size: s };
}

function likeStory(userId, username, storyId) {
  // TODO 3：调用 store.likeStory；返回 null 时抛 404；
  //         若 newlyLiked && authorId !== userId 则发一条 kind="story_like" 通知；返回 likesCount
}

function fingerprintFor(kind, message, page) {
  if (kind !== "client_error") return "";
  const first = message.split(/\\r?\\n/, 1)[0];
  return crypto.createHash("sha256").update(\`\${page}|\${first}\`).digest("hex").slice(0, 32);
}

function submitFeedback(userId, rateKey, kind, message, page) {
  // TODO 4：校验 kind 属于 bug / idea / client_error、message 1–1000 字、page <= 200 字（否则 400）；
  //         用 allowRequest 检查限流（不通过抛 CommunityError(429, "操作太频繁，请稍后再试")）；
  //         算指纹并对 message、page 做 escapeHtml 后交给 store.submitFeedback
}

function listMyFeedback(userId) {
  return store.listMyFeedback(userId);
}

module.exports = {
  CommunityError, escapeHtml, allowRequest,
  listNotifications, markRead, markAllRead, createStory, listStories, likeStory, submitFeedback, listMyFeedback,
};

// src/routes/community.js
const express = require("express");
const auth = require("../services/auth");
const community = require("../services/community");
const { requireUser } = require("../middleware");

const router = express.Router();

function optionalUser(req) {
  try {
    return auth.currentUser(req.cookies?.session);
  } catch {
    return null;
  }
}

function handle(status, fn) {
  return (req, res, next) => {
    try {
      res.status(status).json(fn(req));
    } catch (err) {
      if (err instanceof community.CommunityError) return res.status(err.status).json({ error: err.message });
      next(err);
    }
  };
}

router.get("/notifications", requireUser, handle(200, (req) =>
  community.listNotifications(req.user.id, req.query.unreadOnly === "1" || req.query.unreadOnly === "true", req.query.page, req.query.size)
));
router.post("/notifications/:id/read", requireUser, handle(200, (req) =>
  community.markRead(req.user.id, Number(req.params.id))
));
router.post("/notifications/read-all", requireUser, handle(200, (req) =>
  community.markAllRead(req.user.id)
));
router.get("/stories", handle(200, (req) =>
  community.listStories(optionalUser(req)?.id || 0, req.query.page, req.query.size)
));
router.post("/stories", requireUser, handle(201, (req) =>
  community.createStory(req.user.id, req.body?.title, req.body?.content)
));
router.post("/stories/:id/like", requireUser, handle(200, (req) => {
  const storyId = Number(req.params.id);
  return { storyId, likesCount: community.likeStory(req.user.id, req.user.username, storyId), liked: true };
}));
router.post("/feedback", handle(201, (req) => {
  const size = Number(req.headers["content-length"]) || Buffer.byteLength(JSON.stringify(req.body || {}), "utf8");
  if (size > 16384) throw new community.CommunityError(413, "请求体不能超过 16 KB");
  const u = optionalUser(req);
  const key = u ? \`u:\${u.id}\` : \`ip:\${req.ip}\`;
  return community.submitFeedback(u ? u.id : null, key, req.body?.kind, req.body?.message, req.body?.page);
}));
router.get("/feedback", requireUser, handle(200, (req) =>
  community.listMyFeedback(req.user.id)
));

module.exports = router;

// app.js（放在 app.use("/api", notFound) 前面）
app.use("/api", require("./src/routes/community"));`,explain:[{at:'// src/services/community.js',to:'const hits = new Map();',text:'社区业务逻辑层：配置限流次数、60 秒窗口和按 key 存放时间戳的 Map。'},{at:'function escapeHtml(',to:'}',text:'转义 HTML 五大特殊字符，防 XSS。'},{at:'function allowRequest(',to:'return { timestamps, allowed: true };',text:'滑动窗口限流核心，要你补全。'},{at:'function listNotifications(',to:'return { updated: store.markAllNotificationsRead(userId), unreadCount: 0 };',text:'通知列表查询与单条/全部已读封装。'},{at:'function createStory(',to:'return { ...store.listStories(viewerId, p, s), page: p, size: s };',text:'发布故事（TODO 2 要你补全）与分页故事列表查询。'},{at:'function likeStory(',to:'function fingerprintFor(',text:'点赞与触发通知逻辑（TODO 3 要你补全）。'},{at:'if (kind !== "client_error") return "";',to:'}',text:'对 client_error 用页面路径加首行错误计算 SHA-256 指纹。'},{at:'function submitFeedback(',to:'};',text:'反馈提交（TODO 4 要你补全）、个人反馈列表与导出。'},{at:'// src/routes/community.js',to:'next(err);',text:'Express 路由层：optionalUser 尝试读取登录会话；handle 统一把 CommunityError 翻译为 HTTP 状态码。'},{at:'router.get("/notifications"',to:'module.exports = router;',text:'挂载通知、故事和反馈共 8 个接口；POST /feedback 先拦下超过 16 KB 的大载荷再交给业务层限流。'},{at:'// app.js（放在 app.use("/api", notFound) 前面）',to:'app.use("/api", require("./src/routes/community"));',text:'在 app.js 的 404 兜底之前挂载社区路由。'}],solution:{code:`// src/services/community.js
const crypto = require("node:crypto");
const store = require("../db/community");

class CommunityError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

const RATE_LIMIT = Math.max(Number(process.env.FEEDBACK_RATE_LIMIT) || 5, 1);
const WINDOW_MS = 60_000;
const hits = new Map();

function escapeHtml(text) {
  return String(text ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

// 滑动窗口限流检查：清理严格早于 nowMs - windowMs 的时间戳，未超限才记录 nowMs
function allowRequest(timestamps, nowMs, windowMs, limit) {
  const cutoff = nowMs - windowMs;
  const kept = timestamps.filter((ts) => ts >= cutoff);
  if (limit <= 0 || kept.length >= limit) {
    return { timestamps: kept, allowed: false };
  }
  kept.push(nowMs);
  return { timestamps: kept, allowed: true };
}

function listNotifications(userId, unreadOnly, page, size) {
  const p = Math.max(Number(page) || 1, 1);
  const s = Math.min(Math.max(Number(size) || 20, 1), 50);
  return { ...store.listNotifications(userId, unreadOnly, p, s), page: p, size: s };
}

function markRead(userId, notifId) {
  const n = store.markNotificationRead(userId, notifId);
  if (!n) throw new CommunityError(404, "通知不存在");
  return { id: n.id, readAt: n.readAt, unreadCount: store.unreadCount(userId) };
}

function markAllRead(userId) {
  return { updated: store.markAllNotificationsRead(userId), unreadCount: 0 };
}

function createStory(userId, title, content) {
  const t = typeof title === "string" ? title.trim() : "";
  const c = typeof content === "string" ? content.trim() : "";
  if (!t || [...t].length > 80 || !c || [...c].length > 2000) {
    throw new CommunityError(400, "标题 1–80 字，正文 1–2000 字");
  }
  return store.createStory(userId, escapeHtml(t), escapeHtml(c));
}

function listStories(viewerId, page, size) {
  const p = Math.max(Number(page) || 1, 1);
  const s = Math.min(Math.max(Number(size) || 20, 1), 50);
  return { ...store.listStories(viewerId, p, s), page: p, size: s };
}

function likeStory(userId, username, storyId) {
  const res = store.likeStory(userId, storyId);
  if (!res) throw new CommunityError(404, "故事不存在");
  if (res.newlyLiked && res.authorId !== userId) {
    store.createNotification(res.authorId, "story_like", \`\${username} 赞了你的学习故事\`, res.title, "/?page=stories");
  }
  return res.likesCount;
}

function fingerprintFor(kind, message, page) {
  if (kind !== "client_error") return "";
  const first = message.split(/\\r?\\n/, 1)[0];
  return crypto.createHash("sha256").update(\`\${page}|\${first}\`).digest("hex").slice(0, 32);
}

function submitFeedback(userId, rateKey, kind, message, page) {
  const m = typeof message === "string" ? message.trim() : "";
  const p = typeof page === "string" ? page.trim() : "";
  if (!["bug", "idea", "client_error"].includes(kind)) {
    throw new CommunityError(400, "反馈类型不合法");
  }
  if (!m || [...m].length > 1000 || [...p].length > 200) {
    throw new CommunityError(400, "内容 1–1000 字，页面路径不超过 200 字");
  }
  const check = allowRequest(hits.get(rateKey) || [], Date.now(), WINDOW_MS, RATE_LIMIT);
  hits.set(rateKey, check.timestamps);
  if (!check.allowed) throw new CommunityError(429, "操作太频繁，请稍后再试");
  const fp = fingerprintFor(kind, m, p);
  return store.submitFeedback(userId, kind, escapeHtml(m), escapeHtml(p), fp);
}

function listMyFeedback(userId) {
  return store.listMyFeedback(userId);
}

module.exports = {
  CommunityError, escapeHtml, allowRequest,
  listNotifications, markRead, markAllRead, createStory, listStories, likeStory, submitFeedback, listMyFeedback,
};

// src/routes/community.js
const express = require("express");
const auth = require("../services/auth");
const community = require("../services/community");
const { requireUser } = require("../middleware");

const router = express.Router();

function optionalUser(req) {
  try {
    return auth.currentUser(req.cookies?.session);
  } catch {
    return null;
  }
}

function handle(status, fn) {
  return (req, res, next) => {
    try {
      res.status(status).json(fn(req));
    } catch (err) {
      if (err instanceof community.CommunityError) return res.status(err.status).json({ error: err.message });
      next(err);
    }
  };
}

router.get("/notifications", requireUser, handle(200, (req) =>
  community.listNotifications(req.user.id, req.query.unreadOnly === "1" || req.query.unreadOnly === "true", req.query.page, req.query.size)
));
router.post("/notifications/:id/read", requireUser, handle(200, (req) =>
  community.markRead(req.user.id, Number(req.params.id))
));
router.post("/notifications/read-all", requireUser, handle(200, (req) =>
  community.markAllRead(req.user.id)
));
router.get("/stories", handle(200, (req) =>
  community.listStories(optionalUser(req)?.id || 0, req.query.page, req.query.size)
));
router.post("/stories", requireUser, handle(201, (req) =>
  community.createStory(req.user.id, req.body?.title, req.body?.content)
));
router.post("/stories/:id/like", requireUser, handle(200, (req) => {
  const storyId = Number(req.params.id);
  return { storyId, likesCount: community.likeStory(req.user.id, req.user.username, storyId), liked: true };
}));
router.post("/feedback", handle(201, (req) => {
  const size = Number(req.headers["content-length"]) || Buffer.byteLength(JSON.stringify(req.body || {}), "utf8");
  if (size > 16384) throw new community.CommunityError(413, "请求体不能超过 16 KB");
  const u = optionalUser(req);
  const key = u ? \`u:\${u.id}\` : \`ip:\${req.ip}\`;
  return community.submitFeedback(u ? u.id : null, key, req.body?.kind, req.body?.message, req.body?.page);
}));
router.get("/feedback", requireUser, handle(200, (req) =>
  community.listMyFeedback(req.user.id)
));

module.exports = router;

// app.js（放在 app.use("/api", notFound) 前面）
app.use("/api", require("./src/routes/community"));`,explain:[{at:'// src/services/community.js',to:'const hits = new Map();',text:'社区业务逻辑层：配置限流次数、60 秒窗口和按 key 存放时间戳的 Map。'},{at:'function escapeHtml(',to:'}',text:'转义 HTML 五大特殊字符，防 XSS。'},{at:'function allowRequest(',to:'return { timestamps: kept, allowed: true };',text:'过滤出窗口内的未过期时间戳；超限时返回 allowed: false 且不把本次请求塞进窗口，否则追加 nowMs。'},{at:'function listNotifications(',to:'return { updated: store.markAllNotificationsRead(userId), unreadCount: 0 };',text:'通知列表查询与单条/全部已读封装。'},{at:'function createStory(',to:'return store.createStory(userId, escapeHtml(t), escapeHtml(c));',text:'校验标题与正文字符数，转义后入库。'},{at:'function listStories(',to:'return { ...store.listStories(viewerId, p, s), page: p, size: s };',text:'分页列出学习故事。'},{at:'function likeStory(',to:'return res.likesCount;',text:'故事不存在抛 404；首次点赞且非本人故事才发送站内通知。'},{at:'function fingerprintFor(',to:'}',text:'对 client_error 用页面路径和首行报错算 SHA-256 指纹。'},{at:'function submitFeedback(',to:'};',text:'校验类型与长度后先走滑动窗口限流（429），再生成指纹并转义存入数据库，最后导出服务方法。'},{at:'// src/routes/community.js',to:'next(err);',text:'Express 路由层：optionalUser 尝试读取登录会话；handle 统一把 CommunityError 翻译为 HTTP 状态码。'},{at:'router.get("/notifications"',to:'module.exports = router;',text:'挂载通知、故事和反馈共 8 个接口；POST /feedback 先拦下超过 16 KB 的大载荷再交给业务层限流。'},{at:'// app.js（放在 app.use("/api", notFound) 前面）',to:'app.use("/api", require("./src/routes/community"));',text:'在 app.js 的 404 兜底之前挂载社区路由。'}]}},python:{practice:{steps:['新建 app/services/community.py，补完 TODO 1 到 4。','新建 app/routers/community.py，并在 main.py 加上路由和 CommunityError 异常处理器。','启动服务：python main.py，确认启动无报错。'],expect:'Uvicorn running on http://127.0.0.1:8080'},code:`# app/services/community.py
import hashlib
import html
import os
import threading
import time

from app import community_db as store

RATE_LIMIT = max(int(os.getenv("FEEDBACK_RATE_LIMIT", "5") or 5), 1)
WINDOW_MS = 60_000
_lock = threading.Lock()
_hits: dict[str, list[int]] = {}


class CommunityError(Exception):
    def __init__(self, status, message):
        self.status = status
        self.message = message


def allow_request(timestamps: list[int], now_ms: int, window_ms: int, limit: int) -> tuple[list[int], bool]:
    # TODO 1：过滤出 timestamps 中所有 >= now_ms - window_ms 的时间；
    #         若 limit <= 0 或数量 >= limit 返回 (kept, False)；否则追加 now_ms 返回 (kept, True)
    return timestamps, True


def list_notifications(user_id, unread_only, page, size):
    p, s = max(page, 1), min(max(size, 1), 50)
    return {**store.list_notifications(user_id, unread_only, p, s), "page": p, "size": s}


def mark_read(user_id, notif_id):
    n = store.mark_notification_read(user_id, notif_id)
    if n is None:
        raise CommunityError(404, "通知不存在")
    return {"id": n["id"], "readAt": n["readAt"], "unreadCount": store.unread_count(user_id)}


def mark_all_read(user_id):
    return {"updated": store.mark_all_notifications_read(user_id), "unreadCount": 0}


def create_story(user_id, title, content):
    # TODO 2：strip 后校验 title 1–80 字、content 1–2000 字（不合法抛出 CommunityError(400, …)）；
    #         用 html.escape(..., quote=True) 转义后交给 store.create_story
    return None


def list_stories(viewer_id, page, size):
    p, s = max(page, 1), min(max(size, 1), 50)
    return {**store.list_stories(viewer_id, p, s), "page": p, "size": s}


def like_story(user_id, username, story_id):
    # TODO 3：调用 store.like_story，返回 None 抛 404；
    #         若 newlyLiked 且 authorId != user_id 则创建 kind="story_like" 通知；返回 likesCount
    return 0


def fingerprint_for(kind, message, page):
    if kind != "client_error":
        return ""
    first = message.splitlines()[0] if message else ""
    return hashlib.sha256(f"{page}|{first}".encode("utf-8")).hexdigest()[:32]


def submit_feedback(user_id, rate_key, kind, message, page):
    # TODO 4：校验 kind 属于 bug / idea / client_error、message 1–1000 字、page <= 200 字（否则 400）；
    #         加 _lock 调用 allow_request（不通过抛 CommunityError(429, "操作太频繁，请稍后再试")）；
    #         算指纹并用 html.escape 转义后交给 store.submit_feedback
    return None


# app/routers/community.py
import json

from fastapi import APIRouter, Depends, Request
from pydantic import BaseModel

from app import community_db as store
from app.routers.study import require_user
from app.services import auth, community

router = APIRouter(prefix="/api")


class StoryBody(BaseModel):
    title: str = ""
    content: str = ""


def optional_user(request: Request):
    try:
        return auth.current_user(request.cookies.get("session"))
    except auth.AuthError:
        return None


@router.get("/notifications")
def list_notifications(unreadOnly: bool = False, page: int = 1, size: int = 20, user=Depends(require_user)):
    return community.list_notifications(user["id"], unreadOnly, page, size)


@router.post("/notifications/{notif_id}/read")
def mark_read(notif_id: int, user=Depends(require_user)):
    return community.mark_read(user["id"], notif_id)


@router.post("/notifications/read-all")
def mark_all_read(user=Depends(require_user)):
    return community.mark_all_read(user["id"])


@router.get("/stories")
def list_stories(request: Request, page: int = 1, size: int = 20):
    user = optional_user(request)
    return community.list_stories(user["id"] if user else 0, page, size)


@router.post("/stories", status_code=201)
def create_story(body: StoryBody, user=Depends(require_user)):
    return community.create_story(user["id"], body.title, body.content)


@router.post("/stories/{story_id}/like")
def like_story(story_id: int, user=Depends(require_user)):
    return {"storyId": story_id, "likesCount": community.like_story(user["id"], user["username"], story_id), "liked": True}


@router.post("/feedback", status_code=201)
async def submit_feedback(request: Request):
    raw = await request.body()
    if len(raw) > 16384:
        raise community.CommunityError(413, "请求体不能超过 16 KB")
    try:
        body = json.loads(raw.decode("utf-8") or "{}")
    except Exception:
        raise community.CommunityError(400, "请求正文要是 JSON") from None
    user = optional_user(request)
    key = f"u:{user['id']}" if user else f"ip:{request.client.host if request.client else 'unknown'}"
    return community.submit_feedback(
        user["id"] if user else None,
        key,
        str(body.get("kind", "")),
        str(body.get("message", "")),
        str(body.get("page", "")),
    )


@router.get("/feedback")
def list_my_feedback(user=Depends(require_user)):
    return store.list_my_feedback(user["id"])


# main.py（放到兜底路由前，并注册 CommunityError 处理函数）
from app.routers import community as community_routes
from app.services.community import CommunityError

app.include_router(community_routes.router)


@app.exception_handler(CommunityError)
async def community_error(request: Request, exc: CommunityError):
    return JSONResponse({"error": exc.message}, status_code=exc.status)`,explain:[{at:'# app/services/community.py',to:'self.message = message',text:'社区业务逻辑层：配置限流阈值、线程锁和异常类 CommunityError。'},{at:'def allow_request(',to:'return timestamps, True',text:'滑动窗口限流核心，要你补全。'},{at:'def list_notifications(',to:'return {"updated": store.mark_all_notifications_read(user_id), "unreadCount": 0}',text:'通知列表查询与单条/全部已读封装。'},{at:'def create_story(',to:'return None',text:'发布故事校验与 html.escape，要你补全。'},{at:'def list_stories(',to:'return {**store.list_stories(viewer_id, p, s), "page": p, "size": s}',text:'分页查询学习故事。'},{at:'def like_story(',to:'return 0',text:'点赞与触发通知，要你补全。'},{at:'def fingerprint_for(',to:'return None',text:'生成 client_error 指纹；submit_feedback（TODO 4）要你补全。'},{at:'# app/routers/community.py',to:'return None',text:'FastAPI 路由层：optional_user 尝试读取会话但不阻止匿名访问。'},{at:'@router.get("/notifications")',to:'"likesCount": community.like_story(user["id"], user["username"], story_id)',text:'通知三个接口和故事列表、发布、点赞接口。'},{at:'@router.post("/feedback", status_code=201)',to:'return JSONResponse({"error": exc.message}, status_code=exc.status)',text:'读取原始请求体拦截超过 16 KB 的大包（413），再按用户或 IP 限流并落库；最后是个人反馈查询与 main.py 装配。'}],solution:{code:`# app/services/community.py
import hashlib
import html
import os
import threading
import time

from app import community_db as store

RATE_LIMIT = max(int(os.getenv("FEEDBACK_RATE_LIMIT", "5") or 5), 1)
WINDOW_MS = 60_000
_lock = threading.Lock()
_hits: dict[str, list[int]] = {}


class CommunityError(Exception):
    def __init__(self, status, message):
        self.status = status
        self.message = message


def allow_request(timestamps: list[int], now_ms: int, window_ms: int, limit: int) -> tuple[list[int], bool]:
    cutoff = now_ms - window_ms
    kept = [ts for ts in timestamps if ts >= cutoff]
    if limit <= 0 or len(kept) >= limit:
        return kept, False
    kept.append(now_ms)
    return kept, True


def list_notifications(user_id, unread_only, page, size):
    p, s = max(page, 1), min(max(size, 1), 50)
    return {**store.list_notifications(user_id, unread_only, p, s), "page": p, "size": s}


def mark_read(user_id, notif_id):
    n = store.mark_notification_read(user_id, notif_id)
    if n is None:
        raise CommunityError(404, "通知不存在")
    return {"id": n["id"], "readAt": n["readAt"], "unreadCount": store.unread_count(user_id)}


def mark_all_read(user_id):
    return {"updated": store.mark_all_notifications_read(user_id), "unreadCount": 0}


def create_story(user_id, title, content):
    t = title.strip() if isinstance(title, str) else ""
    c = content.strip() if isinstance(content, str) else ""
    if not 1 <= len(t) <= 80 or not 1 <= len(c) <= 2000:
        raise CommunityError(400, "标题 1–80 字，正文 1–2000 字")
    return store.create_story(user_id, html.escape(t, quote=True), html.escape(c, quote=True))


def list_stories(viewer_id, page, size):
    p, s = max(page, 1), min(max(size, 1), 50)
    return {**store.list_stories(viewer_id, p, s), "page": p, "size": s}


def like_story(user_id, username, story_id):
    res = store.like_story(user_id, story_id)
    if res is None:
        raise CommunityError(404, "故事不存在")
    if res["newlyLiked"] and res["authorId"] != user_id:
        store.create_notification(res["authorId"], "story_like", f"{username} 赞了你的学习故事", res["title"], "/?page=stories")
    return res["likesCount"]


def fingerprint_for(kind, message, page):
    if kind != "client_error":
        return ""
    first = message.splitlines()[0] if message else ""
    return hashlib.sha256(f"{page}|{first}".encode("utf-8")).hexdigest()[:32]


def submit_feedback(user_id, rate_key, kind, message, page):
    m = message.strip() if isinstance(message, str) else ""
    p = page.strip() if isinstance(page, str) else ""
    if kind not in ("bug", "idea", "client_error"):
        raise CommunityError(400, "反馈类型不合法")
    if not 1 <= len(m) <= 1000 or len(p) > 200:
        raise CommunityError(400, "内容 1–1000 字，页面路径不超过 200 字")
    with _lock:
        kept, ok = allow_request(_hits.get(rate_key, []), int(time.time() * 1000), WINDOW_MS, RATE_LIMIT)
        _hits[rate_key] = kept
    if not ok:
        raise CommunityError(429, "操作太频繁，请稍后再试")
    fp = fingerprint_for(kind, m, p)
    return store.submit_feedback(user_id, kind, html.escape(m, quote=True), html.escape(p, quote=True), fp)


# app/routers/community.py
import json

from fastapi import APIRouter, Depends, Request
from pydantic import BaseModel

from app import community_db as store
from app.routers.study import require_user
from app.services import auth, community

router = APIRouter(prefix="/api")


class StoryBody(BaseModel):
    title: str = ""
    content: str = ""


def optional_user(request: Request):
    try:
        return auth.current_user(request.cookies.get("session"))
    except auth.AuthError:
        return None


@router.get("/notifications")
def list_notifications(unreadOnly: bool = False, page: int = 1, size: int = 20, user=Depends(require_user)):
    return community.list_notifications(user["id"], unreadOnly, page, size)


@router.post("/notifications/{notif_id}/read")
def mark_read(notif_id: int, user=Depends(require_user)):
    return community.mark_read(user["id"], notif_id)


@router.post("/notifications/read-all")
def mark_all_read(user=Depends(require_user)):
    return community.mark_all_read(user["id"])


@router.get("/stories")
def list_stories(request: Request, page: int = 1, size: int = 20):
    user = optional_user(request)
    return community.list_stories(user["id"] if user else 0, page, size)


@router.post("/stories", status_code=201)
def create_story(body: StoryBody, user=Depends(require_user)):
    return community.create_story(user["id"], body.title, body.content)


@router.post("/stories/{story_id}/like")
def like_story(story_id: int, user=Depends(require_user)):
    return {"storyId": story_id, "likesCount": community.like_story(user["id"], user["username"], story_id), "liked": True}


@router.post("/feedback", status_code=201)
async def submit_feedback(request: Request):
    raw = await request.body()
    if len(raw) > 16384:
        raise community.CommunityError(413, "请求体不能超过 16 KB")
    try:
        body = json.loads(raw.decode("utf-8") or "{}")
    except Exception:
        raise community.CommunityError(400, "请求正文要是 JSON") from None
    user = optional_user(request)
    key = f"u:{user['id']}" if user else f"ip:{request.client.host if request.client else 'unknown'}"
    return community.submit_feedback(
        user["id"] if user else None,
        key,
        str(body.get("kind", "")),
        str(body.get("message", "")),
        str(body.get("page", "")),
    )


@router.get("/feedback")
def list_my_feedback(user=Depends(require_user)):
    return store.list_my_feedback(user["id"])


# main.py（放到兜底路由前，并注册 CommunityError 处理函数）
from app.routers import community as community_routes
from app.services.community import CommunityError

app.include_router(community_routes.router)


@app.exception_handler(CommunityError)
async def community_error(request: Request, exc: CommunityError):
    return JSONResponse({"error": exc.message}, status_code=exc.status)`,explain:[{at:'# app/services/community.py',to:'self.message = message',text:'社区业务逻辑层：配置限流阈值、线程锁和异常类 CommunityError。'},{at:'def allow_request(',to:'return kept, True',text:'过滤出窗口内的未过期时间戳；到达上限则返回 False 不追加 now_ms，否则追加本次时间。'},{at:'def list_notifications(',to:'return {"updated": store.mark_all_notifications_read(user_id), "unreadCount": 0}',text:'通知列表查询与单条/全部已读封装。'},{at:'def create_story(',to:'return store.create_story(user_id, html.escape(t, quote=True), html.escape(c, quote=True))',text:'去除首尾空白并校验字数后，用 html.escape(..., quote=True) 把五大特殊字符转义再入库。'},{at:'def list_stories(',to:'return {**store.list_stories(viewer_id, p, s), "page": p, "size": s}',text:'分页查询学习故事。'},{at:'def like_story(',to:'return res["likesCount"]',text:'故事不存在抛 404；首次点赞且非作者本人时才创建站内通知。'},{at:'def fingerprint_for(',to:'return store.submit_feedback(user_id, kind, html.escape(m, quote=True), html.escape(p, quote=True), fp)',text:'先校验反馈类型与长度，在线程锁保护下调用滑动窗口限流（429），然后计算报错指纹并转义入库。'},{at:'# app/routers/community.py',to:'return None',text:'FastAPI 路由层：optional_user 尝试读取会话但不阻止匿名访问。'},{at:'@router.get("/notifications")',to:'"likesCount": community.like_story(user["id"], user["username"], story_id)',text:'通知三个接口和故事列表、发布、点赞接口。'},{at:'@router.post("/feedback", status_code=201)',to:'return JSONResponse({"error": exc.message}, status_code=exc.status)',text:'读取原始请求体拦截超过 16 KB 的大包（413），再按用户或 IP 限流并落库；最后是个人反馈查询与 main.py 装配。'}]}}}},
  {title:'任务三：前端小铃铛通知菜单、故事卡片与反馈抽屉',body:'把通知中心、学习故事和反馈抽屉接到页面上：导航栏放小铃铛和反馈按钮，监听全局未捕获异常静默上报 client_error，渲染故事时坚持纯文本安全输出。',variants:{html:{body:'在静态页面里新增两部分：\n一、community.js（挂载到 index.html 与 question.html）：渲染小铃铛通知菜单、反馈抽屉，并监听 window error / unhandledrejection 自动上报；\n二、stories.html 与 stories.js：独立的学习故事页，用 createElement + textContent 安全渲染标题和正文，支持发布和点赞。',practice:{steps:['在 index.html 顶部用户栏旁边加入铃铛菜单与反馈抽屉 HTML，并引入 community.js。','新建 stories.html 和 stories.js，补完 TODO 1 到 4。','登录后打开首页和 stories.html：发布一篇带 <script>alert(1)</script> 的故事，确认脚本不会执行；切换另一个账号点赞，再回原账号点小铃铛查看未读与全部已读。'],expect:'页面顶部出现 🔔 角标和“反馈”按钮；故事页安全展示文本，点击点赞后原作者未读角标 +1'},code:`<!-- index.html（放在 #user 用户栏旁边） -->
<a href="stories.html">学习故事</a>
<button id="bellBtn" type="button" aria-label="通知">🔔 <span id="unreadBadge" hidden>0</span></button>
<div id="notifMenu" hidden>
  <button id="readAllBtn" type="button">全部已读</button>
  <ul id="notifList"></ul>
</div>
<button id="feedbackOpenBtn" type="button">反馈</button>
<aside id="feedbackDrawer" hidden>
  <form id="feedbackForm">
    <select name="kind"><option value="bug">问题</option><option value="idea">建议</option></select>
    <textarea name="message" rows="3" maxlength="1000" placeholder="描述问题或建议" required></textarea>
    <button type="submit">提交</button>
    <button id="feedbackCloseBtn" type="button">关闭</button>
  </form>
  <p id="feedbackMsg"></p>
</aside>

// community.js
const bellBtn = document.getElementById("bellBtn");
const badge = document.getElementById("unreadBadge");
const notifMenu = document.getElementById("notifMenu");
const notifList = document.getElementById("notifList");

async function loadNotifications() {
  // TODO 1：GET /api/notifications?size=10；401 时隐藏铃铛并 return；
  //         更新 unreadBadge 的数字（> 0 才显示）并渲染 notifList（空时显示“暂无通知”），点击每条调 POST /api/notifications/{id}/read
}

document.getElementById("readAllBtn").addEventListener("click", async () => {
  await fetch("/api/notifications/read-all", { method: "POST" });
  loadNotifications();
});

bellBtn.addEventListener("click", () => {
  notifMenu.hidden = !notifMenu.hidden;
  if (!notifMenu.hidden) loadNotifications();
});

// TODO 2：绑定 feedbackOpenBtn / feedbackCloseBtn 切换抽屉显隐，提交 feedbackForm 时 POST /api/feedback，显示成功或错误提示

window.addEventListener("error", (event) => {
  fetch("/api/feedback", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ kind: "client_error", message: event.message || "Script error", page: location.pathname + location.search }),
    keepalive: true,
  }).catch(() => {});
});
loadNotifications().catch(() => {});

<!-- stories.html -->
<!DOCTYPE html>
<html lang="zh-CN">
<head><meta charset="utf-8"><title>学习故事 - 面试自习室</title></head>
<body>
  <p><a href="/">← 返回题库</a></p>
  <h1>学习故事</h1>
  <form id="storyForm">
    <p><input name="title" maxlength="80" placeholder="故事标题" required></p>
    <p><textarea name="content" rows="4" cols="60" maxlength="2000" placeholder="写下学习故事" required></textarea></p>
    <button type="submit">发布</button>
  </form>
  <p id="storyMsg"></p>
  <ul id="storyList"></ul>
  <script src="stories.js"></script>
</body>
</html>

// stories.js
const storyList = document.getElementById("storyList");
const storyMsg = document.getElementById("storyMsg");

async function loadStories() {
  // TODO 3：GET /api/stories，空时显示“暂无故事”；
  //         遍历 items 用 createElement + textContent 渲染标题、作者、正文和“点赞 (likesCount)”按钮（点击 POST /api/stories/{id}/like）
}

document.getElementById("storyForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  // TODO 4：POST /api/stories，成功后清空表单并重新 loadStories，失败在 storyMsg 显示错误
});

loadStories();`,explain:[{at:'<!-- index.html（放在 #user 用户栏旁边） -->',to:'</aside>',text:'顶部导航加入学习故事链接、小铃铛菜单和反馈抽屉骨架；只保留必要标签与简短占位符。'},{at:'// community.js',to:'const notifList = document.getElementById("notifList");',text:'取出通知菜单相关 DOM 节点。'},{at:'async function loadNotifications() {',to:'//         更新 unreadBadge',text:'加载通知并渲染角标与菜单列表，要你补全。'},{at:'document.getElementById("readAllBtn").addEventListener(',to:'loadNotifications();',text:'点击“全部已读”并刷新列表。'},{at:'bellBtn.addEventListener("click", () => {',to:'// TODO 2',text:'切换通知菜单并绑定反馈抽屉提交逻辑（TODO 2 要你补全）。'},{at:'window.addEventListener("error", (event) => {',to:'loadNotifications().catch(() => {});',text:'全局监听前端运行时报错，用 keepalive 静默上报 client_error。'},{at:'<!-- stories.html -->',to:'</html>',text:'学习故事页面模板，包含发布表单和列表容器。'},{at:'// stories.js',to:'loadStories();',text:'故事列表安全渲染与点赞逻辑（TODO 3、4 要你补全）。'}],solution:{code:`<!-- index.html（放在 #user 用户栏旁边） -->
<a href="stories.html">学习故事</a>
<button id="bellBtn" type="button" aria-label="通知">🔔 <span id="unreadBadge" hidden>0</span></button>
<div id="notifMenu" hidden>
  <button id="readAllBtn" type="button">全部已读</button>
  <ul id="notifList"></ul>
</div>
<button id="feedbackOpenBtn" type="button">反馈</button>
<aside id="feedbackDrawer" hidden>
  <form id="feedbackForm">
    <select name="kind"><option value="bug">问题</option><option value="idea">建议</option></select>
    <textarea name="message" rows="3" maxlength="1000" placeholder="描述问题或建议" required></textarea>
    <button type="submit">提交</button>
    <button id="feedbackCloseBtn" type="button">关闭</button>
  </form>
  <p id="feedbackMsg"></p>
</aside>

// community.js
const bellBtn = document.getElementById("bellBtn");
const badge = document.getElementById("unreadBadge");
const notifMenu = document.getElementById("notifMenu");
const notifList = document.getElementById("notifList");
const feedbackDrawer = document.getElementById("feedbackDrawer");
const feedbackMsg = document.getElementById("feedbackMsg");

async function loadNotifications() {
  const res = await fetch("/api/notifications?size=10");
  if (res.status === 401) {
    bellBtn.hidden = true;
    return;
  }
  const data = await res.json();
  bellBtn.hidden = false;
  badge.textContent = String(data.unreadCount);
  badge.hidden = data.unreadCount === 0;
  if (!data.items.length) {
    const empty = document.createElement("li");
    empty.textContent = "暂无通知";
    notifList.replaceChildren(empty);
    return;
  }
  notifList.replaceChildren(...data.items.map((n) => {
    const li = document.createElement("li");
    const btn = document.createElement("button");
    btn.type = "button";
    btn.textContent = (n.readAt ? "" : "[未读] ") + n.title + (n.body ? \`：\${n.body}\` : "");
    btn.addEventListener("click", async () => {
      await fetch(\`/api/notifications/\${n.id}/read\`, { method: "POST" });
      loadNotifications();
    });
    li.append(btn);
    return li;
  }));
}

document.getElementById("readAllBtn").addEventListener("click", async () => {
  await fetch("/api/notifications/read-all", { method: "POST" });
  loadNotifications();
});

bellBtn.addEventListener("click", () => {
  notifMenu.hidden = !notifMenu.hidden;
  if (!notifMenu.hidden) loadNotifications();
});

document.getElementById("feedbackOpenBtn").addEventListener("click", () => {
  feedbackDrawer.hidden = false;
});
document.getElementById("feedbackCloseBtn").addEventListener("click", () => {
  feedbackDrawer.hidden = true;
});
document.getElementById("feedbackForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  const fd = new FormData(event.target);
  const res = await fetch("/api/feedback", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ kind: fd.get("kind"), message: fd.get("message"), page: location.pathname }),
  });
  const data = await res.json();
  feedbackMsg.textContent = res.ok ? "已提交" : (data.error || "提交失败");
  if (res.ok) event.target.reset();
});

window.addEventListener("error", (event) => {
  fetch("/api/feedback", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ kind: "client_error", message: event.message || "Script error", page: location.pathname + location.search }),
    keepalive: true,
  }).catch(() => {});
});
loadNotifications().catch(() => {});

<!-- stories.html -->
<!DOCTYPE html>
<html lang="zh-CN">
<head><meta charset="utf-8"><title>学习故事 - 面试自习室</title></head>
<body>
  <p><a href="/">← 返回题库</a></p>
  <h1>学习故事</h1>
  <form id="storyForm">
    <p><input name="title" maxlength="80" placeholder="故事标题" required></p>
    <p><textarea name="content" rows="4" cols="60" maxlength="2000" placeholder="写下学习故事" required></textarea></p>
    <button type="submit">发布</button>
  </form>
  <p id="storyMsg"></p>
  <ul id="storyList"></ul>
  <script src="stories.js"></script>
</body>
</html>

// stories.js
const storyList = document.getElementById("storyList");
const storyMsg = document.getElementById("storyMsg");

async function loadStories() {
  const res = await fetch("/api/stories");
  const data = await res.json();
  if (!data.items.length) {
    const li = document.createElement("li");
    li.textContent = "暂无故事";
    storyList.replaceChildren(li);
    return;
  }
  storyList.replaceChildren(...data.items.map((s) => {
    const li = document.createElement("li");
    const h3 = document.createElement("h3");
    h3.textContent = s.title;
    const meta = document.createElement("p");
    meta.textContent = \`\${s.author} · \${s.createdAt}\`;
    const body = document.createElement("p");
    body.textContent = s.content;
    const likeBtn = document.createElement("button");
    likeBtn.type = "button";
    likeBtn.textContent = s.likedByMe ? \`已赞 (\${s.likesCount})\` : \`点赞 (\${s.likesCount})\`;
    likeBtn.addEventListener("click", async () => {
      const r = await fetch(\`/api/stories/\${s.id}/like\`, { method: "POST" });
      if (r.status === 401) { location.href = "login.html"; return; }
      loadStories();
    });
    li.append(h3, meta, body, likeBtn);
    return li;
  }));
}

document.getElementById("storyForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  const fd = new FormData(event.target);
  const res = await fetch("/api/stories", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title: fd.get("title"), content: fd.get("content") }),
  });
  const data = await res.json();
  if (!res.ok) {
    storyMsg.textContent = data.error || "发布失败";
    return;
  }
  storyMsg.textContent = "";
  event.target.reset();
  loadStories();
});

loadStories().catch(() => {});`,explain:[{at:'<!-- index.html（放在 #user 用户栏旁边） -->',to:'</aside>',text:'顶部导航加入学习故事链接、小铃铛菜单和反馈抽屉骨架；只保留必要标签与简短占位符。'},{at:'// community.js',to:'const feedbackMsg = document.getElementById("feedbackMsg");',text:'取得通知与反馈抽屉节点。'},{at:'async function loadNotifications() {',to:'  }));',text:'未登录隐藏铃铛，登录后渲染未读角标并按纯文本显示每条通知，点击单条触发已读。'},{at:'document.getElementById("readAllBtn").addEventListener(',to:'if (!notifMenu.hidden) loadNotifications();',text:'全部已读和切换菜单显示。'},{at:'document.getElementById("feedbackOpenBtn").addEventListener(',to:'if (res.ok) event.target.reset();',text:'开关反馈抽屉并提交反馈到 /api/feedback，把结果提示给用户。'},{at:'window.addEventListener("error", (event) => {',to:'loadNotifications().catch(() => {});',text:'全局监听前端报错并自动上报 client_error。'},{at:'<!-- stories.html -->',to:'</html>',text:'学习故事页面模板。'},{at:'// stories.js',to:'async function loadStories() {',text:'取出故事列表和提示容器。'},{at:'const res = await fetch("/api/stories");',to:'storyList.replaceChildren(...data.items.map((s) => {',text:'拉取故事列表，空时显示“暂无故事”。'},{at:'const li = document.createElement("li");',to:'}));',text:'全部用 textContent 插入标题、作者与正文，杜绝 innerHTML 带来的 XSS 风险；点赞未登录则跳转登录页。'},{at:'document.getElementById("storyForm").addEventListener(',to:'  loadStories();',text:'提交新故事后重置表单并刷新列表，出错时显示后端提示。'},{at:'loadStories().catch(() => {});',text:'页面加载时初次拉取故事列表。'}]}},react:{body:'在 React 版里新建两个组件：\n一、CommunityWidgets.jsx（挂在 App.jsx 的 UserBar 旁边）：包含小铃铛通知菜单、反馈抽屉以及全局 error / unhandledrejection 报错上报；\n二、StoriesPage.jsx（挂在 /?page=stories）：发布故事与故事卡片列表，依赖 JSX 文本插值自动转义防 XSS。',practice:{steps:['新建 src/CommunityWidgets.jsx 和 src/StoriesPage.jsx，补完 TODO 1 到 4。','在 App.jsx 中引入两个组件，支持 ?page=stories 路由并在顶部放置 <CommunityWidgets />。','运行 npm run dev 登录后测试通知、发故事、点赞与反馈限流提示。'],expect:'顶部显示 🔔 角标与“反馈”按钮；故事页可安全发布并点赞'},code:`// src/CommunityWidgets.jsx
import { useEffect, useState } from "react";

export default function CommunityWidgets() {
  const [items, setItems] = useState([]);
  const [unread, setUnread] = useState(0);
  const [authed, setAuthed] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [kind, setKind] = useState("bug");
  const [message, setMessage] = useState("");
  const [hint, setHint] = useState("");

  async function refreshNotifications() {
    // TODO 1：请求 GET /api/notifications?size=10；401 时 setAuthed(false)，否则更新 items、unread 和 authed
  }

  useEffect(() => {
    refreshNotifications().catch(() => {});
    const report = (msg) =>
      fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind: "client_error", message: String(msg || "Script error"), page: location.pathname + location.search }),
        keepalive: true,
      }).catch(() => {});
    const onErr = (e) => report(e.message);
    window.addEventListener("error", onErr);
    return () => window.removeEventListener("error", onErr);
  }, []);

  async function readOne(id) {
    await fetch(\`/api/notifications/\${id}/read\`, { method: "POST" });
    refreshNotifications();
  }

  async function readAll() {
    await fetch("/api/notifications/read-all", { method: "POST" });
    refreshNotifications();
  }

  async function sendFeedback(event) {
    event.preventDefault();
    // TODO 2：POST /api/feedback，成功提示“已提交”并清空 message，失败提示 data.error
  }

  return (
    <span>
      <a href="/?page=stories">学习故事</a>{" "}
      {authed && (
        <span>
          <button type="button" aria-label="通知" onClick={() => setMenuOpen((o) => !o)}>
            🔔 {unread > 0 && <span>{unread}</span>}
          </button>
          {menuOpen && (
            <div>
              <button type="button" onClick={readAll}>全部已读</button>
              <ul>
                {items.length === 0 ? <li>暂无通知</li> : items.map((n) => (
                  <li key={n.id}>
                    <button type="button" onClick={() => readOne(n.id)}>
                      {!n.readAt && "[未读] "}{n.title}{n.body ? \`：\${n.body}\` : ""}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </span>
      )}{" "}
      <button type="button" onClick={() => setDrawerOpen(true)}>反馈</button>
      {drawerOpen && (
        <aside>
          <form onSubmit={sendFeedback}>
            <select value={kind} onChange={(e) => setKind(e.target.value)}>
              <option value="bug">问题</option>
              <option value="idea">建议</option>
            </select>
            <textarea rows={3} maxLength={1000} value={message} onChange={(e) => setMessage(e.target.value)} placeholder="描述问题或建议" required />
            <button type="submit">提交</button>
            <button type="button" onClick={() => setDrawerOpen(false)}>关闭</button>
          </form>
          {hint && <p>{hint}</p>}
        </aside>
      )}
    </span>
  );
}

// src/StoriesPage.jsx
import { useEffect, useState } from "react";

export default function StoriesPage() {
  const [items, setItems] = useState([]);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [error, setError] = useState("");

  async function load() {
    // TODO 3：GET /api/stories 并 setItems(data.items)
  }

  useEffect(() => { load().catch(() => {}); }, []);

  async function submit(event) {
    event.preventDefault();
    // TODO 4：POST /api/stories，成功清空输入框并刷新 load()，失败 setError(data.error)
  }

  async function like(id) {
    const res = await fetch(\`/api/stories/\${id}/like\`, { method: "POST" });
    if (res.status === 401) window.location.href = "/?page=login";
    else load();
  }

  return (
    <main>
      <p><a href="/">← 返回题库</a></p>
      <h1>学习故事</h1>
      <form onSubmit={submit}>
        <p><input maxLength={80} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="故事标题" required /></p>
        <p><textarea rows={4} cols={60} maxLength={2000} value={content} onChange={(e) => setContent(e.target.value)} placeholder="写下学习故事" required /></p>
        <button type="submit">发布</button>
      </form>
      {error && <p>{error}</p>}
      <ul>
        {items.length === 0 ? <li>暂无故事</li> : items.map((s) => (
          <li key={s.id}>
            <h3>{s.title}</h3>
            <p>{s.author} · {s.createdAt}</p>
            <p>{s.content}</p>
            <button type="button" onClick={() => like(s.id)}>{s.likedByMe ? \`已赞 (\${s.likesCount})\` : \`点赞 (\${s.likesCount})\`}</button>
          </li>
        ))}
      </ul>
    </main>
  );
}`,explain:[{at:'// src/CommunityWidgets.jsx',to:'const [hint, setHint] = useState("");',text:'导航小组件的状态：通知列表、未读数、登录态、菜单/抽屉开关与反馈表单状态。'},{at:'async function refreshNotifications() {',to:'// TODO 1',text:'拉取通知列表与未读数，要你补全。'},{at:'useEffect(() => {',to:'}, []);',text:'挂载时加载通知，并绑定全局 error 监听自动上报 client_error。'},{at:'async function readOne(',to:'// TODO 2',text:'单条/全部已读请求，以及反馈提交逻辑（TODO 2 要你补全）。'},{at:'return (',to:'  );',text:'JSX 渲染小铃铛、下拉通知列表和反馈抽屉，文案只保留必要控件标签与短占位符。'},{at:'// src/StoriesPage.jsx',to:'const [error, setError] = useState("");',text:'故事页面组件与表单状态。'},{at:'async function load() {',to:'event.preventDefault();',text:'加载与发布故事（TODO 3、4 要你补全）。'},{at:'async function like(id) {',to:'return (',text:'点赞动作，401 时引导到登录页。'},{at:'<main>',to:'</main>',text:'故事发布表单与卡片列表；{s.title} 和 {s.content} 由 React 自动按文本转义渲染。'}],solution:{code:`// src/CommunityWidgets.jsx
import { useEffect, useState } from "react";

export default function CommunityWidgets() {
  const [items, setItems] = useState([]);
  const [unread, setUnread] = useState(0);
  const [authed, setAuthed] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [kind, setKind] = useState("bug");
  const [message, setMessage] = useState("");
  const [hint, setHint] = useState("");

  async function refreshNotifications() {
    const res = await fetch("/api/notifications?size=10");
    if (res.status === 401) {
      setAuthed(false);
      return;
    }
    const data = await res.json();
    setAuthed(true);
    setItems(data.items);
    setUnread(data.unreadCount);
  }

  useEffect(() => {
    refreshNotifications().catch(() => {});
    const report = (msg) =>
      fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind: "client_error", message: String(msg || "Script error"), page: location.pathname + location.search }),
        keepalive: true,
      }).catch(() => {});
    const onErr = (e) => report(e.message);
    window.addEventListener("error", onErr);
    return () => window.removeEventListener("error", onErr);
  }, []);

  async function readOne(id) {
    await fetch(\`/api/notifications/\${id}/read\`, { method: "POST" });
    refreshNotifications();
  }

  async function readAll() {
    await fetch("/api/notifications/read-all", { method: "POST" });
    refreshNotifications();
  }

  async function sendFeedback(event) {
    event.preventDefault();
    const res = await fetch("/api/feedback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kind, message, page: location.pathname }),
    });
    const data = await res.json();
    setHint(res.ok ? "已提交" : (data.error || "提交失败"));
    if (res.ok) setMessage("");
  }

  return (
    <span>
      <a href="/?page=stories">学习故事</a>{" "}
      {authed && (
        <span>
          <button type="button" aria-label="通知" onClick={() => setMenuOpen((o) => !o)}>
            🔔 {unread > 0 && <span>{unread}</span>}
          </button>
          {menuOpen && (
            <div>
              <button type="button" onClick={readAll}>全部已读</button>
              <ul>
                {items.length === 0 ? <li>暂无通知</li> : items.map((n) => (
                  <li key={n.id}>
                    <button type="button" onClick={() => readOne(n.id)}>
                      {!n.readAt && "[未读] "}{n.title}{n.body ? \`：\${n.body}\` : ""}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </span>
      )}{" "}
      <button type="button" onClick={() => setDrawerOpen(true)}>反馈</button>
      {drawerOpen && (
        <aside>
          <form onSubmit={sendFeedback}>
            <select value={kind} onChange={(e) => setKind(e.target.value)}>
              <option value="bug">问题</option>
              <option value="idea">建议</option>
            </select>
            <textarea rows={3} maxLength={1000} value={message} onChange={(e) => setMessage(e.target.value)} placeholder="描述问题或建议" required />
            <button type="submit">提交</button>
            <button type="button" onClick={() => setDrawerOpen(false)}>关闭</button>
          </form>
          {hint && <p>{hint}</p>}
        </aside>
      )}
    </span>
  );
}

// src/StoriesPage.jsx
import { useEffect, useState } from "react";

export default function StoriesPage() {
  const [items, setItems] = useState([]);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [error, setError] = useState("");

  async function load() {
    const res = await fetch("/api/stories");
    const data = await res.json();
    setItems(data.items);
  }

  useEffect(() => { load().catch(() => {}); }, []);

  async function submit(event) {
    event.preventDefault();
    const res = await fetch("/api/stories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, content }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "发布失败");
      return;
    }
    setError("");
    setTitle("");
    setContent("");
    load();
  }

  async function like(id) {
    const res = await fetch(\`/api/stories/\${id}/like\`, { method: "POST" });
    if (res.status === 401) window.location.href = "/?page=login";
    else load();
  }

  return (
    <main>
      <p><a href="/">← 返回题库</a></p>
      <h1>学习故事</h1>
      <form onSubmit={submit}>
        <p><input maxLength={80} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="故事标题" required /></p>
        <p><textarea rows={4} cols={60} maxLength={2000} value={content} onChange={(e) => setContent(e.target.value)} placeholder="写下学习故事" required /></p>
        <button type="submit">发布</button>
      </form>
      {error && <p>{error}</p>}
      <ul>
        {items.length === 0 ? <li>暂无故事</li> : items.map((s) => (
          <li key={s.id}>
            <h3>{s.title}</h3>
            <p>{s.author} · {s.createdAt}</p>
            <p>{s.content}</p>
            <button type="button" onClick={() => like(s.id)}>{s.likedByMe ? \`已赞 (\${s.likesCount})\` : \`点赞 (\${s.likesCount})\`}</button>
          </li>
        ))}
      </ul>
    </main>
  );
}`,explain:[{at:'// src/CommunityWidgets.jsx',to:'const [hint, setHint] = useState("");',text:'导航小组件的状态：通知列表、未读数、登录态、菜单/抽屉开关与反馈表单状态。'},{at:'async function refreshNotifications() {',to:'setUnread(data.unreadCount);',text:'未登录隐藏铃铛，登录后同步最新通知列表与未读计数。'},{at:'useEffect(() => {',to:'}, []);',text:'挂载时加载通知，并绑定全局 error 监听自动上报 client_error。'},{at:'async function readOne(',to:'if (res.ok) setMessage("");',text:'单条/全部已读后刷新列表；提交反馈时把后端错误（如 429 限流提示）展示出来。'},{at:'return (',to:'  );',text:'JSX 渲染小铃铛、下拉通知列表和反馈抽屉，文案只保留必要控件标签与短占位符。'},{at:'// src/StoriesPage.jsx',to:'const [error, setError] = useState("");',text:'故事页面组件与表单状态。'},{at:'async function load() {',to:'useEffect(() => { load().catch(() => {}); }, []);',text:'首次挂载时拉取故事列表。'},{at:'async function submit(event) {',to:'load();',text:'提交故事成功后清空表单并重新加载；失败保留输入并提示原因。'},{at:'async function like(id) {',to:'</main>',text:'点赞动作与安全文本渲染，React 默认转义插值内容防止 XSS。'}]}}}},
  {title:'验收：检查通知已读、跨账号隔离、XSS 转义与反馈限流',body:'验收脚本会创建两个新账号 alice 和 bob，按顺序验证：未登录拦截、故事 <script> 转义、去重点赞触发通知、单条/全部已读幂等、跨账号操作别人通知返回 403/404、client_error 指纹聚合、大包拦截，以及连续提交反馈触发 429 限流。\n启动后端时可用默认限流（60 秒 5 次），或显式设置 FEEDBACK_RATE_LIMIT=5 后运行脚本。',practice:{steps:['确认后端服务正在运行（如需自定义限流，设置 FEEDBACK_RATE_LIMIT=5 后重启）。','把下面的脚本保存为 checks/check_l21.py，运行 python checks/check_l21.py，直到全部 ✓。','在页面上亲手发布故事、跨账号点赞，点开顶部小铃铛和反馈抽屉检查一遍。','全部通过后提交：git add . 然后 git commit -m "第 21 关：通知中心、学习故事与反馈"。'],expect:'✓ 健康检查正常且未登录访问通知/发故事返回 401\n✓ 学习故事对 <script> 标签完成了 XSS 转义\n✓ 点赞联合主键防刷且向作者发送了未读通知\n✓ 单条通知标为已读具备幂等性\n✓ 跨账号操作他人通知被隔离（403/404）\n✓ 一键全部已读具备幂等性并清零未读数\n✓ 客户端错误去重累加次数且大载荷被拦截\n✓ 连续提交反馈触发滑动窗口限流返回 429\n\n通过 8 / 8'},code:`import http.cookiejar
import json
import random
import sys
import urllib.error
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
            with opener.open(req, timeout=15) as r:
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


anon, alice, bob = new_client(), new_client(), new_client()
suffix = random.randint(100000, 999999)
for client, prefix in ((alice, "comm_a"), (bob, "comm_b")):
    cred = {"username": f"{prefix}_{suffix}", "password": "secret123"}
    client("POST", "/api/register", cred)
    client("POST", "/api/login", cred)

s1, health = anon("GET", "/api/health")
s2, _ = anon("GET", "/api/notifications")
s3, _ = anon("POST", "/api/stories", {"title": "t", "content": "c"})
check("健康检查正常且未登录访问通知/发故事返回 401", s1 == 200 and obj(health).get("status") == "ok" and s2 == 401 and s3 == 401)

xss_payload = "踩坑记录 <script>alert(1)</script>"
s1, st1 = alice("POST", "/api/stories", {"title": f"故事一_{suffix}", "content": xss_payload})
s2, stories = alice("GET", "/api/stories?page=1&size=20")
found = next((x for x in obj(stories).get("items", []) if obj(x).get("id") == obj(st1).get("id")), {})
check("学习故事对 <script> 标签完成了 XSS 转义",
      s1 == 201 and s2 == 200 and "<script>" not in str(found.get("content")) and "&lt;script&gt;" in str(found.get("content")))

_, st2 = alice("POST", "/api/stories", {"title": f"故事二_{suffix}", "content": "正常内容"})
id1, id2 = obj(st1).get("id"), obj(st2).get("id")
ls1, l1 = bob("POST", f"/api/stories/{id1}/like")
ls2, l1_dup = bob("POST", f"/api/stories/{id1}/like")
ls3, l2 = bob("POST", f"/api/stories/{id2}/like")
ns, notif_data = alice("GET", "/api/notifications?unreadOnly=1")
items = obj(notif_data).get("items", [])
check("点赞联合主键防刷且向作者发送了未读通知",
      ls1 == 200 and ls2 == 200 and ls3 == 200 and obj(l1).get("likesCount") == 1 and obj(l1_dup).get("likesCount") == 1
      and obj(l2).get("likesCount") == 1 and ns == 200 and obj(notif_data).get("unreadCount") == 2 and len(items) == 2)

nid1, nid2 = items[0].get("id"), items[1].get("id")
rs1, r1 = alice("POST", f"/api/notifications/{nid1}/read")
rs2, r1_dup = alice("POST", f"/api/notifications/{nid1}/read")
check("单条通知标为已读具备幂等性",
      rs1 == 200 and rs2 == 200 and obj(r1).get("unreadCount") == 1 and obj(r1_dup).get("unreadCount") == 1 and bool(obj(r1_dup).get("readAt")))

xs, _ = bob("POST", f"/api/notifications/{nid2}/read")
_, after_other = alice("GET", "/api/notifications")
check("跨账号操作他人通知被隔离（403/404）", xs in (403, 404) and obj(after_other).get("unreadCount") == 1)

as1, ra1 = alice("POST", "/api/notifications/read-all")
as2, ra2 = alice("POST", "/api/notifications/read-all")
_, empty_unread = alice("GET", "/api/notifications?unreadOnly=1")
check("一键全部已读具备幂等性并清零未读数",
      as1 == 200 and as2 == 200 and obj(ra1).get("unreadCount") == 0 and obj(ra2).get("updated") == 0
      and obj(empty_unread).get("items") == [] and obj(empty_unread).get("unreadCount") == 0)

err_body = {"kind": "client_error", "message": f"TypeError: bad_{suffix}", "page": "/question.html"}
fs1, f1 = alice("POST", "/api/feedback", err_body)
fs2, f2 = alice("POST", "/api/feedback", err_body)
fs_big, _ = alice("POST", "/api/feedback", {"kind": "bug", "message": "超" * 1001, "page": "/"})
check("客户端错误去重累加次数且大载荷被拦截",
      fs1 in (200, 201) and fs2 in (200, 201) and obj(f1).get("id") == obj(f2).get("id")
      and obj(f2).get("occurrences") == 2 and fs_big in (400, 413))

burst = [bob("POST", "/api/feedback", {"kind": "idea", "message": f"建议 {i}", "page": "/"})[0] for i in range(6)]
check("连续提交反馈触发滑动窗口限流返回 429", all(s in (200, 201) for s in burst[:5]) and burst[5] == 429)

print(f"\\n通过 {passed} / 8")`,explain:[{at:'import http.cookiejar',to:'passed = 0',text:'只用 Python 标准库，初始化服务地址和通过计数。'},{at:'def check(name, ok):',to:'return call',text:'封装带 Cookie 罐子的客户端，每次请求返回状态码和 JSON 结果。'},{at:'def obj(v):',to:'client("POST", "/api/login", cred)',text:'构造三个客户端：未登录访客 anon、用户 alice 与用户 bob。'},{at:'s1, health = anon("GET", "/api/health")',to:'check("健康检查正常且未登录访问通知/发故事返回 401"',text:'第 1 项检查：健康检查正常，未登录访问私有通知或发故事返回 401。'},{at:'xss_payload = "踩坑记录 <script>alert(1)</script>"',to:'"&lt;script&gt;" in str(found.get("content")))',text:'第 2 项检查：发一篇带 script 标签的故事，确认接口返回的 content 里已转义为 &lt;script&gt;。'},{at:'_, st2 = alice("POST", "/api/stories",',to:'len(items) == 2)',text:'第 3 项检查：bob 对第一篇故事连赞两次只记 1 次赞，再赞第二篇；alice 查到恰好 2 条未读通知。'},{at:'nid1, nid2 = items[0].get("id"), items[1].get("id")',to:'bool(obj(r1_dup).get("readAt")))',text:'第 4 项检查：对第一条通知调用两次已读，未读数从 2 降到 1 并保持不变。'},{at:'xs, _ = bob("POST", f"/api/notifications/{nid2}/read")',to:'check("跨账号操作他人通知被隔离（403/404）"',text:'第 5 项检查：bob 尝试已读 alice 的通知必须被拒绝（403/404），且不影响 alice 的未读数。'},{at:'as1, ra1 = alice("POST", "/api/notifications/read-all")',to:'obj(empty_unread).get("unreadCount") == 0)',text:'第 6 项检查：全部已读接口调用两次均返回 200，第二次 updated 为 0，且仅未读筛选为空。'},{at:'err_body = {"kind": "client_error"',to:'and fs_big in (400, 413))',text:'第 7 项检查：同一 client_error 上报两次会合并为同一条记录且 occurrences=2；超长内容返回 400 或 413。'},{at:'burst = [bob("POST", "/api/feedback"',to:'print(f"\\n通过 {passed} / 8")',text:'第 8 项检查：bob 连续发 6 次反馈，前 5 次放行，第 6 次触发滑动窗口限流返回 429，最后打印总通过数。'}]},
  {title:'这一关学到了什么',body:'一、通知中心设计：用 read_at 时间戳代替纯布尔标记，配合 (user_id, read_at, created_at) 复合索引加速未读计数与分页；用 COALESCE(read_at, CURRENT_TIMESTAMP) 保证标为已读幂等；\n二、跨账号隔离：无论是查通知列表、标为已读还是看反馈进度，都必须按会话中的 user_id 过滤；\n三、XSS 纵深防御：后端对用户输入转义 & < > " \' 并限制长度，前端坚持 textContent 与 JSX 文本插值；\n四、联合主键防刷赞：story_likes 主键 (story_id, user_id) 配合事务和 INSERT OR IGNORE，确保并发点赞不重复计数也不重复发通知；\n五、报错收敛与防刷：用部分唯一索引合并未关闭的同类 client_error，配合 16 KB 载荷限制和滑动窗口限流（429）保护服务。\n下一关预告（第 22 关：管理后台、运营看板与权限控制）：把本关收集的用户反馈、客户端报错聚合记录与社区内容汇总到管理员后台，基于 RBAC 角色权限进行排障、处置和审计记录。'}
 ],quiz:[
 {id:'pj-community-1',q:'notifications 表把复合索引建在 (user_id, read_at, created_at) 上，主要好处是什么？',options:['让通知表可以跳过主键直接自动自增','加速按用户查未读计数和按时间分页','自动把七天前的已读通知从表里删掉','防止同一个用户在同一秒收到两条通知'],why:['主键 id 自增由 INTEGER PRIMARY KEY AUTOINCREMENT 负责，和普通索引无关。','','索引只加速查询，不会自动删除过期数据。','普通索引不做唯一性约束，也不会限制同秒插入两条。'],answer:1,explain:'查询未读计数（WHERE user_id = ? AND read_at IS NULL）和按时间倒序分页都能直接走这个联合索引的前缀，避免全表扫描。'},
 {id:'pj-community-2',type:'judge',q:'重复调用 POST /api/notifications/{id}/read 把同一条通知标为已读，应该保持幂等并返回 200，同时保留第一次的已读时间。',answer:true,explain:'用 COALESCE(read_at, CURRENT_TIMESTAMP) 更新时，首次已读写入当前时间，重复请求会保留原有 read_at 且返回 200，不会让未读数出错。'},
 {id:'pj-community-3',q:'用户 B 尝试调用 POST /api/notifications/{id}/read 标记用户 A 的通知，后端应该如何处理？',options:['返回 200，但悄悄跳过数据库更新操作','直接标为已读，方便用户互相帮忙清理','拒绝访问并返回 403 或 404，不改数据','把这条通知复制一份放进用户 B 收件箱'],why:['返回 200 会误导调用方以为请求合法且已生效。','通知是私有资源，跨账号修改属于越权漏洞。','','不能把他人通知越权泄露或复制到当前用户账号下。'],answer:2,explain:'通知属于私有资源。按 id 和 user_id 一起过滤并返回 404（或显式检查归属返回 403），能彻底阻止跨账号越权。'},
 {id:'pj-community-4',type:'multi',q:'在学习故事功能中，为了有效防范 XSS 跨站脚本攻击，下面哪些做法是合理的？（多选）',options:['后端保存或输出时对特殊字符做 HTML 转义','原生 JS 里用 textContent 而不是 innerHTML','在前端输入框里限制长度后即可跳过后端校验','会话 Cookie 加上 HttpOnly 防止脚本偷取'],why:['','','前端限制很容易被脚本或 curl 绕过，后端校验和转义不能省略。',''],answers:[0,1,3],explain:'防范 XSS 需要纵深防御：后端校验长度并清洗转义输入，前端用 textContent/JSX 按纯文本渲染，会话 Cookie 加 HttpOnly 保护凭证。'},
 {id:'pj-community-5',q:'为了防止同一个用户对同一篇学习故事重复点赞刷高点赞数，最可靠的做法是？',options:['只在前端点击按钮后把按钮暂时禁用','在内存数组里记下最近十次点赞的编号','先查故事总赞数再由前端传回加一后的值','建点赞表设联合主键并在事务里插入更新'],why:['刷新页面或直接请求接口就能绕过前端按钮禁用。','服务重启会丢内存记录，而且多并发或超过十条后会漏判。','前端传来的计数值不可信，并发下也会互相覆盖。',''],answer:3,explain:'数据库里的联合主键 (story_id, user_id) 配合事务内的 INSERT OR IGNORE，在高并发连点下也能做到严格一人一赞。'},
 {id:'pj-community-6',type:'multi',q:'关于客户端错误上报（client_error）与反馈收集接口，下面哪些设计是正确的？（多选）',options:['限制单次请求体大小，避免超大堆栈撑爆库','把用户的完整登录会话令牌写进报错载荷里','用错误指纹把同一页面相同报错合并并累加','不设调用频率限制，确保每次点击都能入库'],why:['','会话令牌属于敏感凭证，上报报错时绝不能收集或落库。','','不限流容易被恶意脚本刷满数据库，需要按窗口限流。'],answers:[0,2],explain:'错误收集既要防滥用（限制载荷大小 + 滑动窗口限流），又要防噪音（用 fingerprint 聚合重复报错并累加 occurrences），且不能采集敏感令牌。'},
 {id:'pj-community-7',type:'fill',q:'在 SQLite 中，利用 ＿(read_at, CURRENT_TIMESTAMP) 可以在首次标记已读时写入当前时间，再次调用时保留原有时间不覆盖。',accepted:['COALESCE','coalesce'],explain:'COALESCE 返回参数列表里第一个非 NULL 的值：未读时 read_at 为 NULL 就取 CURRENT_TIMESTAMP；已读时保留原有的 read_at。'},
 {id:'pj-community-8',type:'short',q:'请说明滑动窗口限流如何避免固定时间窗口的“边界突发”问题，以及 client_error 的 fingerprint 去重如何配合第 22 关的管理后台工作？',reference:'固定窗口在分钟边界（如 00:59 和 01:01）可能被瞬间打入两倍限额的请求；滑动窗口记录每次请求的时间戳，每次先清理早于 now - window 的记录再判断数量，任意连续 window 时长内都不会超限。client_error 通过对“报错类型 + 页面 + 首行信息”生成 fingerprint，配合状态为 open 的部分唯一索引，把成百上千次相同报错聚合成一条记录并累加 occurrences；第 22 关的管理后台就能按影响次数排序优先处理高频崩溃，修复并设为 resolved 后若再出现会重新开单。',points:['说明固定窗口在时间边界可能出现两倍突发流量','说明滑动窗口清理过期时间戳并统计当前窗口内请求数','说明 fingerprint 聚合相同未解决报错并累加 occurrences','说明第 22 关后台可按影响次数排障并在 resolved 后重新追踪'],explain:'滑动窗口守住接口防刷底线，指纹聚合让反馈和报错列表保持清晰，两者共同为运营排查减负。'},
 {id:'pj-community-code-1',type:'code',q:'实现滑动窗口限流判断函数 AllowRequest(timestamps, nowMs, windowMs, limit)：先清除严格早于 nowMs - windowMs 的过期时间戳；若 limit <= 0 或窗口内剩余请求数已达到 limit，返回原未过期记录与 false；否则把 nowMs 追加到末尾并返回更新后的记录与 true。',reference:`func AllowRequest(timestamps []int64, nowMs, windowMs int64, limit int) ([]int64, bool) {
    cutoff := nowMs - windowMs
    kept := make([]int64, 0, len(timestamps)+1)
    for _, ts := range timestamps {
        if ts >= cutoff {
            kept = append(kept, ts)
        }
    }
    if limit <= 0 || len(kept) >= limit {
        return kept, false
    }
    kept = append(kept, nowMs)
    return kept, true
}`,points:['正确计算窗口起点 cutoff = nowMs - windowMs 并过滤过期时间戳（保留 >= cutoff）','处理边界条件 limit <= 0 或当前剩余数量 >= limit 时拒绝并返回 false','拒绝时不把 nowMs 写入保留列表，避免失败请求占满配额','允许时将 nowMs 追加到窗口记录末尾并返回 true'],explain:'滑动窗口只保留最近 windowMs 毫秒内的成功时间戳；注意拒绝时不要追加本次时间戳，否则被限流的恶意重试会把窗口永远占满。'},
 {id:'pj-community-go-1',stack:'go',q:'Go 中使用 http.MaxBytesReader(w, r.Body, 16<<10) 读取反馈请求体，主要作用是？',options:['把收到的所有 JSON 字段自动转成小写','限制最多读取 16 KB，防止大请求打爆内存','自动把请求体里的 HTML 标签全部转义','让同一个连接的请求按顺序排队等待执行'],why:['字段名映射由 json struct 标签控制。','','转义需要自己调用 html.EscapeString，MaxBytesReader 只管字节上限。','它只限制单个请求体的读取字节数，不负责排队调度。'],answer:1,explain:'http.MaxBytesReader 会在读取字节数超过上限后立即停止读取并返回 MaxBytesError，常用于防大载荷攻击（返回 413）。'},
 {id:'pj-community-java-1',stack:'java',q:'Java 中对学习故事写入点赞记录并更新故事点赞数，为什么要在方法上加上 @Transactional？',options:['保证插点赞表和加点赞数同成功同回滚','让 Spring 自动把接口的返回值缓存起来','让接口在没有登录时跳过身份检查逻辑','自动把方法里的字符串参数做 HTML 转义'],why:['','@Transactional 管数据库事务，不做 HTTP 响应缓存。','登录检查在控制器或拦截器里完成，和事务注解无关。','HTML 转义需要单独在代码里调用工具方法处理。'],answer:0,explain:'点赞操作既要插入 story_likes 也要更新 stories.likes_count，放在同一个事务里才能避免出现只插表没加数或连接不一致的问题。'},
 {id:'pj-community-node-1',stack:'node',q:'Node.js（better-sqlite3）中执行 INSERT OR IGNORE INTO story_likes 后，怎么知道是不是第一次点赞？',options:['检查返回数组 length 是否等于一','查看 result.lastInsertRowid 是否大于零','判断 result.changes 是否大于零','捕获数据库抛出的唯一约束异常来判断'],why:['.run() 返回元信息对象，不是数组。','联合主键表若未关注 rowid 或被 IGNORE，看 changes 更直接准确。','','加了 OR IGNORE 后冲突时不会抛异常，而是静默跳过。'],answer:2,explain:'INSERT OR IGNORE 在主键冲突时会跳过插入，result.changes 为 0；只有真正插入了新行时 result.changes 才为 1。'},
 {id:'pj-community-python-1',stack:'python',q:'Python 中用 html.escape(text, quote=True) 清洗故事内容时，除了 <、>、& 之外还会转义什么？',options:['会把中文标点和空格一起转成实体','会把换行符转成 HTML 的 br 标签','会把反斜杠和百分号全部替换删掉','会把双引号和单引号一起转成实体'],why:['html.escape 不会改动中文标点和普通空格。','它只转义 HTML 特殊字符，不会自动插入 <br> 标签。','反斜杠和百分号不会被它修改或删除。',''],answer:3,explain:'quote=True 是默认值，会把双引号转成 &quot;、单引号转成 &#x27;，这样放进 HTML 属性里也安全。'},
]};
