(() => {
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const body = document.body;
  const panel = document.querySelector(".auth-panel");
  const loader = document.getElementById("earth-preloader");
  const label = document.getElementById("earth-progress-label");
  const detail = document.getElementById("earth-progress-detail");
  const progress = document.getElementById("earth-progress");
  const bar = document.getElementById("earth-progress-bar");
  const totalBytes = 512606 + 336774 + 223421 + 226113;

  const formatBytes = value => {
    if (value < 1024) return value + " B";
    return (value / (1024 * 1024)).toFixed(2) + " MiB";
  };

  document.querySelectorAll(".story h1 .word").forEach((word, index) => {
    word.style.setProperty("--word-index", index);
  });

  if (panel && !reducedMotion) panel.inert = true;
  body.classList.add("login-revealed");

  const unlockPanel = () => {
    if (panel) panel.inert = false;
  };
  if (reducedMotion) {
    unlockPanel();
  } else {
    window.setTimeout(unlockPanel, 680);
  }

  document.addEventListener("oddone:textureprogress", event => {
    const data = event.detail || {};
    const loaded = Math.max(0, Number(data.loadedBytes) || 0);
    const total = Math.max(1, Number(data.totalBytes) || totalBytes);
    const percent = Math.min(100, loaded / total * 100);
    if (bar) bar.style.width = percent.toFixed(2) + "%";
    if (progress) progress.setAttribute("aria-valuenow", String(Math.round(percent)));
    if (label) label.textContent = "Loading Earth textures · " + (data.completedAssets || 0) + "/" + (data.assetCount || 4);
    if (detail) detail.textContent = formatBytes(loaded) + " / " + formatBytes(total) + " received";
  });

  document.addEventListener("oddone:earthready", event => {
    const data = event.detail || {};
    body.classList.add("earth-ready");
    if (label) label.textContent = data.fallback ? "Earth scene fallback" : "Earth textures ready";
    if (detail) {
      detail.textContent = data.fallback
        ? "The login remains available without WebGL."
        : (data.failedAssets ? data.failedAssets + " texture(s) unavailable · continuing" : "India view prepared");
    }
    if (loader) {
      if (reducedMotion) {
        loader.hidden = true;
      } else {
        loader.classList.add("is-complete");
        window.setTimeout(() => { loader.hidden = true; }, 420);
      }
    }
  });

  // If the WebGL module cannot initialise at all, its catch path signals fallback.
  // Keep the login page independent from Earth loading so auth never waits on textures.
})();