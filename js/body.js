// BODY : modèle du grimpeur. Direction d'effort des prises, bassin, coût d'un mouvement.
// Modifie ici si les mouvements te semblent trop faciles / durs / absurdes.

// Facteur d'effort d'une prise posée dans l'orientation r pour un effort de direction psi (null = inutilisable).
function facAt(h,r,psi){
  let a=Math.cos((-90+r)*D2R-psi);
  if(h.fam==='tri')a=Math.abs(a);else if(a<(h.slo?0:-.3))return null;
  return 1+(h.slo?2.2:KF[h.fam])*(1-a);
}
// Choix de l'orientation d'une prise : tous les angles par pas de 15 deg qui restent tenables.
// Facile : surtout les meilleurs angles. Difficile : on accepte aussi des angles moins confortables (plus de variété).
const RHOS=Array.from({length:24},(_,i)=>i*15);
function rhoFor(h,psi,t){
  const o=[];for(const r of RHOS){const f=facAt(h,r,psi);if(f!=null)o.push({rho:r,fac:f})}
  if(!o.length)return null;o.sort((p,q)=>p.fac-q.fac);
  // Variété : on tire parmi TOUS les angles tenables (pas de 15 deg), avec un léger avantage aux meilleurs.
  if(t<.25&&Math.random()<.2)return o[0];
  const slack=.3+1.0*t,ok=o.filter(x=>x.fac<=o[0].fac+slack);
  // tirage pondéré : plus l'angle s'écarte de l'orientation « classique » (0 deg), plus il a de chances d'être choisi
  const w=ok.map(x=>{const a=Math.min(x.rho,360-x.rho);return .6+a/45});let u=Math.random()*w.reduce((p,q)=>p+q,0);
  for(let i=0;i<ok.length;i++){u-=w[i];if(u<=0)return ok[i]}return ok[ok.length-1];
}
// Position du bassin selon les appuis : point « confortable » (formule simple), ramené dans la zone atteignable
// par le squelette (skeleton.js). Retourne {x,y,ok,slack,limit} : ok=false si aucune position ne permet les appuis.
function hipsComfort(hs,fs,Hc,camp){
  const all=[...hs,...fs],x=all.reduce((s,c)=>s+c.o.x,0)/all.length,hy=(hs[0].o.y+hs[1].o.y)/2;
  if(camp)return{x,y:hy-.8*Hc};
  const fy=fs.length?fs.reduce((s,c)=>s+c.o.y,0)/fs.length:0;
  return{x,y:Math.min(fy+.55*Hc,hy-.2*Hc)};
}
function hips(hs,fs,Hc,camp){return solveHips(hs,fs,Hc,camp,hipsComfort(hs,fs,Hc,camp))}
// ---------- Pieds (phase 3) ----------
// Un pied appuie vers le bas : la prise doit offrir une surface qui regarde vers le haut (carre, plat) ou une adhérence (sloper, plat large).
// footFor choisit l'orientation de la prise pour un pied et renvoie {rho, f, kind, stab}. f = facteur d'effort (1 = idéal), stab = 0..1.
const FOOT_PSI=-Math.PI/2;
function footKind(h){return h.slo||(h.fam==='dish'&&h.grip<=2)?'adherence':(h.w*h.h<=45?'pointe':(h.fam==='arc'||h.fam==='bar'||h.fam==='tri'||h.fam==='horn'||h.fam==='facet'?'carre':'plat'))}
function footFor(h,tilt,t){
  const o=[];for(const r of RHOS){const f=facAt(h,r,FOOT_PSI);if(f!=null)o.push({rho:r,f})}
  const kind=footKind(h),tl=Math.max(0,tilt||0);
  if(!o.length)return h.fam==='dish'||h.slo?{rho:0,f:2.6,kind:'adherence',stab:.3}:null;
  o.sort((a,b)=>a.f-b.f);const ok=o.filter(x=>x.f<=o[0].f+.5+(t||0)),x=ok[Math.floor(Math.random()*ok.length)];
  let stab=Math.max(0,Math.min(1,1.25/x.f));if(kind==='adherence')stab*=Math.max(.35,1-.014*tl); // l'adhérence s'effondre en surplomb
  return{rho:x.rho,f:x.f,kind,stab};
}
const reachOf=Hc=>BODY.reachK*Hc*CL.ape();
// Blocage (lock-off) : si la main fixe est basse (bras plié) et que l'autre part loin, le coude et l'épaule sont très chargés
// (Exel 2023 : coude à 90° ≈ 3 fois le moment de flexion du coude et 6 fois le moment de rotation de l'épaule par rapport au bras tendu).
const LK={y:.45,ratio:.85,cost:.5};
// Coût d'un mouvement de la main idx vers le trou o avec la prise h. Valable pour la petite ET la grande taille.
// c = réglages du bloc, s = état courant (mains, pieds). Retourne null si impossible.
function moveCost(c,s,idx,o,h,camp){
  const me=s.hands[idx],ot=s.hands[1-idx],d0=dist(o,ot.o),tl=o.tilt||0,d=d0*(1+.003*Math.max(0,tl)),r150=d/reachOf(BODY.hMin); // dévers : en surplomb, la portée utile diminue
  if(r150>1.4||(r150>1&&(!c.dyn||o.y<60)))return null;
  const hm=hips([ot,{o,h,free:r150>1}],s.feet,BODY.hMid,camp),rr=rhoFor(h,Math.atan2(hm.y-o.y,hm.x-o.x),c.t);if(!rr)return null;
  const cross=Math.sign(me.o.x-ot.o.x)*Math.sign(o.x-ot.o.x)<0;let cost=0;
  for(const Hc of SIZES()){
    const hp=hips([ot,{o,h,free:r150>1}],s.feet,Hc,camp);if(!hp.ok)return null;const f=facAt(h,rr.rho,Math.atan2(hp.y-o.y,hp.x-o.x)),ratio=d/reachOf(Hc),load=.5+.5*Math.min(1,Math.abs(hp.x-o.x)/(.35*Hc));
    cost+=1.2*Math.min(1,hp.slack/(SK.tol*Hc))+.6*Math.pow(h.grip*Math.max(.88,Math.min(1.2,Math.sqrt(90/(h.w*h.h)))),1.25)*(f==null?rr.fac*2:f)*(.6+.8*load)+2.5*Math.max(0,ratio-.8)+(cross?1:0)+(ratio>1?2+3*(ratio-1):0)+(ot.o.y-hp.y<LK.y*Hc&&ratio>LK.ratio?LK.cost*Math.min(1,(ratio-LK.ratio)/.15):0);
  }
  cost/=SIZES().length;if(camp)cost*=1.4;
  cost*=tl>0?1+.008*tl:Math.max(.88,1+.006*tl); // dévers : plus dur en surplomb, un peu plus facile en dalle
  if(h.slo&&tl>0)cost*=1+.01*tl; // un sloper devient très dur en surplomb
  cost*=1+.1*(LEARN.a[h.n]||0); // ajustement appris de tes notes d'essai (voir learn.js)
  return{cost,rho:rr.rho,dyn:r150>1,cross,d};
}

// Coût d'un lancer à deux mains (les deux prises sont attrapées ensemble). Retourne null si impossible. Valable pour les deux tailles.
function pairCost(c,s,o1,h1,o2,h2,camp){
  const pre={hd:s.hands,ft:s.feet},t1={o:o1,h:h1},t2={o:o2,h:h2},Dm=dynoPair(pre,t1,t2,BODY.hMid,camp);if(!Dm||Dm.need<12)return null; // sans saut réel, ce ne serait pas un lancer
  const r1=rhoFor(h1,Math.atan2(Dm.p1.y-o1.y,Dm.p1.x-o1.x),c.t),r2=rhoFor(h2,Math.atan2(Dm.p1.y-o2.y,Dm.p1.x-o2.x),c.t);if(!r1||!r2)return null;
  let cost=0,ratio=0;
  for(const Hc of SIZES()){
    const D=dynoPair(pre,t1,t2,Hc,camp);if(!D||D.ratio>1.1||D.capRatio>1.3)return null;ratio=Math.max(ratio,D.ratio);
    for(const[h,o,r]of[[h1,o1,r1],[h2,o2,r2]]){const f=facAt(h,r.rho,Math.atan2(D.p1.y-o.y,D.p1.x-o.x));cost+=.6*Math.pow(h.grip*Math.max(.88,Math.min(1.2,Math.sqrt(90/(h.w*h.h)))),1.25)*(f==null?r.fac*2:f)*.9+(h.slo&&(o.tilt||0)>0?.01*o.tilt*2:0)}
    cost+=3*Math.max(0,D.ratio-.55)+1;
  }
  return{cost:cost/(2*SIZES().length)*(1+.1*((LEARN.a[h1.n]||0)+(LEARN.a[h2.n]||0))/2),rho1:r1.rho,rho2:r2.rho,ratio};
}
