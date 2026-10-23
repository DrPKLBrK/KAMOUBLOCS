// GRADE (v29, amélioration 2.2) : correspondance entre le niveau du générateur (0 à 10) et la cotation Fontainebleau.
// Chargé par le générateur et le résolveur. Rien n'est prouvé d'avance : la correspondance se construit avec TES notes,
// quand tu indiques la cotation ressentie d'un bloc essayé (formulaire de note). Tant qu'il y en a peu, elle reste proche
// d'une correspondance par défaut et l'affichage le dit.
// Méthode : droite cotation = a + b × niveau, ajustée par moindres carrés sur tes notes + 3 points « par défaut » (poids 1 chacun),
// qui retiennent la droite tant que les notes sont rares. Pente bornée (toujours croissante).
const FONT=["3","4","4+","5a","5b","5c","6a","6a+","6b","6b+","6c","6c+","7a","7a+","7b","7b+","7c","7c+","8a"];
const GR_PRIOR=[[2,1.6],[5,5.5],[8,9.4]]; // niveau → indice FONT par défaut (2 ≈ 4/4+, 5 ≈ 5c/6a, 8 ≈ 6b+/6c)
const GR_MIN=5;                            // notes avec cotation à partir desquelles on parle de correspondance personnelle
function gradeFit(){
  const N=(typeof notes==="function"?notes():[]).filter(t=>t&&t.font!=null&&FONT.indexOf(t.font)>=0&&isFinite(t.idx));
  const P=GR_PRIOR.map(([x,y])=>({x,y,w:1})).concat(N.map(t=>({x:t.idx,y:FONT.indexOf(t.font),w:1})));
  const W=P.reduce((s,p)=>s+p.w,0),mx=P.reduce((s,p)=>s+p.w*p.x,0)/W,my=P.reduce((s,p)=>s+p.w*p.y,0)/W;
  let sxx=0,sxy=0;P.forEach(p=>{sxx+=p.w*(p.x-mx)**2;sxy+=p.w*(p.x-mx)*(p.y-my)});
  const b=clamp(sxx>1e-9?sxy/sxx:1.3,.4,2.5),a=my-b*mx;
  const res=N.length?Math.sqrt(N.reduce((s,t)=>s+(FONT.indexOf(t.font)-(a+b*t.idx))**2,0)/N.length):null;
  return{a,b,n:N.length,personal:N.length>=GR_MIN,res};
}
let GRF=null;
const gradeOf=(lvl,F)=>{F=F||GRF||(GRF=gradeFit());return FONT[clamp(Math.round(F.a+F.b*lvl),0,FONT.length-1)]};
// Texte court : « ≈ 6a » + précision sur la source de la correspondance.
function gradeTxt(lvl){const F=GRF=gradeFit();return{g:gradeOf(lvl,F),note:F.personal?`d'après tes ${F.n} cotations`:F.n?`provisoire : ${F.n} cotation${F.n>1?"s":""} sur ${GR_MIN} pour une correspondance personnelle`:"correspondance par défaut, sans tes cotations"}}
// Tableau des paliers du générateur traduits en cotation.
function gradeTable(){const F=gradeFit();return LVL.map(l=>({lab:l[0],lo:gradeOf(l[1],F),hi:gradeOf(Math.min(10,l[2])-.01,F)}))}
