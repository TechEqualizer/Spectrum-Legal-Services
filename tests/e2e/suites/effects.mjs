// The main button's effect: Shimmer (the default), Glow or Edge light,
// Subtle or Bold, chosen in Design, shown live in the phone and published
// with the look. Still for people who ask for less motion.
import { chromium, settle } from '../browser.mjs';
const S = process.argv[2]; const B = 'http://localhost:3002'; const M = 'http://localhost:54321';
const res = []; const check = (n, ok, x = '') => res.push((ok ? 'PASS' : 'FAIL') + '  ' + n + (x ? '  (' + x + ')' : ''));
const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');
const b = await chromium.launch();
const errs = [];
const route = async (ctx) => {
  await ctx.route(/i\.ytimg\.com/, (r) => r.fulfill({ status: 200, contentType: 'image/png', body: png }));
  await ctx.route(/youtube-nocookie\.com/, (r) => r.fulfill({ status: 200, contentType: 'text/html', body: '<body></body>' }));
};
const fxOf = (loc) => loc.evaluate((e) => ({ fx: e.dataset.fx, strength: e.dataset.fxStrength, self: getComputedStyle(e).animationName, after: getComputedStyle(e, '::after').animationName, before: getComputedStyle(e, '::before').animationName }));

// A look nobody has changed (the Golden Hour sample): the original shimmer.
const vctx = await b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, timezoneId: 'America/Detroit' });
await route(vctx);
const v = await vctx.newPage(); v.on('pageerror', (e) => errs.push(e.message));
await v.goto(B + '/f/events'); await settle(v, 1500);
let fx = await fxOf(v.locator('main .cine-cta').first());
check('default: subtle shimmer', fx.fx === 'shimmer' && fx.strength === 'subtle' && fx.after === 'cine-shimmer', JSON.stringify(fx));
await v.goto(B + '/f/masquerade'); await settle(v, 1500);

// The studio: Design → Button effect.
const ctx = await b.newContext({ storageState: S + '/auth.json', viewport: { width: 1440, height: 900 }, timezoneId: 'America/Detroit' });
await route(ctx);
const p = await ctx.newPage(); p.on('pageerror', (e) => errs.push(e.message));
await p.goto(B + '/admin'); await settle(p, 500);
await p.evaluate(() => localStorage.clear()); await p.reload(); await settle(p, 500);
await p.selectOption('#admin-business', 'masquerade'); await settle(p, 3000);
const effects = p.getByRole('radiogroup', { name: 'Button effect' });
check('three effects offered, shimmer chosen', JSON.stringify(await effects.getByRole('radio').allTextContents()) === JSON.stringify(['TicketsShimmer', 'TicketsGlow', 'TicketsEdge light']) && (await effects.getByRole('radio', { name: /Shimmer/ }).getAttribute('aria-checked')) === 'true');
check('each one plays on a small button', await effects.locator('.cine-cta[data-fx="glow"]').count() === 1 && await effects.locator('.cine-cta[data-fx="edge"]').count() === 1);
await effects.scrollIntoViewIfNeeded();
await p.screenshot({ path: S + '/effects-design-1440.jpg' });

const phone = p.frameLocator('iframe[title="Live preview of your link"]');
await effects.getByRole('radio', { name: /Glow/ }).click(); await settle(p, 800);
fx = await fxOf(phone.locator('main .cine-cta').first());
check('Glow shows in the phone', fx.fx === 'glow' && fx.before === 'cine-halo', JSON.stringify(fx));
await p.getByRole('radiogroup', { name: 'Effect strength' }).getByRole('radio', { name: 'Bold' }).click(); await settle(p, 800);
fx = await fxOf(phone.locator('main .cine-cta').first());
check('Bold shows in the phone', fx.strength === 'bold', JSON.stringify(fx));
await effects.getByRole('radio', { name: /Edge light/ }).click(); await settle(p, 800);
fx = await fxOf(phone.locator('main .cine-cta').first());
check('Edge light shows in the phone, still bold', fx.fx === 'edge' && fx.strength === 'bold' && fx.before === 'cine-edge', JSON.stringify(fx));

// Published with the look.
await p.getByRole('button', { name: 'Publish' }).click(); await settle(p, 2500);
const pub = (await (await fetch(M + '/__state')).json()).publications.find((x) => x.slug === 'masquerade')?.data;
check('published with the look', pub?.look?.effect?.style === 'edge' && pub?.look?.effect?.strength === 'bold', JSON.stringify(pub?.look?.effect));
await v.reload(); await settle(v, 1500);
fx = await fxOf(v.locator('main .cine-cta').first());
check('visitors see it', fx.fx === 'edge' && fx.strength === 'bold' && fx.before === 'cine-edge', JSON.stringify(fx));
await v.screenshot({ path: S + '/effects-edge-390.jpg' });

// Less motion: the button stays still.
const still = await b.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce', timezoneId: 'America/Detroit' });
await route(still);
const sp = await still.newPage();
await sp.goto(B + '/f/masquerade'); await settle(sp, 1500);
fx = await fxOf(sp.locator('main .cine-cta').first());
check('reduced motion: still', fx.before === 'none' && fx.after === 'none' && fx.self === 'none', JSON.stringify(fx));

// Back to the original: the effect leaves the look.
await effects.getByRole('radio', { name: /Shimmer/ }).click();
await p.getByRole('radiogroup', { name: 'Effect strength' }).getByRole('radio', { name: 'Subtle' }).click(); await settle(p, 800);
fx = await fxOf(phone.locator('main .cine-cta').first());
check('back to subtle shimmer', fx.fx === 'shimmer' && fx.strength === 'subtle', JSON.stringify(fx));
await p.request.delete(B + '/api/admin/publish?slug=masquerade');

check('no page errors', !errs.length, errs.join(' | ').slice(0, 300));
console.log(res.join('\n'));
await b.close();
