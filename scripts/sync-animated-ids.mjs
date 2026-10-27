// 把 app/ai/animations/stories/ 下后端通用动画（ms-*、alg-*、os-*、proj-*、be-* 文件）的题目 id 同步到 go-animated.ts 的 beAnimated。
// 用法：node scripts/sync-animated-ids.mjs
import {readFileSync,readdirSync,writeFileSync} from 'node:fs';
const dir='app/ai/animations/stories',ids=[];
for(const f of readdirSync(dir).filter(f=>/^(ms|alg|os|proj|be)-.*\.ts$/.test(f)).sort())for(const m of readFileSync(`${dir}/${f}`,'utf8').matchAll(/^ '(q-[0-9a-f]{16})':\{title:/gm))ids.push(m[1]);
const file='app/ai/animations/go-animated.ts',s=readFileSync(file,'utf8'),a=s.indexOf(' // @generated-be-start'),b=s.indexOf(' // @generated-be-end');
const rows=[];for(let i=0;i<ids.length;i+=7)rows.push(' '+ids.slice(i,i+7).map(x=>`'${x}'`).join(',')+',');
writeFileSync(file,s.slice(0,a)+' // @generated-be-start\n'+rows.join('\n')+(rows.length?'\n':'')+s.slice(b));
console.log('beAnimated:',ids.length);
