'use client';
import {MessageSquarePlus} from 'lucide-react';
import {useI18n} from './i18n';

// 根据当前页面猜反馈属于哪个模块（和反馈页的模块下拉选项一致）。
function moduleOf(path:string){
 for(const id of ['go','backend','ai','frontend','english'])if(path.includes('/'+id))return id;
 if(path.startsWith('/playground'))return 'playground';
 if(path.startsWith('/stories'))return 'stories';
 if(path.startsWith('/about'))return 'about';
 if(path.startsWith('/interview'))return 'interview';
 if(path.startsWith('/practice'))return 'practice';
 return 'general';
}

// 顶栏「反馈」独立按钮：任何页面都能一键反馈，自动带上所在模块和页面地址。
export default function FeedbackFab(){
 const {locale}=useI18n(),L=(zh:string,en:string)=>locale==='en'?en:zh;
 const open=()=>{const p=window.location.pathname+window.location.search;window.open(`/feedback?type=bug&module=${moduleOf(p)}&page=${encodeURIComponent(p.slice(0,200))}`,'_blank','noopener')};
 return <button type="button" className="header-pill" onClick={open} title={L('遇到问题或有建议？点这里反馈','Found a problem or have an idea? Send feedback')} aria-label={L('反馈','Feedback')}><MessageSquarePlus size={16}/><span>{L('反馈','Feedback')}</span></button>;
}
