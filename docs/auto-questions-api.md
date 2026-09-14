# 后台自动出题接口

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
