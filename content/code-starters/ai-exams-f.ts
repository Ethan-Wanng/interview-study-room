import type {StarterMap} from './types';

// AI 训练题 ai-x3-24（多数投票）、ai-x3-25（Agent 评测统计）的作答框架。
export const aiExamStartersF:StarterMap={
'ai-x3-24':{
python:String.raw`from collections import Counter

def majority_vote(answers: list[str]) -> tuple[str, float]:
    # TODO 1：空输入时返回 ("", 0.0)
    ...
    # TODO 2：归一化：去掉首尾空格、统一小写，避免 "Yes" 和 "yes " 被当成两个答案
    normalized = ...
    # TODO 3：计票，找出票数最多的答案和它的票数（可以用 Counter(...).most_common(1)）
    best, best_n = ...
    # TODO 4：返回这个答案，以及它的票数占总数的比例
    return ...`,
go:String.raw`func MajorityVote(answers []string) (string, float64) {
    // TODO 1：空输入时返回 "", 0
    ...
    count := map[string]int{}
    best, bestN := "", 0
    for _, a := range answers {
        // TODO 2：归一化：去掉首尾空格、统一小写
        a = ...
        // TODO 3：给这个答案加一票；票数超过当前最多时，记下它
        ...
    }
    // TODO 4：返回票数最多的答案和它的比例（注意转成 float64 再相除）
    return ...
}`,
java:String.raw`record Vote(String answer, double ratio) {}

static Vote majorityVote(List<String> answers) {
    // TODO 1：空输入时返回 new Vote("", 0)
    ...
    Map<String, Integer> count = new HashMap<>();
    String best = "";
    int bestN = 0;
    for (String a : answers) {
        // TODO 2：归一化：去掉首尾空格、统一小写
        String key = ...;
        // TODO 3：给这个答案加一票（可以用 count.merge）；票数超过当前最多时，记下它
        ...
    }
    // TODO 4：返回票数最多的答案和它的比例（注意用小数除法）
    return ...;
}`,
ts:String.raw`function majorityVote(answers: string[]): { answer: string; ratio: number } {
  // TODO 1：空输入时返回 { answer: "", ratio: 0 }
  ...
  const count = new Map<string, number>();
  let best = "", bestN = 0;
  for (const a of answers) {
    // TODO 2：归一化：去掉首尾空格、统一小写
    const key = ...;
    // TODO 3：给这个答案加一票；票数超过当前最多时，记下它
    ...
  }
  // TODO 4：返回票数最多的答案和它的比例
  return ...;
}`,
rust:String.raw`use std::collections::HashMap;

fn majority_vote(answers: &[&str]) -> (String, f64) {
    // TODO 1：空输入时返回 (String::new(), 0.0)
    ...
    let mut count: HashMap<String, usize> = HashMap::new();
    let (mut best, mut best_n) = (String::new(), 0);
    for a in answers {
        // TODO 2：归一化：去掉首尾空格、统一小写
        let key = ...;
        // TODO 3：给这个答案加一票（entry().or_insert(0)）；票数超过当前最多时，记下它
        ...
    }
    // TODO 4：返回票数最多的答案和它的比例（转成 f64 再相除）
    ...
}`,
},

'ai-x3-25':{
python:String.raw`from dataclasses import dataclass

@dataclass
class Run:
    success: bool
    steps: int
    tokens: int
    forbidden: bool  # 是否调用了被禁止的工具

@dataclass
class Report:
    success_rate: float = 0.0
    avg_steps: float = 0.0
    avg_tokens: float = 0.0
    violations: int = 0

def summarize(runs: list[Run]) -> Report:
    # TODO 1：空输入时返回全为 0 的 Report()
    ...
    n = len(runs)
    # TODO 2：成功率、平均步数、平均 token 分别累加后除以 n
    # TODO 3：违规次数单独统计（只计数，不求平均）
    return Report(
        success_rate=...,
        avg_steps=...,
        avg_tokens=...,
        violations=...,
    )`,
go:String.raw`type Run struct {
    Success   bool
    Steps     int
    Tokens    int
    Forbidden bool // 是否调用了被禁止的工具
}

type Report struct {
    SuccessRate float64
    AvgSteps    float64
    AvgTokens   float64
    Violations  int
}

func Summarize(runs []Run) Report {
    var r Report
    // TODO 1：空输入时直接返回全为 0 的 r
    ...
    ok, steps, tokens := 0, 0, 0
    for _, x := range runs {
        // TODO 2：累加成功次数、步数、token；违规时 r.Violations 加 1
        ...
    }
    n := float64(len(runs))
    // TODO 3：算出成功率、平均步数、平均 token（转成 float64 再相除）
    ...
    return r
}`,
java:String.raw`record Run(boolean success, int steps, int tokens, boolean forbidden) {}
record Report(double successRate, double avgSteps, double avgTokens, int violations) {}

static Report summarize(List<Run> runs) {
    // TODO 1：空输入时返回 new Report(0, 0, 0, 0)
    ...
    int ok = 0, violations = 0;
    long steps = 0, tokens = 0;
    for (Run r : runs) {
        // TODO 2：累加成功次数、违规次数、步数、token
        ...
    }
    double n = runs.size();
    // TODO 3：返回成功率、平均步数、平均 token 和违规次数
    return ...;
}`,
ts:String.raw`type Run = { success: boolean; steps: number; tokens: number; forbidden: boolean };
type Report = { successRate: number; avgSteps: number; avgTokens: number; violations: number };

function summarize(runs: Run[]): Report {
  const r: Report = { successRate: 0, avgSteps: 0, avgTokens: 0, violations: 0 };
  // TODO 1：空输入时直接返回全为 0 的 r
  ...
  let ok = 0, steps = 0, tokens = 0;
  for (const x of runs) {
    // TODO 2：累加成功次数、步数、token；违规时 r.violations 加 1
    ...
  }
  const n = runs.length;
  // TODO 3：算出成功率、平均步数、平均 token
  ...
  return r;
}`,
rust:String.raw`struct Run {
    success: bool,
    steps: u32,
    tokens: u64,
    forbidden: bool, // 是否调用了被禁止的工具
}

#[derive(Default)] // Default 让所有字段初始为 0
struct Report {
    success_rate: f64,
    avg_steps: f64,
    avg_tokens: f64,
    violations: u32,
}

fn summarize(runs: &[Run]) -> Report {
    let mut r = Report::default();
    // TODO 1：空输入时直接返回全为 0 的 r
    ...
    let (mut ok, mut steps, mut tokens) = (0u32, 0u64, 0u64);
    for x in runs {
        // TODO 2：累加成功次数、步数、token；违规时 r.violations 加 1
        ...
    }
    let n = runs.len() as f64;
    // TODO 3：算出成功率、平均步数、平均 token（转成 f64 再相除）
    ...
    r
}`,
},
};
