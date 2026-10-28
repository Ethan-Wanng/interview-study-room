// 各学科懒人模式的长动画按学科单独打包，打开懒人模式时才下载。
import type {LazyEpisode} from './engine';

export const lazyLoaders:Record<string,()=>Promise<LazyEpisode[]>>={
 go:()=>import('./go').then(m=>m.goLazy),
 ai:()=>import('./ai').then(m=>m.aiLazy),
 backend:()=>import('./backend').then(m=>m.backendLazy),
 frontend:()=>import('./frontend').then(m=>m.frontendLazy),
};
