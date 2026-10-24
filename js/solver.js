// SOLVER : résolveur de blocs. Module externe du générateur : il relit un bloc (code GB1-) et le passe dans le MÊME moteur
// (squelette, forces, lancers, contrôle biomécanique, anatomie), mais à TA taille et TON envergure au lieu des deux tailles de référence.
// Il ne génère rien : il mesure chaque mouvement, cherche des variantes de pieds dans les prises du bloc, puis rédige un rapport.
// Tous les chiffres viennent du modèle : ce sont des estimations de tendance, pas une mesure de toi sur le mur.

const fr=(v,d)=>(+v).toFixed(d||0).replace(".",",");
const pcT=v=>Math.round(v*100)+" %";
const svLab=i=>(LVL.find(l=>i<l[2])||LVL[LVL.length-1])[0];
const SVP_KEY="solve_prof",SVH_KEY="solve_hist";

// ---------- Profil du grimpeur ----------
const WEAK={doigts:"Petites prises, réglettes",slopers:"Slopers et plats",lancers:"Lancers",souplesse:"Souplesse, pieds hauts",gainage:"Gainage, pieds qui partent",force:"Blocages, tractions",endurance:"Continuité, endurance"};
const SENS={doigts:"Doigts",epaule:"Épaules",coude:"Coudes",poignet:"Poignets",genou:"Genoux, hanches",dos:"Dos"};
// Noms des styles à gestes techniques et des styles personnels du générateur (styles.js et ustyles.js ne sont pas chargés ici).
// libellés des styles ajoutés par le générateur (styles.js, ustyles.js) : seulement s'ils manquent, pour ne jamais changer ceux du générateur quand il charge ce fichier (v29, 3.2)
(o=>{for(const k in o)if(!(k in MVN))MVN[k]=o[k]})({flag:"Drapeaux",press:"Rétablissements (poussée sur plat)",under:"Oppositions et tirages latéraux",lock:"Blocages (lock-off)",endur:"Endurance (long et enchaîné)",power:"Puissance (peu de mouvements durs)"});
try{(ls(KEY.ustyles,[])||[]).forEach(u=>{if(u&&u.id&&u.name&&!(u.id in MVN))MVN[u.id]="★ "+u.name})}catch(e){}
// Profil de grimpeur du générateur (onglet Grimpeur), lu au chargement : c'est le même grimpeur.
const GENPROF=Object.assign({},PROF);
let SP=Object.assign({H:170,ape:100,weak:[],sens:[]},ls(SVP_KEY,null)||(GENPROF.on?{H:Math.round(GENPROF.H),ape:Math.round((GENPROF.ape||1)*100)}:{}));
const saveProf=()=>ss(SVP_KEY,SP);
// Corrections apprises de tes essais (recalculées depuis ton suivi par calReplay, trust.js). Valeurs neutres par défaut.
const CAL0={reach:1,m1load:1,m1stab:.55,m1barn:1,m1dyn:1,m2cap:1,m2mu:.75,m2dyn:1,hold:{},n:0};
let CAL=JSON.parse(JSON.stringify(CAL0));

// Le moteur v28 sait travailler pour UN grimpeur (profil de grimpeur du générateur : PROF, applyClimber, config.js).
// withEngine règle ce profil le temps d'un calcul, puis remet le moteur dans son état d'origine.
function withEngine(cfg,fn){
  const save=Object.assign({},PROF);Object.assign(PROF,cfg);applyClimber();
  try{return fn(BODY.hMid)}finally{Object.keys(PROF).forEach(k=>delete PROF[k]);Object.assign(PROF,save);applyClimber()}
}
// Souplesse et force : reprises du profil avec lequel le bloc a été généré, s'il y en a un (même grimpeur) ; sinon valeurs moyennes.
const blockClimber=()=>B&&B.climber&&B.climber.H?B.climber:null;
// Exécute fn avec le moteur réglé sur TA morphologie (ou sur une taille imposée Hf, envergure kf, proportions moyennes).
function withBody(fn,Hf,kf){
  const bc=blockClimber()||(GENPROF.on?GENPROF:{});
  const cfg=Hf?{on:true,H:Hf,ape:kf||1,flex:1,force:1}:{on:true,H:SP.H,ape:SP.ape/100*CAL.reach,flex:bc.flex||1,force:bc.force||1};
  return withEngine(cfg,fn);
}
// Réglage du moteur avec lequel le bloc a été généré : son profil de grimpeur, ou les deux tailles 1,50 et 1,90 m.
const refCfg=()=>{const c=blockClimber();return c?Object.assign({on:true,flex:1,force:1,ape:1},c,{on:true}):{on:false}};
const refLabel=()=>{const c=blockClimber();return c?`pour un grimpeur de ${fr(c.H/100,2)} m`:"tailles 1,50 à 1,90 m"};

// ---------- Reconstruction du bloc ----------
let B=null,S=null,AN=null;
const FALLBACK_IMG="data:image/svg+xml,"+encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><ellipse cx="50" cy="50" rx="46" ry="38" fill="#8d99a2"/></svg>');
function svHold(n){
  let h=byN(n);if(h)return h;
  const d=(B&&B.holds||{})[n]||{name:"Prise "+n,w:9,h:7,fam:"dish",grip:3};
  h={n,type:d.name,grip:d.grip||3,col:"#8d99a2",fam:FAM[d.fam]?d.fam:"dish",w:d.w||9,h:d.h||7,rot:0,on:true,slo:!!d.slo,crimp:/Réglette/.test(d.name||"")||d.fam==="bar",type0:d.name,grip0:d.grip,custom:1,img:FALLBACK_IMG,missing:1};
  holds.push(h);IMG[n]=[100,100,.5,.5];return h;
}
function svHole(r){
  let o=holes[r.id];if(o&&o.pi===r.pi&&Math.abs(o.dl-r.dl)<1.5&&Math.abs(o.y-r.y)<1.5)return o;
  o=holes.find(q=>q.pi===r.pi&&Math.abs(q.dl-r.dl)<3&&Math.abs(q.y-r.y)<3);if(o)return o;
  throw new Error("Ce bloc a été généré sur un mur différent de celui enregistré ici : la prise n°"+r.n+" ne tombe sur aucun trou.");
}
// Appui de pied sans tirage au sort (le générateur tire l'orientation, ici elle est connue).
function svFq(h,rho,o){
  const kind=footKind(h),f=facAt(h,rho,FOOT_PSI);
  if(f==null)return h.fam==='dish'||h.slo?{rho,f:2.6,kind:'adherence',stab:.3}:{rho,f:4,kind,stab:.15};
  let stab=clamp(1.25/f,0,1);if(kind==='adherence')stab*=Math.max(.35,1-.014*Math.max(0,o.tilt||0));
  return{rho,f,kind,stab};
}
function svBuild(b){
  // les réglages de prises enregistrés avec le bloc (tenue, nom, taille) priment sur l'inventaire par défaut
  Object.entries(b.holds||{}).forEach(([n,d])=>{const h=svHold(+n);if(!d)return;if(d.grip)h.grip=d.grip;if(d.name){h.type=d.name;h.slo=!!d.slo||/Sloper/.test(d.name);h.crimp=/R\u00e9glette/.test(d.name)||d.fam==="bar"}if(d.w)h.w=d.w;if(d.h)h.h=d.h;if(d.fam&&FAM[d.fam])h.fam=d.fam;if(d.dep>0&&!(h.dep>0)){h.dep=d.dep;h.ang=d.ang||0}});
  const cache=new Map();
  const R=(r,foot)=>{if(!r)return null;const key=r.id+"|"+r.n+"|"+(r.rho||0)+(foot?"f":"");if(cache.has(key))return cache.get(key);
    const o=svHole(r),h=svHold(r.n),x={o,h,rho:r.rho||0};if(foot)x.fq=svFq(h,x.rho,o);cache.set(key,x);return x};
  const q=b.seq,h0=q.h0.map(r=>R(r)),f0=(q.f0||[]).map(r=>R(r,1));
  let hd=h0,ft=f0;
  const mv=q.mv.map(m=>{
    const t=R(m.hand),ot=R(m.fixed)||hd.find(x=>x.o!==t.o)||hd[0];
    const phd=m.hd&&m.hd.length?m.hd.map(r=>R(r)):hd,pft=m.ft?m.ft.map(r=>R(r,1)):ft;
    const nf=pft.filter(x=>!ft.some(p=>p.o===x.o));
    let flag=null;if(m.flag){const st=ft.find(p=>p.o.id===m.flag.id)||R(m.flag,1);flag={stand:st,free:ft.find(p=>p.o!==st.o)||null}}
    const o={o:t.o,h:t.h,rho:t.rho,ot,hd:phd,ft:pft,nf,flag,pair:m.pair?R(m.pair):null,side:m.side||(t.o.x<ot.o.x?"gauche":"droite"),main:m.main||null,
      m:{dyn:!!m.dyn,cross:!!m.cross,d:dist(t.o,ot.o),dbl:!!m.pair},tech:m.tech||[],finish:!!m.finish};
    hd=phd;ft=pft;return o;
  });
  return{h0,f0,mv,style:b.style||"mix"};
}

// ---------- Mesures d'un mouvement ----------
const DIRS=["à droite de","au-dessus et à droite de","au-dessus de","au-dessus et à gauche de","à gauche de","sous et à gauche de","sous","sous et à droite de"];
const dirTxt=a=>DIRS[Math.round((((a*180/Math.PI)%360)+360)%360/45)%8];
const PULLS=["vers la droite","vers le haut et la droite","vers le haut","vers le haut et la gauche","vers la gauche","vers le bas et la gauche","vers le bas","vers le bas et la droite"];
const pullTxt=a=>PULLS[Math.round((((a*180/Math.PI)%360)+360)%360/45)%8];
const angDiff=(a,b)=>{let d=Math.abs(a-b)%(2*Math.PI);return(d>Math.PI?2*Math.PI-d:d)*180/Math.PI};
const ideal=rho=>(-90+rho)*D2R; // direction prise -> bassin qui rend la prise la meilleure (body.js, facAt)
const sizeF=h=>clamp(Math.sqrt(90/(h.w*h.h)),.88,1.2);

// Coût d'un mouvement à la taille du profil : même formule que moveCost / pairCost (body.js), avec l'orientation réelle de la prise.
function svCost(s,m,pre,fixed,Hc,camp,freeAt){
  const tl=m.o.tilt||0,learn=n=>(1+.1*(LEARN.a[n]||0))*(freeAt?1:1+.1*(CAL.hold[n]||0));let c,parts;
  if(m.pair){
    const D=dynoPair(pre,{o:m.o,h:m.h},{o:m.pair.o,h:m.pair.h},Hc,camp);
    if(!D)return{cost:9,parts:{reach:9},imp:true};
    let g=0;for(const x of[m,m.pair]){const f=facAt(x.h,x.rho,Math.atan2(D.p1.y-x.o.y,D.p1.x-x.o.x));g+=.6*Math.pow(x.h.grip*sizeF(x.h),1.25)*(f==null?3:f)*.9+(x.h.slo&&(x.o.tilt||0)>0?.02*x.o.tilt:0)}
    const dy=3*Math.max(0,D.ratio-.55)+1;c=(g+dy)/2*(learn(m.h.n)+learn(m.pair.h.n))/2;parts={grip:g/2,dyn:dy/2};
    return{cost:c,parts};
  }
  const reach=reachOf(Hc),ratio=m.m.d*(1+.003*Math.max(0,tl))/reach,free=(freeAt?m.m.d*(1+.003*Math.max(0,tl))/freeAt:ratio)>1; // le générateur décide « main libre » à la portée du petit grimpeur
  const hp=hips([fixed,{o:m.o,h:m.h,free}],pre.ft,Hc,camp),f=facAt(m.h,m.rho,Math.atan2(hp.y-m.o.y,hp.x-m.o.x)),load=.5+.5*Math.min(1,Math.abs(hp.x-m.o.x)/(.35*Hc));
  parts={tension:1.2*Math.min(1,(hp.slack||0)/(SK.tol*Hc)),grip:.6*Math.pow(m.h.grip*sizeF(m.h),1.25)*(f==null?3:f)*(.6+.8*load),
    reach:2.5*Math.max(0,ratio-.8)+(ratio>1?2+3*(ratio-1):0),cross:m.m.cross?1:0,
    lock:fixed.o.y-hp.y<LK.y*Hc&&ratio>LK.ratio?LK.cost*Math.min(1,(ratio-LK.ratio)/.15):0};
  c=Object.values(parts).reduce((a,b)=>a+b,0);if(!hp.ok)c+=3;
  let k=camp?1.4:1;k*=tl>0?1+.008*tl:Math.max(.88,1+.006*tl);if(m.h.slo&&tl>0)k*=1+.01*tl;k*=learn(m.h.n);
  for(const p in parts)parts[p]*=k;
  return{cost:c*k,parts,imp:!hp.ok};
}

// Prises du bloc utilisables comme pied (pieds prévus + prises de main en « pied-main »).
function footPool(s){
  const seen=new Map(),add=(x,asHand)=>{if(!x||seen.has(x.o.id))return;const fq=x.fq||svFq(x.h,x.rho,x.o);seen.set(x.o.id,{o:x.o,h:x.h,rho:x.rho,fq,asHand})};
  s.f0.forEach(x=>add(x,0));s.mv.forEach(m=>m.ft.forEach(x=>add(x,0)));
  s.h0.forEach(x=>add(x,1));s.mv.forEach(m=>{add({o:m.o,h:m.h,rho:m.rho},1);if(m.pair)add(m.pair,1)});
  return[...seen.values()];
}
// Évalue une configuration de pieds pour le transit (main fixe + main qui part), avec les règles de physics.js.
function feetEval(m,pre,fixed,prev,feet,Hc,camp,needDyn){
  const tgt={o:m.o,h:m.h,rho:m.rho},hp=hips([fixed,tgt],feet,Hc,camp);
  const out={hard:[],soft:[],margin:1,loads:[],dyns:[]};v3state([fixed,prev],feet,Hc,true,camp,"x",out,undefined,m.o,!!m.flag);
  const L=loadsOf([fixed],feet,Hc,true,m.o),barn=L.barn*(m.flag?.4:1),share=L.hand[0]?L.hand[0].share:1;
  const D=needDyn?dynoOf({hd:pre.hd,ft:feet},m.o,m.h,Hc,camp):null,stab=feet.length?Math.min(...feet.map(q=>(q.fq||{stab:.5}).stab)):0;
  const score=(hp.ok?0:60+hp.slack)+(hp.slack||0)*.6+out.hard.length*25+barn*18+share*22+(D?D.ratio*14:0)-stab*6;
  return{hp,hard:out.hard.length,barn,share,D,stab,score};
}
function footSearch(m,pre,fixed,prev,Hc,camp,needDyn){
  if(camp||!pre.ft.length)return null;
  const base=feetEval(m,pre,fixed,prev,pre.ft,Hc,camp,needDyn),lowY=Math.min(fixed.o.y,m.o.y)-25;
  let best=null;
  for(const c of footPool(S)){
    if(c.o===fixed.o||c.o===m.o||c.o===prev.o||c.o.y>lowY||c.fq.stab<.4||pre.ft.some(q=>q.o===c.o))continue;
    const slots=pre.ft.length<2?[-1]:[0,1];
    for(const i of slots){
      const feet=i<0?[...pre.ft,c]:pre.ft.map((q,j)=>j===i?c:q),e=feetEval(m,pre,fixed,prev,feet,Hc,camp,needDyn);
      if(!best||e.score<best.e.score)best={c,i,e};
    }
  }
  if(!best||base.score-best.e.score<5)return null;
  const g=[],b=base,e=best.e;
  if(!b.hp.ok&&e.hp.ok)g.push("la prise devient atteignable en statique");else if((b.hp.slack||0)-(e.hp.slack||0)>3)g.push(`le corps est moins tendu (${Math.round(b.hp.slack-e.hp.slack)} cm de marge gagnés)`);
  if(b.share-e.share>.06)g.push(`la main fixe porte ${pcT(e.share)} du poids au lieu de ${pcT(b.share)}`);
  if(b.barn-e.barn>.15&&b.barn>FM.barnSoft*.7)g.push("la rotation en porte disparaît");
  if(b.D&&e.D&&b.D.ratio-e.D.ratio>.08)g.push(e.D.need<=0?"le lancer n'est plus nécessaire":`le lancer demande ${pcT(e.D.ratio)} de ta détente au lieu de ${pcT(b.D.ratio)}`);
  if(b.hard>e.hard)g.push("une impossibilité du modèle est levée");
  if(!g.length)return null;
  const old=best.i>=0?pre.ft[best.i]:null,other=best.i>=0?pre.ft[1-best.i]:null;
  const side=old&&other?(old.o.x<other.o.x?"gauche":"droit"):"libre";
  return{side,old,c:best.c,gains:g,base,e,static:!b.hp.ok&&e.hp.ok};
}

function svMove(s,m,k,pre,Hc,camp,reach){
  const fixed=m.hd.find(q=>q.o===m.ot.o)||m.ot,prev=pre.hd.find(q=>q.o!==fixed.o)||pre.hd[0],tgt={o:m.o,h:m.h,rho:m.rho},pair=!!m.pair;
  const d=m.m.d,rr=d/reach,dx=m.o.x-fixed.o.x,dy=m.o.y-fixed.o.y;
  const hpT=pair?null:hips([fixed,tgt],pre.ft,Hc,camp);                         // main posée sur la cible, pieds d'avant
  const hpX=hips([fixed,Object.assign({},tgt,{free:true})],pre.ft,Hc,camp);     // transit : main en l'air
  const hpPre=hips(pre.hd,pre.ft,Hc,camp),hpP=hips(m.hd,m.ft,Hc,camp);
  const hpTF=!pair&&m.nf.length?hips([fixed,tgt],m.ft,Hc,camp):null;            // en posant d'abord les nouveaux pieds
  const psi=Math.atan2(hpP.y-m.o.y,hpP.x-m.o.x),f=facAt(m.h,m.rho,psi),pid=ideal(m.rho),err=angDiff(psi,pid);
  const ff=facAt(fixed.h,fixed.rho,Math.atan2(hpX.y-fixed.o.y,hpX.x-fixed.o.x));
  const L=pair||camp?null:loadsOf([fixed],pre.ft,Hc,true,m.o),share=L&&L.hand[0]?L.hand[0].share:camp?1:.5,barn=L?L.barn*(m.flag?.4:1):0;
  const lock=!pair&&fixed.o.y-hpPre.y<LK.y*Hc&&rr>=LK.ratio;
  const D=pair?dynoPair(pre,tgt,m.pair,Hc,camp):(m.m.dyn||(hpT&&!hpT.ok))?dynoOf(pre,m.o,m.h,Hc,camp):null;
  const feetPre=pre.ft.map(q=>({q,fq:q.fq||svFq(q.h,q.rho,q.o)})),minStab=feetPre.length?Math.min(...feetPre.map(x=>x.fq.stab)):null;
  const C=svCost(s,m,pre,fixed,Hc,camp);
  return{k,m,pre,fixed,prev,tgt,pair,d,rr,dx,dy,hpT,hpX,hpPre,hpP,hpTF,psi,f,pid,err,ff,share,barn,lock,D,feetPre,minStab,cost:C.cost,parts:C.parts,imp:C.imp};
}

function svAnalyze(){
  return withBody(Hc=>{
    const s=S,camp=s.style==='nofeet',v3=v3check(s,camp),reach=reachOf(Hc);
    let hd=s.h0,ft=s.f0;const M=[];
    s.mv.forEach((m,k)=>{const pre={hd,ft};M.push(svMove(s,m,k,pre,Hc,camp,reach));hd=m.hd;ft=m.ft});
    const cs=M.map(x=>x.cost),q=cs.slice().sort((a,b)=>b-a),Dd=q[0]+.35*q.slice(0,3).reduce((a,b)=>a+b,0)/Math.min(3,q.length)+.06*cs.length;
    const idx=(Dd-1.2)*2+learnOff(s.style),crux=cs.reduce((b,v,i)=>v>cs[b]?i:b,0),rank=cs.map(v=>cs.filter(w=>w>v).length+1);
    const hard=[...new Set(v3.hard.map(t=>t.replace(/ \(\d+ cm\)/,"")))],soft=[...new Set(v3.soft.map(t=>t.replace(/ \(\d+ cm\)/,"")))];
    return{Hc,reach,camp,v3,hard,soft,M,idx,crux,rank};
  });
}

// ---------- Savoir-faire : préhension, pieds, gestes ----------
function gripTech(h){return gripTech0(h)+measTip(h)}
// Conseil tiré des mesures de la prise (3.3), s'il y en a.
function measTip(h){
  if(!(h&&h.dep>0)||h.fam==="tri")return"";const d=h.dep,a=h.ang||0,L=[];
  if(d<=8)L.push(`Bord de ${d} mm : seules les premières phalanges tiennent ; semi-arquée, doigts groupés, et pas de jeté sec dessus (risque de poulie)`);else if(d<=14)L.push(`Bord de ${d} mm : place les doigts jusqu'au fond avant de charger`);
  if(a<=-12)L.push(`surface fuyante de ${-a}° : la tenue vient du frottement, garde le bassin bas et sous la prise`);else if(a>=12)L.push(`bord rentrant de ${a}° : la prise accepte une traction de biais, profites-en`);
  return L.length?" "+L.join(" ; ")+".":"";
}
function gripTech0(h){
  const small=h.w<=7||h.h<=4;
  if(h.slo||h.fam==='circ'&&h.grip>=3)return"Main ouverte, toute la paume au contact, bras tendu. Plus le bassin est bas et sous la prise, plus le frottement tient : ne remonte pas le bassin avant d'avoir la main suivante.";
  if(h.crimp||h.fam==='bar')return`Semi-arquée : index et majeur pliés, pouce libre ou posé à côté. Évite l'arquée complète (pouce verrouillé sur l'index) sur un passage tenu : c'est la position qui charge le plus la poulie A2.${small?" Bord étroit : place les doigts groupés au plus profond du bord.":""}`;
  if(h.fam==='tri')return"Pince : pouce en opposition franche, serre avant de tirer et garde le poignet dans l'axe de l'avant-bras.";
  if(h.fam==='arc')return"Prends le creux du crochet, doigts groupés, et tire dans l'axe de la courbe. C'est aussi un bon appui de pointe ou de talon.";
  if(h.fam==='horn')return"Deux options : pince sur les cornes, ou main en crochet derrière l'une d'elles. Prise solide pour un talon ou une pointe.";
  if(h.fam==='drop')return"Prends le bord le plus marqué du bec et tire dans le sens où il s'ouvre ; main ouverte si le bord est arrondi.";
  if(h.fam==='facet')return"Cherche la facette qui fait bord et place les doigts dessus ; les arêtes se tiennent mieux en pince.";
  return h.grip<=2?"Prise généreuse : main ouverte, relâche l'avant-bras, c'est un bon endroit pour secouer.":`Plat : main ouverte, doigts serrés, tire dans l'axe.${small?" Petite surface : deux ou trois doigts suffisent, sans monodoigt.":""}`;
}
const FOOTT={pointe:"Pose la pointe de la chaussure (gros orteil) précisément sur le meilleur point, talon légèrement relevé, et ne le bouge plus pendant la traction.",
  carre:"Pied de carre (bord intérieur du chausson) : genou ouvert, appui sur le bord, il se verrouille mieux qu'une pointe sur cette prise.",
  adherence:"Adhérence : talon bas, le plus de gomme possible au contact, et charge progressivement. Éloigne un peu le bassin du mur pour pousser dans la prise plutôt que le long du mur.",
  plat:"Pied à plat sur la prise, appui franc ; c'est un bon pied pour pousser fort."};
const TECHTXT={
  talon:"Crochet de talon : talon posé derrière la prise, orteils vers l'extérieur, tire avec l'ischio comme avec une troisième main. Garde le genou aligné et évite de pivoter le talon en charge.",
  pointe:"Crochet de pointe : dessus du chausson contre la prise, pointe de pied tirée vers toi, jambe gainée. Utile pour rester plaqué sous un dévers.",
  compression:"Compression d'angle : serre les deux pans comme une boîte, bras légèrement fléchis, et pousse les pieds l'un contre l'autre (opposition) pour soulager les mains.",
  opposition:"Opposition (inversée) : bassin au-dessus de la main, pieds hauts, la traction se fait vers le haut. Pousse sur les jambes et garde le ventre gainé.",
  lateral:"Tirage latéral : corps de profil, hanche du côté de la main contre le mur, pied opposé en carre pour faire contre-poids.",
  blocage:"Blocage : épaule basse et coude au corps sur la main fixe, puis va chercher la prise sans à-coup.",
  retablissement:"Rétablissement : paume à plat, doigts écartés, pousse vers le bas en montant un pied haut, puis transfère le poids au-dessus de la main.",
  drapeau:"Drapeau : garde le pied sous la main fixe et plaque l'autre jambe tendue contre le mur en contrepoids, du côté opposé à la rotation ou croisée derrière l'autre jambe, selon ce qui te stabilise.",
  croise:"Croisé : corps de profil, bras fixe tendu, la main qui part passe devant (ou dessous) en gardant les hanches près du mur.",
  dyno:"Lancer : bras tendus, descends le bassin, pousse fort des jambes, regard sur la prise et main déjà formée pour l'attraper.",
  dyno2:"Lancer à deux mains : charge les jambes, décolle d'un coup en lâchant les deux mains ensemble, et attrape les deux prises au sommet de la trajectoire."};

// ---------- Diagnostic d'un mouvement ----------
const SYM={reach:"Je n'atteins pas la prise",hold:"Je ne tiens pas la prise",feet:"Mes pieds glissent",swing:"Je pivote ou je décolle du mur",jump:"Mon lancer est trop court",catch:"Je lâche à la réception",pump:"J'arrive cramé",method:"Je ne vois pas la méthode"};
const SYMMAP={reach:["reach","tension","lock","dyn"],hold:["grip","load","catch","fatigue"],feet:["feet","barn"],swing:["barn","feet","grip"],jump:["dyn","reach"],catch:["catch","grip"],pump:["fatigue","load","lock"],method:["method","reach","barn"]};
const CAUSEN={reach:"Portée",tension:"Corps en extension",grip:"Prise d'arrivée",load:"Main fixe chargée",barn:"Rotation en porte",lock:"Blocage",feet:"Pieds instables",dyn:"Lancer",catch:"Réception",cross:"Croisé",fatigue:"Fatigue accumulée",method:"Geste imposé"};
function weakFor(id,x){
  const W=new Set(SP.weak),h=x.m.h;
  return(id==="grip"&&((W.has("doigts")&&(h.crimp||h.fam==="bar"||h.w<=7))||(W.has("slopers")&&(h.slo||h.fam==="dish"))))||((id==="dyn"||id==="catch")&&W.has("lancers"))||
    ((id==="reach"||id==="tension")&&W.has("souplesse"))||((id==="barn"||id==="feet")&&W.has("gainage"))||((id==="lock"||id==="load")&&W.has("force"))||(id==="fatigue"&&W.has("endurance"));
}
function diagnose(A,k,sym){
  const x=A.M[k],m=x.m,Hc=A.Hc,C=[],add=(id,score,why,fix)=>{if(score>0)C.push({id,score:clamp(score,0,1),why,fix:fix||[]})};
  const n=h=>"n°"+h.n,ns=q=>`${n(q.h)} (${q.h.type.toLowerCase()})`,hand=m.main||(m.m.cross?(m.side==="gauche"?"droite":"gauche"):m.side);
  const fs=x.pair||A.camp?null:withBody(H=>footSearch(m,x.pre,x.fixed,x.prev,H,A.camp,!!x.D));
  const footFix=fs?{key:"foot",p:1,t:`Pied ${fs.side} : ${fs.old?`passe de ${n(fs.old.h)} à `:"ajoute "}${n(fs.c.h)}${fs.c.asHand?" (prise de main utilisée en pied)":""} avant de partir. Selon le modèle, ${fs.gains.join(", ")}.`}:null;
  // Portée
  if(!x.pair){
    const lat=Math.abs(x.dx)>.25*Hc,up=x.dy>.2*Hc,fix=[];
    if(x.hpTF&&x.hpT&&(!x.hpT.ok&&x.hpTF.ok||(x.hpT.slack||0)-(x.hpTF.slack||0)>4))fix.push({key:"feetfirst",p:0,t:`Monte d'abord les pieds sur ${m.nf.map(q=>n(q.h)).join(" et ")} (les pieds prévus après ce mouvement), puis pars : ${!x.hpT.ok&&x.hpTF.ok?"la prise devient atteignable en statique":"le corps est moins tendu"}.`});
    if(footFix)fix.push(footFix);
    if(lat)fix.push({key:"lolotte",p:2,t:`Hanche ${hand==="droite"?"droite":"gauche"} contre le mur (genou rentré, lolotte) : de profil, l'épaule de la main qui part se rapproche de la prise. Le modèle ne chiffre pas ce gain, souvent de quelques centimètres.`});
    if(up)fix.push({key:"push",p:2,t:"Pousse sur les jambes avant de tirer : bassin haut, bras fixe tendu le plus longtemps possible, verrouille seulement en fin de mouvement."});
    if(x.D&&x.D.need>0&&!m.m.dyn){const r=x.D.ratio;fix.push({key:"dead",p:3,t:r<=DY.soft?`Point mort : un petit décollement d'environ ${Math.round(x.D.need)} cm suffit (${pcT(r)} de ta détente estimée). Bras fixe tendu, pousse des jambes et attrape au sommet.`:`Même en lancer, il faut ${pcT(r)} de ta détente estimée${r>DY.hard?" : au-delà de ce que le modèle juge possible à ta taille":" : à la limite"}. Cherche d'abord une meilleure position de pieds.`})}
    if(x.hpT&&!x.hpT.ok){const L=x.hpT.limit,o=Math.round(L?L.over:0);
      add("reach",m.m.dyn?.55:1,`${m.m.dyn?"Prévu en lancer : en statique, ":"En statique, "}${n(m.h)} est hors de portée à ta taille : ${L&&L.kind==="foot"?`le pied sur n°${L.n} ne peut pas rester en place (il manque ${o} cm à la jambe)`:`il manque environ ${o} cm au bras`}. Distance depuis la main fixe : ${Math.round(x.d)} cm, soit ${pcT(x.rr)} de ta portée.`,fix)}
    else if(x.hpT&&x.hpT.slack>.5)add("reach",.65,`${n(m.h)} est à la limite de ta portée : corps tendu de ${Math.round(x.hpT.slack)} cm au-delà de la position confortable (${Math.round(x.d)} cm, ${pcT(x.rr)} de ta portée).`,fix);
    else if(x.rr>.85)add("reach",.4,`Mouvement long : ${Math.round(x.d)} cm, soit ${pcT(x.rr)} de ta portée statique.`,fix);
    else if(fix.length&&fix[0].key==="feetfirst")add("reach",.3,"La prise est atteignable, mais l'ordre pieds puis main rend le mouvement plus confortable.",fix);
  }
  if(x.hpP.slack>.5)add("tension",.5,`Une fois la prise attrapée, le corps reste étiré (${Math.round(x.hpP.slack)} cm au-delà de la position confortable) : épaule et hanche en bout de course.`,[m.nf.length?{key:"tens",p:1,t:`Replace les pieds dès que la main est verrouillée : ${m.nf.map(q=>n(q.h)).join(", ")}.`}:{key:"tens",p:2,t:"Ne reste pas étiré : enchaîne la main suivante ou remonte un pied dès que possible."}]);
  // Prise d'arrivée et orientation
  {const h=m.h,f=x.f==null?3:x.f,g=h.grip,sc=(g*f*(1+.15*(CAL.hold[h.n]||0))-3)/6,fix=[{key:"grip"+h.n,p:3,t:`Sur ${n(h)} : ${gripTech(h)}`}];
    if(x.err>25)fix.unshift({key:"axis",p:1,t:`${n(h)} se tire ${pullTxt(x.pid)} : place ton bassin ${dirTxt(x.pid)} la prise pour tirer dans son axe (aujourd'hui l'effort arrive à ${Math.round(x.err)}° de cet axe).`});
    if(h.slo&&(m.o.tilt||0)>0)fix.push({key:"slotilt",p:2,t:"Sloper en dévers : garde les bras tendus et les pieds poussés au mur, toute flexion des bras fait glisser la paume."});
    add("grip",sc,`${n(h)}, ${h.type.toLowerCase()} de tenue ${g}/5, tournée à ${m.rho}° : ${f<=1.25?"tu tires dans son axe":`la traction arrive de biais (facteur ${fr(f,1)}, 1 = idéal)`}.`,fix)}
  // Main fixe
  if(!x.pair&&!A.camp){const pf=pulleyF(x.fixed.h),ix=x.share*pf,fix=[];if(footFix)fix.push(footFix);
    fix.push({key:"hipin",p:2,t:`Rapproche le bassin du mur et pousse sur les pieds : chaque appui de pied mieux chargé soulage ${n(x.fixed.h)}.`});
    if(x.fixed.h.grip>=4)fix.push({key:"fast",p:3,t:`Ne reste pas en statique sur ${n(x.fixed.h)} : prépare le mouvement, puis pars franchement.`});
    add("load",(ix/CAL.m1load-.55)/1.4,`Pendant que la main part, ${ns(x.fixed)} porte environ ${pcT(x.share)} du poids du corps${x.ff!=null&&x.ff>1.5?", tirée de biais":""}.`,fix)}
  // Rotation
  if(x.barn>FM.barnSoft*.6*CAL.m1barn){const fix=[];if(footFix)fix.push(footFix);fix.push({key:"flag",p:1,t:TECHTXT.drapeau});fix.push({key:"core",p:2,t:"Serre fessiers et abdominaux, et avance la hanche de la main fixe vers le mur avant de lâcher."});
    add("barn",x.barn/(FM.barnHard*CAL.m1barn),`Risque de rotation en porte : la main fixe ${n(x.fixed.h)} et le pied le plus proche sont presque à la verticale, et la main part ${x.dx>0?"à droite":"à gauche"}.`,fix)}
  // Blocage
  if(x.lock){const fix=[];if(footFix)fix.push(footFix);fix.push({key:"lockt",p:2,t:TECHTXT.blocage});fix.push({key:"lockdead",p:3,t:"Si le blocage ne tient pas, remplace-le par un petit point mort : une poussée de jambes au lieu de la force du bras."});
    add("lock",.35+.6*clamp((x.rr-LK.ratio)/.25,0,1),`Main fixe ${n(x.fixed.h)} sous l'épaule (bras plié) pendant que l'autre part à ${Math.round(x.d)} cm : c'est un blocage.`,fix)}
  // Pieds
  const sd=CAL.m1stab-.55;if(x.minStab!=null&&x.minStab<.6+sd){const w=x.feetPre.reduce((a,b)=>a.fq.stab<=b.fq.stab?a:b),fix=[{key:"ft"+w.q.h.n,p:2,t:`Pied sur ${n(w.q.h)} : ${FOOTT[w.fq.kind]}`}];if(footFix&&fs.c.fq.stab>w.fq.stab+.1)fix.unshift(footFix);
    add("feet",(.7+sd-x.minStab)/.45,`Appui fragile : le pied sur ${ns(w.q)} est un appui ${w.fq.kind==="adherence"?"d'adhérence":w.fq.kind==="pointe"?"de pointe":w.fq.kind==="carre"?"de carre":"à plat"} mal orienté (${w.q.rho}°)${(w.q.o.tilt||0)>10?", en dévers":""}.`,fix)}
  // Lancer et réception
  if(x.D&&(m.m.dyn||x.pair)){const D=x.D,r=D.ratio,fix=[];
    if(footFix&&fs.e.D&&fs.base.D&&fs.base.D.ratio-fs.e.D.ratio>.08)fix.push(footFix);
    fix.push({key:"dyn",p:1,t:D.need<12?`Point mort plutôt qu'un vrai saut : ${Math.round(D.need)} cm à gagner. Bras fixe tendu, pousse des jambes, attrape quand le corps cesse de monter.`:(x.pair?TECHTXT.dyno2:TECHTXT.dyno)});
    if(x.hpT&&x.hpT.ok)fix.push({key:"static",p:0,t:`À ta taille, la prise s'atteint aussi en statique : essaie-la sans lancer, en montant les pieds et en gardant le bras fixe tendu.`});
    if(SP.sens.includes("epaule"))fix.push({key:"sh",p:4,t:"Épaule sensible déclarée : privilégie toute méthode statique et ne rattrape pas un lancer bras au-dessus de la tête si la prise est petite."});
    add("dyn",(r-.35)/.7,`Lancer : le bassin doit gagner environ ${Math.round(D.need)} cm au-delà de ta portée, en ${fr(D.t,2)} s de vol, soit ${pcT(r)} de ta détente estimée${r>DY.hard?" (au-delà du possible pour le modèle)":r>DY.soft?" (à la limite)":""}.`,fix);
    if(D.capRatio>.6)add("catch",(D.capRatio-.6)/.7,`Réception : environ ${fr(D.impact,1)} fois le poids du corps arrive sur ${x.pair?`${n(m.h)} et ${n(m.pair.h)}`:n(m.h)}, pour une prise qui permet d'en verrouiller environ ${fr(D.cap,1)}.`,[
      {key:"catch1",p:1,t:"Vise le point mort : la main doit arriver quand le corps ne monte plus, pas pendant la montée."},
      {key:"catch2",p:2,t:"Main déjà formée pour la prise avant l'impact, doigts fermés aussitôt le contact."},
      {key:"catch3",p:2,t:"Garde au moins un pied sur le mur si tu peux : il freine le balancier à la réception."}])}
  if(m.m.cross&&!x.pair)add("cross",.35,`Croisé ${m.o.y<x.fixed.o.y?"par-dessous":"par-dessus"} : la main ${hand} passe de l'autre côté de ${n(x.fixed.h)}.`,[{key:"cross",p:2,t:TECHTXT.croise}]);
  // Fatigue accumulée
  if(k>=2){const before=A.M.slice(0,k),sum=before.reduce((a,y)=>a+y.cost,0),avg=A.M.reduce((a,y)=>a+y.cost,0)/A.M.length;
    let rest=null,best=9;before.forEach((y,j)=>{const gr=(y.m.hd[0].h.grip+y.m.hd[1].h.grip)/2;if(gr<best){best=gr;rest=j}});
    add("fatigue",k<3?0:Math.min(.45,.1+.035*k+(sum/(avg*k)-1)*.5),`${k} mouvement${k>1?"s":""} avant celui-ci, dont ${before.filter(y=>A.rank[y.k]<=3).length} parmi les plus durs du bloc : les avant-bras arrivent déjà entamés.`,
      rest!=null&&best<=3?[{key:"rest",p:2,t:`Secoue après le mouvement ${rest+1} (mains sur ${n(A.M[rest].m.hd[0].h)} et ${n(A.M[rest].m.hd[1].h)}, tenue moyenne ${fr(best,1)}/5) : c'est la meilleure position de repos avant ce passage.`},{key:"split",p:3,t:`Travaille le passage seul en partant directement du mouvement ${k} pour le régler, puis enchaîne depuis le départ.`}]:[{key:"split",p:3,t:`Travaille le passage seul en partant directement du mouvement ${k} pour le régler, puis enchaîne depuis le départ.`}])}
  // Gestes imposés par l'ouverture
  const tk=(m.tech||[]).filter(t=>TECHTXT[t]&&t!=="dyno"&&t!=="dyno2"&&t!=="croise");
  if(tk.length)add("method",.45,`L'ouverture impose : ${tk.map(techName).join(", ")}.`,tk.map(t=>({key:"tech"+t,p:1,t:TECHTXT[t]})));
  // Classement : symptômes déclarés et points faibles
  const sy=[...sym],hit=new Set(sy.flatMap(s=>SYMMAP[s]||[]));
  C.forEach(c=>{c.sym=hit.has(c.id);c.weak=weakFor(c.id,x);c.rank=c.score*(c.sym?1.8:1)*(c.weak?1.25:1)});
  C.sort((a,b)=>b.rank-a.rank);
  const miss=sy.filter(s=>!(SYMMAP[s]||[]).some(id=>C.some(c=>c.id===id&&c.score>=.2)));
  return{C,fs,miss};
}
const MISS={reach:"Le modèle trouve la prise à ta portée avec ces pieds : vérifie d'abord le placement exact des pieds et du bassin.",hold:"Le modèle juge la prise correcte dans cette position : le souci vient plus probablement du placement du bassin (axe de traction) ou de la fatigue.",
  feet:"Les appuis de pied sont jugés stables : pose le pied plus lentement et regarde-le jusqu'à la fin du mouvement.",swing:"Le modèle ne voit pas de rotation marquée : c'est souvent un pied qui se décharge trop tôt pendant le mouvement.",
  jump:"Ce mouvement n'est pas pensé en lancer : cherche la version statique décrite ci-dessus.",catch:"Pas de lancer à ce mouvement : si tu lâches à l'arrivée, c'est la prise ou l'axe de traction.",pump:"Peu de charge accumulée avant ce passage selon le modèle.",method:""};

// Fixes : on rassemble ceux des causes retenues, sans doublon, positions d'abord.
// worked : méthodes qui ont déjà marché pour toi ({famille: nombre}) ; elles remontent d'un cran par succès (deux au plus).
function fixesOf(dg,worked){
  const seen=new Set(),out=[],w=worked||{},fam=k=>String(k||"").replace(/\d+$/,"");
  dg.C.filter(c=>c.score>=.2).slice(0,4).forEach((c,ci)=>c.fix.forEach(f=>{if(seen.has(f.key))return;seen.add(f.key);out.push(Object.assign({ci,cause:c.id,won:w[fam(f.key)]||0},f))}));
  return out.sort((a,b)=>(a.p-.6*Math.min(2,a.won))-(b.p-.6*Math.min(2,b.won))||a.ci-b.ci).slice(0,5);
}

// Intention de l'ouvreur pour ce mouvement, lue dans la géométrie.
function intentOf(x){
  const m=x.m,t=[],tk=(m.tech||[]).filter(c=>c!=="croise");
  if(x.pair)t.push("un lancer à deux mains : tout se joue sur l'impulsion et la réception simultanée");
  else if(m.m.dyn)t.push(blockClimber()?"un lancer : la distance dépasse la portée statique du grimpeur pour qui le bloc a été construit":"un lancer : la distance dépasse la portée statique du petit grimpeur de référence");
  const g=tk.filter(c=>c!=="dyno"&&c!=="dyno2");if(g.length)t.push((g.length>1?"les gestes ":"le geste ")+g.map(techName).join(", "));
  if(m.flag)t.push(`un drapeau : un seul pied (n°${m.flag.stand.h.n}) reste sous la main fixe`);
  if(!x.pair&&x.err<=25&&x.f!=null)t.push(`une prise tournée à ${m.rho}° qui se tire ${pullTxt(x.pid)}, avec un bassin naturellement bien placé`);
  else if(!x.pair)t.push(`une prise tournée à ${m.rho}° qui se tire ${pullTxt(x.pid)} : elle oblige à placer le bassin ${dirTxt(x.pid)} la prise`);
  return t.filter(Boolean);
}

// ---------- Suivi ----------
const hist=()=>ls(SVH_KEY,[]);
const hkey=x=>x.bid+"|"+x.k+"|"+(x.test?x.q:"");
function histAdd(e){const a=hist().filter(x=>hkey(x)!==hkey(e));a.push(e);ss(SVH_KEY,a.slice(-200))}
function patterns(){
  const a=hist().filter(x=>!x.done),cnt={};a.forEach(x=>(x.causes||[]).forEach(c=>cnt[c]=(cnt[c]||0)+1));
  return Object.entries(cnt).filter(([,v])=>v>=3).sort((p,q)=>q[1]-p[1]);
}
const PATT={reach:"travaille la mobilité de hanche et les pieds hauts, et cherche systématiquement la variante de pieds avant de tirer",grip:"la prise d'arrivée revient souvent : suspensions courtes en semi-arquée et travail d'axe de traction",
  load:"ta main fixe sature : gainage et poussée des pieds pour décharger les bras",barn:"rotation récurrente : drapeaux et gainage latéral",lock:"blocages : tractions verrouillées à 90° et 120°, en volume modéré",
  feet:"précision des pieds : grimpe facile en posant chaque pied sans bruit ni correction",dyn:"lancers : travail d'explosivité et de déclenchement sur des lancers faciles",catch:"réception : points morts répétés sur bonnes prises avant les petites",
  fatigue:"continuité : enchaînements longs sous ton niveau et repos actifs",tension:"amplitude : mobilité d'épaule et de hanche",method:"lecture : observe la logique de l'ouvreur (orientation des prises, pieds disponibles) avant d'essayer",cross:"croisés : travail de placement de profil"};

// Composition du coût d'un mouvement (ce qui pèse dans sa difficulté selon le modèle).
const PARTN={tension:"corps tendu",grip:"prise (tenue, orientation, décalage)",reach:"distance",cross:"croisé",lock:"blocage",dyn:"impulsion du lancer"};
function partsTxt(x){const t=Object.values(x.parts).reduce((a,b)=>a+b,0)||1;return Object.entries(x.parts).filter(([,v])=>v/t>=.08).sort((a,b)=>b[1]-a[1]).map(([k,v])=>({k,lab:PARTN[k]||k,p:v/t}))}

// Niveau recalculé aux deux tailles de référence du générateur (1,50 et 1,90 m, envergure 1,00), sans les notes :
// sert à vérifier que la copie du moteur reproduit bien le niveau annoncé par le générateur.
function svRefLevel(){
  const s=S,camp=s.style==='nofeet',cs=s.mv.map(()=>0),c=blockClimber();
  // corrections du résolveur utilisées par le générateur au moment de la génération (v29) : mêmes ajustements de prises
  // et ajustements tirés des mesures de prises au moment de la génération (3.3) : on repart de l'état d'avant les mesures actuelles
  const a0=LEARN.a,bm=B.meas||{},cm=typeof MEAS_OFF!=="undefined"?MEAS_OFF:{},same=JSON.stringify(bm)===JSON.stringify(cm);
  if(!same||(B.cal&&B.cal.hold)){LEARN.a=Object.assign({},same||typeof MEAS_BASE==="undefined"||!MEAS_BASE?a0:MEAS_BASE);
    if(!same)for(const n in bm)LEARN.a[n]=clamp((LEARN.a[n]||0)+bm[n],-2,2);
    if(B.cal&&B.cal.hold)for(const n in B.cal.hold)LEARN.a[n]=clamp((LEARN.a[n]||0)+B.cal.hold[n],-2,2)}
  try{
  // tailles et réglages exactement comme lors de la génération ; « main libre » décidée à la portée de la plus petite taille vérifiée
  const runs=c?[refCfg()]:[150,190].map(H=>({on:true,H,ape:1,flex:1,force:1})),freeAt=c?BODY.reachK*c.H*(c.ape||1):BODY.reachK*150;
  for(const cfg of runs)withEngine(cfg,Hc=>{let hd=s.h0,ft=s.f0;s.mv.forEach((m,k)=>{const pre={hd,ft},fixed=m.hd.find(q=>q.o===m.ot.o)||m.ot;cs[k]+=svCost(s,m,pre,fixed,Hc,camp,freeAt).cost/runs.length;hd=m.hd;ft=m.ft})});
  }finally{LEARN.a=a0}
  const q=cs.slice().sort((a,b)=>b-a),Dd=q[0]+.35*q.slice(0,3).reduce((a,b)=>a+b,0)/Math.min(3,q.length)+.06*cs.length;
  return(Dd-1.2)*2+learnOff(s.style);
}
