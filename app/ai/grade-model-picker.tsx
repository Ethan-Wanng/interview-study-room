'use client';
import {useEffect,useState} from 'react';
import {Brain,Cpu} from 'lucide-react';
import {useI18n} from '../components/i18n';
import {GRADE_MODELS,parseGradeModel,type GradeModelId} from '@/lib/grade-types';
import {getGradeThinkingSpec,parseThinkingLevel,THINKING_META} from '@/lib/thinking';
import {gradeInfo,setGradeCustomCache,useGradeModel,type GradeQuotaInfo} from './grade-client';
import {useModelThinkingLevel} from './thinking-pref';

let cachedCustom:Promise<GradeQuotaInfo|null>|null=null;
function loadCustomInfo():Promise<GradeQuotaInfo|null>{
 if(!cachedCustom)cachedCustom=gradeInfo().then(info=>{if(!info)cachedCustom=null;return info});
 return cachedCustom;
}

const PICKER_MODEL_LABEL:Record<Exclude<GradeModelId,'custom'>,[string,string]>={
 auto:['自动','Auto'],
 gemini:['Gemini 4','Gemini 4'],
 deepseek:['DeepSeek','DeepSeek'],
};

export default function GradeModelPicker({disabled=false}:{disabled?:boolean}){
 const {locale}=useI18n();
 const L=(zh:string,en:string)=>locale==='en'?en:zh;
 const lang=locale==='en'?'en':'zh';
 const [model,setModel]=useGradeModel();
 const [customInfo,setCustomInfo]=useState<{hasCustom:boolean;label:string;provider:string;model?:string}>({hasCustom:false,label:'',provider:''});

 useEffect(()=>{
  let alive=true;
  void loadCustomInfo().then(info=>{
   if(!alive)return;
   if(info?.custom&&info.provider){
    const lbl=[info.provider,info.model].filter(Boolean).join(' / ');
    setGradeCustomCache({provider:info.provider,model:info.model});
    setCustomInfo({hasCustom:true,label:lbl,provider:info.provider,model:info.model});
   }else{
    setGradeCustomCache(null);
    setCustomInfo({hasCustom:false,label:'',provider:''});
   }
  });
  return ()=>{alive=false};
 },[]);

 const effective:GradeModelId=model==='custom'&&!customInfo.hasCustom?'auto':model;
 const {scopeKey,spec}=getGradeThinkingSpec(effective,customInfo.hasCustom?{provider:customInfo.provider,model:customInfo.model}:null);
 const [thinking,setThinking]=useModelThinkingLevel(scopeKey,spec);
 const currentHint=effective==='custom'
  ?L(`使用你在「AI 设置」里绑定的专属模型（${customInfo.label||'自定义'}）进行评分`,`Grade with your custom model (${customInfo.label||'custom'})`)
  :(lang==='en'
   ?GRADE_MODELS.find(m=>m.id===effective)?.hintEn
   :GRADE_MODELS.find(m=>m.id===effective)?.hint)??'';
 const curMeta=THINKING_META[thinking];

 return (
  <>
   <label className="ai-grade-picker" title={`${currentHint}${lang==='en'?' · Independent from AI chat model':' · 与 AI 对话模型独立选择'}`}>
    <Cpu size={14} aria-hidden="true"/>
    <span className="ai-picker-lbl">{L('模型','Model')}</span>
    <select
     value={effective}
     disabled={disabled}
     aria-label={L('AI 评分模型','AI grading model')}
     onChange={e=>setModel(parseGradeModel(e.target.value))}
    >
     {GRADE_MODELS.map(m=>(
      <option key={m.id} value={m.id}>{lang==='en'?PICKER_MODEL_LABEL[m.id][1]:PICKER_MODEL_LABEL[m.id][0]}</option>
     ))}
     {customInfo.hasCustom&&<option value="custom">{L('我的 API','My API')}</option>}
    </select>
   </label>
   <label className="ai-grade-picker ai-think-picker" title={L(curMeta.hintZh,curMeta.hintEn)}>
    <Brain size={14} aria-hidden="true"/>
    <span className="ai-picker-lbl">{L('思考','Think')}</span>
    <select
     value={thinking}
     disabled={disabled||spec.levels.length<=1}
     aria-label={L('AI 思考强度','AI thinking strength')}
     onChange={e=>{const p=parseThinkingLevel(e.target.value);if(p!=='auto')setThinking(p)}}
    >
     {spec.levels.map(lv=>{
      const m=THINKING_META[lv];
      return (
       <option key={lv} value={lv}>
        {lang==='en'?m.shortEn:m.shortZh}
       </option>
      );
     })}
    </select>
   </label>
  </>
 );
}
