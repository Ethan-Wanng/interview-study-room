// 前端开发懒人模式长动画汇总（按集数顺序）。
import type {LazyEpisode} from './engine';
import {feLazy1} from './fe-1';
import {feLazy2} from './fe-2';
import {feLazy3} from './fe-3';
import {feLazy4} from './fe-4';
import {feLazy5} from './fe-5';
import {feLazy6} from './fe-6';
import {feLazy7} from './fe-7';
import {feLazyFull} from './frontend-full';

// 完整故事（full）放在最后，不影响普通集的集数编号；页面上单独置顶显示。
export const frontendLazy:LazyEpisode[]=[feLazy1,feLazy2,feLazy3,feLazy4,feLazy5,feLazy6,feLazy7,feLazyFull];
