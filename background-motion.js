// Native-painting coordinates. Only water, foliage and fabric move; masonry stays fixed.
const regions={
 home:{leaves:[[[0,0],[760,0],[590,120],[430,108],[270,60],[235,238],[130,335],[0,365]],[[1510,270],[1672,240],[1672,570],[1515,505],[1440,430]]],cloth:[[[42,460],[239,401],[252,503],[214,555],[63,588]]]},
 village:{leaves:[[[0,0],[750,0],[710,103],[640,110],[590,50],[470,79],[425,31],[140,68],[65,115],[0,140]],[[1435,125],[1672,95],[1672,306],[1590,290],[1520,225]]],cloth:[[[786,266],[815,269],[819,356],[793,354]]]},
 field:{leaves:[[[380,0],[660,0],[648,146],[542,210],[462,195]],[[0,383],[327,372],[325,442],[0,470]],[[0,660],[150,700],[140,805],[0,765]],[[0,801],[410,870],[591,939],[0,941]]],water:[[[1403,645],[1437,650],[1456,712],[1501,750],[1460,786],[1437,740],[1410,708]]]},
 pond:{leaves:[[[0,0],[506,0],[480,112],[314,116],[211,182],[40,170],[0,233]],[[491,193],[605,141],[887,149],[900,238],[721,263],[528,292]],[[1240,836],[1380,784],[1543,845],[1510,941],[1240,941]]],water:[[[520,354],[783,289],[1045,280],[1260,310],[1410,353],[1658,449],[1672,746],[1510,831],[1430,860],[1178,805],[1068,738],[935,636],[785,565],[688,505],[589,470],[553,423]]],falls:[[[1360,275],[1404,275],[1406,303],[1352,309]]]},
 market:{leaves:[[[0,0],[414,0],[420,40],[280,63],[240,148],[114,139],[0,189]],[[0,661],[151,685],[269,828],[306,941],[0,941]]],cloth:[[[1082,112],[1324,106],[1320,169],[1084,179]]],smoke:[1340,330]}
};
export function createBackgroundMotion(canvas){
 let gl,program,texture,maskTexture,image=null,scene='home',raf=0,last=0,time=0,reduced=false,frames=0,lost=false;
 const vertex='attribute vec2 p;varying vec2 uv;void main(){uv=vec2((p.x+1.)*.5,(1.-p.y)*.5);gl_Position=vec4(p,0,1);}';
 const fragment=`precision highp float;
 varying vec2 uv;uniform sampler2D painting;uniform sampler2D mask;uniform float t;uniform vec2 smoke;
 float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
 float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y);}
 void main(){
  vec4 m=texture2D(mask,uv);float falling=min(m.r,min(m.g,m.b));m.rgb-=vec3(falling);vec2 delta=vec2(0);
  float wind=sin(t*1.5+uv.y*11.)*.65+sin(t*.77+uv.x*18.)*.35;
  delta.x+=m.r*wind*.0035;delta.y+=m.r*sin(t*1.3+uv.x*19.)*.0008;
  delta.x+=m.b*(sin(uv.y*240.+t*2.1)*.0021+sin(uv.y*91.-t*1.2)*.0012);
  delta.y+=m.b*sin(uv.x*140.+t*1.4)*.00065;
  delta.x+=m.g*sin(t*1.6+uv.y*10.)*.0018;delta.y+=m.g*sin(t*1.6)*.00065;
  // Falling-water speed differs from the horizontal pond surface.
  delta.y+=falling*sin(uv.y*320.-t*5.)*.0015;
  vec3 color=texture2D(painting,clamp(uv+delta,vec2(0),vec2(1))).rgb;
  float alpha=max(max(m.r,m.g),max(m.b,falling));
  float sheen=(sin(uv.y*650.+t*2.4+sin(uv.x*21.))* .5+.5);
  color+=vec3(.018,.023,.019)*m.b*sheen;
  vec4 result=vec4(color,alpha);
  if(smoke.x>0. && abs(uv.x-smoke.x)<.07 && uv.y<smoke.y+.04 && uv.y>smoke.y-.2){
   float vapor=0.;
   for(int i=0;i<7;i++){
    float age=fract(t*.15+float(i)/7.);float x=smoke.x+sin(age*5.+t*.32)*(.003+age*.012)+age*.012;
    vec2 center=vec2(x,smoke.y-age*.14);vec2 d=(uv-center)/vec2(.006+age*.015,.014+age*.018);
    float puff=exp(-dot(d,d)*1.8)*sin(age*3.14159)*.28;
    vapor+=puff*(.7+.3*noise(uv*180.+vec2(t*.35,-t*.6)));
   }
   vapor=min(.42,vapor);result=vec4(mix(result.rgb,vec3(.91,.91,.84),vapor/max(.001,alpha+vapor*(1.-alpha))),alpha+vapor*(1.-alpha));
  }
  gl_FragColor=result;
 }`;
 function shader(type,source){const s=gl.createShader(type);gl.shaderSource(s,source);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(s));return s;}
 function init(){
  gl=canvas.getContext('webgl',{alpha:true,premultipliedAlpha:false,antialias:false,depth:false,preserveDrawingBuffer:false});if(!gl)return false;
  program=gl.createProgram();gl.attachShader(program,shader(gl.VERTEX_SHADER,vertex));gl.attachShader(program,shader(gl.FRAGMENT_SHADER,fragment));gl.linkProgram(program);if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw Error('Background shader link failed');gl.useProgram(program);
  const buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,1,1]),gl.STATIC_DRAW);const p=gl.getAttribLocation(program,'p');gl.enableVertexAttribArray(p);gl.vertexAttribPointer(p,2,gl.FLOAT,false,0,0);
  function tex(unit,name){const tex=gl.createTexture();gl.activeTexture(gl.TEXTURE0+unit);gl.bindTexture(gl.TEXTURE_2D,tex);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);gl.uniform1i(gl.getUniformLocation(program,name),unit);return tex;}
  texture=tex(0,'painting');maskTexture=tex(1,'mask');canvas.width=1008;canvas.height=567;gl.viewport(0,0,1008,567);return true;
 }
 function upload(){
  if(!image||!gl||lost)return;
  gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,texture);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,image);
  const mask=document.createElement('canvas');mask.width=836;mask.height=471;const ctx=mask.getContext('2d'),config=regions[scene]||{};
  ctx.fillStyle='#000';ctx.fillRect(0,0,836,471);ctx.scale(.5,.5);ctx.filter='blur(4px)';
  for(const [key,color] of [['leaves','#ff0000'],['cloth','#00ff00'],['water','#0000ff'],['falls','#ffffff']])for(const polygon of config[key]||[]){ctx.fillStyle=color;ctx.beginPath();polygon.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.closePath();ctx.fill();}
  gl.activeTexture(gl.TEXTURE1);gl.bindTexture(gl.TEXTURE_2D,maskTexture);gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL,false);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,mask);
  const s=config.smoke||[-1672,-941];gl.uniform2f(gl.getUniformLocation(program,'smoke'),s[0]/1672,s[1]/941);
  canvas.dataset.scene=scene;canvas.dataset.mode='localized-painting';
 }
 function draw(now){raf=0;if(reduced||document.hidden||lost||!image||!gl)return;if(now-last>=40){time+=Math.min(.08,(now-last)/1000||.04);last=now;gl.uniform1f(gl.getUniformLocation(program,'t'),time);gl.drawArrays(gl.TRIANGLE_STRIP,0,4);canvas.dataset.frames=String(++frames);}raf=requestAnimationFrame(draw);}
 function update(){cancelAnimationFrame(raf);raf=0;canvas.style.visibility=reduced?'hidden':'';if(!reduced&&!document.hidden&&image&&gl&&!lost){last=performance.now();raf=requestAnimationFrame(draw);}}
 try{init();}catch{gl=null;canvas.dataset.mode='static-fallback';}
 canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();lost=true;cancelAnimationFrame(raf);canvas.style.visibility='hidden';});
 canvas.addEventListener('webglcontextrestored',()=>{lost=false;try{init();upload();update();}catch{canvas.style.visibility='hidden';}});
 document.addEventListener('visibilitychange',update);
 return {setScene(id,asset){scene=id;image=asset;time=0;frames=0;upload();update();},setReduced(value){reduced=value;update();},getTime:()=>time};
}
