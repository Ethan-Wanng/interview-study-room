// 校验面试题动画脚本：覆盖全部面试题、角色引用有效、画面不越界、节奏合理。
// 用法：node scripts/check-stories.mjs
import {createRequire} from 'node:module';
import {writeFileSync,mkdtempSync,readFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';
const require=createRequire(import.meta.url),{build}=createRequire(require.resolve('wrangler/package.json'))('esbuild');
const entry=`export {stories} from './app/ai/animations/stories/index';export {beatMs} from './app/ai/animations/story';export {textWidth} from './app/ai/animations/kit';export {aiInterviewQuestions} from './content/ai-interview';export {goStories} from './app/ai/animations/stories/go';export {goAnimated,dbAnimated,beAnimated} from './app/ai/animations/go-animated';export {backendStories} from './app/ai/animations/stories/backend';export {dbStories} from './app/ai/animations/stories/db';export {goLessonStories} from './app/ai/animations/go-lessons';export {goLevels} from './content/go-journey';`;
const out=await build({stdin:{contents:entry,resolveDir:process.cwd(),loader:'ts'},bundle:true,write:false,format:'esm',platform:'node',jsx:'automatic',tsconfig:'tsconfig.json',logLevel:'error'});
const file=join(mkdtempSync(join(tmpdir(),'stories-')),'bundle.mjs');writeFileSync(file,out.outputFiles[0].text);
const {stories:aiStories,goStories,goAnimated,dbStories,dbAnimated,backendStories,beAnimated,goLessonStories,goLevels,beatMs,textWidth,aiInterviewQuestions}=await import(pathToFileURL(file).href);
const {questions}=JSON.parse(readFileSync('content/questions.json','utf8')),goIds=new Set(questions.map(q=>q.id));
const problems=[],ids=aiInterviewQuestions.map(q=>q.id),stories={...aiStories,...goStories,...dbStories,...backendStories,...Object.fromEntries(goLessonStories.map(s=>[s.id,s]))};
const levelIds=new Set(goLevels.map(l=>l.id));for(const s of goLessonStories)if(!levelIds.has(s.level))problems.push('Go 课堂动画关联的关卡不存在：'+s.id+' → '+s.level);
for(const l of goLevels)if(!goLessonStories.some(s=>s.level===l.id))problems.push('Go 关卡缺少课堂动画：'+l.id);
for(const id of ids)if(!aiStories[id])problems.push('缺少动画：'+id);
for(const id of Object.keys(aiStories))if(!ids.includes(id))problems.push('动画对应的面试题不存在：'+id);
for(const id of Object.keys(goStories))if(!goIds.has(id))problems.push('Go 动画对应的题目不存在：'+id);else if(!goAnimated.has(id))problems.push('Go 动画未登记到 go-animated.ts：'+id);
for(const id of goAnimated)if(!goStories[id])problems.push('go-animated.ts 登记了但缺少 Go 动画：'+id);
for(const id of Object.keys(dbStories))if(!goIds.has(id))problems.push('数据库动画对应的题目不存在：'+id);else if(!dbAnimated.has(id))problems.push('数据库动画未登记到 go-animated.ts：'+id);
for(const id of dbAnimated)if(!dbStories[id])problems.push('缺少数据库动画：'+id);
for(const id of Object.keys(backendStories))if(!goIds.has(id))problems.push('后端动画对应的题目不存在：'+id);else if(!beAnimated.has(id))problems.push('后端动画未登记（运行 scripts/sync-animated-ids.mjs）：'+id);
for(const id of beAnimated)if(!backendStories[id])problems.push('登记了但缺少后端动画：'+id);
const width=a=>{const k=a.kind??'char';if(k==='char')return Math.max(60,textWidth(a.label,13.5)+4);return Math.max(k==='tag'?60:104,Math.round(textWidth(a.label,13.5)+(k==='tag'?40:58)))};
const totals=[],seen=new Set();
for(const [id,s] of Object.entries(stories)){const cast=new Map();let total=0;
 if(!s.beats.length||!s.beats.at(-1).memo)problems.push(`${id}：最后一个镜头建议是口诀卡片`);
 s.beats.forEach((b,i)=>{total+=beatMs(b)*0.7;
  for(const a of b.add??[]){if(cast.has(a.id))problems.push(`${id}#${i}：重复登场 ${a.id}`);cast.set(a.id,{...a})}
  for(const [k,[x,y]] of Object.entries(b.move??{})){if(!cast.has(k))problems.push(`${id}#${i}：移动不存在的 ${k}`);else Object.assign(cast.get(k),{x,y})}
  for(const k of [...Object.keys(b.tone??{}),...Object.keys(b.sub??{}),...(b.focus??[])])if(!cast.has(k))problems.push(`${id}#${i}：引用不存在的 ${k}`);
  for(const s2 of b.send??[])for(const k of [s2.from,s2.to])if(!cast.has(k))problems.push(`${id}#${i}：传递引用不存在的 ${k}`);
  if(b.bubble&&!cast.has(b.bubble.who))problems.push(`${id}#${i}：气泡引用不存在的 ${b.bubble.who}`);
  for(const k of b.drop??[]){if(!cast.has(k))problems.push(`${id}#${i}：退场不存在的 ${k}`);cast.delete(k)}
  for(const k of Object.keys(b.sub??{}))if(cast.has(k))cast.get(k).sub=b.sub[k];
  const boxes=[...cast.values()].map(a=>{const half=width(a)/2,char=(a.kind??'char')==='char';return {a,l:a.x-half,r:a.x+half,t:char?a.y-30:a.y-24,b:char?a.y+(a.sub?70:52):a.y+(a.sub?44:26)}});
  for(const {a,l,r,t,b:bt} of boxes)if(l<0||r>640||t<0||bt>360)problems.push(`${id}#${i}：${a.id}「${a.label}」超出画面（x ${Math.round(l)}～${Math.round(r)}，y ${t}～${bt}）`);
  boxes.forEach((p,j)=>boxes.slice(j+1).forEach(q=>{const ox=Math.min(p.r,q.r)-Math.max(p.l,q.l),oy=Math.min(p.b,q.b)-Math.max(p.t,q.t);if(ox>6&&oy>6){const key=`${id}：${p.a.id}「${p.a.label}」与 ${q.a.id}「${q.a.label}」重叠`;if(!seen.has(key)){seen.add(key);problems.push(`${key}（第 ${i} 镜起）`)}}}));
 });totals.push([id,Math.round(total/1000)]);}
const secs=totals.map(t=>t[1]);
console.log(`动画 ${Object.keys(stories).length} 个（AI ${Object.keys(aiStories).length}，Go ${Object.keys(goStories).length}，数据库 ${Object.keys(dbStories).length}，后端 ${Object.keys(backendStories).length}，Go 课堂 ${goLessonStories.length}）；时长 ${Math.min(...secs)}～${Math.max(...secs)} 秒，平均 ${Math.round(secs.reduce((a,b)=>a+b,0)/secs.length)} 秒`);
if(problems.length){console.log(problems.join('\n'));process.exit(1)}
console.log('PASS');
