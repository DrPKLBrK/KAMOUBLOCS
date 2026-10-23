// CALIB (v29, amélioration 2.1) : tableau de bord de calibration. Générateur seulement.
// Dit si les deux outils deviennent plus justes avec le temps, à partir de ce que tu as réellement vécu :
//  1) l'écart entre le niveau estimé et ton ressenti, note après note (notes du générateur et du résolveur) ;
//  2) la part de blocages où la cause principale donnée par le résolveur était la bonne (blocages débloqués, « ce qui coinçait vraiment ») ;
//  3) quand les deux modèles divergent, lequel avait raison (désaccords tranchés : blocages débloqués et tests) ;
//  4) la justesse de la correspondance avec la cotation (grade.js).
// Rien n'est stocké : tout est relu dans tes notes et ton suivi à chaque affichage.
const CB_WIN=8,CB_MIN=30; // fenêtre de moyenne glissante ; nombre de notes à partir duquel la tendance est parlante
const CB_Q={reach:"Portée statique",tension:"Portée statique",load:"Main fixe",barn:"Rotation en porte",feet:"Pieds",grip:"Prise d'arrivée",dyn:"Lancer",catch:"Réception"};
function cbData(){
  const N=notes().slice().sort((a,b)=>a.ts-b.ts),H=(typeof hist==="function"?hist():[]).slice().sort((a,b)=>a.ts-b.ts);
  const err=N.map((t,i)=>({i:i+1,ts:t.ts,v:Math.abs(noteErr(t)),s:noteErr(t)}));
  const roll=(a,key)=>a.map((p,i)=>{const w=a.slice(Math.max(0,i-CB_WIN+1),i+1);return Object.assign({},p,{m:w.reduce((s,q)=>s+q[key],0)/w.length})});
  const cause=[];H.filter(e=>e.done&&e.truth&&!e.test&&(e.causes||[]).length&&CB_Q[e.causes[0]]).forEach(e=>cause.push({ts:e.ts,hit:e.truth.probs.includes(CB_Q[e.causes[0]])?1:0}));
  const mod=[];let a1=0,a2=0,n=0;
  H.filter(e=>e.truth&&e.cmp).forEach(e=>e.cmp.forEach(c=>{if(c.a===c.b)return;const real=e.truth.probs.includes(c.q);n++;a1+=c.a===real?1:0;a2+=c.b===real?1:0;mod.push({i:n,ts:e.ts,m1:a1/n,m2:a2/n,q:c.q})}));
  return{err:roll(err,"v"),cause:roll(cause.map((c,i)=>Object.assign({i:i+1},c)),"hit"),mod,nN:N.length,G:typeof gradeFit==="function"?gradeFit():null};
}
// Petit graphique en courbes (SVG), une seule échelle ; survol : point le plus proche.
function cbChart(id,pts,series,o){
  const W=CB_W,Hh=190,L=40,R=o.endLab?112:14,T=12,B=28,xs=pts.map(p=>p.i),x0=Math.min(...xs),x1=Math.max(...xs,x0+1),y1=o.ymax;
  const X=v=>L+(v-x0)/(x1-x0)*(W-L-R),Y=v=>T+(1-v/y1)*(Hh-T-B);
  let g="";for(const t of o.ticks)g+=`<line x1="${L}" x2="${W-R}" y1="${Y(t)}" y2="${Y(t)}" class="cbg"/><text x="${L-6}" y="${Y(t)+4}" text-anchor="end" class="cbt">${o.fmt(t)}</text>`;
  if(o.ref!=null)g+=`<line x1="${L}" x2="${W-R}" y1="${Y(o.ref)}" y2="${Y(o.ref)}" class="cbref"/><text x="${W-R}" y="${Y(o.ref)-5}" text-anchor="end" class="cbt">${o.refLab}</text>`;
  g+=`<text x="${(L+W-R)/2}" y="${Hh-4}" text-anchor="middle" class="cbt">${o.xlab}</text>`;
  series.forEach(s=>{const d=pts.map((p,i)=>`${i?"L":"M"}${X(p.i).toFixed(1)},${Y(Math.min(y1,p[s.k])).toFixed(1)}`).join("");g+=`<path d="${d}" class="cbl" style="stroke:var(${s.c})"/>`;
    const lp=pts[pts.length-1];g+=`<circle cx="${X(lp.i)}" cy="${Y(Math.min(y1,lp[s.k]))}" r="4" style="fill:var(${s.c})" class="cbdot"/>`;
    if(o.endLab)g+=`<text x="${X(lp.i)+8}" y="${Y(Math.min(y1,lp[s.k]))+4}" class="cbt cbe">${s.lab} ${o.fmt(lp[s.k])}</text>`});
  return`<div class="cbw" data-cb="${id}"><svg viewBox="0 0 ${W} ${Hh}" role="img" aria-label="${o.aria}">${g}<line class="cbx" x1="0" x2="0" y1="${T}" y2="${Hh-B}" visibility="hidden"/></svg><div class="cbtip" hidden></div></div>`;
}
function cbHover(root,id,pts,series,o){
  const w=root.querySelector(`[data-cb="${id}"]`);if(!w)return;const svg=w.querySelector("svg"),tip=w.querySelector(".cbtip"),cx=w.querySelector(".cbx");
  const W=CB_W,L=40,R=o.endLab?112:14,xs=pts.map(p=>p.i),x0=Math.min(...xs),x1=Math.max(...xs,x0+1);
  svg.onpointermove=e=>{const r=svg.getBoundingClientRect(),vx=(e.clientX-r.left)/r.width*W,v=x0+(vx-L)/(W-L-R)*(x1-x0);let p=pts[0];for(const q of pts)if(Math.abs(q.i-v)<Math.abs(p.i-v))p=q;
    const px=L+(p.i-x0)/(x1-x0)*(W-L-R);cx.setAttribute("x1",px);cx.setAttribute("x2",px);cx.setAttribute("visibility","visible");
    tip.hidden=false;tip.innerHTML=o.tip(p);const tx=px/W*r.width;tip.style.left=Math.min(r.width-170,Math.max(0,tx+10))+"px"};
  svg.onpointerleave=()=>{tip.hidden=true;cx.setAttribute("visibility","hidden")};
}
const cbF=(v,d)=>v.toFixed(d).replace(".",",");
let CB_W=640; // largeur réelle du panneau : le texte des graphiques garde sa taille sur téléphone comme sur ordinateur
function renderCalib(){
  const d=$("calib");if(!d)return;CB_W=Math.max(300,Math.min(900,(d.clientWidth||668)-28));const D=cbData(),fd=ts=>new Date(ts).toLocaleDateString("fr-FR",{day:"numeric",month:"short"});
  let h=`<h2>Tableau de bord de calibration</h2><p class="mut">Les outils deviennent-ils plus justes pour toi ? Tout vient de tes notes et de ton suivi du résolveur. Les tendances deviennent parlantes vers ${CB_MIN} blocs notés ; avant, lis-les comme des indications.</p>`;
  // tuiles
  const e=D.err,first=e.slice(0,Math.min(10,e.length)),last=e.slice(-Math.min(10,e.length)),avg=a=>a.reduce((s,p)=>s+p.v,0)/a.length;
  const c=D.cause,m=D.mod[D.mod.length-1],G=D.G;
  h+=`<div class="cbtiles">
    <div class="cbtile"><span>Écart estimé / ressenti</span><b>${e.length?cbF(avg(last),1):"–"}</b><small>${e.length>=12?`10 dernières notes · ${cbF(avg(first),1)} sur les 10 premières`:e.length?`sur ${e.length} note${e.length>1?"s":""}`:"aucune note"} (échelle 0 à 10)</small></div>
    <div class="cbtile"><span>Cause principale juste</span><b>${c.length?Math.round(100*c.reduce((s,p)=>s+p.hit,0)/c.length)+" %":"–"}</b><small>${c.length?`${c.length} blocage${c.length>1?"s":""} débloqué${c.length>1?"s":""}`:"aucun blocage débloqué avec détail"}</small></div>
    <div class="cbtile"><span>Désaccords tranchés</span><b>${m?D.mod.length:"–"}</b><small>${m?`générateur juste ${Math.round(m.m1*100)} % · second modèle ${Math.round(m.m2*100)} %`:"aucun pour l'instant"}</small></div>
    <div class="cbtile"><span>Cotation</span><b>${G&&G.res!=null?"± "+cbF(G.res,1):"–"}</b><small>${G&&G.n?`écart typique, en crans de cotation (6a → 6a+ = 1 cran), sur ${G.n} cotation${G.n>1?"s":""}`:"aucune cotation ressentie"}</small></div></div>`;
  const S1="--cb1",S2="--cb2";
  if(e.length>=3)h+=`<h4>Écart entre niveau estimé et ressenti</h4><p class="mut">Moyenne glissante sur ${CB_WIN} notes. Si la courbe descend, le générateur apprend bien. Repère : 1 point = la moitié d'un palier.</p>`+cbChart("err",e,[{k:"m",c:S1}],{ymax:Math.max(2.5,Math.ceil(Math.max(...e.map(p=>p.m))+.2)),ticks:[0,1,2],fmt:v=>cbF(v,1),ref:1,refLab:"1 point",xlab:"notes, de la plus ancienne à la plus récente",aria:"Écart moyen entre niveau estimé et ressenti au fil des notes"});
  else h+=`<p class="mut">Courbe de l'écart estimé / ressenti : à partir de 3 notes.</p>`;
  if(c.length>=3)h+=`<h4>Cause principale du résolveur : juste ?</h4><p class="mut">Part des blocages où la cause donnée en premier était l'une de celles que tu as cochées en débloquant (moyenne glissante sur ${CB_WIN}).</p>`+cbChart("cause",c,[{k:"m",c:S1}],{ymax:1,ticks:[0,.5,1],fmt:v=>Math.round(v*100)+" %",xlab:"blocages débloqués, dans l'ordre",aria:"Part de causes principales justes au fil des blocages"});
  if(D.mod.length>=3)h+=`<h4>Quand les modèles divergent, qui a raison ?</h4><p class="mut">Part cumulée de bonnes réponses sur les désaccords tranchés.</p><div class="cbleg"><span><i style="background:var(${S1})"></i>Moteur du générateur</span><span><i style="background:var(${S2})"></i>Second modèle</span></div>`+cbChart("mod",D.mod,[{k:"m1",c:S1,lab:"générateur"},{k:"m2",c:S2,lab:"second"}],{ymax:1,ticks:[0,.5,1],fmt:v=>Math.round(v*100)+" %",xlab:"désaccords tranchés, dans l'ordre",endLab:true,aria:"Part de bonnes réponses de chaque modèle sur les désaccords"});
  // données en tableau
  if(e.length||c.length||D.mod.length)h+=`<details class="cbdata"><summary>Voir les données</summary><div class="tw"><table class="inv"><thead><tr><th>Date</th><th>Mesure</th><th>Valeur</th></tr></thead><tbody>${[
    ...e.map(p=>[p.ts,"Note "+p.i,`écart ${p.s>0?"+":""}${cbF(p.s,1)} (moyenne ${cbF(p.m,1)})`]),
    ...c.map(p=>[p.ts,"Blocage "+p.i,p.hit?"cause juste":"cause fausse"]),
    ...D.mod.map(p=>[p.ts,"Désaccord "+p.i+" · "+p.q,`générateur ${Math.round(p.m1*100)} %, second ${Math.round(p.m2*100)} %`])].sort((a,b)=>b[0]-a[0]).slice(0,60).map(r=>`<tr><td>${fd(r[0])}</td><td>${esc(r[1])}</td><td>${esc(r[2])}</td></tr>`).join("")}</tbody></table></div></details>`;
  d.innerHTML=h;
  if(e.length>=3)cbHover(d,"err",e,[],{tip:p=>`<b>Note ${p.i}</b> · ${fd(p.ts)}<br>écart ${p.s>0?"+":""}${cbF(p.s,1)} · moyenne ${cbF(p.m,1)}`});
  if(c.length>=3)cbHover(d,"cause",c,[],{tip:p=>`<b>Blocage ${p.i}</b> · ${fd(p.ts)}<br>${p.hit?"cause juste":"cause fausse"} · moyenne ${Math.round(p.m*100)} %`});
  if(D.mod.length>=3)cbHover(d,"mod",D.mod,[],{endLab:true,tip:p=>`<b>Désaccord ${p.i}</b> · ${esc(p.q)}<br>générateur ${Math.round(p.m1*100)} % · second modèle ${Math.round(p.m2*100)} %`});
}
renderNotes=(function(base){return function(){base();renderCalib()}})(renderNotes);
window.addEventListener("storage",e=>{if(e.key==="solve_hist"||e.key===KEY.notes)renderCalib()});
window.addEventListener("resize",(()=>{let t=0,w=0;return()=>{clearTimeout(t);t=setTimeout(()=>{const d=$("calib");if(d&&Math.abs(d.clientWidth-w)>40){w=d.clientWidth;renderCalib()}},250)}})());
