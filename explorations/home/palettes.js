/* Palette lab: ?pal=<key> (or the last picked swatch) recolours the page and its default sky. */
(function(){
const P={
 kelly:  {n:'Kelly blue',  sky:[[54,62,186],[118,166,232],[236,240,246]], paper:'#F4F4F2',ink:'#29496F',grey:'#929FB0',soft:'#738399',acc:'#E65F2E',lime:'#C2FF61'},
 saffron:{n:'Saffron dusk',sky:[[196,84,40],[242,168,92],[250,236,214]],  paper:'#FBF6EE',ink:'#5A2A12',grey:'#B89A85',soft:'#8C6A55',acc:'#D9480F',lime:'#FFE27A'},
 sage:   {n:'Sage',        sky:[[46,110,90],[140,200,170],[236,244,238]],  paper:'#F2F5F0',ink:'#1F4A3C',grey:'#8FA89C',soft:'#5E7A6E',acc:'#E0703A',lime:'#E9FF8A'},
 lilac:  {n:'Lilac',       sky:[[92,70,180],[184,160,236],[244,240,250]],  paper:'#F6F4FA',ink:'#3A2D6B',grey:'#A49CC2',soft:'#6F6596',acc:'#FF6B4A',lime:'#FFD6F0'},
 blush:  {n:'Blush',       sky:[[176,64,110],[240,160,190],[250,236,240]], paper:'#FBF4F5',ink:'#5C1F3A',grey:'#C29AAA',soft:'#8E6476',acc:'#2E6BE6',lime:'#FFF1A8'},
 lemon:  {n:'Lemon',       sky:[[214,150,10],[250,215,100],[252,248,228]], paper:'#FCFAF1',ink:'#3B3410',grey:'#B5A97A',soft:'#7C7348',acc:'#2F5BEA',lime:'#FFFFFF'},
 peach:  {n:'Peach sunset',sky:[[232,96,80],[250,180,140],[255,240,226]],  paper:'#FFF7F0',ink:'#4A2320',grey:'#C49A8E',soft:'#8C625A',acc:'#3A5BD9',lime:'#FFF1C2'},
 matcha: {n:'Matcha + clay',sky:[[110,130,50],[196,206,140],[244,242,226]],paper:'#F5F3E7',ink:'#3D3A1E',grey:'#A6A37F',soft:'#77744F',acc:'#C4502A',lime:'#FFF6B0'},
 ink:    {n:'Monochrome',  sky:[[30,30,34],[120,120,126],[238,238,236]],   paper:'#F2F1EE',ink:'#1B1B1F',grey:'#9A9A9F',soft:'#66666C',acc:'#FF4F1F',lime:'#FFFFFF'},
 procol: {n:'Indigo paper',sky:[[38,43,71],[96,110,170],[240,239,234]],    paper:'#F8F7F3',ink:'#262B47',grey:'#8C90A6',soft:'#5F6575',acc:'#2F6B5E',lime:'#BFF0DA'},
 teal:   {n:'Midnight teal',sky:[[4,24,32],[14,74,90],[34,120,128]],       paper:'#0C1A1F',ink:'#E6F4F2',grey:'#6E9A9A',soft:'#9DBFBD',acc:'#F2C14E',lime:'#F2C14E',dark:1},
 neon:   {n:'Neon night',  sky:[[10,6,30],[84,22,140],[226,64,160]],       paper:'#0B0716',ink:'#F3EAFF',grey:'#9B86C2',soft:'#C4B3E6',acc:'#C2FF61',lime:'#C2FF61',dark:1}
};
const q=new URLSearchParams(location.search).get('pal');let k=q;
if(!k){try{k=localStorage.getItem('pal')}catch(e){}}
if(!P[k])k='kelly';const p=P[k],r=document.documentElement.style;
r.setProperty('--paper',p.paper);r.setProperty('--ink',p.ink);r.setProperty('--grey',p.grey);r.setProperty('--soft',p.soft);r.setProperty('--acc',p.acc);r.setProperty('--lime',p.lime);
const st=document.createElement('style');st.textContent=`
body{background:var(--paper)}.cap{color:var(--ink)!important}.cap span,.cap i{color:var(--soft)!important}.ft,.ft a{color:var(--soft)}
.media{background:color-mix(in srgb,var(--t,#E6E8EC) ${p.dark?18:55}%,var(--paper))!important}
.bio{color:var(--soft)}.stmt{color:var(--grey)}.stmt em{color:var(--ink)}
${p.dark?'.top .knav a,.menu .knav a{color:var(--ink)!important}.top .knav a.on{color:var(--acc)!important}.top .mono,.foot{color:var(--soft)}':''}
.palx{position:fixed;right:16px;bottom:52px;z-index:200;display:flex;gap:6px;padding:7px 9px;border-radius:999px;background:rgba(255,255,255,.82);backdrop-filter:blur(10px);box-shadow:0 8px 24px -12px rgba(0,0,0,.35)}
.palx button{width:16px;height:16px;border-radius:50%;border:0;padding:0;cursor:pointer;outline-offset:2px}.palx button.on{outline:2px solid #222}`;
document.head.appendChild(st);
/* recolour every sky that uses the default blue (no explicit "top") */
const rgb=a=>`rgb(${a})`;
document.querySelectorAll('canvas[data-sky]').forEach(c=>{let o={};try{o=JSON.parse(c.dataset.sky||'{}')}catch(e){}if(!o.top||k!=='kelly'&&!c.closest('.dsky,.stamp,.sh,.skies')){o.top=p.sky[0];o.mid=p.sky[1];o.bottom=p.sky[2];c.dataset.sky=JSON.stringify(o)}});
if(window.self===window.top){const bar=document.createElement('div');bar.className='palx';bar.title='Try a colour palette';
 Object.entries(P).forEach(([key,v])=>{const b=document.createElement('button');b.style.background=`linear-gradient(135deg,${rgb(v.sky[0])} 0 50%,${v.paper} 50%)`;b.title=v.n;if(key===k)b.className='on';
  b.onclick=()=>{try{localStorage.setItem('pal',key)}catch(e){}const u=new URL(location);u.searchParams.set('pal',key);location=u};bar.appendChild(b)});
 document.body.appendChild(bar)}
window.PALETTES=P;
})();
