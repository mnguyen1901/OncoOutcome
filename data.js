/* ============================================================================
   OncoOutcome — data module
   ----------------------------------------------------------------------------
   This file holds (1) the treatment-modality definitions and (2) the plots.

   ◆ TO PLUG IN YOUR OWN DATA later:
     Replace the `PLOTS` array below with your own. Each plot is one tab.
     Each point in `points[]` is ONE citation and MUST have this shape:

       {
         id:       "unique-string",        // used internally
         x:        7.5,                    // X axis value  (years since treatment)
         y:        18.4,                   // Y axis value  (progression/recurrence %)
         modality: "surgery",             // key into MODALITIES below
         n:        842,                    // cohort size (shown in tooltip)
         title:    "Article title",
         authors:  "Smith J, Doe A, et al.",
         journal:  "Journal of Urology",
         year:     2021,
         pmid:     "34567890",            // links to pubmed.ncbi.nlm.nih.gov/<pmid>
         abstract: "Full abstract text…"
       }

   Everything else (scales, axes, colours, tooltips, the reference list) is
   driven automatically from this data — no other file needs editing.
   ========================================================================== */

const MODALITIES = {
  surgery:       { label: "Surgery (RP)",   color: "#2f6fed" },
  ebrt:          { label: "EBRT",           color: "#e8833a" },
  brachytherapy: { label: "Brachytherapy",  color: "#1f9d6b" },
  cryotherapy:   { label: "Cryotherapy",    color: "#13b6c4" },
  hifu:          { label: "HIFU",           color: "#8b5cf6" },
};

/* ----------------------------------------------------------------------------
   PLACEHOLDER DATA GENERATION
   The block below fabricates realistic-looking citations so the interface is
   fully populated for review. It is NOT real research data — replace it.
   ------------------------------------------------------------------------- */

// Small seeded PRNG so the placeholder layout is stable across reloads.
function makeRng(seed) {
  let s = seed >>> 0;
  return function () {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

const AUTHOR_POOL = [
  "Almeida R", "Bergström K", "Chen L", "Donovan M", "Eriksson P",
  "Fontaine J", "Gupta S", "Haddad N", "Ibrahim A", "Jensen T",
  "Kowalski M", "Laurent C", "Moreau B", "Nakamura H", "Okafor C",
  "Petrov D", "Quintana L", "Rossi G", "Saito Y", "Tanaka K",
  "Vargas E", "Wong A", "Yamada S", "Zhao W",
];

const JOURNALS = [
  "Journal of Urology", "European Urology", "JAMA Oncology",
  "The Lancet Oncology", "International Journal of Radiation Oncology",
  "BJU International", "Prostate Cancer and Prostatic Diseases",
  "Radiotherapy and Oncology", "Urologic Oncology", "Cancer",
];

function pick(rng, arr) { return arr[Math.floor(rng() * arr.length)]; }

function authorString(rng) {
  const k = 2 + Math.floor(rng() * 3);
  const names = [];
  const used = new Set();
  while (names.length < k) {
    const a = pick(rng, AUTHOR_POOL);
    if (!used.has(a)) { used.add(a); names.push(a); }
  }
  return names.join(", ") + ", et al.";
}

function abstractFor(modLabel, n, years, rate, journal, year) {
  return (
    `BACKGROUND. The durability of disease control after ${modLabel.toLowerCase()} ` +
    `for localized prostate cancer remains incompletely characterized across ` +
    `extended follow-up. We report long-term oncologic outcomes from a single-` +
    `institution cohort. METHODS. ${n} consecutive patients treated with ` +
    `${modLabel.toLowerCase()} were retrospectively analyzed. The primary endpoint ` +
    `was biochemical progression-free survival assessed at a median follow-up of ` +
    `${years.toFixed(1)} years. RESULTS. The cumulative progression/recurrence ` +
    `rate at the reported time point was ${rate.toFixed(1)}%. Stratified analysis ` +
    `identified baseline risk category and pretreatment PSA kinetics as the ` +
    `dominant predictors of recurrence. CONCLUSIONS. These data, published in ` +
    `${journal} (${year}), support ${modLabel.toLowerCase()} as a durable option ` +
    `in appropriately selected patients and contextualize comparative ` +
    `effectiveness against alternative modalities. [Placeholder abstract — ` +
    `replace with source data.]`
  );
}

// Typical recurrence behaviour per modality (placeholder priors only).
const MOD_PROFILE = {
  surgery:       { base: 6,  slope: 1.6 },
  ebrt:          { base: 8,  slope: 1.9 },
  brachytherapy: { base: 7,  slope: 1.7 },
  cryotherapy:   { base: 12, slope: 2.6 },
  hifu:          { base: 11, slope: 2.9 },
};

function generatePlot(plotId, riskMultiplier, seed, count) {
  const rng = makeRng(seed);
  const modKeys = Object.keys(MODALITIES);
  const points = [];
  for (let i = 0; i < count; i++) {
    const modality = modKeys[i % modKeys.length];
    const prof = MOD_PROFILE[modality];
    const years = +(1.5 + rng() * 12).toFixed(1);
    const noise = (rng() - 0.5) * 9;
    let y = (prof.base + prof.slope * years) * riskMultiplier + noise;
    y = Math.max(1, Math.min(82, y));
    const n = 60 + Math.floor(rng() * 1600);
    const year = 2008 + Math.floor(rng() * 17);
    const journal = pick(rng, JOURNALS);
    const modLabel = MODALITIES[modality].label;
    points.push({
      id: `${plotId}-${i}`,
      x: years,
      y: +y.toFixed(1),
      modality,
      n,
      title: titleFor(rng, modLabel),
      authors: authorString(rng),
      journal,
      year,
      pmid: String(30000000 + Math.floor(rng() * 9000000)),
      abstract: abstractFor(modLabel, n, years, y, journal, year),
    });
  }
  return points;
}

function titleFor(rng, modLabel) {
  const templates = [
    `Long-term oncologic outcomes after ${modLabel} for localized prostate cancer`,
    `${modLabel} and biochemical recurrence: a ${10 + Math.floor(rng() * 8)}-year cohort analysis`,
    `Predictors of disease progression following ${modLabel}`,
    `Comparative durability of disease control after ${modLabel}`,
    `Recurrence patterns and salvage outcomes after ${modLabel}`,
  ];
  return pick(rng, templates);
}

const PLOTS = [
  {
    id: "low-risk",
    label: "Low-risk",
    title: "Low-risk localized prostate cancer",
    subtitle: "Disease progression by treatment modality over time since treatment",
    xLabel: "Time since treatment (years)",
    yLabel: "Disease progression / recurrence (%)",
    points: generatePlot("low-risk", 0.7, 101, 30),
  },
  {
    id: "intermediate-risk",
    label: "Intermediate-risk",
    title: "Intermediate-risk localized prostate cancer",
    subtitle: "Disease progression by treatment modality over time since treatment",
    xLabel: "Time since treatment (years)",
    yLabel: "Disease progression / recurrence (%)",
    points: generatePlot("intermediate-risk", 1.0, 202, 30),
  },
  {
    id: "high-risk",
    label: "High-risk",
    title: "High-risk localized prostate cancer",
    subtitle: "Disease progression by treatment modality over time since treatment",
    xLabel: "Time since treatment (years)",
    yLabel: "Disease progression / recurrence (%)",
    points: generatePlot("high-risk", 1.35, 303, 30),
  },
];
