const boundaryPattern = /boundary|admin|disputed|country.?border|state.?border/i;

function element(tag, className, textContent) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (textContent !== undefined) node.textContent = textContent;
  return node;
}

export function mountLayerDebugPanel(map, boundaryAudit = { hidden: [], candidates: [] }) {
  if (document.getElementById("oddone-layer-debug")) return;
  const root = element("aside", "layer-debug-panel");
  root.id = "oddone-layer-debug";
  root.setAttribute("aria-label", "Map layer debug audit");
  root.innerHTML = `
    <header class="layer-debug-head">
      <div><span class="layer-debug-kicker">ODD-ONE / DEV ONLY</span><h2>Map layer audit</h2></div>
      <button type="button" data-debug-close aria-label="Close layer debug panel">×</button>
    </header>
    <p class="layer-debug-note">Preview-only diagnostic. Reads the live MapLibre style; it does not alter source data.</p>
    <div class="layer-debug-stats" data-debug-stats></div>
    <label class="layer-debug-search">Filter layer IDs or labels
      <input type="search" data-debug-search placeholder="boundary, label, road…" autocomplete="off">
    </label>
    <div class="layer-debug-tabs" role="group" aria-label="Layer audit filter">
      <button type="button" data-debug-filter="visible" aria-pressed="true">Visible</button>
      <button type="button" data-debug-filter="labels" aria-pressed="false">Visible labels</button>
      <button type="button" data-debug-filter="boundary" aria-pressed="false">Boundary candidates</button>
      <button type="button" data-debug-filter="hidden" aria-pressed="false">Hidden by audit</button>
    </div>
    <p class="layer-debug-result" data-debug-result></p>
    <div class="layer-debug-list" data-debug-list tabindex="0" aria-label="Layer audit results"></div>
    <footer>Map style: OpenFreeMap Liberty · Layer visibility reflects the loaded style at this moment.</footer>
  `;
  document.body.append(root);

  const list = root.querySelector("[data-debug-list]");
  const stats = root.querySelector("[data-debug-stats]");
  const result = root.querySelector("[data-debug-result]");
  const search = root.querySelector("[data-debug-search]");
  let activeFilter = "visible";
  let currentLayers = [];

  const getVisibleLayers = () => (map.getStyle()?.layers || []).map(layer => {
    const visibility = layer.layout?.visibility || "visible";
    const labelField = layer.layout?.["text-field"];
    const sourceLayer = layer["source-layer"] || "";
    const boundaryCandidate = boundaryPattern.test([layer.id, sourceLayer].join(" "));
    return {
      id: layer.id,
      type: layer.type || "unknown",
      source: layer.source || "—",
      sourceLayer,
      visibility,
      visible: visibility !== "none",
      label: labelField !== undefined && labelField !== null,
      labelField: labelField === undefined ? "" : JSON.stringify(labelField),
      boundaryCandidate,
      filter: layer.filter ? JSON.stringify(layer.filter) : ""
    };
  });

  const render = () => {
    currentLayers = getVisibleLayers();
    const hiddenIds = new Set((boundaryAudit?.hidden || []).map(layer => layer.id));
    const visible = currentLayers.filter(layer => layer.visible);
    const visibleLabels = visible.filter(layer => layer.label);
    const visibleBoundaryLike = visible.filter(layer => layer.boundaryCandidate);
    const candidateCount = (boundaryAudit?.candidates || []).length;
    const hiddenCount = hiddenIds.size;

    stats.replaceChildren();
    [
      ["Visible layers", visible.length],
      ["Visible labels", visibleLabels.length],
      ["Boundary candidates", candidateCount],
      ["Hidden by audit", hiddenCount]
    ].forEach(([label, value]) => {
      const stat = element("div", "layer-debug-stat");
      stat.append(element("b", "", String(value)), element("span", "", label));
      stats.append(stat);
    });

    const query = search.value.trim().toLowerCase();
    let rows = currentLayers;
    if (activeFilter === "visible") rows = visible;
    if (activeFilter === "labels") rows = visibleLabels;
    if (activeFilter === "boundary") rows = currentLayers.filter(layer => layer.boundaryCandidate);
    if (activeFilter === "hidden") rows = currentLayers.filter(layer => hiddenIds.has(layer.id) || layer.visibility === "none");
    rows = rows.filter(layer => [layer.id, layer.type, layer.source, layer.sourceLayer, layer.labelField].join(" ").toLowerCase().includes(query));

    result.textContent = `Showing ${rows.length} of ${currentLayers.length} style layers. ${visibleBoundaryLike.length} boundary-like layer(s) remain visible after the audit.`;
    list.replaceChildren();
    if (!rows.length) {
      list.append(element("p", "layer-debug-empty", "No layers match this filter."));
      return;
    }
    const fragment = document.createDocumentFragment();
    rows.forEach(layer => {
      const card = element("article", "layer-debug-row");
      const head = element("div", "layer-debug-row-head");
      head.append(element("code", "", layer.id));
      const state = element("span", layer.visible ? "layer-debug-state is-visible" : "layer-debug-state", layer.visible ? "VISIBLE" : "HIDDEN");
      head.append(state);
      card.append(head);
      const metadata = element("p", "layer-debug-meta", `type=${layer.type} · source=${layer.source} · source-layer=${layer.sourceLayer || "—"}`);
      card.append(metadata);
      if (layer.label) card.append(element("p", "layer-debug-label", "Label field: " + layer.labelField));
      if (layer.boundaryCandidate) card.append(element("p", "layer-debug-boundary", hiddenIds.has(layer.id) ? "Boundary-like · hidden by preview audit" : "Boundary-like · STILL VISIBLE — review"));
      fragment.append(card);
    });
    list.append(fragment);
  };

  root.querySelector("[data-debug-close]").addEventListener("click", () => root.remove());
  search.addEventListener("input", render);
  root.querySelectorAll("[data-debug-filter]").forEach(button => {
    button.addEventListener("click", () => {
      activeFilter = button.dataset.debugFilter;
      root.querySelectorAll("[data-debug-filter]").forEach(item => item.setAttribute("aria-pressed", item === button ? "true" : "false"));
      render();
    });
  });
  map.on("styledata", render);
  render();
}
