/* The other lock page idea: a real mechanical keyboard lying on the desk, cropped into the
   bottom right corner. Aluminium case with a chamfered edge, sculpted PBT keycaps with small
   corner legends, a blue Esc as the one accent. Typing presses the matching key, clicking a key types it
   into the password, a wrong password rattles the caps and the right one runs a wave across
   the board. Loaded by lock-desk.js with ?desk=keys. */
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

const root=document.getElementById('lock'), holder=root.querySelector('.lk-art'), form=root.querySelector('form');
const bx=[].slice.call(form.querySelectorAll('.bx'));
const still=matchMedia('(prefers-reduced-motion:reduce)').matches;

if(document.fonts && document.fonts.ready) await document.fonts.ready;

const renderer=new THREE.WebGLRenderer({antialias:true,alpha:true});
renderer.setPixelRatio(Math.min(devicePixelRatio,2)); renderer.setSize(innerWidth,innerHeight);
renderer.outputColorSpace=THREE.SRGBColorSpace; renderer.toneMapping=THREE.ACESFilmicToneMapping; renderer.toneMappingExposure=.92;
renderer.shadowMap.enabled=true; renderer.shadowMap.type=THREE.PCFSoftShadowMap;
holder.appendChild(renderer.domElement);

const scene=new THREE.Scene();
scene.environment=new THREE.PMREMGenerator(renderer).fromScene(new RoomEnvironment(),.04).texture; scene.environmentIntensity=.8;
scene.add(new THREE.HemisphereLight(0xffffff,0xe6e2dc,.45));
/* window light from the top right of the page */
const sun=new THREE.DirectionalLight(0xfff4e6,2.3); sun.position.set(9,15,-9); sun.castShadow=true;
sun.shadow.mapSize.set(2048,2048); Object.assign(sun.shadow.camera,{left:-13,right:13,top:9,bottom:-9,near:1,far:50});
sun.shadow.bias=-.0004; sun.shadow.normalBias=.02;
scene.add(sun);

const desk=new THREE.Mesh(new THREE.PlaneGeometry(120,120),new THREE.ShadowMaterial({opacity:.2}));
desk.rotation.x=-Math.PI/2; desk.receiveShadow=true; scene.add(desk);

function canvas(w,h,draw){ const c=document.createElement('canvas'); c.width=w; c.height=h; draw(c.getContext('2d'),w,h);
  const t=new THREE.CanvasTexture(c); t.colorSpace=THREE.SRGBColorSpace; t.anisotropy=8; return t; }
function grain(x,w,h,a){ const d=x.getImageData(0,0,w,h), p=d.data; for(let i=0;i<p.length;i+=4){ const n=(Math.random()-.5)*a; p[i]+=n; p[i+1]+=n; p[i+2]+=n; } x.putImageData(d,0,0); }

/* ── layout: a 65%-ish board, widths in units (1u = one key) ──────── */
const SHIFTED={'1':'!','2':'@','3':'#','4':'$','5':'%','6':'^','7':'&','8':'*','9':'(','0':')','-':'_','=':'+','[':'{',']':'}','\\':'|',';':':',"'":'"',',':'<','.':'>','/':'?'};
const CODE={'-':'Minus','=':'Equal','[':'BracketLeft',']':'BracketRight','\\':'Backslash',';':'Semicolon',"'":'Quote',',':'Comma','.':'Period','/':'Slash'};
const k=(ch)=>({ch,w:1,code:/[A-Z]/.test(ch)?'Key'+ch:/[0-9]/.test(ch)?'Digit'+ch:CODE[ch]});
const mod=(label,w,code,kind='mod')=>({label,w,code,kind});
const ROWS=[
  [mod('esc',1,'Escape','accent'),...'1234567890-='.split('').map(k),mod('delete',2,'Backspace')],
  [mod('tab',1.5,'Tab'),...'QWERTYUIOP[]'.split('').map(k),{ch:'\\',w:1.5,code:'Backslash'}],
  [mod('caps lock',1.75,'CapsLock'),...("ASDFGHJKL;'").split('').map(k),mod('return',2.25,'Enter')],
  [mod('shift',2.25,'ShiftLeft'),...'ZXCVBNM,./'.split('').map(k),mod('shift',2.75,'ShiftRight')],
  [mod('control',1.25,'ControlLeft'),mod('option',1.25,'AltLeft'),mod('command',1.25,'MetaLeft'),mod('',6.25,'Space','alpha'),
   mod('command',1.25,'MetaRight'),mod('option',1.25,'AltRight'),mod('fn',1.25,'Fn'),mod('control',1.25,'ControlRight')],
];
const COLS={ alpha:{cap:'#e3e3df',ink:'#2c2d30'}, mod:{cap:'#7f8288',ink:'#f3f3f2'}, accent:{cap:'#3279f2',ink:'#ffffff'} };

/* Cherry-like profile: each row has its own height and top tilt (back edge higher = positive) */
const PROFILE=[{h:.56,tilt:9},{h:.5,tilt:4},{h:.47,tilt:0},{h:.49,tilt:-6},{h:.49,tilt:-8}];
const GAP=.05, DEPTH=1-GAP;

/* a sculpted keycap: tapered rounded box, top sheared to the row tilt and dished like a real cap */
const geoCache={};
function capGeometry(w,row){
  const id=w+':'+row; if(geoCache[id]) return geoCache[id];
  const {h,tilt}=PROFILE[row], bw=w-GAP, bd=DEPTH, tw=bw-.3, td=bd-.3, tan=Math.tan(THREE.MathUtils.degToRad(tilt));
  const g=new RoundedBoxGeometry(bw,h,bd,5,.075); g.translate(0,h/2,0);
  const p=g.attributes.position;
  for(let i=0;i<p.count;i++){
    let x=p.getX(i), y=p.getY(i), z=p.getZ(i); const t=y/h;
    x*=1+(tw/bw-1)*t; z*=1+(td/bd-1)*t; z-=.04*t;
    y+=t*(-z*tan);
    const top=Math.max(0,(t-.9)/.1), hx=tw/2;
    y-=.028*top*Math.max(0,1-(x/hx)**2)*(w>3?.25:1);   /* cylindrical dish, shallow on the spacebar */
    p.setXYZ(i,x,y,z);
  }
  g.computeVertexNormals();
  return geoCache[id]={g,tw,td};
}

/* the printed top: cap colour, PBT grain, a small legend in the corner like real caps */
function legend(key,colour,tw,td){
  const S=300, W=Math.round(S*tw), H=Math.round(S*td);
  return canvas(W,H,(x,w,h)=>{
    x.fillStyle=colour.cap; x.fillRect(0,0,w,h); grain(x,w,h,7);
    x.fillStyle=colour.ink; x.textBaseline='alphabetic';
    const pad=h*.2;
    if(key.ch){
      if(SHIFTED[key.ch]){ x.font=`500 ${h*.2}px "Geist", sans-serif`; x.fillText(SHIFTED[key.ch],pad,pad+h*.18); x.fillText(key.ch,pad,pad+h*.48); }
      else { x.font=`500 ${h*.24}px "Geist", sans-serif`; x.fillText(key.ch,pad,pad+h*.22); }
    } else if(key.label){
      x.font=`500 ${h*.15}px "Geist", sans-serif`; x.fillText(key.label,pad,h-pad);
    }
  });
}

/* ── build the board ─────────────────────────────────────────────── */
const board=new THREE.Group(), keys=[], byCode={};
const BW=15, BD=5, M=.42, CASE_H=.78, CAP_BASE=CASE_H-.3;
ROWS.forEach((row,r)=>{
  let x=-BW/2;
  row.forEach(key=>{
    const kind=key.kind||'alpha', colour=COLS[kind];
    const {g,tw,td}=capGeometry(key.w,r);
    const side=new THREE.MeshPhysicalMaterial({color:colour.cap,roughness:.78,sheen:.15,sheenColor:new THREE.Color(0xffffff)});
    const top=new THREE.MeshPhysicalMaterial({map:legend(key,colour,tw,td),roughness:.74,sheen:.15,sheenColor:new THREE.Color(0xffffff)});
    const mesh=new THREE.Mesh(g,[side,side,top,side,side,side]); mesh.castShadow=mesh.receiveShadow=true;
    const grp=new THREE.Group(); grp.position.set(x+key.w/2,CAP_BASE,-BD/2+r+.5); grp.add(mesh);
    mesh.userData.key=keys.length;
    board.add(grp);
    const entry={...key,grp,base:CAP_BASE,y:0,v:0,push:0,col:x+key.w/2};
    keys.push(entry); if(key.code) byCode[key.code]=entry;
    x+=key.w;
  });
});

/* anodised aluminium case: a frame with a chamfer on every edge, a dark plate inside */
{ const bev=.06, OW=BW+2*M, OD=BD+2*M;
  const rr=(w,d,r)=>{ const s=new THREE.Shape(), x=-w/2, y=-d/2; s.moveTo(x+r,y); s.lineTo(x+w-r,y); s.quadraticCurveTo(x+w,y,x+w,y+r); s.lineTo(x+w,y+d-r); s.quadraticCurveTo(x+w,y+d,x+w-r,y+d); s.lineTo(x+r,y+d); s.quadraticCurveTo(x,y+d,x,y+d-r); s.lineTo(x,y+r); s.quadraticCurveTo(x,y,x+r,y); return s; };
  const outer=rr(OW-2*bev,OD-2*bev,.32), hole=rr(BW+.12+2*bev,BD+.12+2*bev,.06);
  outer.holes.push(hole);
  const geo=new THREE.ExtrudeGeometry(outer,{depth:CASE_H-2*bev,bevelEnabled:true,bevelThickness:bev,bevelSize:bev,bevelSegments:1,curveSegments:12});
  geo.rotateX(-Math.PI/2); geo.translate(0,bev,0);
  const blasted=canvas(256,256,(x,w,h)=>{ x.fillStyle='#bdbdbd'; x.fillRect(0,0,w,h); grain(x,w,h,40); });
  blasted.colorSpace=THREE.NoColorSpace; blasted.wrapS=blasted.wrapT=THREE.RepeatWrapping; blasted.repeat.set(8,8);
  const alu=new THREE.MeshPhysicalMaterial({color:0xd8dade,metalness:.8,roughness:.48,roughnessMap:blasted,clearcoat:.15,clearcoatRoughness:.5});
  const shell=new THREE.Mesh(geo,alu); shell.castShadow=shell.receiveShadow=true; board.add(shell);
  const plate=new THREE.Mesh(new THREE.BoxGeometry(BW+.14,.06,BD+.14),new THREE.MeshStandardMaterial({color:0x1c1d20,roughness:.6,metalness:.3}));
  plate.position.y=CAP_BASE-.16; plate.receiveShadow=true; board.add(plate);
  /* switch housings, only seen in the gaps between caps */
  const sw=new THREE.BoxGeometry(.6,.16,.6), swm=new THREE.MeshStandardMaterial({color:0x2a2b2f,roughness:.5});
  keys.forEach(kk=>{ const s=new THREE.Mesh(sw,swm); s.position.set(kk.grp.position.x,CAP_BASE-.08,kk.grp.position.z); board.add(s); });
  /* soft contact shadow under the case */
  const ao=canvas(512,256,(x,w,h)=>{ x.filter='blur(18px)'; x.fillStyle='rgba(0,0,0,.55)'; x.beginPath(); x.roundRect(46,46,w-92,h-92,30); x.fill(); });
  const aoMesh=new THREE.Mesh(new THREE.PlaneGeometry(OW+1.4,OD+1.4),new THREE.MeshBasicMaterial({map:ao,transparent:true,opacity:.5,depthWrite:false}));
  aoMesh.rotation.x=-Math.PI/2; aoMesh.position.y=.004; board.userData.ao=aoMesh;
}

/* typing angle: back edge raised a few degrees, then turned a little for the photo */
board.rotation.x=THREE.MathUtils.degToRad(3.5); board.position.y=.2;
const turn=new THREE.Group(); turn.add(board,board.userData.ao); turn.rotation.y=THREE.MathUtils.degToRad(-11); scene.add(turn);

/* ── camera: above and in front, slid so the board sits in the corner ─ */
const cam=new THREE.PerspectiveCamera(28,innerWidth/innerHeight,.5,200);
const AIM=new THREE.Vector3(-2.2,0,.6);
function frame(){
  cam.aspect=innerWidth/innerHeight; cam.position.copy(AIM).add(new THREE.Vector3(-3.4,19.5,13.2)); cam.lookAt(AIM);
  cam.setViewOffset(innerWidth,innerHeight,-innerWidth*.25,-innerHeight*.36,innerWidth,innerHeight); cam.updateProjectionMatrix();
  renderer.setSize(innerWidth,innerHeight);
}
frame(); addEventListener('resize',frame);

/* ── behaviour ───────────────────────────────────────────────────── */
function press(key,depth=.17){ if(!key) return; key.push=depth; clearTimeout(key.t); key.t=setTimeout(()=>{ key.push=0; },110); }
addEventListener('keydown',e=>{ press(byCode[e.code]); });

/* clicking a key types it into the next empty box */
const ray=new THREE.Raycaster(), ptr=new THREE.Vector2(), cv=renderer.domElement;
function pick(e){ ptr.set(e.clientX/innerWidth*2-1,-(e.clientY/innerHeight)*2+1); ray.setFromCamera(ptr,cam);
  const h=ray.intersectObjects(keys.map(kk=>kk.grp),true)[0]; return h?keys[h.object.userData.key]:null; }
cv.addEventListener('pointermove',e=>{ cv.style.cursor=pick(e)?'pointer':''; });
cv.addEventListener('pointerdown',e=>{
  const key=pick(e); if(!key) return; e.preventDefault(); press(key);
  if(key.ch){
    const box=bx.find(i=>!i.value)||bx[bx.length-1];
    box.focus(); box.value=key.ch.toLowerCase(); box.dispatchEvent(new Event('input',{bubbles:true}));
  } else if(key.code==='Backspace'){
    const filled=bx.filter(i=>i.value), last=filled[filled.length-1]; if(last){ last.value=''; last.focus(); }
  } else if(key.code==='Enter'){ form.requestSubmit ? form.requestSubmit() : form.dispatchEvent(new Event('submit',{cancelable:true})); }
});

/* the form reports back through classes */
let rattle=0, wave=-99, wasBad=false;
if(!still){
  new MutationObserver(()=>{ const bad=form.classList.contains('bad'); if(bad&&!wasBad) rattle=.5; wasBad=bad; }).observe(form,{attributes:true,attributeFilter:['class']});
  new MutationObserver(()=>{ if(root.classList.contains('unlocking')) wave=-BW/2-1; }).observe(root,{attributes:true,attributeFilter:['class']});
}

let last=performance.now(), shown=false;
renderer.setAnimationLoop(now=>{
  if(!renderer.domElement.isConnected){ renderer.setAnimationLoop(null); renderer.dispose(); return; }  /* lock page replaced by the case study */
  const dt=Math.min((now-last)/1000,1/30); last=now;
  if(rattle>0) rattle-=dt;
  if(wave>-99){ wave+=dt*22; if(wave>BW/2+2) wave=-99; }
  keys.forEach(key=>{
    const d=wave>-99?Math.abs(wave-key.col):9, w=d<1.4?.17*Math.cos(d/1.4*Math.PI/2):0;
    const target=-Math.max(key.push,w);
    if(still){ key.y=target; }
    else { key.v+=(target-key.y)*700*dt; key.v*=.72; key.y+=key.v*dt; }
    key.grp.position.y=key.base+key.y+(rattle>0?(Math.random()-.5)*.05*rattle:0);
    key.grp.rotation.z=rattle>0?(Math.random()-.5)*.07*rattle:0;
  });
  renderer.render(scene,cam);
  if(!shown){ shown=true; holder.classList.add('ready'); }
});
