// EDITOR : éditeur de design en direct (couleurs, polices, forme, mur, mise en page, thèmes).
// Il règle des variables CSS et l'ordre des blocs de la page ; rien d'autre n'est modifié. Les choix restent dans ce navigateur.
const ED_KEY="ed5",SYS='system-ui,"Segoe UI",sans-serif';
const ED0={light:{},dark:{},fontD:"Archivo",fontB:"Source Sans 3",fs:16,r:10,gap:14,pad:14,bw:1,bs:"solid",sh:"none",stripe:0,rc:8,cbw:1,ch:40,btn:"outline",sum:"plain",chev:"tri",sumpad:6,hz:1.7,badges:true,nums:true,layout:null,themes:[]};
const cloneJ=o=>JSON.parse(JSON.stringify(o));
let ED=(()=>{const s=ls(ED_KEY,{});return{...cloneJ(ED0),...s,light:{...(s.light||{})},dark:{...(s.dark||{})}}})();
const edSave=()=>ss(ED_KEY,ED);
// Polices proposées (Google Fonts). w = graisses chargées ; fb = polices de secours.
const FONTS_D=[{n:"Archivo",w:"500;700;800",fb:'"Arial Narrow",'+SYS},{n:"Barlow Condensed",w:"500;600;700",fb:'"Arial Narrow",'+SYS},{n:"Oswald",w:"500;600;700",fb:'"Arial Narrow",'+SYS},{n:"Bricolage Grotesque",w:"500;700;800",fb:SYS},{n:"Sora",w:"500;700;800",fb:SYS},{n:"Outfit",w:"500;700;800",fb:SYS},{n:"Manrope",w:"500;700;800",fb:SYS},{n:"Space Grotesk",w:"500;700",fb:SYS},{n:"Fraunces",w:"500;700;800",fb:"Georgia,serif"},{n:"DM Serif Display",w:"400",fb:"Georgia,serif"},{n:"Système",sys:1}];
const FONTS_B=[{n:"Source Sans 3",w:"400;500;600;700",fb:SYS},{n:"Inter",w:"400;500;600;700",fb:SYS},{n:"Lato",w:"400;700",fb:SYS},{n:"Nunito Sans",w:"400;600;700",fb:SYS},{n:"Open Sans",w:"400;600;700",fb:SYS},{n:"IBM Plex Sans",w:"400;500;600;700",fb:SYS},{n:"Merriweather",w:"400;700",fb:"Georgia,serif"},{n:"Système",sys:1}];
const fontsLoaded=new Set(["Archivo","Source Sans 3"]); // déjà chargées par la page
function loadFont(f){
  if(f.sys||fontsLoaded.has(f.n))return;fontsLoaded.add(f.n);
  const l=document.createElement("link");l.rel="stylesheet";l.href="https://fonts.googleapis.com/css2?family="+f.n.replace(/ /g,"+")+":wght@"+f.w+"&display=swap";document.head.appendChild(l);
}
const COLORS=[["--bg","Fond de page"],["--card","Fond des panneaux"],["--fg","Texte"],["--mut","Texte secondaire"],["--line","Bordures des cadres"],["--ctl","Fond des menus et boutons"],["--ctlline","Bordure des menus et boutons"],["--ac","Accent (boutons)"],["--acfg","Texte sur accent"],["--acsoft","Accent clair"],["--wall","Mur"],["--hole","Trous du mur"],["--start","Départ"],["--hand","Mains"],["--finish","Arrivée"],["--foot","Pieds"]];
const SECS=[["head","Titre de la page","full"],["bar","Réglages du bloc","full",1],["session","Séances et progression","full"],["drawer","Réglages avancés","full"],["result","Mur et bloc","full"],["seq","Déroulé","half"],["mount","Plan de montage","half"],["v3","Contrôle de faisabilité","full"],["favs","Blocs sauvegardés","full"],["notes","Notes et apprentissage","full"],["calib","Tableau de bord de calibration","full"],["bench","Benchmark","full"]];
const SHADOWS={none:"none",soft:"0 2px 10px rgba(0,0,0,.10)",strong:"0 6px 22px rgba(0,0,0,.25)",hard:"4px 4px 0 rgba(0,0,0,.35)"};
const effTheme=()=>document.documentElement.dataset.theme||(matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light");
const cvar=p=>getComputedStyle(document.documentElement).getPropertyValue(p).trim();
let appliedProps=[];
function edLayout(){ // liste complète et à jour des blocs (ajoute ceux qui manquent)
  const l=(ED.layout||[]).filter(x=>SECS.some(s=>s[0]===x.id));
  // un bloc ajouté par une nouvelle version se place après celui qui le précède dans SECS (et non en fin de page)
  SECS.forEach((s,i)=>{if(l.some(x=>x.id===s[0]))return;let j=-1;for(let k=i-1;k>=0&&j<0;k--)j=l.findIndex(x=>x.id===SECS[k][0]);l.splice(j+1,0,{id:s[0],hide:false,span:s[2]})});
  return l;
}
function layoutApply(){
  const page=document.getElementById("page");
  edLayout().forEach(x=>{const el=page.querySelector('[data-sec="'+x.id+'"]');if(!el)return;page.appendChild(el);el.hidden=!!x.hide&&x.id!=="bar";el.dataset.span=x.span});
  if(typeof syncMode==="function")syncMode();
  document.querySelectorAll("[data-showsec]").forEach(c=>{const x=edLayout().find(q=>q.id===c.dataset.showsec);c.checked=!(x&&x.hide)});
}
function edApply(){
  const st=document.documentElement.style;
  appliedProps.forEach(p=>st.removeProperty(p));appliedProps=[];
  const set=(p,v)=>{st.setProperty(p,v);appliedProps.push(p)};
  const o=ED[effTheme()]||{};for(const k in o)set(k,o[k]);
  set("--fs",ED.fs+"px");set("--bw",ED.bw+"px");set("--bs",ED.bs);set("--sh",SHADOWS[ED.sh]||"none");set("--stripe",ED.stripe+"px");set("--rc",ED.rc+"px");set("--cbw",ED.cbw+"px");set("--ch",ED.ch+"px");document.documentElement.dataset.btn=ED.btn;document.documentElement.dataset.sum=ED.sum;document.documentElement.dataset.chev=ED.chev;set("--sumpad",ED.sumpad+"px");set("--r",ED.r+"px");set("--sp",ED.gap+"px");set("--pad",ED.pad+"px");
  const fd=FONTS_D.find(f=>f.n===ED.fontD)||FONTS_D[0],fb=FONTS_B.find(f=>f.n===ED.fontB)||FONTS_B[0];
  loadFont(fd);loadFont(fb);
  set("--display",fd.sys?SYS:'"'+fd.n+'",'+fd.fb);set("--body",fb.sys?SYS:'"'+fb.n+'",'+fb.fb);
  layoutApply();
  if(typeof drawWall==="function"&&typeof cur!=="undefined")drawWall(cur);
}
// ----- panneau -----
let edTab="col";
const hexLum=h=>{const c=[1,3,5].map(i=>parseInt(h.slice(i,i+2),16)/255).map(v=>v<=.03928?v/12.92:Math.pow((v+.055)/1.055,2.4));return .2126*c[0]+.7152*c[1]+.0722*c[2]};
const ratio=(a,b)=>{const x=hexLum(a),y=hexLum(b);return (Math.max(x,y)+.05)/(Math.min(x,y)+.05)};
const slider=(id,label,min,max,step,val,unit)=>`<label class="ed-r" for="${id}"><div><span>${label}</span><b id="${id}v">${val}${unit}</b></div><input type="range" id="${id}" min="${min}" max="${max}" step="${step}" value="${val}"></label>`;
const BUILTIN=[
  {name:"Standard",ed:{light:{},dark:{},fontD:"Archivo",fontB:"Source Sans 3",fs:16,r:10,gap:14,pad:14,hz:1.7}},
  {name:"Contraste élevé",ed:{light:{"--bg":"#ffffff","--card":"#ffffff","--fg":"#000000","--mut":"#2b2b2b","--line":"#000000","--ac":"#0033cc","--acfg":"#ffffff","--acsoft":"#dbe4ff"},dark:{"--bg":"#000000","--card":"#0b0b0b","--fg":"#ffffff","--mut":"#d4d4d4","--line":"#ffffff","--ac":"#ffd400","--acfg":"#000000","--acsoft":"#3a3300"},fontD:"Archivo",fontB:"Source Sans 3",fs:18,r:6,gap:16,pad:16,hz:1.9}},
  {name:"Falaise",ed:{light:{"--bg":"#e6e8ea","--card":"#f6f7f8","--fg":"#1c1f22","--mut":"#585f66","--line":"#c9cdd1","--ac":"#c2410c","--acfg":"#ffffff","--acsoft":"#fde3d3","--wall":"#cfc4b3","--hole":"#9a8d79"},dark:{"--bg":"#17191b","--card":"#212427","--fg":"#eceff1","--mut":"#a0a8ae","--line":"#33383c","--ac":"#fb923c","--acfg":"#1a0d03","--acsoft":"#3b2412","--wall":"#4a4036","--hole":"#2a231c"},fontD:"Barlow Condensed",fontB:"Lato",fs:16,r:4,gap:12,pad:14,hz:1.7}}
];
function tabCol(){
  const t=effTheme(),o=ED[t]||{};
  const rows=COLORS.map(([p,l])=>{const v=o[p]||cvar(p);return `<label class="ed-c"><input type="color" data-c="${p}" value="${/^#[0-9a-f]{6}$/i.test(v)?v:"#000000"}" aria-label="${l}"><span>${l}</span>${o[p]?`<button data-cr="${p}" aria-label="Rétablir : ${l}" title="Rétablir la couleur d'origine">↺</button>`:""}</label>`}).join("");
  const ck=(a,b,l)=>{const x=ratio(cvar(a),cvar(b));return `<span class="${x>=4.5?"ok":"bad"}">${l} : ${x.toFixed(1)} ${x>=4.5?"lisible":"contraste faible"}</span>`};
  return `<p class="ed-note">Tu modifies le thème <b>${t==="dark"?"sombre":"clair"}</b>. Pour régler l'autre, change le thème ci-dessous.</p>
  <label class="f" for="edtheme"><span>Thème affiché</span><select id="edtheme">${optHtml([["auto","Automatique (celui de l'appareil)"],["light","Clair"],["dark","Sombre"]],CFG.theme)}</select></label>
  <div class="ed-grid">${rows}</div>
  <div class="ed-ct">${ck("--fg","--bg","Texte sur fond")}${ck("--fg","--card","Texte sur panneau")}${ck("--mut","--card","Texte secondaire")}${ck("--acfg","--ac","Texte sur bouton")}</div>
  <button id="edcolreset">Rétablir les couleurs de ce thème</button>`;
}
function tabFont(){
  return `<label class="f" for="edfd"><span>Titres</span><select id="edfd">${optHtml(FONTS_D.map(f=>[f.n,f.n]),ED.fontD)}</select></label>
  <label class="f" for="edfb"><span>Texte</span><select id="edfb">${optHtml(FONTS_B.map(f=>[f.n,f.n]),ED.fontB)}</select></label>
  ${slider("edfs","Taille du texte",14,20,1,ED.fs," px")}
  <div class="panel" style="padding:10px"><div style="font:700 1.3rem var(--display)">Générateur de blocs</div><p style="margin:4px 0 0">Aperçu : Départ main gauche sur n°26, main droite sur n°16. Prise « Pince à crêtes », 90°.</p></div>
  <p class="ed-note">Les polices viennent de Google Fonts. Sans connexion, la police de secours s'affiche.</p>`;
}
function tabShape(){
  return `${slider("edr","Arrondi des angles",0,24,1,ED.r," px")}${slider("edgap","Espace entre les blocs",6,32,2,ED.gap," px")}${slider("edpad","Marge intérieure des blocs",8,32,2,ED.pad," px")}
  <div class="row"><button data-dens="8,10,15">Compact</button><button data-dens="14,14,16">Normal</button><button data-dens="22,22,17">Aéré</button></div>`;
}
function tabFrame(){
  const o=(a,v)=>optHtml(a,v);
  return `<p class="ed-note">Cadres = les panneaux (Réglages, Mur, Notes…). Menus = les listes déroulantes, boutons et champs.</p>
  <h3 class="ed-h">Cadres</h3>
  ${slider("edbw","Épaisseur du contour",0,4,1,ED.bw," px")}
  <label class="f" for="edbs"><span>Style du contour</span><select id="edbs">${o([["solid","Trait plein"],["dashed","Tirets"],["dotted","Pointillés"],["double","Double trait"]],ED.bs)}</select></label>
  <label class="f" for="edsh"><span>Ombre</span><select id="edsh">${o([["none","Aucune"],["soft","Douce"],["strong","Marquée"],["hard","Décalée (style affiche)"]],ED.sh)}</select></label>
  ${slider("edstripe","Bandeau de couleur en haut des cadres",0,8,1,ED.stripe," px")}
  <h3 class="ed-h">Menus, boutons et champs</h3>
  <label class="f" for="edbtn"><span>Style des boutons</span><select id="edbtn">${o([["outline","Contour"],["soft","Fond doux"],["flat","Plat"],["solid","Plein"]],ED.btn)}</select></label>
  ${slider("edrc","Arrondi des menus et boutons",0,24,1,ED.rc," px")}
  ${slider("edcbw","Épaisseur du contour des menus",0,4,1,ED.cbw," px")}
  ${slider("edch","Hauteur des menus et boutons",34,56,2,ED.ch," px")}
  <div class="row"><button data-fp="sharp">Style anguleux</button><button data-fp="round">Style arrondi</button><button data-fp="poster">Style affiche</button><button data-fp="reset">Rétablir</button></div>
  <h3 class="ed-h">Panneaux déroulants (Réglages avancés, Contrôle…)</h3>
  <label class="f" for="edsum"><span>Style de l'en-tête</span><select id="edsum">${o([["plain","Simple"],["bar","Bandeau clair"],["solid","Bandeau plein (couleur d'accent)"],["line","Souligné"],["card","Bouton encadré"]],ED.sum)}</select></label>
  <label class="f" for="edchev"><span>Indicateur d'ouverture</span><select id="edchev">${o([["tri","Triangle ▸"],["chev","Chevron ›"],["plus","Plus / moins"],["none","Aucun"]],ED.chev)}</select></label>
  ${slider("edsumpad","Épaisseur de l'en-tête",0,16,2,ED.sumpad," px")}
  <p class="ed-note">Les couleurs des menus et des cadres se règlent dans Couleurs.</p>`;
}
function tabWall(){
  return `${slider("edhz","Taille des prises sur le mur",1,2.6,.1,ED.hz," ×")}
  <label class="sw"><input type="checkbox" id="edbadge"${ED.badges?" checked":""}><span>Pastilles d'ordre (D, 1, 2… A)</span></label>
  <label class="sw"><input type="checkbox" id="ednum"${ED.nums?" checked":""}><span>Numéro de chaque prise</span></label>
  <label class="sw"><input type="checkbox" id="edzoom"${CFG.zoom?" checked":""}><span>Agrandir les prises (désactivé : taille réelle)</span></label>
  <p class="ed-note">Les couleurs du mur, des trous et des contours Départ, Mains, Arrivée et Pieds se règlent dans Couleurs.</p>`;
}
function tabLay(){
  const l=edLayout();
  return `<p class="ed-note">Déplace, masque ou élargis chaque bloc. Le bloc « Réglages du bloc » reste toujours affiché, il contient le bouton Générer. Sur téléphone, tous les blocs sont pleine largeur.</p>
  <ul class="ed-lay">${l.map((x,i)=>{const s=SECS.find(q=>q[0]===x.id);return `<li data-id="${x.id}"><b>${s[1]}</b><button data-up="${i}" aria-label="Monter ${s[1]}"${i===0?" disabled":""}>Monter</button><button data-dn="${i}" aria-label="Descendre ${s[1]}"${i===l.length-1?" disabled":""}>Descendre</button>
  <select data-sp="${i}" aria-label="Largeur de ${s[1]}"><option value="full"${x.span==="full"?" selected":""}>Pleine largeur</option><option value="half"${x.span==="half"?" selected":""}>Demi-largeur</option></select>
  ${s[3]?"":`<label class="sw"><input type="checkbox" data-vis="${i}"${x.hide?"":" checked"}><span>Affiché</span></label>`}</li>`}).join("")}</ul>
  <button id="edlayreset">Rétablir la mise en page</button>`;
}
function tabThm(){
  const row=(t,i,b)=>`<li><b>${esc(t.name)}</b><span class="acts"><button data-ta="${b?"b":"u"}${i}">Appliquer</button>${b?"":`<button class="x" data-td="${i}" aria-label="Supprimer le thème ${esc(t.name)}">Supprimer</button>`}</span></li>`;
  return `<p class="ed-note">Ton affichage est déjà gardé automatiquement dans ce navigateur. Ici, tu peux en plus lui donner un nom pour le retrouver, le comparer ou le copier sur un autre appareil. Chaque sauvegarde mémorise les couleurs, polices, cadres, menus, la taille des prises et la mise en page.</p>
  <ul class="plist">${BUILTIN.map((t,i)=>row(t,i,1)).join("")}${ED.themes.map((t,i)=>row(t,i,0)).join("")}</ul>
  <div class="row"><label class="f" for="thname"><span>Nom du thème</span><input id="thname" type="text" maxlength="30" placeholder="Ex. Salle le soir"></label><button id="thsave">Enregistrer le thème actuel</button></div>
  <div class="row"><button id="thcopy">Copier le thème actuel</button><span class="ed-note" id="thmsg"></span></div>
  <label class="f" for="thimp"><span>Coller un thème copié</span><input id="thimp" type="text"></label><button id="thimpgo">Appliquer le thème collé</button>`;
}
function edSnapshot(){const s=cloneJ(ED);delete s.themes;return s}
function edTake(snap,keepLayout){
  const th=ED.themes,lay=ED.layout;ED={...cloneJ(ED0),...cloneJ(snap),themes:th};
  ED.light={...(ED.light||{})};ED.dark={...(ED.dark||{})};if(keepLayout&&snap.layout===undefined)ED.layout=lay;
  edSave();edApply();renderEd();
}
function renderEd(){
  const b=document.getElementById("edbody");
  b.innerHTML={col:tabCol,font:tabFont,shape:tabShape,frame:tabFrame,wall:tabWall,lay:tabLay,thm:tabThm}[edTab]();
  document.querySelectorAll("[data-et]").forEach(x=>x.setAttribute("aria-selected",String(x.dataset.et===edTab)));
  const sl=(id,key,fn)=>{const e=document.getElementById(id);if(!e)return;e.oninput=()=>{ED[key]=+e.value;document.getElementById(id+"v").textContent=e.value+(id==="edhz"?" ×":" px");edSave();edApply()}};
  if(edTab==="col"){
    const t=effTheme();
    b.querySelectorAll("[data-c]").forEach(i=>i.oninput=()=>{ED[t][i.dataset.c]=i.value;edSave();edApply()});
    b.querySelectorAll("[data-c]").forEach(i=>i.onchange=()=>renderEd());
    b.querySelectorAll("[data-cr]").forEach(x=>x.onclick=()=>{delete ED[t][x.dataset.cr];edSave();edApply();renderEd()});
    document.getElementById("edtheme").onchange=e=>{CFG.theme=e.target.value;saveCfg();applyTheme();renderEd()};
    document.getElementById("edcolreset").onclick=()=>{ED[t]={};edSave();edApply();renderEd()};
  }else if(edTab==="font"){
    document.getElementById("edfd").onchange=e=>{ED.fontD=e.target.value;edSave();edApply()};
    document.getElementById("edfb").onchange=e=>{ED.fontB=e.target.value;edSave();edApply()};
    sl("edfs","fs");
  }else if(edTab==="shape"){
    sl("edr","r");sl("edgap","gap");sl("edpad","pad");
    b.querySelectorAll("[data-dens]").forEach(x=>x.onclick=()=>{const [g,p,f]=x.dataset.dens.split(",").map(Number);ED.gap=g;ED.pad=p;ED.fs=f;edSave();edApply();renderEd()});
  }else if(edTab==="frame"){
    sl("edbw","bw");sl("edsumpad","sumpad");sl("edstripe","stripe");sl("edrc","rc");sl("edcbw","cbw");sl("edch","ch");
    [["edbs","bs"],["edsh","sh"],["edbtn","btn"],["edsum","sum"],["edchev","chev"]].forEach(([id,k])=>document.getElementById(id).onchange=e=>{ED[k]=e.target.value;edSave();edApply()});
    const P={sharp:{sum:"plain",chev:"tri",sumpad:6,r:2,rc:2,bw:1,bs:"solid",sh:"none",stripe:0,cbw:1,btn:"outline"},round:{r:18,rc:20,bw:1,bs:"solid",sh:"soft",stripe:0,cbw:1,btn:"soft"},poster:{r:4,rc:4,bw:3,bs:"solid",sh:"hard",stripe:6,cbw:2,btn:"solid"},reset:{sum:"plain",chev:"tri",sumpad:6,r:10,rc:8,bw:1,bs:"solid",sh:"none",stripe:0,cbw:1,btn:"outline",ch:40}};
    b.querySelectorAll("[data-fp]").forEach(x=>x.onclick=()=>{Object.assign(ED,P[x.dataset.fp]);edSave();edApply();renderEd()});
  }else if(edTab==="wall"){
    sl("edhz","hz");
    document.getElementById("edbadge").onchange=e=>{ED.badges=e.target.checked;edSave();edApply()};
    document.getElementById("ednum").onchange=e=>{ED.nums=e.target.checked;edSave();edApply()};
    document.getElementById("edzoom").onchange=e=>{CFG.zoom=e.target.checked;saveCfg();edApply()};
  }else if(edTab==="lay"){
    const mv=(i,d)=>{const l=edLayout(),j=i+d;if(j<0||j>=l.length)return;[l[i],l[j]]=[l[j],l[i]];ED.layout=l;edSave();layoutApply();renderEd()};
    b.querySelectorAll("[data-up]").forEach(x=>x.onclick=()=>mv(+x.dataset.up,-1));
    b.querySelectorAll("[data-dn]").forEach(x=>x.onclick=()=>mv(+x.dataset.dn,1));
    b.querySelectorAll("[data-sp]").forEach(x=>x.onchange=()=>{const l=edLayout();l[+x.dataset.sp].span=x.value;ED.layout=l;edSave();layoutApply()});
    b.querySelectorAll("[data-vis]").forEach(x=>x.onchange=()=>{const l=edLayout();l[+x.dataset.vis].hide=!x.checked;ED.layout=l;edSave();layoutApply()});
    b.querySelectorAll(".ed-lay li").forEach(li=>{li.onmouseenter=li.onfocusin=()=>{const e=document.querySelector('[data-sec="'+li.dataset.id+'"]');if(e&&!e.hidden)e.classList.add("ed-hl")};li.onmouseleave=li.onfocusout=()=>document.querySelectorAll(".ed-hl").forEach(e=>e.classList.remove("ed-hl"))});
    document.getElementById("edlayreset").onclick=()=>{ED.layout=null;edSave();layoutApply();renderEd()};
  }else{
    b.querySelectorAll("[data-ta]").forEach(x=>x.onclick=()=>{const k=x.dataset.ta,t=k[0]==="b"?BUILTIN[+k.slice(1)]:ED.themes[+k.slice(1)];if(t)edTake(t.ed,true)});
    b.querySelectorAll("[data-td]").forEach(x=>x.onclick=()=>{ED.themes.splice(+x.dataset.td,1);edSave();renderEd()});
    document.getElementById("thsave").onclick=()=>{const n=document.getElementById("thname").value.trim()||"Thème "+(ED.themes.length+1);ED.themes=ED.themes.filter(t=>t.name!==n);ED.themes.push({name:n,ed:edSnapshot()});edSave();renderEd()};
    document.getElementById("thcopy").onclick=()=>{const txt=JSON.stringify(edSnapshot()),m=document.getElementById("thmsg");
      (navigator.clipboard?navigator.clipboard.writeText(txt):Promise.reject()).then(()=>m.textContent="Thème copié.",()=>{const i=document.getElementById("thimp");i.value=txt;i.select();m.textContent="Copie impossible ici : le texte est dans le champ ci-dessous, copie-le à la main."})};
    document.getElementById("thimpgo").onclick=()=>{try{const v=JSON.parse(document.getElementById("thimp").value);if(!v||typeof v!=="object"||Array.isArray(v))throw 0;edTake(v,true)}catch(e){document.getElementById("thmsg").textContent="Ce texte n'est pas un thème valide."}};
  }
}
function edOpen(open){
  const p=document.getElementById("editor"),f=document.getElementById("edopen");
  p.hidden=!open;f.hidden=open;document.body.classList.toggle("ed-open",open);
  if(open){renderEd();document.getElementById("edclose").focus()}else f.focus();
}
function edInit(){bindShowSec();
  document.getElementById("edopen").onclick=()=>edOpen(true);
  document.getElementById("edclose").onclick=()=>edOpen(false);
  const sb=document.getElementById("edsavebtn");if(sb)sb.onclick=()=>{edTab="thm";renderEd();const n=document.getElementById("thname");if(n)n.focus()};
  document.querySelectorAll("[data-et]").forEach(b=>b.onclick=()=>{edTab=b.dataset.et;renderEd()});
  document.addEventListener("keydown",e=>{if(e.key==="Escape"&&!document.getElementById("editor").hidden)edOpen(false)});
  matchMedia("(prefers-color-scheme: dark)").addEventListener("change",()=>{edApply();if(!document.getElementById("editor").hidden&&edTab==="col")renderEd()});
  edApply();
}

// Interrupteurs rapides sous le mur : cacher le déroulé et le plan de montage (pour ne pas révéler la méthode aux grimpeurs).
function bindShowSec(){
  document.querySelectorAll("[data-mode]").forEach(b=>b.onclick=()=>setClimber(b.dataset.mode==="climb"));
  document.querySelectorAll("[data-showsec]").forEach(c=>c.onchange=()=>{
    const l=edLayout();l.find(q=>q.id===c.dataset.showsec).hide=!c.checked;ED.layout=l;edSave();layoutApply();
    if(!document.getElementById("editor").hidden)renderEd();
  });
}

// Mode grimpeur = déroulé, plan de montage et contrôle masqués. Mode ouverture = tout visible + option multi-blocs.
const isClimber=()=>["seq","mount"].every(i=>{const q=edLayout().find(z=>z.id===i);return q&&q.hide});
function setClimber(on){
  const l=edLayout();l.forEach(x=>{if(x.id==="seq"||x.id==="mount"||x.id==="v3"||x.id==="bench")x.hide=on});
  ED.layout=l;edSave();layoutApply();if(!document.getElementById("editor").hidden)renderEd();
}
function syncMode(){
  const c=isClimber();
  document.querySelectorAll("[data-mode]").forEach(b=>b.setAttribute("aria-pressed",String((b.dataset.mode==="climb")===c)));
  const ob=document.getElementById("openbar");if(ob)ob.hidden=c;
}
