// SKELETON : squelette simplifié du grimpeur et calcul de la zone où le bassin peut se trouver.
// Idée : le bassin P doit être à portée de chaque main (via l'épaule, au-dessus du bassin) et de chaque pied (via la hanche).
//   Épaule = P + (0, shUp × taille).  Main sur une prise  => |épaule - prise| <= armR × taille.
//   Pied sur une prise                                    => |P - prise|      <= legR × taille.
// L'ensemble des positions possibles est l'intersection de disques. S'il est vide (même avec la tolérance), la position
// est impossible : personne ne peut tenir ces quatre appuis en même temps.
// Réglages : armR / legR = portée bras / jambe (× taille, déjà un peu généreuse), tol = tolérance permissive.
const SK={shUp:.30,armR:.46,legR:.52,tol:.03,tilt:.0015};

// Cherche une position du bassin dans l'intersection des disques en partant du point « confortable » c0.
// Retourne {x,y,ok,slack,limit}. slack (cm) = dépassement résiduel > 0 si le corps est tendu au-delà de la portée normale
// mais dans la tolérance. ok=false : impossible. limit = {kind:'hand'|'foot', n, over} : la contrainte la plus violée.
function solveHips(hs,fs,Hc,camp,c0){
  const tl=hs.reduce((a,x)=>a+(x.o.tilt||0),0)/Math.max(1,hs.length),tf=Math.max(.8,1-SK.tilt*Math.max(0,tl));
  const D=[];
  for(const x of hs)if(!x.free)D.push({cx:x.o.x,cy:x.o.y-SK.shUp*Hc,r:SK.armR*Hc*tf*CL.ape(),kind:'hand',n:x.h&&x.h.n});
  if(!camp)for(const f of fs)D.push({cx:f.o.x,cy:f.o.y,r:SK.legR*Hc*tf*(1+.10*(CL.flex()-1)),kind:'foot',n:f.h&&f.h.n});
  let px=c0.x,py=c0.y;
  const viol=(add)=>{let v=0,w=null;for(const d of D){const e=Math.hypot(px-d.cx,py-d.cy)-d.r-add;if(e>v){v=e;w=d}}return[v,w]};
  const pocs=(add)=>{for(let it=0;it<40;it++){let moved=false;for(const d of D){const dx=px-d.cx,dy=py-d.cy,r=d.r+add,l=Math.hypot(dx,dy);if(l>r+.01){px=d.cx+dx*r/l;py=d.cy+dy*r/l;moved=true}}if(!moved)break}};
  let [v]=viol(0);
  if(v<=.01)return{x:px,y:py,ok:true,slack:0,limit:null};
  pocs(0);let w;[v,w]=viol(0);
  if(v<=.5)return{x:px,y:py,ok:true,slack:0,limit:null};
  pocs(SK.tol*Hc);[v]=viol(SK.tol*Hc);
  [v,w]=viol(0);
  if(viol(SK.tol*Hc)[0]<=.5)return{x:px,y:py,ok:true,slack:v,limit:w?{kind:w.kind,n:w.n,over:v}:null};
  return{x:px,y:py,ok:false,slack:v,limit:w?{kind:w.kind,n:w.n,over:v}:null};
}

// ---------- Phase 2 : forces et moments ----------
// Répartition du poids du corps (1 = poids du corps) entre les appuis, et risque de « barn door » (le corps pivote comme une porte
// autour de l'axe main-pied quand ces deux appuis sont presque alignés verticalement et que l'autre main part loin sur le côté).
// hd/ft = mains et pieds en contact (en transit : une seule main). Retourne {hand:[{x,n,share}], foot:[...], handTot, barn}.
const FM={base:.30,tilt:.011,oneFoot:.25,noFoot:.55,transit:.10,barnVert:.22,barnSoft:.45,barnHard:.95};
function loadsOf(hd,ft,Hc,transit,reachTo){
  const tl=hd.reduce((a,x)=>a+(x.o.tilt||0),0)/Math.max(1,hd.length);
  let hs=FM.base+FM.tilt*Math.max(0,tl)-.004*Math.max(0,-tl);
  if(ft.length===0)hs+=FM.noFoot;else if(ft.length===1)hs+=FM.oneFoot;
  if(transit&&hd.length===1)hs+=FM.transit;
  if(ft.length){const fm=ft.reduce((a,c)=>a+c.o.x,0)/ft.length,hm=hd.reduce((a,c)=>a+c.o.x,0)/hd.length;hs+=.5*Math.min(.5,Math.abs(hm-fm)/Hc)} // mains décalées par rapport aux pieds : les bras reprennent le moment
  hs=Math.max(.12,Math.min(1,hs));
  const all=[...hd,...ft],cx=all.reduce((s,c)=>s+c.o.x,0)/all.length;
  const part=(arr,tot)=>{const w=arr.map(c=>1/(Math.abs(c.o.x-cx)+.12*Hc));const S=w.reduce((a,b)=>a+b,0)||1;return arr.map((c,i)=>({x:c.o.x,n:c.h&&c.h.n,share:tot*w[i]/S,c}))};
  const hand=part(hd,hs),foot=ft.length?part(ft,1-hs):[];
  // barn door : en transit, axe = main fixe + pied le plus proche en x ; vertical si les deux sont alignés
  let barn=0;
  if(transit&&hd.length===1&&ft.length&&reachTo){
    const h=hd[0].o,f=ft.reduce((a,b)=>Math.abs(a.o.x-h.x)<=Math.abs(b.o.x-h.x)?a:b).o,dh=Math.abs(f.x-h.x),dy=Math.max(10,h.y-f.y);
    const vert=1-Math.min(1,Math.atan2(dh,dy)/(Math.PI/4));              // 1 = axe vertical, 0 = diagonale à 45° ou plus
    const lat=Math.abs(reachTo.x-(h.x+(f.x-h.x)*Math.max(0,Math.min(1,(reachTo.y-h.y)/(f.y-h.y||-1)))))/Hc; // écart latéral du but à l'axe
    const other=ft.find(q=>q.o!==f);const counter=other&&Math.sign(other.o.x-h.x)===Math.sign(reachTo.x-h.x)?.5:1; // l'autre pied du côté du but retient la rotation
    barn=vert*lat*counter*(1+.004*Math.max(0,tl));
  }
  return{hand,foot,handTot:hs,barn};
}

// ---------- Phase 4 : dynamique des lancers ----------
// Modèle balistique du centre de masse (bassin). Pour atteindre la prise cible, le bassin doit venir à portée de bras de celle-ci :
// on calcule le déplacement nécessaire (dx, dy) depuis la position de départ, la vitesse de décollage qui y mène, le temps de vol,
// puis la charge à la réception sur la prise (1 = poids du corps). Unités : cm, cm/s.
const DY={g:981,vmax:290,vmaxCamp:215,oneFoot:.85,tilt:.003,margin:2,minT:.22,brake:12,latShare:.5,capBase:2.6,capGrip:.35,capSlo:.3,hard:1.12,soft:.85,impHard:1.3,impSoft:.95};
function dynCap(h){return Math.max(.8,DY.capBase-DY.capGrip*h.grip-(h.slo?DY.capSlo:0))*CL.force()}
// pre = {hd, ft} avant le lancer ; o = trou visé ; h = prise visée. Retourne null si le bassin n'a pas à bouger.
function dynoOf(pre,o,h,Hc,camp){
  const p0=hips(pre.hd,pre.ft,Hc,camp),cx=o.x,cy=o.y-SK.shUp*Hc,R=SK.armR*Hc*.97*CL.ape();
  const vx0=cx-p0.x,vy0=cy-p0.y,L=Math.hypot(vx0,vy0),need=Math.max(0,L-R);
  const dx=L>0?vx0*need/L:0,dy=L>0?vy0*need/L:0;
  const tl=o.tilt||0,hasFeet=!camp&&pre.ft.length>0;
  let vmax=(hasFeet?DY.vmax*(pre.ft.length<2?DY.oneFoot:1):DY.vmaxCamp)*Math.sqrt(Hc/170)*(1+.15*(CL.force()-1))*(1-DY.tilt*Math.max(0,tl));
  const rise=Math.max(0,dy)+(need>0?DY.margin:0),v0y=Math.sqrt(2*DY.g*rise),t=Math.max(DY.minT,v0y/DY.g),v0x=Math.abs(dx)/t,v0=Math.hypot(v0y,v0x);
  const vc=Math.sqrt(2*DY.g*DY.margin),vl=DY.latShare*v0x,F=1+(vc*vc+vl*vl)/(2*DY.g*DY.brake),cap=dynCap(h);
  return{need,dx,dy,v0,vmax,ratio:v0/vmax,t,impact:F,cap,capRatio:F/cap,hmax:vmax*vmax/(2*DY.g)};
}

// Lancer à deux mains : les deux mains quittent le mur et attrapent deux prises en même temps. Le bassin doit venir dans l'intersection
// des deux disques de portée des prises cibles. t1, t2 = {o, h}. Retourne null si les deux prises ne peuvent pas être tenues ensemble.
const DY2={coord:1.08,share:.6,spread:2*SK.armR*.98};
function dynoPair(pre,t1,t2,Hc,camp){
  const p0=hips(pre.hd,pre.ft,Hc,camp);
  if(Math.hypot(t1.o.x-t2.o.x,t1.o.y-t2.o.y)>DY2.spread*Hc*CL.ape())return null; // mains trop écartées pour que les deux bras soient tendus ensemble
  const s=solveHips([t1,t2],[],Hc,true,p0);if(!s.ok)return null;
  const dx=s.x-p0.x,dy=s.y-p0.y,need=Math.hypot(dx,dy),tl=Math.max(t1.o.tilt||0,t2.o.tilt||0),hasFeet=!camp&&pre.ft.length>0;
  const vmax=(hasFeet?DY.vmax*(pre.ft.length<2?DY.oneFoot:1):DY.vmaxCamp)*Math.sqrt(Hc/170)*(1+.15*(CL.force()-1))*(1-DY.tilt*Math.max(0,tl));
  const rise=Math.max(0,dy)+(need>0?DY.margin:0),v0y=Math.sqrt(2*DY.g*rise),t=Math.max(DY.minT,v0y/DY.g),v0x=Math.abs(dx)/t,v0=Math.hypot(v0y,v0x);
  const vc=Math.sqrt(2*DY.g*DY.margin),vl=DY.latShare*v0x,F=(1+(vc*vc+vl*vl)/(2*DY.g*DY.brake))*DY2.share; // la charge se partage entre les deux mains
  const c1=dynCap(t1.h),c2=dynCap(t2.h),capRatio=Math.max(F/c1,F/c2);
  return{need,dx,dy,v0,vmax,ratio:v0/vmax*(need>0?DY2.coord:1),t,impact:F,cap:Math.min(c1,c2),capRatio,p1:{x:s.x,y:s.y},hmax:vmax*vmax/(2*DY.g)};
}
