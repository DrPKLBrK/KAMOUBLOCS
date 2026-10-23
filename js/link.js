// LINK (v29) : lien entre le générateur et le résolveur, qui partagent le même stockage.
//  - Le résolveur publie ce qu'il apprend de tes essais (clé « solve_cal ») : prises plus dures ou plus faciles que leur note, portée réelle.
//  - Le générateur s'en sert pour ouvrir des blocs à ta mesure, si tu le veux (case dans Notes et apprentissage), et peut l'annuler à tout moment.
//  - « Résoudre ce bloc » ouvre le résolveur sur le bloc affiché.
// Ce fichier n'est chargé que par le générateur : le résolveur applique déjà ces corrections de son côté.
const SC_KEY="solve_cal",SC_USE="gen_usecal";
// nom de cette page (index.html, ou le nom que tu lui as donné) : le lien « Générateur » du résolveur y revient
try{const f=decodeURIComponent(location.pathname.split("/").pop()||"");if(/\.html?$/i.test(f)&&!window.GB_SOLVER_HTML)ss("gen_page",f)}catch(e){}
const solveCal=()=>{const c=ls(SC_KEY,null);return c&&!c.off?c:null};
const useSolveCal=()=>ls(SC_USE,true)!==false;
const scActive=()=>{const c=solveCal();return useSolveCal()&&c&&(Object.keys(c.hold||{}).length||Math.abs((c.reach||1)-1)>1e-6)?c:null};

// 1) Prises : les corrections du résolveur s'ajoutent à l'apprentissage par prise des notes (mêmes unités, mêmes bornes).
replay=(function(base){return function(){base();const c=scActive();if(!c)return;
  for(const n in c.hold)LEARN.a[n]=clamp((LEARN.a[n]||0)+c.hold[n],-2,2)}})(replay);

// 2) Portée : appliquée à l'envergure du profil de grimpeur, seulement quand ce profil est activé (sans profil, le bloc vaut pour 1,50 à 1,90 m).
// Le bloc garde la trace exacte de ce qui a servi (climber, cal), pour que le résolveur le relise à l'identique.
function withSolveCal(fn){
  const c=scActive(),scale=c&&PROF.on?(c.reach||1):1,a0=PROF.ape;
  if(scale!==1)PROF.ape=a0*scale;
  try{const r=fn();if(r){r.climber=climberObj();r.cal=c?{hold:Object.assign({},c.hold||{}),reach:c.reach||1}:null;r.meas=Object.assign({},MEAS_OFF)}return r}
  finally{PROF.ape=a0}
}

// 3) Panneau « Corrections du résolveur » sous les notes.
function renderSolveCal(){
  const d=$("solvecal");if(!d)return;const c=solveCal(),on=useSolveCal();
  if(!c||(!Object.keys(c.hold||{}).length&&Math.abs((c.reach||1)-1)<1e-6)){d.innerHTML=`<div class="tune"><h4>Corrections du résolveur</h4><p class="mut">Aucune pour l'instant. Quand tu marques des blocages débloqués ou tranches des tests dans le résolveur, ce qu'il apprend sur tes prises et ta portée apparaît ici et peut servir à générer.</p></div>`;return}
  const L=[];if(Math.abs((c.reach||1)-1)>1e-6)L.push(`Portée réelle : ${(c.reach>1?"+":"")+Math.round((c.reach-1)*100)} % (appliquée seulement avec un profil de grimpeur activé)`);
  Object.entries(c.hold||{}).forEach(([n,v])=>{const h=byN(+n);L.push(`Prise n°${n}${h?" ("+esc(h.type.toLowerCase())+")":""} : ${v>0?"plus dure":"plus facile"} que sa note (${v>0?"+":""}${v.toFixed(2).replace(".",",")})`)});
  d.innerHTML=`<div class="tune"><h4>Corrections du résolveur</h4><ul>${L.map(t=>`<li>${t}</li>`).join("")}</ul>
    <label class="sw"><input type="checkbox" id="scuse" ${on?"checked":""}><span>Utiliser ces corrections pour générer et estimer les niveaux</span></label>
    <p class="mut">Apprises à partir de ${c.n||0} blocage${(c.n||0)>1?"s":""} ou test${(c.n||0)>1?"s":""} tranché${(c.n||0)>1?"s":""} dans le résolveur. Décocher les annule aussitôt ; elles restent gardées.</p></div>`;
  $("scuse").onchange=e=>{ss(SC_USE,e.target.checked);replay();renderSolveCal();if(typeof renderNotes==="function")renderNotes()};
}
renderNotes=(function(base){return function(){base();renderSolveCal()}})(renderNotes);

// 4) Ouvrir le résolveur sur un code de bloc (onglet séparé, ou fenêtre intégrée dans le fichier unique).
function openSolver(code){
  try{if(code)localStorage.setItem("solve_in",code)}catch(e){}
  // fichier unique : résolveur embarqué ; appli installée (plein écran) : fenêtre intégrée, pour rester dans l'appli
  const standalone=(window.matchMedia&&matchMedia("(display-mode: standalone)").matches)||navigator.standalone===true;
  if(window.GB_SOLVER_HTML||standalone){openSolverOverlay(code);return true}
  const w=window.open("solveur.html"+(code?"#"+code:""),"_blank");if(!w)location.href="solveur.html";return true;
}
function openSolverOverlay(code){
  let ov=document.getElementById("gbsv");if(ov)ov.remove();
  ov=document.createElement("div");ov.id="gbsv";ov.style.cssText="position:fixed;inset:0;z-index:99998;background:#111;display:flex;flex-direction:column";
  const bar=document.createElement("button");bar.textContent="✕ Fermer le résolveur et revenir au générateur";bar.style.cssText="padding:12px;font-size:16px;border:0;background:#0a6d78;color:#fff";
  bar.onclick=()=>{ov.remove();replay();renderNotes();if(typeof renderRate==="function")renderRate()};
  const fr=document.createElement("iframe");fr.style.cssText="flex:1;border:0;width:100%;background:#fff";fr.setAttribute("title","Résolveur de blocs");
  if(window.GB_SOLVER_HTML)fr.srcdoc=window.GB_SOLVER_HTML.replace("<head>","<head><script>window.GB_CODE="+JSON.stringify(code||"").replace(/</g,"\\u003c")+";<\/script>");
  else fr.src="solveur.html"+(code?"#"+code:""); // même origine : le code passe aussi par solve_in
  ov.appendChild(bar);ov.appendChild(fr);document.body.appendChild(ov);
}
