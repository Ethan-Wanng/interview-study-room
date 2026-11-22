import {createRequire} from 'node:module';
import {readFile,readdir} from 'node:fs/promises';
import vm from 'node:vm';
import assert from 'node:assert/strict';

const require=createRequire(import.meta.url);
const wranglerRequire=createRequire(require.resolve('wrangler/package.json'));
const {Miniflare}=wranglerRequire('miniflare');
const {build}=wranglerRequire('esbuild');

const output=await build({
 stdin:{
  contents:`
   import * as stories from './app/api/stories/route';
   import * as pgShare from './app/api/playground/share/route';
   import * as pgRun from './app/api/playground/run/route';
   import * as pgFmt from './app/api/playground/fmt/route';
   import * as auth from './app/api/auth/route';
   export { PLAYGROUND_EXAMPLES, PLAYGROUND_LANGS } from './content/playground-examples';
   export { stripTypeScript } from './lib/ts-strip';
   export { formatCodeSimple } from './lib/code-format';
   export {
    PLAYGROUND_EXAMPLE_LINKS,
    playgroundLearnLinkFor,
    subjectPlaygroundLang,
    detectPlaygroundLang,
    prepareForPlayground,
    stripPlaygroundHarness,
    outputsMatchExpected,
   } from './lib/playground-bridge';
   export { codeRefsFor } from './content/code-refs';
   export { codeStarters } from './content/code-starters';
   export { goLevels } from './content/go-journey';
   export { rustLevels } from './content/rust-journey';
   export { pythonLevels } from './content/python-journey';
   export { aiLevels } from './content/ai-journey';
   export { backendLevels } from './content/backend-journey';
   export { frontendLevels } from './content/frontend-journey';
   export { projectLevels } from './content/project-journey';
   export default {
    async fetch(request) {
     const url = new URL(request.url);
     const path = url.pathname;
     if (path === '/api/stories') return request.method === 'POST' ? stories.POST(request) : stories.GET(request);
     if (path === '/api/playground/share') return request.method === 'POST' ? pgShare.POST(request) : pgShare.GET(request);
     if (path === '/api/playground/run') return pgRun.POST(request);
     if (path === '/api/playground/fmt') return pgFmt.POST(request);
     if (path === '/api/auth') return request.method === 'POST' ? auth.POST(request) : auth.GET(request);
     return new Response('not found', { status: 404 });
    }
   };
  `,
  resolveDir:process.cwd(),
  sourcefile:'playground-stories-entry.ts',
 },
 bundle:true,
 write:false,
 format:'esm',
 platform:'node',
 target:'es2022',
 external:['cloudflare:workers','node:*'],
 tsconfig:'tsconfig.json',
});

// 也把纯逻辑导出加载到 Node 测试进程，便于直接测试 35 段示例、TS 剥离和格式化
const libOut=await build({
 stdin:{
  contents:`
   export { PLAYGROUND_EXAMPLES, PLAYGROUND_LANGS } from './content/playground-examples';
   export { stripTypeScript } from './lib/ts-strip';
   export { formatCodeSimple } from './lib/code-format';
   export {
    PLAYGROUND_EXAMPLE_LINKS,
    playgroundLearnLinkFor,
    subjectPlaygroundLang,
    detectPlaygroundLang,
    prepareForPlayground,
    stripPlaygroundHarness,
    outputsMatchExpected,
   } from './lib/playground-bridge';
   export { codeRefsFor } from './content/code-refs';
   export { codeStarters } from './content/code-starters';
   export { goLevels } from './content/go-journey';
   export { rustLevels } from './content/rust-journey';
   export { pythonLevels } from './content/python-journey';
   export { aiLevels } from './content/ai-journey';
   export { backendLevels } from './content/backend-journey';
   export { frontendLevels } from './content/frontend-journey';
   export { projectLevels } from './content/project-journey';
  `,
  resolveDir:process.cwd(),
  sourcefile:'lib-only.ts',
 },
 bundle:true,
 write:false,
 format:'esm',
 platform:'node',
 target:'es2022',
 tsconfig:'tsconfig.json',
});
const libUrl='data:text/javascript;base64,'+Buffer.from(libOut.outputFiles[0].text).toString('base64');
const {
 PLAYGROUND_EXAMPLES,PLAYGROUND_LANGS,stripTypeScript,formatCodeSimple,
 PLAYGROUND_EXAMPLE_LINKS,playgroundLearnLinkFor,subjectPlaygroundLang,
 detectPlaygroundLang,prepareForPlayground,stripPlaygroundHarness,outputsMatchExpected,
 codeRefsFor,codeStarters,
 goLevels,rustLevels,pythonLevels,aiLevels,backendLevels,frontendLevels,projectLevels,
}=await import(libUrl);

// 1. 验证 5 种语言 × 7 段示例
assert.equal(PLAYGROUND_LANGS.length,5);
assert.deepEqual(PLAYGROUND_LANGS.map(l=>l.id),['go','python','java','ts','rust']);
const seenIds=new Set();
for(const l of PLAYGROUND_LANGS){
 const list=PLAYGROUND_EXAMPLES[l.id];
 assert.equal(list.length,7,`${l.id} must have exactly 7 examples`);
 for(const ex of list){
  assert.ok(ex.id&&!seenIds.has(ex.id),`duplicate/empty id ${ex.id}`);
  seenIds.add(ex.id);
  assert.ok(ex.title[0]&&ex.title[1]);
  assert.ok(ex.summary[0]&&ex.summary[1]);
  assert.ok(ex.code.trim().length>20);
 }
}

// 2. 验证所有 7 段 JS/TS 示例与边界语法经 stripTypeScript 后可在沙盒正常执行
for(const ex of PLAYGROUND_EXAMPLES.ts){
 const js=stripTypeScript(ex.code);
 const logs=[];
 const ctx=vm.createContext({
  console:{log:(...a)=>logs.push(a.join(' ')),warn:(...a)=>logs.push(a.join(' ')),error:(...a)=>logs.push(a.join(' '))},
  setTimeout,clearTimeout,Promise,Map,Set,Array,Object,JSON,Math,Intl,
 });
 vm.runInContext(js,ctx);
 await new Promise(r=>setTimeout(r,90));
 assert.ok(logs.length>=1,`${ex.id} should produce output`);
}
const trickyJs=stripTypeScript(`
 const cmp = (a: number, b: number): boolean => a < b && b > 0;
 enum Role { Admin = 'admin', User = 'user' }
 class Box<T> { constructor(private readonly val: T) {} get(): T { return this.val; } }
 console.log(cmp(1, 2), Role.Admin, new Box<number>(42).get());
`);
const trickyLogs=[];
vm.runInNewContext(trickyJs,{console:{log:(...a)=>trickyLogs.push(a.join(' '))}});
assert.equal(trickyLogs[0],'true admin 42');

// 3. 验证格式化
const formattedJava=formatCodeSimple('java','public class Main {\npublic static void main(String[] args) {\nSystem.out.println("ok");\n}\n}');
assert.match(formattedJava,/    public static void main/);

// 3.5 验证学习与操场双向联动桥接逻辑
assert.equal(subjectPlaygroundLang('go'),'go');
assert.equal(subjectPlaygroundLang('rust'),'rust');
assert.equal(subjectPlaygroundLang('python'),'python');
assert.equal(subjectPlaygroundLang('ai'),'python');
assert.equal(subjectPlaygroundLang('frontend'),'ts');
assert.equal(subjectPlaygroundLang('backend'),'go');
assert.equal(subjectPlaygroundLang('project','java'),'java');
assert.equal(subjectPlaygroundLang('project','node'),'ts');
assert.equal(subjectPlaygroundLang('ai-support','python'),'python');
assert.equal(subjectPlaygroundLang('english'),null);

// 35 段操场示例的关联关卡全部存在且指向真实 level id
const levelSets={
 go:new Set(goLevels.map(l=>l.id)),
 rust:new Set(rustLevels.map(l=>l.id)),
 python:new Set(pythonLevels.map(l=>l.id)),
 ai:new Set(aiLevels.map(l=>l.id)),
 backend:new Set(backendLevels.map(l=>l.id)),
 frontend:new Set(frontendLevels.map(l=>l.id)),
 project:new Set(projectLevels.map(l=>l.id)),
};
for(const l of PLAYGROUND_LANGS){
 for(const ex of PLAYGROUND_EXAMPLES[l.id]){
  const link=PLAYGROUND_EXAMPLE_LINKS[ex.id];
  assert.ok(link,`missing PLAYGROUND_EXAMPLE_LINKS for ${ex.id}`);
  assert.equal(playgroundLearnLinkFor(ex.id,l.id).href,link.href);
  const u=new URL('https://site.test'+link.href);
  const lv=u.searchParams.get('level');
  if(lv){
   assert.ok(levelSets[link.subject]?.has(lv),`invalid linked level ${link.subject}/${lv} for ${ex.id}`);
  }
 }
}

// 语言识别与非可执行内容过滤
assert.equal(detectPlaygroundLang('package main\nimport "fmt"\nfunc main(){ fmt.Println("hi") }','go'),'go');
assert.equal(detectPlaygroundLang('let age = 18;\nlet mut score = 60;\nprintln!("{age} {score}");','rust'),'rust');
assert.equal(detectPlaygroundLang('console.log(1);\nPromise.resolve().then(() => console.log(2));','ts'),'ts');
assert.equal(detectPlaygroundLang('def add(a, b):\n    return a + b\nprint(add(1, 2))','python'),'python');
assert.equal(detectPlaygroundLang('public class Main { public static void main(String[] args) { System.out.println("ok"); } }','java'),'java');
// 非可执行命令、配置、报错、SQL、HTML、CSS、多文件 Go 必须返回 null
assert.equal(detectPlaygroundLang('cargo new hello\ncd hello\ncargo run','rust'),null);
assert.equal(detectPlaygroundLang('go get github.com/gin-gonic/gin@v1.9.0\ngo mod tidy','go'),null);
assert.equal(detectPlaygroundLang('module github.com/xiaoming/shop\n\ngo 1.26','go'),null);
assert.equal(detectPlaygroundLang('[package]\nname = "hello"\nversion = "0.1.0"','rust'),null);
assert.equal(detectPlaygroundLang('error[E0425]: cannot find value `nme` in this scope\n --> src/main.rs:3:23','rust'),null);
assert.equal(detectPlaygroundLang('SELECT * FROM users WHERE id = 1;','go'),null);
assert.equal(detectPlaygroundLang('<div class="box"><p>Hello</p></div>','ts'),null);
assert.equal(detectPlaygroundLang('.box { display: flex; gap: 8px; }','ts'),null);
assert.equal(detectPlaygroundLang('const btn = document.querySelector("#ok"); btn.click();','ts'),null);
assert.equal(detectPlaygroundLang('// a.go\npackage greet\n// main.go\npackage main','go'),null);

// 自动补全可运行入口（Go/Rust/Java/Python/JS-TS 答题框架与混合片段）+ 同步回填剥离
const wrappedGo=prepareForPlayground('s := []int{1, 2}\nfmt.Println(len(s))','go');
assert.equal(wrappedGo.wrapped,true);
assert.match(wrappedGo.code,/package main[\s\S]*import "fmt"[\s\S]*func main\(\)/);
const fullGo=prepareForPlayground('package main\nimport "fmt"\nfunc main(){ fmt.Println(1) }','go');
assert.equal(fullGo.wrapped,false);
const mixedGo=prepareForPlayground('func sum(xs ...int) int {\n\treturn len(xs)\n}\nsum(1, 2, 3)','go');
assert.equal(mixedGo.wrapped,true);
assert.match(mixedGo.code,/func sum\([\s\S]*func main\(\) \{\n\tsum\(1, 2, 3\)\n\}/);
const genericGo=prepareForPlayground('func Filter[T any](xs []T, keep func(T) bool) []T {\n\treturn xs\n}','go',{questionId:'go-generics-10'});
assert.equal(genericGo.wrapped,true);
assert.match(genericGo.code,/func main\(\) \{[\s\S]*Filter\(\[\]int\{1, 2, 3, 4\}/);
assert.equal(stripPlaygroundHarness(genericGo.code,'go'),'func Filter[T any](xs []T, keep func(T) bool) []T {\n\treturn xs\n}');

const wrappedRust=prepareForPlayground('let x = 42;\nprintln!("{x}");','rust');
assert.equal(wrappedRust.wrapped,true);
assert.match(wrappedRust.code,/fn main\(\) \{[\s\S]*let x = 42;/);
const rustFn=prepareForPlayground('fn max_of(a: i32, b: i32) -> i32 { if a > b { a } else { b } }','rust',{questionId:'rust-basics-18'});
assert.equal(rustFn.wrapped,true);
assert.match(rustFn.code,/fn main\(\) \{[\s\S]*max_of\(10, 10\)/);
assert.equal(stripPlaygroundHarness(rustFn.code,'rust'),'fn max_of(a: i32, b: i32) -> i32 { if a > b { a } else { b } }');

const wrappedJava=prepareForPlayground('System.out.println(1 + 2);','java');
assert.equal(wrappedJava.wrapped,true);
assert.match(wrappedJava.code,/public class Main[\s\S]*public static void main/);

// 检验核心多语言答题框架（含 class Node 的 Java、Python、JS/TS、Go、Rust）都能补全 main 且无损剥离回填
for(const qid of ['ai-x2-32','be-x1-37','be-ds-10','be-algo-10','be-x1-15','ai-e1-24','calling-12']){
 const st=codeStarters[qid];
 assert.ok(st,`missing starter ${qid}`);
 for(const lang of ['go','python','java','ts','rust']){
  const src=st[lang];
  if(!src)continue;
  const prep=prepareForPlayground(src,lang,{questionId:qid});
  assert.equal(prep.wrapped,true,`${qid}/${lang} should auto-complete main`);
  if(lang==='go')assert.match(prep.code,/func main\(\)/);
  if(lang==='rust')assert.match(prep.code,/fn main\(\)/);
  if(lang==='java')assert.match(prep.code,/public static void main\(String\[\] args\)/);
  if(lang==='python')assert.match(prep.code,/if __name__ == "__main__":/);
  if(lang==='ts')assert.match(prep.code,/function main\(\)/);
  const stripped=stripPlaygroundHarness(prep.code,lang);
  assert.equal(stripped,src.replace(/\r\n/g,'\n').trim(),`${qid}/${lang} round-trip strip mismatch`);
 }
}

// 真实执行 TS 参考答案 + 自动补全的 main()，确认零报错并产出实际输出
for(const qid of ['ai-x2-32','be-x1-37','be-ds-10','be-algo-10','be-x1-15','calling-12']){
 const refEntry=codeRefsFor(qid,'');
 const tsRef=refEntry?.refs?.ts;
 assert.ok(tsRef,`missing ts ref for ${qid}`);
 const prep=prepareForPlayground(tsRef,'ts',{questionId:qid});
 const js=stripTypeScript(prep.code);
 const out=[];
 const ctx=vm.createContext({
  console:{log:(...a)=>out.push(a.join(' ')),warn:(...a)=>out.push(a.join(' ')),error:(...a)=>out.push(a.join(' '))},
  setTimeout,clearTimeout,Promise,Map,Set,Array,Object,JSON,Math,
 });
 vm.runInContext(js,ctx);
 await new Promise(r=>setTimeout(r,30));
 assert.ok(out.length>=1,`${qid} auto-main should print output in TS sandbox`);
}

// 期望输出比对
assert.equal(outputsMatchExpected('Hello, Gopher\r\n你好，小明！  \r\n','Hello, Gopher\n你好，小明！'),true);
assert.equal(outputsMatchExpected('Hello, Rust','Hello, Gopher'),false);

// 4. Miniflare D1 端到端接口测试（含模拟的外部编译器响应）
let lastGodboltJava='';
async function outbound(request){
 const url=new URL(request.url);
 if(url.href==='https://go.dev/_/compile'){
  const body=new URLSearchParams(await request.text()).get('body')??'';
  return Response.json({Errors:'',Events:[{Message:`ran ${body.length} bytes\n`,Kind:'stdout',Delay:0}],VetErrors:''});
 }
 if(url.href==='https://go.dev/_/fmt'){
  return Response.json({Body:'package main\n\nfunc main() {}\n',Error:''});
 }
 if(url.href==='https://play.rust-lang.org/execute'){
  return Response.json({success:true,exitDetail:'Exited with status 0',stdout:'rust ok\n',stderr:'   Compiling playground v0.0.1 (/playground)\n    Finished `dev` profile\n     Running `target/debug/playground`\n'});
 }
 if(url.href==='https://play.rust-lang.org/format'){
  return Response.json({success:true,code:'fn main() {}\n',stdout:'',stderr:''});
 }
 if(url.host==='godbolt.org'){
  const p=JSON.parse(await request.text());
  if(p.lang==='java')lastGodboltJava=p.source;
  return Response.json({code:0,stderr:[],execResult:{code:0,stdout:[{text:`${p.lang} ok`}],stderr:[]}});
 }
 return new Response('unexpected '+url.href,{status:599});
}

const mf=new Miniflare({
 modules:true,
 script:output.outputFiles[0].text,
 compatibilityDate:'2026-05-15',
 compatibilityFlags:['nodejs_compat'],
 d1Databases:{DB:'pg-stories-test'},
 outboundService:outbound,
});

try{
 const db=await mf.getD1Database('DB');
 const files=(await readdir('drizzle')).filter(f=>f.endsWith('.sql')).sort();
 for(const f of files){
  for(const part of (await readFile('drizzle/'+f,'utf8')).split('--> statement-breakpoint')){
   if(part.trim())await db.prepare(part.trim()).run();
  }
 }

 const call=(path,body,cookie='')=>mf.dispatchFetch('https://site.test'+path,{
  method:body?'POST':'GET',
  headers:{'content-type':'application/json',origin:'https://site.test',...(cookie?{cookie}:{})},
  ...(body?{body:JSON.stringify(body)}:{}),
 });

 // 测试 /api/playground/run 与 /api/playground/fmt
 const goRun=await call('/api/playground/run',{lang:'go',code:'package main\nfunc main(){}'});
 assert.equal(goRun.status,200);
 assert.equal((await goRun.json()).ok,true);

 const rsRun=await call('/api/playground/run',{lang:'rust',code:'fn main(){}'});
 const rsData=await rsRun.json();
 assert.equal(rsData.ok,true);
 assert.equal(rsData.stderr,'');

 const javaRun=await call('/api/playground/run',{lang:'java',code:'public class Main {\n  public static void main(String[] args) {\n    System.out.println("中文");\n  }\n}'});
 assert.equal(javaRun.status,200);
 assert.ok(!/^\s*public\s+class\b/m.test(lastGodboltJava),'public modifier stripped for Godbolt example.java');
 assert.ok(lastGodboltJava.includes('StandardCharsets.UTF_8'),'UTF-8 PrintStream injected for Chinese stdout');
 assert.equal(lastGodboltJava.split('\n').length,5,'line count preserved exactly');

 const goFmt=await call('/api/playground/fmt',{lang:'go',code:'package main\nfunc main(){}'});
 assert.equal(goFmt.status,200);
 assert.match((await goFmt.json()).code,/package main/);

 // 测试 /api/playground/share
 const sh1=await call('/api/playground/share',{lang:'python',code:'print(123)',title:'demo'});
 assert.equal(sh1.status,200);
 const d1=await sh1.json();
 assert.ok(d1.id&&d1.url===`/playground?s=${d1.id}`);
 const shDup=await (await call('/api/playground/share',{lang:'python',code:'print(123)'})).json();
 assert.equal(shDup.id,d1.id,'identical snippet reuses existing share id');
 const gotSh=await call(`/api/playground/share?id=${d1.id}`);
 assert.equal(gotSh.status,200);
 assert.equal((await gotSh.json()).snippet.code,'print(123)');
 assert.equal((await call('/api/playground/share?id=bad!')).status,400);
 assert.equal((await call('/api/playground/share?id=missing123')).status,404);

 // 测试 /api/stories（创建、校验、点赞去重、编辑鉴权、删除级联）
 assert.deepEqual((await (await call('/api/stories')).json()).items,[]);
 const badSt=await call('/api/stories',{action:'create',title:'a',content:'too short'});
 assert.equal(badSt.status,400);

 const stRes=await call('/api/stories',{
  action:'create',
  category:'offer',
  title:'拿到了理想的 Go 后端 Offer',
  quote:'每天坚持十题，时间会给你答案。',
  content:'从 9 月开始跟着面试自习室按遗忘曲线复习，终于拿到了心仪的 Offer！',
  author:'小王',
  roleTag:'2026 届 · Go 后端',
  anonymous:false,
 });
 assert.equal(stRes.status,200);
 const created=await stRes.json();
 assert.ok(created.item.id&&created.editToken);
 assert.equal(created.item.likes,0);

 // 点赞 & 取消点赞
 const like1=await (await call('/api/stories',{action:'toggleLike',id:created.item.id,voter:'voter_12345678'})).json();
 assert.equal(like1.liked,true);
 assert.equal(like1.likes,1);
 const like2=await (await call('/api/stories',{action:'toggleLike',id:created.item.id,voter:'voter_99999999'})).json();
 assert.equal(like2.likes,2);
 const unlike1=await (await call('/api/stories',{action:'toggleLike',id:created.item.id,voter:'voter_12345678'})).json();
 assert.equal(unlike1.liked,false);
 assert.equal(unlike1.likes,1);

 // 列表带上 voter 返回 liked 状态
 const listRes=await (await call('/api/stories?voter=voter_99999999')).json();
 assert.equal(listRes.items.length,1);
 assert.equal(listRes.items[0].liked,true);

 // 无权限不能修改/删除
 const forbid=await call('/api/stories',{action:'update',id:created.item.id,editToken:'wrong',title:'hack',content:'尝试修改别人的故事内容'});
 assert.equal(forbid.status,403);

 // 持 editToken 可修改
 const upd=await call('/api/stories',{
  action:'update',
  id:created.item.id,
  editToken:created.editToken,
  category:'offer',
  title:'更新：顺利入职后端岗位',
  quote:'坚持就是胜利',
  content:'更新一下后续，今天已经顺利办理入职手续，祝大家都能拿到好结果！',
  anonymous:true,
 });
 assert.equal(upd.status,200);
 assert.equal((await upd.json()).item.author,'匿名学友');

 // 删除级联清理
 const del=await call('/api/stories',{action:'delete',id:created.item.id,editToken:created.editToken});
 assert.equal(del.status,200);
 assert.deepEqual((await (await call('/api/stories')).json()).items,[]);
 assert.equal((await db.prepare('SELECT count(*) n FROM story_likes').first()).n,0);

 console.log('PASS: 35 playground examples, TS stripper, formatter, playground APIs, snippet sharing, and stories CRUD/likes verified.');
}finally{
 await mf.dispose();
}
