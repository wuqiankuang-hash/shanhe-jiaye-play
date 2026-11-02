// An assembled environment: untouched painting, fixed repairs, separate alpha leaves,
// then water/steam effects. No sampling offsets or whole-scene deformation.
const MANIFEST='assets/environment-v13/manifest.json';
export function createBackgroundMotion(canvas){
 const ctx=canvas.getContext('2d',{alpha:true}),cache=new Map();
 let manifestPromise=null,config=null,pieces=[],scene='',request=0,raf=0,last=0,time=0,frames=0,reduced=false;
 canvas.width=1672;canvas.height=941;
 function load(url){
  if(!cache.has(url)){
   const image=new Image();image.decoding='async';image.src=url;
   const promise=image.decode().then(()=>image);cache.set(url,promise);promise.catch(()=>cache.delete(url));
  }return cache.get(url);
 }
 function manifest(){if(!manifestPromise)manifestPromise=fetch(MANIFEST).then(r=>{if(!r.ok)throw Error('Environment manifest unavailable');return r.json();}).catch(e=>{manifestPromise=null;throw e;});return manifestPromise;}
 function clear(){ctx.clearRect(0,0,canvas.width,canvas.height);}
 function polygon(points){ctx.beginPath();points.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.closePath();}
 function drawWater(){
  for(const points of config.water||[]){
   ctx.save();polygon(points);ctx.clip();
   const xs=points.map(p=>p[0]),ys=points.map(p=>p[1]),left=Math.min(...xs),top=Math.min(...ys),width=Math.max(...xs)-left,height=Math.max(...ys)-top;
   const narrow=width<150;
   for(let i=0;i<(narrow?10:27);i++){
    const phase=(time*(narrow?.34:.13)+i*.173)%1;
    const x=left+width*((i*.618)%1)+Math.sin(time*.7+i)*3;
    const y=top+height*((i*.381+phase*.17)%1);
    ctx.strokeStyle=`rgba(216,237,219,${Math.sin(phase*Math.PI)*.28})`;ctx.lineWidth=narrow?1.4:.9;
    ctx.beginPath();ctx.ellipse(x,y,4+phase*(narrow?7:23),1+phase*3,0,0,Math.PI*2);ctx.stroke();
   }
   ctx.restore();
  }
 }
 function drawSteam(){
  if(!config.smoke?.length)return;
  const [x,y]=config.smoke;
  for(let i=0;i<9;i++){
   const age=(time*.20+i/9)%1,px=x+Math.sin(age*5+time*.25)*10+age*18,py=y-age*118;
   const radius=8+age*20,opacity=Math.sin(age*Math.PI)*.21;
   const gradient=ctx.createRadialGradient(px,py,0,px,py,radius);gradient.addColorStop(0,`rgba(245,243,226,${opacity})`);gradient.addColorStop(1,'rgba(245,243,226,0)');
   ctx.fillStyle=gradient;ctx.fillRect(px-radius,py-radius,radius*2,radius*2);
  }
 }
 function paint(animated){
  clear();if(!config)return;
  // Erase only the original extracted leaf pixels. Underlays are fixed assets;
  // no house, trunk, path or rock pixels enter a moving texture.
  for(const p of pieces){const [x,y]=p.rect;ctx.drawImage(p.underlayImage,x,y);}
  for(const p of pieces){
   const [x,y]=p.rect,[ax,ay]=p.pivot;
   const angle=animated?(Math.sin(time*1.25+p.phase)*.009+Math.sin(time*.71+p.phase)*.003):0;
   ctx.save();ctx.translate(x+ax,y+ay);ctx.rotate(angle);ctx.drawImage(p.image,-ax,-ay);ctx.restore();
  }
  if(animated){drawWater();drawSteam();}
 }
 function frame(now){
  raf=0;if(reduced||document.hidden||!config)return;
  if(now-last>=40){time+=Math.min(.08,(now-last)/1000||.04);last=now;paint(true);canvas.dataset.frames=String(++frames);}
  raf=requestAnimationFrame(frame);
 }
 function update(){
  cancelAnimationFrame(raf);raf=0;canvas.style.visibility=reduced?'hidden':'';
  if(reduced){clear();return;}
  if(!document.hidden&&config&&(config.water?.length||config.smoke?.length)){last=performance.now();raf=requestAnimationFrame(frame);}else if(config){clear();}
 }
 document.addEventListener('visibilitychange',update);
 return {
  async setScene(id){
   const token=++request;scene=id;config=null;pieces=[];clear();cancelAnimationFrame(raf);raf=0;time=0;frames=0;
   canvas.dataset.scene=id;canvas.dataset.mode='loading-separated-assets';
   try{
    const data=await manifest(),next=data.scenes[id];if(!next)throw Error('Unknown environment');
    // Draft cutouts failed seam review. Keep the painting fixed until the complete asset assembly is approved.
    const loaded=[];
    if(token!==request)return;
    config=next;pieces=loaded;canvas.dataset.mode='fixed-structure-effects';canvas.dataset.pieces=String(pieces.length);update();
   }catch{if(token===request){clear();canvas.dataset.mode='static-fallback';}}
  },
  setReduced(value){reduced=value;update();},getTime:()=>time,
  // Deterministic poses for screenshot QA; never alters the camera or save data.
  inspectPose(t){if(reduced||!config)return false;cancelAnimationFrame(raf);raf=0;time=t;paint(true);return true;}
 };
}
