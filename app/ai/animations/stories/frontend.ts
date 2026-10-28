// 前端开发面试题动画：单独打包、按需加载。每道 fe-q- 开头的面试题都有动画。由 scripts/gen-frontend-stories.mjs 生成。
import {fromStory,type Story} from '../story';
import {feA} from './fe-a';
import {feB} from './fe-b';
import {feC} from './fe-c';
import {feD} from './fe-d';
import {feE} from './fe-e';
import {feF} from './fe-f';
import {feG} from './fe-g';
import {feH} from './fe-h';
import {feI} from './fe-i';
import {feJ} from './fe-j';

export const frontendStories:Record<string,Story>={...feA,...feB,...feC,...feD,...feE,...feF,...feG,...feH,...feI,...feJ};
export const frontendAnimationFor=(id:string)=>frontendStories[id]?fromStory(id,'frontend',frontendStories[id]):null;
