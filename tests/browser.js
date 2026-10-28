const {chromium}=require('/node_modules/playwright-core');const fs=require('fs');
const U=process.env.URL||'http://127.0.0.1:18432/',O='/workspace/kys-fix/';
(async()=>{const ctx=await chromium.launchPersistentContext('/tmp/kysfix',{executablePath:'/opt/google/chrome/chrome',headless:true,acceptDownloads:true,viewport:{width:390,height:844}});
// block CDNs to prove nothing depends on them
await ctx.route(/cdn\.jsdelivr\.net|unpkg\.com|cdnjs/,r=>r.abort());
const p=ctx.pages()[0]||await ctx.newPage();const errs=[];p.on('console',m=>m.type()==='error'&&errs.push(m.text()));p.on('pageerror',e=>errs.push(e.message));p.on('dialog',d=>d.accept());
const log=(...a)=>console.log(...a);
// 1. old v2 data loads + migrates
await p.goto(U);await p.evaluate(()=>{localStorage.clear();localStorage.setItem('kys',JSON.stringify({logs:[{id:'o1',date:'2026-09-02',type:'work',hours:20}],rem:[{id:'r0',title:'Renewal (redetermination) due',date:'2026-12-01'}],ans:{age:'18-64',_done:1},changes:[],reporter:'sr',inc:{size:1,gross:''},tab:'sync'}))});await p.reload();
let st=await p.evaluate(()=>JSON.parse(localStorage.kys));log('old data kept',st.logs.length===1&&st.rem.some(r=>r.id==='r0'),'tab migrated',st.tab,'auto under-80 Sept reminder',st.rem.some(r=>r.id==='h80-2026-09'));
log('welcome shows',!!await p.$('#welcome'),'backup reminder',!!await p.$('#bkrem'));
const nav=await p.evaluate(()=>{const n=document.querySelector('nav');return{sw:n.scrollWidth,cw:n.clientWidth,doc:document.documentElement.scrollWidth,btns:[...n.querySelectorAll('button')].map(b=>b.getBoundingClientRect().right<=390)}});log('nav',JSON.stringify(nav));
await p.evaluate(()=>scrollTo(0,0));await p.screenshot({path:O+'1-welcome.png'});
await p.click('text=Start with step 1');
// 2. screener gating: old partial answer (age only) must not give result
log('age-only result',(await p.textContent('#result')).slice(0,40),'missing marked',await p.$$eval('.miss',e=>e.length));
await p.screenshot({path:O+'2-screener-incomplete.png',fullPage:true});
const all={age:'18-64',child14:'no',pregnant:'no',unfit:'unsure',caregiver:'no',student:'no',treatment:'no',ui:'no',work30:'no',tribe:'no',place:'other'};
for(const[k,v] of Object.entries(all))await p.check(`input[name=${k}][value="${v}"]`);await p.click('#scr button[type=submit]');
log('all answered (1 not sure)',(await p.textContent('#result')).slice(0,60));await p.screenshot({path:O+'3-screener-cautious.png',fullPage:true});
// 3. hours under-80 offer
await p.click('nav >> text=Hours');await p.fill('#hh','6');await p.click('#addh button');log('u80 offer',(await p.textContent('#u80')).trim().slice(0,60));
await p.click('#u80');st=await p.evaluate(()=>JSON.parse(localStorage.kys));log('u80 added',st.rem.filter(r=>r.id.startsWith('h80-')).map(r=>r.id+'>'+r.date).join(','));
await p.screenshot({path:O+'4-hours.png',fullPage:true});
// 4. deadlines: pay change w/ blank income -> check income
await p.click('nav >> text=Deadlines');await p.click('#ch-pay summary');log('pay label',await p.textContent('label[for=cd-pay]'),'inline income ask',!!await p.$('#ci-pay'));
await p.fill('#cd-pay','2026-11-06');await p.click('#ch-pay >> text=Log this change');st=await p.evaluate(()=>JSON.parse(localStorage.kys));const pc=st.changes.find(c=>c.kind==='pay');log('blank-income pay change required',pc.required,'by',pc.reportBy,'title',st.rem.find(r=>r.changeId===pc.id).title);
log('rules note',(await p.textContent('#rulesnote')).trim());
await p.screenshot({path:O+'5-deadlines.png',fullPage:true});
// delete reminder linked to change -> both removed + tombstoned
await p.locator('.row',{hasText:'Check income, maybe report'}).first().locator('button[aria-label="Delete reminder"]').click();
st=await p.evaluate(()=>JSON.parse(localStorage.kys));log('linked delete: changes',st.changes.length,'tombs',Object.keys(st.del).length);
// 5. More tab: sync with CDN blocked
await p.click('nav >> text=More');log('qr (CDN blocked)',!!await p.$('#qr svg'),'LZ',await p.evaluate(()=>typeof LZString));const link=await p.inputValue('#sl');
const [bk]=await Promise.all([p.waitForEvent('download'),p.click('#bk')]);await bk.saveAs('/tmp/kysfix-bk.json');
await p.evaluate(()=>scrollTo(0,0));await p.screenshot({path:O+'6-more-sync.png',fullPage:true});
const sw=await p.evaluate(async()=>{const r=await navigator.serviceWorker.getRegistration();return !!r});log('sw registered',sw,'manifest',await p.evaluate(()=>fetch('manifest.webmanifest').then(r=>r.ok)));
// 6. resurrection: second device has the deleted change; merging it back must not resurrect
const ctx2=await chromium.launchPersistentContext('/tmp/kysfix2',{executablePath:'/opt/google/chrome/chrome',headless:true,viewport:{width:390,height:844}});await ctx2.route(/cdn\.jsdelivr\.net/,r=>r.abort());
const q=ctx2.pages()[0]||await ctx2.newPage();q.on('pageerror',e=>errs.push(e.message));q.on('dialog',d=>d.accept());
await q.goto(U);await q.evaluate(c=>{localStorage.clear();localStorage.setItem('kys',JSON.stringify({logs:[],rem:[{id:'rx',title:'Report change: Change in pay or hours',date:'2026-11-16',changeId:c.id}],changes:[c],ans:{},welcomed:true}))},pc);await q.reload();
await q.goto(link.replace(/^http:\/\/[^/]+\//,U));await q.reload();await q.click('#mg');const d2=await q.evaluate(()=>JSON.parse(localStorage.kys));log('device2 after merge: deleted change resurrected?',d2.changes.some(c=>c.id===pc.id),'logs',d2.logs.length);
// and device2 -> device1 back
await q.click('nav >> text=More');const link2=await q.inputValue('#sl');await p.goto(link2.replace(/^http:\/\/[^/]+\//,U));await p.reload();await p.click('#mg');st=await p.evaluate(()=>JSON.parse(localStorage.kys));log('device1 after back-merge resurrected?',st.changes.some(c=>c.id===pc.id)||st.rem.some(r=>r.id==='rx'));
log('errors',JSON.stringify(errs));await ctx.close();await ctx2.close();})();
