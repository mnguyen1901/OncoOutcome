/* ============================================================================
   OncoOutcome — configuration registry
   ----------------------------------------------------------------------------
   ◆ HOW IT WORKS NOW
     This file defines ONE config per cancer type, in CANCERS below.
     Each HTML page sets   window.__CANCER__ = "prostate" | "breast" | …
     BEFORE loading this file; we then expose the matching config as CONFIG
     (so app.js is unchanged) and CANCER_MENU drives the sidebar dropdown.

   ◆ TO UPDATE THE PLOTS WITH NEW DATA
     Replace the cancer's CSV (data.csv for prostate, breast.csv for breast).
     The app reads it on load and rebuilds every plot automatically — no code
     changes needed for new rows.

     Each CSV keeps these columns (header row, any order):
       pmid, title, abstract, group, endpoint, timepoint, value, treatment
         • group     → which tab the point belongs to (matched against `match`)
         • timepoint → X axis; any text containing a number of years
         • value     → Y axis; a percentage  e.g. "84.20%" → 84.2
         • treatment → point colour (see treatmentColors)
         • endpoint  → the outcome measure (tooltip / detail / filter)

   ◆ TO ADD A CANCER TYPE
     1. Add an entry to CANCERS (tabs, outcomes, treatmentColors, csvFile…).
     2. Add it to CANCER_MENU with the page it lives on.
     3. Create the page (copy breast.html, change window.__CANCER__).
   ========================================================================== */

const CANCERS = {

  /* ----------------------------------------------------------- PROSTATE ---- */
  prostate: {
    key: "prostate",
    label: "Prostate cancer",
    page: "index.html",
    csvFile: "data.csv",

    axis: {
      xLabel: "Follow-up time (years)",
      yLabel: "Reported outcome rate (%)",
      yMin: 0,
      yMax: 100,
    },

    tabs: [
      { id: "low",          label: "Low-risk",          match: "low",
        title: "Low-risk localized prostate cancer" },
      { id: "intermediate", label: "Intermediate-risk", match: "intermediate",
        title: "Intermediate-risk localized prostate cancer" },
      { id: "high",         label: "High-risk",         match: "high",
        title: "High-risk localized prostate cancer" },
    ],

    subtitle: "Reported outcomes by treatment modality over follow-up time",

    outcomes: [
      { id: "biochemical", label: "Biochemical / PSA", test: (e) => /biochem|psa/i.test(e) },
      { id: "css",         label: "Cancer-specific",   test: (e) => /cancer[- ]specific/i.test(e) },
      { id: "os",          label: "Overall survival",  test: (e) => /overall survival/i.test(e) },
      { id: "mets",        label: "Metastasis-free",   test: (e) => /metasta/i.test(e) },
      { id: "mortality",   label: "Mortality",         test: (e) => /mortality/i.test(e) },
      { id: "clinical",    label: "Clinical / other",  test: () => true },
    ],

    treatmentColors: {
      "Radical Prostatectomy":    "#4e79a7",
      "Radiotherapy":             "#f28e2b",
      "ADT + Std EBRT":           "#59a14f",
      "ADT + Hypofx EBRT":        "#76b7b2",
      "ADT + EBRT + HDR Brachy":  "#b07aa1",
      "ADT + EBRT + LDR Brachy":  "#ff9da7",
      "EBRT + LDR Brachy":        "#edc948",
      "Brachytherapy":            "#9c755f",
      "ADT + LDR Brachy":         "#e15759",
      "Cryotherapy":              "#17becf",
      "other":                    "#9aa6b2",
    },
  },

  /* ------------------------------------------------------------- BREAST ---- */
  breast: {
    key: "breast",
    label: "Breast cancer",
    page: "breast.html",
    csvFile: "breast.csv",

    axis: {
      xLabel: "Follow-up time (years)",
      yLabel: "Reported outcome rate (%)",
      yMin: 0,
      yMax: 100,
    },

    // Stratified by molecular subtype.
    tabs: [
      { id: "hrpos", label: "HR+/HER2−",       match: "hr+",
        title: "HR-positive / HER2-negative breast cancer" },
      { id: "her2",  label: "HER2+",           match: "her2-positive",
        title: "HER2-positive breast cancer" },
      { id: "tnbc",  label: "Triple-negative", match: "triple",
        title: "Triple-negative breast cancer" },
    ],

    subtitle: "Illustrative placeholder data — replace breast.csv with your own export",

    outcomes: [
      { id: "os",   label: "Overall survival", test: (e) => /overall survival/i.test(e) },
      { id: "idfs", label: "Invasive DFS",     test: (e) => /invasive disease|disease[- ]free|idfs/i.test(e) },
      { id: "drfs", label: "Distant RFS",      test: (e) => /distant/i.test(e) },
      { id: "lrfs", label: "Locoregional",     test: (e) => /locoreg|local recurrence/i.test(e) },
      { id: "bcss", label: "Cancer-specific",  test: (e) => /cancer[- ]specific/i.test(e) },
      { id: "clinical", label: "Clinical / other", test: () => true },
    ],

    treatmentColors: {
      "Endocrine Therapy":            "#4e79a7",
      "CDK4/6 Inhibitor + Endocrine": "#f28e2b",
      "Adjuvant Chemo + Endocrine":   "#59a14f",
      "Extended Endocrine":           "#76b7b2",
      "Trastuzumab + Chemo":          "#b07aa1",
      "Trastuzumab + Pertuzumab":     "#ff9da7",
      "T-DM1 (adjuvant)":             "#edc948",
      "Neoadjuvant Chemo + Anti-HER2":"#e15759",
      "Neoadjuvant Chemo":            "#9c755f",
      "Chemo + Immunotherapy":        "#17becf",
      "Adjuvant Capecitabine":        "#af7aa1",
      "Surgery + RT":                 "#bab0ac",
      "other":                        "#9aa6b2",
    },
  },
};

/* Order shown in the sidebar dropdown. `page: null` + `soon: true` renders a
   disabled "Soon" item that can't be selected yet. */
const CANCER_MENU = [
  { key: "prostate",   label: "Prostate cancer",   page: "index.html" },
  { key: "breast",     label: "Breast cancer",     page: "breast.html" },
  { key: "lung",       label: "Lung cancer",       page: null, soon: true },
  { key: "colorectal", label: "Colorectal cancer", page: null, soon: true },
];

/* Pick the active config. Each page sets window.__CANCER__ before this loads. */
const ACTIVE_CANCER = (typeof window !== "undefined" && window.__CANCER__) || "prostate";
const CONFIG = CANCERS[ACTIVE_CANCER] || CANCERS.prostate;

const FALLBACK_PALETTE = [
  "#4e79a7", "#f28e2b", "#e15759", "#76b7b2", "#59a14f",
  "#edc948", "#b07aa1", "#ff9da7", "#9c755f", "#17becf",
];

// Stable colour for treatments not in the map above.
function colorForTreatment(name) {
  if (CONFIG.treatmentColors[name]) return CONFIG.treatmentColors[name];
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return FALLBACK_PALETTE[h % FALLBACK_PALETTE.length];
}

// Sort a raw endpoint string into one of CONFIG.outcomes (returns its id).
function classifyOutcome(endpoint) {
  const e = String(endpoint || "");
  for (const o of CONFIG.outcomes) {
    if (o.test(e)) return o.id;
  }
  return CONFIG.outcomes[CONFIG.outcomes.length - 1].id;
}

// "10-year" → 10 ; "" / unparseable → null
function parseTimepoint(s) {
  const m = String(s).match(/(\d+(?:\.\d+)?)/);
  return m ? parseFloat(m[1]) : null;
}

// "84.20%" → 84.2 ; "88%" → 88 ; unparseable → null
function parseValue(s) {
  const m = String(s).replace(/,/g, "").match(/(-?\d+(?:\.\d+)?)/);
  return m ? parseFloat(m[1]) : null;
}
