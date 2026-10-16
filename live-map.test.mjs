import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const [html, js, css, pkg] = await Promise.all([
  readFile(new URL("./live-map.html", import.meta.url), "utf8"),
  readFile(new URL("./live-map.js", import.meta.url), "utf8"),
  readFile(new URL("./live-map.css", import.meta.url), "utf8"),
  readFile(new URL("./package.json", import.meta.url), "utf8")
]);

test("live map uses the exact approved MapLibre version", () => {
  assert.equal(JSON.parse(pkg).dependencies["maplibre-gl"], "6.14.0");
  assert.match(js, /const MAPLIBRE_VERSION = "6\.14\.0"/);
  assert.match(html, /maplibre-gl@6\.14\.0\/dist\/maplibre-gl\.css/);
});

test("map provides separate, toggleable vehicle, team, event and device GPS layers", () => {
  for (const id of ["toggle-vehicles", "toggle-teams", "toggle-events", "toggle-me"]) {
    assert.match(html, new RegExp('id="' + id + '"'));
    assert.match(js, new RegExp('$("#' + id + '")'));
  }
  assert.match(js, /setLayerVisibility/);
  assert.match(js, /animateDemoFeed/);
});

test("GPS is explicit opt-in and is never transmitted by this prototype", () => {
  assert.match(html, /Enable my GPS/);
  assert.match(html, /not sent to a server or shared with other users/);
  assert.match(js, /navigator\.geolocation\.watchPosition/);
  assert.match(js, /navigator\.geolocation\.clearWatch/);
  assert.doesNotMatch(js, /fetch\s*\(|WebSocket\s*\(|sendBeacon\s*\(/);
});

test("synthetic data is labelled as demo and not represented as verified real tracking", () => {
  assert.match(html, /Simulated feed/);
  assert.match(html, /synthetic examples, not actual vehicles/);
  assert.match(js, /Not real tracking/);
  assert.match(js, /Synthetic sample/);
});

test("map controls have accessible labels and reduced-motion support", () => {
  assert.match(html, /aria-label="Interactive map/);
  assert.match(html, /aria-live="polite"/);
  assert.match(css, /prefers-reduced-motion:reduce/);
  assert.match(js, /prefers-reduced-motion: reduce/);
});