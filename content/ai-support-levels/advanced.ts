// 项目实战“智能 AI 客服实战”进阶关卡（第 7 ~ 9 关）：多步 Agent 状态机、多模态视觉定损与人工坐席 Copilot。
import type {AiLevel} from '../journey';

export const csWorkflow:AiLevel={
 id:'cs-workflow',
 title:'多步 Agent 状态机：售后换货与补寄审批流',
 summary:'用有限状态机（FSM）驱动多轮槽位收集：核验订单 → 采集故障原因 → 校验库存 → 生成换货单并幂等防重',
 lessons:[
  {
   title:'为什么复杂售后不能靠自由聊天完成',
   body:'在简单的退货场景里，顾客报出订单号就能一步办完；但在真实的售后换货与补寄流程中，业务规则往往要求收集齐多个必填信息（称为“槽位 Slot”）：\n一、多轮槽位填充（Slot Filling）与有限状态机（FSM）：客服会话按明确的状态流转——AWAIT_ORDER（等待提供订单号）→ AWAIT_REASON（已核验订单，等待说明具体故障或少发原因）→ COMPLETED（槽位齐全，校验库存后生成换货单）。无论顾客分三句话慢慢说，还是一句话同时报出订单号和故障原因，状态机都能准确停在当前缺失的槽位上追问，或者一步直达终态；\n二、工单幂等性（Idempotency）：顾客在网络卡顿时可能连续点击两次“确认换货”，或者在会话终态再次发送相同诉求。后端生成售后换货单时，必须基于订单号生成幂等工单号（如 EX-ORD-1002），确保同一笔订单不会因为重复请求而寄出两份换货商品。',
  },
  {
   title:'任务：实现多步换货状态机与幂等工单接口',
   body:'在现有服务中实现多步售后换货状态机接口：\n一、POST /api/support/workflow：接收 {"session_id": "s1", "message": "..."}（message 为空返回 400）：\n  1. 按 session_id 维护会话状态与已收集的槽位（order_id、reason、ticket_id）；\n  2. 若当前会话尚未记录 order_id，用正则提取消息中的 ORD-\\d+；若未找到，状态保持 "AWAIT_ORDER"，返回 {"state": "AWAIT_ORDER", "missing_slot": "order_id", "reply": "请先提供您的订单号（如 ORD-1002）。"}；\n  3. 若已有 order_id 但尚未记录 reason，检查当前消息是否包含故障关键词（"杂音"、"破损"、"坏了"、"故障"、"少发"）；若未包含，状态设为 "AWAIT_REASON"，返回 {"state": "AWAIT_REASON", "order_id": oid, "missing_slot": "reason", "reply": "已记录订单 ...，请描述具体的商品故障或售后原因。"}；\n  4. 当 order_id 与 reason 均已收集齐时，状态流转为 "COMPLETED"，生成幂等换货工单号 f"EX-{oid}"，返回 {"state": "COMPLETED", "order_id": oid, "reason": reason, "ticket_id": f"EX-{oid}", "reply": "..."}；\n二、GET /api/support/workflow/{sid}：返回该会话当前的完整状态字典。',
   variants:{
    python:{
     practice:{
      steps:[
       '在 main.py 中维护 WORKFLOWS 字典与 REASONS 故障关键词列表。',
       '实现 POST /api/support/workflow，按 AWAIT_ORDER -> AWAIT_REASON -> COMPLETED 推进状态并生成幂等工单 EX-{order_id}。',
       '实现 GET /api/support/workflow/{sid}，返回指定会话的当前状态。',
      ],
      expect:'支持分步追问缺失槽位、一句话一步直达 COMPLETED，且重复请求保持工单号幂等。',
     },
     code:`import re
from fastapi import FastAPI
from fastapi.responses import JSONResponse

app = FastAPI()

WORKFLOWS: dict[str, dict] = {}
REASONS = ["杂音", "破损", "坏了", "故障", "少发"]

# TODO 1：实现 POST /api/support/workflow
#         - 提取或复用会话中的 order_id 与 reason
#         - 缺少 order_id 返回 state="AWAIT_ORDER", missing_slot="order_id"
#         - 缺少 reason 返回 state="AWAIT_REASON", missing_slot="reason"
#         - 两者齐全返回 state="COMPLETED", ticket_id=f"EX-{oid}"

# TODO 2：实现 GET /api/support/workflow/{sid}`,
     explain:[
      {at:'import re',to:'from fastapi.responses import JSONResponse',text:'导入正则表达式模块 re 与 FastAPI 相关组件。'},
      {at:'app = FastAPI()',text:'创建 FastAPI 应用实例。'},
      {at:'WORKFLOWS: dict[str, dict] = {}',to:'REASONS = ["杂音", "破损", "坏了", "故障", "少发"]',text:'WORKFLOWS 按 session_id 存储每个售后会话的状态机数据；REASONS 定义可识别的故障原因关键词。'},
     ],
     solution:{
      code:`import re
from fastapi import FastAPI
from fastapi.responses import JSONResponse

app = FastAPI()

WORKFLOWS: dict[str, dict] = {}
REASONS = ["杂音", "破损", "坏了", "故障", "少发"]


@app.post("/api/support/workflow")
def step_workflow(body: dict):
    sid = str(body.get("session_id", "default")).strip() or "default"
    msg = str(body.get("message", "")).strip()
    if not msg:
        return JSONResponse({"error": "消息内容不能为空"}, status_code=400)
    st = WORKFLOWS.setdefault(sid, {"state": "AWAIT_ORDER", "order_id": None, "reason": None, "ticket_id": None})
    m = re.search(r"ORD-\\d+", msg)
    if m and not st["order_id"]:
        st["order_id"] = m.group(0)
    for kw in REASONS:
        if kw in msg and not st["reason"]:
            st["reason"] = kw
            break
    oid = st["order_id"]
    if not oid:
        st["state"] = "AWAIT_ORDER"
        return {"state": "AWAIT_ORDER", "missing_slot": "order_id", "reply": "请先提供您的订单号（如 ORD-1002）。"}
    if not st["reason"]:
        st["state"] = "AWAIT_REASON"
        return {
            "state": "AWAIT_REASON",
            "order_id": oid,
            "missing_slot": "reason",
            "reply": f"已记录订单 {oid}，请描述具体的商品故障或售后原因。",
        }
    st["state"] = "COMPLETED"
    st["ticket_id"] = f"EX-{oid}"
    return {
        "state": "COMPLETED",
        "order_id": oid,
        "reason": st["reason"],
        "ticket_id": st["ticket_id"],
        "reply": f"订单 {oid} 因“{st['reason']}”已通过换货审批，换货单号为 {st['ticket_id']}。",
    }


@app.get("/api/support/workflow/{sid}")
def get_workflow(sid: str):
    return WORKFLOWS.get(sid, {"state": "AWAIT_ORDER", "order_id": None, "reason": None, "ticket_id": None})`,
      explain:[
       {at:'import re',to:'from fastapi.responses import JSONResponse',text:'导入正则表达式模块 re 与 FastAPI 相关组件。'},
       {at:'app = FastAPI()',text:'创建 FastAPI 应用实例。'},
       {at:'WORKFLOWS: dict[str, dict] = {}',to:'REASONS = ["杂音", "破损", "坏了", "故障", "少发"]',text:'WORKFLOWS 按 session_id 存储每个售后会话的状态机槽位数据；REASONS 定义支持的售后故障关键词。'},
       {at:'@app.post("/api/support/workflow")',to:'return JSONResponse({"error": "消息内容不能为空"}, status_code=400)',text:'售后状态机推进接口：读取 session_id 与 message，空消息直接返回 400。'},
       {at:'st = WORKFLOWS.setdefault(sid',text:'取出或初始化当前会话的状态字典，初始状态为 AWAIT_ORDER，三个槽位均为 None。'},
       {at:'m = re.search(r"ORD-\\d+", msg)',to:'st["order_id"] = m.group(0)',text:'若当前消息中包含订单号且槽位尚未填写，则将提取到的订单号写入 order_id 槽位。'},
       {at:'for kw in REASONS:',to:'break',text:'遍历故障关键词列表，若消息命中某个故障原因且 reason 槽位为空，则填入该原因。这保证了即使顾客一句话同时给出订单号和原因，两个槽位也能同时填好。'},
       {at:'oid = st["order_id"]',to:'return {"state": "AWAIT_ORDER", "missing_slot": "order_id", "reply": "请先提供您的订单号（如 ORD-1002）。"}',text:'检查第 1 个必填槽位 order_id：若仍未提供，状态保持 AWAIT_ORDER，明确告知前端缺失 order_id 并追问顾客。'},
       {at:'if not st["reason"]:',to:'"reply": f"已记录订单 {oid}，请描述具体的商品故障或售后原因。",',text:'检查第 2 个必填槽位 reason：已有订单号但缺少故障原因时，状态流转为 AWAIT_REASON，带上已记录的订单号继续追问原因。'},
       {at:'st["state"] = "COMPLETED"',to:'"reply": f"订单 {oid} 因“{st[\'reason\']}”已通过换货审批，换货单号为 {st[\'ticket_id\']}。",',text:'当 order_id 与 reason 均已齐备时，状态流转为 COMPLETED，按订单号生成确定性的幂等换货单号 EX-{oid} 并返回。重复调用也会返回同一个单号。'},
       {at:'@app.get("/api/support/workflow/{sid}")',to:'return WORKFLOWS.get(sid',text:'查询指定会话当前所处的状态机阶段与已收集槽位，未找到时返回初始默认状态。'},
      ],
     },
    },
    node:{
     practice:{
      steps:[
       '在 app.js 中实现 POST /api/support/workflow 与 GET /api/support/workflow/:sid。',
      ],
      expect:'通过多轮槽位追问、一步直达与幂等换货单全部测试。',
     },
     code:`// TODO：在 app.js 中实现 POST /api/support/workflow 与 GET /api/support/workflow/:sid`,
     explain:[
      {at:'// TODO',text:'使用 Map 按 session_id 保存状态机槽位，按序检查 order_id 与 reason。'},
     ],
     solution:{
      code:`const express = require("express");
const app = express();
app.use(express.json());

const workflows = new Map();
const REASONS = ["杂音", "破损", "坏了", "故障", "少发"];

app.post("/api/support/workflow", (req, res) => {
  const sid = String(req.body?.session_id ?? "default").trim() || "default";
  const msg = String(req.body?.message ?? "").trim();
  if (!msg) return res.status(400).json({ error: "消息内容不能为空" });
  if (!workflows.has(sid)) {
    workflows.set(sid, { state: "AWAIT_ORDER", order_id: null, reason: null, ticket_id: null });
  }
  const st = workflows.get(sid);
  const m = msg.match(/ORD-\\d+/);
  if (m && !st.order_id) st.order_id = m[0];
  for (const kw of REASONS) {
    if (msg.includes(kw) && !st.reason) {
      st.reason = kw;
      break;
    }
  }
  if (!st.order_id) {
    st.state = "AWAIT_ORDER";
    return res.json({ state: "AWAIT_ORDER", missing_slot: "order_id", reply: "请先提供您的订单号（如 ORD-1002）。" });
  }
  if (!st.reason) {
    st.state = "AWAIT_REASON";
    return res.json({
      state: "AWAIT_REASON",
      order_id: st.order_id,
      missing_slot: "reason",
      reply: \`已记录订单 \${st.order_id}，请描述具体的商品故障或售后原因。\`,
    });
  }
  st.state = "COMPLETED";
  st.ticket_id = \`EX-\${st.order_id}\`;
  res.json({
    state: "COMPLETED",
    order_id: st.order_id,
    reason: st.reason,
    ticket_id: st.ticket_id,
    reply: \`订单 \${st.order_id} 已生成换货单 \${st.ticket_id}。\`,
  });
});

app.get("/api/support/workflow/:sid", (req, res) => {
  res.json(workflows.get(req.params.sid) || { state: "AWAIT_ORDER", order_id: null, reason: null, ticket_id: null });
});

app.listen(8080);`,
      explain:[
       {at:'const express = require("express");',to:'app.use(express.json());',text:'引入 Express 并启用 JSON 请求体解析。'},
       {at:'const workflows = new Map();',to:'const REASONS = ["杂音", "破损", "坏了", "故障", "少发"];',text:'workflows 按 session_id 存储每个会话的状态机对象；REASONS 保存可识别的故障关键词。'},
       {at:'app.post("/api/support/workflow", (req, res) => {',to:'if (!msg) return res.status(400).json({ error: "消息内容不能为空" });',text:'提取 session_id 和 message，空消息返回 400。'},
       {at:'if (!workflows.has(sid)) {',to:'const st = workflows.get(sid);',text:'若该会话首次进入状态机，则初始化状态为 AWAIT_ORDER 并取出引用。'},
       {at:'const m = msg.match(/ORD-\\d+/);',to:'if (m && !st.order_id) st.order_id = m[0];',text:'从消息中提取订单号 ORD-xxxx 并填入 order_id 槽位。'},
       {at:'for (const kw of REASONS) {',to:'break;',text:'匹配消息中的故障原因关键词并填入 reason 槽位。'},
       {at:'if (!st.order_id) {',to:'return res.json({ state: "AWAIT_ORDER", missing_slot: "order_id", reply: "请先提供您的订单号（如 ORD-1002）。" });',text:'若缺少订单号，保持 AWAIT_ORDER 状态并追问 order_id。'},
       {at:'if (!st.reason) {',to:'reply: `已记录订单 ${st.order_id}，请描述具体的商品故障或售后原因。`,',text:'若已有订单号但缺少原因，流转到 AWAIT_REASON 并追问具体故障原因。'},
       {at:'st.state = "COMPLETED";',to:'reply: `订单 ${st.order_id} 已生成换货单 ${st.ticket_id}。`,',text:'两个必填槽位均已齐备，流转到 COMPLETED 并生成幂等换货单号 EX-{order_id}。'},
       {at:'app.get("/api/support/workflow/:sid", (req, res) => {',to:'res.json(workflows.get(req.params.sid)',text:'返回指定会话的当前状态对象。'},
       {at:'app.listen(8080);',text:'在 8080 端口启动服务。'},
      ],
     },
    },
    go:{
     practice:{
      steps:[
       '在 main.go 中实现 POST /api/support/workflow 与 GET /api/support/workflow/{sid}。',
      ],
      expect:'通过多轮槽位追问、一步直达与幂等换货单全部测试。',
     },
     code:`// TODO：在 main.go 中实现 POST /api/support/workflow 与 GET /api/support/workflow/{sid}`,
     explain:[
      {at:'// TODO',text:'使用 sync.Mutex 保护状态机 map，按序填充 OrderID 与 Reason 槽位。'},
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

type WfState struct {
    State    string  \`json:"state"\`
    OrderID  *string \`json:"order_id"\`
    Reason   *string \`json:"reason"\`
    TicketID *string \`json:"ticket_id"\`
}

var (
    mu        sync.Mutex
    workflows = map[string]*WfState{}
    reasons   = []string{"杂音", "破损", "坏了", "故障", "少发"}
    ordReg    = regexp.MustCompile(\`ORD-\\d+\`)
)

func main() {
    mux := http.NewServeMux()
    mux.HandleFunc("POST /api/support/workflow", func(w http.ResponseWriter, r *http.Request) {
        var req struct {
            SessionID string \`json:"session_id"\`
            Message   string \`json:"message"\`
        }
        json.NewDecoder(r.Body).Decode(&req)
        w.Header().Set("Content-Type", "application/json")
        msg := strings.TrimSpace(req.Message)
        if msg == "" {
            w.WriteHeader(400)
            w.Write([]byte(\`{"error":"消息内容不能为空"}\`))
            return
        }
        sid := strings.TrimSpace(req.SessionID)
        if sid == "" {
            sid = "default"
        }
        mu.Lock()
        defer mu.Unlock()
        st, ok := workflows[sid]
        if !ok {
            st = &WfState{State: "AWAIT_ORDER"}
            workflows[sid] = st
        }
        if m := ordReg.FindString(msg); m != "" && st.OrderID == nil {
            oid := m
            st.OrderID = &oid
        }
        for _, kw := range reasons {
            if strings.Contains(msg, kw) && st.Reason == nil {
                rs := kw
                st.Reason = &rs
                break
            }
        }
        if st.OrderID == nil {
            st.State = "AWAIT_ORDER"
            json.NewEncoder(w).Encode(map[string]any{"state": "AWAIT_ORDER", "missing_slot": "order_id", "reply": "请先提供您的订单号（如 ORD-1002）。"})
            return
        }
        if st.Reason == nil {
            st.State = "AWAIT_REASON"
            json.NewEncoder(w).Encode(map[string]any{"state": "AWAIT_REASON", "order_id": *st.OrderID, "missing_slot": "reason", "reply": "已记录订单 " + *st.OrderID + "，请描述具体的商品故障或售后原因。"})
            return
        }
        st.State = "COMPLETED"
        tk := "EX-" + *st.OrderID
        st.TicketID = &tk
        json.NewEncoder(w).Encode(map[string]any{"state": "COMPLETED", "order_id": *st.OrderID, "reason": *st.Reason, "ticket_id": tk, "reply": "已生成换货单 " + tk})
    })
    mux.HandleFunc("GET /api/support/workflow/{sid}", func(w http.ResponseWriter, r *http.Request) {
        sid := r.PathValue("sid")
        mu.Lock()
        st, ok := workflows[sid]
        mu.Unlock()
        w.Header().Set("Content-Type", "application/json")
        if !ok {
            json.NewEncoder(w).Encode(WfState{State: "AWAIT_ORDER"})
            return
        }
        json.NewEncoder(w).Encode(st)
    })
    http.ListenAndServe(":8080", mux)
}`,
      explain:[
       {at:'package main',to:'"sync"',text:'导入 JSON、HTTP、正则、字符串处理与互斥锁标准库。'},
       {at:'type WfState struct {',to:'TicketID *string `json:"ticket_id"`',text:'定义会话状态结构体，指针类型字段在未赋值时会序列化为 JSON 的 null。'},
       {at:'var (',to:'ordReg    = regexp.MustCompile(`ORD-\\d+`)',text:'定义全局互斥锁、会话状态表 workflows、故障原因切片与订单号正则。'},
       {at:'func main() {',to:'mux := http.NewServeMux()',text:'创建 HTTP 路由器。'},
       {at:'mux.HandleFunc("POST /api/support/workflow"',to:'return',text:'解析请求体并校验 message 非空，为空则返回 400。'},
       {at:'sid := strings.TrimSpace(req.SessionID)',to:'workflows[sid] = st',text:'确定会话 ID，加锁后获取或初始化该会话的状态机对象。'},
       {at:'if m := ordReg.FindString(msg); m != "" && st.OrderID == nil {',to:'st.OrderID = &oid',text:'若消息中含有订单号且当前尚未记录，则填充 OrderID 槽位。'},
       {at:'for _, kw := range reasons {',to:'break',text:'若消息中包含故障原因关键词且尚未记录，则填充 Reason 槽位。'},
       {at:'if st.OrderID == nil {',to:'return',text:'缺少订单号时保持 AWAIT_ORDER 并追问 order_id。'},
       {at:'if st.Reason == nil {',to:'return',text:'缺少故障原因时进入 AWAIT_REASON 并追问 reason。'},
       {at:'st.State = "COMPLETED"',to:'json.NewEncoder(w).Encode(map[string]any{"state": "COMPLETED"',text:'槽位齐全后进入 COMPLETED，生成幂等工单号 EX-{OrderID} 并返回。'},
       {at:'mux.HandleFunc("GET /api/support/workflow/{sid}"',to:'json.NewEncoder(w).Encode(st)',text:'按路径参数 sid 查询并返回当前会话状态。'},
       {at:'http.ListenAndServe(":8080", mux)',text:'在 8080 端口启动服务。'},
      ],
     },
    },
   },
  },
  {
   title:'验收：测试多步槽位追问、状态流转与幂等工单',
   body:'保存下面的脚本为 checks/check_cs7.py 并运行，验证状态机分步追问、一步直达与工单幂等性。',
   practice:{
    steps:[
     '保持服务在 8080 端口运行。',
     '保存下面的脚本为 checks/check_cs7.py 并运行 python checks/check_cs7.py。',
    ],
    expect:'✓ 未提供订单号时停留在 AWAIT_ORDER 并追问 order_id\n✓ 提供 ORD-1002 后进入 AWAIT_REASON 并追问故障原因\n✓ 补充“左耳有杂音坏了”后流转到 COMPLETED 并生成换货单 EX-ORD-1002\n✓ 重复提交相同诉求保持幂等，工单号仍为 EX-ORD-1002\n✓ 一句话同时包含订单号与故障原因时一步直达 COMPLETED\n\n通过 5 / 5',
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

s1, d1 = post("/api/support/workflow", {"session_id": "wf-1", "message": "你好，我想申请售后换货"})
check("未提供订单号时停留在 AWAIT_ORDER 并追问 order_id", s1 == 200 and d1.get("state") == "AWAIT_ORDER" and d1.get("missing_slot") == "order_id")

s2, d2 = post("/api/support/workflow", {"session_id": "wf-1", "message": "我的订单号是 ORD-1002"})
check("提供 ORD-1002 后进入 AWAIT_REASON 并追问故障原因", s2 == 200 and d2.get("state") == "AWAIT_REASON" and d2.get("order_id") == "ORD-1002" and d2.get("missing_slot") == "reason")

s3, d3 = post("/api/support/workflow", {"session_id": "wf-1", "message": "左耳有杂音坏了"})
check("补充“左耳有杂音坏了”后流转到 COMPLETED 并生成换货单 EX-ORD-1002", s3 == 200 and d3.get("state") == "COMPLETED" and d3.get("ticket_id") == "EX-ORD-1002")

s4, d4 = post("/api/support/workflow", {"session_id": "wf-1", "message": "再确认一下换货"})
check("重复提交相同诉求保持幂等，工单号仍为 EX-ORD-1002", s4 == 200 and d4.get("state") == "COMPLETED" and d4.get("ticket_id") == "EX-ORD-1002")

s5, d5 = post("/api/support/workflow", {"session_id": "wf-fast", "message": "订单 ORD-1003 收到时外包装破损了，帮我换货"})
check("一句话同时包含订单号与故障原因时一步直达 COMPLETED", s5 == 200 and d5.get("state") == "COMPLETED" and d5.get("ticket_id") == "EX-ORD-1003")

print(f"\\n通过 {passed} / 5")`,
   explain:[
    {at:'import json, sys',to:'passed = 0',text:'导入标准库并初始化服务地址 BASE 与通过计数 passed。'},
    {at:'def check(name, ok):',to:'passed += bool(ok)',text:'定义断言打印函数 check，统计通过的检查项数量。'},
    {at:'def post(path, body):',to:'return e.code, json.loads(e.read().decode("utf-8") or "{}")',text:'封装 JSON POST 请求辅助函数，兼容正常响应与 HTTP 错误状态码。'},
    {at:'s1, d1 = post("/api/support/workflow", {"session_id": "wf-1", "message": "你好，我想申请售后换货"})',to:'check("未提供订单号时停留在 AWAIT_ORDER 并追问 order_id"',text:'第 1 项：顾客只说要换货但没给订单号，验证状态停留在 AWAIT_ORDER 且提示缺失 order_id。'},
    {at:'s2, d2 = post("/api/support/workflow", {"session_id": "wf-1", "message": "我的订单号是 ORD-1002"})',to:'check("提供 ORD-1002 后进入 AWAIT_REASON 并追问故障原因"',text:'第 2 项：顾客补上订单号 ORD-1002，验证状态推进到 AWAIT_REASON 且提示缺失 reason。'},
    {at:'s3, d3 = post("/api/support/workflow", {"session_id": "wf-1", "message": "左耳有杂音坏了"})',to:'check("补充“左耳有杂音坏了”后流转到 COMPLETED 并生成换货单 EX-ORD-1002"',text:'第 3 项：顾客补充故障原因后槽位集齐，验证流转到 COMPLETED 并生成工单 EX-ORD-1002。'},
    {at:'s4, d4 = post("/api/support/workflow", {"session_id": "wf-1", "message": "再确认一下换货"})',to:'check("重复提交相同诉求保持幂等，工单号仍为 EX-ORD-1002"',text:'第 4 项：在同一会话重复发消息确认，验证状态与工单号保持幂等不变。'},
    {at:'s5, d5 = post("/api/support/workflow", {"session_id": "wf-fast", "message": "订单 ORD-1003 收到时外包装破损了，帮我换货"})',to:'check("一句话同时包含订单号与故障原因时一步直达 COMPLETED"',text:'第 5 项：新会话一句话同时给出订单号和破损原因，验证无需中间追问即可一步直达 COMPLETED。'},
    {at:'print(f"\\n通过 {passed} / 5")',text:'打印最终验收通过统计。'},
   ],
  },
 ],
 quiz:[
  {id:'cs-wf-1',q:'在处理售后换货、退差价这类包含多个必填步骤的客服场景时，引入“有限状态机（FSM）+ 槽位填充（Slot Filling）”的主要价值是什么？',options:['明确追踪每个必填信息是否集齐，按固定业务流转顺序精准追问并触发工单','把多轮历史对话压缩成单条短字符串，从而显著降低服务器显卡的显存占用','让大模型跳过后端业务接口的库存检查，直接口头答应给顾客寄出全新商品','自动将所有用户的语音通话实时转写成英文字幕，方便跨国客服团队去阅读'],why:['','状态机的核心作用是流程控制与槽位完整性保障，而非显存压缩。','库存校验与工单创建仍需经过后端确定性代码执行，不能跳过。','语音转字幕属于 ASR 范畴，与多轮对话状态机无关。'],answer:0,explain:'状态机与槽位填充把不可控的自由闲聊变成了结构化的填表过程：缺哪个槽位就追问哪个，集齐后再执行确定性的审批与建单逻辑。'},
  {id:'cs-wf-2',type:'multi',q:'关于多步售后 Agent 的状态机设计与工单幂等性，下列哪些做法是合理的？（多选）',options:['支持顾客在一句话里同时提供订单号与故障原因，一次填充多个槽位并直达终态','基于订单号与售后类型生成确定性的幂等工单号，防止网络重试导致重复建单','在会话状态中显式返回缺失槽位字段，方便前端渲染对应的快捷选项卡片','将已收集的槽位按会话标识持久化保存，避免顾客在下一轮对话重复输入'],why:['','','',''],answers:[0,1,2,3],explain:'支持单轮多槽位提取、工单幂等防重、结构化返回缺失槽位、按会话保存已填槽位，是生产级对话式工作流的四项基本准则。'},
  {id:'cs-wf-3',type:'judge',q:'当顾客在第一句话中已经同时说出了订单号“ORD-1002”和故障原因“耳机有杂音”，良好的状态机依然应该强行让顾客把故障原因再重复敲一遍。',answer:false,explain:'错误！优秀的槽位填充逻辑会在每一轮消息中尝试提取所有未填槽位，一旦所有必填槽位均已满足，就应当直接流转到下一阶段或终态，减少顾客的重复输入。'},
  {id:'cs-wf-4',type:'fill',q:'在接口设计中，无论同一个换货请求被重复提交一次还是多次，产生的业务结果与工单号都保持一致、不会重复发货，这种性质称为 ＿（中文三字术语）。',accepted:['幂等性','幂等'],explain:'幂等性（Idempotency）是支付、建单、退款等写操作接口最重要的安全防线之一。'},
  {id:'cs-wf-5',type:'short',q:'请简述在多轮售后客服 Agent 中，槽位填充（Slot Filling）与有限状态机（FSM）是如何配合工作的？',reference:'1. 定义槽位与状态：先明确业务所需的必填槽位（如 order_id、reason）以及对应的状态阶段（AWAIT_ORDER、AWAIT_REASON、COMPLETED）；2. 槽位提取与更新：每收到一轮用户消息，从文本中提取订单号、故障原因等实体并写入当前会话的槽位字典；3. 状态判定与动作执行：按优先级检查槽位是否齐全，若存在缺失则停留在对应等待状态并生成针对性的追问话术，若全部齐全则流转至完成态并调用幂等建单接口。',points:['定义必填槽位（如订单号、故障原因）与状态阶段','每轮从用户消息中提取实体并更新会话槽位','缺失槽位时停留在对应状态追问，集齐后流转终态并幂等建单'],explain:'理解“提取槽位 → 检查缺失 → 状态流转与动作触发”的闭环，就能驾驭绝大多数复杂业务办理类 Agent。'},
 ],
};

export const csVision:AiLevel={
 id:'cs-vision',
 title:'多模态客服：破损商品图片定损与理赔',
 summary:'接入视觉大模型（VLM）分析顾客上传的商品破损照片与快递面单，自动判定破损等级并计算秒退/补寄方案',
 lessons:[
  {
   title:'多模态视觉模型如何帮客服“看图定损”',
   body:'在生鲜、数码、美妆电商的售后场景中，顾客经常发来一张商品碎裂或外盒压瘪的照片说“收到的货坏了”。如果全靠人工客服肉眼核对照片，高峰期排队往往要等半小时以上。\n接入多模态视觉大模型（VLM，如 GPT-4o、Gemini 2.5 Flash、Qwen-VL、Claude 3.5 Sonnet）后，我们可以实现自动“看图定损”：\n一、安全校验图片输入：后端只接受合法的 https:// 图片地址或 data:image/ 开头的 Base64 编码图片，拒绝 ftp://、file:// 或空地址，防止服务端请求伪造（SSRF）；\n二、结构化定损输出：引导视觉模型输出严格的 JSON 字段，包含破损等级 damage_level（"severe" 严重破损、"minor" 轻微瑕疵、"none" 未见明显破损）；\n三、规则引擎自动理赔：拿到定损等级后，由后端代码匹配理赔政策——严重破损（severe）自动开通极速免费换新（free_replace，赔付额度 299 元）；轻微外观划痕（minor）主动发放 30 元小额补偿礼券（coupon）；无法看清或无明显破损（none）则平滑转交人工专员复核（manual_review）。',
  },
  {
   title:'任务：实现商品图片定损与自动理赔接口',
   body:'实现多模态图片定损接口 POST /api/support/vision-claim：\n一、接收 {"order_id": "ORD-1002", "image_url": "...", "description": "..."}；\n二、协议安全校验：检查 image_url 是否以 "https://" 或 "data:image/" 开头，若不满足则返回 400 和 {"error": "图片地址格式不合法"}；\n三、视觉定损与理赔档位判定（结合 image_url 与 description 特征）：\n  1. 包含 "severe"、"碎裂" 或 "断裂"：返回 damage_level="severe"、action="free_replace"、compensation=299；\n  2. 包含 "minor"、"划痕" 或 "压痕"：返回 damage_level="minor"、action="coupon"、compensation=30；\n  3. 其他情况：返回 damage_level="none"、action="manual_review"、compensation=0。',
   variants:{
    python:{
     practice:{
      steps:[
       '在 main.py 中实现 POST /api/support/vision-claim。',
       '校验 image_url 必须以 https:// 或 data:image/ 开头，否则返回 400。',
       '根据破损特征判定 severe / minor / none 三档，返回对应的 action、compensation 与 reply。',
      ],
      expect:'非法图片协议返回 400，重度破损触发免费换新，轻微划痕触发 30 元补偿券，无法识别时转人工复核。',
     },
     code:`from fastapi import FastAPI
from fastapi.responses import JSONResponse

app = FastAPI()

# TODO：实现 POST /api/support/vision-claim
#       1. 校验 image_url 以 https:// 或 data:image/ 开头，否则返回 400
#       2. 判定 severe (free_replace, 299) / minor (coupon, 30) / none (manual_review, 0)`,
     explain:[
      {at:'from fastapi import FastAPI',to:'app = FastAPI()',text:'导入 FastAPI 与 JSONResponse 并创建应用实例。'},
     ],
     solution:{
      code:`from fastapi import FastAPI
from fastapi.responses import JSONResponse

app = FastAPI()


@app.post("/api/support/vision-claim")
def vision_claim(body: dict):
    oid = str(body.get("order_id", "ORD-1002")).strip() or "ORD-1002"
    img = str(body.get("image_url", "")).strip()
    desc = str(body.get("description", "")).strip()
    if not (img.startswith("https://") or img.startswith("data:image/")):
        return JSONResponse({"error": "图片地址格式不合法"}, status_code=400)
    combined = f"{img} {desc}".lower()
    if any(k in combined for k in ["severe", "碎裂", "断裂"]):
        return {
            "order_id": oid,
            "damage_level": "severe",
            "action": "free_replace",
            "compensation": 299,
            "reply": "经视觉定损确认为严重破损，已为您开通极速免费换新通道。",
        }
    if any(k in combined for k in ["minor", "划痕", "压痕"]):
        return {
            "order_id": oid,
            "damage_level": "minor",
            "action": "coupon",
            "compensation": 30,
            "reply": "经视觉定损为轻微外观瑕疵，可为您发放 30 元补偿礼券，或选择常规换货。",
        }
    return {
        "order_id": oid,
        "damage_level": "none",
        "action": "manual_review",
        "compensation": 0,
        "reply": "图片未识别到明显破损特征，已转交人工售后专员复核。",
    }`,
      explain:[
       {at:'from fastapi import FastAPI',to:'app = FastAPI()',text:'导入 FastAPI 与 JSONResponse 并创建应用实例。'},
       {at:'@app.post("/api/support/vision-claim")',to:'desc = str(body.get("description", "")).strip()',text:'定义多模态定损接口，提取订单号 order_id、图片地址 image_url 与文字补充说明 description。'},
       {at:'if not (img.startswith("https://") or img.startswith("data:image/")):',to:'return JSONResponse({"error": "图片地址格式不合法"}, status_code=400)',text:'安全护栏：只允许 https:// 链接或 data:image/ 格式的 Base64 图片，其余协议或空字符串一律返回 400 拒绝。'},
       {at:'combined = f"{img} {desc}".lower()',text:'将图片标识与说明文本合并并转为小写，用于提取视觉破损特征。'},
       {at:'if any(k in combined for k in ["severe", "碎裂", "断裂"]):',to:'"reply": "经视觉定损确认为严重破损，已为您开通极速免费换新通道。",',text:'命中严重破损特征时，返回 damage_level="severe"、自动执行免费换新（free_replace）并记录对应赔付金额 299 元。'},
       {at:'if any(k in combined for k in ["minor", "划痕", "压痕"]):',to:'"reply": "经视觉定损为轻微外观瑕疵，可为您发放 30 元补偿礼券，或选择常规换货。",',text:'命中轻微瑕疵特征时，返回 damage_level="minor"、发放 30 元补偿礼券（coupon），提升顾客留存率并节省退换运费。'},
       {at:'return {',to:'"reply": "图片未识别到明显破损特征，已转交人工售后专员复核。",',text:'未识别到明确破损特征时，返回 damage_level="none"，动作设为 manual_review 转交人工专员兜底复核。'},
      ],
     },
    },
    node:{
     practice:{
      steps:[
       '在 app.js 中实现 POST /api/support/vision-claim。',
      ],
      expect:'通过图片协议校验、重度破损换新、轻微瑕疵补偿与转人工复核全部测试。',
     },
     code:`// TODO：在 app.js 中实现 POST /api/support/vision-claim`,
     explain:[
      {at:'// TODO',text:'检查 image_url 前缀，并按 severe / minor / none 三档返回定损结果。'},
     ],
     solution:{
      code:`const express = require("express");
const app = express();
app.use(express.json());

app.post("/api/support/vision-claim", (req, res) => {
  const oid = String(req.body?.order_id ?? "ORD-1002").trim() || "ORD-1002";
  const img = String(req.body?.image_url ?? "").trim();
  const desc = String(req.body?.description ?? "").trim();
  if (!img.startsWith("https://") && !img.startsWith("data:image/")) {
    return res.status(400).json({ error: "图片地址格式不合法" });
  }
  const combined = \`\${img} \${desc}\`.toLowerCase();
  if (["severe", "碎裂", "断裂"].some((k) => combined.includes(k))) {
    return res.json({
      order_id: oid,
      damage_level: "severe",
      action: "free_replace",
      compensation: 299,
      reply: "经视觉定损确认为严重破损，已为您开通极速免费换新通道。",
    });
  }
  if (["minor", "划痕", "压痕"].some((k) => combined.includes(k))) {
    return res.json({
      order_id: oid,
      damage_level: "minor",
      action: "coupon",
      compensation: 30,
      reply: "经视觉定损为轻微外观瑕疵，可为您发放 30 元补偿礼券，或选择常规换货。",
    });
  }
  res.json({
    order_id: oid,
    damage_level: "none",
    action: "manual_review",
    compensation: 0,
    reply: "图片未识别到明显破损特征，已转交人工售后专员复核。",
  });
});

app.listen(8080);`,
      explain:[
       {at:'const express = require("express");',to:'app.use(express.json());',text:'引入 Express 并启用 JSON 解析。'},
       {at:'app.post("/api/support/vision-claim", (req, res) => {',to:'return res.status(400).json({ error: "图片地址格式不合法" });',text:'提取请求字段，校验 image_url 是否以 https:// 或 data:image/ 开头，不合法则返回 400。'},
       {at:'const combined = `${img} ${desc}`.toLowerCase();',to:'reply: "经视觉定损确认为严重破损，已为您开通极速免费换新通道。",',text:'命中 severe / 碎裂 / 断裂特征时，返回重度破损与免费换新方案。'},
       {at:'if (["minor", "划痕", "压痕"].some((k) => combined.includes(k))) {',to:'reply: "经视觉定损为轻微外观瑕疵，可为您发放 30 元补偿礼券，或选择常规换货。",',text:'命中 minor / 划痕 / 压痕特征时，返回轻微瑕疵与 30 元礼券补偿方案。'},
       {at:'res.json({',to:'reply: "图片未识别到明显破损特征，已转交人工售后专员复核。",',text:'其余情况返回 none 并转交人工专员复核。'},
       {at:'app.listen(8080);',text:'在 8080 端口启动服务。'},
      ],
     },
    },
    go:{
     practice:{
      steps:[
       '在 main.go 中实现 POST /api/support/vision-claim。',
      ],
      expect:'通过图片协议校验、重度破损换新、轻微瑕疵补偿与转人工复核全部测试。',
     },
     code:`// TODO：在 main.go 中实现 POST /api/support/vision-claim`,
     explain:[
      {at:'// TODO',text:'使用 strings.HasPrefix 校验图片地址协议，按三档破损程度返回 JSON。'},
     ],
     solution:{
      code:`package main

import (
    "encoding/json"
    "net/http"
    "strings"
)

func main() {
    mux := http.NewServeMux()
    mux.HandleFunc("POST /api/support/vision-claim", func(w http.ResponseWriter, r *http.Request) {
        var req struct {
            OrderID     string \`json:"order_id"\`
            ImageURL    string \`json:"image_url"\`
            Description string \`json:"description"\`
        }
        json.NewDecoder(r.Body).Decode(&req)
        w.Header().Set("Content-Type", "application/json")
        img := strings.TrimSpace(req.ImageURL)
        if !strings.HasPrefix(img, "https://") && !strings.HasPrefix(img, "data:image/") {
            w.WriteHeader(400)
            w.Write([]byte(\`{"error":"图片地址格式不合法"}\`))
            return
        }
        oid := strings.TrimSpace(req.OrderID)
        if oid == "" {
            oid = "ORD-1002"
        }
        combined := strings.ToLower(img + " " + req.Description)
        for _, k := range []string{"severe", "碎裂", "断裂"} {
            if strings.Contains(combined, k) {
                json.NewEncoder(w).Encode(map[string]any{"order_id": oid, "damage_level": "severe", "action": "free_replace", "compensation": 299, "reply": "经视觉定损确认为严重破损，已为您开通极速免费换新通道。"})
                return
            }
        }
        for _, k := range []string{"minor", "划痕", "压痕"} {
            if strings.Contains(combined, k) {
                json.NewEncoder(w).Encode(map[string]any{"order_id": oid, "damage_level": "minor", "action": "coupon", "compensation": 30, "reply": "经视觉定损为轻微外观瑕疵，可为您发放 30 元补偿礼券，或选择常规换货。"})
                return
            }
        }
        json.NewEncoder(w).Encode(map[string]any{"order_id": oid, "damage_level": "none", "action": "manual_review", "compensation": 0, "reply": "图片未识别到明显破损特征，已转交人工售后专员复核。"})
    })
    http.ListenAndServe(":8080", mux)
}`,
      explain:[
       {at:'package main',to:'"strings"',text:'导入 JSON、HTTP 与字符串处理标准库。'},
       {at:'func main() {',to:'return',text:'注册 POST /api/support/vision-claim 路由，校验 ImageURL 必须以 https:// 或 data:image/ 开头，否则返回 400。'},
       {at:'oid := strings.TrimSpace(req.OrderID)',to:'combined := strings.ToLower(img + " " + req.Description)',text:'处理默认订单号，并将图片地址与文字描述合并为小写字符串。'},
       {at:'for _, k := range []string{"severe", "碎裂", "断裂"} {',to:'return',text:'匹配严重破损关键词，返回 severe 与免费换新方案。'},
       {at:'for _, k := range []string{"minor", "划痕", "压痕"} {',to:'return',text:'匹配轻微瑕疵关键词，返回 minor 与 30 元补偿券方案。'},
       {at:'json.NewEncoder(w).Encode(map[string]any{"order_id": oid, "damage_level": "none"',text:'默认返回 none 并转交人工专员复核。'},
       {at:'http.ListenAndServe(":8080", mux)',text:'在 8080 端口启动服务。'},
      ],
     },
    },
   },
  },
  {
   title:'验收：测试图片协议校验、重度破损换新与轻微瑕疵补偿',
   body:'保存下面的脚本为 checks/check_cs8.py 并运行，验证多模态图片定损接口的 5 项核心行为。',
   practice:{
    steps:[
     '保持服务在 8080 端口运行。',
     '保存下面的脚本为 checks/check_cs8.py 并运行 python checks/check_cs8.py。',
    ],
    expect:'✓ 非法图片地址（如 ftp:// 或空字符串）返回 400\n✓ 上传屏幕碎裂图片触发 damage_level=severe 与 action=free_replace\n✓ 上传外盒轻微划痕图片触发 damage_level=minor 与 30 元补偿方案\n✓ 上传无法识别特征的图片触发 manual_review 转人工复核\n✓ 支持 data:image/png;base64,... 格式图片输入\n\n通过 5 / 5',
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

s1, d1 = post("/api/support/vision-claim", {"order_id": "ORD-1002", "image_url": "ftp://bad.host/pic.jpg", "description": "碎裂"})
check("非法图片地址（如 ftp:// 或空字符串）返回 400", s1 == 400 and "error" in d1)

s2, d2 = post("/api/support/vision-claim", {"order_id": "ORD-1002", "image_url": "https://cdn.shop.com/severe_crack.jpg", "description": "打开包裹发现内胆碎裂了"})
check("上传屏幕碎裂图片触发 damage_level=severe 与 action=free_replace", s2 == 200 and d2.get("damage_level") == "severe" and d2.get("action") == "free_replace" and d2.get("compensation") == 299)

s3, d3 = post("/api/support/vision-claim", {"order_id": "ORD-1002", "image_url": "https://cdn.shop.com/box_minor.jpg", "description": "外包装盒有一点轻微划痕"})
check("上传外盒轻微划痕图片触发 damage_level=minor 与 30 元补偿方案", s3 == 200 and d3.get("damage_level") == "minor" and d3.get("action") == "coupon" and d3.get("compensation") == 30)

s4, d4 = post("/api/support/vision-claim", {"order_id": "ORD-1002", "image_url": "https://cdn.shop.com/normal_photo.jpg", "description": "请帮我看看这个商品"})
check("上传无法识别特征的图片触发 manual_review 转人工复核", s4 == 200 and d4.get("damage_level") == "none" and d4.get("action") == "manual_review")

s5, d5 = post("/api/support/vision-claim", {"order_id": "ORD-1002", "image_url": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUg==", "description": "手柄连接处断裂"})
check("支持 data:image/png;base64,... 格式图片输入", s5 == 200 and d5.get("damage_level") == "severe")

print(f"\\n通过 {passed} / 5")`,
   explain:[
    {at:'import json, sys',to:'passed = 0',text:'导入标准库并初始化测试服务地址 BASE 与通过计数器 passed。'},
    {at:'def check(name, ok):',to:'return e.code, json.loads(e.read().decode("utf-8") or "{}")',text:'定义 check 断言函数与 post 请求辅助函数。'},
    {at:'s1, d1 = post("/api/support/vision-claim", {"order_id": "ORD-1002", "image_url": "ftp://bad.host/pic.jpg", "description": "碎裂"})',to:'check("非法图片地址（如 ftp:// 或空字符串）返回 400"',text:'第 1 项：传入非法的 ftp:// 协议图片地址，验证服务端安全拦截并返回 400。'},
    {at:'s2, d2 = post("/api/support/vision-claim", {"order_id": "ORD-1002", "image_url": "https://cdn.shop.com/severe_crack.jpg"',to:'check("上传屏幕碎裂图片触发 damage_level=severe 与 action=free_replace"',text:'第 2 项：传入严重碎裂图片与描述，验证定损结果为 severe 且触发 free_replace（赔付 299 元）。'},
    {at:'s3, d3 = post("/api/support/vision-claim", {"order_id": "ORD-1002", "image_url": "https://cdn.shop.com/box_minor.jpg"',to:'check("上传外盒轻微划痕图片触发 damage_level=minor 与 30 元补偿方案"',text:'第 3 项：传入轻微划痕图片与描述，验证定损结果为 minor 且发放 30 元补偿券。'},
    {at:'s4, d4 = post("/api/support/vision-claim", {"order_id": "ORD-1002", "image_url": "https://cdn.shop.com/normal_photo.jpg"',to:'check("上传无法识别特征的图片触发 manual_review 转人工复核"',text:'第 4 项：传入无明显破损特征的图片，验证自动转交 manual_review 人工复核。'},
    {at:'s5, d5 = post("/api/support/vision-claim", {"order_id": "ORD-1002", "image_url": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUg=="',to:'check("支持 data:image/png;base64,... 格式图片输入"',text:'第 5 项：传入 data:image/png;base64 格式图片，验证 Base64 编码输入同样能正常定损。'},
    {at:'print(f"\\n通过 {passed} / 5")',text:'打印最终验收通过统计。'},
   ],
  },
 ],
 quiz:[
  {id:'cs-vi-1',q:'在电商售后“看图定损”场景中，多模态视觉大模型（VLM）与后端规则引擎的合理分工是什么？',options:['视觉模型识别破损特征并输出结构化等级，后端代码按等级执行对应理赔规则','视觉模型不仅看图，还自行决定赔付金额并绕过财务系统去调用银行转账接口','后端代码用正则表达式直接解析图片像素，不需要接入视觉模型即可完成定损','不管顾客上传什么照片，视觉模型都统一返回最高额度的极速退款以换取好评'],why:['','赔付金额上限与打款执行必须由后端受控的业务规则与风控系统把关。','正则表达式只能处理文本，无法识别图片像素中的商品破损程度。','无差别极速退款会导致严重的恶意骗保与资损，无法识别时应转人工复核。'],answer:0,explain:'让多模态模型做它最擅长的“非结构化图像理解 → 结构化定损标签（severe / minor / none）”，再由后端确定性代码执行理赔矩阵，既智能又安全。'},
  {id:'cs-vi-2',type:'multi',q:'在实现接收图片地址的多模态客服接口时，下列哪些属于必要的安全与工程实践？（多选）',options:['严格校验图片地址协议（仅允许 https 或 Base64），防范服务端请求伪造','对低置信度或未见明显破损的图片返回 manual_review，转交人工专员复核','限制单张 Base64 图片的体积上限，防止超大载荷耗尽服务端内存或 Token','针对轻微外盒压痕提供小额补偿礼券选项，在保障体验的同时降低退换货运费'],why:['','','',''],answers:[0,1,2,3],explain:'URL 协议白名单防 SSRF、低置信度转人工兜底、限制图片体积、分级柔性理赔，是多模态售后系统的四项核心工程经验。'},
  {id:'cs-vi-3',type:'judge',q:'当视觉大模型从顾客上传的照片中无法看清商品是否破损时，系统应当直接判定顾客恶意欺诈并永久封禁其账号。',answer:false,explain:'错误！拍摄光线暗、对焦模糊或破损位置隐蔽都很常见，模型无法确认时应返回 manual_review 转交人工售后专员核实，切忌武断误伤正常顾客。'},
  {id:'cs-vi-4',type:'fill',q:'在前端不经过对象存储（OSS）直接将本地小图片内联传给多模态接口时，常用的以 `data:image/png;base64,` 开头的编码方式称为 ＿ 编码（填英文术语）。',accepted:['Base64','base64','Data URL','Data URI'],explain:'Base64（Data URI）可以将小体积的二进制图片编码为纯文本字符串，直接内嵌在 JSON 请求体中传输。'},
  {id:'cs-vi-5',type:'short',q:'为什么在多模态售后定损系统中，要把破损程度划分为 severe（严重破损）、minor（轻微瑕疵）和 none（无法确认）三个档位，而不是只做“退或不退”的二元判断？',reference:'1. 降低逆向物流成本：对于外包装压痕或细微划痕（minor），发放 30 元小额补偿礼券往往就能让顾客满意留货，避免双程运费与拆封折旧损失；2. 提升重度受损体验：对于碎裂、断裂等严重破损（severe），直接开启极速免费换新通道，大幅缩短顾客等待时长；3. 兜底复杂边界情况：对于模糊不清或难以判断的照片（none），转交人工专员复核，兼顾防欺诈风控与用户体验。',points:['轻微瑕疵（minor）发小额补偿券可节省退换货运费与折旧','严重破损（severe）极速免费换新可大幅提升售后体验','无法确认（none）转人工复核可兼顾风控安全与准确率'],explain:'分级定损与差异化理赔是电商售后从“成本中心”转向“体验与留存中心”的关键策略。'},
 ],
};

export const csCopilot:AiLevel={
 id:'cs-copilot',
 title:'人工坐席工作台协同（Agent Copilot + 敏感信息脱敏）',
 summary:'转人工时不让顾客重复说第二遍：自动提炼多轮对话工单摘要、生成 3 条坐席推荐回复草稿，并对手机号与身份证脱敏',
 lessons:[
  {
   title:'人机协同：AI 怎样给人工坐席当“副驾驶”',
   body:'任何成熟的企业客服系统都不会追求“100% 纯 AI 无人化”——通常 80% 的高频标准问题由 AI 自动闭环，而剩下 20% 涉及复杂纠纷、特殊审批或高情绪安抚的对话，必须无缝转接给人工坐席。\n顾客最反感的体验就是：跟机器人聊了十句，转到人工客服后对方第一句话又是“请问您的订单号是多少？遇到什么问题了？”。\n为此，我们需要在转人工瞬间触发 Agent Copilot（坐席副驾驶），完成三件事：\n一、个人敏感信息脱敏（PII Masking）：在把多轮对话写入工单日志或发给外部模型生成摘要前，必须用正则将中国大陆 11 位手机号（如 13812345678）脱敏为 138****5678，防止明文隐私泄露；\n二、结构化交接摘要（Handoff Summary）：自动从多轮历史中提取出订单号（order_id）并汇总脱敏后的顾客核心诉求（masked_summary），让人工客服一眼看懂来龙去脉；\n三、推荐回复草稿（Suggested Replies）：为人工客服预生成 2 ~ 3 条得体的安抚与处理草稿，坐席只需点选微调即可一键发送，将平均响应时长缩短一半以上。',
  },
  {
   title:'任务：实现 PII 隐私脱敏与坐席交接摘要接口',
   body:'实现人工坐席交接副驾驶接口 POST /api/support/copilot/handoff：\n一、接收 {"session_id": "s1", "messages": [{"role": "user", "content": "..."}, ...]}（messages 为空列表时返回 400）；\n二、PII 手机号脱敏：扫描所有消息文本，将匹配 1[3-9]\\d{9} 的 11 位手机号替换为前 3 位 + "****" + 后 4 位（如 138****5678），并记录布尔值 pii_masked（是否触发了脱敏）；\n三、提取订单号与生成交接卡片：从消息中提取 ORD-\\d+（未找到则为 null），将脱敏后的用户消息拼接为 masked_summary，并生成不少于 2 条坐席推荐回复草稿 suggested_replies；\n四、返回 {"session_id": sid, "order_id": oid, "masked_summary": ..., "suggested_replies": [...], "pii_masked": bool}。',
   variants:{
    python:{
     practice:{
      steps:[
       '在 main.py 中实现 POST /api/support/copilot/handoff。',
       '使用正则 re.sub 将 1[3-9]\\d{9} 脱敏为 \\1****\\2，并准确标记 pii_masked。',
       '提取订单号 ORD-\\d+，汇总脱敏摘要 masked_summary 并返回至少 2 条 suggested_replies。',
      ],
      expect:'手机号被干净脱敏且原文不外泄，pii_masked 标记为 True，准确提取订单号并生成推荐回复草稿。',
     },
     code:`import re
from fastapi import FastAPI
from fastapi.responses import JSONResponse

app = FastAPI()

PHONE_RE = re.compile(r"(1[3-9]\\d)\\d{4}(\\d{4})")

# TODO：实现 POST /api/support/copilot/handoff
#       1. 校验 messages 非空，否则返回 400
#       2. 对消息中的 11 位手机号脱敏并标记 pii_masked
#       3. 提取 order_id，生成 masked_summary 与 suggested_replies`,
     explain:[
      {at:'import re',to:'app = FastAPI()',text:'导入正则表达式模块 re 与 FastAPI 组件，创建应用实例。'},
      {at:'PHONE_RE = re.compile(r"(1[3-9]\\d)\\d{4}(\\d{4})")',text:'预编译中国大陆 11 位手机号正则：捕获前 3 位与后 4 位，中间 4 位用于替换为星号。'},
     ],
     solution:{
      code:`import re
from fastapi import FastAPI
from fastapi.responses import JSONResponse

app = FastAPI()

PHONE_RE = re.compile(r"(1[3-9]\\d)\\d{4}(\\d{4})")


@app.post("/api/support/copilot/handoff")
def copilot_handoff(body: dict):
    sid = str(body.get("session_id", "default")).strip() or "default"
    msgs = body.get("messages") or []
    if not isinstance(msgs, list) or len(msgs) == 0:
        return JSONResponse({"error": "会话消息列表不能为空"}, status_code=400)
    pii_masked = False
    oid = None
    user_parts = []
    for m in msgs:
        raw = str(m.get("content", ""))
        if PHONE_RE.search(raw):
            pii_masked = True
        masked = PHONE_RE.sub(r"\\1****\\2", raw)
        om = re.search(r"ORD-\\d+", masked)
        if om and not oid:
            oid = om.group(0)
        if m.get("role") == "user":
            user_parts.append(masked)
    summary = "；".join(user_parts)
    replies = [
        f"您好，我是高级售后专员，已看到您关于订单 {oid or '当前商品'} 的反馈，正在为您优先加急处理。",
        "非常抱歉给您带来不便，核实后我们会立即通过您预留的脱敏手机号与您同步处理结果。",
        "请问您更倾向于直接为您办理极速换新，还是优先发放售后补偿礼券呢？",
    ]
    return {
        "session_id": sid,
        "order_id": oid,
        "masked_summary": f"顾客诉求摘要：{summary}",
        "suggested_replies": replies,
        "pii_masked": pii_masked,
    }`,
      explain:[
       {at:'import re',to:'PHONE_RE = re.compile(r"(1[3-9]\\d)\\d{4}(\\d{4})")',text:'导入依赖并定义 11 位手机号脱敏正则表达式。'},
       {at:'@app.post("/api/support/copilot/handoff")',to:'return JSONResponse({"error": "会话消息列表不能为空"}, status_code=400)',text:'定义坐席交接接口，校验 messages 必须是非空列表，为空则返回 400。'},
       {at:'pii_masked = False',to:'user_parts = []',text:'初始化脱敏标记 pii_masked、订单号 oid 与顾客发言列表 user_parts。'},
       {at:'for m in msgs:',to:'masked = PHONE_RE.sub(r"\\1****\\2", raw)',text:'遍历每条消息：若检测到手机号则将 pii_masked 设为 True，并用正则把中间 4 位替换为 ****。'},
       {at:'om = re.search(r"ORD-\\d+", masked)',to:'user_parts.append(masked)',text:'从消息中提取订单号 ORD-xxxx，并将脱敏后的顾客消息收集到 user_parts 中。'},
       {at:'summary = "；".join(user_parts)',to:'"请问您更倾向于直接为您办理极速换新，还是优先发放售后补偿礼券呢？",',text:'将顾客多轮核心诉求拼接成一句话摘要，并生成 3 条带订单上下文的坐席推荐回复草稿。'},
       {at:'return {',to:'"pii_masked": pii_masked,',text:'返回完整的坐席交接卡片数据，包含脱敏摘要、推荐回复列表与隐私脱敏状态标记。'},
      ],
     },
    },
    node:{
     practice:{
      steps:[
       '在 app.js 中实现 POST /api/support/copilot/handoff。',
      ],
      expect:'通过手机号脱敏、订单号提取、交接摘要与推荐草稿全部测试。',
     },
     code:`// TODO：在 app.js 中实现 POST /api/support/copilot/handoff`,
     explain:[
      {at:'// TODO',text:'使用正则 /(1[3-9]\\d)\\d{4}(\\d{4})/g 替换手机号为 $1****$2。'},
     ],
     solution:{
      code:`const express = require("express");
const app = express();
app.use(express.json());

const PHONE_RE = /(1[3-9]\\d)\\d{4}(\\d{4})/g;

app.post("/api/support/copilot/handoff", (req, res) => {
  const sid = String(req.body?.session_id ?? "default").trim() || "default";
  const msgs = req.body?.messages;
  if (!Array.isArray(msgs) || msgs.length === 0) {
    return res.status(400).json({ error: "会话消息列表不能为空" });
  }
  let piiMasked = false;
  let oid = null;
  const userParts = [];
  for (const m of msgs) {
    const raw = String(m?.content ?? "");
    if (/(1[3-9]\\d)\\d{4}(\\d{4})/.test(raw)) piiMasked = true;
    const masked = raw.replace(PHONE_RE, "$1****$2");
    const om = masked.match(/ORD-\\d+/);
    if (om && !oid) oid = om[0];
    if (m?.role === "user") userParts.push(masked);
  }
  const replies = [
    \`您好，我是人工专员，已看到您关于订单 \${oid || "当前商品"} 的诉求，马上为您加急核实。\`,
    "非常抱歉让您久等了，处理结果稍后会发送至您预留的手机号码。",
  ];
  res.json({
    session_id: sid,
    order_id: oid,
    masked_summary: \`顾客诉求摘要：\${userParts.join("；")}\`,
    suggested_replies: replies,
    pii_masked: piiMasked,
  });
});

app.listen(8080);`,
      explain:[
       {at:'const express = require("express");',to:'const PHONE_RE = /(1[3-9]\\d)\\d{4}(\\d{4})/g;',text:'引入 Express 并定义匹配 11 位手机号的全局正则表达式。'},
       {at:'app.post("/api/support/copilot/handoff", (req, res) => {',to:'return res.status(400).json({ error: "会话消息列表不能为空" });',text:'校验 messages 是否为非空数组，为空则返回 400。'},
       {at:'let piiMasked = false;',to:'if (m?.role === "user") userParts.push(masked);',text:'遍历消息列表，检测并脱敏手机号，提取订单号 ORD-xxxx，收集脱敏后的用户发言。'},
       {at:'const replies = [',to:'pii_masked: piiMasked,',text:'生成坐席推荐回复草稿并返回完整的交接卡片 JSON。'},
       {at:'app.listen(8080);',text:'在 8080 端口启动服务。'},
      ],
     },
    },
    go:{
     practice:{
      steps:[
       '在 main.go 中实现 POST /api/support/copilot/handoff。',
      ],
      expect:'通过手机号脱敏、订单号提取、交接摘要与推荐草稿全部测试。',
     },
     code:`// TODO：在 main.go 中实现 POST /api/support/copilot/handoff`,
     explain:[
      {at:'// TODO',text:'使用 regexp.MustCompile(`(1[3-9]\\d)\\d{4}(\\d{4})`) 完成手机号脱敏。'},
     ],
     solution:{
      code:`package main

import (
    "encoding/json"
    "net/http"
    "regexp"
    "strings"
)

var (
    phoneReg = regexp.MustCompile(\`(1[3-9]\\d)\\d{4}(\\d{4})\`)
    ordReg   = regexp.MustCompile(\`ORD-\\d+\`)
)

func main() {
    mux := http.NewServeMux()
    mux.HandleFunc("POST /api/support/copilot/handoff", func(w http.ResponseWriter, r *http.Request) {
        var req struct {
            SessionID string \`json:"session_id"\`
            Messages  []struct {
                Role    string \`json:"role"\`
                Content string \`json:"content"\`
            } \`json:"messages"\`
        }
        json.NewDecoder(r.Body).Decode(&req)
        w.Header().Set("Content-Type", "application/json")
        if len(req.Messages) == 0 {
            w.WriteHeader(400)
            w.Write([]byte(\`{"error":"会话消息列表不能为空"}\`))
            return
        }
        sid := strings.TrimSpace(req.SessionID)
        if sid == "" {
            sid = "default"
        }
        piiMasked := false
        var oid any = nil
        var parts []string
        for _, m := range req.Messages {
            if phoneReg.MatchString(m.Content) {
                piiMasked = true
            }
            masked := phoneReg.ReplaceAllString(m.Content, "${1}****${2}")
            if found := ordReg.FindString(masked); found != "" && oid == nil {
                oid = found
            }
            if m.Role == "user" {
                parts = append(parts, masked)
            }
        }
        replies := []string{
            "您好，我是人工售后专员，已了解您的订单诉求，正在为您加急处理。",
            "非常抱歉给您带来不便，核实结果将通过您预留的手机号及时通知您。",
        }
        json.NewEncoder(w).Encode(map[string]any{
            "session_id":        sid,
            "order_id":          oid,
            "masked_summary":    "顾客诉求摘要：" + strings.Join(parts, "；"),
            "suggested_replies": replies,
            "pii_masked":        piiMasked,
        })
    })
    http.ListenAndServe(":8080", mux)
}`,
      explain:[
       {at:'package main',to:'ordReg   = regexp.MustCompile(`ORD-\\d+`)',text:'导入标准库并预编译手机号脱敏正则与订单号提取正则。'},
       {at:'func main() {',to:'return',text:'注册 POST /api/support/copilot/handoff 路由，若 Messages 为空切片则返回 400。'},
       {at:'sid := strings.TrimSpace(req.SessionID)',to:'parts = append(parts, masked)',text:'遍历消息列表，检测并替换手机号中间 4 位为 ****，提取订单号并汇总用户发言。'},
       {at:'replies := []string{',to:'"pii_masked":        piiMasked,',text:'构造坐席推荐回复草稿切片并返回包含脱敏摘要与 pii_masked 标记的 JSON。'},
       {at:'http.ListenAndServe(":8080", mux)',text:'在 8080 端口启动服务。'},
      ],
     },
    },
   },
  },
  {
   title:'验收：测试手机号脱敏、工单摘要提取与推荐回复草稿',
   body:'保存下面的脚本为 checks/check_cs9.py 并运行，验证坐席副驾驶接口的隐私脱敏与交接质量。',
   practice:{
    steps:[
     '保持服务在 8080 端口运行。',
     '保存下面的脚本为 checks/check_cs9.py 并运行 python checks/check_cs9.py。',
    ],
    expect:'✓ 对话中的手机号 13812345678 被自动脱敏为 138****5678 且原文不泄露\n✓ pii_masked 字段准确标记为 True\n✓ 自动从多轮历史中提取出订单号 ORD-1002\n✓ 生成不少于 2 条坐席推荐回复草稿 suggested_replies\n✓ 空消息列表返回 400\n\n通过 5 / 5',
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

msgs = [
    {"role": "user", "content": "你好，我的订单 ORD-1002 收到后一直充不上电"},
    {"role": "assistant", "content": "抱歉给您带来不便，请问方便留一下您的联系电话吗？"},
    {"role": "user", "content": "可以，打我手机 13812345678，尽快帮我转人工处理"},
]
s, d = post("/api/support/copilot/handoff", {"session_id": "cp-1", "messages": msgs})
summary = str(d.get("masked_summary", ""))

check("对话中的手机号 13812345678 被自动脱敏为 138****5678 且原文不泄露", s == 200 and "138****5678" in summary and "13812345678" not in summary)
check("pii_masked 字段准确标记为 True", s == 200 and d.get("pii_masked") is True)
check("自动从多轮历史中提取出订单号 ORD-1002", s == 200 and d.get("order_id") == "ORD-1002")
check("生成不少于 2 条坐席推荐回复草稿 suggested_replies", s == 200 and isinstance(d.get("suggested_replies"), list) and len(d.get("suggested_replies")) >= 2)

s_err, _ = post("/api/support/copilot/handoff", {"session_id": "cp-empty", "messages": []})
check("空消息列表返回 400", s_err == 400)

print(f"\\n通过 {passed} / 5")`,
   explain:[
    {at:'import json, sys',to:'return e.code, json.loads(e.read().decode("utf-8") or "{}")',text:'导入标准库并定义 check 断言函数与 post 请求函数。'},
    {at:'msgs = [',to:'summary = str(d.get("masked_summary", ""))',text:'构造包含订单号 ORD-1002 与明文手机号 13812345678 的三轮对话，调用坐席交接接口并取出摘要文本。'},
    {at:'check("对话中的手机号 13812345678 被自动脱敏为 138****5678 且原文不泄露"',text:'第 1 项：验证摘要中出现了脱敏后的 138****5678，且原始明文手机号已不存在。'},
    {at:'check("pii_masked 字段准确标记为 True"',text:'第 2 项：验证 pii_masked 准确标记为 True。'},
    {at:'check("自动从多轮历史中提取出订单号 ORD-1002"',text:'第 3 项：验证从历史对话中提取出了订单号 ORD-1002。'},
    {at:'check("生成不少于 2 条坐席推荐回复草稿 suggested_replies"',text:'第 4 项：验证返回了至少 2 条坐席推荐回复草稿。'},
    {at:'s_err, _ = post("/api/support/copilot/handoff", {"session_id": "cp-empty", "messages": []})',to:'check("空消息列表返回 400"',text:'第 5 项：传入空消息数组，验证返回 400 状态码。'},
    {at:'print(f"\\n通过 {passed} / 5")',text:'打印最终验收结果。'},
   ],
  },
 ],
 quiz:[
  {id:'cs-cp-1',q:'当 AI 客服遇到无法独立解决的复杂诉求需要转接人工坐席时，Agent Copilot（坐席副驾驶）的核心作用是什么？',options:['自动提炼多轮对话摘要、提取订单号并生成推荐回复草稿，让坐席无缝接手','直接切断顾客的当前会话连接，要求顾客重新拨打人工热线并从头讲述问题','在后台代替人工坐席直接发送未经审核的赔偿承诺，从而节省客服打字时间','把顾客的明文身份证号与银行卡号直接发到公司全员大群里请求各部门协助'],why:['','让顾客重新阐述问题会严重损害服务体验，违背了人机协同的初衷。','高风险转人工场景下，AI 应提供草稿由人工确认发送，而非越权直接承诺。','明文广播敏感隐私信息严重违反数据安全与隐私合规要求。'],answer:0,explain:'优秀的 Agent Copilot 能把转人工时的上下文损耗降到最低：坐席接起瞬间就能看到结构化摘要、关联订单和推荐话术草稿。'},
  {id:'cs-cp-2',type:'multi',q:'在将客服对话日志发送给外部大模型或展示在普通坐席工作台之前，关于个人敏感信息（PII）脱敏的做法哪些是正确的？（多选）',options:['使用正则表达式把中国大陆手机号中间四位替换为星号掩码后再展示','对身份证号、银行卡号等高敏字段做掩码处理，避免明文写入日志或外发','在交接记录中保留隐私脱敏审计标记，方便安全合规团队统计脱敏触发率','需要联系顾客时由后端受控呼叫系统按会话关联拨号，不向前端暴露明文'],why:['','','',''],answers:[0,1,2,3],explain:'手机号与证件号掩码、外发前脱敏、记录合规审计标记、通过虚拟号或受控后端外呼，是客服系统隐私保护的标准实践。'},
  {id:'cs-cp-3',type:'judge',q:'为了让外部大模型生成的工单摘要尽量详细，我们应该把顾客在对话中发来的明文身份证照片、银行卡密码和完整手机号原封不动地发给公有云大模型接口。',answer:false,explain:'错误！向外部大模型发送数据前必须经过 PII 敏感信息脱敏（Masking / Redaction），严禁将明文密码、身份证号、完整手机号等隐私数据直接外传。'},
  {id:'cs-cp-4',type:'fill',q:'在数据安全与隐私合规领域，像手机号、身份证号、家庭住址这类能够单独或结合识别特定自然人身份的数据，通常简称为 ＿（填三个大写英文字母缩写）。',accepted:['PII','pii'],explain:'PII 是 Personally Identifiable Information（个人身份信息 / 个人敏感信息）的通用缩写。'},
  {id:'cs-cp-5',type:'short',q:'请结合智能客服的完整生命周期，谈谈为什么“AI 自动接待 + 人工坐席 Copilot 协同”比单纯追求“100% 撤掉人工客服”更符合真实企业的落地需求？',reference:'1. 遵循二八定律控制风险：约 80% 的查单、退换政策咨询等高频标准问题可由 AI 低成本秒级闭环，而 20% 涉及高客单价理赔、复杂纠纷或强烈负面情绪的案例由人工兜底更稳妥；2. 消除转接断层体验：通过 Agent Copilot 自动生成脱敏交接摘要与订单卡片，顾客转人工后无需重复讲述第二遍；3. 倍增人工坐席人效：AI 实时提供 2~3 条推荐回复草稿与知识库依据，帮助人工坐席大幅缩短平均处理时长（AHT）。',points:['80% 标准问题 AI 闭环，20% 复杂情绪与高风险问题人工兜底','自动生成脱敏交接摘要与提取订单，避免顾客转人工后重复描述','提供推荐回复草稿辅助人工坐席，大幅缩短平均处理时长'],explain:'人机协同（Human-in-the-loop & Copilot）既发挥了 AI 的高并发低成本优势，又守住了复杂场景的服务温度与风控底线。'},
 ],
};
