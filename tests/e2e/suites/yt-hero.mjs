import { animationsDone, chromium, settle } from '../browser.mjs';
import { readFileSync } from 'node:fs';
const res=[]; const check=(n,ok,x='')=>res.push((ok?'PASS':'FAIL')+'  '+n+(x?'  ('+x+')':''));
const png = readFileSync(process.argv[2] + '/sample-photo.png');
// A stand-in YouTube player: animated stripes, reports "playing" once told to play, records commands.
const player = `<!doctype html><body style="margin:0;background:linear-gradient(160deg,#f5b85a,#b4461a 50%,#1a120d)"><script>
window.cmds=[];addEventListener('message',e=>{const d=JSON.parse(e.data);parent.postMessage(JSON.stringify({event:'cmd',func:d.func||d.event}),'*');
if(d.func==='playVideo')parent.postMessage(JSON.stringify({event:'infoDelivery',info:{playerState:1}}),'*');});</script></body>`;
const b = await chromium.launch();
for (const [w,h] of [[412,915],[1440,900]]) {
  const ctx = await b.newContext({viewport:{width:w,height:h}, deviceScaleFactor: w<500?2:1});
  await ctx.route(/i\.ytimg\.com/, r=>r.fulfill({status:200, contentType:'image/png', body:png}));
  let embedUrl='';
  await ctx.route(/youtube-nocookie\.com/, r=>{embedUrl=r.request().url(); r.fulfill({status:200, contentType:'text/html', body:player})});
  const p = await ctx.newPage(); const errs=[];
  p.on('pageerror', e=>errs.push(e.message)); p.on('console', m=>{if(m.type()==='error')errs.push(m.text())});
  const cmds=[]; await p.exposeFunction('logCmd', c=>cmds.push(c));
  await p.addInitScript(()=>addEventListener('message',e=>{try{const d=JSON.parse(e.data); if(d.event==='cmd') window.logCmd(d.func)}catch{}}));
  await p.goto('http://localhost:3002/f/events'); await settle(p, 3500);
  check(w+': embed is the Short', embedUrl.includes('/embed/8U1ok3oEq8Q'), embedUrl.slice(0,70));
  check(w+': embed muted + loops', /mute=1/.test(embedUrl) && /loop=1/.test(embedUrl) && /playlist=8U1ok3oEq8Q/.test(embedUrl));
  await animationsDone(p, 3000);
  const fr = p.locator('iframe[title="Background video"]');
  check(w+': player faded in once playing', await fr.evaluate(e=>getComputedStyle(e).opacity)==='1');
  const [fb, hb] = [await fr.boundingBox(), await fr.evaluate(e=>{const r=e.closest('[aria-hidden=true]').getBoundingClientRect(); return {x:r.x,y:r.y,width:r.width,height:r.height}})];
  check(w+': player covers the scene', fb.x<=hb.x && fb.y<=hb.y && fb.x+fb.width>=hb.x+hb.width && fb.y+fb.height>=hb.y+hb.height, JSON.stringify({fb,hb}));
  check(w+': taps go to the page, not YouTube', await p.getByRole('button',{name:/^(Sneak peek inside|Watch)$/}).isVisible());
  await p.screenshot({path:`yt-hero-${w}.jpg`, quality:80});
  await p.getByRole('button',{name:/^(Sneak peek inside|Watch)$/}).click(); await settle(p, 700);
  check(w+': paused while a reel plays', cmds.includes('pauseVideo'), cmds.join(','));
  check(w+': no errors', errs.length===0, errs.join(' | '));
  await ctx.close();
}
// Reduced motion: thumbnail only, no player.
const ctx = await b.newContext({viewport:{width:412,height:915}, reducedMotion:'reduce'});
await ctx.route(/i\.ytimg\.com/, r=>r.fulfill({status:200, contentType:'image/png', body:png}));
const p = await ctx.newPage(); await p.goto('http://localhost:3002/f/events'); await settle(p, 800);
check('reduced: no player, thumbnail shown', await p.locator('iframe[title="Background video"]').count()===0 && await p.locator('img[src*="ytimg"]').count()===1);
await b.close(); console.log(res.join('\n'));
