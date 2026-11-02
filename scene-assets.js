// Five decoded location paintings share a bounded cache. Navigation never
// waits synchronously for image decoding, and stale requests cannot swap a map.
export function createSceneAssets(){
 const cache=new Map();let warming=false;
 function load(url,priority='high'){
  if(cache.has(url)){const entry=cache.get(url);if(priority==='high')entry.image.fetchPriority='high';return entry.promise;}
  const image=new Image();image.decoding='async';image.fetchPriority=priority;
  const entry={image,promise:null};
  entry.promise=(async()=>{image.src=url;await image.decode();return {url,image};})();
  cache.set(url,entry);entry.promise.catch(()=>cache.delete(url));
  return entry.promise;
 }
 function warm(urls){
  if(warming||navigator.connection?.saveData||/2g/.test(navigator.connection?.effectiveType||''))return;
  warming=true;
  const run=async()=>{for(const url of urls){try{await load(url,'low');}catch{}await new Promise(resolve=>setTimeout(resolve,80));}};
  if('requestIdleCallback'in window)requestIdleCallback(()=>run(),{timeout:1800});else setTimeout(run,400);
 }
 return {load,warm,readState:()=>({cached:cache.size,urls:[...cache.keys()]})};
}
