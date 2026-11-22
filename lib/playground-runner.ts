'use client';
import {stripTypeScript} from './ts-strip';
import {runSqlInWorker} from './sql-runner';
import type {PlaygroundLang} from './playground-bridge';

export type PlaygroundEvent={
 message:string;
 kind:'stdout'|'stderr';
 delayNs:number;
};

export type PlaygroundRunResult={
 ok:boolean;
 stdout:string;
 stderr:string;
 compileErrors:string;
 vetErrors?:string;
 events?:PlaygroundEvent[];
 exitCode:number|null;
 durationMs:number;
 runner:string;
};

// 在独立的浏览器 Web Worker 中运行 JS/TS 代码：
// 1. 先通过 stripTypeScript 剥离 TypeScript 类型语法；
// 2. 捕获 console.log/info/warn/error/table/time/timeEnd 输出；
// 3. 追踪 setTimeout 与 Promise 微任务，全部完成后立即结束；
// 4. 超时（默认 5 秒）或用户点停止时直接 worker.terminate() 销毁沙盒。
export function runJsTsInWorker(
 code:string,
 opts:{signal?:AbortSignal;timeoutMs?:number}={},
):Promise<PlaygroundRunResult>{
 const timeoutMs=opts.timeoutMs??5000;
 const started=performance.now();
 let stripped='';
 try{
  stripped=stripTypeScript(code);
 }catch(e){
  return Promise.resolve({
   ok:false,
   stdout:'',
   stderr:'',
   compileErrors:e instanceof Error?e.message:'TypeScript 语法解析失败',
   exitCode:1,
   durationMs:Math.round(performance.now()-started),
   runner:'Browser JS/TS Sandbox',
  });
 }

 const workerSource=`
  const __origSetTimeout = self.setTimeout.bind(self);
  const __origClearTimeout = self.clearTimeout.bind(self);
  const __origSetInterval = self.setInterval.bind(self);
  const __origClearInterval = self.clearInterval.bind(self);
  let __evalDone = false;
  let __finished = false;
  const __activeTimeouts = new Set();
  const __times = new Map();

  function __fmt(v) {
   if (typeof v === 'string') return v;
   if (v === null) return 'null';
   if (v === undefined) return 'undefined';
   if (typeof v === 'symbol' || typeof v === 'function') return String(v);
   if (v instanceof Error) return v.stack || (v.name + ': ' + v.message);
   if (v instanceof Map) return 'Map(' + v.size + ') ' + JSON.stringify(Object.fromEntries(v));
   if (v instanceof Set) return 'Set(' + v.size + ') ' + JSON.stringify([...v]);
   try { return JSON.stringify(v); } catch { return String(v); }
  }
  function __emit(kind, args) {
   self.postMessage({ type: 'out', kind, text: args.map(__fmt).join(' ') + '\\n' });
  }
  const console = {
   log: (...a) => __emit('stdout', a),
   info: (...a) => __emit('stdout', a),
   debug: (...a) => __emit('stdout', a),
   warn: (...a) => __emit('stderr', ['[warn]', ...a]),
   error: (...a) => __emit('stderr', a),
   table: (data) => {
    try { __emit('stdout', [JSON.stringify(data, null, 2)]); }
    catch { __emit('stdout', [data]); }
   },
   time: (label = 'default') => __times.set(String(label), performance.now()),
   timeEnd: (label = 'default') => {
    const k = String(label), t0 = __times.get(k);
    if (t0 !== undefined) {
     __times.delete(k);
     __emit('stdout', [k + ': ' + (performance.now() - t0).toFixed(2) + 'ms']);
    }
   },
  };

  function __maybeFinish(hadErr) {
   if (__finished) return;
   if (!__evalDone || __activeTimeouts.size > 0) return;
   // 等一轮 microtask，确认 Promise.then 里没有再排新的定时器
   Promise.resolve().then(() => {
    __origSetTimeout(() => {
     if (__finished || __activeTimeouts.size > 0) return;
     __finished = true;
     self.postMessage({ type: 'done', ok: !hadErr });
    }, 0);
   });
  }

  self.setTimeout = function(fn, delay = 0, ...args) {
   const box = { id: 0 };
   __activeTimeouts.add(box);
   box.id = __origSetTimeout(() => {
    __activeTimeouts.delete(box);
    try { if (typeof fn === 'function') fn(...args); }
    catch (err) { __emit('stderr', [err]); __hadErr = true; }
    finally { __maybeFinish(__hadErr); }
   }, Math.max(0, Number(delay) || 0));
   return box.id;
  };
  self.clearTimeout = function(id) {
   for (const b of __activeTimeouts) {
    if (b.id === id) { __activeTimeouts.delete(b); break; }
   }
   return __origClearTimeout(id);
  };
  self.setInterval = function() {
   throw new Error('沙盒中暂不支持 setInterval 无限循环，请使用 setTimeout 或有限循环');
  };
  self.fetch = undefined;
  self.XMLHttpRequest = undefined;
  self.WebSocket = undefined;
  self.EventSource = undefined;
  self.importScripts = undefined;

  let __hadErr = false;
  self.addEventListener('unhandledrejection', (ev) => {
   __hadErr = true;
   __emit('stderr', ['UnhandledPromiseRejection:', ev.reason]);
  });

  self.onmessage = async (ev) => {
   const userCode = ev.data;
   try {
    const args = ['console', 'setTimeout', 'clearTimeout', 'setInterval', 'clearInterval'];
    let fn;
    try {
     fn = new Function(...args, userCode);
    } catch (synErr) {
     if (synErr instanceof SyntaxError && /await/i.test(synErr.message)) {
      const AsyncFn = Object.getPrototypeOf(async function(){}).constructor;
      fn = new AsyncFn(...args, userCode);
     } else {
      throw synErr;
     }
    }
    const res = fn(console, self.setTimeout, self.clearTimeout, self.setInterval, __origClearInterval);
    if (res && typeof res.then === 'function') await res;
   } catch (err) {
    __hadErr = true;
    __emit('stderr', [err]);
   } finally {
    __evalDone = true;
    __maybeFinish(__hadErr);
   }
  };
 `;

 return new Promise(resolve=>{
  const blob=new Blob([workerSource],{type:'application/javascript'});
  const url=URL.createObjectURL(blob);
  const worker=new Worker(url);
  let stdout='',stderr='',settled=false;

  const cleanup=()=>{
   clearTimeout(timer);
   opts.signal?.removeEventListener('abort',onAbort);
   worker.terminate();
   URL.revokeObjectURL(url);
  };

  const finish=(ok:boolean,compileErrors='',exitCode=ok?0:1)=>{
   if(settled)return;
   settled=true;
   cleanup();
   resolve({
    ok,
    stdout,
    stderr,
    compileErrors,
    exitCode,
    durationMs:Math.round(performance.now()-started),
    runner:'Browser JS/TS Sandbox (Web Worker)',
   });
  };

  const onAbort=()=>{
   finish(false,'',130);
  };
  if(opts.signal?.aborted){onAbort();return}
  opts.signal?.addEventListener('abort',onAbort,{once:true});

  const timer=setTimeout(()=>{
   stderr+=(stderr&&!stderr.endsWith('\n')?'\n':'')+`执行超时（超过 ${Math.round(timeoutMs/1000)} 秒），沙盒已自动中止。`;
   finish(false,'',124);
  },timeoutMs);

  worker.onmessage=(e)=>{
   const d=e.data as {type:'out'|'done';kind?:'stdout'|'stderr';text?:string;ok?:boolean};
   if(d.type==='out'){
    if(d.kind==='stderr')stderr+=d.text??'';
    else stdout+=d.text??'';
   }else if(d.type==='done'){
    finish(Boolean(d.ok));
   }
  };
  worker.onerror=(ev)=>{
   finish(false,ev.message||'脚本语法或运行错误',1);
  };

  worker.postMessage(stripped);
 });
}

export async function runPlaygroundCode(
 lang:PlaygroundLang,
 code:string,
 opts:{signal?:AbortSignal}={},
):Promise<PlaygroundRunResult>{
 if(lang==='ts'){
  return runJsTsInWorker(code,{signal:opts.signal,timeoutMs:5000});
 }
 if(lang==='sql'){
  return runSqlInWorker(code,{signal:opts.signal,timeoutMs:8000});
 }
 const r=await fetch('/api/playground/run',{
  method:'POST',
  headers:{'content-type':'application/json'},
  body:JSON.stringify({lang,code}),
  signal:opts.signal,
 });
 const d=await r.json() as PlaygroundRunResult&{error?:string};
 if(!r.ok){
  throw new Error(d.error||'运行服务暂时不可用，请稍后重试。');
 }
 return d;
}
