'use client';
import './speech-drill.css';
import {useEffect,useRef,useState} from 'react';
import {Fragment} from 'react';
import {Eye,EyeOff,Languages,Mic,Play,Square,Turtle,Users,Volume2} from 'lucide-react';
import {useI18n} from './i18n';
import type {Phrase} from '@/content/journey';

// 语言课的“听一听、跟着说”：用浏览器自带的英文语音朗读，用语音识别听你跟读并按单词打分。
// 朗读各浏览器都支持；语音识别目前只有 Chrome、Edge 等浏览器支持，并且要允许使用麦克风。

const canSpeak=()=>typeof window!=='undefined'&&'speechSynthesis' in window;
// 优先用美式英语的神经网络语音（Edge 的 Natural/Online、Google US English），其次任意英语语音。
function enVoice(){const all=speechSynthesis.getVoices().filter(v=>/^en[-_]/i.test(v.lang)),us=all.filter(v=>/^en[-_]US/i.test(v.lang)),pool=us.length?us:all;
 return pool.find(v=>/Natural|Online/i.test(v.name))??pool.find(v=>/Google/i.test(v.name))??pool.find(v=>/Aria|Jenny|Samantha|Zira/i.test(v.name))??pool[0]}
let current:SpeechSynthesisUtterance|null=null; // 保留引用，避免 Chrome 回收后不触发 onend
export function sayEnglish(text:string,rate=0.9,onEnd?:()=>void){if(!canSpeak()){onEnd?.();return}speechSynthesis.cancel();
 const u=new SpeechSynthesisUtterance(text),v=enVoice();u.lang=v?.lang??'en-US';if(v)u.voice=v;u.rate=rate;
 u.onend=u.onerror=()=>{if(current===u){current=null;onEnd?.()}};current=u;speechSynthesis.speak(u)}
function stopSaying(){current=null;if(canSpeak())speechSynthesis.cancel()}

type RecResult={transcript:string};
type RecEvent={results:ArrayLike<ArrayLike<RecResult>>};
type Rec={lang:string;interimResults:boolean;maxAlternatives:number;continuous:boolean;onresult:((e:RecEvent)=>void)|null;onerror:((e:{error:string})=>void)|null;onend:(()=>void)|null;start():void;abort():void};
const recognition=()=>{if(typeof window==='undefined')return undefined;const w=window as unknown as {SpeechRecognition?:new()=>Rec;webkitSpeechRecognition?:new()=>Rec};return w.SpeechRecognition??w.webkitSpeechRecognition};

// 比较时把缩写展开、数字换成单词，这样识别出 “I am” 或 “7” 也算对上 “I'm”“seven”。
const SHORT:Record<string,string>={"i'm":'i am',"you're":'you are',"we're":'we are',"they're":'they are',"it's":'it is',"he's":'he is',"she's":'she is',"that's":'that is',"what's":'what is',"where's":'where is',"there's":'there is',"let's":'let us',"i'd":'i would',"you'd":'you would',"i'll":'i will',"you'll":'you will',"we'll":'we will',"i've":'i have',"don't":'do not',"doesn't":'does not',"didn't":'did not',"can't":'can not',cannot:'can not',"won't":'will not',"isn't":'is not',"aren't":'are not',"wasn't":'was not',"haven't":'have not',"couldn't":'could not',"wouldn't":'would not',"how's":'how is',gonna:'going to',wanna:'want to',ok:'okay',mr:'mister',mrs:'missus'};
const ONES=['zero','one','two','three','four','five','six','seven','eight','nine','ten','eleven','twelve','thirteen','fourteen','fifteen','sixteen','seventeen','eighteen','nineteen'],TENS=['','','twenty','thirty','forty','fifty','sixty','seventy','eighty','ninety'];
const num=(n:number):string=>n<20?ONES[n]:n<100?TENS[Math.floor(n/10)]+(n%10?' '+ONES[n%10]:''):n<1000?ONES[Math.floor(n/100)]+' hundred'+(n%100?' '+num(n%100):''):String(n);
export function words(s:string){return s.toLowerCase().replace(/[’‘]/g,"'").replace(/(\d+):(\d\d)/g,(_,h,m)=>`${h} ${m==='00'?"o'clock":m}`).replace(/[^a-z0-9' ]+/g,' ').split(/\s+/).filter(Boolean)
 .flatMap(w=>{const x=SHORT[w]??(/^\d+$/.test(w)?num(Number(w)):w.replace(/^'+|'+$/g,''));return x.split(' ')}).filter(Boolean)}
// 按最长公共子序列对齐：原句里每个词是否被说到了，得分 = 说到的词数 ÷ 原句词数。
export function compare(target:string,heard:string){const a=words(target),b=words(heard),d=a.map(()=>new Array(b.length+1).fill(0) as number[]);d.push(new Array(b.length+1).fill(0));
 for(let i=a.length-1;i>=0;i--)for(let j=b.length-1;j>=0;j--)d[i][j]=a[i]===b[j]?d[i+1][j+1]+1:Math.max(d[i+1][j],d[i][j+1]);
 const hits=a.map(()=>false);let i=0,j=0;while(i<a.length&&j<b.length){if(a[i]===b[j]){hits[i]=true;i++;j++}else if(d[i+1][j]>=d[i][j+1])i++;else j++}
 return {words:a,hits,score:a.length?Math.round(d[0][0]/a.length*100):0}}
type Score={heard:string;words:string[];hits:boolean[];score:number};

// 听一次你说的话：返回识别出的几种可能里和原句最接近的一种。
function listen(target:string,onDone:(r:Score|{error:string})=>void):(()=>void)|null{const R=recognition();if(!R)return null;stopSaying();
 const r=new R();r.lang='en-US';r.interimResults=false;r.maxAlternatives=4;r.continuous=false;let done=false;
 const finish=(v:Score|{error:string})=>{if(done)return;done=true;onDone(v)};
 r.onresult=e=>{const alts=Array.from(e.results[0]??[]).map(x=>x.transcript);const best=alts.map(h=>({heard:h.trim(),...compare(target,h)})).sort((x,y)=>y.score-x.score)[0];finish(best??{error:'no-speech'})};
 r.onerror=e=>finish({error:e.error});r.onend=()=>finish({error:'no-speech'});
 try{r.start()}catch{finish({error:'busy'})}
 return ()=>{done=true;try{r.abort()}catch{}}}

function useL(){const {locale}=useI18n();return (zh:string,en:string)=>locale==='en'?en:zh}
function errorText(code:string,L:(zh:string,en:string)=>string){
 if(code==='not-allowed'||code==='service-not-allowed')return L('没有麦克风权限：点地址栏左边的图标，允许这个网站使用麦克风后再试。','Microphone blocked: allow it from the address bar and try again.');
 if(code==='no-speech')return L('没听清：靠近麦克风，大声慢慢地再说一次。','Didn’t catch that — speak a bit louder and slower.');
 if(code==='network')return L('语音识别需要联网，检查网络后再试。','Speech recognition needs a network connection.');
 if(code==='audio-capture')return L('没有找到麦克风，插上耳机麦克风再试。','No microphone found.');
 return L('语音识别暂时不可用，再点一次试试。','Speech recognition is unavailable; try again.')}
const verdict=(s:number,L:(zh:string,en:string)=>string)=>s>=90?L('很棒！每个词都说清楚了','Great — every word was clear'):s>=70?L('不错！红色的词再练一两遍','Good! Practise the red words again'):L('再来一次：先点慢速听，再一个词一个词跟着说','Try again: listen slowly, then repeat word by word');

function ScoreView({s}:{s:Score}){const L=useL();
 return <div className={'sd-score '+(s.score>=90?'good':s.score>=70?'ok':'low')}><b>{s.score}%</b><span className="sd-words">{s.words.map((w,i)=><span key={i} className={s.hits[i]?'hit':'miss'}>{w}</span>)}</span><small>{L('我听到：','Heard: ')}{s.heard||'—'} · {verdict(s.score,L)}</small></div>}

// 听力题的播放按钮：只放声音不显示原文。
export function ListenButton({text}:{text:string}){const L=useL();
 useEffect(()=>()=>stopSaying(),[]);
 return <div className="sd-listen"><button type="button" className="button secondary" onClick={()=>sayEnglish(text,0.9)}><Volume2 size={16}/>{L('播放录音','Play')}</button><button type="button" className="button secondary" onClick={()=>sayEnglish(text,0.6)}><Turtle size={16}/>{L('慢速再听','Slower')}</button><small>{L('可以反复听，听不清就点慢速','Replay as often as you like')}</small></div>}

// 一组句子：每句都能听（正常 / 慢速）和跟读打分；整组都有说话人时按对话显示，可以播放整段，或选一个角色和电脑分角色对话。
// words：单词表，每个词下面有例句（也能听），可以遮住中文自测，点一下遮住的地方再看答案。
function SentenceList({phrases,words}:{phrases:Phrase[];words?:boolean}){const L=useL();
 const dialog=!words&&phrases.length>1&&phrases.every(p=>p.who),speakers=dialog?[...new Set(phrases.map(p=>p.who!))]:[];
 const [mask,setMask]=useState(false),[shown,setShown]=useState<Set<number>>(new Set());
 const hidden=(i:number)=>mask&&!shown.has(i),reveal=(i:number)=>setShown(s=>new Set(s).add(i));
 const sayText=(i:number,text:string)=>{stopAll();setActive(i);const my=run.current;sayEnglish(text,0.85,()=>{if(my===run.current)setActive(null)})};
 const [active,setActive]=useState<number|null>(null),[listening,setListening]=useState<number|null>(null),[scores,setScores]=useState<Record<number,Score>>({}),[error,setError]=useState<{i:number;text:string}|null>(null);
 const [role,setRole]=useState<string|null>(null),[waiting,setWaiting]=useState<number|null>(null),[canRec,setCanRec]=useState(false);
 const stopRec=useRef<(()=>void)|null>(null),run=useRef(0),next=useRef<(i:number)=>void>(()=>{});
 useEffect(()=>{const t=setTimeout(()=>setCanRec(!!recognition()));if(canSpeak())speechSynthesis.getVoices();return()=>{clearTimeout(t);run.current++;stopRec.current?.();stopSaying()}},[]);
 const stopAll=()=>{run.current++;stopRec.current?.();stopRec.current=null;stopSaying();setActive(null);setListening(null);setWaiting(null);setRole(null)};
 const play=(i:number,rate:number)=>{stopAll();setActive(i);const my=run.current;sayEnglish(phrases[i].en,rate,()=>{if(my===run.current)setActive(null)})};
 // 跟读一句；then 是分角色对话里说完之后接着往下走。
 const repeat=(i:number,then?:()=>void)=>{stopRec.current?.();stopSaying();setError(null);setListening(i);
  stopRec.current=listen(phrases[i].en,r=>{stopRec.current=null;setListening(null);
   if('error' in r){setError({i,text:errorText(r.error,L)});return}
   setScores(s=>({...s,[i]:r}));if(then)setTimeout(then,900)})};
 const playAll=()=>{stopAll();const my=run.current;const step=(i:number)=>{if(my!==run.current)return;if(i>=phrases.length){setActive(null);return}setActive(i);sayEnglish(phrases[i].en,0.9,()=>setTimeout(()=>step(i+1),350))};step(0)};
 // 分角色对话：电脑读对方的台词，轮到你的台词时自动开始听；没听清可以再说一次或跳过。
 const rolePlay=(who:string)=>{stopAll();setRole(who);setScores({});const my=run.current;
  const step=(i:number)=>{if(my!==run.current)return;if(i>=phrases.length){setActive(null);setWaiting(null);setRole(null);return}setActive(i);
   if(phrases[i].who!==who){setWaiting(null);sayEnglish(phrases[i].en,0.9,()=>setTimeout(()=>step(i+1),300))}
   else{setWaiting(i);if(canRec)repeat(i,()=>step(i+1))}};
  next.current=step;step(0)};
 return <div className={'sd-list'+(dialog?' dialog':'')+(words?' words':'')}>
  {words&&phrases.length>=3&&<div className="sd-bar"><button type="button" className={'button secondary'+(mask?' on':'')} onClick={()=>{setMask(!mask);setShown(new Set())}}>{mask?<><Eye size={15}/>{L('显示全部中文','Show meanings')}</>:<><EyeOff size={15}/>{L('遮住中文自测','Hide meanings to test yourself')}</>}</button></div>}
  {dialog&&<div className="sd-bar"><button type="button" className="button secondary" onClick={active!==null||role?stopAll:playAll}>{active!==null||role?<><Square size={15}/>{L('停止','Stop')}</>:<><Play size={15}/>{L('播放整段对话','Play the dialogue')}</>}</button>
   {speakers.map(w=><button key={w} type="button" className={'button secondary'+(role===w?' on':'')} disabled={!!role&&role!==w} onClick={()=>rolePlay(w)}><Users size={15}/>{L(`我来演 ${w}`,`I play ${w}`)}</button>)}</div>}
  {role&&<p className="sd-hint">{canRec?L(`电脑读其他人的台词；轮到 ${role} 时会自动开始听，你对着麦克风说出高亮的句子。`,`The computer reads the other lines; speak when your ${role} line lights up.`):L(`电脑读其他人的台词；轮到 ${role} 时你大声说出高亮的句子，说完点「下一句」。`,`Say your ${role} lines out loud, then press Next.`)}</p>}
  {phrases.map((p,i)=>{const s=scores[i],mine=waiting===i;return <div key={i} className={'sd-row'+(active===i?' active':'')+(mine?' mine':'')}>
   {dialog&&<span className="sd-who">{p.who}</span>}
   <div className="sd-text"><strong lang="en">{p.en}</strong><span className={hidden(i)?'sd-mask':''} title={hidden(i)?L('点一下看中文','Tap to reveal'):undefined} onClick={()=>reveal(i)}>{p.zh}</span>
    {p.ex&&<small className="sd-ex"><button type="button" className="sd-link" aria-label={L('听例句','Listen to the example')} onClick={()=>sayText(i,p.ex!)}><Volume2 size={14}/></button><i lang="en">{p.ex}</i>{p.exZh&&<span className={hidden(i)?'sd-mask':''} onClick={()=>reveal(i)}>{p.exZh}</span>}</small>}
    {p.tip&&<small>{p.tip}</small>}
    {s&&<ScoreView s={s}/>}{error?.i===i&&<small className="sd-error">{error.text}</small>}
    {mine&&<span className="sd-turn">{listening===i?L('正在听……请说出这句','Listening… say this line'):L('轮到你了','Your turn')}{listening!==i&&<>{canRec&&<button type="button" className="sd-link" onClick={()=>repeat(i,()=>next.current(i+1))}>{L('再说一次','Say it again')}</button>}<button type="button" className="sd-link" onClick={()=>{stopRec.current?.();setListening(null);next.current(i+1)}}>{canRec?L('跳过','Skip'):L('下一句','Next')}</button></>}</span>}</div>
   <div className="sd-actions">
    <button type="button" title={L('听','Listen')} aria-label={L('听','Listen')} onClick={()=>play(i,0.9)}><Volume2 size={17}/></button>
    <button type="button" title={L('慢速听','Listen slowly')} aria-label={L('慢速听','Listen slowly')} onClick={()=>play(i,0.6)}><Turtle size={17}/></button>
    {canRec&&<button type="button" className={listening===i?'rec':''} title={L('跟读打分','Repeat and get scored')} aria-label={L('跟读打分','Repeat and get scored')} onClick={()=>listening===i?(stopRec.current?.(),setListening(null)):repeat(i)}><Mic size={17}/></button>}
   </div></div>})}
  {!canRec&&<p className="sd-hint">{L('跟读打分需要 Chrome 或 Edge 浏览器并允许使用麦克风；现在可以先点喇叭听，再自己大声跟着说。','Scored repeating needs Chrome or Edge with microphone access; for now, listen and repeat out loud.')}</p>}
 </div>}

// 把一段英文按句子切开，一句一句地读（整段一次性交给语音合成，有的浏览器读到十几秒会自己停）。
const sentences=(text:string)=>text.replace(/\n+/g,' ').match(/[^.!?]+[.!?]+["”’)]*|[^.!?]+$/g)?.map(s=>s.trim()).filter(Boolean)??[];
function sayAll(parts:string[],rate:number,token:{current:number},onEach:(i:number|null)=>void){const my=++token.current;
 const step=(i:number)=>{if(my!==token.current)return;if(i>=parts.length){onEach(null);return}onEach(i);sayEnglish(parts[i],rate,()=>setTimeout(()=>step(i+1),250))};step(0)}

// 阅读短文：英文连成段落显示，点任意一句单独听；可以朗读全文、慢速朗读，读不懂时打开逐句中文对照。
// phrases 里 p 为 true 的句子另起一段。
function Passage({phrases}:{phrases:Phrase[]}){const L=useL();
 const [zh,setZh]=useState(false),[active,setActive]=useState<number|null>(null),run=useRef(0);
 useEffect(()=>()=>{run.current++;stopSaying()},[]);
 const stop=()=>{run.current++;stopSaying();setActive(null)};
 const readAll=(rate:number)=>{stopSaying();sayAll(phrases.map(p=>p.en),rate,run,setActive)};
 const readOne=(i:number)=>{stop();setActive(i);const my=run.current;sayEnglish(phrases[i].en,0.85,()=>{if(my===run.current)setActive(null)})};
 const paras:number[][]=[];phrases.forEach((p,i)=>{if(!paras.length||p.p)paras.push([]);paras[paras.length-1].push(i)});
 return <div className="sd-passage">
  <div className="sd-bar"><button type="button" className="button secondary" onClick={active!==null?stop:()=>readAll(0.9)}>{active!==null?<><Square size={15}/>{L('停止','Stop')}</>:<><Play size={15}/>{L('朗读全文','Read aloud')}</>}</button>
   <button type="button" className="button secondary" onClick={()=>readAll(0.7)}><Turtle size={15}/>{L('慢速朗读','Slowly')}</button>
   <button type="button" className={'button secondary'+(zh?' on':'')} onClick={()=>setZh(!zh)}><Languages size={15}/>{zh?L('隐藏中文','Hide Chinese'):L('逐句中文对照','Show Chinese')}</button></div>
  <div className={'sd-paper'+(zh?' zh':'')} lang="en">{paras.map((idx,k)=><p key={k}>{idx.map(i=><Fragment key={i}><span className={'sd-sent'+(active===i?' active':'')} onClick={()=>readOne(i)}>{phrases[i].en}</span>{zh&&<span className="sd-zh" lang="zh">{phrases[i].zh}</span>}{' '}</Fragment>)}</p>)}</div>
  <p className="sd-hint">{L('先不看中文完整读一遍，抓大意；再点不懂的句子单独听、打开中文对照。','Read it once without Chinese for the gist, then tap hard sentences to hear them and check the translation.')}</p>
 </div>}

// 阅读题的原文：显示在题干下面，可以朗读。
export function ReadingPassage({text}:{text:string}){const L=useL();const [on,setOn]=useState<number|null>(null),run=useRef(0);
 useEffect(()=>()=>{run.current++;stopSaying()},[]);
 return <div className="sd-passage quiz"><div className="sd-paper" lang="en">{text.split(/\n+/).filter(Boolean).map((t,i)=><p key={i}>{t}</p>)}</div>
  <div className="sd-bar"><button type="button" className="button secondary" onClick={()=>{if(on!==null){run.current++;stopSaying();setOn(null)}else sayAll(sentences(text),0.9,run,setOn)}}>{on!==null?<><Square size={15}/>{L('停止','Stop')}</>:<><Volume2 size={15}/>{L('朗读原文','Read aloud')}</>}</button></div></div>}

// 卡片里的英文素材：按 kind 分成连续的几组，read 是阅读短文，word 是单词表，其余是句子（或对话）。
export default function PhraseList({phrases}:{phrases:Phrase[]}){
 const groups:Phrase[][]=[];phrases.forEach((p,i)=>{if(!i||(p.kind??'say')!==(phrases[i-1].kind??'say'))groups.push([]);groups[groups.length-1].push(p)});
 return <>{groups.map((g,k)=>g[0].kind==='read'?<Passage key={k} phrases={g}/>:<SentenceList key={k} phrases={g} words={g[0].kind==='word'}/>)}</>}
