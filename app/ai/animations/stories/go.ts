// Go 面试题动画：和 AI 面试题动画分开打包，点 Go 题目的“看动画讲解”时才下载。
// 新增动画后，把题目 id 加进 ../go-animated.ts，首页才会显示按钮；scripts/check-stories.mjs 会校验两边一致。
import {fromStory,type Story} from '../story';
import {goRuntimeStories} from './go-runtime';
import {goInternalsStories} from './go-internals';
import {goConcurrencyStories} from './go-concurrency';

export const goStories:Record<string,Story>={...goRuntimeStories,...goInternalsStories,...goConcurrencyStories};
export const goAnimationFor=(id:string)=>goStories[id]?fromStory(id,'go',goStories[id]):null;
