// 校验阶段训练与考试题：题量规则、题型齐全、答案下标有效、id 全局唯一。
// 用法：node scripts/check-exams.mjs
import {createRequire} from 'node:module';
import {writeFileSync,mkdtempSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';
const require=createRequire(import.meta.url),{build}=createRequire(require.resolve('wrangler/package.json'))('esbuild');
const subjects=[['Go','./content/exams/go','goExams','./content/go-journey','goLevels'],['AI','./content/exams/ai','aiExams','./content/ai-journey','aiLevels'],['后端通用','./content/exams/backend','backendExams','./content/backend-journey','backendLevels'],['前端开发','./content/exams/frontend','frontendExams','./content/frontend-journey','frontendLevels']];
const {existsSync}=await import('node:fs');
const present=subjects.filter(([,e])=>existsSync(e.replace('./','')+'.ts'));
const entry=present.map(([,e,x,l,y],i)=>`export {${x} as e${i}} from '${e}';export {${y} as l${i}} from '${l}';`).join('');
const out=await build({stdin:{contents:entry,resolveDir:process.cwd(),loader:'ts'},bundle:true,write:false,format:'esm',platform:'node',logLevel:'error'});
const file=join(mkdtempSync(join(tmpdir(),'exams-')),'bundle.mjs');writeFileSync(file,out.outputFiles[0].text);
const m=await import(pathToFileURL(file).href),problems=[],ids=new Set(),allTypes=['single','multi','judge','fill','short','code'];
present.forEach(([name],i)=>{const exams=m['e'+i],levels=m['l'+i];
 for(const l of levels)for(const q of l.quiz)ids.add(q.id);
 for(const e of exams){const need=e.kind==='training'?Math.ceil(e.requires.reduce((n,id)=>n+(levels.find(l=>l.id===id)?.quiz.length??0),0)/2):e.kind==='stage'?25:30;
  const types=new Set(e.quiz.map(q=>q.type??'single'));
  const status=e.quiz.length===need?'✓':`缺 ${need-e.quiz.length}`;console.log(`${name} ${e.title}：${e.quiz.length}/${need} ${status}  题型 ${[...types].join(',')}`);
  if(e.quiz.length<need)problems.push(`${name} ${e.title} 题量不足：${e.quiz.length}/${need}`);
  if(e.kind!=='training'&&e.quiz.length&&allTypes.some(t=>!types.has(t)))problems.push(`${name} ${e.title} 缺少题型：${allTypes.filter(t=>!types.has(t)).join(',')}`);
  for(const q of e.quiz){if(ids.has(q.id))problems.push('重复 id：'+q.id);ids.add(q.id);const t=q.type??'single';
   if(t==='single'&&!(q.answer>=0&&q.answer<q.options.length))problems.push('单选答案越界：'+q.id);
   if(t==='multi'&&(q.answers.length<2||q.answers.some(a=>a<0||a>=q.options.length)))problems.push('多选答案无效：'+q.id);
   if(t==='fill'&&!q.accepted?.length)problems.push('填空缺少答案：'+q.id);
   if((t==='short'||t==='code')&&(!q.reference||!q.points?.length))problems.push('简答/代码缺少参考答案或要点：'+q.id);
   if(!q.explain)problems.push('缺少解析：'+q.id)}}});
if(problems.length){console.log(problems.join('\n'));process.exit(1)}
console.log('PASS');
