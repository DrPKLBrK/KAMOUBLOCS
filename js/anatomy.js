// ANATOMIE : traduit chaque position du bloc en contraintes sur les articulations (épaule, doigts, coude, genou/hanche).
// Pour chaque mouvement et pour la petite ET la grande taille, on estime la posture (bassin, épaule, bras, pieds)
// puis on applique des règles simples. Ce sont des estimations de TENDANCE, pas un avis médical.
// Tous les seuils sont dans ANA : monte-les pour des alertes plus rares, baisse-les pour plus de prudence.
const ANA={
  shoulderUp:.30,   // hauteur de l'épaule au-dessus du bassin (× taille)
  spread:.60,       // écart horizontal entre les mains jugé exigeant pour l'épaule (× taille)
  spreadAlert:.75,  // idem, niveau « alerte »
  poorF:1.7,        // facteur d'orientation de prise au-delà duquel l'effort est « de biais » (1 = idéal)
  poorAlert:2.4,
  loadAlert:.60,    // part du poids du corps sur une seule main au-delà de laquelle le doigt travaille près de son maximum
  loadWatch:.46,
  microGrip:4,      // tenue (1-5) à partir de laquelle une réglette est une « micro-réglette »
  flexedH:.45,      // main plus basse que (bassin + ce seuil × taille) : coude nettement fléchi
  lockRatio:.85,    // la main libre part à plus de ce rapport de la portée : le blocage est sollicité
  pulleyWatch:1.2,  // indice de charge de la poulie A2 (part du poids du corps sur la main × facteur de prise) : vigilance
  pulleyAlert:2.0,  // idem : alerte
  hookTol:.10,      // pied au niveau ou au-dessus du bassin (marge, × taille) : crochet de talon / pointe
  footLat:.55       // décalage latéral du pied par rapport au bassin jugé exigeant pour le genou (× taille)
};
const JOINTS={
  epaule:"Épaule (coiffe des rotateurs)",
  doigts:"Doigts (poulies A2 / A4)",
  coude:"Coude",
  genou:"Genou et hanche",
  poignet:"Poignet (extension en appui)",
  dos:"Dos (lombaires)",
  chute:"Chute et réception (cheville, genou)"
};
// Facteur de charge de la poulie A2 par rapport à la force exercée au bout des doigts, selon la prise (Schweizer 2001 : 3 à 4 fois
// en prise crispée ; la prise ouverte, sloper ou gros bac, charge beaucoup moins la poulie : Vigouroux 2006).
const pulleyF=h=>h.slo||h.fam==='circ'||h.grip<=2?1:(h.crimp||h.fam==='bar'||(h.w<=8&&h.grip>=3))?3.5:h.fam==='tri'?1.5:2;
const sizeLab=s=>PROF.on?"ce grimpeur ("+(PROF.H/100).toFixed(2).replace(".",",")+" m)":s.has(BODY.hMin)&&s.has(BODY.hMax)?"toutes tailles":s.has(BODY.hMin)?"petit grimpeur (1,50 m)":"grand grimpeur (1,90 m)";
// s = séquence du générateur (départ s.h0/s.f0, mouvements s.mv). Retourne la liste des constats.
function anaSeq(s,style,camp){
  const N=new Map(),cm=Math.round;
  const add=(j,k,code,txt,lvl,Hc)=>{
    const key=j+"|"+k+"|"+code,o=N.get(key)||{j,k,code,txt,lvl,sizes:new Set()};
    o.sizes.add(Hc);if(lvl==="alerte")o.lvl="alerte";N.set(key,o);
  };
  for(const Hc of SIZES()){
    const reach=reachOf(Hc);
    let hd=s.h0,ft=s.f0||[],crimpRun=0,lockRun=0,lockHold=null,fall=0,fallK=0,fallDyn=false;
    s.mv.forEach((m,k)=>{
      const pre={hd,ft},post={hd:m.hd||hd,ft:m.ft||ft};
      hd=post.hd;ft=post.ft;
      if(!camp&&ft.length){const fy=Math.min(...ft.map(q=>q.o.y));if(fy>fall){fall=fy;fallK=k}if(m.m.dyn&&fy>=130)fallDyn=true}
      const hp=hips(post.hd,post.ft,Hc,camp),hpPre=hips(pre.hd,pre.ft,Hc,camp),shY=hp.y+ANA.shoulderUp*Hc,h=m.h,mine=post.hd.find(q=>q.o===m.o)||{o:m.o,h,rho:m.rho};
      const f=facAt(h,m.rho,Math.atan2(hp.y-m.o.y,hp.x-m.o.x));
      // ---------- Doigts / poulies ----------
      const micro=(h.grip>=ANA.microGrip&&(h.crimp||h.w<=8))||(h.grip>=5&&!h.slo);
      crimpRun=micro?crimpRun+1:0;
      if(micro&&crimpRun>=2)add("doigts",k,"chaine",`Enchaînement de ${crimpRun} micro-réglettes (dont n°${h.n}) : flexion maximale des doigts en prise crispée, sans temps de récupération. Les poulies A2 (base du doigt) et A4 (milieu de la 2e phalange) subissent plusieurs pics de charge de suite : risque de lésion de poulie, surtout si les doigts ne sont pas échauffés.`,crimpRun>=3?"alerte":"vigilance",Hc);
      else if(micro)add("doigts",k,"micro",`Micro-réglette n°${h.n} : le bout des doigts travaille en flexion maximale (prise crispée). La poulie A2 reprend environ 3 à 4 fois la force exercée au bout du doigt (Schweizer) : évite de la tenir en statique prolongé ou d'y faire des à-coups.`,"vigilance",Hc);
      if(m.m.dyn&&!m.pair){const Dy=dynoOf(pre,m.o,h,Hc,camp),pf=pulleyF(h),lv=(pf>=3.5||h.grip>=4)?"alerte":(pf>=2||Dy.capRatio>.8)?"vigilance":null;
        if(lv)add("doigts",k,"dyn",`Réception d'un lancer sur la prise n°${h.n} (tenue ${h.grip}/5) : environ ${Dy.impact.toFixed(1).replace(".",",")} fois le poids du corps à l'impact, qui passe d'un coup sur les poulies A2/A4 et les fléchisseurs profonds${pf>=3.5?" ; en prise crispée la poulie A2 reprend 3 à 4 fois cette force, et une charge brutale est le mécanisme classique de rupture de poulie":""}.`,lv,Hc)}
      if(f!=null&&f>=ANA.poorF&&h.grip>=3&&!(micro&&crimpRun>=2))add("doigts",k,"fuyante",`Prise fuyante n°${h.n}, tournée à ${m.rho}° : la direction de traction n'est pas alignée avec la prise (facteur ${f.toFixed(1)}). Les fléchisseurs profonds compensent le glissement et la poulie A2 est sollicitée près de son maximum${h.slo?", sans bord franc pour verrouiller la prise":""}.`,f>=ANA.poorAlert?"alerte":"vigilance",Hc);
      // charge réelle sur la main fixe pendant que l'autre part (forces : skeleton.js)
      const fixedH=post.hd.find(q=>q.o===m.ot.o)||m.ot,Lx=m.pair?{hand:[]}:loadsOf([fixedH],pre.ft,Hc,true,m.o),sh=Lx.hand[0]?Lx.hand[0].share:0,fh=fixedH.h;
      if(!m.pair&&!camp&&fh){const pf=pulleyF(fh),ix=sh*pf,ixc=ix/CL.force();if(ixc>=ANA.pulleyWatch)add("doigts",k,"charge",`La prise n°${fh.n} (tenue ${fh.grip}/5) porte à elle seule environ ${cm(sh*100)} % du poids du corps pendant que l'autre main part : en prise ${pf>=3.5?"crispée":pf>=2?"demi-crispée":"ouverte"}, la poulie A2 reprend environ ${pf.toString().replace(".",",")} fois cette force, soit ${cm(ix*100)} % du poids du corps. Charge forte et maintenue sur les poulies et les fléchisseurs profonds${fh.slo?", sans bord pour verrouiller les doigts":""}.`,ixc>=ANA.pulleyAlert?"alerte":"vigilance",Hc)}
      // ---------- Épaule / coiffe des rotateurs ----------
      const hy0=post.hd[0].o.y,hy1=post.hd[1].o.y,dxh=Math.abs(post.hd[0].o.x-post.hd[1].o.x);
      if(dxh>ANA.spread*Hc&&Math.min(hy0,hy1)>=shY-.1*Hc)add("epaule",k,"ecart",`Bras écartés de ${cm(dxh)} cm avec les mains à hauteur d'épaule ou au-dessus : abduction horizontale proche du maximum, tête humérale décentrée. Le sus-épineux et l'infra-épineux (coiffe des rotateurs) et le tendon du long biceps travaillent en bout de course : risque de tendinopathie et de conflit sous-acromial.`,dxh>ANA.spreadAlert*Hc?"alerte":"vigilance",Hc);
      const dxb=mine.o.x-hp.x,up=hp.y-m.o.y>.15*Hc;
      if(up&&f!=null&&f>=1.4)add("epaule",k,"under",`Prise n°${h.n} utilisée en opposition par le bas (le bassin est au-dessus de la main), tournée à ${m.rho}° : rotation interne forcée de l'épaule sous charge. Le sous-scapulaire, le grand pectoral et le biceps sont sollicités en étirement.`,"vigilance",Hc);
      else if(f!=null&&f>=ANA.poorF&&m.o.y>shY+.05*Hc&&Math.abs(dxb)>.2*Hc)add("epaule",k,"rot",`Traction sur la prise n°${h.n} (${m.rho}°) avec le bras levé, à ${cm(Math.abs(dxb))} cm de l'axe du corps : l'effort part de biais et l'épaule doit le compenser en rotation externe (infra-épineux, petit rond) dans une position où la coiffe est mécaniquement la moins forte.`,f>=ANA.poorAlert?"alerte":"vigilance",Hc);
      if((m.tech||[]).includes('opposition')&&hp.y-m.o.y>.30*Hc)add("dos",k,"dos",`Opposition basse sur la prise n°${h.n} : la main tire sous le bassin, le tronc se cambre pour reprendre la traction. Forte compression des lombaires (muscles spinaux) et travail soutenu des abdominaux ; garde le ventre gainé et le bassin près du mur.`,"vigilance",Hc);
      if(m.m.dyn&&!m.pair&&m.o.y>shY){const Dd=dynoOf(pre,m.o,h,Hc,camp),sev=Dd.impact>=1.5||Dd.ratio>.85||camp||pre.ft.length<2;add("epaule",k,"dynep",`Lancer vers la prise n°${h.n} bras levé : la réception freine brutalement le bras au-dessus de l'épaule. La coiffe des rotateurs et le bourrelet de l'épaule (labrum) encaissent le choc de décélération ; la lésion du labrum (SLAP) par rattrapage d'un lancer est le mécanisme traumatique classique${sev?", d'autant plus que le saut est proche du maximum, que la réception est dure ou que les appuis sont réduits":""}.`,sev?"alerte":"vigilance",Hc)}
      // ---------- Coude : blocage bras plié ----------
      const fx=post.hd.find(q=>q.o===m.ot.o)||m.ot,flexed=fx.o.y-hpPre.y<ANA.flexedH*Hc,rr=m.m.d/reach;
      if(!m.pair&&flexed&&rr>=ANA.lockRatio){
        if(lockHold===fx.h.n)lockRun++;else{lockHold=fx.h.n;lockRun=1}
        const ff=facAt(fx.h,fx.rho,Math.atan2(hpPre.y-fx.o.y,hpPre.x-fx.o.x));
        if(lockRun>=2||rr>=1.0){
          const ori=ff!=null&&ff>=1.5?` La prise n°${fx.h.n} est tournée à ${fx.rho}° : l'avant-bras est forcé en pronation ou en supination, ce qui reporte la tension sur les insertions des muscles épicondyliens (risque d'épicondylite latérale ou médiale).`:"";
          add("coude",k,"lock",`Blocage bras plié sur la prise n°${fx.h.n}${lockRun>=2?` pendant ${lockRun} mouvements consécutifs`:""} pendant que l'autre main part à ${cm(m.m.d)} cm : le coude reste fléchi vers 90° sous charge, biceps brachial et brachial en contraction isométrique prolongée. Par rapport au bras tendu, un coude à 90° multiplie environ par 3 le moment de flexion du coude et par 6 le moment de rotation de l'épaule (Exel 2023), sans soulager les doigts.${ori}`,lockRun>=3||ff>=ANA.poorF?"alerte":"vigilance",Hc);
        }
      }else{lockHold=null;lockRun=0}
      if(m.pair){ // lancer à deux mains : les deux bras encaissent la réception
        const Dp=dynoPair(pre,{o:m.o,h:m.h},{o:m.pair.o,h:m.pair.h},Hc,camp);
        if(Dp&&Dp.need>0){
          const hh=m.pair.h;
          if(hh.grip>=4||h.grip>=4)add("doigts",k,"dyn2","Réception d'un lancer à deux mains sur les prises n°"+h.n+" et n°"+hh.n+" : environ "+Dp.impact.toFixed(1).replace(".",",")+" fois le poids du corps sur chaque main, la charge se partage mais les deux mains doivent se verrouiller au même instant sur les poulies A2/A4.",Dp.capRatio>.9?"alerte":"vigilance",Hc);
          if(Math.min(m.o.y,m.pair.o.y)>shY)add("epaule",k,"dynep2","Lancer à deux mains vers des prises au-dessus des épaules : les deux bras sont freinés en même temps, bras tendus au-dessus de la tête. Les deux coiffes des rotateurs et les labrums encaissent la décélération, sans possibilité de relâcher un côté.","alerte",Hc);
        }
      }
      if((m.tech||[]).includes('retablissement')&&!m.pair){const fx2=m.ot;add("poignet",k,"press",`Rétablissement sur la prise n°${fx2.h.n} : appui poussé vers le bas, bras tendu, poignet en extension forcée sous le poids du corps. L'articulation du poignet et les extenseurs de l'avant-bras encaissent la charge, et le triceps et le deltoïde antérieur travaillent en poussée. Place la paume à plat, doigts écartés, et évite d'y charger tout le poids brusquement.`,"vigilance",Hc)}
      if(m.flag){const lat=Math.abs(m.o.x-m.ot.o.x);add("genou",k,"flag","Drapeau : la jambe libre (pied n°"+m.flag.free.h.n+") part en contrepoids de l'autre côté. La hanche de la jambe libre est en abduction et rotation, les adducteurs et le fessier moyen de la jambe d'appui travaillent fort"+(lat>.5*Hc?", et le déplacement latéral de "+cm(lat)+" cm accentue la torsion du bassin":"")+".",lat>.5*Hc?"vigilance":"vigilance",Hc)}
      // ---------- Genou / hanche ----------
      const newFeet=k===0?[...(s.f0||[]),...m.nf]:m.nf;
      for(const q of newFeet){
        const dz=q.o.y-hp.y;
        if(!camp&&dz>=-ANA.hookTol*Hc*CL.flex()){const hk=(m.tech||[]).some(x=>x==='talon'||x==='pointe');add("genou",k,"hook"+q.h.n,hk?`Crochet de talon ou de pointe en position haute (pied n°${q.h.n}, ${cm(Math.max(0,dz))} cm au-dessus du bassin) : hanche fléchie au-delà de 110° et genou tiré sous charge. Les ischio-jambiers sont sollicités à leur insertion haute (ischio) ; au genou, le crochet de talon expose surtout la bandelette ilio-tibiale (première lésion rencontrée) puis le ménisque interne, surtout si le talon pivote pendant la traction.`:`Pied très haut (n°${q.h.n}, ${cm(Math.max(0,dz))} cm au-dessus du bassin) : genou et hanche en flexion extrême sous charge. Le grand pas haut est la position où le ménisque interne est le plus souvent lésé : garde le genou près du mur et monte le pied sans rotation.`,style==='hook'&&dz>.2*Hc?"alerte":"vigilance",Hc)}
        const lat=Math.abs(q.o.x-hp.x);
        if(!camp&&lat>ANA.footLat*Hc*CL.flex())add("genou",k,"lat"+q.h.n,`Pied n°${q.h.n} (${q.h.type}) décalé de ${cm(lat)} cm de l'axe du bassin : la poussée se fait genou en rotation et en valgus. Le ligament collatéral médial, le ménisque interne et le ligament croisé antérieur sont contraints, d'autant plus que l'appui est une pointe sur une petite prise.`,lat>.7*Hc?"alerte":"vigilance",Hc);
      }
    });
    // chute : hauteur des pieds au pire moment ; la réception (cheville, genou, poignet) est le principal risque aigu du bloc
    if(fall>=130)add("chute",fallK,"chute",`Chute possible d'environ ${cm(fall)} cm depuis le mouvement ${fallK+1} (hauteur des pieds) : en cas de décrochage, la réception se fait sur les pieds puis sur le matelas. La cheville (entorse) et le genou sont les plus exposés : lors d'une chute, le ligament croisé antérieur est le plus souvent touché (41 % des blessures de genou par chute dans une série de 71 grimpeurs), surtout si le genou part vers l'intérieur en rotation ; le poignet l'est si on tend la main pour se rattraper. Matelas bien posés, pareur, chute jambes fléchies et pieds à plat, sans amortir avec les bras tendus.`,fall>=170||fallDyn?"alerte":"vigilance",BODY.hMid);
  }
  return [...N.values()].map(o=>({...o,sizes:sizeLab(o.sizes)})).sort((a,b)=>a.k-b.k||(a.lvl==="alerte"?-1:1));
}
// Score de contrainte articulaire d'un bloc : sert à départager les candidats (les blocs doux sont préférés aux niveaux faciles).
// Pondération par articulation d'après la fréquence des blessures de grimpeurs (Schöffl 2015, 911 blessures : doigts 52 %, épaule en 2e ;
// genou jusqu'à 10 % ; coude et poignet surtout en surcharge). C'est un choix de réglage, pas une statistique.
const AW={doigts:1.3,epaule:1,coude:.8,poignet:.6,genou:.6,dos:.6,chute:.8};
const anaScore=notes=>notes.reduce((t,n)=>t+(AW[n.j]||1)*(n.lvl==="alerte"?2:1),0);
