/* The time in Gurgaon, as a big dial cropped into the bottom right of the lock page.
   One tick per ten minutes; the red tick is now. Spin the dial and the label reads the time
   under the red tick, then it eases back. A wrong password shudders it, the right one spins it on. */
const root=document.getElementById('lock'), holder=root.querySelector('.lk-art'), form=root.querySelector('form');
const still=matchMedia('(prefers-reduced-motion:reduce)').matches;
const cv=document.createElement('canvas'); holder.appendChild(cv);
const x=cv.getContext('2d');
const STEP=10, DEG=2.5*Math.PI/180;              /* one tick every 10 minutes, 2.5° apart */
const MARK=Math.atan2(-.18,-.98);               /* the red tick points left, a touch up; later times run down the arc */
let w,h,R,cx,cy,dpr;
function size(){
  dpr=Math.min(devicePixelRatio||1,2); w=innerWidth; h=innerHeight;
  cv.width=w*dpr; cv.height=h*dpr; cv.style.width=w+'px'; cv.style.height=h+'px';
  R=Math.max(460,Math.min(w,h)*.78); cx=w+R*.22; cy=h*.62+R*.18;
}
size(); addEventListener('resize',size);

/* minutes since midnight in Gurgaon (IST) */
function nowMin(){ const d=new Date(Date.now()+(330+new Date().getTimezoneOffset())*60000); return d.getHours()*60+d.getMinutes()+d.getSeconds()/60; }
function label(min){ min=((min%1440)+1440)%1440; let hh=Math.floor(min/60), mm=Math.floor(min%60); const ap=hh<12?'am':'pm'; hh=hh%12||12; return hh+':'+String(mm).padStart(2,'0')+' '+ap; }

let offset=0, spin=0, dragging=false, lastA=0, shudder=0;
function angleAt(e){ return Math.atan2(e.clientY-cy,e.clientX-cx); }
function onDial(e){ const d=Math.hypot(e.clientX-cx,e.clientY-cy); return d>R-90 && d<R+40; }
cv.addEventListener('pointerdown',e=>{ if(!onDial(e)) return; dragging=true; lastA=angleAt(e); spin=0; cv.setPointerCapture(e.pointerId); cv.style.cursor='grabbing'; });
cv.addEventListener('pointermove',e=>{
  if(!dragging){ cv.style.cursor=onDial(e)?'grab':''; return; }
  let a=angleAt(e), d=a-lastA; if(d>Math.PI) d-=2*Math.PI; if(d<-Math.PI) d+=2*Math.PI; lastA=a;
  offset+=d; spin=d*60;
});
function up(){ dragging=false; cv.style.cursor=''; }
cv.addEventListener('pointerup',up); cv.addEventListener('pointercancel',up);

let wasBad=false;
if(!still){
  new MutationObserver(()=>{ const bad=form.classList.contains('bad'); if(bad&&!wasBad) shudder=.5; wasBad=bad; }).observe(form,{attributes:true,attributeFilter:['class']});
  new MutationObserver(()=>{ if(root.classList.contains('unlocking')) spin=-9; }).observe(root,{attributes:true,attributeFilter:['class']});
}

function draw(t){
  const now=nowMin();
  x.setTransform(dpr,0,0,dpr,0,0); x.clearRect(0,0,w,h);
  const jit=shudder>0?Math.sin(t/22)*.012*shudder/.5:0;
  /* rotation: the tick for minute m sits at MARK + (now - m)/STEP·DEG + whatever the hand added */
  const rot=offset+jit, read=now-(rot/DEG)*STEP;
  const first=Math.floor((read-STEP*40)/STEP)*STEP;
  x.lineCap='round';
  for(let m=first;m<read+STEP*40;m+=STEP){
    const a=MARK+((read-m)/STEP)*DEG; const hour=((m%60)+60)%60===0;
    const len=hour?30:20, c=Math.cos(a), s=Math.sin(a);
    const fade=Math.max(0,a>MARK?1-(a-MARK)/.32:1-(MARK-a)/1.1); /* a few past ticks above, the evening ahead below */
    if(fade<=0) continue;
    x.strokeStyle=`rgba(10,10,10,${(hour?.75:.55)*fade})`; x.lineWidth=hour?1.6:1.3;
    x.beginPath(); x.moveTo(cx+c*R,cy+s*R); x.lineTo(cx+c*(R-len),cy+s*(R-len)); x.stroke();
    if(hour && Math.abs(a-MARK)>.06){
      x.save(); x.translate(cx+c*(R-46),cy+s*(R-46)); x.rotate(a+Math.PI);
      x.fillStyle=`rgba(107,108,110,${.8*fade})`; x.font='400 15px "Newsreader", Georgia, serif'; x.textBaseline='middle';
      x.fillText(label(m).replace(':00',''),0,0); x.restore();
    }
  }
  /* the red tick, and the time it is reading */
  const c=Math.cos(MARK), s=Math.sin(MARK);
  x.strokeStyle='#ef4b54'; x.lineWidth=2; x.beginPath(); x.moveTo(cx+c*(R+14),cy+s*(R+14)); x.lineTo(cx+c*(R-34),cy+s*(R-34)); x.stroke();
  x.save(); x.translate(cx+c*(R-52),cy+s*(R-52)); x.rotate(MARK+Math.PI);
  x.fillStyle='#444447'; x.textBaseline='middle';
  x.font='400 26px "Newsreader", Georgia, serif'; x.fillText(label(read),0,-2);
  x.font='400 12px "Geist Mono", monospace'; x.fillStyle='#a1a1a4'; x.fillText(Math.abs(rot)>.02?'SPINNING BACK TO NOW':'GURGAON, NOW',2,22);
  x.restore();
}

holder.classList.add('ready');
let prev=performance.now();
(function loop(t){
  const dt=Math.min((t-prev)/1000,1/30); prev=t;
  if(shudder>0) shudder-=dt;
  if(!dragging){
    offset+=spin*dt; spin*=Math.pow(.04,dt);                   /* coast */
    if(Math.abs(spin)<.4) offset+=(0-offset)*Math.min(1,dt*2.2);/* then ease home to now */
  }
  draw(t); requestAnimationFrame(loop);
})(prev);
