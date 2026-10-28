/* Case study lock page, shared by the gated loaders (clara.html, intake.html).
   The loader sets window.LOCK = {case, local}. If this browser was handed the page
   on unlock, or already knows the password, the case study opens straight away.
   Anyone else sees the password page instead of being sent back to the front page. */
(function(){
  var ENDPOINT='https://auiuyzhptbtxcpqvlnsw.supabase.co/functions/v1/unlock',
      CFG=window.LOCK||{}, CASE=CFG.case, KEEP='unlocked:'+CASE, HAND='handoff:'+CASE;

  function get(k){ try{ return localStorage.getItem(k)||sessionStorage.getItem(k); }catch(e){ return null; } }
  function set(k,v){ try{ localStorage.setItem(k,v); }catch(e){} }
  function drop(k){ try{ localStorage.removeItem(k); sessionStorage.removeItem(k); }catch(e){} }

  /* the case study is a whole page, so it replaces this one.
     On localhost, preview the new NCS-style page from the case study workspace instead. */
  var LOCAL=/^(localhost|127\.0\.0\.1)$/.test(location.hostname) && CFG.local;
  function reveal(html){
    if(LOCAL){ location.replace(LOCAL+location.hash); return; }
    var hash=location.hash;
    function go(){
      document.open(); document.write(html); document.close();
      if(hash) setTimeout(function(){ var t=document.getElementById(hash.slice(1)); if(t) t.scrollIntoView(); },300);
    }
    if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',go); else go();
  }

  function check(pw){
    return fetch(ENDPOINT,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({case:CASE,password:pw})})
      .then(function(r){ if(r.status===401) throw new Error('password'); if(!r.ok) throw new Error('server'); return r.json(); });
  }

  /* ── the password page ─────────────────────────────────────────── */
  function lock(){
    function build(){
      document.documentElement.classList.add('locked');
      var root=document.getElementById('lock');
      root.hidden=false;
      var form=root.querySelector('form'), bx=[].slice.call(form.querySelectorAll('.bx')), msg=root.querySelector('.lk-msg');
      fetch(ENDPOINT).catch(function(){});           /* wake the function while they type */
      setTimeout(function(){ bx[0].focus(); },200);
      function value(){ return bx.map(function(i){ return i.value; }).join(''); }
      function fill(text,from){ for(var i=0;i<text.length && from+i<bx.length;i++) bx[from+i].value=text[i]; var n=Math.min(from+text.length,bx.length-1); bx[n].focus(); }
      function buzz(){
        /* haptic only; no error sound */
        try{ if(navigator.vibrate) navigator.vibrate([90,40,90]); }catch(e){}
      }
      function submit(){
        var pw=value(); if(pw.length<bx.length) return;
        form.classList.add('busy'); msg.textContent='';
        check(pw).then(function(j){ root.classList.add('unlocking'); setTimeout(function(){ reveal(j.html); },2000); })
          .catch(function(err){
            form.classList.remove('busy');
            msg.textContent=err.message==='password'?'':'Couldn’t connect. Try again.';
            if(err.message==='password') buzz();
            form.classList.remove('bad'); void form.offsetWidth; form.classList.add('bad');
            bx.forEach(function(i){ i.value=''; }); bx[0].focus();
          });
      }
      bx.forEach(function(inp,i){
        inp.addEventListener('input',function(){
          msg.textContent=''; form.classList.remove('bad');
          var v=inp.value; if(v.length>1){ inp.value=''; fill(v,i); } else if(v && i<bx.length-1) bx[i+1].focus();
          submit();
        });
        inp.addEventListener('keydown',function(ev){
          if(ev.key==='Backspace' && !inp.value && i>0){ bx[i-1].value=''; bx[i-1].focus(); ev.preventDefault(); }
          else if(ev.key==='ArrowLeft' && i>0) bx[i-1].focus();
          else if(ev.key==='ArrowRight' && i<bx.length-1) bx[i+1].focus();
          else if(ev.key==='Enter'){ ev.preventDefault(); submit(); }
        });
        inp.addEventListener('paste',function(ev){
          var t=(ev.clipboardData||window.clipboardData).getData('text').replace(/[\s-]/g,''); ev.preventDefault();
          if(t){ fill(t,i); submit(); }
        });
        inp.addEventListener('focus',function(){ inp.select(); });
      });
      form.addEventListener('submit',function(ev){ ev.preventDefault(); submit(); });
    }
    if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',build); else build();
  }

  /* ── start ─────────────────────────────────────────────────────── */
  var hand=null; try{ hand=JSON.parse(localStorage.getItem(HAND)); localStorage.removeItem(HAND); }catch(e){}
  if(hand && hand.html && Date.now()-hand.t<120000){ reveal(hand.html); return; }
  drop(KEEP);          /* never remember an unlock: every fresh visit asks for the password again */
  lock();
})();
