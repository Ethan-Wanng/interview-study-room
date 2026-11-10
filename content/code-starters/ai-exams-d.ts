import type {StarterMap} from './types';

// AI 训练题 ai-x1-16（工具调用循环）的作答框架。
export const aiExamStartersD:StarterMap={
'ai-x1-16':{
python:String.raw`def run(question: str, tools: list) -> str:
    messages = [{"role": "user", "content": question}]
    # TODO 1：最多循环 5 轮，防止无限循环
    for step in ...:
        resp = model.chat(messages, tools=tools)
        # TODO 2：把模型这次的回复加入消息历史
        ...
        # TODO 3：没有工具调用时，这就是最终回答，直接返回 resp.text
        ...
        for call in resp.tool_calls:
            # TODO 4：执行工具（run_tool(call)）；出错时把错误信息当作结果，也要告诉模型
            ...
            # TODO 5：把结果按调用 id 加回消息：{"role": "tool", "tool_call_id": call.id, "content": result}
            ...
    raise RuntimeError("超过最大步数")`,
go:String.raw`func Run(ctx context.Context, question string, tools []Tool) (string, error) {
    messages := []Message{{Role: "user", Content: question}}
    // TODO 1：最多循环 5 轮，防止无限循环
    for ... {
        resp, err := model.Chat(ctx, messages, tools)
        if err != nil {
            return "", err
        }
        // TODO 2：把模型这次的回复加入消息历史
        ...
        // TODO 3：没有工具调用时，这就是最终回答，直接返回 resp.Text
        ...
        for _, call := range resp.ToolCalls {
            // TODO 4：执行工具（runTool(ctx, call)）；出错时把错误信息当作结果，也要告诉模型
            ...
            // TODO 5：把结果按调用 ID 加回消息：Message{Role: "tool", ToolCallID: call.ID, Content: result}
            ...
        }
    }
    return "", errors.New("超过最大步数")
}`,
java:String.raw`static String run(String question, List<Tool> tools) {
    List<Message> messages = new ArrayList<>();
    messages.add(Message.user(question));
    // TODO 1：最多循环 5 轮，防止无限循环
    for (...) {
        ChatResponse resp = model.chat(messages, tools);
        // TODO 2：把模型这次的回复加入消息历史
        ...
        // TODO 3：没有工具调用时，这就是最终回答，直接返回 resp.text()
        ...
        for (ToolCall call : resp.toolCalls()) {
            // TODO 4：执行工具（runTool(call)）；出错时把错误信息当作结果，也要告诉模型
            String result = ...;
            // TODO 5：把结果按调用 id 加回消息（Message.tool(call.id(), result)）
            ...
        }
    }
    throw new IllegalStateException("超过最大步数");
}`,
ts:String.raw`async function run(question: string, tools: Tool[]): Promise<string> {
  const messages: Message[] = [{ role: "user", content: question }];
  // TODO 1：最多循环 5 轮，防止无限循环
  for (...) {
    const resp = await model.chat(messages, tools);
    // TODO 2：把模型这次的回复加入消息历史
    ...
    // TODO 3：没有工具调用时，这就是最终回答，直接返回 resp.text
    ...
    for (const call of resp.toolCalls) {
      // TODO 4：执行工具（await runTool(call)）；出错时把错误信息当作结果，也要告诉模型
      let result: string;
      ...
      // TODO 5：把结果按调用 id 加回消息：{ role: "tool", toolCallId: call.id, content: result }
      ...
    }
  }
  throw new Error("超过最大步数");
}`,
rust:String.raw`async fn run(question: &str, tools: &[Tool]) -> Result<String, Error> {
    let mut messages = vec![Message::user(question)];
    // TODO 1：最多循环 5 轮，防止无限循环
    for _step in ... {
        let resp = model.chat(&messages, tools).await?;
        // TODO 2：把模型这次的回复加入消息历史
        ...
        // TODO 3：没有工具调用时，这就是最终回答，直接返回 Ok(resp.text)
        ...
        for call in &resp.tool_calls {
            // TODO 4：执行工具（run_tool(call).await）；出错时把错误信息当作结果，也要告诉模型
            let result = ...;
            // TODO 5：把结果按调用 id 加回消息（Message::tool(&call.id, &result)）
            ...
        }
    }
    Err(Error::msg("超过最大步数"))
}`,
},
};
