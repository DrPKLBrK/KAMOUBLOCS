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
// Barre sous le bloc : exporter un fichier, résoudre le bloc, partager, imprimer (la graine n'est plus affichée depuis la v32).
function downloadText(name,txt,type){const a=document.createElement("a");a.href=URL.createObjectURL(new Blob([txt],{type:type||"application/json"}));a.download=name;document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove()},500)}
function renderCodeBar(r){
  const d=$("codebar");if(!d)return;
  const sh=$("cbshare");if(sh)sh.disabled=!r||!r.seq; // « Partager » est en haut à droite (barre du mur), hors de cette barre
  if(!r||!r.seq){d.innerHTML="";return}
  d.innerHTML=`<button id="cbfile" class="expertonly" title="Fichier complet du bloc (archive, débogage)">Exporter (.json)</button><button id="cbsolve" class="pri" title="Analyse le mouvement où tu coinces et propose des méthodes">Résoudre ce bloc</button><span class="mut" id="cbmsg" role="status"></span>`;
  const msg=t=>{$("cbmsg").textContent=t;setTimeout(()=>{if($("cbmsg"))$("cbmsg").textContent=""},2500)};
  $("cbfile").onclick=()=>downloadText("bloc-"+(r.seed||r.id||"x")+".json",JSON.stringify(blockObject(r),null,1));
  $("cbsolve").onclick=()=>openSolver(blockCode(r));
  if(typeof alignSolve==="function")requestAnimationFrame(alignSolve);
  $("cbshare").onclick=async()=>{
    let url;try{url=await shareLink(r)}catch(e){msg("Lien impossible à créer : utilise « Copier le code du bloc »");return}
    if(navigator.share){try{await navigator.share({title:"Bloc KAMOUBLOCS",text:"Un bloc à essayer ("+lab(r.idx)+", "+r.moves+" mouvements) :",url});return}catch(e){if(e&&e.name==="AbortError")return}}
    try{await navigator.clipboard.writeText(url);msg("Lien copié : colle-le dans un message ("+url.length+" caractères)")}
    catch(e){const t=document.createElement("textarea");t.value=url;document.body.appendChild(t);t.select();try{document.execCommand("copy");msg("Lien copié")}catch(_){msg("Copie impossible")}t.remove()}
  };
}

// ---------- Lien de partage (v30) ----------
// Le lien porte le bloc complet (tel qu'affiché) + le mur + le code du résolveur, compressés, après « #b= ».
// Rien ne passe par un serveur : tout est dans le lien. Ouvert par quelqu'un qui a le même mur et les mêmes prises,
// le bloc s'affiche directement dans le générateur ; sinon on propose de l'ouvrir dans le résolveur (qui sait relire un autre mur).
const SH_PRE="#b=",SH_RAW="#u=";
const bytesB64u=u=>{let s="";for(let i=0;i<u.length;i+=8192)s+=String.fromCharCode.apply(null,u.subarray(i,i+8192));return btoa(s).replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/,"")};
const b64uBytes=t=>{const s=atob(t.replace(/-/g,"+").replace(/_/g,"/"));const u=new Uint8Array(s.length);for(let i=0;i<s.length;i++)u[i]=s.charCodeAt(i);return u};
async function zip(txt){const cs=new CompressionStream("deflate-raw"),w=cs.writable.getWriter();w.write(new TextEncoder().encode(txt));w.close();return new Uint8Array(await new Response(cs.readable).arrayBuffer())}
async function unzip(u){const ds=new DecompressionStream("deflate-raw"),w=ds.writable.getWriter();w.write(u);w.close();return new TextDecoder().decode(await new Response(ds.readable).arrayBuffer())}
async function shareLink(r){
  const o={app:"kamoublocs",v:1,r,wall:bcWall(),c:blockObject(r)},txt=JSON.stringify(o),base=location.origin+location.pathname;
  if(typeof CompressionStream==="function")return base+SH_PRE+bytesB64u(await zip(txt));
  return base+SH_RAW+b64u(txt);
}
async function readShareHash(h){
  if(h.indexOf(SH_PRE)===0)return JSON.parse(await unzip(b64uBytes(h.slice(SH_PRE.length))));
  if(h.indexOf(SH_RAW)===0)return JSON.parse(unb64u(h.slice(SH_RAW.length)));
  return null;
}
const hasShareHash=()=>location.hash.indexOf(SH_PRE)===0||location.hash.indexOf(SH_RAW)===0;
// Ouvre le bloc reçu par lien. Renvoie false si le lien est illisible (le générateur tire alors un bloc normal).
async function openShared(){
  let o=null;try{o=await readShareHash(location.hash)}catch(e){o=null}
  try{history.replaceState(null,"",location.pathname+location.search)}catch(e){}
  if(!o||o.app!=="kamoublocs"||!o.r||!o.r.hands)return false;
  const same=JSON.stringify(o.wall&&o.wall.panels)===JSON.stringify(bcWall().panels)&&(o.wall.pitch||20)===(WALL.pitch||20);
  const holdsOk=(o.r.place||[]).every(p=>{const h=byN(p.n);return h&&!(h.custom&&!(o.c&&o.c.holds&&o.c.holds[p.n]&&o.c.holds[p.n].name===h.type))});
  const note=document.createElement("div");note.id="sharemsg";note.className="vd info";note.setAttribute("role","status");
  const sec=document.querySelector('[data-sec="result"]');
  if(same&&holdsOk){
    o.r.id=o.r.id||Date.now().toString(36);autoView(o.r);show(o.r);
    note.textContent="Bloc reçu par lien : le voici. « Générer un bloc » en tire un nouveau.";
    if(sec)sec.insertBefore(note,sec.firstChild);
    if(typeof genCount!=="undefined")genCount++;
    setTimeout(()=>{if(sec)sec.scrollIntoView({block:"start"})},50);
    return true;
  }
  // autre mur ou autres prises : on recrée le bloc sur ce mur (adapt.js), l'original reste consultable dans le résolveur
  const canAdapt=typeof adaptBlock==="function";
  note.innerHTML=`<b>Ce bloc vient d'un autre mur${(o.wall&&o.wall.name)?" (« "+esc(o.wall.name)+" »)":""}.</b> ${canAdapt?"Ses prises ne sont pas les tiennes : il est recréé ci-dessous sur ton mur, avec le même style, le même niveau et la même longueur, et vérifié pour ton mur.":"Le générateur ne peut pas le poser ici."} <button id="shsolve">Voir l'original dans le résolveur</button>`;
  if(sec)sec.insertBefore(note,sec.firstChild);
  const b=$("shsolve");if(b)b.onclick=()=>openSolver("GB1-"+b64u(JSON.stringify(o.c)));
  if(canAdapt){adaptBlock(o.r);if(typeof genCount!=="undefined")genCount++;setTimeout(()=>{if(sec)sec.scrollIntoView({block:"start"})},50);return true}
  return false;
}
