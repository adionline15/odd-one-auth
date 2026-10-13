const MAPLIBRE_VERSION = "6.14.0";
const MAPLIBRE_MODULE = `https://unpkg.com/maplibre-gl@${MAPLIBRE_VERSION}/dist/maplibre-gl.mjs`;
const STYLE_URL = "https://tiles.openfreemap.org/styles/liberty";
const INDIA = { center: [82.5, 22.7], zoom: 1.75, pitch: 0 };
const STATE_VIEW = { center: [80.8, 26.8], zoom: 5.2, pitch: 18 };
const CITY_VIEW = { center: [77.209, 28.6139], zoom: 10.4, pitch: 32 };

const chapters = [...document.querySelectorAll("[data-chapter]")];
const navLinks = [...document.querySelectorAll(".chapter-nav a")];
const mapHost = document.querySelector("#map");
const mapStatus = document.querySelector("#map-status");
const readout = {
  index: document.querySelector("#readout-index"),
  title: document.querySelector("#readout-title"),
  subtitle: document.querySelector("#readout-subtitle")
};
const reducedMotionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
const earthProgress = document.querySelector("#earth-progress-bar");
const earthProgressLabel = document.querySelector("#earth-progress-label");
const earthProgressDetail = document.querySelector("#earth-progress-detail");
const earthPreloader = document.querySelector("#earth-preloader");
document.addEventListener("oddone:textureprogress", event => {
  const detail = event.detail || {};
  if (earthProgress) earthProgress.style.width = Math.min(100, detail.percent || 0) + "%";
  if (earthProgressLabel) earthProgressLabel.textContent = detail.percent >= 99.5 ? "Earth textures ready" : "Loading " + (detail.asset || "Earth textures");
  if (earthProgressDetail) earthProgressDetail.textContent = Math.round(detail.loadedBytes || 0).toLocaleString() + " / " + Math.round(detail.totalBytes || 0).toLocaleString() + " bytes";
  if (detail.percent >= 99.5 && earthPreloader) {
    earthPreloader.classList.add("is-complete");
    window.setTimeout(() => earthPreloader.classList.add("is-hidden"), reducedMotionQuery.matches ? 0 : 650);
  }
});

let maplibre = null;
let map = null;
let mapReady = false;
let mapFailed = false;
let lastChapter = "earth";
let lastRenderAt = 0;
let perfFrames = 0;
let perfElapsed = 0;
let perfLastReport = performance.now();
let lastProgress = 0;
let currentProgress = 0;
let targetProgress = 0;
let lastCameraUpdate = performance.now();
let scrollFrame = 0;
let cameraFrame = 0;
let mapChapterVisible = false;
let userCameraOverride = false;

const clamp = (n, min, max) => Math.max(min, Math.min(max, n));
const lerp = (a, b, t) => a + (b - a) * t;
const smoothstep = (a, b, x) => {
  const t = clamp((x - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
};
const reducedMotion = () => reducedMotionQuery.matches;

function setStatus(message, visible = true) {
  if (!mapStatus) return;
  mapStatus.textContent = message;
  mapStatus.hidden = !visible;
}

function showStaticFallback(message) {
  mapFailed = true;
  document.body.classList.add("map-unavailable");
  setStatus(message);
  if (mapHost) {
    mapHost.innerHTML = '<div class="map-static-fallback"><div><span>MAP FALLBACK</span><h2>India, connected.</h2><p>The interactive map needs WebGL 2. Continue through the story using the chapter links.</p><a href="#state">Continue story ↓</a></div></div>';
  }
}

function hasWebGL2() {
  try {
    const canvas = document.createElement("canvas");
    const gl = canvas.getContext("webgl2", { failIfMajorPerformanceCaveat: false });
    if (gl) {
      const lose = gl.getExtension("WEBGL_lose_context");
      lose?.loseContext();
      return true;
    }
  } catch (_) {}
  return false;
}

function setChapterActive(id) {
  lastChapter = id;
  document.body.classList.toggle("story-map-active", id !== "earth");
  chapters.forEach((section, i) => {
    const active = section.id === id;
    section.dataset.active = active ? "true" : "false";
    if (navLinks[i]) {
      if (active) navLinks[i].setAttribute("aria-current", "step");
      else navLinks[i].removeAttribute("aria-current");
    }
  });
}

const chapterObserver = new IntersectionObserver(entries => {
  const visible = entries.filter(entry => entry.isIntersecting)
    .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
  if (visible) setChapterActive(visible.target.id);
}, { threshold: [0.25, 0.5, 0.75] });
chapters.forEach(chapter => chapterObserver.observe(chapter));

const mapObserver = new IntersectionObserver(entries => {
  for (const entry of entries) {
    mapChapterVisible = entry.isIntersecting;
    if (entry.isIntersecting) {
      loadMapOnce();
    } else if (map && document.hidden) {
      map.stop();
    }
  }
}, { rootMargin: "450px 0px 450px 0px", threshold: 0.01 });
mapObserver.observe(document.querySelector(".map-chapter"));

async function loadMapOnce() {
  if (map || mapFailed || !mapHost || mapHost.dataset.loading === "true") return;
  mapHost.dataset.loading = "true";
  setStatus("Loading MapLibre GL JS " + MAPLIBRE_VERSION + "…");
  if (!hasWebGL2()) {
    showStaticFallback("WebGL 2 is unavailable on this browser or device.");
    return;
  }
  try {
    maplibre = await import(MAPLIBRE_MODULE);
    map = new maplibre.Map({
      container: mapHost,
      style: STYLE_URL,
      center: INDIA.center,
      zoom: INDIA.zoom,
      pitch: 0,
      bearing: 0,
      projection: { type: "globe" },
      attributionControl: false,
      cooperativeGestures: true,
      fadeDuration: reducedMotion() ? 0 : 180,
      maxPitch: 48,
      renderWorldCopies: false,
      canvasContextAttributes: { antialias: false, powerPreference: "high-performance" }
    });
    map.addControl(new maplibre.NavigationControl({ showCompass: false, visualizePitch: true }), "bottom-left");
    map.addControl(new maplibre.AttributionControl({ compact: true }), "bottom-right");

    map.on("load", () => {
      mapReady = true;
      mapHost.classList.add("map-ready");
      setStatus("Map ready · OpenFreeMap / OpenStreetMap", false);
      const boundaryAudit = hideUnapprovedBaseBoundaries();
      if (window.location.hostname.endsWith(".vercel.app") && new URLSearchParams(window.location.search).get("debug") === "layers") {
        import("./debug-layers.js").then(({ mountLayerDebugPanel }) => {
          mountLayerDebugPanel(map, boundaryAudit);
        }).catch(error => console.error("[Odd-One debug layers] Could not load panel:", error));
      }
      targetProgress = storyProgress();
      currentProgress = targetProgress;
      updateCamera(true);
      onScroll();
      console.info("[Odd-One] MapLibre GL JS", MAPLIBRE_VERSION, "loaded. Base map: OpenFreeMap Liberty.");
      console.info("[Odd-One] Official India boundary source: NOT CONFIGURED. Base boundary layers hidden; legal review required.");
    });
    map.on("error", event => {
      const error = event?.error;
      if (error instanceof maplibre.GPUInitializationError) {
        showStaticFallback("WebGL 2 initialization failed. Use the static story fallback.");
      } else if (error) {
        console.warn("[Odd-One map]", error.message || error);
        setStatus("Map tile/style issue · retry or continue the story.");
      }
    });
    map.on("render", recordMapFrame);
    map.on("dragstart", () => { userCameraOverride = true; });
    map.on("zoomstart", () => { userCameraOverride = true; });
    map.on("moveend", () => { userCameraOverride = false; });
    document.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener("resize", scheduleMapResize, { passive: true });
  } catch (error) {
    console.error("[Odd-One] Map initialization failed:", error);
    showStaticFallback("The interactive map could not initialize. Continue using the static story.");
  }
}

function hideUnapprovedBaseBoundaries() {
  if (!map || !map.getStyle()) return { hidden: [], candidates: [] };
  const layers = map.getStyle().layers || [];
  const hidden = [];
  const candidates = [];
  for (const layer of layers) {
    const id = String(layer.id || "").toLowerCase();
    const sourceLayer = String(layer["source-layer"] || "").toLowerCase();
    const boundaryLike = /boundary|admin|disputed|country.?border|state.?border/.test(id + " " + sourceLayer);
    if (boundaryLike) candidates.push({ id: layer.id, sourceLayer: layer["source-layer"] || "", type: layer.type });
    if (boundaryLike && map.getLayer(layer.id)) {
      try {
        map.setLayoutProperty(layer.id, "visibility", "none");
        hidden.push({ id: layer.id, sourceLayer: layer["source-layer"] || "", type: layer.type });
      } catch (_) {}
    }
  }
  const report = { hidden, candidates, styleUrl: STYLE_URL, capturedAt: new Date().toISOString() };
  window.__oddOneBoundaryAudit = report;
  // No invented replacement geometry: a separately sourced and legally reviewed
  // official boundary dataset is required before adding a replacement boundary.
  return report;
}

function storyProgress() {
  const section = document.querySelector(".map-chapter");
  if (!section) return 0;
  const rect = section.getBoundingClientRect();
  const travel = Math.max(1, section.offsetHeight - window.innerHeight);
  return clamp(-rect.top / travel, 0, 1);
}

function cameraForProgress(progress) {
  // Camera is a deterministic function of one scroll-progress value. This means
  // reversing scroll or jumping chapters always converges to the same target.
  if (progress <= 0.42) {
    const t = smoothstep(0, 0.42, progress);
    return {
      center: [lerp(INDIA.center[0], STATE_VIEW.center[0], t), lerp(INDIA.center[1], STATE_VIEW.center[1], t)],
      zoom: lerp(INDIA.zoom, STATE_VIEW.zoom, t),
      pitch: lerp(INDIA.pitch, STATE_VIEW.pitch, t),
      projection: progress < 0.13 ? "globe" : "mercator",
      label: progress < 0.13 ? ["02", "INDIA / NETWORK", "GLOBE PROJECTION"] : ["03", "STATE / NETWORK", "STATE-SCALE VIEW"]
    };
  }
  const t = smoothstep(0.42, 1, progress);
  return {
    center: [lerp(STATE_VIEW.center[0], CITY_VIEW.center[0], t), lerp(STATE_VIEW.center[1], CITY_VIEW.center[1], t)],
    zoom: lerp(STATE_VIEW.zoom, CITY_VIEW.zoom, t),
    pitch: lerp(STATE_VIEW.pitch, CITY_VIEW.pitch, t),
    projection: "mercator",
    label: ["04", "CITY / STREET NETWORK", "CITY-SCALE VIEW"]
  };
}

function updateCamera(immediate = false) {
  if (!mapReady || !map || document.hidden) return;
  const progress = targetProgress;
  const now = performance.now();
  const delta = Math.max(0, now - lastCameraUpdate);
  lastCameraUpdate = now;
  const factor = immediate || reducedMotion() ? 1 : 1 - Math.exp(-delta / 115);
  currentProgress = factor === 1 ? progress : lerp(currentProgress, progress, factor);
  const eased = cameraForProgress(currentProgress);
  try {
    // Keep globe projection selected and let MapLibre perform its native
    // globe-to-Mercator transition as the zoom increases; do not hard-switch
    // projections at an arbitrary scroll threshold.
    map.jumpTo({
      center: eased.center,
      zoom: eased.zoom,
      pitch: eased.pitch,
      bearing: 0
    });
  } catch (error) {
    console.warn("[Odd-One] Camera update:", error);
  }
  readout.index.textContent = eased.label[0];
  readout.title.textContent = eased.label[1];
  readout.subtitle.textContent = eased.label[2];
  document.querySelectorAll("[data-go]").forEach(button => {
    const active = button.dataset.go === (currentProgress < 0.42 ? "india" : currentProgress < 0.98 ? "state" : "city");
    button.setAttribute("aria-pressed", active ? "true" : "false");
  });
  if (Math.abs(targetProgress - currentProgress) > 0.002 && !reducedMotion()) {
    if (!cameraFrame) cameraFrame = requestAnimationFrame(() => {
      cameraFrame = 0;
      updateCamera(false);
    });
  } else {
    if (cameraFrame) cancelAnimationFrame(cameraFrame);
    cameraFrame = 0;
    currentProgress = targetProgress;
  }
}

function onScroll() {
  if (scrollFrame) return;
  scrollFrame = requestAnimationFrame(() => {
    scrollFrame = 0;
    targetProgress = storyProgress();
    if (mapReady) updateCamera(false);
    const inMap = document.querySelector(".map-chapter").getBoundingClientRect().top < window.innerHeight * 0.55 &&
      document.querySelector(".map-chapter").getBoundingClientRect().bottom > window.innerHeight * 0.35;
    document.body.classList.toggle("map-handoff-active", inMap && mapReady);
    if (inMap && mapReady) {
      document.dispatchEvent(new CustomEvent("oddone:pauseEarth", { detail: { paused: true } }));
    } else {
      document.dispatchEvent(new CustomEvent("oddone:pauseEarth", { detail: { paused: false } }));
    }
  });
}
window.addEventListener("scroll", onScroll, { passive: true });

function scheduleMapResize() {
  if (!map) return;
  requestAnimationFrame(() => map?.resize());
}

function recordMapFrame() {
  const now = performance.now();
  if (lastRenderAt) perfElapsed += now - lastRenderAt;
  lastRenderAt = now;
  perfFrames++;
  if (now - perfLastReport >= 5000) {
    const meanMs = perfFrames > 1 ? perfElapsed / (perfFrames - 1) : 0;
    const fps = meanMs > 0 ? 1000 / meanMs : 0;
    console.info("[Odd-One perf] MapLibre render events over 5s:", {
      frames: perfFrames,
      meanFrameIntervalMs: Number(meanMs.toFixed(2)),
      estimatedFps: Number(fps.toFixed(1)),
      scrollProgress: Number(currentProgress.toFixed(3)),
      hidden: document.hidden,
      note: "MapLibre render-event cadence, not a guaranteed displayed FPS."
    });
    perfFrames = 0;
    perfElapsed = 0;
    perfLastReport = now;
  }
}

function onVisibilityChange() {
  if (!map) return;
  if (document.hidden) {
    map.stop();
    lastRenderAt = 0;
  } else {
    map.resize();
    targetProgress = storyProgress();
    currentProgress = targetProgress;
    updateCamera(true);
  }
}

document.querySelectorAll("[data-go]").forEach(button => {
  button.addEventListener("click", () => {
    const id = button.dataset.go;
    const progress = id === "india" ? 0.08 : id === "state" ? 0.5 : 0.99;
    targetProgress = progress;
    currentProgress = reducedMotion() ? progress : currentProgress;
    const section = document.querySelector(".map-chapter");
    const travel = section.offsetHeight - window.innerHeight;
    const top = section.offsetTop + Math.max(0, travel) * progress;
    window.scrollTo({ top, behavior: reducedMotion() ? "auto" : "smooth" });
    if (mapReady) updateCamera(reducedMotion());
  });
});

reducedMotionQuery.addEventListener?.("change", () => {
  if (reducedMotion()) {
    if (cameraFrame) cancelAnimationFrame(cameraFrame);
    cameraFrame = 0;
    currentProgress = targetProgress;
    updateCamera(true);
  } else {
    onScroll();
  }
});

window.addEventListener("pagehide", () => {
  if (scrollFrame) cancelAnimationFrame(scrollFrame);
  if (cameraFrame) cancelAnimationFrame(cameraFrame);
  mapObserver.disconnect();
  chapterObserver.disconnect();
  window.removeEventListener("scroll", onScroll);
  window.removeEventListener("resize", scheduleMapResize);
  document.removeEventListener("visibilitychange", onVisibilityChange);
  map?.remove();
}, { once: true });

window.__oddOneRoadStory = {
  version: MAPLIBRE_VERSION,
  get progress() { return currentProgress; },
  get mapReady() { return mapReady; },
  get mapFailed() { return mapFailed; },
  get camera() { return map?.getCenter().toArray(); }
};
