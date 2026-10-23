// PHYSICS (V3) : contrôle biomécanique d'un bloc généré, pour la plus petite ET la plus grande taille de grimpeur.
// Ne génère rien : il valide chaque état (mains + pieds) et chaque transit (une main en l'air).
// Échec « dur » => le bloc est écarté. « Alerte » => affichée dans le panneau Contrôle de faisabilité.
const V3={
  extMax:1.4,      // écart max main la plus haute / pied le plus bas, en multiple de la taille
  latSettle:.2,    // décalage latéral toléré du bassin hors du polygone des pieds (× taille), état posé
  latTransit:.3,   // idem pendant le transit (une main libre)
  hard:1.6,        // au-delà de (tolérance × hard), l'état est jugé infaisable
  groundY:0        // 0 = jamais de pieds au sol : chaque pied doit être sur une prise
};
// Appuis réellement chargés : pieds sur prises, ou sol si les mains sont basses.
function v3feet(hd,ft){
  if(ft.length)return{xs:ft.map(f=>f.o.x),ys:ft.map(f=>f.o.y),ground:false};
  const ay=(hd[0].o.y+hd[1].o.y)/2,hx=(hd[0].o.x+hd[1].o.x)/2;
  return ay<=V3.groundY?{xs:[hx-8,hx+8],ys:[0,0],ground:true}:null;
}
function v3state(hd,ft,Hc,transit,camp,tag,out,fresh,reachTo,flag){
  // 1) Chaque main doit tirer dans le cône utilisable de sa prise (orientation choisie) : mêmes règles que moveCost.
  const sup=transit?[hd[0]]:hd; // en transit seule la main fixe est comptée
  const hp=hips(hd,ft,Hc,camp);
  if(!hp.ok&&hp.limit){const L=hp.limit,o=Math.round(L.over);
    out.hard.push(L.kind==='hand'?`${tag} (${Hc} cm) : épaules et bras, la prise n°${L.n} est hors d'atteinte compte tenu des appuis de pied (bras déjà tendu, ${o} cm de trop) : tirage en extension maximale, épaule en bout de course`:`${tag} (${Hc} cm) : hanches et jambes, le pied sur la prise n°${L.n} est trop loin du bassin (${o} cm de trop) : étirement forcé des adducteurs et du genou`)}
  else if(hp.ok&&hp.slack>.015*Hc)out.soft.push(`${tag} (${Hc} cm) : corps très étiré, bras ou jambe presque en extension maximale (marge de ${Math.round(hp.slack)} cm dépassée) : épaule et hanche en bout de course`);
  for(const x of sup){
    const f=x.press?facAt(x.h,x.rho,FOOT_PSI):facAt(x.h,x.rho,Math.atan2(hp.y-x.o.y,hp.x-x.o.x)); // rétablissement : la main pousse vers le bas
    if(f==null){
      // prise qui vient d'être saisie : échec dur ; prise tenue depuis plus longtemps : le corps l'a dépassée, simple alerte
      if(x.h===fresh)out.hard.push(`${tag} (${Hc} cm) : doigts et avant-bras, la prise n°${x.h.n} est tirée hors de son axe utile : la force passe en cisaillement sur la pulpe et sur les poulies`);
      else out.soft.push(`${tag} : doigts et avant-bras, le corps dépasse la prise n°${x.h.n} et la tire dans un angle peu confortable : charge de biais sur les poulies`);
    }
  }
  if(camp)return;
  // 2b) Pieds : orientation et nature de l'appui (pointe, carre, adhérence)
  for(const q of ft){const fq=q.fq;if(!fq||fq.stab>=.55)continue;
    out.soft.push(`${tag} (${Hc} cm) : cheville et genou, ${fq.kind==='adherence'?"l'adhérence sur la prise n°"+q.h.n+" est faible"+((q.o.tilt||0)>10?" en surplomb":"")+" : le pied risque de glisser, il faut le placer à plat et charger lentement":"l'appui sur la prise n°"+q.h.n+" est mal orienté ("+q.rho+"°) : le pied tend à glisser hors de la prise, genou et cheville compensent en torsion"}`)}
  const F=v3feet(hd,ft);
  if(!F){out.hard.push(`${tag} (${Hc} cm) : aucun appui de pied, tout le poids du corps repose sur les doigts, les épaules et les coudes`);return}
  // 2) Transit statique : la main fixe + au moins 2 appuis de pied = 3 appuis.
  if(transit&&F.xs.length<2&&!flag)out.hard.push(`${tag} (${Hc} cm) : moins de 3 appuis pendant le transit, la main fixe doit tout stabiliser (épaule et coude en charge)`);
  // 3) Extension verticale main haute / pied bas.
  const hy=Math.max(hd[0].o.y,hd[1].o.y),fy=Math.min(...F.ys),tl=Math.max(hd[0].o.tilt||0,hd[1].o.tilt||0),extMax=V3.extMax*(1-.005*Math.max(0,tl)); // en surplomb, on ne peut pas s'étirer autant
  if(!F.ground&&(hy-fy)/Hc>extMax)out.hard.push(`${tag} (${Hc} cm) : épaules et dos, étirement de ${Math.round(hy-fy)} cm entre la main haute et le pied bas, au-delà de ce qu'un grimpeur de cette taille peut tenir sans hyper-extension`);
  // 3b) Forces : part du poids du corps sur la main fixe, et risque de rotation en porte (barn door).
  if(transit&&!camp){
    const Ld=loadsOf([hd[0]],ft,Hc,true,reachTo);if(flag)Ld.barn*=.4; // la jambe libre en drapeau retient la rotation
    out.loads.push({tag,Hc,n:hd[0].h&&hd[0].h.n,share:Ld.hand[0]?Ld.hand[0].share:0,barn:Ld.barn});
    if(Ld.barn>FM.barnHard)out.hard.push(`${tag} (${Hc} cm) : rotation en porte (barn door), la main fixe et le pied sont presque alignés et la main libre part loin sur le côté : le corps pivote autour de cet axe, l'épaule et le coude de la main fixe encaissent la torsion`);
    else if(Ld.barn>FM.barnSoft)out.soft.push(`${tag} (${Hc} cm) : risque de rotation en porte (barn door), la main fixe et le pied sont presque alignés : il faut serrer les fessiers et les abdominaux, avancer la hanche vers le mur ou poser le pied opposé pour contrer la rotation`);
  }
  // 4) Équilibre latéral : le centre de masse doit rester au-dessus des pieds.
  const fm=F.xs.reduce((a,b)=>a+b,0)/F.xs.length,span=Math.max(...F.xs)-Math.min(...F.xs);
  const com=transit?(hd[0].o.x+F.xs.reduce((a,b)=>a+b,0))/(1+F.xs.length):(hd[0].o.x+hd[1].o.x+F.xs.reduce((a,b)=>a+b,0))/(2+F.xs.length);
  const tol=.5*span+(transit?V3.latTransit:V3.latSettle)*Hc+(flag?.12*Hc:0),off=Math.abs(com-fm);
  out.margin=Math.min(out.margin,1-off/tol);
  if(off>tol*V3.hard)out.hard.push(`${tag} (${Hc} cm) : déséquilibre latéral, le centre de gravité sort de la zone d'appuis (rotation brutale, charge sur une seule épaule)`);
  else if(off>tol)out.soft.push(`${tag} (${Hc} cm) : équilibre limite, le centre de gravité frôle les limites des appuis : gainage (abdominaux, fessiers), placement du bassin ou pied de contre-poids déterminants`);
}
// s = séquence candidate du générateur. Retourne {ok,hard[],soft[],n,margin}.
function v3check(s,camp){
  const out={hard:[],soft:[],n:0,margin:1,loads:[],dyns:[]};
  let hd=s.h0,ft=s.f0||[];
  const reach150=reachOf(BODY.hMin);
  s.mv.forEach((m,k)=>{
    const pre={hd,ft},post={hd:m.hd||hd,ft:m.ft||ft},tag="Mouvement "+(k+1);
    for(const Hc of SIZES()){
      if(!m.pair){ // transit : la main qui part est encore sur l'ancienne prise, l'autre est fixe
        const fixed0=post.hd.find(x=>x.o===m.ot.o)||m.ot,fixed=(m.tech||[]).includes('retablissement')?Object.assign({},fixed0,{press:true}):fixed0;
        v3state([fixed,pre.hd.find(x=>x!==fixed)||pre.hd[0]],m.flag?[m.flag.stand]:pre.ft,Hc,true,camp,tag+" (transit)",out,undefined,m.o,!!m.flag);
      }
      // à l'arrivée d'un lancer, la ou les mains qui viennent d'attraper sont à portée maximale : leur extension n'est pas contrôlée ici
      v3state(m.m.dyn?post.hd.map(x=>x.o===m.o||(m.pair&&x.o===m.pair.o)?Object.assign({},x,{free:true}):x):post.hd,post.ft,Hc,false,camp,tag,out,m.h);out.n+=m.pair?1:2;
    }
    // lancer : trajectoire balistique du bassin (skeleton.js, dynoOf) : détente demandée, temps de vol, charge à la réception
    if(m.m.dyn){
      for(const Hc of SIZES()){
        const D=m.pair?dynoPair(pre,{o:m.o,h:m.h},{o:m.pair.o,h:m.pair.h},Hc,camp):dynoOf(pre,m.o,m.h,Hc,camp),sz=PROF.on?"grimpeur de "+(Hc/100).toFixed(2).replace(".",",")+" m":Hc===BODY.hMin?"petit grimpeur":"grand grimpeur",two=m.pair?"lancer à deux mains":"lancer",pn=m.pair?`les prises n°${m.h.n} et n°${m.pair.h.n}`:`la prise n°${m.h.n}`,pg=m.pair?Math.max(m.h.grip,m.pair.h.grip):m.h.grip;
        if(!D){out.hard.push(`${tag} : lancer à deux mains impossible, les deux prises sont trop écartées pour être tenues bras tendus ensemble (épaules et coudes en extension maximale)`);continue}
        out.dyns.push({k,Hc,sz,ratio:D.ratio,t:D.t,impact:D.impact,capRatio:D.capRatio,need:D.need});
        if(D.need<=0)continue;
        if(D.ratio>DY.hard)out.hard.push(`${tag} : ${two} trop exigeant pour un ${sz} (${Math.round(D.ratio*100)} % de la détente maximale, soit un saut de ${Math.round(D.need)} cm au-delà de la portée) : jambes, hanches et chevilles ne peuvent pas fournir cette impulsion`);
        else if(D.ratio>DY.soft)out.soft.push(`${tag} : ${two} à la limite pour un ${sz} (${Math.round(D.ratio*100)} % de la détente maximale, temps de vol ${D.t.toFixed(2).replace(".",",")} s) : l'impulsion des jambes doit être parfaite, avec un déclenchement très précis`);
        if(D.capRatio>DY.impHard)out.hard.push(`${tag} : la réception sur ${pn} (tenue ${pg}/5) demande environ ${D.impact.toFixed(1).replace(".",",")} fois le poids du corps, au-delà de ce que cette prise permet de verrouiller (${(D.cap).toFixed(1).replace(".",",")}) : les doigts s'ouvrent à l'impact`);
        else if(D.capRatio>DY.impSoft)out.soft.push(`${tag} : réception du ${two} sur ${pn} (tenue ${pg}/5), environ ${D.impact.toFixed(1).replace(".",",")} fois le poids du corps : les doigts doivent se verrouiller immédiatement, poulies A2 et fléchisseurs profonds au maximum`);
      }
      if(!camp&&m.nf.length===0&&post.ft.length===0&&m.o.y>V3.groundY+40)out.hard.push(`${tag} : lancer sans appui de pied, la réception se fait en charge totale sur les bras`);
    }
    hd=post.hd;ft=post.ft;
  });
  out.ok=out.hard.length===0;
  // analyse articulaire détaillée (anatomy.js), calculée seulement pour les blocs qui passent le contrôle dur
  out.notes=out.ok&&typeof anaSeq==='function'?anaSeq(s,s.style,camp):[];
  return out;
}
