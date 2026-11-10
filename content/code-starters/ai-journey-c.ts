import type {StarterMap} from './types';

// AI 闯关题 model-internals-12（带温度的 softmax）、model-internals-kv-size（KV 缓存估算）、agents-12（评估-优化循环）的作答框架。
export const aiJourneyStartersC:StarterMap={
'model-internals-12':{
python:String.raw`import numpy as np

def softmax_with_temperature(logits, temperature=1.0):
    # TODO 1：logits 除以温度
    z = ...
    # TODO 2：减去最大值，防止 exp 溢出
    ...
    # TODO 3：指数化后归一化（每个值除以总和）
    e = ...
    return ...`,
go:String.raw`func softmaxWithTemperature(logits []float64, temperature float64) []float64 {
    maxZ := math.Inf(-1)
    z := make([]float64, len(logits))
    for i, l := range logits {
        // TODO 1：logits 除以温度，并顺便记下最大值
        ...
    }
    sum := 0.0
    for i := range z {
        // TODO 2：减去最大值再取指数（防止 exp 溢出），并累加总和
        ...
    }
    for i := range z {
        // TODO 3：归一化：每个值除以总和
        ...
    }
    return z
}`,
java:String.raw`static double[] softmaxWithTemperature(double[] logits, double temperature) {
    double[] z = new double[logits.length];
    double max = Double.NEGATIVE_INFINITY;
    for (int i = 0; i < logits.length; i++) {
        // TODO 1：logits 除以温度，并顺便记下最大值
        ...
    }
    double sum = 0;
    for (int i = 0; i < z.length; i++) {
        // TODO 2：减去最大值再取指数（防止 exp 溢出），并累加总和
        ...
    }
    // TODO 3：归一化：每个值除以总和
    ...
    return z;
}`,
ts:String.raw`function softmaxWithTemperature(logits: number[], temperature = 1): number[] {
  // TODO 1：logits 除以温度
  const z = ...;
  const max = Math.max(...z);
  // TODO 2：减去最大值再取指数（防止 exp 溢出）
  const e = ...;
  // TODO 3：归一化：每个值除以总和
  const sum = e.reduce((a, b) => a + b, 0);
  return ...;
}`,
rust:String.raw`fn softmax_with_temperature(logits: &[f64], temperature: f64) -> Vec<f64> {
    // TODO 1：logits 除以温度
    let z: Vec<f64> = ...;
    let max = z.iter().cloned().fold(f64::NEG_INFINITY, f64::max);
    // TODO 2：减去最大值再取指数（防止 exp 溢出）
    let e: Vec<f64> = ...;
    // TODO 3：归一化：每个值除以总和
    let sum: f64 = e.iter().sum();
    ...
}`,
},

'model-internals-kv-size':{
python:String.raw`def kv_cache_gb(layers, kv_heads, head_dim, seq_len, bytes_per_elem=2):
    # TODO 1：算出总字节数：2（K 和 V 各一份）× 层数 × KV 头数 × 每头维度 × 序列长度 × 每元素字节数
    #         注意用 KV 头数，不是 Query 头数
    total = ...
    # TODO 2：字节换算成 GB（除以 1024 的 3 次方）
    return ...

# 以 32 层、8 个 KV 头、每头 128 维、FP16 为例：kv_cache_gb(32, 8, 128, 8192) -> 1.0
# 多个并发请求时，结果还要再乘以并发数`,
go:String.raw`func kvCacheGB(layers, kvHeads, headDim, seqLen, bytesPerElem int) float64 {
    // TODO 1：算出总字节数：2（K 和 V 各一份）× 层数 × KV 头数 × 每头维度 × 序列长度 × 每元素字节数
    //         先转成 float64，避免 int 相乘溢出
    total := ...
    // TODO 2：字节换算成 GB（除以 2 的 30 次方）
    return ...
}
// kvCacheGB(32, 8, 128, 8192, 2) -> 1.0；多个并发请求时还要再乘以并发数`,
java:String.raw`static double kvCacheGB(int layers, int kvHeads, int headDim, int seqLen, int bytesPerElem) {
    // TODO 1：算出总字节数：2（K 和 V 各一份）× 层数 × KV 头数 × 每头维度 × 序列长度 × 每元素字节数
    //         用 double 计算，避免 int 溢出
    double total = ...;
    // TODO 2：字节换算成 GB（除以 2 的 30 次方）
    return ...;
}
// kvCacheGB(32, 8, 128, 8192, 2) -> 1.0；多个并发请求时还要再乘以并发数`,
ts:String.raw`function kvCacheGB(layers: number, kvHeads: number, headDim: number, seqLen: number, bytesPerElem = 2): number {
  // TODO 1：算出总字节数：2（K 和 V 各一份）× 层数 × KV 头数 × 每头维度 × 序列长度 × 每元素字节数
  const total = ...;
  // TODO 2：字节换算成 GB（除以 1024 的 3 次方）
  return ...;
}
// kvCacheGB(32, 8, 128, 8192) -> 1；多个并发请求时还要再乘以并发数`,
rust:String.raw`fn kv_cache_gb(layers: u64, kv_heads: u64, head_dim: u64, seq_len: u64, bytes_per_elem: u64) -> f64 {
    // TODO 1：算出总字节数：2（K 和 V 各一份）× 层数 × KV 头数 × 每头维度 × 序列长度 × 每元素字节数
    let total = ...;
    // TODO 2：字节换算成 GB（转成 f64 后除以 2 的 30 次方）
    ...
}
// kv_cache_gb(32, 8, 128, 8192, 2) -> 1.0；多个并发请求时还要再乘以并发数`,
},

'agents-12':{
python:String.raw`def refine(task, max_rounds=3):
    # TODO 1：先生成初稿
    draft = ...
    # TODO 2：最多循环 max_rounds 轮
    for _ in ...:
        # TODO 3：先让评审给出 (是否通过, 意见)；通过就提前返回草稿
        ...
        # TODO 4：没通过：带着具体意见修改草稿
        draft = ...
    return draft  # 达到上限，返回当前最好版本`,
go:String.raw`func refine(task string, maxRounds int) string {
    // TODO 1：先生成初稿
    draft := ...
    // TODO 2：最多循环 maxRounds 轮
    for ... {
        // TODO 3：先让评审给出 (是否通过, 意见)；通过就提前返回草稿
        ...
        // TODO 4：没通过：带着具体意见修改草稿
        draft = ...
    }
    return draft // 达到上限，返回当前最好版本
}`,
java:String.raw`record Review(boolean passed, String feedback) {}

static String refine(String task, int maxRounds) {
    // TODO 1：先生成初稿
    String draft = ...;
    // TODO 2：最多循环 maxRounds 轮
    for (...) {
        // TODO 3：先让评审给出 Review；通过就提前返回草稿
        ...
        // TODO 4：没通过：带着具体意见修改草稿
        draft = ...;
    }
    return draft; // 达到上限，返回当前最好版本
}`,
ts:String.raw`async function refine(task: string, maxRounds = 3): Promise<string> {
  // TODO 1：先生成初稿
  let draft = ...;
  // TODO 2：最多循环 maxRounds 轮
  for (...) {
    // TODO 3：先让评审给出 { passed, feedback }；通过就提前返回草稿
    ...
    // TODO 4：没通过：带着具体意见修改草稿
    draft = ...;
  }
  return draft; // 达到上限，返回当前最好版本
}`,
rust:String.raw`fn refine(task: &str, max_rounds: usize) -> String {
    // TODO 1：先生成初稿
    let mut draft = ...;
    // TODO 2：最多循环 max_rounds 轮
    for _ in ... {
        // TODO 3：先让评审给出 (是否通过, 意见)；通过就提前返回草稿
        ...
        // TODO 4：没通过：带着具体意见修改草稿
        draft = ...;
    }
    draft // 达到上限，返回当前最好版本
}`,
},
};
