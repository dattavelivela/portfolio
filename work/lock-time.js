/* A bottom-centre semicircle "degree gauge" of Gurgaon time. Ten minutes per tick, 2.5deg apart.
   The red tick at the apex is now; the readout above it shows today's date and time.
   Drag the arc to read other moments and it eases home. A wrong password shudders it;
   the right one winds the gauge back and lands it on the project's own date. */
const root=document.getElementById('lock'), holder=root.querySelector('.lk-art'), form=root.querySelector('form');
const still=matchMedia('(prefers-reduced-motion:reduce)').matches;
const CFG=window.LOCK||{};
const cv=document.createElement('canvas'); holder.appendChild(cv);
const x=cv.getContext('2d');

const STEP=10, DEG=2.5*Math.PI/180;              /* one tick every 10 minutes, 2.5deg apart */
const APEX=-Math.PI/2;                            /* now sits at the top of the dome; past left, future right */
let w,h,R,cx,cy,dpr;
function size(){
  dpr=Math.min(devicePixelRatio||1,2); w=innerWidth; h=innerHeight;
  cv.width=w*dpr; cv.height=h*dpr; cv.style.width=w+'px'; cv.style.height=h+'px';
  R=Math.max(520,h*.62); cx=w/2; cy=h+(R-h*.26);  /* centre sits below the viewport, so the apex rides the lower third */
}
size(); addEventListener('resize',size);

/* the clock in Gurgaon (IST), whatever the viewer's own zone */
function istNow(){ return new Date(Date.now()+(330+new Date().getTimezoneOffset())*60000); }
const MON=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
function fmtTime(d){ let hh=d.getHours(),mm=d.getMinutes(); const ap=hh<12?'am':'pm'; hh=hh%12||12; return hh+':'+String(mm).padStart(2,'0')+' '+ap; }
function fmtDate(d){ return d.getDate()+' '+MON[d.getMonth()]+' '+d.getFullYear(); }
const DAYMS=86400000;
/* the reading expressed as a day index (UTC-anchored) plus the fraction through that day */
function dayParts(){ const d=new Date(readMs()); return {di:Date.UTC(d.getFullYear(),d.getMonth(),d.getDate())/DAYMS, frac:(d.getHours()*3600+d.getMinutes()*60+d.getSeconds())/86400}; }

let offset=0, spin=0, dragging=false, lastA=0, shudder=0, landing=null, wasBad=false, winding=false;

/* reading = now, wound back by (offset / DEG) days: one tick, one day */
function readMs(){ return istNow().getTime()-(offset/DEG)*DAYMS; }

function angleAt(e){ return Math.atan2(e.clientY-cy,e.clientX-cx); }
function near(e){
  const d=Math.hypot(e.clientX-cx,e.clientY-cy);
  let da=angleAt(e)-APEX; while(da>Math.PI)da-=2*Math.PI; while(da<-Math.PI)da+=2*Math.PI;
  return d>R-80 && d<R+50 && Math.abs(da)<.6;
}
cv.addEventListener('pointerdown',e=>{ if(landing||!near(e)) return; dragging=true; lastA=angleAt(e); spin=0; cv.setPointerCapture(e.pointerId); cv.style.cursor='grabbing'; });
cv.addEventListener('pointermove',e=>{
  if(!dragging){ cv.style.cursor=near(e)?'grab':''; return; }
  let a=angleAt(e), d=a-lastA; if(d>Math.PI)d-=2*Math.PI; if(d<-Math.PI)d+=2*Math.PI; lastA=a;
  offset+=d; spin=d*60;
});
function up(){ dragging=false; cv.style.cursor=''; }
cv.addEventListener('pointerup',up); cv.addEventListener('pointercancel',up);

function makeLanding(){
  if(!CFG.date){ spin=-11; return {target:null,start:performance.now(),label:''}; }  /* no project date: just spin on */
  const p=String(CFG.date).split('-').map(Number);                                  /* YYYY-MM-DD */
  const target=new Date(p[0],(p[1]||1)-1,p[2]||1);
  return {target,start:performance.now(),label:(CFG.case?CFG.case.toUpperCase()+' · ':'')+'WHERE IT BEGAN'};
}
if(!still){
  new MutationObserver(()=>{ const bad=form.classList.contains('bad'); if(bad&&!wasBad) shudder=.5; wasBad=bad; winding=form.classList.contains('busy'); }).observe(form,{attributes:true,attributeFilter:['class']});
  new MutationObserver(()=>{ if(root.classList.contains('unlocking')&&!landing) landing=makeLanding(); }).observe(root,{attributes:true,attributeFilter:['class']});
}

function draw(t){
  const now=istNow(), read=new Date(readMs());
  x.setTransform(dpr,0,0,dpr,0,0); x.clearRect(0,0,w,h);
  const jit=shudder>0?Math.sin(t/22)*.012*shudder/.5:0;
  x.lineCap='round';
  const P=dayParts(), dayFloat=P.di+P.frac, base=Math.round(dayFloat);
  for(let k=-52;k<=52;k++){
    const tm=base+k;                                      /* absolute day index of this tick */
    const a=APEX+(tm-dayFloat)*DEG+jit, da=a-APEX;
    const fade=Math.max(0,1-Math.abs(da)/.62); if(fade<=0) continue;
    const d=new Date(tm*DAYMS), dom=d.getUTCDate(), monthStart=dom===1, mark=dom%5===0;
    const len=monthStart?34:mark?24:16, c=Math.cos(a), s=Math.sin(a);
    x.strokeStyle=`rgba(10,10,10,${(monthStart?.72:mark?.55:.36)*fade})`; x.lineWidth=monthStart?1.7:mark?1.3:1.1;
    x.beginPath(); x.moveTo(cx+c*R,cy+s*R); x.lineTo(cx+c*(R-len),cy+s*(R-len)); x.stroke();
    if((monthStart||mark) && Math.abs(da)>.05){
      x.save(); x.translate(cx+c*(R-len-15),cy+s*(R-len-15)); x.rotate(a+Math.PI/2);
      x.textAlign='center'; x.textBaseline='middle';
      if(monthStart){ x.fillStyle=`rgba(68,68,71,${.9*fade})`; x.font='400 14px "Newsreader", Georgia, serif'; x.fillText(MON[d.getUTCMonth()]+(d.getUTCMonth()===0?" '"+String(d.getUTCFullYear()).slice(2):''),0,0); }
      else{ x.fillStyle=`rgba(107,108,110,${.8*fade})`; x.font='400 12px "Newsreader", Georgia, serif'; x.fillText(String(dom),0,0); }
      x.restore();
    }
  }
  /* the red now-tick at the apex */
  const c=Math.cos(APEX), s=Math.sin(APEX);
  x.strokeStyle='#ef4b54'; x.lineWidth=2.2; x.beginPath(); x.moveTo(cx+c*(R+16),cy+s*(R+16)); x.lineTo(cx+c*(R-36),cy+s*(R-36)); x.stroke();
  /* the readout, above the apex */
  const ty=cy-R-30; x.textAlign='center';
  if(landing && landing.target && performance.now()-landing.start>700){
    x.fillStyle='#9a9a9d'; x.textBaseline='alphabetic'; x.font='400 22px "Newsreader", Georgia, serif';
    x.fillText(fmtDate(landing.target),cx,ty);
    x.fillStyle='#a1a1a4'; x.font='400 11px "Geist Mono", monospace'; x.fillText(landing.label,cx,ty+22);
  } else {
    x.fillStyle='#9a9a9d'; x.textBaseline='alphabetic'; x.font='400 22px "Newsreader", Georgia, serif';
    x.fillText(fmtDate(read),cx,ty);
    x.fillStyle='#a1a1a4'; x.font='400 11px "Geist Mono", monospace';
    x.fillText(landing?'WINDING BACK':(winding?'CHECKING…':(Math.abs(offset)>.02?'SPINNING BACK TO NOW':'GURGAON, NOW')),cx,ty+22);
  }
  x.textAlign='left';
}

holder.classList.add('ready');
let prev=performance.now();
(function loop(t){
  const dt=Math.min((t-prev)/1000,1/30); prev=t;
  if(shudder>0) shudder-=dt;
  if(landing){
    if(t-landing.start<700) offset+=7*dt;                          /* a quick whirr back through the months */
  } else if(winding){
    offset+=6*dt;                                                  /* winding back while the password is checked */
  } else if(!dragging){
    offset+=spin*dt; spin*=Math.pow(.04,dt);                       /* coast */
    if(Math.abs(spin)<.4) offset+=(0-offset)*Math.min(1,dt*2.2);   /* a wrong password lets it ease home to today */
  }
  draw(t); requestAnimationFrame(loop);
})(prev);
