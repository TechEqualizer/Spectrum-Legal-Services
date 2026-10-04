import { chromium, settle } from '../browser.mjs';
const res=[]; const check=(n,ok,x='')=>res.push((ok?'PASS':'FAIL')+'  '+n+(x?'  ('+x+')':''));
const errs=[];
const B='http://localhost:3002';
const b = await chromium.launch();
for (const [w,h] of [[390,844],[1440,900]]) {
  const mobile = w<1024;
  const ctx = await b.newContext({ storageState: process.argv[2] + '/auth.json', viewport:{width:w,height:h}, isMobile:mobile, hasTouch:mobile, deviceScaleFactor: mobile?2:1 });
  // These checks use the JLF demo; organizers' events come first by default.
  await ctx.addInitScript(() => { if (!localStorage.getItem('admin_business')) localStorage.setItem('admin_business', 'jlf'); });
  const p = await ctx.newPage();
  p.on('pageerror',e=>errs.push(w+' '+e.message)); p.on('console',m=>{if(m.type()==='error')errs.push(w+' '+m.text())});
  const events=[];
  await p.route('**/api/reel-events', r=>{ events.push(JSON.parse(r.request().postData()||'{}')); r.fulfill({status:204}); });
  await p.clock.install();
  await p.goto(B+'/f/jlf?src=Instagram',{waitUntil:'networkidle'});
  check(w+': cover heading', await p.getByRole('heading',{name:'What happened?'}).isVisible());
  check(w+': cover heading is white', await p.locator('h1').evaluate(e=>getComputedStyle(e).color)==='rgb(255, 255, 255)');
  check(w+': demo note', await p.getByText('Concept preview prepared for').isVisible());
  const topics = await p.locator('main ul button').allTextContents();
  check(w+': 6 topic choices', topics.length===6, topics.join('|'));
  check(w+': cover call link', await p.getByRole('link',{name:/Call 24\/7/}).getAttribute('href')==='tel:+18889730162');
  check(w+': cover fits width', await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  check(w+': no site header/footer', await p.locator('header, footer').count()===0);
  await p.screenshot({path:`link-cover-${w}.jpg`, quality:70});

  await p.getByRole('button',{name:'Dog bite'}).click();
  const region = p.getByRole('region',{name:/Video: Bitten by a dog/});
  check(w+': reel opens full screen', await region.isVisible());
  const callNow = region.getByRole('link',{name:/Call now: 888-973-0162/});
  check(w+': primary CTA is call', await callNow.isVisible() && await callNow.getAttribute('href')==='tel:+18889730162');
  check(w+': call-back + text-later buttons', await region.getByRole('button',{name:'Call back',exact:true}).isVisible() && await region.getByRole('button',{name:'Text me',exact:true}).isVisible());
  check(w+': CTAs inside viewport', await p.evaluate(()=>{const r=[...document.querySelectorAll('button')].find(b=>b.textContent==='Text me' && b.offsetParent).getBoundingClientRect(); return r.bottom<=innerHeight && r.top>0;}));
  await p.screenshot({path:`link-reel-${w}.jpg`, quality:70});
  await p.clock.runFor(1000);
  check(w+': viewed event carries src', events.some(e=>e.event==='viewed' && e.reelId==='dog-bite-california-law' && e.sourceTag==='instagram'), JSON.stringify(events[0]));

  // Call-back form
  await region.getByRole('button',{name:'Call back',exact:true}).click();
  check(w+': cta_clicked logged', events.some(e=>e.event==='cta_clicked'));
  const sheet = p.getByRole('region',{name:'Get a free case review'});
  check(w+': call-back sheet open', await sheet.isVisible());
  check(w+': focus on name', await p.evaluate(()=>document.activeElement?.getAttribute('autocomplete'))==='name');
  const bar0 = await p.getByTestId('reel-progress').evaluate(e=>e.style.width);
  await p.clock.runFor(3000);
  check(w+': reel paused while form open', await p.getByTestId('reel-progress').evaluate(e=>e.style.width)===bar0, bar0);
  await p.keyboard.type('Pat');
  await p.keyboard.press('ArrowLeft');
  check(w+': arrows stay in form', await sheet.isVisible() && await region.isVisible());
  await p.getByLabel('Mobile number').fill('555-12');
  await sheet.getByRole('button',{name:'Request my call back'}).click();
  check(w+': short phone rejected', await sheet.getByRole('alert').textContent().then(t=>t.includes('area code')));
  await p.getByLabel('Mobile number').fill('(562) 555-0100');
  await sheet.getByRole('button',{name:'Request my call back'}).click();
  await p.getByText('Demo: nothing was sent').waitFor({timeout:3000});
  check(w+': demo success', true);
  await p.screenshot({path:`link-sheet-done-${w}.jpg`, quality:70});
  await p.getByRole('button',{name:'Keep watching'}).click();
  check(w+': sheet closed, reel still there', await sheet.count()===0 && await region.isVisible());

  // Text me later
  await region.getByRole('button',{name:'Text me',exact:true}).click();
  const tsheet = p.getByRole('region',{name:'Not ready to talk?'});
  check(w+': text-later sheet', await tsheet.isVisible());
  check(w+': text_later_clicked logged', events.some(e=>e.event==='text_later_clicked'));
  check(w+': no email field', await tsheet.getByLabel(/Email/).count()===0);
  await p.getByLabel('First name').fill('Pat');
  await p.getByLabel('Mobile number').fill('5625550100');
  await p.screenshot({path:`link-text-${w}.jpg`, quality:70});
  await tsheet.getByRole('button',{name:'Text me the next video'}).click();
  check(w+': consent required', await p.getByText('Demo: nothing was sent').count()===0 && await tsheet.isVisible());
  await tsheet.getByRole('checkbox').check();
  await tsheet.getByRole('button',{name:'Text me the next video'}).click();
  await p.getByText('Demo: nothing was sent').waitFor({timeout:3000});
  check(w+': text-later demo success', true);
  await p.keyboard.press('Escape');
  check(w+': Escape closes sheet only', await tsheet.count()===0 && await region.isVisible());

  // Finish the reel -> end card (dog bite completed -> end)
  await p.clock.runFor(9000);
  const end = p.getByRole('region',{name:'Have a question about your situation?'});
  check(w+': end card', await end.isVisible());
  check(w+': end card CTAs + share', await end.getByRole('link',{name:/Call now/}).isVisible() && await end.getByRole('button',{name:'Send to someone who got hurt'}).isVisible());
  await p.screenshot({path:`link-end-${w}.jpg`, quality:70});
  await end.getByRole('button',{name:'Pick another topic'}).click();
  check(w+': back to topics', await p.getByRole('heading',{name:'What happened?'}).isVisible() && await p.getByRole('region').count()===0);

  // Return visit without a tag keeps the last source; ?start opens a reel
  events.length=0;
  await p.goto(B+'/f/jlf?start=injury-claim-deadlines',{waitUntil:'networkidle'});
  check(w+': ?start opens that reel', await p.getByRole('region',{name:/How long you have to file/}).isVisible());
  await p.clock.runFor(500);
  check(w+': remembered src on return', events.some(e=>e.sourceTag==='instagram'), JSON.stringify(events[0]));
  await p.goto(B+'/f/jlf?start=not-a-reel',{waitUntil:'networkidle'});
  check(w+': bad ?start shows cover', await p.getByRole('heading',{name:'What happened?'}).isVisible());

  // Website modal also books in place
  await p.goto(B+'/',{waitUntil:'networkidle'});
  await p.locator('#videos ul button').first().click();
  const dlg = p.getByRole('dialog');
  await dlg.getByRole('button',{name:'Call back',exact:true}).click();
  check(w+': site modal opens sheet in place', await p.getByRole('region',{name:'Get a free case review'}).isVisible() && await dlg.isVisible());
  await p.keyboard.press('Escape'); await p.keyboard.press('Escape');
  check(w+': Escape twice closes modal', await dlg.count()===0);
  await p.fill('#hero-name','T'); await p.fill('#hero-email','t@example.com');
  await p.selectOption('#hero-case-type','Dog Bite');
  await p.getByRole('button',{name:'Get My Free Case Review'}).click();
  await p.getByText('Demo: request not sent').waitFor({timeout:5000});
  check(w+': hero form still works', true);

  // Admin links
  await p.goto(B+'/admin/links',{waitUntil:'networkidle'});
  check(w+': link builder default', (await p.getByLabel('Your link').textContent()).endsWith('/f/jlf?src=instagram'));
  await p.selectOption('#link-source','__custom'); await p.fill('#link-custom','Bus Bench');
  await p.selectOption('#link-start','car-accident-first-steps');
  const link = await p.getByLabel('Your link').textContent();
  check(w+': custom tag + start', link.endsWith('/f/jlf?src=bus-bench&start=car-accident-first-steps'), link);
  check(w+': source rows', await p.locator('tbody tr').count()===8);
  check(w+': admin fits width', await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  await p.screenshot({path:`admin-links-${w}.jpg`, quality:70, fullPage:true});
  await p.goto(B+'/admin/leads',{waitUntil:'networkidle'});
  check(w+': lead timeline starts with link', await p.getByText(/^Opened the link/).first().isVisible());
  await ctx.close();
}
await b.close();
console.log(res.join('\n')); console.log('errors:', errs.length? errs.join('\n'):'none');
