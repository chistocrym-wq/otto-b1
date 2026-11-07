/** A single playback source. Never uses autoplay, loop or browser TTS. */
export type PrivateAssetProvider=(path:string)=>Promise<Blob>;
export class SingleAudioPlayer {
  private player: HTMLAudioElement | null = null;
  private objectUrl: string | null = null;
  private request=0;
  constructor(private readonly createAudio:()=>HTMLAudioElement=()=>new Audio()){}
  async play(assetPath:string,provider:PrivateAssetProvider,onEnd?:()=>void):Promise<void>{
    this.stop();
    const request=++this.request;
    const blob=await provider(assetPath);
    if(request!==this.request)return;
    const url=URL.createObjectURL(blob);
    const audio=this.createAudio();
    this.player=audio;this.objectUrl=url;
    audio.autoplay=false;audio.loop=false;
    audio.src=url;
    audio.addEventListener('ended',()=>{if(this.player===audio){this.stop();onEnd?.();}},{once:true});
    try{await audio.play();}catch(err){this.stop();throw err;}
  }
  stop(){
    this.request++;
    if(this.player){this.player.pause();this.player.removeAttribute('src');this.player.load();this.player=null;}
    if(this.objectUrl){URL.revokeObjectURL(this.objectUrl);this.objectUrl=null;}
  }
  dispose(){this.stop();}
}
