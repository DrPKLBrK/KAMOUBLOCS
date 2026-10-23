// CHECKS : vérifications automatiques, relancées à chaque chargement de bloc et à chaque changement de profil.
// Elles contrôlent le bloc, la fidélité de la copie du moteur, la cohérence numérique des deux modèles et leur accord.
// Statut : "ok", "warn" (à savoir, le rapport reste utilisable) ou "bad" (le rapport n'est pas fiable sur ce point).
function runChecks(){
  const R=[],add=(name,st,detail)=>R.push({name,st,detail});
  // 1) Bloc : séquence cohérente (la main fixe est déjà tenue, la prise visée est tenue après le mouvement)
  {let hd=S.h0,bad=[];S.mv.forEach((m,k)=>{if(!m.pair&&!hd.some(q=>q.o===m.ot.o))bad.push(k+1);if(!m.hd.some(q=>q.o===m.o))bad.push(k+1);hd=m.hd});
    add("Séquence du bloc",bad.length?"bad":"ok",bad.length?`incohérente aux mouvements ${[...new Set(bad)].join(", ")}`:`${S.mv.length} mouvements enchaînés sans rupture`)}
  {const miss=[...new Set(holds.filter(h=>h.missing).map(h=>h.n))];
    add("Prises",miss.length?"warn":"ok",miss.length?`n°${miss.join(", n°")} absentes de l'inventaire de base (prises ajoutées) : calcul fait avec les mesures du code, dessin simplifié`:"toutes présentes dans l'inventaire")}
  // 2) Copie du moteur : version et niveau retrouvé aux tailles de référence
  const ref=svRefLevel(),d=ref-B.level,same=!B.ver||B.ver===BC_VER;
  add("Version du moteur",same||Math.abs(d)<.05?"ok":"warn",same?`moteur du générateur v28, bloc au même format (${BC_VER})`:Math.abs(d)<.05?`bloc d'un générateur plus ancien (format ${B.ver}), relu sans écart par le moteur v28`:`bloc d'un générateur plus ancien (format ${B.ver}) : de petits écarts avec le moteur v28 sont possibles`);
  {
    add("Niveau du générateur retrouvé",Math.abs(d)<.05?"ok":Math.abs(d)<=3.5?"warn":"bad",Math.abs(d)<.05?`${fr(ref,2)} recalculé pour ${fr(B.level,2)} annoncé`:
      Math.abs(d)<=3.5?`${fr(ref,2)} recalculé pour ${fr(B.level,2)} annoncé : l'écart vient des notes enregistrées dans le générateur au moment de la génération, que le résolveur n'a pas`:`${fr(ref,2)} recalculé pour ${fr(B.level,2)} : la copie du moteur ne correspond pas au générateur qui a créé ce bloc`)}
  {const v=withEngine(refCfg(),()=>v3check(S,S.style==='nofeet')),h=v.hard.length,lab=blockClimber()?`pour le grimpeur de ${fr(blockClimber().H/100,2)} m du bloc`:"à 1,50 m et à 1,90 m";
    add("Validation biomécanique retrouvée",h?"bad":"ok",h?`${h} impossibilité${h>1?"s":""} ${lab}, alors que le générateur avait validé ce bloc`:`le contrôle du générateur passe ${lab}, comme lors de la génération`)}
  // 3) Second modèle : équilibre réellement atteint, réaction cohérente à la taille
  if(AN.camp)add("Équilibre du second modèle","ok","bloc en pieds libérés : chaque transit est un balancier, il n'est pas évalué en statique");
  else{const bad=AN.R2.map((r,k)=>r.resid!=null&&!r.rotation&&r.resid>1e-3?k+1:0).filter(Boolean),rot=AN.R2.filter(r=>r.rotation).length;
    add("Équilibre du second modèle",bad.length?"bad":"ok",bad.length?`forces non équilibrées aux mouvements ${bad.join(", ")}`:`forces et moments équilibrés à chaque transit${rot?`, sauf ${rot} position${rot>1?"s":""} signalée${rot>1?"s":""} comme rotation`:""}`)}
  {const k=AN.crux,x=AN.M[k],keep=SP.H;let a,b;
    try{SP.H=keep-15;a=m2Move(x).short||0;SP.H=keep+15;b=m2Move(x).short||0}finally{SP.H=keep}
    add("Effet de la taille",b<=a+.5?"ok":"bad",b<=a+.5?`au passage clé, 30 cm de plus ne rendent jamais la prise plus lointaine (${fr(a,1)} → ${fr(b,1)} cm manquants)`:"un grimpeur plus grand atteindrait moins bien la prise : incohérence")}
  // 4) Accord entre les deux modèles
  {const all=AN.CMP.flat(),ag=all.length?all.filter(c=>c.agree).length/all.length:1;
    add("Accord des deux modèles",ag>=.6?"ok":"warn",`${pcT(ag)} des verdicts concordent${ag<.6?" : désaccord élevé, appuie-toi sur la confiance apprise dans ton suivi":""}`)}
  return R;
}
