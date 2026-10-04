import { animationsDone, chromium, settle } from '../browser.mjs';
const res=[]; const check=(n,ok,x='')=>res.push((ok?'PASS':'FAIL')+'  '+n+(x?'  ('+x+')':''));
const b = await chromium.launch();
for (const w of [393,1440]) {
  const p = await b.newPage({viewport:{width:w,height:w<500?852:900}});
  await p.goto('http://localhost:3002/f/events?src=ig'); await settle(p, 2600);
  check(w+': hero title h1', (await p.locator('h1').innerText())==='Sundays, on the roof.');
  check(w+': list heading h2', await p.getByRole('heading',{level:2,name:'Which Sunday?'}).isVisible());
  check(w+': eyebrow next up', await p.getByText(/Next up/).isVisible());
  const tix = p.getByRole('link',{name:/^Get tickets/});
  check(w+': hero tickets href', (await tix.getAttribute('href')).includes('aff=reels_'));
  const box = await p.getByRole('button',{name:/^(Sneak peek inside|Watch)$/}).boundingBox();
  check(w+': watch above fold', box && box.y+box.height < (w<500?852:900), JSON.stringify(box));
  await p.getByRole('button',{name:/^(Sneak peek inside|Watch)$/}).click(); await settle(p, 600);
  check(w+': watch opens this sunday', await p.getByText('This Sunday on the roof: doors at 2:30').first().isVisible());
  await animationsDone(p, 3000);
  const op = await p.evaluate(()=>getComputedStyle(document.querySelector('h1')).opacity);
  check(w+': title fully revealed', op==='1', op);
  await p.close();
}
const p = await b.newPage({viewport:{width:393,height:852}, reducedMotion:'reduce'});
await p.goto('http://localhost:3002/f/events'); await settle(p, 200);
check('reduced: title shown at once', await p.evaluate(()=>getComputedStyle(document.querySelector('h1')).opacity)==='1');
await p.goto('http://localhost:3002/f/medspa'); await settle(p, 200);
check('reduced: motes invisible', await p.locator('.cine-mote').first().evaluate(e=>getComputedStyle(e).opacity)==='0');
await b.close(); console.log(res.join('\n'));
