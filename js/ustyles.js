// USTYLES : styles créés par l'utilisateur. Un style = un jeu de curseurs (lancers, croisés, gestes, écart des mains, taille des prises,
// rythme, longueur) que le générateur applique comme un style intégré : récompense pendant la recherche, conditions obligatoires à la fin.
// Les styles sont enregistrés dans le navigateur ; on peut aussi en déduire un à partir de blocs aimés (deriveStyle).
const ULEV4=["Interdit","Indifférent","Favorisé","Obligatoire"],ULEV3=["Indifférent","Favorisé","Obligatoire"];
const UTECH={flag:["drapeau"],press:["retablissement"],under:["opposition","lateral"],lock:["blocage"],hook:["talon","pointe"]};
const UTECHN={flag:"Drapeaux",press:"Rétablissements",under:"Oppositions et tirages latéraux",lock:"Blocages",hook:"Crochets de pied"};
const UMIN={lock:2}; // nombre minimal de mouvements concernés quand le geste est obligatoire
const U0={name:"",dyn:1,cross:1,flag:0,press:0,under:0,lock:0,hook:0,spread:0,small:0,rhythm:0,len:"any"};
const USTYLE={};
const ustyles=()=>ls(KEY.ustyles,[]);
function uRegister(){
  for(const k of Object.keys(USTYLE)){delete USTYLE[k];delete MVN[k];const i=MVS.indexOf(k);if(i>=0)MVS.splice(i,1)}
  for(const u of ustyles()){USTYLE[u.id]=u;MVN[u.id]="★ "+u.name;MVS.push(u.id)}
}
function uSave(u){ // crée ou remplace ; renvoie l'identifiant
  const a=ustyles(),d={...U0,...u};if(!d.id)d.id="u_"+Date.now().toString(36);
  d.name=(d.name||"").trim().slice(0,30)||"Mon style "+(a.length+1);
  const i=a.findIndex(x=>x.id===d.id);if(i>=0)a[i]=d;else a.push(d);
  ss(KEY.ustyles,a);uRegister();return d.id;
}
function uDelete(id){ss(KEY.ustyles,ustyles().filter(x=>x.id!==id));uRegister()}
// Récompense ajoutée à un mouvement pendant la recherche.
function uBonus(U,m,tech){
  let b=0;
  if(m.dyn)b+=U.dyn===3?2.5:U.dyn===2?1.2:0;
  if(m.cross)b+=U.cross===3?1.8:U.cross===2?1:0;
  for(const k in UTECH)if(U[k]>=1&&(tech||[]).some(t=>UTECH[k].includes(t)))b+=U[k]===2?2.4:1.6;
  return b;
}
// Conditions obligatoires sur le bloc entier.
function uOk(U,s){
  if(U.dyn===3&&s.dy<1)return false;if(U.dyn===0&&s.dy>0)return false;
  if(U.cross===3&&s.cr<1)return false;if(U.cross===0&&s.cr>0)return false;
  for(const k in UTECH)if(U[k]===2&&countTech(s,UTECH[k])<(UMIN[k]||1))return false;
  return true;
}
// Déduit les curseurs d'un style à partir de mesures de blocs (voir fxOf dans learn.js). Chaque entrée : {dy,cr,moves,techs,sp?,w?}.
function deriveStyle(fxs){
  const n=fxs.length;if(!n)return{...U0};
  const frac=f=>fxs.filter(f).length/n,mean=(f)=>{const v=fxs.map(f).filter(x=>x!=null&&isFinite(x));return v.length?v.reduce((a,b)=>a+b,0)/v.length:null};
  const lev4=(has,ratio)=>{const p=frac(has);return p>=.8&&ratio>=.15?3:p>=.8?2:p>=.4?2:p>0?1:n>=2?0:1};
  const u={...U0};
  u.dyn=lev4(x=>x.dy>0,mean(x=>x.moves?x.dy/x.moves:0)||0);
  u.cross=lev4(x=>x.cr>0,mean(x=>x.moves?x.cr/x.moves:0)||0);
  for(const k in UTECH){const p=frac(x=>UTECH[k].some(t=>(x.techs||{})[t]>0));u[k]=p>=.8?2:p>=.4?1:0}
  const sp=mean(x=>x.sp);if(sp!=null)u.spread=Math.round(clamp((sp-.7)/.35,-1,1)*10)/10;
  const w=mean(x=>x.w);if(w!=null)u.small=w<9.5?1:w>=12?-1:0;
  const mv=mean(x=>x.moves);if(mv!=null)u.rhythm=Math.round(clamp((7.5-mv)/3,-1,1)*10)/10;
  u.len=mv==null?"any":mv>=10?"long":mv<=5?"short":"any";
  return u;
}
// Mesures d'un bloc déjà généré (les anciens blocs sauvegardés n'ont pas toutes les mesures).
const fxOfBlock=r=>r.fx||{dy:r.dy||0,cr:r.cr||0,moves:r.moves||0,techs:r.techs||{},sp:null,w:null};
uRegister();
