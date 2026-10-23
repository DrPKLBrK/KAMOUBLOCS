// WALL : génère les trous à partir de config.js et calcule les distances (3D à travers les jonctions entre pans).
const holes=[];
WALL.panels.forEach((p,pi)=>{
  for(let j=0;j<p.rows;j++)for(let i=0;i<p.cols;i++){
    const off=(i+.5)*WALL.pitch,dl=off,dr=p.w-off;
    // dj : distance à la jonction la plus proche (pour la zone « autour du coin »)
    const dj=Math.min(pi>0?dl:1e9,pi<WALL.panels.length-1?dr:1e9);
    holes.push({id:holes.length,pan:p.id,pi,c:i+1,r:j+1,x:p.x0+off,dl,dr,dj,y:(j+.5)*WALL.pitch,tilt:p.tilt||0});
  }
});
// Distance entre deux trous : distance réelle à travers l'air (3D). Le mur est reconstruit en plan : chaque pan est un segment,
// chaque jonction tourne de (180 - angle) : 90° = coin rentrant, 180° = pans alignés, 270° = arête saillante. Sur un même pan
// et entre pans voisins le résultat est identique à la loi des cosinus ; entre pans éloignés il est exact (il était surestimé).
const P3POS=(()=>{let x=0,z=0,dx=1,dz=0;const a=[];WALL.panels.forEach((p,k)=>{a.push([x,z,dx,dz]);x+=dx*p.w;z+=dz*p.w;if(k<WALL.panels.length-1){const t=(180-(WALL.joints[k]==null?180:WALL.joints[k]))*D2R,c=Math.cos(t),s=Math.sin(t);[dx,dz]=[dx*c-dz*s,dx*s+dz*c]}});return a})();
holes.forEach(o=>{const q=P3POS[o.pi];o.gx=q[0]+q[2]*o.dl;o.gz=q[1]+q[3]*o.dl});
function dist(a,b){
  if(a.pi===b.pi)return Math.hypot(a.dl-b.dl,a.y-b.y);
  return Math.sqrt((a.gx-b.gx)**2+(a.y-b.y)**2+(a.gz-b.gz)**2);
}
const panelAt=x=>{let q=WALL.panels[0];for(const p of WALL.panels)if(x>=p.x0-WALL.gap/2)q=p;return q};
const jointX=k=>WALL.panels[k+1].x0-WALL.gap/2; // position du joint k dans le dessin déplié
