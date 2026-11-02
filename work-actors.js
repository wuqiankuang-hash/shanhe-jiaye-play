// Articulated working figures. The original portraits supply each villager's face;
// sleeves, hands and tools are separate joints, rather than a moving idle sprite.
const NS='http://www.w3.org/2000/svg';
let serial=0;
const people={
  farmer:{label:'俯身锄地',coat:'#90724e',crop:'45 0 90 116',size:[184,479],head:'M85 2Q103 0 103 19Q125 25 123 54L120 67Q128 66 122 81L116 88L111 101L105 116L77 116L71 96L62 82Q49 77 54 65L59 57Q53 29 76 19Q67 5 85 2Z'},
  fisher:{label:'扬手喂鱼',coat:'#687575',crop:'79 0 109 110',size:[242,391],head:'M120 2L139 6L144 15L164 17L174 19L174 35L185 47L173 56L163 47L162 70L155 93L139 108L111 106L97 91L91 72Q80 71 85 54L85 37L93 19L115 14Z'},
  cook:{label:'搅锅煮面',coat:'#876862',crop:'48 0 110 116',size:[243,461],head:'M85 4L110 0L135 14L148 40L149 67L137 81L135 101L122 115L91 116L77 101L69 84L53 77L54 57L64 30Z'},
  shop:{label:'装粮称货',coat:'#966a51',crop:'69 0 91 116',size:[237,433],head:'M97 3L114 2L124 13L123 21L139 27L149 48L149 58L158 62L153 79L146 82L144 99L132 114L107 116L91 104L82 83Q70 79 75 65L80 57L76 41L83 24L94 21Z'},
  broker:{label:'执笔记账',coat:'#788d98',crop:'51 0 94 119',size:[220,459],head:'M57 22L74 7L99 1L123 8L125 23L134 40L126 52L127 67L139 70L135 85L125 88L122 105L111 118L89 118L78 105L68 87L59 82L59 68L65 61L63 43Z'},
  neighbor:{label:'扫院理家',coat:'#ad7865',crop:'39 0 99 121',size:[184,455],head:'M77 3L95 2L105 14L103 23L123 37L128 59L130 80L121 95L112 109L105 120L76 121L63 107L54 92L45 80L44 61L51 39L40 36L48 27L66 23L66 13Z'},
};
const path=(d,fill,extra='')=>`<path d="${d}" fill="${fill}" ${extra}/>`;
const line=(d,color='#514638',width=2,extra='')=>`<path d="${d}" fill="none" stroke="${color}" stroke-width="${width}" stroke-linecap="round" stroke-linejoin="round" ${extra}/>`;
const hand=(x,y)=>`<ellipse cx="${x}" cy="${y}" rx="5" ry="4" fill="#d9b18b" stroke="#66533d" stroke-width="1"/>`;
function arm(cls,d,coat,handX,handY,tool=''){
  return `<g class="wa-joint ${cls}">${line(d,'#4d493b',15)}${line(d,coat,12)}${hand(handX,handY)}${tool}</g>`;
}
function props(type){
  if(type==='farmer')return `<g class="wa-earth">${path('M91 150Q118 140 153 150L160 156L87 157Z','#9d8b5d')}${line('M97 154L106 148M120 154L132 148M141 154L149 151','#665b3f',1)}<g class="wa-soil">${path('M119 146l4-5 3 6Z','#7b6b46')}${path('M135 148l3-6 4 6Z','#7b6b46')}</g></g>`;
  if(type==='fisher')return `<g>${path('M105 153Q134 147 171 151L175 158Q138 155 106 161Z','#b6c6b5','opacity=".7"')}${line('M117 157q9-5 18-1m10 2q9-4 19-1','#e8eee0',1)}<g class="wa-grains" fill="#c6ad6e"><circle cx="134" cy="100" r="1.8"/><circle cx="142" cy="106" r="1.4"/><circle cx="153" cy="111" r="1.5"/><circle cx="139" cy="119" r="1.4"/></g></g>`;
  if(type==='cook')return `<g>${path('M103 113L155 113L153 153L107 153Z','#7e6e58')}${path('M99 108Q127 101 160 108L155 116L103 116Z','#b6a282')}${line('M111 122L111 148M147 122L147 148','#594e3f',2)}${path('M111 103Q112 124 148 106L149 95L110 95Z','#424a41')}${path('M109 96Q127 87 151 95Q130 104 109 96Z','#d4c79e')}${line('M113 96Q128 91 145 95','#f1e2bd',2)}<g class="wa-steam">${line('M121 89q-7-9 0-17m10 14q7-9 0-18m10 22q-6-9 0-17','#f1efdb',2)}</g></g>`;
  if(type==='shop')return `<g>${path('M98 112L158 112L156 151L100 151Z','#8b7151')}${path('M94 107L160 107L161 114L95 114Z','#b39469')}${line('M104 122h46m-46 11h46','#715d45',1)}${path('M118 83Q110 93 114 106Q128 113 145 106Q148 94 139 83L139 78L121 78Z','#c6b58b')}${line('M122 83q7 3 15 0m-9 0l-5 17m9-17l6 18','#8d805c',1)}${path('M119 78q11-5 21 0q-11 5-21 0Z','#e1d3a4')}</g>`;
  if(type==='broker')return `<g>${path('M95 110L160 110L157 116L98 116Z','#9f825d')}${line('M102 115L100 153M153 115L156 153','#74654b',4)}${path('M104 104L109 93L148 98L145 109Z','#e8ddbb')}${line('M115 98l19 2m-21 3l18 2','#6b6b54',1)}${path('M148 101l1-7h7l1 7Z','#465046')}</g>`;
  return `<g>${path('M117 151q15-5 31 0l-4 5-31-1Z','#b29b68')}${line('M120 151l7 2m3-5l7 4m1-5l7 4','#817347',1)}</g>`;
}
function workingArms(type,coat){
  if(type==='farmer')return `<g class="wa-hoe-swing">${arm('wa-left-arm','M73 65L89 86L104 90',coat,104,90)}${arm('wa-right-arm','M94 66L109 77L116 80',coat,116,80)}${line('M104 63L134 143','#70573b',4)}${path('M132 138l18 4-4 10-16-5Z','#697168')}${line('M105 65L133 140','#b29a6a',1)}</g>`;
  if(type==='fisher')return `${arm('wa-basket-arm','M72 63L62 89L78 99',coat,78,99)}<g>${path('M64 98L97 98L92 119L69 119Z','#a18a60')}${line('M69 99Q80 82 93 99','#756346',2)}${line('M69 106h25m-23 7h21','#c2ad80',1)}</g>${arm('wa-feed-arm','M96 63L114 76L133 78',coat,133,78)}`;
  if(type==='cook')return `${arm('wa-bowl-arm','M70 64L76 90L112 103',coat,112,103)}${arm('wa-stir-arm','M94 63L112 74L132 82',coat,132,82,line('M132 80L126 98','#7e6442',3))}`;
  if(type==='shop')return `${arm('wa-scoop-arm','M73 64L91 86L122 87',coat,122,87,`${line('M121 87L136 91','#90754a',3)}${path('M132 87q15-3 16 4q-7 5-14 1Z','#c7b17d')}`)}${arm('wa-sack-arm','M96 64L109 83L139 83',coat,139,83)}`;
  if(type==='broker')return `${arm('wa-paper-arm','M71 64L80 89L112 104',coat,112,104)}${arm('wa-write-arm','M96 64L114 80L133 93',coat,133,93,line('M136 80L130 104','#494b3d',2))}`;
  return `<g class="wa-sweep-arms">${arm('wa-left-arm','M72 64L87 85L110 97',coat,110,97)}${arm('wa-right-arm','M95 64L108 75L120 80',coat,120,80)}${line('M125 61L101 142','#8c7150',3)}${path('M100 134L90 155Q103 161 116 156L105 135Z','#b7a06b')}${line('M101 139L96 154m7-14l1 16m0-17l7 16','#8d784d',1)}</g>`;
}
export function createWorkActor(id,npc){
  const type=id.replace(/^npc-/,''),p=people[type];
  if(!p)throw new Error(`Unknown working villager: ${id}`);
  const uid=`wa-${++serial}`,root=document.createElement('span');
  root.className=`work-actor work-${type}`;root.dataset.work=type;root.activityLabel=p.label;root.setAttribute('aria-hidden','true');
  const svg=document.createElementNS(NS,'svg');svg.setAttribute('viewBox','0 0 180 168');svg.setAttribute('focusable','false');
  const skirt=type==='cook'||type==='neighbor';
  svg.innerHTML=`<defs><clipPath id="${uid}-head">${path(p.head,'white')}</clipPath><filter id="${uid}-wash" x="-5%" y="-5%" width="110%" height="110%"><feTurbulence type="fractalNoise" baseFrequency=".17" numOctaves="2" seed="7"/><feColorMatrix type="saturate" values="0"/><feComposite in2="SourceGraphic" operator="in"/><feBlend in="SourceGraphic" mode="soft-light"/></filter></defs>
  <ellipse cx="87" cy="156" rx="39" ry="4" fill="#465541" opacity=".18"/>
  <g stroke="#4c4b3a" stroke-width="1.3" stroke-linejoin="round">
  ${path('M68 116L68 145L81 149L87 119Z','#69716a')}${path('M87 117L94 147L107 146L102 114Z','#69716a')}
  ${path('M68 143Q61 149 61 154Q72 159 85 152L80 145Z','#444b43')}${path('M95 143L94 153Q106 158 117 154L107 145Z','#444b43')}
  <g class="wa-torso">${path(skirt?'M72 48L96 48L110 69L116 142Q88 154 55 141L62 70Z':'M71 48L97 48L108 75L106 118Q84 127 60 117L61 74Z',p.coat,`filter="url(#${uid}-wash)"`)}
  ${path('M77 48L85 66L94 48L91 78L82 82Z','#e1d5b4')}${line('M78 49L85 66L94 49','#6b6650',1)}
  ${path(skirt?'M72 79L98 79L108 137Q85 144 64 137Z':'M75 87L95 87L101 120L68 120Z','#c8bea0',`filter="url(#${uid}-wash)"`)}
  ${path('M63 86Q83 92 104 85L105 92Q84 99 63 93Z','#585e4c')}${line('M88 94L96 112M92 95L99 109','#555944',2)}
  <svg x="61" y="3" width="51" height="54" viewBox="${p.crop}" overflow="visible"><image href="${npc.image}" width="${p.size[0]}" height="${p.size[1]}" clip-path="url(#${uid}-head)"/></svg></g>
  </g>${props(type)}<g stroke-linejoin="round">${workingArms(type,p.coat)}</g>`;
  root.append(svg);return root;
}
