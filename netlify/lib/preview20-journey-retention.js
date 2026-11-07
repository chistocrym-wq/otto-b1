// Shared cleanup for site-wide, environment-separated journey stores.
// No user record is logged. Work is bounded to avoid scheduled-function timeouts.
export async function pruneExpiredJourneys(store,{now=Date.now(),maxScanned=1800}={}){
  let scanned=0,removed=0,failed=0;
  for await(const page of store.list({prefix:'visits/',paginate:true})){
    for(const blob of page.blobs){
      if(scanned>=maxScanned)return {scanned,removed,failed,truncated:true};
      scanned++;
      try{
        const meta=await store.getMetadata(blob.key,{consistency:'strong'});
        const expires=meta?.metadata?.expiresAt;
        if(Number.isFinite(expires)&&expires<=now){
          await store.delete(blob.key);
          removed++;
        }
      }catch{failed++;}
    }
  }
  return {scanned,removed,failed,truncated:false};
}
