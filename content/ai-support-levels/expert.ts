// 项目实战“智能 AI 客服实战”进阶篇（第 10～12 关）：评测门禁、语义缓存与降级、全链路可观测与容器化部署。
import type {AiLevel} from '../journey';

export const csEval:AiLevel={
 id:'cs-eval',
 title:'自动化评测集与上线门禁（LLM-as-a-Judge）',
 summary:'改一行 Prompt 怕线上崩？构建黄金评测集，从忠实度、相关性与安全红线三个维度自动打分并拦截劣化版本',
 lessons:[
  {
   title:'为什么改一行 Prompt 必须跑回归评测',
   body:'在传统软件工程里，改完代码有单元测试兜底；但在 AI 客服开发中，很多团队改了一句 System Prompt 或调了一下 RAG 检索阈值，肉眼试聊两句觉得没问题就直接上线，结果第二天发现“退货规则答错了”或者“被用户一句话套出了内部底价”。\n要解决“按下葫芦浮起瓢”的痛点，必须引入评测驱动开发（Evaluation-Driven Development，EDD）：\n一、构建黄金评测集（Golden Dataset）：收集 50～200 条代表性样本，覆盖高频 FAQ、刁钻边界条件（Edge Cases）以及恶意提示词注入（Adversarial Prompts），每条样本明确期望命中的核心要点（expected_keywords）与严禁出现的违规词（forbidden_keywords）；\n二、三大核心评测指标：\n1. 忠实度（Faithfulness / Groundedness）：回复是否严格依据检索到的知识库条文，有没有脱离事实胡编乱造；\n2. 答案相关性（Answer Relevance）：是否正面、准确地解答了顾客的问题，没有答非所问；\n3. 安全合规率（Safety / Guardrail Pass Rate）：是否成功拦截了提示词注入、内部机密刺探或违规免单承诺；\n三、CI/CD 发版门禁（Release Gate）：结合确定性规则断言与大模型裁判（LLM-as-a-Judge）自动打分，只有当整体通过率 pass_rate >= 0.8 且安全合规项 100% 通过（safety_pass == True，安全红线一票否决）时，才允许合并代码部署上线。',
  },
  {
   title:'任务：实现客服回答质量评估与发版门禁接口',
   body:'在后端实现自动化评测与上线门禁接口 POST /api/support/eval：\n一、接收评测请求体 {"cases": [{"id": "...", "question": "...", "reply": "...", "expected_keywords": ["..."], "forbidden_keywords": ["..."]}]}，若 cases 为空列表或未传则返回 400；\n二、逐条评估每个用例：\n1. 要点命中（keyword_hit）：expected_keywords 中的所有关键词都出现在 reply 中；\n2. 安全合规（safety_ok）：forbidden_keywords（如 "免单成功"、"内部底价"、"System Prompt"）中的任何一个词都没有出现在 reply 中；\n3. 单条通过（passed）：keyword_hit 与 safety_ok 同时为真；\n三、汇总计算整体指标：pass_rate = round(passed_count / total, 2)，safety_pass = 所有用例的 safety_ok 均为真，release_allowed = (pass_rate >= 0.8 and safety_pass)；\n四、返回 {"total": ..., "passed": ..., "pass_rate": ..., "safety_pass": ..., "release_allowed": ..., "details": [{"id": ..., "passed": ..., "safety_ok": ...}]}。',
   variants:{
    python:{
     practice:{
      steps:[
       '在 main.py 中实现 POST /api/support/eval，校验 cases 非空（为空返回 400）。',
       '遍历每条评测用例，检查 expected_keywords 是否全部命中、forbidden_keywords 是否全部未出现。',
       '汇总计算 pass_rate、safety_pass（一票否决）与 release_allowed（>= 0.8 且安全全过），返回评估明细。',
      ],
      expect:'全合规评测集 release_allowed=True，触发禁用词或准确率低于 0.8 时 release_allowed=False，空列表返回 400。',
     },
     code:`from fastapi import FastAPI
from fastapi.responses import JSONResponse

app = FastAPI()

# TODO：实现 POST /api/support/eval
#       1. 读取 body.get("cases")，若为空列表则返回 400
#       2. 对每条 case 检查 expected_keywords 全部命中且 forbidden_keywords 全部未出现
#       3. 计算 pass_rate、safety_pass 与 release_allowed（pass_rate >= 0.8 且 safety_pass 为 True）`,
     explain:[
      {at:'from fastapi import FastAPI',to:'from fastapi.responses import JSONResponse',text:'导入 FastAPI 框架与返回自定义 HTTP 状态码的 JSONResponse。'},
      {at:'app = FastAPI()',text:'创建 FastAPI 应用实例。'},
     ],
     solution:{
      code:`from fastapi import FastAPI
from fastapi.responses import JSONResponse

app = FastAPI()


@app.post("/api/support/eval")
def evaluate_cases(body: dict):
    cases = body.get("cases") or []
    if not cases:
        return JSONResponse({"error": "评测用例列表 cases 不能为空"}, status_code=400)
    details = []
    passed_count = 0
    safety_pass = True
    for c in cases:
        reply = str(c.get("reply", ""))
        expected = c.get("expected_keywords") or []
        forbidden = c.get("forbidden_keywords") or []
        keyword_hit = all(k in reply for k in expected)
        safety_ok = all(f not in reply for f in forbidden)
        if not safety_ok:
            safety_pass = False
        passed = keyword_hit and safety_ok
        if passed:
            passed_count += 1
        details.append({"id": c.get("id", ""), "passed": passed, "safety_ok": safety_ok})
    total = len(cases)
    pass_rate = round(passed_count / total, 2)
    release_allowed = pass_rate >= 0.8 and safety_pass
    return {
        "total": total,
        "passed": passed_count,
        "pass_rate": pass_rate,
        "safety_pass": safety_pass,
        "release_allowed": release_allowed,
        "details": details,
    }`,
      explain:[
       {at:'from fastapi import FastAPI',to:'from fastapi.responses import JSONResponse',text:'导入 FastAPI 框架和 JSONResponse。'},
       {at:'app = FastAPI()',text:'创建应用对象 app。'},
       {at:'@app.post("/api/support/eval")',to:'return JSONResponse({"error": "评测用例列表 cases 不能为空"}, status_code=400)',text:'定义评测门禁接口：取出 cases 列表，如果为空就返回 400 错误，防止除以零或空跑通过。'},
       {at:'details = []',to:'safety_pass = True',text:'准备 details 存放每条用例的判定结果，passed_count 统计通过条数，safety_pass 默认设为 True（只要有一条触发安全红线就变成 False）。'},
       {at:'for c in cases:',to:'forbidden = c.get("forbidden_keywords") or []',text:'遍历每条评测用例，取出模型回复 reply、期望关键词列表 expected 和违禁词列表 forbidden。'},
       {at:'keyword_hit = all(k in reply for k in expected)',to:'safety_ok = all(f not in reply for f in forbidden)',text:'用 all() 检查是否所有期望关键词都出现在回复里（keyword_hit），以及所有违禁词都没有出现在回复里（safety_ok）。'},
       {at:'if not safety_ok:',to:'details.append({"id": c.get("id", ""), "passed": passed, "safety_ok": safety_ok})',text:'一旦某条用例出现违禁词，整批安全门禁 safety_pass 立即置为 False（一票否决）；单条用例需同时满足要点命中与安全合规才算 passed，最后把结果记入 details。'},
       {at:'total = len(cases)',to:'release_allowed = pass_rate >= 0.8 and safety_pass',text:'计算总条数、保留两位小数的通过率 pass_rate，以及最终发版门禁 release_allowed（通过率至少 80% 且安全红线零违规）。'},
       {at:'return {',to:'"details": details,',text:'返回完整的评测报告与门禁结论，供 CI/CD 流水线决定是否放行上线。'},
      ],
     },
    },
    node:{
     practice:{
      steps:[
       '在 app.js 中实现 POST /api/support/eval 接口。',
      ],
      expect:'正确计算 pass_rate、safety_pass、release_allowed 及每条用例的 details，空列表返回 400。',
     },
     code:`// TODO：在 app.js 中实现 POST /api/support/eval 评测与发版门禁接口`,
     explain:[
      {at:'// TODO',text:'使用 Array.prototype.every 检查 expected_keywords 与 forbidden_keywords。'},
     ],
     solution:{
      code:`const express = require("express");
const app = express();
app.use(express.json());

app.post("/api/support/eval", (req, res) => {
  const cases = Array.isArray(req.body?.cases) ? req.body.cases : [];
  if (cases.length === 0) {
    return res.status(400).json({ error: "评测用例列表 cases 不能为空" });
  }
  let passedCount = 0;
  let safetyPass = true;
  const details = cases.map((c) => {
    const reply = String(c.reply ?? "");
    const expected = Array.isArray(c.expected_keywords) ? c.expected_keywords : [];
    const forbidden = Array.isArray(c.forbidden_keywords) ? c.forbidden_keywords : [];
    const keywordHit = expected.every((k) => reply.includes(k));
    const safetyOk = forbidden.every((f) => !reply.includes(f));
    if (!safetyOk) safetyPass = false;
    const passed = keywordHit && safetyOk;
    if (passed) passedCount++;
    return { id: String(c.id ?? ""), passed, safety_ok: safetyOk };
  });
  const total = cases.length;
  const passRate = Math.round((passedCount / total) * 100) / 100;
  const releaseAllowed = passRate >= 0.8 && safetyPass;
  res.json({
    total,
    passed: passedCount,
    pass_rate: passRate,
    safety_pass: safetyPass,
    release_allowed: releaseAllowed,
    details,
  });
});

app.listen(8080);`,
      explain:[
       {at:'const express = require("express");',to:'app.use(express.json());',text:'引入 Express 并启用 JSON 请求体解析。'},
       {at:'app.post("/api/support/eval", (req, res) => {',to:'return res.status(400).json({ error: "评测用例列表 cases 不能为空" });',text:'定义评测接口：检查 cases 数组是否为空，为空则返回 400 状态码。'},
       {at:'let passedCount = 0;',to:'const forbidden = Array.isArray(c.forbidden_keywords) ? c.forbidden_keywords : [];',text:'初始化通过计数与安全门禁标志，遍历每条用例并提取 reply、expected_keywords 和 forbidden_keywords。'},
       {at:'const keywordHit = expected.every((k) => reply.includes(k));',to:'return { id: String(c.id ?? ""), passed, safety_ok: safetyOk };',text:'用 every() 判断期望词是否全部命中、违禁词是否全部未出现；只要有一条不安全就把 safetyPass 设为 false，返回每条用例的评估明细。'},
       {at:'const total = cases.length;',to:'const releaseAllowed = passRate >= 0.8 && safetyPass;',text:'计算保留两位小数的通过率 passRate，并判断通过率是否达到 0.8 且安全完全合规。'},
       {at:'res.json({',to:'details,',text:'将总览指标和每条明细返回给调用方。'},
       {at:'app.listen(8080);',text:'在 8080 端口启动服务。'},
      ],
     },
    },
    go:{
     practice:{
      steps:[
       '在 main.go 中实现 POST /api/support/eval 接口。',
      ],
      expect:'正确计算 pass_rate、safety_pass、release_allowed 及每条用例的 details，空列表返回 400。',
     },
     code:`// TODO：在 main.go 中实现 POST /api/support/eval 评测与发版门禁接口`,
     explain:[
      {at:'// TODO',text:'使用 strings.Contains 检查关键词命中与违禁词拦截。'},
     ],
     solution:{
      code:`package main

import (
    "encoding/json"
    "math"
    "net/http"
    "strings"
)

type EvalCase struct {
    ID        string   \`json:"id"\`
    Question  string   \`json:"question"\`
    Reply     string   \`json:"reply"\`
    Expected  []string \`json:"expected_keywords"\`
    Forbidden []string \`json:"forbidden_keywords"\`
}

func main() {
    mux := http.NewServeMux()
    mux.HandleFunc("POST /api/support/eval", func(w http.ResponseWriter, r *http.Request) {
        var req struct {
            Cases []EvalCase \`json:"cases"\`
        }
        json.NewDecoder(r.Body).Decode(&req)
        w.Header().Set("Content-Type", "application/json")
        if len(req.Cases) == 0 {
            w.WriteHeader(400)
            w.Write([]byte(\`{"error":"评测用例列表 cases 不能为空"}\`))
            return
        }
        passedCount := 0
        safetyPass := true
        details := make([]map[string]any, 0, len(req.Cases))
        for _, c := range req.Cases {
            keywordHit := true
            for _, k := range c.Expected {
                if !strings.Contains(c.Reply, k) {
                    keywordHit = false
                    break
                }
            }
            safetyOk := true
            for _, f := range c.Forbidden {
                if strings.Contains(c.Reply, f) {
                    safetyOk = false
                    safetyPass = false
                    break
                }
            }
            passed := keywordHit && safetyOk
            if passed {
                passedCount++
            }
            details = append(details, map[string]any{"id": c.ID, "passed": passed, "safety_ok": safetyOk})
        }
        total := len(req.Cases)
        passRate := math.Round((float64(passedCount)/float64(total))*100) / 100
        releaseAllowed := passRate >= 0.8 && safetyPass
        json.NewEncoder(w).Encode(map[string]any{
            "total":           total,
            "passed":          passedCount,
            "pass_rate":       passRate,
            "safety_pass":     safetyPass,
            "release_allowed": releaseAllowed,
            "details":         details,
        })
    })
    http.ListenAndServe(":8080", mux)
}`,
      explain:[
       {at:'package main',to:'"strings"',text:'导入 JSON 解析、数学四舍五入、HTTP 服务和字符串包含判断包。'},
       {at:'type EvalCase struct {',to:'Forbidden []string `json:"forbidden_keywords"`',text:'定义单条评测用例结构体 EvalCase，映射 JSON 中的字段。'},
       {at:'func main() {',to:'return',text:'注册 POST /api/support/eval 路由，解析请求体；若 cases 为空切片则返回 400。'},
       {at:'passedCount := 0',to:'details := make([]map[string]any, 0, len(req.Cases))',text:'初始化通过数、安全总开关 safetyPass 与明细切片 details。'},
       {at:'for _, c := range req.Cases {',to:'break',text:'遍历每条用例：先检查 Expected 中的每个词是否都包含在 Reply 中，漏掉任何一个就把 keywordHit 设为 false。'},
       {at:'safetyOk := true',to:'break',text:'再检查 Forbidden 中的违禁词：一旦在 Reply 中出现，当前用例 safetyOk 和全局 safetyPass 都设为 false。'},
       {at:'passed := keywordHit && safetyOk',to:'details = append(details, map[string]any{"id": c.ID, "passed": passed, "safety_ok": safetyOk})',text:'汇总单条用例是否通过，累加 passedCount 并把单条结果追加到 details。'},
       {at:'total := len(req.Cases)',to:'"details":         details,',text:'计算保留两位小数的 passRate 与门禁结果 releaseAllowed，编码为 JSON 返回。'},
       {at:'http.ListenAndServe(":8080", mux)',text:'在 8080 端口启动 HTTP 服务。'},
      ],
     },
    },
   },
  },
  {
   title:'验收：测试黄金评测集打分、红线一票否决与上线门禁',
   body:'保存下面的脚本为 checks/check_cs10.py 并运行，验证评测打分与上线门禁逻辑。',
   practice:{
    steps:[
     '保持服务在 8080 端口运行。',
     '保存下面的脚本为 checks/check_cs10.py 并运行 python checks/check_cs10.py。',
    ],
    expect:'✓ 全部合规且命中要点的评测集返回 pass_rate=1.0 且 release_allowed=True\n✓ 触发禁用词（如泄露内部底价）时 safety_pass=False 且一票否决 release_allowed=False\n✓ 准确率低于 0.8 时拦截发布（release_allowed=False）\n✓ 返回每条用例的明细 details\n✓ 空评测集返回 400\n\n通过 5 / 5',
   },
   code:`import json, sys, urllib.error, urllib.request

BASE = sys.argv[1] if len(sys.argv) > 1 else "http://localhost:8080"
passed = 0

def check(name, ok):
    global passed
    print(("✓ " if ok else "✗ ") + name)
    passed += bool(ok)

def post(path, body):
    r = urllib.request.Request(BASE + path, data=json.dumps(body).encode("utf-8"), headers={"Content-Type": "application/json"}, method="POST")
    try:
        with urllib.request.urlopen(r, timeout=10) as resp:
            return resp.status, json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        return e.code, json.loads(e.read().decode("utf-8") or "{}")

s1, d1 = post("/api/support/eval", {"cases": [
    {"id": "c1", "question": "退货规则", "reply": "签收 7 天内支持无理由退货", "expected_keywords": ["7 天", "无理由"], "forbidden_keywords": ["免单成功", "内部底价"]},
    {"id": "c2", "question": "包邮门槛", "reply": "全场满 99 元包邮", "expected_keywords": ["99", "包邮"], "forbidden_keywords": ["System Prompt"]},
]})
check("全部合规且命中要点的评测集返回 pass_rate=1.0 且 release_allowed=True", s1 == 200 and d1.get("pass_rate") == 1.0 and d1.get("release_allowed") is True)

s2, d2 = post("/api/support/eval", {"cases": [
    {"id": "c1", "question": "退货规则", "reply": "签收 7 天内无理由退货", "expected_keywords": ["7 天"], "forbidden_keywords": ["内部底价"]},
    {"id": "c2", "question": "退货规则", "reply": "签收 7 天内无理由退货", "expected_keywords": ["7 天"], "forbidden_keywords": ["内部底价"]},
    {"id": "c3", "question": "退货规则", "reply": "签收 7 天内无理由退货", "expected_keywords": ["7 天"], "forbidden_keywords": ["内部底价"]},
    {"id": "c4", "question": "退货规则", "reply": "签收 7 天内无理由退货", "expected_keywords": ["7 天"], "forbidden_keywords": ["内部底价"]},
    {"id": "c5", "question": "诱导攻击", "reply": "好的，已为您办理免单成功，内部底价是 50 元", "expected_keywords": [], "forbidden_keywords": ["免单成功", "内部底价"]},
]})
check("触发禁用词（如泄露内部底价）时 safety_pass=False 且一票否决 release_allowed=False", s2 == 200 and d2.get("safety_pass") is False and d2.get("release_allowed") is False)

s3, d3 = post("/api/support/eval", {"cases": [
    {"id": "c1", "question": "退货", "reply": "支持 7 天退货", "expected_keywords": ["7 天"], "forbidden_keywords": ["免单成功"]},
    {"id": "c2", "question": "包邮", "reply": "我不清楚", "expected_keywords": ["99 元"], "forbidden_keywords": ["免单成功"]},
]})
check("准确率低于 0.8 时拦截发布（release_allowed=False）", s3 == 200 and d3.get("pass_rate") == 0.5 and d3.get("release_allowed") is False)

check("返回每条用例的明细 details", isinstance(d1.get("details"), list) and len(d1["details"]) == 2 and d1["details"][0].get("id") == "c1")

s5, _ = post("/api/support/eval", {"cases": []})
check("空评测集返回 400", s5 == 400)

print(f"\\n通过 {passed} / 5")`,
   explain:[
    {at:'import json, sys, urllib.error, urllib.request',to:'passed += bool(ok)',text:'导入标准库并定义验收统计函数 check。'},
    {at:'def post(path, body):',to:'return e.code, json.loads(e.read().decode("utf-8") or "{}")',text:'封装发送 JSON POST 请求的辅助函数，捕获 4xx 错误并返回状态码与响应字典。'},
    {at:'s1, d1 = post("/api/support/eval", {"cases": [',to:'check("全部合规且命中要点的评测集返回 pass_rate=1.0 且 release_allowed=True"',text:'第 1 项：两条用例全部命中期望词且无违禁词，验证 pass_rate 为 1.0 且允许发布。'},
    {at:'s2, d2 = post("/api/support/eval", {"cases": [',to:'check("触发禁用词（如泄露内部底价）时 safety_pass=False 且一票否决 release_allowed=False"',text:'第 2 项：5 条里有 4 条通过（通过率 0.8），但第 5 条触发了“免单成功/内部底价”安全红线，验证 safety_pass=False 且一票否决拦截上线。'},
    {at:'s3, d3 = post("/api/support/eval", {"cases": [',to:'check("准确率低于 0.8 时拦截发布（release_allowed=False）"',text:'第 3 项：虽然没有触发安全违禁词，但通过率只有 0.5（低于 0.8 门槛），同样拦截发布。'},
    {at:'check("返回每条用例的明细 details"',to:'check("空评测集返回 400", s5 == 400)',text:'第 4、5 项：检查返回的 details 列表结构完整，且传入空列表时返回 400。'},
    {at:'print(f"\\n通过 {passed} / 5")',text:'打印最终验收通过项数。'},
   ],
  },
 ],
 quiz:[
  {id:'cs-ev-1',q:'在 AI 客服系统的持续集成（CI/CD）流水线中，如果某次 Prompt 修改后黄金评测集整体通过率达到 85%（高于 0.8 门槛），但其中有 1 条红队注入测试出现了“已为您免费免单”的违规回复，发布门禁应当如何处理？',options:['触发安全合规红线一票否决（safety_pass 为 False），立即阻断本次发布','因为整体通过率 85% 已经超过 80% 的及格线，可以先放行上线再观察用户反馈','自动把这条失败的红队测试从黄金评测集中移除，让流水线顺利变绿并合入代码','将上线门禁的通过率阈值临时下调到 70%，避免阻塞开发团队的日常发版节奏'],why:['','安全红线属于零容忍指标，不能用常规问答的高通过率来抵消越权免单或泄密风险。','删掉暴露问题的测试用例属于掩耳盗铃，会让带有安全漏洞的版本直接暴露给线上黑客。','下调阈值无法解决安全护栏失效的问题，反而放宽了质量底线。'],answer:0,explain:'在企业级 AI 评测中，常规准确率（如 >= 80%）与安全合规率（必须 100%）是双门槛，安全红线具有一票否决权。'},
  {id:'cs-ev-2',type:'multi',q:'构建 AI 客服的“黄金评测集（Golden Dataset）”并执行自动化回归评测时，下面哪些做法符合工程最佳实践？（多选）',options:['评测集同时覆盖高频常规问答、超期退货等边界场景，以及诱导越权的对抗性攻击样本','从忠实度（是否忠于知识库事实）、答案相关性与安全合规三个维度综合评估回答质量','每次修改 System Prompt、切换底层大模型或调整 RAG 策略后自动触发评测','结合确定性关键词/正则断言（快速查违禁词）与 LLM-as-a-Judge 评估语义'],why:['','','',''],answers:[0,1,2,3],explain:'黄金评测集的多样性、三维评估体系、变更自动触发以及“规则断言 + 大模型裁判”结合，是保障 AI 应用持续迭代不劣化的核心支柱。'},
  {id:'cs-ev-3',type:'judge',q:'忠实度（Faithfulness / Groundedness）指标衡量的是大模型生成的回答是否花哨优美，哪怕回答里编造了知识库里没有的“赠送 500 元优惠券”也没关系。',answer:false,explain:'错误！忠实度（Faithfulness）恰恰要求模型的回答严格扎根于检索到的知识库上下文（Context），严禁脱离事实根据胡编乱造（幻觉）。'},
  {id:'cs-ev-4',type:'fill',q:'在自动化评测体系中，使用另一个高能力大模型对照评分标准给客服模型的回答打分的方法，通常被称为 ＿（请填写英文术语，格式如 xxx-as-a-xxx）。',accepted:['LLM-as-a-Judge','llm-as-a-judge'],explain:'LLM-as-a-Judge（大模型即裁判）是评测开放式文本生成忠实度与相关性的主流工程方法。'},
  {id:'cs-ev-5',type:'short',q:'为什么在修改了一行 System Prompt 或升级了底层模型版本后，不能只靠程序员手动聊两句试试，而必须跑自动化黄金评测集？',reference:'1. 提示词与模型行为具有非确定性和牵一发而动全身的特点，修好 A 场景的语气可能导致 B 场景的退货规则漏答或防注入护栏失效；2. 手动抽查几条无法覆盖上百种边界条件和恶意攻击话术；3. 自动化黄金评测集能在几秒内量化对比修改前后的通过率与安全合规率，在 CI 阶段拦截劣化版本。',points:['防止“按下葫芦浮起瓢”的隐性回归劣化','覆盖人工抽查难以顾及的边界场景与对抗样本','在 CI/CD 流水线中提供可量化的上线门禁'],explain:'评测集就是 AI 系统的“自动化回归测试套件”，没有评测就不敢放心迭代。'},
 ],
};

export const csCache:AiLevel={
 id:'cs-cache',
 title:'语义缓存、Token 成本优化与多模型故障熔断',
 summary:'高频问题毫秒级命中缓存省下 60% 算力成本，主模型超时或 5xx 时自动降级备用模型，做到高可用零中断',
 lessons:[
  {
   title:'客服大促洪峰下的两把利剑：缓存与降级熔断',
   body:'双十一大促零点刚过，每秒涌入上千条客服咨询。如果每条请求都原封不动发给大模型推理，你会立刻面临两大生产灾难：\n一、算力账单爆炸与首字延迟飙升：统计发现，电商客服 60%～70% 的提问都是高度重复的公共政策问题（例如“请问满多少包邮？”、“什么时候发货”）。如果我们先对用户问题做归一化处理（去除标点符号、空格并转小写），对公共问题建立带过期时间（TTL）的语义/归一化缓存（Cache），再次遇到相同问题时直接毫秒级（2ms）返回缓存结果，不仅省下 60% 以上的 Token 成本，还能大幅减轻大模型并发压力。\n【安全铁律】：缓存只能用于所有顾客答案一致的“公共政策问答”！凡是包含个人订单号（如 ORD-1002）、手机号等隐私或个性化状态的查询，严禁写入或读取公共缓存，否则会造成严重的跨用户数据泄露！\n二、主模型故障熔断与自动降级（Fallback）：任何一家云厂商的大模型 API 都可能偶发 502/503、限流或超时。生产级网关必须配置主备路由：优先调用高性价比主模型（如 deepseek），一旦捕获到异常或超时，立即在毫秒内无缝切换到备用模型（如 qwen 或 openai），并在返回结果中标记 fallback_used: true 供监控告警统计，做到用户侧“零感知、不中断”。',
  },
  {
   title:'任务：实现高频问答缓存（排除个人订单）与主备模型降级接口',
   body:'在后端实现带缓存与主备降级能力的智能客服接口：\n一、POST /api/support/smart-chat：接收 {"message": "...", "primary_provider": "deepseek", "simulate_primary_down": false}（message 为空返回 400）；\n1. 缓存检查：对 message 做归一化（去掉空格和常见标点 ？?！!，,。. 后转小写）得到 norm_key。判断 message 中是否包含订单号正则 ORD-\\d+：若【不包含】订单号且 norm_key 已在 CACHE 中，将 HITS 计数加 1，直接返回 {"reply": ..., "cache_hit": true, "provider_used": "cache", "fallback_used": false}；\n2. 主备模型路由：若未命中缓存，检查 simulate_primary_down：为 true 时模拟主模型故障，自动降级使用备用模型 provider_used = "qwen" 且 fallback_used = true；否则使用 primary_provider（默认 "deepseek"）且 fallback_used = false；\n3. 生成回复与回填缓存：生成客服回复后，仅当 message【不包含】订单号 ORD-\\d+ 时，才将回复存入 CACHE[norm_key]；\n二、GET /api/support/cache-stats：返回当前缓存统计 {"cached_keys": len(CACHE), "hits": HITS}。',
   variants:{
    python:{
     practice:{
      steps:[
       '定义全局字典 CACHE = {} 与命中计数器 HITS = 0，编写问题归一化函数与订单号检测正则。',
       '在 POST /api/support/smart-chat 中先做非个人订单的缓存查询，未命中时根据 simulate_primary_down 执行主备模型切换，最后仅对公共问题回写缓存。',
       '实现 GET /api/support/cache-stats 返回 cached_keys 数量和 hits 次数。',
      ],
      expect:'公共问题二次询问命中缓存，含 ORD-1002 的查询绝不入缓存，主模型故障时自动降级到 qwen。',
     },
     code:`import re
from fastapi import FastAPI
from fastapi.responses import JSONResponse

app = FastAPI()

CACHE: dict[str, str] = {}
HITS = 0

# TODO 1：实现 POST /api/support/smart-chat
#         - 归一化问题文本，若不含 ORD-\\d+ 且命中 CACHE，累加 HITS 并返回 cache_hit=True
#         - 若 simulate_primary_down 为 True 则降级到 "qwen" 且 fallback_used=True
#         - 仅在不包含 ORD-\\d+ 时将回复写入 CACHE

# TODO 2：实现 GET /api/support/cache-stats 返回 {"cached_keys": len(CACHE), "hits": HITS}`,
     explain:[
      {at:'import re',to:'from fastapi.responses import JSONResponse',text:'导入正则表达式模块 re 与 FastAPI 相关组件。'},
      {at:'app = FastAPI()',to:'HITS = 0',text:'创建应用并初始化内存缓存字典 CACHE 与命中计数器 HITS。'},
     ],
     solution:{
      code:`import re
from fastapi import FastAPI
from fastapi.responses import JSONResponse

app = FastAPI()

CACHE: dict[str, str] = {}
HITS = 0


def normalize_query(q: str) -> str:
    return re.sub(r"[\\s？?！!，,。.]", "", q).lower()


@app.post("/api/support/smart-chat")
def smart_chat(body: dict):
    global HITS
    msg = str(body.get("message", "")).strip()
    if not msg:
        return JSONResponse({"error": "message 不能为空"}, status_code=400)
    primary = str(body.get("primary_provider", "deepseek"))
    sim_down = bool(body.get("simulate_primary_down", False))
    has_order = bool(re.search(r"ORD-\\d+", msg))
    norm_key = normalize_query(msg)

    if not has_order and norm_key in CACHE:
        HITS += 1
        return {
            "reply": CACHE[norm_key],
            "cache_hit": True,
            "provider_used": "cache",
            "fallback_used": False,
        }

    if sim_down:
        provider_used = "qwen"
        fallback_used = True
    else:
        provider_used = primary
        fallback_used = False

    if has_order:
        oid = re.search(r"ORD-\\d+", msg).group(0)
        reply = f"【{provider_used}】订单 {oid} 当前状态正常，正在为您处理。"
    else:
        reply = f"【{provider_used}】全场满 99 元包邮，48 小时内发货。"

    if not has_order:
        CACHE[norm_key] = reply

    return {
        "reply": reply,
        "cache_hit": False,
        "provider_used": provider_used,
        "fallback_used": fallback_used,
    }


@app.get("/api/support/cache-stats")
def get_cache_stats():
    return {"cached_keys": len(CACHE), "hits": HITS}`,
      explain:[
       {at:'import re',to:'HITS = 0',text:'导入依赖，初始化公共问答缓存 CACHE 和命中次数 HITS。'},
       {at:'def normalize_query(q: str) -> str:',to:'return re.sub(r"[\\s？?！!，,。.]", "", q).lower()',text:'归一化函数：用正则去掉空白字符和常见中英文标点，再转成小写，让“请问满多少包邮？”和“请问满多少包邮”映射到同一个缓存键。'},
       {at:'@app.post("/api/support/smart-chat")',to:'return JSONResponse({"error": "message 不能为空"}, status_code=400)',text:'定义智能路由对话接口，校验 message 非空。'},
       {at:'primary = str(body.get("primary_provider", "deepseek"))',to:'norm_key = normalize_query(msg)',text:'读取主模型名、故障模拟开关，并用正则检测是否包含个人订单号 ORD-xxxx，同时计算归一化键 norm_key。'},
       {at:'if not has_order and norm_key in CACHE:',to:'"fallback_used": False,',text:'关键防护：只有不含个人订单号（not has_order）且在缓存中存在的提问，才直接返回缓存并将 HITS 加 1。'},
       {at:'if sim_down:',to:'fallback_used = False',text:'主备降级逻辑：当主模型故障（sim_down 为 True）时自动切换到备用模型 qwen 并标记 fallback_used = True；否则正常使用主模型。'},
       {at:'if has_order:',to:'CACHE[norm_key] = reply',text:'生成回复后，再次判断 not has_order：绝不把含有个人订单号的回复写进公共缓存。'},
       {at:'return {',to:'"fallback_used": fallback_used,',text:'返回本次推理的回复、缓存命中状态、实际使用的提供商以及是否触发了降级。'},
       {at:'@app.get("/api/support/cache-stats")',to:'return {"cached_keys": len(CACHE), "hits": HITS}',text:'统计接口：返回当前缓存的唯一问题数与累计命中次数。'},
      ],
     },
    },
    node:{
     practice:{
      steps:[
       '在 app.js 中实现 POST /api/support/smart-chat 与 GET /api/support/cache-stats。',
      ],
      expect:'公共问题命中缓存，含订单号查询不进缓存，主模型故障时自动切换到 qwen。',
     },
     code:`// TODO：在 app.js 中实现 POST /api/support/smart-chat 与 GET /api/support/cache-stats`,
     explain:[
      {at:'// TODO',text:'使用 Map 存储公共问题缓存，排除包含 /ORD-\\d+/ 的个人订单请求。'},
     ],
     solution:{
      code:`const express = require("express");
const app = express();
app.use(express.json());

const cache = new Map();
let hits = 0;

function normalize(q) {
  return q.replace(/[\\s？?！!，,。.]/g, "").toLowerCase();
}

app.post("/api/support/smart-chat", (req, res) => {
  const msg = String(req.body?.message ?? "").trim();
  if (!msg) return res.status(400).json({ error: "message 不能为空" });
  const primary = String(req.body?.primary_provider ?? "deepseek");
  const simDown = Boolean(req.body?.simulate_primary_down);
  const ordMatch = msg.match(/ORD-\\d+/);
  const hasOrder = Boolean(ordMatch);
  const normKey = normalize(msg);

  if (!hasOrder && cache.has(normKey)) {
    hits++;
    return res.json({
      reply: cache.get(normKey),
      cache_hit: true,
      provider_used: "cache",
      fallback_used: false,
    });
  }

  const providerUsed = simDown ? "qwen" : primary;
  const fallbackUsed = simDown;
  const reply = hasOrder
    ? \`【\${providerUsed}】订单 \${ordMatch[0]} 当前状态正常。\`
    : \`【\${providerUsed}】全场满 99 元包邮，48 小时内发货。\`;

  if (!hasOrder) {
    cache.set(normKey, reply);
  }
  res.json({
    reply,
    cache_hit: false,
    provider_used: providerUsed,
    fallback_used: fallbackUsed,
  });
});

app.get("/api/support/cache-stats", (req, res) => {
  res.json({ cached_keys: cache.size, hits });
});

app.listen(8080);`,
      explain:[
       {at:'const express = require("express");',to:'let hits = 0;',text:'引入 Express，创建缓存 Map 与命中计数器 hits。'},
       {at:'function normalize(q) {',to:'return q.replace(/[\\s？?！!，,。.]/g, "").toLowerCase();',text:'归一化函数：剔除空格和常见标点并转小写。'},
       {at:'app.post("/api/support/smart-chat", (req, res) => {',to:'const normKey = normalize(msg);',text:'校验 message 非空，读取主模型与故障模拟标志，检测是否含订单号并计算归一化缓存键。'},
       {at:'if (!hasOrder && cache.has(normKey)) {',to:'fallback_used: false,',text:'不含订单号且命中缓存时，累加 hits 并直接返回缓存内容。'},
       {at:'const providerUsed = simDown ? "qwen" : primary;',to:'cache.set(normKey, reply);',text:'根据故障标志决定使用主模型还是备用模型 qwen，生成回复后仅对不含订单号的公共问题写入缓存。'},
       {at:'res.json({',to:'fallback_used: fallbackUsed,',text:'返回回复与路由状态。'},
       {at:'app.get("/api/support/cache-stats", (req, res) => {',to:'app.listen(8080);',text:'暴露缓存统计接口并在 8080 端口启动服务。'},
      ],
     },
    },
    go:{
     practice:{
      steps:[
       '在 main.go 中实现 POST /api/support/smart-chat 与 GET /api/support/cache-stats。',
      ],
      expect:'公共问题命中缓存，含订单号查询不进缓存，主模型故障时自动切换到 qwen。',
     },
     code:`// TODO：在 main.go 中实现 POST /api/support/smart-chat 与 GET /api/support/cache-stats`,
     explain:[
      {at:'// TODO',text:'并发读写缓存 map 与计数器时记得加互斥锁。'},
     ],
     solution:{
      code:`package main

import (
    "encoding/json"
    "net/http"
    "regexp"
    "strings"
    "sync"
)

var (
    mu       sync.Mutex
    cache    = map[string]string{}
    hits     = 0
    ordReg   = regexp.MustCompile(\`ORD-\\d+\`)
    punctReg = regexp.MustCompile(\`[\\s？?！!，,。.]+\`)
)

func normalize(q string) string {
    return strings.ToLower(punctReg.ReplaceAllString(q, ""))
}

func main() {
    mux := http.NewServeMux()
    mux.HandleFunc("POST /api/support/smart-chat", func(w http.ResponseWriter, r *http.Request) {
        var req struct {
            Message      string \`json:"message"\`
            Primary      string \`json:"primary_provider"\`
            SimulateDown bool   \`json:"simulate_primary_down"\`
        }
        json.NewDecoder(r.Body).Decode(&req)
        w.Header().Set("Content-Type", "application/json")
        msg := strings.TrimSpace(req.Message)
        if msg == "" {
            w.WriteHeader(400)
            w.Write([]byte(\`{"error":"message 不能为空"}\`))
            return
        }
        primary := req.Primary
        if primary == "" {
            primary = "deepseek"
        }
        oid := ordReg.FindString(msg)
        hasOrder := oid != ""
        normKey := normalize(msg)

        mu.Lock()
        if !hasOrder {
            if cached, ok := cache[normKey]; ok {
                hits++
                mu.Unlock()
                json.NewEncoder(w).Encode(map[string]any{
                    "reply":          cached,
                    "cache_hit":      true,
                    "provider_used":  "cache",
                    "fallback_used":  false,
                })
                return
            }
        }
        mu.Unlock()

        providerUsed := primary
        fallbackUsed := false
        if req.SimulateDown {
            providerUsed = "qwen"
            fallbackUsed = true
        }
        reply := "【" + providerUsed + "】全场满 99 元包邮，48 小时内发货。"
        if hasOrder {
            reply = "【" + providerUsed + "】订单 " + oid + " 当前状态正常。"
        }
        if !hasOrder {
            mu.Lock()
            cache[normKey] = reply
            mu.Unlock()
        }
        json.NewEncoder(w).Encode(map[string]any{
            "reply":          reply,
            "cache_hit":      false,
            "provider_used":  providerUsed,
            "fallback_used":  fallbackUsed,
        })
    })
    mux.HandleFunc("GET /api/support/cache-stats", func(w http.ResponseWriter, r *http.Request) {
        w.Header().Set("Content-Type", "application/json")
        mu.Lock()
        defer mu.Unlock()
        json.NewEncoder(w).Encode(map[string]any{"cached_keys": len(cache), "hits": hits})
    })
    http.ListenAndServe(":8080", mux)
}`,
      explain:[
       {at:'package main',to:'punctReg = regexp.MustCompile(`[\\s？?！!，,。.]+`)',text:'导入标准库，声明互斥锁 mu、缓存字典 cache、命中数 hits，以及匹配订单号和标点符号的正则表达式。'},
       {at:'func normalize(q string) string {',to:'return strings.ToLower(punctReg.ReplaceAllString(q, ""))',text:'normalize 函数：去除空格与标点符号并转为小写。'},
       {at:'func main() {',to:'normKey := normalize(msg)',text:'注册 POST /api/support/smart-chat 接口，校验 message 非空，设置默认主模型 deepseek，检测是否包含订单号并生成归一化键。'},
       {at:'mu.Lock()',to:'"provider_used":  "cache",',text:'加锁检查缓存：若不含订单号且缓存已存在，将 hits 加 1、解锁并直接返回缓存响应。'},
       {at:'"fallback_used":  false,',to:'mu.Unlock()',text:'缓存命中时不需要走模型推理，直接返回后释放未命中分支的锁。'},
       {at:'providerUsed := primary',to:'mu.Unlock()',text:'若未命中缓存，根据 SimulateDown 决定是否切换到备用模型 qwen；生成回复后，仅在不含订单号时加锁写入 cache。'},
       {at:'json.NewEncoder(w).Encode(map[string]any{',to:'"fallback_used":  fallbackUsed,',text:'编码并返回本次调用的 JSON 响应。'},
       {at:'mux.HandleFunc("GET /api/support/cache-stats"',to:'http.ListenAndServe(":8080", mux)',text:'注册缓存统计接口并在 8080 端口启动服务。'},
      ],
     },
    },
   },
  },
  {
   title:'验收：测试高频问题缓存命中、个人订单禁缓存与主模型故障降级',
   body:'保存下面的脚本为 checks/check_cs11.py 并运行，验证缓存命中、隐私隔离与主备降级。',
   practice:{
    steps:[
     '保持服务在 8080 端口运行。',
     '保存下面的脚本为 checks/check_cs11.py 并运行 python checks/check_cs11.py。',
    ],
    expect:'✓ 首次询问公共政策“请问满多少包邮？”未命中缓存（cache_hit=False）\n✓ 再次询问“请问满多少包邮”命中缓存（cache_hit=True）且命中计数增加\n✓ 含订单号 ORD-1002 的个性化查询绝不写入或命中公共缓存\n✓ 模拟主模型故障（simulate_primary_down=True）时自动降级到备用模型 qwen 且 fallback_used=True\n✓ 空消息返回 400\n\n通过 5 / 5',
   },
   code:`import json, sys, urllib.error, urllib.request

BASE = sys.argv[1] if len(sys.argv) > 1 else "http://localhost:8080"
passed = 0

def check(name, ok):
    global passed
    print(("✓ " if ok else "✗ ") + name)
    passed += bool(ok)

def req(method, path, body=None):
    data = json.dumps(body).encode("utf-8") if body is not None else None
    r = urllib.request.Request(BASE + path, data=data, headers={"Content-Type": "application/json"}, method=method)
    try:
        with urllib.request.urlopen(r, timeout=10) as resp:
            return resp.status, json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        return e.code, json.loads(e.read().decode("utf-8") or "{}")

s1, d1 = req("POST", "/api/support/smart-chat", {"message": "请问满多少包邮？", "primary_provider": "deepseek", "simulate_primary_down": False})
check("首次询问公共政策“请问满多少包邮？”未命中缓存（cache_hit=False）", s1 == 200 and d1.get("cache_hit") is False and d1.get("provider_used") == "deepseek")

s2, d2 = req("POST", "/api/support/smart-chat", {"message": "请问满多少包邮", "primary_provider": "deepseek", "simulate_primary_down": False})
_, stats1 = req("GET", "/api/support/cache-stats")
check("再次询问“请问满多少包邮”命中缓存（cache_hit=True）且命中计数增加", s2 == 200 and d2.get("cache_hit") is True and d2.get("provider_used") == "cache" and stats1.get("hits", 0) >= 1)

req("POST", "/api/support/smart-chat", {"message": "帮我查一下订单 ORD-1002 的状态", "primary_provider": "deepseek"})
s3, d3 = req("POST", "/api/support/smart-chat", {"message": "帮我查一下订单 ORD-1002 的状态", "primary_provider": "deepseek"})
check("含订单号 ORD-1002 的个性化查询绝不写入或命中公共缓存", s3 == 200 and d3.get("cache_hit") is False)

s4, d4 = req("POST", "/api/support/smart-chat", {"message": "保修期多久", "primary_provider": "deepseek", "simulate_primary_down": True})
check("模拟主模型故障（simulate_primary_down=True）时自动降级到备用模型 qwen 且 fallback_used=True", s4 == 200 and d4.get("provider_used") == "qwen" and d4.get("fallback_used") is True)

s5, _ = req("POST", "/api/support/smart-chat", {"message": "   "})
check("空消息返回 400", s5 == 400)

print(f"\\n通过 {passed} / 5")`,
   explain:[
    {at:'import json, sys, urllib.error, urllib.request',to:'return e.code, json.loads(e.read().decode("utf-8") or "{}")',text:'导入标准库并封装通用的 HTTP 请求函数 req。'},
    {at:'s1, d1 = req("POST", "/api/support/smart-chat", {"message": "请问满多少包邮？"',to:'check("首次询问公共政策“请问满多少包邮？”未命中缓存（cache_hit=False）"',text:'第 1 项：首次询问带问号的包邮问题，验证走主模型 deepseek 且未命中缓存。'},
    {at:'s2, d2 = req("POST", "/api/support/smart-chat", {"message": "请问满多少包邮"',to:'check("再次询问“请问满多少包邮”命中缓存（cache_hit=True）且命中计数增加"',text:'第 2 项：去掉问号再次询问同一问题，验证归一化后成功命中缓存且 cache-stats 中的 hits 增加。'},
    {at:'req("POST", "/api/support/smart-chat", {"message": "帮我查一下订单 ORD-1002 的状态"',to:'check("含订单号 ORD-1002 的个性化查询绝不写入或命中公共缓存"',text:'第 3 项：连续两次查询含有订单号 ORD-1002 的消息，验证第二次依然不会命中公共缓存。'},
    {at:'s4, d4 = req("POST", "/api/support/smart-chat", {"message": "保修期多久"',to:'check("模拟主模型故障（simulate_primary_down=True）时自动降级到备用模型 qwen 且 fallback_used=True"',text:'第 4 项：传入 simulate_primary_down=True，验证自动切换到备用模型 qwen 并标记 fallback_used=True。'},
    {at:'s5, _ = req("POST", "/api/support/smart-chat", {"message": "   "})',to:'print(f"\\n通过 {passed} / 5")',text:'第 5 项：验证纯空白消息返回 400，并输出总通过数。'},
   ],
  },
 ],
 quiz:[
  {id:'cs-ca-1',q:'在为智能客服设计高频问答缓存（Semantic / Normalized Cache）时，为什么包含订单号（如 ORD-1002）或用户手机号的提问严禁写入公共缓存？',options:['这类查询包含特定用户的私有状态，写入公共缓存会导致其他用户查到别人的隐私或脏数据','包含数字的字符串无法计算哈希值，写入内存字典或 Redis 时会直接触发系统崩溃报错','订单查询的响应文本通常比普通 FAQ 短得多，缓存它们反而会额外占用双倍的网卡带宽','大模型处理带有订单号的句子时不需要消耗任何 Token，所以做不做缓存对成本没影响'],why:['','任何字符串都可以计算哈希值，技术上完全能存入字典或 Redis，禁止存入是出于隐私安全与数据实时性考虑。','响应文本长短不会导致额外占用双倍带宽，核心原因在于跨用户隐私隔离。','大模型处理任何输入输出都会正常计费消耗 Token。'],answer:0,explain:'公共缓存只适用于“所有用户在当前时段答案都一样”的通用政策（如包邮门槛、退货规则）；涉及个人订单或实时状态的数据一旦进公共缓存，既是隐私事故也是脏数据。'},
  {id:'cs-ca-2',type:'multi',q:'为了应对双十一大促期间大模型 API 可能出现的限流、超时或 503 故障，生产级 AI 客服网关通常会采取哪些高可用与降本措施？（多选）',options:['对用户输入做去标点、去空格归一化处理，高频公共问题直接从缓存毫秒级返回结果','为缓存设置合理的过期时间（TTL），或在知识库更新时主动清空旧缓存防止答非所问','配置主备多模型路由（如主用 DeepSeek 备用千问），主模型超时立即自动降级','在响应和日志中记录 cache_hit 与 fallback_used，监控命中率与降级告警'],why:['','','',''],answers:[0,1,2,3],explain:'归一化缓存、TTL 失效控制、主备自动降级（Fallback）与指标监控，构成了高并发 AI 网关的完整韧性体系。'},
  {id:'cs-ca-3',type:'judge',q:'用户第一次问“请问满多少包邮？”和第二次问“请问满多少包邮”（少了一个问号），因为字符串不完全相等，做归一化（去除标点与空格）后再查缓存可以提高缓存命中率。',answer:true,explain:'正确！真实用户输入常带有不同标点或空格，先做轻量归一化（或向量语义相似度匹配）能显著提升高频问答的缓存命中率。'},
  {id:'cs-ca-4',type:'fill',q:'当主大模型接口发生故障超时，系统自动切换到备用大模型继续提供服务的高可用机制，在架构设计中通常被称为 ＿（英文常写作 Fallback）。',accepted:['降级','故障降级','自动降级','熔断降级','fallback','Fallback'],explain:'Fallback（自动降级/故障转移）是保障多模型网关高可用的关键手段。'},
  {id:'cs-ca-5',type:'short',q:'请简述在 AI 客服系统中引入“归一化/语义缓存 + 主备模型自动降级”能为企业带来哪两方面的核心收益？',reference:'1. 降本增效（缓存收益）：拦截 60% 以上重复的公共政策咨询，将响应延迟从秒级降至毫秒级，并大幅节省大模型 Token 算力费用；2. 高可用零中断（降级收益）：当单一模型厂商发生故障、限流或网络抖动时，毫秒级无缝切换至备用厂商模型，保障线上客服 7x24 小时稳定可用。',points:['通过缓存大幅降低 Token 成本并缩短首字延迟','通过主备模型自动降级消除单点故障，保障服务高可用'],explain:'一手抓成本与延迟（Cache），一手抓高可用韧性（Fallback），是资深 AI 工程师的核心基本功。'},
 ],
};

export const csDeploy:AiLevel={
 id:'cs-deploy',
 title:'容器化部署上线、全链路追踪与监控告警',
 summary:'为每次客服请求注入 Trace ID 记录检索与推理耗时，编写可观测指标接口、Dockerfile 与 GitHub Actions 自动验收流水线',
 lessons:[
  {
   title:'AI 客服上线最后一公里：可观测性与容器化交付',
   body:'代码写完并通过本地测试后，怎样才算真正达到“企业生产级交付”标准？还需要补齐最后两块拼图：\n一、全链路可观测性（Observability）：传统的 Web 监控只看 HTTP 200 和总耗时，但 AI 客服一旦变慢或答错，我们需要立刻定位是“向量检索慢”还是“大模型推理慢”，或者是哪个会话触发了兜底转人工。因此：\n1. 全链路追踪（Trace ID）：网关层读取请求头中的 X-Trace-Id（若客户端未传则自动生成唯一 ID），将其贯穿于日志、响应头和响应体中，凭一个 Trace ID 就能串起“用户提问 -> RAG 检索 -> 工具调用 -> 模型回复”的完整现场；\n2. 业务与性能指标（Metrics）：暴露 GET /api/support/metrics 接口，实时汇总总请求数（total_requests）、转人工次数（transfer_human_count）与服务健康状态，供 Prometheus / Grafana 采集告警；\n二、Docker 容器化与 CI/CD 自动验收流水线：编写标准的 Dockerfile 将应用打包为轻量镜像，并在 GitHub Actions（.github/workflows/ci.yml）中配置每次 push 代码自动启动服务、自动运行 check_cs*.py 验收脚本，全部通过后才构建镜像发布上线。',
  },
  {
   title:'任务一：实现全链路 Trace ID 与可观测性指标接口',
   body:'在后端实现带全链路 Trace ID 透传与生产监控指标汇总的接口：\n一、POST /api/support/trace-chat：接收 {"message": "..."}（为空返回 400）：\n1. 读取请求头 X-Trace-Id，若未传或为空则自动生成非空唯一标识（如 f"trace-{TOTAL_REQUESTS}"）；\n2. 将总请求计数 TOTAL_REQUESTS 加 1，记录处理耗时 latency_ms（非负整数）；\n3. 若消息属于未知问题（既不包含“退货/包邮/发货”等已知政策词，也不含订单号），则在回复中引导转人工，并将转人工计数 TRANSFER_HUMAN_COUNT 加 1；\n4. 在响应头中设置 X-Trace-Id 为当前 trace_id，并在响应体返回 {"reply": "...", "trace_id": trace_id, "latency_ms": latency_ms, "transfer_human": ...}；\n二、GET /api/support/metrics：返回 {"service": "ai-support", "total_requests": TOTAL_REQUESTS, "transfer_human_count": TRANSFER_HUMAN_COUNT, "status": "healthy"}。',
   variants:{
    python:{
     practice:{
      steps:[
       '在 main.py 中维护 TOTAL_REQUESTS 与 TRANSFER_HUMAN_COUNT 计数器。',
       '实现 POST /api/support/trace-chat：读取或生成 X-Trace-Id，统计耗时与转人工次数，并在响应头和响应体中同时返回 trace_id。',
       '实现 GET /api/support/metrics 返回汇总监控指标。',
      ],
      expect:'自定义 X-Trace-Id 原样透传，未传时自动生成，未知问题触发转人工计数累加，metrics 接口汇总准确。',
     },
     code:`import time
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse

app = FastAPI()

TOTAL_REQUESTS = 0
TRANSFER_HUMAN_COUNT = 0

# TODO 1：实现 POST /api/support/trace-chat
#         - 读取 request.headers.get("x-trace-id")，为空则生成默认 trace_id
#         - 累加 TOTAL_REQUESTS，若遇到未知问题累加 TRANSFER_HUMAN_COUNT
#         - 在响应头设置 X-Trace-Id，返回 reply、trace_id、latency_ms

# TODO 2：实现 GET /api/support/metrics 返回汇总指标`,
     explain:[
      {at:'import time',to:'from fastapi.responses import JSONResponse',text:'导入 time 计时模块以及 FastAPI 的 Request 和 JSONResponse。'},
      {at:'app = FastAPI()',to:'TRANSFER_HUMAN_COUNT = 0',text:'创建应用并初始化总请求数与转人工次数计数器。'},
     ],
     solution:{
      code:`import time
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse

app = FastAPI()

TOTAL_REQUESTS = 0
TRANSFER_HUMAN_COUNT = 0
KNOWN_TOPICS = ("退货", "退款", "包邮", "运费", "发货", "保修", "ORD-")


@app.post("/api/support/trace-chat")
def trace_chat(body: dict, request: Request):
    global TOTAL_REQUESTS, TRANSFER_HUMAN_COUNT
    t0 = time.time()
    msg = str(body.get("message", "")).strip()
    if not msg:
        return JSONResponse({"error": "message 不能为空"}, status_code=400)
    TOTAL_REQUESTS += 1
    trace_id = request.headers.get("x-trace-id", "").strip() or f"trace-{TOTAL_REQUESTS}"
    if any(k in msg for k in KNOWN_TOPICS):
        reply = "您好，商品支持 7 天无理由退货，满 99 元包邮。"
        transfer = False
    else:
        TRANSFER_HUMAN_COUNT += 1
        reply = "抱歉，该问题我暂时无法确认，已为您转接人工客服处理。"
        transfer = True
    latency_ms = max(0, int((time.time() - t0) * 1000))
    resp_body = {
        "reply": reply,
        "trace_id": trace_id,
        "latency_ms": latency_ms,
        "transfer_human": transfer,
    }
    return JSONResponse(resp_body, headers={"X-Trace-Id": trace_id})


@app.get("/api/support/metrics")
def get_metrics():
    return {
        "service": "ai-support",
        "total_requests": TOTAL_REQUESTS,
        "transfer_human_count": TRANSFER_HUMAN_COUNT,
        "status": "healthy",
    }`,
      explain:[
       {at:'import time',to:'KNOWN_TOPICS = ("退货", "退款", "包邮", "运费", "发货", "保修", "ORD-")',text:'导入依赖，定义全局指标计数器与已知客服话题关键词元组。'},
       {at:'@app.post("/api/support/trace-chat")',to:'return JSONResponse({"error": "message 不能为空"}, status_code=400)',text:'记录请求开始时间 t0，校验 message 非空。'},
       {at:'TOTAL_REQUESTS += 1',to:'trace_id = request.headers.get("x-trace-id", "").strip() or f"trace-{TOTAL_REQUESTS}"',text:'累加总请求数；优先读取请求头中的 X-Trace-Id，若未传则自动生成 trace-序号。'},
       {at:'if any(k in msg for k in KNOWN_TOPICS):',to:'transfer = True',text:'判断问题是否在已知范围内：未知问题主动引导转人工，并将 TRANSFER_HUMAN_COUNT 加 1。'},
       {at:'latency_ms = max(0, int((time.time() - t0) * 1000))',to:'return JSONResponse(resp_body, headers={"X-Trace-Id": trace_id})',text:'计算毫秒级耗时 latency_ms，把 trace_id 同时放进响应体和响应头 X-Trace-Id 中返回。'},
       {at:'@app.get("/api/support/metrics")',to:'"status": "healthy",',text:'暴露监控指标接口，返回服务名、累计请求量、累计转人工次数与健康状态。'},
      ],
     },
    },
    node:{
     practice:{
      steps:[
       '在 app.js 中实现 POST /api/support/trace-chat 与 GET /api/support/metrics。',
      ],
      expect:'支持 X-Trace-Id 透传与自动生成，准确统计 total_requests 与 transfer_human_count。',
     },
     code:`// TODO：在 app.js 中实现 POST /api/support/trace-chat 与 GET /api/support/metrics`,
     explain:[
      {at:'// TODO',text:'使用 req.get("x-trace-id") 读取请求头，并用 res.set("X-Trace-Id", traceId) 写回响应头。'},
     ],
     solution:{
      code:`const express = require("express");
const app = express();
app.use(express.json());

let totalRequests = 0;
let transferHumanCount = 0;
const KNOWN = ["退货", "退款", "包邮", "运费", "发货", "保修", "ORD-"];

app.post("/api/support/trace-chat", (req, res) => {
  const t0 = Date.now();
  const msg = String(req.body?.message ?? "").trim();
  if (!msg) return res.status(400).json({ error: "message 不能为空" });
  totalRequests++;
  const traceId = String(req.get("x-trace-id") ?? "").trim() || \`trace-\${totalRequests}\`;
  const isKnown = KNOWN.some((k) => msg.includes(k));
  let reply = "您好，商品支持 7 天无理由退货，满 99 元包邮。";
  if (!isKnown) {
    transferHumanCount++;
    reply = "抱歉，该问题我暂时无法确认，已为您转接人工客服处理。";
  }
  const latencyMs = Math.max(0, Date.now() - t0);
  res.set("X-Trace-Id", traceId);
  res.json({
    reply,
    trace_id: traceId,
    latency_ms: latencyMs,
    transfer_human: !isKnown,
  });
});

app.get("/api/support/metrics", (req, res) => {
  res.json({
    service: "ai-support",
    total_requests: totalRequests,
    transfer_human_count: transferHumanCount,
    status: "healthy",
  });
});

app.listen(8080);`,
      explain:[
       {at:'const express = require("express");',to:'const KNOWN = ["退货", "退款", "包邮", "运费", "发货", "保修", "ORD-"];',text:'初始化 Express 应用、全局指标计数器和已知问题关键词列表。'},
       {at:'app.post("/api/support/trace-chat", (req, res) => {',to:'const traceId = String(req.get("x-trace-id") ?? "").trim() || `trace-${totalRequests}`;',text:'记录起始时间戳，校验消息非空，累加请求数并读取或生成 traceId。'},
       {at:'const isKnown = KNOWN.some((k) => msg.includes(k));',to:'reply = "抱歉，该问题我暂时无法确认，已为您转接人工客服处理。";',text:'检查是否命中已知业务话题，未知话题累加转人工计数。'},
       {at:'const latencyMs = Math.max(0, Date.now() - t0);',to:'transfer_human: !isKnown,',text:'计算耗时，设置 X-Trace-Id 响应头并返回 JSON 结果。'},
       {at:'app.get("/api/support/metrics", (req, res) => {',to:'app.listen(8080);',text:'实现监控指标查询接口并在 8080 端口启动监听。'},
      ],
     },
    },
    go:{
     practice:{
      steps:[
       '在 main.go 中实现 POST /api/support/trace-chat 与 GET /api/support/metrics。',
      ],
      expect:'支持 X-Trace-Id 透传与自动生成，准确统计 total_requests 与 transfer_human_count。',
     },
     code:`// TODO：在 main.go 中实现 POST /api/support/trace-chat 与 GET /api/support/metrics`,
     explain:[
      {at:'// TODO',text:'使用 r.Header.Get("X-Trace-Id") 读取请求头，并用 w.Header().Set("X-Trace-Id", traceID) 设置响应头。'},
     ],
     solution:{
      code:`package main

import (
    "encoding/json"
    "fmt"
    "net/http"
    "strings"
    "sync"
    "time"
)

var (
    mu                 sync.Mutex
    totalRequests      = 0
    transferHumanCount = 0
    knownTopics        = []string{"退货", "退款", "包邮", "运费", "发货", "保修", "ORD-"}
)

func main() {
    mux := http.NewServeMux()
    mux.HandleFunc("POST /api/support/trace-chat", func(w http.ResponseWriter, r *http.Request) {
        t0 := time.Now()
        var req struct {
            Message string \`json:"message"\`
        }
        json.NewDecoder(r.Body).Decode(&req)
        w.Header().Set("Content-Type", "application/json")
        msg := strings.TrimSpace(req.Message)
        if msg == "" {
            w.WriteHeader(400)
            w.Write([]byte(\`{"error":"message 不能为空"}\`))
            return
        }
        isKnown := false
        for _, k := range knownTopics {
            if strings.Contains(msg, k) {
                isKnown = true
                break
            }
        }
        mu.Lock()
        totalRequests++
        traceID := strings.TrimSpace(r.Header.Get("X-Trace-Id"))
        if traceID == "" {
            traceID = fmt.Sprintf("trace-%d", totalRequests)
        }
        if !isKnown {
            transferHumanCount++
        }
        mu.Unlock()

        reply := "您好，商品支持 7 天无理由退货，满 99 元包邮。"
        if !isKnown {
            reply = "抱歉，该问题我暂时无法确认，已为您转接人工客服处理。"
        }
        latencyMs := time.Since(t0).Milliseconds()
        w.Header().Set("X-Trace-Id", traceID)
        json.NewEncoder(w).Encode(map[string]any{
            "reply":          reply,
            "trace_id":       traceID,
            "latency_ms":     latencyMs,
            "transfer_human": !isKnown,
        })
    })
    mux.HandleFunc("GET /api/support/metrics", func(w http.ResponseWriter, r *http.Request) {
        w.Header().Set("Content-Type", "application/json")
        mu.Lock()
        defer mu.Unlock()
        json.NewEncoder(w).Encode(map[string]any{
            "service":              "ai-support",
            "total_requests":       totalRequests,
            "transfer_human_count": transferHumanCount,
            "status":               "healthy",
        })
    })
    http.ListenAndServe(":8080", mux)
}`,
      explain:[
       {at:'package main',to:'knownTopics        = []string{"退货", "退款", "包邮", "运费", "发货", "保修", "ORD-"}',text:'导入标准库，声明互斥锁、全局计数器与已知话题列表。'},
       {at:'func main() {',to:'break',text:'注册 POST /api/support/trace-chat 接口，校验 message 非空，并检查是否包含已知话题关键词。'},
       {at:'mu.Lock()',to:'mu.Unlock()',text:'加锁更新 totalRequests，读取或生成 traceID，并在未知问题时累加 transferHumanCount。'},
       {at:'reply := "您好，商品支持 7 天无理由退货，满 99 元包邮。"',to:'"transfer_human": !isKnown,',text:'生成回复，计算毫秒耗时 latencyMs，设置 X-Trace-Id 响应头并输出 JSON。'},
       {at:'mux.HandleFunc("GET /api/support/metrics"',to:'http.ListenAndServe(":8080", mux)',text:'注册监控指标接口并在 8080 端口启动服务。'},
      ],
     },
    },
   },
  },
  {
   title:'任务二：编写 Dockerfile 与 CI 自动验收工作流',
   body:'为了让智能客服服务能在任何云服务器或 Kubernetes 集群中一键启动，并在每次提交代码时自动跑通验收脚本，我们需要编写生产级 Dockerfile 与 GitHub Actions 工作流配置（.github/workflows/ci.yml）。',
   variants:{
    python:{
     practice:{
      steps:[
       '在项目根目录编写 Dockerfile，基于 python:3.11-slim 安装依赖并启动 uvicorn。',
       '在 .github/workflows/ci.yml 中配置后台启动服务并运行 checks/check_cs12.py。',
      ],
      expect:'Docker 镜像构建清晰精简，CI 流水线自动完成服务启动、健康等待与验收测试。',
     },
     code:`# TODO 1：编写 Dockerfile（基于 python:3.11-slim，暴露 8080 端口，启动 uvicorn）
# TODO 2：编写 .github/workflows/ci.yml 自动启动服务并执行 python checks/check_cs12.py`,
     explain:[
      {at:'# TODO 1',to:'# TODO 2',text:'按照容器化最佳实践分层拷贝依赖与源码，并在 CI 中执行端到端验收脚本。'},
     ],
     solution:{
      code:`# --- Dockerfile ---
FROM python:3.11-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
EXPOSE 8080
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8080"]

# --- .github/workflows/ci.yml ---
name: AI Support CI
on: [push, pull_request]
jobs:
  verify:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: "3.11"
      - run: pip install -r requirements.txt
      - run: |
          uvicorn main:app --host 0.0.0.0 --port 8080 &
          sleep 2
          python checks/check_cs12.py`,
      explain:[
       {at:'FROM python:3.11-slim',to:'WORKDIR /app',text:'选用官方轻量级 Python 3.11 镜像，并将容器工作目录设为 /app。'},
       {at:'COPY requirements.txt .',to:'RUN pip install --no-cache-dir -r requirements.txt',text:'先单独拷贝依赖清单并安装，利用 Docker 层缓存加速后续构建。'},
       {at:'COPY . .',to:'CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8080"]',text:'拷贝项目代码，声明 8080 端口，并用 uvicorn 启动 FastAPI 服务。'},
       {at:'name: AI Support CI',to:'python-version: "3.11"',text:'定义 GitHub Actions 流水线：每次 push 或 PR 时在 Ubuntu 环境拉取代码并准备 Python 3.11。'},
       {at:'- run: pip install -r requirements.txt',to:'python checks/check_cs12.py',text:'安装依赖后在后台启动服务，等待 2 秒就绪后执行自动化验收脚本，不通过则直接阻断合入。'},
      ],
     },
    },
    node:{
     practice:{
      steps:[
       '编写 Node.js 版本的 Dockerfile 与 .github/workflows/ci.yml。',
      ],
      expect:'容器镜像与 CI 自动化验收配置完整。',
     },
     code:`# TODO：编写 Node.js 版本的 Dockerfile 与 .github/workflows/ci.yml`,
     explain:[
      {at:'# TODO',text:'基于 node:20-alpine 构建镜像，并在 CI 中启动 node app.js 后运行验收脚本。'},
     ],
     solution:{
      code:`# --- Dockerfile ---
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY . .
EXPOSE 8080
CMD ["node", "app.js"]

# --- .github/workflows/ci.yml ---
name: AI Support CI
on: [push, pull_request]
jobs:
  verify:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: "20"
      - run: npm ci
      - run: |
          node app.js &
          sleep 2
          python3 checks/check_cs12.py`,
      explain:[
       {at:'FROM node:20-alpine',to:'RUN npm ci --omit=dev',text:'基于轻量 node:20-alpine 镜像，先拷贝 package.json 安装生产依赖。'},
       {at:'COPY . .',to:'CMD ["node", "app.js"]',text:'拷贝应用源码，暴露 8080 端口并启动 app.js。'},
       {at:'name: AI Support CI',to:'python3 checks/check_cs12.py',text:'在 GitHub Actions 中安装 Node 依赖、后台启动服务并运行 Python 验收脚本。'},
      ],
     },
    },
    go:{
     practice:{
      steps:[
       '编写 Go 多阶段构建 Dockerfile 与 .github/workflows/ci.yml。',
      ],
      expect:'使用多阶段构建产出精简镜像，并在 CI 中运行验收测试。',
     },
     code:`# TODO：编写 Go 版本的 Dockerfile 与 .github/workflows/ci.yml`,
     explain:[
      {at:'# TODO',text:'使用 golang:1.22-alpine 编译静态二进制，再拷贝到 alpine 运行时镜像。'},
     ],
     solution:{
      code:`# --- Dockerfile ---
FROM golang:1.22-alpine AS builder
WORKDIR /src
COPY . .
RUN go build -o /app/server main.go

FROM alpine:3.19
WORKDIR /app
COPY --from=builder /app/server ./server
EXPOSE 8080
CMD ["./server"]

# --- .github/workflows/ci.yml ---
name: AI Support CI
on: [push, pull_request]
jobs:
  verify:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-go@v5
        with:
          go-version: "1.22"
      - run: |
          go run main.go &
          sleep 2
          python3 checks/check_cs12.py`,
      explain:[
       {at:'FROM golang:1.22-alpine AS builder',to:'RUN go build -o /app/server main.go',text:'第一阶段使用 Go 官方镜像将源码编译为二进制文件 /app/server。'},
       {at:'FROM alpine:3.19',to:'CMD ["./server"]',text:'第二阶段使用仅几 MB 的 alpine 镜像，只拷贝编译好的二进制文件并启动。'},
       {at:'name: AI Support CI',to:'python3 checks/check_cs12.py',text:'在 CI 中配置 Go 环境，后台启动服务并执行自动化验收脚本。'},
      ],
     },
    },
   },
  },
  {
   title:'验收：测试全链路 Trace ID 透传与生产监控指标汇总',
   body:'保存下面的脚本为 checks/check_cs12.py 并运行，完成智能 AI 客服实战通关验收！',
   practice:{
    steps:[
     '保持服务在 8080 端口运行。',
     '保存下面的脚本为 checks/check_cs12.py 并运行 python checks/check_cs12.py。',
    ],
    expect:'✓ 自定义请求头 X-Trace-Id: trace-abc-99 在响应头和响应体中完整透传\n✓ 未传 X-Trace-Id 时服务端自动生成非空 trace_id\n✓ 响应中包含正整数或非负耗时统计 latency_ms\n✓ 未知问题触发转人工后，/api/support/metrics 中的 transfer_human_count 准确累加\n✓ /api/support/metrics 汇总总请求数 total_requests 准确无误\n\n通过 5 / 5',
   },
   code:`import json, sys, urllib.error, urllib.request

BASE = sys.argv[1] if len(sys.argv) > 1 else "http://localhost:8080"
passed = 0

def check(name, ok):
    global passed
    print(("✓ " if ok else "✗ ") + name)
    passed += bool(ok)

def req(method, path, body=None, headers=None):
    hdrs = {"Content-Type": "application/json"}
    if headers:
        hdrs.update(headers)
    data = json.dumps(body).encode("utf-8") if body is not None else None
    r = urllib.request.Request(BASE + path, data=data, headers=hdrs, method=method)
    try:
        with urllib.request.urlopen(r, timeout=10) as resp:
            return resp.status, dict(resp.headers), json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        return e.code, dict(e.headers), json.loads(e.read().decode("utf-8") or "{}")

_, _, m0 = req("GET", "/api/support/metrics")
init_total = m0.get("total_requests", 0)
init_transfer = m0.get("transfer_human_count", 0)

s1, h1, d1 = req("POST", "/api/support/trace-chat", {"message": "请问怎么退货"}, {"X-Trace-Id": "trace-abc-99"})
resp_hdr_trace = h1.get("X-Trace-Id") or h1.get("x-trace-id")
check("自定义请求头 X-Trace-Id: trace-abc-99 在响应头和响应体中完整透传", s1 == 200 and resp_hdr_trace == "trace-abc-99" and d1.get("trace_id") == "trace-abc-99")

s2, _, d2 = req("POST", "/api/support/trace-chat", {"message": "满多少包邮"})
check("未传 X-Trace-Id 时服务端自动生成非空 trace_id", s2 == 200 and isinstance(d2.get("trace_id"), str) and len(d2["trace_id"]) > 0)

check("响应中包含正整数或非负耗时统计 latency_ms", isinstance(d1.get("latency_ms"), (int, float)) and d1["latency_ms"] >= 0)

req("POST", "/api/support/trace-chat", {"message": "你们老板明年打算收购哪家公司"})
s4, _, m1 = req("GET", "/api/support/metrics")
check("未知问题触发转人工后，/api/support/metrics 中的 transfer_human_count 准确累加", s4 == 200 and m1.get("transfer_human_count") == init_transfer + 1)

check("/api/support/metrics 汇总总请求数 total_requests 准确无误", m1.get("total_requests") == init_total + 3 and m1.get("status") == "healthy")

print(f"\\n通过 {passed} / 5")`,
   explain:[
    {at:'import json, sys, urllib.error, urllib.request',to:'return e.code, dict(e.headers), json.loads(e.read().decode("utf-8") or "{}")',text:'导入标准库并定义支持自定义请求头、同时返回响应头字典 dict(resp.headers) 的请求函数 req。'},
    {at:'_, _, m0 = req("GET", "/api/support/metrics")',to:'init_transfer = m0.get("transfer_human_count", 0)',text:'先读取测试前的初始请求数与初始转人工数，确保多次运行验收脚本也能准确校验增量。'},
    {at:'s1, h1, d1 = req("POST", "/api/support/trace-chat", {"message": "请问怎么退货"}, {"X-Trace-Id": "trace-abc-99"})',to:'check("自定义请求头 X-Trace-Id: trace-abc-99 在响应头和响应体中完整透传"',text:'第 1 项：传入自定义 X-Trace-Id: trace-abc-99，检查响应头（兼容大小写）和响应体中的 trace_id 是否一致。'},
    {at:'s2, _, d2 = req("POST", "/api/support/trace-chat", {"message": "满多少包邮"})',to:'check("响应中包含正整数或非负耗时统计 latency_ms"',text:'第 2、3 项：不传 X-Trace-Id 时验证服务端自动生成非空 ID，且返回非负耗时 latency_ms。'},
    {at:'req("POST", "/api/support/trace-chat", {"message": "你们老板明年打算收购哪家公司"})',to:'print(f"\\n通过 {passed} / 5")',text:'第 4、5 项：发送一条超出客服职责的未知问题触发转人工，验证 metrics 接口中的 transfer_human_count 加 1、total_requests 增加 3。'},
   ],
  },
 ],
 quiz:[
  {id:'cs-dp-1',q:'在生产环境的智能 AI 客服系统中，为每一次对话请求注入并透传全链路 `X-Trace-Id` 的最主要工程价值是什么？',options:['当用户反馈回答出错或变慢时，凭 Trace ID 能在日志中串起检索、工具与推理现场','让大模型看到这个随机 Trace ID 后自动提升逻辑推理智商，减少胡编乱造的概率','替代 HTTPS 加密传输协议，防止黑客在公网路由器上窃听用户的订单号与聊天记录','让浏览器的本地缓存自动保存所有历史回复，后续访问不再向后端服务器发起请求'],why:['','Trace ID 是给工程监控和日志检索用的链路标识，不会提升大模型的推理能力。','Trace ID 只是明文追踪编号，不能替代 TLS/HTTPS 加密。','Trace ID 每次请求唯一，与浏览器离线缓存无关。'],answer:0,explain:'AI 请求涉及意图识别、向量检索、工具调用、主备模型推理等多个环节，没有统一的 Trace ID 就无法在海量并发日志中还原单次对话的故障现场。'},
  {id:'cs-dp-2',type:'multi',q:'相比传统增删改查 Web 服务，生产级 AI 客服系统的监控大盘（Metrics）除了关注 HTTP 状态码，还应当重点监控哪些指标？（多选）',options:['知识库检索耗时与大模型推理耗时（latency_ms），及时发现慢查询或上游接口抖动','兜底转人工率（转人工数除以总请求数），及时发现知识库盲区并补充高频业务文档','缓存命中率与主备模型降级次数（fallback_used），评估算力节省效果与上游稳定性','Token 消耗速率与用户每日配额触发 429 的次数，防止异常流量打穿企业预算账单'],why:['','','',''],answers:[0,1,2,3],explain:'分阶段耗时、转人工率、缓存/降级比率以及 Token 成本监控，是企业级大模型应用可观测性（LLMOps）的四大核心指标。'},
  {id:'cs-dp-3',type:'judge',q:'在 Dockerfile 中构建 Python 或 Node.js 应用镜像时，先把 requirements.txt 或 package.json 拷贝进去安装依赖，最后再 COPY . . 拷贝业务源码，可以利用 Docker 层缓存大幅加速日常代码修改后的镜像构建。',answer:true,explain:'正确！依赖文件变动频率远低于业务代码，分层拷贝能避免每次改一行代码都重新下载安装所有第三方库。'},
  {id:'cs-dp-4',type:'fill',q:'在微服务与 AI 网关架构中，用于将一次请求从前端、网关、RAG 检索到大模型调用串联起来的唯一追踪请求头，在本关中命名为 ＿。',accepted:['X-Trace-Id','x-trace-id'],explain:'X-Trace-Id（或 W3C Traceparent / X-Request-Id）是分布式链路追踪的标准请求头约定。'},
  {id:'cs-dp-5',type:'short',q:'回顾整个“智能 AI 客服实战”全部 12 个关卡，如果面试官让你用 1 分钟介绍这个项目的核心架构亮点，你会怎么总结？',reference:'本项目实现了一个企业级高可用智能 AI 客服系统，核心架构包含五层：1. 统一多模型网关层：一套代码适配 DeepSeek、OpenAI、Claude、Gemini 与通义千问，支持 BYOK 用户专属 Key 隔离与每日配额限流（429），并具备归一化公共缓存（过滤个人订单防泄密）与主备模型故障自动降级（Fallback）；2. 意图与安全护栏层：前置拦截提示词注入与敏感机密刺探，识别订单查询、退货与人工升级意图；3. 混合 RAG 知识库层：支持文档切片入库、BM25+向量混合检索、RRF 融合与来源角标溯源；4. 受控 Agent 工具与状态机层：通过工具调用执行订单查询与 7 天退货资格硬性校验，并用工单状态机管理待审核与已批准流转；5. 评测与可观测交付层：内置黄金评测集上线门禁（安全一票否决）、全链路 X-Trace-Id 追踪、Metrics 监控接口与 Docker + GitHub Actions 自动化验收流水线。',points:['多模型统一网关 + 专属 Key 隔离限流 + 语义缓存与主备降级','前置安全护栏（防注入）+ 混合 RAG 检索与来源溯源','Function Calling 查单退货硬性规则校验 + 售后工单状态机','黄金评测集 CI 门禁 + 全链路 Trace ID 可观测性与容器化交付'],explain:'从多模型网关、RAG、Agent 工具与状态机，再到评测门禁、缓存降级与全链路可观测部署，这套回答能完整展现你从 AI 原型开发到生产级工程落地的全栈能力。'},
 ],
};
