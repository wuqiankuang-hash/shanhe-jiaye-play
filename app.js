import {createBackgroundMotion} from './background-motion.js?v=14';
import {hudIcon} from './hud-icons.js?v=11';
import {createSceneAssets} from './scene-assets.js?v=8';
import {createSceneCamera} from './scene-camera.js?v=4';
import {createMapScreen} from './map-screen.js';
import {createWorkActor} from './work-actors.js?v=9';
import {newGame,reduce,getActions,validate,exportSave,importSave,businessCatalog,itemCatalog,locationCatalog,skillLabels,priceCatalog,quoteSale,dailyAccounts,season,timeLabel} from './engine.js';

const SAVE_KEY='shanhe-jiaye-text-v1';
const BACKUP_KEY=SAVE_KEY+'-backup';
const MOTION_KEY='shanhe-jiaye-motion';
const $=id=>document.getElementById(id);
const make=(tag,cls='',text)=>{const node=document.createElement(tag);if(cls)node.className=cls;if(text!==undefined)node.textContent=String(text);return node;};
const storageGet=key=>{try{return localStorage.getItem(key);}catch{return null;}};
let state=newGame(),view='business',currentNpc=null,ledgerDay=1,storageFailed=false,toastTimer;
let motionReduced=storageGet(MOTION_KEY)==='reduced'||(storageGet(MOTION_KEY)!=='full'&&matchMedia('(prefers-reduced-motion: reduce)').matches);
let lastLocation='',lastSavedAt='',sceneCamera=null;
const sceneAssets=createSceneAssets();let sceneRequest=0;

const sceneCatalog={
  home:{image:'assets/home-v3.webp',region:'青岚村 · 自家小院',title:'柴门小院',heading:'一餐一饭，也是一门经营',description:'在小院里歇歇脚，看看行囊，也盘算下一轮生意。养足精神，明日才有力气做活。',people:[['npc-neighbor',50,77]]},
  village:{image:'assets/village-v3.webp',region:'青岚村 · 山村巷口',title:'井边人家',heading:'乡里有熟人，营生有门路',description:'村里只有这一家小卖部。买齐种苗和食材，再找管事谈场地；有本钱，也要先有手艺。',people:[['npc-shop',35,77],['npc-broker',68,76]]},
  field:{image:'assets/field-v3.webp',region:'青岚村 · 山间梯田',title:'一畦春绿',heading:'收成从下地学艺开始',description:'播种要菜种，养护要水，田租每日照付。做过农活、摸清时节，才好租下自己的菜田。',people:[['npc-farmer',48,76]]},
  pond:{image:'assets/pond-v3.webp',region:'青岚村 · 溪边鱼塘',title:'半塘青波',heading:'一塘鱼苗，日日都要照料',description:'学看水、学喂料，再盘下一口小塘。生长期每天都吃饲料，本领和照料决定有多少鱼能长成。',people:[['npc-fisher',48,70]]},
  market:{image:'assets/market-v3.webp',region:'村外集镇 · 早市长街',title:'人间烟火',heading:'一碗热面，要算清一笔账',description:'从面馆帮工学起，做自己的面摊。真材实料做面，按客流定价，再把赚来的钱落到账上。',people:[['npc-cook',55,76]]},
};
const npcs={
  'npc-farmer':{name:'周伯',role:'农师 · 种植手艺',image:'assets/work/farmer-portrait-v2.webp',location:'field',speech:s=>s.businesses.farm?'田是租下来了，种子和水可别忘了。等上两天，收菜、卖菜，再看看扣掉田租到底剩了多少。':'先随我下地，把播种养护亲手做一遍。做活有工钱，也能长本领；等种植到了20，再去谈自己的田。'},
  'npc-fisher':{name:'沈叔',role:'渔师 · 养鱼手艺',image:'assets/work/fisher-portrait-v2.webp',location:'pond',speech:s=>s.businesses.fish?'鱼塘要养，不是放下就不管。生长期每天预留一份饲料，缺了料，这一批鱼就会少成活。':'水色、天气、喂料，都得在塘边学。随我做几天活，等养鱼有了20点本领，再租塘也不迟。'},
  'npc-cook':{name:'柳婶',role:'面馆掌灶 · 面食经营',image:'assets/work/cook-portrait-v2.webp',location:'market',speech:s=>s.businesses.noodle?'有摊位了，也得备齐面粉、青菜和水。面做好还不算赚到钱，看看今天的客人肯买多少。':'来帮我揉面看火吧，工钱照给，面食和厨艺也在做活中学。自己的摊子，往后再慢慢张罗。'},
  'npc-shop':{name:'许掌柜',role:'小卖部 · 日常物资',image:'assets/work/shop-portrait-v2.webp',location:'village',speech:()=> '菜种、鱼料、面粉、清水，我这儿都有。杂粮饼买了就能吃；原料买多少，用多少，别把本钱全压在货上。'},
  'npc-broker':{name:'何管事',role:'村中管事 · 场地租约',image:'assets/work/broker-portrait-v2.webp',location:'village',speech:s=>s.debt?'你还有欠账。先靠帮工挣些钱，把旧账结清；已有生意可以继续经营，但新场地先缓一缓。':'田、塘、集镇的摊位，都能帮你问。先把对应手艺学到20，备好开业本钱。每天的租金、维护，还得算在后头。'},
  'npc-neighbor':{name:'林嫂',role:'村邻 · 起居与家常',image:'assets/work/neighbor-portrait-v2.webp',location:'home',speech:()=> '累了就在家歇歇，饿了要真吃饭。学过厨艺，备齐面粉、青菜和水，才能开灶。床和灶用久了，也得修一修。'},
};
const routeNames={home:'家中',village:'村里',field:'田间',pond:'鱼塘',market:'集镇'};
const routeSymbols={home:'舍',village:'乡',field:'田',pond:'水',market:'市'};
const businessSymbols={farm:'禾',fish:'渔',noodle:'食'};

function restoreLocal(){
  for(const key of [SAVE_KEY,BACKUP_KEY]){
    const text=storageGet(key);if(!text)continue;
    const result=importSave(text);
    if(result.ok){state=result.state;if(key===BACKUP_KEY)setTimeout(()=>notify('主存档无法读取，已恢复上一份有效备份。'),600);return;}
  }
  if(storageGet(SAVE_KEY))setTimeout(()=>notify('存档无法读取，原记录已保留；可在设置里导入备份。'),600);
}
function persist(){
  try{
    const before=localStorage.getItem(SAVE_KEY);
    if(before&&importSave(before).ok)localStorage.setItem(BACKUP_KEY,before);
    localStorage.setItem(SAVE_KEY,exportSave(state));storageFailed=false;lastSavedAt=new Date().toLocaleTimeString('zh-CN',{hour:'2-digit',minute:'2-digit'});
  }catch{storageFailed=true;}
  $('save-status').replaceChildren(make('i'),document.createTextNode(storageFailed?'请导出存档备份':'进度自动保存'));
}
function notify(message){clearTimeout(toastTimer);$('toast').textContent=message;$('toast').classList.add('visible');toastTimer=setTimeout(()=>$('toast').classList.remove('visible'),4600);}
function dispatch(id){
  const result=reduce(state,id);
  if(!result.ok){notify(result.message);if(currentNpc){$('dialog-result').textContent=result.message;$('dialog-result').hidden=false;}return false;}
  state=result.state;ledgerDay=state.day;persist();render();
  if(currentNpc){renderConversation(result.message);}else notify(result.message);
  return true;
}
function getPeriod(){return state.hour<6||state.hour>=19?'夜色':state.hour<11?'清晨':state.hour<16?'午后':'暮色';}
function render(){
  const scene=sceneCatalog[state.location];
  $('date').textContent=`元年 · ${season(state)} · 第${state.day}日`;
  $('time').textContent=`${String(Math.floor(state.hour)).padStart(2,'0')}:${String(Math.round(state.hour*60)%60).padStart(2,'0')}`;
  $('scene-region').textContent=scene.region;$('scene-title').textContent=scene.title;
  $('scene-weather').textContent=`${season(state)}日 · ${getPeriod()}`;
  $('story-title').textContent=scene.heading;$('story-description').textContent=scene.description;
  $('scene').dataset.location=state.location;$('scene').dataset.period=getPeriod();
  const shade=getPeriod()==='夜色'?'brightness(.60) saturate(.8)':getPeriod()==='暮色'?'sepia(.18) brightness(.88)':'none';
  $('scene-image').style.filter=shade;
  if(lastLocation!==state.location){lastLocation=state.location;presentScene(state.location,scene);}
  renderLocations();renderStatus();renderQuickItems();renderView();renderEvents();
  document.querySelectorAll('[data-view]').forEach(b=>b.setAttribute('aria-selected',String(b.dataset.view===view)));
  if(currentNpc)renderConversation();
}
function renderPeople(scene){
  $('npc-layer').replaceChildren(...scene.people.map(([id,x,y],index)=>{
    const npc=npcs[id],button=make('button','npc');button.type='button';button.setAttribute('aria-label',`与${npc.name}对话，${npc.role}`);button.style.setProperty('--x',x+'%');button.style.setProperty('--y',y+'%');button.style.setProperty('--delay',(-index*1.4)+'s');button.dataset.npc=id;
    const actor=createWorkActor(id,npc);button.append(actor,make('span','npc-name',npc.name),make('span','npc-activity',actor.activityLabel));button.addEventListener('click',()=>openNpc(id));return button;
  }));
}
function renderLocations(){
  $('locations').replaceChildren(...Object.keys(sceneCatalog).map(id=>{
    const button=make('button','location-tab'+(state.location===id?' active':''));button.setAttribute('aria-current',state.location===id?'location':'false');button.dataset.location=id;button.setAttribute('aria-label',routeNames[id]);button.title=routeNames[id];button.innerHTML=hudIcon(id);button.addEventListener('click',()=>{if(state.location!==id)dispatch('travel:'+id);});return button;
  }));
}
function renderStatus(){
  const stats=[['现银',state.money,'文',null],['精神',Math.round(state.energy),' / 100',state.energy],['饱食',Math.round(state.hunger),' / 100',state.hunger]];
  $('status-strip').replaceChildren(...stats.map(([label,value,unit,meter])=>{
    const node=make('div','stat'+(meter!==null&&meter<20?' low':''));node.append(make('span','stat-label',label));const figure=make('span','stat-value',value);figure.append(make('small','',unit));node.append(figure);
    if(meter!==null){const bar=make('div','stat-meter'),fill=make('i');fill.style.width=Math.max(0,meter)+'%';bar.append(fill);node.append(bar);}return node;
  }));
}
function heading(title,note){const wrap=make('div','content-heading');wrap.append(make('h2','',title));if(note)wrap.append(make('span','',note));return wrap;}
function actionButton(action){
  const button=make('button','action-button');button.dataset.action=action.id;button.disabled=action.disabled;
  const label=make('span');label.append(make('strong','',action.label),make('small','',action.disabled?action.reason:action.description));button.append(label,make('span','arrow',action.disabled?'待备齐':'↗'));
  button.addEventListener('click',()=>dispatch(action.id));return button;
}
function renderView(){const content=$('view-content');content.replaceChildren();if(view==='business')renderBusinesses(content);if(view==='bag')renderBag(content);if(view==='skills')renderSkills(content);if(view==='ledger')renderLedger(content);}
function visitPerson(id){const npc=npcs[id];if(state.location!==npc.location&&!dispatch('travel:'+npc.location))return;openNpc(id);}
function renderBusinesses(content){
  const owned=Object.values(state.businesses).filter(Boolean).length;
  content.append(heading('慢慢置下自己的家业',`${owned} / 3 处营生`));
  const goal=make('div','goal');goal.append(make('span','goal-mark',owned?'营':'学'));
  const goalText=make('div');goalText.append(make('strong','',owned?'有了营生，更要算清每日收支':'先从一份有工钱的帮工做起'),make('p','',owned?'准备原料 → 生产照料 → 收货 → 去集镇定价销售。每天仍要付租金和维护。':'点画面里的师傅接活，手艺达到20，再找村中管事租场地。金钱不能代替本领。'));goal.append(goalText);content.append(goal);
  if(!owned&&Object.values(state.skills).every(value=>value===0)){const start=make('button','small-button','去田间找周伯');start.style.marginTop='10px';start.addEventListener('click',()=>visitPerson('npc-farmer'));goalText.append(start);}
  if(state.debt>0){const debt=make('div','goal');const text=make('div');text.append(make('strong','',`尚欠 ${state.debt} 文`),make('p','', '资金不足的日租记成欠账，已有生意仍可经营。先挣钱还账，再租新场地。'));const pay=make('button','small-button','找管事还账');pay.addEventListener('click',()=>visitPerson('npc-broker'));debt.append(text,pay);content.append(debt);}
  const list=make('div','business-list');
  for(const [id,catalog]of Object.entries(businessCatalog)){
    const ownedBusiness=state.businesses[id],card=make('article','business-card'),top=make('div','business-top'),title=make('div','business-title'),name=make('div');name.append(make('h3','',catalog.name),make('p','',ownedBusiness?locationCatalog[catalog.location].name:({farm:'从泥土里讨生活',fish:'在溪水边养一份收成',noodle:'把手艺变成一碗热面'})[id]));title.append(make('span','business-symbol',businessSymbols[id]),name);top.append(title,make('span','tag'+(ownedBusiness?' owned':''),ownedBusiness?'正在经营':'尚未租赁'));card.append(top);
    const facts=make('div','business-facts');
    if(ownedBusiness){facts.append(make('span','',`日租 ${catalog.dailyRent}文`),make('span','',`日常维护 1文`),make('span','',`完好度 ${ownedBusiness.condition}%`));const track=make('div','condition-track'),fill=make('i');fill.style.width=ownedBusiness.condition+'%';track.append(fill);card.append(facts,track);
      const batch=ownedBusiness.batch;card.append(make('p','batch-note',batch?(state.day>=batch.readyDay?`这一批已可收货，预计${batch.quantity}份，品质${batch.quality}。`:`这一批第${batch.readyDay}日成熟，还需${batch.readyDay-state.day}天。${id==='fish'?'每日记得备好饲料。':''}`):id==='noodle'?'原料备齐后可做面，当日入库，到集镇定价销售。':'场地已备好，接下来采购原料，安排新一轮生产。'));
    }else{facts.append(make('span','',`开业 ${catalog.leaseCost}文`),make('span','',`${skillLabels[id]} ${state.skills[id]} / 20`),make('span','',`日租 ${catalog.dailyRent}文`));card.append(facts);}
    const footer=make('div','business-footer');footer.append(make('span','',ownedBusiness?catalog.description:state.skills[id]>=20?'手艺已达标，备好本钱就能谈租约。':'要先实际帮工，学会对应工序。'));
    const button=make('button','',ownedBusiness?'前去打理':state.skills[id]>=20?'谈谈租约':'拜访师傅');button.addEventListener('click',()=>{if(!ownedBusiness)visitPerson(state.skills[id]>=20?'npc-broker':({farm:'npc-farmer',fish:'npc-fisher',noodle:'npc-cook'})[id]);else if(state.location!==catalog.location)dispatch('travel:'+catalog.location);else{const section=document.querySelector('.local-section');section?.scrollIntoView({behavior:motionReduced?'auto':'smooth',block:'center'});}});footer.append(button);card.append(footer);list.append(card);
  }
  content.append(list);
  const local=make('section','local-section');local.append(make('h3','',state.location==='home'?'今日起居':'这里可以做的事'));
  let actions=getActions(state,state.location).filter(a=>!a.id.startsWith('travel:')&&!a.id.startsWith('eat:')&&!a.id.startsWith('discard:'));
  if(state.location==='village')actions=actions.filter(a=>!a.id.startsWith('buy:')&&!a.id.startsWith('lease:'));
  if(!actions.length){local.append(make('p','intro-note','点画面中的人物，聊聊帮工、采购或租约。'));}else{const wrap=make('div','action-list');wrap.append(...actions.map(actionButton));local.append(wrap);}content.append(local);
}
function renderBag(content){
  const count=Object.values(state.inventory).reduce((a,b)=>a+b,0);content.append(heading('随身行囊',`${count} / 60 份`),make('p','intro-note','食物要真吃，原料要真用。卖货请去集镇；塞满背篓时可以舍弃少量物品腾出空间。'));
  const actions=getActions(state,'bag'),list=make('div','inventory-list');
  for(const [id,number]of Object.entries(state.inventory)){
    const item=itemCatalog[id];if(!item||number<=0)continue;const row=make('div','inventory-row');row.append(make('span','item-mark',item.name[0]),make('span','item-name',item.name),make('span','item-count',number));
    const eat=actions.find(a=>a.id==='eat:'+id);if(eat){const button=make('button','small-button','吃一份');button.disabled=eat.disabled;button.title=eat.reason||eat.description;button.addEventListener('click',()=>dispatch(eat.id));row.append(button);}
    const discard=actions.find(a=>a.id==='discard:'+id);if(discard){const button=make('button','small-button','舍弃');button.setAttribute('aria-label',`舍弃一份${item.name}`);button.addEventListener('click',()=>dispatch(discard.id));row.append(button);}list.append(row);
  }
  if(!list.children.length){const empty=make('div','empty-state');empty.append(make('strong','','背篓暂时空着'),make('p','','去小卖部备一点口粮和原料。'));content.append(empty);}else content.append(list);
}
function renderSkills(content){
  content.append(heading('手艺在劳作中长成','学会，才能自立'),make('p','intro-note','帮工同时获得工钱与熟练度。种植、养鱼、面食经营达到20才能租场地；厨艺达到6才能自己做饭。'));
  const list=make('div','skill-list');for(const[id,label]of Object.entries(skillLabels)){
    const card=make('article','skill-card'),top=make('div','skill-heading');top.append(make('span','',label),make('b','',state.skills[id]));const bar=make('div','skill-track'),fill=make('i');fill.style.width=state.skills[id]+'%';bar.append(fill);card.append(top,bar,make('p','',id==='cooking'?'在面馆帮工和实际烹饪中成长，影响成品与独立开灶资格。':state.skills[id]>=20?'已有独立经营的基本手艺。继续实际生产，可提高品质、收成或成活率。':`离独立经营还需 ${20-state.skills[id]} 点手艺。钱再多，也不能跳过这一步。`));list.append(card);
  }content.append(list);
}
function renderLedger(content){
  ledgerDay=Math.max(1,Math.min(state.day,ledgerDay));const account=dailyAccounts(state,ledgerDay);const top=heading('每一文，都有来去');const picker=make('div','ledger-day-picker');for(const [label,delta]of[['‹',-1],['›',1]]){const button=make('button','',label);button.setAttribute('aria-label',delta<0?'上一日账簿':'下一日账簿');button.disabled=ledgerDay+delta<1||ledgerDay+delta>state.day;button.addEventListener('click',()=>{ledgerDay+=delta;renderView();});if(delta===-1)picker.append(button,make('span','',`第${ledgerDay}日`));else picker.append(button);}top.append(picker);content.append(top);
  const entries=state.ledger.filter(e=>e.day===ledgerDay),income=entries.reduce((n,e)=>n+Math.max(0,e.delta),0),expense=entries.reduce((n,e)=>n+Math.max(0,-e.delta),0);const summary=make('div','ledger-summary');for(const[label,amount,cls]of[['进账',income,'income'],['支出',expense,'expense']]){const card=make('div','ledger-amount');card.append(make('span','',label),make('b',cls,`${amount} 文`));summary.append(card);}content.append(summary);
  if(state.debt)content.append(make('p','intro-note',`另有欠账 ${state.debt} 文。账面实付与新增欠账分别记录，欠款不会被悄悄清除。`));
  const list=make('ol','ledger-list');for(const entry of [...entries].reverse()){
    const row=make('li'),label=make('span','',entry.label);label.append(make('small','',`${String(Math.floor(entry.hour)).padStart(2,'0')}:${String(Math.round(entry.hour*60)%60).padStart(2,'0')} · 余 ${entry.balance} 文${entry.debtDelta?` · 欠账${entry.debtDelta>0?'+':''}${entry.debtDelta}`:''}`));row.append(label,make('span',entry.delta>=0?'income':'expense',`${entry.delta>0?'+':''}${entry.delta} 文`));list.append(row);
  }if(!entries.length){const empty=make('div','empty-state');empty.append(make('strong','','今日还未开账'),make('p','','工钱、原料、租金、维护与销售，都会逐笔记在这里。'));content.append(empty);}else content.append(list);
}
function renderEvents(){const entries=state.logs.slice(-3).reverse();$('recent-events').replaceChildren(...entries.map(entry=>{const li=make('li');li.append(make('span','event-time',entry.timestamp.replace('第','').replace('日','日')),make('span','',entry.narrative));return li;}));}
function openNpc(id){const npc=npcs[id];if(!npc||state.location!==npc.location){notify('先去对应地点，再与这位村民说话。');return;}currentNpc=id;renderConversation();$('conversation').showModal();}
function closeConversation(){currentNpc=null;$('conversation').close();}
function renderConversation(resultMessage=''){
  const npc=npcs[currentNpc];if(!npc)return;$('dialog-name').textContent=npc.name;$('dialog-role').textContent=npc.role;$('dialog-location').textContent=locationCatalog[npc.location].name;$('dialog-portrait').src=npc.image;$('dialog-portrait').alt=npc.name;$('dialog-speech').textContent=npc.speech(state);
  $('dialog-result').hidden=!resultMessage;$('dialog-result').textContent=resultMessage;
  const context=currentNpc==='npc-neighbor'?'home':currentNpc;
  const actions=getActions(state,context).filter(a=>!a.id.startsWith('travel:')&&!a.id.startsWith('discard:'));
  $('dialog-actions').replaceChildren(...actions.map(actionButton));
}
function openSettings(){$('setting-message').textContent='';$('settings').showModal();}
function exportFile(){try{const text=exportSave(state),blob=new Blob([text],{type:'application/json'}),url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download=`山河家业-第${state.day}日.json`;link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);$('setting-message').textContent='存档已导出。请把文件留好，换设备时可导入。';}catch{$('setting-message').textContent='导出失败，请稍后再试；当前进度仍保留。';}}
async function importFile(event){const file=event.target.files?.[0];if(!file)return;if(file.size>1000000){$('setting-message').textContent='文件过大，无法作为游戏存档读取。';event.target.value='';return;}try{const result=importSave(await file.text());if(!result.ok){$('setting-message').textContent=result.message;return;}if(!confirm('导入会替换当前进度，继续吗？'))return;state=result.state;ledgerDay=state.day;lastLocation='';persist();render();$('setting-message').textContent='存档已导入，地点、手艺和收支均已恢复。';}catch{$('setting-message').textContent='无法读取这个文件，原进度未变。';}finally{event.target.value='';}}

// Ambient scene animation is independent of turn-based business time.
const backgroundMotion=createBackgroundMotion($('scene-motion'));
function updateMotion(){document.body.classList.toggle('reduced-motion',motionReduced);$('toggle-motion').textContent=motionReduced?'恢复画面动态':'减少画面动态';backgroundMotion.setReduced(motionReduced);}

$('close-conversation').addEventListener('click',closeConversation);$('leave-conversation').addEventListener('click',closeConversation);$('conversation').addEventListener('cancel',()=>{currentNpc=null;});
$('settings-button').addEventListener('click',openSettings);$('close-settings').addEventListener('click',()=>$('settings').close());$('export-save').addEventListener('click',exportFile);$('import-save').addEventListener('change',importFile);
$('toggle-motion').addEventListener('click',()=>{motionReduced=!motionReduced;try{localStorage.setItem(MOTION_KEY,motionReduced?'reduced':'full');}catch{}updateMotion();});
$('new-game').addEventListener('click',()=>{if(!confirm('重新开始会替换当前进度。建议先导出存档，确定继续吗？'))return;state=newGame();view='business';ledgerDay=1;lastLocation='';persist();render();$('settings').close();notify('又是一个清晨，新的生活开始了。');});
document.querySelectorAll('[data-view]').forEach(button=>button.addEventListener('click',()=>{view=button.dataset.view;render();}));

restoreLocal();render();updateMotion();
if(new URLSearchParams(location.search).has('qa'))Object.defineProperty(window,'__shanhe',{value:{getState:()=>JSON.parse(JSON.stringify(state)),dispatch,openNpc,view:name=>{view=name;renderView();},getMotionTime:()=>backgroundMotion.getTime(),inspectBackgroundAt:t=>backgroundMotion.inspectPose(t)},writable:false});

// Game HUD lives over the scene; the journal opens only on request.
const panel=$('management-panel'),scrim=$('panel-scrim');
document.body.append(panel);
const hud=make('div','game-hud');hud.append($('date').parentElement,$('status-strip'));$('scene').append(hud);
function closePanel(){panel.classList.remove('is-open');scrim.hidden=true;document.querySelectorAll('[data-open-view]').forEach(b=>b.setAttribute('aria-expanded','false'));}
function openPanel(name){view=name;render();panel.classList.add('is-open');scrim.hidden=false;document.querySelectorAll('[data-open-view]').forEach(b=>b.setAttribute('aria-expanded',String(b.dataset.openView===name)));$('close-panel').focus();}
document.querySelectorAll('[data-open-view]').forEach(b=>{b.setAttribute('aria-controls','management-panel');b.setAttribute('aria-expanded','false');b.addEventListener('click',()=>openPanel(b.dataset.openView));});
$('close-panel').addEventListener('click',closePanel);scrim.addEventListener('click',closePanel);
document.addEventListener('keydown',e=>{if(e.key==='Escape')closePanel();});
panel.addEventListener('click',e=>{if(e.target.closest('.business-footer button,.goal button'))closePanel();});

// Small transparent scene controls, with colour carried by their icons.
const toolIcons={business:'<path d="M5 10h22l-2-6H7zM7 13v14h18V13M12 27v-9h8v9"/>',bag:'<path d="M9 10h14l5 17H4zM12 10V7a4 4 0 0 1 8 0v3M11 18h10"/>',skills:'<path d="M16 7Q9 3 4 6v20q6-3 12 1q6-4 12-1V6q-5-3-12 1v20M8 12h4m-4 5h4m8-5h4m-4 5h4"/>',ledger:'<path d="M8 4h17v24H8zM5 9h6M5 16h6M5 23h6M15 10h6m-6 6h6m-6 6h4"/>'};
for(const b of document.querySelectorAll('[data-open-view]')){const label=b.textContent;b.replaceChildren();b.innerHTML=`<svg viewBox="0 0 32 32" aria-hidden="true">${toolIcons[b.dataset.openView]}</svg><span>${label}</span>`;b.setAttribute('aria-label',label);}

const maps=createMapScreen({navigate:id=>state.location===id||dispatch('travel:'+id)});
$('world-map-button').addEventListener('click',maps.openWorld);

const sceneSurface=make('div','scene-surface');
for(const node of [$('scene-image'),document.querySelector('.scene-wash'),document.querySelector('.scene-water'),$('scene-motion'),$('npc-layer')])sceneSurface.append(node);
$('scene').prepend(sceneSurface);
const initialFocus=sceneCatalog[state.location].people[0];
sceneCamera=createSceneCamera({scene:$('scene'),surface:sceneSurface,focus:{x:initialFocus[1],y:initialFocus[2]}});
const resetCamera=make('button','camera-reset','↺');resetCamera.type='button';resetCamera.setAttribute('aria-label','重置场景视角');resetCamera.addEventListener('click',()=>sceneCamera.reset());$('scene').append(resetCamera);
$('scene').dataset.location=state.location;

if(new URLSearchParams(location.search).has('qa'))Object.defineProperty(window,'__sceneCamera',{value:sceneCamera});

function renderPeopleFocus(scene){
 let nav=$('people-focus');if(!nav){nav=make('div','people-focus');nav.id='people-focus';nav.dataset.cameraIgnore='';$('scene').append(nav);}
 nav.replaceChildren();nav.hidden=scene.people.length<2;
 for(const [id,x,y] of scene.people){const b=make('button');b.innerHTML=hudIcon(id==='npc-shop'?'shop':'broker');b.title='找'+npcs[id].name;b.setAttribute('aria-label','找'+npcs[id].name);b.type='button';b.addEventListener('click',()=>sceneCamera?.focus(x,y));nav.append(b);}
}
renderPeopleFocus(sceneCatalog[state.location]);

async function presentScene(id,scene){
 const request=++sceneRequest,stage=$('scene');stage.classList.add('scene-loading');
 let status=$('scene-load-status');if(!status){status=make('span','scene-load-status');status.id='scene-load-status';status.setAttribute('role','status');stage.append(status);}
 status.textContent='正在前往'+locationCatalog[id].name+'…';
 const start=performance.now();
 try{
  let asset;try{asset=await sceneAssets.load(scene.image);}catch{asset=await sceneAssets.load(scene.image.replace('-v3.webp','-v2.jpg'));}
  if(request!==sceneRequest)return;
  backgroundMotion.setScene(id,asset.image);$('scene-image').src=asset.url;$('scene-image').alt=scene.region+'的水墨场景';
  renderPeople(scene);renderPeopleFocus(scene);const focus=scene.people[0];sceneCamera?.focus(focus[1],focus[2]);
  stage.dataset.location=id;stage.dataset.sceneReady=id;stage.dataset.sceneLoadMs=(performance.now()-start).toFixed(1);
  stage.classList.remove('scene-loading');status.textContent='';
  sceneAssets.warm(Object.values(sceneCatalog).map(s=>s.image));
 }catch{if(request===sceneRequest){lastLocation='';status.textContent='场景暂未加载，请重新点地点重试';stage.classList.remove('scene-loading');}}
}

function renderQuickItems(){
 const items=Object.entries(state.inventory).filter(([,n])=>n>0);
 $('quick-items').replaceChildren(...items.map(([id,count])=>{
  const item=itemCatalog[id],b=make('button','quick-item');b.type='button';b.dataset.item=id;b.setAttribute('aria-label',`${item.name}，${count}份`);
  b.innerHTML=hudIcon(id);b.title=`${item.name} × ${count}`;b.append(make('b','quick-item-count',count));
  b.addEventListener('click',()=>{
   $('quick-item-title').textContent=`${item.name} × ${state.inventory[id]||0}`;
   $('quick-item-description').textContent=item.description||'随身物资，可用于经营和日常生活。';
   const food=getActions(state,'bag').filter(a=>a.id==='eat:'+id);
   $('quick-item-actions').replaceChildren(...food.map(a=>{const button=actionButton(a);button.addEventListener('click',()=>{if(!button.disabled)$('quick-item-dialog').close();});return button;}));
   $('quick-item-dialog').showModal();
  });return b;
 }));
 if(!items.length)$('quick-items').append(make('span','quick-empty','暂无随身物品'));
}
$('close-quick-item').addEventListener('click',()=>$('quick-item-dialog').close());

for(const button of document.querySelectorAll('.game-tools button'))button.title=button.getAttribute('aria-label')||button.textContent.trim();
