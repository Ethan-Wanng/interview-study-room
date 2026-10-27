// 学习页的学科目录（只放轻量的展示信息，关卡内容在各自页面按需加载）。
export const learnSubjects=[
 {id:'go',href:'/learn/go',icon:'🐹',name:['Go 开发','Go development'],summary:['从语法、标准库、泛型到 runtime、并发、测试和性能优化，15 关由浅入深','From syntax, the standard library and generics to the runtime, concurrency, testing and performance in 15 levels'],storageKey:'go-journey:v1:',levels:15},
 {id:'ai',href:'/learn/ai',icon:'🤖',name:['AI 开发','AI development'],summary:['从大模型基础到 RAG、Agent、部署与安全，15 关从小白到大神','From LLM basics to RAG, agents, serving and safety in 15 levels'],storageKey:'ai-journey:v1:',levels:15},
] as const;
