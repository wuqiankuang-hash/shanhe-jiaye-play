/** One native-pixel world for the painting, effects and actors. Focus uses percentages. */
export function createSceneCamera({scene, surface, focus: initialFocus = {x:50,y:62}}) {
  if (!scene || !surface) throw new TypeError('Scene camera needs scene and surface elements.');
  const width=1672, height=941, pointers=new Map(), removers=[];
  let target={...initialFocus}, resetFocus={...initialFocus}, zoom=1, scale=1, baseScale=1, tx=0, ty=0;
  let viewWidth=0, viewHeight=0, top=0, bottom=0, dragging=false, blockClickUntil=0;
  let gesture=null, destroyed=false;
  scene.classList.add('camera-scene');surface.classList.add('scene-surface');
  function listen(node,type,fn,options){node.addEventListener(type,fn,options);removers.push(()=>node.removeEventListener(type,fn,options));}
  const clamp=(v,lo,hi)=>Math.max(lo,Math.min(hi,v));
  function bounds(){
    const worldWidth=width*scale,worldHeight=height*scale,usableHeight=bottom-top;
    tx=worldWidth<=viewWidth?(viewWidth-worldWidth)/2:clamp(tx,viewWidth-worldWidth,0);
    ty=worldHeight<=usableHeight?top+(usableHeight-worldHeight)/2:clamp(ty,bottom-worldHeight,top);
  }
  function paint(){
    bounds();surface.style.transform=`translate(${tx}px,${ty}px) scale(${scale})`;
    surface.style.setProperty('--camera-label-scale',String(1/scale));
    scene.dataset.cameraZoom=zoom.toFixed(2);
  }
  function center(){
    scale=baseScale*zoom;
    tx=viewWidth/2-width*target.x/100*scale;
    ty=top+(bottom-top)*.68-height*target.y/100*scale;
    paint();
  }
  function resize(){
    if(destroyed)return;
    viewWidth=scene.clientWidth;viewHeight=scene.clientHeight;
    const portrait=viewHeight>viewWidth*1.1;
    // Every orientation fills the stage. The painting and actors are cropped
    // together; panning and NPC focus controls reveal the rest of the world.
    top=0;bottom=viewHeight;
    baseScale=Math.max(viewWidth/width,viewHeight/height);
    scene.dataset.cameraLayout=portrait?'portrait':'landscape';center();
  }
  function local(e){const r=scene.getBoundingClientRect();return{x:e.clientX-r.left,y:e.clientY-r.top};}
  function rememberFocus(){
    target={x:(viewWidth/2-tx)/scale/width*100,y:(top+(bottom-top)*.68-ty)/scale/height*100};
  }
  function setZoom(value,anchor={x:viewWidth/2,y:top+(bottom-top)/2}){
    const worldX=(anchor.x-tx)/scale,worldY=(anchor.y-ty)/scale;
    zoom=clamp(value,.75,2);scale=baseScale*zoom;
    tx=anchor.x-worldX*scale;ty=anchor.y-worldY*scale;paint();rememberFocus();
  }
  function startGesture(){
    const points=[...pointers.values()];
    if(points.length>=2){
      const[a,b]=points;
      gesture={kind:'pinch',distance:Math.max(1,Math.hypot(a.x-b.x,a.y-b.y)),zoom,
        worldX:((a.x+b.x)/2-tx)/scale,worldY:((a.y+b.y)/2-ty)/scale};
      dragging=true;blockClickUntil=Date.now()+700;
    }else if(points.length===1){const p=points[0];gesture={kind:'pan',x:p.x,y:p.y,tx,ty};}
    else gesture=null;
  }
  listen(scene,'pointerdown',e=>{
    // HUD and controls remain ordinary controls. NPCs may start a drag but
    // an unmoved tap keeps its normal click target and dialog behavior.
    if(e.button!==0||e.target.closest('.scene-heading,.scene-tip,.camera-reset,[data-camera-ignore]'))return;
    if(e.target.closest('button,a,input,select,textarea')&&!e.target.closest('.npc'))return;
    pointers.set(e.pointerId,local(e));startGesture();
  });
  listen(window,'pointermove',e=>{
    if(!pointers.has(e.pointerId)||!gesture)return;
    const p=local(e);pointers.set(e.pointerId,p);
    if(gesture.kind==='pinch'&&pointers.size>=2){
      const[a,b]=[...pointers.values()],mid={x:(a.x+b.x)/2,y:(a.y+b.y)/2};
      zoom=clamp(gesture.zoom*Math.hypot(a.x-b.x,a.y-b.y)/gesture.distance,.75,2);scale=baseScale*zoom;
      tx=mid.x-gesture.worldX*scale;ty=mid.y-gesture.worldY*scale;
    }else{
      const dx=p.x-gesture.x,dy=p.y-gesture.y;
      if(!dragging&&Math.hypot(dx,dy)<7)return;
      dragging=true;tx=gesture.tx+dx;ty=gesture.ty+dy;
    }
    if(e.cancelable)e.preventDefault();
    scene.classList.add('camera-dragging');blockClickUntil=Date.now()+700;paint();rememberFocus();
  },{passive:false});
  function end(e){
    if(!pointers.has(e.pointerId))return;
    pointers.delete(e.pointerId);
    if(dragging)blockClickUntil=Date.now()+700;
    startGesture();
    if(!pointers.size){dragging=false;scene.classList.remove('camera-dragging');}
  }
  listen(window,'pointerup',end);listen(window,'pointercancel',end);
  listen(window,'blur',()=>{pointers.clear();gesture=null;dragging=false;scene.classList.remove('camera-dragging');});
  listen(scene,'click',e=>{
    if(e.target.closest('[data-camera-ignore],.camera-reset'))return;
    if(Date.now()<blockClickUntil&&e.detail!==0){e.preventDefault();e.stopImmediatePropagation();}
  },true);
  listen(scene,'wheel',e=>{
    if(e.target.closest('[data-camera-ignore],.scene-heading'))return;
    e.preventDefault();setZoom(zoom*Math.exp(-e.deltaY*.0015),local(e));
  },{passive:false});
  const observer=new ResizeObserver(resize);observer.observe(scene);resize();
  return {
    focus(x,y){target={x:clamp(Number(x)||0,0,100),y:clamp(Number(y)||0,0,100)};resetFocus={...target};zoom=1;center();},
    reset(){target={...resetFocus};zoom=1;center();},
    zoom(value){setZoom(value);},
    resize,
    readState(){return{worldWidth:width,worldHeight:height,viewWidth,viewHeight,scale,baseScale,zoom,x:tx,y:ty,focus:{...target},layout:scene.dataset.cameraLayout,visibleWorld:{left:-tx/scale,top:-ty/scale,right:(viewWidth-tx)/scale,bottom:(viewHeight-ty)/scale}};},
    destroy(){destroyed=true;observer.disconnect();removers.forEach(remove=>remove());pointers.clear();scene.classList.remove('camera-scene','camera-dragging');surface.classList.remove('scene-surface');surface.style.removeProperty('transform');surface.style.removeProperty('--camera-label-scale');}
  };
}
