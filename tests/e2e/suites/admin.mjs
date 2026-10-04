import { chromium, settle } from '../browser.mjs';
const res=[]; const check=(n,ok,x='')=>res.push((ok?'PASS':'FAIL')+'  '+n+(x?'  ('+x+')':''));
const errs=[];
const b = await chromium.launch();
const ctx = await b.newContext({ storageState: process.argv[2] + '/auth.json', viewport:{width:1440,height:900}, timezoneId:'America/New_York' });
// These checks use the JLF demo; organizers' events come first by default.
await ctx.addInitScript(() => { if (!localStorage.getItem('admin_business')) localStorage.setItem('admin_business', 'jlf'); });
const p = await ctx.newPage();
p.on('pageerror',e=>errs.push(e.message)); p.on('console',m=>{if(m.type()==='error'||m.type()==='warning')errs.push(m.type()+': '+m.text().slice(0,160))});
const base='http://localhost:3002';
// Overview
await p.goto(base+'/admin/overview',{waitUntil:'networkidle'});
check('sample-data banner', await p.getByText('Sample data.').isVisible());
check('noindex meta', (await p.content()).includes('noindex'));
const v30 = await p.locator('main p.text-2xl').first().textContent();
await p.getByRole('button',{name:'Last 7 days'}).click();
const v7 = await p.locator('main p.text-2xl').first().textContent();
check('range changes KPIs', v30!==v7, v30+' -> '+v7);
await p.getByRole('button',{name:'Last 90 days'}).click();
const svg = p.locator('svg[role=img]');
const box = await svg.boundingBox();
await p.mouse.move(box.x+box.width*0.5, box.y+box.height*0.5);
check('line tooltip on hover', await p.locator('[role=status]').first().isVisible());
await p.screenshot({path:'admin-overview.jpg', type:'jpeg', quality:70, fullPage:true});
await p.getByRole('button',{name:'Show as table'}).click();
check('outcome table view', await p.locator('table').count()>=2);
// Funnel
await p.goto(base+'/admin/funnel',{waitUntil:'networkidle'});
const nodes = await p.locator('main [aria-pressed]').count();
check('funnel shows 8 reel nodes', nodes===8, String(nodes));
await p.getByRole('button',{name:/Dog Bite/}).first().click();
await p.locator('aside select').first().selectOption('injury-claim-deadlines');
check('editing a path updates the table', (await p.locator('section table tbody tr').filter({has: p.locator('td:first-child', {hasText:'Bitten by a dog'})}).textContent()).includes('How long you have to file'));
check('reset appears after edit', await p.getByRole('button',{name:'Reset to live paths'}).isVisible());
await p.screenshot({path:'admin-funnel.jpg', type:'jpeg', quality:70, fullPage:true});
// Campaigns are gone
const gone = await p.goto(base+'/admin/campaigns');
check('campaigns page removed (404)', gone.status()===404);
await p.goto(base+'/admin/overview',{waitUntil:'networkidle'});
check('no campaigns in nav', await p.locator('nav').getByText(/campaign/i).count()===0);
// Leads
await p.goto(base+'/admin/leads',{waitUntil:'networkidle'});
await p.getByRole('button',{name:'Signed',exact:true}).click();
const rows = await p.locator('tbody tr').count();
check('status filter', rows>0 && rows<18, rows+' rows');
await p.getByRole('button',{name:'All',exact:true}).click();
await p.locator('tbody tr').nth(2).click();
check('lead detail journey', await p.getByText('Video journey before booking').isVisible());
await p.screenshot({path:'admin-leads.jpg', type:'jpeg', quality:70, fullPage:true});
// Mobile
const m = await b.newContext({ storageState: process.argv[2] + '/auth.json', viewport:{width:390,height:844}, isMobile:true, hasTouch:true, deviceScaleFactor:2, timezoneId:'Asia/Tokyo' });
// These checks use the JLF demo; organizers' events come first by default.
await m.addInitScript(() => { if (!localStorage.getItem('admin_business')) localStorage.setItem('admin_business', 'jlf'); });
const mp = await m.newPage();
mp.on('pageerror',e=>errs.push('mobile '+e.message)); mp.on('console',x=>{if(x.type()==='error')errs.push('mobile: '+x.text().slice(0,160))});
for (const path of ['/admin','/admin/funnel','/admin/leads']) {
  await mp.goto(base+path,{waitUntil:'networkidle'});
  check('mobile no page overflow '+path, await mp.evaluate(()=>innerWidth===document.documentElement.clientWidth && document.documentElement.scrollWidth<=innerWidth));
}
await mp.goto(base+'/admin/overview',{waitUntil:'networkidle'});
await mp.screenshot({path:'admin-mobile.jpg', type:'jpeg', quality:60, fullPage:true});
await b.close();
console.log(res.join('\n')); console.log('console:', errs.length?errs:'none');
