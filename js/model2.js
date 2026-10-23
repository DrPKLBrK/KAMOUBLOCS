// MODEL2 : second modèle, construit indépendamment du moteur du générateur, pour contre-expertiser ses verdicts.
// Ce qu'il fait autrement :
//  - géométrie 3D réelle du mur (pans, coin, dévers), prises à 2 cm de la surface ;
//  - squelette segmentaire (proportions de Drillis et Contini, masses de Dempster), posture cherchée par minimisation
//    (bras qui préfèrent être tendus, jambes fléchies, bassin décollé du mur) au lieu d'une formule de confort ;
//  - équilibre statique complet : forces 3D à chaque contact ET moments autour du centre de masse. Un pied ne peut que pousser,
//    une prise n'est tenue que dans un cône autour de sa direction utile, un pied glisse si le frottement ne suffit pas.
// Il ne sait rien des seuils du générateur : quand les deux modèles concluent la même chose, le verdict est plus sûr ;
// quand ils divergent, le diagnostic est incertain et le rapport le dit.
const M2={
  seg:{sh:.288,upA:.186,foreA:.254,thigh:.245,shank:.285,shW:.105,hipW:.05},
  mass:{trunk:.578,arm:.05,leg:.161},          // tronc + tête, bras complet, jambe complète (fractions du poids, Dempster)
  wallMin:.07,wallPref:.15,                      // distance bassin-mur : minimum et préférée (× taille)
  cap:{1:1.2,2:1,3:.85,4:.7,5:.55},              // charge tenable par une main (× poids du corps) selon la tenue, prise bien orientée
  cone:{dish:55,circ:45,drop:45,arc:40,tri:80,bar:35,horn:60,facet:45,slo:30}, // demi-angle utile d'une prise (degrés)
  mu:.75,                                        // frottement chausson / résine
  tol:2.5,                                       // dépassement de membre toléré (cm)
  handW:.35,footW:1,                             // à force égale, le corps préfère charger les pieds
  hookCap:.6,hookCone:15,                      // crochet de talon/pointe : traction tenable (× poids, ischio-jambiers) et cône élargi
  pressCap:.9,pressMu:.8,                        // compression : poussée tenable d'une main (× poids) et frottement paume / prise ou volume
  release:true,
  stages:[[1,260],[10,140],[100,140]],             // raideur croissante des pénalités (pondération, itérations)
  slipW:0                                        // préférence pour une marge de frottement sous les pieds : essayée (4.5), écartée (déplace la charge sur la main fixe sans gain mesuré)
};
const V3d={add:(a,b)=>[a[0]+b[0],a[1]+b[1],a[2]+b[2]],sub:(a,b)=>[a[0]-b[0],a[1]-b[1],a[2]-b[2]],mul:(a,k)=>[a[0]*k,a[1]*k,a[2]*k],dot:(a,b)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2],
  len:a=>Math.hypot(a[0],a[1],a[2]),norm:a=>{const l=Math.hypot(a[0],a[1],a[2])||1;return[a[0]/l,a[1]/l,a[2]/l]},cross:(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]]};
// ---------- Mur 3D ----------
let M2P=[];
function m2Wall(){M2P=[];let x=0,z=0,dx=1,dz=0;WALL.panels.forEach((p,k)=>{M2P.push({x,z,dx,dz,t:(p.tilt||0)*D2R});x+=dx*p.w;z+=dz*p.w;
  if(k<WALL.panels.length-1){const t=(180-(WALL.joints[k]==null?180:WALL.joints[k]))*D2R,c=Math.cos(t),s=Math.sin(t);[dx,dz]=[dx*c-dz*s,dx*s+dz*c]}})}
function m2P(pi,dl,y,off){const q=M2P[pi],n=[-q.dz,0,q.dx],hz=y*Math.sin(q.t)+(off||0)*Math.cos(q.t);return[q.x+q.dx*dl+n[0]*hz,y*Math.cos(q.t)-(off||0)*Math.sin(q.t),q.z+q.dz*dl+n[2]*hz]}
const m2N=pi=>{const q=M2P[pi];return[-q.dz*Math.cos(q.t),-Math.sin(q.t),q.dx*Math.cos(q.t)]};      // normale vers le grimpeur
const m2U=pi=>[M2P[pi].dx,0,M2P[pi].dz];                                                            // le long du pan
const m2S=pi=>{const q=M2P[pi];return[-q.dz*Math.sin(q.t),Math.cos(q.t),q.dx*Math.sin(q.t)]};        // vers le haut du pan
const m2Pos=x=>m2P(x.o.pi,x.o.dl,x.o.y,2);
// direction utile d'une prise dans l'espace (même convention d'orientation que les données du bloc)
const m2Dir=x=>{const a=(-90+(x.rho||0))*D2R;return V3d.add(V3d.mul(m2U(x.o.pi),Math.cos(a)),V3d.mul(m2S(x.o.pi),Math.sin(a)))};

// ---------- Corps et posture ----------
function m2Body(){const H=SP.H,k=SP.ape/100*CAL.reach,s=M2.seg;return{H,Ra:(s.upA+s.foreA)*H*k*.995,Rl:(s.thigh+s.shank)*H*.995,sh:s.sh*H,shW:s.shW*H,hipW:s.hipW*H}}
function m2Frame(refs){let n=[0,0,0];refs.forEach(r=>{const N=m2N(r.o.pi);n=[n[0]+N[0],0,n[2]+N[2]]});const l=Math.hypot(n[0],n[2])||1,F=[-n[0]/l,0,-n[2]/l];return{F,R:V3d.norm(V3d.cross(F,[0,1,0])),N:[-F[0],0,-F[2]]}}
// hands/feet : [gauche, droite] = {x (réf. de prise), p (point 3D)} ou null. Retourne bassin, articulations et dépassements par membre.
function m2Pose(bd,hands,feet,fr,pis,attract){
  const jS=(P,s)=>V3d.add(V3d.add(P,[0,bd.sh,0]),V3d.mul(fr.R,(s?1:-1)*bd.shW)),jH=(P,s)=>V3d.add(P,V3d.mul(fr.R,(s?1:-1)*bd.hipW));
  const planes=[...new Set(pis)].map(pi=>({p0:m2P(pi,0,0,0),n:m2N(pi)}));
  const E=P=>{let e=0;
    for(let s=0;s<2;s++){
      if(hands[s]){const d=V3d.len(V3d.sub(hands[s].p,jS(P,s))),o=Math.max(0,d-bd.Ra);e+=(attract?1e5:1000)*(o/bd.H)**2+(attract?0:.3*((bd.Ra-Math.min(d,bd.Ra))/bd.Ra)**2)}
      if(feet[s]){const d=V3d.len(V3d.sub(feet[s].p,jH(P,s))),o=Math.max(0,d-bd.Rl);e+=(attract?1e5:1000)*(o/bd.H)**2+(attract?0:.3*(d/bd.Rl-.75)**2)}
    }
    for(const w of planes){const dd=V3d.dot(V3d.sub(P,w.p0),w.n);if(dd<M2.wallMin*bd.H)e+=1000*((dd-M2.wallMin*bd.H)/bd.H)**2;e+=.05*((dd-M2.wallPref*bd.H)/bd.H)**2}
    if(attract)[].concat(attract).forEach(a=>e+=20*(V3d.len(V3d.sub(jS(P,a.s),a.p))/bd.H)**2); // le grimpeur s'étire au maximum vers la cible
    return e};
  const cs=[...hands,...feet].filter(Boolean),c=cs.reduce((a,x)=>V3d.add(a,x.p),[0,0,0]).map(v=>v/cs.length),hy=hands.filter(Boolean).reduce((a,x)=>a+x.p[1],0)/Math.max(1,hands.filter(Boolean).length);
  let P=V3d.add([c[0],Math.min(c[1],hy-.45*bd.H),c[2]],V3d.mul(fr.N,M2.wallPref*bd.H)),e=E(P),st=6;
  for(let it=0;it<220&&st>.02;it++){
    const g=[0,1,2].map(i=>{const a=P.slice(),b=P.slice();a[i]+=.25;b[i]-=.25;return(E(a)-E(b))/.5}),gl=Math.hypot(...g)||1,Q=V3d.sub(P,V3d.mul(g,st/gl)),eq=E(Q);
    if(eq<e){P=Q;e=eq;st*=1.15}else st*=.5;
  }
  const over={hands:[0,0],feet:[0,0]};
  for(let s=0;s<2;s++){if(hands[s])over.hands[s]=Math.max(0,V3d.len(V3d.sub(hands[s].p,jS(P,s)))-bd.Ra);if(feet[s])over.feet[s]=Math.max(0,V3d.len(V3d.sub(feet[s].p,jH(P,s)))-bd.Rl)}
  return{P,jS:s=>jS(P,s),jH:s=>jH(P,s),over};
}
// Centre de masse : tronc, bras vers leur main (ou vers la cible pour la main libre), jambes vers leur pied (ou pendantes).
function m2Com(bd,pose,hands,feet,reachTo,flagSide){
  const M=M2.mass,P=pose.P,S=[V3d.add(P,[0,bd.sh,0]),M.trunk*.5+.1];
  let acc=V3d.mul(V3d.add(P,V3d.mul([0,bd.sh,0],.6)),M.trunk);
  for(let s=0;s<2;s++){
    const sj=pose.jS(s),tgt=hands[s]?hands[s].p:reachTo&&reachTo.s===s?reachTo.p:V3d.add(sj,[0,-bd.Ra,0]),d=V3d.sub(tgt,sj),l=Math.min(V3d.len(d),bd.Ra);
    acc=V3d.add(acc,V3d.mul(V3d.add(sj,V3d.mul(V3d.norm(d),.45*l)),M.arm));
    const hj=pose.jH(s),ft=feet[s]?feet[s].p:V3d.add(hj,[0,-(flagSide===s?.7:.85)*bd.Rl,0]),e=V3d.sub(ft,hj),m=Math.min(V3d.len(e),bd.Rl);
    acc=V3d.add(acc,V3d.mul(V3d.add(hj,V3d.mul(V3d.norm(e),.45*m)),M.leg));
  }
  const tot=M.trunk+2*M.arm+2*M.leg;return V3d.mul(acc,1/tot);
}
// ---------- Équilibre statique ----------
function m2Solve6(A,b){const n=6,M=A.map((r,i)=>[...r,b[i]]);for(let c=0;c<n;c++){let p=c;for(let r=c+1;r<n;r++)if(Math.abs(M[r][c])>Math.abs(M[p][c]))p=r;[M[c],M[p]]=[M[p],M[c]];const v=M[c][c]||1e-12;for(let r=0;r<n;r++){if(r===c)continue;const f=M[r][c]/v;for(let k=c;k<=n;k++)M[r][k]-=f*M[c][k]}}return M.map((r,i)=>r[n]/(r[i]||1e-12))}
// contacts : [{kind:'hand'|'foot', x (réf.), p, hook}] ; com : centre de masse. Retourne la force (× poids du corps) reçue par le corps à chaque contact.
// On cherche, parmi TOUTES les répartitions qui équilibrent forces et moments, celle qui respecte le mieux ce que chaque contact peut
// fournir (descente de gradient projetée sur l'ensemble des solutions d'équilibre). Les violations qui restent sont réelles :
// aucune répartition ne permet alors de tenir la position.
function m2Forces(contacts,com,H){
  const n=contacts.length,A=Array.from({length:6},()=>new Array(3*n).fill(0)),b=[0,1,0,0,0,0];
  contacts.forEach((c,j)=>{const d=V3d.mul(V3d.sub(c.p,com),1/H);for(let a=0;a<3;a++)A[a][3*j+a]=1;
    A[3][3*j+1]=-d[2];A[3][3*j+2]=d[1];A[4][3*j]=d[2];A[4][3*j+2]=-d[0];A[5][3*j]=-d[1];A[5][3*j+1]=d[0]});
  const G=A.map(r=>A.map(q=>r.reduce((s,v,k)=>s+v*q[k],0)));for(let i=0;i<6;i++)G[i][i]+=1e-6;
  const proj=f=>{const r=A.map((row,i)=>row.reduce((s,v,k)=>s+v*f[k],0)-b[i]),y=m2Solve6(G.map(x=>x.slice()),r);return f.map((v,k)=>v-A.reduce((s,row,i)=>s+row[k]*y[i],0))};
  const geo=contacts.map(c=>({n:m2N(c.x.o.pi),u:m2Dir(c.x),cap:m2Cap(c.x.h),cone:Math.tan(m2Cone(c.x.h)*D2R),
    edge:c.x.h.slo?.3:(c.x.h.fam==="dish"||c.x.h.fam==="circ")&&c.x.h.grip>=3?.5:1,hcap:Math.min(m2Cap(c.x.h),M2.hookCap),hcone:Math.tan(Math.min(85,m2Cone(c.x.h)+M2.hookCone)*D2R)}));
  const cost=(f,w)=>{let e=0;contacts.forEach((c,j)=>{const F=[f[3*j],f[3*j+1],f[3*j+2]],g=geo[j],Fn=V3d.dot(F,g.n),t=V3d.sub(F,V3d.mul(g.n,Fn));
    const tb=V3d.mul(t,-1),al=V3d.dot(tb,g.u);
    // traction dans le cône utile de la prise : main, ou pied en crochet (la jambe tire comme un bras, capacité des ischio-jambiers)
    const pull=(cap,cone)=>{const pp=V3d.len(V3d.sub(tb,V3d.mul(g.u,al)));return(V3d.len(F)/cap)**2+100*w*(Math.max(0,pp-cone*Math.max(0,al))+Math.max(0,-al))**2};
    if(c.kind==="hand"){let ep=pull(g.cap,g.cone);
      // compression (v29, 4.5) : la main peut aussi POUSSER sur la prise ou le volume d'un pan opposé, tenue par frottement de la paume
      if(c.press){const T=V3d.len(t),ec=(V3d.len(F)/M2.pressCap)**2+300*w*Math.max(0,-Fn)**2+300*w*Math.max(0,T-M2.pressMu*Math.max(0,Fn))**2;if(ec<ep)ep=ec}
      e+=ep}
    else{const sup=g.edge*Math.max(0,al),rest=V3d.len(V3d.sub(tb,V3d.mul(g.u,sup))),fr=CAL.m2mu*(Math.max(0,Fn)+.5*sup);
      let ef=300*w*Math.max(0,-Fn)**2+300*w*Math.max(0,rest-fr)**2+.15*V3d.dot(F,F)+M2.slipW*(rest/(fr+.02))**2;
      // pied sur une prise qui accroche, à hauteur du bassin ou plus haut : il peut soit pousser (appui), soit tirer (crochet), au mieux
      if(c.hook){const eh=pull(g.hcap,g.hcone);if(eh<ef)ef=eh}
      e+=ef}});return e};
  // Pénalités de plus en plus raides (×1, ×10, ×100) en repartant de la solution précédente : une contrainte tenable finit
  // respectée (un pied tenable reste sous sa limite de frottement) ; seule une position réellement intenable garde un dépassement.
  // (v29, 4.5 : avec une seule pénalité « douce », l'optimum dépassait systématiquement un peu les limites, d'où des glissades fictives.)
  let f=proj(new Array(3*n).fill(0));
  for(const[w,its]of M2.stages){let e=cost(f,w),st=.05;
    for(let it=0;it<its&&st>1e-5;it++){
      const g=f.map((_,k)=>{const a=f.slice(),c=f.slice();a[k]+=1e-4;c[k]-=1e-4;return(cost(a,w)-cost(c,w))/2e-4}),gl=Math.hypot(...g)||1;
      const q=proj(f.map((v,k)=>v-st*g[k]/gl)),eq=cost(q,w);if(eq<e){f=q;e=eq;st*=1.2}else st*=.5;
    }}
  const r=A.map((row,i)=>row.reduce((s,v,k)=>s+v*f[k],0)-b[i]);
  return{act:contacts.map((c,i)=>i),F:contacts.map((c,j)=>[f[3*j],f[3*j+1],f[3*j+2]]),resid:Math.hypot(...r),drop:[]};
}
// Tenue d'une main : force exercée par le corps sur la prise, angle à sa direction utile, charge rapportée à sa capacité.
function m2Hand(x,Fbody,press){
  const Fb=V3d.mul(Fbody,-1),n=m2N(x.o.pi),out=Math.max(0,V3d.dot(Fb,n)),t=V3d.sub(Fb,V3d.mul(n,V3d.dot(Fb,n))),T=V3d.len(t),u=m2Dir(x);
  const th=T<1e-4?0:Math.acos(clamp(V3d.dot(t,u)/T,-1,1))*180/Math.PI,cone=m2Cone(x.h),mag=V3d.len(Fb);
  const cap=m2Cap(x.h)*(1-.4*Math.min(1,out/(mag||1)));
  // compression : la main pousse dans le pan (force du corps vers l'extérieur du mur) et tient par frottement
  if(press){const push=V3d.dot(Fbody,n);if(push>.02&&T<=M2.pressMu*push*1.05){const r=mag/M2.pressCap;if(r<mag/cap||th>cone)return{load:mag,th:0,cone:90,ratio:r,ok:r<=1,press:true}}}
  return{load:mag,th,cone,ratio:mag/cap,ok:th<=cone&&mag<=cap};
}
// Deux mains sur deux pans qui forment un coin rentrant (≤ 135°) : elles peuvent se serrer l'une vers l'autre (compression).
function m2PressOK(a,b){if(!a||!b||a.o.pi===b.o.pi||Math.abs(a.o.pi-b.o.pi)!==1)return false;const j=WALL.joints[Math.min(a.o.pi,b.o.pi)];return j!=null&&j<=135}
// Appui d'un pied : il doit pousser dans le mur ou sur le bord de la prise ; le reste passe en frottement.
function m2Foot(x,Fbody){
  const Fb=V3d.mul(Fbody,-1),n=m2N(x.o.pi),press=-V3d.dot(Fb,n),t=V3d.sub(Fb,V3d.mul(n,V3d.dot(Fb,n))),u=m2Dir(x),along=V3d.dot(t,u);
  const edge=x.h.slo?.3:(x.h.fam==="dish"||x.h.fam==="circ")&&x.h.grip>=3?.5:1,sup=edge*Math.max(0,along),rest=V3d.len(V3d.sub(t,V3d.mul(u,sup)));
  const fric=CAL.m2mu*(Math.max(0,press)+.5*sup),load=V3d.len(Fb);return{press,slip:load<.05?0:rest/(fric+1e-6),load,pull:press<-.03};
}

// ---------- Contre-expertise d'un mouvement ----------
// x : mesures du résolveur pour ce mouvement (svMove). feetOverride : autre jeu de pieds pour vérifier une variante.
function m2Move(x,feetOverride){
  if(!M2P.length)m2Wall();
  const bd=m2Body(),m=x.m,out={};
  const movHand=m.m.cross?(m.side==="gauche"?1:0):(m.side==="gauche"?0:1),fixS=1-movHand; // 0 = main gauche, 1 = main droite
  const feetL=feetOverride||(m.flag?[m.flag.stand]:x.pre.ft);
  const ref=a=>({x:a,p:m2Pos(a)});
  const slots=list=>{const fr=m2Frame(list.length?list:[x.fixed]),o=[null,null];const sorted=list.slice().sort((a,b)=>V3d.dot(m2Pos(a),fr.R)-V3d.dot(m2Pos(b),fr.R));
    if(sorted.length===1){const r=V3d.dot(V3d.sub(m2Pos(sorted[0]),m2Pos(x.fixed)),fr.R);o[r<0?0:1]=ref(sorted[0])}else sorted.slice(0,2).forEach((q,i)=>o[i]=ref(q));return o};
  if(!x.pair){
    // 1) portée statique : main fixe + main sur la cible, pieds d'avant le mouvement
    const H=[null,null];H[fixS]=ref(x.fixed);H[movHand]=ref(x.tgt);
    const ft=A_camp()?[null,null]:slots(feetL),refs=[x.fixed,x.tgt,...feetL],fr=m2Frame(refs),pz=m2Pose(bd,H,ft,fr,refs.map(r=>r.o.pi));
    out.short=pz.over.hands[movHand];out.feetOver=Math.max(...pz.over.feet);
    // 2) transit : main fixe seule, l'autre en route vers la cible
    const H2=[null,null];H2[fixS]=ref(x.fixed);
    const refs2=[x.fixed,...feetL],fr2=m2Frame(refs2),p2=m2Pose(bd,H2,ft,fr2,refs2.map(r=>r.o.pi)),com=m2Com(bd,p2,H2,ft,{s:movHand,p:m2Pos(x.tgt)},m.flag?(ft[0]?1:0):null);
    const hookable=f=>f&&f.p[1]>=p2.P[1]-.1*bd.H&&["arc","horn","bar"].includes(f.x.h.fam); // pied au niveau du bassin ou plus haut, sur une prise qui accroche
    const cts=[{kind:"hand",x:x.fixed,p:H2[fixS].p},...ft.filter(Boolean).map(f=>({kind:"foot",x:f.x,p:f.p,hook:hookable(f)}))];
    // drapeau : la jambe libre est plaquée contre le mur (adhérence sans prise), à environ 40 cm du pied d'appui, du côté du pied libéré
    if(m.flag&&!A_camp()){const st=m.flag.stand,fr0=m.flag.free,sg=fr0?Math.sign(fr0.o.dl-st.o.dl)||1:(x.dx>0?-1:1),
      sm={o:{pi:st.o.pi,dl:clamp(st.o.dl+40*sg,5,WALL.panels[st.o.pi].w-5),y:st.o.y+10,tilt:st.o.tilt||0},h:{n:0,fam:"dish",grip:5,slo:true,w:10,h:10},rho:0};
      cts.push({kind:"foot",x:sm,p:m2P(sm.o.pi,sm.o.dl,sm.o.y,0),smear:true})}
    let S=m2Forces(cts,com,bd.H),use=cts.map((c,i)=>i);
    // un pied qui devrait TIRER (sans crochet) décolle : on refait l'équilibre sans lui. Si la position tient encore, ce pied
    // est simplement inutile à ce moment (pas un problème) ; sinon il manque vraiment un appui (v29, 4.5).
    const pulls=cts.map((c,i)=>i).filter(i=>i>0&&cts[i].kind==="foot"&&!cts[i].hook&&!cts[i].smear&&m2Foot(cts[i].x,S.F[i]).press<-.03);
    let off=new Set();
    if(M2.release&&pulls.length&&cts.length-pulls.length>=2){const keep=cts.map((c,i)=>i).filter(i=>!pulls.includes(i)),S2=m2Forces(keep.map(i=>cts[i]),com,bd.H);
      if(S2.resid<=1e-3){off=new Set(pulls);const F=cts.map(()=>[0,0,0]);keep.forEach((i,j)=>F[i]=S2.F[j]);S={act:S.act,F,resid:S2.resid,drop:pulls}}}
    const idx=k=>S.act.indexOf(k);
    const hF=idx(0)>=0?S.F[idx(0)]:[0,0,0];out.hand=m2Hand(x.fixed,hF);
    out.feet=cts.slice(1).map((c,j)=>({c,i:j+1})).filter(z=>!z.c.smear).map(({c,i})=>{
      if(off.has(i))return{x:c.x,hook:false,press:0,slip:0,load:0,pull:false,off:true};
      const o=Object.assign({x:c.x,hook:c.hook},m2Foot(c.x,S.F[idx(i)]));
      // crochet : la jambe tire dans le cône de la prise ; « glisse » = traction au-delà de ce que tiennent les ischio-jambiers
      if(c.hook&&o.press<-.03){const cap=Math.min(m2Cap(c.x.h),M2.hookCap);o.pull=false;o.slip=o.load/cap;o.hooked=true}
      return o});
    out.maxF=Math.max(...S.F.map(V3d.len));out.resid=S.resid;
    out.rotation=!A_camp()&&(S.resid>1e-3||out.maxF>2.5||cts.length<2);
    out.slip=out.feet.length?Math.max(...out.feet.map(f=>f.slip)):0;out.pull=out.feet.some(f=>f.pull||f.dropped);
  }
  // 3) arrivée : deux mains et pieds d'après le mouvement, tenue de la prise visée
  {const hd=m.hd,tg=[x.tgt,...(m.pair?[m.pair]:[])],fr=m2Frame([...hd,...m.ft]),H=[null,null];
    if(hd[0].o===hd[1].o){H[0]=ref(hd[0]);H[1]=ref(hd[1])}else{const s=hd.slice().sort((a,b)=>V3d.dot(m2Pos(a),fr.R)-V3d.dot(m2Pos(b),fr.R));H[0]=ref(s[0]);H[1]=ref(s[1])}
    const ft=A_camp()?[null,null]:slots(m.ft),refs=[...hd,...m.ft],pz=m2Pose(bd,H,ft,fr,refs.map(r=>r.o.pi)),com=m2Com(bd,pz,H,ft,null,null);
    const pr=m2PressOK(H[0].x,H[1].x);out.press=pr;
    const cts=[{kind:"hand",x:H[0].x,p:H[0].p,press:pr},{kind:"hand",x:H[1].x,p:H[1].p,press:pr},...ft.filter(Boolean).map(f=>({kind:"foot",x:f.x,p:f.p,hook:f.p[1]>=pz.P[1]-.1*bd.H&&["arc","horn","bar"].includes(f.x.h.fam)}))];
    const S=m2Forces(cts,com,bd.H);
    out.arrive=tg.map(t=>{const j=cts.findIndex(c=>c.kind==="hand"&&c.x.o===t.o),i=S.act.indexOf(j);return i<0?null:Object.assign({n:t.h.n},m2Hand(t,S.F[i],pr))}).filter(Boolean);
    out.arriveOver=Math.max(...pz.over.hands,...pz.over.feet);
  }
  if(!feetOverride&&(m.m.dyn||x.pair))out.dyn=m2Dyno(x);
  return out;
}
// capacité de tenue d'une prise, corrigée par ce que tes essais ont appris (prise plus dure ou plus facile que sa note)
// prise mesurée (measure.js, 3.3) : capacité tirée de la physique (profondeur, angle), indépendante de ta note de tenue
const m2Base=h=>{const q=typeof measQ==="function"?measQ(h):null;return q!=null?clamp(.4+.75*q,.35,1.3):(M2.cap[h.grip]||.6)};
const m2Cap=h=>m2Base(h)*CAL.m2cap*(1-.12*(CAL.hold[h.n]||0));
// cône de traction utile : s'ouvre sur un bord rentrant, se ferme sur un bord fuyant (0,5° par degré, au plus ±20°)
const m2Cone=h=>clamp((h.slo?M2.cone.slo:(M2.cone[h.fam]||45))+(h.dep>0&&h.fam!=="tri"?clamp(.5*(h.ang||0),-20,20):0),15,85);
const A_camp=()=>!!(typeof AN!=="undefined"&&AN&&AN.camp);

// ---------- Lancers (modèle indépendant de celui du générateur) ----------
// Le générateur traite le lancer comme un bassin projeté vers la prise avec une vitesse maximale fixe.
// Ici, la vitesse disponible dépend de la POSE réelle : ce qu'il reste aux jambes à déplier (pieds sur prises, en 3D) et au bras fixe
// à tirer avant de lâcher. Le déplacement du bassin est cherché en 3D (épaule de la main qui part à portée de la cible).
const M2D={g:981,aLeg2:1.1,aLeg1:.7,aArm:.5,legMax:.97,armPull:.1,sink:.06,absorb:.07,dynCap:1.3,margin:3,
  deadH:.3,deadMargin:1,deadImpact:1.15}; // point mort : déplacement horizontal au plus 0,3 × taille, 1 cm de marge, impact ≈ 1,15 × poids
function m2Reach(bd,hands,fr,pis,P0){
  const jS=(P,s)=>V3d.add(V3d.add(P,[0,bd.sh,0]),V3d.mul(fr.R,(s?1:-1)*bd.shW)),planes=[...new Set(pis)].map(pi=>({p0:m2P(pi,0,0,0),n:m2N(pi)}));
  const E=P=>{let e=.002*(V3d.len(V3d.sub(P,P0))/bd.H)**2;for(let s=0;s<2;s++)if(hands[s]){const o=Math.max(0,V3d.len(V3d.sub(hands[s].p,jS(P,s)))-bd.Ra*.97);e+=1000*(o/bd.H)**2}
    for(const w of planes){const dd=V3d.dot(V3d.sub(P,w.p0),w.n);if(dd<M2.wallMin*bd.H)e+=1000*((dd-M2.wallMin*bd.H)/bd.H)**2}return e};
  let P=P0.slice(),e=E(P),st=8;
  for(let it=0;it<260&&st>.02;it++){const g=[0,1,2].map(i=>{const a=P.slice(),b=P.slice();a[i]+=.25;b[i]-=.25;return(E(a)-E(b))/.5}),gl=Math.hypot(...g)||1,Q=V3d.sub(P,V3d.mul(g,st/gl)),eq=E(Q);if(eq<e){P=Q;e=eq;st*=1.15}else st*=.5}
  return P;
}
function m2Dyno(x){
  if(!M2P.length)m2Wall();
  const bd=m2Body(),m=x.m,pre=x.pre,ref=a=>({x:a,p:m2Pos(a)}),D=M2D;
  const sortR=(l,fr)=>l.slice().sort((a,b)=>V3d.dot(m2Pos(a),fr.R)-V3d.dot(m2Pos(b),fr.R));
  const refs0=[...pre.hd,...pre.ft],fr0=m2Frame(refs0),H0=[null,null],F0=[null,null];
  sortR(pre.hd,fr0).forEach((q,i)=>H0[i]=ref(q));sortR(pre.ft,fr0).slice(0,2).forEach((q,i)=>F0[pre.ft.length===1?(V3d.dot(V3d.sub(m2Pos(q),m2Pos(x.fixed)),fr0.R)<0?0:1):i]=ref(q));
  const mov=m.m.cross?(m.side==="gauche"?1:0):(m.side==="gauche"?0:1),fixS=1-mov,pis0=refs0.map(r=>r.o.pi);
  const p0=m2Pose(bd,H0,F0,fr0,pis0);                                   // position basse, jambes fléchies
  const H1=[null,null];if(!m.pair)H1[fixS]=ref(x.fixed);else{H1[0]=H0[0];H1[1]=H0[1]}
  const tgs=m.pair?sortR([x.tgt,m.pair],fr0).map((q,i)=>({s:i,p:m2Pos(q)})):{s:mov,p:m2Pos(x.tgt)};
  const pH=m2Pose(bd,H1,F0,fr0,pis0,tgs); // position d'envol : étiré au maximum vers la cible, mains encore en place
  // pose d'attrape : la ou les mains sur la cible, au plus près du bassin de départ
  const tg=[x.tgt,...(m.pair?[m.pair]:[])],frT=m2Frame([...tg,...pre.ft]),HT=[null,null];
  if(m.pair)sortR(tg,frT).forEach((q,i)=>HT[i]=ref(q));else HT[mov]=ref(x.tgt);
  const P1=m2Reach(bd,HT,frT,[...tg,...pre.ft].map(r=>r.o.pi),pH.P),d=V3d.sub(P1,pH.P),need=V3d.len(d);
  // vitesse disponible : extension restante des jambes (avec un léger affaissement préalable) et traction du bras fixe
  // poussée : du bassin bas au bassin d'envol (plus un léger affaissement préalable) ; à deux mains, depuis la position basse jusqu'à l'extension des jambes
  const feet=[0,1].filter(s=>F0[s]),legs=feet.map(s=>V3d.len(V3d.sub(F0[s].p,p0.jH(s)))),ext=legs.length?Math.max(0,D.legMax*bd.Rl-legs.reduce((a,b)=>a+b,0)/legs.length):0;
  const sLeg=feet.length?Math.min(ext,V3d.len(V3d.sub(pH.P,p0.P)))+D.sink*bd.H:0;
  const aLeg=(feet.length>=2?D.aLeg2:feet.length?D.aLeg1:0)*D.g*(1-.004*Math.max(0,m.o.tilt||0)),sArm=m.pair?D.armPull*bd.H*.6:D.armPull*bd.H;
  const vmax=Math.sqrt(2*(aLeg*sLeg+D.aArm*D.g*sArm))*CAL.m2dyn,cap=Math.min(...tg.map(q=>m2Cap(q.h)))*D.dynCap;
  // Trois cas (v29, 4.5) :
  //  - statique : la cible s'attrape en s'étirant depuis la position d'envol (bassin à moins de 2 cm) ;
  //  - point mort : le bassin doit se déplacer, mais à la position d'attrape la main fixe est encore à portée de son épaule :
  //    elle ne lâche pas, le corps est tiré vers la cible et la main attrape au sommet, vitesse horizontale nulle, impact faible ;
  //  - jeté : la main fixe doit lâcher, trajectoire balistique complète et réception avec la vitesse horizontale restante.
  // la cible s'attrape en s'étirant, sans quitter la main fixe ni décoller : au plus un petit élan (pas de vol)
  if(need<2)return{need:0,ratio:0,impact:1,catchRatio:0,t:0,kind:"static"};
  const horiz=Math.hypot(d[0],d[2]);let dead=false;
  if(!m.pair){const sj=V3d.add(V3d.add(P1,[0,bd.sh,0]),V3d.mul(frT.R,(fixS?1:-1)*bd.shW));dead=V3d.len(V3d.sub(m2Pos(x.fixed),sj))<=bd.Ra&&horiz<=D.deadH*bd.H}
  const rise=Math.max(0,d[1])+(dead?D.deadMargin:D.margin),vy=Math.sqrt(2*D.g*rise),t=Math.max(.15,vy/D.g),vh=dead?0:horiz/t,v=Math.hypot(vy,vh),ratio=v/Math.max(1,vmax);
  // réception : la vitesse horizontale restante au sommet est freinée par les bras sur quelques centimètres
  const impact=dead?D.deadImpact:(1+vh*vh/(2*D.g*D.absorb*bd.H))*(m.pair?.6:1);
  return{need,rise,t,v,vmax,ratio,impact,cap,catchRatio:impact/cap,sLeg,kind:dead?"deadpoint":"jete"};
}

// ---------- Comparaison des deux modèles ----------
// Pour chaque question, on lit le verdict du moteur principal (x, dg) et celui du modèle 2 (r). « issue » = problème signalé.
function m2Compare(x,r,dg){
  const L=[],add=(q,a,b,ta,tb,na)=>L.push({q,a,b,ta,tb,agree:a===b,na:!!na});
  const has=id=>dg.C.some(c=>c.id===id&&c.score>=.3);
  if(!x.pair){
    const a=!!(x.hpT&&!x.hpT.ok),b=r.short>M2.tol;
    add("Portée statique",a,b,a?`hors de portée (${Math.round(x.hpT.limit?x.hpT.limit.over:0)} cm)`:x.hpT&&x.hpT.slack>.5?`à la limite (corps tendu de ${Math.round(x.hpT.slack)} cm)`:"atteignable",
      b?`hors de portée (${Math.round(r.short)} cm)`:r.short>.5?`à la limite (${Math.round(r.short)} cm)`:"atteignable");
    if(!A_camp()){
      const a2=has("load")||x.share>=.6*CAL.m1load,b2=r.hand.ratio>=1||(r.hand.load>=.15&&r.hand.th>r.hand.cone+10);add("Main fixe",a2,b2,`${pcT(x.share)} du poids${a2?", surchargée":""}`,`${fr(r.hand.load,2)} × poids, ${pcT(r.hand.ratio)} de sa capacité${r.hand.load>=.15&&r.hand.th>r.hand.cone+10?", tirée hors de son cône":""}`);
      const a3=x.barn>FM.barnSoft*CAL.m1barn,b3=!!r.rotation;add("Rotation en porte",a3,b3,a3?"risque signalé":"pas de risque",b3?"équilibre impossible sans contre-appui":"équilibre possible");
      const a4=x.minStab!=null&&x.minStab<CAL.m1stab,b4=r.slip>1.15||r.pull;add("Pieds",a4,b4,a4?`appui fragile (stabilité ${Math.round(x.minStab*100)} / 100)`:"appuis stables",
        b4?(r.pull?"un pied devrait tirer : il décolle":r.feet.some(f=>f.hooked&&f.slip===r.slip)?`le crochet ne tient pas (traction ×${fr(r.slip,1)} de ce que tient la jambe)`:`un pied glisse (frottement dépassé ×${fr(r.slip,1)})`):r.feet.some(f=>f.off)?"appuis tenus ; un pied ne sert à rien à ce moment et peut décoller":r.slip>.9?"appuis tenus, à la limite du frottement":`appuis tenus (marge ${pcT(1-r.slip)})`);
    }
  }
  const t=r.arrive[0];
  if(t){const hj=CAL.hold[x.m.h.n]||0,fe=x.f==null?null:x.f*(1+.15*hj),a5=fe==null||fe>=ANA.poorF,b5=(t.load>=.2&&t.th>t.cone+10)||t.ratio>1;add("Prise d'arrivée",a5,b5,fe==null?"hors de son axe utile":`facteur d'orientation ${fr(x.f,1)}${hj?` (corrigé à ${fr(fe,1)} par tes essais)`:""}${a5?", de biais":""}`,t.press?`tenue en compression (la main pousse sur le pan opposé), ${pcT(t.ratio)} de la poussée tenable`:`${Math.round(t.th)}° de sa direction utile (cône ${Math.round(t.cone)}°), ${pcT(t.ratio)} de sa capacité`)}
  // lancers : impulsion et réception, chacun avec son propre modèle
  if((x.m.m.dyn||x.pair)&&x.D&&x.D.need>0){const y=r.dyn||m2Dyno(x);
    const a6=x.D.ratio>DY.soft*CAL.m1dyn,b6=y.ratio>DY.soft;
    add("Lancer",a6,b6,`${Math.round(x.D.need)} cm à gagner, ${pcT(x.D.ratio)} de ta détente${a6?" : à la limite":""}`,y.need<2?"pas besoin de sauter : la prise s'attrape en s'étirant":`${y.kind==="deadpoint"?"point mort (la main fixe reste) : ":"jeté (la main fixe lâche) : "}${Math.round(y.need)} cm de déplacement du bassin, ${pcT(y.ratio)} de la vitesse que tes jambes peuvent donner dans cette position${b6?" : à la limite":""}`);
    const a7=x.D.capRatio>DY.impSoft,b7=y.catchRatio>1;
    add("Réception",a7,b7,`${fr(x.D.impact,1)} × poids pour ${fr(x.D.cap,1)} verrouillable`,y.need<2?"pas d'impact notable":`${fr(y.impact,1)} × poids pour ${fr(y.cap,1)} tenable en dynamique`)}
  return L;
}
// Une variante de pieds proposée par le moteur principal est-elle confirmée par le modèle 2 ?
function m2CheckFeet(x,fs){
  if(!fs)return null;const feet=fs.old?x.pre.ft.map(q=>q===fs.old?fs.c:q):[...x.pre.ft,fs.c],a=m2Move(x),b=m2Move(x,feet),g=[];
  if(a.short-b.short>2)g.push(`portée améliorée de ${Math.round(a.short-b.short)} cm`);
  if(a.rotation&&!b.rotation)g.push("la rotation disparaît");
  if(a.slip-b.slip>.15&&a.slip>1.15)g.push("les pieds tiennent mieux");
  if(a.hand&&b.hand&&a.hand.ratio-b.hand.ratio>.06)g.push(`main fixe moins chargée (${pcT(b.hand.ratio)} de sa capacité au lieu de ${pcT(a.hand.ratio)})`);
  const worse=b.short-a.short>2||(b.rotation&&!a.rotation)||b.slip-a.slip>.3;
  return{ok:g.length>0&&!worse,worse,g};
}
