// 用 Gemini TTS 把动画旁白预先生成为 MP3（各平台听到的是同一个声音），写到 public/tts/。
// 文件名是 sha256(声音+换行+台词) 的前 16 位，public/tts/index.json 记每个文件的时长（毫秒）。
// 已生成的跳过，可以随时中断、再次运行接着做；台词改了只会生成改动的那几句。
// 用法：
//   node scripts/gen-tts.mjs                         生成全部旁白（默认声音见 app/ai/animations/sound.ts 的 TTS_VOICE）
//   node scripts/gen-tts.mjs --only go-lazy-1        只生成某几个动画（逗号分隔的动画 id）
//   node scripts/gen-tts.mjs --voices Leda,Aoede     用这几个声音各生成一份（试听选声音）
//   node scripts/gen-tts.mjs --list                  只统计句数、字数，不调用接口
//   --concurrency 4  同时请求数；--prune  删除不再用到的录音
// 密钥从仓库外的 ../1.txt 读取，不打印、不写进仓库。
import {createRequire} from 'node:module';
import {createHash} from 'node:crypto';
import {writeFileSync,mkdtempSync,readFileSync,existsSync,mkdirSync,renameSync,readdirSync,unlinkSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {Mp3Encoder} from '@breezystack/lamejs';
import {fetch as proxyFetch,EnvHttpProxyAgent} from 'undici';

const args=process.argv.slice(2),flag=k=>args.includes(k),opt=k=>{const i=args.indexOf(k);return i>=0?args[i+1]:undefined};
const MODEL='gemini-3.8-flash-tts',RATE=24000,KBPS=32,OUT='public/tts';
// 风格提示（温柔、亲切、自然，语速适中）用简短的英文指令：中文长指令会被当成正文读出来，试听时每句多出十来秒。
const STYLE='Read aloud in Mandarin Chinese, in a warm, gentle, friendly and natural voice, at a moderate pace:\n';

// ---- 1. 收集播放器会朗读的每一句（speech ?? caption），和播放器用同一套函数生成动画 ----
const require=createRequire(import.meta.url),{build}=createRequire(require.resolve('wrangler/package.json'))('esbuild');
const entry=`export {TTS_VOICE,spoken} from './app/ai/animations/sound';
export {fromStory,storyAnimation} from './app/ai/animations/story';
export {lazyAnimation} from './app/ai/animations/lazy/engine';
export {goLazy} from './app/ai/animations/lazy/go';export {aiLazy} from './app/ai/animations/lazy/ai';export {backendLazy} from './app/ai/animations/lazy/backend';export {frontendLazy} from './app/ai/animations/lazy/frontend';
export {stories} from './app/ai/animations/stories/index';export {goStories} from './app/ai/animations/stories/go';export {backendStories} from './app/ai/animations/stories/backend';export {dbStories} from './app/ai/animations/stories/db';export {frontendStories} from './app/ai/animations/stories/frontend';
export {goAnimations} from './app/ai/animations/go-lessons';export {backendAnimations} from './app/ai/animations/be-lessons';export {frontendAnimations} from './app/ai/animations/fe-lessons';
export {animations} from './app/ai/animations/index';export {subjectReviews} from './app/ai/animations/review';
export {aiLevels,aiTiers} from './content/ai-journey';export {goLevels as goLv,goTiers} from './content/go-journey';export {backendLevels as beLv,backendTiers} from './content/backend-journey';export {frontendLevels as feLv,frontendTiers} from './content/frontend-journey';
export {interviewByLevel as aiLinks} from './content/ai-links';export {goInterviewByLevel} from './content/go-links';export {backendInterviewByLevel} from './content/backend-links';export {frontendInterviewByLevel} from './content/frontend-links';
export {aiExams} from './content/exams/ai';export {goExams} from './content/exams/go';export {backendExams} from './content/exams/backend';export {frontendExams} from './content/exams/frontend';
export {aiInterviewQuestions as aiIQ} from './content/ai-interview';export {frontendInterviewQuestions as feIQ} from './content/frontend-interview/index';`;
const out=await build({stdin:{contents:entry,resolveDir:process.cwd(),loader:'ts'},bundle:true,write:false,format:'esm',platform:'node',jsx:'automatic',tsconfig:'tsconfig.json',logLevel:'error'});
const file=join(mkdtempSync(join(tmpdir(),'tts-')),'bundle.mjs');writeFileSync(file,out.outputFiles[0].text);
const m=await import(pathToFileURL(file).href);

const bankTitles=new Map(JSON.parse(readFileSync('content/questions.json','utf8')).questions.map(q=>[q.id,q.title])),aiTitles=new Map(m.aiIQ.map(q=>[q.id,q.title])),feTitles=new Map(m.feIQ.map(q=>[q.id,q.title]));
const reviews=[['ai',m.aiLevels,m.aiTiers,m.aiExams,m.aiLinks,aiTitles],['go',m.goLv,m.goTiers,m.goExams,m.goInterviewByLevel,bankTitles],['backend',m.beLv,m.backendTiers,m.backendExams,m.backendInterviewByLevel,bankTitles],['frontend',m.feLv,m.frontendTiers,m.frontendExams,m.frontendInterviewByLevel,feTitles]]
 .flatMap(([id,levels,tiers,exams,interviewByLevel,titles])=>[...m.subjectReviews({id,levels,tiers,exams,interviewByLevel,titleOf:q=>titles.get(q)}).values()].map(m.storyAnimation));
const interviews=[[m.stories,'ai'],[m.goStories,'go'],[m.backendStories,'backend'],[m.dbStories,'db'],[m.frontendStories,'frontend']].flatMap(([group,level])=>Object.entries(group).map(([id,s])=>m.fromStory(id,level,s)));
const lazy=[...m.goLazy,...m.aiLazy,...m.backendLazy,...m.frontendLazy].map(m.lazyAnimation);
const all=[...m.animations,...m.goAnimations,...m.backendAnimations,...m.frontendAnimations,...reviews,...interviews,...lazy];
const only=opt('--only')?.split(',').filter(Boolean),picked=only?all.filter(a=>only.includes(a.id)):all;
if(only&&picked.length<only.length)console.warn('找不到的动画：'+only.filter(id=>!picked.some(a=>a.id===id)).join(', '));
const lines=[...new Set(picked.flatMap(a=>a.scenes.map(s=>s.speech??s.caption)))];
const voices=(opt('--voices')??m.TTS_VOICE).split(',').filter(Boolean);
const chars=lines.reduce((n,t)=>n+[...t].length,0);
console.log(`${picked.length} 个动画，${lines.length} 句不重复的台词，${chars} 字；声音：${voices.join(', ')}`);
if(flag('--list'))process.exit(0);

// ---- 2. 逐句调用 Gemini TTS，转成 MP3 ----
const key=readFileSync(resolve('..','1.txt'),'utf8').trim();
if(!key)throw new Error('../1.txt 里没有密钥');
const dispatcher=new EnvHttpProxyAgent(); // 走 HTTPS_PROXY（本机代理），NO_PROXY 里的地址直连
const hashOf=(voice,text)=>createHash('sha256').update(voice+'\n'+text).digest('hex').slice(0,16);
mkdirSync(OUT,{recursive:true});
const indexFile=join(OUT,'index.json'),index=existsSync(indexFile)?JSON.parse(readFileSync(indexFile,'utf8')):{};
const saveIndex=()=>{const tmp=indexFile+'.tmp';writeFileSync(tmp,JSON.stringify(Object.fromEntries(Object.entries(index).sort(([a],[b])=>a<b?-1:1))));renameSync(tmp,indexFile)};
const sleep=ms=>new Promise(r=>setTimeout(r,ms));

async function tts(text,voice){const body={contents:[{parts:[{text:STYLE+m.spoken(text)}]}],generationConfig:{responseModalities:['AUDIO'],speechConfig:{voiceConfig:{prebuiltVoiceConfig:{voiceName:voice}}}}};
 for(let attempt=0;;attempt++){let res,err;
  try{res=await proxyFetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`,{method:'POST',dispatcher,headers:{'content-type':'application/json','x-goog-api-key':key},body:JSON.stringify(body),signal:AbortSignal.timeout(120000)})}catch(e){err=e.cause?.code??e.name}
  if(res?.ok){const j=await res.json(),part=j.candidates?.[0]?.content?.parts?.find(p=>p.inlineData);
   if(part){const rate=Number(/rate=(\d+)/.exec(part.inlineData.mimeType)?.[1]??RATE);return {pcm:Buffer.from(part.inlineData.data,'base64'),rate,usage:j.usageMetadata??{}}}
   err='响应里没有音频（'+(j.candidates?.[0]?.finishReason??'无候选')+'）'}
  else if(res){const t=await res.text();err=`HTTP ${res.status} ${t.slice(0,200).replace(/\s+/g,' ')}`;
   if(/PerDay/.test(t))throw Object.assign(new Error('今天的请求次数用完了（免费层每个模型每天只有 10 次 TTS 请求，需要给这个密钥的项目开通付费）'),{fatal:true});
   if(res.status>=400&&res.status<500&&res.status!==429&&res.status!==408)throw new Error(err)}
  if(attempt>=6)throw new Error(err);
  const wait=Math.min(60000,2000*2**attempt)+Math.random()*1000;console.warn(`  重试（${err}），${Math.round(wait/1000)} 秒后`);await sleep(wait)}}

// 去掉开头结尾的静音（留一点余量），句与句之间的停顿由播放器控制。
function trim(s,rate){const th=400;let a=0,b=s.length;while(a<b&&Math.abs(s[a])<th)a++;while(b>a&&Math.abs(s[b-1])<th)b--;
 return s.subarray(Math.max(0,a-Math.round(rate*0.06)),Math.min(s.length,b+Math.round(rate*0.12)))}
function mp3(samples,rate){const enc=new Mp3Encoder(1,rate,KBPS),parts=[];for(let i=0;i<samples.length;i+=1152)parts.push(enc.encodeBuffer(samples.subarray(i,i+1152)));parts.push(enc.flush());return Buffer.concat(parts.map(p=>Buffer.from(p)))}

const jobs=voices.flatMap(voice=>lines.map(text=>({voice,text,hash:hashOf(voice,text)}))),todo=jobs.filter(j=>!(index[j.hash]&&existsSync(join(OUT,j.hash+'.mp3'))));
console.log(`需要生成 ${todo.length} 句（已有 ${jobs.length-todo.length} 句）`);
const conc=Number(opt('--concurrency')??3),started=Date.now(),stat={n:0,chars:0,audioMs:0,callMs:0,inTok:0,outTok:0,fail:0},samples=new Map();
let next=0,unsaved=0,fatal='';
async function worker(){while(next<todo.length){const j=todo[next++],t0=Date.now();
 try{const {pcm,rate,usage}=await tts(j.text,j.voice),raw=new Int16Array(pcm.buffer,pcm.byteOffset,pcm.length>>1),s=trim(raw,rate),ms=Math.round(s.length/rate*1000);
  const f=join(OUT,j.hash+'.mp3');writeFileSync(f+'.tmp',mp3(s,rate));renameSync(f+'.tmp',f);index[j.hash]=ms;
  if(opt('--voices'))samples.set(j.hash,{s,rate});
  stat.n++;stat.chars+=[...j.text].length;stat.audioMs+=ms;stat.callMs+=Date.now()-t0;stat.inTok+=usage.promptTokenCount??0;stat.outTok+=usage.candidatesTokenCount??0;
  if([...j.text].length>=15&&ms/[...j.text].length>330)console.warn(`  注意：${j.hash} 每字 ${Math.round(ms/[...j.text].length)} 毫秒，偏慢，可能把风格提示也读出来了`);
  if(++unsaved>=10){saveIndex();unsaved=0}
  console.log(`[${stat.n+stat.fail}/${todo.length}] ${j.voice} ${j.hash} ${(ms/1000).toFixed(1)}s 用时 ${((Date.now()-t0)/1000).toFixed(1)}s  ${j.text.slice(0,24)}`)}
 catch(e){if(e.fatal){next=todo.length;fatal=e.message}stat.fail++;console.error(`失败 ${j.voice} ${j.hash}：${e.message}  ${j.text.slice(0,24)}`)}}}
process.on('SIGINT',()=>{saveIndex();console.log('\n已保存进度，下次运行会接着生成。');process.exit(130)});
await Promise.all(Array.from({length:Math.min(conc,todo.length)},worker));saveIndex();

// 试听：每个声音把这批台词连成一个 MP3（句间停 0.3 秒），放在 outputs/tts-samples/（不进仓库）。
if(opt('--voices')){mkdirSync('outputs/tts-samples',{recursive:true});
 for(const voice of voices){const parts=lines.map(t=>samples.get(hashOf(voice,t))).filter(Boolean);if(!parts.length)continue;const rate=parts[0].rate,gap=new Int16Array(Math.round(rate*0.3));
  const all=new Int16Array(parts.reduce((n,p)=>n+p.s.length+gap.length,0));let o=0;for(const p of parts){all.set(p.s,o);o+=p.s.length+gap.length}
  writeFileSync(`outputs/tts-samples/${voice}.mp3`,mp3(all,rate));console.log(`试听：outputs/tts-samples/${voice}.mp3`)}}

if(flag('--prune')&&!only){const keep=new Set(jobs.map(j=>j.hash));let n=0;for(const f of readdirSync(OUT))if(f.endsWith('.mp3')&&!keep.has(f.slice(0,-4))){unlinkSync(join(OUT,f));delete index[f.slice(0,-4)];n++}saveIndex();console.log(`删除了 ${n} 个不再用到的录音`)}

const wall=(Date.now()-started)/1000;
if(stat.n)console.log(`\n完成 ${stat.n} 句，失败 ${stat.fail} 句；共 ${stat.chars} 字、音频 ${(stat.audioMs/1000).toFixed(1)} 秒（${(stat.audioMs/stat.chars).toFixed(0)} 毫秒/字）
平均每句请求 ${(stat.callMs/stat.n/1000).toFixed(1)} 秒，实际耗时 ${wall.toFixed(0)} 秒（并发 ${conc}）；token：输入 ${stat.inTok}，输出 ${stat.outTok}`);
if(fatal)console.error('\n停止：'+fatal+'。已生成的已保存，之后再运行会接着做。');
if(stat.fail)process.exitCode=1;
