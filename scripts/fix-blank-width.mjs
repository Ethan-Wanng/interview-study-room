// 填空题的空按答案的词数显示：答案几个词就放几个“＿”（连在一起算一个空）。
// 单空题看 accepted 的第一个答案，多空题看 blanks 里每个空的第一个答案；英文按空格数词，中文和术语算一个词。
// 用法：node scripts/fix-blank-width.mjs [--check]   加 --check 只报告不修改。
import {readFileSync,writeFileSync,readdirSync,statSync} from 'node:fs';
import {join} from 'node:path';
import ts from 'typescript';

const files=[];(function walk(d){for(const f of readdirSync(d)){const p=join(d,f);if(statSync(p).isDirectory())walk(p);else if(p.endsWith('.ts'))files.push(p)}})('content');
const check=process.argv.includes('--check');
const words=s=>Math.max(1,s.trim().split(/\s+/).filter(Boolean).length);
let changed=0,skipped=0;
for(const f of files){let src=readFileSync(f,'utf8');if(!src.includes('＿'))continue;const sf=ts.createSourceFile(f,src,99,true),edits=[];
 (function walk(n){if(ts.isObjectLiteralExpression(n)){const prop=k=>n.properties.find(p=>ts.isPropertyAssignment(p)&&p.name.getText(sf)===k)?.initializer;const type=prop('type'),q=prop('q');
  if(type&&ts.isStringLiteral(type)&&type.text==='fill'&&q&&(ts.isStringLiteral(q)||ts.isNoSubstitutionTemplateLiteral(q))){
   const val=e=>Function('return '+e.getText(sf))();const id=prop('id')?val(prop('id')):'?';
   const answers=prop('blanks')?val(prop('blanks')).map(b=>b[0]):[val(prop('accepted'))[0]];
   const raw=q.getText(sf),runs=raw.match(/＿+/g)??[];
   if(runs.length!==answers.length){skipped++;console.log(`跳过 ${f} ${id}：题干里有 ${runs.length} 个空，答案有 ${answers.length} 组`);}
   else{let k=0;const next=raw.replace(/＿+/g,()=>'＿'.repeat(words(answers[k++])));if(next!==raw)edits.push([q.getStart(sf),q.getEnd(),next,id,raw,answers])}}}
  ts.forEachChild(n,walk)})(sf);
 for(const [s,e,next,id,raw] of edits.sort((a,b)=>b[0]-a[0])){changed++;if(check)console.log(`${f} ${id}：${raw} → ${next}`);else src=src.slice(0,s)+next+src.slice(e)}
 if(!check&&edits.length)writeFileSync(f,src)}
console.log(`\n${check?'需要修改':'已修改'} ${changed} 道，跳过 ${skipped} 道`);
