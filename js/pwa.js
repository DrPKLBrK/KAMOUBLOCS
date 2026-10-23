// PWA (v29) : version installable de l'outil (appli web), pour la tablette.
// Quand la page est servie en ligne (https), elle enregistre un service worker (sw.js) qui garde tous les fichiers sur l'appareil :
// l'outil s'ouvre et fonctionne sans réseau. Quand une nouvelle version est publiée, elle est téléchargée en arrière-plan
// et un bandeau propose de l'utiliser. Rien ne se passe pour le fichier unique ni pour le dossier ouvert depuis l'ordinateur.
(function(){
  if(!("serviceWorker" in navigator)||!/^https?:$/.test(location.protocol)||(/^(localhost|127\.)/.test(location.hostname)&&localStorage.getItem("pwa_test")!=="1")||window.parent!==window)return;
  // demande au navigateur de garder les données (notes, suivi) même quand la place manque
  try{if(navigator.storage&&navigator.storage.persist)navigator.storage.persisted().then(p=>{if(!p)navigator.storage.persist()})}catch(e){}
  function banner(reg){
    if(document.getElementById("pwaup"))return;
    const d=document.createElement("div");d.id="pwaup";d.setAttribute("role","status");
    d.style.cssText="position:fixed;left:12px;right:12px;bottom:12px;z-index:99990;display:flex;gap:10px;align-items:center;justify-content:space-between;flex-wrap:wrap;padding:12px 14px;border-radius:10px;background:#0a6d78;color:#fff;font:16px/1.4 system-ui,sans-serif;box-shadow:0 4px 16px rgba(0,0,0,.25)";
    d.innerHTML='<span>Nouvelle version de KAMOUBLOCS disponible.</span><button type="button" style="min-height:44px;padding:0 16px;border:0;border-radius:8px;background:#fff;color:#0a6d78;font-weight:700">Mettre à jour</button>';
    d.querySelector("button").onclick=()=>{if(reg.waiting)reg.waiting.postMessage("skip")};
    document.body.appendChild(d);
  }
  let reloading=false;
  navigator.serviceWorker.addEventListener("controllerchange",()=>{if(reloading)return;reloading=true;location.reload()});
  window.addEventListener("load",()=>{
    navigator.serviceWorker.register("sw.js").then(reg=>{
      if(reg.waiting&&navigator.serviceWorker.controller)banner(reg);
      reg.addEventListener("updatefound",()=>{const w=reg.installing;if(!w)return;w.addEventListener("statechange",()=>{if(w.state==="installed"&&navigator.serviceWorker.controller)banner(reg)})});
      // vérifie s'il y a une nouvelle version à chaque retour sur l'appli
      document.addEventListener("visibilitychange",()=>{if(document.visibilityState==="visible")reg.update().catch(()=>{})});
    }).catch(()=>{});
  });
})();
