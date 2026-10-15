import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = (path) => fs.readFileSync(new URL(path, import.meta.url), 'utf8');

test('history-led auth page keeps login, signup and accessible status controls', () => {
  const html = read('./index.html');
  assert.match(html, /id="login-tab"/);
  assert.match(html, /id="signup-tab"/);
  assert.match(html, /aria-live="polite"/);
  assert.match(html, /id="email" type="email" autocomplete="email" autocapitalize="none" spellcheck="false"/);
  assert.match(html, /id="confirm"/);
  assert.match(html, /id="access"/);
  assert.match(html, /class="skip-link" href="#access">Skip to sign in<\\/a>/);
  assert.match(html, /id="form" aria-labelledby="title" novalidate/);
  assert.match(html, /id="status" role="status" aria-live="polite" aria-atomic="true"/);
  assert.match(html, /id="toggle" type="button" aria-label="Show password" aria-pressed="false" aria-controls="password"/);
  assert.match(html, /id="toggle-confirm" type="button" aria-label="Show confirmation password" aria-pressed="false" aria-controls="confirm"/);
});

test('immersive India history sections are present before map access', () => {
  const html = read('./index.html');
  assert.match(html, /AN IMMERSIVE JOURNEY THROUGH INDIA/);
  assert.match(html, /id="chapters"/);
  assert.match(html, /THE FIRST CITIES/);
  assert.match(html, /IDEAS &amp; EMPIRES|IDEAS & EMPIRES/);
  assert.match(html, /THE ROAD TO FREEDOM/);
  assert.match(html, /id="about"/);
});

test('Supabase email, Google and reset flows are wired', () => {
  const auth = read('./auth.js');
  assert.match(auth, /signInWithPassword/);
  assert.match(auth, /signUp/);
  assert.match(auth, /signInWithOAuth/);
  assert.match(auth, /resetPasswordForEmail/);
});

test('frontend config uses placeholders and no secret key', () => {
  const config = read('./config.js');
  assert.match(config, /YOUR_SUPABASE_PUBLISHABLE_OR_ANON_KEY/);
  assert.doesNotMatch(config, /service_role|SUPABASE_SECRET_KEY/i);
});

test('responsive and reduced motion styles exist', () => {
  const styles = read('./styles.css');
  assert.match(styles, /max-width:620px/);
  assert.match(styles, /prefers-reduced-motion:reduce/);
  assert.match(styles, /a:focus-visible,[\s\S]*button:focus-visible,[\s\S]*input:focus-visible/);
  assert.match(styles, /outline: 2px solid var\(--gold-bright\)/);
  assert.match(styles, /\.era-grid/);
});

test('signup confirmation password has an accessible visibility toggle', () => {
  const html = read('./index.html');
  const auth = read('./auth.js');
  assert.match(html, /id="toggle-confirm"/);
  assert.match(html, /aria-label="Show confirmation password"/);
  assert.match(auth, /bindPasswordToggle\(confirm,\$\("toggle-confirm"\),"confirmation password"\)/);
});

test('accent tokens are defined and history CTA links to sign-in', () => {
  const styles = read('./styles.css');
  const html = read('./index.html');
  assert.match(styles, /--gold-bright\s*:/);
  assert.match(html, /href="#access"/);
});

test('cinematic motion layer includes pointer response, scroll progress and reduced-motion support', () => {
  const html = read('./index.html');
  const motion = read('./motion.js');
  const styles = read('./styles.css');
  assert.match(html, /src="motion.js"/);
  assert.match(motion, /pointermove/);
  assert.match(motion, /IntersectionObserver/);
  assert.match(motion, /scrollIntoView/);
  assert.match(styles, /@keyframes map-trace/);
  assert.match(styles, /\.scroll-progress/);
  assert.match(styles, /prefers-reduced-motion/);
});

test('progressive Three.js scene is loaded with a graceful SVG fallback', () => {
  const html = read('./index.html');
  const scene = read('./scene3d.js');
  const styles = read('./styles.css');
  assert.match(html, /type="module" src="scene3d\.js"/);
  assert.match(scene, /WebGLRenderer/);
  assert.match(scene, /ExtrudeGeometry/);
  assert.match(scene, /prefers-reduced-motion/);
  assert.match(scene, /\.catch\(\(\) => canvas\.remove\(\)\)/);
  assert.match(styles, /\.monument-scene\.has-webgl \.india-mark/);
});

test('password visibility controls expose their pressed state to assistive technology', () => {
  const auth = read('./auth.js');
  assert.match(auth, /button\.setAttribute\("aria-pressed","false"\)/);
  assert.match(auth, /button\.setAttribute\("aria-pressed",String\(show\)\)/);
});


test('login and signup tabs keep their selected state and password autocomplete mode synchronized', () => {
  const html = read('./index.html');
  const auth = read('./auth.js');
  assert.match(html, /id="login-tab"[^>]*role="tab" aria-selected="true"/);
  assert.match(html, /id="signup-tab"[^>]*role="tab" aria-selected="false"/);
  assert.match(auth, /password\.autocomplete=s\?"new-password":"current-password"/);
  assert.match(auth, /\$\("login-tab"\)\.setAttribute\("aria-selected",String\(!s\)\)/);
  assert.match(auth, /\$\("signup-tab"\)\.setAttribute\("aria-selected",String\(s\)\)/);
});


test('pending authentication disables all competing auth actions and restores the mode label', () => {
  const auth = read('./auth.js');
  assert.match(auth, /submit\.disabled=v;google\.disabled=v;forgot\.disabled=v/);
  assert.match(auth, /submitLabel\.textContent=v\?"Please wait…":label/);
});
