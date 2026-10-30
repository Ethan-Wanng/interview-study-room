// 列出一个题库文件里的全部单选 / 多选题（id、题干、选项、答案、解析），供改写选项时参考。
// 用法：node scripts/dump-choice.mjs <题库 .ts 文件> [起始序号] [数量]
import {readFileSync} from 'node:fs';
import ts from 'typescript';
const [file,from='0',count='999']=process.argv.slice(2);
const src=readFileSync(file,'utf8'),sf=ts.createSourceFile(file,src,ts.ScriptTarget.Latest,true,ts.ScriptKind.TS);
const found=[];
(function walk(n){if(ts.isObjectLiteralExpression(n)){const get=k=>n.properties.find(p=>ts.isPropertyAssignment(p)&&p.name.getText(sf)===k)?.initializer;
  const id=get('id'),opts=get('options');
  if(id&&ts.isStringLiteral(id)&&opts&&ts.isArrayLiteralExpression(opts)){const val=e=>e?Function('return '+e.getText(sf))():undefined;
   found.push({id:id.text,q:val(get('q')),options:val(opts),answer:val(get('answer')),answers:val(get('answers')),explain:val(get('explain')),why:val(get('why'))})}}
 ts.forEachChild(n,walk)})(sf);
const list=found.slice(+from,+from+ +count);
console.log(`共 ${found.length} 道选择题，显示第 ${+from+1}～${+from+list.length} 道`);
for(const x of list){const right=x.answers??[x.answer];
 console.log(`\n# ${x.id}${x.answers?' [多选]':''}${x.why?' [已有why]':''}\nQ: ${x.q}`);
 x.options.forEach((o,i)=>console.log(`${right.includes(i)?'*':' '}${'ABCDEFGH'[i]}. ${o}`));
 console.log(`E: ${x.explain}`)}
