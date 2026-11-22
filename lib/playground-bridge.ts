import type {CodeLang} from '@/content/code-refs';
import {quizMainFor} from './playground-quiz-mains';

export type PlaygroundLang=CodeLang|'sql';
export const PLAYGROUND_LANG_IDS:readonly PlaygroundLang[]=['go','python','java','ts','rust','sql'];

export function normalizePlaygroundLang(raw?:string|null):PlaygroundLang|null{
 const k=(raw??'').trim().toLowerCase();
 if(!k)return null;
 if(k==='go'||k==='golang')return 'go';
 if(k==='python'||k==='py'||k==='python3')return 'python';
 if(k==='java')return 'java';
 if(k==='ts'||k==='js'||k==='typescript'||k==='javascript'||k==='mjs'||k==='cjs')return 'ts';
 if(k==='rust'||k==='rs')return 'rust';
 if(k==='sql'||k==='mysql'||k==='mariadb'||k==='sqlite'||k==='ddl'||k==='dml')return 'sql';
 return null;
}

export type PlaygroundLearnLink={
 href:string;
 label:[string,string];
 subject:string;
};

export type PlaygroundLaunch={
 id:string;
 lang:PlaygroundLang;
 code:string;
 title:string;
 sourceLabel?:string;
 backHref?:string;
 expect?:string;
 questionId?:string;
 autoRun?:boolean;
 wrapped?:boolean;
 needsAiWrap?:boolean;
 createdAt:number;
};

export type PlaygroundQuizSync={
 questionId:string;
 lang:PlaygroundLang;
 code:string;
 updatedAt:number;
};

export type PlaygroundContextMeta={
 subjectId?:string;
 subjectName?:string;
 levelId?:string;
 levelIndex?:number;
 levelTitle?:string;
 hintLang?:PlaygroundLang|null;
 backHref?:string;
};

export const PG_LAUNCH_STORAGE_KEY='pg-launches-v1';
export const PG_QUIZ_SYNC_KEY='pg-quiz-sync-v1';
export const PG_LAST_LANG_KEY='pg-last-lang-v1';
export const PG_QUIZ_SYNC_EVENT='pg-quiz-sync-change';

// 每门语言在操场中对应的默认学习路线（供兜底或整门语言直达）
export const PLAYGROUND_LANG_DEFAULT_LEARN:Record<PlaygroundLang,PlaygroundLearnLink>={
 go:{href:'/learn/go',label:['Go 开发路线','Go Development Track'],subject:'go'},
 python:{href:'/learn/python',label:['Python 开发路线','Python Development Track'],subject:'python'},
 java:{href:'/learn/backend',label:['后端通用路线','Backend Fundamentals'],subject:'backend'},
 ts:{href:'/learn/frontend',label:['前端开发路线','Frontend Development'],subject:'frontend'},
 rust:{href:'/learn/rust',label:['Rust 开发路线','Rust Development Track'],subject:'rust'},
 sql:{href:'/learn/backend?level=be-sql',label:['后端 · SQL 与表设计','Backend · SQL & Schema'],subject:'backend'},
};

// 操场 5 种语言 × 7 段精选示例 -> 对应的真实学习关卡链接
export const PLAYGROUND_EXAMPLE_LINKS:Record<string,PlaygroundLearnLink>={
 // Go (7)
 'go-hello':{href:'/learn/go?level=go-start',label:['Go 第 1 关 · 起步与初始化','Go L1 · Getting Started'],subject:'go'},
 'go-slice-map':{href:'/learn/go?level=go-collections',label:['Go 第 3 关 · 数组、切片与 map','Go L3 · Slices & Maps'],subject:'go'},
 'go-interface':{href:'/learn/go?level=go-funcs',label:['Go 第 4 关 · 函数与接口设计','Go L4 · Functions & Interfaces'],subject:'go'},
 'go-generics':{href:'/learn/go?level=go-generics',label:['Go 第 7 关 · 泛型与反射','Go L7 · Generics & Reflection'],subject:'go'},
 'go-worker-pool':{href:'/learn/go?level=go-concurrency',label:['Go 第 13 关 · 并发编程实战','Go L13 · Concurrency in Practice'],subject:'go'},
 'go-context':{href:'/learn/go?level=go-channel',label:['Go 第 8 关 · channel 与 context','Go L8 · Channels & Context'],subject:'go'},
 'go-lru':{href:'/learn/go?level=go-sync',label:['Go 第 10 关 · map 与同步原语','Go L10 · Map & Sync Primitives'],subject:'go'},

 // Python (7)
 'py-hello':{href:'/learn/python?level=py-start',label:['Python 第 1 关 · 起步与基本类型','Python L1 · Getting Started'],subject:'python'},
 'py-counter':{href:'/learn/python?level=py-collections',label:['Python 第 3 关 · 容器、推导式与 collections','Python L3 · Collections & Comprehensions'],subject:'python'},
 'py-decorator':{href:'/learn/python?level=py-decorators',label:['Python 第 9 关 · 装饰器、闭包与类型注解','Python L9 · Decorators & Typing'],subject:'python'},
 'py-generator':{href:'/learn/python?level=py-iterators',label:['Python 第 8 关 · 迭代器、生成器与惰性求值','Python L8 · Iterators & Generators'],subject:'python'},
 'py-dataclass':{href:'/learn/python?level=py-oop',label:['Python 第 5 关 · 面向对象与 dataclass','Python L5 · OOP & Dataclasses'],subject:'python'},
 'py-asyncio':{href:'/learn/python?level=py-async',label:['Python 第 12 关 · asyncio 与事件循环','Python L12 · Asyncio & Event Loop'],subject:'python'},
 'py-rrf':{href:'/learn/ai?level=rag-advanced',label:['AI 第 7 关 · RAG 混合检索与融合','AI L7 · Advanced RAG'],subject:'ai'},

 // Java (7)
 'java-hello':{href:'/learn/project',label:['项目实战 · 支持 Java Spring Boot','Project · Java Spring Boot'],subject:'project'},
 'java-stream':{href:'/learn/backend?level=be-ds',label:['后端 · 数据结构与集合','Backend · Data Structures'],subject:'backend'},
 'java-record':{href:'/learn/backend?level=be-algo',label:['后端 · 设计模式与代码设计','Backend · Design Patterns'],subject:'backend'},
 'java-generics':{href:'/learn/backend?level=be-algo2',label:['后端 · 常考算法与堆 Top-K','Backend · Algorithms & Heaps'],subject:'backend'},
 'java-async':{href:'/learn/backend?level=be-io',label:['后端 · I/O 模型与异步并发','Backend · I/O & Async'],subject:'backend'},
 'java-ratelimit':{href:'/learn/backend?level=be-ms',label:['后端 · 微服务架构与限流治理','Backend · Microservices'],subject:'backend'},
 'java-lru':{href:'/learn/backend?level=be-redis',label:['后端 · Redis 与缓存淘汰策略','Backend · Redis & Caching'],subject:'backend'},

 // JS/TS (7)
 'ts-hello':{href:'/learn/frontend?level=fe-ts',label:['前端第 10 关 · TypeScript 入门','Frontend L10 · TypeScript'],subject:'frontend'},
 'ts-map-reduce':{href:'/learn/frontend?level=fe-func',label:['前端第 5 关 · 函数、对象与数组','Frontend L5 · Functions & Arrays'],subject:'frontend'},
 'ts-unions':{href:'/learn/frontend?level=fe-ts',label:['前端第 10 关 · TS 类型系统','Frontend L10 · TypeScript Types'],subject:'frontend'},
 'ts-generics':{href:'/learn/frontend?level=fe-scope',label:['前端第 8 关 · 作用域与闭包','Frontend L8 · Scope & Closures'],subject:'frontend'},
 'ts-event-loop':{href:'/learn/frontend?level=fe-async',label:['前端第 7 关 · 事件循环与异步','Frontend L7 · Event Loop & Async'],subject:'frontend'},
 'ts-async-pool':{href:'/learn/frontend?level=fe-net',label:['前端第 9 关 · 网络请求与并发控制','Frontend L9 · Networking'],subject:'frontend'},
 'ts-consistent-hash':{href:'/learn/backend?level=be-design',label:['后端 · 系统设计与分布式路由','Backend · System Design'],subject:'backend'},

 // Rust (7)
 'rs-hello':{href:'/learn/rust?level=rust-start',label:['Rust 第 1 关 · 起步与第一个程序','Rust L1 · Getting Started'],subject:'rust'},
 'rs-ownership':{href:'/learn/rust?level=rust-ownership',label:['Rust 第 3 关 · 所有权与借用','Rust L3 · Ownership & Borrowing'],subject:'rust'},
 'rs-result':{href:'/learn/rust?level=rust-collections',label:['Rust 第 7 关 · 常用集合与错误处理','Rust L7 · Collections & Error Handling'],subject:'rust'},
 'rs-trait-iter':{href:'/learn/rust?level=rust-iterators',label:['Rust 第 10 关 · 闭包与迭代器','Rust L10 · Closures & Iterators'],subject:'rust'},
 'rs-smart-ptr':{href:'/learn/rust?level=rust-smart-ptr',label:['Rust 第 11 关 · 智能指针与内部可变性','Rust L11 · Smart Pointers'],subject:'rust'},
 'rs-concurrency':{href:'/learn/rust?level=rust-concurrency',label:['Rust 第 12 关 · 并发编程：线程与锁','Rust L12 · Concurrency'],subject:'rust'},
 'rs-sliding-window':{href:'/learn/backend?level=be-algo2',label:['后端 · 常考算法与滑动窗口','Backend · Sliding Window'],subject:'backend'},

 // MySQL / SQL (7)
 'sql-hello':{href:'/learn/backend?level=be-sql',label:['后端 · SQL 与表设计','Backend · SQL & Schema'],subject:'backend'},
 'sql-join':{href:'/learn/backend?level=be-sql',label:['后端 · JOIN 与聚合分组','Backend · JOIN & GROUP BY'],subject:'backend'},
 'sql-window':{href:'/learn/backend?level=be-sql',label:['后端 · 窗口函数 Top-N','Backend · Window Functions'],subject:'backend'},
 'sql-cte':{href:'/learn/backend?level=be-sql',label:['后端 · CTE 连续登录分析','Backend · CTE Analytics'],subject:'backend'},
 'sql-index-explain':{href:'/learn/backend?level=be-index',label:['后端 · 索引与执行计划','Backend · Indexes & EXPLAIN'],subject:'backend'},
 'sql-tx-upsert':{href:'/learn/backend?level=be-tx',label:['后端 · 事务与冲突更新','Backend · Transactions & Upsert'],subject:'backend'},
 'sql-date-str':{href:'/learn/backend?level=be-sql',label:['后端 · MySQL 常用内置函数','Backend · MySQL Functions'],subject:'backend'},
};

export function playgroundLearnLinkFor(exampleId:string,lang:PlaygroundLang):PlaygroundLearnLink{
 return PLAYGROUND_EXAMPLE_LINKS[exampleId]??PLAYGROUND_LANG_DEFAULT_LEARN[lang];
}

// 学科 + 可选项目后端栈 -> 对应的操场默认语言（非编程学科如英语返回 null）
export function subjectPlaygroundLang(subjectId:string,backendStack?:string):CodeLang|null{
 if(subjectId==='english')return null;
 if(subjectId==='go')return 'go';
 if(subjectId==='rust')return 'rust';
 if(subjectId==='python')return 'python';
 if(subjectId==='ai')return 'python';
 if(subjectId==='frontend')return 'ts';
 if(subjectId==='backend')return 'go';
 if(subjectId==='project'||subjectId==='ai-support'){
  if(backendStack==='go')return 'go';
  if(backendStack==='java')return 'java';
  if(backendStack==='python')return 'python';
  if(backendStack==='node')return 'ts';
  return subjectId==='ai-support'?'python':'go';
 }
 return null;
}

const THIRD_PARTY_IMPORT=/\bfrom\s+(openai|anthropic|fastapi|pydantic|langchain|numpy|torch|transformers|chromadb|sentence_transformers|flask|django|sqlalchemy|httpx|redis|pytest|uvicorn|aiohttp)\b|\bimport\s+(openai|anthropic|numpy|torch|requests|httpx|redis|pymysql|flask|django|fastapi|uvicorn)\b|['"](react|react-dom|vue|next\/|express|fastify|koa|axios|lodash|@?\w+\/[^'"]+|github\.com\/|golang\.org\/x\/|hello\/)/i;
const SHELL_LINE=/^\s*(\$\s+|#!|cargo\s+|go\s+(run|build|test|mod|get|env|fmt|vet|work|install)\b|git\s+|npm\s+|pnpm\s+|yarn\s+|npx\s+|pip3?\s+|python3?\s+-|uvicorn\s+|docker\s+|kubectl\s+|curl\s+|cd\s+|ls\b|cat\s+|grep\s+|mkdir\s+|rm\s+|cp\s+|mv\s+|chmod\s+|sudo\s+|export\s+|set\s+\w+=|RUSTUP_|GOOS=|.\s*\/|\.\/|\\)/;

function isLikelyJson(trimmed:string):boolean{
 if(!((trimmed.startsWith('{')&&trimmed.endsWith('}'))||(trimmed.startsWith('[')&&trimmed.endsWith(']'))))return false;
 try{JSON.parse(trimmed);return true}catch{return false}
}

// 智能判断一段代码是否适合送入代码操场运行（Go / Python / Java / JS-TS / Rust / MySQL）；非代码返回 null。
export function detectPlaygroundLang(
 rawCode:string,
 hintLang?:PlaygroundLang|null,
 opts:{allowThirdParty?:boolean}={},
):PlaygroundLang|null{
 const code=rawCode.trim();
 if(code.length<8)return null;

 // 明显不是可执行代码的内容直接排除
 if(/^error\[E\d+\]:/m.test(code)||/^-->\s+\S+:\d+:\d+/m.test(code)||/^Traceback \(most recent call last\):/m.test(code))return null;
 if(/[├└│]──/.test(code))return null;
 if(/^\s*<!DOCTYPE\b|^\s*<(html|head|body|div|section|main|header|footer|ul|ol|form|table|template|style|script|svg|link|meta)\b/i.test(code))return null;
 if(/^\[(package|dependencies|profile|workspace)\]\s*$/m.test(code))return null;
 if(/^\s*module\s+\S+/m.test(code)&&/^\s*go\s+1\.\d+/m.test(code))return null;
 if(/^\s*FROM\s+[\w./:-]+(?:\s+AS\s+\w+)?\s*$/im.test(code))return null;
 if(/^\s*(GET|POST|PUT|DELETE|PATCH|HEAD|HTTP\/1\.[01]|HTTP\/2)\s+/m.test(code))return null;
 if(/^\s*(apiVersion|kind|services|version):\s+\S/m.test(code))return null;
 if(isLikelyJson(code))return null;

 // 终端命令块（非注释行大多数以常见 CLI 开头）
 const activeLines=code.split('\n').map(l=>l.trim()).filter(l=>l&&!l.startsWith('#')&&!l.startsWith('//')&&!l.startsWith('--'));
 if(activeLines.length>0){
  const shellHits=activeLines.filter(l=>SHELL_LINE.test(l)).length;
  if(shellHits>=Math.ceil(activeLines.length*0.6))return null;
 }

 // 多个 package 声明（多文件 Go 示例）或依赖本地/第三方包（非允许模式下）跳过
 const pkgDecls=code.match(/^\s*package\s+\w+/gm);
 if(pkgDecls&&pkgDecls.length>1)return null;
 if(!opts.allowThirdParty&&THIRD_PARTY_IMPORT.test(code))return null;

 // 纯 CSS（选择器 + 声明块，且不含脚本关键字）
 if(/^[.#@:*a-zA-Z][\w\s.,#:>+~[\]="'()-]*\{\s*[a-z-]+\s*:/m.test(code)&&!/\b(fn|func|const|let|var|class|def|public|return|console)\b/.test(code)){
  return null;
 }

 // 强语言特征打分
 const scores:Record<PlaygroundLang,number>={go:0,rust:0,java:0,python:0,ts:0,sql:0};

 // SQL / MySQL
 if(/^\s*(CREATE\s+(?:TEMPORARY\s+)?(?:TABLE|INDEX|UNIQUE\s+INDEX|VIEW|DATABASE)|INSERT\s+(?:IGNORE\s+)?INTO|UPDATE\s+`?\w+`?\s+SET|DELETE\s+FROM|ALTER\s+TABLE|DROP\s+(?:TABLE|INDEX|VIEW)|TRUNCATE\s+(?:TABLE\s+)?\w+|SHOW\s+(?:TABLES|DATABASES|INDEX|INDEXES|KEYS|COLUMNS|CREATE\s+TABLE)|DESC(?:RIBE)?\s+`?\w+`?|EXPLAIN\s+(?:ANALYZE\s+|FORMAT\s*=\s*\w+\s+)?(?:SELECT|WITH))\b/im.test(code))scores.sql+=6;
 if(/^\s*(SELECT|WITH)\b[\s\S]*\b(FROM|JOIN|WHERE|GROUP\s+BY|ORDER\s+BY|HAVING|OVER\s*\(|UNION|LIMIT|AS\s+\w+)\b/im.test(code))scores.sql+=5;
 if(/^\s*SELECT\s+[^;]{2,}/im.test(code)&&!/\b(func|def|class|const|let|var|import|package|public|fn)\b/.test(code))scores.sql+=4;
 if(/\b(AUTO_INCREMENT|ENGINE\s*=\s*InnoDB|DEFAULT\s+CHARSET|PRIMARY\s+KEY|VARCHAR\s*\(|GROUP_CONCAT|ROW_NUMBER\s*\(|DENSE_RANK\s*\(|LEFT\s+JOIN|INNER\s+JOIN)\b/i.test(code))scores.sql+=3;

 // Go
 if(/^\s*package\s+\w+/m.test(code))scores.go+=5;
 if(/\bfunc\s+(\([^)]*\)\s*)?\w*\s*\(/.test(code))scores.go+=4;
 if(/\bfmt\.(Print|Println|Printf|Sprintf|Errorf)\b/.test(code))scores.go+=4;
 if(/:=/.test(code))scores.go+=3;
 if(/\b(go\s+func|chan\s|make\s*\(\s*(map|chan|\[\])|defer\s+|sync\.\w+|context\.\w+)\b/.test(code))scores.go+=3;

 // Rust
 if(/\bfn\s+\w+\s*[<(]/.test(code))scores.rust+=5;
 if(/\b(println!|eprintln!|format!|vec!|assert_eq!)\s*\(/.test(code))scores.rust+=5;
 if(/\blet\s+mut\b/.test(code))scores.rust+=4;
 if(/\b(impl\b|trait\s+\w+|match\s+\S+\s*\{|(Vec|Option|Result|Box|Arc|Rc)::|&mut\s+\w+|&str\b|String::from)/.test(code))scores.rust+=3;

 // Java
 if(/\bpublic\s+static\s+void\s+main\s*\(/.test(code))scores.java+=6;
 if(/\bSystem\.out\.print/.test(code))scores.java+=5;
 if(/\b(public|private|protected)\s+(static\s+)?(class|interface|record|enum)\s+\w+/.test(code))scores.java+=4;
 if(/\b(ArrayList|HashMap|LinkedHashMap|CompletableFuture|List<|Map<)\b/.test(code))scores.java+=3;

 // Python
 if(/^\s*(async\s+)?def\s+\w+\s*\(/m.test(code))scores.python+=5;
 if(/^\s*from\s+[\w.]+\s+import\b/m.test(code))scores.python+=4;
 if(/^\s*class\s+\w+(\([^)]*\))?:\s*$/m.test(code))scores.python+=4;
 if(/^\s*(for|if|elif|while|with)\s+.+:\s*$/m.test(code)&&!/[{}]/.test(code.split('\n')[0]??''))scores.python+=3;
 if(/\bprint\s*\(/.test(code)&&!/;\s*$/m.test(code)&&!scores.go&&!scores.rust&&!scores.java)scores.python+=2;

 // JS / TS（排除依赖 DOM / JSX / React Hooks 的浏览器片段，除非 allowThirdParty）
 const isBrowserDomOrJsx=/\b(document\.(querySelector|getElementById|createElement|body|addEventListener)|window\.(addEventListener|location|localStorage)|useState\s*\(|useEffect\s*\(|useRef\s*\()|<[A-Z]\w*[\s/>]|<[a-z]+\s+className=/.test(code);
 if(!isBrowserDomOrJsx||opts.allowThirdParty){
  if(/\bconsole\.(log|info|warn|error|table|time)\s*\(/.test(code))scores.ts+=5;
  if(/\b(interface|type)\s+\w+\s*(<[^>]+>)?\s*[={]/.test(code))scores.ts+=4;
  if(/\b(const|let|var)\s+[\w{[\]]+.*=/.test(code)&&!scores.rust)scores.ts+=2;
  if(/\b(async\s+function|function\s+\w+\s*\(|new\s+(Promise|Map|Set)|Promise\.(resolve|all|race)|setTimeout\s*\(|=>\s*\{)/.test(code))scores.ts+=3;
 }

 // 选出最高分语言；如果提供了 hintLang 且未与更强信号冲突，优先加权
 if(hintLang&&scores[hintLang]>0)scores[hintLang]+=2;

 let best:PlaygroundLang|null=null;
 let bestScore=0;
 for(const lang of PLAYGROUND_LANG_IDS){
  if(scores[lang]>bestScore){
   bestScore=scores[lang];
   best=lang;
  }
 }
 if(best&&bestScore>=2)return best;
 return null;
}

const GO_STD_IMPORTS:[RegExp,string][]=[
 [/\bfmt\./,'fmt'],
 [/\bstrings\./,'strings'],
 [/\bsort\./,'sort'],
 [/\bsync\./,'sync'],
 [/\batomic\./,'sync/atomic'],
 [/\btime\./,'time'],
 [/\bcontext\./,'context'],
 [/\berrors\./,'errors'],
 [/\bmath\./,'math'],
 [/\brand\./,'math/rand'],
 [/\bstrconv\./,'strconv'],
 [/\bjson\./,'encoding/json'],
 [/\bbinary\./,'encoding/binary'],
 [/\bfnv\./,'hash/fnv'],
 [/\breflect\./,'reflect'],
 [/\bio\./,'io'],
 [/\bos\./,'os'],
 [/\bbufio\./,'bufio'],
 [/\bbytes\./,'bytes'],
 [/\bregexp\./,'regexp'],
 [/\bslices\./,'slices'],
 [/\bmaps\./,'maps'],
 [/\bhttp\./,'net/http'],
 [/\butf8\./,'unicode/utf8'],
 [/\blist\./,'container/list'],
 [/\bheap\./,'container/heap'],
 [/\bsha256\./,'crypto/sha256'],
 [/\bfilepath\./,'path/filepath'],
 [/\blog\./,'log'],
];

export const PG_CODE_START_SLASH='// === 答题代码（下方为你编写的代码）===';
export const PG_MAIN_START_SLASH='// === 操场自动补全 main（同步回答题框时会自动移除）===';
export const PG_MAIN_START_HASH='# === 操场自动补全 main（同步回答题框时会自动移除）===';
const PG_JAVA_END_MARK='// === 操场自动补全 Main 结束 ===';

function indentBlock(code:string,prefix:string):string{
 return code.split('\n').map(l=>(l.trim()?prefix+l:'')).join('\n');
}

function unindentBlock(code:string,spaces=4):string{
 const re=new RegExp(`^ {1,${spaces}}`);
 return code.split('\n').map(l=>l.replace(re,'')).join('\n');
}

// 按顶层逗号拆分参数列表（跳过尖括号/方括号/圆括号内的逗号）
function splitTopCommas(s:string):string[]{
 const out:string[]=[];
 let cur='',depth=0;
 for(let i=0;i<s.length;i++){
  const ch=s[i];
  if(ch==='('||ch==='['||ch==='<'||ch==='{')depth++;
  else if(ch===')'||ch===']'||ch==='>'||ch==='}')depth=Math.max(0,depth-1);
  if(ch===','&&depth===0){
   if(cur.trim())out.push(cur.trim());
   cur='';
  }else cur+=ch;
 }
 if(cur.trim())out.push(cur.trim());
 return out;
}

function sampleNumberByName(name:string,fallback:number):number{
 const n=name.toLowerCase();
 if(n==='k')return 60;
 if(n==='target')return 9;
 if(n.includes('cap'))return 2;
 if(n.includes('size')||n.includes('len'))return 5;
 if(n.includes('overlap'))return 2;
 if(n.includes('limit')||n.includes('max')||n==='n'||n==='retries')return 3;
 if(n.includes('step')||n.includes('layer'))return 4;
 return fallback;
}

function sampleStringByName(name:string):string{
 const n=name.toLowerCase();
 if(n.includes('text')||n.includes('input')||n.includes('prompt')||n.includes('query'))return '"面试自习室示例文本"';
 if(n.includes('key'))return '"demo-key"';
 if(n.includes('name'))return '"小明"';
 return '"hello"';
}

function goSampleArg(name:string,typeStr:string):string|null{
 const t=typeStr.trim();
 if(t==='string')return sampleStringByName(name);
 if(t==='int'||t==='int64'||t==='int32'||t==='uint'||t==='uint64')return String(sampleNumberByName(name,10));
 if(t==='float64'||t==='float32')return `${sampleNumberByName(name,1)}.0`;
 if(t==='bool')return 'true';
 if(t==='[]int')return '[]int{2, 7, 11, 15}';
 if(t==='[]string')return '[]string{"a", "b", "a", "c"}';
 if(t==='[][]string')return '[][]string{{"doc1", "doc2", "doc3"}, {"doc2", "doc3", "doc1"}}';
 if(t==='[]float64')return '[]float64{1.0, 2.0, 3.0}';
 if(t==='[]byte')return '[]byte("hello")';
 if(t==='map[string]int')return 'map[string]int{"a": 1, "b": 2}';
 if(t==='map[string]string')return 'map[string]string{"k": "v"}';
 if(t==='context.Context')return 'context.Background()';
 if(t==='time.Duration')return '50 * time.Millisecond';
 if(/^func\([^)]*\)\s*bool$/.test(t))return 'func(v int) bool { return v%2 == 0 }';
 if(/^func\(\)\s*error$/.test(t))return 'func() error { return nil }';
 if(/^func\(error\)\s*bool$/.test(t))return 'func(err error) bool { return err != nil }';
 if(t==='[]T')return '[]int{1, 2, 3, 4}';
 return null;
}

function extractBalancedParens(s:string,openIdx:number):{inner:string;endIdx:number}|null{
 if(s[openIdx]!=='(')return null;
 let depth=0;
 for(let i=openIdx;i<s.length;i++){
  if(s[i]==='(')depth++;
  else if(s[i]===')'){
   depth--;
   if(depth===0)return {inner:s.slice(openIdx+1,i),endIdx:i};
  }
 }
 return null;
}

function synthesizeGoMain(code:string):string{
 // 优先找顶层非方法函数（排除 init/main），支持泛型、函数参数（含嵌套括号）与多返回值
 const headRe=/^\s*func\s+([A-Za-z_]\w*)(?:\[[^\]]+\])?\s*\(/gm;
 let hm:RegExpExecArray|null;
 while((hm=headRe.exec(code))!==null){
  const fnName=hm[1];
  if(fnName==='main'||fnName==='init')continue;
  const openIdx=hm.index+hm[0].length-1;
  const parens=extractBalancedParens(code,openIdx);
  if(!parens)continue;
  const braceIdx=code.indexOf('{',parens.endIdx+1);
  if(braceIdx<0)continue;
  const rawParams=parens.inner.trim();
  const rawRet=code.slice(parens.endIdx+1,braceIdx).trim();
  const parts=rawParams?splitTopCommas(rawParams):[];
  // 处理 Go 共享类型参数，例如 (text string, size, overlap int)
  const parsed:{name:string;type:string}[]=[];
  const pending:string[]=[];
  for(const p of parts){
   const m=p.match(/^([A-Za-z_]\w*)\s+(.+)$/);
   if(m){
    for(const pn of pending)parsed.push({name:pn,type:m[2].trim()});
    pending.length=0;
    parsed.push({name:m[1],type:m[2].trim()});
   }else if(/^[A-Za-z_]\w*$/.test(p)){
    pending.push(p);
   }else{
    parsed.push({name:'arg',type:p});
   }
  }
  const args:string[]=[];
  let ok=true;
  for(const p of parsed){
   const isVariadic=p.type.startsWith('...');
   const baseType=isVariadic?p.type.slice(3):p.type;
   const sample=goSampleArg(p.name,baseType);
   if(!sample){ok=false;break}
   args.push(isVariadic?`${sample}, ${sample}`:sample);
  }
  if(ok){
   const call=`${fnName}(${args.join(', ')})`;
   if(!rawRet)return `${call}\nfmt.Println("${fnName} 执行完成")`;
   if(rawRet.startsWith('(')){
    const inner=rawRet.slice(1,rawRet.lastIndexOf(')'));
    const retCount=Math.max(1,splitTopCommas(inner).length);
    const vars=Array.from({length:retCount},(_,i)=>`r${i+1}`);
    return `${vars.join(', ')} := ${call}\nfmt.Println(${vars.join(', ')})`;
   }
   return `res := ${call}\nfmt.Println(res)`;
  }
 }
 return 'fmt.Println("编译检查通过，可在 main 中补充测试用例")';
}

function splitTopLevelGoStatements(code:string):{decls:string;stmts:string}{
 const lines=code.split('\n');
 const declLines:string[]=[];
 const stmtLines:string[]=[];
 let depth=0;
 let inDecl=false;
 for(const line of lines){
  const t=line.trim();
  if(depth===0){
   if(!t){
    (inDecl?declLines:stmtLines).push(line);
    continue;
   }
   if(t.startsWith('//')||t.startsWith('/*')){
    (stmtLines.length?stmtLines:declLines).push(line);
    continue;
   }
   if(/^(func|type|import|package)\b/.test(t)){
    inDecl=true;
    declLines.push(line);
   }else{
    inDecl=false;
    stmtLines.push(line);
   }
  }else{
   (inDecl?declLines:stmtLines).push(line);
  }
  // 粗略跟踪大括号层级
  const cleaned=t.replace(/"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|`[^`]*`|\/\/.*/g,'');
  for(const ch of cleaned){
   if(ch==='{')depth++;
   else if(ch==='}')depth=Math.max(0,depth-1);
  }
 }
 return {decls:declLines.join('\n').trim(),stmts:stmtLines.join('\n').trim()};
}

function javaSampleArg(name:string,typeStr:string):string|null{
 const t=typeStr.trim();
 if(t==='String')return sampleStringByName(name);
 if(t==='int'||t==='Integer')return String(sampleNumberByName(name,10));
 if(t==='long'||t==='Long')return `${sampleNumberByName(name,10)}L`;
 if(t==='double'||t==='Double')return `${sampleNumberByName(name,1)}.0`;
 if(t==='boolean'||t==='Boolean')return 'true';
 if(t==='int[]')return 'new int[]{2, 7, 11, 15}';
 if(t==='String[]')return 'new String[]{"a", "b", "c"}';
 if(t==='List<String>')return 'List.of("a", "b", "a", "c")';
 if(t==='List<Integer>')return 'List.of(2, 7, 11, 15)';
 if(t==='List<List<String>>')return 'List.of(List.of("doc1", "doc2"), List.of("doc2", "doc1"))';
 if(t==='Map<String, Integer>')return 'new HashMap<>(Map.of("a", 1, "b", 2))';
 return null;
}

function synthesizeJavaMain(code:string):string{
 const m=code.match(/^\s*(?:public\s+|private\s+|protected\s+)?static\s+([\w<>\[\], ?]+?)\s+([a-zA-Z_]\w*)\s*\(([^)]*)\)\s*(?:throws\s+[^{]+)?\{/m);
 if(m&&m[2]!=='main'){
  const retType=m[1].trim(),fnName=m[2],rawParams=m[3].trim();
  const parts=rawParams?splitTopCommas(rawParams):[];
  const args:string[]=[];
  let ok=true;
  for(const p of parts){
   const pm=p.match(/^(.+?)\s+([a-zA-Z_]\w*)$/);
   if(!pm){ok=false;break}
   const sample=javaSampleArg(pm[2],pm[1]);
   if(!sample){ok=false;break}
   args.push(sample);
  }
  if(ok){
   const call=`${fnName}(${args.join(', ')})`;
   if(retType==='void')return `${call};\nSystem.out.println("${fnName} 执行完成");`;
   if(retType.endsWith('[]'))return `System.out.println(Arrays.toString(${call}));`;
   return `System.out.println(${call});`;
  }
 }
 return 'System.out.println("编译检查通过，可在 main 中补充测试用例");';
}

function rustSampleArg(name:string,typeStr:string):string|null{
 const t=typeStr.trim();
 if(t==='&str')return sampleStringByName(name);
 if(t==='String')return `String::from(${sampleStringByName(name)})`;
 if(/^(i32|i64|isize|u32|u64|usize)$/.test(t))return String(sampleNumberByName(name,10));
 if(/^(f64|f32)$/.test(t))return `${sampleNumberByName(name,1)}.0`;
 if(t==='bool')return 'true';
 if(/^&\[i32\]$/.test(t))return '&[2, 7, 11, 15]';
 if(/^&\[i64\]$/.test(t))return '&[2, 7, 11, 15]';
 if(/^&\[usize\]$/.test(t))return '&[1, 2, 3]';
 if(/^Vec<i32>$/.test(t))return 'vec![2, 7, 11, 15]';
 if(/^&\[&str\]$/.test(t))return '&["a", "b", "a"]';
 if(/^&\[String\]$/.test(t))return '&[String::from("a"), String::from("b")]';
 if(/^&\[Vec<String>\]$/.test(t))return '&[vec!["doc1".into(), "doc2".into()], vec!["doc2".into(), "doc1".into()]]';
 return null;
}

function synthesizeRustMain(code:string):string{
 const m=code.match(/^\s*(?:pub\s+)?fn\s+([a-zA-Z_]\w*)(?:<[^>]+>)?\s*\(([^)]*)\)\s*(?:->\s*([^\n{]+))?\{/m);
 if(m&&m[1]!=='main'){
  const fnName=m[1],rawParams=m[2].trim(),rawRet=(m[3]??'').trim();
  const parts=rawParams?splitTopCommas(rawParams):[];
  const args:string[]=[];
  let ok=true;
  for(const p of parts){
   if(p.includes('self')){ok=false;break}
   const pm=p.match(/^(?:mut\s+)?([a-zA-Z_]\w*)\s*:\s*(.+)$/);
   if(!pm){ok=false;break}
   const sample=rustSampleArg(pm[1],pm[2]);
   if(!sample){ok=false;break}
   args.push(sample);
  }
  if(ok){
   const call=`${fnName}(${args.join(', ')})`;
   if(!rawRet||rawRet==='()')return `${call};\nprintln!("${fnName} 执行完成");`;
   return `let res = ${call};\nprintln!("{:?}", res);`;
  }
 }
 return 'println!("编译检查通过，可在 main 中补充测试用例");';
}

function pySampleArg(name:string,typeStr:string):string|null{
 const t=typeStr.toLowerCase().trim(),n=name.toLowerCase();
 if(t.includes('list[list[str]]')||n.includes('lists'))return '[["doc1", "doc2", "doc3"], ["doc2", "doc3", "doc1"]]';
 if(t.includes('list[int]')||n==='nums'||n==='arr')return '[2, 7, 11, 15]';
 if(t.includes('list[str]')||n==='answers'||n==='items'||n==='docs')return '["a", "b", "a", "c"]';
 if(t.includes('list[float]'))return '[1.0, 2.0, 3.0]';
 if(t==='str'||n.includes('text')||n.includes('prompt')||n.includes('query')||n.includes('input'))return sampleStringByName(name);
 if(t==='int'||n==='k'||n==='target'||n.includes('size')||n.includes('overlap')||n.includes('cap')||n.includes('limit')||n==='n')return String(sampleNumberByName(name,10));
 if(t==='float')return `${sampleNumberByName(name,1)}.0`;
 if(t==='bool')return 'True';
 if(t.startsWith('dict'))return '{"a": 1, "b": 2}';
 return null;
}

function synthesizePythonMain(code:string):string{
 const m=code.match(/^(async\s+)?def\s+([a-zA-Z_]\w*)\s*\(([^)]*)\)/m);
 if(m){
  const isAsync=Boolean(m[1]),fnName=m[2],rawParams=m[3].trim();
  const parts=rawParams?splitTopCommas(rawParams):[];
  const args:string[]=[];
  let ok=true;
  for(const p of parts){
   const clean=p.split('=')[0].trim();
   if(!clean||clean==='self'||clean==='cls')continue;
   if(clean.startsWith('*'))continue;
   const [pname,ptype='']=clean.split(':').map(x=>x.trim());
   if(p.includes('='))continue; // 有默认值的参数可以不传
   const sample=pySampleArg(pname,ptype);
   if(!sample){ok=false;break}
   args.push(sample);
  }
  if(ok){
   const call=`${fnName}(${args.join(', ')})`;
   return isAsync?`import asyncio\nprint(asyncio.run(${call}))`:`print(${call})`;
  }
 }
 return 'print("语法检查通过，可在 main 中补充测试用例")';
}

function tsSampleArg(name:string,typeStr:string):string|null{
 const t=typeStr.trim(),n=name.toLowerCase();
 if(t==='string[][]'||n.includes('lists'))return '[["doc1", "doc2", "doc3"], ["doc2", "doc3", "doc1"]]';
 if(t==='number[]'||n==='nums'||n==='arr')return '[2, 7, 11, 15]';
 if(t==='string[]'||n==='answers'||n==='items'||n==='docs')return '["a", "b", "a", "c"]';
 if(t==='string'||n.includes('text')||n.includes('prompt')||n.includes('query')||n.includes('input'))return sampleStringByName(name);
 if(t==='number'||n==='k'||n==='target'||n.includes('size')||n.includes('overlap')||n.includes('cap')||n.includes('limit')||n==='n')return String(sampleNumberByName(name,10));
 if(t==='boolean')return 'true';
 return null;
}

function synthesizeTsMain(code:string):{body:string;isAsync:boolean}{
 const m=code.match(/^\s*(?:export\s+)?(async\s+)?function\s+([a-zA-Z_$]\w*)(?:<[^>]+>)?\s*\(([^)]*)\)/m);
 if(m&&m[2]!=='main'){
  const isAsync=Boolean(m[1]),fnName=m[2],rawParams=m[3].trim();
  const parts=rawParams?splitTopCommas(rawParams):[];
  const args:string[]=[];
  let ok=true;
  for(const p of parts){
   if(p.includes('='))continue;
   const clean=p.replace(/^\.\.\./,'').trim();
   const [pnameRaw,ptype='']=clean.split(':').map(x=>x.trim());
   const pname=pnameRaw.replace(/\?$/,'');
   if(pnameRaw.endsWith('?'))continue;
   const sample=tsSampleArg(pname,ptype);
   if(!sample){ok=false;break}
   args.push(sample);
  }
  if(ok){
   const call=`${isAsync?'await ':''}${fnName}(${args.join(', ')})`;
   return {body:`console.log(${call});`,isAsync};
  }
 }
 return {body:'console.log("语法检查通过，可在 main 中补充测试用例");',isAsync:false};
}

function hasPythonTopLevelExecution(code:string):boolean{
 if(/^\s*if\s+__name__\s*==\s*['"]__main__['"]\s*:/m.test(code))return true;
 const lines=code.split('\n');
 for(const line of lines){
  if(!line.trim()||/^\s/.test(line))continue;
  const t=line.trim();
  if(t.startsWith('#')||/^(def|async\s+def|class|import|from|@)/.test(t))continue;
  // 顶层纯常量/列表赋值（如 messages = []）不算执行入口
  if(/^[A-Za-z_]\w*(?:\s*:\s*[^=]+)?\s*=\s*(\[\]|\{\}|None|0|""|''|True|False|\d+)$/.test(t))continue;
  if(/\bprint\s*\(|\w+\s*\(/.test(t))return true;
 }
 return false;
}

function hasTsTopLevelExecution(code:string):boolean{
 if(/\bconsole\.(log|info|warn|error|table)\s*\(/.test(code))return true;
 if(/\bfunction\s+main\s*\(/.test(code))return true;
 return false;
}

function collectGoImports(fullBody:string,extra:string[]=[]):string[]{
 const set=new Set<string>(extra);
 for(const [re,pkg] of GO_STD_IMPORTS){
  if(re.test(fullBody))set.add(pkg);
 }
 return [...set];
}

// 如果学习卡片或答题框里只有函数/类片段，自动补全可直接编译运行的 main 入口；
// 对答题模式（questionId）自动注入可识别的起止标记，便于点击「同步并返回答题」时干净还原用户的答题代码。
export function prepareForPlayground(
 rawCode:string,
 lang:PlaygroundLang,
 opts:{questionId?:string}={},
):{code:string;wrapped:boolean}{
 const code=rawCode.replace(/\r\n/g,'\n').trim();
 if(!code)return {code:'',wrapped:false};
 if(lang==='sql')return {code:code+'\n',wrapped:false};
 const harness=quizMainFor(opts.questionId,lang);

 if(lang==='go'){
  const hasPkg=/^\s*package\s+\w+/m.test(code);
  const hasMain=/\bfunc\s+main\s*\(/.test(code);
  if(hasPkg&&hasMain)return {code:code+'\n',wrapped:false};

  if(hasPkg&&!hasMain){
   const mainBody=harness?.mainBody??synthesizeGoMain(code);
   return {
    code:`${code}\n\n${PG_MAIN_START_SLASH}\nfunc main() {\n${indentBlock(mainBody,'\t')}\n}\n`,
    wrapped:true,
   };
  }

  const pre=harness?.pre&&(!harness.preUnless||!harness.preUnless.test(code))?harness.pre:'';
  // 答题模式保持原代码完整不动，只加头部与 main；学习卡片模式若混写声明与语句，则自动拆分
  const hasTopLevelDecl=/^\s*(func|type)\s+/m.test(code);
  if(harness||opts.questionId||hasTopLevelDecl){
   if(!harness&&!opts.questionId&&hasTopLevelDecl){
    const {decls,stmts}=splitTopLevelGoStatements(code);
    if(stmts){
     const combined=`${decls}\n${stmts}`;
     const imports=collectGoImports(combined);
     const importBlock=imports.length===0?'':imports.length===1?`import "${imports[0]}"\n\n`:`import (\n${imports.map(p=>`\t"${p}"`).join('\n')}\n)\n\n`;
     return {
      code:`package main\n\n${importBlock}${decls}\n\n${PG_MAIN_START_SLASH}\nfunc main() {\n${indentBlock(stmts,'\t')}\n}\n`,
      wrapped:true,
     };
    }
   }
   const mainBody=hasMain?'':(harness?.mainBody??synthesizeGoMain(code));
   const combined=`${pre}\n${code}\n${mainBody}`;
   const imports=collectGoImports(combined,harness?.goImports??[]);
   const importBlock=imports.length===0?'':imports.length===1?`import "${imports[0]}"\n\n`:`import (\n${imports.map(p=>`\t"${p}"`).join('\n')}\n)\n\n`;
   const prePart=pre?`${pre}\n\n`:'';
   const tail=hasMain?'':`\n\n${PG_MAIN_START_SLASH}\nfunc main() {\n${indentBlock(mainBody,'\t')}\n}`;
   return {
    code:`package main\n\n${importBlock}${prePart}${PG_CODE_START_SLASH}\n${code}${tail}\n`,
    wrapped:true,
   };
  }

  const imports=collectGoImports(code);
  const importBlock=imports.length===0?'':imports.length===1?`import "${imports[0]}"\n\n`:`import (\n${imports.map(p=>`\t"${p}"`).join('\n')}\n)\n\n`;
  return {
   code:`package main\n\n${importBlock}func main() {\n${indentBlock(code,'\t')}\n}\n`,
   wrapped:true,
  };
 }

 if(lang==='rust'){
  if(/\bfn\s+main\s*\(/.test(code))return {code:code+'\n',wrapped:false};
  const pre=harness?.pre&&(!harness.preUnless||!harness.preUnless.test(code))?harness.pre:'';
  const hasTopLevelItem=/^\s*(pub\s+)?(fn|struct|enum|trait|impl|use|mod|type)\b/m.test(code);
  if(harness||opts.questionId||hasTopLevelItem){
   const mainBody=harness?.mainBody??synthesizeRustMain(code);
   const header=pre?`${pre}\n\n${PG_CODE_START_SLASH}\n`:'';
   return {
    code:`${header}${code}\n\n${PG_MAIN_START_SLASH}\nfn main() {\n${indentBlock(mainBody,'    ')}\n}\n`,
    wrapped:true,
   };
  }
  return {code:`fn main() {\n${indentBlock(code,'    ')}\n}\n`,wrapped:true};
 }

 if(lang==='java'){
  if(/\bstatic\s+void\s+main\s*\(/.test(code))return {code:code+'\n',wrapped:false};
  const pre=harness?.pre&&(!harness.preUnless||!harness.preUnless.test(code))?harness.pre:'';
  const hasMember=/^\s*(public|private|protected|static|record|interface|class)\b/m.test(code);
  const extraImports=new Set<string>(['java.util.*',...(harness?.javaImports??[])]);
  if(/\b(CompletableFuture|Executor|Atomic|ConcurrentHashMap|ReentrantLock|Semaphore|CountDownLatch)\b/.test(code))extraImports.add('java.util.concurrent.*');
  if(/\bAtomic\w+\b/.test(code))extraImports.add('java.util.concurrent.atomic.*');
  if(/\b(InputStream|OutputStream|BufferedReader|ByteArray|IOException|DataInputStream)\b/.test(code))extraImports.add('java.io.*');
  const importBlock=[...extraImports].map(i=>`import ${i};`).join('\n');

  if(harness||opts.questionId||hasMember){
   // 嵌套在 public class Main 里的顶层 class 自动补 static，以便 static main 直接实例化
   const innerCode=code.replace(/^(class\s+)/gm,'static $1');
   const mainBody=harness?.mainBody??synthesizeJavaMain(code);
   const prePart=pre?`${indentBlock(pre,'    ')}\n\n`:'';
   return {
    code:`${importBlock}\n\npublic class Main {\n${prePart}    ${PG_CODE_START_SLASH}\n${indentBlock(innerCode,'    ')}\n\n    ${PG_MAIN_START_SLASH}\n    public static void main(String[] args) {\n${indentBlock(mainBody,'        ')}\n    }\n} ${PG_JAVA_END_MARK}\n`,
    wrapped:true,
   };
  }
  return {
   code:`${importBlock}\n\npublic class Main {\n    public static void main(String[] args) {\n${indentBlock(code,'        ')}\n    }\n} ${PG_JAVA_END_MARK}\n`,
   wrapped:true,
  };
 }

 if(lang==='python'){
  if(hasPythonTopLevelExecution(code))return {code:code+'\n',wrapped:false};
  const hasDefOrClass=/^\s*(async\s+)?(def|class)\s+/m.test(code);
  if(!harness&&!hasDefOrClass)return {code:code+'\n',wrapped:false};
  const pre=harness?.pre&&(!harness.preUnless||!harness.preUnless.test(code))?harness.pre:'';
  const mainBody=harness?.mainBody??synthesizePythonMain(code);
  const header=pre?`${pre}\n\n# === 答题代码（下方为你编写的代码）===\n`:'';
  return {
   code:`${header}${code}\n\n${PG_MAIN_START_HASH}\nif __name__ == "__main__":\n${indentBlock(mainBody,'    ')}\n`,
   wrapped:true,
  };
 }

 // JS / TS
 if(hasTsTopLevelExecution(code))return {code:code+'\n',wrapped:false};
 const hasFnOrClass=/^\s*(?:export\s+)?(?:async\s+)?(?:function|class)\s+/m.test(code);
 if(!harness&&!hasFnOrClass)return {code:code+'\n',wrapped:false};
 const pre=harness?.pre&&(!harness.preUnless||!harness.preUnless.test(code))?harness.pre:'';
 const synth=harness?{body:harness.mainBody,isAsync:Boolean(harness.asyncMain)}:synthesizeTsMain(code);
 const header=pre?`${pre}\n\n${PG_CODE_START_SLASH}\n`:'';
 const mainDecl=synth.isAsync
  ?`async function main() {\n${indentBlock(synth.body,'  ')}\n}\nvoid main();`
  :`function main() {\n${indentBlock(synth.body,'  ')}\n}\nmain();`;
 return {
  code:`${header}${code}\n\n${PG_MAIN_START_SLASH}\n${mainDecl}\n`,
  wrapped:true,
 };
}

// 同步回答题框时，自动剥离操场补全的 package/Main 壳与 main 测试入口，只保留学习者自己编写的答题代码。
export function stripPlaygroundHarness(rawCode:string,lang:PlaygroundLang):string{
 if(lang==='sql')return rawCode.replace(/\r\n/g,'\n').trim();
 let out=rawCode.replace(/\r\n/g,'\n');
 const mainMark=lang==='python'?PG_MAIN_START_HASH:PG_MAIN_START_SLASH;
 const mainIdx=out.indexOf(mainMark);
 if(mainIdx>=0){
  out=out.slice(0,mainIdx);
 }

 const startMark=lang==='python'?'# === 答题代码（下方为你编写的代码）===':PG_CODE_START_SLASH;
 const startIdx=out.indexOf(startMark);
 if(startIdx>=0){
  out=out.slice(startIdx+startMark.length);
  if(lang==='java'){
   out=out.replace(new RegExp(`\\n?\\}\\s*${PG_JAVA_END_MARK.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')}\\s*$`),'');
   out=unindentBlock(out.replace(/^\n/,''),4);
   out=out.replace(/^static class\s+/gm,'class ');
  }
 }
 return out.trim();
}

export function emptyStarterFor(lang:PlaygroundLang):string{
 if(lang==='go')return 'package main\n\nimport "fmt"\n\nfunc main() {\n\tfmt.Println("Hello")\n}\n';
 if(lang==='rust')return 'fn main() {\n    println!("Hello");\n}\n';
 if(lang==='java')return 'public class Main {\n    public static void main(String[] args) {\n        System.out.println("Hello");\n    }\n}\n';
 if(lang==='python')return '# 在这里编写并调试你的 Python 代码\n';
 if(lang==='sql')return '-- MySQL 8.0\nSELECT VERSION() AS mysql_version, NOW() AS current_time;\n';
 return '// 在这里编写并调试你的 JS/TS 代码\n';
}

export function outputsMatchExpected(actual:string,expected:string):boolean{
 const norm=(s:string)=>s.replace(/\r\n/g,'\n').split('\n').map(l=>l.trimEnd()).join('\n').trim();
 const a=norm(actual),e=norm(expected);
 return Boolean(e)&&a===e;
}

function readLaunchMap():Record<string,PlaygroundLaunch>{
 try{
  const raw=localStorage.getItem(PG_LAUNCH_STORAGE_KEY);
  return raw?(JSON.parse(raw) as Record<string,PlaygroundLaunch>):{};
 }catch{
  return {};
 }
}

function looksIncompleteForRunner(lang:PlaygroundLang,code:string):boolean{
 if(lang==='sql'){
  const hasCreate=/\bCREATE\s+(?:TEMPORARY\s+)?TABLE\b/i.test(code);
  const refsTable=/\b(?:FROM|JOIN|INTO|UPDATE)\s+`?[A-Za-z_]\w*`?/i.test(code)&&!/\bFROM\s+sqlite_master\b/i.test(code);
  return refsTable&&!hasCreate;
 }
 if(lang==='go'){
  if(!/\bpackage\s+\w+/.test(code)||!/\bfunc\s+main\s*\(/.test(code))return true;
  if(/\b(github\.com|golang\.org|google\.golang\.org|go\.uber\.org|gorm\.io)\b/.test(code))return true;
  const stdChecks:[RegExp,string][]=[
   [/\bfmt\./,'fmt'],[/\bsync\./,'sync'],[/\batomic\./,'sync/atomic'],[/\btime\./,'time'],
   [/\bcontext\./,'context'],[/\bstrings\./,'strings'],[/\bstrconv\./,'strconv'],
   [/\bsort\./,'sort'],[/\berrors\./,'errors'],[/\bhttp\./,'net/http'],[/\bjson\./,'encoding/json'],
   [/\bbytes\./,'bytes'],[/\bio\./,'io'],[/\bos\./,'os'],[/\bmath\./,'math'],[/\breflect\./,'reflect'],
  ];
  for(const [usage,pkg] of stdChecks){
   if(usage.test(code)&&!code.includes(`"${pkg}"`))return true;
  }
  return false;
 }
 if(lang==='rust'){
  if(!/\bfn\s+main\s*\(/.test(code))return true;
  if(/\buse\s+(tokio|serde|reqwest|rand|axum|actix_web|hyper|futures)::/.test(code))return true;
  if(/\b(HashMap|HashSet|BTreeMap|VecDeque)::/.test(code)&&!/\buse\s+std::collections::/.test(code))return true;
  if(/\b(Arc|Mutex|RwLock)::/.test(code)&&!/\buse\s+std::sync::/.test(code))return true;
  return false;
 }
 if(lang==='java'){
  if(!/\bclass\s+Main\b/.test(code)||!/\bstatic\s+void\s+main\s*\(/.test(code))return true;
  if(/@(Service|RestController|Autowired|Component|Repository)\b/.test(code))return true;
  return false;
 }
 if(lang==='python'){
  if(/^\s*(import|from)\s+(requests|httpx|fastapi|pydantic|flask|django|redis|pymongo|sqlalchemy|numpy|pandas|aiohttp)\b/m.test(code))return true;
  if(/\basync\s+def\s+/.test(code)&&!/asyncio\.run\s*\(/.test(code))return true;
  return false;
 }
 // ts
 if(/\brequire\s*\(\s*['"]|from\s+['"](fs|http|https|net|path|crypto|express)['"]/.test(code))return true;
 return false;
}

export function needsAiForInlineRun(lang:PlaygroundLang,preparedCode:string,questionId?:string):boolean{
 if(questionId&&lang!=='sql'&&quizMainFor(questionId,lang))return false;
 if(preparedCode.includes('可在 main 中补充测试用例'))return true;
 return looksIncompleteForRunner(lang,preparedCode);
}

export function savePlaygroundLaunch(
 input:Omit<PlaygroundLaunch,'id'|'createdAt'>,
):{id:string;href:string}{
 const id=(typeof crypto!=='undefined'&&crypto.randomUUID
  ?crypto.randomUUID().replace(/-/g,'').slice(0,10)
  :(Date.now().toString(36)+Math.random().toString(36).slice(2,6)).slice(0,10));
 const hasQuizHarness=Boolean(input.questionId&&input.lang!=='sql'&&quizMainFor(input.questionId,input.lang));
 const needsAiWrap=input.needsAiWrap??((Boolean(input.wrapped)&&!hasQuizHarness)||looksIncompleteForRunner(input.lang,input.code));
 const payload:PlaygroundLaunch={...input,needsAiWrap,id,createdAt:Date.now()};
 try{
  const map=readLaunchMap();
  map[id]=payload;
  // 最多保留最近 15 条启动记录，避免 localStorage 累积
  const entries=Object.entries(map).sort((a,b)=>(b[1].createdAt??0)-(a[1].createdAt??0)).slice(0,15);
  localStorage.setItem(PG_LAUNCH_STORAGE_KEY,JSON.stringify(Object.fromEntries(entries)));
 }catch{}
 return {id,href:`/playground?lang=${encodeURIComponent(input.lang)}&launch=${encodeURIComponent(id)}`};
}

export function readPlaygroundLaunch(id:string):PlaygroundLaunch|null{
 if(!id)return null;
 const map=readLaunchMap();
 return map[id]??null;
}

export function openInPlayground(
 input:Omit<PlaygroundLaunch,'id'|'createdAt'>,
 opts:{newTab?:boolean}={},
):void{
 const {href}=savePlaygroundLaunch(input);
 if(opts.newTab===true){
  const win=window.open(href,'_blank');
  if(win)return;
 }
 window.location.assign(href);
}

export function syncCodeBackToQuiz(payload:Omit<PlaygroundQuizSync,'updatedAt'>):void{
 const item:PlaygroundQuizSync={...payload,updatedAt:Date.now()};
 try{
  localStorage.setItem(PG_QUIZ_SYNC_KEY,JSON.stringify(item));
 }catch{}
 if(typeof window!=='undefined'){
  window.dispatchEvent(new CustomEvent(PG_QUIZ_SYNC_EVENT,{detail:item}));
 }
}

export function readQuizSync(questionId:string):PlaygroundQuizSync|null{
 try{
  const raw=localStorage.getItem(PG_QUIZ_SYNC_KEY);
  if(!raw)return null;
  const parsed=JSON.parse(raw) as PlaygroundQuizSync;
  return parsed&&parsed.questionId===questionId?parsed:null;
 }catch{
  return null;
 }
}

export function clearQuizSync(questionId:string):void{
 try{
  const cur=readQuizSync(questionId);
  if(cur)localStorage.removeItem(PG_QUIZ_SYNC_KEY);
 }catch{}
}
