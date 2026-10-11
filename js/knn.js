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
 * Classify a patient into a clinical stratum for evidence-based k-NN correlation
 * @param {object} pt 
 * @returns {string} SEPSIS | CRITICAL_AZOTEMIA | POST_RENAL_AKI | NORMAL_RENAL
 */
export function getPatientStratum(pt) {
  const sCr = typeof pt.serumCreatinine === "number" ? pt.serumCreatinine : (parseFloat(pt.serumCreatinine) || 1.0);
  const isFem = (pt.sex || "M").toUpperCase() === "F";
  const crNorm = isFem ? 1.00 : 1.20;
  const isSepsis = Boolean(
    pt.fever ||
    (pt.tlcCount !== undefined && pt.tlcCount >= 14.0) ||
    (pt.wbcCount !== undefined && pt.wbcCount >= 14.0)
  );
  const isSevereAzotemia = sCr >= 2.0;
  const isRenalEmergency = Boolean(
    isSevereAzotemia ||
    (sCr > crNorm && pt.solitaryKidney && pt.hydronephrosis && pt.hydronephrosis !== "none") ||
    (sCr > crNorm && pt.hydronephrosis === "severe") ||
    (pt.solitaryKidney && pt.hydronephrosis && pt.hydronephrosis !== "none") ||
    ((pt.interventionType === "urgent_stent_urs" || pt.interventionType === "urgent_pcn") && sCr >= 1.8 && !pt.fever)
  );

  if (isSepsis) return "SEPSIS";
  if (isRenalEmergency) return "CRITICAL_AZOTEMIA";
  if (sCr > crNorm || (pt.interventionType && pt.interventionType.startsWith("urgent"))) return "POST_RENAL_AKI";
  return "NORMAL_RENAL";
}

/**
 * Calculate multi-dimensional weighted Euclidean similarity between query and a cohort patient
 * @param {object} queryPatient 
 * @param {object} historicalPatient 
 * @returns {number} Similarity percentage between 0 and 100
 */
export function calculatePatientSimilarity(queryPatient, historicalPatient) {
  const sCrQ = typeof queryPatient.serumCreatinine === "number" ? queryPatient.serumCreatinine : (parseFloat(queryPatient.serumCreatinine) || 1.0);
  const isFemaleQ = (queryPatient.sex || "M").toUpperCase() === "F";
  const crNormalUpperQ = isFemaleQ ? 1.00 : 1.20;
  const hasRenalImpairmentQ = sCrQ > crNormalUpperQ;

  const sCrH = typeof historicalPatient.serumCreatinine === "number" ? historicalPatient.serumCreatinine : (parseFloat(historicalPatient.serumCreatinine) || 1.0);
  const isFemaleH = (historicalPatient.sex || "M").toUpperCase() === "F";
  const crNormalUpperH = isFemaleH ? 1.00 : 1.20;
  const hasRenalImpairmentH = sCrH > crNormalUpperH;

  const stratumQ = getPatientStratum(queryPatient);
  const stratumH = getPatientStratum(historicalPatient);

  // Feature weights (Higher weight = higher clinical relevance for stone passage and intervention)
  const W_STRATUM = 16.0;   // Overriding priority: Clinical stratum must match
  const W_CREAT = 6.0;     // Serum Creatinine / continuous renal difference
  const W_SIZE = 4.0;      // Stone caliber
  const W_LOC = 3.2;       // Anatomical level
  const W_HU = 1.8;        // Stone density & composition
  const W_HYDRO = 1.6;     // Degree of obstruction
  const W_TLC = 1.4;       // Inflammatory leukocytosis
  const W_AGE = 1.2;       // Patient age
  const W_SEX = 0.9;       // Biological sex
  const W_MET = (stratumQ !== "NORMAL_RENAL") ? 0.1 : 1.2; // In AKI/emergencies, MET is clinically contraindicated
  const W_DURATION = 1.0;  // Pre-treatment colic days
  const W_PAIN = 0.8;      // Pain VAS score

  const totalWeight = W_STRATUM + W_CREAT + W_SIZE + W_LOC + W_HU + W_HYDRO + W_TLC + W_AGE + W_SEX + W_MET + W_DURATION + W_PAIN;

  // 1. Clinical Stratum Alignment
  let normStratumDiff = 0.0;
  if (stratumQ === stratumH) {
    normStratumDiff = 0.0;
  } else if (stratumQ === "CRITICAL_AZOTEMIA") {
    if (stratumH === "POST_RENAL_AKI") normStratumDiff = 0.30;
    else if (stratumH === "SEPSIS") normStratumDiff = 0.60;
    else normStratumDiff = 1.5; // NORMAL_RENAL disqualified
  } else if (stratumQ === "POST_RENAL_AKI") {
    if (stratumH === "CRITICAL_AZOTEMIA") normStratumDiff = 0.25;
    else if (stratumH === "SEPSIS") normStratumDiff = 0.65;
    else normStratumDiff = 1.4; // NORMAL_RENAL disqualified
  } else if (stratumQ === "SEPSIS") {
    if (stratumH === "CRITICAL_AZOTEMIA") normStratumDiff = 0.60;
    else normStratumDiff = 1.4;
  } else { // NORMAL_RENAL
    if (stratumH === "POST_RENAL_AKI") normStratumDiff = 0.9;
    else normStratumDiff = 1.5; // Emergencies disqualified
  }

  // 2. Continuous Creatinine Difference
  const creatDiff = Math.abs(sCrQ - sCrH);
  let normCreatDiff = Math.min(creatDiff / 1.5, 1.0);
  if (hasRenalImpairmentQ && !hasRenalImpairmentH) {
    normCreatDiff = 1.6; // Heavy mismatch penalty: AKI vs normal filtration
  } else if (!hasRenalImpairmentQ && hasRenalImpairmentH) {
    normCreatDiff = 1.4;
  }

  // 3. Size Difference (normalized over 10mm clinical range)
  const sizeDiff = Math.abs(queryPatient.stoneSizeMm - historicalPatient.stoneSizeMm);
  const normSizeDiff = Math.min(sizeDiff / 10.0, 1.0);

  // 4. Location Difference (ordinal difference)
  const locQ = LOCATION_ORDINALS[queryPatient.location] || 2;
  const locH = LOCATION_ORDINALS[historicalPatient.location] || 2;
  const normLocDiff = Math.abs(locQ - locH) / 4.0;

  // 5. HU Difference (normalized over 1200 HU range)
  const huDiff = Math.abs(queryPatient.huValue - historicalPatient.huValue);
  const normHuDiff = Math.min(huDiff / 1200.0, 1.0);

  // 6. Hydronephrosis Difference
  const hydroQ = HYDRONEPHROSIS_ORDINALS[queryPatient.hydronephrosis] || 1;
  const hydroH = HYDRONEPHROSIS_ORDINALS[historicalPatient.hydronephrosis] || 1;
  const normHydroDiff = Math.abs(hydroQ - hydroH) / 3.0;

  // 7. Inflammatory Markers (TLC)
  const tlcQ = queryPatient.tlcCount || queryPatient.wbcCount || 8.0;
  const tlcH = historicalPatient.tlcCount || historicalPatient.wbcCount || 8.0;
  const normTlcDiff = Math.min(Math.abs(tlcQ - tlcH) / 12.0, 1.0);

  // 8. Demographics (Age & Sex)
  const ageQ = queryPatient.age !== undefined ? queryPatient.age : 45;
  const ageH = historicalPatient.age !== undefined ? historicalPatient.age : 45;
  const normAgeDiff = Math.min(Math.abs(ageQ - ageH) / 45.0, 1.0);

  const sexQ = (queryPatient.sex || "M").toUpperCase();
  const sexH = (historicalPatient.sex || "M").toUpperCase();
  const normSexDiff = sexQ === sexH ? 0.0 : 1.0;

  // 9. MET match
  const normMetDiff = queryPatient.metPrescribed === historicalPatient.metPrescribed ? 0.0 : 1.0;

  // 10. Duration Difference
  const durDiff = Math.abs(queryPatient.durationDays - historicalPatient.durationDays);
  const normDurationDiff = Math.min(durDiff / 15.0, 1.0);

  // 11. Pain VAS Difference
  const painDiff = Math.abs(queryPatient.painVas - historicalPatient.painVas);
  const normPainDiff = painDiff / 10.0;

  // Weighted quadratic distance
  const weightedSum =
    W_STRATUM * Math.pow(normStratumDiff, 2) +
    W_CREAT * Math.pow(normCreatDiff, 2) +
    W_SIZE * Math.pow(normSizeDiff, 2) +
    W_LOC * Math.pow(normLocDiff, 2) +
    W_HU * Math.pow(normHuDiff, 2) +
    W_HYDRO * Math.pow(normHydroDiff, 2) +
    W_TLC * Math.pow(normTlcDiff, 2) +
    W_AGE * Math.pow(normAgeDiff, 2) +
    W_SEX * Math.pow(normSexDiff, 2) +
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
      interventionBreakdown: {},
      isEmergencyStratum: false,
      isRenalEmergencyStratum: false,
      isSepsisStratum: false,
      hasRenalImpairment: false,
      queryCreatinine: 1.0
    };
  }

  const sCrQ = typeof queryPatient.serumCreatinine === "number" ? queryPatient.serumCreatinine : (parseFloat(queryPatient.serumCreatinine) || 1.0);
  const isFemaleQ = (queryPatient.sex || "M").toUpperCase() === "F";
  const crNormalUpperQ = isFemaleQ ? 1.00 : 1.20;
  const hasSevereAzotemiaQ = sCrQ >= 2.0;
  const hasRenalImpairmentQ = sCrQ > crNormalUpperQ;

  const isQuerySepsis = Boolean(
    queryPatient.fever ||
    (queryPatient.tlcCount !== undefined && queryPatient.tlcCount >= 14.0) ||
    (queryPatient.wbcCount !== undefined && queryPatient.wbcCount >= 14.0)
  );

  const isQueryRenalEmergency = Boolean(
    hasSevereAzotemiaQ ||
    (hasRenalImpairmentQ && queryPatient.solitaryKidney && queryPatient.hydronephrosis && queryPatient.hydronephrosis !== "none") ||
    (hasRenalImpairmentQ && queryPatient.hydronephrosis === "severe")
  );

  const isEmergencyStratum = Boolean(
    isQuerySepsis ||
    isQueryRenalEmergency ||
    (queryPatient.solitaryKidney && queryPatient.hydronephrosis && queryPatient.hydronephrosis !== "none")
  );

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
    urgent_stent_urs: 0,
    urgent_pcn: 0
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

  return {
    topMatches,
    historicalPassageRate,
    avgDaysToPassage,
    totalMatchesCount: topMatches.length,
    passedCount,
    interventionCount: topMatches.length - passedCount,
    interventionBreakdown,
    isEmergencyStratum,
    isRenalEmergencyStratum: isQueryRenalEmergency,
    isSepsisStratum: isQuerySepsis,
    hasRenalImpairment: hasRenalImpairmentQ,
    queryCreatinine: sCrQ
  };
}
