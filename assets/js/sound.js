/* Soft UI sounds (after billguo.me): synthesised with Web Audio, no files.
   A tiny click on press, a two-note chime when a link or button is clicked.
   Off for reduced motion; the speaker button (.snd) mutes it and the choice is remembered. */
(function(){
  if(window.__snd)return;
  let ctx=null,out=null,noise=null;
  let on=true;try{on=localStorage.getItem('sound')!=='off'}catch(e){}
  if(matchMedia('(prefers-reduced-motion: reduce)').matches)on=false;
  function init(){
    if(ctx)return true;const AC=window.AudioContext||window.webkitAudioContext;if(!AC)return false;
    try{ctx=new AC();out=ctx.createGain();out.gain.value=.5;out.connect(ctx.destination);
      const n=Math.floor(ctx.sampleRate*.05);noise=ctx.createBuffer(1,n,ctx.sampleRate);const d=noise.getChannelData(0);for(let i=0;i<n;i++)d[i]=Math.random()*2-1;return true}catch(e){ctx=null;return false}}
  function env(g,t,a,dcy,peak){g.gain.setValueAtTime(1e-4,t);g.gain.exponentialRampToValueAtTime(peak,t+a);g.gain.exponentialRampToValueAtTime(1e-4,t+a+dcy)}
  function tone(f,at,dcy,peak,glide){const t=ctx.currentTime+at,o=ctx.createOscillator(),g=ctx.createGain();o.type='sine';o.frequency.setValueAtTime(f,t);if(glide)o.frequency.exponentialRampToValueAtTime(glide,t+dcy);env(g,t,.005,dcy,peak);o.connect(g).connect(out);o.start(t);o.stop(t+dcy+.05)}
  function tick(f,peak){const t=ctx.currentTime,s=ctx.createBufferSource(),bp=ctx.createBiquadFilter(),g=ctx.createGain();s.buffer=noise;bp.type='bandpass';bp.frequency.value=f;bp.Q.value=1.5;env(g,t,.001,.02,peak);s.connect(bp).connect(g).connect(out);s.start(t);s.stop(t+.05)}
  const CUES={
    press:()=>tick(1700,.12),
    link:()=>{tone(1046.5,0,.2,.07);tone(1568,.08,.24,.06)},          /* C6 then G6 */
    out:()=>{tone(880,0,.12,.05);tone(1318.5,.07,.2,.055)},            /* A5 then E6, for links that leave the site */
    toggle:()=>{tick(2200,.1);setTimeout(()=>ctx&&tick(3600,.07),24)}
  };
  let last={};
  function play(k){if(!on||!init())return;const now=performance.now();if(now-(last[k]||0)<70)return;last[k]=now;
    const go=()=>{try{CUES[k]()}catch(e){}};ctx.state==='running'?go():ctx.resume().then(go).catch(()=>{})}
  const target=e=>e.target.closest&&e.target.closest('a[href],button,[role="button"],.card');
  addEventListener('pointerdown',e=>{if(e.button===0&&target(e))play('press')},{capture:true,passive:true});
  addEventListener('click',e=>{const el=target(e);if(!el||el.classList.contains('snd'))return;
    if(el.matches('button,[role="button"]')){play('toggle');return}
    const h=el.getAttribute('href')||'';play(/^https?:/.test(h)&&!h.includes(location.host)||h.startsWith('mailto:')?'out':'link')},{capture:true,passive:true});
  /* mute switch */
  function mount(){const b=document.createElement('button');b.type='button';b.className='snd';
    const draw=()=>{b.setAttribute('aria-pressed',on);b.setAttribute('aria-label',on?'Sound on, click to mute':'Sound off, click to unmute');b.dataset.n=on?'Sound on':'Sound off';
      b.innerHTML=on?'<svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M2 6h3l4-3v10l-4-3H2z" fill="currentColor"/><path d="M11 5.5a3.5 3.5 0 0 1 0 5M12.8 3.5a6 6 0 0 1 0 9" stroke-linecap="round"/></svg>':'<svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M2 6h3l4-3v10l-4-3H2z" fill="currentColor"/><path d="M11 6l4 4M15 6l-4 4" stroke-linecap="round"/></svg>'};
    b.addEventListener('click',()=>{on=!on;try{localStorage.setItem('sound',on?'on':'off')}catch(e){}draw();if(on)play('toggle')});draw();
    const sw=document.querySelector('.skysw');(sw||document.body).appendChild(b)}
  document.readyState==='loading'?addEventListener('DOMContentLoaded',mount):mount();
  window.__snd={play};
})();
