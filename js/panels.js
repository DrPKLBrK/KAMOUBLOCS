// PANELS : tout ce qui s'affiche autour du mur (puces de résumé, déroulé, plan de montage, contrôle V3).
const lab=i=>(LVL.find(l=>i<l[2])||LVL[LVL.length-1])[0];
let cur=null,mountSort='n'; // bloc affiché, tri du plan de montage
const imgOf=n=>imgSrc(n);
const esc=t=>String(t).replace(/[&<>]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;"}[c]));
// Met en forme une ligne du déroulé : numéros de prise en gras, étiquettes pour dynamique / croisé.
const TAGS="dynamique|croisé|drapeau|blocage|opposition|tirage latéral|compression d'angle|rétablissement|crochet de talon|crochet de pointe";
// Petit lexique : survol (ordinateur) ou toucher (téléphone) d'un mot souligné en pointillé pour son explication.
const GLOSS={"tcheck":"Tcheck : poser la deuxième main sur la prise d'arrivée, ce qui valide le bloc.","dynamique":"Mouvement lancé : on attrape la prise en élan, sans pouvoir s'arrêter en route.","croisé":"Croisé : la main passe par-dessus ou par-dessous l'autre bras pour attraper la prise.","drapeau":"Drapeau : une jambe tendue sans appui, sur le côté, pour faire contrepoids.","blocage":"Blocage : bras plié et verrouillé pendant que l'autre main va chercher loin.","opposition":"Opposition : mains ou pieds qui poussent ou tirent en sens contraires.","tirage latéral":"Tirage latéral : on tire la prise sur le côté plutôt que vers le bas.","compression d'angle":"Compression : on serre entre deux prises ou deux pans, comme pour étreindre le mur.","rétablissement":"Rétablissement : passer de la traction à la poussée sur la prise, main à plat.","crochet de talon":"Crochet de talon : le talon posé sur une prise tire le corps vers le mur.","crochet de pointe":"Crochet de pointe : le dessus du pied accroche une prise pour retenir le corps."};
const ANGLE_TIP="Rotation de la prise à visser : 0° = comme sur sa photo, puis sens anti-horaire.";
const gl=(w,txt)=>GLOSS[w]?`<abbr class="gl" title="${GLOSS[w]}" tabindex="0">${txt||w}</abbr>`:(txt||w);
const fmt=t=>esc(t).replace(/, (\d+)°\)/g,(_,d)=>`, <abbr class="gl" title="${ANGLE_TIP}" tabindex="0">${d}°</abbr>)`).replace(/\btcheck\b/g,()=>gl("tcheck")).replace(/n°(\d+)/g,'<b class="hn">n°$1</b>').replace(new RegExp(" · ((?:"+TAGS+")(?:, (?:"+TAGS+"))*)$"),(_,a)=>a.split(", ").map(x=>' <span class="tg">'+gl(x)+'</span>').join("")).replace(new RegExp(", ("+TAGS+")$"),(_,x)=>' <span class="tg">'+gl(x)+'</span>');
function seqHtml(lines,kk){
  const out=[];let c=null,k=0;
  lines.forEach(t=>{if(t.startsWith("  ")){if(c)c.sub.push(t.trim())}else{c={t,sub:[],i:k++};out.push(c)}});
  return out.map(x=>`<li class="st${x.i===kk?" key":""}"><span class="bd">${x.i===0?"D":x.i}</span><div><div class="t">${fmt(x.t)}${x.i===kk?' <span class="tg key">passage clé</span>':""}</div>${x.sub.map(s=>`<div class="s">${fmt(s)}</div>`).join("")}</div></li>`).join("");
}
const panIdx=id=>WALL.panels.findIndex(p=>p.id===id);
function mountHtml(place){
  const a=place.slice().sort(mountSort==='n'?(p,q)=>p.n-q.n:(p,q)=>(panIdx(p.pan)-panIdx(q.pan))||p.r-q.r||p.c-q.c);
  return a.map((p,i)=>`<li><label class="mt"><input type="checkbox" data-i="${i}" data-n="${p.n}" data-hid="${p.hid}" data-rho="${p.rho}"${(posedMap()[p.n]||{}).hid===p.hid?" checked":""}><span class="th"><img src="${imgOf(p.n)}" alt="" style="transform:rotate(${-p.rho}deg)"></span><span class="tx"><b>n°${p.n}</b> ${esc(p.type)}${p.foot?' <span class="tg">pied</span>':""}<small>${WALL.panels.length>1?"pan "+esc((WALL.panels.find(q=>q.id===p.pan)||{}).name)+" · ":""}colonne ${p.c} · rangée ${p.r} · rotation ${p.rho}°</small></span></label></li>`).join("");
}
function updProg(){const b=document.querySelectorAll("#mont input"),n=[...b].filter(x=>x.checked).length;$("prog").textContent=b.length?`${n} / ${b.length} posées`:""}
function renderMount(){
  const mo=$("mont");mo.innerHTML=cur?mountHtml(cur.place):"";
  mo.querySelectorAll("input").forEach(i=>i.onchange=()=>{setPosed(+i.dataset.n,+i.dataset.hid,+i.dataset.rho,i.checked);updProg();if(CFG.multi)drawWall(cur)});updProg();
  document.querySelectorAll("[data-sort]").forEach(b=>b.setAttribute("aria-pressed",String(b.dataset.sort===mountSort)));
}
function show(r){
  cur=r;pendingRate=null;drawWall(r);
  const m=$("met"),q=$("seq"),v=$("v3"),vs=$("v3sum");
  $("save").disabled=!r;
  if(!r){
    if(typeof renderCodeBar==='function')renderCodeBar(null);
    m.innerHTML='<span class="err">Aucun bloc trouvé avec ces réglages. Élargis le niveau, change de style, de zone ou réactive des prises.</span>';
    q.innerHTML="";$("mont").innerHTML="";$("prog").textContent="";v.innerHTML="";vs.textContent="";if(typeof renderRate==='function')renderRate();return;
  }
  const chip=(k,t)=>`<span class="chip"><i>${k}</i>${t}</span>`;
  m.innerHTML=chip("Niveau",lab(r.idx))+(typeof gradeTxt==="function"?(g=>`<span class="chip" title="${esc(g.note)}"><i>Cotation</i>≈ ${g.g}${GRF&&GRF.personal?"":" ?"}</span>`)(gradeTxt(r.idx)):"")+chip("Parcours",KINDN[r.kind])+chip("Mouvement",MVN[r.mv])+chip("Prises",HSN[r.hs])+chip("Mains",r.moves+" mouvements")+(r.key?chip("Passage clé","mouvement "+(r.key.k+1)):"")+chip("Lancers",r.dy)+chip("Croisés",r.cr)+(r.techs&&Object.keys(r.techs).some(k=>!["dyno","dyno2","croise"].includes(k))?chip("Gestes",Object.entries(r.techs).filter(([k])=>!["dyno","dyno2","croise"].includes(k)).map(([k,v])=>techName(k)+(v>1?" ×"+v:"")).join(", ")):"")+chip("Étalement",r.span.w+" × "+r.span.h+" cm")+(r.note?`<span class="err">${esc(r.note)}</span>`:"");
  q.innerHTML=seqHtml(r.lines,r.key?r.key.k+1:-1);
  if(typeof renderCodeBar==='function')renderCodeBar(r);
  renderMount();if(typeof renderRate==='function')renderRate();
  if(r.v3)renderAna(r,vs,v);
}

// Contrôle de faisabilité : analyse articulaire (anatomy.js) + points d'équilibre et d'appuis (physics.js).
function renderAna(r,vs,v){
  const w=[...new Set(r.v3.soft)],nt=r.v3.notes||[],by={};
  nt.forEach(n=>(by[n.j]=by[n.j]||[]).push(n));
  const tot=nt.length+w.length,al=nt.filter(n=>n.lvl==="alerte").length;
  const cnt=Object.keys(JOINTS).filter(j=>by[j]).map(j=>`${JOINTS[j].split(" (")[0].toLowerCase()} ${by[j].length}`).join(", ");
  vs.textContent=`${r.v3.n} positions vérifiées · ${tot?tot+" point"+(tot>1?"s":"")+" à surveiller"+(cnt?" ("+cnt+")":""):"rien à signaler"}`;
  let h=`<p>Le bloc a été simulé position après position pour ${PROF.on?"un grimpeur de "+(PROF.H/100).toFixed(2).replace(".",",")+" m (envergure "+PROF.ape.toFixed(2).replace(".",",")+", souplesse "+PROF.flex.toFixed(2).replace(".",",")+", force des doigts "+PROF.force.toFixed(2).replace(".",",")+")":"un petit (1,50 m) et un grand (1,90 m) grimpeur"}. Les mouvements impossibles ou dangereux sont écartés d'office. Ce qui reste est analysé articulation par articulation : voici ce qui sera le plus sollicité. Marge d'équilibre : <b>${Math.round(Math.max(-99,r.v3.margin)*100)} %</b> (plus c'est haut, plus c'est confortable).</p>`;
  h+=Object.keys(JOINTS).map(j=>{
    const l=by[j];
    return `<div class="ana"><h4>${JOINTS[j]} <span class="cnt${l?"":" zero"}">${l?l.length:"RAS"}</span></h4>${l?"<ul>"+l.map(n=>`<li><div class="anah"><b>Mouvement ${n.k+1}</b> · <span class="mut">${esc(n.sizes)}</span> <span class="lv ${n.lvl}">${n.lvl==="alerte"?"Alerte":"Vigilance"}</span></div>${esc(n.txt)}</li>`).join("")+"</ul>":'<p class="mut">Rien de particulier sur ce bloc.</p>'}</div>`;
  }).join("");
  const dn=r.v3.dyns||[];if(dn.length){const by2={};dn.forEach(d=>{const o=by2[d.k];if(!o||d.ratio>o.ratio)by2[d.k]=d});
    h+=`<div class="ana"><h4>Lancers (trajectoire du bassin) <span class="cnt">${Object.keys(by2).length}</span></h4><ul>${Object.values(by2).map(d=>`<li><div class="anah"><b>Mouvement ${d.k+1}</b> · <span class="mut">cas le plus exigeant : ${esc(d.sz)}</span></div>${d.need>0?`Saut de ${Math.round(d.need)} cm au-delà de la portée : ${Math.round(d.ratio*100)} % de la détente maximale, temps de vol ${d.t.toFixed(2).replace(".",",")} s, réception à environ ${d.impact.toFixed(1).replace(".",",")} fois le poids du corps.`:"Dans la portée du bras : mouvement dynamique sans saut."}</li>`).join("")}</ul></div>`}
  if(w.length)h+=`<div class="ana"><h4>Équilibre, appuis et réceptions <span class="cnt">${w.length}</span></h4><ul>${w.slice(0,10).map(t=>`<li>${esc(t)}</li>`).join("")}</ul></div>`;
  h+=`<p class="mut">${al?`<b>${al} alerte${al>1?"s":""}</b> : à aborder avec prudence. `:""}Ces indications sont des estimations biomécaniques de tendance, pas un avis médical : échauffe-toi bien (doigts et épaules), progresse par étapes et arrête-toi à la moindre douleur articulaire.</p>`;
  v.innerHTML=h;
}
