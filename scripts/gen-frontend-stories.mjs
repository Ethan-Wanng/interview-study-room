// 生成 app/ai/animations/stories/frontend.ts：汇总 stories 目录下所有 fe-*.ts 动画文件。
// 新增前端面试题动画文件后运行：node scripts/gen-frontend-stories.mjs
import {readdirSync,writeFileSync} from 'node:fs';
const dir='app/ai/animations/stories',files=readdirSync(dir).filter(f=>/^fe-[a-z]+\.ts$/.test(f)).sort();
const name=f=>'fe'+f.slice(3,-3).toUpperCase();
writeFileSync(`${dir}/frontend.ts`,`// 前端开发面试题动画：单独打包、按需加载。每道 fe-q- 开头的面试题都有动画。由 scripts/gen-frontend-stories.mjs 生成。
import {fromStory,type Story} from '../story';
${files.map(f=>`import {${name(f)}} from './${f.slice(0,-3)}';`).join('\n')}

export const frontendStories:Record<string,Story>={${files.map(f=>'...'+name(f)).join(',')}};
export const frontendAnimationFor=(id:string)=>frontendStories[id]?fromStory(id,'frontend',frontendStories[id]):null;
`);
console.log(files.length+' 个文件');
