// MEASURE (v29, amélioration 3.3) : description fine des prises, chargé par le générateur ET le résolveur.
// Deux mesures facultatives par prise, prises une fois avec une règle :
//  - dep : profondeur utile du bord, en mm (là où reposent les phalanges ; pour un sloper, la longueur de la zone tenable) ;
//  - ang : angle de la surface de préhension, en degrés : 0 = bord à plat (horizontal), + = rentrant (« incut »), - = fuyant.
// À quoi elles servent :
//  1) Second modèle (model2.js) : la capacité de tenue d'une prise mesurée vient de la physique (profondeur, angle)
//     et non plus de ta note de tenue ; le cône de traction utile s'ouvre sur un bord rentrant, se ferme sur un bord fuyant.
//  2) Moteur principal (générateur et résolveur) : une fois au moins 5 prises mesurées, on relie tes notes de tenue à la tenue mesurée
//     (droite tracée sur TES prises) ; une prise dont la mesure dit qu'elle est plus dure (ou plus facile) que sa note reçoit un
//     ajustement borné, du même type que l'apprentissage par les notes (learn.js), et le bloc en garde la trace (champ meas).
// Les pinces (famille tri) ne sont pas concernées : leur tenue dépend de l'écartement, pas d'un bord.
const MEAS_KEY="hold_meas",MEAS_MIN=5,MEAS_MAX=1;
const measAll=()=>ls(MEAS_KEY,{})||{};
function measApply(){const m=measAll();holds.forEach(h=>{const d=m[h.n];if(d&&d.dep>0){h.dep=+d.dep;h.ang=isFinite(+d.ang)?+d.ang:0}else{delete h.dep;delete h.ang}})}
measApply();
function measSet(n,dep,ang){
  const m=measAll();dep=+dep;
  if(!(dep>0))delete m[n];else m[n]={dep:clamp(Math.round(dep),1,80),ang:clamp(Math.round(isFinite(+ang)?+ang:0),-60,45)};
  ss(MEAS_KEY,m);measApply();replay();
}
// Tenue physique relative (≈1 pour un gros bac à plat ; ~0,5 pour une réglette de 8 mm à plat).
// Profondeur : la force maximale des doigts croît avec la profondeur du bord puis plafonne (10 mm ≈ 70 % de 20 mm, 6 mm ≈ 50 %).
// Angle : 1,2 % de tenue par degré, de 40 % (très fuyant) à 125 % (très rentrant).
const measDepF=d=>1-Math.exp(-d/12),measAngF=a=>clamp(1+.012*(a||0),.4,1.25);
const measQ=h=>h&&h.dep>0&&h.fam!=="tri"?measDepF(h.dep)*measAngF(h.ang):null;
// Relie tes notes de tenue (1 facile à 5 dur) à la tenue mesurée, sur tes propres prises.
function measFit(){
  const pts=holds.filter(h=>measQ(h)!=null).map(h=>({h,q:measQ(h),g:h.grip}));
  if(pts.length<MEAS_MIN)return{n:pts.length,ok:false,off:{},pts};
  const mq=pts.reduce((s,p)=>s+p.q,0)/pts.length,mg=pts.reduce((s,p)=>s+p.g,0)/pts.length;
  let sqq=0,sqg=0,sgg=0;pts.forEach(p=>{sqq+=(p.q-mq)**2;sqg+=(p.q-mq)*(p.g-mg);sgg+=(p.g-mg)**2});
  // droite « axe majeur réduit » : symétrique entre notes et mesures, elle ne tasse pas les extrêmes vers la moyenne
  // (une régression ordinaire rendrait systématiquement plus faciles tes prises notées 5 et plus dures celles notées 1).
  const r=sqq>1e-9&&sgg>1e-9?sqg/Math.sqrt(sqq*sgg):0,fitted=r<=-.3,b=fitted?-Math.sqrt(sgg/sqq):0,a=mg-b*mq,off={};
  // notes et mesures qui ne concordent pas : aucune correction (il faut d'abord vérifier les mesures ou les notes)
  if(fitted)pts.forEach(p=>{p.gh=clamp(a+b*p.q,1,5);const o=clamp(.5*(p.gh-p.g),-MEAS_MAX,MEAS_MAX);if(Math.abs(o)>=.05)off[p.h.n]=Math.round(o*100)/100});
  return{n:pts.length,ok:true,a,b,r,fitted,off,pts};
}
// Ajout à l'apprentissage par prise. MEAS_BASE garde l'état d'avant, pour que le résolveur rejoue un bloc avec SES ajustements d'origine.
let MEAS_BASE=null,MEAS_OFF={};
replay=(function(base){return function(){base();MEAS_BASE=Object.assign({},LEARN.a);MEAS_OFF=measFit().off;
  for(const n in MEAS_OFF)LEARN.a[n]=clamp((LEARN.a[n]||0)+MEAS_OFF[n],-2,2)}})(replay);
// Texte d'une prise mesurée (rapport du résolveur, liste des prises).
function measTxt(h){
  if(!(h&&h.dep>0))return"";const a=h.ang||0;
  return`bord de ${h.dep} mm, ${a>2?"rentrant de "+a+"°":a<-2?"fuyant de "+(-a)+"°":"à plat"}`;
}
