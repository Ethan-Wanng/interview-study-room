// 学习页的学科目录（只放轻量的展示信息，关卡内容在各自页面按需加载）。
export const learnSubjects=[
 {id:'go',href:'/learn/go',icon:'🐹',name:['Go 开发','Go development'],summary:['从语法、标准库、泛型到 runtime、并发、测试和性能优化，15 关由浅入深','From syntax, the standard library and generics to the runtime, concurrency, testing and performance in 15 levels'],storageKey:'go-journey:v1:',levels:15},
 {id:'ai',href:'/learn/ai',icon:'🤖',name:['AI 开发','AI development'],summary:['从大模型基础到 RAG、Agent、部署与安全，15 关从小白到大神','From LLM basics to RAG, agents, serving and safety in 15 levels'],storageKey:'ai-journey:v1:',levels:15},
 {id:'backend',href:'/learn/backend',icon:'🗄️',name:['后端通用','Backend fundamentals'],summary:['从“后端是什么”起步，到数据库、Redis、Linux、网络、消息队列、云原生和系统设计，23 关从小白到大神','From “what is a backend” to databases, Redis, Linux, networking, messaging, cloud native and system design in 23 levels'],storageKey:'backend-journey:v1:',levels:23},
 {id:'frontend',href:'/learn/frontend',icon:'🎨',name:['前端开发','Frontend development'],summary:['从 HTML、CSS、JavaScript 起步，到 React/Vue 原理、工程化、性能优化和前端架构，15 关从小白到大神','From HTML, CSS and JavaScript to React/Vue internals, tooling, performance and architecture in 15 levels'],storageKey:'frontend-journey:v1:',levels:15},
] as const;
