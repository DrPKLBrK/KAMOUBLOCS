// TUNE : auto-réglage proposé par le benchmark. Rien n'est modifié sans ton accord (bouton « Appliquer »),
// et « Annuler » restaure l'état précédent. Trois leviers :
//  kw  : poids de chaque type de parcours (up, trav, diag, corner, zig) pour la diversité ;
//  ana : poids de la pénalité d'alertes articulaires dans le choix du bloc (charge articulaire) ;
//  tol : multiplicateur de la tolérance sur le niveau visé (précision du niveau).
const TUNE_KEY="tune5"+WSUF,TUNE0={kw:{},ana:1,tol:1};
let TUNE=Object.assign({},TUNE0,ls(TUNE_KEY,{}));TUNE.kw=TUNE.kw||{};
const tuneSave=()=>ss(TUNE_KEY,TUNE);
const tuneCore=()=>({kw:Object.assign({},TUNE.kw),ana:TUNE.ana,tol:TUNE.tol});
// Répète chaque type de parcours selon son poids (le tirage reste aléatoire).
function tuneKinds(kinds){
  const cnt={};kinds.forEach(k=>cnt[k]=(cnt[k]||0)+1);const out=[];
  for(const k in cnt){const w=TUNE.kw[k]==null?1:TUNE.kw[k];const n=Math.max(1,Math.round(cnt[k]*w));for(let i=0;i<n;i++)out.push(k)}
  return out;
}
const tuneIsDefault=()=>!Object.keys(TUNE.kw).length&&TUNE.ana===1&&TUNE.tol===1;
const clampT=(v,a,b)=>Math.max(a,Math.min(b,v));
// À partir d'un rapport de benchmark : liste de propositions {id, titre, detail, patch}.
function tuneSuggest(r){
  const out=[],ids=["up","trav","diag","zig"].concat(WALL.joints.length?["corner"]:[]),tot=Object.values(r.kinds).reduce((a,b)=>a+b,0);
  if(tot>=10&&r.entropy<88){
    const kw=Object.assign({},TUNE.kw),ch=[];
    ids.forEach(k=>{
      const sh=(r.kinds[k]||0)/tot,tg=1/ids.length,cur=TUNE.kw[k]==null?1:TUNE.kw[k];
      if(sh<tg*.7||sh>tg*1.45){const nw=Math.round(clampT(cur*Math.pow(tg/Math.max(sh,.03),.6),.3,3)*100)/100;if(Math.abs(nw-cur)>=.1){kw[k]=nw;ch.push(`${KINDN[k]} ${Math.round(sh*100)} % → poids ×${nw}`)}}
    });
    if(ch.length)out.push({id:"div",titre:"Diversité des parcours",detail:`Diversité mesurée : ${r.entropy} %. ${ch.join(" · ")}.`,patch:{kw}});
  }
  if(r.alertBlocks>40){const a=Math.round(Math.min(3,TUNE.ana*1.5)*100)/100;if(a>TUNE.ana)out.push({id:"ana",titre:"Charge articulaire",detail:`${r.alertBlocks} % des blocs portent au moins une alerte. Le générateur favorisera davantage les variantes moins chargées (pénalité ×${a}).`,patch:{ana:a}})}
  else if(r.alertBlocks<8&&TUNE.ana>1){const a=Math.round(Math.max(1,TUNE.ana/1.5)*100)/100;out.push({id:"ana",titre:"Charge articulaire",detail:`Seulement ${r.alertBlocks} % de blocs avec alerte : on peut relâcher la pénalité (×${a}) pour laisser plus de variété.`,patch:{ana:a}})}
  if(r.aim.abs>.9&&r.rate>=92){const t=Math.round(Math.max(.6,TUNE.tol*.85)*100)/100;if(t<TUNE.tol)out.push({id:"tol",titre:"Précision du niveau",detail:`Écart absolu moyen estimé/visé : ${r.aim.abs.toFixed(1)} avec ${r.rate} % de réussite. On resserre la tolérance (×${t}) pour coller mieux à la cible.`,patch:{tol:t}})}
  else if(r.rate<80&&TUNE.tol<1.3){const t=Math.round(Math.min(1.3,TUNE.tol/.85)*100)/100;if(t>TUNE.tol)out.push({id:"tol",titre:"Taux de réussite",detail:`Seulement ${r.rate} % de blocs trouvés : on élargit un peu la tolérance sur le niveau (×${t}).`,patch:{tol:t}})}
  return out;
}
function tuneState(){
  if(tuneIsDefault())return"Réglages d'origine.";
  const kw=Object.entries(TUNE.kw).map(([k,v])=>`${KINDN[k]||k} ×${v}`).join(", ");
  return"Réglages actifs : "+[kw&&"parcours ("+kw+")",TUNE.ana!==1&&"pénalité d'alertes ×"+TUNE.ana,TUNE.tol!==1&&"tolérance de niveau ×"+TUNE.tol].filter(Boolean).join(" · ")+".";
}
function tuneHtml(r){
  const s=r.tuned?[]:tuneSuggest(r);
  let h=`<div class="tune"><h4>Réglages proposés</h4>`;
  h+=s.length?`<ul>${s.map(x=>`<li><b>${esc(x.titre)}</b> : ${esc(x.detail)}</li>`).join("")}</ul><div class="row"><button id="tapply">Appliquer ces réglages</button></div>`:(r.tuned?`<p class="mut">Réglages appliqués après ce lot : relance un lot pour mesurer l'effet.</p>`:`<p class="mut">Rien à ajuster : les mesures de ce lot sont dans les clous.</p>`);
  h+=`<p class="mut" id="tstate">${esc(tuneState())}</p><div class="row"><button id="tundo"${TUNE.prev?"":" disabled"}>Annuler le dernier réglage</button><button id="treset"${tuneIsDefault()?" disabled":""}>Revenir aux réglages d'origine</button><span class="mut" id="tmsg" role="status"></span></div></div>`;
  return h;
}
function bindTune(r){
  const m=t=>{const e=$("tmsg");if(e)e.textContent=t},ok=()=>{tuneSave();renderBench();m("Enregistré. Relance un lot pour mesurer l'effet.")};
  const a=$("tapply");if(a)a.onclick=()=>{const prev=tuneCore();tuneSuggest(r).forEach(x=>Object.assign(TUNE,x.patch));TUNE.prev=prev;r.tuned=true;ss(BENCH_KEY,r);ok()};
  const u=$("tundo");if(u)u.onclick=()=>{if(!TUNE.prev)return;Object.assign(TUNE,TUNE.prev);TUNE.prev=null;ok()};
  const z=$("treset");if(z)z.onclick=()=>{TUNE.prev=tuneCore();TUNE.kw={};TUNE.ana=1;TUNE.tol=1;ok()};
}
