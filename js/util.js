// UTIL : petits outils partagés (stockage local, tirage au sort, raccourcis).
const D2R=Math.PI/180;
const $=id=>document.getElementById(id);
const pick=a=>a[Math.random()*a.length|0];
const rnd=(a,b)=>a+Math.random()*(b-a);
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const ls=(k,d)=>{try{const v=localStorage.getItem(k);return v==null?d:JSON.parse(v)}catch(e){return d}};
const ss=(k,v)=>{try{localStorage.setItem(k,JSON.stringify(v))}catch(e){}};
