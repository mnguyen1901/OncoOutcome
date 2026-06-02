/* ============================================================================
   OncoOutcome — sidebar cancer-type picker
   Builds a styled dropdown from CANCER_MENU (config.js). Selecting a cancer
   navigates to its page; "Soon" items are disabled. Active item reflects
   ACTIVE_CANCER.
   ========================================================================== */
(function () {
  "use strict";

  const root = document.getElementById("cancerPicker");
  if (!root || typeof CANCER_MENU === "undefined") return;

  const active = CANCER_MENU.find((c) => c.key === ACTIVE_CANCER) || CANCER_MENU[0];

  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "cp-trigger";
  btn.setAttribute("aria-haspopup", "listbox");
  btn.setAttribute("aria-expanded", "false");
  btn.innerHTML =
    '<span class="cp-trigger-main">' +
      '<span class="cp-dot" aria-hidden="true"></span>' +
      '<span class="cp-trigger-label">' + active.label + "</span>" +
    "</span>" +
    '<svg class="cp-caret" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>';

  const menu = document.createElement("div");
  menu.className = "cp-menu";
  menu.setAttribute("role", "listbox");
  menu.hidden = true;

  CANCER_MENU.forEach((c) => {
    const item = document.createElement(c.page ? "a" : "div");
    const isActive = c.key === ACTIVE_CANCER;
    item.className = "cp-item" + (isActive ? " is-active" : "") + (c.soon ? " is-soon" : "");
    item.setAttribute("role", "option");
    item.setAttribute("aria-selected", isActive ? "true" : "false");
    if (c.page && !isActive) item.href = c.page;
    if (c.soon) item.setAttribute("aria-disabled", "true");
    item.innerHTML =
      '<span class="cp-dot" aria-hidden="true"></span>' +
      '<span class="cp-item-label">' + c.label + "</span>" +
      (c.soon ? '<span class="cp-soon">Soon</span>' : "") +
      (isActive ? '<svg class="cp-check" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg>' : "");
    menu.appendChild(item);
  });

  root.appendChild(btn);
  root.appendChild(menu);

  function open() {
    menu.hidden = false;
    btn.setAttribute("aria-expanded", "true");
    root.classList.add("is-open");
    document.addEventListener("click", onDocClick, true);
    document.addEventListener("keydown", onKey);
  }
  function close() {
    menu.hidden = true;
    btn.setAttribute("aria-expanded", "false");
    root.classList.remove("is-open");
    document.removeEventListener("click", onDocClick, true);
    document.removeEventListener("keydown", onKey);
  }
  function onDocClick(e) { if (!root.contains(e.target)) close(); }
  function onKey(e) { if (e.key === "Escape") { close(); btn.focus(); } }

  btn.addEventListener("click", (e) => {
    e.stopPropagation();
    if (menu.hidden) open(); else close();
  });
})();
