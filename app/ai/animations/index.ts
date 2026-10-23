// 动画课堂：入门章节的直观讲解 + 难点知识的分步拆解。每个动画关联一个关卡。
import type {Animation} from './types';
import {nextToken} from './next-token';
import {statelessChat} from './stateless-chat';
import {ragPipeline} from './rag-pipeline';
import {toolLoop} from './tool-loop';
import {hnsw} from './hnsw';
import {selfAttention} from './self-attention';
import {agentLoop} from './agent-loop';
import {kvCache} from './kv-cache';
import {lora} from './lora';

export type {Animation} from './types';
export const animations:Animation[]=[nextToken,statelessChat,ragPipeline,toolLoop,hnsw,selfAttention,agentLoop,kvCache,lora];
export const animationsFor=(level:string)=>animations.filter(a=>a.level===level);
export const animationById=(id:string)=>animations.find(a=>a.id===id);
