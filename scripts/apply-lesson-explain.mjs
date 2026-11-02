// 按卡片标题给学习卡片写入（或替换）代码讲解 explain，用语法树定位，不用正则改源码。
// 用法：node scripts/apply-lesson-explain.mjs <题库 .ts 文件> <讲解 .json 文件>
// 讲解文件格式：{ "卡片标题": [ {"at":"代码原文", "to":"可选，最后一行原文", "text":"讲解"}, ... ], ... }
import {readFileSync,writeFileSync} from 'node:fs';
import ts from 'typescript';
const [file,patchFile]=process.argv.slice(2);
if(!file||!patchFile){console.error('用法：node scripts/apply-lesson-explain.mjs <file.ts> <explain.json>');process.exit(1)}
const src=readFileSync(file,'utf8'),patch=JSON.parse(readFileSync(patchFile,'utf8')),sf=ts.createSourceFile(file,src,99,true);
const lit=v=>typeof v==='string'?"'"+v.replace(/\\/g,'\\\\').replace(/'/g,"\\'").replace(/\n/g,'\\n')+"'":Array.isArray(v)?'['+v.map(lit).join(',')+']':'{'+Object.entries(v).filter(([,x])=>x!==undefined).map(([k,x])=>k+':'+lit(x)).join(',')+'}';
const edits=[],done=new Set();
(function walk(n){if(ts.isObjectLiteralExpression(n)){const prop=k=>n.properties.find(p=>ts.isPropertyAssignment(p)&&p.name.getText(sf)===k);
 const t=prop('title'),code=prop('code');
 if(t&&prop('body')&&code&&!prop('q')&&!prop('id')){const title=Function('return '+t.initializer.getText(sf))();
  if(patch[title]){const text=lit(patch[title].map(({at,to,text})=>({at,to,text}))),old=prop('explain');
   if(old)edits.push([old.initializer.getStart(sf),old.initializer.getEnd(),text]);else edits.push([code.getEnd(),code.getEnd(),',explain:'+text]);done.add(title)}}}
 ts.forEachChild(n,walk)})(sf);
edits.sort((a,b)=>b[0]-a[0]);let out=src;for(const [s,e,t] of edits)out=out.slice(0,s)+t+out.slice(e);
writeFileSync(file,out);
const miss=Object.keys(patch).filter(k=>!done.has(k));
console.log(`${file}：写入 ${done.size} 张卡片的讲解`+(miss.length?`；找不到标题：${miss.join('、')}`:''));
