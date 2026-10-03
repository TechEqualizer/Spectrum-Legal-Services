import { chromium } from 'playwright';
const S = process.argv[2]; const res=[]; const check=(n,ok,x='')=>res.push((ok?'PASS':'FAIL')+'  '+n+(x?'  ('+x+')':''));
const b = await chromium.launch();
const ctx = await b.newContext({ timezoneId: 'America/Detroit',  storageState: process.argv[2] + '/auth.json', viewport:{width:390,height:844}, isMobile:true, hasTouch:true, deviceScaleFactor:2});
await ctx.route(/i\.ytimg\.com/, r=>r.fulfill({status:200, contentType:'image/png', body:Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==','base64')}));
const p = await ctx.newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
await p.goto('http://localhost:3002/admin'); await p.waitForTimeout(600);
await p.selectOption('#admin-business', 'masquerade'); await p.waitForTimeout(800);
const rows = p.locator('section[aria-labelledby="order-title"] ol > li');
const row = () => rows.filter({ hasText: 'Burlesque' });
check('starts on live reels', await p.getByText(/Live\s*·\s*original reels/).isVisible());
// 1. Type a link (no paste event), Save straight away
await p.getByRole('button',{name:'Edit Burlesque, performances and a live DJ'}).click();
await p.getByRole('button',{name:'Paste a link'}).click();
await p.getByPlaceholder(/youtube\.com\/shorts/).fill('https://youtube.com/shorts/8U1ok3oEq8Q?is=2HF7V6Tv8s5Rg3nB');
await p.getByRole('button',{name:'Save reel'}).click(); await p.waitForTimeout(400);
check('typed link saved without "Use link"', await row().getByText('YouTube').isVisible() && !(await row().getByText('No video yet').isVisible()));
check('"Reel saved" confirmation', await p.getByRole('status').filter({hasText:'Reel saved'}).isVisible());
check('save time shown', await p.getByRole('region',{name:'Publish'}).getByText('Unpublished edits').isVisible());
// 2. Rename + reorder, then reload
await p.getByRole('button',{name:"Move Burlesque, performances and a live DJ up"}).click(); await p.waitForTimeout(300);
await p.reload(); await p.waitForTimeout(1200);
check('after reload: still masquerade', (await p.locator('#admin-business').inputValue())==='masquerade');
check('after reload: order kept', (await rows.nth(1).textContent()).includes('Burlesque'));
const r2 = p.locator('section[aria-labelledby="order-title"] ol > li').nth(1);
check('after reload: YouTube link kept', await r2.getByText('YouTube').isVisible());
// 3. Upload a video file, reload
await r2.getByRole('button',{name:/^Edit /}).click();
await p.getByRole('group',{name:'Add media by'}).getByRole('button',{name:'Upload'}).click();
await p.getByLabel('Upload a video or photo').setInputFiles(S+'/sample-reel.webm');
await p.getByRole('button',{name:'Save reel'}).click(); await p.waitForTimeout(400);
check('upload saved', await r2.getByText('No video yet').count()===0);
await p.waitForTimeout(500); await p.reload(); await p.waitForTimeout(1500);
const r2b = p.locator('section[aria-labelledby="order-title"] ol > li').nth(1);
check('after reload: uploaded video kept', !(await r2b.getByText('No video yet').isVisible()) && !(await r2b.getByText('YouTube').isVisible()));
await r2b.getByRole('button',{name:/^Preview /}).click(); await p.waitForTimeout(1000);
check('preview plays the uploaded file', await p.evaluate(()=>{const v=document.querySelector('[role=dialog] video'); return !!v && v.src.startsWith('blob:')}));
await p.keyboard.press('Escape'); await p.waitForTimeout(400);
// Other businesses untouched
await p.selectOption('#admin-business','jlf'); await p.waitForTimeout(800);
check('other business untouched', await p.getByText(/Live\s*·\s*original reels/).isVisible());
await p.selectOption('#admin-business', 'masquerade'); await p.waitForTimeout(1000);
// 4. Reset
await p.getByRole('region',{name:'Publish'}).getByRole('button',{name:'Discard'}).click(); await p.waitForTimeout(400);
check('reset: back to live', (await rows.nth(2).textContent()).includes('Burlesque') && await row().getByText('No video yet').isVisible() && (await rows.first().textContent()).includes('Masks on'));
await p.reload(); await p.waitForTimeout(1200);
check('reset survives reload', await p.getByText(/Live\s*·\s*original reels/).isVisible());
// 5. Nav
const tabs = p.locator('nav ul a');
check('5 tabs', await tabs.count()===5, (await tabs.allTextContents()).join(','));
const boxes = await tabs.evaluateAll(as=>as.map(a=>{const r=a.getBoundingClientRect(); return [r.left,r.right,r.bottom]}));
check('all tabs on screen at the bottom', boxes.every(([l,r,bt])=>l>=0 && r<=390 && bt<=844 && bt>780), JSON.stringify(boxes));
check('current tab marked', (await p.locator('nav [aria-current=page]').textContent())==='Reels');
await p.screenshot({path:S+'/admin-reels-390.jpg'});
await p.getByRole('link',{name:'Results'}).click(); await p.waitForTimeout(800);
check('Results page title matches', (await p.getByRole('heading',{level:1}).textContent()).trim()==='Results');
check('no errors', !errs.length, errs.join('|'));
await b.close(); console.log(res.join('\n'));
