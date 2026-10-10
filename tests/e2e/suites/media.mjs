import { chromium, settle } from '../browser.mjs';
const res=[]; const check=(n,ok,x='')=>res.push((ok?'PASS':'FAIL')+'  '+n+(x?'  ('+x+')':''));
const errs=[]; const B='http://localhost:3002'; const D=process.cwd();
const b = await chromium.launch();
for (const [w,h] of [[1279,900],[390,844]]) {
  const mobile=w<1024;
  const ctx = await b.newContext({ storageState: process.argv[2] + '/auth.json', viewport:{width:w,height:h}, isMobile:mobile, hasTouch:mobile });
  const p = await ctx.newPage();
  p.on('pageerror',e=>errs.push(w+' '+e.message));
  p.on('console',m=>{ if(m.type()==='error' && !/ytimg|youtube|ERR_|Failed to load resource/.test(m.text())) errs.push(w+' '+m.text())});
  const api=[]; await p.route('**/api/**', r=>{api.push(r.request().url()); r.fulfill({status:204});});
  // YouTube is unreachable here; answer with an empty page so the frame loads.
  await p.route(/youtube-nocookie\.com/, r=>r.fulfill({status:200, contentType:'text/html', body:'<html></html>'}));
  await p.route(/ytimg\.com/, r=>r.fulfill({status:200, contentType:'image/png', path: D+'/sample-photo.png'}));
  await p.goto(B+'/admin',{waitUntil:'networkidle'});
  // Big Love's event, and no demos or sample businesses to switch to.
  const picker = p.locator('#admin-business');
  check(w+': Big Love by default', (!(await picker.count()) || await picker.inputValue()==='masquerade') && (await p.locator('section[aria-labelledby="order-title"] ol > li').count())===5);
  // Other suites' events and clients can linger in the app's event list cache: Big Love's group comes first, and there are no demos.
  const groups = await picker.count() ? (await picker.locator('optgroup').evaluateAll((gs) => gs.map((g) => g.label + ': ' + [...g.children].map((o) => o.textContent).join(', ')))).join(' | ') : await p.locator('nav').innerText();
  check(w+': clients only, no demos', /Big Love/.test(groups) && !/Demos|Aurelia/.test(groups), groups);
  for (const [path, text] of [['/admin/overview','Big Love Productions'],['/admin/leads','Leads'],['/admin/links','/f/masquerade?src=instagram']]) {
    await p.goto(B+path,{waitUntil:'networkidle'});
    const body = await p.locator('main').textContent();
    check(w+`: ${path} shows Big Love`, body.includes(text) && !/sample/i.test(body), text);
    check(w+`: ${path} fits`, await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  }
  await p.goto(B+'/admin',{waitUntil:'networkidle'});

  // Edit a reel: paste a YouTube link
  const first = (await p.locator('section[aria-labelledby="order-title"] ol > li p.font-bold').first().textContent());
  await p.getByRole('button',{name:`Edit ${first}`}).click();
  const dlg = p.getByRole('dialog');
  check(w+': interest select', await dlg.getByText('Interest',{exact:true}).isVisible() && (await dlg.locator('select').first().locator('option').allTextContents()).includes('Fashion show'));
  await dlg.getByRole('button',{name:'Paste a link'}).click();
  await dlg.getByLabel('Link').fill('https://www.instagram.com/reel/abc123/');
  await dlg.getByRole('button',{name:'Use link'}).click();
  check(w+': instagram explained', (await dlg.getByRole('alert').first().textContent()).includes("don't allow"));
  await dlg.getByLabel('Link').fill('https://youtube.com/shorts/dQw4w9WgXcQ?feature=share');
  await dlg.getByRole('button',{name:'Use link'}).click();
  check(w+': youtube accepted', await dlg.getByText("privacy-enhanced player").isVisible() && await dlg.locator('img[src*="dQw4w9WgXcQ"]').count()===1);
  await dlg.getByRole('button',{name:'Save reel'}).click();
  check(w+': row tagged YouTube', (await p.locator('section[aria-labelledby="order-title"] ol > li').first().textContent()).includes('YouTube'));

  // Upload: video, then a photo, and a wrong file type (on reels with no media yet)
  const second = (await p.locator('section[aria-labelledby="order-title"] ol > li p.font-bold').nth(2).textContent());
  await p.getByRole('button',{name:`Edit ${second}`}).click();
  const d2 = p.getByRole('dialog');
  await d2.getByLabel('Upload a video or photo').setInputFiles(D+'/notes.txt');
  check(w+': wrong file type explained', (await d2.getByRole('alert').first().textContent()).includes('Upload a video'));
  await d2.getByLabel('Upload a video or photo').setInputFiles(D+'/sample-reel.mp4');
  check(w+': mp4 accepted', await d2.getByText('sample-reel.mp4').isVisible() && await d2.getByText('Cover image').isVisible());
  await d2.getByLabel('Upload a video or photo').setInputFiles(D+'/sample-reel.webm');
  await settle(p, 500);
  check(w+': webm preview loads', await d2.locator('video').evaluate(v=>v.readyState>=1 && !v.error));
  await p.screenshot({path:`media-dialog-${w}.jpg`, quality:70});
  await d2.getByRole('button',{name:'Save reel'}).click();
  check(w+': row tagged as video', !(await p.locator('section[aria-labelledby="order-title"] ol > li').nth(2).textContent()).includes('No video yet'));
  const third = (await p.locator('section[aria-labelledby="order-title"] ol > li p.font-bold').nth(3).textContent());
  await p.getByRole('button',{name:`Edit ${third}`}).click();
  await p.getByRole('dialog').getByLabel('Upload a video or photo').setInputFiles(D+'/sample-photo.png');
  await p.getByRole('dialog').getByRole('button',{name:'Save reel'}).click();
  check(w+': row tagged Photo', (await p.locator('section[aria-labelledby="order-title"] ol > li').nth(3).textContent()).includes('Photo'));

  // Preview edits in the real viewer
  await p.getByRole('button',{name:'Preview',exact:true}).click();
  const viewer = p.getByRole('dialog',{name:/Video:/});
  await viewer.waitFor();
  const frame = viewer.locator('iframe');
  check(w+': youtube plays in nocookie player', (await frame.getAttribute('src'))?.startsWith('https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ?enablejsapi=1'));
  check(w+': rail in preview', await viewer.getByRole('link',{name:'Tickets',exact:true}).isVisible() && await viewer.getByRole('button',{name:'Share',exact:true}).isVisible());
  check(w+': no like button', await viewer.getByRole('button',{name:/^Liked?$/}).count()===0);
  await p.screenshot({path:`preview-yt-${w}.jpg`, quality:70});
  await p.keyboard.press('Escape');
  await p.getByRole('button',{name:`Preview ${second}`}).click();
  const vid = p.getByRole('dialog',{name:/Video:/}).locator('video');
  await vid.waitFor({timeout:3000});
  await settle(p, 800);
  check(w+': uploaded video plays', await vid.evaluate(v=>!v.paused && v.readyState>=2));
  await p.screenshot({path:`preview-video-${w}.jpg`, quality:70});
  await p.keyboard.press('Escape');
  await p.getByRole('button',{name:`Preview ${third}`}).click();
  await settle(p, 300);
  check(w+': photo reel shows', await p.getByRole('dialog',{name:/Video:/}).locator('img[src^="blob:"]').evaluate(i=>i.complete && i.naturalWidth>0));
  // Only the admin's own reads (what's live, its results); no tracking or leads.
  check(w+': preview sends nothing', api.filter(u=>!u.includes('/api/admin/publish?slug=') && !u.includes('/api/admin/stats?') && !u.includes('/api/admin/leads?') && !u.includes('/api/admin/fans/counts?')).length===0, api.join(','));
  await p.keyboard.press('Escape');

  check(w+': still Big Love', (await p.locator('section[aria-labelledby="order-title"] ol > li').count())===5 && await p.getByLabel('Funnel name').inputValue()==='Masquerade on the Runway');
  await ctx.close();
}
await b.close();
console.log(res.join('\n')); console.log('errors:', errs.length?errs.join('\n'):'none');
