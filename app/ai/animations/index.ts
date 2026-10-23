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
import {backoff} from './backoff';
import {hybridRerank} from './hybrid-rerank';
import {schemaRetry} from './schema-retry';
import {decision} from './decision';
import {evalLoop} from './eval-loop';
import {injection} from './injection';

export type {Animation} from './types';
// 按关卡顺序排列，每关至少一个。
export const animations:Animation[]=[nextToken,statelessChat,ragPipeline,toolLoop,backoff,hnsw,hybridRerank,schemaRetry,decision,selfAttention,agentLoop,evalLoop,kvCache,lora,injection];
export const animationsFor=(level:string)=>animations.filter(a=>a.level===level);
export const animationById=(id:string)=>animations.find(a=>a.id===id);
