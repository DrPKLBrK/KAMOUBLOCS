// SOLVER-UI : interface du résolveur (chargement du bloc, profil, choix du blocage, rapport, suivi).
const esc=t=>String(t==null?"":t).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const SEL={k:0,sym:new Set(),zoom:true};
let WMONLY=false; // ouvert seulement pour le mode pied du mur (depuis le mode grimpeur du générateur)
let CODE="",SRC="",DG=null,BID="",CUR=null;
const hashStr=t=>{let h=0;for(let i=0;i<t.length;i++)h=(h*31+t.charCodeAt(i))|0;return(h>>>0).toString(36)};

function loadCode(code){
  try{parseBlockCode(code)}catch(e){$("ldmsg").textContent="Ce texte n'est pas un code de bloc du générateur (il commence par GB1-).";return}
  try{localStorage.setItem("solve_in",code.trim())}catch(e){$("ldmsg").textContent="Le navigateur refuse l'enregistrement local : colle le code dans une fenêtre normale.";return}
  try{history.replaceState(null,"",location.pathname+location.search)}catch(e){}
  location.reload();
}

// ---------- Mur ----------
const Yc=y=>WALL.HM+2-y;
function rOf(){
  const hands=[],feet=[],seen=new Set();
  S.h0.forEach(x=>hands.push({n:x.h.n,x:x.o.x,y:x.o.y,rho:x.rho,role:"start"}));
  S.mv.forEach((m,k)=>{hands.push({n:m.h.n,x:m.o.x,y:m.o.y,rho:m.rho,role:k===S.mv.length-1?"finish":"hand",ord:k+1});if(m.pair)hands.push({n:m.pair.h.n,x:m.pair.o.x,y:m.pair.o.y,rho:m.pair.rho,role:"hand",ord:k+1})});
  [S.f0,...S.mv.map(m=>m.ft)].forEach(l=>l.forEach(q=>{if(seen.has(q.o.id)||hands.some(h=>h.x===q.o.x&&h.y===q.o.y))return;seen.add(q.o.id);feet.push({n:q.h.n,x:q.o.x,y:q.o.y,rho:q.rho||0})}));
  return{hands,feet};
}
function drawSolveWall(){
  const svg=$("wall"),x=AN.M[SEL.k],pts=[],ring=(o,cls,r)=>{pts.push(o);return`<circle class="${cls}" cx="${o.x}" cy="${Yc(o.y)}" r="${r||9}"/>`};
  let ov="";
  x.pre.ft.forEach(q=>ov+=ring(q.o,"rg-foot",7.5));
  ov+=ring(x.fixed.o,"rg-fix",9.5);
  const a=x.prev.o,b=x.m.o;pts.push(a);
  ov+=`<line class="mvline" x1="${a.x}" y1="${Yc(a.y)}" x2="${b.x}" y2="${Yc(b.y)}" marker-end="url(#ah)"/>`;
  ov+=ring(b,"rg-tgt",11);if(x.m.pair)ov+=ring(x.m.pair.o,"rg-tgt",11);
  if(DG&&DG.fs){const c=DG.fs.c.o;if(DG.fs.old)ov+=`<line class="ftline" x1="${DG.fs.old.o.x}" y1="${Yc(DG.fs.old.o.y)}" x2="${c.x}" y2="${Yc(c.y)}" marker-end="url(#ah2)"/>`;ov+=ring(c,"rg-sug",8.5)}
  const hp=x.hpX;pts.push(hp);ov+=`<g class="hip"><circle cx="${hp.x}" cy="${Yc(hp.y)}" r="5"/><text x="${hp.x}" y="${Yc(hp.y)+15}" text-anchor="middle">bassin</text></g>`;
  const defs=`<defs><marker id="ah" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse"><path d="M0,0L10,5L0,10z" fill="var(--ac)"/></marker><marker id="ah2" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse"><path d="M0,0L10,5L0,10z" fill="var(--ok)"/></marker></defs>`;
  svg.innerHTML=defs+wallSVG(rOf())+ov;
  if(SEL.zoom){const xs=pts.map(p=>p.x),ys=pts.map(p=>Yc(p.y));let x0=Math.min(...xs)-45,x1=Math.max(...xs)+45,y0=Math.min(...ys)-40,y1=Math.max(...ys)+40;
    const w=Math.max(220,x1-x0),h=Math.max(200,y1-y0),cx=(x0+x1)/2,cy=(y0+y1)/2;svg.setAttribute("viewBox",`${f1(cx-w/2)} ${f1(cy-h/2)} ${f1(w)} ${f1(h)}`)}
  else svg.setAttribute("viewBox",vbFor("all"));
  document.querySelectorAll("[data-zoom]").forEach(b=>b.setAttribute("aria-pressed",String((b.dataset.zoom==="1")===SEL.zoom)));
}

// ---------- En-tête du bloc ----------
function renderHead(){
  const n=S.mv.length,crux=AN.crux,H=fr(SP.H/100,2);
  $("bmeta").innerHTML=`${SRC==="sample"?'<span class="pill pill-ex">Exemple</span> ':""}${B.seed?`Graine <b>${esc(B.seed)}</b> · `:""}${n} mouvements · ${esc(MVN[B.style]||B.style)} · ${esc(KINDN[B.kind]||"parcours")} · ${esc(WALL.name)}`;
  const lv=(t,v,sub)=>`<div class="lv"><span>${t}</span><b>${svLab(v)}</b><small>${fr(v,1)} / 10${sub?" · "+sub:""}</small></div>`;
  const gT=gradeTxt(AN.idx),gB=gradeOf(B.level),gq=GRF.personal?"":" (provisoire)";
  let h=lv("Niveau du générateur",B.level,refLabel()+` · ≈ ${gB}${gq}`)+lv(`Pour toi (${H} m)`,AN.idx,(LEARN.n?`ajusté par tes ${LEARN.n} notes`:"envergure "+fr(SP.ape/100,2))+` · ≈ ${gT.g}${gq}`)+
    `<div class="lv"><span>Passage clé pour toi</span><b>Mouvement ${crux+1}</b><small>${esc(stepTitle(crux))}</small></div>`;
  const all=AN.CMP.flat(),ag=all.filter(c=>c.agree).length,dis=AN.CMP.map((l,k)=>l.some(c=>!c.agree)?k+1:0).filter(Boolean);
  const ck=AN.CHK,nb=ck.filter(c=>c.st==="bad").length,nw=ck.filter(c=>c.st==="warn").length;
  $("chk").innerHTML=`<summary>Vérifications automatiques : <b class="${nb?"tbad":nw?"twarn":"tok"}">${ck.length-nb-nw} sur ${ck.length} validées${nw?` · ${nw} à savoir`:""}${nb?` · ${nb} en échec`:""}</b></summary><ul class="chkl">${ck.map(c=>`<li><span class="pill ${c.st==="ok"?"pill-ok":c.st==="warn"?"pill-warn":"pill-bad"}">${c.st==="ok"?"validé":c.st==="warn"?"à savoir":"échec"}</span><b>${esc(c.name)}</b><span class="mut">${esc(c.detail)}</span></li>`).join("")}</ul>`;
  if(nb)$("chk").open=true;
  h+=`<div class="lv"><span>Accord des deux modèles</span><b>${all.length?pcT(ag/all.length):"–"}</b><small>${dis.length?`désaccord aux mouvements ${dis.join(", ")}`:"aucun désaccord"}</small></div>`;
  $("levels").innerHTML=h;
  const hd=AN.hard;$("feas").innerHTML=hd.length?`<div class="banner bad"><b>À ta morphologie, le modèle juge ce bloc infaisable tel quel.</b><ul>${hd.slice(0,3).map(t=>`<li>${esc(t)}</li>`).join("")}</ul><span>Le rapport cherche les variantes de pieds et de méthode qui contournent ces points.</span></div>`:"";
}
const deIt=t=>/^une? /.test(t)?"d'"+t:/^le /.test(t)?"du "+t.slice(3):/^les /.test(t)?"des "+t.slice(4):"de "+t;
function stepTitle(k){const L=(B.lines||[]).filter(l=>!/^\s/.test(l));return(L[k+1]||`Mouvement ${k+1}`).replace(/ · .*$/,"")}

// ---------- Choix du blocage ----------
function renderPick(){
  const max=Math.max(...AN.M.map(x=>x.cost));
  $("moves").innerHTML=AN.M.map((x,k)=>`<button type="button" data-k="${k}" aria-pressed="${k===SEL.k}" title="${esc(stepTitle(k))}"><span>${k+1}</span><i style="height:${Math.round(18*x.cost/max)+3}px"></i>${k===AN.crux?'<em>clé</em>':""}</button>`).join("");
  $("moves").querySelectorAll("[data-k]").forEach(b=>b.onclick=()=>{SEL.k=+b.dataset.k;update()});
  $("syms").innerHTML=Object.entries(SYM).map(([k,v])=>`<button type="button" class="chip" data-s="${k}" aria-pressed="${SEL.sym.has(k)}">${v}</button>`).join("");
  $("syms").querySelectorAll("[data-s]").forEach(b=>b.onclick=()=>{const s=b.dataset.s;SEL.sym.has(s)?SEL.sym.delete(s):SEL.sym.add(s);update()});
}

// ---------- Rapport ----------
function report(){
  const k=SEL.k,x=AN.M[k],m=x.m;DG=diagnose(AN,k,SEL.sym);
  const rk=AN.rank[k],tags=[];
  tags.push(rk===1?'<span class="pill pill-key">Passage le plus dur du bloc</span>':`<span class="pill">${rk}e plus dur sur ${AN.M.length}</span>`);
  (m.tech||[]).forEach(t=>tags.push(`<span class="pill">${esc(techName(t))}</span>`));
  const hk=AN.hard.filter(t=>t.indexOf("Mouvement "+(k+1)+" ")===0||t.indexOf("Mouvement "+(k+1)+" :")===0),sk=AN.soft.filter(t=>t.indexOf("Mouvement "+(k+1)+" ")===0).slice(0,2);
  let h=`<header class="rh"><p class="eyebrow">Rapport · mouvement ${k+1} sur ${AN.M.length}</p><h2>${esc(stepTitle(k))}</h2><div class="pills">${tags.join("")}</div></header>`;
  if(hk.length)h+=`<div class="banner bad">${hk.map(t=>`<p>${esc(t.replace(/^Mouvement \d+( \(transit\))? : /,""))}</p>`).join("")}</div>`;
  // causes
  const CMP=AN.CMP[k],T=trustTable(),MC=mergeCauses(DG,CMP,x,SEL.sym),C=MC.filter(c=>c.score>=.2).slice(0,3);
  const trustTag=c=>!c.dis?"":c.trust?`<span class="pill ${c.trust==="m1"?"pill-ok":"pill-sym"}">chez toi, le ${c.trust==="m1"?"moteur du générateur":"second modèle"} est le plus fiable ici</span>`:'<span class="pill pill-warn">incertain : les deux modèles divergent</span>';
  h+=`<section><h3>Pourquoi ça coince</h3>`;
  if(C.length)h+=`<ol class="causes">${C.map(c=>`<li><div class="ch"><b>${esc(CAUSEN[c.id])}</b><span class="meter" aria-label="poids ${Math.round(c.score*100)} sur 100"><i style="width:${Math.round(c.score*100)}%"></i></span>${c.sym?'<span class="pill pill-sym">ton ressenti</span>':""}${c.weak?'<span class="pill pill-weak">point faible déclaré</span>':""}${c.src==="m2"?'<span class="pill">vu par le second modèle</span>':""}${trustTag(c)}</div><p>${esc(c.why)}</p></li>`).join("")}</ol>`;
  else{const P=partsTxt(x);h+=`<p class="mut">Aucun point mécanique saillant à ta taille. Ce qui pèse le plus dans ce mouvement : ${P.map(p=>`${p.lab} (${pcT(p.p)})`).join(", ")}.</p>`}
  DG.miss.forEach(s=>{if(MISS[s])h+=`<p class="note">« ${esc(SYM[s])} » : ${esc(MISS[s])}</p>`});
  h+=`</section>`;
  // essais
  const F=fixesOf({C:MC},workedCount()),fc=DG.fs?m2CheckFeet(x,DG.fs):null;CUR={k,C,F,CMP};
  if(F.length)h+=`<section><h3>À essayer, dans cet ordre</h3><ol class="fixes">${F.map(f=>`<li><span>${esc(f.t)}${f.key==="foot"&&fc?` <span class="pill ${fc.ok?"pill-ok":"pill-warn"}">${fc.ok?"confirmé par le second modèle":"non confirmé par le second modèle"}</span>${fc.ok&&fc.g.length?`<span class="mut"> (${esc(fc.g.join(", "))})</span>`:""}`:""}${f.won?` <span class="pill pill-ok">a déjà marché pour toi${f.won>1?" ×"+f.won:""}</span>`:""}</span></li>`).join("")}</ol></section>`;
  // contre-expertise
  const ag=CMP.filter(c=>c.agree).length,det=SP.detail!=="ess";
  if(!det){const D=CMP.filter(c=>!c.agree);
    h+=`<section><h3>Contre-expertise</h3><p>Le second modèle concorde sur <b>${ag} point${ag>1?"s":""} sur ${CMP.length}</b>${CMP.some(c=>c.agree&&c.a)?` (problème confirmé : ${CMP.filter(c=>c.agree&&c.a).map(c=>esc(c.q.toLowerCase())).join(", ")})`:""}.</p>${D.length?`<ul class="cmpl">${D.map(c=>{const w=trustWho(c.q,T);return`<li><b>${esc(c.q)}</b> : générateur « ${esc(c.ta)} », second modèle « ${esc(c.tb)} ». <span class="mut">${esc(w.txt)}</span> ${testCell(c,k,x)}${TESTQ===c.q?`<table class="cmp"><tbody>${testRow(c,k,x)}</tbody></table>`:""}</li>`}).join("")}</ul>`:""}</section>`}
  else h+=`<section><h3>Contre-expertise</h3><p class="mut">Un second modèle, construit autrement (posture en 3D, équilibre complet des forces et des moments, frottement des pieds, cône de tenue de chaque prise), relit le même mouvement. Il concorde sur ${ag} point${ag>1?"s":""} sur ${CMP.length}.${CMP.some(c=>!c.agree)?" Là où ils divergent, le résolveur s'appuie sur celui qui a eu raison le plus souvent chez toi, d'après tes blocages débloqués.":""}</p>
    <div class="tw"><table class="cmp"><thead><tr><th>Question</th><th>Moteur du générateur</th><th>Second modèle</th><th>Verdict</th></tr></thead><tbody>${CMP.map(c=>{const w=c.agree?null:trustWho(c.q,T);return`<tr><td><b>${esc(c.q)}</b></td><td>${esc(c.ta)}</td><td>${esc(c.tb)}</td><td>${c.agree?`<span class="pill ${c.a?"pill-bad":"pill-ok"}">${c.a?"problème confirmé":"concordant"}</span>`:`<span class="pill pill-warn">désaccord</span><div class="mut">${w.who?"S'appuyer sur : ":""}${esc(w.txt)}</div>${testCell(c,k,x)}`}</td></tr>${TESTQ===c.q&&!c.agree?testRow(c,k,x):""}`}).join("")}</tbody></table></div></section>`;
  // prises et pieds
  const w=x.feetPre.length?x.feetPre.reduce((a,b)=>a.fq.stab<=b.fq.stab?a:b):null;
  h+=`<section><h3>Prises et pieds</h3><dl class="kv">`+
    `<dt>Arrivée n°${m.h.n}</dt><dd>${esc(m.h.type)} · tenue ${m.h.grip}/5${m.h.dep>0?" · "+esc(measTxt(m.h)):""} · ${m.rho}°. ${esc(gripTech(m.h))}</dd>`+
    (m.pair?`<dt>Arrivée n°${m.pair.h.n}</dt><dd>${esc(m.pair.h.type)} · tenue ${m.pair.h.grip}/5. ${esc(gripTech(m.pair.h))}</dd>`:"")+
    (x.fixed.h.fam!==m.h.fam||x.fixed.h.grip>=3?`<dt>Main fixe n°${x.fixed.h.n}</dt><dd>${esc(x.fixed.h.type)} · tenue ${x.fixed.h.grip}/5. ${esc(gripTech(x.fixed.h))}</dd>`:"")+
    (w?`<dt>Pied n°${w.q.h.n}</dt><dd>${esc(w.q.h.type)} · ${w.fq.kind==="adherence"?"adhérence":w.fq.kind}. ${esc(FOOTT[w.fq.kind])}</dd>`:"")+`</dl></section>`;
  // logique d'ouverture
  h+=`<section><h3>Logique d'ouverture</h3><p>L'ouvreur a construit ce mouvement autour ${intentOf(x).map(deIt).map(esc).join(", et autour ")}.</p></section>`;
  // vigilance
  const N=(AN.v3.notes||[]).filter(n=>n.k===k).map(n=>Object.assign({sens:SP.sens.includes(n.j)},n)).sort((a,b)=>(b.sens-a.sens)||(a.lvl==="alerte"?-1:1)).slice(0,3);
  if(N.length||sk.length){h+=`<section><h3>Vigilance</h3><ul class="safe">`+N.map(n=>{const i=n.txt.indexOf(" : "),sm=esc(i>0?n.txt.slice(0,i):n.txt.slice(0,110));return`<li><div class="ch"><b>${esc(JOINTS[n.j]||n.j)}</b><span class="pill ${n.lvl==="alerte"?"pill-bad":"pill-warn"}">${n.lvl}</span>${n.sens?'<span class="pill pill-weak">zone sensible</span>':""}</div>${det?`<details><summary>${sm}</summary><p>${esc(n.txt)}</p></details>`:`<p>${sm}</p>`}</li>`}).join("")+
    sk.map(t=>`<li><p class="mut">${esc(t.replace(/^Mouvement \d+( \(transit\))? : /,""))}</p></li>`).join("")+`</ul></section>`}
  // mesures
  const P=partsTxt(x),me=[];
  if(!x.pair)me.push(["Distance",`${Math.round(x.d)} cm · ${pcT(x.rr)} de ta portée`]);
  if(!x.pair&&!AN.camp)me.push(["Main fixe",`${pcT(x.share)} du poids pendant le transit`]);
  me.push(["Axe de traction",x.f==null?"prise tirée hors de son axe utile":`${Math.round(x.err)}° d'écart · facteur ${fr(x.f,1)}`]);
  if(x.D&&x.D.need>0)me.push(["Lancer",`${Math.round(x.D.need)} cm à gagner · ${pcT(x.D.ratio)} de ta détente · réception ${fr(x.D.impact,1)} × poids`]);
  if(x.minStab!=null)me.push(["Pied le plus faible",`stabilité ${Math.round(x.minStab*100)} / 100`]);
  me.push(["Ce qui pèse",P.map(p=>`${p.lab} ${pcT(p.p)}`).join(" · ")]);
  if(det)h+=`<section><h3>Mesures du moteur du générateur</h3><dl class="kv kv-num">${me.map(([a,b])=>`<dt>${a}</dt><dd>${esc(b)}</dd>`).join("")}</dl></section>`;
  else h+=`<p class="mut">Rapport essentiel : passe en « Détaillé » pour les mesures, la contre-expertise point par point et les textes anatomiques complets.</p>`;
  $("report").innerHTML=h;
}
function reportText(){
  const k=SEL.k,x=AN.M[k],F=CUR.F,L=[];
  L.push(`RÉSOLVEUR · ${B.seed?"bloc "+B.seed+" · ":""}mouvement ${k+1}/${AN.M.length} · ${stepTitle(k)}`);
  L.push(`Grimpeur : ${fr(SP.H/100,2)} m, envergure ${fr(SP.ape/100,2)} · niveau pour toi ${svLab(AN.idx)} (${fr(AN.idx,1)}) · générateur ${svLab(B.level)} (${fr(B.level,1)})`);
  if(SEL.sym.size)L.push("Ressenti : "+[...SEL.sym].map(s=>SYM[s]).join(", "));
  L.push("","Pourquoi ça coince :");CUR.C.forEach(c=>L.push(`- ${CAUSEN[c.id]}${c.src==="m2"?" (second modèle)":""} : ${c.why}`));
  if(F.length){L.push("","À essayer :");F.forEach((f,i)=>L.push(`${i+1}. ${f.t}`))}
  L.push("","Logique d'ouverture : "+intentOf(x).join(" ; "));
  L.push("","Contre-expertise (second modèle) :");AN.CMP[k].forEach(c=>L.push(`- ${c.q} : générateur « ${c.ta} » / second modèle « ${c.tb} » → ${c.agree?(c.a?"problème confirmé":"concordant"):"désaccord, "+trustWho(c.q).txt}`));
  return L.join("\n");
}

// ---------- Tests ciblés ----------
let TESTQ=null;
const testDone=(q,k)=>hist().find(e=>e.test&&e.bid===BID&&e.k===k&&e.q===q);
function testCell(c,k,x){const d=testDone(c.q,k);return d?`<div class="mut">Testé : ${d.truth.probs.length?"problème confirmé":"pas de problème"} · <button type="button" class="lnk" data-tq="${esc(c.q)}">refaire</button></div>`:`<button type="button" class="lnk" data-tq="${esc(c.q)}">Trancher par un test</button>`}
function testRow(c,k,x){const T=testFor(c.q,x);if(!T)return"";return`<tr class="trow"><td colspan="4"><div class="tbox"><p>${esc(T.t)}</p><div class="racts"><button type="button" data-tr="1">${esc(T.yes)}</button><button type="button" data-tr="0">${esc(T.no)}</button><button type="button" class="lnk" data-tr="x">Annuler</button></div><p class="mut">Le résultat compte comme un désaccord tranché : il entre dans « Sur qui s'appuyer » et ajuste les réglages du modèle qui s'est trompé.</p></div></td></tr>`}
function bindTests(){
  document.querySelectorAll("[data-tq]").forEach(b=>b.onclick=()=>{TESTQ=TESTQ===b.dataset.tq?null:b.dataset.tq;report();bindTests()});
  document.querySelectorAll("[data-tr]").forEach(b=>b.onclick=()=>{const v=b.dataset.tr;if(v!=="x"){const k=SEL.k,c=AN.CMP[k].find(z=>z.q===TESTQ);
    histAdd({ts:Date.now(),bid:BID,k,test:true,q:TESTQ,title:`Test · ${TESTQ} · mouvement ${k+1}`,cmp:[{q:c.q,a:c.a,b:c.b}],hn:AN.M[k].m.h.n,truth:{probs:v==="1"?[TESTQ]:[],fix:null},done:true});
    TESTQ=null;afterHist();$("savemsg").textContent="Test enregistré."}else{TESTQ=null;report();bindTests()}});
}
function afterHist(){calReplay();refresh();renderHist()}

// ---------- Tout le bloc ----------
function renderAll(){
  const max=Math.max(...AN.M.map(x=>x.cost));
  $("all").innerHTML=AN.M.map((x,k)=>{const al=(AN.v3.notes||[]).filter(n=>n.k===k),hard=AN.hard.some(t=>t.indexOf("Mouvement "+(k+1)+" ")===0||t.indexOf("Mouvement "+(k+1)+" :")===0);
    return`<tr data-k="${k}" class="${k===SEL.k?"on":""}"><td class="num">${k+1}</td><td>${esc(stepTitle(k))}${(x.m.tech||[]).length?`<div class="mut">${x.m.tech.map(techName).map(esc).join(" · ")}</div>`:""}</td><td class="barc"><span class="meter"><i style="width:${Math.round(100*x.cost/max)}%"></i></span></td><td>${hard?'<span class="pill pill-bad">infaisable</span>':""}${al.some(n=>n.lvl==="alerte")?'<span class="pill pill-bad">alerte</span>':al.length?'<span class="pill pill-warn">vigilance</span>':""}${k===AN.crux?'<span class="pill pill-key">clé</span>':""}${AN.CMP[k].some(c=>!c.agree)?`<span class="pill pill-warn">désaccord ×${AN.CMP[k].filter(c=>!c.agree).length}</span>`:""}</td></tr>`}).join("");
  $("all").querySelectorAll("tr").forEach(tr=>tr.onclick=()=>{SEL.k=+tr.dataset.k;update();$("wallp").scrollIntoView({behavior:matchMedia("(prefers-reduced-motion:reduce)").matches?"auto":"smooth"})});
}

// ---------- Suivi et confiance ----------
let OPEN=null; // blocage dont le formulaire « débloqué » est ouvert
function renderHist(){
  const a=hist().filter(e=>!e.test).reverse(),P=patterns(),T=trustTable(),nt=hist().filter(e=>e.test).length;
  let h=P.length?`<div class="banner info"><b>Constante chez toi</b>${P.slice(0,2).map(([c,v])=>`<p>${esc(CAUSEN[c])} revient dans ${v} blocages non résolus : ${esc(PATT[c]||"")}.</p>`).join("")}</div>`:"";
  h+=a.length?`<ul class="hist">${a.slice(0,8).map(e=>{const form=OPEN===e.ts?histForm(e):"";
    return`<li class="${e.done?"done":""}"><div class="hrow"><span><b>${esc(e.title)}</b><small>${new Date(e.ts).toLocaleDateString("fr-FR",{day:"2-digit",month:"2-digit"})} · ${(e.causes||[]).map(c=>CAUSEN[c]).join(", ")||"sans cause marquée"}${e.tries?" · "+e.tries+" essai"+(e.tries>1?"s":""):""}${e.truth?" · "+(e.truth.probs.length?"vraie cause : "+e.truth.probs.join(", "):"aucune des cinq questions"):""}</small></span>
    <span class="acts">${e.done?`<button type="button" data-hr="${e.ts}">Rouvrir</button>`:`<button type="button" data-hd="${e.ts}">Débloqué</button>`}<button type="button" class="x" data-hx="${e.ts}" aria-label="Supprimer ce blocage">×</button></span></div>${form}</li>`}).join("")}</ul>`
    :'<p class="mut">Rien d\'enregistré. Après un rapport, « Garder dans mon suivi » note le blocage. Quand tu le passes, « Débloqué » te demande ce qui coinçait vraiment : c\'est ce qui apprend au résolveur sur quel modèle s\'appuyer.</p>';
  // fiabilité
  const rows=QS.map(q=>{const t=T[q],w=trustWho(q,T);return`<tr><td>${esc(q)}</td><td class="n">${t.dn}</td><td class="n">${t.d1}</td><td class="n">${t.d2}</td><td>${w.who?`<span class="pill ${w.who==="m1"?"pill-ok":"pill-sym"}">${w.who==="m1"?"générateur":"second modèle"}</span>`:'<span class="mut">pas encore tranché</span>'}</td></tr>`}).join("");
  h+=`<h4 class="sub4">Sur qui s'appuyer chez toi</h4><div class="tw"><table class="trust"><thead><tr><th>Question</th><th class="n">Désaccords tranchés</th><th class="n">Générateur juste</th><th class="n">Second modèle juste</th><th>À suivre</th></tr></thead><tbody>${rows}</tbody></table></div>
    <p class="mut">Un modèle est désigné quand au moins ${TRUST.min} désaccords sont tranchés sur une question et qu'il a raison nettement plus souvent que l'autre.${nt?` Dont ${nt} test${nt>1?"s":""} ciblé${nt>1?"s":""}.`:""}</p>`;
  const cl=calText();
  h+=`<h4 class="sub4">Ce que tes essais ont corrigé</h4>${cl.length?`<ul class="cal">${cl.map(t=>`<li>${esc(t)}</li>`).join("")}</ul>`:`<p class="mut">${SP.calOff?"Corrections désactivées.":"Rien pour l'instant : chaque blocage débloqué ou test tranché décale d'un petit pas les réglages du modèle qui s'est trompé."}</p>`}
    <label class="sw2"><input type="checkbox" id="calon" ${SP.calOff?"":"checked"}> Appliquer ces corrections aux deux modèles</label>`;
  $("hist").innerHTML=h;
  $("hist").querySelectorAll("[data-hd]").forEach(b=>b.onclick=()=>{OPEN=+b.dataset.hd;renderHist()});
  $("hist").querySelectorAll("[data-hr]").forEach(b=>b.onclick=()=>{const l=hist(),e=l.find(q=>String(q.ts)===b.dataset.hr);if(e){e.done=false;delete e.truth}ss(SVH_KEY,l);afterHist()});
  $("hist").querySelectorAll("[data-hx]").forEach(b=>b.onclick=()=>{ss(SVH_KEY,hist().filter(q=>String(q.ts)!==b.dataset.hx));afterHist()});
  $("calon").onchange=e=>{SP.calOff=!e.target.checked;saveProf();afterHist()};
  const f=$("hform");if(f){
    f.onsubmit=ev=>{ev.preventDefault();const l=hist(),e=l.find(q=>q.ts===OPEN);if(!e)return;
      const probs=[...f.querySelectorAll("input[name=q]:checked")].map(i=>i.value),fx=(f.querySelector("input[name=fx]:checked")||{}).value||"";
      e.done=true;e.truth={probs,fix:fx&&fx!=="autre"?fx:null};const rt=$("hrate").value;if(rt!=="")e.noted=noteToGen(e,+rt,$("hfont").value||null);ss(SVH_KEY,l);OPEN=null;afterHist()};
    $("hcancel").onclick=()=>{OPEN=null;renderHist()};
    $("hnodet").onclick=()=>{const l=hist(),e=l.find(q=>q.ts===OPEN);if(e){e.done=true;delete e.truth}ss(SVH_KEY,l);OPEN=null;renderHist()};
  }
}
function histForm(e){
  const cmp=e.cmp||[],fx=e.fixes||[];
  return`<form class="hform" id="hform"><p><b>Qu'est-ce qui coinçait vraiment ?</b> Coche ce que tu as dû corriger pour passer.</p>
  <div class="chks">${QS.map((q,i)=>{const c=cmp.find(z=>z.q===q);return`<label><input type="checkbox" name="q" value="${esc(q)}" id="hq${i}"> ${esc(q)}${c&&!c.agree&&c.a!==c.b?' <span class="pill pill-warn">les modèles divergeaient</span>':""}</label>`}).join("")}</div>
  ${fx.length?`<p><b>Ce qui a marché</b></p><div class="chks">${fx.map((f,i)=>`<label><input type="radio" name="fx" value="${esc(f.key)}" id="hf${i}"> ${esc(f.t.length>110?f.t.slice(0,108)+"…":f.t)}</label>`).join("")}<label><input type="radio" name="fx" value="autre" id="hfo"> Une autre méthode</label></div>`:""}
  <label class="f" for="hrate"><span><b>Noter aussi ce bloc dans le générateur</b> (son apprentissage en tiendra compte, ce mouvement compté comme passage le plus dur)</span>
    <select id="hrate"><option value="">Ne pas noter</option>${NOTE_N.map((t,i)=>`<option value="${i}">${t}</option>`).join("")}</select></label>
  <label class="f" for="hfont"><span>Cotation ressentie du bloc (facultatif, sert à la correspondance avec la cotation)</span>
    <select id="hfont"><option value="">Pas d'avis</option>${FONT.map(g=>`<option>${g}</option>`).join("")}</select></label>
  <div class="racts"><button type="submit" class="pri">Enregistrer</button><button type="button" id="hnodet">Débloqué, sans détail</button><button type="button" id="hcancel">Annuler</button></div>
  ${cmp.length?"":'<p class="mut">Ce blocage a été enregistré avant la contre-expertise : il compte comme débloqué mais n\'apprend rien sur les modèles.</p>'}</form>`;
}

// ---------- Profil ----------
function renderProf(){
  $("pH").value=SP.H;$("pA").value=SP.ape;
  const ape=()=>`${fr(SP.ape/100,2)} · envergure ${Math.round(SP.H*SP.ape/100)} cm`;$("pAv").textContent=ape();$("pHv").textContent=fr(SP.H/100,2)+" m";
  $("profsum").textContent=`${fr(SP.H/100,2)} m · ${ape()}${SP.weak.length?" · "+SP.weak.length+" point"+(SP.weak.length>1?"s":"")+" faible"+(SP.weak.length>1?"s":""):""}${SP.sens.length?" · zones sensibles : "+SP.sens.map(s=>SENS[s].toLowerCase()).join(", "):""}`;
  const chips=(id,M,arr)=>{$(id).innerHTML=Object.entries(M).map(([k,v])=>`<button type="button" class="chip" data-v="${k}" aria-pressed="${arr.includes(k)}">${v}</button>`).join("");
    $(id).querySelectorAll("[data-v]").forEach(b=>b.onclick=()=>{const v=b.dataset.v,i=arr.indexOf(v);i>=0?arr.splice(i,1):arr.push(v);saveProf();renderProf();refresh()})};
  chips("pW",WEAK,SP.weak);chips("pS",SENS,SP.sens);
}
let tmr=0;
function bindProf(){
  const on=()=>{SP.H=clamp(+$("pH").value||170,140,205);SP.ape=clamp(+$("pA").value||100,92,110);saveProf();renderProf();clearTimeout(tmr);tmr=setTimeout(refresh,250)};
  $("pH").oninput=on;$("pA").oninput=on;
}

// ---------- Cycle ----------
function analyze(){AN=svAnalyze();AN.R2=AN.M.map(x=>m2Move(x));AN.CMP=AN.M.map((x,k)=>m2Compare(x,AN.R2[k],diagnose(AN,k,new Set())));AN.CHK=runChecks()}
function refresh(){analyze();renderHead();update()}
function update(){renderPick();report();bindTests();drawSolveWall();renderAll();$("savemsg").textContent=""}

function init(){
  const boot=window.SV_BOOT||{};CODE=boot.code;SRC=boot.src;
  replay();
  try{B=parseBlockCode(CODE);S=svBuild(B)}catch(e){$("app").hidden=true;$("err").hidden=false;$("err").textContent=e.message;bindLoad();return}
  if(SRC!=="sample")ss("solve_last",CODE);
  BID=B.seed||hashStr(CODE);
  if(!ls(SVP_KEY,null)&&blockClimber()){SP.H=Math.round(blockClimber().H);SP.ape=Math.round((blockClimber().ape||1)*100)} // même grimpeur que le profil du générateur
  calReplay();analyze();SEL.k=AN.crux;
  renderProf();bindProf();bindNotes();renderHead();update();renderHist();bindLoad();bindBackup();
  // mode pied du mur demandé depuis le mode grimpeur du générateur : il s'ouvre seul, et le fermer ramène au générateur
  try{WMONLY=localStorage.getItem("solve_wm")==="1";localStorage.removeItem("solve_wm")}catch(e){}
  // wallmode.js est chargé après ce fichier : on attend qu'il soit là avant d'ouvrir
  if(WMONLY){document.documentElement.classList.add("wmonly");let n=0;const go=()=>{if(typeof wmOpen==="function")wmOpen();else if(n++<100)setTimeout(go,30)};go()}
  if(window.SV_EMBED)$("togen").hidden=true;
  else{const t=$("togen"),g=ls("gen_page",null);if(typeof g==="string"&&/\.html?$/i.test(g))t.href=encodeURIComponent(g);
    // ouvert depuis le générateur (nouvel onglet) : on y revient au lieu d'ouvrir une deuxième copie
    t.onclick=e=>{try{if(window.opener&&!window.opener.closed){e.preventDefault();window.opener.focus();window.close()}}catch(_){}}}
  if(!ls(SVP_KEY,null))$("prof").open=true;
  if(SRC==="sample")$("ld").open=true;
  document.querySelectorAll("[data-zoom]").forEach(b=>b.onclick=()=>{SEL.zoom=b.dataset.zoom==="1";drawSolveWall()});
  $("copy").onclick=()=>{const t=reportText(),m=$("savemsg");(navigator.clipboard?navigator.clipboard.writeText(t):Promise.reject()).then(()=>m.textContent="Rapport copié.",()=>{$("copyta").hidden=false;$("copyta").value=t;$("copyta").select();m.textContent="Copie bloquée ici : le texte est sélectionné ci-dessous."})};
  $("keep").onclick=()=>{keepCur();renderHist();$("savemsg").textContent="Ajouté à ton suivi."};
  bindRmode();
}
// Ajoute le mouvement affiché au suivi (bouton « Garder », ou premier essai compté au pied du mur).
function keepCur(extra){const e=Object.assign({ts:Date.now(),bid:BID,k:SEL.k,title:`${B.seed?"Bloc "+B.seed:"Bloc"} · mouvement ${SEL.k+1}`,sym:[...SEL.sym],causes:CUR.C.slice(0,2).map(c=>c.id),
    cmp:CUR.CMP.map(c=>({q:c.q,a:c.a,b:c.b})),fixes:CUR.F.map(f=>({key:f.key,t:f.t})),hn:AN.M[SEL.k].m.h.n,done:false},extra||{});histAdd(e);return e}
// Rapport essentiel ou détaillé (4.6), et accès au mode pied du mur (4.2, wallmode.js).
function bindRmode(){const d=$("rmode");if(!d)return;const draw=()=>d.querySelectorAll("[data-rm]").forEach(b=>b.setAttribute("aria-pressed",String((SP.detail==="ess"?"ess":"det")===b.dataset.rm)));
  d.querySelectorAll("[data-rm]").forEach(b=>b.onclick=()=>{SP.detail=b.dataset.rm==="ess"?"ess":"det";saveProf();draw();report();bindTests()});draw();
  const w=$("wmopen");if(w)w.onclick=()=>wmOpen()}
// ---------- Notes du générateur (même stockage) ----------
function renderNotesImp(){
  $("nstat").textContent=LEARN.n?`${LEARN.n} note${LEARN.n>1?"s":""} du générateur lue${LEARN.n>1?"s":""} directement : décalage général ${LEARN.g>0?"+":""}${fr(LEARN.g,1)}, ${Object.keys(LEARN.a).filter(k=>Math.abs(LEARN.a[k])>.01).length} prises ajustées. Ton niveau « pour toi » en tient compte.`:"Aucune note dans le générateur pour l'instant : le niveau « pour toi » n'intègre pas encore ton ressenti. Tu peux noter un bloc depuis le générateur, ou depuis ce résolveur quand tu marques un blocage débloqué.";
}
function bindNotes(){renderNotesImp()}
// Crée une note au format du générateur (Notes et apprentissage) pour le bloc du blocage e ; renvoie son identifiant.
function noteToGen(e,rating,font){
  if(!B||e.bid!==BID)return null;
  const hands=[...S.h0.map(x=>({n:x.h.n})),...S.mv.flatMap((m,k)=>[{n:m.h.n,ord:k+1},...(m.pair?[{n:m.pair.h.n,ord:k+1}]:[])])];
  const id=B.created||("sv_"+BID),t={id,ts:Date.now(),rating,comment:"Noté depuis le résolveur (mouvement "+(e.k+1)+" débloqué)",idx:B.level,mv:B.style,kind:B.kind,
    hands:[...new Set(hands.map(x=>x.n))],block:{hands,src:"solveur"},crux:e.k,key:B.key==null?null:B.key,code:CODE,font:font||null};
  ss(KEY.notes,notes().filter(x=>x.id!==id).concat([t]).slice(-300));replay();renderNotesImp();return id;
}
// ---------- Blocs sauvegardés dans le générateur (même stockage) ----------
function savedBlocks(){
  const out=[],walls=[WALL_DEFAULT,...customWalls()];
  for(let i=0;i<localStorage.length;i++){
    const key=localStorage.key(i);if(!/^blocs4/.test(key))continue;
    const wid=key.indexOf("@")>0?key.slice(key.indexOf("@")+1):WALL_DEFAULT.id,w=walls.find(x=>x.id===wid);if(!w)continue;
    ls(key,[]).forEach((r,j)=>{if(!r||!r.seq)return;
      const hs={};(r.place||[]).forEach(p=>{const h=byN(p.n);if(h)hs[p.n]={name:h.type,w:h.w,h:h.h,fam:h.fam,grip:h.grip,slo:!!h.slo}});
      const o={app:"generateur-blocs",format:1,ver:BC_VER,seed:r.seed||null,created:r.id||null,level:r.idx,kind:r.kind,style:r.mv,key:r.key?r.key.k:null,climber:r.climber||null,cal:r.cal||null,
        wall:{id:w.id,name:w.name,pitch:w.pitch||20,joints:(w.joints||[]).slice(),panels:w.panels.map(p=>({id:p.id,name:p.name,w:p.w,h:p.h,tilt:p.tilt||0}))},holds:hs,seq:r.seq,lines:r.lines||[],notes:[]};
      out.push({label:`Bloc ${j+1} · ${svLab(r.idx)} · ${KINDN[r.kind]||""}${w.id!==WALL_DEFAULT.id?" · "+w.name:""}`,code:"GB1-"+b64u(JSON.stringify(o))});
    });
  }
  return out;
}
// ---------- Sauvegarde commune aux deux outils (4.1, 5.1) ----------
function bindBackup(){
  const m=t=>{$("bkmsg2").textContent=t};
  $("bkcopy2").onclick=async()=>{const t=backupAll();try{await navigator.clipboard.writeText(t);m("Sauvegarde copiée ("+Math.round(t.length/1024)+" Ko). Colle-la dans une note ou un message à toi-même, puis restaure-la sur l'autre appareil.")}catch(e){$("bkpaste2").value=t;$("bkpaste2").select();m("Copie automatique refusée : le texte est sélectionné dans le champ ci-dessous, copie-le à la main.")}};
  $("bkfile").onclick=()=>{try{const t=backupAll(),d=new Date(),n="sauvegarde-kamoublocs-"+d.toISOString().slice(0,10)+".json",a=document.createElement("a");a.href=URL.createObjectURL(new Blob([t],{type:"application/json"}));a.download=n;document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove()},800);m("Fichier « "+n+" » proposé au téléchargement. Si rien ne se passe (version en ligne), utilise « Copier la sauvegarde ».")}catch(e){m("Enregistrement impossible ici : utilise « Copier la sauvegarde ».")}};
  const go=t=>{const e=restoreAll(String(t||"").trim());if(e){m(e);return}m("Sauvegarde restaurée, rechargement…");setTimeout(()=>location.reload(),600)};
  $("bkgo2").onclick=()=>go($("bkpaste2").value);
  $("bkin").onchange=e=>{const f=e.target.files[0];if(!f)return;const r=new FileReader();r.onload=()=>go(r.result);r.readAsText(f)};
}
function bindLoad(){
  const sv=savedBlocks();
  $("saved").innerHTML=sv.length?sv.map((b,i)=>`<button type="button" data-sv="${i}">${esc(b.label)}</button>`).join(""):"";
  $("saved").querySelectorAll("[data-sv]").forEach(b=>b.onclick=()=>loadCode(sv[+b.dataset.sv].code));
  $("ldgo").onclick=()=>loadCode($("ldcode").value);
  $("ldfile").onchange=e=>{const f=e.target.files[0];if(!f)return;const r=new FileReader();r.onload=()=>{const t=String(r.result).trim();loadCode(t.indexOf("GB1-")===0?t:"GB1-"+b64u(t))};r.readAsText(f)};
}
init();
