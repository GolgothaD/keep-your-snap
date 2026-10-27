(function(g){
const GOAL=80;
function screen(a){ // returns {applies:bool|null, reasons:[]}
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
  if(r.length)return{applies:false,reasons:r};
  if(!a.age)return{applies:null,reasons:[]};
  return{applies:true,reasons:[]};
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
function merge(a,b){const k=l=>[l.date,l.type,l.hours,l.place||''].join('|');const s=new Set(a.logs.map(k));
  const logs=a.logs.concat(b.logs.filter(l=>!s.has(k(l))));const rk=r=>r.title+'|'+r.date;const rs=new Set(a.rem.map(rk));
  return Object.assign({},a,{logs,rem:a.rem.concat(b.rem.filter(r=>!rs.has(rk(r))))});}
const api={GOAL,screen,monthTotal,pace,ics,daysUntil,merge};
if(typeof module!=='undefined')module.exports=api;else g.KYS=api;
})(this);
