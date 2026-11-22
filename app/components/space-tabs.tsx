'use client';
import type {CSSProperties,ReactNode} from 'react';
import {ChevronDown,ChevronUp,Sparkles} from 'lucide-react';

export type SpaceTabItem={
 id:string;
 title:string;
 icon?:string;
 countText:string;
 progressText:string;
 allDone?:boolean;
};

// 分类横向选项卡：技术、语言、项目同一行展示，点击在下方展开对应学科卡片，再点收起。
export default function SpaceTabs({
 items,
 active,
 onToggle,
 children,
}:{
 items:SpaceTabItem[];
 active:string|null;
 onToggle:(id:string)=>void;
 children:ReactNode;
}){
 return <div className="ai-tiers">
  <div className={'ai-tier-tabs'+(items.length<=3?' ai-tier-tabs-fit':'')} style={{'--tier-count':items.length} as CSSProperties}>
   {items.map(sp=>{
    const isOpen=active===sp.id;
    return <button
     key={sp.id}
     type="button"
     className={'ai-card ai-tier-tab'+(isOpen?' open':'')+(sp.allDone?' done':'')}
     aria-expanded={isOpen}
     onClick={()=>onToggle(sp.id)}
    >
     <span className="ai-tier-tab-top">
      <strong>{sp.icon?`${sp.icon} `:''}{sp.title}</strong>
      <span className="ai-tier-tab-arrow">{isOpen?<ChevronUp size={16}/>:<ChevronDown size={16}/>}</span>
     </span>
     <span className="ai-tier-tab-sub">
      <span>{sp.countText}</span>
      <em className={sp.allDone?'done':undefined}>{sp.allDone&&<Sparkles size={12}/>}{sp.progressText}</em>
     </span>
    </button>;
   })}
  </div>
  {children}
 </div>;
}
