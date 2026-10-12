
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = (path) =>
  fs.readFileSync(new URL(path, import.meta.url), 'utf8');

test('auth UI exposes login/signup and accessible status', () => {
  const html = read('./index.html');
  assert.match(html, /id="login-tab"/);
  assert.match(html, /id="signup-tab"/);
  assert.match(html, /aria-live="polite"/);
  assert.match(html, /id="confirm"/);
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
  assert.match(styles, /max-width:760px/);
  assert.match(styles, /prefers-reduced-motion:reduce/);
});

test('signup confirmation password has an accessible visibility toggle', () => {
  const html = read('./index.html');
  const auth = read('./auth.js');
  assert.match(html, /id="toggle-confirm"/);
  assert.match(html, /aria-label="Show confirmation password"/);
  assert.match(auth, /bindPasswordToggle\(confirm,\$\("toggle-confirm"\),"confirmation password"\)/);
});

test('accent hover token is defined when referenced', () => {
  const styles = read('./styles.css');
  assert.match(styles, /--lime-bright\s*:/);
  assert.match(styles, /color:\s*var\(--lime-bright\)/);
});
