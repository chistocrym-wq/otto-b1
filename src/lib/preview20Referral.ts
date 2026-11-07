import {v20ClientEnabled} from './v20ClientFeatures';
let captured=false;
export async function captureTeacherReferral(){
 if(captured||!v20ClientEnabled('referral'))return;
 captured=true;
 const code=new URLSearchParams(location.search).get('ref')||'';
 const mini=window.Telegram?.WebApp?.initData||'';
 try {
  if(mini&&new URLSearchParams(mini).get('start_param')?.startsWith('ref_')){
   await fetch('/api/teacher-referral',{method:'POST',credentials:'same-origin',headers:{'content-type':'application/json'},body:JSON.stringify({initData:mini})});
  }else if(/^OT-[A-Z2-9]{12}$/.test(code)){
   await fetch('/api/teacher-referral?code='+encodeURIComponent(code),{credentials:'same-origin',cache:'no-store'});
  }
 }catch{/* Non-blocking partner attribution. */}
}
