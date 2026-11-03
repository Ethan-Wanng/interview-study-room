// 英语词库：按阶段分四本词书，从最常用的词开始，一路到雅思学术词汇。
// 每本词书是一段文本，每行一个词：英文|词性|中文意思（多个意思用“；”隔开）。同一个词只收在第一次出现的那本里。
// 词性缩写：n. 名词 · v. 动词 · adj. 形容词 · adv. 副词 · prep. 介词 · conj. 连词 · pron. 代词 · num. 数词 · art. 冠词 · int. 感叹词 · phr. 短语。
import {a1Words} from './a1';
import {a2Words} from './a2';
import {b1Words} from './b1';
import {ieltsWords} from './ielts';

export type Word={en:string;pos:string;zh:string;book:string};
export type WordBook={id:string;name:string;nameEn:string;level:string;summary:string;words:Word[]};

// 同一个词（不分大小写）在前面的书里出现过就跳过，保证每个词只背一次（scripts/check-english-words.mjs 会列出重复）。
const seen=new Set<string>();
const parse=(book:string,raw:string):Word[]=>raw.split('\n').map(l=>l.trim()).filter(l=>l.includes('|')).map(l=>{const [en,pos,zh]=l.split('|').map(s=>s.trim());return {en,pos,zh,book}})
 .filter(w=>{const k=w.en.toLowerCase();if(seen.has(k))return false;seen.add(k);return true});

export const wordBooks:WordBook[]=[
 {id:'a1',name:'入门核心词',nameEn:'A1 core',level:'A1',summary:'最常用的基础词：代词、数字、家人、身体、吃穿住行。认识它们，日常英语里一半以上的词就都认识了。',words:parse('a1',a1Words)},
 {id:'a2',name:'基础生活词',nameEn:'A2 everyday',level:'A2',summary:'工作、学习、购物、旅行、健康、感受等生活场景的常用词，能读懂简单的邮件和通知。',words:parse('a2',a2Words)},
 {id:'b1',name:'进阶表达词',nameEn:'B1 intermediate',level:'B1',summary:'表达观点、描述经历、讨论社会话题需要的词，能看懂一般新闻和文章的大意。',words:parse('b1',b1Words)},
 {id:'ielts',name:'雅思核心词',nameEn:'IELTS core',level:'B2+',summary:'雅思阅读、听力、写作和口语的高频学术词与话题词，冲刺 6～7 分必备。',words:parse('ielts',ieltsWords)},
];
export const allWords=wordBooks.flatMap(b=>b.words);
