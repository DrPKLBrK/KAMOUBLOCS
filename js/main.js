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
[["apprentissage",replay],["goûts",prefReplay],["thème",applyTheme],["personnalisation",edInit],["bandeau",buildBar],["menus",refreshMenus],["réglages",buildSettings],["murs",buildWallTabs],["ouverture",bindOpening],["benchmark",bindBench],["mode",syncMode],["favoris",renderFavs],["notes",renderNotes],["note du bloc",renderRate],["goûts (affichage)",renderTaste]].forEach(([n,f])=>boot(n,f));
boot("boutons",()=>{
  $("save").onclick=()=>{if(!cur)return;ss(KEY.favs,[...favs(),cur]);if(!voteOf(cur))votePref(cur,1);renderFavs();renderRate();renderTaste()};
  $("opensolve").onclick=()=>openSolver(null);
});
boot("mur",()=>drawWall(null));boot("premier bloc",()=>generate());
bootReport();setTimeout(bootReport,2500);
