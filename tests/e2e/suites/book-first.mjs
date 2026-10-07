// A book-first link a visitor opens (the test-only Lumen Skin Studio,
// /f/skin-notes): Book is the main action, quiet reels drop the pill, and
// the forms simulate because the link isn't live.
import { chromium } from '../browser.mjs';
import { addBookFirst } from '../fixtures/book-first.mjs';
import { addGoldenHour } from '../fixtures/golden-hour.mjs';
const res=[]; const check=(n,ok,x='')=>res.push((ok?'PASS':'FAIL')+'  '+n+(x?'  ('+x+')':''));
const errs=[]; const B='http://localhost:3002';
await addBookFirst(); await addGoldenHour();
const b = await chromium.launch();
for (const [w,h] of [[390,844],[1440,900]]) {
  const mobile=w<1024;
  const p = await b.newPage({ viewport:{width:w,height:h}, isMobile:mobile, hasTouch:mobile, deviceScaleFactor: mobile?2:1 });
  p.on('pageerror',e=>errs.push(w+' '+e.message)); p.on('console',m=>{if(m.type()==='error')errs.push(w+' '+m.text())});
  const sent=[];
  await p.route('**/api/**', r=>{ sent.push(r.request().url()); r.fulfill({status:204}); });
  await p.clock.install();
  await p.goto(B+'/f/skin-notes?src=instagram',{waitUntil:'networkidle'});
  check(w+': not-live note', await p.getByText("Preview of Lumen Skin Studio's link. Not live yet.").isVisible());
  check(w+': heading', await p.getByRole('heading',{name:'What are you curious about?'}).isVisible());
  check(w+': wordmark', await p.getByText('Lumen',{exact:true}).isVisible());
  check(w+': themed colors', await p.locator('main').evaluate(e=>getComputedStyle(e).backgroundColor)==='rgb(42, 27, 34)');
  check(w+': 5 topics', (await p.locator('main ul button').allTextContents()).join('|')==='Fine lines and wrinkles|Lip filler|Glowing skin|Acne scars|Laser hair removal');
  check(w+': fictional phone', await p.getByRole('link',{name:/Call or text/}).getAttribute('href')==='tel:+13105550148');
  check(w+': medical disclaimer', await p.getByText(/not medical advice/).first().isVisible());
  check(w+': no legal copy', !(await p.content()).match(/attorney|legal advice|Attorney Jeff/i));
  check(w+': noindex', await p.locator('meta[name="robots"]').getAttribute('content').then(c=>c?.includes('noindex')));
  check(w+': fits width', await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  await p.screenshot({path:`book-first-cover-${w}.jpg`, quality:70});

  await p.getByRole('button',{name:'Lip filler'}).click();
  const region = p.getByRole('region',{name:/Video: Lip filler that still looks like you/});
  check(w+': reel opens', await region.isVisible());
  check(w+': series label', await region.getByText('@lumen.skin').isVisible());
  check(w+': primary is Book', await region.getByRole('button',{name:'Book a free consultation'}).isVisible());
  check(w+': secondary Call + Text', await region.getByRole('link',{name:'Call',exact:true}).isVisible() && await region.getByRole('button',{name:'Text me',exact:true}).isVisible());
  check(w+': Book pill present (fills partway through)', await region.getByRole('button',{name:'Book a free consultation'}).isVisible());
  await p.screenshot({path:`book-first-reel-${w}.jpg`, quality:70});

  // Completed -> aftercare
  await p.clock.runFor(8200);
  check(w+': watched -> aftercare', await p.getByRole('region',{name:/Swelling, bruising/}).isVisible());

  // Book (the aftercare reel is "quiet": no pill, but the rail keeps Book)
  check(w+': quiet reel has no pill', await p.getByRole('button',{name:'Book a free consultation'}).count()===0);
  await p.getByRole('region',{name:/Swelling, bruising/}).getByRole('button',{name:'Book',exact:true}).click();
  const sheet = p.getByRole('region',{name:'Book a free consultation'});
  check(w+': booking sheet', await sheet.isVisible() && await sheet.getByText("we'll call you to find a time").isVisible());
  await p.getByLabel('Name',{exact:true}).fill('Sam'); await p.getByLabel('Mobile number').fill('3105550100');
  await sheet.getByRole('button',{name:'Request my consultation'}).click();
  await p.getByText('Demo: nothing was sent').waitFor({timeout:3000});
  check(w+': booking simulated', true);
  await p.getByRole('button',{name:'Keep watching'}).click();

  // Text me later shows med spa consent
  await p.getByRole('button',{name:'Text me',exact:true}).click();
  check(w+': clinic consent wording', await p.getByText('I agree that Lumen Skin Studio may text me').isVisible());
  await p.keyboard.press('Escape');

  // Skip -> glow facial; end path
  await p.keyboard.press('ArrowRight');
  check(w+': skipped -> glowing skin', await p.getByRole('region',{name:/The facial people book/}).isVisible());
  await p.clock.runFor(8200);
  check(w+': -> consultation reel', await p.getByRole('region',{name:/What happens at your free consultation/}).isVisible());
  await p.clock.runFor(8200);
  const end = p.getByRole('region',{name:'Ready to talk it through?'});
  check(w+': end card', await end.isVisible() && await end.getByRole('button',{name:'Send to a friend'}).isVisible());
  await p.screenshot({path:`book-first-end-${w}.jpg`, quality:70});
  check(w+': no lead sent from a link that isn\'t live', !sent.some(u=>u.includes('/api/leads')), sent.join(','));

  // OG image + another funnel keeps its own theme
  const og = await p.request.get(B+'/f/skin-notes/opengraph-image');
  check(w+': OG image', og.status()===200 && og.headers()['content-type']==='image/png');
  await p.goto(B+'/f/sundays',{waitUntil:'networkidle'});
  check(w+': another link keeps its own colors', await p.locator('main').evaluate(e=>getComputedStyle(e).backgroundColor)==='rgb(26, 18, 13)' && await p.getByRole('heading',{name:'Sundays, on the roof.'}).isVisible());
  await p.close();
}
await b.close();
console.log(res.join('\n')); console.log('errors:', errs.length?errs.join('\n'):'none');
