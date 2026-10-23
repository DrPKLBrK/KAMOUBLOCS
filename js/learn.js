// LEARN : le générateur apprend de tes notes. Après chaque essai en vrai, tu dis ce que tu as ressenti ;
// l'écart avec l'estimation corrige (1) un décalage général, (2) un décalage par style de mouvement,
// (3) la difficulté de chaque prise. Le tout est recalculé à partir de la liste des notes (rien d'autre n'est stocké).
const NOTE_N=["Très facile","Facile","Moyen","Difficile","Extrême"];
const NOTE_C=[.75,2.5,4.5,6.5,8.75]; // centre de chaque niveau ressenti sur l'échelle interne 0-10
const LEARN_K={g:.15,mv:.2,hold:.3}; // vitesse d'apprentissage : monte-les pour que l'algorithme réagisse plus vite
let LEARN={g:0,mv:{},a:{},n:0,cx:{n:0,hit:0}};
const notes=()=>ls(KEY.notes,[]);
const noteErr=t=>NOTE_C[t.rating]-t.idx; // > 0 : ressenti plus dur que l'estimation
function replay(){
  const L={g:0,mv:{},a:{},n:0,cx:{n:0,hit:0}},cl=(v,m)=>Math.max(-m,Math.min(m,v));
  for(const t of notes()){
    const e=noteErr(t);L.n++;
    L.g=cl(L.g+LEARN_K.g*e,3);L.mv[t.mv]=cl((L.mv[t.mv]||0)+LEARN_K.mv*e,2);
    const hs=[...new Set(t.hands)];for(const n of hs)L.a[n]=cl((L.a[n]||0)+LEARN_K.hold*e/Math.sqrt(hs.length),2);
    // passage le plus dur désigné par l'utilisateur (0 = premier mouvement) : on le compare à celui que le moteur annonçait
    if(Number.isInteger(t.crux)&&t.block&&t.block.hands){
      const hAt=k=>{const x=t.block.hands.find(q=>q.ord===k+1);return x&&x.n};L.cx.n++;
      if(t.crux===t.key)L.cx.hit++;
      else{const a=hAt(t.crux),b=hAt(t.key);if(a)L.a[a]=cl((L.a[a]||0)+.25,2);if(b)L.a[b]=cl((L.a[b]||0)-.1,2)}
    }
  }
  LEARN=L;
}
// Décalage ajouté à l'estimation de niveau d'un bloc de style mv.
const learnOff=mv=>LEARN.g+(LEARN.mv[mv]||0);

// ---------- Goûts : le générateur retient ce que tu aimes (👍) et ce que tu écartes (👎) ----------
// Chaque bloc est décrit par une liste de traits (style, gestes, famille des prises, nombre de lancers…). Pour chaque trait :
// poids = (aimés − écartés) / (aimés + écartés + 3), entre −1 et +1 ; les votes récents comptent un peu plus.
// Le poids cumulé des traits d'un bloc candidat (divisé par 3, plafonné à ±1), multiplié par la force choisie, s'ajoute à son score de choix.
const PREF_K={1:1.5,2:3,3:5};            // force : faible, moyenne, forte
const PREF_MIN=4;                          // en dessous de ce nombre de votes, aucun effet
const prefs=()=>ls(KEY.prefs,[]);
let PM={w:{},n:0,c:{}};
function featOf(s,kind){
  const F=new Set(),mv=s.mv,n=mv.length,hh=[...s.h0.map(x=>x.h),...mv.map(m=>m.h),...mv.filter(m=>m.pair).map(m=>m.pair.h)];
  F.add('kind:'+kind);F.add('len:'+(n<=5?'court':n<=8?'moyen':'long'));F.add('mv:'+(s.style||''));
  hh.forEach(h=>F.add('fam:'+h.fam));
  mv.forEach(m=>(m.tech||[]).forEach(t=>F.add('tech:'+t)));
  F.add('dyn:'+Math.min(2,s.dy||0));F.add('cr:'+Math.min(2,s.cr||0));
  const sp=fxOf(s).sp;if(sp!=null)F.add('sp:'+(sp<.5?'serre':sp>.78?'large':'moyen'));
  const w=hh.reduce((a,h)=>a+h.w,0)/Math.max(1,hh.length);F.add('size:'+(w<9?'petites':w>=12?'grosses':'moyennes'));
  const pans=new Set([...s.h0.map(x=>x.o.pan),...mv.map(m=>m.o.pan)]);pans.forEach(p=>F.add('pan:'+p));if(pans.size>1)F.add('pan:multi');
  return[...F];
}
// Mesures simples d'un bloc, gardées avec lui : servent à déduire un style à partir d'exemples.
function fxOf(s){
  const n=s.mv.length,R=reachOf(BODY.hMin),hh=[...s.h0.map(x=>x.h),...s.mv.map(m=>m.h)],techs={};
  s.mv.forEach(m=>(m.tech||[]).forEach(t=>techs[t]=(techs[t]||0)+1));
  return{dy:s.dy||0,cr:s.cr||0,moves:n,techs,sp:n?s.mv.reduce((a,m)=>a+(m.m&&m.m.d||0),0)/n/R:null,w:hh.reduce((a,h)=>a+h.w,0)/Math.max(1,hh.length)};
}
function prefReplay(){
  const v=prefs().slice(-200),c={},N=v.length;
  v.forEach((x,i)=>{const a=Math.pow(.985,N-1-i);(x.f||[]).forEach(k=>{const o=c[k]||(c[k]={L:0,D:0});if(x.v>0)o.L+=a;else o.D+=a})});
  const w={};for(const k in c)w[k]=(c[k].L-c[k].D)/(c[k].L+c[k].D+3);
  PM={w,n:N,c};
}
const prefBonus=f=>{
  if(PM.n<PREF_MIN||!f||!f.length||typeof CFG==='undefined'||CFG.prefOn===false)return 0;
  let t=0;for(const k of f)t+=PM.w[k]||0;return clamp(t/3,-1,1)*PREF_K[CFG.prefK||2]; // somme des poids des traits connus, plafonnée
};
// Enregistre un vote (1 = j'aime, −1 = pas pour moi) pour le bloc r ; un nouveau vote sur le même bloc remplace le précédent.
function votePref(r,v){
  if(!r||!r.feat)return;
  const a=prefs().filter(x=>x.id!==r.id);
  if(v!==0)a.push({id:r.id,ts:Date.now(),v,f:r.feat,mv:r.mv,fx:r.fx});
  ss(KEY.prefs,a.slice(-200));prefReplay();
}
const voteOf=r=>{const x=r&&prefs().find(q=>q.id===r.id);return x?x.v:0};
const FEATN={kind:"parcours",len:"longueur",mv:"style",fam:"prises",tech:"geste",dyn:"lancers",cr:"croisés",sp:"écart des mains",size:"taille des prises",pan:"zone"};
const FEATV={dyn:{0:"aucun lancer",1:"un lancer",2:"plusieurs lancers"},cr:{0:"aucun croisé",1:"un croisé",2:"plusieurs croisés"},pan:{multi:"plusieurs pans"}};
function featLabel(k){
  const i=k.indexOf(':'),g=k.slice(0,i),v=k.slice(i+1);
  if(FEATV[g]&&FEATV[g][v])return FEATV[g][v];
  if(g==='kind')return"parcours "+(KINDN[v]||v).toLowerCase();
  if(g==='mv')return"style "+(MVN[v]||v);
  if(g==='tech')return(typeof techName==='function'?techName(v):v);
  if(g==='fam')return"prises "+({dish:"plates",drop:"en goutte",arc:"en crochet",tri:"pinces",bar:"réglettes",horn:"cornes",facet:"à facettes",circ:"rondes"}[v]||v);
  if(g==='sp')return"mains "+v+"s";
  if(g==='size')return v+" prises";
  if(g==='len')return"bloc "+v;
  if(g==='pan'){const p=WALL.panels.find(q=>q.id===v);return"pan "+(p?p.name:v)}
  return k;
}
