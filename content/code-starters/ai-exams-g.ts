import type {StarterMap} from './types';

const BT='`'; // Go 原始字符串的反引号

// AI 训练题 ai-x4-25（输入护栏）、ai-x4-26（KV 缓存显存估算）的作答框架。
export const aiExamStartersG:StarterMap={
'ai-x4-25':{
python:String.raw`import re

# TODO 1：写出匹配手机号（11 位、1 开头）的正则
PHONE_RE = re.compile(...)
ATTACKS = ["忽略之前的指令", "ignore previous instructions"]

def check_input(text: str) -> tuple[str, bool, str]:
    """返回 (清洗后的文本, 是否拦截, 拦截原因)。"""
    # TODO 2：大小写不敏感地检查攻击短语；命中时返回 ("", True, 原因)
    ...
    # TODO 3：把所有手机号替换成 [手机号]，返回 (清洗后的文本, False, "")
    ...`,
go:String.raw`// TODO 1：写出匹配手机号（11 位、1 开头）的正则
var phoneRe = regexp.MustCompile(${BT}...${BT})
var attacks = []string{"忽略之前的指令", "ignore previous instructions"}

// 返回 (清洗后的文本, 是否拦截, 拦截原因)
func CheckInput(text string) (string, bool, string) {
    // TODO 2：大小写不敏感地检查攻击短语；命中时返回 "", true, 原因
    ...
    // TODO 3：把所有手机号替换成 [手机号]，返回清洗后的文本、false、""
    ...
}`,
java:String.raw`record Checked(String clean, boolean blocked, String reason) {}

// TODO 1：写出匹配手机号（11 位、1 开头）的正则（Java 字符串里反斜杠要写两次）
static final Pattern PHONE = Pattern.compile(...);
static final List<String> ATTACKS = List.of("忽略之前的指令", "ignore previous instructions");

static Checked checkInput(String text) {
    // TODO 2：大小写不敏感地检查攻击短语；命中时返回 new Checked("", true, 原因)
    ...
    // TODO 3：把所有手机号替换成 [手机号]，返回 new Checked(清洗后的文本, false, "")
    ...
}`,
ts:String.raw`// TODO 1：写出匹配手机号（11 位、1 开头）的正则（记得加 g，替换所有匹配）
const PHONE_RE = ...;
const ATTACKS = ["忽略之前的指令", "ignore previous instructions"];

function checkInput(text: string): { clean: string; blocked: boolean; reason: string } {
  // TODO 2：大小写不敏感地检查攻击短语；命中时返回 { clean: "", blocked: true, reason: 原因 }
  ...
  // TODO 3：把所有手机号替换成 [手机号]，返回 { clean, blocked: false, reason: "" }
  ...
}`,
rust:String.raw`use regex::Regex;

const ATTACKS: [&str; 2] = ["忽略之前的指令", "ignore previous instructions"];

// 返回 (清洗后的文本, 是否拦截, 拦截原因)
fn check_input(text: &str) -> (String, bool, String) {
    // TODO 1：大小写不敏感地检查攻击短语；命中时返回 (String::new(), true, 原因)
    ...
    // TODO 2：写出匹配手机号（11 位、1 开头）的正则
    let phone = Regex::new(...).unwrap();
    // TODO 3：把所有手机号替换成 [手机号]，返回 (清洗后的文本, false, String::new())
    ...
}`,
},

'ai-x4-26':{
python:String.raw`# KV 缓存 = 2（K 和 V）× 层数 × KV 头数 × 每头维度 × 序列长度 × 并发数 × 每元素字节数
def kv_cache_gb(L: int, H: int, D: int, S: int, B: int, bytes_per_elem: int) -> float:
    # TODO 1：按上面的公式算出总字节数（H 是 KV 头数，不是 Query 头数）
    total = ...
    # TODO 2：字节换算成 GB（除以 2 的 30 次方）
    return ...

# 例：kv_cache_gb(32, 8, 128, 8192, 16, 2) → 16.0`,
go:String.raw`// KV 缓存 = 2（K 和 V）× 层数 × KV 头数 × 每头维度 × 序列长度 × 并发数 × 每元素字节数
func KVCacheGB(L, H, D, S, B, bytes int) float64 {
    // TODO 1：按上面的公式算出总字节数（先转成 float64，避免 int 相乘溢出）
    total := ...
    // TODO 2：字节换算成 GB（除以 2 的 30 次方）
    return ...
}
// 例：L=32, H=8(GQA), D=128, S=8192, B=16, bytes=2 → 约 16 GB`,
java:String.raw`// KV 缓存 = 2（K 和 V）× 层数 × KV 头数 × 每头维度 × 序列长度 × 并发数 × 每元素字节数
static double kvCacheGB(int L, int H, int D, int S, int B, int bytes) {
    // TODO 1：按上面的公式算出总字节数（用 double 计算，避免 int 相乘溢出）
    double total = ...;
    // TODO 2：字节换算成 GB（除以 2 的 30 次方）
    return ...;
}
// 例：kvCacheGB(32, 8, 128, 8192, 16, 2) → 16.0`,
ts:String.raw`// KV 缓存 = 2（K 和 V）× 层数 × KV 头数 × 每头维度 × 序列长度 × 并发数 × 每元素字节数
function kvCacheGB(L: number, H: number, D: number, S: number, B: number, bytes: number): number {
  // TODO 1：按上面的公式算出总字节数
  const total = ...;
  // TODO 2：字节换算成 GB（除以 2 的 30 次方）
  return ...;
}
// 例：kvCacheGB(32, 8, 128, 8192, 16, 2) → 16`,
rust:String.raw`// KV 缓存 = 2（K 和 V）× 层数 × KV 头数 × 每头维度 × 序列长度 × 并发数 × 每元素字节数
fn kv_cache_gb(l: u64, h: u64, d: u64, s: u64, b: u64, bytes: u64) -> f64 {
    // TODO 1：按上面的公式算出总字节数（u64 不会溢出）
    let total = ...;
    // TODO 2：字节换算成 GB（转成 f64 后除以 2 的 30 次方）
    ...
}
// 例：kv_cache_gb(32, 8, 128, 8192, 16, 2) → 16.0`,
},
};
