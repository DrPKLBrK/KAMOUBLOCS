// JUDGE (v29, amélioration 3.2) : contre-expertise par le second modèle PENDANT la génération.
// Le générateur ne valide un bloc qu'avec son propre moteur. Ici, chaque bloc candidat est relu exactement comme le résolveur le relit
// (même reconstruction, svBuild + svAnalyze), puis passé au second modèle (model2.js : squelette 3D, équilibre des forces, lancers).
// Un bloc est écarté seulement si le second modèle le juge IMPOSSIBLE sur un mouvement, avec une marge nette
// (les désaccords « à la limite » restent normaux entre deux modèles et sont laissés au résolveur).
// Mesuré : seuils et coût en temps dans tests/judge_stats.py.
const JG={
  reach:6,    // cm : main en mouvement encore trop loin de la cible, corps entièrement tendu (mouvement statique)
  hand:2,     // main fixe : charge / capacité pendant le transit (seulement si l'équilibre est trouvé, sinon les forces ne veulent rien dire)
  hold:2.5,   // prise d'arrivée : charge / capacité dans la position d'arrivée
  dyn:1.2,    // lancer : vitesse demandée / vitesse que les jambes peuvent donner dans cette position
  catch:1.7   // réception : impact / ce que la prise d'arrivée tient en dynamique
};
// Pourquoi des seuils aussi hauts : sur des blocs validés par le générateur, même faciles, le second modèle trouve couramment la main fixe
// à 80-120 % de sa capacité (médiane 0,83, 95e centile 1,4) : ses capacités de tenue sont volontairement prudentes. Seuls les cas
// extrêmes (environ 1 mouvement sur 100) signalent un vrai problème plutôt qu'un écart d'étalonnage entre les deux modèles.
const JG_USE="gen_m2judge";
const judgeOn=()=>ls(JG_USE,true)!==false;
// Corrections du résolveur pour le second modèle (tenue des prises, frottement, détente). La portée est déjà appliquée à l'envergure
// du profil par withSolveCal (link.js) : on ne la compte pas deux fois.
function judgeCal(){
  const C=JSON.parse(JSON.stringify(CAL0)),c=typeof scActive==="function"?scActive():null;
  if(c){C.hold=Object.assign({},c.hold||{});["m2cap","m2mu","m2dyn"].forEach(k=>{if(isFinite(c[k]))C[k]=c[k]})}
  C.reach=1;return C;
}
// Verdict du second modèle sur un mouvement (x : mesures du moteur principal, r : résultat de m2Move).
function judgeMove(x,r,camp){
  const out=[],dyn=x.pair||x.m.m.dyn;
  if(!x.pair&&!dyn&&r.short>JG.reach)out.push({q:"reach",txt:`prise hors de portée de ${Math.round(r.short)} cm, corps tendu`});
  if(!camp&&!r.rotation&&r.hand&&r.hand.ratio>JG.hand)out.push({q:"hand",txt:`main fixe chargée à ${Math.round(r.hand.ratio*100)} % de ce que tient la prise`});
  const t=r.arrive&&r.arrive[0];if(t&&t.ratio>JG.hold)out.push({q:"hold",txt:`prise d'arrivée chargée à ${Math.round(t.ratio*100)} % de sa capacité`});
  const y=r.dyn;if(dyn&&y&&y.need>=2){
    if(y.ratio>JG.dyn)out.push({q:"dyn",txt:`lancer : ${Math.round(y.ratio*100)} % de la vitesse que les jambes peuvent donner`});
    if(y.catchRatio>JG.catch)out.push({q:"catch",txt:`réception : impact à ${Math.round(y.catchRatio*100)} % de ce que la prise tient`});
  }
  return out;
}
// Juge un résultat du générateur. Ne touche à rien de durable : état du résolveur, prises, hasard et profil sont restaurés.
function m2JudgeR(r){
  if(!r||!r.seq)return null;
  const t0=performance.now(),climber=climberObj(),o=JSON.parse(JSON.stringify(blockObject(Object.assign({},r,{climber}))));
  const keep={B,S,AN,CAL,SP:Object.assign({},SP),rnd:Math.random},fields=["grip","type","slo","crimp","w","h","fam"];
  const hs=Object.keys(o.holds||{}).map(n=>{const h=byN(+n);return h?{h,v:fields.map(f=>h[f])}:null}).filter(Boolean);
  let s=12345;Math.random=()=>{s=(s*1664525+1013904223)>>>0;return s/4294967296}; // le hasard à graine du générateur n'est pas consommé
  try{
    M2P=[];B=o;S=svBuild(o);CAL=judgeCal();
    const runs=climber?[{H:climber.H,ape:(climber.ape||1)*100,lab:""}]:[{H:150,ape:100,lab:"1,50 m"},{H:190,ape:100,lab:"1,90 m"}];
    const issues=[];let n=0;
    for(const p of runs){SP.H=p.H;SP.ape=p.ape;AN=svAnalyze();
      AN.M.forEach((x,k)=>{n++;judgeMove(x,m2Move(x),AN.camp).forEach(i=>issues.push(Object.assign({k,size:p.lab},i)))})}
    return{ok:!issues.length,issues,n:issues.length,moves:AN.M.length,sizes:runs.map(p=>p.lab).filter(Boolean),ms:Math.round(performance.now()-t0)};
  }catch(e){console.error("contre-expertise",e);return{ok:true,err:String(e&&e.message||e),issues:[],n:0,ms:Math.round(performance.now()-t0)}}
  finally{Math.random=keep.rnd;B=keep.B;S=keep.S;AN=keep.AN;CAL=keep.CAL;Object.assign(SP,keep.SP);M2P=[];hs.forEach(x=>fields.forEach((f,i)=>x.h[f]=x.v[i]))}
}
// Branchement dans le générateur : un candidat jugé impossible est remplacé par un autre, dans la limite d'un budget de temps.
// Si aucun candidat ne passe, on garde le moins contesté et le bloc affiche ce que le second modèle en pense.
const JG_TRIES=6,JG_BUDGET=4000;
const JSTAT={n:0,rej:0,ms:0,why:{}};
gen=(function(base){return function(c){
  if(!judgeOn())return base(c);
  const t0=Date.now();let best=null;
  for(let k=0;k<JG_TRIES;k++){
    const r=base(c);if(!r)break;
    const j=m2JudgeR(r);r.m2=j;JSTAT.n++;JSTAT.ms+=j?j.ms:0;
    if(!j||j.ok)return r;
    JSTAT.rej++;j.issues.forEach(i=>JSTAT.why[i.q]=(JSTAT.why[i.q]||0)+1);
    if(!best||j.n<best.m2.n)best=r;
    if(Date.now()-t0>JG_BUDGET)break;
  }
  if(best)best.m2.kept=true;
  return best;
}})(gen);
// Texte affiché sous le bloc.
function judgeHTML(r){
  if(!judgeOn())return"";const j=r&&r.m2;
  if(!j)return"";
  if(j.err)return`<p class="mut">Contre-expertise du second modèle indisponible pour ce bloc.</p>`;
  if(j.ok)return`<p class="m2ok">✓ Contre-expertise du second modèle : aucun mouvement impossible (${j.moves} mouvement${j.moves>1?"s":""} vérifié${j.moves>1?"s":""}${j.sizes&&j.sizes.length?", à "+j.sizes.join(" et "):""}).</p>`;
  const L=j.issues.slice(0,4).map(i=>`<li>Mouvement ${i.k+1}${i.size?" (à "+i.size+")":""} : ${esc(i.txt)}</li>`).join("");
  return`<div class="m2warn"><b>Le second modèle doute de ce bloc</b> (aucun autre candidat n'est passé dans le temps imparti) :<ul>${L}</ul><span class="mut">Ouvre-le dans le résolveur pour voir le détail, ou génère-en un autre.</span></div>`;
}
show=(function(base){return function(r){base(r);const v=$("v3"),vs=$("v3sum"),vw=$("v3warn");if(vw)vw.innerHTML="";if(!r||!v)return;const h=judgeHTML(r);if(h)v.insertAdjacentHTML("afterbegin",h);
  if(vw&&r.m2&&judgeOn()&&!r.m2.ok&&!r.m2.err)vw.innerHTML=h; // v50 : le doute du second modèle reste visible sous la ligne
  if(vs&&r.m2&&judgeOn()&&!r.m2.err)vs.textContent+=CFG.expert?(r.m2.ok?" · second modèle : d'accord":" · second modèle : doute"):(r.m2.ok?" · double vérification : OK":" · double vérification : doute")}})(show);
tabAff=(function(base){return function(){return base()+`<div class="row"><label class="sw"><input type="checkbox" id="m2judge"${judgeOn()?" checked":""}><span>Contre-expertise par le second modèle pendant la génération</span></label><span class="mut">Écarte les blocs que le modèle indépendant du résolveur juge impossibles. Génération un peu plus lente.</span></div>`}})(tabAff);
renderTab=(function(base){return function(f){base(f);const c=$("m2judge");if(c)c.onchange=e=>ss(JG_USE,e.target.checked)}})(renderTab);
