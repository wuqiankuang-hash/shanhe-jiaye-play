import {attachWorkMotion} from './work-motion.js?v=7';
// Each occupation uses a transparent eight-frame painted work cycle.
// Frame order and timing are shared by all scenes; no SVG puppet distortion.
const work={
 farmer:{label:'俯身锄地',duration:2400},fisher:{label:'取料喂鱼',duration:3000},
 cook:{label:'搅锅煮面',duration:2400},shop:{label:'称粮装货',duration:3000},
 broker:{label:'执笔记账',duration:2800},neighbor:{label:'扫院理家',duration:2600},
};
export function createWorkActor(id){
 const type=id.replace(/^npc-/,''),task=work[type];if(!task)throw new Error('Unknown work actor');
 const actor=document.createElement('span');actor.className='work-actor sprite-actor work-'+type;
 actor.dataset.work=type;actor.activityLabel=task.label;actor.setAttribute('aria-hidden','true');
 actor.style.backgroundImage=`url(assets/work/${type}-v2.webp)`;
 actor.style.setProperty('--work-duration',task.duration+'ms');
 attachWorkMotion(actor,{type,duration:task.duration});
 return actor;
}
