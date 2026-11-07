import { useLayoutEffect } from 'react';

/**
 * Restore the visible learning pane's scroll position on screen navigation.
 * Does not touch progress, answers, saved Teil or independent overlay scroll.
 */
export function useResetLearningStepScroll(stepKey:string){
  useLayoutEffect(()=>{
    const app=document.querySelector<HTMLElement>('.otto-preview-learning-mode');
    if(!app)return;
    const reset=()=>{
      for(const selector of ['.otto-inner-screen','.otto-app-content']){
        const port=app.querySelector<HTMLElement>(selector);
        if(port&&port.scrollTop>0)port.scrollTop=0;
      }
    };
    reset();
    const frame=window.requestAnimationFrame(reset);
    return()=>window.cancelAnimationFrame(frame);
  },[stepKey]);
}
