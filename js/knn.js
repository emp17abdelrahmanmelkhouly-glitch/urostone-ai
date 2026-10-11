// Case-Based Reasoning (CBR) and Multi-Feature Similarity Matching Engine
// Compares query patient against historical urology cohort records

// Ordinal mappings for clinical variables
const LOCATION_ORDINALS = {
  uvj: 1,
  distal: 2,
  mid: 3,
  proximal: 4,
  puj: 5
};

const HYDRONEPHROSIS_ORDINALS = {
  none: 0,
  mild: 1,
  moderate: 2,
  severe: 3
};

/**
 * Calculate multi-dimensional weighted Euclidean similarity between query and a cohort patient
 * @param {object} queryPatient 
 * @param {object} historicalPatient 
 * @returns {number} Similarity percentage between 0 and 100
 */
export function calculatePatientSimilarity(queryPatient, historicalPatient) {
  // Clinical Emergency / Sepsis determination (EAU § 3.2.3)
  const isQueryEmergency = Boolean(
    queryPatient.fever ||
    (queryPatient.tlcCount !== undefined && queryPatient.tlcCount >= 14.0) ||
    (queryPatient.wbcCount !== undefined && queryPatient.wbcCount >= 14.0) ||
    (queryPatient.solitaryKidney && queryPatient.hydronephrosis && queryPatient.hydronephrosis !== "none")
  );

  const isHistEmergency = Boolean(
    historicalPatient.fever ||
    (historicalPatient.tlcCount !== undefined && historicalPatient.tlcCount >= 14.0) ||
    (historicalPatient.wbcCount !== undefined && historicalPatient.wbcCount >= 14.0) ||
    (historicalPatient.solitaryKidney && historicalPatient.hydronephrosis && historicalPatient.hydronephrosis !== "none") ||
    historicalPatient.interventionType === "urgent_stent_urs" ||
    historicalPatient.interventionType === "urgent_pcn"
  );

  // Feature weights (Higher weight = higher clinical relevance for stone passage)
  const W_EMERGENCY = 14.0; // Overriding priority: Sepsis/emergency obstruction must match emergency cases
  const W_SIZE = 4.0;       // Stone size is primary physical determinant
  const W_LOC = 3.2;        // Anatomical level
  const W_HU = 1.8;         // Stone density & composition
  const W_HYDRO = 1.5;      // Degree of obstruction
  const W_AGE = 1.2;        // Patient age
  const W_SEX = 0.9;        // Biological sex
  const W_CREAT = 1.6;      // Serum Creatinine / Renal impairment
  const W_TLC = 1.4;        // Inflammatory leukocytosis
  const W_MET = isQueryEmergency ? 0.1 : 1.2; // In sepsis, MET is clinically irrelevant
  const W_DURATION = 1.0;   // Pre-treatment colic days
  const W_PAIN = 0.8;       // Pain VAS score

  const totalWeight = W_EMERGENCY + W_SIZE + W_LOC + W_HU + W_HYDRO + W_AGE + W_SEX + W_CREAT + W_TLC + W_MET + W_DURATION + W_PAIN;

  // 1. Emergency Stratum Difference
  const normEmergencyDiff = (isQueryEmergency === isHistEmergency) ? 0.0 : 1.0;

  // 2. Size Difference (normalized over 10mm clinical range)
  const sizeDiff = Math.abs(queryPatient.stoneSizeMm - historicalPatient.stoneSizeMm);
  const normSizeDiff = Math.min(sizeDiff / 10.0, 1.0);

  // 3. Location Difference (ordinal difference)
  const locQ = LOCATION_ORDINALS[queryPatient.location] || 2;
  const locH = LOCATION_ORDINALS[historicalPatient.location] || 2;
  const normLocDiff = Math.abs(locQ - locH) / 4.0;

  // 4. HU Difference (normalized over 1200 HU range)
  const huDiff = Math.abs(queryPatient.huValue - historicalPatient.huValue);
  const normHuDiff = Math.min(huDiff / 1200.0, 1.0);

  // 5. Hydronephrosis Difference
  const hydroQ = HYDRONEPHROSIS_ORDINALS[queryPatient.hydronephrosis] || 1;
  const hydroH = HYDRONEPHROSIS_ORDINALS[historicalPatient.hydronephrosis] || 1;
  const normHydroDiff = Math.abs(hydroQ - hydroH) / 3.0;

  // 6. Demographics Differences (Age & Sex)
  const ageQ = queryPatient.age !== undefined ? queryPatient.age : 45;
  const ageH = historicalPatient.age !== undefined ? historicalPatient.age : 45;
  const normAgeDiff = Math.min(Math.abs(ageQ - ageH) / 45.0, 1.0);

  const sexQ = (queryPatient.sex || "M").toUpperCase();
  const sexH = (historicalPatient.sex || "M").toUpperCase();
  const normSexDiff = sexQ === sexH ? 0.0 : 1.0;

  // 7. Renal Function & Inflammatory Markers
  const creatQ = queryPatient.serumCreatinine !== undefined ? queryPatient.serumCreatinine : 1.0;
  const creatH = historicalPatient.serumCreatinine !== undefined ? historicalPatient.serumCreatinine : 1.0;
  const normCreatDiff = Math.min(Math.abs(creatQ - creatH) / 2.0, 1.0);

  const tlcQ = queryPatient.tlcCount || queryPatient.wbcCount || 8.0;
  const tlcH = historicalPatient.tlcCount || historicalPatient.wbcCount || 8.0;
  const normTlcDiff = Math.min(Math.abs(tlcQ - tlcH) / 12.0, 1.0);

  // 8. MET match (0 if identical, 1 if mismatched)
  const normMetDiff = queryPatient.metPrescribed === historicalPatient.metPrescribed ? 0.0 : 1.0;

  // 9. Symptom Duration Difference
  const durDiff = Math.abs(queryPatient.durationDays - historicalPatient.durationDays);
  const normDurationDiff = Math.min(durDiff / 15.0, 1.0);

  // 10. Pain VAS Difference
  const painDiff = Math.abs(queryPatient.painVas - historicalPatient.painVas);
  const normPainDiff = painDiff / 10.0;

  // Weighted quadratic distance
  const weightedSum =
    W_EMERGENCY * Math.pow(normEmergencyDiff, 2) +
    W_SIZE * Math.pow(normSizeDiff, 2) +
    W_LOC * Math.pow(normLocDiff, 2) +
    W_HU * Math.pow(normHuDiff, 2) +
    W_HYDRO * Math.pow(normHydroDiff, 2) +
    W_AGE * Math.pow(normAgeDiff, 2) +
    W_SEX * Math.pow(normSexDiff, 2) +
    W_CREAT * Math.pow(normCreatDiff, 2) +
    W_TLC * Math.pow(normTlcDiff, 2) +
    W_MET * Math.pow(normMetDiff, 2) +
    W_DURATION * Math.pow(normDurationDiff, 2) +
    W_PAIN * Math.pow(normPainDiff, 2);

  const weightedDistance = Math.sqrt(weightedSum / totalWeight);

  // Convert distance to similarity percentage (100% = identical)
  let similarityPercent = Math.max(0, Math.min(100, Math.round((1 - weightedDistance) * 1000) / 10));
  return similarityPercent;
}

/**
 * Find Top-K most similar historical patients from the cohort database
 * @param {object} queryPatient 
 * @param {Array<object>} cohortDatabase 
 * @param {number} k Number of nearest neighbors to retrieve (default 6)
 * @returns {object} { topMatches, historicalPassageRate, avgDaysToPassage, interventionBreakdown }
 */
export function findSimilarHistoricalCases(queryPatient, cohortDatabase, k = 6) {
  if (!cohortDatabase || cohortDatabase.length === 0) {
    return {
      topMatches: [],
      historicalPassageRate: 0,
      avgDaysToPassage: 0,
      totalMatchesCount: 0,
      passedCount: 0,
      interventionCount: 0,
      interventionBreakdown: {}
    };
  }

  // Calculate similarity for all patients
  const scoredPatients = cohortDatabase.map(patient => {
    const similarity = calculatePatientSimilarity(queryPatient, patient);
    return {
      ...patient,
      similarityScore: similarity
    };
  });

  // Sort descending by similarity
  scoredPatients.sort((a, b) => b.similarityScore - a.similarityScore);

  const topMatches = scoredPatients.slice(0, k);

  // Calculate comparative analytics from the top-k matched cases
  let passedCount = 0;
  let totalDaysForPassed = 0;
  let passedDaysCount = 0;
  const interventionBreakdown = {
    none: 0,
    urs: 0,
    swl: 0,
    urgent_stent_urs: 0
  };

  topMatches.forEach(match => {
    if (match.outcome === "passed") {
      passedCount++;
      if (typeof match.daysToPassage === "number" && match.daysToPassage > 0) {
        totalDaysForPassed += match.daysToPassage;
        passedDaysCount++;
      }
    }

    const type = match.interventionType || "none";
    interventionBreakdown[type] = (interventionBreakdown[type] || 0) + 1;
  });

  const historicalPassageRate = topMatches.length > 0
    ? Math.round((passedCount / topMatches.length) * 100)
    : 0;

  const avgDaysToPassage = passedDaysCount > 0
    ? Math.round((totalDaysForPassed / passedDaysCount) * 10) / 10
    : null;

  const isEmergencyStratum = Boolean(
    queryPatient.fever ||
    (queryPatient.tlcCount !== undefined && queryPatient.tlcCount >= 14.0) ||
    (queryPatient.wbcCount !== undefined && queryPatient.wbcCount >= 14.0) ||
    (queryPatient.solitaryKidney && queryPatient.hydronephrosis && queryPatient.hydronephrosis !== "none")
  );

  return {
    topMatches,
    historicalPassageRate,
    avgDaysToPassage,
    totalMatchesCount: topMatches.length,
    passedCount,
    interventionCount: topMatches.length - passedCount,
    interventionBreakdown,
    isEmergencyStratum
  };
}
