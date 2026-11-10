import type {StarterMap} from './types';

// AI 闯关题 calling-12（多轮对话记忆）、tool-use-12（工具调用循环）的作答框架。
export const aiJourneyStartersA:StarterMap={
'calling-12':{
python:String.raw`messages = []

def chat(user_input):
    # TODO 1：把用户输入以 role=user 追加到 messages
    ...
    # TODO 2：调用模型时传入完整的 messages 历史
    reply = ...
    # TODO 3：把模型回复以 role=assistant 追加回 messages
    ...
    return reply`,
go:String.raw`var messages []Message // Message{Role, Content}

func chat(userInput string) (string, error) {
    // TODO 1：把用户输入以 Role "user" 追加到 messages
    ...
    // TODO 2：调用模型时传入完整的 messages 历史
    reply, err := ...
    if err != nil {
        return "", err
    }
    // TODO 3：把模型回复以 Role "assistant" 追加回 messages
    ...
    return reply, nil
}`,
java:String.raw`record Message(String role, String content) {}

static final List<Message> messages = new ArrayList<>();

static String chat(String userInput) {
    // TODO 1：把用户输入以 role "user" 追加到 messages
    ...
    // TODO 2：调用模型时传入完整的 messages 历史
    String reply = ...;
    // TODO 3：把模型回复以 role "assistant" 追加回 messages
    ...
    return reply;
}`,
ts:String.raw`type Message = { role: "user" | "assistant"; content: string };
const messages: Message[] = [];

async function chat(userInput: string): Promise<string> {
  // TODO 1：把用户输入以 role "user" 追加到 messages
  ...
  // TODO 2：调用模型时传入完整的 messages 历史
  const reply = ...;
  // TODO 3：把模型回复以 role "assistant" 追加回 messages
  ...
  return reply;
}`,
rust:String.raw`struct Message {
    role: String,
    content: String,
}

// 用结构体保存历史，避免全局可变变量
struct Chat {
    messages: Vec<Message>,
}

impl Chat {
    fn chat(&mut self, user_input: &str) -> String {
        // TODO 1：把用户输入以 role "user" 追加到 self.messages
        ...
        // TODO 2：调用模型时传入完整的 messages 历史
        let reply = ...;
        // TODO 3：把模型回复以 role "assistant" 追加回 self.messages（reply 后面还要返回，记得 clone）
        ...
        reply
    }
}`,
},

'tool-use-12':{
python:String.raw`def run(messages, tools, max_steps=8):
    # TODO 1：最多循环 max_steps 轮，防止死循环
    for _ in ...:
        reply = llm(messages, tools=tools)
        # TODO 2：没有工具调用时，返回最终文本 reply.text
        ...
        call = reply.tool_call
        result = execute(call.name, call.arguments)   # 执行前校验参数和权限
        # TODO 3：先把模型的调用请求（reply.message）加入历史
        ...
        # TODO 4：再把工具结果以工具消息发回：{"role": "tool", "tool_call_id": call.id, "content": result}
        ...
    raise RuntimeError("超过最大步数")`,
go:String.raw`func run(ctx context.Context, messages []Message, tools []Tool, maxSteps int) (string, error) {
    // TODO 1：最多循环 maxSteps 轮，防止死循环
    for ... {
        reply, err := llm(ctx, messages, tools)
        if err != nil {
            return "", err
        }
        // TODO 2：没有工具调用（reply.ToolCall == nil）时，返回最终文本
        ...
        call := reply.ToolCall
        result := execute(call.Name, call.Arguments) // 执行前校验参数和权限
        // TODO 3：先把模型的调用请求（reply.Message）加入历史
        ...
        // TODO 4：再把工具结果以工具消息发回：Message{Role: "tool", ToolCallID: call.ID, Content: result}
        ...
    }
    return "", errors.New("超过最大步数")
}`,
java:String.raw`static String run(List<Message> messages, List<Tool> tools, int maxSteps) {
    // TODO 1：最多循环 maxSteps 轮，防止死循环
    for (...) {
        Reply reply = llm(messages, tools);
        // TODO 2：没有工具调用（reply.toolCall() == null）时，返回最终文本
        ...
        ToolCall call = reply.toolCall();
        String result = execute(call.name(), call.arguments()); // 执行前校验参数和权限
        // TODO 3：先把模型的调用请求（reply.message()）加入历史
        ...
        // TODO 4：再把工具结果以工具消息发回（Message.tool(call.id(), result)）
        ...
    }
    throw new IllegalStateException("超过最大步数");
}`,
ts:String.raw`async function run(messages: Message[], tools: Tool[], maxSteps = 8): Promise<string> {
  // TODO 1：最多循环 maxSteps 轮，防止死循环
  for (...) {
    const reply = await llm(messages, tools);
    // TODO 2：没有工具调用（!reply.toolCall）时，返回最终文本
    ...
    const call = reply.toolCall;
    const result = await execute(call.name, call.arguments); // 执行前校验参数和权限
    // TODO 3：先把模型的调用请求（reply.message）加入历史
    ...
    // TODO 4：再把工具结果以工具消息发回：{ role: "tool", toolCallId: call.id, content: result }
    ...
  }
  throw new Error("超过最大步数");
}`,
rust:String.raw`fn run(messages: &mut Vec<Message>, tools: &[Tool], max_steps: usize) -> Result<String, String> {
    // TODO 1：最多循环 max_steps 轮，防止死循环
    for _ in ... {
        let reply = llm(messages, tools)?;
        // TODO 2：reply.tool_call 是 None（没有工具调用）时，返回 Ok(reply.text)；是 Some 时取出 call
        let call = ...;
        let result = execute(&call.name, &call.arguments); // 执行前校验参数和权限
        // TODO 3：先把模型的调用请求（reply.message）加入历史
        ...
        // TODO 4：再把工具结果以工具消息发回（Message::tool(&call.id, &result)）
        ...
    }
    Err("超过最大步数".into())
}`,
},
};
