import { rules, businessCatalog, itemCatalog, locationCatalog, skillLabels, priceCatalog, contextLocations } from './data.js';
export { rules, businessCatalog, itemCatalog, locationCatalog, skillLabels, priceCatalog };

const clone = value => JSON.parse(JSON.stringify(value));
const clamp = (n, low, high) => Math.max(low, Math.min(high, n));
const integer = (n, low = 0, high = 1e9) => Number.isSafeInteger(n) && n >= low && n <= high;
const keysExactly = (value, keys) => plain(value) && Object.keys(value).length === keys.length && keys.every(key => Object.hasOwn(value, key));
const plain = value => value !== null && typeof value === 'object' && !Array.isArray(value) && Object.getPrototypeOf(value) === Object.prototype;
const count = (s, id) => s.inventory[id] || 0;
const used = s => Object.values(s.inventory).reduce((sum, value) => sum + value, 0);
const quality = (s, id) => s.quality[id] || 1;
const totalMinutes = s => (s.day - 1) * 1440 + Math.round(s.hour * 60);

export function timeLabel(s) {
  const minute = Math.round(s.hour * 60);
  return `第${s.day}日 ${String(Math.floor(minute / 60)).padStart(2,'0')}:${String(minute % 60).padStart(2,'0')}`;
}
export function season(s) { return ['春','夏','秋','冬'][Math.floor((s.day - 1) / rules.daysPerSeason) % 4]; }

export function newGame() {
  return { version: 1, day: 1, hour: 7, money: 45, debt: 0, energy: 90, hunger: 90,
    location: 'home', inventory: { bread: 3 }, quality: {},
    skills: { farm: 0, fish: 0, noodle: 0, cooking: 0 },
    businesses: { farm: null, fish: null, noodle: null }, facilities: { bed: 100, stove: 100 },
    worked: {}, reliefDay: 0, market: { day: 1, sold: {} }, ledger: [],
    logs: [{ timestamp: '第1日 07:00', day: 1, hour: 7, narrative: '带着45文和三张饼回到山村。先找师傅做活，攒本领也攒本钱。' }],
  };
}

function log(s, narrative) {
  s.logs.push({ timestamp: timeLabel(s), day: s.day, hour: s.hour, narrative });
  s.logs = s.logs.slice(-50);
}
function money(s, delta, category, label, debtDelta = 0) {
  s.money += delta; s.debt += debtDelta;
  s.ledger.push({ day: s.day, hour: s.hour, category, label, delta, balance: s.money, debtDelta, debtBalance: s.debt });
}
function bill(s, amount, category, label) {
  const paid = Math.min(s.money, amount);
  money(s, -paid, category, label, amount - paid);
  if (paid < amount) log(s, `${label}应付${amount}文，付了${paid}文，余款记入欠账。仍可打工谋生。`);
}
function add(s, id, amount, itemQuality = 1) {
  const previous = count(s,id), next = previous + amount;
  if (amount > 0 && itemCatalog[id].basePrice) {
    s.quality[id] = clamp(Math.floor((previous * quality(s,id) + amount * itemQuality) / next),1,5);
  }
  if (next === 0) { delete s.inventory[id]; delete s.quality[id]; }
  else s.inventory[id] = next;
}
function newDay(s) {
  s.market = { day:s.day, sold:{} };
  bill(s, rules.livingCost, 'living', '一家一日的柴水杂用');
  for (const [id,b] of Object.entries(s.businesses)) {
    if (!b) continue;
    bill(s, businessCatalog[id].dailyRent, 'rent', `${businessCatalog[id].name}日租`);
    bill(s, rules.maintenanceCost, 'maintenance', `${businessCatalog[id].name}日常维护`);
    b.condition = Math.max(0,b.condition - 1);
    if (id === 'fish' && b.batch) {
      if (count(s,'feed') > 0) { add(s,'feed',-1); log(s,'新的一天，鱼塘实际消耗了一份饲料。'); }
      else { b.batch.quantity = Math.max(0,b.batch.quantity-1); b.batch.missedFeed += 1; log(s,'鱼塘缺一份饲料，这一批少成活一尾。补买饲料可防止明日再损失。'); }
    }
  }
}
function advance(s, minutes) {
  let remaining = minutes;
  while (remaining > 0) {
    const at = Math.round(s.hour * 60), step = Math.min(remaining,1440-at);
    s.hunger = Math.max(0,s.hunger-step * rules.hungerPerHour / 60);
    s.energy = Math.max(0,s.energy-step * rules.energyPerHour / 60);
    const next = at + step;
    s.hour = next / 60;
    remaining -= step;
    if (next >= 1440) { s.day += 1; s.hour = 0; newDay(s); }
  }
  s.hunger = Math.round(s.hunger * 1000) / 1000;
  s.energy = Math.round(s.energy * 1000) / 1000;
}
function workTime(s, minutes, energy) { s.energy -= energy; advance(s,minutes); }
function foodAvailable(s) { return Object.keys(s.inventory).some(id => itemCatalog[id].hunger && count(s,id)>0); }
function workReason(s, energy) { return s.hunger < 10 ? '先吃点东西，饱食至少要有10。' : s.energy < energy ? `体力不足${energy}，先回家歇息。` : ''; }
function here(s, location) { return s.location === location ? '' : `先去${locationCatalog[location].name}再做这件事。`; }
function inputReason(s, inputs) {
  const missing = Object.entries(inputs).filter(([id,n]) => count(s,id)<n).map(([id,n]) => `${itemCatalog[id].name}×${n}`);
  return missing.length ? `原料不足，需要${missing.join('、')}。` : '';
}
function makeBatch(id, skill, day) {
  const quantity = id === 'farm' ? 4+Math.floor(skill/12) : Math.floor(businessCatalog.fish.inputs.fingerling*Math.min(.95,.65+skill*.003));
  return { startedDay:day, readyDay:day+businessCatalog[id].growthDays, skill,
    quantity, quality:Math.min(5,1+Math.floor(skill/25)), missedFeed:0 };
}
export function repairCost(state,id) {
  const condition = Object.hasOwn(businessCatalog,id) ? state.businesses[id]?.condition : state.facilities[id];
  return condition === undefined ? 0 : Math.max(rules.repairMinimum,Math.ceil((100-condition)*rules.repairRate));
}
export function quoteSale(s,id,tier='normal') {
  const item = itemCatalog[id], choice = priceCatalog[tier];
  if (!item?.basePrice || !choice) return { quantity:0, unitPrice:0, total:0, capacity:0, quality:1 };
  const seasonal = season(s)==='冬' && id==='vegetables' ? 1.25 : season(s)==='夏' && id==='fish' ? 1.1 : 1;
  const demand = item.demand + (s.day+Object.keys(itemCatalog).indexOf(id))%3;
  const capacity = Math.floor(demand*choice.demand);
  const available = Math.max(0,capacity-(s.market.sold[id]||0));
  const quantity = Math.min(count(s,id),available);
  const unitPrice = Math.max(1,Math.floor(item.basePrice*choice.price*(1+(quality(s,id)-1)*.12)*seasonal));
  return { quantity, unitPrice, total:quantity*unitPrice, capacity, quality:quality(s,id) };
}

function reason(s,id) {
  const [verb,key,tier] = id.split(':');
  if (verb === 'travel') return !Object.hasOwn(locationCatalog,key) ? '没有这个地方。' : s.location === key ? '已经在这里了。' : '';
  if (verb === 'work' && Object.hasOwn(businessCatalog,key)) return here(s,businessCatalog[key].location) || (s.worked[key]===s.day ? '今天已经替这位师傅做过活，明天再来。' : '') || workReason(s,rules.workEnergy);
  if (verb === 'lease' && Object.hasOwn(businessCatalog,key)) return here(s,'village') || (s.businesses[key] ? '已经租好了。' : '') || (s.skills[key]<rules.leaseSkill ? `先实际帮工学到${rules.leaseSkill}点${skillLabels[key]}，钱不能替代本领。` : '') || (s.debt>0 ? '先还清欠账，再开新生意。' : '') || (s.money<businessCatalog[key].leaseCost ? '本钱还不够，先帮工攒一攒。' : '');
  if (['produce','harvest','close'].includes(verb) && Object.hasOwn(businessCatalog,key)) {
    const c = businessCatalog[key], b = s.businesses[key];
    let r = here(s,c.location) || (!b ? '先向村中管事租下经营场地。' : ''); if (r) return r;
    if (verb === 'close') return b.batch ? '先把这一批收完，再退租。' : '';
    if (b.condition<=0) return '设施已经损坏，先请匠人修理。';
    if (verb === 'harvest') return key==='noodle' ? '面食做好就直接入库。' : !b.batch ? '还没有在生产的这一批。' : s.day<b.batch.readyDay ? `还需${b.batch.readyDay-s.day}天。` : used(s)+b.batch.quantity>rules.capacity ? '背篓装不下全部收成，先卖货或吃些食物；收成仍留在原处。' : workReason(s,6);
    if (b.batch) return '这一批还在生产，先照料并收完。';
    if (key==='noodle' && s.skills.cooking<6) return '先跟面馆师傅实际帮工，厨艺达到6再独立做面。';
    const output = key==='noodle' ? 4+Math.floor(s.skills.noodle/12) : 0;
    const consumed = Object.values(c.inputs).reduce((a,b)=>a+b,0);
    return inputReason(s,c.inputs) || (used(s)-consumed+output>rules.capacity ? '背篓装不下这一锅面。' : '') || workReason(s,c.energy);
  }
  if (verb === 'buy' && itemCatalog[key]?.buy>0) return here(s,'village') || (s.money<itemCatalog[key].buy ? '钱不够。' : '') || (used(s)>=rules.capacity ? '背篓已满。' : '');
  if (verb === 'sell' && itemCatalog[key]?.basePrice && priceCatalog[tier]) return here(s,'market') || (count(s,key)===0 ? '没有这类货物。' : '') || (quoteSale(s,key,tier).quantity===0 ? '今天这个价位的客人已经买够了，换个价位试试，或留到明日。' : '');
  if (verb === 'eat' && itemCatalog[key]?.hunger) return count(s,key)<1 ? '背篓里没有这份食物。' : s.hunger>=100 ? '已经吃饱，先留着食物。' : '';
  if (verb === 'discard' && Object.hasOwn(itemCatalog,key)) return count(s,key)<1 ? '背篓里没有这件物品。' : '';
  if (verb === 'repair' && (Object.hasOwn(businessCatalog,key) || ['bed','stove'].includes(key))) {
    const b = businessCatalog[key] ? s.businesses[key] : null;
    return here(s,businessCatalog[key]?.location || 'home') || (Object.hasOwn(businessCatalog,key) && !b ? '还没有租下这处设施。' : '') || ((b?.condition??s.facilities[key])>=100 ? '设施完好，不需要花钱。' : '') || (s.money<repairCost(s,key) ? '钱不够付匠人的带料服务费。' : '') || workReason(s,5);
  }
  if (id==='cook:meal') return here(s,'home') || (s.facilities.stove<=0 ? '灶已损坏，先请匠人修理。' : '') || (s.skills.cooking<6 ? '先到面馆实际帮工，厨艺达到6再做家常饭。' : '') || inputReason(s,{flour:1,vegetables:1,water:1}) || workReason(s,5);
  if (id==='rest' || id==='sleep') return here(s,'home');
  if (id==='relief') return here(s,'village') || (s.reliefDay===s.day ? '今天已经领过救急饼。' : '') || (s.money>=4 || s.hunger>=15 || foodAvailable(s) ? '救急饼留给不足4文、没有可吃食物且饱食低于15的人。' : '') || (used(s)>=rules.capacity ? '背篓已满，先腾出一格。' : '');
  if (id==='repay') return here(s,'village') || (s.debt===0 ? '没有欠账。' : '') || (s.money===0 ? '先打工挣些钱再还账。' : '');
  return '没有这项操作。';
}

function execute(s,id) {
  const [verb,key,tier] = id.split(':');
  if (verb==='travel') { workTime(s,15,Math.min(s.energy,1)); s.location=key; return `走了片刻，来到${locationCatalog[key].name}。`; }
  if (verb==='work') {
    workTime(s,rules.workMinutes,rules.workEnergy); s.worked[key]=s.day;
    s.skills[key]=Math.min(100,s.skills[key]+rules.workSkill);
    if(key==='noodle') s.skills.cooking=Math.min(100,s.skills.cooking+3);
    money(s,rules.workWage,'wage',`${skillLabels[key]}实际帮工工资`);
    return `踏实做了两小时活，挣${rules.workWage}文，${skillLabels[key]}+${rules.workSkill}${key==='noodle'?'、厨艺+3':''}。今天这份工钱已经结清。`;
  }
  if (verb==='lease') { money(s,-businessCatalog[key].leaseCost,'lease',`${businessCatalog[key].name}开业费用`); s.businesses[key]={condition:100,batch:null}; advance(s,30); return `租下${businessCatalog[key].name}。从明日起，每日租金${businessCatalog[key].dailyRent}文、维护1文；这只是起点，还要真买原料、生产和卖货。`; }
  if (verb==='produce') {
    const c=businessCatalog[key],b=s.businesses[key],skill=s.skills[key];
    for(const [item,n] of Object.entries(c.inputs)) add(s,item,-n);
    workTime(s,c.minutes,c.energy); b.condition=Math.max(0,b.condition-c.wear);
    if(key==='noodle') { const quantity=4+Math.floor(skill/12),q=Math.min(5,1+Math.floor(skill/25)); add(s,'noodles',quantity,q); s.skills.cooking=Math.min(100,s.skills.cooking+2); s.skills.noodle=Math.min(100,skill+2); return `用真实原料做成${quantity}份手作面，品质${q}。还需要在集镇选择定价、实际卖出。`; }
    b.batch=makeBatch(key,skill,s.day); s.skills[key]=Math.min(100,skill+2);
    return `${key==='farm'?'播好菜种':'完成放养'}，这一批将在第${b.batch.readyDay}日成熟。${key==='fish'?'收鱼前每天还需一份饲料，成熟后未收也要喂；缺料会降低成活。':'种植本领决定这一批的产量与品质。'}`;
  }
  if(verb==='harvest') { const b=s.businesses[key],batch=b.batch; workTime(s,30,6); add(s,businessCatalog[key].product,batch.quantity,batch.quality); b.batch=null;b.condition=Math.max(0,b.condition-2);s.skills[key]=Math.min(100,s.skills[key]+2);return `收下${batch.quantity}份${itemCatalog[businessCatalog[key].product].name}，品质${batch.quality}。这批已结算，不能重复领取。`; }
  if(verb==='close') { s.businesses[key]=null;advance(s,15);return `退租${businessCatalog[key].name}，从明日起不再计租金和维护；开业费用不退。`; }
  if(verb==='buy') { money(s,-itemCatalog[key].buy,'purchase',`购买${itemCatalog[key].name}×1`);add(s,key,1);advance(s,5);return `花${itemCatalog[key].buy}文买了${itemCatalog[key].name}×1。`; }
  if(verb==='sell') { const q=quoteSale(s,key,tier);add(s,key,-q.quantity);s.market.sold[key]=(s.market.sold[key]||0)+q.quantity;money(s,q.total,'sale',`${priceCatalog[tier].name}出售${itemCatalog[key].name}×${q.quantity}`);advance(s,15);return `按${priceCatalog[tier].name}卖出${q.quantity}份${itemCatalog[key].name}，每份${q.unitPrice}文，共${q.total}文。今天的客人数量有限。`; }
  if(verb==='eat') {add(s,key,-1);advance(s,5);s.hunger=Math.min(100,s.hunger+itemCatalog[key].hunger);s.energy=Math.min(100,s.energy+itemCatalog[key].energy);return `吃了${itemCatalog[key].name}，饱食和体力恢复了一些。`; }
  if(verb==='discard') {add(s,key,-1);advance(s,1);return `丢弃${itemCatalog[key].name}×1，腾出一格背篓。`;}
  if(verb==='repair') {const fee=repairCost(s,key);money(s,-fee,'repair',`匠人带料修理${businessCatalog[key]?.name||({bed:'床',stove:'灶'})[key]}`);workTime(s,60,5);if(businessCatalog[key])s.businesses[key].condition=100;else s.facilities[key]=100;return `付${fee}文请匠人带料修好设施，费用已含材料；未凭空获得新技能。`; }
  if(id==='cook:meal') {for(const [item,n]of Object.entries({flour:1,vegetables:1,water:1}))add(s,item,-n);workTime(s,30,5);add(s,'meal',1);s.skills.cooking=Math.min(100,s.skills.cooking+2);s.facilities.stove=Math.max(0,s.facilities.stove-3);return '用面粉、青菜和水做出一份家常热饭，厨艺+2；饭在背篓里，记得吃。';}
  if(id==='sleep'||(id==='rest'&&s.hour>=18)) { const poor=s.facilities.bed===0; advance(s,1440-Math.round(s.hour*60)+360);s.energy=poor?55:95;s.facilities.bed=Math.max(0,s.facilities.bed-2);return `睡到次日清晨，体力恢复到${s.energy}。${poor?'床坏了，只能铺地而睡。':''}租金、维护、生活杂用和鱼饲料已按日结算，饱食不会凭睡觉增加。`; }
  if(id==='rest') {advance(s,60);const recovery=s.facilities.bed===0?12:25;s.energy=Math.min(100,s.energy+recovery);s.facilities.bed=Math.max(0,s.facilities.bed-1);return `歇了一小时，恢复${recovery}体力；时间和饱食仍有消耗。`; }
  if(id==='relief') {add(s,'bread',1);s.reliefDay=s.day;advance(s,10);return '村邻递来一张救急饼。吃了再歇一歇，明日仍可靠实际帮工谋生。';}
  if(id==='repay') {const paid=Math.min(s.money,s.debt);money(s,-paid,'repay','归还欠账',-paid);advance(s,10);return `归还${paid}文欠账，余欠${s.debt}文。`;}
  throw new Error('unknown action');
}

export function reduce(state,actionId) {
  const valid=validate(state);
  if(!valid.ok)return {ok:false,state,message:`存档状态无效：${valid.message}`};
  if(typeof actionId!=='string'||actionId.length>100)return {ok:false,state,message:'操作无效。'};
  try {const denied=reason(state,actionId);if(denied)return {ok:false,state,message:denied};
    const next=clone(state);const message=execute(next,actionId);log(next,message);const check=validate(next);if(!check.ok)return {ok:false,state,message:`操作未完成：${check.message}`};return {ok:true,state:next,message};}
  catch {return {ok:false,state,message:'操作未完成，原状态已保留。'};}
}

function describe(s,id) {
  const [verb,key,tier]=id.split(':'),c=businessCatalog[key];
  let label=id,description='',cost={};
  if(verb==='travel'){label=`前往${locationCatalog[key].name}`;description='步行一刻钟，少量消耗体力。';cost={minutes:15,energy:1};}
  if(verb==='work'){label=`帮工学${skillLabels[key]} · 工钱18文`;description='实际劳动两小时，经验+6；每位师傅每天只结一次工资。';cost={minutes:120,energy:18};}
  if(verb==='lease'){label=`租下${c.name} · ${c.leaseCost}文`;description=`需${skillLabels[key]}≥20；每日租金${c.dailyRent}文与维护1文。`;cost={money:c.leaseCost,minutes:30};}
  if(verb==='produce'){label=key==='farm'?'播下这一茬菜':key==='fish'?'放养一批鱼':'做一锅手作面';description=c.description;cost={minutes:c.minutes,energy:c.energy,items:clone(c.inputs)};}
  if(verb==='harvest'){label=key==='farm'?'收菜入库':'收鱼入库';description=s.businesses[key]?.batch?`第${s.businesses[key].batch.readyDay}日可收；整批入库，背篓需留足空间。`:'先投料开始生产。';cost={minutes:30,energy:6};}
  if(verb==='close'){label=`退租${c.name}`;description='必须先收完当前批次；开业费不退，明日起停止日租。';cost={minutes:15};}
  if(verb==='buy'){label=`买${itemCatalog[key].name} · ${itemCatalog[key].buy}文`;description=itemCatalog[key].description||'每次购买一份，真实扣钱入库。';cost={money:itemCatalog[key].buy,minutes:5};}
  if(verb==='sell'){const q=quoteSale(s,key,tier);label=`${itemCatalog[key].name} · ${priceCatalog[tier].name}`;description=`品质${q.quality}，每份${q.unitPrice}文；现可卖${q.quantity}份，合${q.total}文。高价会减少愿买的客人。`;cost={minutes:15};}
  if(verb==='eat'){label=`吃${itemCatalog[key].name}`;description=`消耗一份，饱食+${itemCatalog[key].hunger}、体力+${itemCatalog[key].energy}。`;cost={minutes:5,items:{[key]:1}};}
  if(verb==='discard'){label=`丢弃一份${itemCatalog[key].name}`;description='只丢弃一份，腾出一格；不退钱。背篓满时可先腾格再买食物或收获。';cost={minutes:1,items:{[key]:1}};}
  if(verb==='repair'){const fee=repairCost(s,key);label=`请匠人修${c?.name||({bed:'床',stove:'灶'})[key]} · ${fee}文`;description='服务费含匠人带来的材料，修复到100；需要协助搬挪。';cost={money:fee,minutes:60,energy:5};}
  if(id==='cook:meal'){label='做家常热饭';description='需厨艺6；用面粉、青菜和清水各一份，饭做好后还要吃。';cost={minutes:30,energy:5,items:{flour:1,vegetables:1,water:1}};}
  if(id==='rest'){label=s.hour>=18?'收工过夜，明早再来':'歇息一小时';description=s.hour>=18?'过夜恢复体力，跨日结算经营成本；饱食照常消耗。':'免费恢复一些体力，时间与饱食照常消耗。';cost={minutes:s.hour>=18?1440-Math.round(s.hour*60)+360:60};}
  if(id==='sleep'){label='睡到明日清晨';description='恢复体力，按日结算生活成本、租金、维护与鱼饲料；不会自动吃饭。';cost={minutes:1440-Math.round(s.hour*60)+360};}
  if(id==='relief'){label='向村邻求一张救急饼';description='只供不足4文、没有可吃食物且饱食低于15的人，每日一次。';cost={minutes:10};}
  if(id==='repay'){label='用现钱还欠账';description=`现欠${s.debt}文；本次最多归还${Math.min(s.debt,s.money)}文。`;cost={money:Math.min(s.debt,s.money),minutes:10};}
  const blocked=reason(s,id);
  return {id,label,description,cost,disabled:!!blocked,reason:blocked};
}

export function getActions(state,contextId) {
  if(!validate(state).ok)return [];
  let ids=[];
  const routeMap={'npc-farmer':'farm','npc-fisher':'fish','npc-cook':'noodle',field:'farm',pond:'fish',market:'noodle'};
  const route=Object.hasOwn(routeMap,contextId)?routeMap[contextId]:null;
  if(route){ids.push(`work:${route}`,`produce:${route}`);if(route!=='noodle')ids.push(`harvest:${route}`);if(state.businesses[route])ids.push(`repair:${route}`,`close:${route}`);}
  if(contextId==='npc-shop'||contextId==='village')ids.push(...Object.entries(itemCatalog).filter(([,v])=>v.buy>0).map(([id])=>`buy:${id}`));
  if(contextId==='npc-broker'||contextId==='village')ids.push(...Object.keys(businessCatalog).map(id=>`lease:${id}`),'repay','relief');
  if(contextId==='market')for(const id of ['vegetables','fish','noodles'])for(const tier of Object.keys(priceCatalog))ids.push(`sell:${id}:${tier}`);
  if(contextId==='home')ids.push('rest','sleep','cook:meal','repair:bed','repair:stove');
  if(contextId==='home'||contextId==='bag'||contextId==='inventory')ids.push(...Object.keys(state.inventory).filter(id=>itemCatalog[id].hunger).map(id=>`eat:${id}`));
  if(contextId==='bag'||contextId==='inventory')ids.push(...Object.keys(state.inventory).map(id=>`discard:${id}`));
  if(contextId==='travel')ids=Object.keys(locationCatalog).map(id=>`travel:${id}`);
  return [...new Set(ids)].map(id=>describe(state,id));
}

export function dailyAccounts(state,day=state.day) {
  const entries=state.ledger.filter(entry=>entry.day===day);
  return {day,income:entries.reduce((sum,e)=>sum+Math.max(0,e.delta),0),expense:entries.reduce((sum,e)=>sum+Math.max(0,-e.delta),0),entries:clone(entries)};
}

export function validate(s) {
  const bad=message=>({ok:false,message});
  if(!plain(s)||s.version!==1)return bad('版本不兼容。');
  if(!integer(s.day,1,36500)||!Number.isFinite(s.hour)||s.hour<0||s.hour>=24||Math.abs(s.hour*60-Math.round(s.hour*60))>1e-7)return bad('日期或时间无效。');
  if(!integer(s.money)||!integer(s.debt)||!Number.isFinite(s.energy)||s.energy<0||s.energy>100||!Number.isFinite(s.hunger)||s.hunger<0||s.hunger>100)return bad('钱或生活状态无效。');
  if(!Object.hasOwn(locationCatalog,s.location))return bad('地点不存在。');
  if(!plain(s.inventory)||Object.entries(s.inventory).some(([id,n])=>!Object.hasOwn(itemCatalog,id)||!integer(n,1,rules.capacity))||used(s)>rules.capacity)return bad('背篓物品或容量无效。');
  if(!plain(s.quality)||Object.entries(s.quality).some(([id,n])=>!itemCatalog[id]?.basePrice||!count(s,id)||!integer(n,1,5)))return bad('货物品质无效。');
  for(const id of Object.keys(s.inventory))if(itemCatalog[id].basePrice&&!Object.hasOwn(s.quality,id))return bad('缺少货物品质。');
  if(!keysExactly(s.skills,Object.keys(skillLabels))||Object.values(s.skills).some(n=>!integer(n,0,100)))return bad('技能无效。');
  if(!keysExactly(s.facilities,['bed','stove'])||Object.values(s.facilities).some(n=>!integer(n,0,100)))return bad('居家设施无效。');
  if(!keysExactly(s.businesses,Object.keys(businessCatalog)))return bad('经营场地无效。');
  for(const [id,b]of Object.entries(s.businesses)) {
    if(b===null)continue;
    if(!keysExactly(b,['condition','batch'])||!integer(b.condition,0,100)||s.skills[id]<rules.leaseSkill)return bad('租约与技能或设施不符。');
    if(b.batch===null)continue;
    const x=b.batch;
    if(id==='noodle'||!keysExactly(x,['startedDay','readyDay','skill','quantity','quality','missedFeed'])||!integer(x.startedDay,1,s.day)||!integer(x.skill,rules.leaseSkill,s.skills[id])||x.readyDay!==x.startedDay+businessCatalog[id].growthDays||!integer(x.quantity,0,100)||!integer(x.quality,1,5)||!integer(x.missedFeed,0,s.day-x.startedDay))return bad('生产批次无效。');
    const expected=makeBatch(id,x.skill,x.startedDay);
    if(x.quality!==expected.quality||x.quantity!==Math.max(0,expected.quantity-(id==='fish'?x.missedFeed:0))||(id==='farm'&&x.missedFeed!==0))return bad('批次产量与技能或饲养记录不符。');
  }
  if(!plain(s.worked)||Object.entries(s.worked).some(([id,n])=>!Object.hasOwn(businessCatalog,id)||!integer(n,1,s.day))||!integer(s.reliefDay,0,s.day))return bad('每日劳动记录无效。');
  if(!keysExactly(s.market,['day','sold'])||s.market.day!==s.day||!plain(s.market.sold)||Object.entries(s.market.sold).some(([id,n])=>!itemCatalog[id]?.basePrice||!integer(n,0,100)))return bad('市场需求记录无效。');
  if(!Array.isArray(s.logs)||s.logs.length>50||s.logs.some(e=>!plain(e)||typeof e.narrative!=='string'||e.narrative.length>1000||typeof e.timestamp!=='string'||!integer(e.day,1,s.day)||!Number.isFinite(e.hour)||e.hour<0||e.hour>=24))return bad('日记无效。');
  if(!Array.isArray(s.ledger)||s.ledger.length>100000)return bad('账本无效。');
  let balance=rules.initialMoney,debt=0,last=0;
  for(const e of s.ledger){
    if(!plain(e)||!integer(e.day,1,s.day)||!Number.isFinite(e.hour)||e.hour<0||e.hour>=24||typeof e.category!=='string'||typeof e.label!=='string'||e.label.length>300||!integer(e.delta,-1e9,1e9)||!integer(e.debtDelta,-1e9,1e9)||!integer(e.balance)||!integer(e.debtBalance))return bad('账本条目无效。');
    const at=(e.day-1)*1440+Math.round(e.hour*60);
    if(at<last||at>totalMinutes(s))return bad('账本时间顺序无效。');
    balance+=e.delta;debt+=e.debtDelta;
    if(balance!==e.balance||debt!==e.debtBalance)return bad('账本余额不符。');last=at;
  }
  if(balance!==s.money||debt!==s.debt)return bad('钱或欠账与账本不符。');
  return {ok:true,message:'状态有效。'};
}

export function exportSave(state) {
  const checked=validate(state);
  if(!checked.ok)throw new Error(checked.message);
  return JSON.stringify({format:'shanhe-text-business',version:1,state});
}
export function importSave(text) {
  try{if(typeof text!=='string'||text.length>8*1024*1024)return {ok:false,state:null,message:'存档大小或格式无效。'};
    const value=JSON.parse(text);
    if(!plain(value)||value.format!=='shanhe-text-business'||value.version!==1)return {ok:false,state:null,message:'存档版本不兼容，未改动当前游戏。'};
    const checked=validate(value.state);
    return checked.ok?{ok:true,state:clone(value.state),message:'读档成功。'}:{ok:false,state:null,message:checked.message};
  }catch{return {ok:false,state:null,message:'存档损坏，未改动当前游戏。'};}
}
