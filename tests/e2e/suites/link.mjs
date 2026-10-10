// The funnel link a visitor opens, on a call-first link that isn't live yet
// (a preview: forms simulate, but tracking is real), plus the admin's link
// builder. A book-first link is in book-first.mjs, and Big Love's live
// event in client-link.mjs.
import { chromium } from '../browser.mjs';
const res=[]; const check=(n,ok,x='')=>res.push((ok?'PASS':'FAIL')+'  '+n+(x?'  ('+x+')':''));
const errs=[];
const B='http://localhost:3002'; const M='http://localhost:54321';
const b = await chromium.launch();
const sizes = [[390,844],[1440,900]];
const contextFor = (w,h) => { const mobile = w<1024; return b.newContext({ storageState: process.argv[2] + '/auth.json', viewport:{width:w,height:h}, isMobile:mobile, hasTouch:mobile, deviceScaleFactor: mobile?2:1 }); };
const watch = (p,w) => { p.on('pageerror',e=>errs.push(w+' '+e.message)); p.on('console',m=>{if(m.type()==='error')errs.push(w+' '+m.text())}); };

// 1. Admin links, first: the preview link below is added straight to the
// database afterwards, so it never lands in the admin's cached event list.
for (const [w,h] of sizes) {
  const ctx = await contextFor(w,h);
  await ctx.addInitScript(() => { if (!localStorage.getItem('admin_business')) localStorage.setItem('admin_business', 'masquerade'); });
  const p = await ctx.newPage(); watch(p,w);
  await p.goto(B+'/admin/links',{waitUntil:'networkidle'});
  check(w+': link builder default', (await p.getByLabel('Your link').textContent()).endsWith('/f/masquerade?src=instagram'));
  await p.selectOption('#link-source','__custom'); await p.fill('#link-custom','Bus Bench');
  await p.selectOption('#link-start','mr-runway');
  const link = await p.getByLabel('Your link').textContent();
  check(w+': custom tag + start', link.endsWith('/f/masquerade?src=bus-bench&start=mr-runway'), link);
  check(w+': says what Results will call it', await p.getByText('Shows in Results as “Bus Bench” once you copy or open the link.').isVisible() || await p.getByText('Shows in Results as “Bus Bench”.').isVisible());
  await p.fill('#link-custom', "DJ Mike's story");
  check(w+': any words make a tag', (await p.getByLabel('Your link').textContent()).includes('?src=dj-mikes-story&'), await p.getByLabel('Your link').textContent());
  await p.getByRole('button', { name: 'Copy link' }).click();
  await p.getByText(/Shows in Results as “DJ Mike's story”\./).waitFor({ timeout: 5000 }).catch(() => {});
  check(w+': copying saves the name as typed', await p.getByText(/Shows in Results as “DJ Mike's story”\./).isVisible());
  await p.fill('#link-custom', 'dj mikes story');
  check(w+': the same link under another name says it renames', await p.getByText('Same link as “DJ Mike\'s story”. Copying it renames it “dj mikes story”.').isVisible());
  await p.fill('#link-custom', 'IG');
  check(w+': another name for a place counts there', await p.getByText('That\'s the same as “Instagram bio”, so it counts there.').isVisible() && (await p.getByLabel('Your link').textContent()).includes('?src=instagram&'));
  await p.fill('#link-custom', 'Bus Bench');
  check(w+': start explained', await p.getByText('Opens on “Haute couture Halloween looks”').isVisible());
  if (w === 390) {
    const names = await p.request.get(B + '/api/admin/source-names?slug=masquerade');
    check('the name is saved for the organizer', (await names.json()).names?.['dj-mikes-story'] === "DJ Mike's story");
    check("a builder place's name can't be changed", (await p.request.put(B + '/api/admin/source-names', { data: { slug: 'masquerade', tag: 'instagram', name: 'Mine' } })).status() === 400);
    check('a tag must be a tag', (await p.request.put(B + '/api/admin/source-names', { data: { slug: 'masquerade', tag: 'Not A Tag', name: 'x' } })).status() === 400);
  }
  check(w+': admin fits width', await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  await p.screenshot({path:`admin-links-${w}.jpg`, quality:70, fullPage:true});
  await ctx.close();
}

// 2. A call-first link that isn't live yet: one of Big Love's, made for this test.
const reels = [
  { id: 'vr-tables', practiceArea: 'Tables', title: 'How bottle service tables work', summary: 'Minimums, how many people fit, and when to book.' },
  { id: 'vr-dress-code', practiceArea: 'Dress code', title: 'What to wear, and what gets turned away', summary: 'The dress code at the door, in thirty seconds.' },
  { id: 'vr-parking', practiceArea: 'Getting here', title: 'Parking and the side entrance', summary: 'Where to park and which door to use.' },
  { id: 'vr-birthdays', practiceArea: 'Birthdays', title: 'Birthday packages, start to finish', summary: 'What comes with each package and how to reserve one.' },
];
const preview = {
  id: 'velvet-room-v1', slug: 'velvet-room', live: false,
  brand: {
    name: 'The Velvet Room', logo: { kind: 'wordmark', text: 'Velvet Room' },
    phone: { display: '(313) 555-0142', href: 'tel:+13135550142' },
    theme: { '--deep-navy': '#1B0F1F', '--royal-blue': '#3A1D44', '--teal-accent': '#D9A441', '--on-accent': '#1B0F1F', '--sky-accent': '#E7B8F0', '--soft-gray': '#F6F1F4' },
    services: ['Tables', 'Dress code', 'Getting here', 'Birthdays'],
    smsConsent: 'I agree that The Velvet Room may text me at this number about tables and events. Up to 4 messages a month. Msg & data rates may apply. Reply STOP to opt out.',
    seriesLabel: 'Velvet Room nights', disclaimer: '21+ with ID.', footer: '21+ with ID. Tables are held for 15 minutes.',
    copy: {
      bookPrimary: 'Reserve a table', callBack: 'Call back', callNow: 'Call now', coverCallPrompt: 'Want a table tonight?', coverCall: 'Call the host stand',
      book: { heading: 'Get a call back', intro: 'Leave your number and the host calls you to hold a table.', submit: 'Request my call back' },
      bookDone: 'Thanks, {name}. We will call {phone} soon.',
      textLater: { heading: 'Not ready to call?', intro: 'We can text you the next video instead.', submit: 'Text me the next video' },
      textLaterDone: 'Thanks, {name}. The next video is on its way to {phone}.',
      formFinePrint: 'No spam: table and event news only.',
      endHeading: 'Still have a question?', endBody: 'The host stand picks up from 6pm.',
      shareButton: 'Send to the group chat', shareText: 'The Velvet Room: tables, dress code and birthdays.',
    },
  },
  reels, primaryCta: 'call',
  cover: { heading: 'What do you want to know?', intro: 'Pick one. Short videos from the host stand.', entryLabels: { 'vr-tables': 'Tables', 'vr-dress-code': 'Dress code', 'vr-birthdays': 'Birthdays' } },
  entryReelIds: ['vr-tables', 'vr-dress-code', 'vr-birthdays'],
  links: {
    'vr-tables': { completed: null, skipped: 'vr-dress-code' },
    'vr-dress-code': { completed: 'vr-parking', skipped: 'vr-birthdays' },
    'vr-parking': { completed: null, skipped: null },
    'vr-birthdays': { completed: 'vr-tables', skipped: null },
  },
};
const added = await fetch(M+'/__event', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ slug: preview.slug, funnel_id: preview.id, organizer_slug: 'biglove', data: preview }) });
check('preview link added', added.ok, String(added.status));

for (const [w,h] of sizes) {
  const ctx = await contextFor(w,h);
  const p = await ctx.newPage(); watch(p,w);
  const events=[]; const leads=[];
  await p.route('**/api/reel-events', r=>{ events.push(JSON.parse(r.request().postData()||'{}')); r.fulfill({status:204}); });
  await p.route('**/api/leads', r=>{ leads.push(r.request().postData()); r.fulfill({status:201, contentType:'application/json', body:'{"ok":true}'}); });
  await p.clock.install();
  await p.goto(B+'/f/velvet-room?src=Instagram',{waitUntil:'networkidle'});
  check(w+': cover heading', await p.getByRole('heading',{name:'What do you want to know?'}).isVisible());
  check(w+': cover heading is white', await p.locator('h1').evaluate(e=>getComputedStyle(e).color)==='rgb(255, 255, 255)');
  check(w+': not-live note', await p.getByText("Preview of The Velvet Room's link. Not live yet.").isVisible());
  const topics = await p.locator('main ul button').allTextContents();
  check(w+': 3 topic choices', topics.join('|')==='Tables|Dress code|Birthdays', topics.join('|'));
  check(w+': cover call link', await p.getByRole('link',{name:/Call the host stand/}).getAttribute('href')==='tel:+13135550142');
  check(w+': cover fits width', await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  check(w+': no site header/footer', await p.locator('header, footer').count()===0);
  await p.screenshot({path:`link-cover-${w}.jpg`, quality:70});

  await p.getByRole('button',{name:'Tables'}).click();
  const region = p.getByRole('region',{name:/Video: How bottle service tables work/});
  check(w+': reel opens full screen', await region.isVisible());
  const callNow = region.getByRole('link',{name:/Call now: \(313\) 555-0142/});
  check(w+': primary CTA is call', await callNow.isVisible() && await callNow.getAttribute('href')==='tel:+13135550142');
  check(w+': call-back + text-later buttons', await region.getByRole('button',{name:'Call back',exact:true}).isVisible() && await region.getByRole('button',{name:'Text me',exact:true}).isVisible());
  check(w+': CTAs inside viewport', await p.evaluate(()=>{const r=[...document.querySelectorAll('button')].find(b=>b.textContent==='Text me' && b.offsetParent).getBoundingClientRect(); return r.bottom<=innerHeight && r.top>0;}));
  await p.screenshot({path:`link-reel-${w}.jpg`, quality:70});
  await p.clock.runFor(1000);
  check(w+': viewed event carries src', events.some(e=>e.event==='viewed' && e.funnelId==='velvet-room-v1' && e.reelId==='vr-tables' && e.sourceTag==='instagram'), JSON.stringify(events[0]));

  // Call-back form
  await region.getByRole('button',{name:'Call back',exact:true}).click();
  check(w+': cta_clicked logged', events.some(e=>e.event==='cta_clicked'));
  const sheet = p.getByRole('region',{name:'Get a call back'});
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
  await p.getByLabel('Mobile number').fill('(313) 555-0100');
  await sheet.getByRole('button',{name:'Request my call back'}).click();
  await p.getByText('Demo: nothing was sent').waitFor({timeout:3000});
  check(w+': preview simulates the request', true);
  await p.screenshot({path:`link-sheet-done-${w}.jpg`, quality:70});
  await p.getByRole('button',{name:'Keep watching'}).click();
  check(w+': sheet closed, reel still there', await sheet.count()===0 && await region.isVisible());

  // Text me later
  await region.getByRole('button',{name:'Text me',exact:true}).click();
  const tsheet = p.getByRole('region',{name:'Not ready to call?'});
  check(w+': text-later sheet', await tsheet.isVisible());
  check(w+': text_later_clicked logged', events.some(e=>e.event==='text_later_clicked'));
  check(w+': no email field', await tsheet.getByLabel(/Email/).count()===0);
  await p.getByLabel('First name').fill('Pat');
  await p.getByLabel('Mobile number').fill('3135550100');
  await p.screenshot({path:`link-text-${w}.jpg`, quality:70});
  await tsheet.getByRole('button',{name:'Text me the next video'}).click();
  check(w+': consent required', await p.getByText('Demo: nothing was sent').count()===0 && await tsheet.isVisible());
  check(w+': consent names the business', await tsheet.getByText('I agree that The Velvet Room may text me').isVisible());
  await tsheet.getByRole('checkbox').check();
  await tsheet.getByRole('button',{name:'Text me the next video'}).click();
  await p.getByText('Demo: nothing was sent').waitFor({timeout:3000});
  check(w+': text-later simulated', true);
  check(w+': no lead sent from a preview', leads.length===0, leads.join(' | ').slice(0,200));
  await p.keyboard.press('Escape');
  check(w+': Escape closes sheet only', await tsheet.count()===0 && await region.isVisible());

  // Finish the reel -> end card (tables completed -> end)
  await p.clock.runFor(9000);
  const end = p.getByRole('region',{name:'Still have a question?'});
  check(w+': end card', await end.isVisible());
  check(w+': end card CTAs + share', await end.getByRole('link',{name:/Call now/}).isVisible() && await end.getByRole('button',{name:'Send to the group chat'}).isVisible());
  await p.screenshot({path:`link-end-${w}.jpg`, quality:70});
  await end.getByRole('button',{name:'Pick another topic'}).click();
  check(w+': back to topics', await p.getByRole('heading',{name:'What do you want to know?'}).isVisible() && await p.getByRole('region').count()===0);

  // Return visit without a tag keeps the last source; ?start opens a reel
  events.length=0;
  await p.goto(B+'/f/velvet-room?start=vr-parking',{waitUntil:'networkidle'});
  check(w+': ?start opens that reel', await p.getByRole('region',{name:/Parking and the side entrance/}).isVisible());
  await p.clock.runFor(500);
  check(w+': remembered src on return', events.some(e=>e.reelId==='vr-parking' && e.sourceTag==='instagram'), JSON.stringify(events[0]));
  await p.goto(B+'/f/velvet-room?start=not-a-reel',{waitUntil:'networkidle'});
  check(w+': bad ?start shows cover', await p.getByRole('heading',{name:'What do you want to know?'}).isVisible());
  await ctx.close();
}
// A link without a tag (the bio link) is credited to where it was opened from.
for (const [name, opts, want] of [
  ['opened in Instagram', { userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148 Instagram 350.0.0' }, 'instagram'],
  ['opened in TikTok', { userAgent: 'Mozilla/5.0 (iPhone) AppleWebKit/605.1.15 Mobile/15E148 musical_ly_35.0 BytedanceWebview' }, 'tiktok'],
  ['from Facebook', { referer: 'https://l.facebook.com/' }, 'facebook'],
  ['from Google', { referer: 'https://www.google.com/' }, 'google-search'],
  ['typed in', {}, undefined],
]) {
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, ...(opts.userAgent ? { userAgent: opts.userAgent } : {}) });
  const p = await ctx.newPage(); watch(p, name);
  const events = [];
  await p.route('**/api/reel-events', (r) => { events.push(JSON.parse(r.request().postData() || '{}')); r.fulfill({ status: 204 }); });
  await p.goto(B + '/f/velvet-room?start=vr-parking', { waitUntil: 'networkidle', ...(opts.referer ? { referer: opts.referer } : {}) });
  await p.waitForTimeout(800);
  check(`untagged, ${name}: credited to ${want ?? 'no tag'}`, events.length > 0 && events.every((e) => e.sourceTag === want), JSON.stringify(events.map((e) => e.sourceTag)));
  await ctx.close();
}
await b.close();
console.log(res.join('\n')); console.log('errors:', errs.length? errs.join('\n'):'none');
