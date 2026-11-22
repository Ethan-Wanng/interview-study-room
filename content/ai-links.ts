// 学习空间关卡与 AI 面试问答的对应关系：每道面试题归入最相关的一关，学习页会列出“本关相关面试题”。
// 答题里的 interview 字段指向具体的面试题，答完后可以展开阅读。
export const interviewByLevel:Record<string,string[]>={
 'llm-basics':['ai-q-llm-what','ai-q-token-context','ai-q-hallucination','ai-q-tokenizer','ai-q-architectures'],
 'calling':['ai-q-sampling','ai-q-prompt','ai-q-system-prompt','ai-q-fewshot-pitfalls','ai-q-streaming','ai-q-temperature-zero'],
 'rag-basics':['ai-q-rag-flow','ai-q-rag-vs-ft','ai-q-embedding-choice'],
 'tool-use':['ai-q-tool-use','ai-q-mcp'],
 'ship-safe':['ai-q-cost','ai-q-prompt-cache','ai-q-rate-limit','ai-q-cost-estimate','ai-q-privacy'],
 'vector-db':['ai-q-vdb-what','ai-q-ann','ai-q-vdb-choice','ai-q-ivf-pq','ai-q-distance','ai-q-filter','ai-q-vdb-scale','ai-q-vdb-update'],
 'rag-advanced':['ai-q-chunking','ai-q-hybrid','ai-q-rag-eval','ai-q-query-rewrite','ai-q-long-context','ai-q-doc-parsing','ai-q-graphrag','ai-q-agentic-rag','ai-q-rag-debug'],
 'engineering':['ai-q-structured','ai-q-memory','ai-q-semantic-cache','ai-q-context-engineering','ai-q-llm-gateway','ai-q-frameworks','ai-q-model-routing'],
 'tradeoffs':['ai-q-prompt-iteration','ai-q-model-migration','ai-q-scaling','ai-q-design-cs','ai-q-project','ai-q-why-ai','ai-q-batch-pipeline'],
 'model-internals':['ai-q-attention','ai-q-transformer-block','ai-q-position','ai-q-moe','ai-q-cot','ai-q-self-consistency','ai-q-reasoning-models','ai-q-gqa'],
 'agents':['ai-q-agent-vs-workflow','ai-q-agent-reliability','ai-q-react-plan','ai-q-multi-agent','ai-q-sandbox','ai-q-design-code-assistant','ai-q-context-compaction'],
 'evals':['ai-q-eval','ai-q-observability','ai-q-judge-bias','ai-q-agent-eval','ai-q-hallucination-detect','ai-q-online-ab'],
 'harness':['ai-q-harness','ai-q-agent-skills','ai-q-skill-vs-mcp-subagent','ai-q-agent-hooks','ai-q-aci-design','ai-q-coding-agent-arch','ai-q-a2a','ai-q-durable-agent','ai-q-memory-poisoning'],
 'serving':['ai-q-serving','ai-q-quantization','ai-q-paged-attention','ai-q-multimodal','ai-q-speculative-decoding','ai-q-flash-attention'],
 'fine-tuning':['ai-q-lora','ai-q-ft-data','ai-q-ft-methods','ai-q-rlhf-dpo','ai-q-distillation','ai-q-rlvr-grpo'],
 'safety':['ai-q-injection','ai-q-guardrails','ai-q-jailbreak','ai-q-tenant-isolation','ai-q-mcp-security'],
};
