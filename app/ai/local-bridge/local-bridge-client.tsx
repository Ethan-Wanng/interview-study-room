'use client';
import SiteHeader from '../../components/site-header';
import {useI18n} from '../../components/i18n';
import {LocalBridgeSection} from '../ai-settings';
import {LocalBridgeGuideContent} from '../local-bridge-guide';
import '../ai.css';

export default function LocalBridgeClient({username}:{username:string}){
 const {locale}=useI18n();
 const L=(zh:string,en:string)=>locale==='en'?en:zh;
 return (
  <div className="ai-shell">
   <SiteHeader active="learn" username={username}/>
   <main className="ai-main lb-page-main">
    <h1 className="lb-page-title">{L('本地客户端连接教程','Local Client Guide')}</h1>
    <div className="lb-page-grid">
     <div className="ai-card lb-guide-card">
      <LocalBridgeGuideContent L={L}/>
     </div>
     <div className="ai-card lb-config-card">
      <LocalBridgeSection L={L} hideGuideBtn/>
     </div>
    </div>
   </main>
  </div>
 );
}
