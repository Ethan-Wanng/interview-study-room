// 很轻的中文 / 英文文本匹配：站内搜索、题目找对应的学习卡片都用它。浏览器和服务端都能用。
// 英文按单词比，中文按相邻两个字（二元组）比；标题里出现的词比正文里的更重要。

// 口语化提问里没有检索价值的词，先去掉再匹配（比如“CoT 在哪里可以学”只留下 CoT）。
const FILLER=['在哪一关','哪一关','这一关','哪一张','第几关','在哪里','在哪儿','哪里','哪儿','在哪','哪一关','哪张卡片','可以','能不能','找到','找一下','查找','搜索','有关','相关','关于','题目','习题','练习题','学习卡片','卡片','知识点','关键字','关键词','内容','请问','有没有','什么','怎么','如何','为什么','一下','帮我','我想','想要','想学','想练','讲过','讲到','告诉我','链接','地方','这个','那个','一些','哪些','的题','的','吗','呢','吧','呀'].sort((a,b)=>b.length-a.length);
const CJK=/[㐀-鿿]/;

export type Terms={words:string[];grams:string[];runs:string[]};
// 把一句话拆成：英文 / 数字单词、中文连续片段，以及中文片段里的二元组。natural 为 true 时先去掉口语里的虚词。
export function termsOf(text:string,natural=false):Terms{
 let s=text.toLowerCase().normalize('NFKC');
 if(natural)for(const w of FILLER)s=s.split(w).join(' ');
 const words=[...new Set(s.match(/[a-z0-9][a-z0-9.+#_-]*/g)??[])].filter(w=>w.length>1);
 const runs=[...new Set(s.match(/[㐀-鿿]+/g)??[])];
 const grams=new Set<string>();
 for(const r of runs){if(r.length===1){grams.add(r);continue}for(let i=0;i<r.length-1;i++)grams.add(r.slice(i,i+2))}
 return {words,grams:[...grams],runs};
}
const hasWord=(hay:string,w:string)=>{let i=hay.indexOf(w);while(i>=0){const a=hay[i-1],b=hay[i+w.length];if(!(a&&/[a-z0-9]/.test(a))&&!(b&&/[a-z0-9]/.test(b)))return true;i=hay.indexOf(w,i+1)}return false};

// 相关度：title、body 都要先转成小写。英文单词整词命中分最高；中文整段命中有额外加分。
export function scoreText(t:Terms,title:string,body:string):number{
 let n=0;
 for(const w of t.words){if(hasWord(title,w))n+=12;else if(title.includes(w))n+=6;if(hasWord(body,w))n+=5;else if(body.includes(w))n+=2}
 for(const r of t.runs){if(r.length<2)continue;if(title.includes(r))n+=4*r.length;if(body.includes(r))n+=1.5*r.length}
 for(const g of t.grams){if(title.includes(g))n+=2;if(body.includes(g))n+=0.5}
 return n;
}
// 每个空格分开的关键词都必须出现（搜索框用的严格匹配）。
export const containsAll=(hay:string,query:string)=>query.toLowerCase().split(/\s+/).filter(Boolean).every(tok=>hay.includes(tok));
export const hasCjk=(s:string)=>CJK.test(s);

// 给一道题找它所在关卡里最相关的学习卡片：返回卡片序号（从 0 开始），没有明显相关的返回 -1。
export function rankCard(lessons:{title:string;body:string;code?:string}[],text:string):{index:number;score:number}{
 const t=termsOf(text);let best=-1,top=0;
 lessons.forEach((l,i)=>{const s=scoreText(t,l.title.toLowerCase(),(l.body+'\n'+(l.code??'')).toLowerCase());if(s>top){top=s;best=i}});
 return top>=6?{index:best,score:top}:{index:-1,score:0};
}
export const bestCard=(lessons:{title:string;body:string;code?:string}[],text:string)=>rankCard(lessons,text).index;
