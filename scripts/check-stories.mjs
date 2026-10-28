// 校验面试题动画脚本：覆盖全部面试题、角色引用有效、画面不越界、节奏合理。
// 用法：node scripts/check-stories.mjs
import {createRequire} from 'node:module';
import {writeFileSync,mkdtempSync,readFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';
const require=createRequire(import.meta.url),{build}=createRequire(require.resolve('wrangler/package.json'))('esbuild');
const entry=`export {stories} from './app/ai/animations/stories/index';export {frontendStories} from './app/ai/animations/stories/frontend';export {frontendLessonStories} from './app/ai/animations/fe-lessons';export {goLazy} from './app/ai/animations/lazy/go';export {aiLazy} from './app/ai/animations/lazy/ai';export {backendLazy} from './app/ai/animations/lazy/backend';export {frontendLazy} from './app/ai/animations/lazy/frontend';export {withNarration,lazyMinutes,LAZY_MAX_MINUTES} from './app/ai/animations/lazy/engine';export {aiLevels as aiLv} from './content/ai-journey';export {frontendLevels} from './content/frontend-journey';export {frontendInterviewQuestions} from './content/frontend-interview/index';export {beatMs} from './app/ai/animations/story';export {textWidth} from './app/ai/animations/kit';export {aiInterviewQuestions} from './content/ai-interview';export {goStories} from './app/ai/animations/stories/go';export {goAnimated,dbAnimated,beAnimated} from './app/ai/animations/go-animated';export {backendStories} from './app/ai/animations/stories/backend';export {dbStories} from './app/ai/animations/stories/db';export {goLessonStories} from './app/ai/animations/go-lessons';export {goLevels} from './content/go-journey';export {backendLessonStories} from './app/ai/animations/be-lessons';export {backendLevels} from './content/backend-journey';export {subjectReviews} from './app/ai/animations/review';export {aiLevels,aiTiers} from './content/ai-journey';export {goLevels as goLv,goTiers} from './content/go-journey';export {backendLevels as beLv,backendTiers} from './content/backend-journey';export {interviewByLevel as aiLinks} from './content/ai-links';export {goInterviewByLevel} from './content/go-links';export {backendInterviewByLevel} from './content/backend-links';export {aiExams} from './content/exams/ai';export {goExams} from './content/exams/go';export {backendExams} from './content/exams/backend';export {aiInterviewQuestions as aiIQ} from './content/ai-interview';export {frontendLevels as feLv,frontendTiers} from './content/frontend-journey';export {frontendExams} from './content/exams/frontend';export {frontendInterviewByLevel} from './content/frontend-links';export {frontendInterviewQuestions as feIQ} from './content/frontend-interview/index';`;
const out=await build({stdin:{contents:entry,resolveDir:process.cwd(),loader:'ts'},bundle:true,write:false,format:'esm',platform:'node',jsx:'automatic',tsconfig:'tsconfig.json',logLevel:'error'});
const file=join(mkdtempSync(join(tmpdir(),'stories-')),'bundle.mjs');writeFileSync(file,out.outputFiles[0].text);
const m=await import(pathToFileURL(file).href);
const {stories:aiStories,goStories,goAnimated,dbStories,dbAnimated,backendStories,beAnimated,goLessonStories,goLevels,backendLessonStories,backendLevels,beatMs,textWidth,aiInterviewQuestions}=await import(pathToFileURL(file).href);
const {questions}=JSON.parse(readFileSync('content/questions.json','utf8')),goIds=new Set(questions.map(q=>q.id));
// 自动生成的阶段复习、考前复习动画（页面运行时生成，这里用同样的函数生成一遍）。
const bankTitles=new Map(JSON.parse(readFileSync('content/questions.json','utf8')).questions.map(q=>[q.id,q.title])),aiTitles=new Map(m.aiIQ.map(q=>[q.id,q.title])),feTitles=new Map(m.feIQ.map(q=>[q.id,q.title]));
const reviewStories=Object.fromEntries([['ai',m.aiLevels,m.aiTiers,m.aiExams,m.aiLinks,aiTitles],['go',m.goLv,m.goTiers,m.goExams,m.goInterviewByLevel,bankTitles],['backend',m.beLv,m.backendTiers,m.backendExams,m.backendInterviewByLevel,bankTitles],['frontend',m.feLv,m.frontendTiers,m.frontendExams,m.frontendInterviewByLevel,feTitles]]
 .flatMap(([id,levels,tiers,exams,interviewByLevel,titles])=>[...m.subjectReviews({id,levels,tiers,exams,interviewByLevel,titleOf:q=>titles.get(q)}).values()].map(s=>[s.id,s])));
const feIds=new Set(m.frontendInterviewQuestions.map(q=>q.id));
const feLevelIds=new Set(m.frontendLevels.map(l=>l.id));
// 懒人模式：每集不超过 30 分钟，关联的关卡存在且属于所标的阶段，每个关卡至少被一集覆盖。
const lazySubjects=[['Go',m.goLazy,goLevels,m.goTiers],['AI',m.aiLazy,m.aiLv,m.aiTiers],['后端',m.backendLazy,m.beLv,m.backendTiers],['前端',m.frontendLazy,m.feLv,m.frontendTiers]];
const lazyStories={},lazyReport=[],lazyProblems=[];
for(const [name,eps,levels,tiers] of lazySubjects){let total=0;
 for(const e of eps){const min=m.lazyMinutes(e);total+=min;lazyStories[e.id]={title:e.title,beats:m.withNarration(e)};
  if(min>m.LAZY_MAX_MINUTES)lazyProblems.push(`懒人模式 ${e.id} 时长 ${min.toFixed(1)} 分钟，超过 ${m.LAZY_MAX_MINUTES} 分钟`);
  for(const id of e.levels){const i=levels.findIndex(l=>l.id===id);if(i<0)lazyProblems.push(`懒人模式 ${e.id} 关联的关卡不存在：${id}`);else if(i<tiers[e.tier].from||i>tiers[e.tier].to)lazyProblems.push(`懒人模式 ${e.id} 的关卡 ${id} 不在第 ${e.tier+1} 阶段`)}}
 if(eps.length)for(const l of levels)if(!eps.some(e=>e.levels.includes(l.id)))lazyProblems.push(`${name} 懒人模式没有覆盖关卡：${l.id}`);
 if(eps.length)lazyReport.push(`${name} ${eps.length} 集 ${Math.round(total)} 分钟（${eps.map(e=>m.lazyMinutes(e).toFixed(0)).join('/')}）`)}
const problems=[...lazyProblems],ids=aiInterviewQuestions.map(q=>q.id),stories={...aiStories,...goStories,...dbStories,...backendStories,...m.frontendStories,...Object.fromEntries([...goLessonStories,...backendLessonStories,...m.frontendLessonStories].map(s=>[s.id,s])),...reviewStories,...lazyStories};
const beLevelIds=new Set(backendLevels.map(l=>l.id));for(const s of backendLessonStories)if(!beLevelIds.has(s.level))problems.push('后端课堂动画关联的关卡不存在：'+s.id);
for(const l of backendLevels)if(!backendLessonStories.some(s=>s.level===l.id))problems.push('后端关卡缺少课堂动画：'+l.id);
const levelIds=new Set(goLevels.map(l=>l.id));for(const s of goLessonStories)if(!levelIds.has(s.level))problems.push('Go 课堂动画关联的关卡不存在：'+s.id+' → '+s.level);
for(const l of goLevels)if(!goLessonStories.some(s=>s.level===l.id))problems.push('Go 关卡缺少课堂动画：'+l.id);
for(const id of ids)if(!aiStories[id])problems.push('缺少动画：'+id);
for(const s of m.frontendLessonStories)if(!feLevelIds.has(s.level))problems.push('前端课堂动画关联的关卡不存在：'+s.id);
for(const l of m.frontendLevels)if(!m.frontendLessonStories.some(s=>s.level===l.id))problems.push('前端关卡缺少课堂动画：'+l.id);
for(const id of feIds)if(!m.frontendStories[id])problems.push('前端面试题缺少动画：'+id);
for(const id of Object.keys(m.frontendStories))if(!feIds.has(id))problems.push('前端动画对应的面试题不存在：'+id);
for(const id of Object.keys(aiStories))if(!ids.includes(id))problems.push('动画对应的面试题不存在：'+id);
for(const id of Object.keys(goStories))if(!goIds.has(id))problems.push('Go 动画对应的题目不存在：'+id);else if(!goAnimated.has(id))problems.push('Go 动画未登记到 go-animated.ts：'+id);
for(const q of questions)if(q.track==='go'&&!goAnimated.has(q.id))problems.push('Go 面试题缺少动画：'+q.id+' '+q.title);
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
  if(/…[，。；：？！]|[，。；：？！]{2}|[⼀-⿟]/.test(b.say))problems.push(`${id}#${i}：字幕有被截断的半句、连续标点或康熙部首字：${b.say.slice(0,40)}`);
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
console.log(`动画 ${Object.keys(stories).length} 个（AI ${Object.keys(aiStories).length}，Go ${Object.keys(goStories).length}，数据库 ${Object.keys(dbStories).length}，后端 ${Object.keys(backendStories).length}，前端 ${Object.keys(m.frontendStories).length}，Go 课堂 ${goLessonStories.length}，后端课堂 ${backendLessonStories.length}，前端课堂 ${m.frontendLessonStories.length}，复习 ${Object.keys(reviewStories).length}）；时长 ${Math.min(...secs)}～${Math.max(...secs)} 秒，平均 ${Math.round(secs.reduce((a,b)=>a+b,0)/secs.length)} 秒`);
if(lazyReport.length)console.log('懒人模式：'+lazyReport.join('；'));
if(problems.length){console.log(problems.join('\n'));process.exit(1)}
console.log('PASS');
