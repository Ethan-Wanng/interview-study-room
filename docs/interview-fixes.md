# 面试题答案纠错记录

Date: 2026-10-30. Every answer in the three interview banks was read and checked for factual errors, outdated statements (versions, defaults, renamed or deprecated APIs), wrong code, and misleading simplifications. Correct answers were left alone. Ids, fields and block structure are unchanged. `content/questions.json` was edited by exact single-string replacement, so the file keeps its formatting and the diff is one line.

## Summary

| Bank | Questions reviewed | Questions changed |
|---|---|---|
| `content/questions.json` (shared with the mini program) | 320 (Go 127, 后端 193) | 1 |
| `content/ai-interview.ts` | 90 | 4 |
| `content/frontend-interview/*.ts` | 66 | 2 |
| **Total** | **476** | **7** |

The Go and backend banks had already been through a careful correction pass (version notes up to Go 1.27, MySQL 8.0/8.4, Kafka 4.x, Redis 7). Apart from the one item below, I found no errors there.

## content/questions.json

| id | Title | What was wrong | Fix |
|---|---|---|---|
| `q-42228e55cc58156f` | 服务注册与发现是怎么工作的？ | It named “K8s 的 Service/Endpoints” as the registry. The Endpoints API is deprecated since Kubernetes 1.33. Service discovery is backed by EndpointSlice. | Changed to “K8s 的 Service/EndpointSlice”. |

## content/ai-interview.ts

| id | Title | What was wrong | Fix |
|---|---|---|---|
| `ai-q-token-context` | 什么是 token 和上下文窗口？ | It said one Chinese character is about 1–2 tokens. That only fits older English-centric tokenizers. Current tokenizers with Chinese-optimised vocabularies often use less than one token per character. | Says the ratio depends on the tokenizer, roughly 0.5–2 tokens per character, and is lower for vocabularies optimised for Chinese. |
| `ai-q-sampling` | temperature、top-p 分别是什么？怎么设置？ | It gave tuning advice as if every model accepts these parameters. Many reasoning models, and models running in thinking mode, fix or restrict temperature/top_p. | Added one sentence saying reasoning and thinking modes often fix or limit these parameters, so check the provider docs. |
| `ai-q-cot` | 什么是思维链？什么时候用？ | It presented prompting “step by step” as the way to get reasoning, without mentioning reasoning models. Those already think internally, so prompting CoT on them is redundant. | Added that reasoning models have built-in thinking: turn on thinking mode instead of asking for step-by-step reasoning in the prompt. |
| `ai-q-position` | 什么是位置编码和 RoPE？ | (1) It said that with RoPE the attention score depends only on relative distance. Only the positional part does; the score still depends on content. (2) It called RoPE good at extrapolation. Plain RoPE degrades beyond its training length, which is why interpolation, NTK scaling and YaRN exist. | The positional part of the score depends only on relative distance. Plain RoPE degrades past the training length and needs position interpolation, NTK scaling or YaRN to extend context. |

## content/frontend-interview

| id | Title | What was wrong | Fix |
|---|---|---|---|
| `fe-q-bundler` (engineering.ts) | Webpack 和 Vite 有什么区别？ | It said Vite pre-bundles dependencies with esbuild. Since Vite 8, Rolldown does this (and the production build). | Says pre-bundling used esbuild up to Vite 7 and Rolldown from Vite 8. |
| `fe-q-hooks-rules` (framework.ts) | React Hooks 为什么不能写在条件语句里？ | It gave “never call hooks conditionally” as an absolute rule. React 19’s `use` may be called inside conditions and loops. | Added that React 19’s `use` is the exception: it can be called conditionally, but still only inside components or hooks. |

## Checked but left unchanged

- Several Go answers mention Go 1.27 behaviour: the `asynctimerchan` switch removed, `encoding/json/v2` and the `goroutineleak` profile becoming official. Go 1.27 shipped after my reference knowledge, so I could not confirm the details independently. Their Go 1.23–1.26 background is correct, so I left them as they are. They are worth a quick check against the Go 1.27 release notes.
- Answers that are correct but could be more precise were not reworded. One example is `fe-q-modules`, which says CJS `require()` of ESM works only conditionally in newer Node. This was a correctness pass, not a rewrite.
