(function(g){
const GOAL=80;
const QKEYS=['age','child14','pregnant','unfit','caregiver','student','treatment','ui','work30','tribe','place'];
function screen(a){ // returns {applies:bool|null, reasons:[], missing:[], unsure:[], cautious:bool}
  a=a||{};const missing=QKEYS.filter(k=>!a[k]);
  if(missing.length)return{applies:null,reasons:[],missing,unsure:[]}; // never infer from partial answers
  const unsure=QKEYS.filter(k=>a[k]==='unsure');
  const r=[];
  if(a.age==='under18')r.push('You are under 18.');
  if(a.age==='65plus')r.push('You are 65 or older.');
  if(a.child14==='yes')r.push('Someone under 14 is in your SNAP household.');
  if(a.pregnant==='yes')r.push('You are pregnant.');
  if(a.unfit==='yes')r.push('You are physically or mentally unable to work (for example, you get disability benefits).');
  if(a.caregiver==='yes')r.push('You care for a child under 6 or a person who cannot care for themselves.');
  if(a.student==='yes')r.push('You attend school or training at least half-time.');
  if(a.treatment==='yes')r.push('You take part in a drug or alcohol treatment program.');
  if(a.ui==='yes')r.push('You get, or applied for, unemployment benefits.');
  if(a.work30==='yes')r.push('You already work 30+ hours a week (or earn at least 30 × federal minimum wage weekly).');
  if(a.tribe==='yes')r.push('You are American Indian or Alaska Native (tribal member or similar status).');
  if(a.place==='excluded')r.push('You live in a Michigan county or city where the time limit is not in effect right now.');
  if(r.length)return{applies:false,reasons:r,missing:[],unsure};
  return{applies:true,reasons:[],missing:[],unsure,cautious:unsure.length>0};
}
function monthKey(d){return d.slice(0,7);}
function monthTotal(logs,mk){return logs.filter(l=>monthKey(l.date)===mk).reduce((s,l)=>s+(+l.hours||0),0);}
function pace(total,year,month,day){ // month 1-12
  const dim=new Date(year,month,0).getDate();const expected=GOAL*day/dim;
  return{dim,expected,behind:total+0.001<expected&&total<GOAL,needPerDay:Math.max(0,(GOAL-total)/Math.max(1,dim-day+1)),pct:Math.min(100,total/GOAL*100)};
}
function icsDate(d){return d.replace(/-/g,'');}
function addDay(d){const x=new Date(d+'T12:00:00');x.setDate(x.getDate()+1);return x.getFullYear()+String(x.getMonth()+1).padStart(2,'0')+String(x.getDate()).padStart(2,'0');}
function esc(s){return String(s).replace(/[\\,;]/g,m=>'\\'+m).replace(/\n/g,'\\n');}
function ics(rem,now){
  const st=(now||new Date()).toISOString().replace(/[-:]/g,'').replace(/\.\d+/,'');
  const L=['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//Keep Your SNAP//EN','CALSCALE:GREGORIAN'];
  rem.filter(r=>r.date).forEach(r=>{L.push('BEGIN:VEVENT','UID:'+r.id+'@keep-your-snap','DTSTAMP:'+st,'DTSTART;VALUE=DATE:'+icsDate(r.date),'DTEND;VALUE=DATE:'+addDay(r.date),'SUMMARY:'+esc(r.title),'DESCRIPTION:'+esc('Keep Your SNAP reminder. Turn it in through MI Bridges (michigan.gov/mibridges) or your MDHHS office.'),
   'BEGIN:VALARM','ACTION:DISPLAY','DESCRIPTION:'+esc(r.title),'TRIGGER:-P7D','END:VALARM','BEGIN:VALARM','ACTION:DISPLAY','DESCRIPTION:'+esc(r.title),'TRIGGER:-P1D','END:VALARM','END:VEVENT');});
  L.push('END:VCALENDAR');return L.join('\r\n')+'\r\n';
}
function daysUntil(date,today){return Math.round((new Date(date+'T12:00:00')-new Date(today+'T12:00:00'))/864e5);}
// Tombstones: del = {id: deletedAtMs}. Merged across devices so deletions are never resurrected.
function mergeDel(a,b){const o=Object.assign({},a||{});for(const k in (b||{}))o[k]=Math.max(+o[k]||0,+b[k]||0);return o;}
function merge(a,b){const del=mergeDel(a.del,b.del),live=x=>!(x&&x.id&&del[x.id]);const m=merge0(a,b);
  const changes=m.changes.filter(live),cids=new Set(changes.map(c=>c.id));
  return Object.assign(m,{del,logs:m.logs.filter(live),changes,rem:m.rem.filter(r=>live(r)&&!(r.changeId&&del[r.changeId]&&!cids.has(r.changeId)))});}
function merge0(a,b){const k=l=>[l.date,l.type,l.hours,l.place||''].join('|');const s=new Set(a.logs.map(k));
  const logs=a.logs.concat(b.logs.filter(l=>!s.has(k(l))));const rk=r=>r.title+'|'+r.date;const rs=new Set(a.rem.map(rk));
  const ci=new Set((a.changes||[]).map(c=>c.id));const changes=(a.changes||[]).map(c=>{const o=(b.changes||[]).find(x=>x.id===c.id);return o&&o.reported&&!c.reported?Object.assign({},c,{reported:true,conf:o.conf,reportedOn:o.reportedOn}):c}).concat((b.changes||[]).filter(c=>!ci.has(c.id)));
  return Object.assign({},a,{logs,changes,rem:a.rem.map(r=>{const o=b.rem.find(x=>rk(x)===rk(r));return o&&o.done?Object.assign({},r,{done:true}):r}).concat(b.rem.filter(r=>!rs.has(rk(r))))});}

// RFT 250 (eff. 10-1-2026) column E: simplified reporting income limit, gross monthly
const SR_LIMIT=[0,1729,2345,2960,3575,4191,4806,5421,6037],SR_ADD=616;
function srLimit(n){n=Math.max(1,Math.floor(+n||1));return n<=8?SR_LIMIT[n]:SR_LIMIT[8]+(n-8)*SR_ADD;}
function incomeCheck(size,gross){const lim=srLimit(size),g=+gross||0;return{limit:lim,gross:g,over:g>lim,near:g>lim*0.9&&g<=lim,left:lim-g};}
// mode: 'd10' = 10 days after; 'm10' = 10th of next month (next business day); 'none' = not required
const CHANGES={
 address:{label:'New address',icon:'🏠',cr:['d10','Must report within 10 days of knowing (BAM 105).'],sr:['none','Not required for simplified reporters, but report it anyway so MDHHS letters (renewals, interviews) reach you.'],proof:'Lease or rent receipt, a letter or bill with your new address, new rent and utility amounts.'},
 pay:{label:'Change in pay or hours',icon:'💵',cr:['d10','Must report a change in pay rate, or hours changing by more than 5 a week for over a month, within 10 days of the first paycheck showing it (BAM 105).'],sr:['inc','Only if your household\'s total gross income for the month goes over your limit. Then report by the 10th of the next month (BAM 200).'],proof:'Pay stubs for the last 30 days, or a letter from your employer with pay rate and hours.'},
 newjob:{label:'Started a new job',icon:'🆕',cr:['d10','Must report within 10 days of your first paycheck (BAM 105).'],sr:['inc','Only if the month\'s total gross income goes over your limit. Then report by the 10th of the next month (BAM 200).'],proof:'First pay stubs, employer name, address and phone, start date, hourly pay and hours.'},
 lostjob:{label:'Lost or quit a job',icon:'📉',cr:['d10','Must report stopping work within 10 days (BAM 105). Reporting it can raise your benefits.'],sr:['none','Not required, but reporting lost income can raise your benefits. If the 80-hour rule applies to you and you drop under 80 hours, see "Work hours under 80".'],proof:'Last pay stub, separation or layoff letter, last day worked. Quitting without good cause can affect SNAP, so explain why.'},
 member:{label:'Someone moved in or out',icon:'👥',cr:['d10','Must report changes in who lives with you within 10 days of knowing (BAM 105).'],sr:['none','Not required for simplified reporters unless income goes over the limit, but adding someone can raise benefits.'],proof:'New member: ID, Social Security number, birth date, their income. Someone leaving: their new address if known.'},
 housing:{label:'Rent, mortgage or utility costs changed',icon:'🔌',cr:['none','For SNAP, a cost change without moving is not required to report (BAM 105). Reporting a higher cost can raise your benefits.'],sr:['none','Not required. Reporting a higher cost can raise your benefits.'],proof:'Lease, mortgage statement, utility bills or shutoff notice.'},
 support:{label:'Child support changed',icon:'👶',cr:['d10','Child support you RECEIVE: report starting or stopping it, or a change of more than $150 a month, within 10 days of the first changed payment. Child support you PAY is not required for SNAP but can lower your countable income (BAM 105).'],sr:['inc','Only if the month\'s total gross income goes over your limit (BAM 200). Reporting support you pay can raise benefits.'],proof:'Court order and MiSDU payment history.'},
 hours80:{label:'Work hours under 80 this month',icon:'⏱️',cr:['m10','If the 80-hour work rule applies to you, report any month you don\'t meet it (BAM 105).'],sr:['m10','Report by the 10th of the next month if you work under 20 hours a week / 80 a month and the work rule applies to you (BAM 200).'],proof:'Pay stubs, volunteer sign-off sheets, a good-cause reason (illness, emergency) with any proof.'},
 lottery:{label:'Lottery or gambling win of $4,750+',icon:'🎰',cr:['d10','Must report within 10 days (BAM 105, assets/income).'],sr:['m10','Report by the 10th of the next month (BAM 200).'],proof:'Winnings statement or W-2G.'}};
const p2=n=>String(n).padStart(2,'0'),ymd=d=>d.getFullYear()+'-'+p2(d.getMonth()+1)+'-'+p2(d.getDate());
function holidays(y){const nth=(m,wd,n)=>{const d=new Date(y,m,1);d.setDate(1+((wd-d.getDay()+7)%7)+(n-1)*7);return ymd(d)},last=(m,wd)=>{const d=new Date(y,m+1,0);d.setDate(d.getDate()-((d.getDay()-wd+7)%7));return ymd(d)};
 const obs=s=>{const d=new Date(s+'T12:00:00'),w=d.getDay();if(w===6)d.setDate(d.getDate()-1);else if(w===0)d.setDate(d.getDate()+1);return ymd(d)}; // Sat->Fri, Sun->Mon
 return[ obs(y+'-01-01'),obs((y+1)+'-01-01'),nth(0,1,3),nth(1,1,3),last(4,1),obs(y+'-06-19'),obs(y+'-07-04'),nth(8,1,1),obs(y+'-11-11'),nth(10,4,4),(()=>{const t=new Date(nth(10,4,4)+'T12:00:00');t.setDate(t.getDate()+1);return ymd(t)})(),obs(y+'-12-24'),obs(y+'-12-25'),obs(y+'-12-31')];} // Michigan state government holidays (approx.); weekend dates move to observed day
function nextBusiness(s){const d=new Date(s+'T12:00:00');for(;;){const k=ymd(d),h=holidays(d.getFullYear());const wd=d.getDay();if(wd&&wd<6&&!h.includes(k))return k;d.setDate(d.getDate()+1);}}
// date = the trigger date: for pay/newjob/support that is the FIRST PAYCHECK (or payment) with the new amount (BAM 105).
// overLimit: true/false, or null/undefined when income is unknown -> {required:null, unknown:true} (never "not required").
function reportBy(kind,date,reporter,overLimit){const c=CHANGES[kind];if(!c)return null;const [mode,why]=reporter==='sr'?c.sr:c.cr;
 const d=new Date(date+'T12:00:00');let m=mode;
 if(m==='inc'){if(overLimit==null)return{required:null,unknown:true,date:nextBusiness(ymd(new Date(d.getFullYear(),d.getMonth()+1,10))),why};m=overLimit?'m10':'none';}
 if(m==='none'){const x=new Date(d);x.setDate(x.getDate()+10);return{required:false,date:ymd(x),why};}
 if(m==='d10'){d.setDate(d.getDate()+10);return{required:true,date:ymd(d),why};}
 return{required:true,date:nextBusiness(ymd(new Date(d.getFullYear(),d.getMonth()+1,10))),why};}
const TRIGGER={pay:'Date of your first paycheck with the new pay',newjob:'Date of your first paycheck from the new job',support:'Date of the first changed child support payment'};
function triggerLabel(k){return TRIGGER[k]||'Date it happened';}
// Month under 80 hours -> report by the 10th of next month (BAM 200 / BAM 105). Deterministic id for dedupe.
function under80Reminder(mk){const [y,m]=mk.split('-').map(Number);return{id:'h80-'+mk,title:'Report: under 80 work hours in '+new Date(y,m-1,15).toLocaleString('en-US',{month:'long',year:'numeric'}),date:nextBusiness(ymd(new Date(y,m,10))),kind:'hours80',month:mk};}
function under80Months(logs,todayStr){const cur=todayStr.slice(0,7);const ms=[...new Set(logs.map(l=>monthKey(l.date)))].filter(mk=>mk<cur);return ms.filter(mk=>monthTotal(logs,mk)<GOAL).sort();}
const RULES_CHECKED='2026-10-27';
function limitsStale(todayStr){const y=+RULES_CHECKED.slice(0,4),next=(+RULES_CHECKED.slice(5,7)>=10?y+1:y)+'-10-01';return todayStr>=next;}
const api={QKEYS,mergeDel,triggerLabel,under80Reminder,under80Months,RULES_CHECKED,limitsStale,holidays,GOAL,screen,monthTotal,pace,ics,daysUntil,merge,srLimit,incomeCheck,CHANGES,reportBy,nextBusiness};
if(typeof module!=='undefined')module.exports=api;else g.KYS=api;
})(this);
