// TECHNIQUES : reconnaissance des gestes techniques à partir de la géométrie et de la physique d'un mouvement.
// Un geste n'est pas une étiquette posée au hasard : chaque règle s'appuie sur la position du bassin (skeleton.js), la direction
// de traction sur la prise (body.js) ou l'état des pieds. Les seuils sont dans l'objet TK.
const TK={flagLat:.28,flagP:.5,lockLow:.45,lockRatio:.85,pressLo:-.05,pressHi:.30,pressUp:.30,pressF:1.8,lat:.18,compDj:80,latF:1.5,hookTol:.10,under:.15,underF:1.25};
const TECHN={dyno:"lancer",dyno2:"lancer à deux mains",croise:"croisé",talon:"crochet de talon",pointe:"crochet de pointe",blocage:"blocage",opposition:"opposition",lateral:"tirage latéral",compression:"compression d'angle",drapeau:"drapeau",retablissement:"rétablissement"};
// mv = mouvement du générateur ({o,h,rho,ot,hd,ft,nf,m,flag,pair}) ; pre = {hd,ft} avant le mouvement. Retourne la liste des gestes.
function techOf(mv,pre,camp){
  const T=[],Hc=BODY.hMid,m=mv.m,h=mv.h,post={hd:mv.hd||pre.hd,ft:mv.ft||pre.ft};
  if(mv.pair)T.push('dyno2');else if(m.dyn)T.push('dyno');
  if(m.cross)T.push('croise');
  if(mv.flag)T.push('drapeau');
  const hpPre=hips(pre.hd,pre.ft,Hc,camp),hp=hips(post.hd,post.ft,Hc,camp);
  // compression : la main part sur un autre pan, de l'autre côté d'un coin rentrant
  if(mv.ot&&mv.ot.o.pan!==mv.o.pan&&WALL.joints.some(a=>a<=135)&&(mv.o.dj||999)<=TK.compDj&&(mv.ot.o.dj||999)<=TK.compDj)T.push('compression');
  if(!mv.pair){
    const f=facAt(h,mv.rho,Math.atan2(hp.y-mv.o.y,hp.x-mv.o.x));
    // opposition : prise tirée vers le haut, bassin au-dessus de la main
    if(hp.y-mv.o.y>TK.under*Hc&&f!=null&&f>=TK.underF)T.push('opposition');
    // tirage latéral : bras levé, effort de biais loin de l'axe du corps
    else if(f!=null&&f>=TK.latF&&mv.o.y>hp.y+(SK.shUp+.05)*Hc&&Math.abs(mv.o.x-hp.x)>TK.lat*Hc)T.push('lateral');
    const fx=mv.ot;
    // blocage : bras fixe plié, l'autre main part loin
    if(fx&&fx.o.y-hpPre.y<TK.lockLow*Hc&&m.d/reachOf(Hc)>=TK.lockRatio)T.push('blocage');
    // rétablissement : appui poussé vers le bas sur une prise plate à hauteur de taille ou de poitrine, l'autre main monte
    if(fx&&(fx.h.fam==='dish'||fx.h.fam==='facet')&&fx.h.grip<=3&&fx.o.y-hpPre.y>=TK.pressLo*Hc&&fx.o.y-hpPre.y<=TK.pressHi*Hc&&mv.o.y>=fx.o.y+TK.pressUp*Hc){
      const fp=facAt(fx.h,fx.rho,FOOT_PSI);if(fp!=null&&fp<=TK.pressF)T.push('retablissement');
    }
  }
  // crochets : pied neuf à hauteur du bassin ou plus haut
  for(const q of mv.nf||[]){
    if(camp)break;const dz=q.o.y-hp.y;
    if(dz>=-TK.hookTol*Hc&&(q.h.fam==='arc'||q.h.fam==='horn'||q.h.fam==='bar')){const r=((q.rho||0)%360+360)%360;T.push(r<=60||r>=300?'talon':'pointe')}
  }
  return[...new Set(T)];
}
const techName=c=>TECHN[c]||c;

// ---------- Anti-raccourci ----------
// Un bloc a un raccourci si, avec ses seules prises de main, on peut aller du départ à l'arrivée en nettement moins de mouvements
// statiques que prévu. On cherche le chemin le plus court (mains posées sur les prises du bloc, portée statique du petit grimpeur).
// Les lancers prévus ne sont pas des raccourcis : ils ne sont pas pris en compte dans la recherche.
const SC={margin:3,reachK:.8,ratio:.4}; // raccourci = au moins 3 mouvements de moins (et >=40 %) avec 80 % de l envergure du petit grimpeur
function shortcutOf(s){
  const nodes=[],idx=new Map(),add=o=>{if(!idx.has(o.id)){idx.set(o.id,nodes.length);nodes.push(o)}return idx.get(o.id)};
  s.h0.forEach(x=>add(x.o));s.mv.forEach(m=>{add(m.o);if(m.pair)add(m.pair.o)});
  const R=reachOf(BODY.hMin)*SC.reachK,N=nodes.length,F=idx.get(s.mv[s.mv.length-1].o.id),a0=idx.get(s.h0[0].o.id),b0=idx.get(s.h0[1].o.id);
  const D=nodes.map(p=>nodes.map(q=>dist(p,q)));
  const key=(a,b)=>a<b?a*N+b:b*N+a,seen=new Map([[key(a0,b0),0]]);let q=[[a0,b0]],len=0;
  while(q.length){
    const nx=[];len++;
    for(const[a,b]of q){
      for(const[m,o]of[[a,b],[b,a]])for(let y=0;y<N;y++){
        if(y===m||(y===o&&y!==F)||D[y][o]>R)continue;
        const k=key(y,o);if(seen.has(k))continue;seen.set(k,len);
        if(y===F&&o===F)return result(len);nx.push([y,o]);
      }
    }
    q=nx;
  }
  return result(Infinity);
  function result(l){const intended=s.mv.length+1+s.mv.filter(m=>m.pair).length;return{len:l,intended,skip:isFinite(l)?Math.max(0,intended-l):0}}
}
