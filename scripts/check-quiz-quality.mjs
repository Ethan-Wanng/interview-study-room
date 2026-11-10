// 检查选择题的质量和试卷结构。
// 选择题：选项长短不能一眼看出答案（不要「三短一长」「三长一短」），选项不用绝对化措辞，错误选项都有 why 解释；
// 多选题的答案个数要有 2、3、4 个的混合。试卷：题型数量、15 个空、每题分值和总分 150。
// 用法：node scripts/check-quiz-quality.mjs [--subject go|ai|backend|frontend|english|project|rust] [--only <关卡或考试 id>] [--papers] [--strict] [--quiet]
//   --papers 只查试卷；--strict 有问题时退出码为 1；--quiet 只打印汇总。
import {createRequire} from 'node:module';
import {writeFileSync,mkdtempSync,existsSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';
const require=createRequire(import.meta.url),{build}=createRequire(require.resolve('wrangler/package.json'))('esbuild');
const arg=k=>{const i=process.argv.indexOf(k);return i<0?undefined:process.argv[i+1]},flag=k=>process.argv.includes(k);
const subjects=[['go','./content/exams/go','goExams','./content/go-journey','goLevels'],['ai','./content/exams/ai','aiExams','./content/ai-journey','aiLevels'],['backend','./content/exams/backend','backendExams','./content/backend-journey','backendLevels'],['frontend','./content/exams/frontend','frontendExams','./content/frontend-journey','frontendLevels'],['english','./content/exams/english','englishExams','./content/english-journey','englishLevels'],['project',null,null,'./content/project-journey','projectLevels'],['rust','./content/exams/rust','rustExams','./content/rust-journey','rustLevels']]
 .filter(([id,e])=>(!arg('--subject')||arg('--subject')===id)&&(!e||existsSync(e.replace('./','')+'.ts')));
const entry=subjects.map(([,e,x,l,y],i)=>(e?`export {${x} as e${i}} from '${e}';`:`export const e${i}=[];`)+`export {${y} as l${i}} from '${l}';`).join('')+`export {paperLoaders} from './content/papers/index';export {paperSections,questionMax,FILL_BLANKS,PAPER_TOTAL} from './content/papers/types';`;
const out=await build({stdin:{contents:entry,resolveDir:process.cwd(),loader:'ts'},bundle:true,write:false,format:'esm',platform:'node',logLevel:'error'});
const file=join(mkdtempSync(join(tmpdir(),'quality-')),'bundle.mjs');writeFileSync(file,out.outputFiles[0].text);
const m=await import(pathToFileURL(file).href);

// 视觉长度：汉字和全角符号算 1，英文、数字和半角符号算 0.55。
const width=s=>[...s].reduce((n,c)=>n+(/[⺀-￿]/.test(c)?1:0.55),0);
const ABSOLUTE=/一定|总是|永远|绝对|从不|从来不|只能|必然|任何情况|毫无|完全不|全都/;
const problems=[],counts={};
const report=(where,q,issue)=>{problems.push(`${where} ${q.id}：${issue}`);counts[issue.split('：')[0]]=(counts[issue.split('：')[0]]??0)+1};
function checkChoice(where,q){const t=q.type??'single';if(t!=='single'&&t!=='multi')return;
 const w=q.options.map(width),right=t==='multi'?q.answers:[q.answer],sorted=[...w].sort((a,b)=>b-a);
 if(sorted.length>=3){
  if(sorted[0]>=1.5*sorted[1]&&sorted[0]-sorted[1]>=4)report(where,q,'一长多短：最长选项明显比其他选项长');
  const asc=[...w].sort((a,b)=>a-b);if(asc[0]<=0.6*asc[1]&&asc[1]-asc[0]>=4)report(where,q,'一短多长：最短选项明显比其他选项短');}
 if(t==='single'){const others=w.filter((_,i)=>i!==q.answer);if(w[q.answer]>Math.max(...others)*1.2&&w[q.answer]-Math.max(...others)>=3)report(where,q,'答案最长：正确选项明显是最长的一个')}
 else{const wrongW=w.filter((_,i)=>!right.includes(i));if(wrongW.length&&Math.min(...right.map(i=>w[i]))>Math.max(...wrongW)*1.15)report(where,q,'答案都更长：正确选项都比错误选项长')}
 q.options.forEach((o,i)=>{if(ABSOLUTE.test(o))report(where,q,`绝对化措辞：${String.fromCharCode(65+i)} 项「${o.match(ABSOLUTE)[0]}」`)});
 if(!q.why)report(where,q,'缺少 why：错误选项没有解释');
 else if(q.why.length!==q.options.length)report(where,q,'why 数量不对：要和选项一一对应');
 else q.options.forEach((_,i)=>{if(!right.includes(i)&&!q.why[i]?.trim())report(where,q,`缺少 why：${String.fromCharCode(65+i)} 项没有解释`);if(right.includes(i)&&q.why[i]?.trim())report(where,q,`why 放错：${String.fromCharCode(65+i)} 是正确选项却有解释`)})}

const only=arg('--only'),multiCounts={};
if(!flag('--papers'))subjects.forEach(([id],i)=>{const exams=m['e'+i],levels=m['l'+i],dist=multiCounts[id]={};
 const banks=[...levels.map(l=>[l.id,l.quiz]),...exams.filter(e=>e.kind==='training'||e.kind==='final').map(e=>[e.id,e.quiz])];
 for(const [bank,quiz] of banks){if(only&&bank!==only)continue;
  for(const q of quiz){checkChoice(`${id}/${bank}`,q);if(q.type==='multi')dist[q.answers.length]=(dist[q.answers.length]??0)+1}}});

// 试卷结构。
for(const [examId,load] of Object.entries(m.paperLoaders)){if(only&&examId!==only)continue;if(arg('--subject')&&!examId.startsWith(arg('--subject')==='backend'?'be-':arg('--subject')==='frontend'?'fe-':arg('--subject')+'-'))continue;
 const p=await load(),where=`paper/${examId}`;let total=0,blanks=0,cursor=0;const ids=new Set();
 for(const s of m.paperSections){const qs=p.questions.filter(q=>(q.type??'single')===s.type);
  if(qs.length!==s.count)problems.push(`${where}：${s.title} 应为 ${s.count} 题，实际 ${qs.length} 题`);
  qs.forEach((q,i)=>{const max=m.questionMax(q,i);total+=max;if(ids.has(q.id))problems.push(`${where}：重复 id ${q.id}`);ids.add(q.id);
   if(p.questions.indexOf(q)!==cursor)problems.push(`${where} ${q.id}：题目要按题型顺序排列（${s.title}）`);cursor++;
   if(!q.explain)problems.push(`${where} ${q.id}：缺少解析`);
   checkChoice(where,q);
   if(s.type==='fill'){const n=q.blanks?.length??1;blanks+=n;const marks=(q.q.match(/＿+/g)??[]).length;if(q.blanks&&marks!==n)problems.push(`${where} ${q.id}：题干里有 ${marks} 个「＿＿」，blanks 有 ${n} 个`);if(q.blanks?.some(b=>!b.length))problems.push(`${where} ${q.id}：有空没有可接受答案`)}
   if(['short','code','design'].includes(s.type)){const sum=(q.scores??[]).reduce((a,b)=>a+b,0);if(!q.scores||q.scores.length!==q.points.length)problems.push(`${where} ${q.id}：scores 要和得分点一一对应`);else if(sum!==max)problems.push(`${where} ${q.id}：得分点合计 ${sum} 分，应为 ${max} 分`)}})}
 if(blanks!==m.FILL_BLANKS)problems.push(`${where}：填空题共 ${blanks} 个空，应为 ${m.FILL_BLANKS} 个`);
 if(total!==m.PAPER_TOTAL)problems.push(`${where}：总分 ${total}，应为 ${m.PAPER_TOTAL}`);
 if(p.questions.length!==m.paperSections.reduce((n,s)=>n+s.count,0))problems.push(`${where}：共 ${p.questions.length} 题，应为 44 题`);
 console.log(`${where}：${p.questions.length} 题，${total} 分，${blanks} 空`)}

if(!flag('--quiet'))for(const p of problems)console.log(p);
for(const [id,d] of Object.entries(multiCounts))console.log(`${id} 多选答案个数分布：${Object.entries(d).map(([k,v])=>`${k} 个 ×${v}`).join('，')||'无'}`);
console.log('问题汇总：'+(Object.entries(counts).map(([k,v])=>`${k} ${v}`).join('，')||'无')+`；共 ${problems.length} 条`);
if(flag('--strict')&&problems.length)process.exit(1);
