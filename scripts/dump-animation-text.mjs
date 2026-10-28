// 导出所有动画里的文字（字幕、角色名、小字、气泡、底注、口诀），用于校对。
// 用法：node scripts/dump-animation-text.mjs > animation-text.txt
import {createRequire} from 'node:module';
import {writeFileSync,mkdtempSync,readFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';
const require=createRequire(import.meta.url),{build}=createRequire(require.resolve('wrangler/package.json'))('esbuild');
const entry=`export {stories} from './app/ai/animations/stories/index';export {goStories} from './app/ai/animations/stories/go';export {backendStories} from './app/ai/animations/stories/backend';export {dbStories} from './app/ai/animations/stories/db';export {goLessonStories} from './app/ai/animations/go-lessons';export {backendLessonStories} from './app/ai/animations/be-lessons';export {animations} from './app/ai/animations/index';export {subjectReviews} from './app/ai/animations/review';export {aiLevels,aiTiers} from './content/ai-journey';export {goLevels as goLv,goTiers} from './content/go-journey';export {backendLevels as beLv,backendTiers} from './content/backend-journey';export {interviewByLevel as aiLinks} from './content/ai-links';export {goInterviewByLevel} from './content/go-links';export {backendInterviewByLevel} from './content/backend-links';export {aiExams} from './content/exams/ai';export {goExams} from './content/exams/go';export {backendExams} from './content/exams/backend';export {aiInterviewQuestions as aiIQ} from './content/ai-interview';export {frontendLevels as feLv,frontendTiers} from './content/frontend-journey';export {frontendExams} from './content/exams/frontend';export {frontendInterviewByLevel} from './content/frontend-links';export {frontendInterviewQuestions as feIQ} from './content/frontend-interview/index';`;
const out=await build({stdin:{contents:entry,resolveDir:process.cwd(),loader:'ts'},bundle:true,write:false,format:'esm',platform:'node',jsx:'automatic',tsconfig:'tsconfig.json',logLevel:'error'});
const file=join(mkdtempSync(join(tmpdir(),'text-')),'bundle.mjs');writeFileSync(file,out.outputFiles[0].text);
const m=await import(pathToFileURL(file).href);

// 自动生成的阶段复习、考前复习动画（页面运行时生成，这里用同样的函数生成一遍）。
const bankTitles=new Map(JSON.parse(readFileSync('content/questions.json','utf8')).questions.map(q=>[q.id,q.title])),aiTitles=new Map(m.aiIQ.map(q=>[q.id,q.title])),feTitles=new Map(m.feIQ.map(q=>[q.id,q.title]));
const reviewStories=Object.fromEntries([['ai',m.aiLevels,m.aiTiers,m.aiExams,m.aiLinks,aiTitles],['go',m.goLv,m.goTiers,m.goExams,m.goInterviewByLevel,bankTitles],['backend',m.beLv,m.backendTiers,m.backendExams,m.backendInterviewByLevel,bankTitles],['frontend',m.feLv,m.frontendTiers,m.frontendExams,m.frontendInterviewByLevel,feTitles]]
 .flatMap(([id,levels,tiers,exams,interviewByLevel,titles])=>[...m.subjectReviews({id,levels,tiers,exams,interviewByLevel,titleOf:q=>titles.get(q)}).values()].map(s=>[s.id,s])));
const stories={...reviewStories,...m.stories,...m.goStories,...m.dbStories,...m.backendStories,...Object.fromEntries([...m.goLessonStories,...m.backendLessonStories].map(s=>[s.id,s]))};
for(const [id,s] of Object.entries(stories)){console.log(`## ${id} ${s.title}`);if(s.summary)console.log('summary: '+s.summary);
 s.beats.forEach((b,i)=>{const parts=[`#${i} ${b.say}`];for(const a of b.add??[])parts.push(`  [${a.id}] ${a.label}${a.sub?' / '+a.sub:''}`);for(const [k,v] of Object.entries(b.sub??{}))parts.push(`  sub ${k}: ${v}`);for(const x of b.send??[])if(x.text)parts.push(`  send: ${x.text}`);if(b.bubble)parts.push(`  bubble: ${b.bubble.text.replace(/\n/g,'⏎')}`);if(b.note)parts.push(`  note: ${b.note}`);if(b.memo)parts.push(`  memo: ${b.memo.join(' | ')}`);console.log(parts.join('\n'))})}
for(const a of m.animations??[]){console.log(`## ${a.id} ${a.title}\nsummary: ${a.summary}`);a.scenes.forEach((s,i)=>console.log(`#${i} ${s.caption}`))}
