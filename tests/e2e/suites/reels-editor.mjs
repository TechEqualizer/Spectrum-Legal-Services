import { chromium } from 'playwright';
const res=[]; const check=(n,ok,x='')=>res.push((ok?'PASS':'FAIL')+'  '+n+(x?'  ('+x+')':''));
const errs=[]; const B='http://localhost:3002';
const b = await chromium.launch();
for (const [w,h] of [[390,844],[1279,900]]) {
  const mobile=w<1024;
  const p = await b.newPage({ storageState: process.argv[2] + '/auth.json', viewport:{width:w,height:h}, isMobile:mobile, hasTouch:mobile, deviceScaleFactor: mobile?2:1 });
  // These checks use the JLF demo; organizers' events come first by default.
  await p.addInitScript(() => { if (!localStorage.getItem('admin_business')) localStorage.setItem('admin_business', 'jlf'); });
  p.on('pageerror',e=>errs.push(w+' '+e.message)); p.on('console',m=>{if(m.type()==='error' && !m.text().includes('404'))errs.push(w+' '+m.text())});
  await p.goto(B+'/admin',{waitUntil:'networkidle'});
  const rows = p.locator('section[aria-labelledby="order-title"] ol > li');
  const titles = async()=> (await rows.locator('p.font-bold').allTextContents());
  const rowText = async i => (await rows.nth(i).textContent());
  check(w+': Reels is admin home', await p.getByRole('heading',{level:1}).textContent()==='Reels');
  check(w+': nav marks Reels current', await p.locator('nav [aria-current="page"]').textContent()==='Reels');
  check(w+': 3 funnel cards, one default', await p.locator('[aria-pressed]').filter({hasText:'reel'}).count()===3 && await p.getByText('Default',{exact:true}).count()===1);
  check(w+': 8 reels in live funnel', await rows.count()===8);
  const r0 = await rowText(0);
  check(w+': row chips', r0.includes('Topic: Car accident') && r0.includes('No video yet') && r0.includes('Call'), r0.slice(0,160));
  check(w+': override shown', r0.includes('Skipped → 4. Hurt in an Uber'), r0);
  check(w+': end override', (await rowText(2)).includes('Watched → End card'));
  check(w+': default path text', (await rowText(1)).includes('Skipped → 4.') || (await rowText(1)).includes('Then the next reel'));
  check(w+': all reachable', await p.getByText('No path leads here').count()===0);
  check(w+': stats shown', r0.includes('Views') && r0.includes('Watched') && r0.includes('Booked'));
  check(w+': page fits width', await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  await p.screenshot({path:`reels-editor-${w}.jpg`, quality:70, fullPage:true});

  // Move down with the arrow button
  const before = await titles();
  await p.getByRole('button',{name:`Move ${before[0]} down`}).click();
  const after = await titles();
  check(w+': move down', after[0]===before[1] && after[1]===before[0]);
  check(w+': move announced', (await p.locator('[aria-live="polite"]').first().textContent()).includes('position 2'));
  await p.getByRole('button',{name:`Move ${before[0]} up`}).click();
  check(w+': move back up', (await titles())[0]===before[0]);
  if (!mobile) {
    await rows.nth(2).scrollIntoViewIfNeeded();
    await rows.nth(2).dragTo(rows.nth(0));
    check(w+': drag to reorder', (await titles())[0]===before[2], (await titles())[0]);
    await p.getByRole('button',{name:`Move ${before[2]} down`}).click();
    await p.getByRole('button',{name:`Move ${before[2]} down`}).click();
    check(w+': order restored', JSON.stringify(await titles())===JSON.stringify(before));
  }

  // Edit
  const t1 = (await titles())[1];
  await p.getByRole('button',{name:`Edit ${t1}`}).click();
  const dlg = p.getByRole('dialog',{name:'Edit reel'});
  check(w+': edit dialog opens', await dlg.isVisible());
  check(w+': fields prefilled', await dlg.getByLabel('Title',{exact:true}).inputValue()===t1);
  await dlg.getByRole('button',{name:'Paste a link'}).click();
  await dlg.getByLabel('Link').fill('/does-not-exist.jpg');
  await dlg.getByRole('button',{name:'Use link'}).click();
  await dlg.getByText("This didn't load").waitFor({timeout:3000});
  check(w+': broken image warning', true);
  await dlg.getByLabel('Link').fill('ftp://bad');
  await dlg.getByRole('button',{name:'Use link'}).click();
  check(w+': bad url rejected', (await dlg.getByRole('alert').first().textContent()).includes('https://'));
  await dlg.getByLabel('Link').fill('/reels/test.mp4');
  await dlg.getByRole('button',{name:'Use link'}).click();
  await dlg.getByLabel('Title',{exact:true}).fill('Edited title');
  await dlg.getByLabel('When watched to the end').selectOption('end');
  await p.screenshot({path:`reels-dialog-${w}.jpg`, quality:70});
  await dlg.getByRole('button',{name:'Save reel'}).click();
  check(w+': dialog closed', await dlg.count()===0);
  const r1 = await rowText(1);
  check(w+': edit saved to row', r1.includes('Edited title') && r1.includes('Watched → End card') && !r1.includes('No video yet'), r1.slice(0,200));
  // Escape cancels
  await p.getByRole('button',{name:'Edit Edited title'}).click();
  await p.getByRole('dialog').getByLabel('Title',{exact:true}).fill('Should not save');
  await p.keyboard.press('Escape');
  check(w+': Escape cancels', await p.getByRole('dialog').count()===0 && (await titles())[1]==='Edited title');

  // Add new reel
  await p.getByRole('button',{name:'+ Add reel'}).click();
  const add = p.getByRole('dialog',{name:'Add reel'});
  await add.getByLabel('Title',{exact:true}).fill('Brand new reel');
  await add.getByRole('button',{name:'Add reel'}).click();
  const t = await titles();
  check(w+': new reel appended', t.length===9 && t[8]==='Brand new reel');
  check(w+': new reel has no results', (await rowText(8)).includes('No results yet'));

  // Remove a reel that others point at
  await p.getByRole('button',{name:'Remove Hurt in an Uber or Lyft: whose insurance pays? from this funnel'}).click();
  check(w+': removed', await rows.count()===8);
  check(w+': paths to removed reel reset', !(await rows.allTextContents()).some(x=>x.includes('Hurt in an Uber')));

  // Unreachable warning in a small funnel
  await p.getByRole('button',{name:/Follow-up texts/}).click();
  check(w+': switched funnel', await rows.count()===2 && await p.getByLabel('Funnel name').inputValue()==='Follow-up texts');
  const ft = await titles();
  await p.getByRole('button',{name:`Edit ${ft[0]}`}).click();
  const d2 = p.getByRole('dialog');
  await d2.getByLabel('When watched to the end').selectOption('end');
  await d2.getByLabel('When skipped').selectOption('end');
  await d2.getByRole('button',{name:'Save reel'}).click();
  check(w+': unreachable flagged', await p.getByText('No path leads here').count()===1);

  // New funnel + default exclusivity
  await p.getByRole('button',{name:'+ New funnel'}).click();
  check(w+': new funnel empty', await p.getByText('No reels yet').isVisible());
  await p.getByText('Funnel settings').click();
  await p.getByLabel(/Default funnel/).check();
  check(w+': one default only', await p.getByText('Default',{exact:true}).count()===1);
  await p.selectOption('#add-existing',{index:1}); await p.getByRole('button',{name:'Add',exact:true}).click();
  check(w+': add existing reel', await rows.count()===1);
  check(w+': fits width after edits', await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));

  await p.goto(B+'/admin/overview',{waitUntil:'networkidle'});
  check(w+': overview moved', (await p.getByRole('heading',{level:1}).textContent()).trim()==='Results' && (await p.locator('nav [aria-current="page"]').textContent())==='Results');
  await p.close();
}
await b.close();
console.log(res.join('\n')); console.log('errors:', errs.length?errs.join('\n'):'none');
