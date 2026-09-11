# 题库扩展约定

questions.json 是题库注册入口，schemaVersion 为 1。新增语言只需在 tracks 增加稳定 id 与名称，题目引用 track；页面方向、章节和题数必须从注册数据计算。不要改变已有题目 id，以保留学习进度。

题目字段：id、track、category、section、title、blocks（type 为 text/code，text 保留原文）、sourceParagraph。可附加 skills:string[]、jobId:string、priority:1|2|3、source:string、languageVersion:string。

岗位专项通过 jobs 数组登记：id、company、role、requirements、skills、source、createdAt。实际新增题目使用 track='job:'+job.id；同一知识点可关联多个岗位，但应复用稳定题目 id，或明确作为独立专项题。不得在未提供招聘信息时生成虚构岗位题。新增内容应核对准确性并补充 glossary.ts 的关键词定义。当前岗位入口为空状态，真实题目添加后启用队列；不声称已支持自动生成。

学习与复习 API 对题目 id 验证，新增数据随站点重新发布后自动纳入。进度按用户和稳定 question id 保存。数据库与 UI 不依赖特定编程语言。
