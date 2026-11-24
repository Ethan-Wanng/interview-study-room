import type {StarterMap} from './types';

// 《复刻面试自习室》新增关卡代码题的作答框架。
export const projectStarters:StarterMap={
'pj-stream-code-1':{
python:String.raw`class ThinkSplitter:
    def __init__(self, on_think, on_answer):
        self.mode = "init"
        self.buf = ""
        self.on_think = on_think
        self.on_answer = on_answer

    def feed_chunk(self, chunk: str) -> None:
        if not chunk:
            return
        self.buf += chunk
        if self.mode == "init":
            # TODO 1：跳过开头空白并判断是否为 <think> 前缀；匹配完整标签切入 think，确定非标签切入 answer 并吐出缓冲
            pass
        if self.mode == "think":
            # TODO 2：查找 </think> 结束标签；未找到时保留末尾可能是 </think> 前缀的部分，立刻回调其余思考内容
            pass
        if self.mode == "answer":
            # TODO 3：将当前缓冲作为正文直接回调 on_answer 并清空 buf
            pass

    def flush(self) -> None:
        if not self.buf:
            return
        # TODO 4：流结束时按当前 mode 把残余 buf 回调给 on_think 或 on_answer 并清空 buf`,
go:String.raw`package stream

type ThinkSplitter struct {
	mode     string
	buf      string
	onThink  func(string)
	onAnswer func(string)
}

func NewThinkSplitter(onThink, onAnswer func(string)) *ThinkSplitter {
	return &ThinkSplitter{mode: "init", onThink: onThink, onAnswer: onAnswer}
}

func (s *ThinkSplitter) FeedChunk(chunk string) {
	if chunk == "" {
		return
	}
	s.buf += chunk
	if s.mode == "init" {
		// TODO 1：跳过开头空白并判断是否为 <think> 前缀；匹配完整标签切入 think，确定非标签切入 answer 并吐出缓冲
	}
	if s.mode == "think" {
		// TODO 2：查找 </think> 结束标签；未找到时保留末尾可能是 </think> 前缀的部分，立刻回调其余思考内容
	}
	if s.mode == "answer" {
		// TODO 3：将当前缓冲作为正文直接回调 onAnswer 并清空 buf
	}
}

func (s *ThinkSplitter) Flush() {
	if s.buf == "" {
		return
	}
	// TODO 4：流结束时按当前 mode 把残余 buf 回调给 onThink 或 onAnswer 并清空 buf
}`,
ts:String.raw`export class ThinkSplitter {
  private mode: 'init' | 'think' | 'answer' = 'init';
  private buf = '';

  constructor(
    private readonly onThink: (text: string) => void,
    private readonly onAnswer: (text: string) => void,
  ) {}

  feedChunk(chunk: string): void {
    if (!chunk) return;
    this.buf += chunk;
    if (this.mode === 'init') {
      // TODO 1：跳过开头空白并判断是否为 <think> 前缀；匹配完整标签切入 think，确定非标签切入 answer 并吐出缓冲
    }
    if (this.mode === 'think') {
      // TODO 2：查找 </think> 结束标签；未找到时保留末尾可能是 </think> 前缀的部分，立刻回调其余思考内容
    }
    if (this.mode === 'answer') {
      // TODO 3：将当前缓冲作为正文直接回调 onAnswer 并清空 buf
    }
  }

  flush(): void {
    if (!this.buf) return;
    // TODO 4：流结束时按当前 mode 把残余 buf 回调给 onThink 或 onAnswer 并清空 buf
  }
}`},
'pj-notes-code-1':{
python:String.raw`def escape_like(q: str) -> str:
    s = q.strip()
    # TODO 1：先转义反斜杠，再依次转义 SQL LIKE 通配符 % 和 _
    return s


def make_snippet(text: str, q: str) -> str:
    clean = " ".join((text or "").split())
    # TODO 2：不区分大小写查找 q，按关键词前后窗口截取摘要并在必要时补全首尾省略号
    return ""


def merge_search(q: str, type_filter: str, page: int, size: int, questions, customs, notes):
    kw = q.strip()
    counts = {"question": 0, "custom": 0, "note": 0}
    # TODO 3：若清洗后关键词为空，直接返回空 items、total=0、page、size 与全 0 counts
    # TODO 4：扫描三路数据源统计 counts，按 type_filter 筛选命中项并分页切片返回
    return {"items": [], "total": 0, "page": page, "size": size, "counts": counts}`,
go:String.raw`package search

type SearchDoc struct {
	ID      int64
	Title   string
	Body    string
	Tags    string
}

type SearchHit struct {
	Type    string
	ID      int64
	Title   string
	Snippet string
}

type SearchResult struct {
	Items  []SearchHit
	Total  int
	Page   int
	Size   int
	Counts map[string]int
}

func EscapeLike(q string) string {
	// TODO 1：先转义反斜杠，再依次转义 SQL LIKE 通配符 % 和 _
	return ""
}

func MakeSnippet(text, q string) string {
	// TODO 2：折叠连续空白并做不区分大小写查找，截取关键词上下文窗口且按需拼接省略号
	return ""
}

func MergeSearch(q, typeFilter string, page, size int, questions, customs, notes []SearchDoc) SearchResult {
	counts := map[string]int{"question": 0, "custom": 0, "note": 0}
	// TODO 3：空关键词时直接返回空列表、Total=0 与全 0 Counts
	// TODO 4：先统计三路命中数 counts，再按 typeFilter 过滤并切片返回对应分页结果
	return SearchResult{Items: nil, Total: 0, Page: page, Size: size, Counts: counts}
}`,
ts:String.raw`export interface SearchDoc {
  id: number | string;
  title: string;
  body?: string;
  answer?: string;
  content?: string;
  tags?: string;
}

export function escapeLike(q: string): string {
  const s = q.trim();
  // TODO 1：先转义反斜杠，再依次转义 % 和 _
  return s;
}

export function makeSnippet(text: string, q: string): string {
  const clean = (text || '').trim().replace(/\s+/g, ' ');
  // TODO 2：不区分大小写定位关键词，截取前后上下文并按边界补全省略号
  return clean;
}

export function mergeSearch(
  q: string,
  typeFilter: string,
  page: number,
  size: number,
  questions: SearchDoc[],
  customs: SearchDoc[],
  notes: SearchDoc[],
) {
  const counts = { question: 0, custom: 0, note: 0 };
  // TODO 3：空关键词直接返回空 items、total 为 0 与全 0 counts
  // TODO 4：统计三路命中计数 counts，再按 typeFilter 筛选并分页切片返回
  return { items: [] as Array<{ type: string; id: number | string; title: string; snippet: string }>, total: 0, page, size, counts };
}`},
'pj-playground-code-1':{
python:String.raw`def count_effective_edits(user_code: str, starter_code: str) -> int:
    def is_comment(line: str) -> bool:
        # TODO 1：清理首尾空白并识别 //、#、-- 开头注释行（这里接收已 trim 的行或先 trim）
        return False

    # TODO 2：按行拆分 starter_code 并构造非空行集合用于比对原骨架行
    starter_lines = set()

    count = 0
    for raw in user_code.splitlines():
        t = raw.strip()
        # TODO 3：忽略空行、纯注释行以及在 starter_lines 中原样出现的行
        # TODO 4：仅统计剩余有效改动行数并累加到 count
        pass
    return count`,
go:String.raw`package sandbox

import "strings"

func CountEffectiveEdits(userCode, starterCode string) int {
	isComment := func(t string) bool {
		// TODO 1：判断已 TrimSpace 的行是否以 //、# 或 -- 开头
		return false
	}

	starterLines := map[string]struct{}{}
	for _, raw := range strings.Split(strings.ReplaceAll(starterCode, "\r\n", "\n"), "\n") {
		t := strings.TrimSpace(raw)
		// TODO 2：将 starterCode 中的非空行写入 starterLines 集合
		_ = t
	}

	count := 0
	for _, raw := range strings.Split(strings.ReplaceAll(userCode, "\r\n", "\n"), "\n") {
		t := strings.TrimSpace(raw)
		// TODO 3：跳过空行、注释行（isComment）以及存在于 starterLines 中的骨架行
		// TODO 4：对有效改动行计数（count++）
		_ = isComment(t)
	}
	return count
}`,
ts:String.raw`export function countEffectiveEdits(userCode: string, starterCode: string): number {
  const isComment = (t: string): boolean => {
    // TODO 1：判断是否为 //、# 或 -- 开头的纯注释行
    return false;
  };

  // TODO 2：按 \r?\n 拆行并去空白后，把 starterCode 的非空行放入 Set
  const starterLines = new Set<string>();

  let count = 0;
  for (const raw of userCode.split(/\r?\n/)) {
    const t = raw.trim();
    // TODO 3：忽略空行、纯注释行以及在 starterLines 中出现过的行
    // TODO 4：累加有效修改行数量
    void isComment(t);
  }
  return count;
}`},
'pj-jd-code-1':{
python:String.raw`def normalize_resume_payload(raw, fallback_role: str = "目标岗位"):
    if not isinstance(raw, dict):
        return None
    # TODO 1：清洗 target_role 与 positioning，并过滤掉 category 或 items 为空的技术栈分组
    tech_stack = []
    # TODO 2：清洗 STAR 项目各字段并过滤掉 name 或 actions 为空的项目；若 tech_stack 或 projects 为空返回 None
    projects = []
    return None


def merge_report_phase(report: dict, step_idx: int, new_quizzes: list) -> dict:
    # TODO 3：校验 report.roadmap 与 step_idx 范围，浅拷贝 roadmap 并保留原有 resume 等其余字段
    # TODO 4：清洗 new_quizzes，仅在非空时更新目标阶段 quizzes，否则保留原阶段题目
    return dict(report)`,
go:String.raw`package jd

import "errors"

func NormalizeResumePayload(raw map[string]any, fallbackRole string) map[string]any {
	if raw == nil {
		return nil
	}
	// TODO 1：清洗 targetRole 与 positioning，过滤 category 或 items 为空的技术栈分组
	// TODO 2：清洗 STAR 项目各字段，过滤 name 或 actions 为空的项目；任意关键列表为空返回 nil
	return nil
}

func MergeReportPhase(report map[string]any, stepIdx int, newQuizzes []map[string]any) (map[string]any, error) {
	// TODO 3：校验 roadmap 与 stepIdx 索引合法性，不可变浅拷贝 report 与 roadmap，保留 resume 等字段
	// TODO 4：仅当规范化后有效新题非空时更新 stepIdx 的 quizzes，否则保留原有题目
	return nil, errors.New("not implemented")
}`,
ts:String.raw`export function normalizeResumePayload(raw: any, fallbackRole = '目标岗位') {
  if (!raw || typeof raw !== 'object') return null;
  // TODO 1：清洗 targetRole、positioning，并过滤 category 或 items 为空的技术栈分组
  // TODO 2：清洗 STAR 项目各字段，过滤 name 或 actions 为空的项目；techStack 或 projects 为空返回 null
  return null;
}

export function mergeReportPhase(report: any, stepIdx: number, newQuizzes: any[]) {
  // TODO 3：校验 stepIdx 范围，浅拷贝 roadmap 并完整保留原 report 的 resume 等其余字段
  // TODO 4：过滤出有效新题目；仅当非空时覆写目标阶段 quizzes，否则保留原题目
  return { ...report };
}`},
'pj-community-code-1':{
python:String.raw`def allow_request(timestamps: list[int], now_ms: int, window_ms: int, limit: int) -> tuple[list[int], bool]:
    # TODO 1：计算窗口起点 cutoff = now_ms - window_ms，仅保留严格未过期的时间戳（>= cutoff）
    kept: list[int] = []
    # TODO 2：处理 limit <= 0 或窗口内数量已达 limit 的情况，返回 (kept, False)
    # TODO 3：注意被拒绝时不要把 now_ms 写入 kept，避免无效请求占满限流窗口
    # TODO 4：允许放行时将 now_ms 追加到 kept 末尾并返回 (kept, True)
    return kept, False`,
go:String.raw`package community

func AllowRequest(timestamps []int64, nowMs, windowMs int64, limit int) ([]int64, bool) {
	// TODO 1：计算 cutoff := nowMs - windowMs，并保留所有 >= cutoff 的未过期时间戳
	var kept []int64
	// TODO 2：若 limit <= 0 或 len(kept) >= limit，拒绝请求并返回 (kept, false)
	// TODO 3：拒绝时切勿追加 nowMs，防止重复重试永远占满配额
	// TODO 4：允许通过时把 nowMs 追加到 kept 末尾并返回 (kept, true)
	return kept, false
}`,
ts:String.raw`export function allowRequest(
  timestamps: number[],
  nowMs: number,
  windowMs: number,
  limit: number,
): { kept: number[]; allowed: boolean } {
  // TODO 1：计算 cutoff = nowMs - windowMs 并保留 >= cutoff 的未过期时间戳
  const kept: number[] = [];
  // TODO 2：当 limit <= 0 或 kept.length >= limit 时拒绝请求并返回 { kept, allowed: false }
  // TODO 3：被拒绝时不要写入 nowMs，避免恶意重试占满配额
  // TODO 4：允许时追加 nowMs 到 kept 末尾并返回 { kept, allowed: true }
  return { kept, allowed: false };
}`},
};
