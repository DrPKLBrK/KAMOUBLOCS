// WALLMODE (v29, amélioration 4.2) : mode séance au pied du mur, dans le résolveur.
// Le rapport complet est long à lire entre deux essais. Cet écran ne garde que l'utile, en gros : le mouvement, la cause principale,
// la méthode à essayer (une à la fois), le test qui tranche un désaccord entre les modèles, et un compteur d'essais par mouvement.
// Le même diagnostic que le rapport (diagnose, mergeCauses, fixesOf) : rien n'est calculé autrement.
// Les essais sont gardés par bloc et par mouvement (clé solve_tries) et recopiés dans le suivi : le premier essai compté ajoute
// le mouvement au suivi, « Débloqué » ouvre le formulaire du suivi (ce qui coinçait vraiment, ce qui a marché).
const WT_KEY="solve_tries";
const wTries=()=>ls(WT_KEY,{})||{};
const wGet=k=>((wTries()[BID]||{})[k])||0;
function wSet(k,n){const a=wTries();a[BID]=a[BID]||{};a[BID][k]=Math.max(0,n);ss(WT_KEY,a);
  const l=hist(),e=l.find(q=>q.bid===BID&&q.k===k&&!q.test);if(e){e.tries=a[BID][k];ss(SVH_KEY,l)}}
let WM={fix:0,send:false,undo:null};
let WM_T=null;
function wUndoStop(){WM.undo=null;clearInterval(WM_T);WM_T=null}
function wUndoArm(k){wUndoStop();WM.undo={k,until:Date.now()+10000};
  WM_T=setInterval(()=>{const d=$("wm");if(!d||d.hidden||!WM.undo||Date.now()>=WM.undo.until){wUndoStop()}if(d&&!d.hidden&&!WM.send)wmDraw()},1000)}
// Essais comptés sur tout le bloc, et mouvement le plus essayé (= le passage le plus dur pour toi)
const wNoFlash=()=>{const t=notes().find(x=>x.id===(B.created||("sv_"+BID)));return !!(t&&t.flash===false)}; // déjà essayé sans flash (v47)
const wTotal=()=>Object.values(wTries()[BID]||{}).reduce((a,b)=>a+b,0);
const wCrux=()=>{const t=wTries()[BID]||{};let k=null,m=0;Object.entries(t).forEach(([i,n])=>{if(n>m){m=n;k=+i}});return k};
// « Flash ! » / « Enchaîné en N essais » (v44) : enregistre la note du bloc dans le générateur (enchaîné, ressenti, essais, passage le plus dur), puis retour.
function wmSend(rating){
  const was=notes().find(x=>x.id===(B.created||("sv_"+BID)))||{}; // note déjà enregistrée pour ce bloc (statut verrouillé)
  const tot=wTotal(),crux=tot>1?wCrux():null; // un flash (0 ou 1 essai) n'indique pas de passage plus dur que les autres
  const id=noteToGen({bid:BID,k:crux==null?0:crux},rating,null);
  wUndoStop();
  if(id){const a=notes(),t=a.find(x=>x.id===id);if(t){t.sent=true;t.crux=crux;t.tries=Math.max(tot,was.tries||0)||null;t.flash=was.flash===true?true:was.flash===false?false:tot<=1;t.comment=tot<=1?"Flash au pied du mur":"Enchaîné au pied du mur en "+tot+" essais";ss(KEY.notes,a);replay()}}
  WM.send=false;const mm=$("wmmsg");
  const d=$("wm");if(d)d.querySelector(".wmin").innerHTML=`<section class="wmsend"><h3>Bravo !</h3><p class="wmbig">${tot<=1&&was.flash!==false?"Flash ! Réussi du premier coup.":"Enchaîné"+(tot>1?" en "+tot+" essais":"")+"."}</p><p>${crux!=null&&tot>1?"Passage le plus dur retenu : mouvement "+(crux+1)+".":""} La note est dans le générateur.</p><div class="wmrow"><button type="button" class="pri" id="wmback">Retour au générateur</button></div></section>`;
  const b=$("wmback");if(b)b.onclick=()=>wmClose();
}
function wmOpen(){wUndoStop();WM={fix:0,send:false,undo:null};let d=$("wm");if(!d){d=document.createElement("div");d.id="wm";d.className="wm";d.setAttribute("role","dialog");d.setAttribute("aria-modal","true");d.setAttribute("aria-label","Mode pied du mur");document.body.appendChild(d)}
  d.hidden=false;document.documentElement.classList.add("wmon");wmDraw()}
// retour au générateur quand le mode pied du mur a été ouvert depuis le mode grimpeur
function wmBack(){
  try{if(window.parent!==window){const ov=parent.document.getElementById("gbsv");if(ov){const b=ov.querySelector("button");if(b){b.click();return}}}}catch(e){}
  try{if(window.opener&&!window.opener.closed){window.opener.focus();window.close();return}}catch(e){}
  const g=ls("gen_page",null);location.href=typeof g==="string"&&/\.html?$/i.test(g)?encodeURIComponent(g):"index.html";
}
function wmClose(){if(typeof WMONLY!=="undefined"&&WMONLY){const d=$("wm");if(d)d.hidden=true;wmBack();return}const d=$("wm");if(d)d.hidden=true;document.documentElement.classList.remove("wmon");update();renderHist()}
function wmDraw(){
  const d=$("wm"),k=SEL.k,x=AN.M[k],m=x.m,n=AN.M.length;
  const DGk=diagnose(AN,k,SEL.sym),CMP=AN.CMP[k],MC=mergeCauses(DGk,CMP,x,SEL.sym),C=MC.filter(c=>c.score>=.2),F=fixesOf({C:MC},workedCount());
  CUR={k,C:C.slice(0,3),F,CMP};
  const c0=C[0],f=F.length?F[WM.fix%F.length]:null,tries=wGet(k);
  const dis=CMP.find(c=>!c.agree&&!testDone(c.q,k)),T=dis?testFor(dis.q,x):null;
  const hn=h=>`n°${h.n} <span class="mut">(${esc(h.type.toLowerCase())})</span>`;
  // v45 : sur tablette (écran tactile), « Flash ! » est en haut tant que c'est un flash ; dès le 2e essai il revient en bas.
  // Sur ordinateur (souris), rien ne change.
  const touch=!!(window.matchMedia&&matchMedia("(pointer: coarse)").matches),atTop=touch&&wTotal()<=1&&!wNoFlash();
  const sendH=`<section class="wmsend"><h3>Bloc entier</h3>${WM.send?`<p>Comment c'était ?</p><div class="wmrow wmrates">${NOTE_N.map((t,i)=>`<button type="button" data-ws="${i}">${t}</button>`).join("")}</div><button type="button" data-wm="sendx">Annuler</button>`:`<div class="wmrow"><button type="button" class="pri wmok" data-wm="send">${wTotal()<=1&&!wNoFlash()?"Flash !":"Enchaîné"+(wTotal()>1?" en "+wTotal()+" essais":"")}</button></div><p class="mut" style="margin:6px 0 0">${wTotal()<=1&&!wNoFlash()?"Réussi du premier coup ? Touche « Flash ! ». Sinon, compte tes essais avec « +1 essai » : le mouvement le plus essayé sera retenu comme ton passage le plus dur.":"Le mouvement le plus essayé sera retenu comme ton passage le plus dur."}</p>`}</section>`;
  d.innerHTML=`<div class="wmin">
    <div class="wmtop"><button type="button" data-wm="prev" aria-label="Mouvement précédent"${k?"":" disabled"}>‹</button>
      <div class="wmt"><b>Mouvement ${k+1} / ${n}</b>${k===AN.crux?' <span class="pill pill-key">clé</span>':""}<small>${esc(stepTitle(k))}</small></div>
      <button type="button" data-wm="next" aria-label="Mouvement suivant"${k<n-1?"":" disabled"}>›</button><button type="button" data-wm="close" aria-label="Fermer le mode pied du mur">✕</button></div>
    <p class="wmh">Vers ${hn(m.h)}${m.pair?" et "+hn(m.pair.h):""} · main fixe ${hn(x.fixed.h)}</p>
    <div class="wmwallw"><svg id="wmwall" class="wmwall" role="img" aria-label="Mur zoomé sur le mouvement ${k+1}"></svg>
      <p class="mut wmleg"><span class="lg lg-t"></span>prise visée <span class="lg lg-f"></span>main fixe <span class="lg lg-p"></span>pieds</p></div>
    ${atTop?sendH:""}
    <section><h3>Ce qui coince</h3>${c0?`<p class="wmbig">${esc(CAUSEN[c0.id])}</p><p>${esc(causeWhy(c0))}</p>${C[1]?`<p class="mut">Ensuite : ${C.slice(1,3).map(c=>esc(CAUSEN[c.id].toLowerCase())).join(", ")}.</p>`:""}`:`<p>Aucun point mécanique saillant à ta taille : vérifie le placement des pieds et du bassin.</p>`}</section>
    ${f?`<section><h3>À essayer${F.length>1?` · ${WM.fix%F.length+1} / ${F.length}`:""}</h3><p class="wmbig2">${esc(fixTxt(f))}</p>${f.won?`<span class="pill pill-ok">a déjà marché pour toi</span>`:""}${F.length>1?`<button type="button" data-wm="fix">Méthode suivante</button>`:""}</section>`:""}
    ${T?`<section><h3>${isDet()?"Trancher":"Petit test"} : ${esc(dis.q.toLowerCase())}</h3><p>${esc(T.t)}</p><div class="wmrow"><button type="button" data-wt="1">${esc(T.yes)}</button><button type="button" data-wt="0">${esc(T.no)}</button></div></section>`:""}
    <section class="wmtries"><h3>Essais sur ce mouvement</h3><div class="wmrow"><span class="wmn" aria-live="polite">${tries}</span><button type="button" class="pri" data-wm="plus">+1 essai</button></div>${WM.undo&&WM.undo.k===k&&Date.now()<WM.undo.until?`<div class="wmrow wmundo"><button type="button" data-wm="undo">Annuler ce dernier essai</button><span class="mut">fausse manip ? ${Math.ceil((WM.undo.until-Date.now())/1000)} s</span></div>`:""}</section>
    ${atTop?"":sendH}
    <div class="wmrow"><button type="button" data-wm="done">Ce mouvement est passé</button></div>
    <p class="mut" id="wmmsg" role="status"></p></div>`;
  try{drawSolveWall($("wmwall"),k,DGk,true,"wm")}catch(e){const w=d.querySelector(".wmwallw");if(w)w.hidden=true}
  d.querySelectorAll("[data-wm]").forEach(b=>b.onclick=()=>{const a=b.dataset.wm;
    if(a==="close")return wmClose();
    if(a==="prev"&&SEL.k>0){SEL.k--;WM.fix=0}
    if(a==="next"&&SEL.k<n-1){SEL.k++;WM.fix=0}
    if(a==="fix")WM.fix++;
    if(a==="send"){WM.send=true}
    if(a==="sendx"){WM.send=false}
    // v46 : plus de « − » (pas de triche) ; seul le DERNIER essai peut être annulé, pendant 10 s (fausse manip).
    // Une fois le délai passé, le compteur ne peut plus que monter : un bloc à 2 essais ne redevient jamais un flash.
    if(a==="plus"){if(!hist().some(q=>q.bid===BID&&q.k===k&&!q.test))keepCur({tries:0});wSet(k,tries+1);wUndoArm(k)}
    if(a==="undo"&&WM.undo&&WM.undo.k===k&&Date.now()<WM.undo.until){wSet(k,Math.max(0,tries-1));wUndoStop()}
    if(a==="done"){let e=hist().find(q=>q.bid===BID&&q.k===k&&!q.test);if(!e)e=keepCur({tries});OPEN=e.ts;
      // ouvert depuis le mode grimpeur : on affiche la page du résolveur pour remplir la fiche, au lieu de repartir au générateur
      if(typeof WMONLY!=="undefined"&&WMONLY){WMONLY=false;document.documentElement.classList.remove("wmonly")}
      wmClose();const h=$("hist");if(h)h.scrollIntoView({block:"start"});return}
    wmDraw()});
  d.querySelectorAll("[data-ws]").forEach(b=>b.onclick=()=>wmSend(+b.dataset.ws));
  d.querySelectorAll("[data-wt]").forEach(b=>b.onclick=()=>{
    histAdd({ts:Date.now(),bid:BID,k,test:true,q:dis.q,title:`Test · ${dis.q} · mouvement ${k+1}`,cmp:[{q:dis.q,a:dis.a,b:dis.b}],hn:m.h.n,truth:{probs:b.dataset.wt==="1"?[dis.q]:[],fix:null},done:true});
    calReplay();analyze();wmDraw();const mm=$("wmmsg");if(mm)mm.textContent="Test enregistré : il apprend au résolveur sur quel modèle s'appuyer."});
}
document.addEventListener("keydown",e=>{const d=$("wm");if(d&&!d.hidden&&e.key==="Escape")wmClose()});
