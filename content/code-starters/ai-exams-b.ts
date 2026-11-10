import type {StarterMap} from './types';

// AI 考试题 ai-e2-24（Agent 安全阀）、ai-e2-25（评委位置偏差）的作答框架。
export const aiExamStartersB:StarterMap={
'ai-e2-24':{
python:String.raw`class Guard:
    """超限时抛出异常，异常信息就是停止原因。"""
    def __init__(self, max_steps: int, max_tokens: int, forbidden: set[str]):
        self.max_steps = max_steps
        self.max_tokens = max_tokens
        self.forbidden = forbidden
        self.steps = 0   # 已经走了多少步
        self.tokens = 0  # 已经用了多少 token

    def before(self, tool: str) -> None:
        """每次调用工具前检查。"""
        # TODO 1：工具在禁止名单里，抛出异常并说明是哪个工具
        ...
        # TODO 2：步数已经到上限，抛出异常；没到就把步数加 1
        ...

    def add_tokens(self, n: int) -> None:
        """每次调用模型后，累加这次用掉的 token。"""
        # TODO 3：累加 token，超过预算就抛出异常并说明预算是多少
        ...`,
go:String.raw`type Guard struct {
    MaxSteps  int
    MaxTokens int
    Forbidden map[string]bool
    steps     int
    tokens    int
}

// 每次调用工具前检查；返回的 error 就是停止原因
func (g *Guard) Before(tool string) error {
    // TODO 1：工具在禁止名单里，返回错误并说明是哪个工具
    ...
    // TODO 2：步数已经到上限，返回错误；没到就把步数加 1
    ...
    return nil
}

// 每次调用模型后累加 token
func (g *Guard) AddTokens(n int) error {
    // TODO 3：累加 token，超过预算就返回错误并说明预算是多少
    ...
    return nil
}`,
java:String.raw`class Guard {
    private final int maxSteps, maxTokens;
    private final Set<String> forbidden;
    private int steps = 0, tokens = 0;

    Guard(int maxSteps, int maxTokens, Set<String> forbidden) {
        this.maxSteps = maxSteps;
        this.maxTokens = maxTokens;
        this.forbidden = forbidden;
    }

    // 每次调用工具前检查；超限时抛出异常，异常信息就是停止原因
    void before(String tool) {
        // TODO 1：工具在禁止名单里，抛出异常并说明是哪个工具
        ...
        // TODO 2：步数已经到上限，抛出异常；没到就把步数加 1
        ...
    }

    // 每次调用模型后累加 token
    void addTokens(int n) {
        // TODO 3：累加 token，超过预算就抛出异常并说明预算是多少
        ...
    }
}`,
ts:String.raw`class Guard {
  private steps = 0;
  private tokens = 0;
  constructor(
    private maxSteps: number,
    private maxTokens: number,
    private forbidden: Set<string>,
  ) {}

  // 每次调用工具前检查；超限时抛出错误，错误信息就是停止原因
  before(tool: string): void {
    // TODO 1：工具在禁止名单里，抛出错误并说明是哪个工具
    ...
    // TODO 2：步数已经到上限，抛出错误；没到就把步数加 1
    ...
  }

  // 每次调用模型后累加 token
  addTokens(n: number): void {
    // TODO 3：累加 token，超过预算就抛出错误并说明预算是多少
    ...
  }
}`,
rust:String.raw`use std::collections::HashSet;

struct Guard {
    max_steps: u32,
    max_tokens: u64,
    forbidden: HashSet<String>,
    steps: u32,
    tokens: u64,
}

impl Guard {
    // 每次调用工具前检查；返回 Err 时里面的字符串就是停止原因
    fn before(&mut self, tool: &str) -> Result<(), String> {
        // TODO 1：工具在禁止名单里，返回 Err 并说明是哪个工具
        ...
        // TODO 2：步数已经到上限，返回 Err；没到就把步数加 1
        ...
        Ok(())
    }

    // 每次调用模型后累加 token
    fn add_tokens(&mut self, n: u64) -> Result<(), String> {
        // TODO 3：累加 token，超过预算就返回 Err 并说明预算是多少
        ...
        Ok(())
    }
}`,
},

'ai-e2-25':{
python:String.raw`def debias(first: list[str], second: list[str]) -> tuple[int, int, int]:
    # first[i]：A 在前时评委选的胜者；second[i]：B 在前时选的胜者（已换算回原来的 A/B）
    a_wins = b_wins = ties = 0
    # TODO 1：把两次判决按位置一一配对（可以用 zip）
    for f, s in ...:
        # TODO 2：两次都判 A 胜才算 A 胜，两次都判 B 胜才算 B 胜
        ...
        # TODO 3：其他情况（两次不一致）算平局
        ...
    return a_wins, b_wins, ties`,
go:String.raw`// first[i]：A 在前时评委选的胜者（"A" 或 "B"）
// second[i]：B 在前时评委选的胜者（"A" 或 "B"，已经换算回原来的 A/B）
func Debias(first, second []string) (aWins, bWins, ties int) {
    for i := range first {
        // TODO 1：两次都判 A 胜才算 A 胜，两次都判 B 胜才算 B 胜
        // TODO 2：其他情况（两次不一致）算平局
        ...
    }
    return
}`,
java:String.raw`// 返回 {A 胜, B 胜, 平局}
static int[] debias(String[] first, String[] second) {
    int aWins = 0, bWins = 0, ties = 0;
    for (int i = 0; i < first.length; i++) {
        // TODO 1：两次都判 A 胜才算 A 胜，两次都判 B 胜才算 B 胜
        // TODO 2：其他情况（两次不一致）算平局
        ...
    }
    return new int[]{aWins, bWins, ties};
}`,
ts:String.raw`function debias(first: string[], second: string[]): { aWins: number; bWins: number; ties: number } {
  let aWins = 0, bWins = 0, ties = 0;
  first.forEach((f, i) => {
    const s = second[i]; // 同一对回答的第二次判决
    // TODO 1：两次都判 A 胜才算 A 胜，两次都判 B 胜才算 B 胜
    // TODO 2：其他情况（两次不一致）算平局
    ...
  });
  return { aWins, bWins, ties };
}`,
rust:String.raw`// 返回 (A 胜, B 胜, 平局)
fn debias(first: &[&str], second: &[&str]) -> (u32, u32, u32) {
    let (mut a, mut b, mut ties) = (0, 0, 0);
    // TODO 1：把两次判决按位置配对（可以用 zip）
    for (f, s) in ... {
        // TODO 2：两次都是 "A" 算 A 胜，都是 "B" 算 B 胜，其他算平局（可以用 match）
        ...
    }
    (a, b, ties)
}`,
},
};
