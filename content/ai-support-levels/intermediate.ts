// 项目实战“智能 AI 客服实战”进阶关卡：第 5 关（混合检索与重排）与第 6 关（多意图路由、情绪识别与前端工作台）。
import type {AiLevel} from '../journey';

export const csHybrid:AiLevel={
 id:'cs-hybrid',
 title:'向量检索与混合重排（Hybrid RAG + Rerank）',
 summary:'解决同义词漏检与长文档噪声：结合关键词 BM25、语义向量余弦相似度、RRF 倒数秩融合与 Rerank 精排过滤',
 lessons:[
  {
   title:'为什么关键词检索会漏掉“耳麦没声音”',
   body:'上一关我们用关键词匹配实现了基础 RAG，但在真实商城里很快就会遇到两类尴尬：\n一、同义词漏检（词汇鸿沟）：知识库标题写的是《耳机无声与配对故障》，而顾客问的是“耳麦左耳没动静怎么回事”或“充不进电”。纯关键词（BM25）搜不到“无声”“充电”，直接返回 0 分；\n二、纯向量检索的短板：语义向量（Embedding）能听懂“耳麦没动静 ≈ 耳机无声”，但对精确的商品型号（如 ProMax-2025）、故障码（如 ERR-502）、订单号却很迟钝，容易把 ERR-501 的修法张冠李戴。\n因此企业级 RAG 的标准答案是「混合检索（Hybrid Search）」：同时跑一路关键词检索（保精确型号与错误码）和一路向量检索（保同义词与口语表达），再用 RRF（Reciprocal Rank Fusion，倒数秩融合）公式把两路排名合二为一：',
   code:`import math

def cosine_sim(a: list[float], b: list[float]) -> float:
    dot = sum(x * y for x, y in zip(a, b))
    norm = math.sqrt(sum(x * x for x in a)) * math.sqrt(sum(y * y for y in b))
    return dot / norm if norm else 0.0

def rrf_score(kw_rank: int, vec_rank: int, k: int = 60) -> float:
    return round(1.0 / (k + kw_rank) + 1.0 / (k + vec_rank), 4)`,
   explain:[
    {at:'import math',text:'导入数学库 math，用来算平方根 sqrt。'},
    {at:'def cosine_sim(a: list[float], b: list[float]) -> float:',to:'dot = sum(x * y for x, y in zip(a, b))',text:'余弦相似度函数：衡量两个向量方向有多接近。先用 zip 把两个向量的对应维度配对相乘再求和，算出点积 dot。'},
    {at:'norm = math.sqrt(sum(x * x for x in a))',to:'return dot / norm if norm else 0.0',text:'分别算出两个向量的长度（模长）并相乘得到 norm；点积除以模长乘积就是余弦值（-1 到 1 之间，越接近 1 语义越相似）。'},
    {at:'def rrf_score(kw_rank: int, vec_rank: int, k: int = 60) -> float:',to:'return round(1.0 / (k + kw_rank) + 1.0 / (k + vec_rank), 4)',text:'RRF 倒数秩融合：不直接加两路分数（因为关键词分和向量分单位不同），而是按各自的名次（rank，从 1 开始）算 1/(k+rank) 再相加，兼顾两路检索靠前的文档。'},
   ],
  },
  {
   title:'重排序（Rerank）与相关性阈值截断',
   body:'双路召回（比如各取前 10 条）合并后，我们通常还会做两步精加工：\n一、重排序（Rerank）：使用交叉编码器（Cross-Encoder Reranker，如 BGE-Reranker）或加权融合打分，把顾客问题和候选文档放在一起逐字比对，算出 0～1 之间的精排相关性分数（rerank_score）；\n二、相关性阈值截断（min_score）：如果最高分文档的 rerank_score 还不到阈值（例如 0.30），说明顾客问的是“今天天气怎么样”这类无关问题。此时必须果断截断丢弃，绝不能把低分噪声硬塞进 Prompt 误导大模型，而是直接返回空列表并触发 transfer_human: true。',
  },
  {
   title:'任务：实现混合检索与阈值重排接口',
   body:'在客服服务中实现混合检索与阈值过滤接口 POST /api/support/hybrid-search：\n一、内置 4 条知识文档：kb-audio（耳机无声与配对故障）、kb-charge（充电缓慢与电池保养）、kb-price（七天保价与退差价规则）、kb-err502（固件升级报错 ERR-502 修复），每条包含精确词 keywords 与语义同义词组 synonyms；\n二、接收 {"query": "用户问题", "min_score": 0.3}，若 query 为空返回 400 和 {"error": "查询词不能为空"}；\n三、计算混合重排分：命中的 keywords 每个计 0.4 分，命中的 synonyms 每个计 0.35 分，rerank_score = round(min(1.0, kw_score + vec_score), 2)；\n四、过滤掉 rerank_score < min_score（默认 0.3）的文档，按分数从高到低排序，返回 {"results": [{"id", "title", "score", "content"}], "transfer_human": len(results) == 0}。',
   variants:{
    python:{
     practice:{
      steps:[
       '在 main.py 中定义带 keywords 与 synonyms 的 HYBRID_KB 知识库列表。',
       '实现混合打分、min_score 阈值截断与降序排列逻辑。',
       '暴露 POST /api/support/hybrid-search 接口并在 8080 端口启动服务。',
      ],
      expect:'问“耳麦左耳没声音”命中 kb-audio；问“升级提示 ERR-502”命中 kb-err502 且排第一；问“今天天气怎么样”返回 results=[] 且 transfer_human=True。',
     },
     code:`HYBRID_KB = [
    {"id": "kb-audio", "title": "耳机无声与配对故障", "keywords": ["无声", "配对", "蓝牙", "断连"], "synonyms": ["耳麦", "没声音", "没动静", "左耳", "右耳", "连不上", "听不见"], "content": "请将双耳放回充电仓长按功能键 10 秒重置蓝牙，重新搜索配对即可恢复声音。"},
    {"id": "kb-charge", "title": "充电缓慢与电池保养", "keywords": ["充电", "电池", "续航", "发热"], "synonyms": ["充不进", "掉电快", "没电", "充不满", "充电仓不亮"], "content": "请使用酒精棉签清洁耳机底部金属触点，并更换 5V/1A 标准充电器尝试。"},
    {"id": "kb-price", "title": "七天保价与退差价规则", "keywords": ["保价", "差价", "价保", "补贴"], "synonyms": ["降价", "买贵了", "便宜了", "刚买就降", "退差价"], "content": "签收后 7 天内如遇官方直降，可在订单页点击申请价保，系统自动退还差额。"},
    {"id": "kb-err502", "title": "固件升级报错 ERR-502 修复", "keywords": ["ERR-502", "固件", "升级失败", "502"], "synonyms": ["更新卡住", "刷机报错", "版本更新失败"], "content": "出现 ERR-502 表示固件包校验中断，请关闭手机省电模式并保持耳机电量高于 50% 重试。"},
]

# TODO：实现 POST /api/support/hybrid-search，结合 keywords(0.4) 与 synonyms(0.35) 计算 rerank_score 并按 min_score 过滤`,
     explain:[
      {at:'HYBRID_KB = [',to:'"id": "kb-err502"',text:'混合检索知识库：每篇文档既有精确关键词 keywords（模拟 BM25 词面匹配，含 ERR-502 等故障码），又有口语同义词组 synonyms（模拟语义向量召回）。'},
     ],
     solution:{
      code:`from fastapi import FastAPI
from fastapi.responses import JSONResponse

app = FastAPI()

HYBRID_KB = [
    {"id": "kb-audio", "title": "耳机无声与配对故障", "keywords": ["无声", "配对", "蓝牙", "断连"], "synonyms": ["耳麦", "没声音", "没动静", "左耳", "右耳", "连不上", "听不见"], "content": "请将双耳放回充电仓长按功能键 10 秒重置蓝牙，重新搜索配对即可恢复声音。"},
    {"id": "kb-charge", "title": "充电缓慢与电池保养", "keywords": ["充电", "电池", "续航", "发热"], "synonyms": ["充不进", "掉电快", "没电", "充不满", "充电仓不亮"], "content": "请使用酒精棉签清洁耳机底部金属触点，并更换 5V/1A 标准充电器尝试。"},
    {"id": "kb-price", "title": "七天保价与退差价规则", "keywords": ["保价", "差价", "价保", "补贴"], "synonyms": ["降价", "买贵了", "便宜了", "刚买就降", "退差价"], "content": "签收后 7 天内如遇官方直降，可在订单页点击申请价保，系统自动退还差额。"},
    {"id": "kb-err502", "title": "固件升级报错 ERR-502 修复", "keywords": ["ERR-502", "固件", "升级失败", "502"], "synonyms": ["更新卡住", "刷机报错", "版本更新失败"], "content": "出现 ERR-502 表示固件包校验中断，请关闭手机省电模式并保持耳机电量高于 50% 重试。"},
]


@app.post("/api/support/hybrid-search")
def hybrid_search(body: dict):
    q = str(body.get("query", "")).strip()
    if not q:
        return JSONResponse({"error": "查询词不能为空"}, status_code=400)
    min_score = float(body.get("min_score", 0.3))
    results = []
    for doc in HYBRID_KB:
        kw_hits = sum(1 for w in doc["keywords"] if w in q)
        vec_hits = sum(1 for s in doc["synonyms"] if s in q)
        score = round(min(1.0, kw_hits * 0.4 + vec_hits * 0.35), 2)
        if score >= min_score:
            results.append({"id": doc["id"], "title": doc["title"], "score": score, "content": doc["content"]})
    results.sort(key=lambda x: -x["score"])
    return {"results": results, "transfer_human": len(results) == 0}`,
      explain:[
       {at:'from fastapi import FastAPI',to:'app = FastAPI()',text:'导入 FastAPI 与 JSONResponse，创建应用实例 app。'},
       {at:'HYBRID_KB = [',to:'"id": "kb-err502"',text:'定义 4 条商城知识文档，分别覆盖音频故障、充电保养、七天保价与 ERR-502 固件报错。'},
       {at:'@app.post("/api/support/hybrid-search")',to:'return JSONResponse({"error": "查询词不能为空"}, status_code=400)',text:'注册混合检索接口：提取并清理 query，若为空直接返回 400 错误。'},
       {at:'min_score = float(body.get("min_score", 0.3))',to:'results = []',text:'读取相关性过滤阈值 min_score（默认 0.3），初始化结果列表。'},
       {at:'for doc in HYBRID_KB:',to:'score = round(min(1.0, kw_hits * 0.4 + vec_hits * 0.35), 2)',text:'遍历每篇文档：分别统计精确关键词命中数（权重 0.4）与语义同义词命中数（权重 0.35），融合后封顶 1.0 并保留两位小数。'},
       {at:'if score >= min_score:',to:'results.append({"id": doc["id"]',text:'阈值截断：只有得分达到 min_score 的文档才进入候选结果，过滤掉低分噪声。'},
       {at:'results.sort(key=lambda x: -x["score"])',to:'return {"results": results, "transfer_human": len(results) == 0}',text:'按精排分数从高到低排序；若过滤后没有任何文档命中，将 transfer_human 设为 True 提示转人工。'},
      ],
     },
    },
    node:{
     practice:{
      steps:[
       '在 app.js 中定义 HYBRID_KB 数组，实现 POST /api/support/hybrid-search。',
       '按 keywords(0.4) + synonyms(0.35) 计算混合分，按 min_score 过滤并降序返回。',
      ],
      expect:'同义词与精确错误码均能召回，无关问题被阈值过滤并触发 transfer_human: true。',
     },
     code:`// TODO：在 app.js 中定义 HYBRID_KB 并实现 POST /api/support/hybrid-search`,
     explain:[
      {at:'// TODO',text:'确保返回的每个结果项包含 id、title、score、content 四个字段。'},
     ],
     solution:{
      code:`const express = require("express");
const app = express();
app.use(express.json());

const HYBRID_KB = [
  { id: "kb-audio", title: "耳机无声与配对故障", keywords: ["无声", "配对", "蓝牙", "断连"], synonyms: ["耳麦", "没声音", "没动静", "左耳", "右耳", "连不上", "听不见"], content: "请将双耳放回充电仓长按功能键 10 秒重置蓝牙，重新搜索配对即可恢复声音。" },
  { id: "kb-charge", title: "充电缓慢与电池保养", keywords: ["充电", "电池", "续航", "发热"], synonyms: ["充不进", "掉电快", "没电", "充不满", "充电仓不亮"], content: "请使用酒精棉签清洁耳机底部金属触点，并更换 5V/1A 标准充电器尝试。" },
  { id: "kb-price", title: "七天保价与退差价规则", keywords: ["保价", "差价", "价保", "补贴"], synonyms: ["降价", "买贵了", "便宜了", "刚买就降", "退差价"], content: "签收后 7 天内如遇官方直降，可在订单页点击申请价保，系统自动退还差额。" },
  { id: "kb-err502", title: "固件升级报错 ERR-502 修复", keywords: ["ERR-502", "固件", "升级失败", "502"], synonyms: ["更新卡住", "刷机报错", "版本更新失败"], content: "出现 ERR-502 表示固件包校验中断，请关闭手机省电模式并保持耳机电量高于 50% 重试。" },
];

app.post("/api/support/hybrid-search", (req, res) => {
  const q = String(req.body?.query ?? "").trim();
  if (!q) return res.status(400).json({ error: "查询词不能为空" });
  const minScore = Number(req.body?.min_score ?? 0.3);
  const results = HYBRID_KB.map((d) => {
    const kw = d.keywords.filter((w) => q.includes(w)).length;
    const vec = d.synonyms.filter((s) => q.includes(s)).length;
    const score = Math.round(Math.min(1, kw * 0.4 + vec * 0.35) * 100) / 100;
    return { id: d.id, title: d.title, score, content: d.content };
  })
    .filter((r) => r.score >= minScore)
    .sort((a, b) => b.score - a.score);
  res.json({ results, transfer_human: results.length === 0 });
});

app.listen(8080);`,
      explain:[
       {at:'const express = require("express");',to:'app.use(express.json());',text:'引入 Express 并启用 JSON 请求体解析中间件。'},
       {at:'const HYBRID_KB = [',to:'id: "kb-err502"',text:'定义内置的 4 条商城知识库文档，包含精确关键词与口语同义词列表。'},
       {at:'app.post("/api/support/hybrid-search", (req, res) => {',to:'const minScore = Number(req.body?.min_score ?? 0.3);',text:'校验查询词非空，并读取最低相关性阈值 min_score（默认 0.3）。'},
       {at:'const results = HYBRID_KB.map((d) => {',to:'return { id: d.id, title: d.title, score, content: d.content };',text:'计算每篇文档的关键词分与同义词分，融合后四舍五入保留两位小数。'},
       {at:'.filter((r) => r.score >= minScore)',to:'res.json({ results, transfer_human: results.length === 0 });',text:'过滤低于阈值的噪声文档，按分数降序排列，并在无结果时将 transfer_human 置为 true。'},
       {at:'app.listen(8080);',text:'监听 8080 端口启动服务。'},
      ],
     },
    },
    go:{
     practice:{
      steps:[
       '在 main.go 中定义带 Keywords 与 Synonyms 的结构体切片，实现 POST /api/support/hybrid-search。',
      ],
      expect:'通过同义词召回、精确错误码排序与阈值截断全部测试。',
     },
     code:`// TODO：在 main.go 中定义 HYBRID_KB 并实现 POST /api/support/hybrid-search`,
     explain:[
      {at:'// TODO',text:'注意未命中任何文档时 results 应编码为空数组 []。'},
     ],
     solution:{
      code:`package main

import (
    "encoding/json"
    "math"
    "net/http"
    "sort"
    "strings"
)

type HDoc struct {
    ID       string
    Title    string
    Keywords []string
    Synonyms []string
    Content  string
}

type SearchResult struct {
    ID      string  \`json:"id"\`
    Title   string  \`json:"title"\`
    Score   float64 \`json:"score"\`
    Content string  \`json:"content"\`
}

var hybridKB = []HDoc{
    {"kb-audio", "耳机无声与配对故障", []string{"无声", "配对", "蓝牙", "断连"}, []string{"耳麦", "没声音", "没动静", "左耳", "右耳", "连不上", "听不见"}, "请将双耳放回充电仓长按功能键 10 秒重置蓝牙，重新搜索配对即可恢复声音。"},
    {"kb-charge", "充电缓慢与电池保养", []string{"充电", "电池", "续航", "发热"}, []string{"充不进", "掉电快", "没电", "充不满", "充电仓不亮"}, "请使用酒精棉签清洁耳机底部金属触点，并更换 5V/1A 标准充电器尝试。"},
    {"kb-price", "七天保价与退差价规则", []string{"保价", "差价", "价保", "补贴"}, []string{"降价", "买贵了", "便宜了", "刚买就降", "退差价"}, "签收后 7 天内如遇官方直降，可在订单页点击申请价保，系统自动退还差额。"},
    {"kb-err502", "固件升级报错 ERR-502 修复", []string{"ERR-502", "固件", "升级失败", "502"}, []string{"更新卡住", "刷机报错", "版本更新失败"}, "出现 ERR-502 表示固件包校验中断，请关闭手机省电模式并保持耳机电量高于 50% 重试。"},
}

func main() {
    mux := http.NewServeMux()
    mux.HandleFunc("POST /api/support/hybrid-search", func(w http.ResponseWriter, r *http.Request) {
        var req struct {
            Query    string   \`json:"query"\`
            MinScore *float64 \`json:"min_score"\`
        }
        json.NewDecoder(r.Body).Decode(&req)
        q := strings.TrimSpace(req.Query)
        w.Header().Set("Content-Type", "application/json")
        if q == "" {
            w.WriteHeader(400)
            w.Write([]byte(\`{"error":"查询词不能为空"}\`))
            return
        }
        minScore := 0.3
        if req.MinScore != nil {
            minScore = *req.MinScore
        }
        results := []SearchResult{}
        for _, d := range hybridKB {
            kw, vec := 0.0, 0.0
            for _, w := range d.Keywords {
                if strings.Contains(q, w) {
                    kw += 1
                }
            }
            for _, s := range d.Synonyms {
                if strings.Contains(q, s) {
                    vec += 1
                }
            }
            score := math.Round(math.Min(1.0, kw*0.4+vec*0.35)*100) / 100
            if score >= minScore {
                results = append(results, SearchResult{ID: d.ID, Title: d.Title, Score: score, Content: d.Content})
            }
        }
        sort.Slice(results, func(i, j int) bool { return results[i].Score > results[j].Score })
        json.NewEncoder(w).Encode(map[string]any{"results": results, "transfer_human": len(results) == 0})
    })
    http.ListenAndServe(":8080", mux)
}`,
      explain:[
       {at:'package main',to:'"strings"',text:'导入标准库：json 编码、math 四舍五入、net/http 路由、sort 切片排序与 strings 包含判断。'},
       {at:'type HDoc struct {',to:'Content string  `json:"content"`',text:'定义知识库内部结构 HDoc 与对外返回的 JSON 结构 SearchResult。'},
       {at:'var hybridKB = []HDoc{',to:'{"kb-err502"',text:'初始化 4 条带精确关键词和同义词组的商城知识库切片。'},
       {at:'func main() {',to:'q := strings.TrimSpace(req.Query)',text:'创建路由器并解析 POST /api/support/hybrid-search 请求体，用指针 *float64 判断调用方是否显式传了 min_score。'},
       {at:'w.Header().Set("Content-Type", "application/json")',to:'return',text:'设置响应头；查询词为空时返回 400 状态码与错误提示。'},
       {at:'minScore := 0.3',to:'results := []SearchResult{}',text:'默认阈值设为 0.3，并将 results 初始化为空切片（避免 JSON 编码成 null）。'},
       {at:'for _, d := range hybridKB {',to:'results = append(results, SearchResult{ID: d.ID',text:'逐篇统计 keywords 与 synonyms 命中数，算出混合重排分 score，保留达到 minScore 的文档。'},
       {at:'sort.Slice(results, func(i, j int) bool',to:'http.ListenAndServe(":8080", mux)',text:'按分数降序排序，输出 results 与 transfer_human 标记，并在 8080 端口启动服务。'},
      ],
     },
    },
   },
  },
  {
   title:'验收：测试同义词召回、精确错误码与低分截断',
   body:'保存下面的脚本为 checks/check_cs5.py 并运行，验证第 5 关的 5 项混合检索与重排指标。',
   practice:{
    steps:[
     '保持客服后端服务在 8080 端口运行。',
     '保存下面的脚本为 checks/check_cs5.py 并运行 python checks/check_cs5.py。',
    ],
    expect:'✓ 同义词提问“耳麦左耳没声音怎么回事”成功召回 kb-audio\n✓ 精确故障码“升级时提示 ERR-502”命中 kb-err502 并排在第 1 位\n✓ 保价咨询“刚买就降价了能退差价吗”命中 kb-price\n✓ 无关提问“今天天气怎么样”被阈值截断并触发转人工\n✓ 空查询返回 400\n\n通过 5 / 5',
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

s, d1 = post("/api/support/hybrid-search", {"query": "耳麦左耳没声音怎么回事"})
ids1 = [r["id"] for r in d1.get("results", [])]
check("同义词提问“耳麦左耳没声音怎么回事”成功召回 kb-audio", s == 200 and "kb-audio" in ids1 and d1.get("transfer_human") is False)

s, d2 = post("/api/support/hybrid-search", {"query": "升级时提示 ERR-502 怎么办"})
res2 = d2.get("results", [])
check("精确故障码“升级时提示 ERR-502”命中 kb-err502 并排在第 1 位", s == 200 and len(res2) > 0 and res2[0]["id"] == "kb-err502")

s, d3 = post("/api/support/hybrid-search", {"query": "刚买就降价了能退差价吗"})
ids3 = [r["id"] for r in d3.get("results", [])]
check("保价咨询“刚买就降价了能退差价吗”命中 kb-price", s == 200 and "kb-price" in ids3)

s, d4 = post("/api/support/hybrid-search", {"query": "今天天气怎么样", "min_score": 0.3})
check("无关提问“今天天气怎么样”被阈值截断并触发转人工", s == 200 and d4.get("results") == [] and d4.get("transfer_human") is True)

s, d5 = post("/api/support/hybrid-search", {"query": "   "})
check("空查询返回 400", s == 400 and "error" in d5)

print(f"\\n通过 {passed} / 5")`,
   explain:[
    {at:'import json, sys',to:'passed += bool(ok)',text:'导入标准库并定义测试断言辅助函数 check。'},
    {at:'def post(path, body):',to:'return e.code, json.loads(e.read().decode("utf-8") or "{}")',text:'封装 POST 请求函数，统一返回 HTTP 状态码与解析后的 JSON 字典。'},
    {at:'s, d1 = post("/api/support/hybrid-search", {"query": "耳麦左耳没声音怎么回事"})',to:'check("同义词提问“耳麦左耳没声音怎么回事”成功召回 kb-audio"',text:'第 1 项：顾客没说“无声”而是说口语同义词“耳麦左耳没声音”，验证语义召回能命中 kb-audio。'},
    {at:'s, d2 = post("/api/support/hybrid-search", {"query": "升级时提示 ERR-502 怎么办"})',to:'check("精确故障码“升级时提示 ERR-502”命中 kb-err502 并排在第 1 位"',text:'第 2 项：包含精确错误码 ERR-502 时，验证关键词通道能精准命中 kb-err502 且排在首位。'},
    {at:'s, d3 = post("/api/support/hybrid-search", {"query": "刚买就降价了能退差价吗"})',to:'check("保价咨询“刚买就降价了能退差价吗”命中 kb-price"',text:'第 3 项：验证保价与退差价场景命中 kb-price。'},
    {at:'s, d4 = post("/api/support/hybrid-search", {"query": "今天天气怎么样", "min_score": 0.3})',to:'check("无关提问“今天天气怎么样”被阈值截断并触发转人工"',text:'第 4 项：无关闲聊得分低于 min_score，验证结果列表为空且自动标记 transfer_human: True。'},
    {at:'s, d5 = post("/api/support/hybrid-search", {"query": "   "})',to:'print(f"\\n通过 {passed} / 5")',text:'第 5 项：空白查询返回 400，最后汇总打印验收通过数。'},
   ],
  },
 ],
 quiz:[
  {id:'cs-hy-1',q:'在企业知识库 RAG 系统中，为什么要采用“关键词检索（BM25）+ 向量检索（Embedding）”的混合检索方案？',options:['向量检索擅长捕捉同义词与口语语义，关键词检索擅长匹配型号与错误码，两者互补','因为单独使用向量检索时数据库无法建立索引，需要依赖关键词检索来启动查询进程','混合检索能够直接省去大模型调用环节，把两路检索结果原样拼接当作最终客服回复','关键词检索专门处理英文提问，向量检索专门处理中文提问，合起来才支持双语问答'],why:['','向量数据库（如 Milvus、pgvector）本身就支持 HNSW/IVF 等高效向量索引。','检索只是召回参考资料，仍需大模型组织语言或结合上下文作答。','BM25（配合分词）和向量模型均同时支持中英文。'],answer:0,explain:'词汇鸿沟（如“耳麦没动静”与“耳机无声”）靠向量语义解决，而精确字面匹配（如故障码 ERR-502、SKU 型号）靠关键词检索兜底，双路召回再融合是工业界标配。'},
  {id:'cs-hy-2',type:'multi',q:'关于 RRF（倒数秩融合）与 Rerank（重排序）阈值截断，以下哪些说法是正确的？（多选）',options:['BM25 得分与余弦相似度的量纲不同，RRF 利用名次公式 1/(k+rank) 融合排名，无需复杂的分数归一化','Rerank 模型会对“问题+候选文档”做深度交互打分，精度高于初筛向量，适合对 Top-K 候选做精排','设置最低相关性阈值（min_score）可以过滤掉低分无关文档，防止不相关的噪声文本塞入 Prompt 干扰大模型','为了让大模型获得尽可能丰富的背景信息，不管候选文档得分有多低，都应该把前 10 篇文档原封不动塞进上下文'],why:['','','','把低分无关文档塞进 Prompt 不仅浪费 Token，还极易诱导模型产生幻觉或答非所问。'],answers:[0,1,2],explain:'“双路粗召回 -> RRF 合并 -> Reranker 精排 -> 阈值截断（低于阈值直接拒答/转人工）”是高准确率 RAG 的黄金流水线。'},
  {id:'cs-hy-3',type:'judge',q:'当顾客提问“今天股市行情怎么样”时，混合检索算出的最高文档得分只有 0.05（低于阈值 0.30），此时系统仍应把这篇 0.05 分的《退换货政策》传给大模型参考。',answer:false,explain:'错误。低于相关性阈值说明知识库中没有匹配该问题的资料，应当截断丢弃（返回空结果）并引导转人工或礼貌说明超出服务范围，而不是强塞无关文档。'},
  {id:'cs-hy-4',type:'fill',q:'在混合检索中，将多路检索结果按名次公式 1 / (k + rank) 合并排序的经典算法简称为 ＿（三个英文字母，Reciprocal Rank Fusion）。',accepted:['RRF','rrf'],explain:'RRF（Reciprocal Rank Fusion，倒数秩融合）简单稳健，是 Elasticsearch、Milvus、Dify 等主流框架默认的混合检索融合算法。'},
  {id:'cs-hy-5',type:'short',q:'如果顾客问“我的 ProMax 升级时弹出 ERR-502 怎么办”，纯向量检索和纯关键词检索各自可能出现什么问题？混合检索是如何解决的？',reference:'纯向量检索对数字编号不敏感，可能把 ERR-501 或普通系统升级文档排在前面导致答错；纯关键词检索如果遇到顾客把“固件升级”说成“刷机卡住”，又可能漏掉不含“刷机”字眼的文档。混合检索同时汇总关键词精确命中（锁定 ERR-502）与语义同义召回（识别“刷机≈固件升级”），再经重排置顶最匹配的修复指南。',points:['纯向量检索容易混淆相近的错误码或型号（如 ERR-502 与 ERR-501）','纯关键词检索容易漏掉口语同义表达','混合检索结合字面精确匹配与语义相似度，经融合重排把最准的文档排到第一'],explain:'理解了两路检索各自的盲区，就能在面试中清晰阐述为什么要上 Hybrid RAG。'},
 ],
};

export const csRouter:AiLevel={
 id:'cs-router',
 title:'多意图路由、情绪识别与前端客服工作台',
 summary:'识别售前导购、售后物流、故障报修与焦急投诉情绪，高危投诉自动升级VIP人工工单，并写出实时流式客服网页',
 lessons:[
  {
   title:'为什么不能用一个 Prompt 应付所有顾客',
   body:'当客服系统接入的功能越来越多（既能做售前耳机推荐、又能查售后快递、还能排障和办退货），如果把所有规则全写进同一个巨型 Prompt，不仅响应慢、成本高，而且售前话术（热情推荐）和售后安抚话术（严谨克制）还会互相打架。\n成熟的 AI 客服架构会在入口处放一个轻量级的「意图与情绪路由器（Intent & Sentiment Router）」：\n一、意图分流（Intent Routing）：判断顾客当前这句话属于售前导购（presale）、售后物流与退换（aftersale）、还是投诉维权（complaint），分发给对应的专项处理逻辑；\n二、情绪识别与高危升级（Sentiment Escalation）：实时检测顾客是否处于愤怒或焦急状态（如出现“投诉”“12315”“太差劲”“骗人”等高危词）。一旦识别为 angry，严禁让机器人继续机械兜圈子，必须立即输出诚恳致歉安抚话术，并将工单优先级标为 high、自动触发 escalate: true 升级至高级人工专员。',
  },
  {
   title:'任务一：实现意图路由与情绪升级接口',
   body:'实现后端路由与情绪识别接口 POST /api/support/route：\n一、接收 {"message": "顾客消息"}，若消息为空返回 400 和 {"error": "消息不能为空"}；\n二、情绪与投诉最高优先级拦截：若包含“投诉”“12315”“差劲”“骗”任一关键词，返回 intent="complaint"、sentiment="angry"、priority="high"、escalate=True，且 reply 包含诚恳致歉与专员加急跟进说明；\n三、售后与售前分流：包含“退货”“退款”“快递”“物流”时识别为 intent="aftersale"；包含“推荐”“哪款”“对比”“多少钱”时识别为 intent="presale"；其余为 "general"。非投诉场景下 sentiment="normal"、priority="normal"、escalate=False。',
   variants:{
    python:{
     practice:{
      steps:[
       '在 main.py 中实现 POST /api/support/route 接口。',
       '按优先级依次判断愤怒投诉（complaint/angry/high/escalate=True）、售后（aftersale）、售前（presale）与通用咨询（general）。',
      ],
      expect:'问“预算300推荐哪款”返回 presale；说“太差劲了我要打12315投诉”返回 angry、priority="high" 且 escalate=True。',
     },
     code:`COMPLAINT_WORDS = ["投诉", "12315", "差劲", "骗"]
AFTERSALE_WORDS = ["退货", "退款", "快递", "物流"]
PRESALE_WORDS = ["推荐", "哪款", "对比", "多少钱"]

# TODO：实现 POST /api/support/route，返回 intent、sentiment、priority、escalate 与 reply`,
     explain:[
      {at:'COMPLAINT_WORDS = [',to:'PRESALE_WORDS = [',text:'定义三类意图的特征词表：高危投诉词、售后订单词与售前导购词。'},
     ],
     solution:{
      code:`from fastapi import FastAPI
from fastapi.responses import JSONResponse

app = FastAPI()

COMPLAINT_WORDS = ["投诉", "12315", "差劲", "骗"]
AFTERSALE_WORDS = ["退货", "退款", "快递", "物流"]
PRESALE_WORDS = ["推荐", "哪款", "对比", "多少钱"]


@app.post("/api/support/route")
def route_message(body: dict):
    msg = str(body.get("message", "")).strip()
    if not msg:
        return JSONResponse({"error": "消息不能为空"}, status_code=400)
    if any(w in msg for w in COMPLAINT_WORDS):
        return {
            "intent": "complaint",
            "sentiment": "angry",
            "priority": "high",
            "escalate": True,
            "reply": "非常抱歉给您带来不好的体验！已为您加急升级至高级客服专员优先处理。",
        }
    if any(w in msg for w in AFTERSALE_WORDS):
        return {
            "intent": "aftersale",
            "sentiment": "normal",
            "priority": "normal",
            "escalate": False,
            "reply": "已为您接入售后专线，请提供订单号（如 ORD-1002），我帮您查询物流或办理退换。",
        }
    if any(w in msg for w in PRESALE_WORDS):
        return {
            "intent": "presale",
            "sentiment": "normal",
            "priority": "normal",
            "escalate": False,
            "reply": "您好！百元价位推荐星辰 Air 轻巧款（199元），追求主动降噪推荐星辰 Pro（299元）。",
        }
    return {
        "intent": "general",
        "sentiment": "normal",
        "priority": "normal",
        "escalate": False,
        "reply": "您好，我是星辰数码商城智能客服，请问有什么可以帮您？",
    }`,
      explain:[
       {at:'from fastapi import FastAPI',to:'PRESALE_WORDS = [',text:'初始化 FastAPI 应用，并定义投诉、售后、售前三组关键词列表。'},
       {at:'@app.post("/api/support/route")',to:'return JSONResponse({"error": "消息不能为空"}, status_code=400)',text:'路由接口入口：提取 message 并校验非空。'},
       {at:'if any(w in msg for w in COMPLAINT_WORDS):',to:'"reply": "非常抱歉给您带来不好的体验！已为您加急升级至高级客服专员优先处理。",',text:'最高优先级拦截愤怒投诉：一旦命中高危词，标记 sentiment 为 angry、priority 为 high、escalate 为 True，并立即返回致歉安抚与专员升级说明。'},
       {at:'if any(w in msg for w in AFTERSALE_WORDS):',to:'"reply": "已为您接入售后专线',text:'识别售后物流与退换意图（aftersale），引导顾客提供订单号调用售后工具。'},
       {at:'if any(w in msg for w in PRESALE_WORDS):',to:'"reply": "您好！百元价位推荐星辰 Air',text:'识别售前导购意图（presale），使用热情清晰的商品对比话术作答。'},
       {at:'return {',to:'"reply": "您好，我是星辰数码商城智能客服，请问有什么可以帮您？",',text:'默认兜底为通用咨询（general），正常情绪与普通优先级，无需升级人工。'},
      ],
     },
    },
    node:{
     practice:{
      steps:[
       '在 app.js 中实现 POST /api/support/route，按投诉、售后、售前、通用四档返回路由结果。',
      ],
      expect:'愤怒投诉自动标记 escalate: true 与 priority: "high"，售前售后准确分流。',
     },
     code:`// TODO：在 app.js 中实现 POST /api/support/route`,
     explain:[
      {at:'// TODO',text:'确保返回对象包含 intent、sentiment、priority、escalate、reply 五个字段。'},
     ],
     solution:{
      code:`const express = require("express");
const app = express();
app.use(express.json());

const COMPLAINT = ["投诉", "12315", "差劲", "骗"];
const AFTERSALE = ["退货", "退款", "快递", "物流"];
const PRESALE = ["推荐", "哪款", "对比", "多少钱"];

app.post("/api/support/route", (req, res) => {
  const msg = String(req.body?.message ?? "").trim();
  if (!msg) return res.status(400).json({ error: "消息不能为空" });
  if (COMPLAINT.some((w) => msg.includes(w))) {
    return res.json({
      intent: "complaint",
      sentiment: "angry",
      priority: "high",
      escalate: true,
      reply: "非常抱歉给您带来不好的体验！已为您加急升级至高级客服专员优先处理。",
    });
  }
  if (AFTERSALE.some((w) => msg.includes(w))) {
    return res.json({
      intent: "aftersale",
      sentiment: "normal",
      priority: "normal",
      escalate: false,
      reply: "已为您接入售后专线，请提供订单号（如 ORD-1002），我帮您查询物流或办理退换。",
    });
  }
  if (PRESALE.some((w) => msg.includes(w))) {
    return res.json({
      intent: "presale",
      sentiment: "normal",
      priority: "normal",
      escalate: false,
      reply: "您好！百元价位推荐星辰 Air 轻巧款（199元），追求主动降噪推荐星辰 Pro（299元）。",
    });
  }
  res.json({
    intent: "general",
    sentiment: "normal",
    priority: "normal",
    escalate: false,
    reply: "您好，我是星辰数码商城智能客服，请问有什么可以帮您？",
  });
});

app.listen(8080);`,
      explain:[
       {at:'const express = require("express");',to:'const PRESALE = ["推荐", "哪款", "对比", "多少钱"];',text:'创建 Express 应用并定义投诉、售后、售前特征词数组。'},
       {at:'app.post("/api/support/route", (req, res) => {',to:'if (!msg) return res.status(400).json({ error: "消息不能为空" });',text:'提取顾客消息并校验非空。'},
       {at:'if (COMPLAINT.some((w) => msg.includes(w))) {',to:'reply: "非常抱歉给您带来不好的体验！',text:'用数组的 some 方法检测是否包含任一投诉词；命中时标为 angry 与 high 优先级，立即触发 escalate 人工升级。'},
       {at:'if (AFTERSALE.some((w) => msg.includes(w))) {',to:'reply: "已为您接入售后专线',text:'命中售后关键词时返回 aftersale 意图与订单号引导话术。'},
       {at:'if (PRESALE.some((w) => msg.includes(w))) {',to:'reply: "您好！百元价位推荐星辰 Air',text:'命中售前关键词时返回 presale 意图与耳机型号推荐。'},
       {at:'res.json({',to:'app.listen(8080);',text:'其余情况返回 general 通用问候，并在 8080 端口启动监听。'},
      ],
     },
    },
    go:{
     practice:{
      steps:[
       '在 main.go 中实现 POST /api/support/route，完成多意图分类与愤怒情绪升级。',
      ],
      expect:'通过售前、售后、投诉升级与空消息校验全部测试。',
     },
     code:`// TODO：在 main.go 中实现 POST /api/support/route`,
     explain:[
      {at:'// TODO',text:'使用辅助函数 hasAny(msg, words) 判断字符串是否包含切片中的任意词。'},
     ],
     solution:{
      code:`package main

import (
    "encoding/json"
    "net/http"
    "strings"
)

func hasAny(s string, words []string) bool {
    for _, w := range words {
        if strings.Contains(s, w) {
            return true
        }
    }
    return false
}

func main() {
    mux := http.NewServeMux()
    mux.HandleFunc("POST /api/support/route", func(w http.ResponseWriter, r *http.Request) {
        var req struct {
            Message string \`json:"message"\`
        }
        json.NewDecoder(r.Body).Decode(&req)
        msg := strings.TrimSpace(req.Message)
        w.Header().Set("Content-Type", "application/json")
        if msg == "" {
            w.WriteHeader(400)
            w.Write([]byte(\`{"error":"消息不能为空"}\`))
            return
        }
        if hasAny(msg, []string{"投诉", "12315", "差劲", "骗"}) {
            json.NewEncoder(w).Encode(map[string]any{
                "intent":    "complaint",
                "sentiment": "angry",
                "priority":  "high",
                "escalate":  true,
                "reply":     "非常抱歉给您带来不好的体验！已为您加急升级至高级客服专员优先处理。",
            })
            return
        }
        if hasAny(msg, []string{"退货", "退款", "快递", "物流"}) {
            json.NewEncoder(w).Encode(map[string]any{
                "intent":    "aftersale",
                "sentiment": "normal",
                "priority":  "normal",
                "escalate":  false,
                "reply":     "已为您接入售后专线，请提供订单号（如 ORD-1002），我帮您查询物流或办理退换。",
            })
            return
        }
        if hasAny(msg, []string{"推荐", "哪款", "对比", "多少钱"}) {
            json.NewEncoder(w).Encode(map[string]any{
                "intent":    "presale",
                "sentiment": "normal",
                "priority":  "normal",
                "escalate":  false,
                "reply":     "您好！百元价位推荐星辰 Air 轻巧款（199元），追求主动降噪推荐星辰 Pro（299元）。",
            })
            return
        }
        json.NewEncoder(w).Encode(map[string]any{
            "intent":    "general",
            "sentiment": "normal",
            "priority":  "normal",
            "escalate":  false,
            "reply":     "您好，我是星辰数码商城智能客服，请问有什么可以帮您？",
        })
    })
    http.ListenAndServe(":8080", mux)
}`,
      explain:[
       {at:'package main',to:'"strings"',text:'导入 JSON、HTTP 与字符串处理标准库。'},
       {at:'func hasAny(s string, words []string) bool {',to:'return false',text:'封装关键词匹配函数 hasAny：只要消息包含切片里的任意一个词就返回 true。'},
       {at:'func main() {',to:'return',text:'注册 POST /api/support/route 处理器，解析 message 并在空消息时返回 400。'},
       {at:'if hasAny(msg, []string{"投诉", "12315", "差劲", "骗"}) {',to:'return',text:'优先检查高危投诉词：返回 complaint 意图、angry 情绪、high 优先级与 escalate: true。'},
       {at:'if hasAny(msg, []string{"退货", "退款", "快递", "物流"}) {',to:'return',text:'匹配售后订单词时返回 aftersale 意图与订单号引导回复。'},
       {at:'if hasAny(msg, []string{"推荐", "哪款", "对比", "多少钱"}) {',to:'return',text:'匹配售前导购词时返回 presale 意图与耳机型号推荐。'},
       {at:'json.NewEncoder(w).Encode(map[string]any{',to:'http.ListenAndServe(":8080", mux)',text:'默认返回 general 通用咨询结果，并在 8080 端口启动服务。'},
      ],
     },
    },
   },
  },
  {
   title:'任务二：写出智能客服流式对话前端界面',
   body:'后端接口就绪后，我们来编写顾客与客服坐席使用的「智能客服前端工作台」。界面需要支持：\n一、展示对话气泡列表，并实时显示刚刚识别出的意图标签（如 presale / aftersale / complaint）与情绪预警状态；\n二、当接口返回 escalate: true 时，在界面顶部醒目展示“已为您加急转接 VIP 人工专员”横幅；\n三、使用 fetch 发送顾客消息并把回复追加到聊天窗口中。你可以选择原生 HTML 或 React 组件来实现：',
   variants:{
    html:{
     practice:{
      steps:[
       '新建 index.html，放入聊天记录容器 #chat-box、状态徽标 #badge、输入框 #msg-input 和发送按钮。',
       '编写 sendMsg() 函数，调用 POST /api/support/route，更新意图情绪徽标并渲染客服回复气泡。',
      ],
      expect:'在输入框发送投诉或咨询消息，页面实时显示意图情绪标签与客服回复，高危投诉时高亮预警。',
     },
     code:`<div id="badge">当前状态：待命</div>
<div id="chat-box"></div>
<input id="msg-input" placeholder="输入您的问题..." />
<button id="send-btn">发送</button>
<script>
  // TODO：绑定 #send-btn 点击事件，请求 /api/support/route 并将结果渲染到 #chat-box 和 #badge
</script>`,
     explain:[
      {at:'<div id="badge">',to:'</script>',text:'页面基础结构：顶部状态徽标 #badge、消息列表容器 #chat-box、输入框、发送按钮与脚本占位。'},
     ],
     solution:{
      code:`<div id="badge">当前状态：待命</div>
<div id="chat-box"></div>
<input id="msg-input" placeholder="输入您的问题..." />
<button id="send-btn">发送</button>
<script>
  const box = document.getElementById("chat-box");
  const badge = document.getElementById("badge");
  const input = document.getElementById("msg-input");

  async function sendMsg() {
    const text = input.value.trim();
    if (!text) return;
    input.value = "";
    box.innerHTML += \`<div class="msg user">我：\${text}</div>\`;
    const resp = await fetch("/api/support/route", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: text }),
    });
    const data = await resp.json();
    badge.textContent = \`意图：\${data.intent} | 情绪：\${data.sentiment}\${data.escalate ? "（已升级VIP人工）" : ""}\`;
    box.innerHTML += \`<div class="msg bot">客服：\${data.reply}</div>\`;
  }

  document.getElementById("send-btn").addEventListener("click", sendMsg);
</script>`,
      explain:[
       {at:'<div id="badge">当前状态：待命</div>',to:'<script>',text:'定义状态栏、聊天框、输入框和发送按钮四个 DOM 节点。'},
       {at:'const box = document.getElementById("chat-box");',to:'const input = document.getElementById("msg-input");',text:'获取页面上的聊天容器、状态徽标与输入框元素引用。'},
       {at:'async function sendMsg() {',to:'box.innerHTML += `<div class="msg user">我：${text}</div>`;',text:'读取并清空输入框，先把顾客自己的提问追加到聊天记录中。'},
       {at:'const resp = await fetch("/api/support/route", {',to:'const data = await resp.json();',text:'调用后端的意图路由接口，传入 JSON 格式的 message 并解析返回数据。'},
       {at:'badge.textContent = `意图：${data.intent}',to:'</script>',text:'更新顶部意图与情绪徽标（若 escalate 为真则提示已升级 VIP 人工），追加客服回复并绑定按钮点击事件。'},
      ],
     },
    },
    react:{
     practice:{
      steps:[
       '创建 SupportDesk 组件，使用 useState 维护 messages 列表、input 文本与 routeInfo 状态。',
       '在 send 函数中调用 /api/support/route，更新意图徽标与消息列表。',
      ],
      expect:'发送消息后聊天气泡与顶部意图/情绪/人工升级徽标同步更新。',
     },
     code:`import { useState } from "react";

export default function SupportDesk() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  // TODO：定义 routeInfo 状态，实现 send() 请求 /api/support/route 并渲染对话与状态栏
  return <div>TODO</div>;
}`,
     explain:[
      {at:'import { useState } from "react";',to:'return <div>TODO</div>;',text:'组件骨架：用 useState 管理聊天消息数组与输入框文字。'},
     ],
     solution:{
      code:`import { useState } from "react";

export default function SupportDesk() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [info, setInfo] = useState({ intent: "general", sentiment: "normal", escalate: false });

  async function send() {
    const text = input.trim();
    if (!text) return;
    setInput("");
    const resp = await fetch("/api/support/route", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: text }),
    });
    const data = await resp.json();
    setInfo(data);
    setMessages((prev) => [...prev, { role: "user", text }, { role: "bot", text: data.reply }]);
  }

  return (
    <div className="support-desk">
      <div className="status-bar">
        意图：{info.intent} | 情绪：{info.sentiment} {info.escalate && "【已升级VIP人工专员】"}
      </div>
      <div className="chat-list">
        {messages.map((m, i) => (
          <div key={i} className={m.role}>{m.text}</div>
        ))}
      </div>
      <input value={input} onChange={(e) => setInput(e.target.value)} placeholder="输入问题..." />
      <button onClick={send}>发送</button>
    </div>
  );
}`,
      explain:[
       {at:'import { useState } from "react";',to:'const [info, setInfo] = useState({ intent: "general", sentiment: "normal", escalate: false });',text:'定义三个状态：messages 存对话记录，input 存当前输入，info 存后端识别出的意图、情绪与升级标记。'},
       {at:'async function send() {',to:'const data = await resp.json();',text:'点击发送时校验非空、清空输入框，并用 fetch POST 调用 /api/support/route。'},
       {at:'setInfo(data);',to:'setMessages((prev) => [...prev, { role: "user", text }, { role: "bot", text: data.reply }]);',text:'更新顶部路由状态 info，并把用户提问与客服回复一并追加进 messages 状态。'},
       {at:'return (',to:'<input value={input}',text:'渲染顶部意图情绪状态栏（escalate 为真时展示 VIP 专员升级提示）、消息列表与受控输入框。'},
       {at:'<button onClick={send}>发送</button>',to:'    </div>',text:'点击发送按钮触发 send 函数，并闭合外层容器。'},
      ],
     },
    },
   },
  },
  {
   title:'验收：测试意图分流与愤怒客户优先升级',
   body:'保存下面的脚本为 checks/check_cs6.py 并运行，验证第 6 关的 5 项路由与情绪升级指标。',
   practice:{
    steps:[
     '保持服务在 8080 端口运行。',
     '保存下面的脚本为 checks/check_cs6.py 并运行 python checks/check_cs6.py。',
    ],
    expect:'✓ 售前咨询“预算300元推荐哪款耳机”识别为 presale\n✓ 售后咨询“我的快递到哪了怎么退货”识别为 aftersale\n✓ 愤怒投诉“太差劲了我要打12315投诉你们”触发 angry 与 high 优先级人工升级\n✓ 安抚回复中包含诚恳致歉与专员处理说明\n✓ 空消息返回 400\n\n通过 5 / 5',
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

s, d1 = post("/api/support/route", {"message": "预算300元推荐哪款耳机？"})
check("售前咨询“预算300元推荐哪款耳机”识别为 presale", s == 200 and d1.get("intent") == "presale" and d1.get("escalate") is False)

s, d2 = post("/api/support/route", {"message": "我的快递到哪了怎么退货？"})
check("售后咨询“我的快递到哪了怎么退货”识别为 aftersale", s == 200 and d2.get("intent") == "aftersale" and d2.get("escalate") is False)

s, d3 = post("/api/support/route", {"message": "太差劲了我要打12315投诉你们"})
check("愤怒投诉“太差劲了我要打12315投诉你们”触发 angry 与 high 优先级人工升级", s == 200 and d3.get("intent") == "complaint" and d3.get("sentiment") == "angry" and d3.get("priority") == "high" and d3.get("escalate") is True)

reply3 = d3.get("reply", "")
check("安抚回复中包含诚恳致歉与专员处理说明", "抱歉" in reply3 and "专员" in reply3)

s, d4 = post("/api/support/route", {"message": ""})
check("空消息返回 400", s == 400 and "error" in d4)

print(f"\\n通过 {passed} / 5")`,
   explain:[
    {at:'import json, sys',to:'return e.code, json.loads(e.read().decode("utf-8") or "{}")',text:'导入标准库并定义 check 断言与 post 请求辅助函数。'},
    {at:'s, d1 = post("/api/support/route", {"message": "预算300元推荐哪款耳机？"})',to:'check("售前咨询“预算300元推荐哪款耳机”识别为 presale"',text:'第 1 项：验证商品推荐与预算咨询被准确分流至 presale（售前导购），且不触发人工升级。'},
    {at:'s, d2 = post("/api/support/route", {"message": "我的快递到哪了怎么退货？"})',to:'check("售后咨询“我的快递到哪了怎么退货”识别为 aftersale"',text:'第 2 项：验证物流与退货问题被分流至 aftersale（售后专线）。'},
    {at:'s, d3 = post("/api/support/route", {"message": "太差劲了我要打12315投诉你们"})',to:'check("愤怒投诉“太差劲了我要打12315投诉你们”触发 angry 与 high 优先级人工升级"',text:'第 3 项：验证出现“差劲”“12315”“投诉”时，识别为 complaint 意图、angry 情绪、high 优先级并立即设置 escalate: True。'},
    {at:'reply3 = d3.get("reply", "")',to:'print(f"\\n通过 {passed} / 5")',text:'第 4、5 项：检查投诉回复中是否包含“抱歉”与“专员”安抚字样，并验证空消息返回 400。'},
   ],
  },
 ],
 quiz:[
  {id:'cs-rt-1',q:'在企业 AI 客服入口处设计“多意图路由（Intent Router）”的主要工程价值是什么？',options:['将售前导购、售后查单与投诉安抚分发到各自专项提示词与工具链，提升准确率并节省开销','让前端客服聊天页面不需要编写任何 CSS 样式代码，就能由路由器自动美化聊天气泡与排版','将所有在线顾客的聊天记录自动合并到同一个全局会话列表里面，从而大幅节省服务器内存','在网络传输层直接替代 HTTPS 加密协议，用来保护顾客的登录密码与支付口令不被窃听'],why:['','意图路由是后端对话分发架构，与前端 CSS 美化无关。','不同用户的会话需要严格隔离，不能合并。','传输层安全由 TLS/HTTPS 负责，与意图分类无关。'],answer:0,explain:'专人专事：售前 Agent 挂载商品对比库，售后 Agent 挂载查单退货工具，投诉路由直接走安抚升级通道，既省 Token 又互不干扰。'},
  {id:'cs-rt-2',type:'multi',q:'当情绪识别模块检测到顾客情绪为愤怒（sentiment: "angry"，如提及“12315投诉”“太差劲了”）时，客服系统应当采取哪些联动措施？（多选）',options:['立即停止机器人的机械追问，首先向顾客输出诚恳的致歉与共情安抚话术来缓解对抗情绪','将工单优先级提升为高优（priority: "high"），并把 escalate 设为 true 自动转接高级人工专员','把当前对话的完整上下文、已查到的订单信息一并附在升级工单里移交给人工坐席，避免顾客重复口述','先让机器人和顾客逐条争辩到底是谁的责任，并要求顾客必须先阅读并同意商城免责条款才予处理'],why:['','','','与愤怒顾客机械争辩或甩免责条款只会火上浇油，加剧客诉升级。'],answers:[0,1,2],explain:'高情商客服系统的标志：识别情绪 -> 致歉降温 -> 提权升级 -> 携带上下文无缝交接人工。'},
  {id:'cs-rt-3',type:'judge',q:'当 AI 客服把高危投诉转接给人工客服坐席时，应该清空此前的聊天记录，让顾客跟人工客服从头再讲一遍事情经过。',answer:false,explain:'错误！愤怒的顾客最讨厌“跟机器人说了一堆，转人工后又要从头再说一遍”。转人工时必须把会话历史、意图标签和关联订单号一起推送到人工坐席工作台。'},
  {id:'cs-rt-4',type:'fill',q:'在意图路由接口返回给前端的 JSON 中，用于通知前端界面立即弹出“已升级高级人工专员”提示的布尔字段名是 ＿。',accepted:['escalate'],explain:'escalate（升级/提级）为 true 时，前端工作台与工单系统即可同步触发高优人工介入流程。'},
  {id:'cs-rt-5',type:'short',q:'在实际生产环境中，除了关键词匹配外，还可以怎样实现更精准、低延迟的客服意图与情绪分类？',reference:'可以使用轻量级小模型（如微调的 BERT/RoBERTa 分类头，或 Qwen-1.5B / DeepSeek 蒸馏小模型）专门做 JSON 结构化分类输出，耗时仅需几十毫秒；同时保留高危敏感词（如“12315”“起诉”）的规则强拦截作为兜底，实现“规则快筛 + 小模型语义分类”的双保险。',points:['使用轻量级分类模型或高速小参数大模型输出结构化意图与情绪标签','结合高危词规则兜底，兼顾毫秒级低延迟与高召回率'],explain:'“规则强拦截 + 轻量级模型分类”是工业界兼顾延迟、成本与准确率的常见做法。'},
 ],
};
