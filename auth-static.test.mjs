import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
const read=p=>fs.readFileSync(new URL(p,import.meta.url),'utf8');
test('auth UI exposes login/signup and accessible status',()=>{const h=read('../index.html');assert.match(h,/id="login-tab"/);assert.match(h,/id="signup-tab"/);assert.match(h,/aria-live="polite"/);assert.match(h,/id="confirm"/)});
test('Supabase email, Google and reset flows are wired',()=>{const a=read('../auth.js');assert.match(a,/signInWithPassword/);assert.match(a,/signUp/);assert.match(a,/signInWithOAuth/);assert.match(a,/resetPasswordForEmail/)});
test('frontend config uses placeholders and no secret key',()=>{const c=read('../config.js');assert.match(c,/YOUR_SUPABASE_PUBLISHABLE_OR_ANON_KEY/);assert.doesNotMatch(c,/service_role|SUPABASE_SECRET_KEY/i)});
test('responsive and reduced motion styles exist',()=>{const c=read('../styles.css');assert.match(c,/max-width:760px/);assert.match(c,/prefers-reduced-motion:reduce/)});
