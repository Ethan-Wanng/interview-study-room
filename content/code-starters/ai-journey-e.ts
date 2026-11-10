import type {StarterMap} from './types';

const BT='`'; // Go 结构体标签、原始字符串里的反引号

// AI 闯关题 serving-12、fine-tuning-12、fine-tuning-grpo-adv、safety-12 的作答框架。
export const aiJourneyStartersE:StarterMap={
'serving-12':{
python:String.raw`def weight_memory_gb(params_billion, precision="fp16"):
    # TODO 1：写出每种精度对应的每参数字节数（fp32、fp16、bf16、int8、int4）
    bytes_per_param = {...}[precision]
    # TODO 2：十亿参数 × 每参数字节数 ≈ GB
    return ...

# weight_memory_gb(7)          -> 14.0
# weight_memory_gb(70, "int4") -> 35.0
# 注意：这只是权重，不含 KV 缓存、激活等开销`,
go:String.raw`// TODO 1：写出每种精度对应的每参数字节数（fp32、fp16、bf16、int8、int4）
var bytesPerParam = map[string]float64{...}

func weightMemoryGB(paramsBillion float64, precision string) (float64, error) {
    b, ok := bytesPerParam[precision]
    if !ok {
        return 0, fmt.Errorf("未知精度 %s", precision)
    }
    // TODO 2：十亿参数 × 每参数字节数 ≈ GB
    return ...
}
// weightMemoryGB(7, "fp16") -> 14；注意这只是权重，不含 KV 缓存、激活等开销`,
java:String.raw`// TODO 1：写出每种精度对应的每参数字节数（fp32、fp16、bf16、int8、int4）
static final Map<String, Double> BYTES_PER_PARAM = Map.of(...);

static double weightMemoryGB(double paramsBillion, String precision) {
    Double b = BYTES_PER_PARAM.get(precision);
    if (b == null) throw new IllegalArgumentException("未知精度 " + precision);
    // TODO 2：十亿参数 × 每参数字节数 ≈ GB
    return ...;
}
// weightMemoryGB(7, "fp16") -> 14.0；注意这只是权重，不含 KV 缓存、激活等开销`,
ts:String.raw`// TODO 1：写出每种精度对应的每参数字节数（fp32、fp16、bf16、int8、int4）
const BYTES_PER_PARAM = { ... };

function weightMemoryGB(paramsBillion: number, precision: keyof typeof BYTES_PER_PARAM = "fp16"): number {
  // TODO 2：十亿参数 × 每参数字节数 ≈ GB
  return ...;
}
// weightMemoryGB(7) -> 14；注意这只是权重，不含 KV 缓存、激活等开销`,
rust:String.raw`fn weight_memory_gb(params_billion: f64, precision: &str) -> Option<f64> {
    // TODO 1：用 match 写出每种精度对应的每参数字节数（fp32、fp16/bf16、int8、int4），未知精度返回 None
    let bytes = match precision {
        ...
        _ => return None,
    };
    // TODO 2：十亿参数 × 每参数字节数 ≈ GB
    ...
}
// weight_memory_gb(7.0, "fp16") -> Some(14.0)；注意这只是权重，不含 KV 缓存、激活等开销`,
},

'fine-tuning-12':{
python:String.raw`import json

def to_jsonl(pairs, system):
    lines = []
    for question, answer in pairs:
        # TODO 1：每条样本是一组 messages，依次包含 system、user、assistant 三种角色
        record = {"messages": [...]}
        # TODO 2：把这条记录转成一行 JSON（ensure_ascii=False 保留中文）
        lines.append(...)
    # TODO 3：每行一个 JSON 对象（JSONL），用换行连起来
    return ...`,
go:String.raw`type Msg struct {
    Role    string ${BT}json:"role"${BT}
    Content string ${BT}json:"content"${BT}
}

type Record struct {
    Messages []Msg ${BT}json:"messages"${BT}
}

func toJSONL(pairs [][2]string, system string) (string, error) {
    lines := make([]string, 0, len(pairs))
    for _, p := range pairs {
        // TODO 1：每条样本是一组 Messages，依次包含 system、user（p[0]）、assistant（p[1]）
        rec := Record{Messages: []Msg{...}}
        // TODO 2：用 json.Marshal 转成一行 JSON（Go 默认输出中文原文），出错时返回错误
        ...
    }
    // TODO 3：每行一个 JSON 对象（JSONL），用换行连起来
    return ...
}`,
java:String.raw`record Msg(String role, String content) {}
record Record(List<Msg> messages) {}

static final ObjectMapper JSON = new ObjectMapper(); // Jackson

static String toJsonl(List<String[]> pairs, String system) throws Exception {
    List<String> lines = new ArrayList<>();
    for (String[] p : pairs) {
        // TODO 1：每条样本是一组 messages，依次包含 system、user（p[0]）、assistant（p[1]）
        Record rec = ...;
        // TODO 2：把这条记录序列化成一行 JSON
        ...
    }
    // TODO 3：每行一个 JSON 对象（JSONL），用换行连起来
    return ...;
}`,
ts:String.raw`function toJsonl(pairs: [string, string][], system: string): string {
  return pairs
    // TODO 1：每条样本是一组 messages，依次包含 system、user、assistant 三种角色
    // TODO 2：用 JSON.stringify 转成一行 JSON（默认保留中文原文）
    .map(([question, answer]) => ...)
    // TODO 3：每行一个 JSON 对象（JSONL），用换行连起来
    ...;
}`,
rust:String.raw`use serde_json::json;

fn to_jsonl(pairs: &[(&str, &str)], system: &str) -> String {
    pairs
        .iter()
        .map(|(question, answer)| {
            // TODO 1：用 json! 写出一条样本：messages 依次包含 system、user、assistant 三种角色
            // TODO 2：to_string() 转成一行 JSON
            ...
        })
        .collect::<Vec<_>>()
        // TODO 3：每行一个 JSON 对象（JSONL），用换行连起来
        ...
}`,
},

'fine-tuning-grpo-adv':{
python:String.raw`def group_advantages(rewards, eps=1e-6):
    n = len(rewards)
    # TODO 1：计算组内均值
    mean = ...
    # TODO 2：计算组内标准差（各奖励与均值之差的平方，求平均后开根号）
    std = ...
    # TODO 3：每个回答的优势 = (奖励 - 均值) / (标准差 + eps)；eps 防止全部相同时除以 0
    return ...

# group_advantages([1, 0, 0, 1]) -> 约 [1, -1, -1, 1]
# group_advantages([1, 1, 1, 1]) -> [0, 0, 0, 0]：全对或全错时没有学习信号`,
go:String.raw`func groupAdvantages(rewards []float64, eps float64) []float64 {
    n := float64(len(rewards))
    // TODO 1：计算组内均值
    mean := ...
    // TODO 2：计算组内标准差（各奖励与均值之差的平方，求平均后开根号）
    std := ...
    adv := make([]float64, len(rewards))
    for i, r := range rewards {
        // TODO 3：优势 = (奖励 - 均值) / (标准差 + eps)；eps 防止全部相同时除以 0
        ...
    }
    return adv
}`,
java:String.raw`static double[] groupAdvantages(double[] rewards, double eps) {
    // TODO 1：计算组内均值
    double mean = ...;
    // TODO 2：计算组内标准差（各奖励与均值之差的平方，求平均后开根号）
    double std = ...;
    // TODO 3：每个回答的优势 = (奖励 - 均值) / (标准差 + eps)；eps 防止全部相同时除以 0
    return ...;
}`,
ts:String.raw`function groupAdvantages(rewards: number[], eps = 1e-6): number[] {
  const n = rewards.length;
  // TODO 1：计算组内均值
  const mean = ...;
  // TODO 2：计算组内标准差（各奖励与均值之差的平方，求平均后开根号）
  const std = ...;
  // TODO 3：每个回答的优势 = (奖励 - 均值) / (标准差 + eps)；eps 防止全部相同时除以 0
  return ...;
}`,
rust:String.raw`fn group_advantages(rewards: &[f64], eps: f64) -> Vec<f64> {
    let n = rewards.len() as f64;
    // TODO 1：计算组内均值
    let mean = ...;
    // TODO 2：计算组内标准差（各奖励与均值之差的平方，求平均后开根号）
    let std = ...;
    // TODO 3：每个回答的优势 = (奖励 - 均值) / (标准差 + eps)；eps 防止全部相同时除以 0
    ...
}`,
},

'safety-12':{
python:String.raw`import re

# TODO 1：匹配手机号（1 开头、第二位 3-9、共 11 位），前后不能紧挨着数字，避免误伤更长的数字
PHONE = re.compile(...)
# TODO 2：匹配邮箱（用户名@域名.后缀）
EMAIL = re.compile(...)

def mask_pii(text):
    # TODO 3：把手机号替换成 [手机号]，邮箱替换成 [邮箱]
    ...

# mask_pii("联系我 13812345678 或 a.b@example.com") -> "联系我 [手机号] 或 [邮箱]"`,
go:String.raw`// Go 的 regexp 不支持 (?<!...) 这类“环视”，可以用 (^|\D) 和 (\D|$) 表示“前后不是数字”，
// 替换时再把前后那个字符原样放回去
// TODO 1：匹配手机号（1 开头、第二位 3-9、共 11 位），前后不能紧挨着数字
var phone = regexp.MustCompile(${BT}...${BT})
// TODO 2：匹配邮箱（用户名@域名.后缀）
var email = regexp.MustCompile(${BT}...${BT})

func maskPII(text string) string {
    // TODO 3：把手机号替换成 [手机号]（保留前后那个字符），邮箱替换成 [邮箱]
    ...
}`,
java:String.raw`// TODO 1：匹配手机号（1 开头、第二位 3-9、共 11 位），前后不能紧挨着数字（Java 字符串里反斜杠要写两次）
static final Pattern PHONE = Pattern.compile(...);
// TODO 2：匹配邮箱（用户名@域名.后缀）
static final Pattern EMAIL = Pattern.compile(...);

static String maskPii(String text) {
    // TODO 3：把手机号替换成 [手机号]，邮箱替换成 [邮箱]
    ...
}`,
ts:String.raw`// TODO 1：匹配手机号（1 开头、第二位 3-9、共 11 位），前后不能紧挨着数字（记得加 g）
const PHONE = ...;
// TODO 2：匹配邮箱（用户名@域名.后缀）
const EMAIL = ...;

function maskPii(text: string): string {
  // TODO 3：把手机号替换成 [手机号]，邮箱替换成 [邮箱]
  return ...;
}`,
rust:String.raw`use regex::Regex;

// regex 库不支持“环视”，可以用 (^|\D) 和 (\D|$) 表示“前后不是数字”，替换时再把前后字符放回去
fn mask_pii(text: &str) -> String {
    // TODO 1：匹配手机号（1 开头、第二位 3-9、共 11 位），前后不能紧挨着数字
    let phone = Regex::new(...).unwrap();
    // TODO 2：匹配邮箱（用户名@域名.后缀）
    let email = Regex::new(...).unwrap();
    // TODO 3：把手机号替换成 [手机号]（保留前后那个字符），邮箱替换成 [邮箱]
    ...
}`,
},
};
