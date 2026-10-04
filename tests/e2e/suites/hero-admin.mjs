import { chromium, settle } from '../browser.mjs';
const S = process.argv[2]; const res=[]; const check=(n,ok,x='')=>res.push((ok?'PASS':'FAIL')+'  '+n+(x?'  ('+x+')':''));
const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==','base64');
const b = await chromium.launch();
for (const [w,h] of [[390,844],[1279,900]]) {
  const ctx = await b.newContext({ timezoneId: 'America/Detroit',  storageState: process.argv[2] + '/auth.json', viewport:{width:w,height:h}, isMobile:w<500, hasTouch:w<500, deviceScaleFactor:w<500?2:1});
  await ctx.route(/i\.ytimg\.com|example\.com/, r=>r.fulfill({status:200, contentType:'image/png', body:png}));
  const p = await ctx.newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  await p.goto('http://localhost:3002/admin'); await settle(p, 500);
  await p.selectOption('#admin-business', 'masquerade'); await settle(p, 900);
  const card = p.locator('section[aria-labelledby="hero-media-title"]');
  check(w+': card shows the live flyer photo', await card.getByText('Photo',{exact:true}).isVisible());
  const add = await p.getByRole('button',{name:'Add reel',exact:true}).boundingBox();
  const cb = await card.boundingBox();
  check(w+': main action + card on screen', add.y+add.height<=h && cb.y+cb.height<=h, JSON.stringify({add:add.y,card:cb.y+cb.height}));
  await p.screenshot({path:`${S}/hero-admin-${w}.jpg`});
  // Swap: paste a photo link
  await card.getByRole('button',{name:'Edit',exact:true}).click();
  const dlg = p.locator('dialog[open]');
  await dlg.getByRole('button',{name:'Paste a link'}).click().catch(()=>{});
  await dlg.getByPlaceholder(/youtube\.com\/shorts/).fill('https://example.com/rooftop.jpg');
  await p.screenshot({path:`${S}/hero-dialog-${w}.jpg`});
  const sv = await dlg.getByRole('button',{name:'Save',exact:true}).boundingBox(); check(w+': Save in view without scrolling', sv.y+sv.height<=h, String(sv.y+sv.height));
  await dlg.getByRole('button',{name:'Save',exact:true}).click(); await settle(p, 400);
  check(w+': swapped to photo', await card.getByText(/Photo\s*·\s*not published/).isVisible());
  check(w+': "Opening screen saved" shown', await p.getByRole('status').filter({hasText:'Opening screen saved'}).isVisible());
  // Swap again: upload a video
  await card.getByRole('button',{name:'Edit',exact:true}).click();
  await dlg.getByRole('group',{name:'Add media by'}).getByRole('button',{name:'Upload'}).click();
  await dlg.getByLabel('Upload a video or photo').setInputFiles(S+'/sample-reel.webm');
  await dlg.getByRole('button',{name:'Save',exact:true}).click(); await settle(p, 500);
  check(w+': uploaded video attached', await card.getByText(/Video\s*·\s*not published/).isVisible());
  await p.reload(); await settle(p, 1500);
  check(w+': upload survives reload', await card.getByText(/Video\s*·\s*not published/).isVisible());
  // Remove + Undo
  await card.getByRole('button',{name:'Remove background'}).click(); await settle(p, 300);
  check(w+': removed', await card.getByText('No background: your brand colors').isVisible());
  await p.getByRole('status').getByRole('button',{name:'Undo'}).click(); await settle(p, 300);
  check(w+': undo restores', await card.getByText(/Video\s*·\s*not published/).isVisible());
  // Remove, reload: stays removed
  await card.getByRole('button',{name:'Remove background'}).click(); await settle(p, 400);
  await p.reload(); await settle(p, 1200);
  check(w+': removal survives reload', await card.getByText(/No background/).isVisible() && await card.getByRole('button',{name:'Remove background'}).count()===0);
  // Reset to live
  await p.getByRole('region',{name:'Publish'}).getByRole('button',{name:'Discard'}).click(); await settle(p, 400);
  check(w+': reset brings back the live flyer photo', await card.getByText('Photo',{exact:true}).isVisible());
  check(w+': fits width', await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  check(w+': no errors', !errs.length, errs.join('|'));
  await ctx.close();
}
await b.close(); console.log(res.join('\n'));
