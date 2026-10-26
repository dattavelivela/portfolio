/* Picks the scene behind the lock page. The clock dial is the one in use;
   ?desk=coffee, ?desk=docs and ?desk=keys preview the mug, the drawings pile and the keyboard. */
const holder=document.querySelector('#lock .lk-art');
if(holder && matchMedia('(min-width:761px)').matches){
  const pick=new URLSearchParams(location.search).get('desk');
  import({coffee:'./lock-coffee.js',docs:'./lock-docs.js',keys:'./lock-keys.js'}[pick]||'./lock-time.js');
}
