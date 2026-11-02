// Independent scene objects share the camera's native coordinate system.
export function createEnvironmentAssembly(surface){
 const layer=document.createElement('div');layer.className='assembled-environment';layer.setAttribute('aria-hidden','true');surface.append(layer);
 document.addEventListener('visibilitychange',()=>layer.classList.toggle('environment-paused',document.hidden));
 let prepared=null;
 async function prepare(id){
  if(id!=='home')return {id,fragment:null,count:0};
  if(!prepared)prepared=(async()=>{
   const [manifest,layout]=await Promise.all(['manifest.json','home-layout.json'].map(async name=>{const r=await fetch('assets/environment-library-v1/'+name+'?layout=5');if(!r.ok)throw Error('Environment unavailable');return r.json();}));
   const ids=[...new Set(layout.objects.map(p=>p.asset))];
   const images=new Map(await Promise.all(ids.map(async id=>{const spec=manifest.items[id];if(!spec)throw Error('Unknown asset '+id);const image=new Image();image.decoding='async';image.src=spec.url+'?pack=4';await image.decode();return[id,image];})));
   return {layout,images};
  })().catch(e=>{prepared=null;throw e;});
  const {layout,images}=await prepared;
  const fragment=document.createDocumentFragment();
  for(const spec of layout.objects){
   const node=document.createElement('div');node.className='environment-object '+(spec.wind?'has-wind ':'')+'object-'+spec.kind;node.dataset.object=spec.id;node.dataset.material=spec.asset;node.dataset.fixed=String(!spec.wind);
   Object.assign(node.style,{left:spec.x+'px',top:spec.y+'px',width:spec.width+'px',height:spec.height+'px',transform:`rotate(${spec.angle}deg)`});
   const image=images.get(spec.asset).cloneNode();image.alt='';image.draggable=false;image.style.animationDelay=(-spec.phase)+'s';node.append(image);fragment.append(node);
  }
  return {id,fragment,count:layout.objects.length};
 }
 return {prepare,commit(view){layer.replaceChildren(...(view.fragment?[view.fragment]:[]));layer.hidden=!view.count;layer.dataset.objects=String(view.count);layer.dataset.scene=view.id;},clear(){layer.hidden=true;layer.replaceChildren();}};
}
