// CONFIG : tout ce qui décrit TON mur et tes réglages. À modifier si le mur change.
// ----- Murs -----
// Un mur = une liste de pans (largeur, hauteur, dévers) et l'angle de chaque jonction entre deux pans.
// angle 90 = coin rentrant (comme le tien), 180 = pans dans le prolongement, 270 = arête saillante.
// dévers : degrés au-delà de la verticale (positif = déversant, négatif = dalle).
const WALL_DEFAULT={id:"mon-mur",name:"Mon mur (2 pans, coin à 90°)",pitch:20,gap:10,topMax:245,minHandY:90,startY:[100,150],minFootY:30,
  panels:[{id:"G",name:"gauche",w:220,h:246,tilt:0},{id:"D",name:"droit",w:273,h:268,tilt:0}],joints:[90]};
const WALLS_KEY="walls5",WALL_ACTIVE_KEY="wall5";
const customWalls=()=>ls(WALLS_KEY,[]);
const allWalls=()=>[WALL_DEFAULT,...customWalls()];
// Calcule les dimensions déduites d'une définition de mur (colonnes, rangées, position dans le dessin déplié).
function buildWall(def){
  const pitch=def.pitch||20,gap=def.gap!=null?def.gap:8;let x=0;
  const panels=def.panels.map(p=>{const q={...p,tilt:p.tilt||0,cols:Math.max(1,Math.floor(p.w/pitch)),rows:Math.max(1,Math.floor(p.h/pitch)),x0:x};x+=p.w+gap;return q});
  const W=x-gap,HM=Math.max(...panels.map(p=>p.h));
  const topMax=def.topMax!=null?def.topMax:Math.max(60,HM-23);
  return{id:def.id,name:def.name,pitch,gap,panels,joints:(def.joints||[]).slice(0,panels.length-1),W,HM,topMax,
    minHandY:Math.min(def.minHandY!=null?def.minHandY:90,Math.max(30,topMax-100)),startY:def.startY||[100,150],minFootY:def.minFootY!=null?def.minFootY:30};
}
// Résolveur : le mur d'un bloc importé est imposé par window.WALL_FORCE (définition enregistrée si ses pans sont identiques, sinon celle du bloc).
const WALL=(()=>{
  const F=typeof window!=="undefined"&&window.WALL_FORCE;
  if(F&&F.panels&&F.panels.length){const same=a=>a&&a.panels.length===F.panels.length&&a.panels.every((p,i)=>p.w===F.panels[i].w&&p.h===F.panels[i].h&&(p.tilt||0)===(F.panels[i].tilt||0))&&(a.pitch||20)===(F.pitch||20);
    const d=allWalls().find(w=>w.id===F.id&&same(w));return buildWall(d||Object.assign({gap:WALL_DEFAULT.gap},F))}
  const id=ls(WALL_ACTIVE_KEY,WALL_DEFAULT.id),d=allWalls().find(w=>w.id===id)||WALL_DEFAULT;return buildWall(d)})();
const WSUF=WALL.id===WALL_DEFAULT.id?"":"@"+WALL.id; // les mémoires de blocs sont séparées par mur
// Morphologie : le bloc doit marcher pour la petite ET la grande personne.
const BODY={hMin:150,hMax:190,hMid:170,reachK:.58}; // portée statique = reachK × taille
// Profil de grimpeur (v26). Désactivé : le bloc doit marcher pour la petite (1,50 m) ET la grande (1,90 m) personne, proportions moyennes.
// Activé : le moteur travaille pour CE grimpeur seul. ape = longueur des bras relative (1 = proportions moyennes, 1,05 = bras 5 % plus longs),
// flex = souplesse des hanches (1 = moyenne), force = force des doigts relative au poids du corps (1 = grimpeur moyen), mass = poids (kg, affichage), corp = corpulence 1-5 (visuel).
const PROF0={on:false,H:170,ape:1,flex:1,force:1,mass:70,corp:3};
const PROF={...PROF0,...ls("climber1",{})};
const CL={ape:()=>PROF.on?PROF.ape:1,flex:()=>PROF.on?PROF.flex:1,force:()=>PROF.on?PROF.force:1};
function applyClimber(){if(PROF.on){BODY.hMin=BODY.hMax=BODY.hMid=PROF.H}else{BODY.hMin=150;BODY.hMax=190;BODY.hMid=170}}
const SIZES=()=>BODY.hMin===BODY.hMax?[BODY.hMin]:[BODY.hMin,BODY.hMax]; // tailles à vérifier
applyClimber();
const climberObj=()=>PROF.on?{H:PROF.H,ape:PROF.ape,flex:PROF.flex,force:PROF.force,mass:PROF.mass,corp:PROF.corp}:null;
// Niveaux affichés (min/max sur l'échelle interne 0-10)
const LVL=[["Très facile",0,1.5],["Facile",1.5,3.5],["Moyen",3.5,5.5],["Difficile",5.5,7.5],["Extrême",7.5,10]];
// Styles proposés dans les menus
const MVN={surprise:"Au hasard",mix:"Libre",static:"Statique / contrôlé",dyno:"Dynamique (lancers)",coord:"Coordination (saut + croisé)",compress:"Compression d'angle",trav:"Traversée du coin",cross:"Croisés",hook:"Crochets de pied",nofeet:"Pieds libérés (campus)"};
const MVS=['mix','static','static','dyno','coord','compress','trav','cross','hook','nofeet']; // tirage "Surprise"
const HSN={mix:"Libres",crimp:"Réglettes",sloper:"Slopers",pinch:"Pinces",arc:"Crochets"};
// Types de parcours (voir generator.js)
const KINDN={up:"Vertical",trav:"Traversée",diag:"Diagonale",corner:"Passage du coin",zig:"Zigzag"};
// Clés de sauvegarde navigateur
const KEY={grips:"grips2",hist:"hist4"+WSUF,heat:"heat4"+WSUF,favs:"blocs4"+WSUF,posed:"posed5"+WSUF,cfg:"cfg5",profs:"profs5",names:"names5",on:"on5",notes:"notes5",custom:"custom5",prefs:"prefs6",ustyles:"ustyles6"};
// Zones du mur et longueurs de bloc proposées dans les menus (voir generator.js : ZONES et LENGTHS)
// Zones : tout le mur, chaque pan, et le voisinage des jonctions (voir generator.js : ZONES)
const ZONEN={all:"Tout le mur"};
WALL.panels.forEach(p=>{ZONEN[p.id]=WALL.panels.length>1?"Pan "+p.name:"Mur entier"});
if(WALL.panels.length===1)delete ZONEN[WALL.panels[0].id];
if(WALL.joints.length)ZONEN.C=WALL.joints.length>1?"Autour des jonctions":"Autour du coin";
const isPanelZone=z=>WALL.panels.length>1&&WALL.panels.some(p=>p.id===z);
const LENN={any:"Libre",short:"Court",mid:"Moyen",long:"Long"};
