'use client';
import {useEffect,useState} from 'react';
import {MessageSquarePlus} from 'lucide-react';
import {useI18n} from './i18n';

// 根据当前页面猜反馈属于哪个模块（和反馈页的模块下拉选项一致）。
function moduleOf(path:string){
 for(const id of ['go','backend','ai','frontend','english'])if(path.includes('/'+id))return id;
 if(path.startsWith('/interview'))return 'interview';
 if(path.startsWith('/practice'))return 'practice';
 return 'general';
}

// 全站挂一个：左下角的「反馈」按钮，任何页面都能一键反馈，自动带上所在模块和页面地址。反馈页、登录页和后台不显示。
export default function FeedbackFab(){const {locale}=useI18n(),L=(zh:string,en:string)=>locale==='en'?en:zh;
 const [path,setPath]=useState('');
 useEffect(()=>{const sync=()=>setPath(window.location.pathname+window.location.search);sync();window.addEventListener('popstate',sync);return()=>window.removeEventListener('popstate',sync)},[]);
 if(!path||/^\/(feedback|login|admin)/.test(path))return null;
 const open=()=>{const p=window.location.pathname+window.location.search;window.open(`/feedback?type=bug&module=${moduleOf(p)}&page=${encodeURIComponent(p.slice(0,200))}`,'_blank','noopener')};
 return <button type="button" className="feedback-fab" onClick={open} title={L('遇到问题或有建议？点这里反馈','Found a problem or have an idea? Send feedback')} aria-label={L('反馈','Feedback')}><MessageSquarePlus size={17}/><span>{L('反馈','Feedback')}</span></button>}
