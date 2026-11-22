import type {CodeLang} from '@/content/code-refs';

export type QuizMainHarness={
 // 放在答题代码之前的可选辅助定义（如 Node / Message / mock llm；若用户代码已定义同名类型/函数会自动跳过）
 pre?:string;
 // 仅在用户代码不含该正则时才注入 pre
 preUnless?:RegExp;
 // 放在 main 函数体内的测试代码（Python 为 if __name__ == "__main__": 内部，JS/TS 为 main() 内部）
 mainBody:string;
 // JS/TS 的 main 是否需要 async
 asyncMain?:boolean;
 // Go 额外需要的标准库包
 goImports?:string[];
 // Java 额外需要的 import 行
 javaImports?:string[];
};

const rrfHarness:Record<CodeLang,QuizMainHarness>={
 python:{
  mainBody:`lists = [["doc1", "doc2", "doc3"], ["doc2", "doc3", "doc1"]]
print("RRF 排序结果:", rrf(lists, k=60))`,
 },
 go:{
  goImports:['fmt'],
  mainBody:`lists := [][]string{{"doc1", "doc2", "doc3"}, {"doc2", "doc3", "doc1"}}
fmt.Println("RRF 排序结果:", RRF(lists, 60))`,
 },
 java:{
  mainBody:`List<List<String>> lists = List.of(
    List.of("doc1", "doc2", "doc3"),
    List.of("doc2", "doc3", "doc1")
);
System.out.println("RRF 排序结果: " + rrf(lists, 60));`,
 },
 ts:{
  mainBody:`const lists = [["doc1", "doc2", "doc3"], ["doc2", "doc3", "doc1"]];
console.log("RRF 排序结果:", rrf(lists, 60));`,
 },
 rust:{
  mainBody:`let lists = vec![
    vec!["doc1".to_string(), "doc2".to_string(), "doc3".to_string()],
    vec!["doc2".to_string(), "doc3".to_string(), "doc1".to_string()],
];
println!("RRF 排序结果: {:?}", rrf(&lists, 60.0));`,
 },
};

const ragRrfHarness:Record<CodeLang,QuizMainHarness>={
 ...rrfHarness,
 go:{
  goImports:['fmt'],
  mainBody:`lists := [][]string{{"doc1", "doc2", "doc3"}, {"doc2", "doc3", "doc1"}}
fmt.Println("RRF 排序结果:", rrf(lists, 60))`,
 },
};

const QUIZ_HARNESSES:Record<string,Partial<Record<CodeLang,QuizMainHarness>>>={
 'ai-x2-32':rrfHarness,
 'rag-advanced-12':ragRrfHarness,

 'be-x1-37':{
  python:{
   mainBody:`print("two_sum([2, 7, 11, 15], 9) =", two_sum([2, 7, 11, 15], 9))
print("two_sum([3, 2, 4], 6) =", two_sum([3, 2, 4], 6))`,
  },
  go:{
   goImports:['fmt'],
   mainBody:`i, j, ok := twoSum([]int{2, 7, 11, 15}, 9)
fmt.Printf("twoSum([2,7,11,15], 9) = (%d, %d, %v)\\n", i, j, ok)
i2, j2, ok2 := twoSum([]int{3, 2, 4}, 6)
fmt.Printf("twoSum([3,2,4], 6) = (%d, %d, %v)\\n", i2, j2, ok2)`,
  },
  java:{
   mainBody:`System.out.println("twoSum([2,7,11,15], 9) = " + Arrays.toString(twoSum(new int[]{2, 7, 11, 15}, 9)));
System.out.println("twoSum([3,2,4], 6) = " + Arrays.toString(twoSum(new int[]{3, 2, 4}, 6)));`,
  },
  ts:{
   mainBody:`console.log("twoSum([2, 7, 11, 15], 9) =", twoSum([2, 7, 11, 15], 9));
console.log("twoSum([3, 2, 4], 6) =", twoSum([3, 2, 4], 6));`,
  },
  rust:{
   mainBody:`println!("two_sum([2, 7, 11, 15], 9) = {:?}", two_sum(&[2, 7, 11, 15], 9));
println!("two_sum([3, 2, 4], 6) = {:?}", two_sum(&[3, 2, 4], 6));`,
  },
 },

 'be-ds-10':{
  python:{
   pre:`class Node:
    def __init__(self, val, next=None):
        self.val = val
        self.next = next`,
   preUnless:/^\s*class\s+Node\b/m,
   mainBody:`a, b, c = Node(1), Node(2), Node(3)
a.next, b.next, c.next = b, c, b  # 有环
print("有环链表:", has_cycle(a))
x, y = Node(1), Node(2)
x.next = y  # 无环
print("无环链表:", has_cycle(x))`,
  },
  go:{
   goImports:['fmt'],
   pre:`type Node struct {
	Val  int
	Next *Node
}`,
   preUnless:/\btype\s+Node\b/,
   mainBody:`a, b, c := &Node{Val: 1}, &Node{Val: 2}, &Node{Val: 3}
a.Next, b.Next, c.Next = b, c, b // 有环
fmt.Println("有环链表:", hasCycle(a))
x := &Node{Val: 1, Next: &Node{Val: 2}} // 无环
fmt.Println("无环链表:", hasCycle(x))`,
  },
  java:{
   pre:`static class Node {
    int val;
    Node next;
    Node(int val) { this.val = val; }
}`,
   preUnless:/\bclass\s+Node\b/,
   mainBody:`Node a = new Node(1), b = new Node(2), c = new Node(3);
a.next = b; b.next = c; c.next = b; // 有环
System.out.println("有环链表: " + hasCycle(a));
Node x = new Node(1); x.next = new Node(2); // 无环
System.out.println("无环链表: " + hasCycle(x));`,
  },
  ts:{
   pre:`type ListNode = { val: number; next: ListNode | null };`,
   preUnless:/\b(type|interface|class)\s+ListNode\b/,
   mainBody:`const a: ListNode = { val: 1, next: null };
const b: ListNode = { val: 2, next: null };
const c: ListNode = { val: 3, next: null };
a.next = b; b.next = c; c.next = b; // 有环
console.log("有环链表:", hasCycle(a));
const x: ListNode = { val: 1, next: { val: 2, next: null } }; // 无环
console.log("无环链表:", hasCycle(x));`,
  },
  rust:{
   mainBody:`let cyclic = vec![Node { next: Some(1) }, Node { next: Some(2) }, Node { next: Some(1) }];
let acyclic = vec![Node { next: Some(1) }, Node { next: None }];
println!("有环链表: {}", has_cycle(&cyclic, Some(0)));
println!("无环链表: {}", has_cycle(&acyclic, Some(0)));`,
  },
 },

 'be-algo-10':{
  python:{
   mainBody:`head = Node(1, Node(2, Node(3)))
cur = reverse(head)
vals = []
while cur:
    vals.append(cur.val)
    cur = cur.next
print("反转结果:", vals)`,
  },
  go:{
   goImports:['fmt'],
   mainBody:`head := &Node{Val: 1, Next: &Node{Val: 2, Next: &Node{Val: 3}}}
var vals []int
for cur := Reverse(head); cur != nil; cur = cur.Next {
	vals = append(vals, cur.Val)
}
fmt.Println("反转结果:", vals)`,
  },
  java:{
   mainBody:`Node head = new Node(1);
head.next = new Node(2);
head.next.next = new Node(3);
List<Integer> vals = new ArrayList<>();
for (Node cur = reverse(head); cur != null; cur = cur.next) vals.add(cur.val);
System.out.println("反转结果: " + vals);`,
  },
  ts:{
   mainBody:`const head: ListNode = { val: 1, next: { val: 2, next: { val: 3, next: null } } };
const vals: number[] = [];
for (let cur = reverse(head); cur; cur = cur.next) vals.push(cur.val);
console.log("反转结果:", vals);`,
  },
  rust:{
   mainBody:`let head = Some(Box::new(Node { val: 1, next: Some(Box::new(Node { val: 2, next: Some(Box::new(Node { val: 3, next: None })) })) }));
let mut vals = Vec::new();
let mut cur = reverse(head);
while let Some(node) = cur {
    vals.push(node.val);
    cur = node.next;
}
println!("反转结果: {:?}", vals);`,
  },
 },

 'be-x1-15':{
  python:{
   mainBody:`lru = LRU(2)
lru.put(1, 10)
lru.put(2, 20)
print("get(1) =", lru.get(1))
lru.put(3, 30)  # 淘汰最久未使用的 key=2
print("get(2) =", lru.get(2), "get(3) =", lru.get(3))`,
  },
  go:{
   goImports:['fmt','container/list'],
   mainBody:`lru := NewLRU(2)
lru.Put(1, 10)
lru.Put(2, 20)
v1, ok1 := lru.Get(1)
fmt.Println("Get(1) =", v1, ok1)
lru.Put(3, 30) // 淘汰最久未使用的 key=2
v2, ok2 := lru.Get(2)
v3, ok3 := lru.Get(3)
fmt.Println("Get(2) =", v2, ok2, "| Get(3) =", v3, ok3)`,
  },
  java:{
   mainBody:`LRU<Integer, Integer> lru = new LRU<>(2);
lru.put(1, 10);
lru.put(2, 20);
System.out.println("get(1) = " + lru.get(1));
lru.put(3, 30); // 淘汰最久未使用的 key=2
System.out.println("get(2) = " + lru.get(2) + ", get(3) = " + lru.get(3));`,
  },
  ts:{
   mainBody:`const lru = new LRU<number, number>(2);
lru.put(1, 10);
lru.put(2, 20);
console.log("get(1) =", lru.get(1));
lru.put(3, 30); // 淘汰最久未使用的 key=2
console.log("get(2) =", lru.get(2), "get(3) =", lru.get(3));`,
  },
  rust:{
   mainBody:`let mut lru = Lru::new(2);
lru.put(1, 10);
lru.put(2, 20);
println!("get(1) = {:?}", lru.get(1));
lru.put(3, 30);
println!("get(2) = {:?}, get(3) = {:?}", lru.get(2), lru.get(3));`,
  },
 },

 'ai-e1-24':{
  python:{
   mainBody:`print(chunk_text("面试自习室AI开发实战课程", size=5, overlap=2))`,
  },
  go:{
   goImports:['fmt'],
   mainBody:`fmt.Println(ChunkText("面试自习室AI开发实战课程", 5, 2))`,
  },
  java:{
   mainBody:`System.out.println(chunkText("面试自习室AI开发实战课程", 5, 2));`,
  },
  ts:{
   mainBody:`console.log(chunkText("面试自习室AI开发实战课程", 5, 2));`,
  },
  rust:{
   mainBody:`println!("{:?}", chunk_text("面试自习室AI开发实战课程", 5, 2));`,
  },
 },

 'calling-12':{
  python:{
   pre:`def llm(history):
    return f"收到第 {len(history)} 条历史，最新一句：{history[-1]['content']}"`,
   preUnless:/^\s*def\s+llm\s*\(/m,
   mainBody:`print("第 1 轮:", chat("你好，我在准备 AI 面试"))
print("第 2 轮:", chat("请记住刚才的话题"))
print("当前历史条数:", len(messages))`,
  },
  go:{
   goImports:['fmt'],
   pre:`type Message struct {
	Role    string
	Content string
}

func llm(history []Message) (string, error) {
	return fmt.Sprintf("收到 %d 条历史，最新一句：%s", len(history), history[len(history)-1].Content), nil
}`,
   preUnless:/\btype\s+Message\b/,
   mainBody:`r1, _ := chat("你好，我在准备 AI 面试")
r2, _ := chat("请记住刚才的话题")
fmt.Println("第 1 轮:", r1)
fmt.Println("第 2 轮:", r2)
fmt.Println("历史条数:", len(messages))`,
  },
  java:{
   pre:`static String llm(List<Message> history) {
    return "收到 " + history.size() + " 条历史，最新一句：" + history.get(history.size() - 1).content();
}`,
   preUnless:/\bstatic\s+String\s+llm\s*\(/,
   mainBody:`System.out.println("第 1 轮: " + chat("你好，我在准备 AI 面试"));
System.out.println("第 2 轮: " + chat("请记住刚才的话题"));
System.out.println("历史条数: " + messages.size());`,
  },
  ts:{
   pre:`async function llm(history: Message[]): Promise<string> {
  return \`收到 \${history.length} 条历史，最新一句：\${history[history.length - 1].content}\`;
}`,
   preUnless:/\bfunction\s+llm\s*\(/,
   asyncMain:true,
   mainBody:`console.log("第 1 轮:", await chat("你好，我在准备 AI 面试"));
console.log("第 2 轮:", await chat("请记住刚才的话题"));
console.log("历史条数:", messages.length);`,
  },
  rust:{
   pre:`fn llm(history: &[Message]) -> String {
    format!("收到 {} 条历史，最新一句：{}", history.len(), history.last().map(|m| m.content.as_str()).unwrap_or(""))
}`,
   preUnless:/\bfn\s+llm\s*\(/,
   mainBody:`let mut c = Chat { messages: Vec::new() };
println!("第 1 轮: {}", c.chat("你好，我在准备 AI 面试"));
println!("第 2 轮: {}", c.chat("请记住刚才的话题"));
println!("历史条数: {}", c.messages.len());`,
  },
 },

 'engineering-12':{
  python:{
   mainBody:`state = {"n": 0}
def flaky():
    state["n"] += 1
    if state["n"] < 3:
        raise RetryableError(f"第 {state['n']} 次临时超时")
    return "调用成功！"
print(with_retry(flaky, max_retries=3, base=0.05))`,
  },
  go:{
   goImports:['fmt','errors','time'],
   mainBody:`n := 0
err := withRetry(func() error {
	n++
	if n < 3 {
		return fmt.Errorf("第 %d 次临时超时", n)
	}
	fmt.Println("第 3 次调用成功！")
	return nil
}, 3, 20*time.Millisecond, func(err error) bool { return err != nil })
fmt.Println("最终错误:", err)`,
  },
  ts:{
   asyncMain:true,
   mainBody:`let n = 0;
const res = await withRetry(async () => {
  n++;
  if (n < 3) throw Object.assign(new Error("临时超时"), { retryable: true });
  return "调用成功！";
}, 3, 20);
console.log(res);`,
  },
 },

 'fe-f-27':{
  ts:{
   mainBody:`const cache = new LRUCache(2);
cache.put("a", 1);
cache.put("b", 2);
console.log("get(a) =", cache.get("a"));
cache.put("c", 3);
console.log("get(b) =", cache.get("b"), "get(c) =", cache.get("c"));`,
  },
 },
};

export function quizMainFor(questionId:string|undefined,lang:CodeLang):QuizMainHarness|null{
 if(!questionId)return null;
 return QUIZ_HARNESSES[questionId]?.[lang]??null;
}
