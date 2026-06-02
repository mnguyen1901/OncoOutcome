/* ============================================================================
   OncoOutcome — app logic
   Loads data.csv → builds one plot per risk group → renders an interactive
   SVG scatter (hover tooltip, click-to-open abstract, endpoint filter,
   treatment legend toggles, deduplicated reference list).
   All data comes from data.csv; see config.js to update.
   ========================================================================== */
(function () {
  "use strict";

  const NS = "http://www.w3.org/2000/svg";
  const svg = document.getElementById("plot");
  const wrap = document.getElementById("plotWrap");
  const tooltip = document.getElementById("tooltip");

  const M = { top: 18, right: 20, bottom: 48, left: 56 };
  const C = { grid: "#eceff3", line: "#e3e8ee", inkFaint: "#8595a4", inkSoft: "#4a5b6b", ink: "#15212e" };

  // ---- state ----
  let TABS = [];                 // [{...cfgTab, points:[]}]
  let activeTab = null;
  let allTreatments = [];        // ordered list present in data
  let presentOutcomes = [];      // outcome categories present in data (config order)
  let hiddenTreat = new Set();   // hidden treatment names
  let outcomeFilter = null;      // selected outcome id
  let selectedId = null;

  let X_DOMAIN = [0, 20];
  let X_TICKS = [];
  const Y_DOMAIN = [CONFIG.axis.yMin, CONFIG.axis.yMax];
  const Y_TICKS = [0, 20, 40, 60, 80, 100];

  /* ---------------------------------------------------------------- CSV ---- */
  function parseCSV(str) {
    const rows = []; let i = 0, field = "", row = [], inQ = false;
    while (i < str.length) {
      const c = str[i];
      if (inQ) {
        if (c === '"') { if (str[i + 1] === '"') { field += '"'; i += 2; continue; } inQ = false; i++; continue; }
        field += c; i++; continue;
      } else {
        if (c === '"') { inQ = true; i++; continue; }
        if (c === ",") { row.push(field); field = ""; i++; continue; }
        if (c === "\r") { i++; continue; }
        if (c === "\n") { row.push(field); rows.push(row); row = []; field = ""; i++; continue; }
        field += c; i++; continue;
      }
    }
    if (field.length || row.length) { row.push(field); rows.push(row); }
    return rows;
  }

  function hashJitter(id) {
    let h = 0;
    for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
    return ((h % 1000) / 1000 - 0.5) * 0.64; // ~±0.32 yr
  }

  function buildData(csvText) {
    const rows = parseCSV(csvText);
    if (!rows.length) throw new Error("CSV is empty");
    const header = rows[0].map((h) => h.trim());
    const ix = {};
    header.forEach((h, k) => (ix[h] = k));
    const need = ["pmid", "title", "abstract", "group", "endpoint", "timepoint", "value", "treatment"];
    const missing = need.filter((c) => !(c in ix));
    if (missing.length) throw new Error("CSV is missing column(s): " + missing.join(", "));

    // init tabs
    TABS = CONFIG.tabs.map((t) => Object.assign({}, t, { points: [] }));
    const treatSeen = new Map();   // name -> order
    const outcomeSeen = new Set(); // outcome ids present
    let maxTp = 0;
    const tpSet = new Set();

    rows.slice(1).forEach((r, rowIdx) => {
      if (r.length < header.length) return;
      const group = (r[ix.group] || "").trim().toLowerCase();
      const tab = TABS.find((t) => group.includes(t.match));
      if (!tab) return;
      const tp = parseTimepoint(r[ix.timepoint]);
      const val = parseValue(r[ix.value]);
      if (tp == null || val == null) return; // can't plot
      const treatment = (r[ix.treatment] || "other").trim() || "other";
      const endpoint = (r[ix.endpoint] || "").trim();
      const outcome = classifyOutcome(endpoint);
      const id = (r[ix.pmid] || "p") + "-" + rowIdx;

      if (!treatSeen.has(treatment)) treatSeen.set(treatment, treatSeen.size);
      outcomeSeen.add(outcome);
      if (tp > maxTp) maxTp = tp;
      tpSet.add(tp);

      tab.points.push({
        id,
        pmid: (r[ix.pmid] || "").trim(),
        title: (r[ix.title] || "").trim(),
        abstract: (r[ix.abstract] || "").trim(),
        group: tab.label,
        endpoint,
        outcome,
        timepoint: r[ix.timepoint].trim(),
        valueRaw: r[ix.value].trim(),
        treatment,
        color: colorForTreatment(treatment),
        x0: tp,
        x: tp + hashJitter(id),
        y: val,
      });
    });

    // ordering: config order first, then discovery order
    const cfgOrder = Object.keys(CONFIG.treatmentColors);
    allTreatments = [...treatSeen.keys()].sort((a, b) => {
      const ia = cfgOrder.indexOf(a), ib = cfgOrder.indexOf(b);
      if (ia !== -1 && ib !== -1) return ia - ib;
      if (ia !== -1) return -1;
      if (ib !== -1) return 1;
      return treatSeen.get(a) - treatSeen.get(b);
    });

    // outcome categories present, in config order; default to the first
    presentOutcomes = CONFIG.outcomes.filter((o) => outcomeSeen.has(o.id));
    if (!outcomeFilter || !presentOutcomes.some((o) => o.id === outcomeFilter)) {
      outcomeFilter = presentOutcomes.length ? presentOutcomes[0].id : null;
    }

    // x domain + ticks
    X_DOMAIN = [0, Math.max(5, Math.ceil(maxTp))];
    X_TICKS = [...tpSet].sort((a, b) => a - b);
  }

  /* ------------------------------------------------------------- scales ---- */
  let W = 0, H = 0;
  const sx = (v) => M.left + ((v - X_DOMAIN[0]) / (X_DOMAIN[1] - X_DOMAIN[0])) * (W - M.left - M.right);
  const sy = (v) => M.top + (1 - (v - Y_DOMAIN[0]) / (Y_DOMAIN[1] - Y_DOMAIN[0])) * (H - M.top - M.bottom);
  const el = (tag, attrs) => { const e = document.createElementNS(NS, tag); for (const k in attrs) e.setAttribute(k, attrs[k]); return e; };

  /* ---------------------------------------------------------------- UI ----- */
  function buildTabs() {
    const tabsEl = document.getElementById("tabs");
    tabsEl.innerHTML = "";
    TABS.forEach((t) => {
      const b = document.createElement("button");
      b.className = "tab";
      b.textContent = t.label;
      b.setAttribute("role", "tab");
      b.setAttribute("aria-selected", t === activeTab ? "true" : "false");
      b.addEventListener("click", () => selectTab(t, b));
      tabsEl.appendChild(b);
    });
  }

  function buildOutcomeToggle() {
    const seg = document.getElementById("outcomeSeg");
    seg.innerHTML = "";
    presentOutcomes.forEach((o) => {
      const b = document.createElement("button");
      b.textContent = o.label;
      b.setAttribute("aria-pressed", o.id === outcomeFilter ? "true" : "false");
      b.addEventListener("click", () => {
        if (outcomeFilter === o.id) return;
        outcomeFilter = o.id;
        selectedId = null;
        [...seg.children].forEach((c) => c.setAttribute("aria-pressed", "false"));
        b.setAttribute("aria-pressed", "true");
        render(); renderRefs(); updateMeta(); renderDetailEmpty();
      });
      seg.appendChild(b);
    });
  }

  function buildLegend() {
    const eln = document.getElementById("legend");
    eln.innerHTML = "";
    allTreatments.forEach((name) => {
      const b = document.createElement("button");
      b.setAttribute("aria-pressed", hiddenTreat.has(name) ? "false" : "true");
      b.innerHTML = '<span class="dot" style="background:' + colorForTreatment(name) + '"></span>' + escapeHtml(name);
      b.addEventListener("click", () => {
        if (hiddenTreat.has(name)) hiddenTreat.delete(name); else hiddenTreat.add(name);
        b.setAttribute("aria-pressed", hiddenTreat.has(name) ? "false" : "true");
        render(); updateMeta();
      });
      eln.appendChild(b);
    });
  }

  function selectTab(t, btn) {
    activeTab = t;
    selectedId = null;
    [...document.getElementById("tabs").children].forEach((c) => c.setAttribute("aria-selected", "false"));
    btn.setAttribute("aria-selected", "true");
    renderHead(); render(); renderRefs(); renderDetailEmpty();
  }

  function visiblePoints() {
    return activeTab.points.filter((d) =>
      !hiddenTreat.has(d.treatment) &&
      (outcomeFilter === null || d.outcome === outcomeFilter));
  }

  function renderHead() {
    document.getElementById("plotTitle").textContent = activeTab.title;
    document.getElementById("plotSub").textContent = CONFIG.subtitle;
    updateMeta();
  }

  function updateMeta() {
    const shown = visiblePoints().length;
    const total = activeTab.points.length;
    const uniqStudies = new Set(visiblePoints().map((d) => d.pmid)).size;
    document.getElementById("metaChip").textContent =
      shown + " / " + total + " points · " + uniqStudies + " studies";
    document.getElementById("refsTitle").textContent =
      "References — " + activeTab.label + " (" + uniqStudies + " studies)";
  }

  /* ------------------------------------------------------------- render ---- */
  function render() {
    W = wrap.clientWidth; H = wrap.clientHeight;
    if (!W || !H) return;
    svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
    svg.innerHTML = "";

    Y_TICKS.forEach((t) => {
      const y = sy(t);
      svg.appendChild(el("line", { x1: M.left, y1: y, x2: W - M.right, y2: y, stroke: C.grid, "stroke-width": 1 }));
      const lab = el("text", { x: M.left - 10, y: y + 4, "text-anchor": "end", fill: C.inkFaint, "font-size": 11, "font-family": "IBM Plex Mono, monospace" });
      lab.textContent = t; svg.appendChild(lab);
    });
    X_TICKS.forEach((t) => {
      const x = sx(t);
      svg.appendChild(el("line", { x1: x, y1: M.top, x2: x, y2: H - M.bottom, stroke: C.grid, "stroke-width": 1 }));
      const lab = el("text", { x: x, y: H - M.bottom + 20, "text-anchor": "middle", fill: C.inkFaint, "font-size": 11, "font-family": "IBM Plex Mono, monospace" });
      lab.textContent = t; svg.appendChild(lab);
    });

    svg.appendChild(el("line", { x1: M.left, y1: H - M.bottom, x2: W - M.right, y2: H - M.bottom, stroke: C.line, "stroke-width": 1.5 }));
    svg.appendChild(el("line", { x1: M.left, y1: M.top, x2: M.left, y2: H - M.bottom, stroke: C.line, "stroke-width": 1.5 }));

    const xt = el("text", { x: (M.left + W - M.right) / 2, y: H - 8, "text-anchor": "middle", fill: C.inkSoft, "font-size": 12.5, "font-weight": 600, "font-family": "IBM Plex Sans, sans-serif" });
    xt.textContent = CONFIG.axis.xLabel; svg.appendChild(xt);
    const cy = (M.top + H - M.bottom) / 2;
    const yt = el("text", { x: 15, y: cy, "text-anchor": "middle", fill: C.inkSoft, "font-size": 12.5, "font-weight": 600, "font-family": "IBM Plex Sans, sans-serif", transform: `rotate(-90 15 ${cy})` });
    yt.textContent = CONFIG.axis.yLabel; svg.appendChild(yt);

    const g = el("g", {});
    const pts = visiblePoints();
    if (!pts.length) {
      showStatus("No “" + (presentOutcomes.find((o) => o.id === outcomeFilter) || {}).label +
        "” data reported for this risk group.", false);
    } else {
      clearStatus();
    }
    pts.forEach((d) => {
      const c = el("circle", {
        class: "pt", cx: sx(d.x), cy: sy(d.y), r: 6,
        fill: d.color, "fill-opacity": 0.8, stroke: "#fff", "stroke-width": 1.5,
      });
      c.dataset.id = d.id;
      c.addEventListener("mouseenter", () => showTip(d, c));
      c.addEventListener("mouseleave", (e) => hideTip(e));
      c.addEventListener("click", () => selectPoint(d));
      g.appendChild(c);
    });
    svg.appendChild(g);
    if (selectedId) markSelected(selectedId);
  }

  /* ------------------------------------------------------------ tooltip ---- */
  function showTip(d, circle) {
    tooltip.innerHTML =
      '<span class="tt-mod"><span class="dot" style="background:' + d.color + '"></span>' + escapeHtml(d.treatment) + "</span>" +
      '<div class="tt-title">' + escapeHtml(d.title) + "</div>" +
      '<div class="tt-vals">' + escapeHtml(d.endpoint || "—") + "</div>" +
      '<div class="tt-vals">' + escapeHtml(d.timepoint) + " · " + escapeHtml(d.valueRaw) + "</div>";
    tooltip.classList.add("show");
    circle.setAttribute("r", 8.5);
    positionTip(+circle.getAttribute("cx"), +circle.getAttribute("cy"));
  }
  function positionTip(cx, cy) {
    const tw = tooltip.offsetWidth, th = tooltip.offsetHeight;
    let left = cx + 14, top = cy - th - 10;
    if (left + tw > wrap.clientWidth) left = cx - tw - 14;
    if (left < 0) left = 6;
    if (top < 0) top = cy + 16;
    tooltip.style.left = left + "px";
    tooltip.style.top = top + "px";
  }
  function hideTip(e) {
    tooltip.classList.remove("show");
    const t = e && e.target;
    if (t && t.dataset) t.setAttribute("r", t.dataset.id === selectedId ? 7 : 6);
  }

  /* ---------------------------------------------------------- selection ---- */
  function selectPoint(d) { selectedId = d.id; markSelected(d.id); renderDetail(d); }
  function markSelected(id) {
    svg.querySelectorAll(".pt").forEach((c) => {
      const sel = c.dataset.id === id;
      c.setAttribute("stroke", sel ? C.ink : "#fff");
      c.setAttribute("stroke-width", sel ? 2.5 : 1.5);
      c.setAttribute("r", sel ? 7 : 6);
      c.setAttribute("fill-opacity", sel ? 1 : 0.8);
    });
  }

  /* -------------------------------------------------------------- detail --- */
  function renderDetailEmpty() {
    document.getElementById("detailBody").innerHTML =
      '<div class="empty">' +
      '<svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>' +
      "<p>Select a point on the plot to read the article abstract.</p></div>";
  }
  function renderDetail(d) {
    const body = document.getElementById("detailBody");
    body.innerHTML =
      '<div class="ab-mod"><span class="dot" style="background:' + d.color + '"></span>' + escapeHtml(d.treatment) + "</div>" +
      '<h3 class="ab-title">' + escapeHtml(d.title) + "</h3>" +
      '<div class="ab-metrics">' +
        metric("Risk group", escapeHtml(d.group)) +
        metric("Timepoint", escapeHtml(d.timepoint)) +
        metric("Value", escapeHtml(d.valueRaw)) +
      "</div>" +
      '<p class="ab-endpoint"><span class="ab-endpoint-k">Endpoint</span>' + escapeHtml(d.endpoint || "—") + "</p>" +
      '<p class="ab-abstract-label">Abstract</p>' +
      '<p class="ab-abstract">' + escapeHtml(d.abstract || "No abstract available.") + "</p>" +
      (d.pmid
        ? '<a class="ab-pmid" href="https://pubmed.ncbi.nlm.nih.gov/' + encodeURIComponent(d.pmid) + '" target="_blank" rel="noopener">View on PubMed <span class="pmid-num">PMID ' + escapeHtml(d.pmid) + "</span></a>"
        : "");
    body.scrollTop = 0;
  }
  function metric(k, v) { return '<div class="metric"><div class="k">' + k + '</div><div class="v">' + v + "</div></div>"; }

  /* ----------------------------------------------------------- references -- */
  function renderRefs() {
    const list = document.getElementById("refList");
    list.innerHTML = "";
    const seen = new Map(); // pmid -> {title, pmid}
    visiblePoints().forEach((d) => { if (!seen.has(d.pmid)) seen.set(d.pmid, d); });
    let i = 0;
    seen.forEach((d) => {
      i++;
      const li = document.createElement("li");
      li.className = "ref-item";
      li.innerHTML =
        '<span class="ref-num">' + i + "</span>" +
        '<span class="ref-body"><span class="ref-title">' + escapeHtml(d.title) + "</span> " +
        '<span class="ref-cite">' +
          (d.pmid ? '<a href="https://pubmed.ncbi.nlm.nih.gov/' + encodeURIComponent(d.pmid) + '" target="_blank" rel="noopener">PMID ' + escapeHtml(d.pmid) + "</a>" : "") +
        "</span></span>";
      list.appendChild(li);
    });
  }

  /* ---------------------------------------------------------------- util --- */
  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  }
  function showStatus(msg, isErr) {
    let s = wrap.querySelector(".plot-status");
    if (!s) { s = document.createElement("div"); s.className = "plot-status"; wrap.appendChild(s); }
    s.className = "plot-status" + (isErr ? " err" : "");
    s.textContent = msg;
  }
  function clearStatus() { const s = wrap.querySelector(".plot-status"); if (s) s.remove(); }

  /* -------------------------------------------------------------- resize --- */
  let rt;
  new ResizeObserver(() => { clearTimeout(rt); rt = setTimeout(() => { if (activeTab) render(); }, 80); }).observe(wrap);

  /* ---------------------------------------------------------------- init --- */
  async function init() {
    showStatus("Loading data…", false);
    try {
      const res = await fetch(CONFIG.csvFile, { cache: "no-store" });
      if (!res.ok) throw new Error("HTTP " + res.status + " fetching " + CONFIG.csvFile);
      const text = await res.text();
      buildData(text);
      const nonEmpty = TABS.filter((t) => t.points.length);
      if (!nonEmpty.length) throw new Error("No plottable rows found in CSV.");
      activeTab = TABS[0];
      clearStatus();
      buildTabs(); buildOutcomeToggle(); buildLegend();
      renderHead(); render(); renderRefs(); renderDetailEmpty();
    } catch (err) {
      showStatus("Could not load " + CONFIG.csvFile + ".\n" + err.message +
        "\n\n(If you opened this file directly from disk, run it from a web server or host it on GitHub Pages — browsers block local file reads.)", true);
      renderDetailEmpty();
    }
  }

  init();
})();
