import { chromium } from 'playwright';
const b = await chromium.launch(); const ctx = await b.newContext();
const r = await ctx.request.post('http://localhost:3002/api/admin/login', { data: { email: 'tester@example.com', password: 'tester-pass-1' } });
console.log('login', r.status());
await ctx.storageState({ path: process.argv[2] + '/auth.json' }); await b.close();
