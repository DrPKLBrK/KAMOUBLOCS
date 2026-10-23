// MURS : création et gestion de tes murs (pans, dimensions, dévers, angle des jonctions).
// Le générateur recalcule les trous, les distances (à travers les jonctions) et la difficulté (dévers) pour le mur actif.
const JOINT_OPTS=[[90,"Coin rentrant 90° (comme un angle de pièce)"],[120,"Coin ouvert 120°"],[135,"Coin ouvert 135°"],[150,"Coin très ouvert 150°"],[180,"Pans alignés (plat, pas d'angle)"],[210,"Arête saillante 210°"],[225,"Arête saillante 225°"],[270,"Arête saillante 270° (pilier)"]];
let WE=null,WEid=null,WEmsg=""; // mur en cours d'édition, son identifiant (null = nouveau)
const slug=t=>t.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g,"").replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"")||"mur";
const wallInfo=d=>{const b=buildWall(d),t=d.panels.some(p=>p.tilt);return b.panels.length+" pan"+(b.panels.length>1?"s":"")+" · "+d.panels.map(p=>p.w+"×"+p.h).join(" + ")+" cm"+(t?" · dévers "+d.panels.map(p=>p.tilt+"°").join("/"):"")+" · "+b.panels.reduce((a,p)=>a+p.cols*p.rows,0)+" trous"};
const newWall=()=>({name:"Nouveau mur",pitch:20,gap:8,panels:[{id:"P1",name:"1",w:300,h:250,tilt:0}],joints:[]});
function wallPreview(d){
  let b;try{b=buildWall(d)}catch(e){return""}
  const ps=b.panels,k=Math.min(280/b.W,110/b.HM);
  let f="";ps.forEach(p=>{f+=`<rect x="${(p.x0*k).toFixed(1)}" y="${((b.HM-p.h)*k).toFixed(1)}" width="${(p.w*k).toFixed(1)}" height="${(p.h*k).toFixed(1)}" fill="var(--wall)" stroke="var(--line)"/><text x="${((p.x0+p.w/2)*k).toFixed(1)}" y="${(b.HM*k-4).toFixed(1)}" font-size="9" text-anchor="middle" fill="var(--fg)">${esc(p.name)}${p.tilt?" "+(p.tilt>0?"+":"")+p.tilt+"°":""}</text>`});
  // vue de dessus : chaque jonction tourne le mur de (180 - angle) ; le grimpeur est en bas
  let x=0,y=0,a=0;const pts=[[0,0]];
  ps.forEach((p,i)=>{x+=Math.cos(a)*p.w;y+=Math.sin(a)*p.w;pts.push([x,y]);if(i<ps.length-1)a+=(180-b.joints[i])*D2R});
  const xs=pts.map(q=>q[0]),ys=pts.map(q=>q[1]),w=Math.max(1,Math.max(...xs)-Math.min(...xs)),h=Math.max(1,Math.max(...ys)-Math.min(...ys)),k2=Math.min(260/w,70/h,.5),ox=10-Math.min(...xs)*k2,oy=8-Math.min(...ys)*k2;
  const path=pts.map((q,i)=>(i?"L":"M")+(ox+q[0]*k2).toFixed(1)+","+(oy+q[1]*k2).toFixed(1)).join("");
  return `<svg class="wprev" viewBox="0 0 300 ${Math.round(b.HM*k)+4}" role="img" aria-label="Aperçu de face du mur">${f}</svg>
  <svg class="wprev" viewBox="0 0 300 ${Math.round(h*k2)+24}" role="img" aria-label="Aperçu vu de dessus"><path d="${path}" fill="none" stroke="var(--fg)" stroke-width="4" stroke-linejoin="round"/><text x="150" y="${Math.round(h*k2)+20}" font-size="9" text-anchor="middle" fill="var(--mut)">Vue de dessus (le grimpeur est du côté ouvert)</text></svg>`;
}
function tabWalls(){
  const act=WALL.id,cw=customWalls();
  const li=(d,custom)=>`<li><b>${esc(d.name)}</b>${d.id===act?' <span class="tg">actif</span>':""}<span class="mut">${esc(wallInfo(d))}</span><span class="acts">${d.id===act?"":`<button data-wuse="${d.id}">Utiliser</button>`}<button data-wdup="${d.id}">Dupliquer</button>${custom?`<button data-wedit="${d.id}">Modifier</button><button class="x" data-wdel="${d.id}" aria-label="Supprimer le mur ${esc(d.name)}">×</button>`:""}</span></li>`;
  let h=`<p class="mut">Ajoute ton mur : nombre de pans, largeur, hauteur, dévers et angle entre les pans. Les trous sont recalculés (un trou tous les ${WALL.pitch} cm) et le générateur tient compte de la forme : distances à travers les angles, difficulté en surplomb ou en dalle.</p>
  <ul class="plist">${li(WALL_DEFAULT,false)}${cw.map(w=>li(w,true)).join("")}</ul><div class="row"><button id="wnew">Nouveau mur</button></div>`;
  if(WE){
    const d=WE;
    h+=`<div class="wform"><h4>${WEid?"Modifier le mur":"Nouveau mur"}</h4>
    <div class="row"><label class="f" for="wname"><span>Nom du mur</span><input id="wname" type="text" maxlength="40" value="${esc(d.name)}"></label>
    <label class="f" for="wpitch"><span>Écart entre trous (cm)</span><input id="wpitch" type="number" min="10" max="30" step="1" value="${d.pitch}"></label>
    <label class="f" for="wcount"><span>Nombre de pans</span><select id="wcount">${[1,2,3,4].map(n=>`<option${n===d.panels.length?" selected":""}>${n}</option>`).join("")}</select></label></div>`;
    d.panels.forEach((p,i)=>{
      h+=`<fieldset class="wp"><legend>Pan ${i+1}</legend><div class="row">
      <label class="f"><span>Nom</span><input data-wp="${i}" data-k="name" type="text" maxlength="20" value="${esc(p.name)}"></label>
      <label class="f"><span>Largeur (cm)</span><input data-wp="${i}" data-k="w" type="number" min="60" max="1500" step="5" value="${p.w}"></label>
      <label class="f"><span>Hauteur (cm)</span><input data-wp="${i}" data-k="h" type="number" min="100" max="1500" step="5" value="${p.h}"></label>
      <label class="f"><span>Dévers (°)</span><input data-wp="${i}" data-k="tilt" type="number" min="-30" max="70" step="5" value="${p.tilt||0}"></label></div></fieldset>`;
      if(i<d.panels.length-1)h+=`<label class="f" for="wj${i}"><span>Jonction entre le pan ${i+1} et le pan ${i+2}</span><select id="wj${i}" data-wj="${i}">${optHtml(JOINT_OPTS,(d.joints[i]!=null?d.joints[i]:90))}</select></label>`;
    });
    h+=`<p class="mut">Dévers : 0° = vertical, positif = déversant (le mur penche vers le grimpeur), négatif = dalle. Au-delà de 45°, les blocs deviennent très physiques : surveille le niveau.</p>
    <div id="wprev">${wallPreview(d)}</div>
    <div class="row"><button class="pri" id="wsave">Enregistrer et utiliser ce mur</button><button id="wsave2">Enregistrer sans l'utiliser</button><button id="wcancel">Annuler</button></div>`+`</div>`;
  }
  return h+`<p class="mut" id="wmsg" role="status">${esc(WEmsg)}</p>`;
}
function wallValid(d){
  if(!d.name.trim())return"Donne un nom au mur.";
  for(const p of d.panels){if(!(p.w>=60&&p.w<=1500))return"Largeur d'un pan : entre 60 et 1500 cm.";if(!(p.h>=100&&p.h<=1500))return"Hauteur d'un pan : entre 100 et 1500 cm.";if(p.tilt<-30||p.tilt>70)return"Dévers : entre -30° et 70°."}
  if(!(d.pitch>=10&&d.pitch<=30))return"Écart entre trous : entre 10 et 30 cm.";
  return"";
}
function bindWalls(){
  const b=$("tabbody"),redo=()=>renderTab(),rd=m=>{WEmsg=m||"";redo()};
  b.querySelectorAll("[data-wuse]").forEach(x=>x.onclick=()=>{ss(WALL_ACTIVE_KEY,x.dataset.wuse);location.reload()});
  b.querySelectorAll("[data-wdup]").forEach(x=>x.onclick=()=>{const s=allWalls().find(w=>w.id===x.dataset.wdup);WE=JSON.parse(JSON.stringify(s));WE.name=s.name.replace(/ \(copie\)$/,"")+" (copie)";WEid=null;rd()});
  b.querySelectorAll("[data-wedit]").forEach(x=>x.onclick=()=>{WE=JSON.parse(JSON.stringify(customWalls().find(w=>w.id===x.dataset.wedit)));WEid=WE.id;rd()});
  b.querySelectorAll("[data-wdel]").forEach(x=>x.onclick=()=>{
    if(x.dataset.arm!=="1"){x.dataset.arm="1";x.textContent="Confirmer";setTimeout(()=>{x.dataset.arm="";x.textContent="×"},3500);return}
    const id=x.dataset.wdel;ss(WALLS_KEY,customWalls().filter(w=>w.id!==id));
    if(WALL.id===id){ss(WALL_ACTIVE_KEY,WALL_DEFAULT.id);location.reload();return}
    rd("Mur supprimé.")});
  $("wnew").onclick=()=>{WE=newWall();WEid=null;rd()};
  if(!WE)return;
  const upd=()=>{$("wprev").innerHTML=wallPreview(WE)};
  $("wname").oninput=e=>{WE.name=e.target.value};
  $("wpitch").oninput=e=>{WE.pitch=+e.target.value;upd()};
  $("wcount").onchange=e=>{
    const n=+e.target.value;while(WE.panels.length<n){const k=WE.panels.length+1;WE.panels.push({id:"P"+k,name:String(k),w:250,h:250,tilt:0});WE.joints.push(90)}
    WE.panels.length=n;WE.joints.length=n-1;WE.panels.forEach((p,i)=>p.id="P"+(i+1));rd()};
  b.querySelectorAll("[data-wp]").forEach(x=>x.oninput=()=>{const p=WE.panels[+x.dataset.wp],k=x.dataset.k;p[k]=k==="name"?x.value:+x.value;upd()});
  b.querySelectorAll("[data-wj]").forEach(x=>x.onchange=()=>{WE.joints[+x.dataset.wj]=+x.value;upd()});
  const save=use=>{
    const m=wallValid(WE);if(m){rd(m);return}
    const d=JSON.parse(JSON.stringify(WE));d.id=WEid||slug(d.name)+"-"+Date.now().toString(36);
    const l=customWalls().filter(w=>w.id!==d.id);l.push(d);ss(WALLS_KEY,l);
    WE=null;WEid=null;
    if(use){ss(WALL_ACTIVE_KEY,d.id);location.reload()}else rd("Mur enregistré. Clique « Utiliser » pour le choisir.");
  };
  $("wsave").onclick=()=>save(true);$("wsave2").onclick=()=>save(false);
  $("wcancel").onclick=()=>{WE=null;WEid=null;rd()};
}
