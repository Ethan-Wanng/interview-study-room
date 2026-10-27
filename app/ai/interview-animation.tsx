'use client';
import {useState} from 'react';
import {Clapperboard} from 'lucide-react';
import {Dialog,DialogContent,DialogHeader,DialogTitle,DialogDescription} from '@/components/ui/dialog';
import {useI18n} from '../components/i18n';
import AnimationPlayer from './animations/player';
import type {Animation} from './animations/types';
import {animationGroup} from './animations/go-animated';

// “看动画讲解”按钮：点开时才加载面试题动画脚本，在弹窗里播放。
export default function InterviewAnimationButton({id,title}:{id:string;title:string}){const {locale}=useI18n(),L=(zh:string,en:string)=>locale==='en'?en:zh;
 const [open,setOpen]=useState(false),[anim,setAnim]=useState<Animation|null|undefined>(undefined);
 const group=animationGroup(id),load=()=>group==='ai'?import('./animations/stories').then(m=>m.interviewAnimationFor(id)):group==='db'?import('./animations/stories/db').then(m=>m.dbAnimationFor(id)):import('./animations/stories/go').then(m=>m.goAnimationFor(id));
 const show=()=>{setOpen(true);if(anim===undefined)load().then(setAnim).catch(()=>setAnim(null))};
 return <>
  <button type="button" className="iv-anim-button" onClick={show}><Clapperboard size={16}/>{L('看动画讲解','Watch the animation')}</button>
  <Dialog open={open} onOpenChange={setOpen}><DialogContent className="an-dialog">
   <DialogHeader><DialogTitle>{anim?.title??title}</DialogTitle><DialogDescription>{L('用一个小故事讲清这道面试题，小白也能看懂。','A short story that explains this interview question.')}</DialogDescription></DialogHeader>
   {anim===undefined?<p className="muted">{L('动画加载中…','Loading…')}</p>:anim?<AnimationPlayer key={anim.id} animation={anim}/>:<p className="muted">{L('这道题的动画正在制作中。','The animation for this question is on its way.')}</p>}
  </DialogContent></Dialog></>}
