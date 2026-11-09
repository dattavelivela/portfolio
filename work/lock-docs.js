/* The desk behind the lock page: a pile of construction drawings, seen from above in window light.
   Paper behaves like paper rather than rigid bodies: grab a sheet and it comes to the top of the pile,
   lifts a few millimetres and turns around the point you hold. Shadows are soft, photographic ones.
   A wrong password ruffles the pile; the right one lifts every sheet on a breath of air. */
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

const root=document.getElementById('lock'), holder=root&&root.querySelector('.lk-art');
/* loaded by lock-desk.js for ?desk=docs */
start();

async function start(){
  if(document.fonts && document.fonts.ready) await document.fonts.ready;
  const still=matchMedia('(prefers-reduced-motion:reduce)').matches;
  const U=100;                                   /* 1 world unit = 100 css px */
  let W=innerWidth/U, H=innerHeight/U;

  const renderer=new THREE.WebGLRenderer({antialias:true,alpha:true});
  renderer.setPixelRatio(Math.min(devicePixelRatio,2)); renderer.setSize(innerWidth,innerHeight);
  renderer.outputColorSpace=THREE.SRGBColorSpace; renderer.toneMapping=THREE.NoToneMapping;
  holder.appendChild(renderer.domElement);
  const maxAniso=renderer.capabilities.getMaxAnisotropy();

  const scene=new THREE.Scene();
  scene.environment=new THREE.PMREMGenerator(renderer).fromScene(new RoomEnvironment(),.04).texture; scene.environmentIntensity=.25;

  /* straight down, narrow lens: things near the edges show a little of their sides */
  const FOV=22, cam=new THREE.PerspectiveCamera(FOV,W/H,1,200);
  function frame(){ const h=(H/2)/Math.tan(THREE.MathUtils.degToRad(FOV/2)); cam.aspect=W/H; cam.position.set(0,h,0); cam.up.set(0,0,-1); cam.lookAt(0,0,0); cam.updateProjectionMatrix(); }
  frame();

  /* lit so flat white paper comes out white (no tone mapping: ambient + sun ≈ π) */
  scene.add(new THREE.AmbientLight(0xffffff,1.05));
  const sun=new THREE.DirectionalLight(0xfffaf1,2.1); sun.position.set(6,14,-5); scene.add(sun);
  const LIGHT=new THREE.Vector2(-.42,.62);       /* where shadows fall, per unit of height: down and to the left */

  function canvas(w,h,s=1){ const c=document.createElement('canvas'); c.width=w*s; c.height=h*s; const x=c.getContext('2d'); x.scale(s,s); return [c,x]; }
  function tex(w,h,draw,s=1){ const [c,x]=canvas(w,h,s); draw(x,w,h); const t=new THREE.CanvasTexture(c); t.colorSpace=THREE.SRGBColorSpace; t.anisotropy=maxAniso; return t; }

  /* one soft shadow texture, stretched under everything */
  const shadowTex=(()=>{ const [c,x]=canvas(256,256); x.filter='blur(22px)'; x.fillStyle='#000'; x.fillRect(56,56,144,144); const t=new THREE.CanvasTexture(c); return t; })();
  function shadowPlane(){ const m=new THREE.Mesh(new THREE.PlaneGeometry(1,1),new THREE.MeshBasicMaterial({map:shadowTex,color:0x2a2418,transparent:true,depthWrite:false,opacity:.2})); m.rotation.x=-Math.PI/2; scene.add(m); return m; }

  /* ── the drawings ───────────────────────────────────────────────── */
  const INK='#1f2124', MONO='"Geist Mono", monospace', SANS='"Geist", sans-serif';
  const rnd=(a,b)=>a+Math.random()*(b-a);
  function titleBlock(c,w,h,lines,col=INK){
    const bw=w*.3, bh=h*.17, x=w-bw-28, y=h-bh-28;
    c.strokeStyle=col; c.lineWidth=2; c.strokeRect(x,y,bw,bh); c.beginPath(); c.moveTo(x,y+bh*.42); c.lineTo(x+bw,y+bh*.42); c.moveTo(x+bw*.62,y+bh*.42); c.lineTo(x+bw*.62,y+bh); c.stroke();
    c.fillStyle=col; c.font=`600 ${h*.023}px ${SANS}`; c.fillText(lines[0],x+12,y+bh*.3);
    c.font=`${h*.019}px ${MONO}`; c.fillText(lines[1],x+12,y+bh*.66); c.fillText(lines[2],x+12,y+bh*.88); c.fillText(lines[3],x+bw*.62+12,y+bh*.78);
  }
  function border(c,w,h,col=INK){ c.strokeStyle=col; c.lineWidth=3; c.strokeRect(24,24,w-48,h-48); c.lineWidth=1; c.strokeRect(30,30,w-60,h-60); }
  function paperBg(c,w,h,col='#fbfaf5'){ c.fillStyle=col; c.fillRect(0,0,w,h); for(let i=0;i<4000;i++){ c.fillStyle=`rgba(120,110,90,${Math.random()*.035})`; c.fillRect(Math.random()*w,Math.random()*h,2,2); } }
  function dim(c,x1,y1,x2,y2,t){ c.lineWidth=1; c.beginPath(); c.moveTo(x1,y1); c.lineTo(x2,y2); c.stroke(); [[x1,y1],[x2,y2]].forEach(([x,y])=>{ c.beginPath(); c.moveTo(x-5,y+5); c.lineTo(x+5,y-5); c.stroke(); }); c.font=`15px ${MONO}`; c.textAlign='center'; c.fillText(t,(x1+x2)/2,(y1+y2)/2-7); c.textAlign='left'; }

  const DRAW={
    plan(c,w,h){ paperBg(c,w,h); border(c,w,h); c.strokeStyle=INK; c.fillStyle=INK;
      const X=110,Y=120,BW=w*.56,BH=h*.6;
      c.lineWidth=11; c.strokeRect(X,Y,BW,BH);
      c.lineWidth=6; [[X+BW*.42,Y,X+BW*.42,Y+BH*.62],[X,Y+BH*.62,X+BW,Y+BH*.62],[X+BW*.72,Y+BH*.62,X+BW*.72,Y+BH]].forEach(l=>{ c.beginPath(); c.moveTo(l[0],l[1]); c.lineTo(l[2],l[3]); c.stroke(); });
      c.lineWidth=1.5; [[X+BW*.42,Y+BH*.3,1],[X+BW*.2,Y+BH*.62,0],[X+BW*.72,Y+BH*.8,1]].forEach(([x,y,v])=>{ c.fillStyle='#fbfaf5'; v?c.fillRect(x-6,y-28,12,56):c.fillRect(x-28,y-6,56,12); c.beginPath(); v?c.arc(x,y-28,56,Math.PI/2,Math.PI):c.arc(x-28,y,56,-Math.PI/2,0); c.stroke(); });
      c.lineWidth=2; [[X+BW*.15,Y],[X+BW*.62,Y],[X+BW*.85,Y]].forEach(([x,y])=>{ c.fillStyle='#fbfaf5'; c.fillRect(x-40,y-7,80,14); c.strokeRect(x-40,y-7,80,14); c.beginPath(); c.moveTo(x-40,y); c.lineTo(x+40,y); c.stroke(); });
      c.fillStyle=INK; c.font=`600 18px ${SANS}`; [['LIVING',.2,.3],['KITCHEN',.7,.3],['BED 01',.3,.82],['BATH',.86,.82]].forEach(([t,fx,fy])=>{ c.fillText(t,X+BW*fx-30,Y+BH*fy); });
      c.font=`14px ${MONO}`; [['4.20 x 5.60',.2,.3],['3.60 x 4.10',.7,.3],['3.90 x 3.40',.3,.82]].forEach(([t,fx,fy])=>c.fillText(t,X+BW*fx-30,Y+BH*fy+22));
      dim(c,X,Y-40,X+BW*.42,Y-40,'5400'); dim(c,X+BW*.42,Y-40,X+BW,Y-40,'7200'); dim(c,X-45,Y,X-45,Y+BH,'');
      c.lineWidth=1; c.beginPath(); c.arc(w-150,150,36,0,7); c.stroke(); c.beginPath(); c.moveTo(w-150,108); c.lineTo(w-160,150); c.lineTo(w-140,150); c.closePath(); c.fill(); c.font=`600 16px ${SANS}`; c.fillText('N',w-155,100);
      titleBlock(c,w,h,['GROUND FLOOR PLAN','DWG  A-102  REV C','SCALE 1:100','SHEET 04']); },
    blueprint(c,w,h){ c.fillStyle='#1d4c8a'; c.fillRect(0,0,w,h); const L='rgba(235,243,255,.92)';
      c.strokeStyle='rgba(255,255,255,.07)'; c.lineWidth=1; for(let x=0;x<w;x+=24){ c.beginPath(); c.moveTo(x,0); c.lineTo(x,h); c.stroke(); } for(let y=0;y<h;y+=24){ c.beginPath(); c.moveTo(0,y); c.lineTo(w,y); c.stroke(); }
      border(c,w,h,L); c.strokeStyle=L; c.fillStyle=L; const G=h*.72, X=120, BW=w*.62;
      c.lineWidth=3; c.beginPath(); c.moveTo(70,G); c.lineTo(w-70,G); c.stroke();
      c.lineWidth=2.5; c.strokeRect(X,G-h*.48,BW,h*.48); c.beginPath(); c.moveTo(X-20,G-h*.48); c.lineTo(X+BW/2,G-h*.62); c.lineTo(X+BW+20,G-h*.48); c.stroke();
      c.lineWidth=1.5; for(let r=0;r<3;r++) for(let k=0;k<6;k++){ const wx=X+30+k*(BW-60)/6, wy=G-h*.44+r*h*.14; c.strokeRect(wx,wy,BW/9,h*.09); c.beginPath(); c.moveTo(wx+BW/18,wy); c.lineTo(wx+BW/18,wy+h*.09); c.stroke(); }
      c.setLineDash([12,6,3,6]); c.beginPath(); for(let r=0;r<4;r++){ const y=G-r*h*.16; c.moveTo(X+BW+30,y); c.lineTo(X+BW+120,y); } c.stroke(); c.setLineDash([]);
      c.font=`15px ${MONO}`; ['+0.000 GL','+3.200 FFL','+6.400 FFL','+9.600 TOS'].forEach((t,r)=>c.fillText(t,X+BW+36,G-r*h*.16-8));
      titleBlock(c,w,h,['FRONT ELEVATION','DWG  A-201  REV B','SCALE 1:50','SHEET 07'],L); },
    grid(c,w,h){ paperBg(c,w,h,'#fcfcfa'); border(c,w,h); const cols='ABCDEF', X0=130,Y0=130,X1=w-150,Y1=h-230;
      c.strokeStyle='#b8383f'; c.lineWidth=1.2; c.setLineDash([22,6,4,6]);
      for(let i=0;i<6;i++){ const x=X0+i*(X1-X0)/5; c.beginPath(); c.moveTo(x,Y0-40); c.lineTo(x,Y1+20); c.stroke(); }
      for(let j=0;j<5;j++){ const y=Y0+j*(Y1-Y0)/4; c.beginPath(); c.moveTo(X0-40,y); c.lineTo(X1+20,y); c.stroke(); }
      c.setLineDash([]); c.font=`600 17px ${SANS}`; c.textAlign='center'; c.textBaseline='middle';
      for(let i=0;i<6;i++){ const x=X0+i*(X1-X0)/5; c.strokeStyle=INK; c.beginPath(); c.arc(x,Y0-62,20,0,7); c.stroke(); c.fillStyle=INK; c.fillText(cols[i],x,Y0-61); }
      for(let j=0;j<5;j++){ const y=Y0+j*(Y1-Y0)/4; c.beginPath(); c.arc(X0-62,y,20,0,7); c.stroke(); c.fillText(j+1,X0-62,y+1); }
      c.textAlign='left'; c.textBaseline='alphabetic';
      for(let i=0;i<6;i++) for(let j=0;j<5;j++){ const x=X0+i*(X1-X0)/5, y=Y0+j*(Y1-Y0)/4; c.fillStyle=INK; c.fillRect(x-9,y-9,18,18); c.strokeStyle='#6b6c6e'; c.setLineDash([5,4]); c.strokeRect(x-26,y-26,52,52); c.setLineDash([]); }
      c.fillStyle='#6b6c6e'; c.font=`13px ${MONO}`; c.fillText('F1  1800 x 1800 x 450',X0+10,Y1+60); c.fillText('C1  300 x 450  M25',X0+10,Y1+82);
      titleBlock(c,w,h,['COLUMN LAYOUT','DWG  S-101  REV A','SCALE 1:100','SHEET 12']); },
    section(c,w,h){ paperBg(c,w,h); border(c,w,h); c.strokeStyle=INK; c.fillStyle=INK;
      const X=110, BW=w*.58, G=h*.7;
      c.lineWidth=2; c.beginPath(); c.moveTo(70,G); c.lineTo(w-70,G); c.stroke();
      c.save(); c.beginPath(); c.rect(70,G,w-140,60); c.clip(); c.lineWidth=1; for(let x=40;x<w;x+=14){ c.beginPath(); c.moveTo(x,G); c.lineTo(x-60,G+60); c.stroke(); } c.restore();
      [[X,G-h*.5,22,h*.5+40],[X+BW-22,G-h*.5,22,h*.5+40]].forEach(r=>{ c.fillStyle=INK; c.fillRect(...r); });
      [G-h*.25,G-h*.5].forEach(y=>{ c.save(); c.beginPath(); c.rect(X,y-16,BW,16); c.clip(); c.fillStyle='#d9d6cf'; c.fillRect(X,y-16,BW,16); c.strokeStyle=INK; c.lineWidth=.8; for(let x=X;x<X+BW;x+=8){ c.beginPath(); c.moveTo(x,y); c.lineTo(x+16,y-16); c.stroke(); } c.restore(); c.strokeRect(X,y-16,BW,16); });
      c.lineWidth=1.5; for(let k=0;k<9;k++){ c.beginPath(); c.moveTo(X+BW*.62+k*14,G); c.lineTo(X+BW*.62+k*14,G-k*h*.028); c.lineTo(X+BW*.62+(k+1)*14,G-k*h*.028); c.stroke(); }
      c.fillStyle=INK; c.font=`14px ${MONO}`; c.fillText('150 RCC SLAB',X+BW+30,G-h*.5-4); c.fillText('230 BRICK WALL',X+BW+30,G-h*.36); c.fillText('PCC 1:4:8',X+BW+30,G+30);
      titleBlock(c,w,h,['SECTION  X-X','DWG  A-301  REV A','SCALE 1:50','SHEET 09']); },
    boq(c,w,h){ paperBg(c,w,h,'#fdfdfb'); c.fillStyle=INK;
      c.font=`600 ${h*.042}px ${SANS}`; c.fillText('Bill of Quantities',60,90); c.font=`${h*.022}px ${MONO}`; c.fillStyle='#6b6c6e'; c.fillText('PKG 03  ·  CIVIL WORKS  ·  TOWER B',60,128);
      const cols=[60,130,w*.6,w*.72,w*.84], head=['NO','DESCRIPTION','QTY','UNIT','RATE ₹'];
      c.fillStyle='#eef2fa'; c.fillRect(48,160,w-96,44); c.fillStyle=INK; c.font=`600 ${h*.02}px ${MONO}`; head.forEach((t,i)=>c.fillText(t,cols[i],189));
      const rows=[['PCC 1:4:8 below footings','42.5','m³','5,850'],['RCC M25 footings','118.0','m³','7,420'],['TMT Fe500 reinforcement','14.2','MT','68,900'],['Shuttering to columns','640','m²','540'],['Brickwork 230 mm','286','m³','6,150'],['Internal plaster 12 mm','1,920','m²','310'],['Waterproofing, terrace','410','m²','820'],['Anti-termite treatment','520','m²','95']];
      c.font=`${h*.021}px ${SANS}`; rows.forEach((r,i)=>{ const y=250+i*h*.075; c.strokeStyle='#e4e4e4'; c.lineWidth=1; c.beginPath(); c.moveTo(48,y+18); c.lineTo(w-48,y+18); c.stroke(); c.fillStyle=INK; c.fillText(String(i+1).padStart(2,'0'),cols[0],y); r.forEach((t,k)=>c.fillText(t,cols[k+1],y)); });
      c.strokeStyle='#3279f2'; c.lineWidth=3; c.beginPath(); c.ellipse(w*.86,250+2*h*.075-6,64,24,-.05,0,7); c.stroke(); c.fillStyle='#3279f2'; c.font=`italic 22px ${SANS}`; c.fillText('check rate?',w*.7,250+2*h*.075+52); },
    trace(c,w,h){ c.fillStyle='#f6efd2'; c.fillRect(0,0,w,h); c.strokeStyle='rgba(50,50,55,.75)'; c.lineCap='round';
      function sk(pts){ for(let p=0;p<2;p++){ c.lineWidth=rnd(1,2.2); c.beginPath(); pts.forEach(([x,y],i)=>{ x+=rnd(-3,3); y+=rnd(-3,3); i?c.lineTo(x,y):c.moveTo(x,y); }); c.stroke(); } }
      sk([[120,h-140],[120,200],[w*.45,90],[w*.75,200],[w*.75,h-140],[120,h-140]]);
      for(let k=0;k<4;k++) sk([[170+k*100,h-260],[170+k*100,h-380],[240+k*100,h-380],[240+k*100,h-260],[170+k*100,h-260]]);
      sk([[w*.38,h-140],[w*.38,h-240],[w*.5,h-240],[w*.5,h-140]]);
      c.fillStyle='rgba(50,50,55,.8)'; c.font=`italic 30px ${SANS}`; c.fillText('entry, more glass?',w*.55,h*.35); sk([[w*.55,h*.37],[w*.47,h*.5]]); },
  };

  /* little real-world marks on top of the drawings */
  const MARKS={
    plan(c,w,h){ c.save(); c.translate(w*.5,h*.22); for(let k=0;k<3;k++){ c.strokeStyle=`rgba(126,84,40,${.26-k*.06})`; c.lineWidth=7-k*2; c.beginPath(); c.ellipse(0,0,74+k*3+rnd(-2,2),72+k*2,0,rnd(0,1),Math.PI*2-rnd(.2,.8)); c.stroke(); } c.restore(); },
    section(c,w,h){ c.strokeStyle='rgba(206,48,48,.85)'; c.lineWidth=3; c.beginPath(); const cx=w*.47, cy=h*.47, rx=150, ry=95; for(let a=0;a<Math.PI*2;a+=Math.PI/9){ const x1=cx+Math.cos(a)*rx, y1=cy+Math.sin(a)*ry, x2=cx+Math.cos(a+Math.PI/9)*rx, y2=cy+Math.sin(a+Math.PI/9)*ry; c.moveTo(x1,y1); c.quadraticCurveTo((x1+x2)/2+Math.cos(a+.17)*26,(y1+y2)/2+Math.sin(a+.17)*26,x2,y2); } c.stroke();
      c.beginPath(); c.moveTo(cx+rx+40,cy-ry-60); c.lineTo(cx+rx+90,cy-ry-60); c.lineTo(cx+rx+65,cy-ry-104); c.closePath(); c.stroke(); c.fillStyle='rgba(206,48,48,.9)'; c.font=`600 22px ${SANS}`; c.fillText('C',cx+rx+58,cy-ry-66); },
    grid(c,w,h){ c.fillStyle='rgba(60,50,30,.05)'; c.fillRect(w/2-1,0,2,h); },
    boq(c,w,h){ c.fillStyle='rgba(0,0,0,.06)'; c.fillRect(48,40,40,4); },
  };

  /* a sheet is shown at about a quarter of its drawn size, so thicken every line and
     enlarge every label as it is drawn, or the hairlines vanish when the texture shrinks */
  function bold(c){
    const P=CanvasRenderingContext2D.prototype, lw=Object.getOwnPropertyDescriptor(P,'lineWidth'), ft=Object.getOwnPropertyDescriptor(P,'font');
    Object.defineProperty(c,'lineWidth',{get(){ return lw.get.call(this); },set(v){ lw.set.call(this,v*2.3); }});
    Object.defineProperty(c,'font',{get(){ return ft.get.call(this); },set(v){ ft.set.call(this,v.replace(/([\d.]+)px/,(m,n)=>n*1.3+'px')); }});
    c.lineWidth=1;
  }

  /* ── sheets ─────────────────────────────────────────────────────── */
  const GAP=.03, things=[];
  function sheet(kind,fx,fy,rot,sw){
    const sh=sw*990/1400, fold=kind==='grid';
    const geo=new THREE.PlaneGeometry(sw,sh,40,28), p=geo.attributes.position;
    const lift=[rnd(0,.013),rnd(0,.013),rnd(0,.013),rnd(0,.013)];   /* each corner curls up a little, differently */
    for(let i=0;i<p.count;i++){
      const u=p.getX(i)/sw+.5, v=p.getY(i)/sh+.5;
      const corner=lift[0]*(1-u)*(1-v)+lift[1]*u*(1-v)+lift[2]*(1-u)*v+lift[3]*u*v;
      const edge=Math.pow(Math.max(Math.abs(u-.5),Math.abs(v-.5))*2,6);
      p.setZ(i,corner*edge*2+(fold?.012*(1-Math.abs(u-.5)*2)**8:0));
    }
    geo.computeVertexNormals();
    const map=tex(1400,990,(c,w,h)=>{ bold(c); DRAW[kind](c,w,h); MARKS[kind]&&MARKS[kind](c,w,h); },1.6);
    const face=new THREE.MeshStandardMaterial({map,roughness:1,metalness:0,side:THREE.DoubleSide});
    const m=new THREE.Mesh(geo,face); m.rotation.x=-Math.PI/2;
    const g=new THREE.Group(); g.add(m);
    if(kind==='boq'){ const st=new THREE.Mesh(new THREE.BoxGeometry(.26,.008,.035),new THREE.MeshStandardMaterial({color:0xcfd2d6,metalness:1,roughness:.3})); st.position.set(-sw/2+.3,.012,-sh/2+.22); st.rotation.y=.6; g.add(st); }
    scene.add(g);
    const t={g,mesh:m,kind:'sheet',w:sw,h:sh,x:(fx-.5)*W,z:(fy-.5)*H,rot:THREE.MathUtils.degToRad(-rot),y:0,lift:0,av:0,
      near:shadowPlane(),far:shadowPlane()};
    g.traverse(o=>o.userData.thing=things.length); things.push(t); return t;
  }

  /* ── things that lie on top of the drawings ─────────────────────── */
  function scaleRuler(fx,fy,rot){
    const L=3.1, r=.2, g=new THREE.Group();
    const ticks=tex(384,2048,(c,w,h)=>{ c.fillStyle='#eceeef'; c.fillRect(0,0,w,h); c.fillStyle='#2b2c2f'; c.font=`600 22px ${SANS}`;
      for(let f=0;f<3;f++){ const x0=f*w/3+6; for(let i=0;i<=100;i++){ const y=40+i*(h-80)/100, big=i%10===0, mid=i%5===0; c.fillRect(x0,y,big?44:mid?30:18,2); if(big){ c.save(); c.translate(x0+52,y+8); c.fillText(String(i/10*[1,2,5][f]*10),0,0); c.restore(); } }
        c.save(); c.translate(x0+90,h/2); c.rotate(Math.PI/2); c.font=`600 26px ${SANS}`; c.fillStyle=['#2b2c2f','#c0392b','#2b2c2f'][f]; c.fillText(['1:100','1:50','1:200'][f],0,0); c.restore(); } });
    const plastic=new THREE.MeshStandardMaterial({map:ticks,roughness:.55});
    const bar=new THREE.Mesh(new THREE.CylinderGeometry(r,r,L,3,1),[plastic,new THREE.MeshStandardMaterial({color:0xd9dcde,roughness:.6}),new THREE.MeshStandardMaterial({color:0xd9dcde,roughness:.6})]);
    bar.rotation.set(0,0,Math.PI/2); bar.rotateY(Math.PI/6); bar.position.y=r*.5; g.add(bar);
    scene.add(g);
    const t={g,kind:'thing',w:L,h:.4,height:r*1.5,x:(fx-.5)*W,z:(fy-.5)*H,rot:THREE.MathUtils.degToRad(-rot),y:0,lift:0,av:0,near:shadowPlane(),far:shadowPlane()};
    g.traverse(o=>o.userData.thing=things.length); things.push(t); return t;
  }
  function pencil(fx,fy,rot){
    const L=2.0, g=new THREE.Group(), R=.07;
    const lac=new THREE.MeshPhysicalMaterial({color:0x2d2f33,roughness:.32,clearcoat:.7}), wood=new THREE.MeshStandardMaterial({color:0xe3c194,roughness:.85});
    const body=new THREE.Mesh(new THREE.CylinderGeometry(R,R,L,6),lac); body.rotation.z=Math.PI/2; g.add(body);
    const cone=new THREE.Mesh(new THREE.CylinderGeometry(R,.018,.3,6),wood); cone.rotation.z=-Math.PI/2; cone.position.x=L/2+.15; g.add(cone);
    const tip=new THREE.Mesh(new THREE.ConeGeometry(.018,.07,12),new THREE.MeshStandardMaterial({color:0x26272a,metalness:.5,roughness:.35})); tip.rotation.z=-Math.PI/2; tip.position.x=L/2+.335; g.add(tip);
    const end=new THREE.Mesh(new THREE.CylinderGeometry(R*.98,R*.98,.02,6),new THREE.MeshStandardMaterial({color:0xc9a24e,metalness:1,roughness:.3})); end.rotation.z=Math.PI/2; end.position.x=-L/2-.01; g.add(end);
    g.children.forEach(o=>o.position.y=R);
    scene.add(g);
    const t={g,kind:'thing',w:L+.4,h:.14,height:R*2,x:(fx-.5)*W,z:(fy-.5)*H,rot:THREE.MathUtils.degToRad(-rot),y:0,lift:0,av:0,near:shadowPlane(),far:shadowPlane()};
    g.traverse(o=>o.userData.thing=things.length); things.push(t); return t;
  }

  /* the pile, bottom to top */
  sheet('grid',.86,.2,-7,4.2);
  sheet('section',.6,.9,-4,3.8);
  sheet('blueprint',.83,.6,6,4.0);
  sheet('trace',.67,.5,9,3.3);
  sheet('plan',.76,.37,-12,4.0);
  sheet('boq',.95,.86,-10,3.3);
  scaleRuler(.79,.73,-24);
  pencil(.62,.66,38);
  let order=things.filter(t=>t.kind==='sheet');

  /* keep the drawings off the password */
  let guard;
  function fence(){ const r=root.querySelector('.lk-box').getBoundingClientRect(); guard={x:(r.right+30)/U-W/2,z:(r.bottom+30)/U-H/2}; }
  fence();
  function keepOut(t){
    const half=Math.max(t.w,t.h)*.42;
    t.x=Math.min(Math.max(t.x,-W/2-half*.6),W/2+half*.6); t.z=Math.min(Math.max(t.z,-H/2-half*.6),H/2+half*.6);
    if(t.x-half<guard.x && t.z-half<guard.z){ if(guard.x-(t.x-half)<guard.z-(t.z-half)) t.x=guard.x+half; else t.z=guard.z+half; }
  }

  function place(){
    order.forEach((t,i)=>t.base=i*GAP);
    const top=order.length*GAP;
    things.forEach(t=>{
      const y=(t.kind==='sheet'?t.base:top+.005)+t.lift;
      t.g.position.set(t.x,y,t.z); t.g.rotation.y=t.rot;
      /* two shadows: a tight contact one and a wide soft one, both pushed away from the window */
      const hgt=(t.kind==='sheet'?.02:t.height)+t.lift*3;
      [[t.near,.06,.24,1.02],[t.far,.22,.12,1.1]].forEach(([s,spread,op,grow])=>{
        const d=spread+hgt*.9;
        s.position.set(t.x+LIGHT.x*d,y-.004,t.z+LIGHT.y*d); s.rotation.z=t.rot;
        s.scale.set(t.w*grow*(256/144)+hgt*1.5,t.h*grow*(256/144)+hgt*1.5,1);
        s.material.opacity=op*(1-Math.min(t.lift*1.6,.5));
        s.renderOrder=1;
      });
    });
  }

  /* ── drag: pick up the top sheet under the pointer, it turns around your finger ── */
  const ray=new THREE.Raycaster(), ptr=new THREE.Vector2(), cv=renderer.domElement, deskPlane=new THREE.Plane(new THREE.Vector3(0,1,0),0), hit=new THREE.Vector3();
  function toDesk(e){ ptr.set(e.clientX/innerWidth*2-1,-(e.clientY/innerHeight)*2+1); ray.setFromCamera(ptr,cam); ray.ray.intersectPlane(deskPlane,hit); return {x:hit.x,z:hit.z}; }
  function pick(e){ ptr.set(e.clientX/innerWidth*2-1,-(e.clientY/innerHeight)*2+1); ray.setFromCamera(ptr,cam);
    const h=ray.intersectObjects(things.map(t=>t.g),true)[0]; return h?things[h.object.userData.thing]:null; }
  let held=null, grab=null, last=null;
  cv.addEventListener('pointerdown',e=>{
    const t=pick(e); if(!t) return;
    held=t; cv.setPointerCapture(e.pointerId); cv.style.cursor='grabbing';
    if(t.kind==='sheet'){ order=order.filter(o=>o!==t).concat(t); }
    const p=toDesk(e), dx=p.x-t.x, dz=p.z-t.z, c=Math.cos(-t.rot), s=Math.sin(-t.rot);
    grab={x:dx*c-dz*s, z:dx*s+dz*c}; last=p;
  });
  cv.addEventListener('pointermove',e=>{
    if(!held){ cv.style.cursor=pick(e)?'grab':''; return; }
    const p=toDesk(e), c=Math.cos(held.rot), s=Math.sin(held.rot);
    const rx=grab.x*c-grab.z*s, rz=grab.x*s+grab.z*c;           /* finger offset from the centre, in world */
    const mx=p.x-last.x, mz=p.z-last.z; last=p;
    held.av+=(rx*mz-rz*mx)*-.12/Math.max(held.w,1);              /* dragging off-centre turns the sheet */
    held.target={x:p.x,z:p.z};
  });
  function drop(){ held=null; cv.style.cursor=''; }
  cv.addEventListener('pointerup',drop); cv.addEventListener('pointercancel',drop);

  /* ── the password form reports back through classes ─────────────── */
  let ruffle=0, breath=-1;
  const form=root.querySelector('form'); let wasBad=false;
  if(!still){
    new MutationObserver(()=>{ const bad=form.classList.contains('bad'); if(bad&&!wasBad) ruffle=.5; wasBad=bad; }).observe(form,{attributes:true,attributeFilter:['class']});
    new MutationObserver(()=>{ if(root.classList.contains('unlocking')) breath=0; }).observe(root,{attributes:true,attributeFilter:['class']});
  }
  things.forEach((t,i)=>{ t.seed=Math.random()*6; t.home={x:t.x,z:t.z,rot:t.rot}; });

  addEventListener('resize',()=>{ W=innerWidth/U; H=innerHeight/U; renderer.setSize(innerWidth,innerHeight); frame(); fence(); });

  holder.classList.add('ready');
  let prev=performance.now();
  renderer.setAnimationLoop(now=>{
  if(!renderer.domElement.isConnected){ renderer.setAnimationLoop(null); renderer.dispose(); return; }  /* lock page replaced by the case study */
    const dt=Math.min((now-prev)/1000,1/30); prev=now;
    if(ruffle>0) ruffle-=dt;
    if(breath>=0) breath+=dt;
    things.forEach((t,i)=>{
      const lifted=held===t;
      if(lifted && t.target){
        const c=Math.cos(t.rot), s=Math.sin(t.rot), rx=grab.x*c-grab.z*s, rz=grab.x*s+grab.z*c;
        t.x+=(t.target.x-rx-t.x)*Math.min(1,dt*18); t.z+=(t.target.z-rz-t.z)*Math.min(1,dt*18);
      }
      t.rot+=t.av; t.av*=lifted?.86:.7;
      let want=lifted?(t.kind==='sheet'?.12:.25):0;
      if(ruffle>0) { want+=.03*Math.sin(now/40+t.seed)*ruffle; t.rot+=.004*Math.sin(now/50+t.seed)*ruffle; }
      if(breath>=0){ const k=Math.max(0,Math.sin(Math.min(Math.PI,(breath-i*.05)*3.2))); want+=k*(.35+t.seed*.04); t.rot+=k*.003*Math.sin(t.seed*3); }
      t.lift+=(want-t.lift)*Math.min(1,dt*(lifted?14:9));
      keepOut(t);
    });
    place();
    renderer.render(scene,cam);
  });
}
