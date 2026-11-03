// 检查英语词库：每行三段（英文|词性|中文），列出重复的词（会在加载时被跳过），统计各本词书的词数。
// 用法：node scripts/check-english-words.mjs
import {readFileSync} from 'node:fs';
const books=['a1','a2','b1','ielts'],seen=new Map(),problems=[];let total=0;
for(const b of books){const raw=readFileSync(`content/english-words/${b}.ts`,'utf8').split('`')[1]??'';let n=0;
 raw.split('\n').map(l=>l.trim()).filter(Boolean).forEach((l,i)=>{const parts=l.split('|');
  if(parts.length!==3||parts.some(p=>!p.trim()))return problems.push(`${b} 第 ${i+1} 行格式不对：${l}`);
  const k=parts[0].trim().toLowerCase();if(seen.has(k))return problems.push(`重复：${parts[0]}（${seen.get(k)} 和 ${b}，以前者为准）`);
  if(!/^(n|v|adj|adv|prep|conj|pron|num|art|int|phr)\.$/.test(parts[1].trim()))problems.push(`${b} 词性写法不对：${l}`);
  seen.set(k,b);n++});
 total+=n;console.log(`${b}：${n} 词`)}
console.log(`共 ${total} 词`);problems.forEach(p=>console.log(p));
