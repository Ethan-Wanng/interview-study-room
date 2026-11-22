'use client';
import {useRef,type ReactNode,type TouchEvent} from 'react';
import {ChevronLeft,ChevronRight} from 'lucide-react';

const NO_SWIPE='pre,code,input[type=range],.lc-slider';

/**
 * Wraps a question or lesson card with full-height left/right hover-highlight click strips
 * on desktop and horizontal touch-swipe navigation on mobile.
 */
export default function CardSideNav({
 children,
 className='',
 onPrev,
 onNext,
 prevLabel='上一题',
 nextLabel='下一题',
 nextPrimary=false,
 showArrows=true,
}:{
 children:ReactNode;
 className?:string;
 onPrev?:()=>void;
 onNext?:()=>void;
 prevLabel?:string;
 nextLabel?:string;
 nextPrimary?:boolean;
 showArrows?:boolean;
}){
 const touchRef=useRef<{x:number;y:number}|null>(null);
 const onTouchStart=(e:TouchEvent<HTMLDivElement>)=>{
  if(e.touches.length!==1){touchRef.current=null;return;}
  const t=e.target as HTMLElement|null;
  if(t?.closest(NO_SWIPE)){touchRef.current=null;return;}
  const active=document.activeElement;
  if(active&&t&&(active.tagName==='TEXTAREA'||active.tagName==='INPUT')&&active.contains(t)){
   touchRef.current=null;
   return;
  }
  touchRef.current={x:e.touches[0].clientX,y:e.touches[0].clientY};
 };
 const onTouchEnd=(e:TouchEvent<HTMLDivElement>)=>{
  const start=touchRef.current;
  touchRef.current=null;
  if(!start||!e.changedTouches.length)return;
  const dx=e.changedTouches[0].clientX-start.x;
  const dy=e.changedTouches[0].clientY-start.y;
  if(Math.abs(dx)<48||Math.abs(dx)<Math.abs(dy)*1.4)return;
  if(dx<0)onNext?.();
  else onPrev?.();
 };
 return <div className={'side-nav-stage'+(className?' '+className:'')} onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
  {showArrows&&<button
   type="button"
   className="side-nav-btn left"
   disabled={!onPrev}
   onClick={onPrev}
   title={prevLabel}
   aria-label={prevLabel}
  >
   <ChevronLeft size={22}/>
  </button>}
  {children}
  {showArrows&&<button
   type="button"
   className={'side-nav-btn right'+(nextPrimary?' ready':'')}
   disabled={!onNext}
   onClick={onNext}
   title={nextLabel}
   aria-label={nextLabel}
  >
   <ChevronRight size={22}/>
  </button>}
 </div>;
}
