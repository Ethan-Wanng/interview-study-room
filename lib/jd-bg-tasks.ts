// Client-side store & event bus for background JD / Interview research generation tasks.
// Tracks live 4-stage progress (profile -> roadmap -> quizzes -> questions) across all pages.

import type { JdStageKey } from './jd-research-types';

export type JdBgTask = {
 recordId: string;
 interactionId: string;
 sig: string;
 cacheKey?: string;
 ckSig?: string;
 title: string;
 createdAt: number;
 stageKey?: JdStageKey;
 stage1Cached?: boolean;
};

export type JdTaskDoneEvent = {
 recordId: string;
 title: string;
 status: 'completed' | 'error';
 error?: string;
};

const STORAGE_KEY = 'isr_jd_bg_tasks_v1';
const TASKS_EVENT = 'isr-jd-bg-tasks-change';
const DONE_EVENT = 'isr-jd-bg-task-done';
const MAX_AGE_MS = 25 * 60_000;

export function loadJdBgTasks(): JdBgTask[] {
 if (typeof window === 'undefined') return [];
 try {
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return [];
  const arr = JSON.parse(raw) as unknown;
  if (!Array.isArray(arr)) return [];
  const now = Date.now();
  return arr.filter((x): x is JdBgTask => {
   if (!x || typeof x !== 'object') return false;
   const t = x as Partial<JdBgTask>;
   return (
    typeof t.recordId === 'string' &&
    Boolean(t.recordId) &&
    typeof t.interactionId === 'string' &&
    Boolean(t.interactionId) &&
    typeof t.sig === 'string' &&
    Boolean(t.sig) &&
    typeof t.createdAt === 'number' &&
    now - t.createdAt < MAX_AGE_MS
   );
  });
 } catch {
  return [];
 }
}

function saveTasks(tasks: JdBgTask[]): void {
 if (typeof window === 'undefined') return;
 try {
  if (tasks.length) window.localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks.slice(0, 6)));
  else window.localStorage.removeItem(STORAGE_KEY);
 } catch {}
 window.dispatchEvent(new Event(TASKS_EVENT));
}

export function upsertJdBgTask(task: JdBgTask): void {
 const cur = loadJdBgTasks();
 const existing = cur.find(t => t.recordId === task.recordId);
 const merged: JdBgTask = existing ? { ...existing, ...task } : task;
 const rest = cur.filter(t => t.recordId !== task.recordId);
 saveTasks([merged, ...rest]);
}

export function removeJdBgTask(recordId: string): void {
 const cur = loadJdBgTasks();
 const next = cur.filter(t => t.recordId !== recordId);
 if (next.length !== cur.length) saveTasks(next);
}

export function subscribeJdBgTasks(cb: () => void): () => void {
 if (typeof window === 'undefined') return () => {};
 const onStorage = (e: StorageEvent) => {
  if (!e.key || e.key === STORAGE_KEY) cb();
 };
 window.addEventListener(TASKS_EVENT, cb);
 window.addEventListener('storage', onStorage);
 return () => {
  window.removeEventListener(TASKS_EVENT, cb);
  window.removeEventListener('storage', onStorage);
 };
}

export function notifyJdTaskDone(detail: JdTaskDoneEvent): void {
 if (typeof window === 'undefined') return;
 window.dispatchEvent(new CustomEvent<JdTaskDoneEvent>(DONE_EVENT, { detail }));
}

export function subscribeJdTaskDone(cb: (detail: JdTaskDoneEvent) => void): () => void {
 if (typeof window === 'undefined') return () => {};
 const handler = (e: Event) => {
  const detail = (e as CustomEvent<JdTaskDoneEvent>).detail;
  if (detail) cb(detail);
 };
 window.addEventListener(DONE_EVENT, handler);
 return () => window.removeEventListener(DONE_EVENT, handler);
}
