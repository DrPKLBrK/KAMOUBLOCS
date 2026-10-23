// OUVERTURE : plusieurs blocs sur le même mur. Une prise cochée « posée » dans le plan de montage est mémorisée ;
// quand l'option est active, les générations suivantes ne l'utilisent plus (ni son trou).
const posedMap=()=>ls(KEY.posed,{});             // { n° de prise : {hid : trou, rho} }
const savePosed=m=>ss(KEY.posed,m);
function setPosed(n,hid,rho,on){
  const m=posedMap();if(on)m[n]={hid,rho};else delete m[n];savePosed(m);syncOpen();
}
function syncOpen(){
  const m=posedMap(),k=Object.keys(m).sort((a,b)=>a-b),chk=$("multi");
  if(chk)chk.checked=!!CFG.multi;
  const i=$("posedinfo");
  if(i)i.textContent=!CFG.multi?"":k.length?k.length+" prise"+(k.length>1?"s":"")+" posée"+(k.length>1?"s":"")+" sur le mur (n° "+k.join(", ")+")":"Aucune prise posée pour l'instant : coche les prises dans le plan de montage au fur et à mesure.";
  const r=$("posedreset");if(r){r.hidden=!CFG.multi||!k.length;if(!r.dataset.arm)r.textContent="Tout démonter"}
}
// Prises posées par les blocs précédents : dessinées en fantôme sur le mur (sauf celles du bloc affiché).
function ghostSVG(r,Y){
  if(!CFG.multi||(typeof isClimber==="function"&&isClimber()))return"";
  const m=posedMap(),here=new Set(r?[...r.hands,...r.feet].map(x=>x.n):[]);let s="";
  for(const n in m){
    if(here.has(+n))continue;const h=byN(+n),o=holes[m[n].hid],I=IMG[n];if(!h||!o||!I)continue;
    const k=zoomK()*Math.max(h.w,h.h)/Math.max(I[0],I[1]),w=I[0]*k,hh=I[1]*k,cy=Y(o.y);
    s+=`<image href="${imgSrc(+n)}" x="${f1(o.x-I[2]*w)}" y="${f1(cy-I[3]*hh)}" width="${f1(w)}" height="${f1(hh)}" transform="rotate(${-(m[n].rho||0)} ${o.x} ${cy})" opacity=".45"/>`;
  }
  return s;
}
function bindOpening(){
  const chk=$("multi");if(!chk)return;
  chk.onchange=()=>{CFG.multi=chk.checked;saveCfg();syncOpen();drawWall(cur)};
  const r=$("posedreset");
  r.onclick=()=>{
    if(!r.dataset.arm){r.dataset.arm=1;r.textContent="Confirmer : tout démonter";setTimeout(()=>{delete r.dataset.arm;syncOpen()},4000);return}
    delete r.dataset.arm;savePosed({});document.querySelectorAll("#mont input").forEach(i=>i.checked=false);updProg();syncOpen();drawWall(cur);
  };
  syncOpen();
}
