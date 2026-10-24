// 学习页的学科目录（只放轻量的展示信息，关卡内容在各自页面按需加载）。
export const learnSubjects=[
 {id:'go',href:'/learn/go',icon:'🐹',name:['Go 开发','Go development'],summary:['从语法到 runtime、并发和性能优化，12 关由浅入深','From syntax to the runtime, concurrency and performance in 12 levels'],storageKey:'go-journey:v1:',levels:12},
 {id:'ai',href:'/learn/ai',icon:'🤖',name:['AI 开发','AI development'],summary:['从大模型基础到 RAG、Agent、部署与安全，15 关从小白到大神','From LLM basics to RAG, agents, serving and safety in 15 levels'],storageKey:'ai-journey:v1:',levels:15},
] as const;
