// 前端开发学习空间：15 个关卡，从 HTML、CSS、JavaScript 起步，到框架原理、工程化、性能优化和前端架构。
// 每道题都有固定 id（错题本按 id 记录），新增题目请使用新的 id，不要修改或复用已有 id。
// interview 字段关联 content/frontend-interview 里的前端面试题 id。
import type {AiLevel,Rank,Tier} from './journey';
import {feHtml,feCss} from './frontend-levels/basics';
import {feLayout,feJs} from './frontend-levels/layout-js';
import {feFunc,feDom} from './frontend-levels/func-dom';
import {feAsync,feScope} from './frontend-levels/async-scope';
import {feNet,feTs} from './frontend-levels/net-ts';
import {feBrowser,feReact} from './frontend-levels/browser-react';
import {feBuild} from './frontend-levels/build';
import {fePerf,feArch} from './frontend-levels/expert';

export const frontendPassRate=0.65;
export const frontendTiers:Tier[]=[{name:'入门',nameEn:'Beginner',from:0,to:4},{name:'进阶',nameEn:'Intermediate',from:5,to:9},{name:'高阶',nameEn:'Advanced',from:10,to:12},{name:'专家',nameEn:'Expert',from:13,to:14}];
export const frontendRanks:Rank[]=[{min:0,name:'前端小白'},{min:2,name:'入门'},{min:5,name:'熟手'},{min:10,name:'高手'},{min:13,name:'架构师'},{min:15,name:'大神'}];
export const frontendLevels:AiLevel[]=[feHtml,feCss,feLayout,feJs,feFunc,feDom,feAsync,feScope,feNet,feTs,feBrowser,feReact,feBuild,fePerf,feArch];
