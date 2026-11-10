import type {StarterMap} from './types';

// AI 训练题 ai-x2-33（JSON 重试包装函数）的作答框架。
export const aiExamStartersE:StarterMap={
'ai-x2-33':{
python:String.raw`from typing import Callable, TypeVar
from pydantic import BaseModel, ValidationError

T = TypeVar("T", bound=BaseModel)

def ask_json(prompt: str, schema: type[T], validate: Callable[[T], None]) -> T:
    msg = prompt
    last_err: Exception | None = None
    # TODO 1：最多尝试 3 次
    for attempt in ...:
        text = model.complete(msg)  # 网络等错误直接抛出，交给上层的重试策略
        try:
            # TODO 2：把 text 解析成 schema 对应的模型对象（用 model_validate_json）
            out = ...
            # TODO 3：做业务校验（validate 不合格时会抛出 ValueError），通过就返回
            ...
        except (ValidationError, ValueError) as err:
            last_err = err
            # TODO 4：把这次的具体错误附在原提示后面，作为下一次的提示
            msg = ...
    # TODO 5：3 次都失败，抛出异常，并带上最后一次的错误
    ...`,
go:String.raw`func AskJSON[T any](ctx context.Context, prompt string, validate func(T) error) (T, error) {
    var zero T
    msg := prompt
    var lastErr error
    // TODO 1：最多尝试 3 次
    for ... {
        text, err := model.Complete(ctx, msg)
        if err != nil {
            return zero, err // 网络等错误交给上层的重试策略
        }
        var out T
        // TODO 2：用 json.Unmarshal 解析到 out；成功后再调用 validate 做业务校验
        // TODO 3：两步都通过就返回 out
        ...
        lastErr = err
        // TODO 4：把这次的具体错误附在原提示后面，作为下一次的提示
        msg = ...
    }
    // TODO 5：3 次都失败，返回包装后的错误（用 %w 包住 lastErr）
    ...
}`,
java:String.raw`static final ObjectMapper JSON = new ObjectMapper(); // Jackson

// validate 不合格时抛出异常，异常信息说明哪里不对
static <T> T askJson(String prompt, Class<T> type, Consumer<T> validate) throws Exception {
    String msg = prompt;
    Exception last = null;
    // TODO 1：最多尝试 3 次
    for (...) {
        String text = model.complete(msg); // 网络等错误直接抛出，交给上层
        try {
            // TODO 2：用 JSON.readValue 解析到 type 对应的类
            T out = ...;
            // TODO 3：做业务校验（validate.accept），通过就返回
            ...
        } catch (JsonProcessingException | IllegalArgumentException e) {
            last = e;
            // TODO 4：把这次的具体错误附在原提示后面，作为下一次的提示
            msg = ...;
        }
    }
    // TODO 5：3 次都失败，抛出异常，并带上最后一次的错误
    ...
}`,
ts:String.raw`import { z } from "zod"; // zod：常用的数据校验库，作用类似 Python 的 pydantic

async function askJson<T>(prompt: string, schema: z.ZodType<T>): Promise<T> {
  let msg = prompt;
  let lastErr = "";
  // TODO 1：最多尝试 3 次
  for (...) {
    const text = await model.complete(msg); // 网络等错误直接抛出，交给上层
    try {
      // TODO 2：用 JSON.parse 解析，再用 schema.parse 检查字段和业务规则；通过就返回
      ...
    } catch (err) {
      lastErr = String(err);
      // TODO 3：把这次的具体错误附在原提示后面，作为下一次的提示
      msg = ...;
    }
  }
  // TODO 4：3 次都失败，抛出错误，并带上最后一次的错误
  ...
}`,
rust:String.raw`use serde::de::DeserializeOwned;

// T 需要实现 serde 的 Deserialize；validate 返回 Err 时说明哪里不对
async fn ask_json<T: DeserializeOwned>(
    prompt: &str,
    validate: impl Fn(&T) -> Result<(), String>,
) -> Result<T, String> {
    let mut msg = prompt.to_string();
    let mut last = String::new();
    // TODO 1：最多尝试 3 次
    for _attempt in ... {
        let text = model.complete(&msg).await.map_err(|e| e.to_string())?; // 网络错误交给上层
        // TODO 2：用 serde_json::from_str 解析成 T，再调用 validate 做业务校验
        let checked: Result<T, String> = ...;
        match checked {
            Ok(out) => return Ok(out),
            Err(e) => {
                // TODO 3：把这次的具体错误附在原提示后面，作为下一次的提示，并记下这次错误
                ...
            }
        }
    }
    // TODO 4：3 次都失败，返回 Err，并带上最后一次的错误
    ...
}`,
},
};
