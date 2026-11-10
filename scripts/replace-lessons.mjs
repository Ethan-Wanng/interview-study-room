// 用 JSON 整体替换某一关的学习卡片 lessons（用语法树定位，不用正则改源码）。
// 用法：node scripts/replace-lessons.mjs <题库 .ts 文件> <关卡 id> <lessons.json> [更多 lessons.json…]
// 多个 JSON 文件按顺序拼接，每个文件是 AiLesson 数组：{title, body, code?, explain?, practice?}
import {readFileSync,writeFileSync} from 'node:fs';
import ts from 'typescript';
const [file,levelId,...parts]=process.argv.slice(2);
if(!file||!levelId||!parts.length){console.error('用法：node scripts/replace-lessons.mjs <file.ts> <levelId> <lessons.json>...');process.exit(1)}
const lessons=parts.flatMap(p=>JSON.parse(readFileSync(p,'utf8')));
const src=readFileSync(file,'utf8'),sf=ts.createSourceFile(file,src,99,true);
const str=v=>"'"+v.replace(/\\/g,'\\\\').replace(/'/g,"\\'").replace(/\n/g,'\\n')+"'";
// 键名不是合法标识符时（比如 template-go）要加引号。
const key=k=>/^[A-Za-z_$][\w$]*$/.test(k)?k:str(k);
const lit=v=>typeof v==='string'?str(v):Array.isArray(v)?'['+v.map(lit).join(',')+']':'{'+Object.entries(v).filter(([,x])=>x!==undefined).map(([k,x])=>key(k)+':'+lit(x)).join(',')+'}';
// 代码用模板字符串，保持源码里多行可读。
const tpl=v=>'`'+v.replace(/\\/g,'\\\\').replace(/`/g,'\\`').replace(/\$\{/g,'\\${')+'`';
const lesson=l=>'\n  {'+Object.entries(l).filter(([,x])=>x!==undefined).map(([k,x])=>k+':'+(k==='code'?tpl(x):lit(x))).join(',')+'}';
let target=null;
(function walk(n){if(ts.isObjectLiteralExpression(n)){const id=n.properties.find(p=>ts.isPropertyAssignment(p)&&p.name.getText(sf)==='id');
 if(id&&ts.isStringLiteral(id.initializer)&&id.initializer.text===levelId){const l=n.properties.find(p=>ts.isPropertyAssignment(p)&&p.name.getText(sf)==='lessons');if(l)target=l.initializer}}
 if(!target)ts.forEachChild(n,walk)})(sf);
if(!target){console.error('找不到关卡 '+levelId);process.exit(1)}
writeFileSync(file,src.slice(0,target.getStart(sf))+'['+lessons.map(lesson).join(',')+'\n ]'+src.slice(target.getEnd()));
console.log(`${file}：关卡 ${levelId} 换成 ${lessons.length} 张学习卡片`);
