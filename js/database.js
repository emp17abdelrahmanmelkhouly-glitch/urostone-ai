// Local Clinical Database Manager
// Stores, imports, exports, and updates historical patient stone cases

import { INITIAL_PATIENT_COHORT } from "./sampleData.js";

const DB_STORAGE_KEY = "urostone_patient_cohort_v10_eau_renal_correlated_500";

/**
 * Initialize or get patient cohort
 * @returns {Array<object>}
 */
export function getPatientCohort() {
  try {
    const stored = localStorage.getItem(DB_STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (e) {
    console.warn("Could not read cohort from localStorage, using initial dataset", e);
  }

  // Save initial cohort to localStorage
  saveCohortToStorage(INITIAL_PATIENT_COHORT);
  return [...INITIAL_PATIENT_COHORT];
}

/**
 * Save current cohort array to localStorage
 * @param {Array<object>} cohort 
 */
export function saveCohortToStorage(cohort) {
  try {
    localStorage.setItem(DB_STORAGE_KEY, JSON.stringify(cohort));
  } catch (e) {
    console.error("Failed to persist cohort to localStorage", e);
  }
}

/**
 * Add a new patient record to the registry
 * @param {object} patientData 
 * @returns {Array<object>} updated cohort
 */
export function addPatientRecord(patientData) {
  const currentCohort = getPatientCohort();

  const newId = patientData.id || `PT-${1000 + currentCohort.length + 1}`;
  const newRecord = {
    ...patientData,
    id: newId,
    createdAt: new Date().toISOString()
  };

  const updated = [newRecord, ...currentCohort];
  saveCohortToStorage(updated);
  return updated;
}

/**
 * Delete a patient record by ID
 * @param {string} patientId 
 * @returns {Array<object>}
 */
export function deletePatientRecord(patientId) {
  const currentCohort = getPatientCohort();
  const updated = currentCohort.filter(p => p.id !== patientId);
  saveCohortToStorage(updated);
  return updated;
}

/**
 * Reset patient database back to original curated sample cohort
 * @returns {Array<object>}
 */
export function resetToDefaultCohort() {
  saveCohortToStorage(INITIAL_PATIENT_COHORT);
  return [...INITIAL_PATIENT_COHORT];
}

/**
 * Export current database as CSV file
 */
export function exportCohortToCSV() {
  const cohort = getPatientCohort();
  if (!cohort || cohort.length === 0) return;

  const headers = [
    "Patient ID",
    "Age",
    "Sex",
    "Stone Size (mm)",
    "Location",
    "Hounsfield Units (HU)",
    "HU Classification",
    "Pain VAS (1-10)",
    "Duration (days)",
    "Hydronephrosis",
    "Gross Hematuria",
    "Fever",
    "WBC Count",
    "MET Prescribed",
    "Outcome",
    "Days to Passage",
    "Intervention Type",
    "Clinical Notes"
  ];

  const rows = cohort.map(p => [
    p.id,
    p.age,
    p.sex,
    p.stoneSizeMm,
    p.location,
    p.huValue,
    `"${p.huCategory || ""}"`,
    p.painVas,
    p.durationDays,
    p.hydronephrosis,
    p.grossHematuria ? "Yes" : "No",
    p.fever ? "Yes" : "No",
    p.wbcCount,
    p.metPrescribed ? "Yes" : "No",
    p.outcome,
    p.daysToPassage !== null ? p.daysToPassage : "",
    p.interventionType || "",
    `"${(p.notes || "").replace(/"/g, '""')}"`
  ]);

  const csvContent = [headers.join(","), ...rows.map(r => r.join(","))].join("\r\n");
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", `UroStone_Patient_Registry_${new Date().toISOString().slice(0, 10)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Export current database as JSON
 */
export function exportCohortToJSON() {
  const cohort = getPatientCohort();
  const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(cohort, null, 2));
  const link = document.createElement("a");
  link.setAttribute("href", dataStr);
  link.setAttribute("download", `UroStone_Cohort_${new Date().toISOString().slice(0, 10)}.json`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Import patients from CSV text
 * @param {string} csvText 
 * @returns {Array<object>} updated cohort
 */
export function importCohortFromCSV(csvText) {
  const lines = csvText.split(/\r?\n/).filter(line => line.trim().length > 0);
  if (lines.length < 2) throw new Error("CSV file contains no data rows.");

  const currentCohort = getPatientCohort();
  const newRecords = [];

  // Parse lines (skipping header)
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(",").map(c => c.trim().replace(/^"|"$/g, ""));
    if (cols.length < 6) continue;

    const record = {
      id: cols[0] || `IMP-${Date.now()}-${i}`,
      age: parseInt(cols[1], 10) || 45,
      sex: cols[2] || "M",
      stoneSizeMm: parseFloat(cols[3]) || 4.5,
      location: (cols[4] || "distal").toLowerCase(),
      huValue: parseInt(cols[5], 10) || 750,
      huCategory: cols[6] || "Calculated",
      painVas: parseInt(cols[7], 10) || 6,
      durationDays: parseInt(cols[8], 10) || 3,
      hydronephrosis: (cols[9] || "mild").toLowerCase(),
      grossHematuria: cols[10]?.toLowerCase() === "yes",
      fever: cols[11]?.toLowerCase() === "yes",
      wbcCount: parseFloat(cols[12]) || 8.0,
      metPrescribed: cols[13]?.toLowerCase() !== "no",
      outcome: cols[14]?.toLowerCase() === "passed" ? "passed" : "intervention",
      daysToPassage: cols[15] ? parseInt(cols[15], 10) : null,
      interventionType: cols[16] || "none",
      notes: cols[17] || "Imported clinical case"
    };
    newRecords.push(record);
  }

  if (newRecords.length === 0) {
    throw new Error("No valid patient records could be extracted from this CSV.");
  }

  // Combine unique IDs
  const combined = [...newRecords, ...currentCohort];
  saveCohortToStorage(combined);
  return combined;
}
