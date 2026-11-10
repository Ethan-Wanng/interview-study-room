import {sessionUser} from '@/lib/site-auth';
import {studyCatalog} from '@/db/catalog';
import {searchSite,type SearchKind} from '@/lib/site-search';

export const dynamic='force-dynamic';
const kinds:SearchKind[]=['card','question','interview'];

// 全站搜索：GET /api/search?q=关键词&kind=card|question|interview（可省略）。返回学习卡片、题目和面试题，每条带可以直接打开的链接。
export async function GET(req:Request){
 const user=await sessionUser(req.headers).catch(()=>null);
 if(!user)return Response.json({error:'auth',message:'请重新登录网站。'},{status:401});
 const url=new URL(req.url),q=(url.searchParams.get('q')??'').trim().slice(0,100),kind=url.searchParams.get('kind') as SearchKind|null;
 if(!q)return Response.json({hits:[],counts:{card:0,question:0,interview:0}});
 const bank=await studyCatalog().then(b=>b.questions).catch(()=>[]);
 const all=searchSite(q,bank,{limit:200});
 const counts=Object.fromEntries(kinds.map(k=>[k,all.filter(h=>h.kind===k).length]));
 const hits=(kind&&kinds.includes(kind)?all.filter(h=>h.kind===kind):all).slice(0,40);
 return Response.json({hits,counts},{headers:{'Cache-Control':'no-store'}});
}
