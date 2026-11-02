// Playback only: every displayed pose was generated offline. The browser never
// estimates motion, warps the character, or changes cycle speed.
// Stationary work uses one planted shoe/ankle layer; tools remain animated.
const actors=new Set(),assets=new Map();
let raf=0,lastTick=0;
const motionPreference=matchMedia('(prefers-reduced-motion: reduce)');
const reduced=()=>motionPreference.matches||document.body.classList.contains('reduced-motion');
const wake=()=>{if(!raf&&!document.hidden&&actors.size)raf=requestAnimationFrame(tick);};
const observer=new IntersectionObserver(entries=>{
 for(const entry of entries){for(const state of actors)if(state.actor===entry.target){state.visible=entry.isIntersecting;if(!entry.isIntersecting)state.actor.dataset.motionState='offscreen';break;}}
 wake();
});
const mutations=new MutationObserver(()=>{
 for(const state of actors){if(state.actor.isConnected)state.connected=true;else if(state.connected)dispose(state);}
 wake();
});
mutations.observe(document.documentElement,{childList:true,subtree:true,attributes:true,attributeFilter:['class']});
function pauseClock(){lastTick=0;wake();}
document.addEventListener('visibilitychange',pauseClock);
motionPreference.addEventListener('change',pauseClock);

async function loadImage(url){const image=new Image();image.src=url;await image.decode();return image;}
function assetUrl(url,manifest){
 // Both a manifest-relative filename and the site's existing assets/... form
 // are accepted. Absolute URLs remain absolute.
 return new URL(url,url.startsWith('assets/')?document.baseURI:manifest).href;
}
function validateMetadata(meta){
 const integer=value=>Number.isInteger(value)&&value>0;
 if(!integer(meta.frameWidth)||!integer(meta.frameHeight)||!integer(meta.totalFrames)||meta.totalFrames>256||!Array.isArray(meta.atlases)||!meta.atlases.length||meta.atlases.length>16)throw new Error('invalid motion metadata');
 const covered=new Uint8Array(meta.totalFrames);
 for(const atlas of meta.atlases){
  if(typeof atlas.url!=='string'||!integer(atlas.columns)||!integer(atlas.rows)||!Number.isInteger(atlas.start)||atlas.start<0||!integer(atlas.count)||atlas.count>atlas.columns*atlas.rows||atlas.start+atlas.count>meta.totalFrames)throw new Error('invalid motion atlas');
  for(let n=atlas.start;n<atlas.start+atlas.count;n++){if(covered[n])throw new Error('overlapping motion atlas');covered[n]=1;}
 }
 if(covered.some(value=>!value))throw new Error('incomplete motion sequence');
}
function loadAsset(manifest,fallback){
 const key=manifest+'|'+fallback;
 if(assets.has(key)){const hit=assets.get(key);assets.delete(key);assets.set(key,hit);return hit;}
 const pending=(async()=>{
  let warning;
  try{
   const response=await fetch(manifest,{cache:'no-cache'});if(!response.ok)throw new Error('motion metadata HTTP '+response.status);
   const meta=await response.json();validateMetadata(meta);
   const atlases=await Promise.all(meta.atlases.map(async atlas=>{
    const image=await loadImage(assetUrl(atlas.url,manifest));
    if(image.naturalWidth!==atlas.columns*meta.frameWidth||image.naturalHeight!==atlas.rows*meta.frameHeight)throw new Error('motion atlas dimensions do not match metadata');
    return {...atlas,image};
   }));
   return {...meta,atlases,mode:'precomputed-frames'};
  }catch(error){warning=String(error);}
  const image=await loadImage(fallback);
  if(image.naturalWidth%4||image.naturalHeight%2)throw new Error('invalid original painted atlas');
  return {frameWidth:image.naturalWidth/4,frameHeight:image.naturalHeight/2,totalFrames:8,atlases:[{image,columns:4,rows:2,start:0,count:8}],mode:'painted-8-fallback',warning};
 })();
 assets.set(key,pending);
 // Detached scenes release their canvases; at most two decoded sequences stay
 // cached. Current actors retain only the images they are actually displaying.
 while(assets.size>2)assets.delete(assets.keys().next().value);
 pending.catch(()=>{if(assets.get(key)===pending)assets.delete(key);});return pending;
}
function plantedFeet(asset){
 if(asset.plantedFeet)return asset.plantedFeet;
 const w=asset.frameWidth,h=asset.frameHeight;
 // The left 11–62% of each occupation cell contains the planted shoes;
 // right-hand tools, dirt, feed, stove and broom stay outside this mask.
 const x=Math.floor(w*.11),y=Math.floor(h*.82),width=Math.ceil(w*.51),height=h-y;
 const feather=Math.max(4,Math.round(h*.025));
 const patch=document.createElement('canvas');patch.width=width;patch.height=height;
 const p=patch.getContext('2d');
 const first=asset.atlases.find(a=>a.start===0);
 p.drawImage(first.image,0,0,w,h,-x,-y,w,h);
 const gradient=p.createLinearGradient(0,0,0,feather);gradient.addColorStop(0,'rgba(0,0,0,0)');gradient.addColorStop(1,'rgba(0,0,0,1)');
 p.globalCompositeOperation='destination-in';p.fillStyle=gradient;p.fillRect(0,0,width,height);
 return asset.plantedFeet={x,y,width,height,feather,patch};
}
function draw(state,frame){
 const {asset,ctx,canvas}=state;
 const atlas=asset.atlases.find(atlas=>frame>=atlas.start&&frame<atlas.start+atlas.count),local=frame-atlas.start;
 ctx.clearRect(0,0,canvas.width,canvas.height);
 ctx.drawImage(atlas.image,(local%atlas.columns)*asset.frameWidth,Math.floor(local/atlas.columns)*asset.frameHeight,asset.frameWidth,asset.frameHeight,0,0,canvas.width,canvas.height);
 const feet=plantedFeet(asset);
 // Erase the moving shoes before adding the fixed layer. A narrow ankle blend
 // connects the moving trousers without leaving a second pair of feet behind.
 ctx.save();ctx.globalCompositeOperation='destination-out';
 const ankle=ctx.createLinearGradient(0,feet.y,0,feet.y+feet.feather);ankle.addColorStop(0,'rgba(0,0,0,0)');ankle.addColorStop(1,'rgba(0,0,0,1)');
 ctx.fillStyle=ankle;ctx.fillRect(feet.x,feet.y,feet.width,feet.height);ctx.restore();
 ctx.drawImage(feet.patch,feet.x,feet.y);
 state.actor.dataset.footLock='planted';
 state.frame=frame;state.actor.dataset.motionFrame=String(frame);state.actor.dataset.motionRenderCount=String(++state.count);
}
function ready(state,asset){
 const canvas=document.createElement('canvas');canvas.className='work-motion-canvas';
 // Preserve complete native frame boundaries, aspect ratio and foot placement.
 canvas.width=asset.frameWidth;canvas.height=asset.frameHeight;canvas.setAttribute('aria-hidden','true');
 canvas.style.cssText='position:relative;inset:auto;display:block;width:100%;height:100%;pointer-events:none;z-index:auto;';
 const ctx=canvas.getContext('2d',{alpha:true});if(!ctx)throw new Error('canvas unavailable');
 state.asset=asset;state.canvas=canvas;state.ctx=ctx;
 state.duration=state.requestedDuration||(Number.isFinite(asset.duration)&&asset.duration>0?asset.duration:2800);
 state.actor.append(canvas);state.actor.style.backgroundImage='none';
 state.actor.dataset.motionMode=asset.mode;state.actor.dataset.motionTotalFrames=String(asset.totalFrames);
 state.actor.dataset.motionDuration=String(state.duration);state.actor.dataset.motionSourceFps=(asset.totalFrames*1000/state.duration).toFixed(2);
 if(asset.warning)state.actor.dataset.motionWarning=asset.warning;
 draw(state,0);state.actor.dataset.motionReady='true';wake();
}
function dispose(state){
 actors.delete(state);observer.unobserve(state.actor);state.canvas?.remove();
 // Clear actor-owned decoded-image and canvas references immediately.
 state.asset=null;state.ctx=null;state.canvas=null;state.actor.dataset.motionState='disposed';
 if(!actors.size){lastTick=0;}
}
function tick(now){
 raf=0;
 if(document.hidden){lastTick=0;for(const state of actors)state.actor.dataset.motionState='hidden';return;}
 if(lastTick&&now-lastTick<1000/30-1){wake();return;}
 const dt=lastTick?now-lastTick:0;lastTick=now;
 const isReduced=reduced();let running=0,needsNext=false;
 for(const state of actors){
  if(state.actor.isConnected)state.connected=true;else {if(state.connected)dispose(state);continue;}
  if(!state.asset)continue;
  if(isReduced){
   state.actor.dataset.motionState='reduced';state.elapsed=0;state.actor.dataset.motionPhase='0';
   if(state.frame!==0)draw(state,0);continue;
  }
  if(!state.visible){state.actor.dataset.motionState='offscreen';continue;}
  if(running>=2){state.actor.dataset.motionState='paused';continue;}
  running++;needsNext=true;state.actor.dataset.motionState='running';
  state.elapsed=(state.elapsed+dt)%state.duration;
  const phase=state.elapsed/state.duration,frame=Math.min(state.asset.totalFrames-1,Math.floor(phase*state.asset.totalFrames));
  state.actor.dataset.motionPhase=phase.toFixed(5);
  // Eight-painting fallback keeps its real original timing, never pretending to
  // be an interpolated 30 fps sequence. Precomputed playback samples at 30 fps.
  if(state.asset.mode==='precomputed-frames'||frame!==state.frame)draw(state,frame);
 }
 if(needsNext)wake();else lastTick=0;
}
export function attachWorkMotion(actor,{type,duration,url}={}){
 const manifest=new URL(url&&/\.json(?:[?#]|$)/i.test(url)?url:`assets/work/${type}-motion-v3.json`,document.baseURI).href;
 const fallback=new URL(url&&!/\.json(?:[?#]|$)/i.test(url)?url:`assets/work/${type}-v2.webp`,document.baseURI).href;
 const state={actor,connected:actor.isConnected,visible:true,requestedDuration:Number.isFinite(duration)&&duration>0?duration:null,duration:2800,elapsed:0,count:0,frame:0,asset:null};
 actors.add(state);observer.observe(actor);
 actor.dataset.motionMode='loading';actor.dataset.motionReady='false';actor.dataset.motionState='loading';
 actor.dataset.motionPhase='0';actor.dataset.motionFrame='0';actor.dataset.motionRenderCount='0';
 actor.style.animation='none';actor.style.backgroundPosition='0% 0%';
 loadAsset(manifest,fallback).then(asset=>{if(!actors.has(state))return;try{ready(state,asset);}catch(error){actor.dataset.motionMode='static-error';actor.dataset.motionWarning=String(error);}}).catch(error=>{if(!actors.has(state))return;actor.dataset.motionMode='static-load-error';actor.dataset.motionWarning=String(error);});
 wake();return ()=>dispose(state);
}
