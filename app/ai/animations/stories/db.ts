// 数据库与缓存面试题动画：单独打包，点数据库题目的“看动画讲解”时才下载。
// 新增动画后，把题目 id 加进 ../go-animated.ts 的 dbAnimated，首页才会显示按钮。
import {fromStory,type Story} from '../story';
import {dbMysqlA} from './db-mysql-a';
import {dbMysqlB} from './db-mysql-b';
import {dbMysqlC} from './db-mysql-c';
import {dbMysqlD} from './db-mysql-d';
import {dbRedisA} from './db-redis-a';
import {dbRedisB} from './db-redis-b';
import {dbEsA} from './db-es-a';
import {dbEsB} from './db-es-b';

export const dbStories:Record<string,Story>={...dbMysqlA,...dbMysqlB,...dbMysqlC,...dbMysqlD,...dbRedisA,...dbRedisB,...dbEsA,...dbEsB};
export const dbAnimationFor=(id:string)=>dbStories[id]?fromStory(id,'db',dbStories[id]):null;
