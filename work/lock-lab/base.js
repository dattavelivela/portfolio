/* lock lab: builds the password form into #lk and tells the variant what happens.
     lk.on('type', n => …)   n = boxes filled, 0..6
     lk.on('wrong', () => …) a full wrong password
     lk.on('right', () => …) the demo password (123456) was entered
     lk.on('focus', i => …)  box i got focus
   lk.count, lk.state ('idle' | 'wrong' | 'right'), lk.reset() clears the boxes.
   The real page checks the password on the server; the lab only knows the demo one. */
(function(){
  var DEMO='123456', subs={}, root=document.getElementById('lk');
  var lk=window.lk={count:0,state:'idle',
    on:function(e,f){ (subs[e]=subs[e]||[]).push(f); return lk; },
    emit:function(e,a){ (subs[e]||[]).forEach(function(f){ try{ f(a); }catch(x){ console.error(x); } }); },
    reset:function(){ bx.forEach(function(i){ i.value=''; }); lk.count=0; lk.state='idle'; lk.emit('type',0); bx[0].focus(); }};
  var box='<input class="bx" maxlength="1" autocomplete="off" autocapitalize="off" spellcheck="false" aria-label="Character">';
  root.innerHTML='<a class="back" href="./" aria-label="Back">&larr;</a>'+
    '<p>This project is under NDA.<br>Please enter password:</p>'+
    '<form novalidate>'+box+box+box+'<span class="dash" aria-hidden="true">-</span>'+box+box+box+'</form>'+
    '<p class="msg" role="alert"></p>'+
    '<p class="help">No password? <a href="mailto:withgurudatta@gmail.com">Email me</a></p>'+
    '<p class="demo">lab demo password: 123456</p>';
  var form=root.querySelector('form'), msg=root.querySelector('.msg'), bx=[].slice.call(form.querySelectorAll('.bx'));
  function val(){ return bx.map(function(i){ return i.value; }).join(''); }
  function update(){
    var n=bx.filter(function(i){ return i.value; }).length;
    if(n!==lk.count){ lk.count=n; lk.emit('type',n); }
    if(n<6) return;
    if(val()===DEMO){ lk.state='right'; msg.textContent=''; lk.emit('right'); }
    else{
      lk.state='wrong'; msg.textContent='Not quite. Try again.';
      form.classList.remove('bad'); void form.offsetWidth; form.classList.add('bad');
      lk.emit('wrong');
      setTimeout(function(){ bx.forEach(function(i){ i.value=''; }); lk.count=0; lk.state='idle'; lk.emit('type',0); bx[0].focus(); },700);
    }
  }
  function fill(t,from){ for(var i=0;i<t.length&&from+i<6;i++) bx[from+i].value=t[i]; bx[Math.min(from+t.length,5)].focus(); }
  bx.forEach(function(inp,i){
    inp.addEventListener('input',function(){ msg.textContent=''; var v=inp.value; if(v.length>1){ inp.value=''; fill(v,i); } else if(v&&i<5) bx[i+1].focus(); update(); });
    inp.addEventListener('keydown',function(e){
      if(e.key==='Backspace'&&!inp.value&&i>0){ bx[i-1].value=''; bx[i-1].focus(); e.preventDefault(); update(); }
      else if(e.key==='ArrowLeft'&&i>0) bx[i-1].focus(); else if(e.key==='ArrowRight'&&i<5) bx[i+1].focus(); });
    inp.addEventListener('paste',function(e){ var t=(e.clipboardData||window.clipboardData).getData('text').replace(/[\s-]/g,''); e.preventDefault(); if(t){ fill(t,i); update(); } });
    inp.addEventListener('focus',function(){ inp.select(); lk.emit('focus',i); });
  });
  setTimeout(function(){ bx[0].focus(); },150);
})();
