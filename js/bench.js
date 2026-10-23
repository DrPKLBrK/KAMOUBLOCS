// BENCHMARK : audite le générateur sur un lot de blocs (50 par défaut) et affiche des métriques chiffrées :
// taux de réussite, validation biomécanique des séquences, écart avec tes notes réelles, diversité des parcours.
// Le lot n'altère ni l'historique de variété, ni la carte de chaleur, ni les notes (ils sont restaurés à la fin).
const BENCH_KEY="bench5"+WSUF,BENCH_HIST_KEY="benchh5"+WSUF;
// Historique des lots : sert de référence (taux moyen de réussite « en général »).
const benchHist=()=>ls(BENCH_HIST_KEY,[]);
const benchAvg=(h,k)=>h.length?h.reduce((a,x)=>a+(x[k]||0),0)/h.length:0;
function benchRefHtml(r){
  const h=benchHist();if(!h.length)return"";
  const m=Math.round(benchAvg(h,"rate")),v=Math.round(benchAvg(h,"candRate")),c=Math.round(benchAvg(h,"clean")),a=benchAvg(h,"aimAbs"),d=r.rate-m;
  const tot=h.reduce((t,x)=>t+x.N,0);
  return `<div class="tune"><h4>Référence : moyenne de tous tes lots</h4><p>Taux moyen de réussite de génération : <b>${m} %</b> sur ${h.length} lot${h.length>1?"s":""} (${tot} blocs demandés). Ce lot : <b>${r.rate} %</b> (${d>=0?"+":""}${d} point${Math.abs(d)>1?"s":""} par rapport à ta moyenne). Séquences validées en moyenne : ${v} % · blocs sans alerte : ${c} % · écart estimé/visé absolu moyen : ${a.toFixed(1)}.</p>${h.length<3?`<p class="mut">Moins de 3 lots : la moyenne n'est pas encore fiable.</p>`:""}<div class="row"><button id="bhreset">Remettre la référence à zéro</button></div></div>`;
}
let benchCancel=false;
const pct=(a,b)=>b?Math.round(100*a/b):0;
const avg=a=>a.length?a.reduce((x,y)=>x+y,0)/a.length:0;
const countBy=(a,f)=>{const o={};a.forEach(x=>{const k=f(x);if(k!=null)o[k]=(o[k]||0)+1});return o};
// Demande d'un bloc du lot : « large » = tous niveaux et styles, répartis régulièrement ; « cfg » = réglages actuels du bandeau.
function benchReq(mode,i,n){
  if(mode==="cfg")return makeReq();
  const tgt=.7+(i+Math.random())/n*8.6;
  const zs=Object.keys(ZONEN);
  return{tgt,t:clamp((tgt-1)/8,0,1),mv:"surprise",hs:"mix",surp:true,pool:MVS,hsPool:["crimp","sloper","pinch","arc"],zone:Math.random()<.6?"all":pick(zs),len:null,lancers:true};
}
// Résume un bloc généré (on ne garde que ce qui sert aux statistiques).
const benchSum=(r,c,ms)=>({ms,tgt:c.tgt,idx:r.idx,kind:r.kind,mv:r.mv,moves:r.moves,
  holds:[...new Set([...r.hands,...r.feet].map(x=>x.n))],
  pans:r.hands.map(x=>panelAt(x.x).id),rho:r.hands.map(x=>Math.round(x.rho/45)%8*45),
  notes:(r.v3.notes||[]).map(n=>({j:n.j,lvl:n.lvl})),soft:r.v3.soft.length});
function benchReport(items,fails,stat,mode,ms){
  const N=items.length+fails,ok=items;
  const rep={ts:Date.now(),mode,N,okN:ok.length,rate:pct(ok.length,N),
    cand:stat.cand,candOk:stat.ok,candRate:pct(stat.ok,stat.cand),
    why:Object.entries(stat.why).sort((a,b)=>b[1]-a[1]).slice(0,5),
    clean:pct(ok.filter(x=>!x.notes.length&&!x.soft).length,ok.length),
    alertBlocks:pct(ok.filter(x=>x.notes.some(n=>n.lvl==="alerte")).length,ok.length),
    ms:Math.round(ms/Math.max(1,N)),
    aim:{signed:avg(ok.map(x=>x.idx-x.tgt)),abs:avg(ok.map(x=>Math.abs(x.idx-x.tgt)))},
    kinds:countBy(ok,x=>x.kind),mvs:countBy(ok,x=>x.mv),
    levels:countBy(ok,x=>LVL.find(l=>x.idx<l[2])?LVL.find(l=>x.idx<l[2])[0]:LVL[LVL.length-1][0]),
    pans:countBy(ok.flatMap(x=>x.pans),p=>p),rho:countBy(ok.flatMap(x=>x.rho),r=>r+"°"),
    joints:countBy(ok.flatMap(x=>[...new Set(x.notes.map(n=>n.j))]),j=>j),
    moves:avg(ok.map(x=>x.moves))};
  const used=countBy(ok.flatMap(x=>x.holds),n=>n),act=holds.filter(h=>h.on).length;
  rep.cover={used:Object.keys(used).length,active:act};
  rep.top=Object.entries(used).sort((a,b)=>b[1]-a[1]).slice(0,3).map(([n,c])=>[+n,c]);
  const ks=Object.values(rep.kinds),K=Math.max(2,WALL.joints.length?5:4),tot=ks.reduce((a,b)=>a+b,0);
  rep.entropy=tot?Math.round(100*-ks.reduce((a,c)=>a+(c/tot)*Math.log(c/tot),0)/Math.log(K)):0;
  // comparaison avec tes notes d'essai (cases de rétroaction) : ressenti - estimation, sur l'échelle 0-10
  const nt=notes();
  rep.notes={n:nt.length,signed:avg(nt.map(noteErr)),abs:avg(nt.map(t=>Math.abs(noteErr(t)))),
    byMv:Object.entries(nt.reduce((o,t)=>{(o[t.mv]=o[t.mv]||[]).push(noteErr(t));return o},{})).map(([k,v])=>[k,avg(v),v.length]).filter(x=>x[2]>=2).sort((a,b)=>Math.abs(b[1])-Math.abs(a[1])).slice(0,4)};
  return rep;
}
function benchRunAsync(n,mode,onProg){
  return new Promise(res=>{
    const hist=localStorage.getItem(KEY.hist),heat=localStorage.getItem(KEY.heat),items=[];let fails=0,i=0;
    STAT.on=true;STAT.cand=0;STAT.ok=0;STAT.why={};
    const t0=Date.now();
    const done=()=>{
      STAT.on=false;
      try{hist==null?localStorage.removeItem(KEY.hist):localStorage.setItem(KEY.hist,hist);heat==null?localStorage.removeItem(KEY.heat):localStorage.setItem(KEY.heat,heat)}catch(e){}
      res(benchReport(items,fails,{cand:STAT.cand,ok:STAT.ok,why:{...STAT.why}},mode,Date.now()-t0));
    };
    const step=()=>{
      if(benchCancel||i>=n){done();return}
      const c=benchReq(mode,i,n),t1=Date.now();let r=null;
      try{r=gen(c)}catch(e){console.error(e)}
      if(r)items.push(benchSum(r,c,Date.now()-t1));else fails++;
      i++;onProg(i,n);setTimeout(step,0);
    };
    step();
  });
}
// ---------- Affichage ----------
const barsHtml=(o,lab,total)=>{
  const e=Object.entries(o).sort((a,b)=>b[1]-a[1]),t=total||e.reduce((s,x)=>s+x[1],0)||1;
  return e.length?e.map(([k,v])=>`<div class="bar"><span>${esc(lab(k))}</span><div class="bv"><i style="width:${Math.round(100*v/t)}%"></i></div><b>${v} · ${pct(v,t)} %</b></div>`).join(""):'<p class="mut">Aucune donnée.</p>';
};
const kpi=(v,l,sub,cls)=>`<div class="kpi ${cls||""}"><b>${v}</b><span>${l}</span><small>${sub||""}</small></div>`;
function benchVerdict(r){
  const v=[];
  if(r.rate<85)v.push(["bad",`Taux de réussite de génération bas (${r.rate} %) : élargis les niveaux, réactive des prises ou change de zone.`]);
  if(r.candRate<40)v.push(["warn",`Seulement ${r.candRate} % des séquences candidates passent le contrôle biomécanique : le générateur travaille beaucoup pour peu de blocs valides (motif principal ci-dessous).`]);
  const mk=Object.entries(r.kinds);if(mk.length<(WALL.joints.length?4:3))v.push(["warn","Peu de types de parcours différents dans ce lot : la diversité est faible."]);
  const rare=mk.filter(([,c])=>c/r.okN<.05).map(([k])=>KINDN[k]);if(rare.length)v.push(["warn","Types de parcours rares (< 5 %) : "+rare.join(", ")+"."]);
  if(r.cover.used<.6*r.cover.active)v.push(["warn",`Seulement ${r.cover.used} prises utilisées sur ${r.cover.active} actives : une partie du stock dort.`]);
  if(r.notes.n>=5&&Math.abs(r.notes.signed)>.8)v.push(["warn",`Tes ${r.notes.n} notes montrent un biais moyen de ${sgn(r.notes.signed)} : les blocs sont ressentis ${r.notes.signed>0?"plus durs":"plus faciles"} que l'estimation. L'apprentissage corrige au fil des notes.`]);
  if(r.notes.n<5)v.push(["info","Moins de 5 notes enregistrées : l'écart avec tes ressentis n'est pas encore significatif. Note tes essais (Notes et apprentissage)."]);
  if(!v.length)v.push(["ok","Aucun point d'alerte sur ce lot : taux de réussite, diversité et calibration sont corrects."]);
  return v;
}
function benchHtml(r){
  const old=r.ts&&Date.now()-r.ts>6e4?` <small class="mut">(lot du ${fmtD(r.ts)})</small>`:"";
  const nt=r.notes.n?`${sgn(r.notes.signed)}`:"–";
  let h=`<div class="kpis">`+
    kpi(r.rate+" %","Réussite de génération",`${r.okN} blocs sur ${r.N}`,r.rate>=85?"ok":r.rate>=60?"warn":"bad")+
    kpi(r.candRate+" %","Séquences validées (biomécanique)",`${r.candOk} sur ${r.cand} candidates`,r.candRate>=40?"ok":"warn")+
    kpi(r.clean+" %","Blocs sans aucune alerte",`${r.alertBlocks} % avec au moins une alerte`,"")+
    kpi(r.notes.n?nt:"–","Écart avec tes notes",r.notes.n?`${r.notes.n} note${r.notes.n>1?"s":""} · écart absolu moyen ${r.notes.abs.toFixed(1)} (échelle 0-10)`:"aucune note enregistrée","")+
    kpi(sgn(r.aim.signed),"Écart estimé / visé",`écart absolu moyen ${r.aim.abs.toFixed(1)} · ${r.ms} ms par bloc`,Math.abs(r.aim.signed)<=1?"ok":"warn")+
    kpi(r.entropy+" %","Diversité des parcours",`${r.cover.used}/${r.cover.active} prises utilisées · ${r.moves.toFixed(1)} mouvements en moyenne`,r.entropy>=70?"ok":"warn")+`</div>`;
  h+=`<div class="bgrid"><div><h4>Types de parcours</h4>${barsHtml(r.kinds,k=>KINDN[k]||k,r.okN)}</div>
  <div><h4>Styles de mouvement</h4>${barsHtml(r.mvs,k=>MVN[k]||k,r.okN)}</div>
  <div><h4>Niveaux estimés</h4>${barsHtml(r.levels,k=>k,r.okN)}</div>
  <div><h4>Orientation des prises (mains)</h4>${barsHtml(r.rho,k=>k)}</div>
  ${WALL.panels.length>1?`<div><h4>Répartition par pan</h4>${barsHtml(r.pans,k=>"Pan "+((WALL.panels.find(p=>p.id===k)||{}).name||k))}</div>`:""}
  <div><h4>Articulations signalées (blocs concernés)</h4>${barsHtml(r.joints,k=>JOINTS[k]||k,r.okN)}</div></div>`;
  if(r.notes.byMv.length)h+=`<p class="mut">Écart par style d'après tes notes : ${r.notes.byMv.map(([k,v,n])=>`${MVN[k]||k} ${sgn(v)} (${n} notes)`).join(" · ")}.</p>`;
  if(r.top.length)h+=`<p class="mut">Prises les plus utilisées : ${r.top.map(([n,c])=>`n°${n} (${c} blocs)`).join(", ")}.</p>`;
  if(r.why.length)h+=`<details><summary class="mut">Motifs de rejet biomécanique (${r.cand-r.candOk} séquences écartées)</summary><ul>${r.why.map(([k,c])=>`<li>${esc(k)} <b>×${c}</b></li>`).join("")}</ul></details>`;
  h+=`<div class="verd">${benchVerdict(r).map(([c,t])=>`<p class="vd ${c}">${esc(t)}</p>`).join("")}</div>`;
  return `<h3 class="bh">Rapport${old}</h3>`+h;
}
function benchText(r){
  const L=[`BENCHMARK DU GÉNÉRATEUR · ${new Date(r.ts).toLocaleString("fr-FR")} · mur « ${WALL.name} » · ${r.mode==="cfg"?"réglages actuels":"tous niveaux et styles"}`,
    `Réussite de génération : ${r.rate} % (${r.okN}/${r.N})`,
    `Séquences validées par le contrôle biomécanique : ${r.candRate} % (${r.candOk}/${r.cand})`,
    `Blocs sans alerte : ${r.clean} % · avec alerte : ${r.alertBlocks} %`,
    `Écart estimé/visé : ${sgn(r.aim.signed)} (absolu ${r.aim.abs.toFixed(2)}) · ${r.ms} ms par bloc`,
    r.notes.n?`Écart avec tes ${r.notes.n} notes : ${sgn(r.notes.signed)} (absolu ${r.notes.abs.toFixed(2)})`:"Écart avec tes notes : aucune note",
    `Parcours : ${Object.entries(r.kinds).map(([k,v])=>`${KINDN[k]||k} ${pct(v,r.okN)} %`).join(", ")} · diversité ${r.entropy} %`,
    `Styles : ${Object.entries(r.mvs).map(([k,v])=>`${MVN[k]||k} ${pct(v,r.okN)} %`).join(", ")}`,
    `Niveaux : ${Object.entries(r.levels).map(([k,v])=>`${k} ${pct(v,r.okN)} %`).join(", ")}`,
    `Prises utilisées : ${r.cover.used}/${r.cover.active}`,
    `Articulations signalées : ${Object.entries(r.joints).map(([k,v])=>`${(JOINTS[k]||k).split(" (")[0]} ${pct(v,r.okN)} %`).join(", ")||"aucune"}`];
  return L.join("\n");
}
function renderBench(){
  const o=$("benchout");if(!o)return;
  const r=ls(BENCH_KEY,null);o.innerHTML=r?benchHtml(r)+benchRefHtml(r)+tuneHtml(r)+`<div class="row"><button id="bcopy">Copier le rapport</button><span class="mut" id="bmsg" role="status"></span></div>`:'<p class="mut">Aucun rapport pour l\'instant. Lance un lot pour auditer le générateur.</p>';
  if(r)bindTune(r);
  const hr=$("bhreset");if(hr)hr.onclick=()=>{ss(BENCH_HIST_KEY,[]);renderBench()};
  const c=$("bcopy");if(c)c.onclick=()=>{const t=benchText(r),m=$("bmsg");(navigator.clipboard?navigator.clipboard.writeText(t):Promise.reject()).then(()=>m.textContent="Rapport copié.",()=>m.textContent="Copie impossible ici.")};
}
function bindBench(){
  const go=$("bgo");if(!go)return;
  go.onclick=async()=>{
    if(busy)return;busy=true;benchCancel=false;
    const n=+$("bn").value,mode=$("bmode").value,p=$("bprog"),st=$("bstate");
    go.disabled=true;$("bstop").hidden=false;p.hidden=false;p.max=n;p.value=0;
    const r=await benchRunAsync(n,mode,(i,t)=>{p.value=i;st.textContent=`Bloc ${i} / ${t}…`});
    ss(BENCH_KEY,r);if(!benchCancel&&r&&r.N>=10){const h=benchHist();h.push({ts:r.ts,N:r.N,rate:r.rate,candRate:r.candRate,clean:r.clean,aimAbs:r.aim.abs,entropy:r.entropy});ss(BENCH_HIST_KEY,h.slice(-50))}
    busy=false;go.disabled=false;$("bstop").hidden=true;p.hidden=true;st.textContent=benchCancel?"Lot interrompu.":"Terminé.";renderBench();
  };
  $("bstop").onclick=()=>{benchCancel=true};
  renderBench();
}
