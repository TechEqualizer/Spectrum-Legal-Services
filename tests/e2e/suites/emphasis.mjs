// How strongly each reel asks for the booking: builds, quiet and bold, on
// the test-only book-first link (/f/skin-notes).
import { chromium, settle } from '../browser.mjs';
import { addBookFirst } from '../fixtures/book-first.mjs';
const res=[]; const check=(n,ok,x='')=>res.push((ok?'PASS':'FAIL')+'  '+n+(x?'  ('+x+')':''));
const errs=[];
await addBookFirst();
const b = await chromium.launch();
for (const [w,h,mobile] of [[393,852,true],[1440,900,false]]) {
  const p = await b.newPage({ viewport:{width:w,height:h}, isMobile:mobile, hasTouch:mobile });
  p.on('pageerror',e=>errs.push(e.message));
  await p.clock.install();
  await p.goto('http://localhost:3002/f/skin-notes',{waitUntil:'networkidle'});
  const region = p.getByRole('region',{name:/Video:/});
  const pill = () => region.getByRole('button',{name:'Book a free consultation'});
  const railBook = () => region.locator('button:visible',{hasText:/^Book$/}).first();
  const bg = l => l.evaluate(e=>getComputedStyle(e.querySelector('span')??e).backgroundColor);
  // builds: Fine lines (first-time Botox)
  await p.getByRole('button',{name:'Fine lines and wrinkles'}).click();
  await p.clock.runFor(1000);
  check(w+': builds starts quiet (pill outline)', !(await pill().evaluate(e=>getComputedStyle(e).backgroundColor)).includes('164, 64, 92'));
  check(w+': builds starts quiet (rail)', !(await bg(railBook())).includes('164, 64, 92'), await bg(railBook()));
  const r1 = await railBook().boundingBox();
  await p.clock.runFor(4500);
  await settle(p, 800);
  check(w+': builds fills at 60% (pill)', (await pill().evaluate(e=>getComputedStyle(e).backgroundColor))==='rgb(164, 64, 92)');
  check(w+': builds fills at 60% (rail)', (await bg(railBook()))==='rgb(164, 64, 92)');
  const r2 = await railBook().boundingBox();
  check(w+': rail does not move when filled', Math.abs(r1.y-r2.y)<1 && Math.abs(r1.height-r2.height)<1, `${r1.y},${r1.height} -> ${r2.y},${r2.height}`);
  // completed -> natural results (quiet)
  await p.clock.runFor(3000);
  await settle(p, 300);
  check(w+': on quiet reel', await p.getByRole('region',{name:/Will I look frozen/}).isVisible());
  check(w+': quiet has no pill', await pill().count()===0);
  await p.clock.runFor(5500); await settle(p, 800);
  check(w+': past 60%, quiet reel', await p.getByRole('region',{name:/Will I look frozen/}).isVisible());
  check(w+': quiet rail stays plain', !(await bg(railBook())).includes('164, 64, 92'));
  check(w+': Book still reachable on quiet reel', await railBook().isVisible());
  // completed -> pricing (bold)
  await p.clock.runFor(2500); await settle(p, 800);
  check(w+': on bold reel', await p.getByRole('region',{name:/How pricing works/}).isVisible());
  check(w+': bold highlighted from start', (await pill().evaluate(e=>getComputedStyle(e).backgroundColor))==='rgb(164, 64, 92)' && (await bg(railBook()))==='rgb(164, 64, 92)');
  await p.screenshot({path:`emphasis-bold-${w}.jpg`, quality:65});
  await p.close();
}
await b.close();
console.log(res.join('\n')); console.log('errors:', errs.length?errs.join('\n'):'none');
