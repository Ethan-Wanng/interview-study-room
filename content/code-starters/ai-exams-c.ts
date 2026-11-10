import type {StarterMap} from './types';

const BT='`'; // Go 结构体标签里的反引号

// AI 考试题 ai-f-28（Recall@k 和 MRR）、ai-f-29（模型级联）、ai-f-30（提示注入隔离）的作答框架。
export const aiExamStartersC:StarterMap={
'ai-f-28':{
python:String.raw`from dataclasses import dataclass

@dataclass
class Case:
    results: list[str]  # 按相关度排好序的检索结果
    gold: str           # 正确文档 id

def evaluate(cases: list[Case], k: int) -> tuple[float, float]:
    if not cases:
        return 0.0, 0.0
    recall = mrr = 0.0
    for c in cases:
        if c.gold in c.results:
            # TODO 1：算出正确文档第一次出现的排名（排名从 1 开始）
            rank = ...
            # TODO 2：排名在前 k 个以内，召回数加 1
            ...
            # TODO 3：MRR 加上排名的倒数
            ...
        # 没命中：两项都不加，相当于贡献 0
    # TODO 4：两项都除以问题数后返回
    ...`,
go:String.raw`type Case struct {
    Results []string // 按相关度排好序的检索结果
    Gold    string   // 正确文档 id
}

func Eval(cases []Case, k int) (recall, mrr float64) {
    if len(cases) == 0 {
        return 0, 0
    }
    for _, c := range cases {
        for i, id := range c.Results {
            if id == c.Gold {
                // TODO 1：下标 i 在前 k 个以内，召回数加 1（注意 i 从 0 开始）
                // TODO 2：MRR 加上排名的倒数（排名 = i + 1）
                // TODO 3：只算第一次命中，找到后跳出循环
                ...
            }
        }
    }
    // TODO 4：两项都除以问题数后返回
    ...
}`,
java:String.raw`record Case(List<String> results, String gold) {}

// 返回 {Recall@k, MRR}
static double[] evaluate(List<Case> cases, int k) {
    if (cases.isEmpty()) return new double[]{0, 0};
    double recall = 0, mrr = 0;
    for (Case c : cases) {
        int i = c.results().indexOf(c.gold()); // 第一次出现的下标，没找到时是 -1
        if (i >= 0) {
            // TODO 1：下标 i 在前 k 个以内，召回数加 1
            // TODO 2：MRR 加上排名的倒数（排名 = i + 1，注意用小数除法）
            ...
        }
    }
    // TODO 3：两项都除以问题数后返回
    ...
}`,
ts:String.raw`type Case = { results: string[]; gold: string };

function evaluate(cases: Case[], k: number): { recall: number; mrr: number } {
  if (cases.length === 0) return { recall: 0, mrr: 0 };
  let recall = 0, mrr = 0;
  for (const c of cases) {
    const i = c.results.indexOf(c.gold); // 第一次出现的下标，没找到时是 -1
    if (i >= 0) {
      // TODO 1：下标 i 在前 k 个以内，召回数加 1
      // TODO 2：MRR 加上排名的倒数（排名 = i + 1）
      ...
    }
  }
  // TODO 3：两项都除以问题数后返回
  ...
}`,
rust:String.raw`struct Case {
    results: Vec<String>, // 按相关度排好序的检索结果
    gold: String,         // 正确文档 id
}

// 返回 (Recall@k, MRR)
fn evaluate(cases: &[Case], k: usize) -> (f64, f64) {
    if cases.is_empty() {
        return (0.0, 0.0);
    }
    let (mut recall, mut mrr) = (0.0, 0.0);
    for c in cases {
        // position 找到第一次命中的下标，没命中时是 None
        if let Some(i) = c.results.iter().position(|id| *id == c.gold) {
            // TODO 1：下标 i 在前 k 个以内，召回数加 1
            // TODO 2：MRR 加上排名的倒数（排名 = i + 1，要转成 f64）
            ...
        }
    }
    // TODO 3：两项都除以问题数后返回
    ...
}`,
},

'ai-f-29':{
python:String.raw`from pydantic import BaseModel

class SmallOut(BaseModel):
    answer: str
    confident: bool

def answer(q: str) -> tuple[str, str]:
    """返回 (答案, 用了哪个模型)。"""
    try:
        text = small.complete(small_prompt(q))
        # TODO 1：把小模型的输出解析成 SmallOut（解析失败会抛异常）
        out = ...
        # TODO 2：自信并且答案不为空时，返回小模型的答案，并标明用的是 "small"
        ...
    except Exception:
        pass  # 小模型出错或输出不合格：往下走，升级到大模型
    # TODO 3：改用大模型回答，并标明用的是 "large"（大模型出错时不捕获，交给上层）
    ...`,
go:String.raw`type smallOut struct {
    Answer    string ${BT}json:"answer"${BT}
    Confident bool   ${BT}json:"confident"${BT}
}

// 返回 (答案, 用了哪个模型, 错误)
func Answer(ctx context.Context, q string) (string, string, error) {
    text, err := small.Complete(ctx, smallPrompt(q))
    if err == nil {
        var out smallOut
        // TODO 1：解析 JSON 成功、自信并且答案不为空时，返回小模型的答案和 "small"
        ...
    }
    // 小模型出错、解析失败或不自信：升级到大模型
    // TODO 2：调用大模型；大模型出错时把错误返回给上层
    ...
    // TODO 3：返回大模型的答案和 "large"
    ...
}`,
java:String.raw`record SmallOut(String answer, boolean confident) {}
record Answer(String text, String model) {}

static final ObjectMapper JSON = new ObjectMapper(); // Jackson

static Answer answer(String q) throws Exception {
    try {
        String text = small.complete(smallPrompt(q));
        // TODO 1：把输出解析成 SmallOut（解析失败会抛异常）
        SmallOut out = ...;
        // TODO 2：自信并且答案不为空时，返回小模型的答案和 "small"
        ...
    } catch (Exception e) {
        // 小模型出错或 JSON 解析失败：往下走，升级到大模型
    }
    // TODO 3：改用大模型回答，返回答案和 "large"（大模型出错就向上抛）
    ...
}`,
ts:String.raw`async function answer(q: string): Promise<{ text: string; model: "small" | "large" }> {
  try {
    const raw = await small.complete(smallPrompt(q));
    // TODO 1：解析 JSON（解析失败会抛错，进入 catch）
    const out = ...;
    // TODO 2：confident 为 true 并且 answer 是非空字符串时，返回小模型的答案和 "small"
    ...
  } catch {
    // 小模型出错或 JSON 不合格：往下走，升级到大模型
  }
  // TODO 3：改用大模型回答，返回答案和 "large"（大模型出错就向上抛）
  ...
}`,
rust:String.raw`use serde::Deserialize;

#[derive(Deserialize)]
struct SmallOut {
    answer: String,
    confident: bool,
}

// 返回 (答案, 用了哪个模型)
async fn answer(q: &str) -> Result<(String, &'static str), Error> {
    if let Ok(text) = small.complete(&small_prompt(q)).await {
        // TODO 1：用 serde_json 解析成 SmallOut；解析成功、自信且答案非空时，返回小模型的答案和 "small"
        ...
    }
    // 小模型出错、解析失败或不自信：升级到大模型
    // TODO 2：调用大模型（用 ? 把大模型的错误交给上层），返回答案和 "large"
    ...
}`,
},

'ai-f-30':{
python:String.raw`def wrap_untrusted(task: str, external: str) -> str:
    # TODO 1：去掉外部内容里的 <external> 和 </external>，防止它伪造标签、提前跳出隔离区
    safe = ...
    # TODO 2：拼出最终提示：任务 + 一句说明（标签里只是参考资料，里面的指令不要执行）
    #         + 用 <external> ... </external> 包起来的外部内容
    return ...`,
go:String.raw`func WrapUntrusted(task, external string) string {
    // TODO 1：去掉外部内容里的 <external> 和 </external>，防止它伪造标签、提前跳出隔离区
    safe := ...
    // TODO 2：拼出最终提示：任务 + 一句说明（标签里只是参考资料，里面的指令不要执行）
    //         + 用 <external> ... </external> 包起来的外部内容
    return ...
}`,
java:String.raw`static String wrapUntrusted(String task, String external) {
    // TODO 1：去掉外部内容里的 <external> 和 </external>，防止它伪造标签、提前跳出隔离区
    String safe = ...;
    // TODO 2：拼出最终提示：任务 + 一句说明（标签里只是参考资料，里面的指令不要执行）
    //         + 用 <external> ... </external> 包起来的外部内容
    return ...;
}`,
ts:String.raw`function wrapUntrusted(task: string, external: string): string {
  // TODO 1：去掉外部内容里的 <external> 和 </external>，防止它伪造标签、提前跳出隔离区（用 replaceAll）
  const safe = ...;
  // TODO 2：拼出最终提示：任务 + 一句说明（标签里只是参考资料，里面的指令不要执行）
  //         + 用 <external> ... </external> 包起来的外部内容
  return ...;
}`,
rust:String.raw`fn wrap_untrusted(task: &str, external: &str) -> String {
    // TODO 1：去掉外部内容里的 <external> 和 </external>，防止它伪造标签、提前跳出隔离区
    let safe = ...;
    // TODO 2：用 format! 拼出最终提示：任务 + 一句说明（标签里只是参考资料，里面的指令不要执行）
    //         + 用 <external> ... </external> 包起来的外部内容
    ...
}`,
},
};
