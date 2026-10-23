// RENDER : dessin du mur et des prises (SVG). Ne contient aucune logique de génération.
const f1=v=>v.toFixed(1);
// Les prises sont dessinées à l'échelle réelle ; la case « Agrandir » les grossit pour la lisibilité (affichage seulement).
let wallView='all'; // 'all' ou l'identifiant d'un pan
// Fenêtre du dessin : tout le mur, ou un seul pan.
function vbFor(v){
  const H=WALL.HM+17,ps=WALL.panels;
  if(v==='all'||!ps.some(p=>p.id===v))return `-5 -5 ${WALL.W+10} ${H}`;
  const k=ps.findIndex(p=>p.id===v),p=ps[k],x0=k===0?-5:p.x0-8,x1=k===ps.length-1?WALL.W+8:p.x0+p.w+7;
  return `${x0} -5 ${x1-x0} ${H}`;
}
const edv=(k,d)=>typeof ED!=='undefined'&&ED[k]!=null?ED[k]:d; // réglages de l'éditeur de design (editor.js)
const zoomK=()=>typeof CFG!=='undefined'&&CFG.zoom===false?1:edv('hz',1.7)*(wallView==='all'?1:.8);
function shp(h,cx,cy,rr){
  const a=(h.rot-rr)*D2R,ca=Math.cos(a),sa=Math.sin(a);
  const P=FAM[h.fam].map(([x,y])=>{x*=h.w/2;y*=h.h/2;return[cx+x*ca-y*sa,cy+x*sa+y*ca]});
  if(h.fam==='facet')return'M'+P.map(p=>p.map(f1).join(',')).join('L')+'Z';
  const n=P.length;let d='M'+P[0].map(f1).join(',');
  for(let i=0;i<n;i++){const p0=P[(i-1+n)%n],p1=P[i],p2=P[(i+1)%n],p3=P[(i+2)%n];d+='C'+f1(p1[0]+(p2[0]-p0[0])/6)+','+f1(p1[1]+(p2[1]-p0[1])/6)+' '+f1(p2[0]-(p3[0]-p1[0])/6)+','+f1(p2[1]-(p3[1]-p1[1])/6)+' '+p2.map(f1).join(',')}
  return d+'Z';
}
// Retourne le SVG (texte) du mur, avec le bloc r s'il y en a un.
function wallSVG(r){
  const Y=y=>WALL.HM+2-y,ps=WALL.panels;
  let s="";
  ps.forEach((p,k)=>{
    s+=`<rect x="${p.x0}" y="${Y(p.h)}" width="${p.w}" height="${p.h}" fill="var(--wall)"/>`;
    if(k>0){const q=ps[k-1],gx=q.x0+q.w,top=Math.max(p.h,q.h);s+=`<rect x="${gx}" y="${Y(top)}" width="${p.x0-gx}" height="${top}" fill="var(--gap)"/>`}
  });
  holes.forEach(o=>s+=`<circle cx="${o.x}" cy="${Y(o.y)}" r="1.6" fill="var(--hole)"/>`);
  ps.forEach(p=>{const t=p.tilt?` · dévers ${p.tilt>0?"+":""}${p.tilt}°`:"";s+=`<text x="${p.x0+p.w/2}" y="${WALL.HM+10}" font-size="9" text-anchor="middle" fill="var(--mut)">${ps.length>1?"pan "+esc(p.name):esc(WALL.name)}${t}</text>`});
  // prises déjà posées par les blocs précédents (mode ouverture) : fantômes
  if(typeof ghostSVG==="function")s+=ghostSVG(r,Y);
  if(r){
    const cv=n=>getComputedStyle(document.documentElement).getPropertyValue(n).trim(),col={start:cv("--start")||"#16a34a",hand:cv("--hand")||"#2563eb",finish:cv("--finish")||"#dc2626"},footC=cv("--foot")||"#d97706";
    const one=(x,y,n,rho,st,foot)=>{
      const h=byN(n),cy=Y(y),I=IMG[n],k=zoomK()*Math.max(h.w,h.h)/Math.max(I[0],I[1]),w=I[0]*k,hh=I[1]*k;
      const glow=`filter:drop-shadow(0 0 .7px ${st}) drop-shadow(0 0 .7px ${st}) drop-shadow(0 .5px .6px rgba(0,0,0,.4))`;
      return`<image href="${imgSrc(n)}" x="${f1(x-I[2]*w)}" y="${f1(cy-I[3]*hh)}" width="${f1(w)}" height="${f1(hh)}" transform="rotate(${-rho} ${x} ${cy})" style="${glow}"/><circle cx="${x}" cy="${cy}" r="1.1" fill="#2a1d10" opacity=".55"/>${edv("nums",true)?`<text x="${x}" y="${cy+3.2}" font-size="6.5" text-anchor="middle" fill="#fff" stroke="#000" stroke-width="1.5" paint-order="stroke" font-weight="700">${n}</text>`:""}`};
    r.feet.forEach(f=>s+=one(f.x,f.y,f.n,f.rho||0,footC,1));
    r.hands.forEach(x=>s+=one(x.x,x.y,x.n,x.rho,col[x.role],0));
    // pastilles d'ordre : D = départ, chiffres = ordre des mouvements de main, A = arrivée
    if(edv('badges',true))r.hands.forEach((x,i)=>{const lb=x.role==='start'?'D':x.role==='finish'?'A':String(x.ord||(i-1)),bx=x.x+6.5*zoomK()*.8,by=Y(x.y)-6.5*zoomK()*.8;
      s+=`<circle cx="${f1(bx)}" cy="${f1(by)}" r="3.7" fill="${col[x.role]}" stroke="#fff" stroke-width=".9"/><text x="${f1(bx)}" y="${f1(by+1.6)}" font-size="4.6" text-anchor="middle" fill="#fff" font-weight="800">${lb}</text>`});
  }
  return s;
}
const drawWall=r=>{const s=$("wall");s.setAttribute("viewBox",vbFor(wallView));s.innerHTML=wallSVG(r)};
