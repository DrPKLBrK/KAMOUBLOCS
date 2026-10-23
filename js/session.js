// SESSION (v29, amélioration 3.4) : séances et plan de progression. Générateur seulement.
// Une séance enchaîne des blocs générés un par un, avec un rôle chacun : échauffement progressif, travail, retour au calme.
// Le niveau de travail (W, échelle 0 à 10 du générateur) progresse de séance en séance d'après tes notes sur les blocs de travail :
// enchaînés ou ressentis plus faciles que prévu → W monte ; ratés ou ressentis bien plus durs → W redescend.
// Tout est recalculé depuis la liste des séances et tes notes (rien d'autre n'est stocké), comme l'apprentissage (learn.js).
const SS_KEY="sessions6";
const sessions=()=>ls(SS_KEY,[]);
const saveSessions=a=>ss(SS_KEY,a.slice(-120));
const SS_STEP=.3,SS_OK=.7,SS_BAD=.3,SS_MINN=3; // pas de progression, seuils de réussite, notes minimales sur les blocs de travail
// Modèles de séance. lvl : "warm" (sous ton niveau, progressif), "work" (niveau de travail W), "easy" (retour au calme).
const SS_TPL={
  full:{name:"Séance complète",desc:"3 blocs d'échauffement progressifs, 4 blocs de travail à ton niveau, 1 bloc facile pour finir.",
    steps:[["warm",3,{mv:"static",len:"short"}],["work",4,{}],["easy",1,{len:"long"}]]},
  weak:{name:"Point faible",desc:"2 blocs d'échauffement, 5 blocs ciblés sur ton point faible principal (un peu sous ton niveau), 1 bloc facile.",
    steps:[["warm",2,{mv:"static",len:"short"}],["focus",5,{}],["easy",1,{len:"long"}]]},
  power:{name:"Puissance",desc:"3 blocs d'échauffement, 4 blocs courts et durs (au-dessus de ton niveau de travail), 1 bloc facile. Récupère bien entre les essais.",
    steps:[["warm",3,{mv:"static",len:"short"}],["work",4,{mv:"power",len:"short",dl:.6}],["easy",1,{}]]},
  endur:{name:"Continuité",desc:"2 blocs d'échauffement, 3 blocs longs et enchaînés sous ton niveau, 1 bloc facile.",
    steps:[["warm",2,{mv:"static",len:"short"}],["work",3,{mv:"endur",len:"long",dl:-.8}],["easy",1,{}]]}
};
const ROLE={warm:"Échauffement",work:"Travail",focus:"Point faible",easy:"Retour au calme"};
// niveau de travail de départ : milieu des niveaux du bandeau
const ssW0=()=>{let a=CFG.lmin,z=CFG.lmax;if(a>z)[a,z]=[z,a];return(LVL[a][1]+LVL[z][2])/2};
// Résultat d'un bloc de travail d'après sa note : 1 réussi, 0 raté, 0,5 neutre, null sans note.
function ssResult(id){const t=notes().find(x=>x.id===id);if(!t)return null;
  if(t.sent===true)return 1;if(t.sent===false)return 0;const e=noteErr(t);return e<=-.8?1:e>=1.5?0:.5}
// Rejoue toutes les séances terminées : niveau de travail après chacune.
function ssPlan(){
  const S=sessions(),out=[];let W=null;
  S.forEach(s=>{if(W==null)W=s.w0!=null?s.w0:ssW0();const r=s.steps.filter(x=>(x.role==="work"||x.role==="focus")&&x.id).map(x=>ssResult(x.id)).filter(v=>v!=null);
    const rate=r.length?r.reduce((a,b)=>a+b,0)/r.length:null;let d=0;
    if(s.end&&r.length>=SS_MINN){if(rate>=SS_OK)d=SS_STEP;else if(rate<=SS_BAD)d=-SS_STEP}
    out.push({s,W,rate,n:r.length,d});W=clamp(W+d,.5,9.8)});
  return{W:W==null?ssW0():W,rows:out};
}
const ssActive=()=>{const a=sessions(),s=a[a.length-1];return s&&!s.end?s:null};
function ssStart(tpl){
  if(ssActive())return;const T=SS_TPL[tpl],P=ssPlan(),steps=[];
  T.steps.forEach(([role,n,o])=>{for(let i=0;i<n;i++)steps.push({role,i,n,o})});
  const a=sessions();a.push({sid:Date.now().toString(36),tpl,ts:Date.now(),w0:P.W,steps,cur:0,end:null});saveSessions(a);renderSession();
  ssNext(); // le premier bloc de la séance est généré tout de suite (avant, il fallait cliquer « Bloc suivant » en plus)
}
// Réglages imposés pour l'étape k (mécanisme genWith, focus.js).
function ssOver(s,k){
  const st=s.steps[k],o=Object.assign({},st.o),W=s.w0,tag={kind:"session",sid:s.sid,k,lab:`${ROLE[st.role]} ${st.i+1}/${st.n}`};
  let tg;
  if(st.role==="warm")tg=Math.max(.3,W-2.2+1.4*(st.n>1?st.i/(st.n-1):1));         // de W-2,2 à W-0,8
  else if(st.role==="easy")tg=Math.max(.3,W-2.5);
  else if(st.role==="focus"){const f=focusList()[0];if(f){o.mv=f.mv;if(f.hs)o.hs=f.hs;tag.lab+=" : "+f.lab}tg=W+FOCUS_DL+(f&&f.dl||0)}
  else tg=W+(o.dl||0);
  delete o.dl;o.tgt=clamp(tg,.3,9.9);o.tag=tag;
  if(o.mv&&!MVN[o.mv])delete o.mv;return o;
}
function ssNext(){const s=ssActive();if(!s)return;if(s.cur>=s.steps.length){ssEnd();return}genWith(ssOver(s,s.cur))}
// le bloc généré pour l'étape courante : on retient son identifiant (pour retrouver sa note)
function ssGot(r){const a=sessions(),s=a[a.length-1];if(!s||s.end||!r.tag||r.tag.sid!==s.sid)return;const st=s.steps[r.tag.k];if(!st)return;
  st.id=r.id;st.idx=r.idx;st.mv=r.mv;if(r.tag.k===s.cur)s.cur++;saveSessions(a)}
function ssSkip(){const a=sessions(),s=a[a.length-1];if(!s||s.end)return;s.steps[s.cur]&&(s.steps[s.cur].skip=true);s.cur++;saveSessions(a);renderSession()}
function ssEnd(){const a=sessions(),s=a[a.length-1];if(!s||s.end)return;s.end=Date.now();if(!s.steps.some(x=>x.id))a.pop();saveSessions(a);renderSession()}
// Semaines (lundi) : séances, blocs, notes, enchaînés, meilleur niveau enchaîné.
function ssWeeks(){
  const wk=ts=>{const d=new Date(ts);d.setHours(0,0,0,0);d.setDate(d.getDate()-((d.getDay()+6)%7));return d.getTime()},W={};
  const get=k=>W[k]=W[k]||{k,ses:0,bl:0,nt:0,sent:0,best:null};
  sessions().forEach(s=>{const w=get(wk(s.ts));w.ses++;w.bl+=s.steps.filter(x=>x.id).length});
  notes().forEach(t=>{const w=get(wk(t.ts));w.nt++;if(t.sent===true){w.sent++;if(w.best==null||t.idx>w.best)w.best=t.idx}});
  return Object.values(W).sort((a,b)=>b.k-a.k).slice(0,8);
}
function ssAdvice(P){
  const last=P.rows.filter(r=>r.s.end).slice(-1)[0];
  if(!last)return"Commence une séance : le niveau de travail part du milieu des niveaux choisis dans le bandeau, puis s'ajuste à tes notes.";
  if(last.n<SS_MINN)return`Dernière séance : ${last.n} bloc${last.n>1?"s":""} de travail noté${last.n>1?"s":""} sur ${SS_MINN} nécessaires pour ajuster le niveau. Note tes blocs de travail (ressenti, et « Enchaîné ? »).`;
  return last.d>0?`Dernière séance réussie à ${Math.round(last.rate*100)} % : le niveau de travail monte.`:last.d<0?`Dernière séance réussie à ${Math.round(last.rate*100)} % seulement : le niveau de travail redescend un peu, consolide avant de remonter.`:`Dernière séance réussie à ${Math.round(last.rate*100)} % : bon niveau de travail, on le garde.`;
}
const fmtW=w=>`${svLab(w)} (${w.toFixed(1).replace(".",",")} / 10${typeof gradeOf==="function"?", ≈ "+gradeOf(w):""})`;
const fmtDay=ts=>new Date(ts).toLocaleDateString("fr-FR",{day:"numeric",month:"short"});
function renderSession(){
  const d=$("session");if(!d)return;const s=ssActive(),P=ssPlan();
  if(s){
    const T=SS_TPL[s.tpl],done=s.steps.filter(x=>x.id).length;
    d.innerHTML=`<h2>Séance en cours : ${esc(T.name)}</h2><p class="mut">Niveau de travail : ${fmtW(s.w0)} · ${done} / ${s.steps.length} blocs</p>
    <ol class="ssl">${s.steps.map((x,k)=>{const r=x.id?ssResult(x.id):null;return`<li class="${k===s.cur?"cur":x.id?"done":x.skip?"skip":""}"><b>${ROLE[x.role]} ${x.i+1}/${x.n}</b> <span class="mut">${x.id?esc(svLab(x.idx))+(r==null?" · à noter":r===1?" · réussi":r===0?" · raté":" · noté"):x.skip?"passé":k===s.cur?"à faire maintenant":""}</span></li>`}).join("")}</ol>
    <div class="row">${s.cur<s.steps.length?`<button class="pri" id="ssnext">Bloc suivant : ${esc(ROLE[s.steps[s.cur].role])} ${s.steps[s.cur].i+1}/${s.steps[s.cur].n}</button><button id="ssskip">Passer cette étape</button>`:""}<button id="ssend">${s.cur<s.steps.length?"Arrêter la séance":"Terminer la séance"}</button></div>
    <p class="mut">Après chaque essai, note le bloc dans « Notes et apprentissage » (ressenti et « Enchaîné ? ») : c'est ce qui fait progresser le niveau de travail.</p>`;
    const n=$("ssnext");if(n)n.onclick=ssNext;const k=$("ssskip");if(k)k.onclick=ssSkip;$("ssend").onclick=ssEnd;return;
  }
  const wk=ssWeeks(),rows=P.rows.filter(r=>r.s.end).slice(-6).reverse();
  d.innerHTML=`<h2>Séances et progression</h2>
  <p>Niveau de travail actuel : <b>${fmtW(P.W)}</b>. ${esc(ssAdvice(P))}</p>
  <div class="row"><label class="f" for="sstpl"><span>Type de séance</span><select id="sstpl">${Object.entries(SS_TPL).map(([k,t])=>`<option value="${k}">${t.name}</option>`).join("")}</select></label><button class="pri" id="ssgo">Commencer la séance</button></div>
  <p class="mut" id="ssdesc">${esc(SS_TPL.full.desc)}</p>
  ${rows.length?`<details class="ssh"><summary>Dernières séances (${rows.length})</summary><div class="tw"><table class="inv"><thead><tr><th>Date</th><th>Séance</th><th>Niveau de travail</th><th>Réussite</th><th>Suite</th></tr></thead><tbody>${rows.map(r=>`<tr><td>${fmtDay(r.s.ts)}</td><td>${esc(SS_TPL[r.s.tpl]?SS_TPL[r.s.tpl].name:r.s.tpl)}</td><td>${esc(fmtW(r.W))}</td><td>${r.rate==null?"–":Math.round(r.rate*100)+" % ("+r.n+")"}</td><td>${r.d>0?"monte":r.d<0?"redescend":r.n<SS_MINN?"pas assez de notes":"stable"}</td></tr>`).join("")}</tbody></table></div></details>`:""}
  ${wk.length?`<details class="ssh"><summary>Par semaine (${wk.length})</summary><div class="tw"><table class="inv"><thead><tr><th>Semaine du</th><th>Séances</th><th>Blocs</th><th>Notes</th><th>Enchaînés</th><th>Meilleur enchaîné</th></tr></thead><tbody>${wk.map(w=>`<tr><td>${fmtDay(w.k)}</td><td>${w.ses}</td><td>${w.bl}</td><td>${w.nt}</td><td>${w.sent}</td><td>${w.best==null?"–":esc(svLab(w.best))+(typeof gradeOf==="function"?" ≈ "+gradeOf(w.best):"")}</td></tr>`).join("")}</tbody></table></div></details>`:""}`;
  $("sstpl").onchange=e=>$("ssdesc").textContent=SS_TPL[e.target.value].desc;
  $("ssgo").onclick=()=>ssStart($("sstpl").value);
}
show=(function(base){return function(r){base(r);if(r&&r.tag&&r.tag.kind==="session"){ssGot(r);renderSession();const m=$("met");if(m)m.insertAdjacentHTML("afterbegin",`<span class="chip tagc"><i>Séance</i>${esc(r.tag.lab)}</span>`)}}})(show);
renderNotes=(function(base){return function(){base();renderSession()}})(renderNotes);
