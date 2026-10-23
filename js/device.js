// DEVICE (v29, amélioration 2.3) : précautions pour tablette et téléphone (testé en émulation Android, Chrome).
//  - Vérifie que le navigateur enregistre bien les données pour cette page. Sur Android, un fichier .html ouvert depuis le
//    gestionnaire de fichiers peut recevoir une adresse « content:// » où l'enregistrement est refusé ou effacé à la fermeture :
//    on prévient au lieu de laisser perdre notes et suivi.
//  - Demande au navigateur de garder ces données (stockage persistant), pour qu'il ne les efface pas quand la place manque.
(function(){
  let ok=true;try{const k="__gb_probe",v=String(Date.now());localStorage.setItem(k,v);ok=localStorage.getItem(k)===v;localStorage.removeItem(k)}catch(e){ok=false}
  const proto=location.protocol;
  if(!ok||proto==="content:"){const d=document.createElement("div");d.className="devwarn";d.setAttribute("role","alert");
    d.innerHTML=`<b>Attention : ce navigateur n'enregistre pas les données de cette page${proto==="content:"?" (fichier ouvert depuis le gestionnaire de fichiers)":""}.</b> Tes notes, ton suivi et tes séances risquent d'être perdus à la fermeture. Utilise plutôt la version en ligne, ou ouvre le fichier directement dans Chrome, et fais régulièrement une « Sauvegarde complète » (Réglages avancés → Affichage).`;
    const p=document.getElementById("page");(p||document.body).insertBefore(d,(p||document.body).firstChild)}
  try{if(ok&&navigator.storage&&navigator.storage.persist)navigator.storage.persisted().then(p=>{if(!p)navigator.storage.persist()}).catch(()=>{})}catch(e){}
})();
