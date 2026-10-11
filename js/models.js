// Clinical Prediction Models and Medical Logic for Urinary Stone Spontaneous Passage
// Aligned with EAU (European Association of Urology) & AUA (American Urological Association) guidelines

/**
 * Categorize stone composition and hardness based on CT Hounsfield Units (HU)
 * @param {number} hu 
 * @returns {object} { category, hardness, densityLevel, colorCode, description }
 */
export function classifyHounsfieldUnit(hu) {
  if (hu < 450) {
    return {
      category: "Uric Acid",
      hardness: "Soft / Chemolyzable",
      densityLevel: "Low HU (<450)",
      colorCode: "#38bdf8", // Sky blue
      description: "Low attenuation calculus. High candidate for oral chemolytic alkalization therapy if radiolucent on X-ray."
    };
  } else if (hu < 650) {
    return {
      category: "Cystine / Mixed",
      hardness: "Intermediate-Soft",
      densityLevel: "Moderate-Low (450–650)",
      colorCode: "#34d399", // Emerald green
      description: "Intermediate attenuation. Often cystine or mixed uric acid/calcium oxalate."
    };
  } else if (hu < 850) {
    return {
      category: "Struvite / Calcium Oxalate Dihydrate",
      hardness: "Moderate",
      densityLevel: "Moderate (650–850)",
      colorCode: "#fbbf24", // Amber
      description: "Moderate density. Often responsive to MET; moderate fragmentation threshold."
    };
  } else if (hu < 1150) {
    return {
      category: "Calcium Oxalate Monohydrate (COM)",
      hardness: "Hard",
      densityLevel: "High (850–1150)",
      colorCode: "#f97316", // Orange
      description: "High density crystalline stone. Low spontaneous fragmentation; rigid crystalline lattice."
    };
  } else {
    return {
      category: "Brushite / Calcium Phosphate",
      hardness: "Very Hard (Resistant)",
      densityLevel: "Very High (>1150)",
      colorCode: "#ef4444", // Red
      description: "Dense mineral structure. Highly resistant to shockwave lithotripsy (SWL); usually warrants URS with Holmium/Thulium laser if intervention needed."
    };
  }
}

/**
 * Multivariate Logistic & Evidence-Based Nomogram for Spontaneous Passage Probability
 * @param {object} patientData 
 * @returns {object} Detailed prediction result with probabilities, feature impacts, and guidelines
 */
export function calculatePassageProbability(patientData) {
  const {
    age = 45,
    sex = "M",
    stoneSizeMm = 4.0,
    location = "distal", // "uvj", "distal", "mid", "proximal", "puj"
    huValue = 750,
    painVas = 6,
    durationDays = 3,
    hydronephrosis = "mild", // "none", "mild", "moderate", "severe"
    fever = false,
    wbcCount = 8.0,
    metPrescribed = true,
    solitaryKidney = false
  } = patientData;

  // --- 1. Check for Clinical Red Flags (Absolute Contraindications to Conservative Trial) ---
  const isEmergency = fever || wbcCount >= 14.0 || (solitaryKidney && hydronephrosis !== "none");
  const emergencyReasons = [];
  if (fever) emergencyReasons.push("Fever / Systemic Inflammatory Response (SIRS)");
  if (wbcCount >= 14.0) emergencyReasons.push(`Severe leukocytosis (WBC ${wbcCount} x10^9/L) indicating infected obstructed system`);
  if (solitaryKidney && hydronephrosis !== "none") emergencyReasons.push("Solitary kidney with obstruction (Risk of anuria/acute renal failure)");

  // --- 2. Baseline Model Weights & Feature Attributions ---
  let logOdds = 0.0;
  const featureImpacts = [];

  // Age & Gender Demographics
  const effectiveAge = typeof age === "number" ? age : 45;
  const effectiveSex = (sex || "M").toUpperCase();
  if (effectiveAge <= 35) {
    logOdds += 0.15;
    featureImpacts.push({ feature: `Young Adult (${effectiveAge}y)`, impact: "+4%", type: "positive", detail: "Favorable ureteral elasticity & smooth muscle compliance" });
  } else if (effectiveAge > 65) {
    logOdds -= 0.25;
    featureImpacts.push({ feature: `Elderly Patient (${effectiveAge}y)`, impact: "-7%", type: "negative", detail: "Reduced ureteral compliance and potential pelvic floor resistance" });
  } else {
    featureImpacts.push({ feature: `Adult Demographics (${effectiveAge}y)`, impact: "0%", type: "neutral", detail: "Standard physiological ureteral compliance" });
  }

  if (effectiveSex === "F") {
    logOdds += 0.08;
    featureImpacts.push({ feature: "Female Anatomy", impact: "+2%", type: "positive", detail: "Slightly shorter ureteral path and wider bony pelvis" });
  } else {
    logOdds -= 0.08;
    featureImpacts.push({ feature: "Male Anatomy", impact: "-2%", type: "neutral", detail: "Longer ureteral trajectory and potential prostatic resistance" });
  }

  // (A) Stone Size Impact (The strongest single predictor)
  // EAU guidelines: <4mm ~85-90%, 4-6mm ~55-60%, 6-8mm ~30%, >8mm <15%
  let sizeImpactOdds = 0;
  if (stoneSizeMm <= 3.0) {
    sizeImpactOdds = +1.75;
    featureImpacts.push({ feature: "Size ≤ 3mm", impact: "+35%", type: "positive", detail: "Excellent spontaneous passage caliber" });
  } else if (stoneSizeMm <= 4.0) {
    sizeImpactOdds = +1.15;
    featureImpacts.push({ feature: "Size 3–4mm", impact: "+25%", type: "positive", detail: "High spontaneous clearance probability" });
  } else if (stoneSizeMm <= 5.5) {
    sizeImpactOdds = +0.20;
    featureImpacts.push({ feature: "Size 4–5.5mm", impact: "+5%", type: "neutral", detail: "Borderline size; favorable if distal & with MET" });
  } else if (stoneSizeMm <= 7.0) {
    sizeImpactOdds = -0.85;
    featureImpacts.push({ feature: "Size 5.5–7mm", impact: "-20%", type: "negative", detail: "Elevated risk of impaction / failure to pass" });
  } else if (stoneSizeMm <= 9.0) {
    sizeImpactOdds = -1.80;
    featureImpacts.push({ feature: "Size 7–9mm", impact: "-38%", type: "negative", detail: "Significant mechanical obstruction risk" });
  } else {
    sizeImpactOdds = -2.70;
    featureImpacts.push({ feature: "Size > 9mm", impact: "-50%", type: "negative", detail: "Extremely low probability of spontaneous passage" });
  }
  logOdds += sizeImpactOdds;

  // (B) Anatomical Location Impact
  let locationImpactOdds = 0;
  switch (location) {
    case "uvj":
      locationImpactOdds = +1.10;
      featureImpacts.push({ feature: "Location: UVJ", impact: "+22%", type: "positive", detail: "Shortest distance remaining; terminal ureter" });
      break;
    case "distal":
      locationImpactOdds = +0.65;
      featureImpacts.push({ feature: "Location: Distal Ureter", impact: "+14%", type: "positive", detail: "Lower ureteral spindle, responsive to MET" });
      break;
    case "mid":
      locationImpactOdds = -0.20;
      featureImpacts.push({ feature: "Location: Mid Ureter", impact: "-5%", type: "neutral", detail: "Crosses iliac vessels; physiological narrowing" });
      break;
    case "proximal":
      locationImpactOdds = -0.80;
      featureImpacts.push({ feature: "Location: Proximal Ureter", impact: "-18%", type: "negative", detail: "Long transit path through entire ureteral length" });
      break;
    case "puj":
      locationImpactOdds = -1.25;
      featureImpacts.push({ feature: "Location: PUJ", impact: "-28%", type: "negative", detail: "Primary pelviureteric junction narrowing" });
      break;
    default:
      locationImpactOdds = 0;
  }
  logOdds += locationImpactOdds;

  // (C) Medical Expulsive Therapy (MET) Impact
  // AUA/EAU meta-analyses confirm alpha-1 blockers (Tamsulosin) increase passage rates in distal ureteral stones >4mm
  if (metPrescribed) {
    if (["uvj", "distal"].includes(location) && stoneSizeMm >= 4.0 && stoneSizeMm <= 8.0) {
      logOdds += 0.55;
      featureImpacts.push({ feature: "MET (Alpha-blocker)", impact: "+15%", type: "positive", detail: "Significant expulsive efficacy for distal calculi" });
    } else {
      logOdds += 0.25;
      featureImpacts.push({ feature: "MET Prescribed", impact: "+6%", type: "positive", detail: "Promotes ureteral relaxation and peristalsis" });
    }
  } else {
    featureImpacts.push({ feature: "No MET Prescribed", impact: "-8%", type: "negative", detail: "Absence of pharmacological smooth muscle relaxation" });
    logOdds -= 0.30;
  }

  // (D) Hydronephrosis / Obstruction Severity
  switch (hydronephrosis) {
    case "none":
      logOdds += 0.35;
      featureImpacts.push({ feature: "No Hydronephrosis", impact: "+8%", type: "positive", detail: "Unimpaired baseline urine drainage" });
      break;
    case "mild":
      logOdds += 0.05;
      featureImpacts.push({ feature: "Mild Hydronephrosis", impact: "0%", type: "neutral", detail: "Expected low-grade backpressure" });
      break;
    case "moderate":
      logOdds -= 0.50;
      featureImpacts.push({ feature: "Moderate Hydronephrosis", impact: "-12%", type: "negative", detail: "Moderate pelvicalyceal dilatation, impaction potential" });
      break;
    case "severe":
      logOdds -= 1.15;
      featureImpacts.push({ feature: "Severe Hydronephrosis", impact: "-25%", type: "negative", detail: "Marked parenchymal thinning / high-grade obstruction" });
      break;
  }

  // (E) Stone Hardness / Hounsfield Units (HU)
  // Higher HU (dense COM / Brushite) have rigid irregular surfaces, slower migration
  if (huValue >= 1150) {
    logOdds -= 0.35;
    featureImpacts.push({ feature: `High HU (${huValue})`, impact: "-8%", type: "negative", detail: "Dense crystalline calculus (COM/Brushite); rigid contour" });
  } else if (huValue <= 450) {
    logOdds += 0.25;
    featureImpacts.push({ feature: `Low HU (${huValue})`, impact: "+6%", type: "positive", detail: "Soft/chemolyzable calculus; potential for smooth transit" });
  }

  // (F) Duration of Symptoms Prior to Presentation
  if (durationDays > 14) {
    logOdds -= 0.60;
    featureImpacts.push({ feature: `Prolonged Colic (${durationDays}d)`, impact: "-14%", type: "negative", detail: "Chronic impaction increases periureteral fibrosis" });
  } else if (durationDays > 7) {
    logOdds -= 0.20;
    featureImpacts.push({ feature: `Symptom Duration (${durationDays}d)`, impact: "-5%", type: "neutral", detail: "Subacute presentation" });
  } else {
    featureImpacts.push({ feature: `Acute Presentation (${durationDays}d)`, impact: "+4%", type: "positive", detail: "Fresh calculus without mucosal embedding" });
  }

  // --- 3. Convert Log-Odds to Probability (Sigmoid Function) ---
  let rawProbability = 1 / (1 + Math.exp(-logOdds));

  // Cap between 2% and 98% for realistic clinical calibration
  let probabilityPercent = Math.round(rawProbability * 100);
  if (probabilityPercent > 96) probabilityPercent = 96;
  if (probabilityPercent < 3) probabilityPercent = 3;

  // If severe emergency flags present, spontaneous trial is strictly contraindicated per EAU § 3.2.3
  if (isEmergency) {
    probabilityPercent = 0;
    featureImpacts.unshift({
      feature: "Fever / SIRS / Sepsis Flag",
      impact: "CONTRAINDICATED",
      type: "negative",
      detail: "Active infected obstruction is an emergency requiring immediate decompression (EAU § 3.2.3). Conservative trial with MET is strictly contraindicated."
    });
  }

  // --- 4. Expected Time to Passage Estimation (Days) ---
  let estimatedDaysMin = 3;
  let estimatedDaysMax = 7;
  let timePassageSummary = "";

  if (isEmergency) {
    estimatedDaysMin = null;
    estimatedDaysMax = null;
    timePassageSummary = "Observation contraindicated — Immediate upper tract decompression required within hours (EAU LoE 1b)";
  } else if (probabilityPercent >= 75) {
    if (stoneSizeMm <= 3.5) {
      estimatedDaysMin = 2;
      estimatedDaysMax = 7;
    } else {
      estimatedDaysMin = 5;
      estimatedDaysMax = 12;
    }
    timePassageSummary = `Approx. ${estimatedDaysMin} to ${estimatedDaysMax} days (High probability)`;
  } else if (probabilityPercent >= 50) {
    estimatedDaysMin = 8;
    estimatedDaysMax = 20;
    timePassageSummary = `Approx. ${estimatedDaysMin} to ${estimatedDaysMax} days (Moderate probability; require weekly reassessment)`;
  } else if (probabilityPercent >= 30) {
    estimatedDaysMin = 14;
    estimatedDaysMax = 28;
    timePassageSummary = `Prolonged (14–28 days if successful, but >60% chance of requiring intervention)`;
  } else {
    estimatedDaysMin = null;
    estimatedDaysMax = null;
    timePassageSummary = "Unlikely to pass spontaneously without endourological intervention";
  }

  // --- 5. Clinical Recommendation & EAU/AUA Guidelines Category ---
  let recommendationCategory = "";
  let recommendationBadgeClass = "";
  let actionTitle = "";
  let clinicalActionPlan = [];

  if (isEmergency) {
    recommendationCategory = "EMERGENCY";
    recommendationBadgeClass = "badge-danger";
    actionTitle = "URGENT UROLOGICAL INTERVENTION / DECOMPRESSION";
    clinicalActionPlan = [
      "Immediate hospital admission and parenteral broad-spectrum antibiotics.",
      "Urgent upper urinary tract decompression via Retrograde Double-J Stent or Percutaneous Nephrostomy (PCN).",
      "Definitive stone management (URS / Laser) deferred until sepsis resolves.",
      "Serial monitoring of renal function, WBC, and lactate."
    ];
  } else if (probabilityPercent >= 70) {
    recommendationCategory = "CONSERVATIVE_MET";
    recommendationBadgeClass = "badge-success";
    actionTitle = "Favorable Candidate for Conservative Management with MET";
    clinicalActionPlan = [
      "Medical Expulsive Therapy: Tamsulosin 0.4 mg PO daily for up to 4 weeks.",
      "Adequate oral hydration (2.5 – 3.0 L/day) and tailored analgesia (NSAIDs like Ketorolac or Ibuprofen as first-line).",
      "Instruct patient on stone strainer collection for crystallographic analysis.",
      "Red flag warnings: Advise immediate return if intractable pain, chills/fever, or persistent vomiting.",
      "Follow-up imaging (low-dose CT or KUB + renal ultrasound) in 2 to 3 weeks if stone has not passed."
    ];
  } else if (probabilityPercent >= 45) {
    recommendationCategory = "BORDERLINE_WATCHFUL";
    recommendationBadgeClass = "badge-warning";
    actionTitle = "Equivocal / Borderline: Short Trial of MET (Max 2 Weeks) or Early Intervention";
    clinicalActionPlan = [
      "Trial of conservative therapy with Tamsulosin 0.4mg for strict maximum of 10–14 days.",
      "Careful monitoring of renal function and symptom control.",
      "Pre-schedule elective semi-rigid or flexible Ureteroscopy (URS) at 2 weeks in case stone fails to migrate.",
      "If pain is recurrent or patient requests rapid resolution, proceed directly to URS or SWL."
    ];
  } else {
    recommendationCategory = "EARLY_INTERVENTION";
    recommendationBadgeClass = "badge-accent";
    actionTitle = "Early Primary Endourological Intervention Recommended";
    clinicalActionPlan = [
      "Spontaneous passage unlikely due to calculus dimensions/location.",
      "Recommend Ureteroscopy (URS) with Holmium/Thulium laser lithotripsy as first-line definitive therapy.",
      "Alternative: Extracorporeal Shock Wave Lithotripsy (SWL) if proximal/mid ureter and stone density < 1000 HU.",
      "Avoid prolonged conservative trial > 4 weeks to prevent irreversible loss of renal function and ureteral stricture."
    ];
  }

  return {
    probabilityPercent,
    percentage: probabilityPercent,
    isEmergency,
    emergencyDecompression: isEmergency,
    emergencyReasons,
    timePassageSummary,
    timeEstimate: timePassageSummary,
    estimatedDaysMin,
    estimatedDaysMax,
    recommendationCategory,
    recommendationBadgeClass,
    actionTitle,
    clinicalActionPlan,
    featureImpacts,
    huAnalysis: classifyHounsfieldUnit(huValue)
  };
}
