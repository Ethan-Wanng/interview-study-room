// Python 开发学习空间：15 个关卡，从安装解释器、变量与基本类型起步，到面向对象、迭代器/生成器、装饰器与类型注解、数据模型、并发与 asyncio、CPython 底层、元编程和工程实战。
// 每道题都有固定 id（错题本按 id 记录），新增题目请使用新的 id，不要修改或复用已有 id。
// 关卡内容分模块写在 content/python-levels/ 下，在这里按顺序组装。
import type {AiLevel,Rank,Tier} from './journey';
import {pyStart,pyFlow} from './python-levels/beginner-a';
import {pyCollections,pyFunctions} from './python-levels/beginner-b';
import {pyOop,pyErrorsIo,pyModules} from './python-levels/intermediate-a';
import {pyIterators,pyDecorators} from './python-levels/intermediate-b';
import {pyDataModel,pyConcurrency,pyAsync} from './python-levels/advanced';
import {pyCpython,pyMetaprogramming,pyEngineering} from './python-levels/expert';

export const pythonPassRate=0.65;
export const pythonTiers:Tier[]=[
 {name:'入门',nameEn:'Beginner',from:0,to:3},
 {name:'进阶',nameEn:'Intermediate',from:4,to:8},
 {name:'高阶',nameEn:'Advanced',from:9,to:11},
 {name:'专家',nameEn:'Expert',from:12,to:14},
];
export const pythonRanks:Rank[]=[
 {min:0,name:'Python 新手'},
 {min:2,name:'入门'},
 {min:4,name:'熟手'},
 {min:9,name:'高手'},
 {min:12,name:'专家'},
 {min:15,name:'大神'},
];
export const pythonLevels:AiLevel[]=[
 pyStart,
 pyFlow,
 pyCollections,
 pyFunctions,
 pyOop,
 pyErrorsIo,
 pyModules,
 pyIterators,
 pyDecorators,
 pyDataModel,
 pyConcurrency,
 pyAsync,
 pyCpython,
 pyMetaprogramming,
 pyEngineering,
];
