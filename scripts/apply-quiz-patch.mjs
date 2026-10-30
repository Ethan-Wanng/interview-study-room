// 按题目 id 修改题库源码里的选择题：替换 options、answer/answers、why、explain（只改补丁里给出的字段，其余原样保留）。
// 用 TypeScript 语法树定位对象字面量，避免用正则改源码。
// 用法：node scripts/apply-quiz-patch.mjs <题库 .ts 文件> <补丁 .json 文件>
// 补丁格式：[{ "id": "go-x-1", "options": [...], "answer": 2, "why": [...], "explain": "..." }, ...]
import {readFileSync,writeFileSync} from 'node:fs';
import ts from 'typescript';
const [file,patchFile]=process.argv.slice(2);
if(!file||!patchFile){console.error('用法：node scripts/apply-quiz-patch.mjs <file.ts> <patch.json>');process.exit(1)}
const src=readFileSync(file,'utf8'),patches=JSON.parse(readFileSync(patchFile,'utf8'));
const sf=ts.createSourceFile(file,src,ts.ScriptTarget.Latest,true,ts.ScriptKind.TS);
// 源码风格：单引号字符串，数组紧凑书写。
const lit=v=>Array.isArray(v)?'['+v.map(lit).join(',')+']':typeof v==='string'?"'"+v.replace(/\\/g,'\\\\').replace(/'/g,"\\'").replace(/\n/g,'\\n')+"'":String(v);
const byId=new Map();
(function walk(n){if(ts.isObjectLiteralExpression(n)){const p=n.properties.find(p=>ts.isPropertyAssignment(p)&&p.name.getText(sf)==='id');
  if(p&&ts.isStringLiteral(p.initializer))byId.set(p.initializer.text,n)}ts.forEachChild(n,walk)})(sf);
const edits=[],missing=[];
for(const patch of patches){const obj=byId.get(patch.id);if(!obj){missing.push(patch.id);continue}
 const prop=k=>obj.properties.find(p=>ts.isPropertyAssignment(p)&&p.name.getText(sf)===k);
 // 单选改多选或反过来时，answer 与 answers 互换。
 if(patch.answers&&prop('answer')){const p=prop('answer');edits.push([p.getStart(sf),p.getEnd(),'answers:'+lit(patch.answers)])}
 if(patch.answer!==undefined&&prop('answers')){const p=prop('answers');edits.push([p.getStart(sf),p.getEnd(),'answer:'+lit(patch.answer)])}
 for(const k of ['options','answer','answers','why','explain','q']){if(patch[k]===undefined)continue;const p=prop(k);
  if(k==='answer'&&!p&&prop('answers'))continue;if(k==='answers'&&!p&&prop('answer'))continue;
  if(p)edits.push([p.initializer.getStart(sf),p.initializer.getEnd(),lit(patch[k])]);
  else{const anchor=prop('options')??obj.properties[obj.properties.length-1];edits.push([anchor.getEnd(),anchor.getEnd(),','+k+':'+lit(patch[k])])}}}
// 一个补丁可以覆盖多个文件：本文件里没有的 id 跳过；一个都没找到才算出错。
if(missing.length===patches.length){console.error('这个文件里找不到补丁中的任何题目 id');process.exit(1)}
edits.sort((a,b)=>b[0]-a[0]);let out=src;for(const [s,e,t] of edits)out=out.slice(0,s)+t+out.slice(e);
writeFileSync(file,out);console.log(`${file}：已修改 ${patches.length-missing.length} 道题（${edits.length} 处）`);
