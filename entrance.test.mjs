import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const source = await readFile(new URL("./entrance.js", import.meta.url), "utf8");

test("Earth startup timeout reveals the CSS fallback instead of blocking login", () => {
  assert.match(source, /window\.setTimeout\(\(\) => \{/);
  assert.match(source, /if \(earthReady\) return;/);
  assert.match(source, /globe\.classList\.add\("earth-css-fallback"\)/);
  assert.match(source, /reason: "startup-timeout"/);
  assert.match(source, /\}, 9000\);/);
});

test("normal Earth-ready signal cancels the fallback timer", () => {
  assert.match(source, /earthReady = true;/);
  assert.match(source, /window\.clearTimeout\(loaderHideTimer\);/);
});

test("auth panel unlock remains independent from Earth readiness", () => {
  assert.match(source, /window\.setTimeout\(unlockPanel, 340\)/);
  assert.match(source, /if \(reducedMotion\) \{\s*unlockPanel\(\);/);
});
