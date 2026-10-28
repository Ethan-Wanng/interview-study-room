// Go 面试题动画：和 AI 面试题动画分开打包，点 Go 题目的“看动画讲解”时才下载。
// 新增 gx-*.ts 动画后运行 node scripts/sync-animated-ids.mjs，自动登记 id 并更新 gx.ts；scripts/check-stories.mjs 会校验两边一致。
import {fromStory,type Story} from '../story';
import {goRuntimeStories} from './go-runtime';
import {goInternalsStories} from './go-internals';
import {goConcurrencyStories} from './go-concurrency';
import {gxStories} from './gx';

export const goStories:Record<string,Story>={...goRuntimeStories,...goInternalsStories,...goConcurrencyStories,...gxStories};
export const goAnimationFor=(id:string)=>goStories[id]?fromStory(id,'go',goStories[id]):null;
