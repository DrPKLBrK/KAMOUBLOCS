// FOCUS (v29, amélioration 3.1) : blocs ciblés sur tes constantes.
// Le résolveur garde le suivi de tes blocages (solve_hist) avec leurs causes ; ton profil du résolveur garde les points faibles
// que tu as déclarés. Le générateur lit les deux (même stockage) et propose « Travailler mon point faible » : un bloc dont le style
// et le type de prises entraînent précisément ce point, un peu sous ton niveau habituel (on travaille un geste, pas une limite).
// Générateur seulement. Le mécanisme genWith (réglages imposés le temps d'une génération) sert aussi aux séances (session.js).

// ---------- Réglages imposés pour UNE génération, sans toucher à tes réglages enregistrés ----------
let REQ_OVER=null;
makeReq=(function(base){return function(){const c=base(),o=REQ_OVER;REQ_OVER=null;if(!o)return c;
  const r=Object.assign({},c);
  if(o.mv){r.mv=o.mv;r.surp=o.mv==="surprise";if(o.mv==="dyno"||o.mv==="coord")r.lancers=true}
  if(o.hs)r.hs=o.hs;if(o.len!==undefined)r.len=o.len;
  if(o.zone)r.zone=o.zone;if(o.kind)r.kind=o.kind;if(o.lancers!==undefined){r.lancers=o.lancers;r.pool=(r.pool||[]).filter(k=>o.lancers||(k!=="dyno"&&k!=="coord"))}
  if(o.tgt!=null)r.tgt=o.tgt;
  if(o.lv!=null){const L=LVL[clamp(o.lv,0,LVL.length-1)];r.tgt=L[1]+Math.random()*(L[2]-L[1])}
  if(o.dl)r.tgt=Math.max(.4,r.tgt+o.dl);
  if(o.tgt!=null||o.lv!=null||o.dl){r.lo=Math.max(0,r.tgt-1);r.hi=Math.min(10,r.tgt+1)} // bloc de séance ou ciblé : fourchette = cible ± 1 point
  r.t=clamp((r.tgt-1)/8,0,1);r.tag=o.tag||null;return r}})(makeReq);
// Bloc ciblé ou de séance : son niveau doit tomber près de la cible (le tirage seul s'en écarte souvent de plus d'un point).
// On garde le plus proche de quelques essais, en s'arrêtant dès qu'un bloc est à moins de REQ_TOL.
const REQ_TOL=.8,REQ_TRIES=6,REQ_BUDGET=5000;
gen=(function(base){return function(c){
  if(!c||!c.tag)return base(c);
  const t0=Date.now();let best=null;
  for(let k=0;k<REQ_TRIES;k++){const r=base(c);if(r&&(!best||Math.abs(r.idx-c.tgt)<Math.abs(best.idx-c.tgt)))best=r;
    if(best&&Math.abs(best.idx-c.tgt)<=REQ_TOL||Date.now()-t0>REQ_BUDGET)break}
  if(best)best.tag=Object.assign({tgt:Math.round(c.tgt*10)/10},c.tag);return best}})(gen);
// v49 : « niveau à vérifier » seulement quand le bloc sort VRAIMENT de la fourchette demandée (et toujours dans ce cas).
// Si aucun bloc n'est trouvé, ou s'il sort de la fourchette, on relance tout seul (budget 6 s) avant de l'afficher.
const RANGE_BUDGET=6000,RANGE_TRIES=3;
const outBy=(r,c)=>!r||!c||c.lo==null?0:r.idx<c.lo?r.idx-c.lo:r.idx>c.hi?r.idx-c.hi:0;
gen=(function(base){return function(c){
  const t0=Date.now();let r=base(c);
  for(let k=0;k<RANGE_TRIES&&(!r||outBy(r,c))&&Date.now()-t0<RANGE_BUDGET;k++){const q=base(c);
    if(q&&(!r||Math.abs(outBy(q,c))<Math.abs(outBy(r,c))))r=q}
  if(r&&c&&c.lo!=null){const d=outBy(r,c);
    r.note=d?(d>0?"Plus dur que la fourchette demandée : peu de solutions avec ce style et ces prises.":"Plus facile que la fourchette demandée : c'est le plus dur que permettent ce style et ces prises."):"";
    r.noteShort=d?(d>0?"plus dur que demandé":"plus facile que demandé"):""}
  return r}})(gen);
function genWith(over){if(busy)return false;REQ_OVER=over;generate();return true}

// ---------- Ce que chaque point faible appelle comme bloc ----------
// cause du résolveur (diagnose) ou point faible déclaré -> style de mouvement, type de prises, longueur, écart de niveau
const FOCUS_MAP={
  grip:{mv:"static",hs:null,lab:"Prises d'arrivée"},                    // type de prises choisi d'après les prises en cause
  load:{mv:"press",lab:"Main fixe qui sature (pousser sur les pieds)"},
  barn:{mv:"flag",lab:"Rotation en porte (drapeaux)"},
  lock:{mv:"lock",lab:"Blocages"},
  feet:{mv:"static",len:"long",lab:"Précision des pieds"},
  dyn:{mv:"dyno",lab:"Lancers"},
  catch:{mv:"dyno",dl:-.4,lab:"Réceptions"},
  fatigue:{mv:"endur",lab:"Continuité, endurance"},
  cross:{mv:"cross",lab:"Croisés"},
  reach:{mv:"under",lab:"Portée (pieds hauts, oppositions)"},
  tension:{mv:"under",lab:"Corps en extension (amplitude)"},
  method:{mv:"surprise",lab:"Lecture des blocs"},
  // points faibles déclarés dans le profil du résolveur
  w_doigts:{mv:"static",hs:"crimp",lab:"Petites prises, réglettes"},
  w_slopers:{mv:"static",hs:"sloper",lab:"Slopers et plats"},
  w_lancers:{mv:"dyno",lab:"Lancers"},
  w_souplesse:{mv:"hook",lab:"Souplesse, pieds hauts"},
  w_gainage:{mv:"under",lab:"Gainage, pieds qui partent"},
  w_force:{mv:"lock",lab:"Blocages, tractions"},
  w_endurance:{mv:"endur",lab:"Continuité, endurance"}
};
// Type de prises le plus présent parmi les prises d'arrivée où tu as coincé.
function focusHs(list){const c={};list.forEach(e=>{const h=e.hn!=null&&byN(e.hn);if(!h)return;for(const k of["crimp","sloper","pinch","arc"])if(fits(k,h))c[k]=(c[k]||0)+1});
  const b=Object.entries(c).sort((a,b)=>b[1]-a[1])[0];return b&&b[1]>=2?b[0]:null}
// Points faibles détectés : causes des blocages non résolus (au moins 2), puis points faibles déclarés.
function focusList(){
  const H=(typeof hist==="function"?hist():[]).filter(e=>!e.done&&!e.test),cnt={},by={};
  H.forEach(e=>(e.causes||[]).slice(0,1).forEach(c=>{cnt[c]=(cnt[c]||0)+1;(by[c]=by[c]||[]).push(e)}));
  const out=[];
  Object.entries(cnt).filter(([c,v])=>v>=2&&FOCUS_MAP[c]).sort((a,b)=>b[1]-a[1]).forEach(([c,v])=>{
    const f=Object.assign({id:c,n:v,src:"suivi"},FOCUS_MAP[c]);
    if(c==="grip"){const hs=focusHs(by[c]);f.hs=hs;if(hs)f.lab+=" ("+HSN[hs].toLowerCase()+")"}
    out.push(f)});
  const w=((ls("solve_prof",null)||{}).weak)||[]; // relu à chaque fois : le profil a pu changer dans le résolveur
  w.forEach(k=>{const f=FOCUS_MAP["w_"+k];if(f&&!out.some(o=>o.mv===f.mv&&(o.hs||null)===(f.hs||null)))out.push(Object.assign({id:"w_"+k,n:0,src:"déclaré"},f))});
  return out.filter(f=>MVN[f.mv]);
}
const FOCUS_DL=-.7; // un peu sous ton niveau : on travaille le geste
function focusGo(f){
  const o={mv:f.mv,hs:f.hs||null,dl:FOCUS_DL+(f.dl||0),tag:{kind:"focus",id:f.id,lab:f.lab}};if(f.len)o.len=f.len;
  const ok=genWith(o);
  if(ok){const m=$("focusmsg");if(m)m.textContent=`Bloc ciblé : ${f.lab}. ${focusAdvice(f)}`}
}
function focusAdvice(f){const k=f.id.replace(/^w_/,"");return typeof PATT!=="undefined"&&PATT[k]?"Conseil du résolveur : "+PATT[k]+".":""}
function renderFocus(){
  const d=$("focusbox");if(!d)return;const L=focusList();
  if(!L.length){d.innerHTML=`<details class="focus"><summary>Travailler mon point faible</summary><p class="mut">Rien à cibler pour l'instant. Les points faibles viennent du résolveur : blocages marqués dans ton suivi (une même cause au moins deux fois) ou points faibles cochés dans ton profil du résolveur.</p></details>`;return}
  d.innerHTML=`<details class="focus"><summary>Travailler mon point faible <span class="mut">(${L.length})</span></summary>
    <p class="mut">Un bloc qui entraîne ce point, un peu sous ton niveau habituel (réglages du bandeau). Tes réglages ne sont pas modifiés.</p>
    <div class="focusl">${L.map((f,i)=>`<button data-focus="${i}">${esc(f.lab)}<small>${f.src==="suivi"?f.n+" blocages":"déclaré"} · ${esc(MVN[f.mv]||f.mv)}${f.hs?" · "+esc(HSN[f.hs]):""}</small></button>`).join("")}</div>
    <p class="mut" id="focusmsg" aria-live="polite"></p></details>`;
  d.querySelectorAll("[data-focus]").forEach(b=>b.onclick=()=>focusGo(L[+b.dataset.focus]));
}
// chip sur le bloc affiché
show=(function(base){return function(r){base(r);if(r&&r.tag&&r.tag.kind==="focus"){const m=$("met");if(m)m.insertAdjacentHTML("afterbegin",`<span class="chip tagc"><i>Point faible</i>${esc(r.tag.lab)}</span>`)}}})(show);
renderNotes=(function(base){return function(){base();renderFocus()}})(renderNotes);
window.addEventListener("storage",e=>{if(e.key==="solve_hist"||e.key==="solve_prof")renderFocus()});
