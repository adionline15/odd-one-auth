import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const source = await readFile(new URL("./entrance.js", import.meta.url), "utf8");

test("Earth startup timeout reveals the CSS fallback instead of blocking login", () => {
  assert.ok(source.includes('if (earthReady) return;'));
  assert.ok(source.includes('globe.classList.add("earth-css-fallback")'));
  assert.ok(source.includes('reason: "startup-timeout"'));
  assert.ok(source.includes('}, 9000);'));
});

test("normal Earth-ready signal cancels the fallback timer", () => {
  assert.ok(source.includes("earthReady = true;"));
  assert.ok(source.includes("window.clearTimeout(loaderHideTimer);"));
});

test("auth panel unlock remains independent from Earth readiness", () => {
  assert.ok(source.includes("window.setTimeout(unlockPanel, 340)"));
  assert.ok(source.includes("unlockPanel();"));
  assert.ok(source.includes("if (reducedMotion)"));
});
