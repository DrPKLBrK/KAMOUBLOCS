// CUSTOM : prises ajoutées par l'utilisateur (photo importée) + sauvegarde / restauration de tous les réglages.
// Les prises ajoutées sont gardées dans le navigateur (photo réduite) et numérotées à partir de 42.
const FAMN={dish:"Plat ou bac",circ:"Rond",drop:"Goutte",arc:"Réglette courbe",tri:"Pince ou triangle",bar:"Barre",horn:"Corne",facet:"Facettes"};
let CUST=ls(KEY.custom,[]);
// Stockage bloqué (aperçu intégré, mode privé, fichier ouvert depuis une messagerie) : les prises ajoutées restent en mémoire pour la session seulement.
let MEMONLY=false;
const storageOK=()=>{try{localStorage.setItem("__t","1");localStorage.removeItem("__t");return true}catch(e){return false}};
const saveCust=()=>{try{localStorage.setItem(KEY.custom,JSON.stringify(CUST));return true}catch(e){if(!storageOK()){MEMONLY=true;return true}return false}};
const memWarn=()=>MEMONLY?" Attention : le stockage du navigateur est bloqué ici (aperçu intégré ou mode privé) : ces prises disparaîtront quand tu fermeras ou rechargeras la page. Ouvre le fichier directement dans Chrome ou Safari pour les conserver.":"";
function addCustomToHolds(c){
  if(byN(c.n))return;
  const g=ls(KEY.grips,{}),nm=ls(KEY.names,{}),on=ls(KEY.on,{});
  holds.push({n:c.n,type:nm[c.n]||c.type,grip:g[c.n]||c.grip,col:c.col,fam:c.fam,w:c.w,h:c.h,rot:0,on:on[c.n]!==false,slo:!!c.slo,crimp:c.fam==="arc"||c.fam==="bar",type0:c.type,grip0:c.grip,custom:1,img:c.img});
  IMG[c.n]=[c.iw,c.ih,c.hx,c.hy];
}
CUST.forEach(addCustomToHolds);
// Adresse de l'image d'une prise (fichier du projet, ou photo importée)
const imgSrc=n=>{const h=byN(n);return h&&h.custom?h.img:`prises/${String(n).padStart(2,"0")}.png`};

// ---------- Détourage dans le navigateur ----------
let CF={src:null,w:0,h:0,tol:40,hx:.5,hy:.5,keep:false}; // état du formulaire
function cfRender(){
  const cv=$("cfcv");if(!cv||!CF.src)return;
  const w=CF.src.width,h=CF.src.height;cv.width=w;cv.height=h;
  const x=cv.getContext("2d");x.clearRect(0,0,w,h);x.drawImage(CF.src,0,0);
  if(!CF.keep){
    const id=x.getImageData(0,0,w,h),d=id.data,vis=new Uint8Array(w*h);
    // couleur de fond = moyenne des pixels des bords
    let r=0,g=0,b=0,n=0;const add=(i)=>{r+=d[i*4];g+=d[i*4+1];b+=d[i*4+2];n++};
    for(let i=0;i<w;i++){add(i);add((h-1)*w+i)}for(let j=0;j<h;j++){add(j*w);add(j*w+w-1)}
    r/=n;g/=n;b/=n;const T=CF.tol*CF.tol*3,q=[];
    const near=i=>{const dr=d[i*4]-r,dg=d[i*4+1]-g,db=d[i*4+2]-b;return dr*dr+dg*dg+db*db<=T};
    const push=i=>{if(!vis[i]&&near(i)){vis[i]=1;q.push(i)}};
    for(let i=0;i<w;i++){push(i);push((h-1)*w+i)}for(let j=0;j<h;j++){push(j*w);push(j*w+w-1)}
    while(q.length){const i=q.pop(),px=i%w,py=(i/w)|0;if(px>0)push(i-1);if(px<w-1)push(i+1);if(py>0)push(i-w);if(py<h-1)push(i+w)}
    for(let i=0;i<w*h;i++)if(vis[i])d[i*4+3]=0;
    // adoucit le bord : un pixel opaque voisin du fond devient à moitié transparent
    const a=new Uint8Array(w*h);for(let i=0;i<w*h;i++)a[i]=d[i*4+3];
    for(let j=1;j<h-1;j++)for(let i=1;i<w-1;i++){const k=j*w+i;if(a[k]&&(!a[k-1]||!a[k+1]||!a[k-w]||!a[k+w]))d[k*4+3]=110}
    x.putImageData(id,0,0);
  }
  // marque du trou de vis
  x.save();x.strokeStyle="#e11d48";x.lineWidth=Math.max(2,w/80);const px=CF.hx*w,py=CF.hy*h,s=Math.max(8,w/22);
  x.beginPath();x.arc(px,py,s,0,7);x.moveTo(px-s*1.6,py);x.lineTo(px+s*1.6,py);x.moveTo(px,py-s*1.6);x.lineTo(px,py+s*1.6);x.stroke();x.restore();
}
function cfLoad(file){
  const msg=$("cfmsg");
  if(!file)return;
  if(!/^image\//.test(file.type)){msg.textContent="Ce fichier n'est pas une image.";return}
  const url=URL.createObjectURL(file),im=new Image();
  im.onload=()=>{
    const k=Math.min(1,300/Math.max(im.width,im.height)),c=document.createElement("canvas");
    c.width=Math.round(im.width*k);c.height=Math.round(im.height*k);c.getContext("2d").drawImage(im,0,0,c.width,c.height);
    URL.revokeObjectURL(url);CF.src=c;CF.hx=.5;CF.hy=.5;$("cfzone").hidden=false;msg.textContent="Clique sur la photo pour placer le trou de vis.";cfRender();
  };
  im.onerror=()=>{msg.textContent="Impossible de lire cette image."};im.src=url;
}
function cfAdd(){
  const msg=$("cfmsg");if(!CF.src){msg.textContent="Choisis d'abord une photo.";return}
  // image finale : sans la marque de visée, recadrée sur la prise
  const w=CF.src.width,h=CF.src.height,tmp=document.createElement("canvas");tmp.width=w;tmp.height=h;
  const keep=CF.keep;const old=$("cfcv");
  // on redessine sans la croix
  const x=tmp.getContext("2d");x.drawImage(CF.src,0,0);
  if(!keep){const sv={hx:CF.hx,hy:CF.hy};CF.hx=-999;CF.hy=-999;cfRender();x.clearRect(0,0,w,h);x.drawImage(old,0,0);CF.hx=sv.hx;CF.hy=sv.hy;cfRender()}
  const d=x.getImageData(0,0,w,h).data;let x0=w,y0=h,x1=0,y1=0;
  for(let j=0;j<h;j++)for(let i=0;i<w;i++)if(d[(j*w+i)*4+3]>40){if(i<x0)x0=i;if(i>x1)x1=i;if(j<y0)y0=j;if(j>y1)y1=j}
  if(x1<=x0||y1<=y0){msg.textContent="Le détourage a tout effacé : baisse la tolérance.";return}
  const cw=x1-x0+1,ch=y1-y0+1,out=document.createElement("canvas");out.width=cw;out.height=ch;out.getContext("2d").drawImage(tmp,x0,y0,cw,ch,0,0,cw,ch);
  const hx=clamp((CF.hx*w-x0)/cw,0,1),hy=clamp((CF.hy*h-y0)/ch,0,1);
  const size=+$("cfsz").value||10,asp=cw/ch,W=asp>=1?size:size*asp,H=asp>=1?size/asp:size;
  // couleur dominante pour le contour de secours
  const n=Math.max(0,...holds.map(q=>q.n),0)+1;
  const c={n,type:($("cfnm").value.trim()||"Prise "+n).slice(0,40),grip:+$("cfgp").value,fam:$("cffam").value,w:Math.round(W*10)/10,h:Math.round(H*10)/10,col:"#888888",slo:$("cfslo").checked,img:out.toDataURL("image/png"),iw:cw,ih:ch,hx:Math.round(hx*1000)/1000,hy:Math.round(hy*1000)/1000};
  CUST.push(c);
  if(!saveCust()){CUST.pop();msg.textContent="Mémoire du navigateur pleine : supprime une prise ajoutée ou utilise une photo plus petite.";return}
  addCustomToHolds(c);return n;
}

// ---------- Ajout en lot : plusieurs photos, un tableau de réglages ----------
let BT=[],BTID=0,BTOL=40;
const BT_MAX=60,BT_PX=256;
// Retire le fond d'une photo (même méthode que le formulaire simple : fond = moyenne des bords, remplissage depuis les bords) et recadre sur la prise.
function btCutout(src,tol,keep){
  const w=src.width,h=src.height,c=document.createElement("canvas");c.width=w;c.height=h;const x=c.getContext("2d");x.drawImage(src,0,0);
  if(!keep){
    const id=x.getImageData(0,0,w,h),d=id.data,vis=new Uint8Array(w*h);
    let r=0,g=0,b=0,n=0;const add=i=>{r+=d[i*4];g+=d[i*4+1];b+=d[i*4+2];n++};
    for(let i=0;i<w;i++){add(i);add((h-1)*w+i)}for(let j=0;j<h;j++){add(j*w);add(j*w+w-1)}
    r/=n;g/=n;b/=n;const T=tol*tol*3,q=[];
    const near=i=>{const dr=d[i*4]-r,dg=d[i*4+1]-g,db=d[i*4+2]-b;return dr*dr+dg*dg+db*db<=T};
    const push=i=>{if(!vis[i]&&near(i)){vis[i]=1;q.push(i)}};
    for(let i=0;i<w;i++){push(i);push((h-1)*w+i)}for(let j=0;j<h;j++){push(j*w);push(j*w+w-1)}
    while(q.length){const i=q.pop(),px=i%w,py=(i/w)|0;if(px>0)push(i-1);if(px<w-1)push(i+1);if(py>0)push(i-w);if(py<h-1)push(i+w)}
    for(let i=0;i<w*h;i++)if(vis[i])d[i*4+3]=0;
    const a=new Uint8Array(w*h);for(let i=0;i<w*h;i++)a[i]=d[i*4+3];
    for(let j=1;j<h-1;j++)for(let i=1;i<w-1;i++){const k=j*w+i;if(a[k]&&(!a[k-1]||!a[k+1]||!a[k-w]||!a[k+w]))d[k*4+3]=110}
    x.putImageData(id,0,0);
  }
  const d2=x.getImageData(0,0,w,h).data;let x0=w,y0=h,x1=0,y1=0;
  for(let j=0;j<h;j++)for(let i=0;i<w;i++)if(d2[(j*w+i)*4+3]>40){if(i<x0)x0=i;if(i>x1)x1=i;if(j<y0)y0=j;if(j>y1)y1=j}
  if(x1<=x0||y1<=y0)return null;
  const cw=x1-x0+1,ch=y1-y0+1,o=document.createElement("canvas");o.width=cw;o.height=ch;o.getContext("2d").drawImage(c,x0,y0,cw,ch,0,0,cw,ch);return o;
}
function btLoadFile(file){
  return new Promise(res=>{
    if(!/^image\//.test(file.type))return res(null);
    const url=URL.createObjectURL(file),im=new Image();
    im.onload=()=>{const k=Math.min(1,BT_PX/Math.max(im.width,im.height)),c=document.createElement("canvas");c.width=Math.max(8,Math.round(im.width*k));c.height=Math.max(8,Math.round(im.height*k));c.getContext("2d").drawImage(im,0,0,c.width,c.height);URL.revokeObjectURL(url);res(c)};
    im.onerror=()=>{URL.revokeObjectURL(url);res(null)};im.src=url;
  });
}
const btMem=()=>{let n=0;try{for(let i=0;i<localStorage.length;i++){const k=localStorage.key(i);n+=k.length+(localStorage.getItem(k)||"").length}}catch(e){}return n}; // caractères (le navigateur compte ~5 millions)
function btRecut(row){const cut=btCutout(row.src,BTOL,row.keep);row.cut=cut}
function btDrawThumb(row){
  const cv=document.querySelector(`canvas[data-bt="${row.id}"]`);if(!cv)return;
  const c=row.cut;if(!c){cv.width=96;cv.height=96;const x=cv.getContext("2d");x.clearRect(0,0,96,96);x.fillStyle="#b91c1c";x.font="12px system-ui";x.fillText("fond effacé",8,50);return}
  const k=Math.min(96/c.width,96/c.height);cv.width=Math.max(8,Math.round(c.width*k));cv.height=Math.max(8,Math.round(c.height*k));
  const x=cv.getContext("2d");x.clearRect(0,0,cv.width,cv.height);x.drawImage(c,0,0,cv.width,cv.height);
  x.strokeStyle="#e11d48";x.lineWidth=2;const px=row.hx*cv.width,py=row.hy*cv.height;x.beginPath();x.arc(px,py,6,0,7);x.moveTo(px-10,py);x.lineTo(px+10,py);x.moveTo(px,py-10);x.lineTo(px,py+10);x.stroke();
}
function btRows(){
  const d=$("btrows");if(!d)return;
  d.innerHTML=BT.map(r=>`<div class="btrow" data-id="${r.id}"><canvas data-bt="${r.id}" class="btth" title="Clique pour placer le trou de vis" aria-label="Aperçu de ${esc(r.name)} : clique pour placer le trou de vis"></canvas>
    <div class="btf"><label class="f"><span>Nom</span><input type="text" data-f="name" maxlength="40" value="${esc(r.name)}"></label>
    <label class="f"><span>Forme</span><select data-f="fam">${Object.entries(FAMN).map(([k,v])=>`<option value="${k}"${r.fam===k?" selected":""}>${v}</option>`).join("")}</select></label>
    <label class="f"><span>Tenue (1-5)</span><select data-f="grip">${[1,2,3,4,5].map(v=>`<option${v===r.grip?" selected":""}>${v}</option>`).join("")}</select></label>
    <label class="f"><span>Taille réelle (cm)</span><input type="number" data-f="size" min="3" max="40" step="0.5" value="${r.size}"></label>
    <label class="sw"><input type="checkbox" data-f="slo"${r.slo?" checked":""}><span>Sloper</span></label>
    <label class="sw"><input type="checkbox" data-f="keep"${r.keep?" checked":""}><span>Déjà détourée</span></label>
    <button data-del="${r.id}" aria-label="Retirer ${esc(r.name)} du lot">Retirer</button></div></div>`).join("");
  BT.forEach(btDrawThumb);
  d.querySelectorAll(".btrow").forEach(el=>{
    const row=BT.find(x=>x.id===+el.dataset.id);
    el.querySelectorAll("[data-f]").forEach(inp=>{inp.onchange=inp.oninput=()=>{const f=inp.dataset.f;
      if(f==="slo"||f==="keep"){row[f]=inp.checked;if(f==="keep"){btRecut(row);btDrawThumb(row)}}
      else if(f==="size")row.size=+inp.value||10;else if(f==="grip")row.grip=+inp.value;else row[f]=inp.value}});
    const cv=el.querySelector("canvas");cv.onclick=e=>{const r=cv.getBoundingClientRect();row.hx=clamp((e.clientX-r.left)/r.width,0,1);row.hy=clamp((e.clientY-r.top)/r.height,0,1);btDrawThumb(row)};
    el.querySelector("[data-del]").onclick=()=>{BT=BT.filter(x=>x!==row);btRows();btStatus()};
  });
}
function btStatus(msg){
  const m=$("btmsg");if(!m)return;
  const mem=btMem(),pc=Math.min(100,Math.round(mem/50000));
  m.textContent=(msg?msg+" ":"")+(BT.length?BT.length+" prise"+(BT.length>1?"s":"")+" dans le lot. ":"")+(MEMONLY?"":"Mémoire du navigateur utilisée : environ "+pc+" % (estimation).")+memWarn();
  const b=$("btadd");if(b)b.disabled=!BT.length;
}
// Ajoute toutes les prises du lot ; s'arrête proprement si la mémoire est pleine.
function btAddAll(after){
  let ok=0;const rest=[];
  for(const r of BT){
    if(!r.cut){rest.push(r);continue}
    const cw=r.cut.width,ch=r.cut.height,asp=cw/ch,W=asp>=1?r.size:r.size*asp,H=asp>=1?r.size/asp:r.size;
    const n=Math.max(0,...holds.map(q=>q.n),0)+1;
    const c={n,type:(r.name.trim()||"Prise "+n).slice(0,40),grip:r.grip,fam:r.fam,w:Math.round(W*10)/10,h:Math.round(H*10)/10,col:"#888888",slo:!!r.slo,img:r.cut.toDataURL("image/png"),iw:cw,ih:ch,hx:r.hx,hy:r.hy};
    CUST.push(c);
    if(!saveCust()){CUST.pop();rest.push(r);continue}
    addCustomToHolds(c);ok++;
  }
  BT=rest;btRows();
  const bad=rest.length;
  btStatus(ok+" prise"+(ok>1?"s":"")+" ajoutée"+(ok>1?"s":"")+(bad?" ; "+bad+" non ajoutée"+(bad>1?"s":"")+" (fond effacé ou mémoire pleine : retire des prises ajoutées ou utilise des photos plus petites)":"")+".");
  if(ok&&after)after(ok,bad);
  return ok;
}
const batchFormHtml=()=>`<details class="cfdet" id="btdet"><summary><b>Ajouter plusieurs prises d'un coup (photos)</b></summary>
<p class="mut">Choisis plusieurs photos (jusqu'à ${BT_MAX}). Le fond est retiré automatiquement. Pour chaque prise, règle la forme, la tenue et la taille réelle dans le tableau, clique sur l'aperçu pour placer le trou de vis (au centre par défaut), puis ajoute tout le lot.</p>
<label class="f" for="btfile"><span>Photos des prises</span><input id="btfile" type="file" accept="image/*" multiple></label>
<label class="f" for="bttol"><span>Sensibilité du retrait du fond (toutes les photos) : <b id="bttolv">${BTOL}</b></span><input type="range" id="bttol" min="5" max="120" value="${BTOL}"></label>
<div id="btrows" class="btrows"></div>
<div class="row"><button class="pri" id="btadd" disabled>Ajouter toutes les prises du lot</button><button id="btclear">Vider le lot</button></div>
<p class="mut" id="btmsg" role="status"></p></details>`;
function bindBatch(after){
  const f=$("btfile");if(!f)return;
  if(!document.getElementById("btstyle")){const st=document.createElement("style");st.id="btstyle";st.textContent=".btrows{display:flex;flex-direction:column;gap:8px;margin:8px 0}.btrow{display:flex;gap:10px;align-items:flex-start;border:1px solid var(--line);border-radius:10px;padding:8px}.btth{flex:none;width:96px;max-height:96px;cursor:crosshair;background:repeating-conic-gradient(#0000000d 0 25%,#0000 0 50%) 0 0/12px 12px;border-radius:6px}.btf input[type=text],.btf input[type=number],.btf select{width:100%;min-width:0;box-sizing:border-box}.btf{flex:1;min-width:0;display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:6px 10px;align-items:end}@media(max-width:560px){.btrow{flex-direction:column}}";document.head.appendChild(st)}
  btRows();btStatus();
  f.onchange=async()=>{
    const files=[...f.files].slice(0,Math.max(0,BT_MAX-BT.length));let bad=0;
    $("btmsg").textContent="Traitement des photos…";
    for(const file of files){
      const src=await btLoadFile(file);if(!src){bad++;continue}
      const row={id:++BTID,name:(file.name||"Prise").replace(/\.[^.]+$/,"").slice(0,40),src,hx:.5,hy:.5,fam:"dish",grip:3,size:10,slo:false,keep:false,cut:null};
      btRecut(row);BT.push(row);
    }
    f.value="";btRows();btStatus(bad?bad+" fichier"+(bad>1?"s":"")+" ignoré"+(bad>1?"s":"")+" (pas une image).":"");
  };
  $("bttol").oninput=e=>{BTOL=+e.target.value;$("bttolv").textContent=BTOL;BT.forEach(r=>{if(!r.keep)btRecut(r)});BT.forEach(btDrawThumb)};
  $("btadd").onclick=()=>btAddAll(after?()=>{const m=$("btmsg").textContent;after();const d=$("btdet");if(d){d.open=true;$("btmsg").textContent=m}}:null);
  $("btclear").onclick=()=>{BT=[];btRows();btStatus()};
}
const customFormHtml=()=>`<details class="cfdet"><summary><b>Ajouter une nouvelle prise (photo)</b></summary>
<p class="mut">Prends la prise en photo sur un fond uni (mur, feuille, table) avec le trou de vis bien visible. Le fond est retiré automatiquement. Pour un détourage parfait, tu peux aussi importer une image PNG déjà détourée.</p>
<label class="f" for="cffile"><span>Photo de la prise</span><input id="cffile" type="file" accept="image/*"></label>
<div id="cfzone" hidden>
  <div class="cfprev"><canvas id="cfcv" aria-label="Aperçu : clique pour placer le trou de vis"></canvas></div>
  <label class="sw"><input type="checkbox" id="cfkeep"><span>L'image est déjà détourée (ne pas retirer le fond)</span></label>
  <label class="f" for="cftol"><span>Sensibilité du retrait du fond : <b id="cftolv">40</b></span><input type="range" id="cftol" min="5" max="120" value="40"></label>
  <div class="row"><label class="f" for="cfnm"><span>Nom</span><input id="cfnm" type="text" maxlength="40" placeholder="Ex. Pince rouge"></label>
  <label class="f" for="cfgp"><span>Tenue (1 facile, 5 dur)</span><select id="cfgp">${[1,2,3,4,5].map(v=>`<option${v===3?" selected":""}>${v}</option>`).join("")}</select></label>
  <label class="f" for="cffam"><span>Forme</span><select id="cffam">${Object.entries(FAMN).map(([k,v])=>`<option value="${k}">${v}</option>`).join("")}</select></label>
  <label class="f" for="cfsz"><span>Taille réelle, plus grande dimension (cm)</span><input id="cfsz" type="number" min="3" max="40" step="0.5" value="10"></label></div>
  <label class="sw"><input type="checkbox" id="cfslo"><span>Prise arrondie sans bord franc (sloper)</span></label>
  <button class="pri" id="cfadd">Ajouter cette prise</button>
</div><p class="mut" id="cfmsg" role="status"></p></details>${batchFormHtml()}`;
function bindCustomForm(after){
  bindBatch(after);
  const f=$("cffile");if(!f)return;
  f.onchange=()=>cfLoad(f.files[0]);
  $("cfkeep").onchange=e=>{CF.keep=e.target.checked;cfRender()};
  $("cftol").oninput=e=>{CF.tol=+e.target.value;$("cftolv").textContent=e.target.value;cfRender()};
  const cv=$("cfcv");cv.onclick=e=>{const r=cv.getBoundingClientRect();CF.hx=clamp((e.clientX-r.left)/r.width,0,1);CF.hy=clamp((e.clientY-r.top)/r.height,0,1);cfRender()};
  $("cfadd").onclick=()=>{const n=cfAdd();if(n){$("cfmsg").textContent="Prise n°"+n+" ajoutée. Elle est active et sera utilisée par le générateur."+memWarn();CF.src=null;$("cfzone").hidden=true;f.value="";after&&after()}};
}
const delCustom=n=>{CUST=CUST.filter(c=>c.n!==n);saveCust();const i=holds.findIndex(h=>h.n===n);if(i>=0)holds.splice(i,1);delete IMG[n]};

// ---------- Sauvegarde et restauration de tout ----------
function backupAll(){const o={};try{for(let i=0;i<localStorage.length;i++){const k=localStorage.key(i);o[k]=localStorage.getItem(k)}}catch(e){}return JSON.stringify({app:"generateur-blocs",v:1,data:o})}
function restoreAll(t){
  let o;try{o=JSON.parse(t)}catch(e){return"Ce texte n'est pas une sauvegarde valide."}
  if(!o||o.app!=="generateur-blocs"||!o.data)return"Ce texte n'est pas une sauvegarde de ce générateur.";
  try{Object.entries(o.data).forEach(([k,v])=>localStorage.setItem(k,v))}catch(e){return"Mémoire du navigateur pleine."}
  return"";
}
const backupHtml=()=>`<h4>Sauvegarde complète</h4><p class="mut">Garde une copie de tout : affichage, thèmes, prises ajoutées, réglages, notes. Utile pour changer d'appareil ou si le navigateur efface ses données.</p>
<div class="row"><button id="bkcopy">Copier la sauvegarde</button><span class="mut" id="bkmsg" role="status"></span></div>
<label class="f" for="bkpaste"><span>Coller une sauvegarde pour la restaurer</span><input id="bkpaste" type="text"></label><button id="bkgo">Restaurer cette sauvegarde</button>`;
function bindBackup(){
  const m=$("bkmsg");if(!m)return;
  $("bkcopy").onclick=async()=>{const t=backupAll();try{await navigator.clipboard.writeText(t);m.textContent="Sauvegarde copiée ("+Math.round(t.length/1024)+" Ko). Colle-la dans un fichier ou un message à toi-même."}catch(e){$("bkpaste").value=t;$("bkpaste").select();m.textContent="Copie automatique refusée : le texte est dans le champ ci-dessous, copie-le à la main."}};
  $("bkgo").onclick=()=>{const e=restoreAll($("bkpaste").value.trim());if(e){m.textContent=e;return}m.textContent="Sauvegarde restaurée, rechargement…";setTimeout(()=>location.reload(),600)};
}
