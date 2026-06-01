/* ============================================================================
   OncoOutcome — app logic
   SVG scatter rendering, scales, axes, legend, tooltip, selection, references.
   ========================================================================== */
(function () {
  "use strict";

  const svg = document.getElementById("plot");
  const wrap = document.getElementById("plotWrap");
  const tooltip = document.getElementById("tooltip");
  const NS = "http://www.w3.org/2000/svg";

  const M = { top: 18, right: 20, bottom: 48, left: 56 };

  // Literal colors (SVG presentation attributes do not resolve CSS var()).
  const C = {
    grid: "#eceff3", line: "#e3e8ee", inkFaint: "#8595a4",
    inkSoft: "#4a5b6b", ink: "#15212e",
  };

  let activePlot = PLOTS[0];
  let hidden = new Set();          // hidden modality keys
  let selectedId = null;

  /* ---------- domains (fixed across tabs for comparability) ---------- */
  const X_DOMAIN = [0, 14];
  const Y_DOMAIN = [0, 85];

  /* ---------- build tabs ---------- */
  const tabsEl = document.getElementById("tabs");
  PLOTS.forEach((p) => {
    const b = document.createElement("button");
    b.className = "tab";
    b.textContent = p.label;
    b.setAttribute("role", "tab");
    b.setAttribute("aria-selected", p === activePlot ? "true" : "false");
    b.addEventListener("click", () => selectPlot(p, b));
    tabsEl.appendChild(b);
  });

  function selectPlot(p, btn) {
    activePlot = p;
    selectedId = null;
    [...tabsEl.children].forEach((c) => c.setAttribute("aria-selected", "false"));
    btn.setAttribute("aria-selected", "true");
    renderHead();
    renderLegend();
    render();
    renderRefs();
    renderDetailEmpty();
  }

  /* ---------- header text ---------- */
  function renderHead() {
    document.getElementById("plotTitle").textContent = activePlot.title;
    document.getElementById("plotSub").textContent = activePlot.subtitle;
    document.getElementById("refsTitle").textContent =
      "References — " + activePlot.label + " (" + activePlot.points.length + ")";
    updateMeta();
  }

  function updateMeta() {
    const shown = activePlot.points.filter((d) => !hidden.has(d.modality)).length;
    document.getElementById("metaChip").textContent =
      shown + " / " + activePlot.points.length + " citations";
  }

  /* ---------- legend ---------- */
  function renderLegend() {
    const el = document.getElementById("legend");
    el.innerHTML = "";
    Object.entries(MODALITIES).forEach(([key, m]) => {
      const b = document.createElement("button");
      b.setAttribute("aria-pressed", hidden.has(key) ? "false" : "true");
      b.innerHTML =
        '<span class="dot" style="background:' + m.color + '"></span>' + m.label;
      b.addEventListener("click", () => {
        if (hidden.has(key)) hidden.delete(key);
        else hidden.add(key);
        b.setAttribute("aria-pressed", hidden.has(key) ? "false" : "true");
        render();
        updateMeta();
      });
      el.appendChild(b);
    });
  }

  /* ---------- scales ---------- */
  let W = 0, H = 0;
  function sx(v) {
    return M.left + ((v - X_DOMAIN[0]) / (X_DOMAIN[1] - X_DOMAIN[0])) * (W - M.left - M.right);
  }
  function sy(v) {
    return M.top + (1 - (v - Y_DOMAIN[0]) / (Y_DOMAIN[1] - Y_DOMAIN[0])) * (H - M.top - M.bottom);
  }

  function el(tag, attrs) {
    const e = document.createElementNS(NS, tag);
    for (const k in attrs) e.setAttribute(k, attrs[k]);
    return e;
  }

  /* ---------- main render ---------- */
  function render() {
    W = wrap.clientWidth;
    H = wrap.clientHeight;
    svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
    svg.innerHTML = "";

    // --- gridlines + axes ---
    const xTicks = [0, 2, 4, 6, 8, 10, 12, 14];
    const yTicks = [0, 20, 40, 60, 80];

    yTicks.forEach((t) => {
      const y = sy(t);
      svg.appendChild(el("line", { x1: M.left, y1: y, x2: W - M.right, y2: y, stroke: C.grid, "stroke-width": 1 }));
      const lab = el("text", { x: M.left - 10, y: y + 4, "text-anchor": "end", fill: C.inkFaint, "font-size": 11, "font-family": "IBM Plex Mono, monospace" });
      lab.textContent = t;
      svg.appendChild(lab);
    });

    xTicks.forEach((t) => {
      const x = sx(t);
      svg.appendChild(el("line", { x1: x, y1: M.top, x2: x, y2: H - M.bottom, stroke: C.grid, "stroke-width": 1 }));
      const lab = el("text", { x: x, y: H - M.bottom + 20, "text-anchor": "middle", fill: C.inkFaint, "font-size": 11, "font-family": "IBM Plex Mono, monospace" });
      lab.textContent = t;
      svg.appendChild(lab);
    });

    // axis baseline emphasis
    svg.appendChild(el("line", { x1: M.left, y1: H - M.bottom, x2: W - M.right, y2: H - M.bottom, stroke: C.line, "stroke-width": 1.5 }));
    svg.appendChild(el("line", { x1: M.left, y1: M.top, x2: M.left, y2: H - M.bottom, stroke: C.line, "stroke-width": 1.5 }));

    // axis titles
    const xt = el("text", { x: (M.left + W - M.right) / 2, y: H - 8, "text-anchor": "middle", fill: C.inkSoft, "font-size": 12.5, "font-weight": 600, "font-family": "IBM Plex Sans, sans-serif" });
    xt.textContent = activePlot.xLabel;
    svg.appendChild(xt);

    const yt = el("text", { x: 14, y: (M.top + H - M.bottom) / 2, "text-anchor": "middle", fill: C.inkSoft, "font-size": 12.5, "font-weight": 600, "font-family": "IBM Plex Sans, sans-serif", transform: `rotate(-90 14 ${(M.top + H - M.bottom) / 2})` });
    yt.textContent = activePlot.yLabel;
    svg.appendChild(yt);

    // --- points ---
    const ptsG = el("g", {});
    activePlot.points.forEach((d) => {
      const isHidden = hidden.has(d.modality);
      const c = el("circle", {
        class: "pt",
        cx: sx(d.x),
        cy: sy(d.y),
        r: 6,
        fill: MODALITIES[d.modality].color,
        "fill-opacity": 0.82,
        stroke: "#fff",
        "stroke-width": 1.5,
      });
      if (isHidden) { c.style.display = "none"; }
      c.dataset.id = d.id;
      c.addEventListener("mouseenter", (e) => showTip(d, c));
      c.addEventListener("mousemove", (e) => moveTip(e));
      c.addEventListener("mouseleave", hideTip);
      c.addEventListener("click", () => selectPoint(d));
      ptsG.appendChild(c);
    });
    svg.appendChild(ptsG);

    // re-apply selection ring
    if (selectedId) markSelected(selectedId);
  }

  /* ---------- tooltip ---------- */
  function showTip(d, circle) {
    const m = MODALITIES[d.modality];
    tooltip.innerHTML =
      '<span class="tt-mod"><span class="dot" style="background:' + m.color + '"></span>' + m.label + "</span>" +
      '<div class="tt-title">' + escapeHtml(d.title) + "</div>" +
      '<div class="tt-vals">' + d.x.toFixed(1) + " yr · " + d.y.toFixed(1) + "% · n=" + d.n + "</div>";
    tooltip.classList.add("show");
    circle.setAttribute("r", 8.5);
    positionTip(+circle.getAttribute("cx"), +circle.getAttribute("cy"));
  }
  function moveTip() { /* anchored to point; no follow needed */ }
  function positionTip(cx, cy) {
    // svg viewBox maps 1:1 to wrap pixels (preserveAspectRatio none)
    const tw = tooltip.offsetWidth, th = tooltip.offsetHeight;
    let left = cx + 14, top = cy - th - 10;
    if (left + tw > wrap.clientWidth) left = cx - tw - 14;
    if (top < 0) top = cy + 14;
    tooltip.style.left = left + "px";
    tooltip.style.top = top + "px";
  }
  function hideTip(e) {
    tooltip.classList.remove("show");
    const t = e && e.target;
    if (t && t.dataset && t.dataset.id !== selectedId) t.setAttribute("r", 6);
    else if (t) t.setAttribute("r", 7);
  }

  /* ---------- selection ---------- */
  function selectPoint(d) {
    selectedId = d.id;
    markSelected(d.id);
    renderDetail(d);
  }

  function markSelected(id) {
    svg.querySelectorAll(".pt").forEach((c) => {
      const sel = c.dataset.id === id;
      c.setAttribute("stroke", sel ? C.ink : "#fff");
      c.setAttribute("stroke-width", sel ? 2.5 : 1.5);
      c.setAttribute("r", sel ? 7 : 6);
      c.setAttribute("fill-opacity", sel ? 1 : 0.82);
    });
  }

  /* ---------- detail panel ---------- */
  function renderDetailEmpty() {
    document.getElementById("detailBody").innerHTML =
      '<div class="empty">' +
      '<svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>' +
      "<p>Select a point on the plot to read the article abstract.</p></div>";
  }

  function renderDetail(d) {
    const m = MODALITIES[d.modality];
    const body = document.getElementById("detailBody");
    body.innerHTML =
      '<div class="ab-mod"><span class="dot" style="background:' + m.color + '"></span>' + m.label + "</div>" +
      '<h3 class="ab-title">' + escapeHtml(d.title) + "</h3>" +
      '<p class="ab-authors">' + escapeHtml(d.authors) + "</p>" +
      '<p class="ab-source"><em>' + escapeHtml(d.journal) + "</em> · " + d.year + "</p>" +
      '<div class="ab-metrics">' +
        metric("Time point", d.x.toFixed(1) + " yr") +
        metric("Recurrence", d.y.toFixed(1) + "%") +
        metric("Cohort", "n=" + d.n) +
      "</div>" +
      '<p class="ab-abstract-label">Abstract</p>' +
      '<p class="ab-abstract">' + escapeHtml(d.abstract) + "</p>" +
      '<a class="ab-pmid" href="https://pubmed.ncbi.nlm.nih.gov/' + encodeURIComponent(d.pmid) + '" target="_blank" rel="noopener">' +
        'View on PubMed <span class="pmid-num">PMID ' + escapeHtml(d.pmid) + "</span></a>";
    body.scrollTop = 0;
  }

  function metric(k, v) {
    return '<div class="metric"><div class="k">' + k + '</div><div class="v">' + v + "</div></div>";
  }

  /* ---------- references ---------- */
  function renderRefs() {
    const list = document.getElementById("refList");
    list.innerHTML = "";
    activePlot.points.forEach((d, i) => {
      const m = MODALITIES[d.modality];
      const li = document.createElement("li");
      li.className = "ref-item";
      li.innerHTML =
        '<span class="ref-num">' + (i + 1) + "</span>" +
        '<span class="ref-dot" style="background:' + m.color + '"></span>' +
        '<span class="ref-body">' +
          '<span class="ref-title">' + escapeHtml(d.title) + "</span> " +
          '<span class="ref-cite">' + escapeHtml(d.authors) + ". <em>" + escapeHtml(d.journal) + "</em>, " + d.year + ". " +
            '<a href="https://pubmed.ncbi.nlm.nih.gov/' + encodeURIComponent(d.pmid) + '" target="_blank" rel="noopener">PMID ' + escapeHtml(d.pmid) + "</a></span>" +
        "</span>";
      list.appendChild(li);
    });
  }

  /* ---------- util ---------- */
  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  }

  /* ---------- resize ---------- */
  let rt;
  new ResizeObserver(() => {
    clearTimeout(rt);
    rt = setTimeout(render, 80);
  }).observe(wrap);

  /* ---------- init ---------- */
  renderHead();
  renderLegend();
  render();
  renderRefs();
  renderDetailEmpty();
})();
