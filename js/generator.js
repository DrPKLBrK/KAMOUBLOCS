// GENERATOR : crée un bloc. Étapes : 1) tirer un PARCOURS (départ, étapes, arrivée) sur tout le mur,
// 2) recherche en faisceau de séquences de mouvements qui suivent ce parcours, 3) choisir la meilleure
// en évitant les zones et enchaînements déjà vus.

// Compteurs d'audit (benchmark) : séquences candidates examinées et motifs de rejet biomécanique.
const STAT={on:false,cand:0,ok:0,why:{}};

// ---------- 1) Parcours ----------
// Calage du coût visé selon le niveau demandé (valeurs mesurées sur 14 blocs par niveau). Plus il est haut, plus les blocs sont durs à niveau égal.
const ct0For=t=>t<2?.6:t<3.5?.3:t<5.5?0:-.3;
const SY=WALL.startY,HY=WALL.minHandY; // hauteur de départ des mains, hauteur mini des mains
// Un parcours = départ (sx,sy), étapes intermédiaires (wps), arrivée T, et une longueur minimale en mouvements.
// Les parcours sont tirés dans un mur de référence de 503 cm de large et 245 cm de haut, puis adaptés à TON mur.
const XLO=20,XHI=WALL.W-20,KX=(XHI-XLO)/463,KY=clamp(WALL.topMax/245,.6,1.8);
const fx=x=>XLO+(x-20)*KX;
function sampleRoute(kind){
  let sx,sy,tx,ty,wps=[];
  const lr=Math.random()<.5;
  if(kind==='up'){sx=rnd(25,478);sy=rnd(SY[0],SY[1]);tx=clamp(sx+rnd(-110,110),20,483);ty=rnd(Math.max(165,sy+40),243)}
  else if(kind==='trav'){sx=lr?rnd(20,95):rnd(410,483);tx=lr?rnd(380,483):rnd(20,110);sy=rnd(SY[0],SY[1]+20);ty=clamp(sy+rnd(-60,70),HY+10,215)}
  else if(kind==='diag'){sx=rnd(25,478);const sg=Math.random()<sx/500?-1:1;sy=rnd(SY[0],SY[1]);tx=clamp(sx+sg*rnd(130,300),20,483);ty=rnd(Math.max(150,sy+30),243)}
  else if(kind==='corner'){ // passage d'un pan à l'autre à travers une jonction choisie au hasard
    const xj=jointX(pick(WALL.joints.map((_,k)=>k))),a=clamp(xj-rnd(25,205),XLO,XHI),b=clamp(xj+rnd(37,245),XLO,XHI);
    sx=lr?a:b;tx=lr?b:a;sy=rnd(SY[0],SY[1]+20);ty=rnd(HY+30,240);
  }
  else{ // zigzag : un point de passage au milieu
    sx=rnd(25,478);sy=rnd(SY[0],SY[1]);tx=rnd(30,470);ty=rnd(Math.max(150,sy+30),243);
    wps=[{x:rnd(40,460),y:rnd(SY[0]+10,205)}];
  }
  if(kind!=='zig'&&Math.random()<.25)wps=[{x:rnd(40,460),y:rnd(HY+30,210)}]; // étape facultative : rend les parcours moins rectilignes
  if(kind!=='corner'){ // mur étroit : on comprime le parcours ; mur large : on le décale pour couvrir tout le mur
    const sh=KX>1?rnd(0,(XHI-XLO)-463):0,mx=KX>1?x=>x+sh:fx;sx=mx(sx);tx=mx(tx);wps=wps.map(w=>({x:mx(w.x),y:w.y}))}
  // adaptation à la hauteur du mur
  ty*=KY;wps=wps.map(w=>({x:w.x,y:w.y*KY}));
  ty=Math.min(ty,WALL.topMax,panelAt(tx).h-11);ty=Math.max(ty,HY+20);
  const T={x:tx,y:ty},pts=[{x:sx,y:sy},...wps,T];
  let len=0;for(let i=1;i<pts.length;i++)len+=Math.hypot(pts[i].x-pts[i-1].x,pts[i].y-pts[i-1].y);
  if(len<120)return null;
  return{kind,sx,sy,T,wps,len};
}
// Carte de chaleur : zones déjà utilisées par les derniers blocs (elle s'estompe au fil des générations).
const heatAt=(heat,x,y,r)=>{let t=0;for(const o of holes)if(Math.abs(o.x-x)<=r&&Math.abs(o.y-y)<=r)t+=heat[o.id]||0;return t};
// Plage horizontale (x du dessin déplié) de chaque zone du mur.
const ZONES={all:[XLO,XHI]};
WALL.panels.forEach(p=>{ZONES[p.id]=[p.x0+20,p.x0+p.w-20]});
const zoneRange=z=>z==='C'?(k=>[jointX(k)-100,jointX(k)+100])(pick(WALL.joints.map((_,k)=>k))):(ZONES[z]||ZONES.all);
const LENGTHS={short:{tgt:200,div:1.3},mid:{tgt:320,div:1},long:{tgt:470,div:.78}}; // longueur de parcours visée (cm) et pas moyen
function makeRoute(c,heat){
  const hasJ=WALL.joints.length>0;let kinds=c.mv==='trav'?['trav']:c.mv==='compress'&&hasJ?['corner']:['up','up','trav','trav','diag','diag',...(hasJ?['corner']:['zig']),'zig'];
  kinds=tuneKinds(kinds);
  // forme de parcours imposée (bloc recréé d'après un autre mur, adapt.js) ; « coin » seulement si ce mur a une jonction
  if(c.kind&&KINDN[c.kind]&&(c.kind!=='corner'||hasJ))kinds=[c.kind];
  const z=zoneRange(c.zone),k0=ZONES.all,L=LENGTHS[c.len]||null;
  if(c.zone==='C'&&c.mv!=='trav'&&c.mv!=='compress')kinds=tuneKinds(['up','up','diag','corner','zig']);
  const zSame=z[0]===k0[0]&&z[1]===k0[1];
  let best=null;
  for(let k=0;k<14;k++){
    const r=sampleRoute(pick(kinds));if(!r)continue;
    if(!zSame){ // on replie le parcours dans la zone choisie en gardant sa forme
      const mx=x=>z[0]+(x-k0[0])/(k0[1]-k0[0])*(z[1]-z[0]);
      r.sx=mx(r.sx);r.T={x:mx(r.T.x),y:r.T.y};r.wps=r.wps.map(w=>({x:mx(w.x),y:w.y}));
      const pts=[{x:r.sx,y:r.sy},...r.wps,r.T];r.len=0;for(let i=1;i<pts.length;i++)r.len+=Math.hypot(pts[i].x-pts[i-1].x,pts[i].y-pts[i-1].y);
      if(r.len<110)continue;
    }
    r.heat=heatAt(heat,r.sx,r.sy,40)+heatAt(heat,r.T.x,r.T.y,40)+r.wps.reduce((a,w)=>a+heatAt(heat,w.x,w.y,40),0)-Math.min(r.len,320)*.004+Math.random()*1.2;
    if(L)r.heat+=Math.abs(r.len-L.tgt)*.02;
    if(!best||r.heat<best.heat)best=r;
  }
  return best;
}

// ---------- 2) Un bloc ----------
function gen1(c){
  c={...c};
  if(c.mv==='surprise')c.mv=pick(c.pool&&c.pool.length?c.pool:MVS);
  if((isPanelZone(c.zone)||!WALL.joints.length)&&(c.mv==='compress'||c.mv==='trav'))c.mv='mix'; // ces styles exigent de passer une jonction
  if(c.lancers===false&&(c.mv==='dyno'||c.mv==='coord'))c.mv='mix';
  if(c.hs==='mix'&&c.surp&&Math.random()<.35)c.hs=pick(c.hsPool&&c.hsPool.length?c.hsPool:['crimp','sloper','pinch','arc']);
  let U=USTYLE[c.mv]; // style créé par l'utilisateur (ustyles.js)
  if(U&&c.lancers===false&&U.dyn>=2)U={...U,dyn:1}; // lancers désactivés dans le bandeau : l'exigence tombe
  const hookOn=c.mv==='hook'||!!(U&&U.hook>=1);
  c.dyn=c.mv!=='static'&&c.lancers!==false&&!(TSTYLE[c.mv]&&TSTYLE[c.mv].noDyn)&&!(U&&U.dyn===0);
  if(U&&!c.len&&U.len!=='any')c.len=U.len;
  if(c.mv==='endur'&&!c.len)c.len='long';if(c.mv==='power'&&!c.len)c.len='short';
  const heat=ls(KEY.heat,{});
  const R=makeRoute(c,heat);if(!R)return null;
  const pts=[...R.wps,R.T];
  const BW=14,camp=c.mv==='nofeet';
  // Profil aléatoire propre à ce bloc : écart préféré entre mains, goût des prises, amplitude des pas, rythme
  const P={sp:.35+Math.random()*.7,small:Math.random()<.5?1:-1,st:.3+Math.random()*.4,cx:2+(Math.random()*5|0),slack:6+Math.random()*16,mm:Math.max(3,Math.ceil(R.len/(rnd(95,125)*((LENGTHS[c.len]||{div:1}).div))))};
  // Coût visé pour le passage clé : calé sur la formule de niveau ev() (passage clé + 3 plus durs + longueur)
  if(U){P.sp=.35+(U.spread+1)/2*.7;if(U.small)P.small=U.small;P.mm=Math.max(3,Math.round(P.mm*(1.05-.45*U.rhythm)))}
  if(c.mv==='endur')P.mm=Math.round(P.mm*1.5);if(c.mv==='power')P.mm=Math.max(3,Math.round(P.mm*.6));
  let Ct=Math.max(.5,(c.tgt/2+ct0For(c.tgt)-.06*P.mm)/1.3);if(c.mv==='endur')Ct*=.8;if(c.mv==='power')Ct*=1.15;if(U)Ct*=1+(U.rhythm<0?.2:.15)*U.rhythm;
  const posed=c.skipPosed?posedMap():{},posedH=new Set(Object.values(posed).map(v=>v.hid));
  const av=()=>holds.filter(h=>h.on&&!posed[h.n]),okh=h=>!camp||h.grip<=3;
  const hand=(s,f)=>{let l=av().filter(h=>!s.used.has(h.n)&&(!f||f(h)));if(c.tgt<3.5){const e=l.filter(h=>h.grip<=2),m=l.filter(h=>h.grip<=3);l=e.length>2&&Math.random()<.7?e:m.length>2?m:l} // niveaux faciles : prises plus gentilles
    return l.length?pick(l):null};
  const zoneOk=o=>isPanelZone(c.zone)?o.pan===c.zone:c.zone==='C'?o.dj<=100:true;
  // Prise de pied : on garde les prises faciles pour les mains (sinon, aux niveaux faciles, il n'en reste plus assez).
  const foot=(s,f)=>{const l=av().filter(h=>!s.used.has(h.n)&&(!f||f(h)));if(!l.length)return null;const p=l.filter(h=>h.grip>=3);return pick(p.length?p:l)};
  const hole=(s,f)=>{let r=null,n=0;for(const o of holes){if(s.taken.has(o.id)||posedH.has(o.id)||!zoneOk(o)||!f(o))continue;if(Math.random()*++n<1)r=o}return r}; // tirage uniforme en un seul passage
  const clone=s=>({...s,hands:s.hands.slice(),feet:s.feet.slice(),used:new Set(s.used),taken:new Set(s.taken),mv:s.mv.slice(),cs:s.cs.slice(),sg:s.sg.slice(),allf:s.allf.slice(),nf:[]});
  const take=(s,o,h)=>{s.taken.add(o.id);s.used.add(h.n)};
  const tdist=(o,i)=>Math.hypot(o.x-pts[i].x,o.y-pts[i].y);

  // Pieds : deux prises sous les mains, proches en largeur ; au sol si les mains sont basses.
  function feetFix(s,hs){
    if(camp){s.feet=[];return true}
    const ay=(hs[0].o.y+hs[1].o.y)/2,hx=(hs[0].o.x+hs[1].o.x)/2,lo=ay-.9*BODY.hMin,hi=Math.min(ay-30,Math.max(ay-(hookOn?.15:.45)*BODY.hMax,WALL.minFootY));
    if(hi<WALL.minFootY)return false; // jamais de pieds au sol : il faut une prise de pied
    const f=s.feet.filter(q=>q.o.y>=lo&&q.o.y<=hi+10&&Math.abs(q.o.x-hx)<=.35*BODY.hMin);
    while(f.length<2){
      const hk=hookOn&&!f.some(q=>fits('arc',q.h));
      const o=hole(s,o=>o.y>=Math.max(WALL.minFootY,lo)&&o.y<=hi&&Math.abs(o.x-hx)<=.35*BODY.hMin&&!f.some(q=>dist(q.o,o)<25));
      const h=o&&(hk&&foot(s,x=>fits('arc',x))||foot(s));
      if(!o||!h)return false;
      take(s,o,h);const ff=footFor(h,o.tilt,c.t);if(!ff)return false;const q={o,h,rho:ff.rho,fq:ff};f.push(q);s.allf.push(q);s.nf.push(q);
    }
    s.feet=f;return true;
  }
  // Départ : deux mains autour de (sx,sy)
  function start(){
    const s={hands:[],feet:[],used:new Set(),taken:new Set(),mv:[],cs:[],sc:0,dy:0,cr:0,sg:[],allf:[],nf:[],sx:0,h0:[],wi:0};
    const o1=hole(s,o=>Math.abs(o.x-R.sx)<=30&&Math.abs(o.y-R.sy)<=25&&o.y>=HY&&o.y<=WALL.topMax-20);if(!o1)return null;
    s.taken.add(o1.id);
    const o2=hole(s,o=>Math.abs(o.y-R.sy)<=45&&o.y>=HY&&o.y<=WALL.topMax-20&&dist(o,o1)>=18&&dist(o,o1)<=50);if(!o2)return null;
    for(const o of[o1,o2]){const h=hand(s,okh);if(!h)return null;take(s,o,h);const rr=rhoFor(h,-Math.PI/2,c.t);if(!rr)return null;s.hands.push({o,h,rho:rr.rho})}
    s.h0=s.hands.slice();if(!feetFix(s,s.hands))return null;s.f0=s.feet.slice();return s;
  }
  // Arrivée : la dernière étape est atteinte par une main, l'autre est proche, et le bloc est assez long.
  const reach150=reachOf(BODY.hMin);
  const isFinish=(s,o,ot)=>s.wi===pts.length-1&&tdist(o,s.wi)<=35&&tdist(ot.o,s.wi)<=100&&s.mv.length+1>=P.mm;
  const upMax=((c.mv==='dyno'||c.mv==='coord')?.75:P.st+.15)*BODY.hMin;

  // Lancer à deux mains : probabilité de tenter ce mouvement à chaque étape, selon le style.
  const pairP=!c.dyn?0:U?(U.dyn===3?.25:U.dyn===2?.18:.07):c.mv==='dyno'||c.mv==='coord'?.25:camp?.12:c.mv==='mix'?.07:0;
  function pairStep(s,step){
    if(s.mv.filter(x=>x.pair).length>=2)return null; // au plus deux lancers à deux mains par bloc
    const i=s.wi,far=tdist(s.hands[0].o,i)>=tdist(s.hands[1].o,i)?0:1,idx=Math.random()<.7?far:1-far,me=s.hands[idx],ot=s.hands[1-idx],d0=tdist(me.o,i);
    const hiY=Math.max(me.o.y,ot.o.y),loY=Math.min(me.o.y,ot.o.y);
    const o1=hole(s,q=>q.y>=HY&&q.y<=WALL.topMax&&q.y>=loY-10&&q.y<=hiY+upMax&&tdist(q,i)<=d0+P.slack);if(!o1)return null;
    s.taken.add(o1.id);
    const o2=hole(s,q=>q.y>=HY&&q.y<=WALL.topMax&&q.y>=loY-10&&q.y<=hiY+upMax&&Math.abs(q.y-o1.y)<=45&&dist(q,o1)>=18&&dist(q,o1)<=55);
    s.taken.delete(o1.id);if(!o2)return null;
    const h1=hand(s,okh),h2=h1&&hand(s,x=>okh(x)&&x.n!==h1.n);if(!h1||!h2)return null;
    const m=pairCost(c,s,o1,h1,o2,h2,camp);if(!m||m.cost>Ct+(c.tgt<3.5?2.2:1.2))return null;
    const n=clone(s);take(n,o1,h1);take(n,o2,h2);
    const L=o1.x<=o2.x;n.hands[idx]={o:o1,h:h1,rho:m.rho1};n.hands[1-idx]={o:o2,h:h2,rho:m.rho2};
    if(n.wi<pts.length-1&&(tdist(o1,n.wi)<=45||tdist(o2,n.wi)<=45))n.wi++;
    if(!feetFix(n,n.hands))return null;
    n.sc+=(U?uBonus(U,{dyn:true},[]):0)+(d0-Math.min(tdist(o1,i),tdist(o2,i)))*.03-Math.abs(m.cost-(step===P.cx?Ct:.65*Ct))*.6+(c.mv==='dyno'||c.mv==='coord'?2.5:0)+Math.random()*.8;
    n.cs.push(m.cost);n.dy++;
    n.mv.push({side:L?'gauche':'droite',slot:idx,o:o1,h:h1,rho:m.rho1,m:{cost:m.cost,rho:m.rho1,dyn:true,cross:false,d:dist(o1,me.o),dbl:true},nf:n.nf,ot,hd:n.hands.slice(),ft:n.feet.slice(),pair:{o:o2,h:h2,rho:m.rho2}});
    n.sg.push(h1.fam+m.rho1+'+'+h2.fam+m.rho2);{const mm=n.mv[n.mv.length-1];mm.tech=techOf(mm,{hd:s.hands,ft:s.feet},camp)}
    return n;
  }
  // Drapeau : la main part sur le côté, un seul pied reste en appui sous la main fixe, l'autre jambe sert de contrepoids.
  // On vérifie les deux tailles : le bassin doit rester atteignable avec un seul pied, et le corps doit rester équilibré sur lui.
  const flagP=camp?0:c.mv==='flag'?TK.flagP:U?(U.flag>=1?TK.flagP:.04):c.mv==='static'?.08:c.mv==='mix'?.06:0;
  function tryFlag(s,o,ot,me){
    if(s.feet.length!==2||Math.abs(o.x-ot.o.x)<TK.flagLat*BODY.hMid)return null;
    const stand=s.feet.reduce((a,b)=>Math.abs(a.o.x-ot.o.x)<=Math.abs(b.o.x-ot.o.x)?a:b),free=s.feet.find(q=>q!==stand);
    if(Math.abs(stand.o.x-ot.o.x)>.25*BODY.hMid)return null;
    for(const Hc of SIZES()){
      const hp=hips([ot,me],[stand],Hc,false);if(!hp.ok)return null;
      if((Math.max(ot.o.y,me.o.y)-stand.o.y)/Hc>V3.extMax)return null;
      if(loadsOf([ot],[stand],Hc,true,o).barn*.4>FM.barnSoft)return null;
    }
    return{stand,free};
  }
  function run(){
    let beam=[];for(let k=0;k<80&&beam.length<BW;k++){const s=start();if(s)beam.push(s)}
    const fin=[];
    for(let step=0;step<30&&beam.length;step++){
      const ch=[];
      for(const s of beam){const pd=pairP;if(pd>0)for(let t=0;t<3;t++){if(Math.random()>pd)continue;const n=pairStep(s,step);if(n){n.sc+=.3;ch.push(n)}}}
      for(const s of beam)for(let t=0;t<16;t++){
        const i=s.wi,far=tdist(s.hands[0].o,i)>=tdist(s.hands[1].o,i)?0:1;
        const idx=Math.random()<.7?far:1-far,me=s.hands[idx],ot=s.hands[1-idx],d0=tdist(me.o,i);
        const o=hole(s,q=>q.y>=HY&&q.y<=WALL.topMax&&q.y>=me.o.y-40&&q.y<=me.o.y+upMax&&dist(q,ot.o)<=1.4*reachOf(BODY.hMin)&&dist(q,ot.o)>=18&&tdist(q,i)<=d0+P.slack);if(!o)continue;
        const f=isFinish(s,o,ot)&&dist(o,ot.o)<=.85*reach150;if(f&&!(s.wi===pts.length-1))continue;const h=hand(s,x=>okh(x)&&(!f||x.grip<=3));if(!h)continue;
        const m=moveCost(c,s,idx,o,h,camp);if(!m||m.cost>Ct+(c.tgt<3.5?2.2:1.2))continue;if(U&&U.cross===0&&m.cross)continue;
        const n=clone(s);take(n,o,h);n.hands[idx]={o,h,rho:m.rho};
        if(n.wi<pts.length-1&&tdist(o,n.wi)<=45)n.wi++;
        if(f)n.hands[1-idx]={o,h,rho:m.rho}; // arrivée : tcheck, les deux mains sur la même prise
        if(!feetFix(n,n.hands))continue;
        const flag=!f&&!m.dyn&&flagP>0&&Math.random()<flagP?tryFlag(s,o,ot,me):null;
        n.cs.push(m.cost);if(m.dyn)n.dy++;if(m.cross)n.cr++;
        const mvo={side:o.x<ot.o.x?'gauche':'droite',slot:idx,o,h,rho:m.rho,m,nf:n.nf,ot,hd:n.hands.slice(),ft:n.feet.slice(),flag};mvo.tech=techOf(mvo,{hd:s.hands,ft:s.feet},camp);
        const TD=TSTYLE[c.mv],tb=(TD&&TD.tech.some(t=>mvo.tech.includes(t))?TD.bonus:0)+(U?uBonus(U,m,mvo.tech):0);
        n.sc+=(d0-tdist(o,i))*.03-Math.abs(m.cost-(step===P.cx?Ct:.65*Ct))*.6+(flag?1.2*(c.mv==='flag'?1:.3):0)+tb+styleBonus(c,P,me,o,ot,h,m)+Math.random()*.8;
        n.mv.push(mvo);n.sg.push(h.fam+m.rho+(flag?'F':''));
        (f?fin:ch).push(n);
      }
      ch.sort((a,b)=>b.sc-a.sc);beam=ch.slice(0,BW);
      if(fin.length>=60)break; // assez de candidats : inutile de poursuivre
    }
    return fin;
  }

  // ---------- 3) Choix ----------
  const hist=ls(KEY.hist,[]);
  const bg=s=>{const a=new Set();for(let i=0;i<s.sg.length-1;i++)a.add(s.sg[i]+">"+s.sg[i+1]);return a};
  const ids=s=>s.h0.concat(s.mv).map(x=>x.o.id);
  const nov=s=>{const a=bg(s),oo=ids(s);let m=0;for(const hh of hist){let k=0;for(const x of a)if(hh.b.includes(x))k++;m=Math.max(m,a.size?k/a.size:0,oo.filter(i=>hh.o.includes(i)).length/oo.length)}return m};
  const heatPen=s=>{const a=[...s.taken];return a.reduce((t,id)=>t+(heat[id]||0),0)/Math.max(1,a.length)};
  const ev=s=>{const q=s.cs.slice().sort((a,b)=>b-a),Dd=q[0]+.35*q.slice(0,3).reduce((a,b)=>a+b,0)/Math.min(3,q.length)+.06*s.mv.length;return(Dd-1.2)*2};
  let best=null,note="",near=null,nearE=1e9;
  for(let tr=0;tr<8&&!best;tr++){
    const fin=run().filter(s=>{
      if(!styleOk(c,s))return false;
      s.style=c.mv;s.v3=v3check(s,camp);
      if(s.v3.ok){s.short=shortcutOf(s);if(s.short.skip>=SC.margin&&s.short.skip>=SC.ratio*s.short.intended){s.v3.ok=false;s.v3.hard.push("raccourci possible : "+s.short.len+" mouvements au lieu de "+s.short.intended)}}
      if(STAT.on){STAT.cand++;if(s.v3.ok)STAT.ok++;else for(const w of s.v3.hard){const k=w.replace(/^[^:]*:\s*/,'').replace(/\d+/g,'#').slice(0,90);STAT.why[k]=(STAT.why[k]||0)+1}}
      return s.v3.ok}),tol=(tr<5?1.2:3)*TUNE.tol;let bs=-1e9;
    const off=learnOff(c.mv);
    for(const s of fin){const idx=ev(s)+off,e=Math.abs(idx-c.tgt);if(e<nearE){nearE=e;near=s;s._idx=idx}if(e>tol)continue;s.feat=featOf(s,R.kind);const sc=s.sc-e*.8-nov(s)*2.5-heatPen(s)*.6+prefBonus(s.feat)-anaScore(s.v3.notes||[])*(c.tgt<5.5?.5:.15)*TUNE.ana;if(sc>bs){bs=sc;best=s;best.idx=idx}}
    if(best&&tr>=5)note="Niveau un peu éloigné de la cible : peu de solutions avec ce style et ces prises.";
  }
  // Niveau très facile : si aucun candidat n'atteint la cible (le stock de prises ne permet pas plus facile), on livre le plus facile trouvé plutôt que rien.
  if(!best&&near&&c.tgt<3.5&&near._idx>c.tgt&&near._idx-c.tgt<=3.8){best=near;best.idx=near._idx;best.feat=featOf(best,R.kind);note="Niveau plus élevé que demandé : c'est le bloc le plus facile que permettent tes prises."}
  if(!best)return null;

  // ---------- Mise en forme du résultat ----------
  const s=best,fe=s.allf,ho=[],fh2=s.hands.map(x=>x.h.n);
  s.h0.forEach(x=>ho.push({...x,role:'start'}));
  s.mv.forEach((m,k)=>{ho.push({o:m.o,h:m.h,rho:m.rho,role:m===s.mv[s.mv.length-1]?'finish':'hand',ord:k+1});if(m.pair)ho.push({o:m.pair.o,h:m.pair.h,rho:m.pair.rho,role:'hand',ord:k+1})});
  // Prises de départ l'une au-dessus de l'autre : on dit quand même gauche ou droite (« main haute / basse » ne disait pas laquelle).
  // La main qui part au 1er mouvement prend le côté de ce mouvement ; l'autre reste sur la prise fixe.
  const m0=s.mv[0],rel=m0&&!m0.pair&&m0.ot?s.h0.find(x=>x.o.id!==m0.ot.o.id):null;
  const side=(a,b)=>Math.abs(a.o.x-b.o.x)<5?(rel?(a===rel?m0.side:(m0.side==='gauche'?'droite':'gauche')):(a.o.y<=b.o.y?'gauche':'droite')):a.o.x<b.o.x?'gauche':'droite';
  const lines=["Départ : main "+side(s.h0[0],s.h0[1])+" sur n°"+s.h0[0].h.n+" ("+s.h0[0].h.type+", "+s.h0[0].rho+"°), main "+side(s.h0[1],s.h0[0])+" sur n°"+s.h0[1].h.n+" ("+s.h0[1].h.type+", "+s.h0[1].rho+"°)"];
  // Main réelle (et pas le côté) : chaque main garde son emplacement (slot) d'un mouvement à l'autre ; au départ,
  // l'emplacement 0 tient h0[0]. Un croisé ne change pas la main qui bouge, seulement sa position. Après un lancer
  // à deux mains, la main gauche est celle qui arrive sur la prise la plus à gauche.
  {const ph=[side(s.h0[0],s.h0[1]),side(s.h0[1],s.h0[0])];if(ph[0]===ph[1])ph[1]=ph[0]==='gauche'?'droite':'gauche';
    for(const m of s.mv){if(m.slot==null){m.main=m.side;continue}
      if(m.pair){const L=m.o.x<=m.pair.o.x;ph[m.slot]=L?'gauche':'droite';ph[1-m.slot]=L?'droite':'gauche';m.main=ph[m.slot];continue}
      m.main=ph[m.slot]}}
  const f0=fe.filter(q=>!s.mv.some(m=>m.nf.includes(q)));
  lines.push(f0.length?"  Pied"+(f0.length>1?"s":"")+" de départ : "+f0.map(q=>"n°"+q.h.n).join(", "):"  Pieds libres (pas de prise de pied)");
  s.mv.forEach(m=>{
    if(m.pair){const a=m.o.x<=m.pair.o.x?[m,m.pair]:[m.pair,m],nm=x=>"n°"+x.h.n+" ("+x.h.type+", "+x.rho+"°)";
      lines.push("Lancer à deux mains : main gauche → "+nm(a[0])+", main droite → "+nm(a[1])+" · dynamique");
      if(m.nf.length)lines.push("  Nouveau"+(m.nf.length>1?"x pieds":" pied")+" : "+m.nf.map(q=>"n°"+q.h.n+" ("+q.h.type+")").join(", "));return}
    const t=[];if(m.m.dyn)t.push("dynamique");if(m.m.cross)t.push("croisé");(m.tech||[]).forEach(c=>{if(c!=='dyno'&&c!=='dyno2'&&c!=='croise')t.push(techName(c))});
    lines.push(m===s.mv[s.mv.length-1]?"Arrivée : main "+m.main+" sur n°"+m.h.n+" ("+m.h.type+", "+m.rho+"°), puis tcheck : les deux mains sur cette prise"+(t.length?" · "+t.join(", "):""):"Main "+m.main+" → n°"+m.h.n+" ("+m.h.type+", "+m.rho+"°)"+(t.length?" · "+t.join(", "):""));
    if(m.nf.length)lines.push("  Nouveau"+(m.nf.length>1?"x pieds":" pied")+" : "+m.nf.map(q=>"n°"+q.h.n+" ("+q.h.type+")").join(", "));
  });
  const place=[...ho.map(x=>({n:x.h.n,type:x.h.type,pan:x.o.pan,c:x.o.c,r:x.o.r,hid:x.o.id,rho:x.rho})),...fe.map(q=>({n:q.h.n,type:q.h.type,pan:q.o.pan,c:q.o.c,r:q.o.r,hid:q.o.id,rho:q.rho||0,foot:1}))].sort((a,b)=>a.n-b.n);
  // Mémoire : enchaînements déjà vus + carte de chaleur (décroît de 8 % à chaque bloc)
  ss(KEY.hist,[...hist,{b:[...bg(s)],o:ids(s)}].slice(-8));
  const h2={};for(const k in heat){const v=heat[k]*.92;if(v>.05)h2[k]=v}
  for(const id of s.taken)h2[id]=(h2[id]||0)+1;ss(KEY.heat,h2);
  const xs=ho.map(x=>x.o.x),ys=ho.concat(fe.map(q=>({o:q.o}))).map(x=>x.o.y);
  return{mv:c.mv,hs:c.hs,kind:R.kind,idx:s.idx,hands:ho.map(x=>({n:x.h.n,x:x.o.x,y:x.o.y,rho:x.rho,role:x.role,ord:x.ord})),feet:fe.map(q=>({n:q.h.n,x:q.o.x,y:q.o.y,rho:q.rho||0})),lines,place,
    seq:seqOf(s),tgt:c.tgt,v3:s.v3,short:s.short,feat:s.feat,fx:fxOf(s),key:{k:s.cs.reduce((b,v,i)=>v>s.cs[b]?i:b,0)},moves:s.mv.length,techs:s.mv.reduce((o,m)=>{(m.tech||[]).forEach(c=>o[c]=(o[c]||0)+1);return o},{}),dy:s.dy,dbl:s.mv.filter(m=>m.pair).length,cr:s.cr,note,span:{w:Math.round(Math.max(...xs)-Math.min(...xs)),h:Math.round(Math.max(...ys)-Math.min(...ys))}};
}
// Réessaie plusieurs fois (un tirage peut ne pas aboutir, surtout pour les styles contraignants).
// Budget de 2,5 s pour rester fluide sur téléphone.
function gen(c){const t0=Date.now(),bud=2500*clamp(holes.length/300,1,2.5);for(let k=0;k<12&&(k===0||Date.now()-t0<bud);k++){const r=gen1(c);if(r)return r}return null}
