// Map selection is separate from the simulation reducer. Only entering a place
// invokes travel; opening the world or village map never advances time.
const hill=(x,y,s=1)=>`<g transform="translate(${x} ${y}) scale(${s})" fill="#697c6a30" stroke="#607362" stroke-width="1.1"><path d="M-48 30Q-22 1-6-41Q7-21 16-11L24-24Q41 9 57 30Z"/><path d="M-6-41l-8 55m38-38l-3 40" fill="none" opacity=".5"/></g>`;
const house=(x,y)=>`<g transform="translate(${x} ${y})" stroke="#56634f" stroke-width="1.3"><path d="M-20-3h40v27h-40Z" fill="#e1d4ac"/><path d="M-26-3L0-21 26-3Z" fill="#829080"/><path d="M-4 24V9h9v15M-16 7h7v8h-7" fill="none"/></g>`;
function background(village){return `<svg class="map-art" viewBox="0 0 900 570" preserveAspectRatio="none" aria-hidden="true"><defs><pattern id="map-paper" width="8" height="8" patternUnits="userSpaceOnUse"><path d="M1 1h1m3 4h1" stroke="#7a7658" opacity=".09"/></pattern></defs><rect width="900" height="570" fill="#eee8d4"/><rect width="900" height="570" fill="url(#map-paper)"/><path d="M10 390Q80 285 65 179Q148 55 290 80T490 45Q670 75 840 112Q898 230 850 370T710 523Q512 500 414 547Q177 553 10 390" fill="#bac2a034" stroke="#83917766" stroke-width="2"/>
${[hill(125,125,1.5),hill(240,90,1),hill(360,115,1.4),hill(600,92,1.5),hill(742,157,1.3),hill(130,440,1),hill(780,446,1.2)].join('')}
<path d="M670 0Q600 90 636 155T560 275Q510 320 565 390T505 570" fill="none" stroke="#8eaeb033" stroke-width="33"/><path d="M670 0Q600 90 636 155T560 275Q510 320 565 390T505 570" fill="none" stroke="#72939677" stroke-width="16"/>
<g fill="none" stroke="#af9b70" stroke-width="5" stroke-linecap="round"><path d="M110 560Q203 416 338 355T460 280Q448 215 370 180"/><path d="M338 355Q426 419 565 390T760 330"/><path d="M460 280Q555 260 636 155T817 67"/></g>
${village?house(270,310)+house(307,277)+house(335,302)+house(390,242)+house(420,262)+house(455,215)+house(670,315)+house(704,335):house(420,292)+house(459,310)+house(490,287)+house(730,185)+house(230,420)}
${village?'<g stroke="#8b996d" fill="#b0bc8544"><path d="M150 220h120v55H150zM145 205h115v-25H145zM650 400h120v55H650z"/><path d="M160 230h100m-100 12h100m-100 12h100m500 156h100m-100 14h100m-100 14h100"/></g><path d="M541 390h45m-44-7v14m9-14v14m9-14v14m9-14v14m9-14v14" stroke="#796d4d" stroke-width="3"/>':''}
<g fill="#6a7c62" font-family="serif" font-size="16" opacity=".7"><text x="85" y="85">青 岚 山 脉</text><text x="660" y="500">清 溪</text><text x="55" y="525">往县城</text></g></svg>`;}
export function createMapScreen({navigate}){
 const dialog=document.createElement('dialog');dialog.className='map-dialog';dialog.setAttribute('aria-label','世界与村庄地图');document.body.append(dialog);
 const open=(level)=>{render(level);if(!dialog.open)dialog.showModal();};
 function render(level){const local=level==='village';dialog.innerHTML=`<div class="map-heading"><div><small>山河家业 · 舆图</small><h2>${local?'青岚村 · 村庄地图':'青州 · 世界地图'}</h2></div><div>${local?'<button class="map-back">返回世界</button>':''}<button class="map-close" aria-label="关闭地图">×</button></div></div><p class="map-instruction">${local?'选择地点，进入对应生活场景。':'选择村庄，展开该村的地图。'}</p><div class="map-stage">${background(local)}<div class="map-pins"></div></div><p class="map-foot">${local?'一村一图 · 点地点前往，路程消耗一刻钟':'当前开放青岚村；其他聚落随游戏阶段扩展。'}</p>`;
 dialog.querySelector('.map-close').onclick=()=>dialog.close();dialog.querySelector('.map-back')?.addEventListener('click',()=>render('world'));
 const pins=local?[['home','自家小院',32,61],['village','村口 · 小卖部',49,51],['field','梯田菜畦',23,39],['pond','溪边鱼塘',65,76],['market','村外集镇',82,59]]:[['qinglan','青岚村',50,56],['locked','石溪村 · 未开放',80,37],['locked','云岭村 · 未开放',26,79]];
 for(const [id,label,x,y] of pins){const b=document.createElement('button');b.className='map-pin';b.style.left=x+'%';b.style.top=y+'%';b.textContent=label;if(id==='locked'){b.disabled=true;b.classList.add('unavailable');}else b.onclick=()=>{if(!local)render('village');else if(navigate(id)!==false)dialog.close();};dialog.querySelector('.map-pins').append(b);}
 }
 return {openWorld:()=>open('world'),openVillage:()=>open('village')};
}
