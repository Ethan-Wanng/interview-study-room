// 后端通用（微服务、设计模式与算法、Linux/操作系统/网络、项目）面试题动画：单独打包、按需加载。
// 新增动画后运行 node scripts/sync-animated-ids.mjs，把 id 同步到 ../go-animated.ts 的 beAnimated。
import {fromStory,type Story} from '../story';
import {msA} from './ms-a';
import {msB} from './ms-b';
import {msC} from './ms-c';
import {msD} from './ms-d';
import {msE} from './ms-e';
import {algA} from './alg-a';
import {algB} from './alg-b';
import {algC} from './alg-c';
import {osA} from './os-a';
import {osB} from './os-b';
import {osC} from './os-c';
import {osD} from './os-d';
import {osE} from './os-e';
import {osF} from './os-f';
import {osG} from './os-g';
import {projA} from './proj-a';
import {projB} from './proj-b';
import {beNewA} from './be-new-a';
import {beNewB} from './be-new-b';

export const backendStories:Record<string,Story>={...msA,...msB,...msC,...msD,...msE,...algA,...algB,...algC,...osA,...osB,...osC,...osD,...osE,...osF,...osG,...projA,...projB,...beNewA,...beNewB};
export const backendAnimationFor=(id:string)=>backendStories[id]?fromStory(id,'backend',backendStories[id]):null;
