(()=>{
'use strict';

const patients=(typeof P!=='undefined'&&Array.isArray(P))?P:[];
const cohort=document.getElementById('cohort');
if(!patients.length||!cohort){console.error('Nie znaleziono danych lub sekcji statystyki ogólnej.');return;}

const COLORS={red:'#ff6d7d',blue:'#64a9ff',green:'#65db95',amber:'#f6ba58',violet:'#ae8cff',cyan:'#58d6ff',accent:'#4ad8b8'};
const nf0=new Intl.NumberFormat('pl-PL',{maximumFractionDigits:0});
const nf1=new Intl.NumberFormat('pl-PL',{maximumFractionDigits:1});
const nf2=new Intl.NumberFormat('pl-PL',{maximumFractionDigits:2});
const hasNum=v=>v!==null&&v!==undefined&&v!==''&&Number.isFinite(Number(v));
const yes=v=>v===true||v===1;
const fmt=(v,d=1)=>hasNum(v)?(d===0?nf0:d===2?nf2:nf1).format(Number(v)):'—';
const pct=(a,b)=>b?100*a/b:0;
const fmtPct=v=>hasNum(v)?`${nf1.format(v)}%`:'—';
const sum=a=>a.reduce((s,v)=>s+(hasNum(v)?Number(v):0),0);
const mean=a=>{const x=a.filter(hasNum).map(Number);return x.length?sum(x)/x.length:null};
const quantile=(a,p)=>{const x=a.filter(hasNum).map(Number).sort((m,n)=>m-n);if(!x.length)return null;const pos=(x.length-1)*p,lo=Math.floor(pos),hi=Math.ceil(pos);return lo===hi?x[lo]:x[lo]+(x[hi]-x[lo])*(pos-lo)};
const median=a=>quantile(a,.5);
const esc=v=>String(v??'').replace(/[&<>\"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;'}[c]));
const mortality=a=>pct(a.filter(r=>r.zgon).length,a.length);
const ageStart=r=>{const n=parseInt(r.wiek_pasmo,10);return Number.isFinite(n)?n:null};
const ageGroup=r=>{const n=ageStart(r);return n===null?'brak':n<60?'<60':n<70?'60–69':n<80?'70–79':'≥80'};
const outcomeKey=r=>r.zgon?'death':(r.wynik||'').includes('przeniesienie')?'internal':(r.wynik||'').includes('wypis')?'external':'ongoing';
const outcomeLabel=r=>({death:'Zgon',internal:'Przeniesienie wewnętrzne',external:'Wypis / transfer zewnętrzny',ongoing:'Pozostaje w oddziale'})[outcomeKey(r)];
const monthLabel=value=>{if(!/^\d{4}-\d{2}$/.test(value||''))return'Brak danych';const [y,m]=value.split('-').map(Number);return new Intl.DateTimeFormat('pl-PL',{month:'long',year:'numeric'}).format(new Date(y,m-1,1))};

const supportDefs=[
 ['Wentylacja mechaniczna','wentylacja_mechaniczna',COLORS.blue],['Presory / inotropy','presor_inotrop',COLORS.violet],['CRRT / dializa','crrt_dializa',COLORS.amber],['Tracheostomia','tracheostomia',COLORS.cyan],['Próba ekstubacji / odłączenia','proba_ekstubacji_odlaczenia',COLORS.accent],['Reintubacja','reintubacja',COLORS.red],['Bronchoskopia','bronchoskopia',COLORS.blue],['Transfuzja','transfuzja_dowolna',COLORS.violet]
];
const admissionDefs=[
 ['Niewydolność oddechowa','przyjecie_oddechowe',COLORS.blue],['Wstrząs / niestabilność','przyjecie_wstrzas',COLORS.violet],['Infekcja','przyjecie_infekcyjne',COLORS.green],['Chirurgiczne / pooperacyjne','przyjecie_chirurgiczne',COLORS.amber],['Nerkowe / metaboliczne','przyjecie_nerkowo_metaboliczne',COLORS.cyan],['Po zatrzymaniu krążenia','przyjecie_po_nzk',COLORS.red]
];
const complicationDefs=[
 ['Niewydolność nerek','niewydolnosc_nerek',COLORS.cyan],['Zaburzenia rytmu','zaburzenia_rytmu',COLORS.red],['Infekcja / antybiotykoterapia','infekcja_antybiotyk_mikrobiologia',COLORS.green],['Leczenie przeciwgrzybicze','leczenie_przeciwgrzybicze',COLORS.violet],['Gorączka','goraczka',COLORS.amber],['Gorączka ≥39°C','goraczka_ge39',COLORS.red],['Zatrzymanie krążenia','zatrzymanie_krazenia',COLORS.red],['Odleżyna','odlezyna',COLORS.amber],['Obrzęki','obrzeki',COLORS.accent]
];
const procedureDefs=[
 ['Bronchoskopia','bronchoskopia',COLORS.blue],['Transfuzja dowolna','transfuzja_dowolna',COLORS.violet],['KKCz','kkcz',COLORS.red],['FFP','ffp',COLORS.amber],['Płytki krwi','plytki',COLORS.violet],['PEG','peg',COLORS.amber],['Procedura opłucnowa','procedura_oplucnowa',COLORS.cyan],['Tomografia komputerowa','tomografia_komputerowa',COLORS.green],['Leczenie chirurgiczne / pooperacyjne','chirurgia_pooperacyjny',COLORS.amber],['Żywienie enteralne','zywienie_enteralne',COLORS.accent],['Żywienie parenteralne','zywienie_parenteralne',COLORS.violet],['Rozmowa z rodziną','udokumentowana_rozmowa_z_rodzina',COLORS.accent],['Ograniczenie terapii / daremność','ograniczenie_terapii_daremnosc',COLORS.amber],['Jawna nota terminalna','jawna_nota_terminalna',COLORS.red]
];

function injectStyles(){
 const style=document.createElement('style');
 style.id='oa-detail-styles';
 style.textContent=`
 .oa-block{margin-top:22px}.oa-intro{margin:16px 0;padding:18px 20px;border-left:4px solid var(--a,#4ad8b8);border-radius:4px 16px 16px 4px;background:rgba(74,216,184,.075);color:#ddfbf4}.oa-filter{padding:16px;border:1px solid var(--line);border-radius:18px;background:rgba(255,255,255,.025);margin:16px 0}.oa-filter-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:9px}.oa-filter label{display:grid;gap:5px;color:var(--muted);font-size:10px;font-weight:750}.oa-filter select,.oa-filter button{width:100%;min-height:42px;padding:9px 11px;border:1px solid var(--line);border-radius:11px;background:#10243a;color:var(--text);font:inherit}.oa-filter button{align-self:end;font-weight:850;cursor:pointer}.oa-status{margin-top:10px;color:#c6d8e8;font-size:11px}.oa-kpis{display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:10px;margin:14px 0}.oa-kpi{padding:14px;border:1px solid var(--line);border-radius:15px;background:rgba(255,255,255,.03)}.oa-kpi b{display:block;font-size:23px;letter-spacing:-.035em}.oa-kpi span{display:block;margin-top:3px;color:var(--muted);font-size:9px;text-transform:uppercase;letter-spacing:.05em}.oa-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px;margin-top:14px}.oa-card{min-width:0;padding:17px;border:1px solid var(--line);border-radius:18px;background:rgba(255,255,255,.025)}.oa-card h3{margin:0 0 3px;font-size:18px}.oa-card>p{margin:0 0 12px;color:var(--muted);font-size:11px}.oa-wide{margin-top:14px}.oa-table-wrap{overflow:auto;border:1px solid var(--line);border-radius:14px;-webkit-overflow-scrolling:touch}.oa-table{width:100%;min-width:680px;border-collapse:separate;border-spacing:0}.oa-table.wide{min-width:1020px}.oa-table th,.oa-table td{padding:9px 10px;border-bottom:1px solid var(--line);font-size:10px;text-align:right;white-space:nowrap}.oa-table th{position:sticky;top:0;z-index:2;background:#10263b;color:#bdd0e3}.oa-table th:first-child,.oa-table td:first-child{text-align:left}.oa-table tr:last-child td{border-bottom:0}.oa-table tbody tr:hover td{background:rgba(74,216,184,.04)}.oa-bar{height:8px;min-width:125px;overflow:hidden;border-radius:99px;background:rgba(255,255,255,.05)}.oa-bar i{display:block;height:100%;min-width:2px;border-radius:99px;background:var(--c,#64a9ff)}.oa-doc-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px}.oa-doc{padding:12px;border:1px solid var(--line);border-radius:13px;background:rgba(255,255,255,.025)}.oa-doc b{display:block;font-size:19px}.oa-doc span{display:block;color:var(--muted);font-size:9px}.oa-note{margin-top:11px;padding:11px 13px;border:1px dashed var(--line);border-radius:12px;color:var(--muted);font-size:10px}.oa-empty{text-align:center!important;color:var(--muted)}
 @media(max-width:1100px){.oa-kpis{grid-template-columns:repeat(3,1fr)}.oa-filter-grid{grid-template-columns:repeat(3,1fr)}.oa-doc-grid{grid-template-columns:repeat(2,1fr)}}
 @media(max-width:760px){.oa-grid{grid-template-columns:1fr}.oa-filter-grid{grid-template-columns:repeat(2,1fr)}.oa-kpis{grid-template-columns:repeat(2,1fr)}}
 @media(max-width:480px){.oa-filter-grid,.oa-kpis,.oa-doc-grid{grid-template-columns:1fr}}
 @media print{.oa-filter{display:none}.oa-card,.oa-kpi{break-inside:avoid}}
 `;
 document.head.appendChild(style);
}

function moveAndRename(){
 const atlas=document.getElementById('atlas');
 if(atlas&&cohort.parentNode)cohort.parentNode.insertBefore(cohort,atlas);
 const nav=document.querySelector('.nav');
 if(nav){const cohortLink=nav.querySelector('a[href="#cohort"]'),atlasLink=nav.querySelector('a[href="#atlas"]');if(cohortLink){cohortLink.textContent='Statystyka ogólna';if(atlasLink)nav.insertBefore(cohortLink,atlasLink)}}
 const head=cohort.querySelector('.sec-head h2');if(head)head.textContent='Szczegółowa statystyka ogólna';
 const lead=cohort.querySelector('.sec-head p');if(lead)lead.textContent='Rozkłady, interwencje, powikłania, dokumentacja i parametry liczbowe dla wszystkich hospitalizacji.';
}

function buildDetailShell(){
 const root=document.createElement('div');root.id='oa-details';root.className='oa-block';
 root.innerHTML=`
 <div class="oa-intro"><strong>Rozszerzona analiza ogólna:</strong> poniższe tabele pokazują szczegółowy obraz wyniku leczenia, czasu hospitalizacji, profilu wsparcia narządowego, powikłań, dokumentacji i dostępności pomiarów. Filtry dotyczą wyłącznie tej części.</div>
 <div class="oa-filter"><div class="oa-filter-grid">
 <label>Wynik<select id="oa-outcome"><option value="all">Wszystkie wyniki</option><option value="death">Zgon</option><option value="internal">Przeniesienie wewnętrzne</option><option value="external">Wypis / transfer zewnętrzny</option><option value="ongoing">Pozostaje w oddziale</option></select></label>
 <label>Płeć<select id="oa-sex"><option value="all">Wszystkie</option><option value="K">Kobiety</option><option value="M">Mężczyźni</option></select></label>
 <label>Wiek<select id="oa-age"><option value="all">Wszystkie grupy</option><option value="lt60">&lt;60 lat</option><option value="60-69">60–69 lat</option><option value="70-79">70–79 lat</option><option value="80plus">≥80 lat</option></select></label>
 <label>Miesiąc<select id="oa-month"><option value="all">Wszystkie miesiące</option></select></label>
 <label>Wentylacja<select id="oa-vent"><option value="all">Wszystkie</option><option value="yes">Tak</option><option value="no">Nie</option></select></label>
 <label>Presory<select id="oa-pressor"><option value="all">Wszystkie</option><option value="yes">Tak</option><option value="no">Nie</option></select></label>
 <label>CRRT<select id="oa-crrt"><option value="all">Wszystkie</option><option value="yes">Tak</option><option value="no">Nie</option></select></label>
 <button id="oa-reset" type="button">Wyczyść filtry</button></div><div class="oa-status" id="oa-status"></div></div>
 <div class="oa-kpis" id="oa-kpis"></div>
 <div class="oa-card oa-wide"><h3>Zmiany w czasie</h3><p>Liczba hospitalizacji, wynik i wsparcie narządowe według miesiąca rozpoczęcia.</p><div class="oa-table-wrap"><table class="oa-table wide" id="oa-month-table"></table></div></div>
 <div class="oa-grid"><div class="oa-card"><h3>Wiek i wynik</h3><p>Liczebność i śmiertelność w czterech głównych grupach wieku.</p><div class="oa-table-wrap"><table class="oa-table" id="oa-age-table"></table></div></div><div class="oa-card"><h3>Płeć i wynik</h3><p>Porównanie liczebności, czasu hospitalizacji i wyniku leczenia.</p><div class="oa-table-wrap"><table class="oa-table" id="oa-sex-table"></table></div></div></div>
 <div class="oa-card oa-wide"><h3>Wzorce wsparcia narządowego</h3><p>Kombinacje wentylacji, presorów i CRRT.</p><div class="oa-table-wrap"><table class="oa-table" id="oa-pattern-table"></table></div></div>
 <div class="oa-card oa-wide"><h3>Interwencje a wynik leczenia</h3><p>Częstość, śmiertelność z cechą i bez cechy oraz surowy iloraz szans zgonu.</p><div class="oa-table-wrap"><table class="oa-table wide" id="oa-feature-table"></table></div><div class="oa-note">Surowe ilorazy szans są eksploracyjne, niekorygowane i nie dowodzą związku przyczynowego. Interwencje są przede wszystkim markerami ciężkości stanu.</div></div>
 <div class="oa-grid"><div class="oa-card"><h3>Profil przyjęcia</h3><p>Najczęściej odnotowane dominujące problemy.</p><div class="oa-table-wrap"><table class="oa-table" id="oa-admission-table"></table></div></div><div class="oa-card"><h3>Powikłania i zdarzenia</h3><p>Częstość i śmiertelność.</p><div class="oa-table-wrap"><table class="oa-table" id="oa-complication-table"></table></div></div></div>
 <div class="oa-grid"><div class="oa-card"><h3>Procedury, żywienie i komunikacja</h3><p>Pełne zestawienie odnotowanych działań.</p><div class="oa-table-wrap"><table class="oa-table" id="oa-procedure-table"></table></div></div><div class="oa-card"><h3>Dokumentacja</h3><p>Intensywność wpisów i kompletność wybranych informacji.</p><div class="oa-doc-grid" id="oa-documentation"></div></div></div>
 <div class="oa-card oa-wide"><h3>Parametry liczbowe</h3><p>Dostępność, mediana, kwartyle i zakres wartości.</p><div class="oa-table-wrap"><table class="oa-table wide" id="oa-numeric-table"></table></div></div>`;
 cohort.appendChild(root);
 const months=[...new Set(patients.map(r=>r.miesiac_poczatku).filter(Boolean))].sort();
 document.getElementById('oa-month').insertAdjacentHTML('beforeend',months.map(m=>`<option value="${m}">${esc(monthLabel(m))}</option>`).join(''));
 ['oa-outcome','oa-sex','oa-age','oa-month','oa-vent','oa-pressor','oa-crrt'].forEach(id=>document.getElementById(id).addEventListener('change',renderDetails));
 document.getElementById('oa-reset').addEventListener('click',()=>{['oa-outcome','oa-sex','oa-age','oa-month','oa-vent','oa-pressor','oa-crrt'].forEach(id=>document.getElementById(id).value='all');renderDetails()});
}

function filtered(){
 const v=id=>document.getElementById(id).value,o=v('oa-outcome'),s=v('oa-sex'),a=v('oa-age'),m=v('oa-month'),vent=v('oa-vent'),press=v('oa-pressor'),crrt=v('oa-crrt');
 const flag=(x,c)=>c==='all'||(c==='yes'&&yes(x))||(c==='no'&&!yes(x));
 return patients.filter(r=>{if(o!=='all'&&outcomeKey(r)!==o)return false;if(s!=='all'&&r.plec!==s)return false;const ag=ageGroup(r);if(a==='lt60'&&ag!=='<60')return false;if(a==='60-69'&&ag!=='60–69')return false;if(a==='70-79'&&ag!=='70–79')return false;if(a==='80plus'&&ag!=='≥80')return false;if(m!=='all'&&r.miesiac_poczatku!==m)return false;return flag(r.wentylacja_mechaniczna,vent)&&flag(r.presor_inotrop,press)&&flag(r.crrt_dializa,crrt)});
}
function odds(a,b,c,d){if(a+b===0||c+d===0)return null;if([a,b,c,d].some(x=>x===0)){a+=.5;b+=.5;c+=.5;d+=.5}const value=a*d/(b*c),se=Math.sqrt(1/a+1/b+1/c+1/d);return{value,low:Math.exp(Math.log(value)-1.96*se),high:Math.exp(Math.log(value)+1.96*se)}}
function featureStats(data,def){const [label,key,color]=def,withF=data.filter(r=>yes(r[key])),without=data.filter(r=>!yes(r[key])),dw=withF.filter(r=>r.zgon).length,dn=without.filter(r=>r.zgon).length;return{label,key,color,n:withF.length,share:pct(withF.length,data.length),deaths:dw,mw:pct(dw,withF.length),mwo:pct(dn,without.length),or:odds(dw,withF.length-dw,dn,without.length-dn)}}
function empty(cols){return`<tbody><tr><td colspan="${cols}" class="oa-empty">Brak danych dla wybranej podgrupy.</td></tr></tbody>`}
function renderFeatureSummary(id,data,defs){const rows=defs.map(d=>featureStats(data,d)).sort((a,b)=>b.n-a.n);document.getElementById(id).innerHTML=`<thead><tr><th>Cecha</th><th>N</th><th>Częstość</th><th>Zgony</th><th>Śmiertelność</th></tr></thead>${rows.length?`<tbody>${rows.map(r=>`<tr><td>${esc(r.label)}</td><td>${r.n}</td><td>${fmtPct(r.share)}</td><td>${r.deaths}</td><td>${fmtPct(r.mw)}</td></tr>`).join('')}</tbody>`:empty(5)}`}

function renderDetails(){
 const data=filtered(),n=data.length,deaths=data.filter(r=>r.zgon).length,totalEntries=sum(data.map(r=>r.liczba_wpisow)),triad=data.filter(r=>r.wentylacja_mechaniczna&&r.presor_inotrop&&r.crrt_dializa).length,both=data.filter(r=>r.wentylacja_mechaniczna&&r.presor_inotrop).length;
 document.getElementById('oa-status').innerHTML=n?`Analizowana podgrupa: <strong>${n} hospitalizacji</strong> z ${patients.length}.`:'<strong>Brak hospitalizacji spełniających wybrane kryteria.</strong>';
 const kp=[['Hospitalizacje',n],['Zgony',`${deaths} · ${fmtPct(mortality(data))}`],['Mediana czasu',`${fmt(median(data.map(r=>r.obserwowany_czas_dni)),1)} d`],['Średni czas',`${fmt(mean(data.map(r=>r.obserwowany_czas_dni)),1)} d`],['Wpisy',totalEntries],['Wpisy / hospitalizację',n?fmt(totalEntries/n,1):'—'],['Wentylacja + presory',both],['Pełna triada',triad],['Hospitalizacje ≥14 d',data.filter(r=>r.obserwowany_czas_dni>=14).length],['Mediana wpisów',fmt(median(data.map(r=>r.liczba_wpisow)),0)],['Rozmowa z rodziną',fmtPct(pct(data.filter(r=>r.udokumentowana_rozmowa_z_rodzina).length,n))],['Jawna nota terminalna',deaths?fmtPct(pct(data.filter(r=>r.zgon&&r.jawna_nota_terminalna).length,deaths)):'—']];
 document.getElementById('oa-kpis').innerHTML=kp.map(([l,v])=>`<div class="oa-kpi"><b>${v}</b><span>${esc(l)}</span></div>`).join('');
 renderMonth(data);renderAgeSex(data);renderPatterns(data);renderFeatures(data);renderFeatureSummary('oa-admission-table',data,admissionDefs);renderFeatureSummary('oa-complication-table',data,complicationDefs);renderFeatureSummary('oa-procedure-table',data,procedureDefs);renderDocumentation(data);renderNumeric(data);
}
function renderMonth(data){const months=[...new Set(data.map(r=>r.miesiac_poczatku).filter(Boolean))].sort();document.getElementById('oa-month-table').innerHTML=`<thead><tr><th>Miesiąc</th><th>N</th><th>Zgony</th><th>Śmiertelność</th><th>Mediana czasu</th><th>Średni czas</th><th>Wentylacja</th><th>Presory</th><th>CRRT</th><th>Wpisy</th></tr></thead>${months.length?`<tbody>${months.map(m=>{const a=data.filter(r=>r.miesiac_poczatku===m);return`<tr><td>${esc(monthLabel(m))}</td><td>${a.length}</td><td>${a.filter(r=>r.zgon).length}</td><td>${fmtPct(mortality(a))}</td><td>${fmt(median(a.map(r=>r.obserwowany_czas_dni)),1)} d</td><td>${fmt(mean(a.map(r=>r.obserwowany_czas_dni)),1)} d</td><td>${fmtPct(pct(a.filter(r=>r.wentylacja_mechaniczna).length,a.length))}</td><td>${fmtPct(pct(a.filter(r=>r.presor_inotrop).length,a.length))}</td><td>${fmtPct(pct(a.filter(r=>r.crrt_dializa).length,a.length))}</td><td>${sum(a.map(r=>r.liczba_wpisow))}</td></tr>`}).join('')}</tbody>`:empty(10)}`}
function renderAgeSex(data){const ageDefs=[['<60',r=>ageGroup(r)==='<60'],['60–69',r=>ageGroup(r)==='60–69'],['70–79',r=>ageGroup(r)==='70–79'],['≥80',r=>ageGroup(r)==='≥80']];document.getElementById('oa-age-table').innerHTML=`<thead><tr><th>Wiek</th><th>N</th><th>Udział</th><th>Zgony</th><th>Śmiertelność</th><th>Mediana czasu</th></tr></thead><tbody>${ageDefs.map(([l,f])=>{const a=data.filter(f);return`<tr><td>${l}</td><td>${a.length}</td><td>${fmtPct(pct(a.length,data.length))}</td><td>${a.filter(r=>r.zgon).length}</td><td>${fmtPct(mortality(a))}</td><td>${fmt(median(a.map(r=>r.obserwowany_czas_dni)),1)} d</td></tr>`}).join('')}</tbody>`;document.getElementById('oa-sex-table').innerHTML=`<thead><tr><th>Płeć</th><th>N</th><th>Udział</th><th>Zgony</th><th>Śmiertelność</th><th>Mediana czasu</th><th>Mediana wpisów</th></tr></thead><tbody>${[['Kobiety','K'],['Mężczyźni','M']].map(([l,k])=>{const a=data.filter(r=>r.plec===k);return`<tr><td>${l}</td><td>${a.length}</td><td>${fmtPct(pct(a.length,data.length))}</td><td>${a.filter(r=>r.zgon).length}</td><td>${fmtPct(mortality(a))}</td><td>${fmt(median(a.map(r=>r.obserwowany_czas_dni)),1)} d</td><td>${fmt(median(a.map(r=>r.liczba_wpisow)),0)}</td></tr>`}).join('')}</tbody>`}
function renderPatterns(data){const map=new Map();data.forEach(r=>{const k=`${r.wentylacja_mechaniczna?'V':'–'}${r.presor_inotrop?'P':'–'}${r.crrt_dializa?'R':'–'}`;(map.get(k)||map.set(k,[]).get(k)).push(r)});const labels={'VPR':'Wentylacja + presory + CRRT','VP–':'Wentylacja + presory','V–R':'Wentylacja + CRRT','–PR':'Presory + CRRT','V––':'Tylko wentylacja','–P–':'Tylko presory','––R':'Tylko CRRT','–––':'Bez tych trzech interwencji'};const rows=[...map].map(([k,a])=>({label:labels[k]||k,n:a.length,d:a.filter(r=>r.zgon).length,m:mortality(a),los:median(a.map(r=>r.obserwowany_czas_dni))})).sort((a,b)=>b.n-a.n);document.getElementById('oa-pattern-table').innerHTML=`<thead><tr><th>Wzorzec</th><th>N</th><th>Udział</th><th>Zgony</th><th>Śmiertelność</th><th>Mediana czasu</th></tr></thead>${rows.length?`<tbody>${rows.map(r=>`<tr><td>${esc(r.label)}</td><td>${r.n}</td><td>${fmtPct(pct(r.n,data.length))}</td><td>${r.d}</td><td>${fmtPct(r.m)}</td><td>${fmt(r.los,1)} d</td></tr>`).join('')}</tbody>`:empty(6)}`}
function renderFeatures(data){const defs=[...supportDefs,...complicationDefs].filter((d,i,a)=>a.findIndex(x=>x[1]===d[1])===i),rows=defs.map(d=>featureStats(data,d)).sort((a,b)=>b.n-a.n);document.getElementById('oa-feature-table').innerHTML=`<thead><tr><th>Cecha</th><th>N</th><th>Częstość</th><th>Udział</th><th>Zgony z cechą</th><th>Śmiertelność z cechą</th><th>Śmiertelność bez cechy</th><th>OR</th><th>95% CI</th></tr></thead>${rows.length?`<tbody>${rows.map(r=>`<tr><td>${esc(r.label)}</td><td>${r.n}</td><td>${fmtPct(r.share)}</td><td><div class="oa-bar"><i style="width:${r.share}%;--c:${r.color}"></i></div></td><td>${r.deaths}</td><td>${fmtPct(r.mw)}</td><td>${fmtPct(r.mwo)}</td><td>${r.or?fmt(r.or.value,2):'—'}</td><td>${r.or?`${fmt(r.or.low,2)}–${fmt(r.or.high,2)}`:'—'}</td></tr>`).join('')}</tbody>`:empty(9)}`}
function renderDocumentation(data){const n=data.length,deaths=data.filter(r=>r.zgon),entries=sum(data.map(r=>r.liczba_wpisow)),dens=data.map(r=>r.liczba_wpisow/Math.max(r.obserwowany_czas_dni||.5,.5)),coverage=data.map(r=>r.dni_kalendarzowe_wlacznie?pct(r.dni_z_wpisem,r.dni_kalendarzowe_wlacznie):null);const cards=[['Wpisy łącznie',entries,n?`${fmt(entries/n,1)} średnio na hospitalizację`:''],['Mediana wpisów',fmt(median(data.map(r=>r.liczba_wpisow)),0),`Q1–Q3: ${fmt(quantile(data.map(r=>r.liczba_wpisow),.25),0)}–${fmt(quantile(data.map(r=>r.liczba_wpisow),.75),0)}`],['Wpisy na dzień',fmt(median(dens),1),'mediana intensywności'],['Pokrycie dni',fmtPct(median(coverage)),'dni z wpisem / dni kalendarzowe'],['Jawna nota terminalna',deaths.length?fmtPct(pct(deaths.filter(r=>r.jawna_nota_terminalna).length,deaths.length)):'—',`${deaths.filter(r=>r.jawna_nota_terminalna).length} z ${deaths.length} zgonów`],['Rozmowa z rodziną',n?fmtPct(pct(data.filter(r=>r.udokumentowana_rozmowa_z_rodzina).length,n)):'—',`${data.filter(r=>r.udokumentowana_rozmowa_z_rodzina).length} hospitalizacji`],['Ograniczenie terapii',n?fmtPct(pct(data.filter(r=>r.ograniczenie_terapii_daremnosc).length,n)):'—',`${data.filter(r=>r.ograniczenie_terapii_daremnosc).length} hospitalizacji`],['Dni z wpisem',fmt(median(data.map(r=>r.dni_z_wpisem)),0),'mediana na hospitalizację']];document.getElementById('oa-documentation').innerHTML=cards.map(([l,v,s])=>`<div class="oa-doc"><b>${v}</b><span>${esc(l)}</span><span>${esc(s)}</span></div>`).join('')}
function renderNumeric(data){const defs=[['Glikemia minimalna','glikemia_min_mg_dl','mg/dl',1,v=>v],['Glikemia maksymalna','glikemia_max_mg_dl','mg/dl',1,v=>v],['Temperatura minimalna','temperatura_min_C','°C',1,v=>v],['Temperatura maksymalna','temperatura_max_C','°C',1,v=>v],['IAP maksymalne','iap_max_mmHg','mmHg',1,v=>v],['FiO₂ maksymalne','fio2_max','%',0,v=>100*v],['GCS minimalne','gcs_min','pkt',1,v=>v],['RASS minimalne','rass_min','pkt',1,v=>v]];document.getElementById('oa-numeric-table').innerHTML=`<thead><tr><th>Parametr</th><th>Dostępne N</th><th>Kompletność</th><th>Mediana</th><th>Q1–Q3</th><th>Średnia</th><th>Minimum–maksimum</th></tr></thead><tbody>${defs.map(([l,k,u,d,t])=>{const a=data.map(r=>r[k]).filter(hasNum).map(v=>t(Number(v)));return`<tr><td>${esc(l)}</td><td>${a.length}</td><td>${fmtPct(pct(a.length,data.length))}</td><td>${fmt(median(a),d)} ${u}</td><td>${fmt(quantile(a,.25),d)}–${fmt(quantile(a,.75),d)} ${u}</td><td>${fmt(mean(a),d)} ${u}</td><td>${fmt(a.length?Math.min(...a):null,d)}–${fmt(a.length?Math.max(...a):null,d)} ${u}</td></tr>`}).join('')}</tbody>`}

const phraseReplacements=[
 [/Każdy wiersz to jeden epizod/gi,'Każdy wiersz to jedna hospitalizacja'],[/każdy epizod osobno/gi,'każda hospitalizacja osobno'],[/Wynik epizodu/g,'Wynik hospitalizacji'],[/wynik epizodu/g,'wynik hospitalizacji'],[/Zakończenie epizodu/g,'Zakończenie hospitalizacji'],[/zakończenie epizodu/g,'zakończenie hospitalizacji'],[/Profil epizodu/g,'Profil hospitalizacji'],[/profil epizodu/g,'profil hospitalizacji'],[/Epizody/g,'Hospitalizacje'],[/epizody/g,'hospitalizacje'],[/Epizodów/g,'Hospitalizacji'],[/epizodów/g,'hospitalizacji'],[/Epizodu/g,'Hospitalizacji'],[/epizodu/g,'hospitalizacji'],[/Epizodzie/g,'Hospitalizacji'],[/epizodzie/g,'hospitalizacji'],[/Epizod/g,'Hospitalizacja'],[/epizod/g,'hospitalizacja']
];
function rewriteText(root){
 if(!root)return;
 if(root.nodeType===Node.TEXT_NODE){let value=root.nodeValue;phraseReplacements.forEach(([re,to])=>{value=value.replace(re,to)});if(value!==root.nodeValue)root.nodeValue=value;return}
 if(root.nodeType!==Node.ELEMENT_NODE&&root.nodeType!==Node.DOCUMENT_FRAGMENT_NODE)return;
 if(root.nodeType===Node.ELEMENT_NODE&&['SCRIPT','STYLE','TEXTAREA'].includes(root.tagName))return;
 const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);let node;while(node=walker.nextNode()){if(node.parentElement&&['SCRIPT','STYLE','TEXTAREA'].includes(node.parentElement.tagName))continue;let value=node.nodeValue;phraseReplacements.forEach(([re,to])=>{value=value.replace(re,to)});if(value!==node.nodeValue)node.nodeValue=value}
}
function startLanguageGuard(){rewriteText(document.body);document.title='OAiIT 2026 — hospitalizacje i szczegółowa statystyka ogólna';new MutationObserver(records=>records.forEach(record=>record.addedNodes.forEach(rewriteText))).observe(document.body,{childList:true,subtree:true})}

injectStyles();moveAndRename();buildDetailShell();renderDetails();startLanguageGuard();
})();
