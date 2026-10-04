import { chromium, settle } from '../browser.mjs';
const res=[]; const check=(n,ok,x='')=>res.push((ok?'PASS':'FAIL')+'  '+n+(x?'  ('+x+')':''));
const errs=[]; const B='http://localhost:3002';
const b = await chromium.launch();
for (const [w,h,mobile] of [[393,852,true],[1440,900,false]]) {
  const ctx = await b.newContext({ timezoneId: 'America/Detroit',  storageState: process.argv[2] + '/auth.json', viewport:{width:w,height:h}, isMobile:mobile, hasTouch:mobile });
  const p = await ctx.newPage();
  p.on('pageerror',e=>errs.push(w+' '+e.message)); p.on('console',m=>{if(m.type()==='error' && !/youtube|ytimg|Failed to load resource/.test(m.text()))errs.push(w+' '+m.text())});
  const api=[]; await ctx.route('**/api/**', r=>{api.push(r.request().url()); r.fulfill({status:204});});
  await ctx.route(/example\.com/, r=>r.fulfill({status:200, contentType:'text/html', body:'<h1>Tickets</h1>'}));
  await ctx.route(/youtube-nocookie|ytimg/, r=>r.fulfill({status:200, contentType:'text/html', body:''}));
  await p.goto(B+'/f/events?src=instagram',{waitUntil:'networkidle'});
  check(w+': sample notice', await p.getByText('Golden Hour Sundays is not real').isVisible());
  check(w+': heading', await p.getByRole('heading',{name:'Which Sunday?'}).isVisible());
  const choices = await p.locator('main ul > li button').evaluateAll(els=>els.map(e=>e.getAttribute('aria-label')+' '+e.textContent));
  check(w+': 3 upcoming nights + recap', choices.length===4 && choices[3].includes('Watch last time'), choices.join(' | '));
  check(w+': whole cover fits the screen', await p.evaluate(()=>document.documentElement.scrollHeight<=innerHeight));
  check(w+': sold out shown after buyable dates', choices.findIndex(c => c.includes('Sold out')) > choices.findIndex(c => c.includes('Few left')), choices.join(' | '));
  check(w+': few left shown', choices.some(c => c.includes('Few left') && c.includes('Late Night')));
  check(w+': countdown on next', /Tonight|Tomorrow|In \d days|[A-Z][a-z]{2}, [A-Z][a-z]{2} \d+/.test(choices[0]), choices[0]);
  const coverTix = p.getByRole('link',{name:/^Get tickets/});
  const href = await coverTix.getAttribute('href');
  check(w+': cover ticket link tracked', href.includes('/this-sunday') && href.includes('aff=reels_instagram'), href);
  check(w+': no call button (no phone)', await p.getByRole('link',{name:/Call/}).count()===0);
  await p.screenshot({path:`events-cover-${w}.jpg`, quality:70});

  // This Sunday
  await p.locator('main ul > li button').first().click();
  const region = p.getByRole('region',{name:/Video: This Sunday on the roof/});
  check(w+': reel opens', await region.isVisible());
  check(w+': event chip on reel', await region.getByText(/Tonight|Tomorrow|In \d days|[A-Z][a-z]{2}, [A-Z][a-z]{2} \d+/).first().isVisible());
  const railTix = region.getByRole('link',{name:'Tickets',exact:true});
  check(w+': rail Tickets link', (await railTix.getAttribute('href')).includes('aff=reels_instagram') && (await railTix.getAttribute('target'))==='_blank');
  check(w+': pill Tickets', await region.getByRole('link',{name:/^Get tickets/}).first().isVisible());
  check(w+': Presale on rail, no Call', await region.getByRole('button',{name:'Presale',exact:true}).isVisible() && await region.getByRole('link',{name:'Call',exact:true}).count()===0);
  await p.screenshot({path:`events-reel-${w}.jpg`, quality:70});
  const [popup] = await Promise.all([ctx.waitForEvent('page'), railTix.click()]);
  await popup.waitForLoadState();
  check(w+': tickets open in new tab with code', popup.url().includes('example.com/tickets/golden-hour/this-sunday') && popup.url().includes('aff=reels_instagram'), popup.url());
  await popup.close();
  // Presale
  await region.getByRole('button',{name:'Presale',exact:true}).click();
  const sheet = p.getByRole('region',{name:'Get presale access'});
  check(w+': presale sheet', await sheet.isVisible() && await sheet.getByText('I agree that Golden Hour Sundays may text me').isVisible());
  await p.getByLabel('First name').fill('Sam'); await p.getByLabel('Mobile number').fill('3105550100');
  await sheet.getByRole('checkbox').check();
  await sheet.getByRole('button',{name:'Text me the presale'}).click();
  await p.getByText('Demo: nothing was sent').waitFor({timeout:3000});
  check(w+': presale simulated', true);
  await p.keyboard.press('Escape');
  await p.keyboard.press('Escape');

  // Recap: tickets point to the next night
  await p.getByRole('button',{name:/Watch last time/}).click();
  const recap = p.getByRole('region',{name:/Video: Last Sunday, in 30 seconds/});
  check(w+': recap reel', await recap.isVisible() && await recap.getByText(/^Recap/).isVisible());
  check(w+': recap sells next night', (await recap.getByRole('link',{name:'Tickets',exact:true}).getAttribute('href')).includes('/this-sunday'));
  await p.keyboard.press('Escape');
  // Sold out night: sells the next night on sale
  await p.locator('main ul > li button').filter({ hasText: 'Sold out' }).click();
  const so = p.getByRole('region',{name:/Video: Next Sunday is sold out/});
  check(w+': sold out reel chip', await so.getByText('Sold out',{exact:true}).isVisible());
  check(w+': sold out leads with the waitlist', await p.getByRole('button',{name:'Join the waitlist',exact:true}).count() >= 1);
  check(w+': sold out offers this Sunday, named', (await p.getByRole('link',{name:/^Get Oct \d+$/}).first().getAttribute('href')).includes('/this-sunday'));
  await p.keyboard.press('Escape');
  check(w+': nothing sent to APIs', api.length===0, api.join(','));

  // End card
  await p.goto(B+'/f/events?start=gh-presale',{waitUntil:'networkidle'});
  await p.keyboard.press('ArrowDown');
  const end = p.getByRole('region',{name:'See you on the roof?'});
  check(w+': end card', await end.isVisible() && await end.getByRole('link',{name:/^Get tickets/}).first().isVisible() && await end.getByRole('button',{name:'Presale'}).isVisible() && await end.getByRole('button',{name:'Send to the group chat'}).isVisible());
  await p.screenshot({path:`events-end-${w}.jpg`, quality:70});
  check(w+': OG image', (await p.request.get(B+'/f/events/opengraph-image')).status()===200);

  if (process.env.DEMO) {
  // Demo
  const demo = (await (await p.request.get(B+'/admin')).text()) && 'golden-hour-sundays-d132f7';
  await p.goto(B+`/f/${demo}?src=dm`,{waitUntil:'networkidle'});
  check(w+': demo labeled', await p.getByText('Private preview prepared for Golden Hour').isVisible());
  check(w+': demo noindex', (await p.locator('meta[name="robots"]').getAttribute('content')).includes('noindex'));
  await p.locator('main ul > li button').first().click();
  const dr = p.getByRole('region',{name:/Video:/});
  check(w+': demo reel uses uploaded clip', await dr.locator('video[src*="/demos/"]').count()===1);
  check(w+': demo tickets to their page with code', (await dr.getByRole('link',{name:'Tickets',exact:true}).getAttribute('href')).startsWith('https://www.eventbrite.com/e/your-event-id?aff=reels_dm'));
  const og = await p.request.get(B+`/f/${demo}/opengraph-image`);
  check(w+': demo OG image', og.status()===200);
  await p.screenshot({path:`demo-${w}.jpg`, quality:70});

  }
  // Admin
  await p.goto(B+'/admin',{waitUntil:'networkidle'});
  await p.selectOption('#admin-business','masquerade');
  await settle(p, 300);
  check(w+': admin shows Big Love reels', (await p.locator('section[aria-labelledby="order-title"] ol > li').count())===5);
  await p.goto(B+'/admin/links',{waitUntil:'networkidle'});
  check(w+': admin links for masquerade', (await p.getByLabel('Your link').textContent()).includes('/f/masquerade?src=instagram'));
  await ctx.close();
}
await b.close();
console.log(res.join('\n')); console.log('errors:', errs.length?errs.join('\n'):'none');
