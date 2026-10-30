// 后端通用懒人模式长动画汇总（按集数顺序）。
import type {LazyEpisode} from './engine';
import {beLazy1} from './be-1';
import {beLazy2} from './be-2';
import {beLazy3} from './be-3';
import {beLazy4} from './be-4';
import {beLazy5} from './be-5';
import {beLazy6} from './be-6';
import {beLazy7} from './be-7';
import {beLazy8} from './be-8';
import {beLazy9} from './be-9';
import {beLazy10} from './be-10';
import {beLazy11} from './be-11';
import {beLazyFull} from './backend-full';

// 完整故事（full）放在最后，不影响普通集的集数编号；页面上单独置顶显示。
export const backendLazy:LazyEpisode[]=[beLazy1,beLazy2,beLazy3,beLazy4,beLazy5,beLazy6,beLazy7,beLazy8,beLazy9,beLazy10,beLazy11,beLazyFull];
