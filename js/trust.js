// TRUST : apprend, à partir de tes blocages débloqués, lequel des deux modèles voit juste chez toi, question par question.
// Quand tu marques un blocage « débloqué », tu dis ce qui coinçait vraiment et ce qui a marché. Pour chaque question où les deux
// modèles étaient en désaccord sur ce mouvement, celui qui avait raison gagne un point. Seuls les désaccords départagent :
// quand les deux disent la même chose, ils ont raison ou tort ensemble.
const QS=["Portée statique","Main fixe","Rotation en porte","Pieds","Prise d'arrivée","Lancer","Réception"];
const Q2C={"Portée statique":"reach","Main fixe":"load","Rotation en porte":"barn","Pieds":"feet","Prise d'arrivée":"grip","Lancer":"dyn","Réception":"catch"};
const C2Q=Object.fromEntries(Object.entries(Q2C).map(([q,c])=>[c,q]));
const TRUST={min:3,gap:.15}; // il faut au moins 3 désaccords tranchés et 15 points d'écart pour désigner un modèle
const MODN={m1:"Moteur du générateur",m2:"Second modèle"};
function trustTable(){
  const T={};QS.forEach(q=>T[q]={n:0,m1:0,m2:0,dn:0,d1:0,d2:0});
  hist().filter(e=>e.truth&&e.cmp).forEach(e=>e.cmp.forEach(c=>{const t=T[c.q];if(!t)return;const real=e.truth.probs.includes(c.q);
    t.n++;if(c.a===real)t.m1++;if(c.b===real)t.m2++;if(c.a!==c.b){t.dn++;if(c.a===real)t.d1++;else t.d2++}}));
  return T;
}
// Sur qui s'appuyer pour une question : 'm1', 'm2' ou null (pas encore tranché).
function trustWho(q,T){
  const t=(T||trustTable())[q];if(!t||t.dn<TRUST.min)return{who:null,t,txt:`pas encore tranché (${t?t.dn:0} désaccord${t&&t.dn>1?"s":""} tranché${t&&t.dn>1?"s":""} sur ${TRUST.min} nécessaires)`};
  const r1=(t.d1+1)/(t.dn+2),r2=(t.d2+1)/(t.dn+2);
  if(r1-r2>=TRUST.gap)return{who:"m1",t,txt:`${MODN.m1} · juste ${t.d1} fois sur ${t.dn}`};
  if(r2-r1>=TRUST.gap)return{who:"m2",t,txt:`${MODN.m2} · juste ${t.d2} fois sur ${t.dn}`};
  return{who:null,t,txt:`à égalité (${t.d1} contre ${t.d2})`};
}
// Méthodes qui ont déjà marché pour toi (famille de méthode : « foot », « flag », « grip »…).
const fixFam=k=>String(k||"").replace(/\d+$/,"");
function workedCount(){const c={};hist().forEach(e=>{if(e.truth&&e.truth.fix)c[fixFam(e.truth.fix)]=(c[fixFam(e.truth.fix)]||0)+1});return c}

// Causes signalées par le second modèle seul (le moteur principal ne les voit pas) : méthodes proposées.
const M2FIX={
  reach:[{key:"m2reach",p:1,t:"Le second modèle trouve la prise trop loin avec ces pieds : monte d'abord un pied ou rapproche le bassin du mur avant de partir."}],
  load:[{key:"hipin",p:2,t:"Rapproche le bassin du mur et pousse sur les pieds pour soulager la main fixe."}],
  barn:[{key:"flag",p:1,t:TECHTXT.drapeau},{key:"core",p:2,t:"Serre fessiers et abdominaux, et avance la hanche de la main fixe vers le mur avant de lâcher."}],
  feet:[{key:"m2feet",p:1,t:"Le second modèle calcule qu'un pied ne tient pas dans cette position : pousse-le vers le mur, talon bas, ou change de pied avant le mouvement."}],
  dyn:[{key:"m2dyn",p:1,t:"Le second modèle juge l'impulsion insuffisante depuis cette position : étire-toi au maximum vers la prise avant de partir (bras fixe tendu, bassin haut), puis pousse des jambes."}],
  catch:[{key:"catch1",p:1,t:"Le second modèle prévoit une réception trop dure pour la prise : vise le sommet de la trajectoire, quand le corps ne monte plus, et garde un pied au mur pour freiner le balancier."}],
  grip:[{key:"axis",p:1,t:"Le second modèle trouve la prise d'arrivée tirée hors de sa direction utile : décale le bassin pour tirer dans son axe avant de la charger."}]
};
// v49 : rapport « Essentiel » (par défaut) = sans jargon de modèles. Le détail reste dans « Détaillé ».
const SIMPLE_WHY={load:"La main fixe porte beaucoup de poids pendant que l'autre part.",feet:"Un pied risque de glisser ou de décoller pendant le mouvement.",
  reach:"La prise est sûrement hors de portée avec ces pieds.",dyn:"L'élan risque d'être trop court pour atteindre la prise.",catch:"La réception risque d'être dure à tenir sur cette prise.",
  grip:"La prise d'arrivée est tirée hors de son bon axe.",barn:"Ton corps risque de pivoter comme une porte qui s'ouvre."};
const SIMPLE_RX=[[/^Le second modèle trouve la prise trop loin avec ces pieds/,"La prise est sûrement trop loin avec ces pieds"],
  [/^Le second modèle calcule qu'un pied ne tient pas dans cette position/,"Un pied risque de ne pas tenir dans cette position"],
  [/^Le second modèle juge l'impulsion insuffisante depuis cette position/,"L'élan risque d'être trop court depuis cette position"],
  [/^Le second modèle prévoit une réception trop dure pour la prise/,"La réception risque d'être trop dure pour la prise"],
  [/^Le second modèle trouve la prise d'arrivée tirée hors de sa direction utile/,"La prise d'arrivée est tirée hors de son bon axe"],
  [/^Selon le second modèle\s*:\s*/,""],[/\s*\(?(vu|confirmé) par le second modèle\)?/g,""]];
const isDet=()=>typeof SP!=="undefined"&&SP&&SP.detail==="det";
function simpleTxt(t){t=String(t||"");for(const[r,v]of SIMPLE_RX)t=t.replace(r,v);return t.charAt(0).toUpperCase()+t.slice(1)}
function causeWhy(c){if(isDet())return c.why;if(c.src==="m2"&&SIMPLE_WHY[c.id])return SIMPLE_WHY[c.id];return simpleTxt(c.why)}
function fixTxt(f){return isDet()?f.t:simpleTxt(f.t)}
// Fusionne les causes du moteur principal avec la contre-expertise et la confiance apprise.
function mergeCauses(dg,CMP,x,sym){
  const T=trustTable(),C=dg.C.map(c=>Object.assign({},c)),hit=new Set([...sym].flatMap(s=>SYMMAP[s]||[]));
  C.forEach(c=>{const q=C2Q[c.id],cm=q&&CMP.find(z=>z.q===q);if(!cm||cm.agree)return;const w=trustWho(q,T);
    c.dis=true;c.trust=w.who;if(w.who==="m2"&&!cm.b)c.rank*=.45;});
  CMP.forEach(cm=>{if(cm.agree||!cm.b||cm.a)return;const id=Q2C[cm.q];if(C.some(c=>c.id===id&&c.score>=.2))return;const w=trustWho(cm.q,T);
    const score=.45*(w.who==="m2"?1.6:w.who==="m1"?.5:1),c={id,src:"m2",score,why:`Selon le second modèle : ${cm.tb}.`,fix:M2FIX[id]||[],dis:true,trust:w.who,sym:hit.has(id),weak:weakFor(id,x)};
    c.rank=c.score*(c.sym?1.8:1)*(c.weak?1.25:1);C.push(c)});
  return C.sort((a,b)=>b.rank-a.rank);
}

// ---------- Correction des réglages par tes essais ----------
// Recalculée à chaque fois depuis ton suivi (rien d'autre n'est stocké), donc réversible : supprimer un blocage annule son effet.
// Pour chaque question tranchée, chaque modèle qui s'est trompé décale SON réglage d'un petit pas, dans le sens qui aurait évité l'erreur :
//  « fausse alerte » (il voyait un problème qui n'en était pas un) => moins sévère ; « problème manqué » => plus sévère.
// Tous les réglages sont bornés, et une prise ne change de difficulté qu'à partir de ce que tu as déclaré sur elle.
const CALB={reach:[.92,1.08],m1load:[.7,1.4],m1stab:[.4,.7],m1barn:[.7,1.5],m1dyn:[.75,1.3],m2cap:[.7,1.4],m2mu:[.5,1],m2dyn:[.75,1.3],hold:[-1,1]};
function calReplay(){
  const C=JSON.parse(JSON.stringify(CAL0)),cl=(k,v)=>Math.max(CALB[k][0],Math.min(CALB[k][1],v));
  if(SP.calOff){CAL=C;ss("solve_cal",{hold:{},reach:1,n:0,off:true,ts:Date.now()});return}
  hist().filter(e=>e.truth&&e.cmp).forEach(e=>{C.n++;e.cmp.forEach(c=>{
    const real=e.truth.probs.includes(c.q),fp1=c.a&&!real,fn1=!c.a&&real,fp2=c.b&&!real,fn2=!c.b&&real;
    switch(c.q){
      case"Portée statique":C.reach=cl("reach",C.reach+.0075*((fp1?1:0)+(fp2?1:0)-(fn1?1:0)-(fn2?1:0)));break;
      case"Main fixe":if(fp1)C.m1load=cl("m1load",C.m1load*1.05);if(fn1)C.m1load=cl("m1load",C.m1load/1.05);if(fp2)C.m2cap=cl("m2cap",C.m2cap*1.05);if(fn2)C.m2cap=cl("m2cap",C.m2cap/1.05);break;
      case"Rotation en porte":if(fp1)C.m1barn=cl("m1barn",C.m1barn*1.08);if(fn1)C.m1barn=cl("m1barn",C.m1barn/1.08);break;
      case"Pieds":if(fp1)C.m1stab=cl("m1stab",C.m1stab-.03);if(fn1)C.m1stab=cl("m1stab",C.m1stab+.03);if(fp2)C.m2mu=cl("m2mu",C.m2mu+.05);if(fn2)C.m2mu=cl("m2mu",C.m2mu-.05);break;
      case"Prise d'arrivée":if(e.hn!=null){const h=C.hold[e.hn]||0;C.hold[e.hn]=cl("hold",h+(real&&(fn1||fn2)?.25:0)-(!real&&(fp1||fp2)?.15:0))}break;
      case"Lancer":if(fp1)C.m1dyn=cl("m1dyn",C.m1dyn*1.05);if(fn1)C.m1dyn=cl("m1dyn",C.m1dyn/1.05);if(fp2)C.m2dyn=cl("m2dyn",C.m2dyn*1.05);if(fn2)C.m2dyn=cl("m2dyn",C.m2dyn/1.05);break;
      case"Réception":if(fp2)C.m2cap=cl("m2cap",C.m2cap*1.03);if(fn2)C.m2cap=cl("m2cap",C.m2cap/1.03);break;
    }})});
  Object.keys(C.hold).forEach(n=>{if(Math.abs(C.hold[n])<.01)delete C.hold[n]});
  CAL=C;
  // publié pour le générateur (même stockage, v29) : il s'en sert pour ouvrir des blocs à ta mesure
  ss("solve_cal",{hold:C.hold,reach:C.reach,m2cap:C.m2cap,m2mu:C.m2mu,m2dyn:C.m2dyn,n:C.n,ts:Date.now()});
}
// Liste lisible des corrections en cours.
function calText(){
  const L=[],pc=(v,b)=>{const d=Math.round((v/b-1)*100);return(d>0?"+":"")+d+" %"};
  if(CAL.reach!==1)L.push(`Ta portée réelle : ${pc(CAL.reach,1)} par rapport au modèle (les deux modèles)`);
  if(CAL.m1load!==1)L.push(`Seuil « main fixe surchargée » du générateur : ${pc(CAL.m1load,1)}`);
  if(CAL.m2cap!==1)L.push(`Capacité de tenue des prises dans le second modèle : ${pc(CAL.m2cap,1)}`);
  if(CAL.m1barn!==1)L.push(`Seuil de rotation en porte du générateur : ${pc(CAL.m1barn,1)}`);
  if(CAL.m1stab!==.55)L.push(`Seuil d'appui de pied fragile du générateur : ${Math.round(CAL.m1stab*100)} / 100 (au lieu de 55)`);
  if(CAL.m2mu!==.75)L.push(`Adhérence de tes pieds dans le second modèle : ${fr(CAL.m2mu,2)} (au lieu de 0,75)`);
  if(CAL.m1dyn!==1)L.push(`Seuil de lancer « à la limite » du générateur : ${pc(CAL.m1dyn,1)}`);
  if(CAL.m2dyn!==1)L.push(`Détente dans le second modèle : ${pc(CAL.m2dyn,1)}`);
  Object.entries(CAL.hold).forEach(([n,v])=>{const h=byN(+n);L.push(`Prise n°${n}${h?" ("+h.type.toLowerCase()+")":""} : ${v>0?"plus dure":"plus facile"} que sa note pour toi (${v>0?"+":""}${fr(v,2)})`)});
  return L;
}

// ---------- Tests ciblés pour trancher un désaccord ----------
// Un essai court, sur le mur, dont le résultat dit directement lequel des deux modèles a raison sur ce mouvement.
function testFor(q,x){
  const m=x.m,n=h=>"n°"+h.n,ft=x.pre.ft.map(f=>n(f.h)).join(" et ")||"sans pieds";
  switch(q){
    case"Portée statique":return{t:`Mets-toi en position avant le mouvement (main fixe sur ${n(x.fixed.h)}, pieds sur ${ft}) et tends le bras vers ${n(m.h)} sans sauter ni déplacer les pieds.`,yes:"Je ne la touche pas",no:"Je la touche en restant stable"};
    case"Main fixe":return{t:`Dans la même position, lâche l'autre main et reste trois secondes sur ${n(x.fixed.h)} seule, pieds en place.`,yes:"Je ne tiens pas, ou à peine",no:"Je tiens sans forcer"};
    case"Rotation en porte":return{t:`Dans la même position, lâche doucement l'autre main sans bouger les pieds.`,yes:"Mon corps pivote et s'ouvre comme une porte",no:"Je reste plaqué"};
    case"Pieds":return{t:`Fais le début du mouvement en regardant tes pieds (${ft}).`,yes:"Un pied glisse ou décolle",no:"Les pieds restent en place"};
    case"Prise d'arrivée":return{t:`Prends ${n(m.h)} dans la position d'arrivée (aide-toi d'un pied plus haut si besoin) et charge-la trois secondes.`,yes:"Elle ne tient pas franchement",no:"Elle tient bien"};
    case"Lancer":return{t:`Fais trois essais du lancer en cherchant seulement à toucher ${n(m.h)}, sans la tenir.`,yes:"Je ne la touche pas",no:"Je la touche"};
    case"Réception":return{t:`Fais le lancer en cherchant à tenir ${n(m.h)} à l'arrivée.`,yes:"Je la touche mais je lâche à l'impact",no:"Je la tiens, ou je n'arrive pas jusqu'à elle"};
  }
  return null;
}
