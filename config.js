/* ============================================================================
   OncoOutcome — configuration
   ----------------------------------------------------------------------------
   ◆ TO UPDATE THE PLOTS WITH NEW DATA:
     Just replace the file  data.csv  in this folder with your new export.
     The app reads it on load and rebuilds every plot automatically.
     You do NOT need to edit any code for new rows.

   Your CSV must keep these columns (header row, any order):
     pmid, title, abstract, group, endpoint, timepoint, value, treatment
       • group     → which tab the point belongs to (see TABS below)
       • timepoint → X axis; any text containing a number of years
                      e.g. "5-year", "10-year"  → 5, 10
       • value     → Y axis; a percentage  e.g. "84.20%" → 84.2
       • treatment → point colour (see TREATMENT_COLORS below)
       • endpoint  → the outcome measure (shown in tooltip / detail / filter)

   You only edit THIS file if you want to rename tabs, recolour treatments,
   or change the axis labels.
   ========================================================================== */

const CONFIG = {
  csvFile: "data.csv",

  axis: {
    xLabel: "Follow-up time (years)",
    // Endpoints mix "…-free survival" (higher = better) with a few
    // "recurrence / failure / mortality" measures (higher = worse), so the
    // axis is left neutral. Use the endpoint filter to compare like with like.
    yLabel: "Reported outcome rate (%)",
    yMin: 0,
    yMax: 100,
  },

  // One tab per entry. `match` is compared (lowercased) against the CSV `group`.
  tabs: [
    { id: "low",          label: "Low-risk",          match: "low",
      title: "Low-risk localized prostate cancer" },
    { id: "intermediate", label: "Intermediate-risk", match: "intermediate",
      title: "Intermediate-risk localized prostate cancer" },
    { id: "high",         label: "High-risk",         match: "high",
      title: "High-risk localized prostate cancer" },
  ],

  subtitle: "Reported outcomes by treatment modality over follow-up time",

  // Fixed colours for the known treatments. Any treatment not listed here is
  // auto-assigned a colour from FALLBACK_PALETTE (stable per name).
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
};

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
