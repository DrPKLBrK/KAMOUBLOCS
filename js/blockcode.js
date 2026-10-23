// BLOCKCODE : graine de génération et code de bloc (séquence complète, relue par le résolveur).
// La graine fixe le hasard d'une génération, mais le résultat dépend aussi du mur, des prises actives, de tes notes et de ta mémoire de
// variété : pour retrouver un bloc à coup sûr, on utilise le CODE de bloc (la séquence elle-même), qui ne dépend de rien d'autre.
const BC_VER=28; // 27 (v29) : le bloc garde aussi les corrections du résolveur utilisées à la génération (cal)
function mulberry32(a){return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
const newSeed=()=>Math.floor(Math.random()*4294967296).toString(36);
const seedNum=s=>{const n=parseInt(String(s).trim().toLowerCase(),36);return isFinite(n)?n>>>0:0};
// Exécute fn avec un Math.random déterministe (restauré ensuite).
function withSeed(seed,fn){const old=Math.random;Math.random=mulberry32(seedNum(seed));try{return fn()}finally{Math.random=old}}
// Référence compacte d'une prise posée (main ou pied) : position sur le mur, numéro de prise, rotation.
const bcRef=x=>x?{id:x.o.id,x:Math.round(x.o.x*10)/10,y:x.o.y,pi:x.o.pi,dl:Math.round(x.o.dl*10)/10,tilt:x.o.tilt||0,n:x.h.n,rho:x.rho||0}:null;
// Séquence structurée d'une séquence candidate s (appelée par gen1).
function seqOf(s){
  const last=s.mv.length-1;
  return{
    h0:s.h0.map(bcRef),f0:(s.f0||[]).map(bcRef),
    mv:s.mv.map((m,k)=>({
      hand:bcRef({o:m.o,h:m.h,rho:m.rho}),fixed:bcRef(m.ot),pair:m.pair?bcRef(m.pair):null,
      hd:(m.hd||[]).map(bcRef),ft:(m.ft||[]).map(bcRef),
      dyn:!!(m.m&&m.m.dyn),cross:!!(m.m&&m.m.cross),tech:m.tech||[],side:m.side,flag:m.flag&&m.flag.stand?bcRef(m.flag.stand):null,finish:k===last
    }))
  };
}
// Description du mur enregistrée dans le code (indépendante des réglages du site).
const bcWall=()=>({id:WALL.id,name:WALL.name,pitch:WALL.pitch,joints:WALL.joints.slice(),panels:WALL.panels.map(p=>({id:p.id,name:p.name,w:p.w,h:p.h,tilt:p.tilt||0}))});
// Objet « bloc » complet exportable.
function blockObject(r){
  if(!r||!r.seq)return null;
  const holds={};[...r.seq.h0,...r.seq.f0,...r.seq.mv.flatMap(m=>[m.hand,m.pair,...m.hd,...m.ft])].filter(Boolean).forEach(x=>{if(!holds[x.n]){const h=byN(x.n);if(h){holds[x.n]={name:h.type,w:h.w,h:h.h,fam:h.fam,grip:h.grip,slo:!!h.slo};if(h.dep>0){holds[x.n].dep=h.dep;holds[x.n].ang=h.ang||0}}}});
  const notes=((r.v3&&r.v3.notes)||[]).map(n=>({k:n.k,j:n.j,lvl:n.lvl,txt:n.txt,sizes:n.sizes}));
  return{app:"generateur-blocs",format:1,ver:BC_VER,seed:r.seed||null,created:r.id||null,level:r.idx,kind:r.kind,style:r.mv,holdsType:r.hs,key:r.key?r.key.k:null,climber:r.climber||null,cal:r.cal||null,meas:r.meas||null,
    wall:bcWall(),holds,seq:r.seq,lines:r.lines,notes,dyns:(r.v3&&r.v3.dyns)||[]};
}
const b64u=s=>btoa(unescape(encodeURIComponent(s))).replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/,"");
const unb64u=s=>decodeURIComponent(escape(atob(s.replace(/-/g,"+").replace(/_/g,"/"))));
// Code texte : préfixe + JSON en base64url. Collable dans le résolveur.
function blockCode(r){const o=blockObject(r);return o?"GB1-"+b64u(JSON.stringify(o)):""}
function parseBlockCode(t){
  t=String(t||"").trim();if(t.indexOf("GB1-")===0)t=unb64u(t.slice(4));
  const o=JSON.parse(t);if(!o||o.app!=="generateur-blocs"||!o.seq)throw new Error("Code de bloc invalide");return o;
}
// Barre « graine et code » sous le bloc : copier le code, exporter un fichier, résoudre le bloc, rejouer une graine.
function downloadText(name,txt,type){const a=document.createElement("a");a.href=URL.createObjectURL(new Blob([txt],{type:type||"application/json"}));a.download=name;document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove()},500)}
function renderCodeBar(r){
  const d=$("codebar");if(!d)return;
  if(!r||!r.seq){d.innerHTML="";return}
  d.innerHTML=`<span class="mut">Graine <b id="seedtxt">${esc(r.seed||"–")}</b></span><button id="cbcopy">Copier le code du bloc</button><button id="cbfile">Exporter (.json)</button><button id="cbsolve" class="pri" title="Analyse le mouvement où tu coinces et propose des méthodes">Résoudre ce bloc</button><label class="f" style="flex-direction:row;align-items:center;gap:6px"><span>Rejouer une graine</span><input type="text" id="seedin" size="8" placeholder="ex. 1x9k2" aria-label="Graine à rejouer"></label><button id="cbseed">Rejouer</button><span class="mut" id="cbmsg" role="status"></span>`;
  const msg=t=>{$("cbmsg").textContent=t;setTimeout(()=>{if($("cbmsg"))$("cbmsg").textContent=""},2500)};
  $("cbcopy").onclick=async()=>{const c=blockCode(r);try{await navigator.clipboard.writeText(c);msg("Code copié ("+c.length+" caractères)")}catch(e){const t=document.createElement("textarea");t.value=c;document.body.appendChild(t);t.select();try{document.execCommand("copy");msg("Code copié")}catch(_){msg("Copie impossible : utilise Exporter")}t.remove()}};
  $("cbfile").onclick=()=>downloadText("bloc-"+(r.seed||r.id||"x")+".json",JSON.stringify(blockObject(r),null,1));
  $("cbsolve").onclick=()=>openSolver(blockCode(r));
  $("cbseed").onclick=()=>{const v=$("seedin").value.trim();if(v)generate(v)};
}
