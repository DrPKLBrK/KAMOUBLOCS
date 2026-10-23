// ADAPT (v31) : recréer sur TON mur un bloc reçu d'un autre mur.
// Les prises et la géométrie ne sont pas les mêmes : on ne copie pas le bloc, on en garde l'esprit.
// Visé : même style de mouvement, même type de prises, même niveau, même longueur, même parcours, autant de lancers et de croisés.
// Le générateur fait plusieurs essais et garde le plus proche ; le bloc passe les mêmes contrôles que d'habitude
// (faisabilité à ta taille ou pour 1,50 à 1,90 m, second modèle), donc il est réalisable sur ton mur avec tes prises.
const AD_TRIES=6,AD_BUDGET=8000;
const adLen=n=>n<=5?"short":n<=8?"mid":"long";
// Résumé de l'original, gardé dans le bloc recréé pour la comparaison
const adSrc=r=>({idx:r.idx,moves:r.moves,kind:r.kind,mv:r.mv,hs:r.hs,dy:r.dy||0,cr:r.cr||0});
// Écart entre un candidat et l'original (plus petit = plus fidèle)
const adGap=(x,s)=>Math.abs(x.idx-s.idx)+.15*Math.abs(x.moves-s.moves)+(x.kind===s.kind?0:.7)+(x.mv===s.mv?0:.6)+.3*Math.abs((x.dy||0)-s.dy)+.2*Math.abs((x.cr||0)-s.cr);
gen=(function(base){return function(c){
  if(!c||!c.tag||c.tag.kind!=="adapt")return base(c);
  const s=c.tag.src,t0=Date.now();let best=null,bg=1e9;
  for(let k=0;k<AD_TRIES;k++){
    const r=base(Object.assign({},c,{tag:null}));
    if(r){const g=adGap(r,s);if(g<bg){bg=g;best=r}}
    if(best&&bg<.9||Date.now()-t0>AD_BUDGET)break;
  }
  if(best)best.tag=Object.assign({},c.tag);return best}})(gen);
// Lance la recréation (attend que le générateur soit libre)
function adaptBlock(r){
  // style ou type de prises inconnus ici (style personnel de l'expéditeur, menu masqué) : on retombe sur « Libre »
  const mv=MVN[r.mv]&&r.mv!=="surprise"?r.mv:"mix",hs=HSN[r.hs]?r.hs:"mix";
  const s=adSrc(r),over={mv,hs,tgt:r.idx,len:adLen(r.moves),zone:"all",kind:r.kind,lancers:(r.dy||0)>0||mv==="dyno"||mv==="coord",tag:{kind:"adapt",src:s}};
  const go=()=>{if(!genWith(over))setTimeout(go,300)};go();
}
// Comparaison affichée au-dessus du bloc recréé
show=(function(base){return function(r){base(r);
  const old=document.getElementById("adaptcmp");if(old)old.remove();
  if(!r||!r.tag||r.tag.kind!=="adapt")return;
  const s=r.tag.src,m=$("met");if(!m)return;
  const row=(t,x)=>`<li><b>${t}</b> : ${esc(lab(x.idx))} · ${esc(KINDN[x.kind]||x.kind)} · ${esc(MVN[x.mv]||x.mv)} · ${x.moves} mouvements${x.dy?" · "+x.dy+" lancer"+(x.dy>1?"s":""):""}${x.cr?" · "+x.cr+" croisé"+(x.cr>1?"s":""):""}</li>`;
  const diff=[];if(lab(r.idx)!==lab(s.idx))diff.push("le niveau");if(r.mv!==s.mv)diff.push("le style (indisponible sur ton mur)");if(r.kind!==s.kind)diff.push("la forme du parcours");if(Math.abs(r.moves-s.moves)>2)diff.push("le nombre de mouvements");
  m.insertAdjacentHTML("afterbegin",`<span class="chip tagc"><i>Recréé</i>d'après un bloc reçu</span>`);
  m.insertAdjacentHTML("afterend",`<div id="adaptcmp" class="vd info"><ul style="margin:0;padding-left:18px">${row("Bloc reçu (autre mur)",s)}${row("Ta version",r)}</ul><p style="margin:6px 0 0">${diff.length?"Diffère sur "+diff.join(", ")+" : tes prises et ton mur ne permettaient pas plus proche.":"Même niveau, même style et même forme de parcours, avec tes prises."} Le bloc a passé les contrôles de faisabilité sur ton mur ; « Résoudre ce bloc » l'analyse en détail à ta taille.</p><button id="adagain">Recréer une autre version</button></div>`);
  $("adagain").onclick=()=>adaptBlock(Object.assign({},s));
}})(show);
