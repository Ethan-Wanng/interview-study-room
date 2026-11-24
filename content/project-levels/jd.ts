// 项目实战“复刻面试自习室”第 19 关：JD 深度调研、参考简历与专项补题。
import type {AiLevel} from '../journey';

export const pjJd:AiLevel={id:'pj-jd',title:'JD 深度调研与参考简历',summary:'把非结构化岗位 JD 拆解成结构化调研报告，结合内容哈希缓存、分阶段流式补全、技术栈与 STAR 参考简历生成及专项补题打通备考闭环',lessons:[
  {title:'这一关做什么：从粘贴一条招聘 JD 到备考闭环',body:'第 16 关已经让大模型支持流式输出和超时兜底，第 17 关又把“我的题库”和“学习笔记”放进了数据库。这一关把它们串成一套直接服务求职备考的闭环工作台：\n一、JD 结构化拆解（POST /api/jd/research）：粘贴一段招聘 JD（或真实面经）和目标岗位名称，后端调用模型把散乱文本拆成硬性要求、隐性考察信号、技术盲区、考点专题与分阶段复习路径；\n二、内容哈希缓存：对归一化后的岗位和 JD 计算 SHA-256 摘要（promptHash），相同内容二次请求直接命中本地缓存，零 Token 消耗秒开；\n三、分阶段流式补全（POST /api/jd/fill-phase）：先快出主报告骨架，再按阶段通过 NDJSON 流式按需生成专项练习题，并可一键导入第 17 关的个人题库与笔记；\n四、参考简历与打印导出（POST /api/jd/resume）：根据调研画像与盲区推导出分组技术栈和 STAR 法则参考项目，附带面试深挖追问角度，支持工作台分标签页浏览与一键打印简历。'},
  {title:'把非结构化 JD 拆成结构化调研报告',body:'招聘 JD 往往是大段文字和无序列表，前端没办法直接画进度条、分阶段出题或做能力对照。必须先让模型输出严格约定的 JSON 结构：\n一、requirements：显性硬性门槛（例如“熟悉 Go GMP 调度、MySQL InnoDB 索引与分布式事务”）；\n二、tacitSignals：从字里行间提取的隐性考察信号（例如写着“从 0 到 1 主导核心链路”，通常意味着二面会深挖架构取舍与故障复盘）；\n三、techGaps：候选人最容易暴露短板的盲区与扣分点；\n四、topics 与 roadmap：对应专题标签，以及 3–4 个阶段的学习路径骨架（phase、title、goals，每阶段预留 quizzes 数组）；\n五、resume：按需生成的参考简历结构。\n大模型输出时经常带 <think>…</think> 思考段、```json … ``` 代码围栏，或者在数组末尾多写一个逗号。后端解析时要按四步清洗：剥离思考标签与围栏 → 截取最外层配对的 { 和 } → 清理尾逗号与控制字符 → 反序列化后做字段修剪与校验（空数组兜底、关键字段为空直接返回 502）。',code:`{
  "roleTitle": "资深 Go 后端研发工程师",
  "requirements": ["3年以上 Go 并发与工程经验", "熟悉 MySQL MVCC 与 Redis 集群"],
  "tacitSignals": ["关注高并发交易链路稳定性与线上 P99 排查能力"],
  "techGaps": ["分布式锁主从切换丢失兜底", "GC STW 与逃逸分析定位"],
  "topics": ["Go 并发模型", "MySQL 事务锁", "缓存高可用"],
  "roadmap": [
    {
      "phase": "Day 1–2",
      "title": "Go 运行时与并发控制",
      "goals": ["掌握 GMP 调度与 channel 底层原理", "能用 pprof 定位 Goroutine 泄漏"],
      "quizzes": []
    }
  ]
}`,explain:[{at:'"roleTitle":',text:'标准化后的目标岗位名称，用作报告主标题和参考简历的目标岗位默认值。'},{at:'"requirements":',text:'从原始 JD 提炼的显性硬门槛列表，供“岗位画像”标签页直接渲染。'},{at:'"tacitSignals":',text:'隐性考察信号：帮求职者读懂 JD 背后的真实面试重心。'},{at:'"techGaps":',text:'技术盲区与高频扣分点，后续专项补题和参考简历都会重点覆盖它们。'},{at:'"topics":',text:'提炼出的考点专题标签，方便按专题刷题或导入题库。'},{at:'"roadmap": [',to:'"quizzes": []',text:'分阶段复习路径骨架：阶段一先返回 phase、title 和 goals，quizzes 留空，交给第 2 步的 fill-phase 懒加载流式补齐。'}]},
  {title:'分阶段生成与内容哈希缓存',body:'为什么不让模型一次请求就把画像、四个阶段几十道题和完整简历全吐出来？\n一、容易超时和截断：一次生成上万字耗时动辄一两分钟，很容易撞到网关超时或 max_tokens 截断；\n二、浪费 Token：用户往往只关注其中一两个薄弱阶段，把所有阶段一次性生成完会白白烧额度。\n因此我们采用“先核心概览，后懒加载 fill-phase”的两段式流式设计，并叠加两级机制：\n一、SHA-256 内容哈希缓存（promptHash）：先把岗位名称去空格转小写，再把 JD 的 \\r\\n 统一成 \\n、折叠连续空格和空行，拼接后计算 SHA-256。用户哪怕多按了几次回车或空格，再次提交同一份 JD 也能立刻命中 jd_cache 返回 cached: true，不向大模型发任何请求；\n二、NDJSON 分阶段流式与非破坏性合并：调用 POST /api/jd/fill-phase 时逐行输出 JSON 事件（connected → status → done/error），成功时只更新 roadmap[stepIdx].quizzes，完整保留已有 resume 和其他已补全阶段；一旦中途出错，直接输出 error 事件，绝不覆盖数据库里的旧进度。',code:`POST /api/jd/research   {"jdText": "...", "role": "Go 后端工程师"}
→ 200 {"recordId": 1, "promptHash": "a3f1...", "cached": false, "report": { ... }}

POST /api/jd/fill-phase {"recordId": 1, "stepIdx": 0}
→ 200 application/x-ndjson
  {"type": "connected", "recordId": 1, "stepIdx": 0}
  {"type": "status", "stepIdx": 0, "phase": "Day 1–2"}
  {"type": "done", "stepIdx": 0, "quizzes": [ ... ], "report": { ... }}

POST /api/jd/resume     {"recordId": 1}
→ 200 {"cached": false, "targetRole": "...", "positioning": "...", "techStack": [...], "projects": [...], "report": {...}}`,explain:[{at:'POST /api/jd/research',to:'→ 200 {"recordId": 1,',text:'主调研接口：先算 promptHash 查缓存，命中时 cached 为 true 且不调上游；未命中才调用模型拆解并入库。'},{at:'POST /api/jd/fill-phase',to:'{"type": "done",',text:'分阶段流式补全接口：校验记录与阶段索引后返回 application/x-ndjson 流，逐行发送连接、阶段状态与合并后的最新 report。'},{at:'POST /api/jd/resume',to:'→ 200 {"cached": false,',text:'参考简历生成接口：同样带缓存查重，返回分组 techStack、STAR 结构 projects 以及挂上 resume 字段的完整 report。'}]},
  {title:'从调研报告推导参考简历与专项补题',body:'拿到结构化调研报告后，简历与补题就有了明确的“靶心”：\n一、分组技术栈（techStack）：把零散技能词按核心领域归成 3–5 组（{ category, items }），每条写出“底层机制 + 工程场景”，并对照 requirements 权重排序；\n二、STAR 参考项目（projects）：每个项目包含背景痛点（background）、关键架构与调优动作（actions）、量化收益（results），以及面试官最可能深挖的追问（interviewAngles），前端可以直接带入“模拟项目深挖”；\n三、数据清洗（normalizeResumePayload）：模型偶尔会输出空的技能分组或没有动作项的空项目，入库前必须修剪空白并剔除残缺项，确保 techStack 与 projects 都非空；\n四、专项补题与题库闭环：fill-phase 结合当前阶段目标与 techGaps 生成单选、简答等练习题，前端补全后可以一键导入第 17 关的个人题库或笔记，做到“发现盲区 → 刷题补短 → 更新简历话术”。'},
  {title:'任务一：JD 调研缓存、阶段合并与参考简历生成接口',body:'这一步先建好三张表（jd_cache、jd_resume_cache、jd_reports），写好四个核心纯函数（promptHash、extractJSON、normalizeResumePayload、mergeReportPhase），再完成 POST /api/jd/research 与 POST /api/jd/resume 两个接口。',variants:{go:{practice:{steps:['新建 internal/store/jd.go 与 internal/service/jd.go，补完 TODO 1 到 TODO 4。','新建 internal/handler/jd.go，在 Handler 里注入 jd *service.JDService，并在 Routes 中注册 POST /api/jd/research 与 POST /api/jd/resume（第 2 个任务再补 fill-phase）。','运行 go vet ./... 和 go build ./...，确认编译无误。'],expect:'go vet ./... 与 go build ./... 均无报错输出'},code:`// internal/store/jd.go
package store

import (
    "database/sql"
    "errors"
)

var jdSchema = []string{
    \`CREATE TABLE IF NOT EXISTS jd_cache (
        prompt_hash TEXT PRIMARY KEY,
        report_json TEXT NOT NULL,
        updated_at  TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )\`,
    \`CREATE TABLE IF NOT EXISTS jd_resume_cache (
        prompt_hash TEXT PRIMARY KEY,
        resume_json TEXT NOT NULL,
        updated_at  TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )\`,
    \`CREATE TABLE IF NOT EXISTS jd_reports (
        id          INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id     INTEGER NOT NULL REFERENCES users(id),
        prompt_hash TEXT    NOT NULL,
        role        TEXT    NOT NULL,
        jd_text     TEXT    NOT NULL,
        report_json TEXT    NOT NULL,
        updated_at  TEXT    NOT NULL DEFAULT CURRENT_TIMESTAMP
    )\`,
}

type JDRecord struct {
    ID         int    \`json:"id"\`
    UserID     int    \`json:"userId"\`
    PromptHash string \`json:"promptHash"\`
    Role       string \`json:"role"\`
    JDText     string \`json:"jdText"\`
    ReportJSON string \`json:"reportJson"\`
}

type JDStore struct{ db *sql.DB }

func NewJDStore(db *sql.DB) (*JDStore, error) {
    for _, stmt := range jdSchema {
        if _, err := db.Exec(stmt); err != nil {
            return nil, err
        }
    }
    return &JDStore{db: db}, nil
}

func (s *JDStore) GetCache(hash string) (string, bool, error) {
    var raw string
    err := s.db.QueryRow("SELECT report_json FROM jd_cache WHERE prompt_hash = ?", hash).Scan(&raw)
    if errors.Is(err, sql.ErrNoRows) {
        return "", false, nil
    }
    return raw, err == nil, err
}

func (s *JDStore) SaveCache(hash, reportJSON string) error {
    _, err := s.db.Exec(\`INSERT INTO jd_cache (prompt_hash, report_json) VALUES (?, ?)
        ON CONFLICT(prompt_hash) DO UPDATE SET report_json = excluded.report_json, updated_at = CURRENT_TIMESTAMP\`,
        hash, reportJSON)
    return err
}

func (s *JDStore) GetResumeCache(hash string) (string, bool, error) {
    var raw string
    err := s.db.QueryRow("SELECT resume_json FROM jd_resume_cache WHERE prompt_hash = ?", hash).Scan(&raw)
    if errors.Is(err, sql.ErrNoRows) {
        return "", false, nil
    }
    return raw, err == nil, err
}

func (s *JDStore) SaveResumeCache(hash, resumeJSON string) error {
    _, err := s.db.Exec(\`INSERT INTO jd_resume_cache (prompt_hash, resume_json) VALUES (?, ?)
        ON CONFLICT(prompt_hash) DO UPDATE SET resume_json = excluded.resume_json, updated_at = CURRENT_TIMESTAMP\`,
        hash, resumeJSON)
    return err
}

func (s *JDStore) CreateReport(userID int, hash, role, jdText, reportJSON string) (int, error) {
    res, err := s.db.Exec(
        "INSERT INTO jd_reports (user_id, prompt_hash, role, jd_text, report_json) VALUES (?, ?, ?, ?, ?)",
        userID, hash, role, jdText, reportJSON)
    if err != nil {
        return 0, err
    }
    id, err := res.LastInsertId()
    return int(id), err
}

func (s *JDStore) GetReport(userID, recordID int) (JDRecord, error) {
    var r JDRecord
    err := s.db.QueryRow(
        "SELECT id, user_id, prompt_hash, role, jd_text, report_json FROM jd_reports WHERE id = ? AND user_id = ?",
        recordID, userID).Scan(&r.ID, &r.UserID, &r.PromptHash, &r.Role, &r.JDText, &r.ReportJSON)
    if errors.Is(err, sql.ErrNoRows) {
        return r, ErrNotFound
    }
    return r, err
}

func (s *JDStore) UpdateReport(userID, recordID int, reportJSON string) error {
    _, err := s.db.Exec(
        "UPDATE jd_reports SET report_json = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND user_id = ?",
        reportJSON, recordID, userID)
    return err
}

// internal/service/jd.go
package service

import (
    "crypto/sha256"
    "encoding/hex"
    "encoding/json"
    "errors"
    "regexp"
    "strings"
    "unicode/utf8"

    "zixishi/internal/ai"
    "zixishi/internal/store"
)

var (
    ErrBadJDInput     = errors.New("请提供至少 20 字的岗位 JD")
    ErrJDNotFound     = errors.New("调研记录不存在")
    ErrInvalidStepIdx = errors.New("阶段索引超出范围")
)

type JDQuiz struct {
    Type      string   \`json:"type"\`
    Q         string   \`json:"q"\`
    Options   []string \`json:"options,omitempty"\`
    Answer    *int     \`json:"answer,omitempty"\`
    Reference string   \`json:"reference,omitempty"\`
    Points    []string \`json:"points,omitempty"\`
    Explain   string   \`json:"explain"\`
}

type JDRoadmapStep struct {
    Phase   string   \`json:"phase"\`
    Title   string   \`json:"title"\`
    Goals   []string \`json:"goals"\`
    Quizzes []JDQuiz \`json:"quizzes,omitempty"\`
}

type SkillGroup struct {
    Category string   \`json:"category"\`
    Items    []string \`json:"items"\`
}

type ResumeProject struct {
    Name            string   \`json:"name"\`
    Role            string   \`json:"role"\`
    Period          string   \`json:"period,omitempty"\`
    Stack           []string \`json:"stack"\`
    Background      string   \`json:"background"\`
    Actions         []string \`json:"actions"\`
    Results         []string \`json:"results"\`
    InterviewAngles []string \`json:"interviewAngles"\`
}

type ReferenceResume struct {
    TargetRole  string          \`json:"targetRole"\`
    Positioning string          \`json:"positioning"\`
    TechStack   []SkillGroup    \`json:"techStack"\`
    Projects    []ResumeProject \`json:"projects"\`
}

type JDReport struct {
    RoleTitle    string           \`json:"roleTitle"\`
    Requirements []string         \`json:"requirements"\`
    TacitSignals []string         \`json:"tacitSignals"\`
    TechGaps     []string         \`json:"techGaps"\`
    Topics       []string         \`json:"topics"\`
    Roadmap      []JDRoadmapStep  \`json:"roadmap"\`
    Resume       *ReferenceResume \`json:"resume,omitempty"\`
}

type ResearchResponse struct {
    RecordID   int      \`json:"recordId"\`
    PromptHash string   \`json:"promptHash"\`
    Cached     bool     \`json:"cached"\`
    Report     JDReport \`json:"report"\`
}

type ResumeResponse struct {
    Cached bool \`json:"cached"\`
    ReferenceResume
    Report JDReport \`json:"report"\`
}

type JDService struct {
    ai *ai.Client
    jd *store.JDStore
}

func NewJDService(client *ai.Client, jd *store.JDStore) *JDService {
    return &JDService{ai: client, jd: jd}
}

var (
    thinkTagRe   = regexp.MustCompile(\`(?is)<think>.*?</think>\`)
    trailingRe   = regexp.MustCompile(\`,\\s*([}\\]])\`)
    horizSpaceRe = regexp.MustCompile(\`[ \\t]+\`)
)

func PromptHash(role, jdText string) string {
    // TODO 1：把 \\r\\n 统一成 \\n，逐行压缩横向空格、去首尾空白并过滤空行；
    //         拼成 strings.ToLower(strings.TrimSpace(role)) + "\\n" + normalizedJD，返回 sha256 十六进制字符串
    return ""
}

func cleanJSONText(raw string) string {
    s := thinkTagRe.ReplaceAllString(raw, "")
    s = strings.TrimSpace(s)
    start, end := strings.Index(s, "{"), strings.LastIndex(s, "}")
    if start >= 0 && end >= start {
        s = s[start : end+1]
    }
    return trailingRe.ReplaceAllString(s, "$1")
}

func trimStrings(items []string) []string {
    out := []string{}
    for _, it := range items {
        if t := strings.TrimSpace(it); t != "" {
            out = append(out, t)
        }
    }
    return out
}

func NormalizeResumePayload(raw ReferenceResume, fallbackRole string) (ReferenceResume, error) {
    // TODO 2：修剪 TargetRole（为空用 fallbackRole 或 "目标岗位"）和 Positioning；
    //         过滤 TechStack（保留 Category 与 trimStrings(Items) 均非空的分组）；
    //         过滤 Projects（保留 Name 与 trimStrings(Actions) 均非空的项目）；
    //         若 TechStack 或 Projects 为空返回 ErrAIFailed，否则返回清洗后的结构体
    return ReferenceResume{}, nil
}

func MergeReportPhase(report JDReport, stepIdx int, newQuizzes []JDQuiz) (JDReport, error) {
    // TODO 3：校验 0 <= stepIdx < len(report.Roadmap)（不合法返回 ErrInvalidStepIdx）；
    //         复制 Roadmap 切片并完整保留 Resume 等其他字段；
    //         过滤掉 Q 为空的题，仅当新题列表非空时替换 Roadmap[stepIdx].Quizzes
    return report, nil
}

func (s *JDService) Research(userID int, role, jdText string, bypassCache bool) (ResearchResponse, error) {
    // TODO 4：校验 jdText 去空白后不少于 20 个字；计算 PromptHash 并先查 s.jd.GetCache；
    //         未命中则调用 s.ai.Chat 拆解 JD，解析并校验 JDReport，写入 GetCache/SaveCache 与 CreateReport；
    //         最后返回 ResearchResponse
    return ResearchResponse{}, nil
}

func (s *JDService) GenerateResume(userID, recordID int, bypassCache bool) (ResumeResponse, error) {
    // TODO 5：查 s.jd.GetReport 确认归属（ErrNotFound 换成 ErrJDNotFound）；
    //         先查 s.jd.GetResumeCache，未命中则调用 s.ai.Chat 并用 NormalizeResumePayload 清洗后写缓存；
    //         把 resume 挂到 report.Resume（保留已有 roadmap），调用 UpdateReport 后返回 ResumeResponse
    return ResumeResponse{}, nil
}`,explain:[{at:'// internal/store/jd.go',to:'var jdSchema = []string{',text:'新建 JD 调研数据访问层，定义三张表。'},{at:'`CREATE TABLE IF NOT EXISTS jd_cache (',to:'`CREATE TABLE IF NOT EXISTS jd_reports (',text:'jd_cache 按 prompt_hash 存完整主调研 JSON；jd_resume_cache 按同一个哈希存参考简历 JSON。'},{at:'id          INTEGER PRIMARY KEY AUTOINCREMENT,',to:'}',text:'jd_reports 保存每个用户的历史调研记录，支持多阶段追加补题与重进恢复。'},{at:'type JDRecord struct {',to:'return &JDStore{db: db}, nil',text:'记录结构体与构造函数：启动时自动建表。'},{at:'func (s *JDStore) GetCache(',to:'func (s *JDStore) SaveResumeCache(',text:'两条缓存的读写方法：读取时没找到返回 false 而不是报错，写入使用 upsert 幂等覆盖。'},{at:'_, err := s.db.Exec(`INSERT INTO jd_resume_cache',to:'return r, err',text:'保存和读取用户调研记录；GetReport 带上 user_id 条件防越权。'},{at:'func (s *JDStore) UpdateReport(',to:'reportJSON, recordID, userID)',text:'更新用户调研记录中的最新 report_json（如补全题目或生成参考简历后写回）。'},{at:'return err',to:'}',text:'返回更新操作的结果。'},{at:'// internal/service/jd.go',to:'ErrInvalidStepIdx = errors.New("阶段索引超出范围")',text:'定义 JD 业务逻辑层的错误类型。'},{at:'type JDQuiz struct {',to:'Report JDReport',text:'定义结构化调研报告、STAR 参考简历以及两个接口的返回 DTO；ResumeResponse 嵌入了 ReferenceResume，JSON 会把 techStack 与 projects 平铺在顶层。'},{at:'type JDService struct {',to:'horizSpaceRe = regexp.MustCompile',text:'依赖 AI 客户端和 JD 数据访问层，并预编译清洗用的正则。'},{at:'func PromptHash(',to:'func cleanJSONText(',text:'PromptHash（TODO 1）计算归一化摘要；cleanJSONText 负责剥离 <think> 标签、截取外层花括号并去除尾逗号。'},{at:'s := thinkTagRe.ReplaceAllString',to:'func trimStrings(',text:'实现 JSON 清洗与字符串数组修剪。'},{at:'out := []string{}',to:'func NormalizeResumePayload(',text:'修剪并保留非空字符串；后面两个核心函数和接口逻辑交给你补全。'},{at:'// TODO 2',to:'return ResumeResponse{}, nil',text:'依次补全参考简历清洗（TODO 2）、非破坏性阶段合并（TODO 3）、主调研缓存与解析（TODO 4）、参考简历生成（TODO 5）。'}],solution:{code:`// internal/store/jd.go
package store

import (
    "database/sql"
    "errors"
)

var jdSchema = []string{
    \`CREATE TABLE IF NOT EXISTS jd_cache (
        prompt_hash TEXT PRIMARY KEY,
        report_json TEXT NOT NULL,
        updated_at  TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )\`,
    \`CREATE TABLE IF NOT EXISTS jd_resume_cache (
        prompt_hash TEXT PRIMARY KEY,
        resume_json TEXT NOT NULL,
        updated_at  TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )\`,
    \`CREATE TABLE IF NOT EXISTS jd_reports (
        id          INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id     INTEGER NOT NULL REFERENCES users(id),
        prompt_hash TEXT    NOT NULL,
        role        TEXT    NOT NULL,
        jd_text     TEXT    NOT NULL,
        report_json TEXT    NOT NULL,
        updated_at  TEXT    NOT NULL DEFAULT CURRENT_TIMESTAMP
    )\`,
}

type JDRecord struct {
    ID         int    \`json:"id"\`
    UserID     int    \`json:"userId"\`
    PromptHash string \`json:"promptHash"\`
    Role       string \`json:"role"\`
    JDText     string \`json:"jdText"\`
    ReportJSON string \`json:"reportJson"\`
}

type JDStore struct{ db *sql.DB }

func NewJDStore(db *sql.DB) (*JDStore, error) {
    for _, stmt := range jdSchema {
        if _, err := db.Exec(stmt); err != nil {
            return nil, err
        }
    }
    return &JDStore{db: db}, nil
}

func (s *JDStore) GetCache(hash string) (string, bool, error) {
    var raw string
    err := s.db.QueryRow("SELECT report_json FROM jd_cache WHERE prompt_hash = ?", hash).Scan(&raw)
    if errors.Is(err, sql.ErrNoRows) {
        return "", false, nil
    }
    return raw, err == nil, err
}

func (s *JDStore) SaveCache(hash, reportJSON string) error {
    _, err := s.db.Exec(\`INSERT INTO jd_cache (prompt_hash, report_json) VALUES (?, ?)
        ON CONFLICT(prompt_hash) DO UPDATE SET report_json = excluded.report_json, updated_at = CURRENT_TIMESTAMP\`,
        hash, reportJSON)
    return err
}

func (s *JDStore) GetResumeCache(hash string) (string, bool, error) {
    var raw string
    err := s.db.QueryRow("SELECT resume_json FROM jd_resume_cache WHERE prompt_hash = ?", hash).Scan(&raw)
    if errors.Is(err, sql.ErrNoRows) {
        return "", false, nil
    }
    return raw, err == nil, err
}

func (s *JDStore) SaveResumeCache(hash, resumeJSON string) error {
    _, err := s.db.Exec(\`INSERT INTO jd_resume_cache (prompt_hash, resume_json) VALUES (?, ?)
        ON CONFLICT(prompt_hash) DO UPDATE SET resume_json = excluded.resume_json, updated_at = CURRENT_TIMESTAMP\`,
        hash, resumeJSON)
    return err
}

func (s *JDStore) CreateReport(userID int, hash, role, jdText, reportJSON string) (int, error) {
    res, err := s.db.Exec(
        "INSERT INTO jd_reports (user_id, prompt_hash, role, jd_text, report_json) VALUES (?, ?, ?, ?, ?)",
        userID, hash, role, jdText, reportJSON)
    if err != nil {
        return 0, err
    }
    id, err := res.LastInsertId()
    return int(id), err
}

func (s *JDStore) GetReport(userID, recordID int) (JDRecord, error) {
    var r JDRecord
    err := s.db.QueryRow(
        "SELECT id, user_id, prompt_hash, role, jd_text, report_json FROM jd_reports WHERE id = ? AND user_id = ?",
        recordID, userID).Scan(&r.ID, &r.UserID, &r.PromptHash, &r.Role, &r.JDText, &r.ReportJSON)
    if errors.Is(err, sql.ErrNoRows) {
        return r, ErrNotFound
    }
    return r, err
}

func (s *JDStore) UpdateReport(userID, recordID int, reportJSON string) error {
    _, err := s.db.Exec(
        "UPDATE jd_reports SET report_json = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND user_id = ?",
        reportJSON, recordID, userID)
    return err
}

// internal/service/jd.go
package service

import (
    "crypto/sha256"
    "encoding/hex"
    "encoding/json"
    "errors"
    "regexp"
    "strings"
    "unicode/utf8"

    "zixishi/internal/ai"
    "zixishi/internal/store"
)

var (
    ErrBadJDInput     = errors.New("请提供至少 20 字的岗位 JD")
    ErrJDNotFound     = errors.New("调研记录不存在")
    ErrInvalidStepIdx = errors.New("阶段索引超出范围")
)

type JDQuiz struct {
    Type      string   \`json:"type"\`
    Q         string   \`json:"q"\`
    Options   []string \`json:"options,omitempty"\`
    Answer    *int     \`json:"answer,omitempty"\`
    Reference string   \`json:"reference,omitempty"\`
    Points    []string \`json:"points,omitempty"\`
    Explain   string   \`json:"explain"\`
}

type JDRoadmapStep struct {
    Phase   string   \`json:"phase"\`
    Title   string   \`json:"title"\`
    Goals   []string \`json:"goals"\`
    Quizzes []JDQuiz \`json:"quizzes,omitempty"\`
}

type SkillGroup struct {
    Category string   \`json:"category"\`
    Items    []string \`json:"items"\`
}

type ResumeProject struct {
    Name            string   \`json:"name"\`
    Role            string   \`json:"role"\`
    Period          string   \`json:"period,omitempty"\`
    Stack           []string \`json:"stack"\`
    Background      string   \`json:"background"\`
    Actions         []string \`json:"actions"\`
    Results         []string \`json:"results"\`
    InterviewAngles []string \`json:"interviewAngles"\`
}

type ReferenceResume struct {
    TargetRole  string          \`json:"targetRole"\`
    Positioning string          \`json:"positioning"\`
    TechStack   []SkillGroup    \`json:"techStack"\`
    Projects    []ResumeProject \`json:"projects"\`
}

type JDReport struct {
    RoleTitle    string           \`json:"roleTitle"\`
    Requirements []string         \`json:"requirements"\`
    TacitSignals []string         \`json:"tacitSignals"\`
    TechGaps     []string         \`json:"techGaps"\`
    Topics       []string         \`json:"topics"\`
    Roadmap      []JDRoadmapStep  \`json:"roadmap"\`
    Resume       *ReferenceResume \`json:"resume,omitempty"\`
}

type ResearchResponse struct {
    RecordID   int      \`json:"recordId"\`
    PromptHash string   \`json:"promptHash"\`
    Cached     bool     \`json:"cached"\`
    Report     JDReport \`json:"report"\`
}

type ResumeResponse struct {
    Cached bool \`json:"cached"\`
    ReferenceResume
    Report JDReport \`json:"report"\`
}

type JDService struct {
    ai *ai.Client
    jd *store.JDStore
}

func NewJDService(client *ai.Client, jd *store.JDStore) *JDService {
    return &JDService{ai: client, jd: jd}
}

var (
    thinkTagRe   = regexp.MustCompile(\`(?is)<think>.*?</think>\`)
    trailingRe   = regexp.MustCompile(\`,\\s*([}\\]])\`)
    horizSpaceRe = regexp.MustCompile(\`[ \\t]+\`)
)

func PromptHash(role, jdText string) string {
    norm := strings.ReplaceAll(strings.ReplaceAll(jdText, "\\r\\n", "\\n"), "\\r", "\\n")
    lines := []string{}
    for _, line := range strings.Split(norm, "\\n") {
        clean := strings.TrimSpace(horizSpaceRe.ReplaceAllString(line, " "))
        if clean != "" {
            lines = append(lines, clean)
        }
    }
    key := strings.ToLower(strings.TrimSpace(role)) + "\\n" + strings.Join(lines, "\\n")
    sum := sha256.Sum256([]byte(key))
    return hex.EncodeToString(sum[:])
}

func cleanJSONText(raw string) string {
    s := thinkTagRe.ReplaceAllString(raw, "")
    s = strings.TrimSpace(s)
    start, end := strings.Index(s, "{"), strings.LastIndex(s, "}")
    if start >= 0 && end >= start {
        s = s[start : end+1]
    }
    return trailingRe.ReplaceAllString(s, "$1")
}

func trimStrings(items []string) []string {
    out := []string{}
    for _, it := range items {
        if t := strings.TrimSpace(it); t != "" {
            out = append(out, t)
        }
    }
    return out
}

func NormalizeResumePayload(raw ReferenceResume, fallbackRole string) (ReferenceResume, error) {
    role := strings.TrimSpace(raw.TargetRole)
    if role == "" {
        role = strings.TrimSpace(fallbackRole)
    }
    if role == "" {
        role = "目标岗位"
    }
    stack := []SkillGroup{}
    for _, grp := range raw.TechStack {
        cat := strings.TrimSpace(grp.Category)
        items := trimStrings(grp.Items)
        if cat != "" && len(items) > 0 {
            stack = append(stack, SkillGroup{Category: cat, Items: items})
        }
    }
    projects := []ResumeProject{}
    for _, p := range raw.Projects {
        name := strings.TrimSpace(p.Name)
        actions := trimStrings(p.Actions)
        if name == "" || len(actions) == 0 {
            continue
        }
        pRole := strings.TrimSpace(p.Role)
        if pRole == "" {
            pRole = "核心研发"
        }
        projects = append(projects, ResumeProject{
            Name:            name,
            Role:            pRole,
            Period:          strings.TrimSpace(p.Period),
            Stack:           trimStrings(p.Stack),
            Background:      strings.TrimSpace(p.Background),
            Actions:         actions,
            Results:         trimStrings(p.Results),
            InterviewAngles: trimStrings(p.InterviewAngles),
        })
    }
    if len(stack) == 0 || len(projects) == 0 {
        return ReferenceResume{}, ErrAIFailed
    }
    return ReferenceResume{
        TargetRole:  role,
        Positioning: strings.TrimSpace(raw.Positioning),
        TechStack:   stack,
        Projects:    projects,
    }, nil
}

func MergeReportPhase(report JDReport, stepIdx int, newQuizzes []JDQuiz) (JDReport, error) {
    if stepIdx < 0 || stepIdx >= len(report.Roadmap) {
        return report, ErrInvalidStepIdx
    }
    roadmap := make([]JDRoadmapStep, len(report.Roadmap))
    copy(roadmap, report.Roadmap)
    clean := []JDQuiz{}
    for _, qz := range newQuizzes {
        if strings.TrimSpace(qz.Q) != "" {
            qz.Q = strings.TrimSpace(qz.Q)
            clean = append(clean, qz)
        }
    }
    if len(clean) > 0 {
        roadmap[stepIdx].Quizzes = clean
    }
    report.Roadmap = roadmap
    return report, nil
}

func (s *JDService) Research(userID int, role, jdText string, bypassCache bool) (ResearchResponse, error) {
    text := strings.TrimSpace(jdText)
    if utf8.RuneCountInString(text) < 20 {
        return ResearchResponse{}, ErrBadJDInput
    }
    cleanRole := strings.TrimSpace(role)
    if cleanRole == "" {
        cleanRole = "目标岗位"
    }
    hash := PromptHash(cleanRole, text)
    var report JDReport
    cached := false
    if !bypassCache {
        if raw, ok, err := s.jd.GetCache(hash); err != nil {
            return ResearchResponse{}, err
        } else if ok && json.Unmarshal([]byte(raw), &report) == nil && len(report.Roadmap) > 0 {
            cached = true
        }
    }
    if !cached {
        sys := "你是资深技术面试官。请把岗位 JD 拆解为 JSON：roleTitle, requirements[], tacitSignals[], techGaps[], topics[], roadmap[{phase,title,goals[]}]。"
        out, err := s.ai.Chat(sys, "目标岗位："+cleanRole+"\\n"+text)
        if err != nil {
            return ResearchResponse{}, aiError(err)
        }
        if err := json.Unmarshal([]byte(cleanJSONText(out)), &report); err != nil || len(report.Requirements) == 0 || len(report.Roadmap) == 0 {
            return ResearchResponse{}, ErrAIFailed
        }
        if strings.TrimSpace(report.RoleTitle) == "" {
            report.RoleTitle = cleanRole
        }
        rawBytes, _ := json.Marshal(report)
        if err := s.jd.SaveCache(hash, string(rawBytes)); err != nil {
            return ResearchResponse{}, err
        }
    }
    rawBytes, _ := json.Marshal(report)
    id, err := s.jd.CreateReport(userID, hash, cleanRole, text, string(rawBytes))
    if err != nil {
        return ResearchResponse{}, err
    }
    return ResearchResponse{RecordID: id, PromptHash: hash, Cached: cached, Report: report}, nil
}

func (s *JDService) GenerateResume(userID, recordID int, bypassCache bool) (ResumeResponse, error) {
    rec, err := s.jd.GetReport(userID, recordID)
    if errors.Is(err, store.ErrNotFound) {
        return ResumeResponse{}, ErrJDNotFound
    }
    if err != nil {
        return ResumeResponse{}, err
    }
    var report JDReport
    if err := json.Unmarshal([]byte(rec.ReportJSON), &report); err != nil {
        return ResumeResponse{}, err
    }
    var resume ReferenceResume
    cached := false
    if !bypassCache {
        if raw, ok, err := s.jd.GetResumeCache(rec.PromptHash); err != nil {
            return ResumeResponse{}, err
        } else if ok && json.Unmarshal([]byte(raw), &resume) == nil && len(resume.TechStack) > 0 && len(resume.Projects) > 0 {
            cached = true
        }
    }
    if !cached {
        sys := "你是资深技术招聘负责人。请输出参考简历 JSON：targetRole, positioning, techStack[{category,items[]}], projects[{name,role,period,stack[],background,actions[],results[],interviewAngles[]}]。"
        out, err := s.ai.Chat(sys, "目标岗位："+report.RoleTitle+"\\n要求："+strings.Join(report.Requirements, "；")+"\\n盲区："+strings.Join(report.TechGaps, "；"))
        if err != nil {
            return ResumeResponse{}, aiError(err)
        }
        var parsed ReferenceResume
        if err := json.Unmarshal([]byte(cleanJSONText(out)), &parsed); err != nil {
            return ResumeResponse{}, ErrAIFailed
        }
        if resume, err = NormalizeResumePayload(parsed, report.RoleTitle); err != nil {
            return ResumeResponse{}, err
        }
        rBytes, _ := json.Marshal(resume)
        if err := s.jd.SaveResumeCache(rec.PromptHash, string(rBytes)); err != nil {
            return ResumeResponse{}, err
        }
    }
    report.Resume = &resume
    repBytes, _ := json.Marshal(report)
    if err := s.jd.UpdateReport(userID, recordID, string(repBytes)); err != nil {
        return ResumeResponse{}, err
    }
    return ResumeResponse{Cached: cached, ReferenceResume: resume, Report: report}, nil
}

// internal/handler/jd.go
package handler

import (
    "encoding/json"
    "errors"
    "net/http"

    "zixishi/internal/ai"
    "zixishi/internal/service"
)

func (h *Handler) jdError(w http.ResponseWriter, err error) {
    switch {
    case errors.Is(err, service.ErrBadJDInput), errors.Is(err, service.ErrInvalidStepIdx):
        writeJSON(w, http.StatusBadRequest, map[string]string{"error": err.Error()})
    case errors.Is(err, service.ErrJDNotFound):
        writeJSON(w, http.StatusNotFound, map[string]string{"error": err.Error()})
    case errors.Is(err, ai.ErrNotConfigured):
        writeJSON(w, http.StatusServiceUnavailable, map[string]string{"error": err.Error()})
    case errors.Is(err, service.ErrAIFailed):
        writeJSON(w, http.StatusBadGateway, map[string]string{"error": err.Error()})
    default:
        h.serverError(w, err)
    }
}

func (h *Handler) jdResearch(w http.ResponseWriter, r *http.Request) {
    u, ok := h.requireUser(w, r)
    if !ok {
        return
    }
    var body struct {
        Role        string \`json:"role"\`
        JDText      string \`json:"jdText"\`
        BypassCache bool   \`json:"bypassCache"\`
    }
    json.NewDecoder(r.Body).Decode(&body)
    res, err := h.jd.Research(u.ID, body.Role, body.JDText, body.BypassCache)
    if err != nil {
        h.jdError(w, err)
        return
    }
    writeJSON(w, http.StatusOK, res)
}

func (h *Handler) jdResume(w http.ResponseWriter, r *http.Request) {
    u, ok := h.requireUser(w, r)
    if !ok {
        return
    }
    var body struct {
        RecordID    int  \`json:"recordId"\`
        BypassCache bool \`json:"bypassCache"\`
    }
    json.NewDecoder(r.Body).Decode(&body)
    res, err := h.jd.GenerateResume(u.ID, body.RecordID, body.BypassCache)
    if err != nil {
        h.jdError(w, err)
        return
    }
    writeJSON(w, http.StatusOK, res)
}`,explain:[{at:'// internal/store/jd.go',to:'var jdSchema = []string{',text:'新建 JD 调研数据访问层，定义三张表。'},{at:'`CREATE TABLE IF NOT EXISTS jd_cache (',to:'`CREATE TABLE IF NOT EXISTS jd_reports (',text:'jd_cache 按 prompt_hash 存主调研 JSON；jd_resume_cache 按相同哈希存参考简历 JSON。'},{at:'id          INTEGER PRIMARY KEY AUTOINCREMENT,',to:'}',text:'jd_reports 记录每个用户历次生成的调研结果，便于后续分阶段补题与重进查看。'},{at:'type JDRecord struct {',to:'return &JDStore{db: db}, nil',text:'记录结构体与构造函数：创建实例时保证表已建好。'},{at:'func (s *JDStore) GetCache(',to:'func (s *JDStore) SaveResumeCache(',text:'两条缓存的读写方法：未命中返回 false，写入使用 ON CONFLICT upsert。'},{at:'_, err := s.db.Exec(`INSERT INTO jd_resume_cache',to:'return r, err',text:'保存和按用户读取调研记录，防止越权访问。'},{at:'func (s *JDStore) UpdateReport(',to:'reportJSON, recordID, userID)',text:'更新用户调研记录的最新 report_json。'},{at:'return err',to:'}',text:'返回更新操作的结果。'},{at:'// internal/service/jd.go',to:'ErrInvalidStepIdx = errors.New("阶段索引超出范围")',text:'定义 JD 业务的错误常量。'},{at:'type JDQuiz struct {',to:'Report JDReport',text:'定义调研报告与 STAR 参考简历的数据模型；ResumeResponse 嵌入 ReferenceResume，序列化后自带 techStack 与 projects。'},{at:'type JDService struct {',to:'horizSpaceRe = regexp.MustCompile',text:'服务结构体及用于剥离思考标签与尾逗号的正则。'},{at:'func PromptHash(',to:'return hex.EncodeToString(sum[:])',text:'PromptHash：统一换行、压平横向空格并过滤空行，与小写岗位名拼接后算 SHA-256 十六进制摘要。'},{at:'func cleanJSONText(',to:'return trailingRe.ReplaceAllString(s, "$1")',text:'去掉 <think>…</think> 思考段，截取首尾花括号并清理尾逗号。'},{at:'func trimStrings(',to:'return out',text:'修剪字符串数组并过滤空白项。'},{at:'func NormalizeResumePayload(',to:'}, nil',text:'参考简历清洗：兜底目标岗位，剔除空技术栈分组及缺少名称或 actions 的残缺项目，全部为空时返回错误。'},{at:'func MergeReportPhase(',to:'return report, nil',text:'浅拷贝 Roadmap 并只替换目标阶段的 non-empty quizzes，确保 resume 和其他已完成阶段原样保留。'},{at:'func (s *JDService) Research(',to:'return ResearchResponse{RecordID: id, PromptHash: hash, Cached: cached, Report: report}, nil',text:'主调研流程：先算 promptHash 查缓存，命中时 cached=true 不调大模型；未命中才调用模型、清洗校验并写入缓存与用户记录。'},{at:'func (s *JDService) GenerateResume(',to:'return ResumeResponse{Cached: cached, ReferenceResume: resume, Report: report}, nil',text:'参考简历生成：优先读 jd_resume_cache，未命中时调模型并经 NormalizeResumePayload 校验，随后挂到 report.Resume 上写回数据库。'},{at:'// internal/handler/jd.go',to:'res, err := h.jd.Research(',text:'接口层：把业务错误映射为 400/404/502/503，并处理 /api/jd/research 请求。'},{at:'if err != nil {',to:'func (h *Handler) jdResume(',text:'返回 /api/jd/research 响应，接着进入 /api/jd/resume 处理器。'},{at:'u, ok := h.requireUser(w, r)',to:'writeJSON(w, http.StatusOK, res)',text:'校验登录后调用 GenerateResume 并返回包含 techStack、projects 与最新 report 的 JSON。'}]}},java:{practice:{steps:['在 schema.sql 最后加上 jd_cache、jd_resume_cache 和 jd_reports 三张表。','新建 service/JdService.java 与 controller/JdController.java，补完 TODO 1 到 TODO 5。','运行 mvn test 确认原有测试全部通过。'],expect:'BUILD SUCCESS，接口可在登录状态下返回结构化报告与参考简历'},code:`-- src/main/resources/schema.sql（加在文件末尾）
CREATE TABLE IF NOT EXISTS jd_cache (
    prompt_hash TEXT PRIMARY KEY,
    report_json TEXT NOT NULL,
    updated_at  TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS jd_resume_cache (
    prompt_hash TEXT PRIMARY KEY,
    resume_json TEXT NOT NULL,
    updated_at  TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS jd_reports (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id     INTEGER NOT NULL REFERENCES users(id),
    prompt_hash TEXT    NOT NULL,
    role        TEXT    NOT NULL,
    jd_text     TEXT    NOT NULL,
    report_json TEXT    NOT NULL,
    updated_at  TEXT    NOT NULL DEFAULT CURRENT_TIMESTAMP
);

// service/JdService.java
package com.example.zixishi.service;

import com.example.zixishi.ai.AiClient;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.*;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

@Service
public class JdService {

    public record JdQuiz(String type, String q, List<String> options, Integer answer, String reference, List<String> points, String explain) {}
    public record RoadmapStep(String phase, String title, List<String> goals, List<JdQuiz> quizzes) {}
    public record SkillGroup(String category, List<String> items) {}
    public record ResumeProject(String name, String role, String period, List<String> stack, String background, List<String> actions, List<String> results, List<String> interviewAngles) {}
    public record ReferenceResume(String targetRole, String positioning, List<SkillGroup> techStack, List<ResumeProject> projects) {}
    public record JdReport(String roleTitle, List<String> requirements, List<String> tacitSignals, List<String> techGaps, List<String> topics, List<RoadmapStep> roadmap, ReferenceResume resume) {}
    public record ResearchResult(int recordId, String promptHash, boolean cached, JdReport report) {}
    public record ResumeResult(boolean cached, String targetRole, String positioning, List<SkillGroup> techStack, List<ResumeProject> projects, JdReport report) {}

    private final AiClient ai;
    private final JdbcTemplate jdbc;
    private final ObjectMapper json;

    public JdService(AiClient ai, JdbcTemplate jdbc, ObjectMapper json) {
        this.ai = ai;
        this.jdbc = jdbc;
        this.json = json;
    }

    public static String promptHash(String role, String jdText) {
        // TODO 1：统一换行符为 \\n，逐行压缩连续横向空白并过滤空行，与小写岗位名拼接后计算 SHA-256 十六进制字符串
        return "";
    }

    static String cleanJson(String raw) {
        String s = raw == null ? "" : raw.replaceAll("(?is)<think>.*?</think>", "").trim();
        int start = s.indexOf('{'), end = s.lastIndexOf('}');
        if (start >= 0 && end >= start) s = s.substring(start, end + 1);
        return s.replaceAll(",\\\\s*([}\\\\]])", "$1");
    }

    static List<String> trimList(List<String> items) {
        if (items == null) return List.of();
        return items.stream().filter(Objects::nonNull).map(String::trim).filter(x -> !x.isEmpty()).toList();
    }

    public static ReferenceResume normalizeResume(ReferenceResume raw, String fallbackRole) {
        // TODO 2：清洗 targetRole、positioning，过滤空 techStack 分组和缺少 name/actions 的项目，空列表抛出 502 StudyException
        return null;
    }

    public static JdReport mergePhase(JdReport report, int stepIdx, List<JdQuiz> newQuizzes) {
        // TODO 3：校验 stepIdx 边界（越界抛 400），拷贝 roadmap 并仅在 newQuizzes 非空时替换目标阶段，保留 resume 与其余阶段
        return report;
    }

    public ResearchResult research(int userId, String role, String jdText, boolean bypassCache) {
        // TODO 4：校验 jdText 长度 >= 20；计算 promptHash 查 jd_cache；未命中则调用 ai.chat 解析保存；写入 jd_reports 返回结果
        return null;
    }

    public ResumeResult generateResume(int userId, int recordId, boolean bypassCache) {
        // TODO 5：查 jd_reports 确认归属（无记录抛 404）；优先命中 jd_resume_cache，否则调用 ai.chat 并 normalizeResume，更新 report.resume
        return null;
    }
}`,explain:[{at:'-- src/main/resources/schema.sql',to:');',text:'在 schema.sql 末尾新增主报告缓存表、参考简历缓存表与用户调研记录表。'},{at:'CREATE TABLE IF NOT EXISTS jd_resume_cache (',to:'CREATE TABLE IF NOT EXISTS jd_reports (',text:'两张缓存表以 prompt_hash 为主键；jd_reports 关联 user_id。'},{at:'id          INTEGER PRIMARY KEY AUTOINCREMENT,',to:');',text:'保存结构化 report_json，方便后续补题和简历更新。'},{at:'// service/JdService.java',to:'public class JdService {',text:'业务逻辑服务类：使用 Spring 的 JdbcTemplate、Jackson ObjectMapper 与 AiClient。'},{at:'public record JdQuiz(',to:'this.json = json;',text:'用 Java record 定义调研报告、STAR 项目及接口返回结构。'},{at:'public static String promptHash(',to:'return "";',text:'TODO 1：对岗位名和 JD 做空白归一化并生成 SHA-256 指纹。'},{at:'static String cleanJson(',to:'return items.stream()',text:'剥离 <think> 思考段、裁剪最外层 JSON 并过滤字符串数组空白项。'},{at:'public static ReferenceResume normalizeResume(',to:'return null;',text:'TODO 2：补全参考简历清洗逻辑。'},{at:'public static JdReport mergePhase(',to:'return report;',text:'TODO 3：补全非破坏性阶段合并逻辑。'},{at:'public ResearchResult research(',to:'return null;',text:'TODO 4：补全主调研缓存与落库流程。'},{at:'public ResumeResult generateResume(',to:'return null;',text:'TODO 5：补全参考简历生成与更新逻辑。'}],solution:{code:`-- src/main/resources/schema.sql（加在文件末尾）
CREATE TABLE IF NOT EXISTS jd_cache (
    prompt_hash TEXT PRIMARY KEY,
    report_json TEXT NOT NULL,
    updated_at  TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS jd_resume_cache (
    prompt_hash TEXT PRIMARY KEY,
    resume_json TEXT NOT NULL,
    updated_at  TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS jd_reports (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id     INTEGER NOT NULL REFERENCES users(id),
    prompt_hash TEXT    NOT NULL,
    role        TEXT    NOT NULL,
    jd_text     TEXT    NOT NULL,
    report_json TEXT    NOT NULL,
    updated_at  TEXT    NOT NULL DEFAULT CURRENT_TIMESTAMP
);

// service/JdService.java
package com.example.zixishi.service;

import com.example.zixishi.ai.AiClient;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.*;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

@Service
public class JdService {

    public record JdQuiz(String type, String q, List<String> options, Integer answer, String reference, List<String> points, String explain) {}
    public record RoadmapStep(String phase, String title, List<String> goals, List<JdQuiz> quizzes) {}
    public record SkillGroup(String category, List<String> items) {}
    public record ResumeProject(String name, String role, String period, List<String> stack, String background, List<String> actions, List<String> results, List<String> interviewAngles) {}
    public record ReferenceResume(String targetRole, String positioning, List<SkillGroup> techStack, List<ResumeProject> projects) {}
    public record JdReport(String roleTitle, List<String> requirements, List<String> tacitSignals, List<String> techGaps, List<String> topics, List<RoadmapStep> roadmap, ReferenceResume resume) {}
    public record ResearchResult(int recordId, String promptHash, boolean cached, JdReport report) {}
    public record ResumeResult(boolean cached, String targetRole, String positioning, List<SkillGroup> techStack, List<ResumeProject> projects, JdReport report) {}

    private final AiClient ai;
    private final JdbcTemplate jdbc;
    private final ObjectMapper json;

    public JdService(AiClient ai, JdbcTemplate jdbc, ObjectMapper json) {
        this.ai = ai;
        this.jdbc = jdbc;
        this.json = json;
    }

    private static StudyService.StudyException err(int status, String msg) {
        return new StudyService.StudyException(status, msg);
    }

    public static String promptHash(String role, String jdText) {
        String norm = jdText.replace("\\r\\n", "\\n").replace("\\r", "\\n");
        StringBuilder body = new StringBuilder();
        for (String line : norm.split("\\n")) {
            String clean = line.replaceAll("[ \\t]+", " ").trim();
            if (!clean.isEmpty()) {
                if (!body.isEmpty()) body.append("\\n");
                body.append(clean);
            }
        }
        String key = role.trim().toLowerCase() + "\\n" + body;
        try {
            byte[] digest = MessageDigest.getInstance("SHA-256").digest(key.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(digest);
        } catch (Exception e) {
            throw new IllegalStateException(e);
        }
    }

    static String cleanJson(String raw) {
        String s = raw == null ? "" : raw.replaceAll("(?is)<think>.*?</think>", "").trim();
        int start = s.indexOf('{'), end = s.lastIndexOf('}');
        if (start >= 0 && end >= start) s = s.substring(start, end + 1);
        return s.replaceAll(",\\\\s*([}\\\\]])", "$1");
    }

    static List<String> trimList(List<String> items) {
        if (items == null) return List.of();
        return items.stream().filter(Objects::nonNull).map(String::trim).filter(x -> !x.isEmpty()).toList();
    }

    public static ReferenceResume normalizeResume(ReferenceResume raw, String fallbackRole) {
        if (raw == null) throw err(502, "参考简历格式异常");
        String role = raw.targetRole() != null && !raw.targetRole().isBlank() ? raw.targetRole().trim() : fallbackRole;
        List<SkillGroup> stack = (raw.techStack() == null ? List.<SkillGroup>of() : raw.techStack()).stream()
            .map(g -> new SkillGroup(g.category() == null ? "" : g.category().trim(), trimList(g.items())))
            .filter(g -> !g.category().isEmpty() && !g.items().isEmpty()).toList();
        List<ResumeProject> projects = (raw.projects() == null ? List.<ResumeProject>of() : raw.projects()).stream()
            .map(p -> new ResumeProject(
                p.name() == null ? "" : p.name().trim(),
                p.role() == null || p.role().isBlank() ? "核心研发" : p.role().trim(),
                p.period() == null ? "" : p.period().trim(),
                trimList(p.stack()),
                p.background() == null ? "" : p.background().trim(),
                trimList(p.actions()), trimList(p.results()), trimList(p.interviewAngles())))
            .filter(p -> !p.name().isEmpty() && !p.actions().isEmpty()).toList();
        if (stack.isEmpty() || projects.isEmpty()) throw err(502, "参考简历内容不完整");
        return new ReferenceResume(role, raw.positioning() == null ? "" : raw.positioning().trim(), stack, projects);
    }

    public static JdReport mergePhase(JdReport report, int stepIdx, List<JdQuiz> newQuizzes) {
        if (stepIdx < 0 || stepIdx >= report.roadmap().size()) throw err(400, "阶段索引超出范围");
        List<RoadmapStep> nextSteps = new ArrayList<>(report.roadmap());
        List<JdQuiz> clean = newQuizzes == null ? List.of() : newQuizzes.stream().filter(q -> q.q() != null && !q.q().isBlank()).toList();
        if (!clean.isEmpty()) {
            RoadmapStep old = nextSteps.get(stepIdx);
            nextSteps.set(stepIdx, new RoadmapStep(old.phase(), old.title(), old.goals(), clean));
        }
        return new JdReport(report.roleTitle(), report.requirements(), report.tacitSignals(), report.techGaps(), report.topics(), nextSteps, report.resume());
    }

    public ResearchResult research(int userId, String role, String jdText, boolean bypassCache) {
        String text = jdText == null ? "" : jdText.trim();
        if (text.codePointCount(0, text.length()) < 20) throw err(400, "请提供至少 20 字的岗位 JD");
        String cleanRole = role == null || role.isBlank() ? "目标岗位" : role.trim();
        String hash = promptHash(cleanRole, text);
        try {
            JdReport report = null;
            boolean cached = false;
            if (!bypassCache) {
                var hit = jdbc.queryForList("SELECT report_json FROM jd_cache WHERE prompt_hash = ?", String.class, hash);
                if (!hit.isEmpty()) {
                    report = json.readValue(hit.get(0), JdReport.class);
                    cached = report.roadmap() != null && !report.roadmap().isEmpty();
                }
            }
            if (!cached) {
                String out = ai.chat("输出岗位调研 JSON：roleTitle, requirements[], tacitSignals[], techGaps[], topics[], roadmap[{phase,title,goals[]}]。", "岗位：" + cleanRole + "\\n" + text);
                report = json.readValue(cleanJson(out), JdReport.class);
                if (report.requirements() == null || report.requirements().isEmpty() || report.roadmap() == null || report.roadmap().isEmpty()) {
                    throw err(502, "JD 调研解析失败");
                }
                jdbc.update("INSERT INTO jd_cache (prompt_hash, report_json) VALUES (?, ?) ON CONFLICT(prompt_hash) DO UPDATE SET report_json = excluded.report_json, updated_at = CURRENT_TIMESTAMP",
                    hash, json.writeValueAsString(report));
            }
            String repJson = json.writeValueAsString(report);
            jdbc.update("INSERT INTO jd_reports (user_id, prompt_hash, role, jd_text, report_json) VALUES (?, ?, ?, ?, ?)", userId, hash, cleanRole, text, repJson);
            int id = jdbc.queryForObject("SELECT last_insert_rowid()", Integer.class);
            return new ResearchResult(id, hash, cached, report);
        } catch (StudyService.StudyException e) {
            throw e;
        } catch (AiClient.NotConfiguredException e) {
            throw err(503, e.getMessage());
        } catch (Exception e) {
            throw err(502, "AI 服务暂时不可用，请稍后再试");
        }
    }

    public ResumeResult generateResume(int userId, int recordId, boolean bypassCache) {
        var rows = jdbc.queryForList("SELECT prompt_hash, report_json FROM jd_reports WHERE id = ? AND user_id = ?", recordId, userId);
        if (rows.isEmpty()) throw err(404, "调研记录不存在");
        String hash = (String) rows.get(0).get("prompt_hash");
        try {
            JdReport report = json.readValue((String) rows.get(0).get("report_json"), JdReport.class);
            ReferenceResume resume = null;
            boolean cached = false;
            if (!bypassCache) {
                var hit = jdbc.queryForList("SELECT resume_json FROM jd_resume_cache WHERE prompt_hash = ?", String.class, hash);
                if (!hit.isEmpty()) {
                    resume = json.readValue(hit.get(0), ReferenceResume.class);
                    cached = !resume.techStack().isEmpty() && !resume.projects().isEmpty();
                }
            }
            if (!cached) {
                String out = ai.chat("输出参考简历 JSON：targetRole, positioning, techStack[{category,items[]}], projects[{name,role,period,stack[],background,actions[],results[],interviewAngles[]}]。",
                    "目标岗位：" + report.roleTitle() + "\\n要求：" + String.join("；", report.requirements()));
                resume = normalizeResume(json.readValue(cleanJson(out), ReferenceResume.class), report.roleTitle());
                jdbc.update("INSERT INTO jd_resume_cache (prompt_hash, resume_json) VALUES (?, ?) ON CONFLICT(prompt_hash) DO UPDATE SET resume_json = excluded.resume_json, updated_at = CURRENT_TIMESTAMP",
                    hash, json.writeValueAsString(resume));
            }
            JdReport nextReport = new JdReport(report.roleTitle(), report.requirements(), report.tacitSignals(), report.techGaps(), report.topics(), report.roadmap(), resume);
            jdbc.update("UPDATE jd_reports SET report_json = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND user_id = ?",
                json.writeValueAsString(nextReport), recordId, userId);
            return new ResumeResult(cached, resume.targetRole(), resume.positioning(), resume.techStack(), resume.projects(), nextReport);
        } catch (StudyService.StudyException e) {
            throw e;
        } catch (AiClient.NotConfiguredException e) {
            throw err(503, e.getMessage());
        } catch (Exception e) {
            throw err(502, "参考简历生成失败");
        }
    }
}

// controller/JdController.java
package com.example.zixishi.controller;

import com.example.zixishi.service.AuthService;
import com.example.zixishi.service.JdService;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/jd")
public class JdController {

    public record ResearchBody(String role, String jdText, boolean bypassCache) {}
    public record ResumeBody(int recordId, boolean bypassCache) {}

    private final AuthService auth;
    private final JdService jd;

    public JdController(AuthService auth, JdService jd) {
        this.auth = auth;
        this.jd = jd;
    }

    @PostMapping("/research")
    public JdService.ResearchResult research(@CookieValue(name = "session", required = false) String token, @RequestBody ResearchBody body) {
        return jd.research(auth.currentUser(token).id(), body.role(), body.jdText(), body.bypassCache());
    }

    @PostMapping("/resume")
    public JdService.ResumeResult resume(@CookieValue(name = "session", required = false) String token, @RequestBody ResumeBody body) {
        return jd.generateResume(auth.currentUser(token).id(), body.recordId(), body.bypassCache());
    }
}`,explain:[{at:'-- src/main/resources/schema.sql',to:');',text:'在 schema.sql 末尾新增主报告缓存表、参考简历缓存表与用户调研记录表。'},{at:'CREATE TABLE IF NOT EXISTS jd_resume_cache (',to:'CREATE TABLE IF NOT EXISTS jd_reports (',text:'两张缓存表以 prompt_hash 为主键；jd_reports 关联 user_id。'},{at:'id          INTEGER PRIMARY KEY AUTOINCREMENT,',to:');',text:'保存结构化 report_json，方便后续补题和简历更新。'},{at:'// service/JdService.java',to:'public class JdService {',text:'业务逻辑服务类，注入 AiClient、JdbcTemplate 与 ObjectMapper。'},{at:'public record JdQuiz(',to:'return new StudyService.StudyException(status, msg);',text:'定义调研报告与 STAR 简历 record，以及统一的带状态码业务异常助手。'},{at:'public static String promptHash(',to:'throw new IllegalStateException(e);',text:'对换行、空格做归一化并与小写岗位名拼接，计算 64 位小写 SHA-256 哈希。'},{at:'static String cleanJson(',to:'return items.stream()',text:'移除 <think> 思考段、截取最外层 JSON、修复尾逗号，并修剪列表字符串。'},{at:'public static ReferenceResume normalizeResume(',to:'return new ReferenceResume(role,',text:'过滤空技能分组与缺少 name/actions 的残缺项目，全部为空时抛出 502。'},{at:'public static JdReport mergePhase(',to:'return new JdReport(',text:'拷贝 roadmap 并仅在 newQuizzes 非空时更新目标阶段，保留已有 resume 与其余阶段。'},{at:'public ResearchResult research(',to:'throw err(502, "AI 服务暂时不可用，请稍后再试");',text:'主调研流程：先查 jd_cache，命中则跳过 AI 调用，未命中才解析保存并写入 jd_reports。'},{at:'public ResumeResult generateResume(',to:'throw err(502, "参考简历生成失败");',text:'参考简历生成：优先读 jd_resume_cache，未命中则调 AI 清洗后挂回 report.resume 并落库。'},{at:'// controller/JdController.java',to:'return jd.generateResume(auth.currentUser(token).id(), body.recordId(), body.bypassCache());',text:'控制器层：挂载 /api/jd/research 与 /api/jd/resume，并先通过 auth.currentUser 校验登录状态。'}]}},node:{practice:{steps:['新建 src/db/jd.js 与 src/services/jd.js，补完 TODO 1 到 TODO 5。','新建 src/routes/jd.js 并挂到 app.js 的 /api 下。','重启服务后用 Postman 或 curl 验证主调研与缓存命中。'],expect:'第一次调用 cached: false，相同内容第二次调用 cached: true'},code:`// src/db/jd.js
const { db } = require("./database");

db.exec(\`
  CREATE TABLE IF NOT EXISTS jd_cache (
    prompt_hash TEXT PRIMARY KEY,
    report_json TEXT NOT NULL,
    updated_at  TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS jd_resume_cache (
    prompt_hash TEXT PRIMARY KEY,
    resume_json TEXT NOT NULL,
    updated_at  TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS jd_reports (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id     INTEGER NOT NULL REFERENCES users(id),
    prompt_hash TEXT    NOT NULL,
    role        TEXT    NOT NULL,
    jd_text     TEXT    NOT NULL,
    report_json TEXT    NOT NULL,
    updated_at  TEXT    NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
\`);

function getCache(hash) {
  return db.prepare("SELECT report_json FROM jd_cache WHERE prompt_hash = ?").get(hash)?.report_json;
}

function saveCache(hash, reportJson) {
  db.prepare(\`INSERT INTO jd_cache (prompt_hash, report_json) VALUES (?, ?)
    ON CONFLICT(prompt_hash) DO UPDATE SET report_json = excluded.report_json, updated_at = CURRENT_TIMESTAMP\`).run(hash, reportJson);
}

function getResumeCache(hash) {
  return db.prepare("SELECT resume_json FROM jd_resume_cache WHERE prompt_hash = ?").get(hash)?.resume_json;
}

function saveResumeCache(hash, resumeJson) {
  db.prepare(\`INSERT INTO jd_resume_cache (prompt_hash, resume_json) VALUES (?, ?)
    ON CONFLICT(prompt_hash) DO UPDATE SET resume_json = excluded.resume_json, updated_at = CURRENT_TIMESTAMP\`).run(hash, resumeJson);
}

function createReport(userId, hash, role, jdText, reportJson) {
  const info = db.prepare("INSERT INTO jd_reports (user_id, prompt_hash, role, jd_text, report_json) VALUES (?, ?, ?, ?, ?)")
    .run(userId, hash, role, jdText, reportJson);
  return Number(info.lastInsertRowid);
}

function getReport(userId, recordId) {
  return db.prepare("SELECT id, prompt_hash AS promptHash, role, jd_text AS jdText, report_json AS reportJson FROM jd_reports WHERE id = ? AND user_id = ?")
    .get(recordId, userId);
}

function updateReport(userId, recordId, reportJson) {
  db.prepare("UPDATE jd_reports SET report_json = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND user_id = ?")
    .run(reportJson, recordId, userId);
}

module.exports = { getCache, saveCache, getResumeCache, saveResumeCache, createReport, getReport, updateReport };

// src/services/jd.js
const crypto = require("node:crypto");
const { NotConfiguredError, chat } = require("../ai/client");
const store = require("../db/jd");

class JDError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

function promptHash(role, jdText) {
  // TODO 1：归一化换行符、逐行压缩空格并去掉空行，拼接 role.trim().toLowerCase() 后计算 sha256 十六进制字符串
  return "";
}

function cleanJsonText(raw) {
  let s = String(raw || "").replace(/<think>[\\s\\S]*?<\\/think>/gi, "").trim();
  const a = s.indexOf("{"), b = s.lastIndexOf("}");
  if (a >= 0 && b >= a) s = s.slice(a, b + 1);
  return s.replace(/,\\s*([}\\]])/g, "$1");
}

const trimList = (arr) => (Array.isArray(arr) ? arr.map((x) => String(x || "").trim()).filter(Boolean) : []);

function normalizeResumePayload(raw, fallbackRole = "目标岗位") {
  // TODO 2：修剪 targetRole 与 positioning；过滤空的 techStack 分组和缺少 name/actions 的项目；为空返回 null
  return null;
}

function mergeReportPhase(report, stepIdx, newQuizzes) {
  // TODO 3：校验 stepIdx 边界；返回新报告对象，只更新 roadmap[stepIdx].quizzes（非空时），完整保留 resume 与其余阶段
  return report;
}

async function research(userId, role, jdText, bypassCache = false) {
  // TODO 4：校验 jdText >= 20 字；算 promptHash 查缓存，未命中则调 chat 解析写入 jd_cache，并创建 jd_reports 记录
}

async function generateResume(userId, recordId, bypassCache = false) {
  // TODO 5：查 store.getReport（不存在抛 404）；先查 jd_resume_cache，未命中调 chat 并 normalizeResumePayload 清洗；
  //         挂载到 report.resume 并更新 jd_reports，返回 { cached, ...resume, report }
}

module.exports = { JDError, promptHash, cleanJsonText, normalizeResumePayload, mergeReportPhase, research, generateResume };`,explain:[{at:'// src/db/jd.js',to:'db.exec(`',text:'数据访问层：创建 jd_cache、jd_resume_cache 与 jd_reports 三张 SQLite 表。'},{at:'CREATE TABLE IF NOT EXISTS jd_cache (',to:'`);',text:'前两张表用 prompt_hash 做主键缓存 AI 输出，jd_reports 关联 user_id 存个人报告。'},{at:'function getCache(hash) {',to:'function saveResumeCache(hash, resumeJson) {',text:'两份缓存的读写操作，写入均用 ON CONFLICT upsert。'},{at:'db.prepare(`INSERT INTO jd_resume_cache',to:'module.exports = {',text:'创建、按用户查询与更新调研记录，最后导出全部数据方法。'},{at:'// src/services/jd.js',to:'class JDError extends Error {',text:'引入哈希库与 AI 客户端，定义带 HTTP 状态码的 JDError。'},{at:'constructor(status, message) {',to:'function promptHash(role, jdText) {',text:'构建异常类后进入 TODO 1（计算归一化哈希）。'},{at:'// TODO 1',to:'function cleanJsonText(raw) {',text:'cleanJsonText 剔除 <think> 思考段、截取最外层 JSON 并清理尾逗号。'},{at:'let s = String(raw || "")',to:'const trimList =',text:'正则清洗 JSON 文本并准备字符串数组修剪助手。'},{at:'function normalizeResumePayload(',to:'module.exports = {',text:'TODO 2–5：完成参考简历清洗、非破坏性阶段合并、主调研缓存流程与参考简历生成接口。'}],solution:{code:`// src/db/jd.js
const { db } = require("./database");

db.exec(\`
  CREATE TABLE IF NOT EXISTS jd_cache (
    prompt_hash TEXT PRIMARY KEY,
    report_json TEXT NOT NULL,
    updated_at  TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS jd_resume_cache (
    prompt_hash TEXT PRIMARY KEY,
    resume_json TEXT NOT NULL,
    updated_at  TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS jd_reports (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id     INTEGER NOT NULL REFERENCES users(id),
    prompt_hash TEXT    NOT NULL,
    role        TEXT    NOT NULL,
    jd_text     TEXT    NOT NULL,
    report_json TEXT    NOT NULL,
    updated_at  TEXT    NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
\`);

function getCache(hash) {
  return db.prepare("SELECT report_json FROM jd_cache WHERE prompt_hash = ?").get(hash)?.report_json;
}

function saveCache(hash, reportJson) {
  db.prepare(\`INSERT INTO jd_cache (prompt_hash, report_json) VALUES (?, ?)
    ON CONFLICT(prompt_hash) DO UPDATE SET report_json = excluded.report_json, updated_at = CURRENT_TIMESTAMP\`).run(hash, reportJson);
}

function getResumeCache(hash) {
  return db.prepare("SELECT resume_json FROM jd_resume_cache WHERE prompt_hash = ?").get(hash)?.resume_json;
}

function saveResumeCache(hash, resumeJson) {
  db.prepare(\`INSERT INTO jd_resume_cache (prompt_hash, resume_json) VALUES (?, ?)
    ON CONFLICT(prompt_hash) DO UPDATE SET resume_json = excluded.resume_json, updated_at = CURRENT_TIMESTAMP\`).run(hash, resumeJson);
}

function createReport(userId, hash, role, jdText, reportJson) {
  const info = db.prepare("INSERT INTO jd_reports (user_id, prompt_hash, role, jd_text, report_json) VALUES (?, ?, ?, ?, ?)")
    .run(userId, hash, role, jdText, reportJson);
  return Number(info.lastInsertRowid);
}

function getReport(userId, recordId) {
  return db.prepare("SELECT id, prompt_hash AS promptHash, role, jd_text AS jdText, report_json AS reportJson FROM jd_reports WHERE id = ? AND user_id = ?")
    .get(recordId, userId);
}

function updateReport(userId, recordId, reportJson) {
  db.prepare("UPDATE jd_reports SET report_json = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND user_id = ?")
    .run(reportJson, recordId, userId);
}

module.exports = { getCache, saveCache, getResumeCache, saveResumeCache, createReport, getReport, updateReport };

// src/services/jd.js
const crypto = require("node:crypto");
const { NotConfiguredError, chat } = require("../ai/client");
const store = require("../db/jd");

class JDError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

function promptHash(role, jdText) {
  const norm = String(jdText || "").replace(/\\r\\n?/g, "\\n").split("\\n")
    .map((l) => l.replace(/[ \\t]+/g, " ").trim()).filter(Boolean).join("\\n");
  const key = \`\${String(role || "").trim().toLowerCase()}\\n\${norm}\`;
  return crypto.createHash("sha256").update(key).digest("hex");
}

function cleanJsonText(raw) {
  let s = String(raw || "").replace(/<think>[\\s\\S]*?<\\/think>/gi, "").trim();
  const a = s.indexOf("{"), b = s.lastIndexOf("}");
  if (a >= 0 && b >= a) s = s.slice(a, b + 1);
  return s.replace(/,\\s*([}\\]])/g, "$1");
}

const trimList = (arr) => (Array.isArray(arr) ? arr.map((x) => String(x || "").trim()).filter(Boolean) : []);

function normalizeResumePayload(raw, fallbackRole = "目标岗位") {
  if (!raw || typeof raw !== "object") return null;
  const targetRole = String(raw.targetRole || "").trim() || String(fallbackRole || "").trim() || "目标岗位";
  const positioning = String(raw.positioning || "").trim();
  const techStack = (Array.isArray(raw.techStack) ? raw.techStack : [])
    .map((g) => ({ category: String(g?.category || "").trim(), items: trimList(g?.items) }))
    .filter((g) => g.category && g.items.length > 0);
  const projects = (Array.isArray(raw.projects) ? raw.projects : [])
    .map((p) => ({
      name: String(p?.name || "").trim(),
      role: String(p?.role || "").trim() || "核心研发",
      period: String(p?.period || "").trim(),
      stack: trimList(p?.stack),
      background: String(p?.background || "").trim(),
      actions: trimList(p?.actions),
      results: trimList(p?.results),
      interviewAngles: trimList(p?.interviewAngles),
    }))
    .filter((p) => p.name && p.actions.length > 0);
  if (!techStack.length || !projects.length) return null;
  return { targetRole, positioning, techStack, projects };
}

function mergeReportPhase(report, stepIdx, newQuizzes) {
  if (!report || !Array.isArray(report.roadmap) || !Number.isInteger(stepIdx) || stepIdx < 0 || stepIdx >= report.roadmap.length) {
    throw new JDError(400, "阶段索引超出范围");
  }
  const clean = (Array.isArray(newQuizzes) ? newQuizzes : []).filter((q) => q && String(q.q || "").trim());
  const roadmap = report.roadmap.map((step, idx) => (idx === stepIdx && clean.length ? { ...step, quizzes: clean } : step));
  return { ...report, roadmap };
}

async function research(userId, role, jdText, bypassCache = false) {
  const text = typeof jdText === "string" ? jdText.trim() : "";
  if ([...text].length < 20) throw new JDError(400, "请提供至少 20 字的岗位 JD");
  const cleanRole = typeof role === "string" && role.trim() ? role.trim() : "目标岗位";
  const hash = promptHash(cleanRole, text);
  let report = null;
  let cached = false;
  if (!bypassCache) {
    const hit = store.getCache(hash);
    if (hit) {
      const parsed = JSON.parse(hit);
      if (parsed?.roadmap?.length) { report = parsed; cached = true; }
    }
  }
  if (!cached) {
    let raw;
    try {
      raw = await chat("输出岗位调研 JSON：roleTitle, requirements[], tacitSignals[], techGaps[], topics[], roadmap[{phase,title,goals[]}]。", \`岗位：\${cleanRole}\\n\${text}\`);
    } catch (err) {
      if (err instanceof NotConfiguredError) throw new JDError(503, err.message);
      throw new JDError(502, "AI 服务暂时不可用，请稍后再试");
    }
    try {
      report = JSON.parse(cleanJsonText(raw));
    } catch {
      throw new JDError(502, "JD 调研解析失败");
    }
    if (!report?.requirements?.length || !report?.roadmap?.length) throw new JDError(502, "JD 调研结果不完整");
    if (!report.roleTitle) report.roleTitle = cleanRole;
    store.saveCache(hash, JSON.stringify(report));
  }
  const recordId = store.createReport(userId, hash, cleanRole, text, JSON.stringify(report));
  return { recordId, promptHash: hash, cached, report };
}

async function generateResume(userId, recordId, bypassCache = false) {
  const rec = store.getReport(userId, Number(recordId));
  if (!rec) throw new JDError(404, "调研记录不存在");
  const report = JSON.parse(rec.reportJson);
  let resume = null;
  let cached = false;
  if (!bypassCache) {
    const hit = store.getResumeCache(rec.promptHash);
    if (hit) {
      const parsed = normalizeResumePayload(JSON.parse(hit), report.roleTitle);
      if (parsed) { resume = parsed; cached = true; }
    }
  }
  if (!cached) {
    let raw;
    try {
      raw = await chat("输出参考简历 JSON：targetRole, positioning, techStack[{category,items[]}], projects[{name,role,period,stack[],background,actions[],results[],interviewAngles[]}]。",
        \`目标岗位：\${report.roleTitle}\\n要求：\${(report.requirements || []).join("；")}\`);
    } catch (err) {
      if (err instanceof NotConfiguredError) throw new JDError(503, err.message);
      throw new JDError(502, "参考简历生成失败");
    }
    try {
      resume = normalizeResumePayload(JSON.parse(cleanJsonText(raw)), report.roleTitle);
    } catch {
      resume = null;
    }
    if (!resume) throw new JDError(502, "参考简历解析失败");
    store.saveResumeCache(rec.promptHash, JSON.stringify(resume));
  }
  const nextReport = { ...report, resume };
  store.updateReport(userId, rec.id, JSON.stringify(nextReport));
  return { cached, ...resume, report: nextReport };
}

module.exports = { JDError, promptHash, cleanJsonText, normalizeResumePayload, mergeReportPhase, research, generateResume };

// src/routes/jd.js
const express = require("express");
const jd = require("../services/jd");
const { requireUser } = require("../middleware");

const router = express.Router();

router.post("/jd/research", requireUser, async (req, res, next) => {
  try {
    res.json(await jd.research(req.user.id, req.body?.role, req.body?.jdText, Boolean(req.body?.bypassCache)));
  } catch (err) {
    if (err instanceof jd.JDError) return res.status(err.status).json({ error: err.message });
    next(err);
  }
});

router.post("/jd/resume", requireUser, async (req, res, next) => {
  try {
    res.json(await jd.generateResume(req.user.id, req.body?.recordId, Boolean(req.body?.bypassCache)));
  } catch (err) {
    if (err instanceof jd.JDError) return res.status(err.status).json({ error: err.message });
    next(err);
  }
});

module.exports = router;
// app.js 里加上：app.use("/api", require("./src/routes/jd"));`,explain:[{at:'// src/db/jd.js',to:'db.exec(`',text:'数据访问层：创建 jd_cache、jd_resume_cache 与 jd_reports 三张 SQLite 表。'},{at:'CREATE TABLE IF NOT EXISTS jd_cache (',to:'`);',text:'前两张表按 prompt_hash 存缓存，jd_reports 关联 user_id 存个人报告。'},{at:'function getCache(hash) {',to:'function saveResumeCache(hash, resumeJson) {',text:'读取和 upsert 写入两份缓存。'},{at:'db.prepare(`INSERT INTO jd_resume_cache',to:'module.exports = {',text:'实现记录的创建、按用户查询与更新并导出。'},{at:'// src/services/jd.js',to:'class JDError extends Error {',text:'引入加密、AI 客户端与存储层，定义 JDError。'},{at:'constructor(status, message) {',to:'function promptHash(role, jdText) {',text:'构建带状态码异常类，进入内容哈希计算函数。'},{at:'const norm = String(jdText || "")',to:'return crypto.createHash("sha256").update(key).digest("hex");',text:'把换行和空格归一化并与小写岗位名拼接，计算 64 位 SHA-256 哈希。'},{at:'function cleanJsonText(raw) {',to:'const trimList =',text:'移除 <think> 段、截取首尾花括号并清除尾逗号。'},{at:'function normalizeResumePayload(',to:'return { targetRole, positioning, techStack, projects };',text:'清洗参考简历结构：过滤空技能组与缺少 name/actions 的残缺项目。'},{at:'function mergeReportPhase(',to:'return { ...report, roadmap };',text:'浅拷贝 roadmap 后仅替换目标阶段题目，完整保留 resume 与其余阶段。'},{at:'async function research(',to:'return { recordId, promptHash: hash, cached, report };',text:'主调研接口逻辑：命中 jd_cache 直接返回 cached=true，否则调用大模型并落库。'},{at:'async function generateResume(',to:'module.exports = { JDError,',text:'参考简历接口逻辑：优先读 jd_resume_cache，否则调用 AI 并清洗，更新 report.resume 后展开返回并导出。'},{at:'// src/routes/jd.js',to:'module.exports = router;',text:'Express 路由层：挂载 /api/jd/research 与 /api/jd/resume 并统一处理 JDError。'}]}},python:{practice:{steps:['在 app/database.py 的 SCHEMA 里加上 jd_cache、jd_resume_cache 和 jd_reports 三张表。','新建 app/jd.py、app/services/jd.py 与 app/routers/jd.py，补完 TODO 1 到 TODO 5，并在 main.py 注册路由和 JDError 处理器。','运行 pytest 确认原有测试通过。'],expect:'接口启动无报错，相同 JD 二次提交返回 cached: true'},code:`# app/database.py（在 SCHEMA 字符串最后加上）
CREATE TABLE IF NOT EXISTS jd_cache (
    prompt_hash TEXT PRIMARY KEY,
    report_json TEXT NOT NULL,
    updated_at  TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS jd_resume_cache (
    prompt_hash TEXT PRIMARY KEY,
    resume_json TEXT NOT NULL,
    updated_at  TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS jd_reports (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id     INTEGER NOT NULL REFERENCES users(id),
    prompt_hash TEXT    NOT NULL,
    role        TEXT    NOT NULL,
    jd_text     TEXT    NOT NULL,
    report_json TEXT    NOT NULL,
    updated_at  TEXT    NOT NULL DEFAULT CURRENT_TIMESTAMP
);

# app/jd.py
from contextlib import closing
from app.database import connect, query_one


def get_cache(prompt_hash):
    row = query_one("SELECT report_json FROM jd_cache WHERE prompt_hash = ?", (prompt_hash,))
    return row["report_json"] if row else None


def save_cache(prompt_hash, report_json):
    with closing(connect()) as conn, conn:
        conn.execute(
            "INSERT INTO jd_cache (prompt_hash, report_json) VALUES (?, ?) "
            "ON CONFLICT(prompt_hash) DO UPDATE SET report_json = excluded.report_json, updated_at = CURRENT_TIMESTAMP",
            (prompt_hash, report_json),
        )


def get_resume_cache(prompt_hash):
    row = query_one("SELECT resume_json FROM jd_resume_cache WHERE prompt_hash = ?", (prompt_hash,))
    return row["resume_json"] if row else None


def save_resume_cache(prompt_hash, resume_json):
    with closing(connect()) as conn, conn:
        conn.execute(
            "INSERT INTO jd_resume_cache (prompt_hash, resume_json) VALUES (?, ?) "
            "ON CONFLICT(prompt_hash) DO UPDATE SET resume_json = excluded.resume_json, updated_at = CURRENT_TIMESTAMP",
            (prompt_hash, resume_json),
        )


def create_report(user_id, prompt_hash, role, jd_text, report_json):
    with closing(connect()) as conn, conn:
        return conn.execute(
            "INSERT INTO jd_reports (user_id, prompt_hash, role, jd_text, report_json) VALUES (?, ?, ?, ?, ?)",
            (user_id, prompt_hash, role, jd_text, report_json),
        ).lastrowid


def get_report(user_id, record_id):
    return query_one(
        "SELECT id, prompt_hash AS promptHash, role, jd_text AS jdText, report_json AS reportJson FROM jd_reports WHERE id = ? AND user_id = ?",
        (record_id, user_id),
    )


def update_report(user_id, record_id, report_json):
    with closing(connect()) as conn, conn:
        conn.execute(
            "UPDATE jd_reports SET report_json = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND user_id = ?",
            (report_json, record_id, user_id),
        )


# app/services/jd.py
import hashlib
import json
import re
from app import ai_client
from app import jd as store


class JDError(Exception):
    def __init__(self, status, message):
        super().__init__(message)
        self.status = status
        self.message = message


def compute_prompt_hash(role, jd_text):
    # TODO 1：统一换行符、逐行压缩空格并去掉空行，拼接 role.strip().lower() 后返回 sha256 十六进制摘要
    return ""


def clean_json_text(raw):
    s = re.sub(r"(?is)<think>.*?</think>", "", str(raw or "")).strip()
    a, b = s.find("{"), s.rfind("}")
    if a >= 0 and b >= a:
        s = s[a : b + 1]
    return re.sub(r",\\s*([}\\]])", r"\\1", s)


def normalize_resume_payload(raw, fallback_role="目标岗位"):
    # TODO 2：修剪 targetRole 与 positioning；过滤空 techStack 分组及缺少 name/actions 的项目；为空返回 None
    return None


def merge_report_phase(report, step_idx, new_quizzes):
    # TODO 3：校验 step_idx 范围；浅拷贝 roadmap，仅在 new_quizzes 非空时替换目标阶段，保留 resume 与其余阶段
    return report


def research(user_id, role, jd_text, bypass_cache=False):
    # TODO 4：校验 jd_text >= 20 字；计算 hash 查缓存，未命中则调 ai_client.chat 解析并写缓存与记录
    ...


def generate_resume(user_id, record_id, bypass_cache=False):
    # TODO 5：查 get_report（不存在抛 404）；先查简历缓存，未命中则调 ai_client.chat 并清洗落库，挂到 report["resume"]
    ...`,explain:[{at:'# app/database.py',to:');',text:'在 SCHEMA 末尾增加三张表：主调研缓存表、参考简历缓存表与用户记录表。'},{at:'CREATE TABLE IF NOT EXISTS jd_resume_cache (',to:');',text:'两份缓存均使用 prompt_hash 作为主键。'},{at:'CREATE TABLE IF NOT EXISTS jd_reports (',to:');',text:'用户调研记录表保存每份报告的最新 JSON。'},{at:'# app/jd.py',to:'from app.database import connect, query_one',text:'新建数据访问模块。'},{at:'def get_cache(prompt_hash):',to:'(prompt_hash, resume_json),',text:'两条缓存表的读取与 upsert 写入函数。'},{at:'def create_report(',to:'(report_json, record_id, user_id),',text:'创建、按用户读取与更新调研记录，全部查询都带上 user_id 条件。'},{at:'# app/services/jd.py',to:'self.message = message',text:'业务逻辑模块与带状态码的 JDError。'},{at:'def compute_prompt_hash(',to:'return re.sub',text:'compute_prompt_hash 计算摘要（TODO 1），clean_json_text 负责剥离思考标签并去除尾逗号。'},{at:'def normalize_resume_payload(',to:'return None',text:'TODO 2：补全参考简历清洗逻辑。'},{at:'def merge_report_phase(',to:'return report',text:'TODO 3：补全非破坏性阶段合并逻辑。'},{at:'def research(',to:'...',text:'TODO 4：补全主调研缓存与解析流程。'},{at:'def generate_resume(',to:'...',text:'TODO 5：补全参考简历生成与更新流程。'}],solution:{code:`# app/database.py（在 SCHEMA 字符串最后加上）
CREATE TABLE IF NOT EXISTS jd_cache (
    prompt_hash TEXT PRIMARY KEY,
    report_json TEXT NOT NULL,
    updated_at  TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS jd_resume_cache (
    prompt_hash TEXT PRIMARY KEY,
    resume_json TEXT NOT NULL,
    updated_at  TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS jd_reports (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id     INTEGER NOT NULL REFERENCES users(id),
    prompt_hash TEXT    NOT NULL,
    role        TEXT    NOT NULL,
    jd_text     TEXT    NOT NULL,
    report_json TEXT    NOT NULL,
    updated_at  TEXT    NOT NULL DEFAULT CURRENT_TIMESTAMP
);

# app/jd.py
from contextlib import closing
from app.database import connect, query_one


def get_cache(prompt_hash):
    row = query_one("SELECT report_json FROM jd_cache WHERE prompt_hash = ?", (prompt_hash,))
    return row["report_json"] if row else None


def save_cache(prompt_hash, report_json):
    with closing(connect()) as conn, conn:
        conn.execute(
            "INSERT INTO jd_cache (prompt_hash, report_json) VALUES (?, ?) "
            "ON CONFLICT(prompt_hash) DO UPDATE SET report_json = excluded.report_json, updated_at = CURRENT_TIMESTAMP",
            (prompt_hash, report_json),
        )


def get_resume_cache(prompt_hash):
    row = query_one("SELECT resume_json FROM jd_resume_cache WHERE prompt_hash = ?", (prompt_hash,))
    return row["resume_json"] if row else None


def save_resume_cache(prompt_hash, resume_json):
    with closing(connect()) as conn, conn:
        conn.execute(
            "INSERT INTO jd_resume_cache (prompt_hash, resume_json) VALUES (?, ?) "
            "ON CONFLICT(prompt_hash) DO UPDATE SET resume_json = excluded.resume_json, updated_at = CURRENT_TIMESTAMP",
            (prompt_hash, resume_json),
        )


def create_report(user_id, prompt_hash, role, jd_text, report_json):
    with closing(connect()) as conn, conn:
        return conn.execute(
            "INSERT INTO jd_reports (user_id, prompt_hash, role, jd_text, report_json) VALUES (?, ?, ?, ?, ?)",
            (user_id, prompt_hash, role, jd_text, report_json),
        ).lastrowid


def get_report(user_id, record_id):
    return query_one(
        "SELECT id, prompt_hash AS promptHash, role, jd_text AS jdText, report_json AS reportJson FROM jd_reports WHERE id = ? AND user_id = ?",
        (record_id, user_id),
    )


def update_report(user_id, record_id, report_json):
    with closing(connect()) as conn, conn:
        conn.execute(
            "UPDATE jd_reports SET report_json = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND user_id = ?",
            (report_json, record_id, user_id),
        )


# app/services/jd.py
import hashlib
import json
import re
from app import ai_client
from app import jd as store


class JDError(Exception):
    def __init__(self, status, message):
        super().__init__(message)
        self.status = status
        self.message = message


def compute_prompt_hash(role, jd_text):
    norm = str(jd_text or "").replace("\\r\\n", "\\n").replace("\\r", "\\n")
    lines = [re.sub(r"[ \\t]+", " ", l).strip() for l in norm.split("\\n")]
    body = "\\n".join(l for l in lines if l)
    key = f"{str(role or '').strip().lower()}\\n{body}"
    return hashlib.sha256(key.encode("utf-8")).hexdigest()


def clean_json_text(raw):
    s = re.sub(r"(?is)<think>.*?</think>", "", str(raw or "")).strip()
    a, b = s.find("{"), s.rfind("}")
    if a >= 0 and b >= a:
        s = s[a : b + 1]
    return re.sub(r",\\s*([}\\]])", r"\\1", s)


def _trim_list(items):
    return [str(x).strip() for x in (items or []) if str(x or "").strip()]


def normalize_resume_payload(raw, fallback_role="目标岗位"):
    if not isinstance(raw, dict):
        return None
    target_role = str(raw.get("targetRole") or "").strip() or str(fallback_role or "").strip() or "目标岗位"
    positioning = str(raw.get("positioning") or "").strip()
    stack = []
    for grp in raw.get("techStack") or []:
        if not isinstance(grp, dict):
            continue
        cat = str(grp.get("category") or "").strip()
        items = _trim_list(grp.get("items"))
        if cat and items:
            stack.append({"category": cat, "items": items})
    projects = []
    for p in raw.get("projects") or []:
        if not isinstance(p, dict):
            continue
        name = str(p.get("name") or "").strip()
        actions = _trim_list(p.get("actions"))
        if not name or not actions:
            continue
        projects.append({
            "name": name,
            "role": str(p.get("role") or "").strip() or "核心研发",
            "period": str(p.get("period") or "").strip(),
            "stack": _trim_list(p.get("stack")),
            "background": str(p.get("background") or "").strip(),
            "actions": actions,
            "results": _trim_list(p.get("results")),
            "interviewAngles": _trim_list(p.get("interviewAngles")),
        })
    if not stack or not projects:
        return None
    return {"targetRole": target_role, "positioning": positioning, "techStack": stack, "projects": projects}


def merge_report_phase(report, step_idx, new_quizzes):
    roadmap = report.get("roadmap") if isinstance(report, dict) else None
    if not isinstance(roadmap, list) or not isinstance(step_idx, int) or step_idx < 0 or step_idx >= len(roadmap):
        raise JDError(400, "阶段索引超出范围")
    clean = [q for q in (new_quizzes or []) if isinstance(q, dict) and str(q.get("q") or "").strip()]
    next_roadmap = [dict(step) for step in roadmap]
    if clean:
        next_roadmap[step_idx]["quizzes"] = clean
    return {**report, "roadmap": next_roadmap}


def research(user_id, role, jd_text, bypass_cache=False):
    text = (jd_text or "").strip()
    if len(text) < 20:
        raise JDError(400, "请提供至少 20 字的岗位 JD")
    clean_role = (role or "").strip() or "目标岗位"
    prompt_hash = compute_prompt_hash(clean_role, text)
    report, cached = None, False
    if not bypass_cache:
        hit = store.get_cache(prompt_hash)
        if hit:
            parsed = json.loads(hit)
            if parsed.get("roadmap"):
                report, cached = parsed, True
    if not cached:
        try:
            raw = ai_client.chat("输出岗位调研 JSON：roleTitle, requirements[], tacitSignals[], techGaps[], topics[], roadmap[{phase,title,goals[]}]。", f"岗位：{clean_role}\\n{text}")
        except ai_client.NotConfigured as e:
            raise JDError(503, str(e)) from None
        except Exception as e:
            raise JDError(502, "AI 服务暂时不可用，请稍后再试") from e
        try:
            report = json.loads(clean_json_text(raw))
        except Exception as e:
            raise JDError(502, "JD 调研解析失败") from e
        if not report.get("requirements") or not report.get("roadmap"):
            raise JDError(502, "JD 调研结果不完整")
        report.setdefault("roleTitle", clean_role)
        store.save_cache(prompt_hash, json.dumps(report, ensure_ascii=False))
    rid = store.create_report(user_id, prompt_hash, clean_role, text, json.dumps(report, ensure_ascii=False))
    return {"recordId": rid, "promptHash": prompt_hash, "cached": cached, "report": report}


def generate_resume(user_id, record_id, bypass_cache=False):
    rec = store.get_report(user_id, record_id)
    if rec is None:
        raise JDError(404, "调研记录不存在")
    report = json.loads(rec["reportJson"])
    resume, cached = None, False
    if not bypass_cache:
        hit = store.get_resume_cache(rec["promptHash"])
        if hit:
            parsed = normalize_resume_payload(json.loads(hit), report.get("roleTitle"))
            if parsed:
                resume, cached = parsed, True
    if not cached:
        try:
            raw = ai_client.chat("输出参考简历 JSON：targetRole, positioning, techStack[{category,items[]}], projects[{name,role,period,stack[],background,actions[],results[],interviewAngles[]}]。",
                f"目标岗位：{report.get('roleTitle')}\\n要求：{'；'.join(report.get('requirements') or [])}")
        except ai_client.NotConfigured as e:
            raise JDError(503, str(e)) from None
        except Exception as e:
            raise JDError(502, "参考简历生成失败") from e
        try:
            resume = normalize_resume_payload(json.loads(clean_json_text(raw)), report.get("roleTitle"))
        except Exception:
            resume = None
        if not resume:
            raise JDError(502, "参考简历解析失败")
        store.save_resume_cache(rec["promptHash"], json.dumps(resume, ensure_ascii=False))
    next_report = {**report, "resume": resume}
    store.update_report(user_id, rec["id"], json.dumps(next_report, ensure_ascii=False))
    return {"cached": cached, **resume, "report": next_report}


# app/routers/jd.py
from fastapi import APIRouter, Depends
from pydantic import BaseModel
from app.routers.study import require_user
from app.services import jd as jd_service

router = APIRouter(prefix="/api/jd")


class ResearchBody(BaseModel):
    role: str = ""
    jdText: str = ""
    bypassCache: bool = False


class ResumeBody(BaseModel):
    recordId: int
    bypassCache: bool = False


@router.post("/research")
def research(body: ResearchBody, user=Depends(require_user)):
    return jd_service.research(user["id"], body.role, body.jdText, body.bypassCache)


@router.post("/resume")
def resume(body: ResumeBody, user=Depends(require_user)):
    return jd_service.generate_resume(user["id"], body.recordId, body.bypassCache)`,explain:[{at:'# app/database.py',to:');',text:'在 SCHEMA 末尾增加三张表：主调研缓存表、参考简历缓存表与用户记录表。'},{at:'CREATE TABLE IF NOT EXISTS jd_resume_cache (',to:');',text:'两份缓存均使用 prompt_hash 作为主键。'},{at:'CREATE TABLE IF NOT EXISTS jd_reports (',to:');',text:'用户调研记录表保存每份报告的最新 JSON。'},{at:'# app/jd.py',to:'from app.database import connect, query_one',text:'新建数据访问模块。'},{at:'def get_cache(prompt_hash):',to:'(prompt_hash, resume_json),',text:'两条缓存表的读取与 upsert 写入函数。'},{at:'def create_report(',to:'(report_json, record_id, user_id),',text:'创建、按用户读取与更新调研记录，全部查询都带上 user_id 条件。'},{at:'# app/services/jd.py',to:'self.message = message',text:'业务逻辑模块与带状态码的 JDError。'},{at:'def compute_prompt_hash(',to:'return hashlib.sha256(key.encode("utf-8")).hexdigest()',text:'对输入文本做空白归一化并与小写岗位名拼接，计算 SHA-256 十六进制指纹。'},{at:'def clean_json_text(',to:'return [str(x).strip()',text:'剔除 <think> 思考段、截取外层花括号并去除尾逗号。'},{at:'def normalize_resume_payload(',to:'return {"targetRole":',text:'过滤空技术栈分组与缺少 name/actions 的残缺项目，保证参考简历结构合法。'},{at:'def merge_report_phase(',to:'return {**report, "roadmap": next_roadmap}',text:'复制 roadmap 后仅更新目标阶段 quizzes，保留原有 resume 和其他阶段。'},{at:'def research(',to:'return {"recordId": rid,',text:'主调研流程：先查缓存，未命中才调用 AI 清洗落库。'},{at:'def generate_resume(',to:'return {"cached": cached,',text:'参考简历生成：优先命中 jd_resume_cache，否则调 AI 清洗并更新 report["resume"]。'},{at:'# app/routers/jd.py',to:'return jd_service.generate_resume(user["id"], body.recordId, body.bypassCache)',text:'FastAPI 路由层：注册 /api/jd/research 与 /api/jd/resume（在 main.py 注册 router 与 JDError 异常处理器）。'}]}}}},
  {title:'任务二：分阶段流式补全接口（fill-phase）',body:'这一步实现 POST /api/jd/fill-phase：先校验用户、记录和 stepIdx，再开启 application/x-ndjson 响应流逐行推送进度事件。最关键的不变量是：只在解析出合法题目后用 MergeReportPhase 更新目标阶段并写库；大模型出错或解析失败时直接下发 error 事件，绝不覆盖原有的 resume 与已完成阶段。',variants:{go:{practice:{steps:['在 internal/service/jd.go 中新增 FillPhase 方法，补完 TODO 1。','在 internal/handler/jd.go 中新增 jdFillPhase 处理器，并在 Routes 注册 POST /api/jd/fill-phase，补完 TODO 2。','go build ./... 确认能编译。'],expect:'调用 POST /api/jd/fill-phase 收到 connected、status、done 三行 NDJSON'},code:`// internal/service/jd.go（新增 FillPhase 方法）
func (s *JDService) FillPhase(userID, recordID, stepIdx int) (JDReport, JDRoadmapStep, error) {
    // TODO 1：先用 s.jd.GetReport 取出记录（ErrNotFound 转成 ErrJDNotFound），反序列化成 JDReport，
    //         校验 0 <= stepIdx < len(report.Roadmap)，返回完整 report 和目标 step（AI 调用放在流式输出开始后）
    return JDReport{}, JDRoadmapStep{}, nil
}

func (s *JDService) CompletePhase(userID, recordID int, report JDReport, stepIdx int, step JDRoadmapStep) ([]JDQuiz, JDReport, error) {
    sys := "你是技术面试教研专家。请为指定学习阶段生成至少 2 道专项练习题，只输出 JSON：{\\"quizzes\\": [{\\"type\\": \\"single|short\\", \\"q\\": \\"...\\", \\"options\\": [...], \\"answer\\": 0, \\"reference\\": \\"...\\", \\"points\\": [...], \\"explain\\": \\"...\\"}]}。"
    out, err := s.ai.Chat(sys, "补题阶段："+step.Phase+" "+step.Title+"\\n盲区："+strings.Join(report.TechGaps, "；"))
    if err != nil {
        return nil, report, aiError(err)
    }
    var parsed struct {
        Quizzes []JDQuiz \`json:"quizzes"\`
    }
    if err := json.Unmarshal([]byte(cleanJSONText(out)), &parsed); err != nil || len(parsed.Quizzes) == 0 {
        return nil, report, ErrAIFailed
    }
    next, err := MergeReportPhase(report, stepIdx, parsed.Quizzes)
    if err != nil {
        return nil, report, err
    }
    rawBytes, _ := json.Marshal(next)
    if err := s.jd.UpdateReport(userID, recordID, string(rawBytes)); err != nil {
        return nil, report, err
    }
    return next.Roadmap[stepIdx].Quizzes, next, nil
}

// internal/handler/jd.go（新增流式响应助手与 jdFillPhase；在 Routes 注册 mux.HandleFunc("POST /api/jd/fill-phase", h.jdFillPhase)）
func writeNDJSON(w http.ResponseWriter, f http.Flusher, ev any) {
    raw, _ := json.Marshal(ev)
    w.Write(append(raw, '\\n'))
    if f != nil {
        f.Flush()
    }
}

func (h *Handler) jdFillPhase(w http.ResponseWriter, r *http.Request) {
    u, ok := h.requireUser(w, r)
    if !ok {
        return
    }
    var body struct {
        RecordID int \`json:"recordId"\`
        StepIdx  int \`json:"stepIdx"\`
    }
    json.NewDecoder(r.Body).Decode(&body)
    report, step, err := h.jd.FillPhase(u.ID, body.RecordID, body.StepIdx)
    if err != nil {
        h.jdError(w, err)
        return
    }
    // TODO 2：设置 Content-Type: application/x-ndjson; charset=utf-8、Cache-Control: no-store 与 X-Accel-Buffering: no；
    //         拿到 flusher, _ := w.(http.Flusher)，依次写出 connected 和 status 事件；
    //         调用 h.jd.CompletePhase：失败写 {"type":"error","error":err.Error()}，成功写 {"type":"done","stepIdx":body.StepIdx,"quizzes":quizzes,"report":next}
}`,explain:[{at:'// internal/service/jd.go（新增 FillPhase 方法）',to:'return JDReport{}, JDRoadmapStep{}, nil',text:'TODO 1：在进入流式响应之前，先完成权限归属与 stepIdx 边界校验。'},{at:'func (s *JDService) CompletePhase(',to:'return next.Roadmap[stepIdx].Quizzes, next, nil',text:'CompletePhase 调用大模型补题、清洗解析，并通过 MergeReportPhase 合并后更新数据库，保持 resume 和其他阶段完好无损。'},{at:'func writeNDJSON(',to:'}',text:'辅助函数：把对象编码为一行 JSON 加换行符写入响应，并立即 Flush 推向客户端。'},{at:'func (h *Handler) jdFillPhase(',to:'report, step, err := h.jd.FillPhase(',text:'先认人并读取 recordId 与 stepIdx，预校验并取出目标阶段。'},{at:'if err != nil {',to:'// TODO 2',text:'预校验失败直接返回 400 或 404 JSON 错误；TODO 2 接着设置 NDJSON 响应头并流式写出结果。'},{at:'//         拿到 flusher',to:'}',text:'TODO 2：分步冲刷 connected、status 以及最终的 done 或 error 事件。'}],solution:{code:`// internal/service/jd.go（新增 FillPhase 与 CompletePhase 方法）
func (s *JDService) FillPhase(userID, recordID, stepIdx int) (JDReport, JDRoadmapStep, error) {
    rec, err := s.jd.GetReport(userID, recordID)
    if errors.Is(err, store.ErrNotFound) {
        return JDReport{}, JDRoadmapStep{}, ErrJDNotFound
    }
    if err != nil {
        return JDReport{}, JDRoadmapStep{}, err
    }
    var report JDReport
    if err := json.Unmarshal([]byte(rec.ReportJSON), &report); err != nil {
        return JDReport{}, JDRoadmapStep{}, err
    }
    if stepIdx < 0 || stepIdx >= len(report.Roadmap) {
        return JDReport{}, JDRoadmapStep{}, ErrInvalidStepIdx
    }
    return report, report.Roadmap[stepIdx], nil
}

func (s *JDService) CompletePhase(userID, recordID int, report JDReport, stepIdx int, step JDRoadmapStep) ([]JDQuiz, JDReport, error) {
    sys := "你是技术面试教研专家。请为指定学习阶段生成至少 2 道专项练习题，只输出 JSON：{\\"quizzes\\": [{\\"type\\": \\"single|short\\", \\"q\\": \\"...\\", \\"options\\": [...], \\"answer\\": 0, \\"reference\\": \\"...\\", \\"points\\": [...], \\"explain\\": \\"...\\"}]}。"
    out, err := s.ai.Chat(sys, "补题阶段："+step.Phase+" "+step.Title+"\\n盲区："+strings.Join(report.TechGaps, "；"))
    if err != nil {
        return nil, report, aiError(err)
    }
    var parsed struct {
        Quizzes []JDQuiz \`json:"quizzes"\`
    }
    if err := json.Unmarshal([]byte(cleanJSONText(out)), &parsed); err != nil || len(parsed.Quizzes) == 0 {
        return nil, report, ErrAIFailed
    }
    next, err := MergeReportPhase(report, stepIdx, parsed.Quizzes)
    if err != nil {
        return nil, report, err
    }
    rawBytes, _ := json.Marshal(next)
    if err := s.jd.UpdateReport(userID, recordID, string(rawBytes)); err != nil {
        return nil, report, err
    }
    return next.Roadmap[stepIdx].Quizzes, next, nil
}

// internal/handler/jd.go（新增流式响应助手与 jdFillPhase；在 Routes 注册 mux.HandleFunc("POST /api/jd/fill-phase", h.jdFillPhase)）
func writeNDJSON(w http.ResponseWriter, f http.Flusher, ev any) {
    raw, _ := json.Marshal(ev)
    w.Write(append(raw, '\\n'))
    if f != nil {
        f.Flush()
    }
}

func (h *Handler) jdFillPhase(w http.ResponseWriter, r *http.Request) {
    u, ok := h.requireUser(w, r)
    if !ok {
        return
    }
    var body struct {
        RecordID int \`json:"recordId"\`
        StepIdx  int \`json:"stepIdx"\`
    }
    json.NewDecoder(r.Body).Decode(&body)
    report, step, err := h.jd.FillPhase(u.ID, body.RecordID, body.StepIdx)
    if err != nil {
        h.jdError(w, err)
        return
    }
    w.Header().Set("Content-Type", "application/x-ndjson; charset=utf-8")
    w.Header().Set("Cache-Control", "no-store")
    w.Header().Set("X-Accel-Buffering", "no")
    flusher, _ := w.(http.Flusher)
    writeNDJSON(w, flusher, map[string]any{"type": "connected", "recordId": body.RecordID, "stepIdx": body.StepIdx})
    writeNDJSON(w, flusher, map[string]any{"type": "status", "stepIdx": body.StepIdx, "phase": step.Phase})
    quizzes, next, err := h.jd.CompletePhase(u.ID, body.RecordID, report, body.StepIdx, step)
    if err != nil {
        writeNDJSON(w, flusher, map[string]any{"type": "error", "error": err.Error()})
        return
    }
    writeNDJSON(w, flusher, map[string]any{"type": "done", "stepIdx": body.StepIdx, "quizzes": quizzes, "report": next})
}`,explain:[{at:'// internal/service/jd.go（新增 FillPhase 与 CompletePhase 方法）',to:'return report, report.Roadmap[stepIdx], nil',text:'开流前完成权限归属检查、报告读取和 stepIdx 越界检查。'},{at:'func (s *JDService) CompletePhase(',to:'return next.Roadmap[stepIdx].Quizzes, next, nil',text:'向模型请求当前阶段补题，仅当解析结果非空时用 MergeReportPhase 合并写库，失败则原样报错而不动旧数据。'},{at:'func writeNDJSON(',to:'}',text:'序列化为单行 JSON 并即时 Flush 冲刷出去。'},{at:'func (h *Handler) jdFillPhase(',to:'report, step, err := h.jd.FillPhase(',text:'鉴权并解析参数，查出报告与目标阶段。'},{at:'if err != nil {',to:'w.Header().Set("Content-Type",',text:'预校验失败直接返回普通 HTTP 400/404，通过后设置 NDJSON 流式响应头。'},{at:'w.Header().Set("Cache-Control",',to:'writeNDJSON(w, flusher, map[string]any{"type": "done",',text:'设置禁缓存头，依次发出 connected、status，成功则下发 done 并附带更新后的完整 report；失败则下发 error。'}]}},java:{practice:{steps:['在 JdService.java 中新增 prepareFillPhase 与 completePhase，补完 TODO 1。','在 JdController.java 中新增 POST /api/jd/fill-phase 接口返回 StreamingResponseBody，补完 TODO 2。','运行 mvn test 确认构建与测试通过。'],expect:'调用 POST /api/jd/fill-phase 收到多行 NDJSON 事件'},code:`// service/JdService.java（新增方法）
public record PhaseTarget(JdReport report, RoadmapStep step) {}

public PhaseTarget prepareFillPhase(int userId, int recordId, int stepIdx) {
    // TODO 1：查 jd_reports 确认归属（无记录抛 404），反序列化 report，校验 0 <= stepIdx < roadmap.size()（越界抛 400），返回 PhaseTarget
    return null;
}

public JdReport completePhase(int userId, int recordId, PhaseTarget target, int stepIdx) {
    try {
        String out = ai.chat("为学习阶段生成至少 2 道专项练习题，只输出 JSON：{\\"quizzes\\":[...]}。",
            "补题阶段：" + target.step().phase() + " " + target.step().title() + "\\n盲区：" + String.join("；", target.report().techGaps()));
        var node = json.readTree(cleanJson(out)).path("quizzes");
        List<JdQuiz> quizzes = json.convertValue(node, json.getTypeFactory().constructCollectionType(List.class, JdQuiz.class));
        if (quizzes == null || quizzes.isEmpty()) throw err(502, "补题结果为空");
        JdReport next = mergePhase(target.report(), stepIdx, quizzes);
        jdbc.update("UPDATE jd_reports SET report_json = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND user_id = ?",
            json.writeValueAsString(next), recordId, userId);
        return next;
    } catch (StudyService.StudyException e) {
        throw e;
    } catch (Exception e) {
        throw err(502, "补题失败，请重试");
    }
}

// controller/JdController.java（新增 fillPhase 接口；顶部引入 ObjectMapper 与 StreamingResponseBody）
public record FillPhaseBody(int recordId, int stepIdx) {}

@PostMapping("/fill-phase")
public ResponseEntity<StreamingResponseBody> fillPhase(@CookieValue(name = "session", required = false) String token,
                                                       @RequestBody FillPhaseBody body) {
    int userId = auth.currentUser(token).id();
    JdService.PhaseTarget target = jd.prepareFillPhase(userId, body.recordId(), body.stepIdx());
    // TODO 2：返回 200 StreamingResponseBody，设置 Content-Type: application/x-ndjson; charset=utf-8 与 Cache-Control: no-store；
    //         在回调中先写入 connected 与 status 并 flush，调用 jd.completePhase：成功写 done，失败写 error
    return null;
}`,explain:[{at:'// service/JdService.java（新增方法）',to:'return null;',text:'TODO 1：开流前完成权限、记录存在性与 stepIdx 越界检查，让非法请求直接返回 400/404。'},{at:'public JdReport completePhase(',to:'throw err(502, "补题失败，请重试");',text:'completePhase 解析大模型返回的 quizzes 并通过 mergePhase 非破坏性写回数据库。'},{at:'// controller/JdController.java',to:'JdService.PhaseTarget target =',text:'解析请求并做前置校验。'},{at:'// TODO 2',to:'return null;',text:'TODO 2：返回 StreamingResponseBody，写出 connected、status 和 done/error NDJSON 行并及时 flush。'}],solution:{code:`// service/JdService.java（新增方法）
public record PhaseTarget(JdReport report, RoadmapStep step) {}

public PhaseTarget prepareFillPhase(int userId, int recordId, int stepIdx) {
    var rows = jdbc.queryForList("SELECT report_json FROM jd_reports WHERE id = ? AND user_id = ?", String.class, recordId, userId);
    if (rows.isEmpty()) throw err(404, "调研记录不存在");
    try {
        JdReport report = json.readValue(rows.get(0), JdReport.class);
        if (stepIdx < 0 || stepIdx >= report.roadmap().size()) throw err(400, "阶段索引超出范围");
        return new PhaseTarget(report, report.roadmap().get(stepIdx));
    } catch (StudyService.StudyException e) {
        throw e;
    } catch (Exception e) {
        throw err(502, "报告读取失败");
    }
}

public JdReport completePhase(int userId, int recordId, PhaseTarget target, int stepIdx) {
    try {
        String out = ai.chat("为学习阶段生成至少 2 道专项练习题，只输出 JSON：{\\"quizzes\\":[...]}。",
            "补题阶段：" + target.step().phase() + " " + target.step().title() + "\\n盲区：" + String.join("；", target.report().techGaps()));
        var node = json.readTree(cleanJson(out)).path("quizzes");
        List<JdQuiz> quizzes = json.convertValue(node, json.getTypeFactory().constructCollectionType(List.class, JdQuiz.class));
        if (quizzes == null || quizzes.isEmpty()) throw err(502, "补题结果为空");
        JdReport next = mergePhase(target.report(), stepIdx, quizzes);
        jdbc.update("UPDATE jd_reports SET report_json = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND user_id = ?",
            json.writeValueAsString(next), recordId, userId);
        return next;
    } catch (StudyService.StudyException e) {
        throw e;
    } catch (Exception e) {
        throw err(502, "补题失败，请重试");
    }
}

// controller/JdController.java（注入 ObjectMapper json；新增 fillPhase）
public record FillPhaseBody(int recordId, int stepIdx) {}

private void writeLine(java.io.OutputStream out, Object ev) throws java.io.IOException {
    out.write((json.writeValueAsString(ev) + "\\n").getBytes(java.nio.charset.StandardCharsets.UTF_8));
    out.flush();
}

@PostMapping("/fill-phase")
public ResponseEntity<StreamingResponseBody> fillPhase(@CookieValue(name = "session", required = false) String token,
                                                       @RequestBody FillPhaseBody body) {
    int userId = auth.currentUser(token).id();
    JdService.PhaseTarget target = jd.prepareFillPhase(userId, body.recordId(), body.stepIdx());
    StreamingResponseBody stream = out -> {
        writeLine(out, Map.of("type", "connected", "recordId", body.recordId(), "stepIdx", body.stepIdx()));
        writeLine(out, Map.of("type", "status", "stepIdx", body.stepIdx(), "phase", target.step().phase()));
        try {
            JdService.JdReport next = jd.completePhase(userId, body.recordId(), target, body.stepIdx());
            writeLine(out, Map.of("type", "done", "stepIdx", body.stepIdx(), "quizzes", next.roadmap().get(body.stepIdx()).quizzes(), "report", next));
        } catch (RuntimeException e) {
            writeLine(out, Map.of("type", "error", "error", e.getMessage() == null ? "补题失败" : e.getMessage()));
        }
    };
    return ResponseEntity.ok()
        .header("Content-Type", "application/x-ndjson; charset=utf-8")
        .header("Cache-Control", "no-store")
        .header("X-Accel-Buffering", "no")
        .body(stream);
}`,explain:[{at:'// service/JdService.java（新增方法）',to:'throw err(502, "报告读取失败");',text:'在开启响应流之前完成鉴权、报告存在性和 stepIdx 越界检查。'},{at:'public JdReport completePhase(',to:'throw err(502, "补题失败，请重试");',text:'调用大模型补题，解析出 quizzes 后用 mergePhase 保留其余阶段与 resume 并更新数据库。'},{at:'// controller/JdController.java',to:'out.flush();',text:'流式行输出辅助方法：序列化单个事件后立即 flush 到网络流。'},{at:'@PostMapping("/fill-phase")',to:'.body(stream);',text:'返回 StreamingResponseBody 与 NDJSON 响应头，依次写出 connected、status 以及 done/error，不会破坏原有报告进度。'}]}},node:{practice:{steps:['在 src/services/jd.js 中新增 prepareFillPhase 与 completePhase，补完 TODO 1。','在 src/routes/jd.js 中注册 POST /jd/fill-phase 流式路由，补完 TODO 2。','重新启动服务测试 NDJSON 流式输出。'],expect:'响应头为 application/x-ndjson，依次返回 connected、status、done 三行'},code:`// src/services/jd.js（新增并导出 prepareFillPhase 与 completePhase）
function prepareFillPhase(userId, recordId, stepIdx) {
  // TODO 1：查 store.getReport（不存在抛 404），解析 report，校验 stepIdx 是合法整数且在 roadmap 范围内（否则抛 400），返回 { rec, report, step }
}

async function completePhase(userId, recordId, report, step, stepIdx) {
  let raw;
  try {
    raw = await chat("为学习阶段生成至少 2 道专项练习题，只输出 JSON：{\\"quizzes\\":[...]}。",
      \`补题阶段：\${step.phase} \${step.title}\\n盲区：\${(report.techGaps || []).join("；")}\`);
  } catch (err) {
    throw new JDError(err instanceof NotConfiguredError ? 503 : 502, err.message);
  }
  const parsed = JSON.parse(cleanJsonText(raw));
  if (!Array.isArray(parsed?.quizzes) || !parsed.quizzes.length) throw new JDError(502, "补题结果为空");
  const next = mergeReportPhase(report, stepIdx, parsed.quizzes);
  store.updateReport(userId, recordId, JSON.stringify(next));
  return { quizzes: next.roadmap[stepIdx].quizzes, report: next };
}

// src/routes/jd.js（新增 /jd/fill-phase）
router.post("/jd/fill-phase", requireUser, async (req, res, next) => {
  try {
    const recordId = Number(req.body?.recordId);
    const stepIdx = Number(req.body?.stepIdx);
    const { report, step } = jd.prepareFillPhase(req.user.id, recordId, stepIdx);
    // TODO 2：设置 Content-Type: application/x-ndjson; charset=utf-8、Cache-Control: no-store 与 X-Accel-Buffering: no，调用 res.flushHeaders()；
    //         写出 connected 与 status 行；调用 jd.completePhase：成功写 done，失败写 error；最后 res.end()
  } catch (err) {
    if (err instanceof jd.JDError) return res.status(err.status).json({ error: err.message });
    next(err);
  }
});`,explain:[{at:'// src/services/jd.js',to:'function prepareFillPhase(',text:'TODO 1：开流前完成权限归属与参数越界校验。'},{at:'async function completePhase(',to:'return { quizzes: next.roadmap[stepIdx].quizzes, report: next };',text:'向大模型请求当前阶段题目，用 mergeReportPhase 合并后更新数据库，失败则直接抛出错误而不写库。'},{at:'// src/routes/jd.js',to:'const { report, step } = jd.prepareFillPhase(',text:'先执行同步前置校验，400/404 直接走全局错误处理返回 JSON。'},{at:'// TODO 2',to:'next(err);',text:'TODO 2：设置 NDJSON 响应头、即时冲刷响应头，分步 res.write 各行事件，并对前置校验抛出的异常统一返回 JSON。'}],solution:{code:`// src/services/jd.js（新增并导出 prepareFillPhase 与 completePhase）
function prepareFillPhase(userId, recordId, stepIdx) {
  const rec = store.getReport(userId, Number(recordId));
  if (!rec) throw new JDError(404, "调研记录不存在");
  const report = JSON.parse(rec.reportJson);
  if (!Number.isInteger(stepIdx) || stepIdx < 0 || stepIdx >= (report.roadmap || []).length) {
    throw new JDError(400, "阶段索引超出范围");
  }
  return { rec, report, step: report.roadmap[stepIdx] };
}

async function completePhase(userId, recordId, report, step, stepIdx) {
  let raw;
  try {
    raw = await chat("为学习阶段生成至少 2 道专项练习题，只输出 JSON：{\\"quizzes\\":[...]}。",
      \`补题阶段：\${step.phase} \${step.title}\\n盲区：\${(report.techGaps || []).join("；")}\`);
  } catch (err) {
    throw new JDError(err instanceof NotConfiguredError ? 503 : 502, err.message);
  }
  const parsed = JSON.parse(cleanJsonText(raw));
  if (!Array.isArray(parsed?.quizzes) || !parsed.quizzes.length) throw new JDError(502, "补题结果为空");
  const next = mergeReportPhase(report, stepIdx, parsed.quizzes);
  store.updateReport(userId, recordId, JSON.stringify(next));
  return { quizzes: next.roadmap[stepIdx].quizzes, report: next };
}

// src/routes/jd.js（新增 /jd/fill-phase）
router.post("/jd/fill-phase", requireUser, async (req, res, next) => {
  try {
    const recordId = Number(req.body?.recordId);
    const stepIdx = Number(req.body?.stepIdx);
    const { report, step } = jd.prepareFillPhase(req.user.id, recordId, stepIdx);
    res.setHeader("Content-Type", "application/x-ndjson; charset=utf-8");
    res.setHeader("Cache-Control", "no-store");
    res.setHeader("X-Accel-Buffering", "no");
    res.flushHeaders();
    const send = (ev) => res.write(JSON.stringify(ev) + "\\n");
    send({ type: "connected", recordId, stepIdx });
    send({ type: "status", stepIdx, phase: step.phase });
    try {
      const { quizzes, report: nextReport } = await jd.completePhase(req.user.id, recordId, report, step, stepIdx);
      send({ type: "done", stepIdx, quizzes, report: nextReport });
    } catch (err) {
      send({ type: "error", error: err.message || "补题失败" });
    } finally {
      res.end();
    }
  } catch (err) {
    if (err instanceof jd.JDError) return res.status(err.status).json({ error: err.message });
    next(err);
  }
});`,explain:[{at:'// src/services/jd.js',to:'return { rec, report, step: report.roadmap[stepIdx] };',text:'开流前完成权限归属检查与 stepIdx 越界检查，非法的请求在发流前就会被拦下。'},{at:'async function completePhase(',to:'return { quizzes: next.roadmap[stepIdx].quizzes, report: next };',text:'请求模型生成题目并校验非空，通过 mergeReportPhase 合并后更新数据库；异常时跳过写库，旧的 resume 与阶段题目全部保留。'},{at:'// src/routes/jd.js',to:'res.flushHeaders();',text:'先做预校验，通过后设置 NDJSON 头并立刻冲刷响应头让前端进入读取循环。'},{at:'const send = (ev) =>',to:'send({ type: "connected", recordId, stepIdx });',text:'封装逐行写出工具并发送 connected 连接确认事件。'},{at:'send({ type: "status", stepIdx, phase: step.phase });',to:'next(err);',text:'发出 status 事件后调用 completePhase 并写出 done 或 error，确保响应流收尾关闭且前置异常透传给 Express 错误处理。'}]}},python:{practice:{steps:['在 app/services/jd.py 中新增 prepare_fill_phase 与 complete_phase，补完 TODO 1。','在 app/routers/jd.py 中注册 POST /api/jd/fill-phase 返回 StreamingResponse，补完 TODO 2。','重新启动服务测试 NDJSON 流式输出。'],expect:'StreamingResponse 逐行吐出 connected、status、done JSON 行'},code:`# app/services/jd.py（新增函数）
def prepare_fill_phase(user_id, record_id, step_idx):
    # TODO 1：查 store.get_report（不存在抛 404），解析 report，校验 step_idx 在 roadmap 范围内（否则抛 400），返回 (report, step)
    ...


def complete_phase(user_id, record_id, report, step, step_idx):
    try:
        raw = ai_client.chat("为学习阶段生成至少 2 道专项练习题，只输出 JSON：{\\"quizzes\\":[...]}。",
            f"补题阶段：{step.get('phase')} {step.get('title')}\\n盲区：{'；'.join(report.get('techGaps') or [])}")
    except ai_client.NotConfigured as e:
        raise JDError(503, str(e)) from None
    except Exception as e:
        raise JDError(502, "补题失败，请重试") from e
    parsed = json.loads(clean_json_text(raw))
    quizzes = parsed.get("quizzes") if isinstance(parsed, dict) else None
    if not quizzes:
        raise JDError(502, "补题结果为空")
    next_report = merge_report_phase(report, step_idx, quizzes)
    store.update_report(user_id, record_id, json.dumps(next_report, ensure_ascii=False))
    return next_report["roadmap"][step_idx]["quizzes"], next_report


# app/routers/jd.py（顶部多导入 StreamingResponse 与 json）
class FillPhaseBody(BaseModel):
    recordId: int
    stepIdx: int


@router.post("/fill-phase")
def fill_phase(body: FillPhaseBody, user=Depends(require_user)):
    report, step = jd_service.prepare_fill_phase(user["id"], body.recordId, body.stepIdx)
    # TODO 2：定义同步生成器 def gen(): 先 yield connected 和 status 的 JSON 行，
    #         再调用 jd_service.complete_phase：成功 yield done 行，捕获 Exception yield error 行；
    #         返回 StreamingResponse(gen(), media_type="application/x-ndjson", headers={"Cache-Control": "no-store", "X-Accel-Buffering": "no"})
    ...`,explain:[{at:'# app/services/jd.py',to:'...',text:'TODO 1：开流前完成权限检查、记录查询和 step_idx 越界校验。'},{at:'def complete_phase(',to:'return next_report["roadmap"][step_idx]["quizzes"], next_report',text:'调用大模型补题并用 merge_report_phase 非破坏性写回，解析失败直接抛错不写库。'},{at:'# app/routers/jd.py',to:'report, step = jd_service.prepare_fill_phase(',text:'先做前置校验，非法参数直接返回 400 或 404。'},{at:'# TODO 2',to:'...',text:'TODO 2：返回基于同步生成器的 StreamingResponse，FastAPI 会自动在线程池迭代而不阻塞事件循环。'}],solution:{code:`# app/services/jd.py（新增函数）
def prepare_fill_phase(user_id, record_id, step_idx):
    rec = store.get_report(user_id, record_id)
    if rec is None:
        raise JDError(404, "调研记录不存在")
    report = json.loads(rec["reportJson"])
    roadmap = report.get("roadmap") or []
    if not isinstance(step_idx, int) or step_idx < 0 or step_idx >= len(roadmap):
        raise JDError(400, "阶段索引超出范围")
    return report, roadmap[step_idx]


def complete_phase(user_id, record_id, report, step, step_idx):
    try:
        raw = ai_client.chat("为学习阶段生成至少 2 道专项练习题，只输出 JSON：{\\"quizzes\\":[...]}。",
            f"补题阶段：{step.get('phase')} {step.get('title')}\\n盲区：{'；'.join(report.get('techGaps') or [])}")
    except ai_client.NotConfigured as e:
        raise JDError(503, str(e)) from None
    except Exception as e:
        raise JDError(502, "补题失败，请重试") from e
    parsed = json.loads(clean_json_text(raw))
    quizzes = parsed.get("quizzes") if isinstance(parsed, dict) else None
    if not quizzes:
        raise JDError(502, "补题结果为空")
    next_report = merge_report_phase(report, step_idx, quizzes)
    store.update_report(user_id, record_id, json.dumps(next_report, ensure_ascii=False))
    return next_report["roadmap"][step_idx]["quizzes"], next_report


# app/routers/jd.py（顶部多导入 StreamingResponse 与 json）
class FillPhaseBody(BaseModel):
    recordId: int
    stepIdx: int


@router.post("/fill-phase")
def fill_phase(body: FillPhaseBody, user=Depends(require_user)):
    report, step = jd_service.prepare_fill_phase(user["id"], body.recordId, body.stepIdx)

    def gen():
        yield json.dumps({"type": "connected", "recordId": body.recordId, "stepIdx": body.stepIdx}, ensure_ascii=False) + "\\n"
        yield json.dumps({"type": "status", "stepIdx": body.stepIdx, "phase": step.get("phase", "")}, ensure_ascii=False) + "\\n"
        try:
            quizzes, next_report = jd_service.complete_phase(user["id"], body.recordId, report, step, body.stepIdx)
            yield json.dumps({"type": "done", "stepIdx": body.stepIdx, "quizzes": quizzes, "report": next_report}, ensure_ascii=False) + "\\n"
        except Exception as e:
            yield json.dumps({"type": "error", "error": getattr(e, "message", None) or str(e)}, ensure_ascii=False) + "\\n"

    return StreamingResponse(
        gen(),
        media_type="application/x-ndjson",
        headers={"Cache-Control": "no-store", "X-Accel-Buffering": "no"},
    )`,explain:[{at:'# app/services/jd.py',to:'return report, roadmap[step_idx]',text:'流开始前校验用户归属与 step_idx 范围，不合法时直接返回 400 或 404。'},{at:'def complete_phase(',to:'return next_report["roadmap"][step_idx]["quizzes"], next_report',text:'请求模型生成练习题并用 merge_report_phase 合并写库，异常时保留原有 resume 与其余阶段。'},{at:'# app/routers/jd.py',to:'report, step = jd_service.prepare_fill_phase(',text:'路由层先同步校验再构建同步生成器。'},{at:'def gen():',to:'headers={"Cache-Control": "no-store", "X-Accel-Buffering": "no"},',text:'用普通 def 生成器逐行 yield connected、status、done 或 error NDJSON 事件（FastAPI 放到线程池迭代），配合禁止代理缓冲的响应头及时送达前端。'}]}}}},
  {title:'任务三：前端 JD 调研工作台：标签页、流式填充与打印简历',body:'把前面三个后端接口接进工作台页面：输入岗位与 JD 后切换四个标签页（岗位画像、复习路径、专项专题、参考简历）；点击“AI 补题”时用 fetch 配合 ReadableStream.getReader() 逐行解析 NDJSON 事件；支持将补出的题目导入第 17 关的个人题库，并通过 @media print 样式实现点击“打印简历”时只打印简历纸张区域。',variants:{html:{body:'新建 jd.html 和 jd.js：表单与结果标签页都放在 jd.html，状态切换、NDJSON 流式读取和打印逻辑写在 jd.js 里。注意在打印样式里用 @media print 隐藏表单和导航，只保留 #resumeSheet。',practice:{steps:['新建 jd.html 与 jd.js，补完 TODO 1 到 TODO 4。','登录后打开 /jd.html，输入岗位和 JD 提交调研，再提交一次确认出现“缓存命中”。','切到“复习路径”点“AI 补题”，再到“参考简历”点“生成参考简历”和“打印简历”。'],expect:'四个标签页切换正常，“AI 补题”实时更新阶段题数，打印预览仅显示简历正文'},code:`<!-- jd.html -->
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <title>JD 深度调研 - 面试自习室</title>
  <style>
    @media print {
      .no-print { display: none !important; }
      #resumeSheet { border: 0; padding: 0; }
    }
  </style>
</head>
<body>
  <header class="no-print"><a href="/">← 返回题库</a></header>
  <h1>JD 深度调研</h1>
  <form id="jdForm" class="no-print">
    <input id="roleInput" placeholder="目标岗位">
    <textarea id="jdInput" rows="5" placeholder="粘贴岗位 JD…"></textarea>
    <button type="submit">开始调研</button>
    <span id="jdStatus"></span>
  </form>
  <nav id="tabs" class="no-print" hidden>
    <button data-tab="profile">岗位画像</button>
    <button data-tab="roadmap">复习路径</button>
    <button data-tab="topics">专项专题</button>
    <button data-tab="resume">参考简历</button>
  </nav>
  <section id="panel"></section>
  <script src="jd.js"></script>
</body>
</html>

// jd.js
let recordId = null;
let report = null;
let activeTab = "profile";
const panel = document.getElementById("panel");
const statusEl = document.getElementById("jdStatus");

function render() {
  if (!report) return;
  document.getElementById("tabs").hidden = false;
  panel.replaceChildren();
  if (activeTab === "profile") {
    const h = document.createElement("h2");
    h.textContent = report.roleTitle;
    panel.append(h);
    for (const [label, list] of [["岗位要求", report.requirements], ["隐性信号", report.tacitSignals], ["技术盲区", report.techGaps]]) {
      const b = document.createElement("h3");
      b.textContent = label;
      const ul = document.createElement("ul");
      for (const it of list || []) {
        const li = document.createElement("li");
        li.textContent = it;
        ul.append(li);
      }
      panel.append(b, ul);
    }
  } else if (activeTab === "roadmap") {
    (report.roadmap || []).forEach((step, idx) => {
      const card = document.createElement("article");
      const title = document.createElement("h3");
      title.textContent = \`\${step.phase} · \${step.title}\`;
      const btn = document.createElement("button");
      btn.textContent = step.quizzes?.length ? \`已有 \${step.quizzes.length} 题（重补）\` : "AI 补题";
      btn.onclick = () => fillPhase(idx, btn);
      card.append(title, btn);
      if (step.quizzes?.length) {
        const imp = document.createElement("button");
        imp.textContent = "导入题库";
        imp.onclick = () => importQuizzes(step.quizzes);
        card.append(imp);
      }
      panel.append(card);
    });
  } else if (activeTab === "topics") {
    for (const t of report.topics || []) {
      const p = document.createElement("p");
      p.textContent = t;
      panel.append(p);
    }
  } else if (activeTab === "resume") {
    // TODO 1：没有 report.resume 时显示“生成参考简历”按钮；有了以后渲染 #resumeSheet（targetRole、positioning、techStack 分组、STAR projects）
    //         并在外层放“打印简历”按钮（class="no-print"，点击调用 window.print()）
  }
}

async function fillPhase(stepIdx, btn) {
  // TODO 2：POST /api/jd/fill-phase 后用 res.body.getReader() + TextDecoder 读取 NDJSON 流；
  //         用缓冲区按 "\\n" 切分每一行，解析到 status 时更新按钮文字，解析到 done 时更新 report 并调用 render()，error 时提示失败
}

async function generateResume() {
  // TODO 3：POST /api/jd/resume 传入 { recordId }，成功后把 data.report 赋给 report 并调用 render()
}

async function importQuizzes(quizzes) {
  const res = await fetch("/api/questions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ items: quizzes.map((q) => ({ title: q.q, answer: q.reference || q.explain, category: "jd" })) }),
  });
  statusEl.textContent = res.ok ? "已导入题库" : "导入失败";
}

document.getElementById("tabs").addEventListener("click", (e) => {
  if (e.target.dataset.tab) { activeTab = e.target.dataset.tab; render(); }
});

document.getElementById("jdForm").addEventListener("submit", async (e) => {
  // TODO 4：阻止默认提交，校验输入并 POST /api/jd/research，记下 recordId 与 report，命中缓存时显示“缓存命中”，最后调用 render()
});`,explain:[{at:'<!-- jd.html -->',to:'</head>',text:'工作台页面骨架与 @media print 样式：打印时隐藏表单和标签栏，只保留简历纸张。'},{at:'<body>',to:'</html>',text:'四个顶层标签按钮（岗位画像、复习路径、专项专题、参考简历）与结果容器及页面主体结构。'},{at:'// jd.js',to:'const statusEl =',text:'前端全局状态：当前记录 ID、报告数据与激活的标签页。'},{at:'function render() {',to:'panel.append(b, ul);',text:'岗位画像标签：渲染标题、显性要求、隐性信号和技术盲区列表。'},{at:'} else if (activeTab === "roadmap") {',to:'panel.append(p);',text:'复习路径与专项专题：展示各阶段目标、“AI 补题”和“导入题库”按钮。'},{at:'} else if (activeTab === "resume") {',to:'async function fillPhase(',text:'TODO 1：参考简历标签页渲染与 window.print() 打印入口，随后定义流式补题函数。'},{at:'// TODO 2',to:'async function generateResume() {',text:'TODO 2：补全 NDJSON 流式读行与状态更新。'},{at:'// TODO 3',to:'statusEl.textContent = res.ok ? "已导入题库" : "导入失败";',text:'TODO 3 为请求生成参考简历；importQuizzes 把补出的练习题一键导入第 17 关个人题库。'},{at:'document.getElementById("tabs").addEventListener("click", (e) => {',to:'// TODO 4',text:'切换四个标签页并重新渲染面板，随后绑定表单提交事件（TODO 4）。'}],solution:{code:`<!-- jd.html -->
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <title>JD 深度调研 - 面试自习室</title>
  <style>
    @media print {
      .no-print { display: none !important; }
      #resumeSheet { border: 0; padding: 0; }
    }
  </style>
</head>
<body>
  <header class="no-print"><a href="/">← 返回题库</a></header>
  <h1>JD 深度调研</h1>
  <form id="jdForm" class="no-print">
    <input id="roleInput" placeholder="目标岗位">
    <textarea id="jdInput" rows="5" placeholder="粘贴岗位 JD…"></textarea>
    <button type="submit">开始调研</button>
    <span id="jdStatus"></span>
  </form>
  <nav id="tabs" class="no-print" hidden>
    <button data-tab="profile">岗位画像</button>
    <button data-tab="roadmap">复习路径</button>
    <button data-tab="topics">专项专题</button>
    <button data-tab="resume">参考简历</button>
  </nav>
  <section id="panel"></section>
  <script src="jd.js"></script>
</body>
</html>

// jd.js
let recordId = null;
let report = null;
let activeTab = "profile";
const panel = document.getElementById("panel");
const statusEl = document.getElementById("jdStatus");

function render() {
  if (!report) return;
  document.getElementById("tabs").hidden = false;
  panel.replaceChildren();
  if (activeTab === "profile") {
    const h = document.createElement("h2");
    h.textContent = report.roleTitle;
    panel.append(h);
    for (const [label, list] of [["岗位要求", report.requirements], ["隐性信号", report.tacitSignals], ["技术盲区", report.techGaps]]) {
      const b = document.createElement("h3");
      b.textContent = label;
      const ul = document.createElement("ul");
      for (const it of list || []) {
        const li = document.createElement("li");
        li.textContent = it;
        ul.append(li);
      }
      panel.append(b, ul);
    }
  } else if (activeTab === "roadmap") {
    (report.roadmap || []).forEach((step, idx) => {
      const card = document.createElement("article");
      const title = document.createElement("h3");
      title.textContent = \`\${step.phase} · \${step.title}\`;
      const btn = document.createElement("button");
      btn.textContent = step.quizzes?.length ? \`已有 \${step.quizzes.length} 题（重补）\` : "AI 补题";
      btn.onclick = () => fillPhase(idx, btn);
      card.append(title, btn);
      if (step.quizzes?.length) {
        const imp = document.createElement("button");
        imp.textContent = "导入题库";
        imp.onclick = () => importQuizzes(step.quizzes);
        card.append(imp);
      }
      panel.append(card);
    });
  } else if (activeTab === "topics") {
    for (const t of report.topics || []) {
      const p = document.createElement("p");
      p.textContent = t;
      panel.append(p);
    }
  } else if (activeTab === "resume") {
    if (!report.resume) {
      const gen = document.createElement("button");
      gen.textContent = "生成参考简历";
      gen.onclick = () => generateResume();
      panel.append(gen);
      return;
    }
    const bar = document.createElement("div");
    bar.className = "no-print";
    const printBtn = document.createElement("button");
    printBtn.textContent = "打印简历";
    printBtn.onclick = () => window.print();
    bar.append(printBtn);
    const sheet = document.createElement("div");
    sheet.id = "resumeSheet";
    const h = document.createElement("h2");
    h.textContent = report.resume.targetRole;
    const pos = document.createElement("p");
    pos.textContent = report.resume.positioning || "";
    sheet.append(h, pos);
    for (const grp of report.resume.techStack || []) {
      const st = document.createElement("h3");
      st.textContent = grp.category;
      const ul = document.createElement("ul");
      for (const item of grp.items || []) {
        const li = document.createElement("li");
        li.textContent = item;
        ul.append(li);
      }
      sheet.append(st, ul);
    }
    for (const proj of report.resume.projects || []) {
      const pTitle = document.createElement("h3");
      pTitle.textContent = \`\${proj.name}（\${proj.role}）\`;
      const bg = document.createElement("p");
      bg.textContent = proj.background || "";
      const ul = document.createElement("ul");
      for (const act of [...(proj.actions || []), ...(proj.results || [])]) {
        const li = document.createElement("li");
        li.textContent = act;
        ul.append(li);
      }
      sheet.append(pTitle, bg, ul);
    }
    panel.append(bar, sheet);
  }
}

async function fillPhase(stepIdx, btn) {
  btn.disabled = true;
  btn.textContent = "补题中…";
  try {
    const res = await fetch("/api/jd/fill-phase", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ recordId, stepIdx }),
    });
    if (!res.ok || !res.body) throw new Error("补题失败");
    const reader = res.body.getReader();
    const dec = new TextDecoder();
    let buf = "";
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      buf += dec.decode(value, { stream: true });
      let nl;
      while ((nl = buf.indexOf("\\n")) >= 0) {
        const line = buf.slice(0, nl).trim();
        buf = buf.slice(nl + 1);
        if (!line) continue;
        const ev = JSON.parse(line);
        if (ev.type === "status") btn.textContent = \`生成 \${ev.phase}…\`;
        if (ev.type === "error") throw new Error(ev.error);
        if (ev.type === "done" && ev.report) report = ev.report;
      }
    }
    render();
  } catch (err) {
    statusEl.textContent = err.message;
  } finally {
    btn.disabled = false;
  }
}

async function generateResume() {
  statusEl.textContent = "生成参考简历中…";
  const res = await fetch("/api/jd/resume", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ recordId }),
  });
  const data = await res.json();
  if (!res.ok) { statusEl.textContent = data.error || "生成失败"; return; }
  report = data.report;
  statusEl.textContent = data.cached ? "缓存命中" : "";
  render();
}

async function importQuizzes(quizzes) {
  const res = await fetch("/api/questions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ items: quizzes.map((q) => ({ title: q.q, answer: q.reference || q.explain, category: "jd" })) }),
  });
  statusEl.textContent = res.ok ? "已导入题库" : "导入失败";
}

document.getElementById("tabs").addEventListener("click", (e) => {
  if (e.target.dataset.tab) { activeTab = e.target.dataset.tab; render(); }
});

document.getElementById("jdForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const role = document.getElementById("roleInput").value.trim();
  const jdText = document.getElementById("jdInput").value.trim();
  statusEl.textContent = "分析中…";
  const res = await fetch("/api/jd/research", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ role, jdText }),
  });
  const data = await res.json();
  if (!res.ok) { statusEl.textContent = data.error || "调研失败"; return; }
  recordId = data.recordId;
  report = data.report;
  statusEl.textContent = data.cached ? "缓存命中" : "";
  activeTab = "profile";
  render();
});`,explain:[{at:'<!-- jd.html -->',to:'</head>',text:'工作台页面骨架与 @media print 样式：打印时隐藏表单和标签栏，只保留简历纸张。'},{at:'<body>',to:'</html>',text:'四个顶层标签按钮（岗位画像、复习路径、专项专题、参考简历）与结果容器及页面主体结构。'},{at:'// jd.js',to:'const statusEl =',text:'前端全局状态：当前记录 ID、报告数据与激活的标签页。'},{at:'function render() {',to:'panel.append(b, ul);',text:'岗位画像标签：渲染标题、显性要求、隐性信号和技术盲区列表。'},{at:'} else if (activeTab === "roadmap") {',to:'panel.append(p);',text:'复习路径与专项专题：展示各阶段目标、“AI 补题”和“导入题库”按钮。'},{at:'} else if (activeTab === "resume") {',to:'panel.append(bar, sheet);',text:'参考简历视图：未生成时显示生成按钮，已有数据时组装 #resumeSheet 并提供 window.print() 打印按钮。'},{at:'async function fillPhase(',to:'btn.disabled = false;',text:'调用 POST /api/jd/fill-phase 并使用 ReadableStream 逐行解析 NDJSON，跨 chunk 用 buf 缓冲拼接，收到 done 后刷新视图。'},{at:'async function generateResume() {',to:'statusEl.textContent = res.ok ? "已导入题库" : "导入失败";',text:'请求 POST /api/jd/resume 生成参考简历并支持把专项题批量导入个人题库。'},{at:'document.getElementById("tabs").addEventListener("click", (e) => {',to:'});',text:'点击四个顶层标签切换视图并重新渲染。'},{at:'document.getElementById("jdForm").addEventListener("submit"',to:'render();',text:'提交调研表单、保存记录并提示缓存命中状态，随后渲染工作台。'}]}},react:{body:'新建 src/JdResearchPage.jsx：用 useState 管理表单、tab（profile/roadmap/topics/resume）、report、fillingIdx 与 cached 状态；通过 @media print 的 CSS 规则控制打印时仅输出 .resume-sheet。',practice:{steps:['新建 src/JdResearchPage.jsx 并补完 TODO 1 到 TODO 4，在 App.jsx 加上入口链接或路由。','在浏览器测试调研、二次提交缓存命中、NDJSON 流式补题以及参考简历打印预览。'],expect:'标签页切换流畅，补题期间显示进度，打印预览隐藏非简历元素'},code:`// src/JdResearchPage.jsx
import { useState } from "react";

export default function JdResearchPage() {
  const [role, setRole] = useState("");
  const [jdText, setJdText] = useState("");
  const [recordId, setRecordId] = useState(null);
  const [report, setReport] = useState(null);
  const [cached, setCached] = useState(false);
  const [tab, setTab] = useState("profile");
  const [fillingIdx, setFillingIdx] = useState(null);
  const [error, setError] = useState("");

  async function submitResearch(e) {
    e.preventDefault();
    setError("");
    // TODO 1：POST /api/jd/research，成功后更新 recordId、report、cached，并切回 profile 标签页
  }

  async function fillPhase(stepIdx) {
    if (!recordId || fillingIdx !== null) return;
    setFillingIdx(stepIdx);
    setError("");
    // TODO 2：POST /api/jd/fill-phase，使用 res.body.getReader() + TextDecoder 按 "\\n" 切分 NDJSON；
    //         收到 done 且带 report 时调用 setReport(ev.report)，收到 error 时 setError(ev.error)
    setFillingIdx(null);
  }

  async function generateResume() {
    // TODO 3：POST /api/jd/resume，更新 report 与 cached；错误放进 error
  }

  return (
    <main>
      <style>{\`@media print { .no-print { display: none !important; } }\`}</style>
      <h1>JD 深度调研</h1>
      <form onSubmit={submitResearch} className="no-print">
        <input value={role} onChange={(e) => setRole(e.target.value)} placeholder="目标岗位" />
        <textarea rows={5} value={jdText} onChange={(e) => setJdText(e.target.value)} placeholder="粘贴岗位 JD…" />
        <button type="submit">开始调研</button>
        {cached && <span>缓存命中</span>}
      </form>
      {error && <p>{error}</p>}
      {report && (
        <>
          <div className="no-print" role="tablist">
            {[["profile", "岗位画像"], ["roadmap", "复习路径"], ["topics", "专项专题"], ["resume", "参考简历"]].map(([k, label]) => (
              <button key={k} type="button" onClick={() => setTab(k)}>{label}</button>
            ))}
          </div>
          {tab === "profile" && (
            <section>
              <h2>{report.roleTitle}</h2>
              <ul>{(report.requirements || []).map((x, i) => <li key={i}>{x}</li>)}</ul>
              <ul>{(report.tacitSignals || []).map((x, i) => <li key={i}>{x}</li>)}</ul>
              <ul>{(report.techGaps || []).map((x, i) => <li key={i}>{x}</li>)}</ul>
            </section>
          )}
          {tab === "roadmap" && (
            <section>
              {(report.roadmap || []).map((s, idx) => (
                <article key={idx}>
                  <h3>{s.phase} · {s.title}</h3>
                  <button type="button" disabled={fillingIdx !== null} onClick={() => fillPhase(idx)}>
                    {fillingIdx === idx ? "补题中…" : s.quizzes?.length ? \`已有 \${s.quizzes.length} 题\` : "AI 补题"}
                  </button>
                </article>
              ))}
            </section>
          )}
          {tab === "topics" && (
            <section>
              {(report.topics || []).map((t, i) => <p key={i}>{t}</p>)}
            </section>
          )}
          {tab === "resume" && (
            <section>
              {/* TODO 4：无 report.resume 时渲染“生成参考简历”按钮；有数据时渲染“打印简历”(window.print()) 与 .resume-sheet（techStack 与 STAR projects） */}
            </section>
          )}
        </>
      )}
    </main>
  );
}`,explain:[{at:'// src/JdResearchPage.jsx',to:'const [error, setError] = useState("");',text:'组件顶部管理表单、当前报告、缓存标记、激活标签与补题中索引。'},{at:'async function submitResearch(e) {',to:'async function generateResume() {',text:'TODO 1–3：主调研提交、ReadableStream 逐行解析 NDJSON 补题以及参考简历生成请求。'},{at:'// TODO 3',to:'return (',text:'定义简历生成函数后开始渲染工作台。'},{at:'<main>',to:'</form>',text:'内联 @media print 隐藏非简历区域，表单仅保留岗位输入框、JD 输入框、提交按钮和缓存提示。'},{at:'{error && <p>{error}</p>}',to:'{tab === "profile" && (',text:'渲染四个切换标签按钮并进入“岗位画像”面板。'},{at:'<section>',to:'</section>',text:'岗位画像面板展示要求、隐性信号和盲区。'},{at:'{tab === "roadmap" && (',to:'</section>',text:'复习路径面板按阶段展示“AI 补题”按钮并禁用并发点击。'},{at:'{tab === "topics" && (',to:'</section>',text:'专项专题面板列出考点标签。'},{at:'{tab === "resume" && (',to:'</main>',text:'TODO 4：参考简历面板与一键打印按钮，结束组件渲染。'}],solution:{code:`// src/JdResearchPage.jsx
import { useState } from "react";

export default function JdResearchPage() {
  const [role, setRole] = useState("");
  const [jdText, setJdText] = useState("");
  const [recordId, setRecordId] = useState(null);
  const [report, setReport] = useState(null);
  const [cached, setCached] = useState(false);
  const [tab, setTab] = useState("profile");
  const [fillingIdx, setFillingIdx] = useState(null);
  const [error, setError] = useState("");

  async function submitResearch(e) {
    e.preventDefault();
    setError("");
    const res = await fetch("/api/jd/research", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role: role.trim(), jdText: jdText.trim() }),
    });
    const data = await res.json();
    if (!res.ok) { setError(data.error || "调研失败"); return; }
    setRecordId(data.recordId);
    setReport(data.report);
    setCached(Boolean(data.cached));
    setTab("profile");
  }

  async function fillPhase(stepIdx) {
    if (!recordId || fillingIdx !== null) return;
    setFillingIdx(stepIdx);
    setError("");
    try {
      const res = await fetch("/api/jd/fill-phase", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recordId, stepIdx }),
      });
      if (!res.ok || !res.body) throw new Error("补题失败");
      const reader = res.body.getReader();
      const dec = new TextDecoder();
      let buf = "";
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        let nl;
        while ((nl = buf.indexOf("\\n")) >= 0) {
          const line = buf.slice(0, nl).trim();
          buf = buf.slice(nl + 1);
          if (!line) continue;
          const ev = JSON.parse(line);
          if (ev.type === "error") throw new Error(ev.error);
          if (ev.type === "done" && ev.report) setReport(ev.report);
        }
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setFillingIdx(null);
    }
  }

  async function generateResume() {
    setError("");
    const res = await fetch("/api/jd/resume", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ recordId }),
    });
    const data = await res.json();
    if (!res.ok) { setError(data.error || "生成失败"); return; }
    setReport(data.report);
    setCached(Boolean(data.cached));
  }

  return (
    <main>
      <style>{\`@media print { .no-print { display: none !important; } }\`}</style>
      <h1>JD 深度调研</h1>
      <form onSubmit={submitResearch} className="no-print">
        <input value={role} onChange={(e) => setRole(e.target.value)} placeholder="目标岗位" />
        <textarea rows={5} value={jdText} onChange={(e) => setJdText(e.target.value)} placeholder="粘贴岗位 JD…" />
        <button type="submit">开始调研</button>
        {cached && <span>缓存命中</span>}
      </form>
      {error && <p>{error}</p>}
      {report && (
        <>
          <div className="no-print" role="tablist">
            {[["profile", "岗位画像"], ["roadmap", "复习路径"], ["topics", "专项专题"], ["resume", "参考简历"]].map(([k, label]) => (
              <button key={k} type="button" onClick={() => setTab(k)}>{label}</button>
            ))}
          </div>
          {tab === "profile" && (
            <section>
              <h2>{report.roleTitle}</h2>
              <ul>{(report.requirements || []).map((x, i) => <li key={i}>{x}</li>)}</ul>
              <ul>{(report.tacitSignals || []).map((x, i) => <li key={i}>{x}</li>)}</ul>
              <ul>{(report.techGaps || []).map((x, i) => <li key={i}>{x}</li>)}</ul>
            </section>
          )}
          {tab === "roadmap" && (
            <section>
              {(report.roadmap || []).map((s, idx) => (
                <article key={idx}>
                  <h3>{s.phase} · {s.title}</h3>
                  <button type="button" disabled={fillingIdx !== null} onClick={() => fillPhase(idx)}>
                    {fillingIdx === idx ? "补题中…" : s.quizzes?.length ? \`已有 \${s.quizzes.length} 题\` : "AI 补题"}
                  </button>
                </article>
              ))}
            </section>
          )}
          {tab === "topics" && (
            <section>
              {(report.topics || []).map((t, i) => <p key={i}>{t}</p>)}
            </section>
          )}
          {tab === "resume" && (
            <section>
              {!report.resume ? (
                <button type="button" onClick={generateResume}>生成参考简历</button>
              ) : (
                <>
                  <div className="no-print">
                    <button type="button" onClick={() => window.print()}>打印简历</button>
                  </div>
                  <div className="resume-sheet">
                    <h2>{report.resume.targetRole}</h2>
                    <p>{report.resume.positioning}</p>
                    {(report.resume.techStack || []).map((g, gi) => (
                      <div key={gi}>
                        <h3>{g.category}</h3>
                        <ul>{g.items.map((it, ii) => <li key={ii}>{it}</li>)}</ul>
                      </div>
                    ))}
                    {(report.resume.projects || []).map((p, pi) => (
                      <article key={pi}>
                        <h3>{p.name}（{p.role}）</h3>
                        <p>{p.background}</p>
                        <ul>{[...(p.actions || []), ...(p.results || [])].map((x, xi) => <li key={xi}>{x}</li>)}</ul>
                      </article>
                    ))}
                  </div>
                </>
              )}
            </section>
          )}
        </>
      )}
    </main>
  );
}`,explain:[{at:'// src/JdResearchPage.jsx',to:'const [error, setError] = useState("");',text:'组件顶部管理表单、当前报告、缓存标记、激活标签与补题中索引。'},{at:'async function submitResearch(e) {',to:'setTab("profile");',text:'提交岗位和 JD 调用 /api/jd/research，记录 recordId、report 与是否命中缓存。'},{at:'async function fillPhase(stepIdx) {',to:'setFillingIdx(null);',text:'流式读取 POST /api/jd/fill-phase，用 buf 缓冲不完整行，逐行 JSON.parse 并在收到 done 后更新 report。'},{at:'async function generateResume() {',to:'setCached(Boolean(data.cached));',text:'调用 /api/jd/resume 并把挂好 resume 的 report 存进状态。'},{at:'return (',to:'</form>',text:'内联 @media print 样式表与简洁表单。'},{at:'{error && <p>{error}</p>}',to:'</div>',text:'错误提示与四个工作台标签页切换导航。'},{at:'{tab === "profile" && (',to:'</section>',text:'岗位画像标签页展示角色标题、核心要求、隐含信号与技术短板。'},{at:'{tab === "roadmap" && (',to:'</section>',text:'复习路径标签页展示各阶段及 AI 补题按钮状态。'},{at:'{tab === "topics" && (',to:'</section>',text:'专项专题标签页列出从 JD 拆解出的高频面试专题。'},{at:'{tab === "resume" && (',to:'</main>',text:'参考简历标签页：未生成时渲染触发按钮，生成后渲染打印按钮与 .resume-sheet（分组技术栈和 STAR 项目）。'}]}}}},
  {title:'验收：检查 JD 解析、缓存命中、分阶段补全与参考简历',body:'把下面的验收脚本保存为 checks/check_l19.py。它在本地 8090 端口启动假的 OpenAI 上游，依次检查未登录拦截、带思考标签与围栏的 JD 报告解析、空白归一化二次请求命中缓存（不调上游）、NDJSON 分阶段流式补全、POST /api/jd/resume 返回技术栈与 STAR 项目、补全第二阶段时保留已有简历和第一阶段题目，以及参考简历二次请求缓存命中。',practice:{steps:['停掉后端，设置 AI_BASE_URL=http://127.0.0.1:8090、AI_API_KEY=test-key、AI_MODEL=test-model 后启动后端。','把下面的脚本保存为 checks/check_l19.py 并运行 python checks/check_l19.py，确认 7 项全部通过。','用浏览器打开页面体验一遍完整流程，然后 git add . 并提交。'],expect:'✓ 未登录不能调用 JD 调研接口\n✓ 非结构化 JD 解析并返回完整结构化报告\n✓ 相同 JD 与岗位二次请求命中内容哈希缓存且不调上游\n✓ 分阶段流式补全返回 NDJSON 并正确合并到第一阶段\n✓ POST /api/jd/resume 返回分组技术栈与 STAR 参考项目\n✓ 再次补全第二阶段时保留已有参考简历与第一阶段题目\n✓ 二次请求参考简历命中缓存且不重复调用上游\n\n通过 7 / 7'},code:`import http.cookiejar
import json
import random
import sys
import threading
import urllib.error
import urllib.request
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

BASE = sys.argv[1] if len(sys.argv) > 1 else "http://localhost:8080"
upstream_calls = []
passed = 0


class FakeOpenAI(BaseHTTPRequestHandler):
    def read_body(self):
        if self.headers.get("Content-Length"):
            return self.rfile.read(int(self.headers["Content-Length"]))
        data = b""
        while True:
            size = int(self.rfile.readline().strip(), 16)
            if size == 0:
                self.rfile.readline()
                return data
            data += self.rfile.read(size)
            self.rfile.readline()

    def do_POST(self):
        body = json.loads(self.read_body())
        text = " ".join(m.get("content", "") for m in body.get("messages", []))
        upstream_calls.append(text)
        if "参考简历" in text or "techStack" in text:
            payload = {
                "targetRole": "Go 后端工程师",
                "positioning": "擅长高并发交易链路与稳定性治理",
                "techStack": [{"category": "核心语言与并发", "items": ["深入理解 GMP 调度与逃逸分析"]}],
                "projects": [{
                    "name": "分布式订单撮合网关",
                    "role": "核心研发",
                    "period": "8 个月",
                    "stack": ["Go", "MySQL", "Redis"],
                    "background": "峰值 5 万 QPS 下单链路出现锁等待与 P99 抖动",
                    "actions": ["基于分段锁与本地缓存改造热库存扣减路径"],
                    "results": ["P99 延迟从 120ms 降至 24ms"],
                    "interviewAngles": ["热 Key 拆分与主从切换兜底策略"],
                }],
            }
            content = "\`\`\`json\\n" + json.dumps(payload, ensure_ascii=False) + "\\n\`\`\`"
        elif "补题" in text or "quizzes" in text:
            payload = {
                "quizzes": [
                    {"type": "single", "q": "Go GMP 中 P 的默认数量等于什么？", "options": ["CPU 逻辑核数", "固定 8 个", "协程数", "内存大小"], "answer": 0, "explain": "GOMAXPROCS 默认等于逻辑 CPU 核数。"},
                    {"type": "short", "q": "如何排查 Goroutine 泄漏？", "reference": "用 pprof 查看 goroutine profile 定位阻塞栈，并补充 context 超时取消。", "points": ["使用 pprof 定位", "补充 context 退出"], "explain": "确保每个协程都有退出路径。"},
                ]
            }
            content = json.dumps(payload, ensure_ascii=False)
        else:
            payload = {
                "roleTitle": "Go 后端工程师",
                "requirements": ["3 年以上 Go 并发开发经验", "熟悉 MySQL 事务与 Redis 集群"],
                "tacitSignals": ["重高并发链路设计与线上排障复盘"],
                "techGaps": ["Goroutine 泄漏定位与锁竞争优化"],
                "topics": ["Go 运行时", "MySQL 锁机制"],
                "roadmap": [
                    {"phase": "Day 1–2", "title": "Go 并发底层", "goals": ["掌握 GMP 调度与 channel"]},
                    {"phase": "Day 3–4", "title": "存储与缓存高可用", "goals": ["掌握 InnoDB MVCC 与热点防护"]},
                ],
            }
            content = "<think>先拆解核心考点</think>\\n\`\`\`json\\n" + json.dumps(payload, ensure_ascii=False) + "\\n\`\`\`"
        self.reply(200, {"choices": [{"message": {"role": "assistant", "content": content}}]})

    def reply(self, status, data):
        raw = json.dumps(data, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(raw)))
        self.end_headers()
        self.wfile.write(raw)

    def log_message(self, *args):
        pass


threading.Thread(target=ThreadingHTTPServer(("127.0.0.1", 8090), FakeOpenAI).serve_forever, daemon=True).start()


def check(name, ok):
    global passed
    print(("✓ " if ok else "✗ ") + name)
    passed += bool(ok)


def new_client():
    opener = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(http.cookiejar.CookieJar()))

    def call(method, path, body=None, ndjson=False):
        data = json.dumps(body).encode("utf-8") if body is not None else None
        req = urllib.request.Request(BASE + path, data=data, method=method, headers={"Content-Type": "application/json"})
        try:
            with opener.open(req, timeout=40) as r:
                status, raw = r.status, r.read().decode("utf-8")
        except urllib.error.HTTPError as e:
            status, raw = e.code, e.read().decode("utf-8")
        except OSError as e:
            sys.exit(f"连不上 {BASE}，服务启动了吗？（{e}）")
        if ndjson:
            events = [json.loads(line) for line in raw.splitlines() if line.strip()]
            return status, events
        try:
            return status, json.loads(raw or "null")
        except ValueError:
            return status, {}

    return call


anon, me = new_client(), new_client()
user = {"username": f"jd_{random.randint(100000, 999999)}", "password": "secret123"}
me("POST", "/api/register", user)
me("POST", "/api/login", user)

jd_raw = "负责高并发交易后端架构设计，精通 Go GMP 调度、MySQL MVCC 与 Redis 高可用防护。"
jd_spaces = "  负责高并发交易后端架构设计，精通   Go  GMP 调度、MySQL MVCC 与 Redis 高可用防护。\\n\\n"

st, _ = anon("POST", "/api/jd/research", {"role": "Go 后端工程师", "jdText": jd_raw})
check("未登录不能调用 JD 调研接口", st == 401)

before = len(upstream_calls)
st, r1 = me("POST", "/api/jd/research", {"role": "Go 后端工程师", "jdText": jd_raw})
rep1 = r1.get("report") if isinstance(r1, dict) else {}
record_id = r1.get("recordId") if isinstance(r1, dict) else None
check("非结构化 JD 解析并返回完整结构化报告",
      st == 200 and r1.get("cached") is False and record_id is not None and len(upstream_calls) == before + 1
      and len(rep1.get("requirements", [])) >= 1 and len(rep1.get("tacitSignals", [])) >= 1
      and len(rep1.get("techGaps", [])) >= 1 and len(rep1.get("roadmap", [])) == 2)

before = len(upstream_calls)
st, r2 = me("POST", "/api/jd/research", {"role": "  go 后端工程师 ", "jdText": jd_spaces})
check("相同 JD 与岗位二次请求命中内容哈希缓存且不调上游",
      st == 200 and r2.get("cached") is True and r2.get("promptHash") == r1.get("promptHash") and len(upstream_calls) == before)

st, evs = me("POST", "/api/jd/fill-phase", {"recordId": record_id, "stepIdx": 0}, ndjson=True)
done0 = next((e for e in reversed(evs) if e.get("type") == "done"), {})
rep_p0 = done0.get("report", {})
check("分阶段流式补全返回 NDJSON 并正确合并到第一阶段",
      st == 200 and any(e.get("type") == "connected" for e in evs)
      and len(rep_p0.get("roadmap", [{}])[0].get("quizzes", [])) >= 2)

st, res_data = me("POST", "/api/jd/resume", {"recordId": record_id})
check("POST /api/jd/resume 返回分组技术栈与 STAR 参考项目",
      st == 200 and len(res_data.get("techStack", [])) >= 1 and len(res_data.get("projects", [])) >= 1
      and len(res_data["projects"][0].get("actions", [])) >= 1)

st, evs1 = me("POST", "/api/jd/fill-phase", {"recordId": record_id, "stepIdx": 1}, ndjson=True)
done1 = next((e for e in reversed(evs1) if e.get("type") == "done"), {})
rep_p1 = done1.get("report", {})
check("再次补全第二阶段时保留已有参考简历与第一阶段题目",
      st == 200 and len(rep_p1.get("roadmap", [{}, {}])[0].get("quizzes", [])) >= 2
      and len(rep_p1.get("roadmap", [{}, {}])[1].get("quizzes", [])) >= 2
      and len((rep_p1.get("resume") or {}).get("projects", [])) >= 1)

before = len(upstream_calls)
st, res_hit = me("POST", "/api/jd/resume", {"recordId": record_id})
check("二次请求参考简历命中缓存且不重复调用上游",
      st == 200 and res_hit.get("cached") is True and len(upstream_calls) == before
      and len(res_hit.get("techStack", [])) >= 1 and len(res_hit.get("projects", [])) >= 1)

print(f"\\n通过 {passed} / 7")`,explain:[{at:'import http.cookiejar',to:'passed = 0',text:'引入标准库模块，upstream_calls 记录假 OpenAI 上游一共被请求了几次，用于验证缓存命中。'},{at:'class FakeOpenAI(BaseHTTPRequestHandler):',to:'return data',text:'read_body 兼容 Content-Length 定长和分块传输（Transfer-Encoding: chunked）两种请求体格式。'},{at:'data += self.rfile.read(size)',to:'self.rfile.readline()',text:'逐块读完数据后跳过块尾换行符，继续读取下一块直到长度为 0。'},{at:'def do_POST(self):',to:'upstream_calls.append(text)',text:'收到大模型请求后记录调用次数，根据提示词关键字区分“主调研”“补题”与“参考简历”三类响应。'},{at:'if "参考简历" in text',to:'content = "```json\\n"',text:'参考简历响应故意包裹 ```json 围栏，测试后端清洗逻辑。'},{at:'elif "补题" in text',to:'content = json.dumps(payload',text:'补题响应返回 2 道带题型与要点的专项题。'},{at:'else:',to:'self.reply(200,',text:'主调研响应故意带上 <think> 思考段与代码围栏，验证后端 JSON 修复与字段校验。'},{at:'def reply(self, status, data):',to:'pass',text:'返回 OpenAI 兼容 JSON 响应并静默请求日志。'},{at:'threading.Thread(',to:'passed += bool(ok)',text:'后台启动 8090 假服务并定义断言打印助手 check。'},{at:'def new_client():',to:'return call',text:'带 Cookie 的客户端封装，支持普通 JSON 接口以及按行解析 NDJSON 流式输出。'},{at:'anon, me = new_client(), new_client()',to:'jd_spaces =',text:'注册登录测试用户，并准备一份带额外空格和换行的等效 JD 文本 jd_spaces。'},{at:'st, _ = anon("POST", "/api/jd/research"',to:'check("未登录不能调用 JD 调研接口"',text:'第 1 项：未登录调用 JD 接口必须返回 401。'},{at:'before = len(upstream_calls)',to:'and len(rep1.get("roadmap", [])) == 2)',text:'第 2 项：首次请求调研接口调用 1 次上游，并返回完整的结构化字段。'},{at:'before = len(upstream_calls)',to:'and len(upstream_calls) == before)',text:'第 3 项：改用多余空格和大小写岗位提交同一份 JD，命中内容哈希缓存（cached=True）且上游调用次数零增长。'},{at:'st, evs = me("POST", "/api/jd/fill-phase", {"recordId": record_id, "stepIdx": 0}',to:'len(rep_p0.get("roadmap", [{}])[0].get("quizzes", [])) >= 2)',text:'第 4 项：对第 1 阶段调用 fill-phase，收到 connected 和 done NDJSON 事件且 quizzes 合并成功。'},{at:'st, res_data = me("POST", "/api/jd/resume"',to:'len(res_data["projects"][0].get("actions", [])) >= 1)',text:'第 5 项：生成参考简历返回非空 techStack 分组和 STAR 项目经历。'},{at:'st, evs1 = me("POST", "/api/jd/fill-phase", {"recordId": record_id, "stepIdx": 1}',to:'and len((rep_p1.get("resume") or {}).get("projects", [])) >= 1)',text:'第 6 项：再对第 2 阶段补题，检查第 1 阶段题目与刚刚生成的参考简历依然完好保留。'},{at:'before = len(upstream_calls)',to:'and len(res_hit.get("projects", [])) >= 1)',text:'第 7 项：再次请求参考简历命中缓存且不重复调用上游。'},{at:'print(f"\\n通过 {passed} / 7")',text:'打印最终通过数：通过 7 / 7。'}]},
  {title:'这一关学到了什么',body:'一、非结构化 JD 必须先拆解为确定的 JSON Schema（要求、隐性信号、盲区、专题、路径），后端用剥离 <think>、裁剪花括号与尾逗号修复保证解析稳健；\n二、对归一化后的岗位与 JD 计算 SHA-256 promptHash 并存入缓存表，能让重复调研与简历生成零 Token 命中；\n三、两段式生成（核心报告骨架先出 + NDJSON 分阶段 fill-phase 懒加载）缩短首屏等待并规避超长输出截断；\n四、非破坏性合并（mergeReportPhase）和规范化清洗（normalizeResumePayload）确保补题、重跑或失败时不覆盖已有参考简历与已完成阶段；\n五、结合分组 techStack、STAR 项目经历与 @media print 打印样式，打通“JD 拆解 → 补题入库 → 简历打磨 → 模拟深挖”的完整闭环。\n下一关预告（第 20 关）：GitHub、Google 第三方登录与账号同步——接入 OAuth 2.0 授权码登录并把学习进度、笔记与调研报告多端同步到同一账号。'}
 ],quiz:[
 {id:'pj-jd-1',q:'在解析大模型返回的 JD 调研 JSON 时，为什么要先剥离 <think> 标签和 ```json 围栏，再定位最外层花括号？',options:['大模型开启思考后会自动把数据加密，必须先解码','模型输出常夹带思考文本与代码围栏，直接解析会报错','JSON 标准要求所有键名都必须放在最外层花括号外','这样可以跳过字段校验，把任意文本直接存进数据库'],why:['思考过程是明文推理文本，不是加密数据。','','合法的 JSON 对象本身就由最外层花括号包裹。','清洗文本之后仍要解析并校验关键字段，不能跳过校验。'],answer:1,explain:'大模型经常在 JSON 前后输出 <think> 思考段、Markdown 代码围栏或提示语；先剥离杂项并截取最外层 { 到 } 再清理尾逗号，能大幅提高解析成功率。'},
 {id:'pj-jd-2',type:'judge',q:'计算 JD 缓存键 promptHash 时，可以直接对原始输入文本做校验和，没必要先归一化空格和换行符。',answer:false,explain:'错误。不同系统的换行符（CRLF/LF）以及复制带入的多余空格和空行在语义上属于同一份 JD；先做空白归一化再算 SHA-256，才能稳定命中缓存并节省 Token。'},
 {id:'pj-jd-3',type:'multi',q:'为什么这一关要把 JD 调研拆成“核心报告骨架 + 按阶段 fill-phase 流式补全”，而不是一次请求全部生成？（多选）',options:['避免单次输出过长触发 max_tokens 截断','分阶段请求可以让前端省去解析 JSON 文本的步骤','让用户先看到画像和路径，减少首屏等待时间','只按需生成用户点开的阶段，减少 Token 浪费'],why:['','每个阶段补全返回的依然是结构化 JSON 事件，前端仍需逐行解析 NDJSON。','',''],answers:[0,2,3],explain:'拆分阶段既能先返回核心画像与路径缩短等待，又能防止超长生成在中途被截断，同时避免为未展开的阶段白白消耗大模型额度。'},
 {id:'pj-jd-4',q:'在调用 POST /api/jd/fill-phase 补全第 2 阶段题目时，如果之前已经生成过参考简历且第 1 阶段已有题目，合并函数应该怎么做？',options:['清空整份旧报告，只保留刚生成的第 2 阶段题目','覆盖整个 roadmap 数组，并顺便删除参考简历','仅更新目标阶段的 quizzes，保留其余阶段与参考简历','把第 2 阶段新题目追加到参考简历的项目列表末尾'],why:['清空旧报告会导致画像、路径和已完成阶段全部丢失。','参考简历和未变更阶段属于已产出资产，不应该在补全其他阶段时被误删。','','学习题属于对应路径阶段，不应混入参考简历的 STAR 项目经历。'],answer:2,explain:'非破坏性合并（mergeReportPhase）必须基于副本仅更新目标阶段索引，保护已完成阶段的题目、已有 resume 以及补题失败时的旧状态。'},
 {id:'pj-jd-5',type:'fill',q:'参考简历的项目经历通常按 ＿ 法则组织，即明确项目背景、核心行动动作与量化成果，并附带面试深挖角度。',accepted:['STAR','STAR法则','STAR 法则'],explain:'STAR（Situation 背景、Task 任务、Action 行动、Result 结果）是技术面试最清晰的项目表达结构，对应本关参考简历中的 background、actions 与 results 字段。'},
 {id:'pj-jd-6',type:'multi',q:'关于参考简历生成与前端打印导出，下面哪些设计是合理的？（多选）',options:['技术栈直接把所有工具名词无分组地堆砌在同一行里','技术栈按核心领域分组，每组写出机制与落地场景','打印简历时手动把网页上的按钮和导航逐个删掉','用 @media print 样式表隐藏导航与表单，只打印简历正文'],why:['无分组地堆砌名词体现不出能力深度，按领域分组并说明机制与场景才符合面试预期。','','手删 DOM 既易出错又会破坏当前页面状态，应交给打印样式表控制。',''],answers:[1,3],explain:'分组技术栈能让面试官快速抓到重点；配合 CSS @media print 规则，调用 window.print() 即可导出干净的简历排版而不破坏交互页面。'},
 {id:'pj-jd-7',type:'judge',q:'在流式补全（fill-phase）读取 NDJSON 响应时，前端需要用缓冲区拼接每次读到的文本并按换行符切分，因为单个网络分片可能刚好截断在一行 JSON 中间。',answer:true,explain:'正确。HTTP 分块传输和 TextDecoder 流式解码按字节分片到达，一个完整的 JSON 行可能跨两个 chunk，必须用缓冲区保留末尾未换行部分等待下一块拼齐。'},
 {id:'pj-jd-8',type:'short',q:'请说明 JD 深度调研从“缓存检查 → 分阶段补全 → 生成参考简历与专项补题”的完整数据流，以及中间失败时如何保证已有成果不丢失。',reference:'一、提交岗位和 JD 时先归一化空白并计算 SHA-256 promptHash，命中 jd_cache 直接返回 cached=true，否则调用大模型并校验 JSON 后写库与缓存；二、按阶段调用 POST /api/jd/fill-phase，通过 NDJSON 流式推送进度与结果，并用 mergeReportPhase 只更新目标阶段；三、调用 POST /api/jd/resume 结合画像与盲区生成分组技术栈与 STAR 项目简历并缓存；四、补题或解析失败时返回 error 事件而不覆写数据库，保留已完成阶段和已有 resume。',points:['先做输入归一化与 SHA-256 内容哈希缓存查重','主报告先生成骨架，再用 NDJSON 分阶段流式补全','非破坏性合并阶段结果，失败时不覆盖已完成阶段与参考简历','基于调研画像和盲区生成分组技术栈、STAR 参考简历并支持导入题库'],explain:'核心在于用确定性缓存省 Token、用分阶段流式防超时截断、用非破坏性合并保证重试安全。'},
 {id:'pj-jd-code-1',type:'code',q:'实现参考简历清洗函数 normalizeResumePayload 和阶段合并函数 mergeReportPhase：过滤掉空技术栈分组和缺少行动项的残缺项目，并在合并新补全的阶段题目时保留原有参考简历与其他已完成阶段（不修改原对象）。',reference:`export function normalizeResumePayload(raw: any, fallbackRole = '目标岗位') {
  if (!raw || typeof raw !== 'object') return null;
  const trimList = (arr: unknown) =>
    Array.isArray(arr) ? arr.map((x) => String(x || '').trim()).filter(Boolean) : [];
  const targetRole = String(raw.targetRole || '').trim() || String(fallbackRole || '').trim() || '目标岗位';
  const positioning = String(raw.positioning || '').trim();
  const techStack = (Array.isArray(raw.techStack) ? raw.techStack : [])
    .map((g: any) => ({ category: String(g?.category || '').trim(), items: trimList(g?.items) }))
    .filter((g: any) => g.category && g.items.length > 0);
  const projects = (Array.isArray(raw.projects) ? raw.projects : [])
    .map((p: any) => ({
      name: String(p?.name || '').trim(),
      role: String(p?.role || '').trim() || '核心研发',
      period: String(p?.period || '').trim(),
      stack: trimList(p?.stack),
      background: String(p?.background || '').trim(),
      actions: trimList(p?.actions),
      results: trimList(p?.results),
      interviewAngles: trimList(p?.interviewAngles),
    }))
    .filter((p: any) => p.name && p.actions.length > 0);
  if (!techStack.length || !projects.length) return null;
  return { targetRole, positioning, techStack, projects };
}

export function mergeReportPhase(report: any, stepIdx: number, newQuizzes: any[]) {
  if (!report || !Array.isArray(report.roadmap) || !Number.isInteger(stepIdx) || stepIdx < 0 || stepIdx >= report.roadmap.length) {
    throw new Error('阶段索引超出范围');
  }
  const clean = (Array.isArray(newQuizzes) ? newQuizzes : []).filter((q) => q && String(q.q || '').trim());
  const roadmap = report.roadmap.map((step: any, idx: number) =>
    idx === stepIdx && clean.length > 0 ? { ...step, quizzes: clean } : { ...step }
  );
  return { ...report, roadmap };
}`,points:['TODO 1：清洗 targetRole、positioning，并过滤掉 category 或 items 为空的技术栈分组','TODO 2：清洗 STAR 项目各字段，过滤掉 name 或 actions 为空的项目；techStack 或 projects 为空时返回失败/空值','TODO 3：校验 stepIdx 范围，浅拷贝 roadmap 并完整保留原 report 的 resume 等其余字段','TODO 4：仅当规范化后的新题目非空时更新目标阶段 quizzes，否则保留该阶段原有题目'],explain:'数据清洗保证前端渲染和打印简历不会遇到空组或残缺项目；不可变浅拷贝合并且仅在有合法新题时覆写目标阶段，才能确保失败重试安全。'},
 {id:'pj-jd-go-1',stack:'go',q:'Go 在编写 POST /api/jd/fill-phase 流式接口时，每写出一行 NDJSON 后调用 flusher.Flush() 的主要目的是？',options:['把当前 HTTP 连接立刻关闭，通知客户端断开','清空数据库事务缓冲区，把报告持久化到 SQLite','把标准输出日志同步写入磁盘文件避免丢失','立即把缓冲区里的这行 JSON 推给客户端，防止阻塞'],why:['Flush 只冲刷网络缓冲区，不会关闭 HTTP 连接。','Flush 作用于 http.ResponseWriter，和 SQLite 事务无关。','它处理的是 HTTP 响应流，不是标准输出日志文件。',''],answer:3,explain:'net/http 默认会缓冲较小的响应体，直到缓冲满或函数结束才发包；流式接口必须每次写入一行后调用 Flusher.Flush() 立刻送达前端。'},
 {id:'pj-jd-java-1',stack:'java',q:'Spring Boot 实现 /api/jd/fill-phase 返回 StreamingResponseBody 时，为什么要把记录校验（404/400）放在返回 ResponseEntity 之前？',options:['开始写出流后响应头已发送，没法再改成 404 状态码','StreamingResponseBody 里不允许注入 Repository 对象','Spring Boot 在流式回调里会自动把 404 转成 200','把校验放进回调里会导致 Jackson 拒绝序列化所有字段'],why:['','回调可以访问外部传入的 Repository 与 Service，真正限制是 HTTP 响应头生命周期。','一旦进入 body 回调并写出字节，响应头默认按 200 发送，并不是自动转换状态码。','Jackson 序列化和校验位置没有关系。'],answer:0,explain:'HTTP 状态码随响应头在第一批正文之前发出。进入 StreamingResponseBody 开始写流后，状态码已经是 200，所以权限、参数和记录存在性必须在返回流之前校验完毕。'},
 {id:'pj-jd-node-1',stack:'node',q:'在 Node.js 里使用 crypto.createHash("sha256").update(key).digest("hex") 生成缓存键有什么作用？',options:['把长 JD 压缩加密成可逆文本，方便需要时还原原文','把任意长度的岗位和 JD 映射成固定 64 位十六进制指纹','每次运行生成随机盐值，确保同一份 JD 每次键值不同','自动去掉 JD 里的标点符号和 HTML 标签后再做对比'],why:['SHA-256 是单向哈希摘要，不能解密还原出原始 JD。','','缓存键需要确定性：相同内容应算出完全相同的哈希，不加随机盐。','哈希函数不负责清洗文本，归一化空白要在 update 之前做好。'],answer:1,explain:'SHA-256 把归一化后的文本变成固定 64 字符的确定性摘要，适合作为 SQLite 主键快速查重，同时避免把上万字原文直接当索引键。'},
 {id:'pj-jd-python-1',stack:'python',q:'在 FastAPI 的 /api/jd/fill-phase 路由里，若用同步的 httpx.post 调用上游大模型，StreamingResponse 的生成器函数为什么应写成普通 def 而不是 async def？',options:['async def 生成器在 Python 里语法不合法，无法启动','普通 def 生成器会自动把上游接口改成异步非阻塞协议','避免同步阻塞操作卡住整个异步事件循环，影响其他请求','FastAPI 不支持把 StreamingResponse 配合 async 生成器使用'],why:['Python 支持 async def 异步生成器（async generator）。','FastAPI 是把同步生成器放到线程池里迭代，不会改变 httpx.post 的底层协议。','','FastAPI 完全支持 async 生成器，但里面必须搭配 httpx.AsyncClient 等异步调用。'],answer:2,explain:'FastAPI 会把普通同步生成器放进线程池逐项迭代；若在 async def 生成器里直接执行同步网络请求，会阻塞整个事件循环。'}
]};
