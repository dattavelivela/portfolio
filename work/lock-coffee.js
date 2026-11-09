/* A mug of coffee in the bottom right of the lock page. The coffee is a little height-field
   simulation: drag the mug and it sloshes, drag it too fast and it slops over the rim, drips
   onto the desk and leaves stains that stay. Press on the coffee itself to stir it.
   A wrong password jolts the mug; the right one drops a ripple into the middle. */
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

const root=document.getElementById('lock'), holder=root.querySelector('.lk-art'), form=root.querySelector('form');
const still=matchMedia('(prefers-reduced-motion:reduce)').matches;
const U=100;                                     /* 1 world unit = 100 css px */
let W=innerWidth/U, H=innerHeight/U;

const renderer=new THREE.WebGLRenderer({antialias:true,alpha:true});
renderer.setPixelRatio(Math.min(devicePixelRatio,2)); renderer.setSize(innerWidth,innerHeight);
renderer.outputColorSpace=THREE.SRGBColorSpace; renderer.toneMapping=THREE.NoToneMapping;
holder.appendChild(renderer.domElement);
const cv=renderer.domElement;

const scene=new THREE.Scene();
scene.environment=new THREE.PMREMGenerator(renderer).fromScene(new RoomEnvironment(),.04).texture; scene.environmentIntensity=.3;
scene.add(new THREE.AmbientLight(0xffffff,1.0));
const sun=new THREE.DirectionalLight(0xfffaf1,2.1); sun.position.set(6,14,-5); scene.add(sun);

/* straight down with a narrow lens, so you look into the mug */
const FOV=22, cam=new THREE.PerspectiveCamera(FOV,W/H,1,200);
function frame(){ const h=(H/2)/Math.tan(THREE.MathUtils.degToRad(FOV/2)); cam.aspect=W/H; cam.position.set(0,h,0); cam.up.set(0,0,-1); cam.lookAt(0,0,0); cam.updateProjectionMatrix(); }
frame();

function canvas(w,h){ const c=document.createElement('canvas'); c.width=w; c.height=h; return [c,c.getContext('2d')]; }

/* ── the desk: stains are painted onto a transparent sheet the size of the page ── */
const [stainC,stainX]=canvas(2048,Math.round(2048*H/W));
const stainTex=new THREE.CanvasTexture(stainC); stainTex.colorSpace=THREE.SRGBColorSpace;
const desk=new THREE.Mesh(new THREE.PlaneGeometry(W,H),new THREE.MeshBasicMaterial({map:stainTex,transparent:true,depthWrite:false}));
desk.rotation.x=-Math.PI/2; desk.position.y=.001; scene.add(desk);
function stain(x,z,r){
  const sx=(x/W+.5)*stainC.width, sy=(z/H+.5)*stainC.height, R=r*stainC.width/W;
  stainX.save(); stainX.translate(sx,sy);
  stainX.beginPath();
  for(let a=0;a<=Math.PI*2+.01;a+=Math.PI/14){ const k=R*(.85+Math.random()*.3); a?stainX.lineTo(Math.cos(a)*k,Math.sin(a)*k):stainX.moveTo(k,0); }
  stainX.closePath();
  stainX.fillStyle='rgba(120,72,34,.16)'; stainX.fill();
  stainX.lineWidth=Math.max(1.2,R*.12); stainX.strokeStyle='rgba(88,50,20,.22)'; stainX.stroke();   /* coffee dries darker at the edge */
  stainX.restore(); stainTex.needsUpdate=true;
}

/* soft photographic shadow */
const shadowTex=(()=>{ const [c,x]=canvas(256,256); x.filter='blur(26px)'; x.fillStyle='#000'; x.beginPath(); x.arc(128,128,70,0,7); x.fill(); return new THREE.CanvasTexture(c); })();
function shadow(op){ const m=new THREE.Mesh(new THREE.PlaneGeometry(1,1),new THREE.MeshBasicMaterial({map:shadowTex,color:0x2a2418,transparent:true,depthWrite:false,opacity:op})); m.rotation.x=-Math.PI/2; m.position.y=.002; scene.add(m); return m; }
const shNear=shadow(.32), shFar=shadow(.16);

/* ── the mug: speckled stoneware, glazed inside, a ring of bare clay at the foot ── */
const RO=1.0, RI=.9, HT=1.25, LEVEL=.97;          /* outer and inner radius, rim height, coffee level */
const glazeTex=(()=>{ const [c,x]=canvas(1024,512); x.fillStyle='#f1ebe1'; x.fillRect(0,0,1024,512);
  for(let i=0;i<2600;i++){ x.fillStyle=`rgba(${60+Math.random()*40},${45+Math.random()*30},${30+Math.random()*20},${.25+Math.random()*.5})`; const r=Math.random()*1.8+.4; x.beginPath(); x.arc(Math.random()*1024,Math.random()*512,r,0,7); x.fill(); }
  x.fillStyle='#c9ab86'; x.fillRect(0,0,1024,26);                    /* bare clay foot (bottom of the lathe UVs) */
  const t=new THREE.CanvasTexture(c); t.colorSpace=THREE.SRGBColorSpace; t.wrapS=THREE.RepeatWrapping; return t; })();
const glaze=new THREE.MeshPhysicalMaterial({map:glazeTex,roughness:.32,clearcoat:.8,clearcoatRoughness:.15});
const mug=new THREE.Group();
const prof=[[0,0],[RO-.08,0],[RO-.02,.03],[RO,.1],[RO,HT-.05],[RO-.01,HT-.01],[RO-.05,HT],[RI+.01,HT-.01],[RI,HT-.05],[RI,.25],[RI-.08,.18],[0,.17]];
const body=new THREE.Mesh(new THREE.LatheGeometry(prof.map(p=>new THREE.Vector2(p[0],p[1])),96),glaze); mug.add(body);
const handle=new THREE.Mesh(new THREE.TorusGeometry(.36,.1,20,48,Math.PI*1.1),glaze);
handle.rotation.z=-Math.PI/2-.05*Math.PI; handle.position.set(RO-.04,.62,0); mug.add(handle);
scene.add(mug);

/* ── the coffee: an N×N height field mapped onto the disc ───────── */
const N=56, h=new Float32Array(N*N), v=new Float32Array(N*N);
const geo=new THREE.PlaneGeometry(2,2,N-1,N-1); geo.rotateX(-Math.PI/2);
const P=geo.attributes.position, disc=[];
for(let i=0;i<P.count;i++){ const x=P.getX(i), z=P.getZ(i);       /* square to disc, so the grid edge is the mug wall */
  disc.push([x*Math.sqrt(1-z*z/2), z*Math.sqrt(1-x*x/2)]); }
const crema=(()=>{ const [c,x]=canvas(512,512); const g=x.createRadialGradient(256,256,40,256,256,256);
  g.addColorStop(0,'#1c0d05'); g.addColorStop(.8,'#26130a'); g.addColorStop(.93,'#4a2a16'); g.addColorStop(1,'#8a5a32');
  x.fillStyle=g; x.fillRect(0,0,512,512); const t=new THREE.CanvasTexture(c); t.colorSpace=THREE.SRGBColorSpace; return t; })();
const coffee=new THREE.Mesh(geo,new THREE.MeshPhysicalMaterial({map:crema,roughness:.06,clearcoat:1,clearcoatRoughness:.03,envMapIntensity:1.4}));
mug.add(coffee);
/* uv of each vertex follows the disc so the crema ring hugs the wall */
const UV=geo.attributes.uv; disc.forEach(([x,z],i)=>UV.setXY(i,x*.5+.5,z*.5+.5));
let level=LEVEL;
const RL=()=>RI-.005;                             /* coffee radius at the surface */
function shapeCoffee(){
  const r=RL();
  for(let i=0;i<P.count;i++){ P.setXYZ(i,disc[i][0]*r,level+h[i],disc[i][1]*r); }
  P.needsUpdate=true; geo.computeVertexNormals();
}

/* ── drops that leave the mug ─────────────────────────────────────── */
const MAXD=260, drops=[], dropMesh=new THREE.InstancedMesh(new THREE.SphereGeometry(1,10,8),new THREE.MeshPhysicalMaterial({color:0x2a150a,roughness:.1,clearcoat:1}),MAXD);
dropMesh.count=0; scene.add(dropMesh);
const tmp=new THREE.Object3D();

/* ── where the mug is, and how it moves ─────────────────────────── */
const pos=new THREE.Vector2((.8-.5)*W,(.74-.5)*H), vel=new THREE.Vector2(), acc=new THREE.Vector2(), target=pos.clone();
let held=false, stirring=false, grab=new THREE.Vector2(), jolt=new THREE.Vector2();
let guard;
function fence(){ const r=root.querySelector('.lk-box').getBoundingClientRect(); guard={x:(r.right+30)/U-W/2,z:(r.bottom+30)/U-H/2}; }
fence();
function clampMug(p){
  const m=RO+.2; p.x=Math.min(Math.max(p.x,-W/2+m),W/2-m-.4); p.y=Math.min(Math.max(p.y,-H/2+m),H/2-m);
  if(p.x-m<guard.x && p.y-m<guard.z){ if(guard.x-(p.x-m)<guard.z-(p.y-m)) p.x=guard.x+m; else p.y=guard.z+m; }
}

const ray=new THREE.Raycaster(), ptr=new THREE.Vector2(), deskPlane=new THREE.Plane(new THREE.Vector3(0,1,0),0), hit=new THREE.Vector3();
function aim(e,y=0){ ptr.set(e.clientX/innerWidth*2-1,-(e.clientY/innerHeight)*2+1); ray.setFromCamera(ptr,cam); deskPlane.constant=-y; ray.ray.intersectPlane(deskPlane,hit); return new THREE.Vector2(hit.x,hit.z); }
function overMug(e){ ptr.set(e.clientX/innerWidth*2-1,-(e.clientY/innerHeight)*2+1); ray.setFromCamera(ptr,cam); const x=ray.intersectObject(mug,true)[0]; return x?x.object:null; }
let stirAt=null;
cv.addEventListener('pointerdown',e=>{
  const o=overMug(e); if(!o) return;
  cv.setPointerCapture(e.pointerId);
  if(o===coffee){ stirring=true; stirAt=aim(e,level); cv.style.cursor='crosshair'; }
  else { held=true; grab=aim(e).sub(pos); cv.style.cursor='grabbing'; }
});
cv.addEventListener('pointermove',e=>{
  if(held){ target.copy(aim(e).sub(grab)); clampMug(target); return; }
  if(stirring){ stirAt=aim(e,level); return; }
  const o=overMug(e); cv.style.cursor=o===coffee?'crosshair':o?'grab':'';
});
function up(){ held=false; stirring=false; stirAt=null; cv.style.cursor=''; }
cv.addEventListener('pointerup',up); cv.addEventListener('pointercancel',up);

/* push the surface down around a point on the coffee */
function poke(local,amt,rad=.18){
  const r=RL();
  for(let i=0;i<P.count;i++){ const dx=disc[i][0]*r-local.x, dz=disc[i][1]*r-local.y, d2=dx*dx+dz*dz; if(d2<rad*rad*4) v[i]-=amt*Math.exp(-d2/(rad*rad)); }
}

/* the password form reports back through classes */
let wasBad=false;
if(!still){
  new MutationObserver(()=>{ const bad=form.classList.contains('bad'); if(bad&&!wasBad) jolt.set((Math.random()-.5)*2,(Math.random()-.5)*2).normalize().multiplyScalar(260); wasBad=bad; }).observe(form,{attributes:true,attributeFilter:['class']});
  new MutationObserver(()=>{ if(root.classList.contains('unlocking')) poke(new THREE.Vector2(0,0),5,.22); }).observe(root,{attributes:true,attributeFilter:['class']});
}

addEventListener('resize',()=>{ W=innerWidth/U; H=innerHeight/U; renderer.setSize(innerWidth,innerHeight); frame(); fence(); clampMug(pos); clampMug(target);
  desk.geometry.dispose(); desk.geometry=new THREE.PlaneGeometry(W,H); });

/* ── simulation ──────────────────────────────────────────────────── */
const C2=2200, DAMP=.994, KF=.3, MARGIN=HT-LEVEL-.02;
const idx=(i,j)=>Math.min(N-1,Math.max(0,j))*N+Math.min(N-1,Math.max(0,i));
function step(dt){
  /* the mug follows the hand on a stiff spring; its acceleration is what the coffee feels */
  const prevVel=vel.clone();
  if(held){ vel.copy(target).sub(pos).multiplyScalar(16); }
  else vel.multiplyScalar(.8);
  if(jolt.lengthSq()>1){ vel.addScaledVector(jolt,dt); jolt.multiplyScalar(.5); }
  pos.addScaledVector(vel,dt); clampMug(pos);
  acc.copy(vel).sub(prevVel).divideScalar(dt);
  const r=RL(), ax=acc.x, az=acc.y;
  /* waves: v += c²∇²h (C2 is c² over the cell size²), plus the sideways push from the mug's acceleration */
  for(let j=0;j<N;j++) for(let i=0;i<N;i++){
    const k=j*N+i, lap=h[idx(i-1,j)]+h[idx(i+1,j)]+h[idx(i,j-1)]+h[idx(i,j+1)]-4*h[k];
    v[k]+=(C2*lap-(ax*disc[k][0]+az*disc[k][1])*r*KF)*dt;
    v[k]*=DAMP;
  }
  let mean=0;
  for(let k=0;k<N*N;k++){ h[k]+=v[k]*dt; mean+=h[k]; }
  mean/=N*N; for(let k=0;k<N*N;k++) h[k]-=mean;
  if(stirAt){ const l=stirAt.clone().sub(pos); poke(l,.9,.15); }
  /* anything that climbs past the rim leaves the mug */
  for(let j=0;j<N;j++) for(let i=0;i<N;i++){
    if(i&&j&&i<N-1&&j<N-1) continue;
    const k=j*N+i, over=h[k]-MARGIN;
    if(over<=0) continue;
    h[k]=MARGIN; v[k]=Math.min(v[k],0); level=Math.max(.45,level-over*.0025);
    if(drops.length<MAXD && Math.random()<Math.min(1,over*6)){
      const dir=new THREE.Vector2(disc[k][0],disc[k][1]).normalize();
      const sp=1.2+Math.random()*2+over*8;
      drops.push({x:pos.x+dir.x*(RO+.02),y:HT,z:pos.y+dir.y*(RO+.02),vx:dir.x*sp+vel.x*.6,vy:.6+Math.random(),vz:dir.y*sp+vel.y*.6,r:.025+Math.random()*.03});
    }
  }
  /* drops fall, and a stain stays where each one lands */
  for(let d=drops.length-1;d>=0;d--){ const q=drops[d];
    q.vy-=30*dt; q.x+=q.vx*dt; q.y+=q.vy*dt; q.z+=q.vz*dt;
    if(q.y<=q.r){ stain(q.x,q.z,q.r*2.6+Math.hypot(q.vx,q.vz)*.02); drops.splice(d,1); }
  }
}

holder.classList.add('ready');
let prev=performance.now();
renderer.setAnimationLoop(now=>{
  if(!renderer.domElement.isConnected){ renderer.setAnimationLoop(null); renderer.dispose(); return; }  /* lock page replaced by the case study */
  const dt=Math.min((now-prev)/1000,1/30); prev=now;
  const sub=3; for(let s=0;s<sub;s++) step(dt/sub);
  mug.position.set(pos.x,0,pos.y);
  shapeCoffee();
  /* the mug leans a touch into a fast move */
  mug.rotation.set(Math.max(-.12,Math.min(.12,vel.y*.006)),0,Math.max(-.12,Math.min(.12,-vel.x*.006)));
  shNear.position.set(pos.x-.12,.002,pos.y+.18); shNear.scale.setScalar(RO*2*1.9);
  shFar.position.set(pos.x-.5,.002,pos.y+.75); shFar.scale.setScalar(RO*2*2.6);
  dropMesh.count=drops.length;
  drops.forEach((q,i)=>{ tmp.position.set(q.x,q.y,q.z); tmp.scale.setScalar(q.r); tmp.updateMatrix(); dropMesh.setMatrixAt(i,tmp.matrix); });
  dropMesh.instanceMatrix.needsUpdate=true;
  renderer.render(scene,cam);
});
