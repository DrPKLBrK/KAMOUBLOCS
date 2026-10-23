// MAIN : démarrage.
// Chaque étape est isolée (v29) : si l'une échoue dans un navigateur, les suivantes s'exécutent quand même
// (avant, une seule erreur empêchait la génération du premier bloc et laissait la page à moitié vide),
// et le message d'erreur s'affiche en haut de la page pour pouvoir le signaler.
const BOOT_ERR=[];
function boot(name,fn){try{fn()}catch(e){BOOT_ERR.push(name+" : "+(e&&e.message||e));console.error(name,e)}}
function bootReport(){
  const E=BOOT_ERR.concat(window.__gbErrs||[]);if(!E.length)return;
  let d=document.getElementById("booterr");if(!d){d=document.createElement("div");d.id="booterr";d.className="devwarn";d.setAttribute("role","alert");const p=document.getElementById("page")||document.body;p.insertBefore(d,p.firstChild)}
  d.innerHTML=`<b>Une partie de la page n'a pas pu s'afficher dans ce navigateur.</b> Le reste fonctionne. Envoie une capture de ce message pour que je corrige :<br><small>${E.map(t=>String(t).replace(/[&<>]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;"}[c]))).join("<br>")}<br>Navigateur : ${navigator.userAgent.replace(/[<>]/g,"")}</small>`;
}
[["apprentissage",replay],["goûts",prefReplay],["thème",applyTheme],["mode expert",applyExpert],["personnalisation",edInit],["bandeau",buildBar],["menus",refreshMenus],["réglages",buildSettings],["murs",buildWallTabs],["ouverture",bindOpening],["benchmark",bindBench],["mode",syncMode],["favoris",renderFavs],["notes",renderNotes],["note du bloc",renderRate],["goûts (affichage)",renderTaste]].forEach(([n,f])=>boot(n,f));
boot("boutons",()=>{
  // « Blocs sauvegardés » est replié : le bouton confirme lui-même la sauvegarde
  $("save").onclick=()=>{if(!cur)return;ss(KEY.favs,[...favs(),cur]);if(!voteOf(cur))votePref(cur,1);renderFavs();renderRate();renderTaste();
    const b=$("save");b.textContent="✓ Sauvegardé ("+favs().length+")";clearTimeout(b._t);b._t=setTimeout(()=>{b.textContent="Sauvegarder ce bloc"},2500)};
  $("cbprint").onclick=()=>window.print();
  // panneaux repliables (v41) : ouvert ou fermé, retenu d'une fois sur l'autre
  document.querySelectorAll("details.fold[data-k]").forEach(d=>{d.open=ls(d.dataset.k,false)===true;d.addEventListener("toggle",()=>ss(d.dataset.k,d.open))});
  // plan de montage : masquer les prises déjà posées
  const hp=$("hideposed");if(hp){hp.checked=ls("hideposed",false)===true;const ap=()=>$("mont").classList.toggle("hideposed",hp.checked);ap();hp.onchange=()=>{ss("hideposed",hp.checked);ap()}}
  // en-tête du bloc : ouvert ou replié, mémorisé pour la prochaine fois
  const md=$("metd");if(md)md.addEventListener("toggle",()=>{if(cur)ss("metopen",md.open)});
  // lexique : toucher un mot en pointillé affiche son explication juste en dessous (le survol ne marche pas au doigt)
  // l'explication va à la fin de la ligne (et non au milieu de la phrase) ; retoucher le même mot la referme
  const glTog=a=>{const box=a.closest(".t,.s")||a.parentElement,old=[...box.children].find(x=>x.classList.contains("glpop"));
    if(old){const same=old.textContent===a.title;old.remove();if(same)return}
    const p=document.createElement("span");p.className="glpop";p.textContent=a.title;box.appendChild(p)};
  document.addEventListener("click",e=>{const a=e.target.closest&&e.target.closest("abbr.gl");if(a)glTog(a)});
  document.addEventListener("keydown",e=>{const a=e.target.closest&&e.target.closest("abbr.gl");if(a&&(e.key==="Enter"||e.key===" ")){e.preventDefault();glTog(a)}});
});
boot("mur",()=>drawWall(null));boot("premier bloc",()=>{if(typeof hasShareHash==="function"&&hasShareHash())openShared().then(ok=>{if(!ok)generate()});else generate()});
// lien de partage collé dans un onglet déjà ouvert : seule l'ancre change, la page ne se recharge pas
window.addEventListener("hashchange",()=>{if(typeof hasShareHash==="function"&&hasShareHash()){const m=document.getElementById("sharemsg");if(m)m.remove();openShared()}});
// note enregistrée depuis le résolveur ouvert dans un autre onglet (« Bloc enchaîné ! » au pied du mur) : la barre « Ton essai » se met à jour
window.addEventListener("storage",e=>{if(e.key===KEY.notes){try{replay();renderNotes();renderRate()}catch(_){}}});
bootReport();setTimeout(bootReport,2500);
