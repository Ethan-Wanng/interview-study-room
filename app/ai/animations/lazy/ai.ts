// AI 开发懒人模式长动画汇总（按集数顺序）。
import type {LazyEpisode} from './engine';
import {aiLazy1} from './ai-1';
import {aiLazy2} from './ai-2';
import {aiLazy3} from './ai-3';
import {aiLazy4} from './ai-4';
import {aiLazy5} from './ai-5';
import {aiLazy6} from './ai-6';
import {aiLazy7} from './ai-7';
import {aiLazy8} from './ai-8';
import {aiLazyFull} from './ai-full';

// 完整故事（full）放在最后，不影响普通集的集数编号；页面上单独置顶显示。
export const aiLazy:LazyEpisode[]=[aiLazy1,aiLazy2,aiLazy3,aiLazy4,aiLazy5,aiLazy6,aiLazy7,aiLazy8,aiLazyFull];
