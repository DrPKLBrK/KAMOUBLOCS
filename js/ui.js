// UI : menus, réglages, profils, prises éditables, favoris. Les réglages sont gardés dans le navigateur.
const CFG0={lmin:1,lmax:3,mv:'surprise',hs:'mix',zone:'all',len:'any',lancers:true,zoom:true,theme:'auto',expert:false,hideMv:[],hideHs:[],multi:false};
let CFG={...CFG0,...ls(KEY.cfg,{})};
if(!ZONEN[CFG.zone])CFG.zone='all'; // la zone enregistrée n'existe plus sur ce mur
const saveCfg=()=>ss(KEY.cfg,CFG);
// Mode expert : le benchmark et le tableau de calibration (outils pour régler le moteur) restent cachés sinon.
function applyExpert(){document.documentElement.classList.toggle("expert",!!CFG.expert)}
function applyTheme(){const r=document.documentElement;r.removeAttribute("data-theme");if(CFG.theme!=="auto")r.setAttribute("data-theme",CFG.theme);if(typeof edApply==="function")edApply()}
const climbName=()=>"Profil "+(PROF.H/100).toFixed(2).replace(".",",")+" m";
function saveClimber(){const bmi=PROF.mass/Math.pow(PROF.H/100,2);PROF.corp=clamp(Math.round((bmi-22.8)/2.5)+3,1,5);ss("climber1",PROF);applyClimber();const s=$("climbsel");if(s){s.options[1].textContent=climbName();s.value=PROF.on?"1":"0"}}
const CLIMB_PRESETS=[["Enfant",{H:135,ape:1,flex:1.15,force:.7,mass:32}],["Petite",{H:155,ape:1,flex:1,force:1,mass:50}],["Moyen",{H:170,ape:1,flex:1,force:1,mass:68}],["Grand, bras longs",{H:188,ape:1.06,flex:.95,force:1.05,mass:82}],["Très souple",{H:165,ape:1,flex:1.25,force:.9,mass:58}]];
function tabClimber(){
  const r=(id,t,min,max,step,v,fmt)=>`<div class="ed-r"><div><label for="${id}">${t}</label><b id="${id}v">${fmt(v)}</b></div><input type="range" id="${id}" min="${min}" max="${max}" step="${step}" value="${v}"></div>`;
  return `<p class="mut">Par défaut, chaque bloc est vérifié pour une petite (1,50 m) et une grande (1,90 m) personne, aux proportions moyennes. Ici tu peux fabriquer UN grimpeur : le générateur construit et vérifie alors les blocs pour lui seul (portée des bras, souplesse des hanches, force des doigts, détente), et le visualiseur le montre à sa taille. Ce sont des paramètres de modèle, pas des mesures médicales.</p>
  <label class="sw"><input type="checkbox" id="cl_on"${PROF.on?" checked":""}><span>Générer pour ce grimpeur</span></label>
  <div class="ed-grid">${r("cl_H","Taille",120,210,1,PROF.H,v=>(v/100).toFixed(2).replace(".",",")+" m")}${r("cl_ape","Longueur des bras (1,00 = moyenne)",.94,1.08,.01,PROF.ape,v=>(+v).toFixed(2).replace(".",","))}${r("cl_flex","Souplesse des hanches",.7,1.3,.05,PROF.flex,v=>(+v).toFixed(2).replace(".",","))}${r("cl_force","Force des doigts (1,00 = moyenne)",.6,1.5,.05,PROF.force,v=>(+v).toFixed(2).replace(".",","))}${r("cl_mass","Poids",30,120,1,PROF.mass,v=>v+" kg")}</div>
  <div class="row">${CLIMB_PRESETS.map((p,i)=>`<button data-cp="${i}">${p[0]}</button>`).join("")}<button id="cl_reset">Réinitialiser</button></div>
  <p class="mut">Longueur des bras : 1,05 = bras 5 % plus longs que la moyenne pour la taille. Le poids sert à l'affichage (kilos sur une main).</p>`;
}
const optHtml=(list,val)=>list.map(([k,t])=>`<option value="${k}"${String(k)===String(val)?" selected":""}>${t}</option>`).join("");
// Listes affichées dans les menus (tiennent compte des options masquées, de la zone et des lancers)
const mvList=()=>Object.entries(MVN).filter(([k])=>k==="surprise"||(!CFG.hideMv.includes(k)&&!(CFG.lancers===false&&(k==="dyno"||k==="coord"))&&!((isPanelZone(CFG.zone)||!WALL.joints.length)&&(k==="trav"||k==="compress"))));
const hsList=()=>Object.entries(HSN).filter(([k])=>k==="mix"||!CFG.hideHs.includes(k));
function refreshMenus(){
  if(!mvList().some(([k])=>k===CFG.mv))CFG.mv="surprise";
  if(!hsList().some(([k])=>k===CFG.hs))CFG.hs="mix";
  $("mv").innerHTML=optHtml(mvList(),CFG.mv);$("hs").innerHTML=optHtml(hsList(),CFG.hs);saveCfg();
}
const lvOpts=()=>LVL.map((l,i)=>[i,l[0]]);
function buildBar(){
  if(!ZONEN[CFG.zone])CFG.zone='all';
  const f=(id,t,list)=>`<label class="f" for="${id}"><span>${t}</span><select id="${id}">${optHtml(list,CFG[id==="lmin"?"lmin":id==="lmax"?"lmax":id])}</select></label>`;
  // v41 : l'essentiel visible (niveaux, style, Générer), le reste dans « Plus de réglages » (replié, avec un résumé)
  $("bar").innerHTML=f("lmin","Niveau mini",lvOpts())+f("lmax","Niveau maxi",lvOpts())+f("mv","Style de mouvement",mvList())+`<button class="pri" id="go">Générer un bloc</button>`+
    `<details class="moreset" id="moreset"${ls("moresetopen",false)===true?" open":""}><summary>Plus de réglages <small id="moresum"></small></summary><div class="bar">`+
    f("hs","Type de prises",hsList())+f("zone","Zone du mur",Object.entries(ZONEN))+f("len","Longueur",Object.entries(LENN))+`<label class="f" for="climbsel"><span>Grimpeur</span><select id="climbsel"><option value="0"${PROF.on?"":" selected"}>Toutes tailles</option><option value="1"${PROF.on?" selected":""}>${climbName()}</option></select></label>`+
    `<label class="sw"><input type="checkbox" id="lancers"${CFG.lancers?" checked":""}><span>Autoriser les lancers</span></label></div></details>`;
  $("moreset").addEventListener("toggle",e=>ss("moresetopen",e.target.open));
  const ms=()=>{const e=$("moresum");if(e)e.textContent=[HSN[CFG.hs]==="Libres"?"toutes prises":HSN[CFG.hs],ZONEN[CFG.zone],CFG.len==="any"?"longueur libre":LENN[CFG.len].toLowerCase(),PROF.on?climbName().toLowerCase():"toutes tailles",CFG.lancers?"lancers permis":"sans lancers"].filter(Boolean).join(" · ")};ms();
  $("bar").addEventListener("change",()=>setTimeout(ms,0));
  for(const k of["lmin","lmax","mv","hs","zone","len"])$(k).onchange=e=>{CFG[k]=k==="lmin"||k==="lmax"?+e.target.value:e.target.value;saveCfg();if(k==="zone")refreshMenus()};
  $("climbsel").onchange=e=>{PROF.on=e.target.value==="1";saveClimber()};
  $("lancers").onchange=e=>{CFG.lancers=e.target.checked;refreshMenus()};
  $("go").onclick=generate;
}
let busy=false,genCount=0;
// Après une génération demandée, amène le bloc à l'écran s'il est hors de vue (sur téléphone il est deux écrans plus bas).
// La toute première génération (au chargement) ne fait pas défiler la page.
function scrollToResult(){
  const s=document.querySelector('[data-sec="result"]');if(!s)return;
  const t=s.getBoundingClientRect().top;if(t>=0&&t<innerHeight*.35)return;
  const smooth=!(window.matchMedia&&matchMedia("(prefers-reduced-motion: reduce)").matches);
  s.scrollIntoView({behavior:smooth?"smooth":"auto",block:"start"});
}
// Construit une demande de bloc à partir des réglages du bandeau (utilisée par « Générer » et par le benchmark).
function makeReq(){
  let a=CFG.lmin,z=CFG.lmax;if(a>z)[a,z]=[z,a];
  const tgt=LVL[a][1]+Math.random()*(LVL[z][2]-LVL[a][1]);
  const pool=MVS.filter(k=>!CFG.hideMv.includes(k)&&(CFG.lancers!==false||(k!=="dyno"&&k!=="coord")));
  const hsPool=["crimp","sloper","pinch","arc"].filter(k=>!CFG.hideHs.includes(k));
  return{tgt,t:clamp((tgt-1)/8,0,1),mv:CFG.mv,hs:CFG.hs,surp:CFG.mv==="surprise",pool,hsPool,zone:CFG.zone,len:CFG.len==="any"?null:CFG.len,lancers:CFG.lancers,skipPosed:!!CFG.multi&&!isClimber()};
}
function generate(seedIn){
  if(busy)return;busy=true;const b=$("go");b.disabled=true;b.textContent="Calcul en cours…";
  const seed=typeof seedIn==="string"&&seedIn.trim()?seedIn.trim().toLowerCase():newSeed();
  setTimeout(()=>{let r=null;try{r=withSolveCal(()=>withSeed(seed,()=>{const c=makeReq();return gen(c)||gen(c)}))}catch(e){console.error(e)}if(r){r.id=Date.now().toString(36)+Math.random().toString(36).slice(2,6);r.seed=seed;if(r.climber===undefined)r.climber=climberObj()}autoView(r);show(r);b.disabled=false;b.textContent="Générer un bloc";busy=false;if(++genCount>1)scrollToResult()},30);
}

// Choisit la vue du mur : un seul pan si le bloc n'en utilise qu'un, sinon le mur entier.
function autoView(r){
  if(!r)return;const all=[...r.hands,...r.feet],ids=new Set(all.map(x=>panelAt(x.x).id));
  wallView=ids.size===1&&WALL.panels.length>1?[...ids][0]:'all';
  document.querySelectorAll("[data-view]").forEach(x=>x.setAttribute("aria-pressed",String(x.dataset.view===wallView)));
}
// ---------- Favoris ----------
const favs=()=>ls(KEY.favs,[]);
function renderFavs(){
  const a=favs(),d=$("favs"),fn=$("favn");if(fn)fn.textContent=a.length?`(${a.length})`:"aucun pour l'instant";
  if(!a.length){d.innerHTML='<p class="mut">Aucun bloc sauvegardé. Génère un bloc puis choisis « Sauvegarder ce bloc ».</p>';return}
  d.innerHTML=a.map((r,i)=>`<span class="fav"><button data-open="${i}">Bloc ${i+1} · ${lab(r.idx)} · ${KINDN[r.kind]}</button><button class="x" data-del="${i}" aria-label="Supprimer le bloc ${i+1}">×</button></span>`).join("");
  d.querySelectorAll("[data-open]").forEach(b=>b.onclick=()=>{autoView(a[+b.dataset.open]);show(a[+b.dataset.open])});
  d.querySelectorAll("[data-del]").forEach(b=>b.onclick=()=>{const x=favs();x.splice(+b.dataset.del,1);ss(KEY.favs,x);renderFavs()});
}

// ---------- Réglages (profils, menus, prises, affichage) ----------
let tab="profs";
const PROF_KEYS=["lmin","lmax","mv","hs","zone","len","lancers"];
function profs(){
  let p=ls(KEY.profs,null);
  if(!p){p=[{name:"Échauffement",cfg:{lmin:0,lmax:1,mv:"static",hs:"mix",zone:"all",len:"short",lancers:false}},{name:"Séance dynamique",cfg:{lmin:2,lmax:3,mv:"dyno",hs:"mix",zone:"all",len:"long",lancers:true}}];ss(KEY.profs,p)}
  return p;
}
function tabProfs(){
  const p=profs();
  return `<p class="mut">Un profil mémorise les réglages du bandeau (niveaux, style, prises, zone, longueur, lancers).</p>
  <div class="row"><label class="f" for="pname"><span>Nom du profil</span><input id="pname" type="text" maxlength="30" placeholder="Ex. Soirée traversées"></label><button id="psave">Enregistrer les réglages actuels</button></div>
  <ul class="plist">${p.length?p.map((x,i)=>`<li><b>${esc(x.name)}</b><span class="mut">${LVL[x.cfg.lmin][0]} → ${LVL[x.cfg.lmax][0]} · ${MVN[x.cfg.mv]||"Surprise"} · ${ZONEN[x.cfg.zone]||"Tout le mur"}</span><span class="acts"><button data-ap="${i}">Appliquer</button><button class="x" data-dp="${i}" aria-label="Supprimer ${esc(x.name)}">Supprimer</button></span></li>`).join(""):'<li class="mut">Aucun profil enregistré.</li>'}</ul>`;
}
function tabMenus(){
  const cb=(g,k,t,hid)=>`<label class="sw"><input type="checkbox" data-${g}="${k}"${hid.includes(k)?"":" checked"}><span>${t}</span></label>`;
  return `<p class="mut">Décoche une option pour la retirer des menus et du tirage « Surprise ». Les prises, elles, se gèrent dans l'onglet Prises.</p>
  <h4>Styles de mouvement</h4><div class="checks">${Object.entries(MVN).filter(([k])=>k!=="surprise").map(([k,t])=>cb("mv",k,t,CFG.hideMv)).join("")}</div>
  <h4>Types de prises</h4><div class="checks">${Object.entries(HSN).filter(([k])=>k!=="mix").map(([k,t])=>cb("hs",k,t,CFG.hideHs)).join("")}</div>
  <div class="row"><button id="mreset">Tout réafficher</button></div>`;
}
// Mesures fines des prises (measure.js, 3.3) : état et effet.
function measInfoHtml(){
  const f=measFit(),off=Object.entries(f.off).sort((a,b)=>Math.abs(b[1])-Math.abs(a[1]));
  let h=`<h4>Mesures des prises</h4><p class="mut">Facultatif, à faire une fois avec une règle : <b>Bord</b> = profondeur utile en mm (là où reposent les doigts), <b>Angle</b> = 0 si le bord est à plat, positif s'il est rentrant, négatif s'il est fuyant. Le second modèle s'en sert dès la première prise mesurée ; le générateur à partir de ${MEAS_MIN} prises (hors pinces).</p>`;
  if(!f.n)return h+`<p class="mut">Aucune prise mesurée.</p>`;
  if(!f.ok)return h+`<p>${f.n} prise${f.n>1?"s":""} mesurée${f.n>1?"s":""} : encore ${MEAS_MIN-f.n} pour que le générateur compare tes notes de tenue aux mesures.</p>`;
  h+=`<p>${f.n} prises mesurées. ${f.fitted?`Tes notes de tenue et les mesures concordent (corrélation ${(-f.r).toFixed(2).replace(".",",")}).`:`Tes notes de tenue et les mesures ne concordent pas assez (corrélation ${(-f.r).toFixed(2).replace(".",",")}, il faut au moins 0,30) : le générateur n'applique aucune correction. Vérifie d'abord les mesures ou les notes qui semblent à part. `} `;
  h+=!f.fitted?"</p>":off.length?`Prises corrigées dans le calcul de difficulté :</p><ul>${off.slice(0,12).map(([n,v])=>{const x=byN(+n);return`<li>n°${n} ${x?esc(x.type.toLowerCase())+" ("+esc(measTxt(x))+", tenue "+x.grip+")":""} : ${v>0?"plus dure":"plus facile"} que sa note (${v>0?"+":""}${v.toFixed(2).replace(".",",")})</li>`}).join("")}</ul>`:"Aucune prise ne s'écarte de sa note.</p>";
  return h;
}
function tabPrises(flt=""){
  const q=flt.trim().toLowerCase(),on=holds.filter(h=>h.on).length;
  return `<div class="row"><label class="f" for="hq"><span>Rechercher</span><input id="hq" type="search" placeholder="Nom ou numéro" value="${esc(flt)}"></label><button id="hall">Tout activer</button><button id="hnone">Tout désactiver</button><button id="hreset">Rétablir les noms et tenues</button><span class="mut">${on} / ${holds.length} prises actives</span></div>
  <div class="tw"><table class="inv"><thead><tr><th>Prise</th><th>N°</th><th>Nom</th><th>Tenue</th><th title="Profondeur utile du bord, en millimètres">Bord (mm)</th><th title="Angle de la surface : + rentrant, - fuyant, 0 à plat">Angle (°)</th><th>Active</th><th></th></tr></thead><tbody>${holds.filter(h=>!q||String(h.n)===q||h.type.toLowerCase().includes(q)).map(h=>`<tr data-n="${h.n}"><td><img src="${imgSrc(h.n)}" alt="" loading="lazy"></td><td>${h.n}</td><td><input class="nm" type="text" value="${esc(h.type)}" maxlength="40" aria-label="Nom de la prise ${h.n}"></td><td><select class="gp" aria-label="Tenue de la prise ${h.n}">${[1,2,3,4,5].map(v=>`<option${v===h.grip?" selected":""}>${v}</option>`).join("")}</select></td><td><input class="dep" type="number" inputmode="numeric" min="1" max="80" step="1" placeholder="–" value="${h.dep>0?h.dep:""}"${h.fam==="tri"?' title="Pince : non utilisée"':""} aria-label="Profondeur du bord de la prise ${h.n} en millimètres"></td><td><input class="ang" type="number" inputmode="numeric" min="-60" max="45" step="1" placeholder="0" value="${h.dep>0?(h.ang||0):""}" aria-label="Angle de la surface de la prise ${h.n} en degrés"></td><td><input class="ac" type="checkbox"${h.on?" checked":""} aria-label="Utiliser la prise ${h.n}"></td><td>${h.custom?`<button class="x" data-dc="${h.n}" aria-label="Supprimer la prise ajoutée ${h.n}">Supprimer</button>`:""}</td></tr>`).join("")}</tbody></table></div>
  <p class="mut">Tenue : 1 = très facile à tenir, 5 = très dur.</p><div id="measinfo">${measInfoHtml()}</div>${customFormHtml()}`;
}
function tabAff(){
  return `<div class="row"><label class="sw"><input type="checkbox" id="zoom"${CFG.zoom?" checked":""}><span>Agrandir les prises sur le mur (lisibilité)</span></label>
  <label class="f" for="theme"><span>Thème</span><select id="theme">${optHtml([["auto","Automatique"],["light","Clair"],["dark","Sombre"]],CFG.theme)}</select></label></div>
  <div class="row"><button id="edgo" class="pri">Personnaliser l'apparence</button><span class="mut">Couleurs, polices, formes, mur, mise en page.</span></div>
  <div class="row"><label class="sw"><input type="checkbox" id="expert"${CFG.expert?" checked":""}><span>Mode expert : afficher le benchmark du générateur, le tableau de bord de calibration et l'export des blocs en .json</span></label></div>
  <div class="row"><button id="wipe">Effacer l'historique de variété</button><span class="mut">Remet à zéro la mémoire qui évite de refaire les mêmes blocs.</span></div>${backupHtml()}`;
}
const saveHolds=()=>{const g={},n={},o={};holds.forEach(h=>{g[h.n]=h.grip;if(h.type!==h.type0)n[h.n]=h.type;o[h.n]=h.on});ss(KEY.grips,g);ss(KEY.names,n);ss(KEY.on,o)};
function renderTab(flt){
  const b=$("tabbody");
  b.innerHTML={profs:tabProfs,climber:tabClimber,menus:tabMenus,styles:tabStyles,prises:()=>tabPrises(flt),walls:tabWalls,aff:tabAff}[tab]();
  document.querySelectorAll("[data-tab]").forEach(x=>x.setAttribute("aria-selected",String(x.dataset.tab===tab)));
  if(tab==="profs"){
    $("psave").onclick=()=>{const name=($("pname").value.trim()||"Profil "+(profs().length+1)),p=profs().filter(x=>x.name!==name);const c={};PROF_KEYS.forEach(k=>c[k]=CFG[k]);p.push({name,cfg:c});ss(KEY.profs,p);renderTab()};
    b.querySelectorAll("[data-ap]").forEach(x=>x.onclick=()=>{Object.assign(CFG,profs()[+x.dataset.ap].cfg);saveCfg();buildBar();refreshMenus();$("mv").value=CFG.mv;$("hs").value=CFG.hs});
    b.querySelectorAll("[data-dp]").forEach(x=>x.onclick=()=>{const p=profs();p.splice(+x.dataset.dp,1);ss(KEY.profs,p);renderTab()});
  }else if(tab==="styles"){
    bindStyles();
  }else if(tab==="menus"){
    b.querySelectorAll("input[data-mv],input[data-hs]").forEach(x=>x.onchange=()=>{const g=x.dataset.mv?"mv":"hs",k=x.dataset.mv||x.dataset.hs,key=g==="mv"?"hideMv":"hideHs";CFG[key]=CFG[key].filter(v=>v!==k);if(!x.checked)CFG[key].push(k);refreshMenus()});
    $("mreset").onclick=()=>{CFG.hideMv=[];CFG.hideHs=[];refreshMenus();renderTab()};
  }else if(tab==="prises"){
    const q=$("hq");q.oninput=()=>{renderTab(q.value);const n=$("hq");n.focus();n.setSelectionRange(n.value.length,n.value.length)};
    b.querySelectorAll("tr[data-n]").forEach(tr=>{const h=byN(+tr.dataset.n);
      tr.querySelector(".nm").onchange=e=>{h.type=e.target.value.trim()||h.type0;e.target.value=h.type;saveHolds()};
      tr.querySelector(".gp").onchange=e=>{h.grip=+e.target.value;saveHolds()};
      tr.querySelector(".ac").onchange=e=>{h.on=e.target.checked;saveHolds();renderTab(q.value)};
      const dp=tr.querySelector(".dep"),an=tr.querySelector(".ang"),ms=()=>{measSet(h.n,dp.value,an.value);if(!(h.dep>0))an.value="";$("measinfo").innerHTML=measInfoHtml()};dp.onchange=ms;an.onchange=ms});
    $("hall").onclick=()=>{holds.forEach(h=>h.on=true);saveHolds();renderTab(q.value)};
    $("hnone").onclick=()=>{holds.forEach(h=>h.on=false);saveHolds();renderTab(q.value)};
    bindCustomForm(()=>renderTab(q.value));
    b.querySelectorAll("[data-dc]").forEach(x=>x.onclick=()=>{delCustom(+x.dataset.dc);saveHolds();renderTab(q.value)});
    $("hreset").onclick=()=>{holds.forEach(h=>{h.type=h.type0;h.grip=h.grip0});saveHolds();renderTab(q.value)};
  }else if(tab==="climber"){
    const upd=()=>{["H","ape","flex","force","mass"].forEach(k=>{const el=$("cl_"+k);PROF[k]=+el.value;const o=$("cl_"+k+"v");o.textContent=k==="H"?(PROF.H/100).toFixed(2).replace(".",",")+" m":k==="mass"?PROF.mass+" kg":PROF[k].toFixed(2).replace(".",",")});saveClimber()};
    ["H","ape","flex","force","mass"].forEach(k=>$("cl_"+k).oninput=upd);
    $("cl_on").onchange=e=>{PROF.on=e.target.checked;saveClimber()};
    b.querySelectorAll("[data-cp]").forEach(x=>x.onclick=()=>{Object.assign(PROF,CLIMB_PRESETS[+x.dataset.cp][1],{on:true});saveClimber();renderTab()});
    $("cl_reset").onclick=()=>{Object.assign(PROF,PROF0);saveClimber();renderTab()};
  }else if(tab==="walls"){
    bindWalls();
  }else{
    $("zoom").onchange=e=>{CFG.zoom=e.target.checked;saveCfg();drawWall(cur)};
    $("theme").onchange=e=>{CFG.theme=e.target.value;saveCfg();applyTheme()};
    $("edgo").onclick=()=>{const b=$("edopen");if(b)b.click()};
    $("expert").onchange=e=>{CFG.expert=e.target.checked;saveCfg();applyExpert()};
    bindBackup();
    $("wipe").onclick=()=>{ss(KEY.hist,[]);ss(KEY.heat,{});$("wipe").textContent="Historique effacé"};
  }
}
function buildSettings(){
  document.querySelectorAll("[data-tab]").forEach(b=>b.onclick=()=>{tab=b.dataset.tab;renderTab()});renderTab();
}
function buildWallTabs(){
  const v=$("views");
  v.innerHTML=[["all","Tout le mur"],...(WALL.panels.length>1?WALL.panels.map(p=>[p.id,"Pan "+p.name]):[])].map(([k,t])=>`<button data-view="${k}" aria-pressed="${k===wallView}">${esc(t)}</button>`).join("");
  v.hidden=WALL.panels.length<2;
  document.querySelectorAll("[data-view]").forEach(b=>b.onclick=()=>{wallView=b.dataset.view;document.querySelectorAll("[data-view]").forEach(x=>x.setAttribute("aria-pressed",String(x===b)));drawWall(cur)});
  document.querySelectorAll("[data-sort]").forEach(b=>b.onclick=()=>{mountSort=b.dataset.sort;renderMount()});
}

// ---------- Notes d'essai et apprentissage ----------
let pendingRate=null; // note choisie pour le bloc affiché, avant enregistrement
const fmtD=ts=>new Date(ts).toLocaleString("fr-FR",{day:"2-digit",month:"2-digit",hour:"2-digit",minute:"2-digit"});
const sgn=v=>(v>0?"+":"")+v.toFixed(1);
// Barre « Ton essai » (v41), juste sous le mur : enchaîné, ressenti, avis, enregistrer ; le reste dans « Plus de détails ».
let pendingSent=null;
function renderRate(){
  const d=$("rate");if(!d)return;
  if(!cur){d.innerHTML='<p class="mut">Génère un bloc pour pouvoir le noter.</p>';return}
  const done=notes().find(t=>t.id===cur.id);
  if(pendingRate==null&&done)pendingRate=done.rating;
  if(d.dataset.bid!==String(cur.id)){d.dataset.bid=String(cur.id);pendingSent=done&&done.sent!=null?done.sent:null}
  const vt=voteOf(cur),nm=cur.moves||0,more=ls("trymore",false)===true,lockd=!!(done&&(done.flash===true||(done.flash===false&&done.tries)));
  if(lockd)pendingSent=true;
  d.innerHTML=`<h3>Ton essai <span class="mut" style="font:400 .85rem var(--body)">· bloc estimé ${lab(cur.idx)}${done?` · déjà noté ${NOTE_N[done.rating]} (tu peux corriger)`:""}</span></h3>
  <div class="tryq">
    ${lockd?`<div class="grp"><span>Au pied du mur</span><b class="lockd" title="Enregistré au pied du mur : non modifiable">${done.flash?"⚡ Flash":"Enchaîné en "+done.tries+" essais"} 🔒</b></div>`:`<div class="grp"><span>Enchaîné ?</span><div class="seg" role="group" aria-label="Enchaîné ?"><button data-s="1" aria-pressed="${pendingSent===true}">Oui</button><button data-s="0" aria-pressed="${pendingSent===false}">Pas encore</button></div></div>`}
    <div class="grp"><span>Ressenti</span><div class="seg" role="group" aria-label="Ressenti après essai">${NOTE_N.map((n,i)=>`<button data-r="${i}" aria-pressed="${pendingRate===i}">${n}</button>`).join("")}</div></div>
    <div class="grp"><span>Ce bloc te plaît ?</span><div class="seg" role="group" aria-label="Avis sur le bloc"><button data-v="1" aria-pressed="${vt===1}">J'aime</button><button data-v="-1" aria-pressed="${vt===-1}">Pas pour moi</button></div></div>
    <button class="pri" id="nsave"${pendingRate==null?" disabled":""} title="${pendingRate==null?"Choisis d'abord ton ressenti":""}">${done?"Mettre à jour":"Enregistrer"}</button>
  </div>
  <details class="trymore" id="trymore"${more?" open":""}><summary>Plus de détails : passage le plus dur, cotation, commentaire</summary><div class="rate">
  <label class="f" for="ncrux"><span>Passage le plus dur selon toi</span><select id="ncrux"><option value="">Pas d'avis</option>${Array.from({length:nm},(_,i)=>`<option value="${i}"${done&&done.crux===i?" selected":""}>Mouvement ${i+1}${cur.key&&cur.key.k===i?" (annoncé)":""}</option>`).join("")}</select></label>
  <label class="f" for="nfont"><span>Cotation ressentie</span><select id="nfont"><option value="">Pas d'avis</option>${FONT.map(g=>`<option${done&&done.font===g?" selected":""}>${g}</option>`).join("")}</select></label>
  <label class="f" for="ncom" style="flex:1 1 220px"><span>Commentaire (facultatif)</span><input id="ncom" type="text" maxlength="120" placeholder="Ex. le 3e mouvement est bien plus dur" value="${esc(done?done.comment||"":"")}"></label>
  </div></details><span class="mut" id="vmsg" role="status"></span>`;
  $("trymore").addEventListener("toggle",e=>ss("trymore",e.target.open));
  d.querySelectorAll("[data-v]").forEach(b=>b.onclick=()=>{const v=+b.dataset.v;votePref(cur,voteOf(cur)===v?0:v);renderRate();renderTaste();const m=$("vmsg");if(m)m.textContent=voteOf(cur)?"Avis enregistré : le générateur en tient compte.":""});
  d.querySelectorAll("[data-s]").forEach(b=>b.onclick=()=>{const v=b.dataset.s==="1";pendingSent=pendingSent===v?null:v;d.querySelectorAll("[data-s]").forEach(x=>x.setAttribute("aria-pressed",String(pendingSent!==null&&(x.dataset.s==="1")===pendingSent)))});
  d.querySelectorAll("[data-r]").forEach(b=>b.onclick=()=>{pendingRate=+b.dataset.r;d.querySelectorAll("[data-r]").forEach(x=>x.setAttribute("aria-pressed",String(x===b)));$("nsave").disabled=false;$("nsave").title=""});
  $("nsave").onclick=()=>{
    if(pendingRate==null||!cur)return;
    if(!cur.id)cur.id=Date.now().toString(36);
    const t={id:cur.id,ts:Date.now(),rating:pendingRate,comment:$("ncom").value.trim(),idx:cur.idx,mv:cur.mv,kind:cur.kind,hands:[...new Set(cur.hands.map(x=>x.n))],block:cur,crux:$("ncrux").value===""?null:+$("ncrux").value,key:cur.key?cur.key.k:null,sent:pendingSent,font:$("nfont").value||null};
    if(done&&done.flash!=null){t.flash=done.flash;t.tries=done.tries||null;t.sent=true} // statut verrouillé (pied du mur)
    const a=notes().filter(x=>x.id!==t.id);a.push(t);ss(KEY.notes,a.slice(-300));
    replay();renderNotes();renderRate();$("nsave").textContent="✓ Note enregistrée";
  };
}
// Correspondance niveau / cotation (grade.js, 2.2)
function gradeSummary(){const F=gradeFit(),T=gradeTable();
  return`<p class="mut" style="margin:6px 0 0">Cotation Fontainebleau ${F.personal?`<b>d'après tes ${F.n} cotations</b>${F.res!=null?` (écart typique ${F.res.toFixed(1).replace(".",",")} demi-cotation${F.res>=1.5?"s":""})`:""}`:`<b>provisoire</b> (${F.n} / ${GR_MIN} cotations ressenties ; indique la cotation quand tu notes un bloc)`} : ${T.map(t=>`${t.lab.toLowerCase()} ${t.lo===t.hi?t.lo:t.lo+" à "+t.hi}`).join(" · ")}.</p>`}
function renderNotes(){
  const a=notes(),s=$("nsum"),l=$("nlist");
  if(!a.length){s.innerHTML='<p class="mut">Aucune note pour l\'instant. Les estimations de niveau sont celles de départ.</p>';l.innerHTML="";return}
  const avg=a.reduce((t,x)=>t+noteErr(x),0)/a.length;
  const mvs=Object.entries(LEARN.mv).filter(([,v])=>Math.abs(v)>=.2).sort((p,q)=>Math.abs(q[1])-Math.abs(p[1]));
  const hs=Object.entries(LEARN.a).filter(([,v])=>Math.abs(v)>=.3).sort((p,q)=>Math.abs(q[1])-Math.abs(p[1])).slice(0,8);
  const dur=v=>v>0?"plus dur":"plus facile";
  s.innerHTML=`<p><b>${a.length}</b> note${a.length>1?"s":""}. En moyenne, tes essais sont ressentis <b>${sgn(avg)}</b> par rapport à l'estimation (échelle 0 à 10).
  Ajustement général appliqué : <b>${sgn(LEARN.g)}</b>.</p>
  ${mvs.length?`<p class="mut" style="margin:0">Styles corrigés : ${mvs.map(([k,v])=>`${MVN[k]||k} ${sgn(v)} (${dur(v)})`).join(" · ")}</p>`:""}
  ${hs.length?`<p class="mut" style="margin:4px 0 0">Prises corrigées : ${hs.map(([n,v])=>`n°${n} ${sgn(v)} (${dur(v)} que prévu)`).join(" · ")}</p>`:""}
  ${gradeSummary()}
  <div class="row"><button id="ncopy">Copier mes notes</button><button id="nreset">Réinitialiser l'apprentissage</button><span class="mut" id="nmsg"></span></div>
  <details><summary class="mut">Restaurer des notes copiées</summary><div class="row"><label class="f" for="nimp" style="flex:1 1 300px;max-width:none"><span>Colle ici le texte copié</span><input id="nimp" type="text"></label><button id="nimpgo">Restaurer</button></div></details>`;
  l.innerHTML='<ul class="nl">'+a.slice().reverse().map(t=>`<li><span><b>${fmtD(t.ts)}</b> · ${esc(KINDN[t.kind]||"")} · ${esc(MVN[t.mv]||"")}</span><span>estimé ${lab(t.idx)} → ressenti <b>${NOTE_N[t.rating]}</b>${t.font?" · "+esc(t.font):""}${t.sent===true?" · enchaîné":t.sent===false?" · pas encore":""}</span>${t.comment?`<span class="mut">« ${esc(t.comment)} »</span>`:""}<span class="acts"><button data-no="${t.id}">Ouvrir</button><button class="x" data-nd="${t.id}">Supprimer</button></span></li>`).join("")+"</ul>";
  l.querySelectorAll("[data-no]").forEach(b=>b.onclick=()=>{const t=notes().find(x=>x.id===b.dataset.no);if(t&&t.block&&t.block.seq&&t.block.lines){pendingRate=null;autoView(t.block);show(t.block);window.scrollTo({top:0,behavior:"smooth"})}else if(t&&t.code)openSolver(t.code)});
  l.querySelectorAll("[data-nd]").forEach(b=>b.onclick=()=>{ss(KEY.notes,notes().filter(x=>x.id!==b.dataset.nd));replay();renderNotes();renderRate()});
  let armed=false;$("nreset").onclick=e=>{if(!armed){armed=true;e.target.textContent="Confirmer : effacer toutes les notes";return}ss(KEY.notes,[]);replay();renderNotes();renderRate()};
  $("ncopy").onclick=()=>{const txt=JSON.stringify(notes()),m=$("nmsg");
    (navigator.clipboard?navigator.clipboard.writeText(txt):Promise.reject()).then(()=>m.textContent="Notes copiées.",()=>{$("nimp").value=txt;$("nimp").select();m.textContent="Copie impossible ici : le texte est dans le champ ci-dessous, sélectionne-le et copie-le."})};
  $("nimpgo").onclick=()=>{try{const v=JSON.parse($("nimp").value);if(!Array.isArray(v))throw 0;ss(KEY.notes,v.filter(t=>t&&t.id&&t.rating>=0&&t.rating<=4));replay();renderNotes();renderRate()}catch(e){$("nmsg").textContent="Ce texte n'est pas une liste de notes valide."}};
}

// ---------- Mes goûts (apprentissage des préférences) ----------
function renderTaste(){
  const d=$("taste");if(!d)return;
  const on=CFG.prefOn!==false,n=PM.n;
  const top=Object.entries(PM.w).filter(([,v])=>Math.abs(v)>=.15).sort((a,b)=>b[1]-a[1]);
  const like=top.filter(([,v])=>v>0).slice(0,6),avoid=top.filter(([,v])=>v<0).slice(-6).reverse();
  const cx=LEARN.cx;
  d.innerHTML=`<h4 style="margin:14px 0 6px">Mes goûts</h4>
  <div class="row"><label class="sw"><input type="checkbox" id="prefon"${on?" checked":""}><span>Tenir compte de mes avis (J'aime / Pas pour moi)</span></label>
  <label class="f" for="prefk"><span>Force</span><select id="prefk">${optHtml([[1,"Légère"],[2,"Moyenne"],[3,"Forte"]],CFG.prefK||2)}</select></label>
  <button id="prefreset">Oublier mes avis</button></div>
  <details class="ssh" id="tastedet"${ls("tasteopen",false)===true?" open":""}><summary>Mes avis (${n})</summary>
  <p class="mut" style="margin:4px 0">${n<PREF_MIN?`${n} avis enregistré${n>1?"s":""} : il en faut au moins ${PREF_MIN} pour que le générateur s'en serve.`:`${n} avis enregistrés.`}</p>
  ${like.length?`<p style="margin:2px 0"><b>Tu aimes :</b> ${like.map(([k])=>esc(featLabel(k))).join(", ")}.</p>`:""}
  ${avoid.length?`<p style="margin:2px 0"><b>Tu évites :</b> ${avoid.map(([k])=>esc(featLabel(k))).join(", ")}.</p>`:""}
  ${cx.n?`<p class="mut" style="margin:2px 0">Passage clé : le moteur a vu juste ${cx.hit} fois sur ${cx.n} (${Math.round(cx.hit/cx.n*100)} %).</p>`:""}</details>`;
  $("tastedet").addEventListener("toggle",e=>ss("tasteopen",e.target.open));
  $("prefon").onchange=e=>{CFG.prefOn=e.target.checked;saveCfg()};
  $("prefk").onchange=e=>{CFG.prefK=+e.target.value;saveCfg()};
  let armed=false;$("prefreset").onclick=e=>{if(!armed){armed=true;e.target.textContent="Confirmer : oublier tous mes avis";return}ss(KEY.prefs,[]);prefReplay();renderTaste();renderRate()};
}

// ---------- Mes styles ----------
let UED={...U0};   // style en cours d'édition
let UEX=[];        // exemples cochés pour déduire un style
function uExamples(){ // blocs sauvegardés + blocs aimés
  const a=favs().map((r,i)=>({k:"f"+i,t:"Bloc sauvegardé "+(i+1)+" · "+lab(r.idx)+" · "+(MVN[r.mv]||r.mv),fx:fxOfBlock(r)}));
  const b=prefs().filter(x=>x.v>0&&x.fx&&!favs().some(r=>r.id===x.id)).map((x,i)=>({k:"p"+i,t:"Bloc aimé "+fmtD(x.ts)+" · "+(MVN[x.mv]||x.mv),fx:x.fx}));
  return[...a,...b];
}
function tabStyles(){
  const L=ustyles(),sel=(id,list,v)=>`<select id="${id}">${list.map((t,i)=>`<option value="${i}"${i===v?" selected":""}>${t}</option>`).join("")}</select>`;
  const sl=(id,t,lo,hi,v)=>`<label class="rg" for="${id}"><span>${t}</span><span><input type="range" id="${id}" min="-1" max="1" step=".1" value="${v}"><br><small>${lo} ← → ${hi}</small></span></label>`;
  const ex=uExamples();
  return `<div class="ust"><p class="mut">Crée ton propre style : il apparaît ensuite dans le menu « Style de mouvement » (et dans « Au hasard »), avec la même physique et le même contrôle de faisabilité que les autres. « Obligatoire » = chaque bloc doit le contenir ; « Favorisé » = la recherche le privilégie sans l'imposer.</p>
  <ul class="plist">${L.length?L.map(u=>`<li><b>${esc(u.name)}</b><span class="mut">lancers ${ULEV4[u.dyn].toLowerCase()} · croisés ${ULEV4[u.cross].toLowerCase()}${Object.keys(UTECH).filter(k=>u[k]>0).map(k=>" · "+UTECHN[k].toLowerCase()+" "+ULEV3[u[k]].toLowerCase()).join("")}</span><span class="acts"><button data-uuse="${u.id}">Utiliser</button><button data-ued="${u.id}">Modifier</button><button class="x" data-udel="${u.id}">Supprimer</button></span></li>`).join(""):'<li class="mut">Aucun style personnel pour l\'instant.</li>'}</ul>
  <h4>${UED.id?"Modifier le style":"Nouveau style"}</h4>
  <label class="f" for="un"><span>Nom</span><input id="un" type="text" maxlength="30" value="${esc(UED.name)}" placeholder="Ex. Dalle technique"></label>
  <label class="rg" for="udyn"><span>Lancers</span>${sel("udyn",ULEV4,UED.dyn)}</label>
  <label class="rg" for="ucross"><span>Croisés</span>${sel("ucross",ULEV4,UED.cross)}</label>
  ${Object.keys(UTECH).map(k=>`<label class="rg" for="u_${k}"><span>${UTECHN[k]}</span>${sel("u_"+k,ULEV3,UED[k])}</label>`).join("")}
  ${sl("uspread","Écart entre les mains","serrées","écartées",UED.spread)}
  ${sl("usmall","Taille des prises","grosses","petites",UED.small)}
  ${sl("urhythm","Rythme","endurance (long, enchaîné)","puissance (court, dur)",UED.rhythm)}
  <label class="rg" for="ulen"><span>Longueur</span><select id="ulen">${optHtml(Object.entries(LENN),UED.len)}</select></label>
  <div class="row"><button class="pri" id="usave">${UED.id?"Enregistrer les modifications":"Créer le style"}</button>${UED.id?'<button id="unew">Nouveau style vierge</button>':""}<span class="mut" id="umsg"></span></div>
  <h4>Créer un style à partir de blocs que tu aimes</h4>
  <p class="mut">Coche des blocs : le générateur déduit les réglages ci-dessus (lancers, croisés, gestes, écart, taille des prises, rythme). Tu peux ensuite les ajuster avant d'enregistrer. Les blocs viennent de « Blocs sauvegardés » et des blocs marqués « J'aime ».</p>
  <div class="ex">${ex.length?ex.map(e=>`<label class="sw"><input type="checkbox" data-uex="${e.k}"${UEX.includes(e.k)?" checked":""}><span>${esc(e.t)}</span></label>`).join(""):'<span class="mut">Aucun bloc pour l\'instant : sauvegarde des blocs ou marque-les « J\'aime ».</span>'}</div>
  <div class="row"><button id="uder"${ex.length?"":" disabled"}>Déduire un style des blocs cochés</button></div></div>`;
}
function readStyleForm(){
  const g=id=>$(id).value;
  UED={...UED,name:g("un"),dyn:+g("udyn"),cross:+g("ucross"),spread:+g("uspread"),small:+g("usmall"),rhythm:+g("urhythm"),len:g("ulen")};
  for(const k in UTECH)UED[k]=+g("u_"+k);
}
function bindStyles(){
  const b=$("tabbody"),again=()=>renderTab();
  b.querySelectorAll("select,input[type=range],input#un").forEach(x=>x.onchange=readStyleForm);
  $("usave").onclick=()=>{readStyleForm();const id=uSave(UED);UED={...ustyles().find(x=>x.id===id)};refreshMenus();buildBar();again();$("umsg")&&($("umsg").textContent="")};
  const nb=$("unew");if(nb)nb.onclick=()=>{UED={...U0};again()};
  b.querySelectorAll("[data-uuse]").forEach(x=>x.onclick=()=>{CFG.mv=x.dataset.uuse;saveCfg();buildBar();refreshMenus();$("mv").value=CFG.mv});
  b.querySelectorAll("[data-ued]").forEach(x=>x.onclick=()=>{UED={...ustyles().find(u=>u.id===x.dataset.ued)};again()});
  b.querySelectorAll("[data-udel]").forEach(x=>x.onclick=()=>{uDelete(x.dataset.udel);if(UED.id===x.dataset.udel)UED={...U0};CFG.hideMv=CFG.hideMv.filter(k=>k!==x.dataset.udel);refreshMenus();buildBar();again()});
  b.querySelectorAll("[data-uex]").forEach(x=>x.onchange=()=>{UEX=UEX.filter(k=>k!==x.dataset.uex);if(x.checked)UEX.push(x.dataset.uex)});
  const dv=$("uder");if(dv)dv.onclick=()=>{
    const pick_=uExamples().filter(e=>UEX.includes(e.k));
    if(!pick_.length){$("umsg").textContent="Coche d'abord au moins un bloc.";return}
    const d=deriveStyle(pick_.map(e=>e.fx));UED={...U0,...d,name:UED.name||("Style de "+pick_.length+" bloc"+(pick_.length>1?"s":"")),id:undefined};again();
    $("umsg").textContent="Réglages déduits de "+pick_.length+" bloc"+(pick_.length>1?"s":"")+" : ajuste-les puis enregistre.";
  };
}
