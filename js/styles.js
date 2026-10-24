// STYLES : ce que chaque style de mouvement ou de prises récompense et exige.
// Pour ajouter un style : l'ajouter dans config.js (MVN), puis ici dans styleBonus() et styleOk().

// Une prise correspond-elle au type demandé (réglettes, slopers, pinces, crochets) ?
const fits=(k,h)=>k==='crimp'?(h.fam==='bar'||h.crimp):k==='sloper'?h.slo:k==='pinch'?h.fam==='tri':k==='arc'?(h.fam==='arc'||h.fam==='horn'):false;

// Bonus de score pendant la recherche (plus haut = plus de chances d'être retenu).
function styleBonus(c,P,me,o,ot,h,m){
  const s=c.mv;let b=0;
  if((s==='compress'||s==='trav')&&ot.o.pan!==o.pan)b+=1.2;
  if(s==='trav'&&Math.abs(o.x-me.o.x)>Math.abs(o.y-me.o.y))b+=.8;
  if(c.hs!=='mix'&&fits(c.hs,h))b+=1.2;
  if(s==='cross'&&m.cross)b+=1.2;
  if((s==='dyno'||s==='coord')&&m.dyn)b+=2.5;
  if(s==='coord'&&m.cross)b+=.9;
  // écart préféré entre les mains (change à chaque bloc) et goût pour petites/grosses prises
  return b-Math.abs(m.d/reachOf(BODY.hMin)-P.sp)*.9+(h.w<9?.5:h.w>=12?-.5:0)*P.small;
}
// Condition obligatoire pour qu'un bloc soit accepté.
const POWER_MAX=5,ENDUR_MIN=9;
function styleOk(c,s){
  const y=c.mv;let ok=true;
  const TD=TSTYLE[y];let U=USTYLE[y];if(U&&c.lancers===false&&U.dyn>=2)U={...U,dyn:1};
  if(U)ok=uOk(U,s);
  else if(TD&&TD.tech.length)ok=countTech(s,TD.tech)>=TD.min;
  else if(y==='dyno')ok=s.dy>=1;else if(y==='coord')ok=s.dy>=1&&s.cr>=1;else if(y==='cross')ok=s.cr>=1;else if(y==='static')ok=s.dy===0;
  else if(y==='hook')ok=s.allf.some(q=>fits('arc',q.h))&&countTech(s,['talon','pointe'])>=1;
  else if(y==='compress'||y==='trav')ok=s.mv.some(m=>m.ot.o.pan!==m.o.pan);
  if(ok&&c.hs!=='mix')ok=[...s.h0,...s.mv].filter(x=>fits(c.hs,x.h)).length>=2;
  // v49 : la longueur fait partie du style. Puissance = court (5 mouvements au plus), Endurance = long (9 au moins).
  if(ok&&y==='power')ok=s.mv.length<=POWER_MAX;
  if(ok&&y==='endur')ok=s.mv.length>=ENDUR_MIN;
  return ok;
}

// ---------- Styles à gestes techniques (données) ----------
// Chaque style = un geste (voir techniques.js) que le bloc DOIT contenir, vérifié par la physique, et que la recherche favorise.
// Pour en ajouter : une ligne ici ; il apparaît dans les menus et dans le tirage « Au hasard ».
// tech = gestes acceptés ; min = nombre minimal de mouvements concernés ; noDyn = pas de lancers ; bonus = récompense par mouvement concerné.
const TSTYLE={
  flag:{name:"Drapeaux",tech:["drapeau"],min:1,noDyn:true,bonus:2.2},
  press:{name:"Rétablissements (poussée sur plat)",tech:["retablissement"],min:1,noDyn:true,bonus:2.2},
  under:{name:"Oppositions et tirages latéraux",tech:["opposition","lateral"],min:1,noDyn:true,bonus:2.5},
  lock:{name:"Blocages (lock-off)",tech:["blocage"],min:2,noDyn:true,bonus:1.6},
  endur:{name:"Endurance (long et enchaîné)",tech:[],min:0,noDyn:false,bonus:0},
  power:{name:"Puissance (peu de mouvements durs)",tech:[],min:0,noDyn:false,bonus:0}
};
Object.entries(TSTYLE).forEach(([k,d])=>{MVN[k]=d.name;if(!MVS.includes(k))MVS.push(k)});
const countTech=(s,list)=>s.mv.filter(m=>(m.tech||[]).some(t=>list.includes(t))).length;
