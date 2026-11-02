// Motion is baked into small animated WebPs. Native image playback keeps frame
// decoding and compositing out of the JavaScript scene-switching path.
const actors = new Set(), metadata = new Map(), byActor = new WeakMap();
const preference = matchMedia('(prefers-reduced-motion: reduce)');
let watching = false;
const imageStyle = 'position:relative;inset:auto;display:block;width:100%;height:100%;max-width:none;max-height:none;object-fit:contain;animation:none;transform:none;pointer-events:none;z-index:auto;';
const reduced = () => preference.matches || document.body?.classList.contains('reduced-motion');
const observer = new IntersectionObserver(entries => {
 for (const entry of entries) { const state = byActor.get(entry.target); if (state) state.visible = entry.isIntersecting; }
 refresh();
});
// Only removal records matter. Attribute updates during motion never trigger a
// document-wide actor scan, and observers/listeners stop with the last actor.
const removals = new MutationObserver(records => {
 const removed = records.flatMap(record => [...record.removedNodes]);
 for (const state of actors) if (!state.actor.isConnected && removed.some(node => node === state.actor || node.contains?.(state.actor))) dispose(state);
});
const classes = new MutationObserver(() => refresh());
function watch() {
 if (watching) return;
 watching = true;
 removals.observe(document.documentElement, {childList:true, subtree:true});
 if (document.body) classes.observe(document.body, {attributes:true, attributeFilter:['class']});
 document.addEventListener('visibilitychange', refresh);
 preference.addEventListener('change', refresh);
}
function unwatch() {
 if (actors.size || !watching) return;
 watching = false; removals.disconnect(); classes.disconnect();
 document.removeEventListener('visibilitychange', refresh);
 preference.removeEventListener('change', refresh);
}
function assetUrl(value, manifest) { return new URL(value, manifest).href; }
function loadMetadata(manifest) {
 if (metadata.has(manifest)) {
  const hit = metadata.get(manifest); metadata.delete(manifest); metadata.set(manifest, hit); return hit;
 }
 const pending = fetch(manifest, {cache:'force-cache'}).then(async response => {
  if (!response.ok) throw new Error('motion metadata HTTP ' + response.status);
  const meta = await response.json();
  if (typeof meta.animated !== 'string' || !meta.animated || typeof meta.poster !== 'string' || !meta.poster || meta.planted !== true || meta.frames !== 64 || !Number.isFinite(meta.duration) || meta.duration <= 0) throw new Error('invalid native motion metadata');
  return {...meta, animated:assetUrl(meta.animated, manifest), poster:assetUrl(meta.poster, manifest)};
 });
 metadata.set(manifest, pending);
 while (metadata.size > 6) metadata.delete(metadata.keys().next().value);
 pending.catch(() => { if (metadata.get(manifest) === pending) metadata.delete(manifest); });
 return pending;
}
function makeImage() {
 const image = new Image(); image.className = 'work-motion-image';
 image.width = 256; image.height = 288; image.alt = ''; image.setAttribute('aria-hidden', 'true');
 image.decoding = 'async'; image.style.cssText = imageStyle; return image;
}
function installPoster(state) {
 const image = makeImage(); state.image = image;
 image.onload = () => {
  if (!actors.has(state) || state.image !== image) return;
  image.onload = image.onerror = null; state.actor.style.backgroundImage = 'none';
 };
 image.onerror = () => {
  if (!actors.has(state) || state.image !== image) return;
  image.onload = image.onerror = null; image.removeAttribute('src'); image.remove(); state.image = null;
  state.actor.dataset.motionWarning = 'poster failed to load';
 };
 image.src = state.poster; state.actor.append(image);
}
function cancelPending(state) {
 clearTimeout(state.timer); state.timer = null;
 if (state.idle != null) { cancelIdleCallback(state.idle); state.idle = null; }
 if (state.pending) { state.pending.onload = state.pending.onerror = null; state.pending.removeAttribute('src'); state.pending = null; }
}
function poster(state, reason) {
 cancelPending(state);
 // Replacing the source releases the inactive animated image, including when
 // the tab is hidden. Merely hiding an animated image would keep decoding it.
 if (state.image && state.image.getAttribute('src') !== state.poster) state.image.src = state.poster;
 state.playing = false; state.actor.dataset.motionState = reason;
}
function fail(state, error) {
 state.failed = true; poster(state, 'static-error');
 state.actor.dataset.motionMode = 'static-poster'; state.actor.dataset.motionWarning = String(error);
 refresh();
}
function start(state) {
 if (state.playing || state.timer != null || state.idle != null || state.pending || !state.asset) return;
 state.actor.dataset.motionState = 'deferred';
 // Scene insertion and paint get a quiet interval before native decoding starts.
 state.timer = setTimeout(() => {
  state.timer = null;
  const begin = () => {
   state.idle = null;
   if (!actors.has(state) || !state.allowed || !state.actor.isConnected) return;
   const image = makeImage(); state.pending = image;
   image.onload = () => {
    if (!actors.has(state) || state.pending !== image || !state.allowed) return;
    image.onload = image.onerror = null; state.pending = null;
    if (state.image) { state.image.onload = state.image.onerror = null; state.image.removeAttribute('src'); state.image.remove(); }
    state.image = image; state.actor.append(image);
    state.actor.style.backgroundImage = 'none'; state.playing = true;
    state.actor.dataset.motionReady = 'true'; state.actor.dataset.motionState = 'running';
   };
   image.onerror = () => { if (actors.has(state) && state.pending === image) fail(state, 'animated WebP failed to load'); };
   image.src = state.asset.animated;
  };
  if (typeof requestIdleCallback === 'function') state.idle = requestIdleCallback(begin, {timeout:300}); else begin();
 }, 120);
}
function refresh() {
 let active = 0;
 for (const state of actors) {
  const reason = state.failed ? 'static-error' : document.hidden ? 'hidden' : reduced() ? 'reduced' : !state.visible ? 'offscreen' : active >= 2 ? 'paused' : null;
  state.allowed = !reason;
  if (reason) poster(state, reason);
  else { active++; start(state); }
 }
}
function dispose(state) {
 if (!actors.delete(state)) return;
 observer.unobserve(state.actor); byActor.delete(state.actor); cancelPending(state);
 if (state.image) { state.image.onload = state.image.onerror = null; state.image.removeAttribute('src'); state.image.remove(); state.image = null; }
 state.asset = null; state.actor.dataset.motionState = 'disposed';
 unwatch(); refresh();
}
export function attachWorkMotion(actor, {type, duration, url} = {}) {
 const previous = byActor.get(actor); if (previous) dispose(previous);
 const manifest = new URL(url && /\.json(?:[?#]|$)/i.test(url) ? url : `assets/work/${type}-motion-v4.json`, document.baseURI).href;
 const state = {actor, visible:true, allowed:false, failed:false, playing:false, timer:null, idle:null, pending:null, image:null, asset:null, poster:assetUrl(`${type}-poster-v4.webp`, manifest)};
 actors.add(state); byActor.set(actor, state); watch(); observer.observe(actor);
 actor.style.animation = 'none'; actor.style.backgroundPosition = '0% 0%';
 actor.dataset.motionMode = 'native-animated-webp'; actor.dataset.motionReady = 'false';
 actor.dataset.motionTotalFrames = '64'; actor.dataset.totalFrames = '64'; actor.dataset.footLock = 'planted-baked'; actor.dataset.motionState = 'loading';
 // Native frame position is unknown; remove counters left by the old runtime.
 for (const key of ['motionFrame','motionRenderCount','motionPhase','motionSourceFps']) delete actor.dataset[key];
 delete actor.dataset.motionWarning;
 installPoster(state);
 loadMetadata(manifest).then(asset => {
  if (!actors.has(state)) return;
  state.asset = asset; state.poster = asset.poster;
  if (!state.image) installPoster(state);
  else if (!state.playing) state.image.src = state.poster;
  // The encoded file defines playback duration; caller timing cannot retime it.
  actor.dataset.motionDuration = String(asset.duration);
  refresh();
 }).catch(error => { if (actors.has(state)) fail(state, error); });
 refresh(); return () => dispose(state);
}
