# 后台自动出题接口

## questionSet（第二阶段）

可选参数 `questionSet: { "type": "training", "name": "训练20260916" }`：类型支持 `training`、`mock`、`exam`，名称必须是去除首尾空白后长度为 1–100 个 Unicode 字符的字符串。非法类型返回 HTTP 400，`error` 和 `code` 均为 `INVALID_QUESTION_SET_TYPE`；非法名称对应 `INVALID_QUESTION_SET_NAME`。

带 `questionSet` 时必须显式指定 `status: "published"`，所有题目均须为 `kind: "practice"` 并通过现有发布校验；模拟沿用现有规则，仅支持简答和代码题。不满足时整批返回 `QUESTION_PUBLISH_VALIDATION_FAILED`（HTTP 400）。省略 `questionSet` 时继续仅新增题目，默认草稿；空数组保持原有 400 响应。

复用现有 `practice_plans` / `PracticePlan`：`training → random`、`mock → interview`、`exam → exam`，名称对应 `title`，时长默认 30 分钟。支持本批同时包含 Go 和后端通用，`subjectIds` 记录完整学科范围，现有 `subjectId` 使用首题学科保持入口兼容。管理员必须拥有全部相关学科权限才能管理该题集。调用方控制 training 6（Go 3 / 后端 3）、mock 10（5 / 5）、exam 15（8 / 7）的业务数量；数据库不强制这些固定数量。

一次 D1 `batch` 原子执行以下操作，任一步出错都会回滚：

1. 插入已验证的新题，使用 `RETURNING id`；紧接每次 INSERT，使用 SQLite 的 `last_insert_rowid()` 返回寄存器捕获实际插入行的 ID 到事务内回执。额外核对该行 ID，防止跳过 INSERT 时误用上一行。
2. 题目回执按请求下标记录 `sort_order = 1…N`；不按标题、学科或知识点重新检索题目。
3. 创建统一题集，从回执生成原有格式的有序题目快照；将回执中的实际 ID 写入 `practice_plan_questions`。
4. 写入成功日志和幂等结果。数据库提交校验触发器验证回执、关联、快照的数量均等于请求数量，且每个位置的 ID 一致、题目均已发布。D1 不支持在两次网络调用之间保持显式 BEGIN，因此这些校验在 batch 提交前的数据库触发器内完成。
5. 删除事务回执后提交。失败时不保留题目、题集、关联、指纹、幂等结果或成功日志；现有失败尝试日志仍会保留。

响应保留 `ok`、`count`、`ids`、`status`，带题集时增加 `questionSet: {id, type, name}`。`ids` 的顺序对应原始请求，提交前与实际插入回执逐一核对。

本阶段新增错误码（`error` 与 `code` 均携带对应值）：`QUESTION_SET_CREATE_FAILED`、`QUESTION_LINK_FAILED`、`QUESTION_COUNT_MISMATCH`（HTTP 500），以及 `QUESTION_PUBLISH_VALIDATION_FAILED`（HTTP 400）。原有 Token、幂等键、查重和整批拒绝行为保留。

将自动生成的题目提交到 `POST /api/admin/auto-questions`。服务端使用 Sites 密钥 `AUTO_QUESTION_API_TOKEN` 验证 `Authorization: Bearer <Token>`；Token 不应写入源码或浏览器代码。每次写入必须带 `Idempotency-Key`（8–128 个字母、数字或 `._:-`）。单批支持 1–100 道，默认保存为草稿；只有显式传 `status: "published"` 且每题满足发布校验时才直接发布。

```http
POST /api/admin/auto-questions
Authorization: Bearer <Token>
Idempotency-Key: generator-2026-09-14-go-001
Content-Type: application/json

{
  "status": "draft",
  "questions": [{
    "subjectId": "go",
    "kind": "document",
    "type": "short",
    "topic": "并发",
    "section": "Goroutine",
    "zh": {
      "title": "Goroutine 如何调度？",
      "blocks": [{"type": "text", "text": "由 Go 运行时调度器调度。"}]
    }
  }]
}
```

返回 `count`、新增题目 `ids` 和状态。相同幂等键与相同内容重试返回首次结果及 `replayed: true`；同一键搭配不同内容返回 409。按学科、题库类型和规范化标题查重；本批次重复、现有题库重复及并发写入冲突均拒绝整批。`GET /api/admin/auto-questions` 使用相同 Token，返回最近 50 条执行日志。

## 幂等与名称唯一性（第三阶段）

同一 `Idempotency-Key` 保护整个题目发布、题集创建、顺序关联及最终返回结果。相同键和相同 JSON 内容（对象字段顺序不影响）返回首次结果并增加 `replayed: true`，HTTP 200；首次创建 HTTP 201。同键不同内容返回 HTTP 409，不修改任何已创建数据。并发请求也遵循此规则，重放检查优先于名称及题目查重。

题集名称按空间、类型、去除首尾空白后的名称判重。同一空间同一类型不可重名（包含草稿、已发布和归档方案）；不同类型或空间可以同名。题集内所有学科须属于同一空间，Go 与后端通用均属于 `go-interview`。新的幂等键提交已有题集名称，在新增题目前返回 HTTP 409：

```json
{"success":false,"error":"QUESTION_SET_ALREADY_EXISTS","code":"QUESTION_SET_ALREADY_EXISTS","message":"训练20260916 已存在"}
```

迁移 `0009_blue_ikaris.sql` 增加名称登记表 `practice_plan_names`，主键为 `(space_id,type,name)`，以及关联表的 `(plan_id,question_id)` 唯一索引。题集插入和修改触发器维护名称登记并检查现有 `practice_plans`，因此历史题集无需批量改写也能阻止重名；手动组卷同样受约束。名称登记与自动创建的其他写入共享原事务，任何冲突均回滚。迁移不会清理已有历史重名题集，但禁止新建同名项。

## 返回值、查询与日志（第四阶段）

带题集的首次成功返回 HTTP 201，保留 `ok` 并增加以下自动化字段；`questionCount` 已通过同一事务中的实际关联数量校验：

```json
{
  "ok": true,
  "success": true,
  "count": 6,
  "ids": ["q1", "q2", "q3", "q4", "q5", "q6"],
  "status": "published",
  "questionSet": {"id": "set-id", "type": "training", "name": "训练20260916", "questionCount": 6},
  "replayed": false
}
```

重试返回 HTTP 200 和首次完整结果，`replayed: true`。第四阶段之前保存的题集成功结果也会在重放时补充 `success` 和 `questionCount`，不重新写入题目。无 `questionSet` 的旧请求维持原有返回格式。

### 查询

`GET /api/admin/question-sets?type=training&name=训练20260916` 使用与自动出题相同的 Bearer Token。响应为 `{success:true,data:{id,type,name,spaceId,status,questionCount,linkedCount,associationSource,questions}}`。`questions` 保持创建时快照和请求顺序，每项包含 `question`、`english`、`sortOrder`。

自动创建的题集使用实际 `practice_plan_questions` 关联，`associationSource: "links"`；查询时核对数量、ID 和顺序。关联数量损坏返回 HTTP 409 `QUESTION_COUNT_MISMATCH`，顺序或 ID 损坏返回 `QUESTION_LINK_FAILED`，不会报告成功。历史手动方案继续使用其原有内嵌快照，标记为 `associationSource: "snapshot"`。

同时提供 type 和 name 时返回一个对象；未找到返回 HTTP 404 `QUESTION_SET_NOT_FOUND`。跨空间同名返回 HTTP 409 `QUESTION_SET_AMBIGUOUS`，可增加 `spaceId=go-interview` 精确查询；同空间历史重名也会报告歧义。省略其中任意过滤条件时返回最多 50 个题集组成的数组，并带 `hasMore`；可单独按 type、name 或 spaceId 筛选。接口仅增加读取能力，自动写入口仍为原 POST。

### 执行日志

`GET /api/admin/auto-questions` 保留 `{logs:[...]}` 和最近 50 条能力，按开始时间倒序。每次请求都有独立的 `executionId`，同一幂等键的重试也会留下独立记录。新增字段：

| 字段 | 含义 |
| --- | --- |
| executionId / idempotencyKey | 本次执行 ID / 调用方幂等键；无有效键时为空字符串 |
| questionSetType / questionSetName / questionSetId | 请求题集信息；失败时 ID 为 null，重放时为首次成功的 ID |
| requestedCount | 本次提交题数 |
| createdCount / linkedCount | 本次实际新增题数 / 建立关联数；失败或重放均为 0，无题集时关联数为 0 |
| status | success、failed 或 replayed，不使用 partial |
| replayed | 是否复用首次成功结果 |
| errorCode / errorMessage | 失败错误码及说明，成功或重放为 null |
| createdAt / finishedAt / durationMs | 开始时间、数据库日志写入时间、两者差值，单位毫秒 |

重放的 POST 返回首次创建数量，而日志计数描述本次执行，避免把重试算作再次创建。成功日志在同一事务中、提交校验之后写入，失败回滚不会留下成功日志。失败和重放日志单独保存；日志存储本身不可用时只输出固定错误提示，不打印数据库错误对象或请求头。时间统计包含参数校验和数据库执行到日志写入的耗时，不包含后续网络传输。

旧日志的 id、key、count、detail、created_at 字段继续返回；历史 rejected 状态统一映射为 failed。历史记录无法推断的关联数量和时间字段返回 null。迁移 `0010_short_mad_thinker.sql` 仅新增可空 metadata 列，保留现有日志。日志不保存 Authorization 或 Bearer Token 明文。


## 最终验收（第五阶段）

验收入口：`tests/question-set-acceptance.mjs`。使用真实 Miniflare D1 隔离数据库，加载全部迁移后，通过原 POST 和查询接口执行以下场景。测试数据不会写入线上数据库。

| 场景 | 验收结果 |
| --- | --- |
| 旧接口 | 非空合法批次只新增题目；空数组继续返回原有 400，不写数据 |
| training-20260916 | 训练20260916，6 题（Go 3 / 后端 3），1 题集，6 条有序关联 |
| mock-20260916 | 模拟20260916，10 题（Go 5 / 后端 5），1 题集，10 条有序关联 |
| exam-20260916 | 考试20260916，15 题（Go 8 / 后端 7），1 题集，15 条有序关联 |
| 混入已存在的题目 | HTTP 409，全部业务表内容不变 |
| 第 4 题缺少答案 | 发布校验失败，全部业务表内容不变 |
| 题集 INSERT 失败 | 全部回滚 |
| 第 4 条关联失败 | 全部回滚 |
| 关联由 6 条变为 5 条 | QUESTION_COUNT_MISMATCH，全部回滚 |
| 三种题集分别同键同内容重试 | 原始结果及 replayed=true，全部业务表内容不变 |
| 三种题集分别同键不同内容 | HTTP 409，全部业务表内容不变 |
| 三种题集分别新键同名 | QUESTION_SET_ALREADY_EXISTS，全部业务表内容不变 |

异常场景比较完整业务表快照，包含题目、题集、关联、名称登记、指纹、幂等结果和事务回执；不仅比较行数。三个主验收请求完成后共 31 道已发布题、3 个题集、31 条关联，无已发布孤立题目、无残留回执，外键检查通过。另有一题旧接口草稿，无题集关联符合兼容规则。

Code Review 检查了 Token 鉴权复用、请求规范化哈希、重放优先级、空间和名称约束、INSERT ID 来源、顺序及提交校验、失败日志与成功事务边界、查询关联核对和历史数据兼容。其他测试继续覆盖同键和重名并发竞争、更多数据库失败注入、现有后台权限、学习和考试功能。

发现并修复的缺陷：日志虽然没有记录请求头，但用户误将 Token 复制到幂等键、题集名称或错误文本时会间接泄露。现在所有日志写入文本及读取结果都会脱敏当前 Token 和 Bearer 凭据，包括历史日志的返回内容；测试先复现原缺陷，再验证修复。此处理只影响日志展示与保存，不改变实际幂等键、题集名称和业务规则。


## 网页 API 工作台

访问 `/admin/api`，按以下顺序操作：

1. 站长登录后生成 Token，或粘贴已有 Token，点击“验证并保存”。验证通过后写入当前浏览器的 Secure / HttpOnly / SameSite=Strict Cookie，不使用 localStorage 保存凭据。刷新会自动验证保存的连接。可以清除并更换 Token。
2. 点击“生成幂等键，开始本批”，系统生成随机批次编号，不允许手动修改。
3. 输入题目数组、完整 JSON 请求、Markdown JSON 代码块，或导入 JSON 文件，点击“预览题目”。可展开答案与完整内容，选择草稿、发布或训练/模拟/考试。
4. 点击“检查是否可入库”。服务端校验格式、发布条件、学科、批内和题库查重及题集名称。检查不写入业务数据、幂等记录或执行日志，也不预留名称；正式入库会重新校验。
5. 检查通过后点击“确认入库”。修改内容或设置后必须重新检查。入库成功显示返回值，并查询核对题集数量、ID 和顺序。

发送写请求前，系统把原始 Body 与幂等键保存到当前标签页的 sessionStorage；保存失败则不发送。提交后锁定内容。刷新当前标签页可恢复并“重试原请求”，不会换键重复创建。请求超时、网络故障、5xx 或响应不完整时，不允许开始新批次；重试确认结果后才能继续。关闭标签页或清除浏览器数据会失去这份本地恢复记录，请先完成结果核验。服务器的幂等记录仍保留。页面提供题集查询和最近 50 条日志。

`POST /api/admin/auto-question-token` 仅管理连接凭据：`{action:"generate"}` 要求有效站长会话，返回随机签名 Token 与 expiresAt，有效期 30 天；`{action:"save",token:"..."}` 验证成功后设置安全 Cookie；`{action:"forget"}` 清除 Cookie。所有操作必须来自本站 Origin。`GET` 返回 `{verified:boolean}`，不返回 Token。新 Token 使用服务端密钥签名，现有环境 Token 仍可使用；轮换服务端密钥会使已签发 Token 失效。生成结果只在当前页面内存中短暂显示，可在保存前复制，保存后清空。日志会遮盖新旧凭据。

唯一自动出题写入口仍为 `POST /api/admin/auto-questions`。相同入口加 `?check=1` 为只读预检，Body 与鉴权规则不变，成功返回 `{checked:true,count,status}`；已完成的相同请求返回 `alreadyCreated:true`。旧 Bearer Token 与站长会话调用保持兼容，普通编辑者会话不能调用；使用 Cookie 的 POST 必须来自本站 Origin。

后台“学科”中新增空学科删除入口。系统 Go/后端通用学科保留；有关联题目（含已删除题目的历史记录）或历史方案的学科不能删除。删除空学科时原子移除管理员学科授权，并撤销相关未使用邀请。数据库约束防止删除被引用的学科，以及并发请求向已删除学科写入题目或方案。
