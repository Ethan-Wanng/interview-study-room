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
