/* ── the lock ─────────────────────────────────────────────────────
   The case study is not in this page. It sits next door as a blob of
   AES-GCM ciphertext, and the password is the only way to read it -
   so viewing source, or reading the public repo, gets you nothing.
   The key is derived from the password with PBKDF2, never stored;
   a successful unlock is remembered for the tab only.
   ---------------------------------------------------------------- */
(function(){
  var root=document.documentElement,
      gate=document.querySelector('.gate'),
      form=gate.querySelector('form'),
      input=gate.querySelector('input'),
      msg=gate.querySelector('.gate-msg'),
      paper=document.querySelector('.paper'),
      src=paper.dataset.src,
      key='unlocked:'+src;

  function say(text,bad){
    msg.textContent=text;
    msg.classList.toggle('bad',!!bad);
  }

  /* base64 -> bytes, for the three fields in the payload */
  function bytes(b64){
    var raw=atob(b64), out=new Uint8Array(raw.length);
    for(var i=0;i<raw.length;i++) out[i]=raw.charCodeAt(i);
    return out;
  }

  function decrypt(payload,password){
    var enc=new TextEncoder();
    return crypto.subtle.importKey('raw',enc.encode(password),'PBKDF2',false,['deriveKey'])
      .then(function(base){
        return crypto.subtle.deriveKey(
          {name:'PBKDF2',salt:bytes(payload.salt),iterations:payload.iterations,hash:'SHA-256'},
          base,{name:'AES-GCM',length:256},false,['decrypt']
        );
      })
      .then(function(k){
        return crypto.subtle.decrypt({name:'AES-GCM',iv:bytes(payload.iv)},k,bytes(payload.body));
      })
      .then(function(plain){ return new TextDecoder().decode(plain); });
  }

  function reveal(html){
    paper.innerHTML=html;
    root.classList.remove('locked');
    gate.remove();
    document.title=(paper.dataset.title||document.title);
    /* a hash in the URL should still land on its section */
    if(location.hash){
      var t=document.getElementById(location.hash.slice(1));
      if(t) t.scrollIntoView();
    }
  }

  var payload=null,loading=null;
  function load(){
    if(!loading) loading=fetch(src).then(function(r){
      if(!r.ok) throw new Error('missing');
      return r.json();
    }).then(function(j){ payload=j; return j; });
    return loading;
  }

  /* already unlocked in this tab - go straight in */
  var kept=null;
  try{ kept=sessionStorage.getItem(key); }catch(e){}
  if(kept){
    load().then(function(p){ return decrypt(p,kept); }).then(reveal).catch(function(){
      try{ sessionStorage.removeItem(key); }catch(e){}
    });
  }

  load().catch(function(){ say('This page could not load its contents.',true); });

  form.addEventListener('submit',function(e){
    e.preventDefault();
    var pw=input.value.trim();
    if(!pw){ input.focus(); return; }
    if(!(window.crypto&&crypto.subtle)){
      say('This browser cannot unlock the page. Try Chrome, Safari or Firefox over https.',true);
      return;
    }
    say('Unlocking…');
    load()
      .then(function(p){ return decrypt(p,pw); })
      .then(function(html){
        try{ sessionStorage.setItem(key,pw); }catch(e){}
        reveal(html);
      })
      .catch(function(){
        say('That password is not right.',true);
        gate.classList.add('shake');
        setTimeout(function(){ gate.classList.remove('shake'); },450);
        input.select();
      });
  });

  input.focus();
})();
