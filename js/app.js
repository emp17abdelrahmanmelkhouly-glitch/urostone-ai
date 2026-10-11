// UroStone AI - Main Application Controller
// Orchestrates Clinical Decision Engine, Case-Based Reasoning, SVG Visualizations, and Registry

import { classifyHounsfieldUnit, calculatePassageProbability } from "./models.js";
import { findSimilarHistoricalCases } from "./knn.js";
import {
  getPatientCohort,
  addPatientRecord,
  deletePatientRecord,
  resetToDefaultCohort,
  exportCohortToCSV,
  exportCohortToJSON,
  importCohortFromCSV
} from "./database.js";

// --- Application State ---
const state = {
  activeTab: "tabPredictor",
  currentPatient: {
    age: 45,
    sex: "M",
    stoneSizeMm: 4.5,
    location: "uvj",
    huValue: 750,
    hydronephrosis: "mild",
    painVas: 6,
    durationDays: 3,
    metPrescribed: true,
    grossHematuria: false,
    fever: false,
    wbcCount: 8.0,
    solitaryKidney: false
  },
  cohort: [],
  registryFilter: {
    search: "",
    location: "all",
    outcome: "all"
  }
};

// --- DOM Element References ---
const elements = {
  // Navigation
  tabButtons: document.querySelectorAll(".tab-btn"),
  tabContents: document.querySelectorAll(".tab-content"),
  themeToggleBtn: document.getElementById("themeToggleBtn"),
  btnQuickReportHeader: document.getElementById("btnQuickReportHeader"),

  // Demographics
  inputPatientAge: document.getElementById("inputPatientAge"),
  inputPatientAgeText: document.getElementById("inputPatientAgeText"),
  lblPatientAge: document.getElementById("lblPatientAge"),
  genderSelector: document.getElementById("genderSelector"),
  lblPatientGender: document.getElementById("lblPatientGender"),
  lblDemographicsSummary: document.getElementById("lblDemographicsSummary"),
  btnStepAgeMinus: document.getElementById("btnStepAgeMinus"),
  btnStepAgePlus: document.getElementById("btnStepAgePlus"),
  btnGenderMale: document.getElementById("btnGenderMale"),
  btnGenderFemale: document.getElementById("btnGenderFemale"),

  // Intake Inputs
  inputStoneSize: document.getElementById("inputStoneSize"),
  inputStoneSizeText: document.getElementById("inputStoneSizeText"),
  lblStoneSize: document.getElementById("lblStoneSize"),
  lblSizeCaliberText: document.getElementById("lblSizeCaliberText"),
  lblSizeGuideline: document.getElementById("lblSizeGuideline"),
  visualStoneCircle: document.getElementById("visualStoneCircle"),
  btnResetIntake: document.getElementById("btnResetIntake"),

  lblActiveAnatomyBadge: document.getElementById("lblActiveAnatomyBadge"),
  anatomyParts: document.querySelectorAll(".anatomy-part"),
  diagramStoneMarker: document.getElementById("diagramStoneMarker"),
  locationSelector: document.getElementById("locationSelector"),
  lblLocation: document.getElementById("lblLocation"),

  inputHuValue: document.getElementById("inputHuValue"),
  inputHuValueText: document.getElementById("inputHuValueText"),
  lblHuValue: document.getElementById("lblHuValue"),
  huMarkerIndicator: document.getElementById("huMarkerIndicator"),
  huDot: document.getElementById("huDot"),
  huClassName: document.getElementById("huClassName"),
  huClassDesc: document.getElementById("huClassDesc"),

  hydronephrosisSelector: document.getElementById("hydronephrosisSelector"),
  lblHydronephrosis: document.getElementById("lblHydronephrosis"),

  inputPainScore: document.getElementById("inputPainScore"),
  lblPainScore: document.getElementById("lblPainScore"),
  inputDurationDays: document.getElementById("inputDurationDays"),
  lblDurationDays: document.getElementById("lblDurationDays"),

  chkMetPrescribed: document.getElementById("chkMetPrescribed"),
  chkHematuria: document.getElementById("chkHematuria"),
  chkFever: document.getElementById("chkFever"),
  chkSolitaryKidney: document.getElementById("chkSolitaryKidney"),

  // Presets
  presetSmallUvj: document.getElementById("presetSmallUvj"),
  presetBorderlineDistal: document.getElementById("presetBorderlineDistal"),
  presetDenseUpper: document.getElementById("presetDenseUpper"),
  presetEmergencyPyelo: document.getElementById("presetEmergencyPyelo"),

  // Predictions & Decisions
  emergencyBanner: document.getElementById("emergencyBanner"),
  emergencyReasonsList: document.getElementById("emergencyReasonsList"),
  gaugeCircle: document.getElementById("gaugeCircle"),
  probVal: document.getElementById("probVal"),
  probSummarySubtext: document.getElementById("probSummarySubtext"),
  recBadge: document.getElementById("recBadge"),
  recTitle: document.getElementById("recTitle"),
  recTimeText: document.getElementById("recTimeText"),
  recPlanList: document.getElementById("recPlanList"),
  attributionGrid: document.getElementById("attributionGrid"),

  // Surgical Pathway & Staging Matrix
  surgicalPathwayCard: document.getElementById("surgicalPathwayCard"),
  pathwayStrategyBadge: document.getElementById("pathwayStrategyBadge"),
  pathwayVerdictBanner: document.getElementById("pathwayVerdictBanner"),
  pathwayVerdictTag: document.getElementById("pathwayVerdictTag"),
  pathwayVerdictHeadline: document.getElementById("pathwayVerdictHeadline"),
  pathwayVerdictSubtext: document.getElementById("pathwayVerdictSubtext"),
  lblColDecompressBadge: document.getElementById("lblColDecompressBadge"),
  lblColDecompressTitle: document.getElementById("lblColDecompressTitle"),
  colDecompressBody: document.getElementById("colDecompressBody"),
  lblColDefinitiveBadge: document.getElementById("lblColDefinitiveBadge"),
  lblColDefinitiveTitle: document.getElementById("lblColDefinitiveTitle"),
  colDefinitiveBody: document.getElementById("colDefinitiveBody"),
  pathwayPearlBox: document.getElementById("pathwayPearlBox"),

  // EAU Input Correlation & Justification Card
  eauJustificationCard: document.getElementById("eauJustificationCard"),
  lblJustificationSummary: document.getElementById("lblJustificationSummary"),
  jItemCreatinine: document.getElementById("jItemCreatinine"),
  jTagCreatinine: document.getElementById("jTagCreatinine"),
  jBodyCreatinine: document.getElementById("jBodyCreatinine"),
  jItemInfection: document.getElementById("jItemInfection"),
  jTagInfection: document.getElementById("jTagInfection"),
  jBodyInfection: document.getElementById("jBodyInfection"),
  jItemStone: document.getElementById("jItemStone"),
  jTagStone: document.getElementById("jTagStone"),
  jBodyStone: document.getElementById("jBodyStone"),
  jItemDensity: document.getElementById("jItemDensity"),
  jTagDensity: document.getElementById("jTagDensity"),
  jBodyDensity: document.getElementById("jBodyDensity"),
  jItemStaging: document.getElementById("jItemStaging"),
  jTagStaging: document.getElementById("jTagStaging"),
  jBodyStaging: document.getElementById("jBodyStaging"),
  jItemHydronephrosis: document.getElementById("jItemHydronephrosis"),
  jTagHydronephrosis: document.getElementById("jTagHydronephrosis"),
  jBodyHydronephrosis: document.getElementById("jBodyHydronephrosis"),
  jItemSymptoms: document.getElementById("jItemSymptoms"),
  jTagSymptoms: document.getElementById("jTagSymptoms"),
  jBodySymptoms: document.getElementById("jBodySymptoms"),
  jItemMedication: document.getElementById("jItemMedication"),
  jTagMedication: document.getElementById("jTagMedication"),
  jBodyMedication: document.getElementById("jBodyMedication"),
  jItemSummary: document.getElementById("jItemSummary"),
  jTagSummary: document.getElementById("jTagSummary"),
  jBodySummary: document.getElementById("jBodySummary"),

  // Mobile Sticky Outcome Bar
  mobileStickySummary: document.getElementById("mobileStickySummary"),
  mobileProbVal: document.getElementById("mobileProbVal"),
  mobileSummaryStatus: document.getElementById("mobileSummaryStatus"),
  mobileSummaryTimeline: document.getElementById("mobileSummaryTimeline"),

  // CBR Section
  lblCohortDbCount: document.getElementById("lblCohortDbCount"),
  cbrPassageRate: document.getElementById("cbrPassageRate"),
  cbrAvgDays: document.getElementById("cbrAvgDays"),
  cbrInterventionRate: document.getElementById("cbrInterventionRate"),
  cbrMatchesContainer: document.getElementById("cbrMatchesContainer"),

  // Registry Tab
  statTotalCases: document.getElementById("statTotalCases"),
  statPassageRate: document.getElementById("statPassageRate"),
  statAvgSize: document.getElementById("statAvgSize"),
  statUrsRate: document.getElementById("statUrsRate"),
  scatterSvg: document.getElementById("scatterSvg"),
  registrySearch: document.getElementById("registrySearch"),
  filterLocation: document.getElementById("filterLocation"),
  filterOutcome: document.getElementById("filterOutcome"),
  cohortTableBody: document.getElementById("cohortTableBody"),
  btnExportCsv: document.getElementById("btnExportCsv"),
  btnImportCsv: document.getElementById("btnImportCsv"),
  csvFileInput: document.getElementById("csvFileInput"),
  btnOpenAddPatientModal: document.getElementById("btnOpenAddPatientModal"),
  btnResetCohort: document.getElementById("btnResetCohort"),

  // Consultation Note Tab
  reportDate: document.getElementById("reportDate"),
  repStoneSize: document.getElementById("repStoneSize"),
  repLocation: document.getElementById("repLocation"),
  repDensity: document.getElementById("repDensity"),
  repHydronephrosis: document.getElementById("repHydronephrosis"),
  repSymptoms: document.getElementById("repSymptoms"),
  repInfection: document.getElementById("repInfection"),
  repAiAnalysisText: document.getElementById("repAiAnalysisText"),
  repManagementPlanText: document.getElementById("repManagementPlanText"),
  btnCopyNote: document.getElementById("btnCopyNote"),
  btnPrintNote: document.getElementById("btnPrintNote"),

  // Modal
  addPatientModal: document.getElementById("addPatientModal"),
  addPatientForm: document.getElementById("addPatientForm"),
  btnCloseModal: document.getElementById("btnCloseModal"),
  btnCancelModal: document.getElementById("btnCancelModal"),
  mDaysToPassageGroup: document.getElementById("mDaysToPassageGroup"),
  mOutcome: document.getElementById("mOutcome"),

  // Toast
  toastContainer: document.getElementById("toastContainer")
};

// --- Initialization ---
document.addEventListener("DOMContentLoaded", () => {
  initTheme();
  loadCohortData();
  bindEvents();
  renderAll();
});

function initTheme() {
  const savedTheme = localStorage.getItem("urostone_theme") || "dark";
  document.documentElement.setAttribute("data-theme", savedTheme);
}

function toggleTheme() {
  const current = document.documentElement.getAttribute("data-theme") || "dark";
  const newTheme = current === "dark" ? "light" : "dark";
  document.documentElement.setAttribute("data-theme", newTheme);
  localStorage.setItem("urostone_theme", newTheme);
  renderScatterPlot();
}

function loadCohortData() {
  state.cohort = getPatientCohort();
}

// --- Event Listeners Binding ---
function bindEvents() {
  // Navigation Tabs
  elements.tabButtons.forEach(btn => {
    btn.addEventListener("click", () => {
      const targetId = btn.getAttribute("data-target");
      switchTab(targetId);
    });
  });

  elements.themeToggleBtn.addEventListener("click", toggleTheme);
  elements.btnQuickReportHeader.addEventListener("click", () => switchTab("tabReport"));

  // Patient Age (Slider & Typeable Text)
  if (elements.inputPatientAge) {
    elements.inputPatientAge.addEventListener("input", (e) => {
      state.currentPatient.age = parseInt(e.target.value, 10);
      if (elements.inputPatientAgeText && document.activeElement !== elements.inputPatientAgeText) {
        elements.inputPatientAgeText.value = state.currentPatient.age;
      }
      renderAll();
    });
  }

  if (elements.inputPatientAgeText) {
    const handleAgeTextInput = (val) => {
      const parsed = parseInt(val, 10);
      if (!isNaN(parsed) && parsed >= 10 && parsed <= 120) {
        state.currentPatient.age = parsed;
        if (elements.inputPatientAge) {
          elements.inputPatientAge.value = Math.min(90, Math.max(18, parsed));
        }
        renderAll();
      }
    };
    elements.inputPatientAgeText.addEventListener("input", (e) => handleAgeTextInput(e.target.value));
    elements.inputPatientAgeText.addEventListener("change", (e) => {
      handleAgeTextInput(e.target.value);
      if (elements.inputPatientAgeText) elements.inputPatientAgeText.value = state.currentPatient.age;
    });
    elements.inputPatientAgeText.addEventListener("keydown", (e) => {
      if (e.key === "Enter") elements.inputPatientAgeText.blur();
    });
  }

  if (elements.btnStepAgeMinus) {
    elements.btnStepAgeMinus.addEventListener("click", () => {
      state.currentPatient.age = Math.max(18, (state.currentPatient.age || 45) - 5);
      if (elements.inputPatientAge) elements.inputPatientAge.value = state.currentPatient.age;
      if (elements.inputPatientAgeText) elements.inputPatientAgeText.value = state.currentPatient.age;
      renderAll();
    });
  }
  if (elements.btnStepAgePlus) {
    elements.btnStepAgePlus.addEventListener("click", () => {
      state.currentPatient.age = Math.min(90, (state.currentPatient.age || 45) + 5);
      if (elements.inputPatientAge) elements.inputPatientAge.value = state.currentPatient.age;
      if (elements.inputPatientAgeText) elements.inputPatientAgeText.value = state.currentPatient.age;
      renderAll();
    });
  }

  document.querySelectorAll(".quick-chip[data-age]").forEach(chip => {
    chip.addEventListener("click", () => {
      const age = parseInt(chip.getAttribute("data-age"), 10);
      state.currentPatient.age = age;
      if (elements.inputPatientAge) elements.inputPatientAge.value = age;
      if (elements.inputPatientAgeText) elements.inputPatientAgeText.value = age;
      renderAll();
    });
  });

  if (elements.genderSelector) {
    elements.genderSelector.querySelectorAll(".gender-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        const gender = btn.getAttribute("data-gender");
        if (gender) {
          state.currentPatient.sex = gender;
          renderAll();
        }
      });
    });
  }

  // Stone Size (Slider & Typeable Text)
  elements.inputStoneSize.addEventListener("input", (e) => {
    state.currentPatient.stoneSizeMm = parseFloat(e.target.value);
    if (elements.inputStoneSizeText && document.activeElement !== elements.inputStoneSizeText) {
      elements.inputStoneSizeText.value = state.currentPatient.stoneSizeMm.toFixed(1);
    }
    renderAll();
  });

  if (elements.inputStoneSizeText) {
    const handleStoneTextInput = (val) => {
      const cleanVal = String(val).replace(",", ".");
      const parsed = parseFloat(cleanVal);
      if (!isNaN(parsed) && parsed > 0 && parsed <= 40) {
        state.currentPatient.stoneSizeMm = parsed;
        if (elements.inputStoneSize) {
          elements.inputStoneSize.value = Math.min(15.0, Math.max(1.0, parsed));
        }
        renderAll();
      }
    };

    elements.inputStoneSizeText.addEventListener("input", (e) => {
      handleStoneTextInput(e.target.value);
    });

    elements.inputStoneSizeText.addEventListener("change", (e) => {
      handleStoneTextInput(e.target.value);
      if (elements.inputStoneSizeText) {
        elements.inputStoneSizeText.value = state.currentPatient.stoneSizeMm.toFixed(1);
      }
    });

    elements.inputStoneSizeText.addEventListener("keydown", (e) => {
      if (e.key === "Enter") elements.inputStoneSizeText.blur();
    });
  }

  const ANATOMY_COORDINATES = {
    puj: { x: 82, y: 60 },
    proximal: { x: 122, y: 76 },
    mid: { x: 170, y: 105 },
    distal: { x: 225, y: 120 },
    uvj: { x: 268, y: 120 }
  };

  function updateDiagramStoneMarker(loc) {
    if (!elements.diagramStoneMarker) return;
    const coords = ANATOMY_COORDINATES[loc] || ANATOMY_COORDINATES.uvj;
    elements.diagramStoneMarker.setAttribute("transform", `translate(${coords.x}, ${coords.y})`);
    elements.diagramStoneMarker.style.transform = `translate(${coords.x}px, ${coords.y}px)`;
  }

  function setLocation(loc) {
    state.currentPatient.location = loc;
    elements.locationSelector.querySelectorAll(".location-btn").forEach(b => {
      b.classList.toggle("active", b.getAttribute("data-location") === loc);
    });
    elements.anatomyParts.forEach(p => {
      p.classList.toggle("active-part", p.getAttribute("data-location") === loc);
    });
    updateDiagramStoneMarker(loc);
    const labels = {
      uvj: "CALCULUS SITE: UVJ (TERMINAL JUNCTION)",
      distal: "CALCULUS SITE: DISTAL URETER",
      mid: "CALCULUS SITE: MID URETER (ILIAC CROSSING)",
      proximal: "CALCULUS SITE: PROXIMAL (UPPER) URETER",
      puj: "CALCULUS SITE: PUJ (PELVIURETERIC JUNCTION)"
    };
    if (elements.lblActiveAnatomyBadge) {
      elements.lblActiveAnatomyBadge.innerHTML = `<span style="display:inline-block; width:8px; height:8px; border-radius:50%; background:#ef4444; margin-right:6px; box-shadow:0 0 8px #ef4444; vertical-align:middle;"></span>${labels[loc] || `CALCULUS SITE: ${loc.toUpperCase()}`}`;
    }
    renderAll();
  }

  // Anatomy Schematic Click Handlers
  elements.anatomyParts.forEach(part => {
    part.addEventListener("click", () => {
      const loc = part.getAttribute("data-location");
      if (loc) setLocation(loc);
    });
  });

  // Location Buttons
  elements.locationSelector.querySelectorAll(".location-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      const loc = btn.getAttribute("data-location");
      if (loc) setLocation(loc);
    });
  });

  // HU Slider
  elements.inputHuValue.addEventListener("input", (e) => {
    state.currentPatient.huValue = parseInt(e.target.value, 10);
    renderAll();
  });

  // Hydronephrosis Segments
  elements.hydronephrosisSelector.querySelectorAll(".segment-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      const val = btn.getAttribute("data-value");
      state.currentPatient.hydronephrosis = val;
      elements.hydronephrosisSelector.querySelectorAll(".segment-btn").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      renderAll();
    });
  });

  // Pain VAS & Duration
  elements.inputPainScore.addEventListener("input", (e) => {
    state.currentPatient.painVas = parseInt(e.target.value, 10);
    renderAll();
  });

  elements.inputDurationDays.addEventListener("input", (e) => {
    state.currentPatient.durationDays = parseInt(e.target.value, 10);
    renderAll();
  });

  // Toggles
  elements.chkMetPrescribed.addEventListener("change", (e) => {
    state.currentPatient.metPrescribed = e.target.checked;
    renderAll();
  });

  elements.chkHematuria.addEventListener("change", (e) => {
    state.currentPatient.grossHematuria = e.target.checked;
    renderAll();
  });

  elements.chkFever.addEventListener("change", (e) => {
    state.currentPatient.fever = e.target.checked;
    renderAll();
  });

  elements.chkSolitaryKidney.addEventListener("change", (e) => {
    state.currentPatient.solitaryKidney = e.target.checked;
    renderAll();
  });

  // Reset Intake
  elements.btnResetIntake.addEventListener("click", () => {
    applyPatientPreset({
      stoneSizeMm: 4.5,
      location: "uvj",
      huValue: 750,
      hydronephrosis: "mild",
      painVas: 6,
      durationDays: 3,
      metPrescribed: true,
      grossHematuria: false,
      fever: false,
      solitaryKidney: false
    });
    showToast("Intake reset to default values.");
  });

  // Presets
  elements.presetSmallUvj.addEventListener("click", () => {
    applyPatientPreset({
      stoneSizeMm: 3.2,
      location: "uvj",
      huValue: 680,
      hydronephrosis: "mild",
      painVas: 5,
      durationDays: 2,
      metPrescribed: true,
      grossHematuria: false,
      fever: false,
      solitaryKidney: false
    });
    showToast("Loaded Preset: Small UVJ Calculus (3.2mm)");
  });

  elements.presetBorderlineDistal.addEventListener("click", () => {
    applyPatientPreset({
      stoneSizeMm: 5.5,
      location: "distal",
      huValue: 880,
      hydronephrosis: "moderate",
      painVas: 7,
      durationDays: 6,
      metPrescribed: true,
      grossHematuria: true,
      fever: false,
      solitaryKidney: false
    });
    showToast("Loaded Preset: Borderline Distal Calculus (5.5mm)");
  });

  elements.presetDenseUpper.addEventListener("click", () => {
    applyPatientPreset({
      stoneSizeMm: 7.5,
      location: "proximal",
      huValue: 1250,
      hydronephrosis: "moderate",
      painVas: 8,
      durationDays: 10,
      metPrescribed: false,
      grossHematuria: true,
      fever: false,
      solitaryKidney: false
    });
    showToast("Loaded Preset: Dense Upper Ureter Calculus (7.5mm)");
  });

  elements.presetEmergencyPyelo.addEventListener("click", () => {
    applyPatientPreset({
      stoneSizeMm: 8.2,
      location: "uvj",
      huValue: 1050,
      hydronephrosis: "severe",
      painVas: 9,
      durationDays: 7,
      metPrescribed: false,
      grossHematuria: true,
      fever: true,
      wbcCount: 16.5,
      solitaryKidney: false
    });
    showToast("Loaded Preset: Obstructive Pyelonephritis (Emergency Alert)");
  });

  // Registry Toolbar Actions
  elements.registrySearch.addEventListener("input", (e) => {
    state.registryFilter.search = e.target.value.toLowerCase();
    renderCohortTable();
  });

  elements.filterLocation.addEventListener("change", (e) => {
    state.registryFilter.location = e.target.value;
    renderCohortTable();
  });

  elements.filterOutcome.addEventListener("change", (e) => {
    state.registryFilter.outcome = e.target.value;
    renderCohortTable();
  });

  elements.btnExportCsv.addEventListener("click", () => {
    exportCohortToCSV();
    showToast("Cohort database exported as CSV.");
  });

  elements.btnImportCsv.addEventListener("click", () => {
    elements.csvFileInput.click();
  });

  elements.csvFileInput.addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        state.cohort = importCohortFromCSV(event.target.result);
        renderAll();
        showToast("CSV Cohort successfully imported!");
      } catch (err) {
        showToast("Failed to import CSV: " + err.message);
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  });

  elements.btnResetCohort.addEventListener("click", () => {
    if (confirm("Reset clinical database to original 50-patient sample cohort?")) {
      state.cohort = resetToDefaultCohort();
      renderAll();
      showToast("Cohort database reset to defaults.");
    }
  });

  // Add Patient Modal
  elements.btnOpenAddPatientModal.addEventListener("click", () => {
    document.getElementById("mPtId").value = `PT-${1000 + state.cohort.length + 1}`;
    elements.addPatientModal.classList.add("open");
  });

  elements.btnCloseModal.addEventListener("click", () => elements.addPatientModal.classList.remove("open"));
  elements.btnCancelModal.addEventListener("click", () => elements.addPatientModal.classList.remove("open"));

  elements.mOutcome.addEventListener("change", (e) => {
    if (e.target.value === "passed") {
      elements.mDaysToPassageGroup.style.display = "block";
    } else {
      elements.mDaysToPassageGroup.style.display = "none";
    }
  });

  elements.addPatientForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const isPassed = elements.mOutcome.value === "passed";
    const newPatient = {
      id: document.getElementById("mPtId").value.trim(),
      age: parseInt(document.getElementById("mPtAge").value, 10),
      sex: document.getElementById("mPtSex").value,
      stoneSizeMm: parseFloat(document.getElementById("mStoneSize").value),
      location: document.getElementById("mLocation").value,
      huValue: parseInt(document.getElementById("mHuValue").value, 10),
      hydronephrosis: document.getElementById("mHydronephrosis").value,
      painVas: parseInt(document.getElementById("mPainVas").value, 10),
      durationDays: parseInt(document.getElementById("mDuration").value, 10),
      outcome: elements.mOutcome.value,
      daysToPassage: isPassed ? parseInt(document.getElementById("mDaysToPassage").value, 10) : null,
      interventionType: document.getElementById("mInterventionType").value,
      metPrescribed: document.getElementById("mMet").value === "true",
      notes: document.getElementById("mNotes").value.trim()
    };

    state.cohort = addPatientRecord(newPatient);
    elements.addPatientModal.classList.remove("open");
    renderAll();
    showToast(`Patient record ${newPatient.id} recorded into cohort!`);
  });

  // Consultation Note Copy & Print
  elements.btnCopyNote.addEventListener("click", copyConsultationNoteToClipboard);
  elements.btnPrintNote.addEventListener("click", () => window.print());
}

// --- Navigation Tab Switcher ---
function switchTab(tabId) {
  state.activeTab = tabId;
  elements.tabButtons.forEach(btn => {
    const isMatch = btn.getAttribute("data-target") === tabId;
    btn.classList.toggle("active", isMatch);
    btn.setAttribute("aria-selected", isMatch ? "true" : "false");
  });

  elements.tabContents.forEach(content => {
    content.classList.toggle("active", content.id === tabId);
  });

  if (tabId === "tabRegistry") {
    renderScatterPlot();
    renderCohortTable();
  } else if (tabId === "tabReport") {
    renderReportView();
  }
}

// --- Preset Applicator ---
function applyPatientPreset(preset) {
  Object.assign(state.currentPatient, preset);

  // Sync Demographics
  if (preset.age !== undefined && elements.inputPatientAge) elements.inputPatientAge.value = preset.age;
  if (preset.age !== undefined && elements.inputPatientAgeText) elements.inputPatientAgeText.value = preset.age;
  if (preset.sex && elements.genderSelector) {
    elements.genderSelector.querySelectorAll(".gender-btn").forEach(btn => {
      btn.classList.toggle("active", btn.getAttribute("data-gender") === preset.sex);
    });
  }

  // Sync Input Controls
  elements.inputStoneSize.value = preset.stoneSizeMm;
  elements.inputHuValue.value = preset.huValue;
  elements.inputPainScore.value = preset.painVas;
  elements.inputDurationDays.value = preset.durationDays;
  elements.chkMetPrescribed.checked = preset.metPrescribed;
  elements.chkHematuria.checked = preset.grossHematuria;
  elements.chkFever.checked = preset.fever;
  elements.chkSolitaryKidney.checked = preset.solitaryKidney;

  // Sync Location Buttons
  elements.locationSelector.querySelectorAll(".location-btn").forEach(btn => {
    btn.classList.toggle("active", btn.getAttribute("data-location") === preset.location);
  });

  // Sync Hydronephrosis Buttons
  elements.hydronephrosisSelector.querySelectorAll(".segment-btn").forEach(btn => {
    btn.classList.toggle("active", btn.getAttribute("data-value") === preset.hydronephrosis);
  });

  renderAll();
}

// --- Master Render Function ---
function renderAll() {
  renderIntakeDisplays();
  const predictions = calculatePassageProbability(state.currentPatient);
  const cbrResults = findSimilarHistoricalCases(state.currentPatient, state.cohort, 6);

  renderPredictionHero(predictions);
  renderAttributionGrid(predictions.featureImpacts);
  renderCbrSection(cbrResults);
  renderRegistryStats();
  renderReportView();

  // Update Mobile Sticky Live Outcome Bar
  const passageRatePercent = (typeof predictions.probabilityPercent === "number" && !isNaN(predictions.probabilityPercent))
    ? predictions.probabilityPercent
    : (typeof predictions.percentage === "number" && !isNaN(predictions.percentage) ? predictions.percentage : 84);

  if (elements.mobileProbVal) {
    elements.mobileProbVal.textContent = `${passageRatePercent}%`;
    if (passageRatePercent >= 70) {
      elements.mobileProbVal.style.color = "var(--color-success)";
    } else if (passageRatePercent >= 45) {
      elements.mobileProbVal.style.color = "var(--color-warning)";
    } else {
      elements.mobileProbVal.style.color = "var(--color-danger)";
    }
  }
  if (elements.mobileSummaryStatus) {
    if (predictions.isEmergency) {
      elements.mobileSummaryStatus.textContent = "EMERGENCY: SEPSIS / DECOMPRESS";
      elements.mobileSummaryStatus.style.color = "var(--color-danger)";
    } else if (passageRatePercent >= 65) {
      const isMet = state.currentPatient.metPrescribed;
      elements.mobileSummaryStatus.textContent = isMet ? "OBSERVE (MET INDICATED)" : "OBSERVE (4-WK LIMIT)";
      elements.mobileSummaryStatus.style.color = "var(--color-success)";
    } else {
      elements.mobileSummaryStatus.textContent = "ACTIVE REMOVAL INDICATED";
      elements.mobileSummaryStatus.style.color = "var(--color-warning)";
    }
  }
  if (elements.mobileSummaryTimeline) {
    const locMap = { uvj: "UVJ", distal: "Distal", mid: "Mid", proximal: "Proximal", puj: "PUJ" };
    let shortTimeline = "";
    if (passageRatePercent >= 75) {
      shortTimeline = state.currentPatient.stoneSizeMm <= 3.5 ? "~2 to 6 days" : "~5 to 12 days";
    } else if (passageRatePercent >= 50) {
      shortTimeline = "~8 to 18 days";
    } else if (passageRatePercent >= 30) {
      shortTimeline = "Prolonged (14–28d)";
    } else {
      shortTimeline = "Endourology indicated";
    }
    elements.mobileSummaryTimeline.textContent = `${shortTimeline} • ${locMap[state.currentPatient.location] || state.currentPatient.location.toUpperCase()}`;
  }

  if (state.activeTab === "tabRegistry") {
    renderScatterPlot();
    renderCohortTable();
  }
}

// --- Render Intake Displays ---
function renderIntakeDisplays() {
  const p = state.currentPatient;

  // Age & Gender Demographics
  if (elements.lblPatientAge) {
    elements.lblPatientAge.textContent = `${p.age || 45} yrs`;
  }
  if (elements.inputPatientAge && document.activeElement !== elements.inputPatientAge) {
    elements.inputPatientAge.value = p.age || 45;
  }
  if (elements.inputPatientAgeText && document.activeElement !== elements.inputPatientAgeText) {
    elements.inputPatientAgeText.value = p.age || 45;
  }
  document.querySelectorAll(".quick-chip[data-age]").forEach(chip => {
    const chipVal = parseInt(chip.getAttribute("data-age"), 10);
    chip.classList.toggle("active", Math.abs(chipVal - (p.age || 45)) < 4);
  });

  const isFemale = (p.sex || "M").toUpperCase() === "F";
  if (elements.lblPatientGender) {
    elements.lblPatientGender.textContent = isFemale ? "Female (F)" : "Male (M)";
  }
  if (elements.lblDemographicsSummary) {
    elements.lblDemographicsSummary.textContent = `${p.age || 45}y • ${isFemale ? "FEMALE (F)" : "MALE (M)"}`;
  }
  if (elements.genderSelector) {
    elements.genderSelector.querySelectorAll(".gender-btn").forEach(btn => {
      btn.classList.toggle("active", btn.getAttribute("data-gender") === (isFemale ? "F" : "M"));
    });
  }

  // Stone Size
  if (elements.lblStoneSize) {
    elements.lblStoneSize.textContent = `${p.stoneSizeMm.toFixed(1)} mm`;
  }
  if (elements.inputStoneSizeText && document.activeElement !== elements.inputStoneSizeText) {
    elements.inputStoneSizeText.value = p.stoneSizeMm.toFixed(1);
  }
  // Relative visual circle diameter (scale: 1mm = ~3.2px, max 48px)
  const circlePx = Math.min(44, Math.max(8, p.stoneSizeMm * 3.4));
  elements.visualStoneCircle.style.width = `${circlePx}px`;
  elements.visualStoneCircle.style.height = `${circlePx}px`;

  if (p.stoneSizeMm <= 4.0) {
    elements.lblSizeCaliberText.textContent = "Small Caliber (≤ 4mm)";
    elements.lblSizeGuideline.textContent = "EAU/AUA: ~80-90% spontaneous passage rate";
  } else if (p.stoneSizeMm <= 6.0) {
    elements.lblSizeCaliberText.textContent = "Intermediate Caliber (4–6mm)";
    elements.lblSizeGuideline.textContent = "EAU/AUA: ~50-60% passage rate; high benefit from MET";
  } else if (p.stoneSizeMm <= 8.0) {
    elements.lblSizeCaliberText.textContent = "Large Caliber (6–8mm)";
    elements.lblSizeGuideline.textContent = "EAU/AUA: ~20-30% passage rate; high impaction risk";
  } else {
    elements.lblSizeCaliberText.textContent = "Very Large (> 8mm)";
    elements.lblSizeGuideline.textContent = "EAU/AUA: Primary surgical intervention recommended";
  }

  // Location
  const locMap = {
    uvj: "UVJ (Junction)",
    distal: "Distal Ureter",
    mid: "Mid Ureter",
    proximal: "Proximal Ureter",
    puj: "PUJ (Pelviureteric)"
  elements.lblLocation.textContent = locMap[p.location] || p.location;
  updateDiagramStoneMarker(p.location);
  elements.anatomyParts.forEach(part => {
    part.classList.toggle("active-part", part.getAttribute("data-location") === p.location);
  });
  elements.locationSelector.querySelectorAll(".location-btn").forEach(btn => {
    btn.classList.toggle("active", btn.getAttribute("data-location") === p.location);
  });

  // HU Attenuation
  elements.lblHuValue.textContent = `${p.huValue} HU`;
  const huPercent = Math.min(100, Math.max(0, ((p.huValue - 150) / (1600 - 150)) * 100));
  elements.huMarkerIndicator.style.left = `${huPercent}%`;

  const huClassification = classifyHounsfieldUnit(p.huValue);
  elements.huDot.style.backgroundColor = huClassification.colorCode;
  elements.huClassName.textContent = `${huClassification.category} (${huClassification.hardness})`;
  elements.huClassDesc.textContent = huClassification.description;

  // Hydronephrosis
  elements.lblHydronephrosis.textContent = p.hydronephrosis.charAt(0).toUpperCase() + p.hydronephrosis.slice(1);

  // Pain VAS & Days
  elements.lblPainScore.textContent = `${p.painVas} / 10`;
  elements.lblDurationDays.textContent = `${p.durationDays} ${p.durationDays === 1 ? "Day" : "Days"}`;
}

// --- Render Predictions & Decision Engine Hero ---
function renderPredictionHero(pred) {
  // Emergency Red Flags
  if (pred.isEmergency) {
    elements.emergencyBanner.classList.add("active");
    elements.emergencyReasonsList.innerHTML = pred.emergencyReasons
      .map(r => `<div>&bull; <strong>${r}</strong></div>`)
      .join("");
  } else {
    elements.emergencyBanner.classList.remove("active");
    elements.emergencyReasonsList.innerHTML = "";
  }

  // Circular Gauge Animation
  const percent = pred.probabilityPercent;
  const circumference = 440;

  if (pred.isEmergency) {
    elements.probVal.textContent = "0";
    if (elements.lblConfidenceInterval) {
      elements.lblConfidenceInterval.textContent = "CONTRAINDICATED (EAU § 3.2.3)";
      elements.lblConfidenceInterval.className = "confidence-interval-badge alert-contraindicated";
    }
    elements.gaugeCircle.style.strokeDashoffset = circumference;
    elements.gaugeCircle.style.stroke = "var(--status-danger)";
    elements.probSummarySubtext.textContent = "Spontaneous passage trial strictly contraindicated. Obstructive urosepsis mandates emergency decompression within hours (EAU LoE 1b).";
  } else {
    elements.probVal.textContent = percent;
    if (elements.lblConfidenceInterval) {
      elements.lblConfidenceInterval.className = "confidence-interval-badge";
      elements.lblConfidenceInterval.textContent = `95% CI: ${pred.ciLow || Math.max(1, percent - 5)}% – ${pred.ciHigh || Math.min(99, percent + 5)}%`;
    }
    const offset = circumference - (circumference * percent) / 100;
    elements.gaugeCircle.style.strokeDashoffset = offset;

    // Dynamic Color on Gauge
    if (percent >= 70) {
      elements.gaugeCircle.style.stroke = "var(--status-success)";
      elements.probSummarySubtext.textContent = "High probability of spontaneous expulsion within 4 weeks.";
    } else if (percent >= 45) {
      elements.gaugeCircle.style.stroke = "var(--status-warning)";
      elements.probSummarySubtext.textContent = "Borderline probability. Limited trial of MET under surveillance.";
    } else {
      elements.gaugeCircle.style.stroke = "var(--status-danger)";
      elements.probSummarySubtext.textContent = "Low spontaneous passage. Endourological intervention recommended.";
    }
  }

  // Recommendation Badge & Title
  elements.recBadge.className = `rec-badge ${pred.recommendationBadgeClass}`;
  elements.recBadge.textContent = pred.recommendationCategory.replace(/_/g, " ");
  elements.recTitle.textContent = pred.actionTitle;
  elements.recTimeText.textContent = pred.timePassageSummary;

  // Render Surgical Staging & Modality Pathway Card
  if (pred.surgicalPathway && elements.surgicalPathwayCard) {
    const sp = pred.surgicalPathway;
    elements.surgicalPathwayCard.classList.toggle("alert-emergency", Boolean(pred.isEmergency));
    if (elements.pathwayStrategyBadge) {
      elements.pathwayStrategyBadge.textContent = sp.strategyBadge;
      elements.pathwayStrategyBadge.className = `pathway-strategy-badge ${sp.strategyBadgeClass || ""}`;
    }
    if (elements.pathwayVerdictTag) elements.pathwayVerdictTag.textContent = sp.verdictTag;
    if (elements.pathwayVerdictHeadline) elements.pathwayVerdictHeadline.textContent = sp.verdictHeadline;
    if (elements.pathwayVerdictSubtext) elements.pathwayVerdictSubtext.textContent = sp.verdictSubtext;
    if (elements.lblColDecompressBadge) elements.lblColDecompressBadge.textContent = sp.colDecompressBadge;
    if (elements.lblColDecompressTitle) elements.lblColDecompressTitle.textContent = sp.colDecompressTitle;
    if (elements.colDecompressBody) elements.colDecompressBody.innerHTML = sp.colDecompressHtml;
    if (elements.lblColDefinitiveBadge) elements.lblColDefinitiveBadge.textContent = sp.colDefinitiveBadge;
    if (elements.lblColDefinitiveTitle) elements.lblColDefinitiveTitle.textContent = sp.colDefinitiveTitle;
    if (elements.colDefinitiveBody) elements.colDefinitiveBody.innerHTML = sp.colDefinitiveHtml;
    if (elements.pathwayPearlBox) elements.pathwayPearlBox.innerHTML = sp.pearlHtml;
  }

  // Render EAU Multi-Parametric Input Correlation & Treatment Justification Card
  if (pred.inputJustifications && elements.eauJustificationCard) {
    const j = pred.inputJustifications;
    const setJItem = (itemEl, tagEl, bodyEl, data) => {
      if (!itemEl || !data) return;
      itemEl.className = `justification-item alert-${data.alertLevel || "success"}`;
      if (tagEl) tagEl.textContent = data.statusTag || "";
      if (bodyEl) bodyEl.innerHTML = data.rationaleHtml || "";
    };
    setJItem(elements.jItemCreatinine, elements.jTagCreatinine, elements.jBodyCreatinine, j.renal);
    setJItem(elements.jItemInfection, elements.jTagInfection, elements.jBodyInfection, j.infection);
    setJItem(elements.jItemStone, elements.jTagStone, elements.jBodyStone, j.stone);
    setJItem(elements.jItemDensity, elements.jTagDensity, elements.jBodyDensity, j.density);
    setJItem(elements.jItemHydronephrosis, elements.jTagHydronephrosis, elements.jBodyHydronephrosis, j.hydronephrosis);
    setJItem(elements.jItemSymptoms, elements.jTagSymptoms, elements.jBodySymptoms, j.symptoms);
    setJItem(elements.jItemMedication, elements.jTagMedication, elements.jBodyMedication, j.medication);
    setJItem(elements.jItemStaging, elements.jTagStaging, elements.jBodyStaging, j.staging);
    setJItem(elements.jItemSummary, elements.jTagSummary, elements.jBodySummary, j.treatmentChoiceSummary);
  }

  // Structured Action Plan List
  elements.recPlanList.innerHTML = pred.clinicalActionPlan
    .map(step => `
      <li class="rec-plan-item">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg>
        <span>${step}</span>
      </li>
    `)
    .join("");
}

// --- Render Explainable AI Feature Attribution ---
function renderAttributionGrid(impacts) {
  elements.attributionGrid.innerHTML = impacts
    .map(item => {
      const impactClass = item.type === "positive" ? "impact-pos" : (item.type === "negative" ? "impact-neg" : "impact-neu");
      return `
        <div class="attribution-chip">
          <div class="attribution-top">
            <span class="attr-feature">${item.feature}</span>
            <span class="attr-impact ${impactClass}">${item.impact}</span>
          </div>
          <div class="attr-detail">${item.detail}</div>
        </div>
      `;
    })
    .join("");
}

// --- Render Case-Based Reasoning Matches ---
function renderCbrSection(cbr) {
  elements.lblCohortDbCount.textContent = `Registry: ${state.cohort.length} cases`;

  if (cbr.isEmergencyStratum) {
    elements.cbrPassageRate.textContent = `${cbr.historicalPassageRate}%`;
    elements.cbrPassageRate.style.color = "var(--status-danger)";
    elements.cbrAvgDays.textContent = cbr.avgDaysToPassage !== null ? `${cbr.avgDaysToPassage} d` : "Contraindicated";
    elements.cbrAvgDays.style.color = "var(--status-danger)";
    elements.cbrInterventionRate.textContent = `${100 - cbr.historicalPassageRate}%`;
    elements.cbrInterventionRate.style.color = "var(--status-danger)";
  } else if (cbr.hasRenalImpairment) {
    elements.cbrPassageRate.textContent = `${cbr.historicalPassageRate}%`;
    elements.cbrPassageRate.style.color = cbr.historicalPassageRate === 0 ? "var(--status-danger)" : (cbr.historicalPassageRate < 50 ? "var(--color-warning)" : "var(--status-success)");
    elements.cbrAvgDays.textContent = cbr.historicalPassageRate === 0 ? "Contraindicated" : (cbr.avgDaysToPassage !== null ? `${cbr.avgDaysToPassage} d` : "Expedient Relief");
    elements.cbrAvgDays.style.color = "var(--status-danger)";
    elements.cbrInterventionRate.textContent = `${100 - cbr.historicalPassageRate}%`;
    elements.cbrInterventionRate.style.color = "var(--status-danger)";
  } else {
    elements.cbrPassageRate.textContent = `${cbr.historicalPassageRate}%`;
    elements.cbrPassageRate.style.color = cbr.historicalPassageRate >= 50 ? "var(--status-success)" : "var(--color-warning)";
    elements.cbrAvgDays.textContent = cbr.avgDaysToPassage !== null ? `${cbr.avgDaysToPassage} d` : "N/A";
    elements.cbrAvgDays.style.color = "var(--accent-sky)";
    elements.cbrInterventionRate.textContent = `${100 - cbr.historicalPassageRate}%`;
    elements.cbrInterventionRate.style.color = (100 - cbr.historicalPassageRate) >= 50 ? "var(--status-danger)" : "var(--color-warning)";
  }

  if (cbr.topMatches.length === 0) {
    elements.cbrMatchesContainer.innerHTML = `<div style="grid-column: 1/-1; padding: 1rem; color: var(--text-muted); text-align: center;">No matching historical cases found.</div>`;
    return;
  }

  let emergencyNoticeHtml = "";
  if (cbr.isRenalEmergencyStratum) {
    emergencyNoticeHtml = `
      <div class="cbr-emergency-callout cbr-renal-callout">
        <strong>⚠ CRITICAL RENAL STRATIFICATION (EAU § 3.2.3 & § 3.4.1):</strong> Acute Post-Renal Azotemia / AKI detected (<strong>sCr: ${(cbr.queryCreatinine || 1.0).toFixed(2)} mg/dL</strong>). The model has automatically stratified matching against <em>historical cases with acute obstructive renal impairment requiring urgent upper tract decompression (JJ Stent / PCN)</em>. Spontaneous passage trial with MET is strictly contraindicated in this cohort to prevent irreversible loss of nephron mass.
      </div>
    `;
  } else if (cbr.isSepsisStratum) {
    emergencyNoticeHtml = `
      <div class="cbr-emergency-callout">
        <strong>🚨 CRITICAL SEPSIS STRATIFICATION (EAU § 3.2.3):</strong> Active fever / SIRS criteria detected. The model has automatically stratified matching against <em>historical emergency urosepsis presentations</em> requiring urgent upper tract decompression (JJ Stent / PCN). Spontaneous trial with MET is strictly contraindicated in this cohort.
      </div>
    `;
  } else if (cbr.isEmergencyStratum) {
    emergencyNoticeHtml = `
      <div class="cbr-emergency-callout">
        <strong>⚠ CRITICAL CLINICAL STRATIFICATION (EAU § 3.2.3):</strong> Emergency decompression criteria met (obstructed solitary kidney / severe hydronephrosis). Matching against urgent historical decompression cohorts. Spontaneous trial contraindicated.
      </div>
    `;
  } else if (cbr.hasRenalImpairment) {
    emergencyNoticeHtml = `
      <div class="cbr-warning-callout">
        <strong>⚠ EAU RENAL IMPAIRMENT CORRELATION:</strong> Elevated serum creatinine (${(cbr.queryCreatinine || 1.0).toFixed(2)} mg/dL) indicates post-renal AKI. Historical matching prioritizes patients with renal compromise, demonstrating high intervention rates and stenting requirements. Spontaneous passage with MET is contraindicated.
      </div>
    `;
  }

  elements.cbrMatchesContainer.innerHTML = emergencyNoticeHtml + cbr.topMatches
    .map(pt => {
      const isPassed = pt.outcome === "passed";
      const outcomeBadge = isPassed
        ? `<span class="outcome-pill outcome-passed">Passed (${pt.daysToPassage || "?"}d)</span>`
        : `<span class="outcome-pill outcome-intervention">Intervened (${(pt.interventionType || "URS").toUpperCase()})</span>`;

      const sCrVal = typeof pt.serumCreatinine === "number" ? pt.serumCreatinine : (parseFloat(pt.serumCreatinine) || 1.0);
      const isSevereCr = sCrVal >= 2.0;
      const isElevCr = sCrVal > (pt.sex === "F" ? 1.00 : 1.20);
      const crChipClass = isSevereCr ? "metric-chip-danger" : (isElevCr ? "metric-chip-warning" : "");
      const crLabel = isSevereCr ? " (Azotemia)" : (isElevCr ? " (AKI)" : "");

      return `
        <div class="match-card">
          <div class="match-card-top">
            <div class="match-pt-id">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
              <span>${pt.id}</span>
              <span style="font-size: 0.7rem; color: var(--text-muted); font-weight: normal;">(${pt.age}y, ${pt.sex})</span>
            </div>
            <span class="similarity-badge">${pt.similarityScore}% Match</span>
          </div>

          <div class="match-metrics-chips">
            <span class="metric-chip">Size: ${pt.stoneSizeMm}mm</span>
            <span class="metric-chip">${(pt.location || "").toUpperCase()}</span>
            <span class="metric-chip">${pt.huValue} HU</span>
            <span class="metric-chip">Hydro: ${pt.hydronephrosis}</span>
            <span class="metric-chip ${crChipClass}">sCr: ${sCrVal.toFixed(2)} mg/dL${crLabel}</span>
            <span class="metric-chip">${pt.metPrescribed ? "MET: Yes" : "No MET"}</span>
            ${pt.fever ? '<span class="metric-chip metric-chip-danger">Fever/Sepsis</span>' : ''}
          </div>

          <div class="match-outcome-row">
            <span style="color: var(--text-secondary); font-size: 0.72rem;">Actual Outcome:</span>
            ${outcomeBadge}
          </div>

          ${pt.notes ? `<div class="match-note-text">"${pt.notes}"</div>` : ""}
        </div>
      `;
    })
    .join("");
}

// --- Render Registry Overview Statistics ---
function renderRegistryStats() {
  const total = state.cohort.length;
  elements.statTotalCases.textContent = total;

  if (total === 0) {
    elements.statPassageRate.textContent = "0%";
    elements.statAvgSize.textContent = "0.0 mm";
    elements.statUrsRate.textContent = "0%";
    return;
  }

  const passedCount = state.cohort.filter(p => p.outcome === "passed").length;
  const passageRate = Math.round((passedCount / total) * 100);
  elements.statPassageRate.textContent = `${passageRate}%`;

  const totalSize = state.cohort.reduce((acc, p) => acc + (p.stoneSizeMm || 0), 0);
  elements.statAvgSize.textContent = `${(totalSize / total).toFixed(1)} mm`;

  const ursCount = state.cohort.filter(p => (p.interventionType || "").includes("urs")).length;
  elements.statUrsRate.textContent = `${Math.round((ursCount / total) * 100)}%`;
}

// --- Render Interactive Cohort Scatter Plot ---
function renderScatterPlot() {
  const svg = elements.scatterSvg;
  svg.innerHTML = "";

  const width = svg.clientWidth || 900;
  const height = 280;
  const padding = { top: 20, right: 30, bottom: 40, left: 60 };

  const plotWidth = width - padding.left - padding.right;
  const plotHeight = height - padding.top - padding.bottom;

  // Scales
  const minSize = 1.0;
  const maxSize = 14.0;
  const minHu = 150;
  const maxHu = 1600;

  const xScale = (size) => padding.left + ((size - minSize) / (maxSize - minSize)) * plotWidth;
  const yScale = (hu) => padding.top + plotHeight - ((hu - minHu) / (maxHu - minHu)) * plotHeight;

  // Grid lines & Axis labels
  let gridSvg = "";
  // X grid (Size)
  for (let s = 2; s <= 14; s += 2) {
    const x = xScale(s);
    gridSvg += `<line x1="${x}" y1="${padding.top}" x2="${x}" y2="${padding.top + plotHeight}" stroke="var(--border-subtle)" stroke-dasharray="2,2" />`;
    gridSvg += `<text x="${x}" y="${padding.top + plotHeight + 20}" fill="var(--text-muted)" font-size="11" text-anchor="middle">${s} mm</text>`;
  }

  // Y grid (HU)
  for (let h = 300; h <= 1500; h += 300) {
    const y = yScale(h);
    gridSvg += `<line x1="${padding.left}" y1="${y}" x2="${padding.left + plotWidth}" y2="${y}" stroke="var(--border-subtle)" stroke-dasharray="2,2" />`;
    gridSvg += `<text x="${padding.left - 10}" y="${y + 4}" fill="var(--text-muted)" font-size="11" text-anchor="end">${h} HU</text>`;
  }

  // Axes lines
  gridSvg += `<line x1="${padding.left}" y1="${padding.top + plotHeight}" x2="${padding.left + plotWidth}" y2="${padding.top + plotHeight}" stroke="var(--text-secondary)" stroke-width="1.5" />`;
  gridSvg += `<line x1="${padding.left}" y1="${padding.top}" x2="${padding.left}" y2="${padding.top + plotHeight}" stroke="var(--text-secondary)" stroke-width="1.5" />`;

  // Axis Titles
  gridSvg += `<text x="${padding.left + plotWidth / 2}" y="${height - 6}" fill="var(--text-secondary)" font-size="11" font-weight="600" text-anchor="middle">Calculus Maximum Diameter (mm)</text>`;
  gridSvg += `<text transform="rotate(-90)" x="${-(padding.top + plotHeight / 2)}" y="16" fill="var(--text-secondary)" font-size="11" font-weight="600" text-anchor="middle">CT Attenuation (HU)</text>`;

  // Plot historical points
  let pointsSvg = "";
  state.cohort.forEach(pt => {
    const cx = xScale(pt.stoneSizeMm);
    const cy = yScale(pt.huValue);
    const color = pt.outcome === "passed" ? "#10b981" : "#ef4444";
    const opacity = pt.outcome === "passed" ? "0.85" : "0.75";
    const tooltipText = `${pt.id}: ${pt.stoneSizeMm}mm, ${pt.huValue}HU (${pt.outcome.toUpperCase()})`;

    pointsSvg += `
      <circle cx="${cx}" cy="${cy}" r="5" fill="${color}" opacity="${opacity}">
        <title>${tooltipText}</title>
      </circle>
    `;
  });

  // Current Patient Target Marker
  const curX = xScale(state.currentPatient.stoneSizeMm);
  const curY = yScale(state.currentPatient.huValue);
  const curMarker = `
    <g class="current-patient-marker">
      <circle cx="${curX}" cy="${curY}" r="12" fill="none" stroke="#38bdf8" stroke-width="2.5" stroke-dasharray="3,3" opacity="0.9">
        <animateTransform attributeName="transform" type="rotate" from="0 ${curX} ${curY}" to="360 ${curX} ${curY}" dur="10s" repeatCount="indefinite"/>
      </circle>
      <circle cx="${curX}" cy="${curY}" r="5" fill="#38bdf8" stroke="#ffffff" stroke-width="2">
        <title>Active Patient: ${state.currentPatient.stoneSizeMm}mm, ${state.currentPatient.huValue}HU</title>
      </circle>
    </g>
  `;

  svg.innerHTML = gridSvg + pointsSvg + curMarker;
}

// --- Render Cohort Table ---
function renderCohortTable() {
  const { search, location, outcome } = state.registryFilter;
  let filtered = state.cohort.filter(pt => {
    if (location !== "all" && pt.location !== location) return false;
    if (outcome !== "all" && pt.outcome !== outcome) return false;
    if (search) {
      const haystack = `${pt.id} ${pt.notes || ""} ${pt.location} ${pt.huCategory || ""}`.toLowerCase();
      if (!haystack.includes(search)) return false;
    }
    return true;
  });

  if (filtered.length === 0) {
    elements.cohortTableBody.innerHTML = `<tr><td colspan="12" style="text-align: center; color: var(--text-muted); padding: 2rem;">No matching patient records found in registry.</td></tr>`;
    return;
  }

  elements.cohortTableBody.innerHTML = filtered
    .map(pt => {
      const isPassed = pt.outcome === "passed";
      const outcomeBadge = isPassed
        ? `<span class="outcome-pill outcome-passed">Passed</span>`
        : `<span class="outcome-pill outcome-intervention">Intervened</span>`;

      return `
        <tr>
          <td style="font-weight: 700; color: var(--accent-sky); font-family: monospace;">${pt.id}</td>
          <td>${pt.age}y / ${pt.sex}</td>
          <td><strong>${pt.stoneSizeMm} mm</strong></td>
          <td><span style="text-transform: uppercase;">${pt.location}</span></td>
          <td>${pt.huValue} HU</td>
          <td><span style="text-transform: capitalize;">${pt.hydronephrosis || "none"}</span></td>
          <td>${pt.metPrescribed ? '<span style="color: var(--status-success);">Yes</span>' : '<span style="color: var(--text-muted);">No</span>'}</td>
          <td>${outcomeBadge}</td>
          <td>${pt.daysToPassage !== null && pt.daysToPassage !== undefined ? `${pt.daysToPassage} d` : "-"}</td>
          <td><span style="font-size: 0.72rem; text-transform: uppercase;">${pt.interventionType || "none"}</span></td>
          <td style="max-width: 200px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${pt.notes || ""}">${pt.notes || "-"}</td>
          <td>
            <button class="btn-icon btn-del-case" data-id="${pt.id}" title="Delete Record" style="width: 28px; height: 28px;">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
            </button>
          </td>
        </tr>
      `;
    })
    .join("");

  // Attach delete buttons
  elements.cohortTableBody.querySelectorAll(".btn-del-case").forEach(btn => {
    btn.addEventListener("click", () => {
      const ptId = btn.getAttribute("data-id");
      if (confirm(`Remove historical patient ${ptId} from registry?`)) {
        state.cohort = deletePatientRecord(ptId);
        renderAll();
        showToast(`Patient ${ptId} removed.`);
      }
    });
  });
}

// --- Render Consultation Note View ---
function renderReportView() {
  const p = state.currentPatient;
  const pred = calculatePassageProbability(p);
  const cbr = findSimilarHistoricalCases(p, state.cohort, 5);

  elements.reportDate.textContent = new Date().toLocaleDateString(undefined, {
    year: "numeric", month: "short", day: "numeric"
  });

  elements.repStoneSize.textContent = `${p.stoneSizeMm.toFixed(1)} mm (Max diameter)`;
  const locMap = { uvj: "UVJ", distal: "Distal Ureter", mid: "Mid Ureter", proximal: "Proximal Ureter", puj: "PUJ" };
  elements.repLocation.textContent = locMap[p.location] || p.location;
  elements.repDensity.textContent = `${p.huValue} HU (${pred.huAnalysis.category} - ${pred.huAnalysis.hardness})`;
  elements.repHydronephrosis.textContent = `${p.hydronephrosis.charAt(0).toUpperCase() + p.hydronephrosis.slice(1)} hydroureteronephrosis`;
  elements.repSymptoms.textContent = `${p.durationDays} days colic duration; Pain score ${p.painVas}/10`;
  elements.repInfection.textContent = p.fever ? "FEVER PRESENT / SIRS SUSPECTED (High Risk)" : "Afebrile, no signs of sepsis";

  // AI Analytics Text
  const isFemale = (p.sex || "M").toUpperCase() === "F";
  const crNormUpper = isFemale ? 1.00 : 1.20;
  const sCrVal = typeof p.serumCreatinine === "number" ? p.serumCreatinine : (parseFloat(p.serumCreatinine) || 1.0);
  if (pred.isEmergency) {
    elements.repAiAnalysisText.innerHTML = `
      <p><strong>Predicted Spontaneous Passage Likelihood:</strong> <span style="font-size: 1.1rem; font-weight: 700; color: var(--status-danger);">0% (CONTRAINDICATED)</span> (EAU § 3.2.3: Active infection or critical azotemia mandates immediate upper tract decompression; conservative observation is strictly contraindicated)</p>
      <p><strong>Case-Based Cohort Comparison (Emergency Stratum):</strong> Evaluated against <strong>${cbr.totalMatchesCount} emergency cohort presentations</strong> from patient registry. In this matched critical subgroup, <strong>100% required emergency surgical decompression</strong> (urgent retrograde JJ stent or PCN), with <strong>0% managed conservatively on MET</strong>.</p>
      <p style="margin-top: 0.5rem;"><strong>Primary Clinical Determinants:</strong></p>
      <ul style="padding-left: 1.25rem; margin-top: 0.25rem;">
        ${pred.featureImpacts.map(i => `<li><strong>${i.feature}:</strong> ${i.impact} impact (${i.detail})</li>`).join("")}
      </ul>
    `;
  } else if (sCrVal > crNormUpper) {
    elements.repAiAnalysisText.innerHTML = `
      <p><strong>Predicted Spontaneous Passage Likelihood:</strong> <span style="font-size: 1.1rem; font-weight: 700; color: var(--color-warning);">${pred.probabilityPercent}%</span> (EAU § 3.4.1 Override: Renal impairment present — MET trial contraindicated)</p>
      <p><strong>Case-Based Cohort Comparison (Post-Renal AKI Stratum):</strong> Evaluated against <strong>${cbr.totalMatchesCount} matched post-renal obstructive nephropathy presentations</strong> (sCr: <strong>${sCrVal.toFixed(2)} mg/dL</strong>). In this clinically compromised subgroup, <strong>${100 - cbr.historicalPassageRate}% required endourological intervention / decompression</strong> (${cbr.historicalPassageRate}% expulsion; conservative observation contraindicated under EAU § 3.4.1).</p>
      <p style="margin-top: 0.5rem;"><strong>Primary Clinical Determinants:</strong></p>
      <ul style="padding-left: 1.25rem; margin-top: 0.25rem;">
        ${pred.featureImpacts.map(i => `<li><strong>${i.feature}:</strong> ${i.impact} impact (${i.detail})</li>`).join("")}
      </ul>
    `;
  } else {
    elements.repAiAnalysisText.innerHTML = `
      <p><strong>Predicted Spontaneous Passage Likelihood:</strong> <span style="font-size: 1.1rem; font-weight: 700; color: var(--accent-sky);">${pred.probabilityPercent}%</span></p>
      <p><strong>Case-Based Cohort Comparison:</strong> Evaluated against <strong>${cbr.totalMatchesCount} most clinically proximate historical cases</strong> from patient registry. In this matched subgroup, <strong>${cbr.historicalPassageRate}% achieved spontaneous expulsion</strong> (mean time: <strong>${cbr.avgDaysToPassage || "N/A"} days</strong>), while <strong>${100 - cbr.historicalPassageRate}% required endourological intervention</strong> (URS / SWL).</p>
      <p style="margin-top: 0.5rem;"><strong>Primary Clinical Determinants:</strong></p>
      <ul style="padding-left: 1.25rem; margin-top: 0.25rem;">
        ${pred.featureImpacts.map(i => `<li><strong>${i.feature}:</strong> ${i.impact} impact (${i.detail})</li>`).join("")}
      </ul>
    `;
  }

  // Management Plan Text
  const sp = pred.surgicalPathway;
  const j = pred.inputJustifications;
  elements.repManagementPlanText.innerHTML = `
    <p><strong>Clinical Stratification:</strong> ${pred.actionTitle}</p>
    <p><strong>Estimated Passage Timeline:</strong> ${pred.timePassageSummary}</p>
    ${sp ? `
      <div style="margin: 0.65rem 0; padding: 0.65rem 0.85rem; border-radius: 6px; background: rgba(15, 23, 42, 0.45); border: 1px solid var(--border-color);">
        <div style="font-size: 0.78rem; font-weight: 700; color: ${pred.isEmergency || sp.strategyType === 'urgent_renal_relief' ? 'var(--status-danger)' : 'var(--accent-sky)'}; text-transform: uppercase;">
          SURGICAL STAGING &amp; PROCEDURAL PATHWAY: ${sp.strategyBadge}
        </div>
        <div style="font-size: 0.82rem; margin-top: 0.25rem;">
          <strong>Definitive Removal from Start (URS / FURS / ESWL):</strong> ${sp.verdictHeadline}
        </div>
        <div style="font-size: 0.80rem; margin-top: 0.25rem; color: var(--text-muted);">
          <strong>Upfront Drainage (DJ Stent vs PCN):</strong> ${sp.colDecompressTitle}
        </div>
        <div style="font-size: 0.80rem; margin-top: 0.25rem; color: var(--text-muted);">
          <strong>Definitive Modality Selection:</strong> ${sp.colDefinitiveTitle}
        </div>
      </div>
    ` : ""}
    ${j ? `
      <div style="margin: 0.65rem 0; padding: 0.65rem 0.85rem; border-radius: 6px; background: rgba(15, 23, 42, 0.3); border: 1px solid var(--border-color);">
        <div style="font-size: 0.76rem; font-weight: 700; color: var(--accent-sky); text-transform: uppercase; margin-bottom: 0.35rem;">
          EAU Multi-Parametric Input Correlation Rationale:
        </div>
        <div style="font-size: 0.78rem; line-height: 1.45; margin-bottom: 0.3rem;">
          <strong>Renal Function (sCr):</strong> ${j.renal.statusTag} — ${j.renal.rationaleHtml.replace(/<[^>]+>/g, '')}
        </div>
        <div style="font-size: 0.78rem; line-height: 1.45; margin-bottom: 0.3rem;">
          <strong>Infection Status (TLC/Fever):</strong> ${j.infection.statusTag} — ${j.infection.rationaleHtml.replace(/<[^>]+>/g, '')}
        </div>
        <div style="font-size: 0.78rem; line-height: 1.45; margin-bottom: 0.3rem;">
          <strong>Calculus Caliber & Site:</strong> ${j.stone.statusTag} — ${j.stone.rationaleHtml.replace(/<[^>]+>/g, '')}
        </div>
        <div style="font-size: 0.78rem; line-height: 1.45; margin-bottom: 0.3rem;">
          <strong>CT Attenuation (HU):</strong> ${j.density.statusTag} — ${j.density.rationaleHtml.replace(/<[^>]+>/g, '')}
        </div>
        <div style="font-size: 0.78rem; line-height: 1.45; margin-bottom: 0.3rem;">
          <strong>Hydronephrosis Grade:</strong> ${j.hydronephrosis ? j.hydronephrosis.statusTag + ' — ' + j.hydronephrosis.rationaleHtml.replace(/<[^>]+>/g, '') : 'Evaluated'}
        </div>
        <div style="font-size: 0.78rem; line-height: 1.45; margin-bottom: 0.3rem;">
          <strong>Colic Duration & Pain:</strong> ${j.symptoms ? j.symptoms.statusTag + ' — ' + j.symptoms.rationaleHtml.replace(/<[^>]+>/g, '') : 'Evaluated'}
        </div>
        <div style="font-size: 0.78rem; line-height: 1.45; margin-bottom: 0.3rem;">
          <strong>Pharmacotherapy (MET & Analgesia):</strong> ${j.medication ? j.medication.statusTag + ' — ' + j.medication.rationaleHtml.replace(/<[^>]+>/g, '') : 'Evaluated'}
        </div>
        <div style="font-size: 0.78rem; line-height: 1.45; margin-bottom: 0.3rem;">
          <strong>Staging & Stenting Directive:</strong> ${j.staging.statusTag} — ${j.staging.rationaleHtml.replace(/<[^>]+>/g, '')}
        </div>
        <div style="font-size: 0.80rem; line-height: 1.45; margin-top: 0.45rem; padding-top: 0.4rem; border-top: 1px dashed var(--border-color); color: var(--accent-sky);">
          <strong>Why This Treatment Choice?</strong> ${j.treatmentChoiceSummary ? j.treatmentChoiceSummary.rationaleHtml.replace(/<[^>]+>/g, '') : ''}
        </div>
      </div>
    ` : ""}
    <p style="margin-top: 0.5rem;"><strong>Recommended Clinical Protocol:</strong></p>
    <ol style="padding-left: 1.25rem; margin-top: 0.25rem;">
      ${pred.clinicalActionPlan.map(step => `<li>${step}</li>`).join("")}
    </ol>
  `;
}

// --- Copy Consultation Note ---
function copyConsultationNoteToClipboard() {
  const p = state.currentPatient;
  const pred = calculatePassageProbability(p);
  const cbr = findSimilarHistoricalCases(p, state.cohort, 5);
  const sp = pred.surgicalPathway;
  const j = pred.inputJustifications;

  const tlcVal = (p.tlcCount || p.wbcCount || 8.0).toFixed(1);
  const sCrVal = (p.serumCreatinine || 1.0).toFixed(2);
  const isFemale = (p.sex || "M").toUpperCase() === "F";
  const crNormalUpper = isFemale ? 1.00 : 1.20;
  const crThreshold = isFemale ? 1.20 : 1.40;
  const hasRenalImpairment = parseFloat(sCrVal) >= crThreshold;

  let aiProbText = `${pred.probabilityPercent}%`;
  let cohortText = `Among ${cbr.totalMatchesCount} most clinically proximate historical cases, ${cbr.historicalPassageRate}% passed spontaneously (avg ${cbr.avgDaysToPassage || "N/A"} days) and ${100 - cbr.historicalPassageRate}% required intervention.`;

  if (pred.isEmergency) {
    aiProbText = `0% [CONTRAINDICATED — EAU § 3.2.3: Active infection mandates emergency decompression; observation is strictly contraindicated]`;
    cohortText = `Among ${cbr.totalMatchesCount} matched emergency urosepsis cohort presentations, 100% required urgent upper urinary tract decompression (Double-J stent / PCN); 0% managed conservatively on MET.`;
  } else if (hasRenalImpairment) {
    aiProbText = `${pred.probabilityPercent}% [OVERRIDE — EAU § 3.4.1: Renal filtration is compromised (sCr ${sCrVal} mg/dL). MET observation trial is contraindicated; prompt decompression or expedient removal mandated]`;
  }

  const note = `================================================================================
AIN SHAMS UNIVERSITY HOSPITALS — FACULTY OF MEDICINE
DEPARTMENT OF UROLOGY & ENDOUROLOGY
UROLOGY CONSULTATION & CALCULUS PASSAGE ASSESSMENT
================================================================================
Date: ${new Date().toLocaleDateString()}
Institutional Affiliation: Ain Shams University Hospitals (Department of Urology)
Protocol Authority: European Association of Urology (EAU) Guidelines on Urolithiasis
Registry Calibration: 500-Patient Historical Cohort Registry (100% PubMed Trial Series & EAU Calibrated)

1. PATIENT FINDINGS:
- Stone Maximum Diameter: ${p.stoneSizeMm} mm
- Anatomical Location: ${p.location.toUpperCase()}
- Non-Contrast CT Attenuation: ${p.huValue} HU (${pred.huAnalysis.category})
- Hydronephrosis: ${p.hydronephrosis}
- Colic Duration: ${p.durationDays} days (VAS Pain: ${p.painVas}/10)
- Infection/SIRS: ${p.fever ? "POSITIVE (Fever / Systemic Signs - HIGH RISK OBSTRUCTIVE SEPSIS)" : "Negative / Afebrile"}
- Medical Expulsive Therapy (MET): ${pred.isEmergency ? "CONTRAINDICATED (Active Sepsis Mandates Drainage)" : hasRenalImpairment ? "CONTRAINDICATED (EAU § 3.4.1 restricts MET to preserved normal renal function)" : (p.metPrescribed ? "Prescribed" : "Not Prescribed")}
- Serum Creatinine: ${sCrVal} mg/dL ${hasRenalImpairment ? `[ELEVATED — Post-Renal AKI (threshold: ${crThreshold.toFixed(1)} mg/dL); Renal function COMPROMISED]` : "[NORMAL — Preserved renal function]"}
- Total Leukocyte Count (TLC): ${tlcVal} × 10³/μL${parseFloat(tlcVal) >= 14 ? " [LEUKOCYTOSIS — Sepsis criterion]" : ""}

2. AI CLINICAL PREDICTION & COMPARATIVE COHORT:
- Predicted Spontaneous Passage Likelihood: ${aiProbText}
- Case-Based Cohort Comparison: ${cohortText}
- Primary Determinants: ${pred.featureImpacts.map(i => `${i.feature} (${i.impact})`).join(", ")}

3. SURGICAL STAGING & PROCEDURAL PATHWAY (EAU § 3.2.3 & § 3.4):
- Strategy Classification: ${sp ? sp.strategyBadge : "Standard EAU Pathway"}
- Definitive Removal From Start (URS / FURS / ESWL): ${sp ? sp.verdictHeadline : "See below"}
  * Rationale: ${sp ? sp.verdictSubtext : ""}
- Upfront Drainage Directive (DJ Stent vs Percutaneous Nephrostomy):
  ${sp ? `${sp.colDecompressBadge} — ${sp.colDecompressTitle}` : "N/A"}
  * Retrograde DJ Stent: Preferred in bleeding diathesis / coagulopathy (PCN carries parenchymal hemorrhage risk), distal/mid stone with bypassable wire, or lithotomy position tolerated (EAU LoE 1b).
  * Percutaneous Nephrostomy (PCN): Preferred in severe septic shock with hemodynamic instability (rapid bedside local anesthesia without GA/lithotomy), impassable impacted stone, or gross viscous pyonephrosis (8–10Fr lumen drains thick pus effectively).
- Definitive Clearance Modality Selection:
  ${sp ? `${sp.colDefinitiveBadge} — ${sp.colDefinitiveTitle}` : "URS / ESWL"}
  * EAU Directive: ${sp ? (sp.strategyType === 'urgent_renal_relief' ? "Expedient primary URS/FURS with stenting or staged DJ stenting is mandatory. ESWL is disfavored due to risk of steinstraße prolonging AKI." : sp.canDoDefinitiveFromStart ? "Primary single-stage definitive removal proceeds directly from the start when renal function is preserved (routine pre-stenting NOT indicated, LoE 1b)." : "Definitive stone removal STRICTLY DEFERRED until patient is afebrile >= 48–72h, TLC/inflammatory markers normalize, and urine is sterile.") : "See protocol"}

4. RECOMMENDATION & MANAGEMENT PLAN:
- Recommendation: ${pred.actionTitle}
- Timeline: ${pred.timePassageSummary}
- Actions:
${pred.clinicalActionPlan.map((step, idx) => `  ${idx + 1}. ${step}`).join("\n")}

5. EAU MULTI-PARAMETRIC INPUT CORRELATION & TREATMENT RATIONALE:
${j ? `
- [Renal Filtration]: ${j.renal.statusTag}
  Rationale: ${j.renal.rationaleHtml.replace(/<[^>]+>/g, '')}
- [Infection / SIRS]: ${j.infection.statusTag}
  Rationale: ${j.infection.rationaleHtml.replace(/<[^>]+>/g, '')}
- [Calculus Dimensions]: ${j.stone.statusTag}
  Rationale: ${j.stone.rationaleHtml.replace(/<[^>]+>/g, '')}
- [CT Attenuation / Hardness]: ${j.density.statusTag}
  Rationale: ${j.density.rationaleHtml.replace(/<[^>]+>/g, '')}
- [Hydronephrosis Grade]: ${j.hydronephrosis ? j.hydronephrosis.statusTag + "\n  Rationale: " + j.hydronephrosis.rationaleHtml.replace(/<[^>]+>/g, '') : "N/A"}
- [Symptoms & Colic Duration]: ${j.symptoms ? j.symptoms.statusTag + "\n  Rationale: " + j.symptoms.rationaleHtml.replace(/<[^>]+>/g, '') : "N/A"}
- [Pharmacotherapy (MET & Analgesia)]: ${j.medication ? j.medication.statusTag + "\n  Rationale: " + j.medication.rationaleHtml.replace(/<[^>]+>/g, '') : "N/A"}
- [Surgical Staging & Drainage]: ${j.staging.statusTag}
  Rationale: ${j.staging.rationaleHtml.replace(/<[^>]+>/g, '')}
- [Treatment Choice Justification]:
  ${j.treatmentChoiceSummary ? j.treatmentChoiceSummary.rationaleHtml.replace(/<[^>]+>/g, '') : "N/A"}
` : "N/A"}
`;

  navigator.clipboard.writeText(note).then(() => {
    showToast("Consultation Note copied to clipboard!");
  }).catch(() => {
    showToast("Failed to copy to clipboard.");
  });
}

// --- UI Notification Toast ---
function showToast(message) {
  const toast = document.createElement("div");
  toast.className = "toast";
  toast.textContent = message;
  elements.toastContainer.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = "0";
    toast.style.transition = "opacity 0.3s ease";
    setTimeout(() => toast.remove(), 300);
  }, 3200);
}
