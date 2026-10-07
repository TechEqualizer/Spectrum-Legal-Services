import { chromium } from '../browser.mjs';
const res=[]; const check=(n,ok,x='')=>res.push((ok?'PASS':'FAIL')+'  '+n+(x?'  ('+x+')':''));
const errs=[];
const b = await chromium.launch();
const ctx = await b.newContext({ storageState: process.argv[2] + '/auth.json', viewport:{width:1440,height:900}, timezoneId:'America/New_York' });
// Big Love's event, with real visits: three views today and five three weeks ago.
const ev = (daysAgo, event) => ({ daysAgo, funnel: 'masquerade-v1', reel: 'mr-masks-on', event });
await fetch('http://localhost:54321/__reel-events', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify([
  ...[0, 0, 0].map((d) => ev(d, 'viewed')), ev(0, 'completed'), ...[20, 20, 21, 21, 22].map((d) => ev(d, 'viewed')), ev(20, 'completed'), ev(21, 'skipped'),
]) });
const p = await ctx.newPage();
p.on('pageerror',e=>errs.push(e.message)); p.on('console',m=>{if(m.type()==='error'||m.type()==='warning')errs.push(m.type()+': '+m.text().slice(0,160))});
const base='http://localhost:3002';
// Overview
await p.goto(base+'/admin/overview',{waitUntil:'networkidle'});
await p.locator('main p.text-2xl').first().waitFor();
check('no sample data', !/sample/i.test(await p.locator('body').innerText()));
check('noindex meta', (await p.content()).includes('noindex'));
const v30 = await p.locator('main p.text-2xl').first().textContent();
await p.getByRole('button',{name:'Last 7 days'}).click();
await p.waitForFunction((before) => document.querySelector('main p.text-2xl')?.textContent !== before, v30, { timeout: 5000 }).catch(() => {});
const v7 = await p.locator('main p.text-2xl').first().textContent();
check('range changes KPIs', v30==='8' && v7==='3', v30+' -> '+v7);
await p.getByRole('button',{name:'Last 90 days'}).click();
await p.locator('svg[role=img]').first().waitFor();
const svg = p.locator('svg[role=img]');
const box = await svg.boundingBox();
await p.mouse.move(box.x+box.width*0.5, box.y+box.height*0.5);
check('line tooltip on hover', await p.locator('[role=status]').first().isVisible());
await p.screenshot({path:'admin-overview.jpg', type:'jpeg', quality:70, fullPage:true});
await p.getByRole('button',{name:'Show as table'}).click();
check('outcome table view', await p.locator('table').count()>=2);
// The old Paths map now lands in the studio.
await p.goto(base+'/admin/funnel',{waitUntil:'networkidle'});
check('old Paths link lands in the studio', new URL(p.url()).pathname === '/admin');
// Campaigns are gone
const gone = await p.goto(base+'/admin/campaigns');
check('campaigns page removed (404)', gone.status()===404);
await p.goto(base+'/admin/overview',{waitUntil:'networkidle'});
check('no campaigns in nav', await p.locator('nav').getByText(/campaign/i).count()===0);
// Leads: Big Love's real ones (none yet), no made-up statuses.
await p.goto(base+'/admin/leads',{waitUntil:'networkidle'});
check('leads: real empty state', await p.getByRole('heading',{name:'No leads yet'}).isVisible());
check('leads: no status filter', await p.getByRole('group',{name:'Filter by status'}).count()===0 && !/Treatment booked|Consultation booked/.test(await p.locator('main').innerText()));
// Mobile
const m = await b.newContext({ storageState: process.argv[2] + '/auth.json', viewport:{width:390,height:844}, isMobile:true, hasTouch:true, deviceScaleFactor:2, timezoneId:'Asia/Tokyo' });
const mp = await m.newPage();
mp.on('pageerror',e=>errs.push('mobile '+e.message)); mp.on('console',x=>{if(x.type()==='error')errs.push('mobile: '+x.text().slice(0,160))});
for (const path of ['/admin','/admin/home','/admin/leads']) {
  await mp.goto(base+path,{waitUntil:'networkidle'});
  check('mobile no page overflow '+path, await mp.evaluate(()=>innerWidth===document.documentElement.clientWidth && document.documentElement.scrollWidth<=innerWidth));
}
await mp.goto(base+'/admin/overview',{waitUntil:'networkidle'});
await mp.screenshot({path:'admin-mobile.jpg', type:'jpeg', quality:60, fullPage:true});
await b.close();
console.log(res.join('\n')); console.log('console:', errs.length?errs:'none');
