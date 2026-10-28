// 把 app/ai/animations/stories/ 下 Go 其余章节（gx-*）和后端通用动画（ms-*、alg-*、os-*、proj-*、be-* 文件）的题目 id 同步到 go-animated.ts。
// 用法：node scripts/sync-animated-ids.mjs
import {readFileSync,readdirSync,writeFileSync} from 'node:fs';
const dir='app/ai/animations/stories',file='app/ai/animations/go-animated.ts';
const idsOf=files=>files.flatMap(f=>[...readFileSync(`${dir}/${f}`,'utf8').matchAll(/^ '(q-[0-9a-f]{16})':\{title:/gm)].map(m=>m[1]));
const rowsOf=ids=>{const rows=[];for(let i=0;i<ids.length;i+=7)rows.push(' '+ids.slice(i,i+7).map(x=>`'${x}'`).join(',')+',');return rows};
// 把 ids 写进 go-animated.ts 中 // @generated-<tag>-start 与 -end 之间。
function fill(tag,ids){const s=readFileSync(file,'utf8'),start=` // @generated-${tag}-start`,a=s.indexOf(start),b=s.indexOf(` // @generated-${tag}-end`);
 if(a<0||b<0)throw new Error('go-animated.ts 缺少生成区标记：'+tag);
 const rows=rowsOf(ids);writeFileSync(file,s.slice(0,a)+start+'\n'+rows.join('\n')+(rows.length?'\n':'')+s.slice(b))}
const list=re=>readdirSync(dir).filter(f=>re.test(f)).sort();

// 后端通用（beAnimated）。
const beIds=idsOf(list(/^(ms|alg|os|proj|be)-.*\.ts$/));
fill('be',beIds);
console.log('beAnimated:',beIds.length);

// Go 其余章节（goAnimated 的 gx 生成区），并生成汇总文件 stories/gx.ts。
const gxFiles=list(/^gx-[a-z]+\.ts$/),gxIds=idsOf(gxFiles);
fill('gx',gxIds);
const nm=f=>'gx'+f.slice(3,-3).toUpperCase();
writeFileSync(`${dir}/gx.ts`,['// Go 面试题动画（基础、特性、库与框架、性能优化）汇总。由 scripts/sync-animated-ids.mjs 生成，不要手改。',"import type {Story} from '../story';",...gxFiles.map(f=>`import {${nm(f)}} from './${f.slice(0,-3)}';`),'',`export const gxStories:Record<string,Story>={${gxFiles.map(f=>'...'+nm(f)).join(',')}};`,''].join('\n'));
console.log('goAnimated（gx）:',gxIds.length);
