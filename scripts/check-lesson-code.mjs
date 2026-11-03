// 检查学习卡片里的代码讲解：有代码的卡片必须有 explain；每条讲解引用的原文（at / to）都要能在代码里按顺序找到；
// 还会列出没有被任何一条讲解覆盖的代码行（空行和纯注释行除外），方便补全。
// 用法：node scripts/check-lesson-code.mjs [--dump 文件名片段]   --dump 打印该文件所有带代码卡片的标题、正文、代码和现有讲解
import {readFileSync,readdirSync,statSync} from 'node:fs';
import {join} from 'node:path';
import ts from 'typescript';

const files=[];(function walk(d){for(const f of readdirSync(d)){const p=join(d,f);if(statSync(p).isDirectory())walk(p);else if(p.endsWith('.ts'))files.push(p)}})('content');
const dump=process.argv.includes('--dump')?process.argv[process.argv.indexOf('--dump')+1]:null;
const val=(sf,e)=>Function('return '+e.getText(sf))();
// 与页面 app/ai/code-explain.tsx 相同的定位规则。
const range=(lines,n,from=0)=>{const a=lines.findIndex((l,i)=>i>=from&&l.includes(n.at));if(a<0)return null;if(!n.to)return [a,a];const b=lines.findIndex((l,i)=>i>=a&&l.includes(n.to));return b<0?null:[a,b]};
const comment=l=>/^\s*(\/\/|--|#|\/\*|\*|<!--)/.test(l)||!l.trim()||/^\s*[{}()[\];,]+\s*$/.test(l);
let cards=0,missing=0,bad=0,uncovered=0;
for(const f of files){const src=readFileSync(f,'utf8');if(!src.includes('code:'))continue;const sf=ts.createSourceFile(f,src,99,true);
 (function walk(n){if(ts.isObjectLiteralExpression(n)){const prop=k=>n.properties.find(p=>ts.isPropertyAssignment(p)&&p.name.getText(sf)===k)?.initializer;
  // 也检查按技术栈区分的卡片版本（variants 里的每个版本）和参考答案（solution）里的代码，标题用所在卡片的标题加上版本名。
  const owner=()=>{let p=n.parent,path=[];while(p){if(ts.isPropertyAssignment(p))path.unshift(p.name.getText(sf));if(ts.isObjectLiteralExpression(p)){const t=p.properties.find(x=>ts.isPropertyAssignment(x)&&x.name.getText(sf)==='title'&&!ts.isObjectLiteralExpression(x.initializer));if(t)return val(sf,t.initializer)+' · '+path.join('.')}p=p.parent}return path.join('.')};
  const nested=!prop('title')&&prop('code')&&(ts.isPropertyAssignment(n.parent)&&['solution'].includes(n.parent.name.getText(sf))||ts.isPropertyAssignment(n.parent)&&ts.isObjectLiteralExpression(n.parent.parent)&&ts.isPropertyAssignment(n.parent.parent.parent)&&n.parent.parent.parent.name.getText(sf)==='variants');
  if((prop('title')&&prop('body')||nested)&&prop('code')&&!prop('q')&&!prop('id')){cards++;const title=nested?owner():val(sf,prop('title')),code=val(sf,prop('code')),lines=code.split('\n'),notes=prop('explain')?val(sf,prop('explain')):null;
   const where=`${f.replace(/\\/g,'/')} 「${title}」`;
   if(dump&&f.replace(/\\/g,'/').includes(dump)){console.log(`\n### ${title}\n${val(sf,prop('body'))}\n---\n${lines.map((l,i)=>String(i+1).padStart(2)+'| '+l).join('\n')}`);if(notes)for(const x of notes)console.log(`  * [${x.at}${x.to?' … '+x.to:''}] ${x.text}`)}
   if(!notes?.length){missing++;if(!dump)console.log(`缺少讲解：${where}`)}
   else{const covered=new Set();let cur=0;
    for(const x of notes){const r=range(lines,x,cur)??range(lines,x);if(!r){bad++;console.log(`找不到原文：${where} → ${JSON.stringify(x.to?[x.at,x.to]:x.at)}`);continue}cur=r[0];for(let i=r[0];i<=r[1];i++)covered.add(i)}
    const left=lines.map((l,i)=>[l,i]).filter(([l,i])=>!covered.has(i)&&!comment(l));
    if(left.length){uncovered+=left.length;if(!dump)console.log(`未讲到的行：${where} → ${left.map(([l,i])=>`${i+1}:${l.trim().slice(0,30)}`).join('  ')}`)}}}}
  ts.forEachChild(n,walk)})(sf)}
console.log(`\n带代码的卡片 ${cards} 张；缺少讲解 ${missing}，原文找不到 ${bad}，未讲到的代码行 ${uncovered}`);
if(missing||bad)process.exitCode=1;
