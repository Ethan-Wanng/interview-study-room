'use client';
import '../../../ai/ai.css';
import './words.css';
import {useEffect,useState} from 'react';
import {ArrowLeft,Check,Gauge,Headphones,Library,Play,Trophy} from 'lucide-react';
import {Progress} from '@/components/ui/progress';
import {useI18n} from '../../../components/i18n';
import {TitleGear} from '../../../components/title-tip';


import SiteHeader from '../../../components/site-header';
import {allWords,wordBooks} from '@/content/english-words';
import {answer,isDue,KNOWN,loadStore,MASTERED,saveStore,storeKey,today,type Store} from './srs';
import WordQuestion,{makeItem,shuffle,type WordItem} from './word-question';
import WordBrowser from './word-browser';

type View={kind:'home'}|{kind:'study';items:WordItem[];index:number;right:number;wrong:number}|{kind:'done';right:number;wrong:number}
 |{kind:'test';items:WordItem[];index:number;results:boolean[]}|{kind:'tested';size:number;rates:number[];book:string}|{kind:'browse';book:string};
const byEn=new Map(allWords.map(w=>[w.en,w])),bookOf=(id:string)=>wordBooks.find(b=>b.id===id)??wordBooks[0];
const TEST_PER_BOOK=10;

// 背单词：每天复习到期的词 + 学一批新词（间隔重复），可以测词汇量、浏览词书。进度保存在本浏览器。
export default function WordsClient({username}:{username:string}){const {locale}=useI18n(),L=(zh:string,en:string)=>locale==='en'?en:zh;
 const [store,setStore]=useState<Store|null>(null),[view,setView]=useState<View>({kind:'home'});
 useEffect(()=>{const id=setTimeout(()=>setStore(loadStore(username)));
  // 云同步从服务器取回了更新的单词进度时重新读取。
  const onStorage=(e:StorageEvent)=>{if(e.key===storeKey(username))setStore(loadStore(username))};window.addEventListener('storage',onStorage);
  return()=>{clearTimeout(id);window.removeEventListener('storage',onStorage)}},[username]);
 useEffect(()=>{window.scrollTo({top:0})},[view.kind]);
 const update=(f:(s:Store)=>Store)=>setStore(s=>{if(!s)return s;const next=f(s);saveStore(username,next);return next});
 const header=<SiteHeader active="learn" username={username}/>;
 const shell=(body:React.ReactNode)=><div className="ai-shell">{header}<main className="ai-main">{body}</main></div>;
 if(!store)return shell(<p className="muted">{L('加载中…','Loading…')}</p>);

 const cards=Object.entries(store.cards),known=cards.filter(([,c])=>c.b>=KNOWN).length,mastered=cards.filter(([,c])=>c.b>=MASTERED).length;
 const due=cards.filter(([en,c])=>isDue(c)&&byEn.has(en)).sort((a,b)=>a[1].d-b[1].d).map(([en])=>byEn.get(en)!);
 const book=bookOf(store.book),fresh=book.words.filter(w=>!store.cards[w.en]),newLeft=Math.max(0,store.perDay-store.newToday);
 const back=<button type="button" className="ai-back" onClick={()=>setView({kind:'home'})}><ArrowLeft size={16}/>{L('返回背单词','Back')}</button>;

 // 今天的学习：先复习到期的词（最多 150 个），再学新词；答错的词过几个之后再出现一次。
 const startStudy=()=>{const items=[...due.slice(0,150),...fresh.slice(0,newLeft)].map(w=>makeItem(w,bookOf(w.book).words));if(items.length)setView({kind:'study',items,index:0,right:0,wrong:0})};
 const startTest=()=>{const items=wordBooks.flatMap(b=>shuffle(b.words).slice(0,TEST_PER_BOOK).map(w=>makeItem(w,b.words)));setView({kind:'test',items,index:0,results:[]})};

 if(view.kind==='study'){const item=view.items[view.index];
  const onAnswer=(right:boolean)=>{const en=item.word.en,isNew=!store.cards[en];
   update(s=>({...s,newToday:s.newToday+(isNew?1:0),cards:{...s.cards,[en]:answer(s.cards[en],right)}}));
   const later=view.items.slice(view.index+1).some(x=>x.word.en===en),times=view.items.filter(x=>x.word.en===en).length,items=right||later||times>=3?view.items:[...view.items.slice(0,view.index+5),makeItem(item.word,bookOf(item.word.book).words),...view.items.slice(view.index+5)];
   setView({...view,items,right:view.right+(right?1:0),wrong:view.wrong+(right?0:1)})};
  const onNext=()=>setView(v=>v.kind!=='study'?v:v.index+1<v.items.length?{...v,index:v.index+1}:{kind:'done',right:v.right,wrong:v.wrong});
  return shell(<>{back}<div className="ai-quiz-head"><span className="eyebrow">{L('今日背单词','Today’s words')} · {store.listen?L('听音模式','Listening mode'):L('看词选义','Pick the meaning')}</span><span>{view.index+1} / {view.items.length}</span></div><Progress value={view.index/view.items.length*100}/>
   <WordQuestion key={view.index} item={item} listen={store.listen} again onAnswer={onAnswer} onNext={onNext}/></>)}

 if(view.kind==='done')return shell(<section className="ai-card ai-result"><Trophy size={40}/><h1>{L('今天的单词完成了！','Done for today!')}</h1>
  <p className="ai-score">{view.right} / {view.right+view.wrong}<small>{L('答对','correct')}</small></p>
  <p>{L(`已认识 ${known} 个词，已掌握 ${mastered} 个`,`${known} known · ${mastered} mastered`)}</p>
  <div className="ai-result-actions"><button type="button" className="button primary" onClick={()=>setView({kind:'home'})}>{L('返回背单词','Back')}</button><a className="button secondary" href="/learn/english">{L('去学英语关卡','Go to the lessons')}</a></div></section>);

 if(view.kind==='test'){const item=view.items[view.index];
  const onAnswer=(right:boolean)=>setView({...view,results:[...view.results,right]});
  const onNext=()=>setView(v=>{if(v.kind!=='test')return v;if(v.index+1<v.items.length)return {...v,index:v.index+1};
   // 每本书按答对率估算认识的词数，扣掉四选一蒙对的概率；答对的样本词直接记为“认识”。推荐从第一本答对率低于 80% 的书开始。
   const rates=wordBooks.map((_,k)=>{const r=v.results.slice(k*TEST_PER_BOOK,(k+1)*TEST_PER_BOOK);return r.filter(Boolean).length/(r.length||1)});
   const size=Math.round(wordBooks.reduce((n,b,k)=>n+b.words.length*Math.max(0,(rates[k]-0.25)/0.75),0));
   const start=wordBooks.find((_,k)=>rates[k]<0.8)?.id??wordBooks[wordBooks.length-1].id;
   update(s=>{const cards={...s.cards};v.items.forEach((it,i)=>{if(v.results[i]&&!cards[it.word.en])cards[it.word.en]={b:3,d:today()+4,n:1,w:0}});return {...s,cards,book:start,estimate:{size,day:today()}}});
   return {kind:'tested',size,rates,book:start}});
  return shell(<>{back}<div className="ai-quiz-head"><span className="eyebrow">{L('测一测词汇量','Vocabulary test')} · {bookOf(item.word.book).name}</span><span>{view.index+1} / {view.items.length}</span></div><Progress value={view.index/view.items.length*100}/>
   <WordQuestion key={view.index} item={item} listen={false} onAnswer={onAnswer} onNext={onNext}/></>)}

 if(view.kind==='tested')return shell(<section className="ai-card ai-result"><Gauge size={40}/><h1>{L(`估计词汇量：约 ${view.size} 词`,`Estimated vocabulary: about ${view.size} words`)}</h1>
  <p className="muted">{L('按本站四本词书（共 '+allWords.length+' 词）抽样估算，四选一已扣除蒙对的概率。','Estimated from samples of the four books on this site, corrected for guessing.')}</p>
  <ul className="lazy-score">{wordBooks.map((b,k)=><li key={b.id}><span>{b.level} · {b.name}</span><b>{Math.round(view.rates[k]*100)}%</b></li>)}</ul>
  <p>{L(`推荐词书：${bookOf(view.book).name}`,`Recommended: ${bookOf(view.book).nameEn}`)}</p>
  <div className="ai-result-actions"><button type="button" className="button primary" onClick={()=>setView({kind:'home'})}>{L('开始背单词','Start')}</button></div></section>);

 if(view.kind==='browse'){const b=bookOf(view.book);
  return shell(<>{back}<div className="ai-title"><span className="eyebrow">{b.level} · {L('词书','Word book')}</span><h1>{b.name}</h1></div><WordBrowser book={b} store={store}/></>)}

 const todayCount=Math.min(due.length,150)+Math.min(fresh.length,newLeft);
 return shell(<>
  <a href="/learn/english" className="ai-back"><ArrowLeft size={16}/>{L('返回英语','Back to English')}</a>
  <div className="ai-title"><span className="eyebrow">ENGLISH · VOCABULARY</span><h1>{L('背单词：先把词汇量提上来','Build your vocabulary first')}<TitleGear active={store.listen||store.perDay!==20} label={L('背单词设置','Vocabulary settings')}><div className="wd-gear"><div className="wd-gear-row"><span>{L('每天新词','New words per day')}</span><div className="wd-gear-chips">{[10,20,30,50].map(n=><button key={n} type="button" className={'lazy-chip'+(store.perDay===n?' on':'')} onClick={()=>update(s=>({...s,perDay:n}))}>{store.perDay===n&&<Check size={14}/>}{n}</button>)}</div></div><div className="wd-gear-row"><button type="button" className={'lazy-chip'+(store.listen?' on':'')} aria-pressed={store.listen} onClick={()=>update(s=>({...s,listen:!s.listen}))}><Headphones size={14}/>{L('听音模式（先不看拼写）','Listening mode')}</button></div></div></TitleGear></h1></div>

  {!username&&<p className="visitor-banner">{L('游客模式 · 背单词进度只保存在当前浏览器','Guest mode · progress is saved in this browser only')}</p>}
  <section className="ai-card wd-stats">
   <div><strong>{store.estimate?L(`约 ${store.estimate.size}`,`~${store.estimate.size}`):'—'}</strong><span>{L('估计词汇量','Estimated size')}</span></div>
   <div><strong>{known}</strong><span>{L('已认识','Known')}</span></div>
   <div><strong>{mastered}</strong><span>{L('已掌握','Mastered')}</span></div>
   <div><strong>{due.length}</strong><span>{L('今天待复习','Due today')}</span></div>
  </section>
  <section className="ai-card wd-today">
   <div><h2>{L('今日任务','Today')}</h2><p>{todayCount?L(`复习 ${Math.min(due.length,150)} 个 + 新词 ${Math.min(fresh.length,newLeft)} 个（${book.name}）`,`${Math.min(due.length,150)} reviews + ${Math.min(fresh.length,newLeft)} new words`):L('今天的任务已完成，明天再来！也可以在下面把每天新词调多一点。','All done for today! You can raise the daily new-word count below.')}</p></div>
   <button type="button" className="button primary" disabled={!todayCount} onClick={startStudy}><Play size={16}/>{L('开始背单词','Start')}</button>
  </section>
  <h2 className="an-group">{L('词书（点“设为当前”切换新词来源）','Word books')}</h2>
  <div className="learn-subjects">{wordBooks.map(b=>{const n=b.words.filter(w=>(store.cards[w.en]?.b??-1)>=KNOWN).length,on=b.id===store.book;
   return <div key={b.id} className={'ai-card learn-subject wd-book'+(on?' on':'')}><span className="wd-level">{b.level}</span><strong>{b.name}</strong><span className="muted">{b.summary}</span>
    <Progress value={n/b.words.length*100}/><span className="learn-foot"><span>{L(`已认识 ${n} / ${b.words.length}`,`${n} / ${b.words.length} known`)}</span></span>
    <span className="wd-book-actions">{on?<em>{L('当前词书','Current')}</em>:<button type="button" className="button secondary" onClick={()=>update(s=>({...s,book:b.id}))}>{L('设为当前','Use this book')}</button>}<button type="button" className="button secondary" onClick={()=>setView({kind:'browse',book:b.id})}><Library size={15}/>{L('浏览','Browse')}</button></span></div>})}</div>
  <section className="ai-card wd-test"><div><h2>{L('测一测词汇量','Vocabulary size test')}</h2><p>{L(`${TEST_PER_BOOK*4} 词 · 约 3 分钟`,`${TEST_PER_BOOK*4} words · ~3 min`)}</p></div><button type="button" className="button secondary" onClick={startTest}><Gauge size={16}/>{L('开始测试','Start test')}</button></section>
 </>)}
