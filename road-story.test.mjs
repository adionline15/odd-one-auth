import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const [pkg, html, js, earth] = await Promise.all([
  readFile(new URL("./package.json", import.meta.url), "utf8"),
  readFile(new URL("./road-story.html", import.meta.url), "utf8"),
  readFile(new URL("./road-story.js", import.meta.url), "utf8"),
  readFile(new URL("./scene3d.js", import.meta.url), "utf8")
]);

test("MapLibre is pinned exactly to 6.14.0", () => {
  const dependencies = JSON.parse(pkg).dependencies;
  assert.equal(dependencies["maplibre-gl"], "6.14.0");
  assert.doesNotMatch(dependencies["maplibre-gl"], /^[~^]/);
  assert.match(js, /maplibre-gl@\$\{MAPLIBRE_VERSION\}/);
});

test("story has accessible chapters and a labelled map fallback", () => {
  assert.match(html, /aria-label="Story chapters"/);
  assert.match(html, /id="map" role="application"/);
  assert.match(html, /boundary-notice/);
  assert.match(js, /WebGL 2 is unavailable/);
  assert.match(js, /map-static-fallback/);
});

test("road-quality overlays are labelled as mock", () => {
  assert.match(html, /MOCK DEMO/);
  assert.match(html, /No verified road-quality or coverage dataset is connected/);
});

test("hero Earth has 30fps idle and 60fps active pacing", () => {
  assert.match(earth, /1000 \/ 60/);
  assert.match(earth, /1000 \/ 30/);
  assert.match(earth, /oddone:pauseEarth/);
  assert.match(earth, /document\.hidden/);
});

test("Earth assets are same-origin and progress is byte-based", () => {
  assert.ok(earth.includes("assets/earth/earth-color.jpg"));
  assert.ok(earth.includes("response.arrayBuffer()"));
  assert.ok(!earth.includes(".b64"));
  assert.ok(earth.includes("loadedBytes: loadedTextureBytes"));
  assert.ok(earth.includes("bytes.byteLength"));
  assert.ok(!earth.includes("threejs.org/examples/textures/planets"));
});

test("layer debug is query-gated and reports live boundary/label visibility", async () => {
  const debug = await readFile(new URL("./debug-layers.js", import.meta.url), "utf8");
  assert.match(js, /hostname\.endsWith\("\.vercel\.app"\)/);
  assert.match(js, /get\("debug"\) === "layers"/);
  assert.match(js, /import\("\.\/debug-layers\.js"\)/);
  assert.match(debug, /Visible labels/);
  assert.match(debug, /Boundary candidates/);
  assert.match(debug, /STILL VISIBLE/);
  assert.match(html, /Solar System Scope \/ INOVE · CC BY 4\.0/);
});
