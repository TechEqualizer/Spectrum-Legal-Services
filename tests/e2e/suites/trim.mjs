import { chromium, settle } from '../browser.mjs';
const res=[]; const check=(n,ok,x='')=>res.push((ok?'PASS':'FAIL')+'  '+n+(x?'  ('+x+')':''));
const errs=[];
const b = await chromium.launch();
for (const [w,h] of [[390,844],[1440,900]]) {
  const mobile = w<1024;
  const p = await b.newPage({ storageState: process.argv[2] + '/auth.json', viewport:{width:w,height:h}, isMobile:mobile, hasTouch:mobile, deviceScaleFactor: mobile?2:1 });
  p.on('pageerror',e=>errs.push(e.message)); p.on('console',m=>{if(m.type()==='error')errs.push(m.text())});
  await p.clock.install();
  await p.goto('http://localhost:3002',{waitUntil:'networkidle'});
  const sections = await p.evaluate(()=>[...document.querySelectorAll('main > section')].map(s=>s.id||s.getAttribute('aria-label')));
  check(w+': main is hero, reels, CTA', JSON.stringify(sections)===JSON.stringify(['home','videos','Call to action']), sections.join(' > '));
  const last = await p.evaluate(()=>document.querySelector('main').lastElementChild.querySelector('h2')?.textContent.replace(/\s+/g,' ').trim());
  check(w+': ends with CTA text', last.includes('Injured in an Accident?') && last.includes("Don't Wait. Call Us Today."), last);
  const ids = new Set(await p.evaluate(()=>[...document.querySelectorAll('[id]')].map(e=>e.id)));
  const anchors = await p.evaluate(()=>[...document.querySelectorAll('a[href^="#"]')].map(a=>a.getAttribute('href')).filter(h=>h!=='#'));
  const broken = [...new Set(anchors)].filter(h=>!ids.has(h.slice(1)));
  check(w+': no broken in-page links', broken.length===0, broken.join(','));
  check(w+': page fits width', await p.evaluate(()=>innerWidth===document.documentElement.clientWidth));
  // Book from a reel -> form opens over the reel
  await p.locator('#videos ul button').nth(5).click();
  await p.getByRole('dialog').getByRole('button',{name:'Call back',exact:true}).click();
  check(w+': reel booking opens in place', await p.getByRole('region',{name:'Get a free case review'}).isVisible());
  await p.keyboard.press('Escape'); await p.keyboard.press('Escape');
  await p.fill('#hero-name','T'); await p.fill('#hero-email','t@example.com'); await p.selectOption('#hero-case-type','Dog Bite');
  await p.getByRole('button',{name:'Get My Free Case Review'}).click();
  await p.getByText('Demo: request not sent').waitFor({timeout:5000});
  check(w+': demo notice on submit', true);
  if (!mobile) { await p.locator('main > section').last().scrollIntoViewIfNeeded(); await p.screenshot({path:'trim-end-desktop.jpg', type:'jpeg', quality:70, fullPage:true}); }
  else { await p.screenshot({path:'trim-mobile-full.jpg', type:'jpeg', quality:50, fullPage:true}); }
  await p.close();
}
await b.close();
console.log(res.join('\n')); console.log('errors:', errs.length?errs:'none');
