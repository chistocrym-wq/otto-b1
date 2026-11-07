import { useEffect, useRef, useState, type CSSProperties, type PointerEvent, type ReactNode } from 'react';

type Point = {x:number;y:number};
type Props={storageKey:'learn'|'resume';onClick:()=>void;className?:string;children:ReactNode};
const KEY='otto-preview-mode-floating-v1:';
function clamp(value:number,min:number,max:number){return Math.max(min,Math.min(max,value))}
function withinScreen(p:Point,element:HTMLElement):Point{
  const w=element.offsetWidth||180,h=element.offsetHeight||48;
  let x=clamp(p.x,8,Math.max(8,window.innerWidth-w-8));
  let y=clamp(p.y,8,Math.max(8,window.innerHeight-h-112));
  // The existing Reference and smart-card quick actions share this edge.
  // Never leave the movable mode control on top of those controls.
  const obstacles=[...document.querySelectorAll<HTMLElement>('[aria-label="Быстрый доступ OTTO"],.otto-draggable-mode-action,.otto-dashboard-hero,.otto-bottom-nav')];
  for(const obstacle of obstacles){
    if(obstacle===element||!obstacle.getClientRects().length)continue;
    const r=obstacle.getBoundingClientRect();
    if(x<r.right+8&&x+w>r.left-8&&y<r.bottom+8&&y+h>r.top-8){
      const upper=r.top-h-10;
      const lower=r.bottom+10;
      const maxY=Math.max(8,window.innerHeight-h-112);
      // Keep saved coordinates when safe; relocate only if they cover content.
      // For the home banner prefer free space above it, outside the text and OTTO.
      const upperFits=upper>=8;
      const lowerFits=lower<=maxY;
      if(upperFits||lowerFits){
        y=clamp(upperFits?upper:lower,8,maxY);
      }else{
        // If both vertical sides are blocked, place the control beside the item.
        const left=r.left-w-10,right=r.right+10,maxX=Math.max(8,window.innerWidth-w-8);
        if(left>=8)x=left;
        else if(right<=maxX)x=right;
      }
    }
  }
  // Keep the saved floating position whenever it is clear. The compact
  // home dock is used only when the button covers actual dashboard content.
  if(element.classList.contains('otto-preview-quick-learn')&&document.querySelector('.otto-view-home .otto-dashboard-existing')){
    for(const section of document.querySelectorAll<HTMLElement>('.otto-dashboard-existing > section')){
      const r=section.getBoundingClientRect();
      if(x<r.right+6&&x+w>r.left-6&&y<r.bottom+6&&y+h>r.top-6){
        y=8;
        break;
      }
    }
  }
  return{x,y};
}
function initialPosition(key:Props['storageKey']):Point{
  if(typeof window==='undefined')return{x:16,y:80};
  try{const saved=JSON.parse(localStorage.getItem(KEY+key)||'null') as Point|null;
    if(saved&&Number.isFinite(saved.x)&&Number.isFinite(saved.y))return saved;
  }catch{}
  return{x:Math.max(8,window.innerWidth-205),y:key==='learn'?8:136};
}
export function DraggableModeAction({storageKey,onClick,className='',children}:Props){
 const[pos,setPos]=useState<Point>(()=>initialPosition(storageKey));
 const element=useRef<HTMLButtonElement|null>(null);
 const drag=useRef<{pointerId:number;start:Point;origin:Point;didMove:boolean}|null>(null);
 const ignoreClick=useRef(false);
 useEffect(()=>{
   const adjust=()=>{if(window.innerWidth>700)return;
     const el=element.current;
     if(el)setPos(prev=>{
       const next=withinScreen(prev,el);
       if(next.x===prev.x&&next.y===prev.y)return prev;
       try{localStorage.setItem(KEY+storageKey,JSON.stringify(next))}catch{}
       return next;
     });
   };
   adjust();
   // The dashboard banner can mount after the floating action. Re-check once
   // the route has rendered, and whenever its children are replaced.
   const frame=window.requestAnimationFrame(adjust);
   const main=document.querySelector('.otto-app-content');
   const observer=main?new MutationObserver(adjust):null;
   if(main)observer?.observe(main,{childList:true,subtree:true});
   window.addEventListener('resize',adjust);
   return()=>{window.cancelAnimationFrame(frame);observer?.disconnect();window.removeEventListener('resize',adjust)};
 },[storageKey]);
 const onPointerDown=(e:PointerEvent<HTMLButtonElement>)=>{
   if(window.innerWidth>700||e.button!==0)return;
   drag.current={pointerId:e.pointerId,start:{x:e.clientX,y:e.clientY},origin:pos,didMove:false};
   e.currentTarget.setPointerCapture(e.pointerId);
 };
 const onPointerMove=(e:PointerEvent<HTMLButtonElement>)=>{
   const current=drag.current;
   if(!current||e.pointerId!==current.pointerId)return;
   const dx=e.clientX-current.start.x,dy=e.clientY-current.start.y;
   if(Math.hypot(dx,dy)>7)current.didMove=true;
   if(current.didMove)setPos(withinScreen({x:current.origin.x+dx,y:current.origin.y+dy},e.currentTarget));
 };
 const endDrag=(e:PointerEvent<HTMLButtonElement>)=>{
   const current=drag.current;
   if(!current||e.pointerId!==current.pointerId)return;
   if(current.didMove){
     ignoreClick.current=true;
     window.setTimeout(()=>{ignoreClick.current=false},350);
     const updated=withinScreen({x:current.origin.x+e.clientX-current.start.x,y:current.origin.y+e.clientY-current.start.y},e.currentTarget);
     setPos(updated);
     try{localStorage.setItem(KEY+storageKey,JSON.stringify(updated))}catch{}
   }
   drag.current=null;
   if(e.currentTarget.hasPointerCapture(e.pointerId))e.currentTarget.releasePointerCapture(e.pointerId);
 };
 const style={'--otto-floating-x':pos.x+'px','--otto-floating-y':pos.y+'px'} as CSSProperties;
 return <button ref={element} type="button" className={'otto-draggable-mode-action '+className} style={style}
   onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={endDrag} onPointerCancel={endDrag}
   onClick={e=>{if(ignoreClick.current){e.preventDefault();ignoreClick.current=false;return}onClick()}}>
   {children}
 </button>;
}
