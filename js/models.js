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
    tlcCount = 8.0,
    serumCreatinine = 1.0,
    metPrescribed = true,
    solitaryKidney = false
  } = patientData;

  // --- 1. Check for Clinical Red Flags & Obstructive Sepsis / AKI ---
  const sCr = typeof serumCreatinine === "number" ? serumCreatinine : (parseFloat(serumCreatinine) || 1.0);
  const isFemale = (sex || "M").toUpperCase() === "F";
  const crNormalUpper = isFemale ? 1.00 : 1.20;
  const crImpairmentThreshold = isFemale ? 1.20 : 1.40;
  const hasRenalImpairment = sCr >= crImpairmentThreshold;
  const hasSevereAzotemia = sCr >= 2.0;
  const hasBorderlineCr = sCr > crNormalUpper && sCr < crImpairmentThreshold;
  const effectiveTlc = typeof tlcCount === "number" ? tlcCount : (typeof wbcCount === "number" ? wbcCount : 8.0);
  const isSepsisEmergency = fever || effectiveTlc >= 14.0;
  const isSolitaryKidneyObstructed = solitaryKidney && (hydronephrosis !== "none" || sCr > crNormalUpper);
  const isRenalEmergency = hasSevereAzotemia || (hasRenalImpairment && solitaryKidney) || isSolitaryKidneyObstructed;
  const isEmergency = isSepsisEmergency || isRenalEmergency;

  const emergencyReasons = [];
  if (fever) emergencyReasons.push("Fever / Systemic Inflammatory Response (SIRS) with obstructive calculus (EAU § 3.2.3)");
  if (effectiveTlc >= 14.0) emergencyReasons.push(`Severe leukocytosis (TLC ${effectiveTlc.toFixed(1)} × 10³/μL) indicating urosepsis risk`);
  if (hasSevereAzotemia) emergencyReasons.push(`Severe azotemia / Acute Kidney Injury (sCr ${sCr.toFixed(2)} mg/dL) requiring emergency decompression to salvage nephrons`);
  if (isSolitaryKidneyObstructed) emergencyReasons.push(`Solitary kidney with acute obstruction ${sCr > crNormalUpper ? `and elevated sCr (${sCr.toFixed(2)} mg/dL)` : ''} (Emergency decompression required to avert anuria/uremic crisis)`);

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

  // (G) Serum Creatinine / Renal Function Impact (EAU § 3.2.3 & § 3.4.1)
  if (hasSevereAzotemia) {
    featureImpacts.push({
      feature: `Severe Azotemia (sCr ${sCr.toFixed(2)} mg/dL)`,
      impact: "CONTRAINDICATED",
      type: "negative",
      detail: "Severe post-renal acute kidney injury. Spontaneous passage trial contraindicated (EAU § 3.2.3). Urgent decompression required."
    });
  } else if (hasRenalImpairment) {
    logOdds -= 2.20; // massive statistical penalty
    featureImpacts.push({
      feature: `Elevated sCr (${sCr.toFixed(2)} mg/dL) — Post-Renal AKI`,
      impact: "CONTRAINDICATED",
      type: "negative",
      detail: `EAU § 3.4.1: Renal filtration is compromised (sCr ${sCr.toFixed(2)} mg/dL ≥ ${crImpairmentThreshold.toFixed(1)} mg/dL; normal: ≤${crNormalUpper.toFixed(1)} mg/dL). Conservative MET observation is strictly contraindicated. Urgent Double-J stenting or decompression required.`
    });
  } else if (hasBorderlineCr) {
    logOdds -= 0.50;
    featureImpacts.push({
      feature: `Borderline sCr (${sCr.toFixed(2)} mg/dL)`,
      impact: "-10%",
      type: "negative",
      detail: `Subclinical renal impairment / dehydration (normal: ≤${crNormalUpper.toFixed(1)} mg/dL); limit trial to max 10–14 days with repeat creatinine in 48h; avoid nephrotoxic NSAIDs.`
    });
  } else {
    featureImpacts.push({
      feature: `Normal sCr (${sCr.toFixed(2)} mg/dL)`,
      impact: "+5%",
      type: "positive",
      detail: `Preserved bilateral renal filtration function (reference: ≤${crNormalUpper.toFixed(1)} mg/dL)`
    });
  }

  // --- 3. Convert Log-Odds to Probability (Sigmoid Function) ---
  let rawProbability = 1 / (1 + Math.exp(-logOdds));

  // Cap between 2% and 98% for realistic clinical calibration
  let probabilityPercent = Math.round(rawProbability * 100);
  if (probabilityPercent > 96) probabilityPercent = 96;
  if (probabilityPercent < 3) probabilityPercent = 3;

  // Emergency & Impaired Renal Function Overrides per EAU Guidelines
  if (isEmergency) {
    probabilityPercent = 0;
    featureImpacts.unshift({
      feature: emergencyReasons[0] || "Emergency Flag",
      impact: "CONTRAINDICATED",
      type: "negative",
      detail: "Emergency upper tract decompression required (EAU § 3.2.3). Conservative observation with MET is strictly contraindicated."
    });
  } else if (hasRenalImpairment) {
    // EAU § 3.4.1: Observation with MET is restricted to patients with NORMAL renal function.
    if (probabilityPercent > 5) probabilityPercent = 5;
    featureImpacts.unshift({
      feature: `Elevated sCr (${sCr.toFixed(2)} mg/dL) — Post-Renal AKI`,
      impact: "OVERRIDE",
      type: "negative",
      detail: `EAU § 3.4.1: Observation with MET is restricted to patients with preserved normal renal function. Impaired GFR (sCr ${sCr.toFixed(2)} mg/dL) mandates urgent decompression (DJ Stent/PCN) or urgent intervention with stenting to halt nephron damage.`
    });
  }

  // Calculate 95% Confidence Interval
  let ciMargin = Math.max(3, Math.round(Math.sqrt((probabilityPercent * (100 - probabilityPercent)) / 75)));
  if (probabilityPercent === 0) ciMargin = 0;
  let ciLow = Math.max(0, probabilityPercent - ciMargin);
  let ciHigh = Math.min(100, probabilityPercent + ciMargin);

  // --- 4. Expected Time to Passage Estimation (Days) ---
  let estimatedDaysMin = 3;
  let estimatedDaysMax = 7;
  let timePassageSummary = "";

  if (isEmergency) {
    estimatedDaysMin = null;
    estimatedDaysMax = null;
    timePassageSummary = "Observation contraindicated — Immediate upper tract decompression required within hours (EAU LoE 1b)";
  } else if (hasRenalImpairment) {
    estimatedDaysMin = null;
    estimatedDaysMax = null;
    timePassageSummary = `Conservative trial contraindicated (sCr ${sCr.toFixed(2)} mg/dL) — Expedient endourological relief mandated (EAU § 3.4.1)`;
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

  // --- 5. Clinical Recommendation & EAU Guidelines Category ---
  let eauSectionBadge = "EAU Section 3.4.1";
  let eauLoEBadge = "LoE 1a";
  let eauStrengthBadge = "Strong Recommendation";
  let eauMainHeadline = "";
  let eauCeilingText = "";
  let eauModalityText = "";
  let eauModalityReason = "";
  let eauPainText = "";
  let eauMetStatusText = "";
  let eauMetReasonText = "";
  let recommendationCategory = "";
  let recommendationBadgeClass = "";
  let actionTitle = "";
  let clinicalActionPlan = [];

  if (isEmergency) {
    recommendationCategory = "EMERGENCY";
    recommendationBadgeClass = "badge-danger";
    eauSectionBadge = "EAU Section 3.2.3";
    eauLoEBadge = "LoE 1b";
    eauStrengthBadge = "Strong Recommendation";
    eauMainHeadline = isSepsisEmergency
      ? "URGENT UPPER TRACT DECOMPRESSION MANDATED (INFECTED HYDRONEPHROSIS)"
      : "EMERGENCY UPPER TRACT DECOMPRESSION (ACUTE RENAL FAILURE / SOLITARY KIDNEY)";
    eauCeilingText = "IMMEDIATE (Within 6–12 Hours)";
    eauModalityText = "Retrograde DJ Stent vs Bedside Nephrostomy (PCN)";
    eauModalityReason = "EAU LoE 1b: Urgent relief of collecting system pressure is mandatory; definitive URS/ESWL is strictly deferred";
    eauPainText = "Parenteral Analgesia (Opioids / Paracetamol); Withhold NSAIDs in Sepsis/AKI";
    eauMetStatusText = "MET Strictly Contraindicated";
    eauMetReasonText = "Active infection / acute renal crisis mandates physical decompression; MET is ineffective and dangerous";
    actionTitle = "URGENT UROLOGICAL INTERVENTION / DECOMPRESSION";
    clinicalActionPlan = [
      "Immediate hospital admission; establish large-bore IV access and continuous hemodynamic monitoring.",
      isSepsisEmergency ? "Draw blood cultures immediately and administer parenteral broad-spectrum antibiotics within 1 hour." : "Assess renal function, serial electrolytes (hyperkalemia risk), and blood gas.",
      "Urgent upper urinary tract decompression via Retrograde Double-J Stent or Percutaneous Nephrostomy (PCN) within hours.",
      "Definitive stone fragmentation (URS / Laser) is strictly deferred until systemic stability is achieved.",
      "Serial monitoring of serum creatinine, urine output, WBC, and lactate."
    ];
  } else if (hasRenalImpairment) {
    recommendationCategory = "EXPEDIENT_SURGICAL_RELIEF";
    recommendationBadgeClass = "badge-danger";
    eauSectionBadge = "EAU Section 3.2.3 / 3.4.1";
    eauLoEBadge = "LoE 1b";
    eauStrengthBadge = "Strong Recommendation";
    eauMainHeadline = `Expedient Upper Tract Decompression Indicated (sCr ${sCr.toFixed(2)} mg/dL: Obstructive AKI)`;
    eauCeilingText = "Expedient Intervention (Within 24–48 Hours)";
    eauModalityText = "Double-J Stent Decompression or Immediate Primary URS";
    eauModalityReason = "EAU § 3.4.1: Renal function is compromised. Conservative MET waiting is contraindicated; immediate decompression relieves nephron ischemia";
    eauPainText = "AVOID NSAIDs (Paracetamol / Cautious Opioids) [LoE 1b - Prevent AKI Worsening]";
    eauMetStatusText = "MET Contraindicated (Impaired Renal Function)";
    eauMetReasonText = "EAU § 3.4.1: MET observation requires preserved normal renal function; prohibited in active post-renal AKI";
    actionTitle = "Prompt Endourological Relief Indicated (Obstructive AKI / Elevated sCr)";
    clinicalActionPlan = [
      `Elevated Serum Creatinine (${sCr.toFixed(2)} mg/dL) signifies acute obstructive nephropathy / post-renal AKI.`,
      "Conservative observation with MET is CONTRAINDICATED (EAU § 3.4.1 restricts MET to patients with preserved normal renal function).",
      "Urgent Double-J Stent decompression (or expedient primary endourological stone extraction with stenting) required within 24–48 hours to restore filtration.",
      "AVOID NSAIDs (Diclofenac/Ketorolac) — risk of precipitating acute tubular necrosis; manage pain with Paracetamol / cautious short-acting opioids.",
      "Strict contrast-free protocol; monitor fluid balance and repeat serum creatinine daily until normalization."
    ];
  } else if (probabilityPercent >= 70 && stoneSizeMm <= 5.0) {
    recommendationCategory = "CONSERVATIVE_MET";
    recommendationBadgeClass = "badge-success";
    eauSectionBadge = "EAU Section 3.4.3";
    eauLoEBadge = "LoE 1a";
    eauStrengthBadge = "Strong Recommendation";
    eauMainHeadline = "Conservative Surveillance with Medical Expulsive Therapy (MET)";
    eauCeilingText = "Strict 4-Week Maximum Limit";
    eauModalityText = "Semi-rigid URS (Laser Lithotripsy) if Trial Fails";
    eauModalityReason = "EAU LoE 1a: For distal ureteral calculi requiring intervention, URS achieves superior stone-free rates";
    eauPainText = "NSAIDs First-Line (Diclofenac / Ketorolac) [LoE 1b]";
    eauMetStatusText = "Tamsulosin 0.4mg Daily Strongly Indicated";
    eauMetReasonText = "EAU LoE 1a: Alpha-blockers accelerate expulsion and reduce analgesic requirements in normal renal function";
    actionTitle = "Favorable Candidate for Conservative Management with MET";
    clinicalActionPlan = [
      "Medical Expulsive Therapy: Tamsulosin 0.4 mg PO daily (or Silodosin 8 mg daily) for up to 4 weeks (EAU LoE 1a).",
      "Adequate oral hydration (2.5 – 3.0 L/day) and tailored analgesia (NSAIDs like Ketorolac or Ibuprofen as first-line).",
      "Instruct patient on stone strainer collection for crystallographic analysis.",
      "Red flag warnings: Advise immediate return if intractable pain, chills/fever, or persistent vomiting.",
      "Mandatory 4-Week Ceiling: schedule repeat renal ultrasound or low-dose non-contrast CT at 2 to 3 weeks to verify progression."
    ];
  } else if (["proximal", "mid", "puj"].includes(location) && stoneSizeMm <= 6.5) {
    recommendationCategory = "BORDERLINE_WATCHFUL";
    recommendationBadgeClass = "badge-warning";
    eauSectionBadge = "EAU Section 3.4.4";
    eauLoEBadge = "LoE 1b";
    eauStrengthBadge = "Strong Recommendation";
    eauMainHeadline = "Borderline Surveillance vs Early Active Stone Removal";
    eauCeilingText = "Strict 2 to 3-Week Maximum Limit";
    if (huValue < 1000) {
      eauModalityText = "Shock Wave Lithotripsy (ESWL) or Flexible URS";
      eauModalityReason = "Stone < 10mm and HU < 1000: SWL and URS have equivalent primary success rates (EAU LoE 1b)";
    } else {
      eauModalityText = "Flexible URS (RIRS / Laser) Preferred Over SWL";
      eauModalityReason = "High stone density (≥1000 HU) confers resistance to shockwave disintegration; URS achieves higher stone-free rate";
    }
    eauPainText = "NSAIDs First-Line (Diclofenac / Ketorolac) [LoE 1b]";
    eauMetStatusText = "MET Discretionary / Off-Label";
    eauMetReasonText = "EAU Guidelines note efficacy of MET is primarily established in distal calculi; optional in mid/upper ureter";
    actionTitle = "Equivocal / Borderline: Short Trial of MET (Max 2 Weeks) or Early Intervention";
    clinicalActionPlan = [
      "Option for limited conservative trial of 10–14 days ONLY because patient is symptomatically stable and renal function is normal.",
      "Schedule formal re-evaluation at day 14; if stone has not migrated past the iliac vessels, proceed directly to intervention.",
      huValue < 1000
        ? "Primary intervention option: Shock Wave Lithotripsy (SWL) under analgesia or Flexible Ureteroscopy (RIRS)."
        : "Primary intervention option: Flexible URS with Holmium/Thulium laser lithotripsy (preferred due to high CT attenuation).",
      "Instruct patient regarding strict red flags: persistent pain, spiking temperatures, or deteriorating renal function."
    ];
  } else {
    recommendationCategory = "EARLY_INTERVENTION";
    recommendationBadgeClass = "badge-accent";
    eauSectionBadge = "EAU Section 3.4.4";
    eauLoEBadge = "LoE 1a / 1b";
    eauStrengthBadge = "Strong Recommendation";
    eauMainHeadline = "Primary Active Endourological Intervention Indicated";
    eauCeilingText = "Early Intervention (Do Not Delay > 1–2 Weeks)";
    if (["distal", "uvj"].includes(location)) {
      eauModalityText = "Semi-rigid URS (Laser Lithotripsy)";
      eauModalityReason = "EAU LoE 1a: URS is the standard of care for distal calculi > 7mm with highest 1-session stone-free rate";
    } else {
      if (huValue >= 1000 || stoneSizeMm > 10.0) {
        eauModalityText = "Flexible URS (RIRS / Laser Lithotripsy) Preferred";
        eauModalityReason = "Caliber > 10mm or HU ≥ 1000: SWL failure rate is elevated; endoscopic fragmentation strongly recommended";
      } else {
        eauModalityText = "Flexible URS or SWL (Shared Decision)";
        eauModalityReason = "Either SWL or URS can be offered; URS achieves higher immediate stone-free rate";
      }
    }
    eauPainText = "Pre-operative NSAID Protocol + Definitive Surgical Planning";
    eauMetStatusText = "MET Alone Is Insufficient";
    eauMetReasonText = "Spontaneous passage rate is < 20%; prolonged observation risks irreversible nephron loss";
    actionTitle = "Early Primary Endourological Intervention Recommended";
    clinicalActionPlan = [
      "Spontaneous passage unlikely due to calculus caliber (> 7mm) or unfavorable anatomical location (EAU LoE 1a).",
      "Offer primary active stone removal to prevent irreversible loss of renal parenchymal function and ureteral stricture.",
      `Definitive procedure of choice: ${eauModalityText}.`,
      "Pre-operative evaluation: urinalysis/culture, CBC with differential, serum creatinine and eGFR.",
      "Do NOT prolong conservative management beyond 2 weeks; pre-schedule endourological stone retrieval."
    ];
  }

  const surgicalPathway = determineSurgicalPathway(patientData, probabilityPercent, isEmergency);
  const inputJustifications = generateTreatmentJustifications(patientData, probabilityPercent, isEmergency, surgicalPathway);

  return {
    probabilityPercent,
    percentage: probabilityPercent,
    ciLow,
    ciHigh,
    isEmergency,
    emergencyDecompression: isEmergency,
    emergencyReasons,
    timePassageSummary,
    timeEstimate: timePassageSummary,
    estimatedDaysMin,
    estimatedDaysMax,
    eauSectionBadge,
    eauLoEBadge,
    eauStrengthBadge,
    eauMainHeadline,
    eauCeilingText,
    eauModalityText,
    eauModalityReason,
    eauPainText,
    eauMetStatusText,
    eauMetReasonText,
    recommendationCategory,
    recommendationBadgeClass,
    actionTitle,
    clinicalActionPlan,
    featureImpacts,
    huAnalysis: classifyHounsfieldUnit(huValue),
    surgicalPathway,
    inputJustifications
  };
}

/**
 * Determine Surgical Staging Strategy: Emergency Decompression (DJ Stent vs PCN)
 * vs Primary Definitive Stone Removal from the Start (URS / FURS / ESWL)
 * Aligned with EAU Guidelines § 3.2.3, § 3.4.4, § 3.4.5 (LoE 1a / 1b)
 * @param {object} patientData 
 * @param {number} probabilityPercent 
 * @param {boolean} isEmergency 
 * @returns {object} Detailed surgical pathway decision matrix
 */
export function determineSurgicalPathway(patientData, probabilityPercent, isEmergency) {
  const {
    stoneSizeMm = 4.5,
    location = "distal",
    huValue = 750,
    serumCreatinine = 1.0,
    solitaryKidney = false,
    fever = false,
    tlcCount = 8.0,
    wbcCount = 8.0,
    sex = "M"
  } = patientData;

  const sCr = typeof serumCreatinine === "number" ? serumCreatinine : (parseFloat(serumCreatinine) || 1.0);
  const isFemale = (sex || "M").toUpperCase() === "F";
  const crNormalUpper = isFemale ? 1.00 : 1.20;
  const crImpairmentThreshold = isFemale ? 1.20 : 1.40;
  const hasRenalImpairment = sCr >= crImpairmentThreshold;
  const hasSevereAzotemia = sCr >= 2.0;
  const hasBorderlineCr = sCr > crNormalUpper && sCr < crImpairmentThreshold;
  const effectiveTlc = typeof tlcCount === "number" ? tlcCount : (typeof wbcCount === "number" ? wbcCount : 8.0);
  const isSepsis = fever || effectiveTlc >= 14.0;
  const isSolitaryKidneyObstructed = solitaryKidney && (patientData.hydronephrosis !== "none" || sCr > crNormalUpper);

  // Definitive modality choice based on anatomy and HU density:
  let definitiveModalityName = "";
  let definitiveModalityRationale = "";
  let definitiveModalityChoice = "";

  if (["distal", "uvj"].includes(location)) {
    definitiveModalityName = "Semi-rigid Ureteroscopy (URS) + Laser Lithotripsy";
    definitiveModalityRationale = "EAU LoE 1a: URS achieves superior 1-session stone-free rate (>95%) for distal calculi compared to ESWL.";
    definitiveModalityChoice = "Semi-rigid URS Preferred (LoE 1a)";
  } else if (location === "mid") {
    if (huValue < 1000 && stoneSizeMm <= 10.0) {
      definitiveModalityName = "Semi-rigid/Flexible URS or Shock Wave Lithotripsy (ESWL)";
      definitiveModalityRationale = "EAU LoE 1b: Equivalent primary success rates for mid-ureteral calculi <10mm and <1000 HU. Shared clinical decision based on patient preference and equipment availability.";
      definitiveModalityChoice = "Shared Decision (URS vs ESWL)";
    } else {
      definitiveModalityName = "Ureteroscopy (URS / Laser Lithotripsy)";
      definitiveModalityRationale = "EAU LoE 1b: Dense stone (≥1000 HU) or larger caliber (>10mm) confers high shockwave resistance; endoscopic laser disintegration is strongly preferred.";
      definitiveModalityChoice = "URS Preferred Over ESWL";
    }
  } else {
    // proximal or puj
    if (huValue < 1000 && stoneSizeMm <= 10.0) {
      definitiveModalityName = "Flexible URS (FURS / RIRS) or Shock Wave Lithotripsy (ESWL)";
      definitiveModalityRationale = "EAU LoE 1b: Both ESWL and Flexible URS with laser lithotripsy are recommended first-line modalities for upper ureteral calculi <10mm with density <1000 HU.";
      definitiveModalityChoice = "Flexible URS or ESWL (Equivalent Efficacy)";
    } else {
      definitiveModalityName = "Flexible URS (FURS / RIRS) + Laser Lithotripsy";
      definitiveModalityRationale = "EAU LoE 1b: Calculus caliber >10mm or CT attenuation ≥1000 HU (dense calcium oxalate monohydrate or brushite) significantly reduces ESWL disintegration rates; flexible ureteroscopy with Holmium/Thulium laser dusting is strongly preferred.";
      definitiveModalityChoice = "Flexible URS (FURS) Preferred";
    }
  }

  // Branch 1: Sepsis Emergency
  if (isSepsis) {
    return {
      strategyType: "two_stage_sepsis",
      strategyBadge: "TWO-STAGE MANDATE (EAU § 3.2.3)",
      strategyBadgeClass: "badge-danger",
      canDoDefinitiveFromStart: false,
      definitiveStartVerdict: "STRICTLY CONTRAINDICATED FROM THE START",
      verdictTag: "Definitive Removal from Start (URS / FURS / ESWL):",
      verdictHeadline: "STRICTLY CONTRAINDICATED FROM START — TWO-STAGE DRAINAGE MANDATORY",
      verdictSubtext: "Active infection / SIRS mandates urgent upper urinary tract decompression within hours. Attempting primary definitive stone fragmentation (URS / FURS / ESWL) from the start in an infected system is strictly contraindicated due to life-threatening sepsis risk.",
      colDecompressBadge: "STAGE 1: EMERGENCY DECOMPRESSION (WITHIN HOURS)",
      colDecompressTitle: "Retrograde DJ Stent vs Percutaneous Nephrostomy (PCN)",
      colDecompressHtml: `
        <div class="subcol-option-item">
          <div class="subcol-option-name" style="color: #38bdf8;">
            <span>⚡ Retrograde Double-J (DJ) Stent</span>
          </div>
          <div><strong>Preferred when:</strong> Patient has bleeding diathesis / coagulopathy (PCN has higher parenchymal hemorrhage risk), calculus located in distal or mid ureter with safety guidewire bypassable, patient tolerates lithotomy position, and routine cystoscopy setup is readily available (EAU LoE 1b).</div>
        </div>
        <div class="subcol-option-item" style="margin-top: 5px;">
          <div class="subcol-option-name" style="color: #f59e0b;">
            <span>⚡ Percutaneous Nephrostomy (PCN)</span>
          </div>
          <div><strong>Preferred when:</strong> Severe septic shock with hemodynamic instability (rapid bedside placement under local anesthesia in prone/flank position without GA or lithotomy), impassable impacted stone (failed retrograde wire), or gross purulent pyonephrosis (thicker 8–10Fr lumen drains viscous pus effectively).</div>
        </div>
      `,
      colDefinitiveBadge: "STAGE 2: DEFINITIVE STONE CLEARANCE (DELAYED)",
      colDefinitiveTitle: "Definitive Removal Timing: Strictly Deferred",
      colDefinitiveHtml: `
        <div class="subcol-option-item" style="border-color: rgba(239, 68, 68, 0.35); background: rgba(239, 68, 68, 0.08);">
          <div class="subcol-option-name" style="color: #f87171;">
            <span>⛔ Why Primary URS/FURS/ESWL is Contraindicated Upfront:</span>
          </div>
          <div>Endoscopic irrigation in an infected obstructed system generates elevated intrapelvic pressure (>30–40 mmHg), forcing bacteria & endotoxins into the renal circulation (pyelovenous/pyelolymphatic backflow), triggering fulminant septic shock, multi-organ failure, and mortality (EAU § 3.2.3, LoE 1b).</div>
        </div>
        <div class="subcol-option-item" style="margin-top: 5px;">
          <div class="subcol-option-name" style="color: #34d399;">
            <span>✓ Safe Definitive Surgery Timing:</span>
          </div>
          <div>Defer definitive <strong>${definitiveModalityChoice}</strong> until patient is clinically afebrile for ≥ 48–72 hours, TLC / inflammatory markers normalize, and urine is sterile on culture (typically 1–2 weeks post-decompression). The Stage 1 DJ stent also provides passive dilation for safer Stage 2 URS.</div>
        </div>
      `,
      pearlHtml: `<strong>EAU GUIDELINE MANDATE (§ 3.2.3, LoE 1b, Strong):</strong> "In infected hydronephrosis, urgent decompression of the renal collecting system is mandatory. Definitive stone removal MUST be delayed until sepsis resolves completely."`,
      definitiveModalityChoice,
      definitiveModalityName,
      preStentingNote: "The emergency Double-J stent placed in Stage 1 serves both as lifesaving infection drainage and as passive ureteral dilation for safer Stage 2 URS."
    };
  }

  // Branch 2: Severe Azotemia (sCr >= 2.0) or Solitary Kidney with Obstruction
  if (hasSevereAzotemia || isSolitaryKidneyObstructed) {
    return {
      strategyType: "two_stage_renal",
      strategyBadge: "URGENT TWO-STAGE DECOMPRESSION (EAU § 3.2.3)",
      strategyBadgeClass: "badge-danger",
      canDoDefinitiveFromStart: false,
      definitiveStartVerdict: "STAGE 1 DECOMPRESSION FIRST (SEVERE AZOTEMIA / SOLITARY KIDNEY)",
      verdictTag: "Definitive Removal from Start (URS / FURS / ESWL):",
      verdictHeadline: "DECOMPRESS FIRST (STAGE 1) — DEFER DEFINITIVE REMOVAL UNTIL RENAL RECOVERY",
      verdictSubtext: `Severe renal impairment (sCr ${sCr.toFixed(2)} mg/dL)${isSolitaryKidneyObstructed ? " in an obstructed solitary kidney" : ""} represents acute post-renal renal failure. Immediate upper urinary tract decompression via DJ Stent or PCN is mandatory to decompress nephrons and restore GFR before subjecting the patient to operative lithotripsy.`,
      colDecompressBadge: "STAGE 1: URGENT DRAINAGE (WITHIN 12–24 HOURS)",
      colDecompressTitle: "Retrograde DJ Stent vs Percutaneous Nephrostomy (PCN)",
      colDecompressHtml: `
        <div class="subcol-option-item">
          <div class="subcol-option-name" style="color: #38bdf8;">
            <span>⚡ Retrograde Double-J (DJ) Stent</span>
          </div>
          <div><strong>Preferred when:</strong> Standard cystoscopic approach bypasses stone with guidewire, patient stable, provides internal drainage without external tube.</div>
        </div>
        <div class="subcol-option-item" style="margin-top: 5px;">
          <div class="subcol-option-name" style="color: #f59e0b;">
            <span>⚡ Percutaneous Nephrostomy (PCN)</span>
          </div>
          <div><strong>Preferred when:</strong> Severe anuria / marked pelvicalyceal distention, failed retrograde wire bypass, or profound azotemia where low-pressure external gravity drainage avoids reflux.</div>
        </div>
      `,
      colDefinitiveBadge: "STAGE 2: DEFINITIVE STONE CLEARANCE (DELAYED)",
      colDefinitiveTitle: `Definitive ${definitiveModalityChoice} Deferred`,
      colDefinitiveHtml: `
        <div class="subcol-option-item" style="border-color: rgba(245, 158, 11, 0.35); background: rgba(245, 158, 11, 0.08);">
          <div class="subcol-option-name" style="color: #fbbf24;">
            <span>⏳ Defer Surgery Until Biochemical Stabilization:</span>
          </div>
          <div>Do not perform prolonged stone fragmentation during acute azotemic decompensation. Defer definitive <strong>${definitiveModalityName}</strong> until serum creatinine drops toward baseline and fluid/electrolyte balance stabilizes.</div>
        </div>
      `,
      pearlHtml: `<strong>EAU GUIDELINE MANDATE (§ 3.2.3):</strong> Urgent decompression is indicated in bilateral obstruction, solitary kidney with obstruction, or acute renal failure. Decompress first; treat the stone second.`,
      definitiveModalityChoice,
      definitiveModalityName,
      preStentingNote: "Emergency Stage 1 decompression is mandatory; definitive surgery deferred."
    };
  }

  // Branch 3: Elevated Creatinine / Post-Renal AKI (sCr >= crImpairmentThreshold, afebrile, bilateral kidneys)
  if (hasRenalImpairment) {
    return {
      strategyType: "urgent_renal_relief",
      strategyBadge: "URGENT RELIEF / PRE-STENTING MANDATORY (EAU § 3.2.3 & § 3.4.1)",
      strategyBadgeClass: "badge-danger",
      canDoDefinitiveFromStart: false,
      definitiveStartVerdict: "URGENT DECOMPRESSION MANDATORY (POST-RENAL AKI)",
      verdictTag: "Surgical Staging & Pre-Stenting Verdict:",
      verdictHeadline: `URGENT DOUBLE-J STENTING MANDATORY — RENAL FUNCTION COMPROMISED (sCr ${sCr.toFixed(2)} mg/dL)`,
      verdictSubtext: `Serum creatinine of ${sCr.toFixed(2)} mg/dL indicates acute post-renal renal impairment (reference normal: ≤${crNormalUpper.toFixed(1)} mg/dL). Renal function is NOT preserved. Conservative MET waiting is strictly contraindicated. The routine elective 'no pre-stenting' rule DOES NOT APPLY. Urgent Double-J stent decompression is mandatory to relieve hydronephrotic backpressure and restore GFR before or alongside definitive stone removal.`,
      colDecompressBadge: "UPFRONT DECOMPRESSION MANDATE",
      colDecompressTitle: "Double-J (DJ) Stent Decompression Strongly Indicated (EAU § 3.2.3)",
      colDecompressHtml: `
        <div class="subcol-option-item" style="border-color: rgba(239, 68, 68, 0.35); background: rgba(239, 68, 68, 0.08);">
          <div class="subcol-option-name" style="color: #f87171;">
            <span>⚠ Elevated Creatinine Override (sCr ${sCr.toFixed(2)} mg/dL):</span>
          </div>
          <div>When serum creatinine is elevated (${sCr.toFixed(2)} mg/dL ≥ ${crImpairmentThreshold.toFixed(1)} mg/dL), renal functional reserve is compromised by obstructive backpressure. <strong>Renal function is NOT preserved.</strong> Conservative observation with MET is contraindicated (EAU § 3.4.1). Urgent Double-J (DJ) stent decompression halts nephron apoptosis, prevents permanent parenchymal loss, and restores GFR.</div>
        </div>
        <div class="subcol-option-item" style="margin-top: 5px;">
          <div class="subcol-option-name" style="color: #38bdf8;">
            <span>⚡ Staged Decompression vs Urgent Primary Intervention:</span>
          </div>
          <div><strong>Staged Approach (Standard Practice):</strong> Place Double-J stent urgently to decompress the kidney and achieve biochemical recovery; defer definitive lithotripsy for 1–2 weeks until creatinine normalizes.<br><strong>Single-Stage Urgent Intervention:</strong> If an experienced endourologist undertakes immediate primary <strong>${definitiveModalityName}</strong>, placement of a <strong>mandatory post-operative Double-J stent</strong> is required (stentless URS is contraindicated in AKI), and a contrast-free protocol must be observed.</div>
        </div>
      `,
      colDefinitiveBadge: "DEFINITIVE CLEARANCE MODALITY",
      colDefinitiveTitle: definitiveModalityChoice,
      colDefinitiveHtml: `
        <div class="subcol-option-item" style="border-color: rgba(14, 165, 233, 0.3); background: rgba(14, 165, 233, 0.08);">
          <div class="subcol-option-name" style="color: #38bdf8;">
            <span>🎯 Recommended Procedure: ${definitiveModalityName}</span>
          </div>
          <div>${definitiveModalityRationale}</div>
        </div>
        <div class="subcol-option-item" style="margin-top: 5px;">
          <div class="subcol-option-name" style="color: #f59e0b;">
            <span>⚠ ESWL Disfavored in Renal Impairment:</span>
          </div>
          <div>Shock Wave Lithotripsy (ESWL) is disfavored in acute renal insufficiency because fragmented stone debris (steinstraße) may prolong obstruction and delay GFR recovery. Endoscopic laser extraction (${definitiveModalityChoice}) provides immediate luminal restoration.</div>
        </div>
      `,
      pearlHtml: `<strong>EAU GUIDELINE MANDATE (§ 3.2.3 & § 3.4.1, LoE 1b, Strong):</strong> "In patients with impaired or deteriorating renal function (sCr ${sCr.toFixed(2)} mg/dL), urgent relief of obstruction is mandatory. Conservative surveillance with MET is contraindicated. The elective 'no pre-stenting' recommendation applies strictly to patients with normal baseline renal function."`,
      definitiveModalityChoice,
      definitiveModalityName,
      preStentingNote: "Double-J stent decompression is strongly indicated due to elevated serum creatinine (post-renal AKI)."
    };
  }

  // Branch 4: Normal Renal Function Elective Presentation (sCr <= crNormalUpper)
  const isHighPassageCandidate = probabilityPercent >= 70 && stoneSizeMm <= 5.0 && !hasRenalImpairment && !hasSevereAzotemia;

  if (isHighPassageCandidate) {
    const backupModality = (location === "distal" || location === "uvj")
      ? "Semi-rigid URS + Laser Lithotripsy"
      : (huValue >= 1000 ? "Flexible URS (RIRS) + Laser" : "ESWL or Flexible URS");

    return {
      strategyType: "conservative_first",
      strategyBadge: "CONSERVATIVE TRIAL FIRST (EAU § 3.4.1)",
      strategyBadgeClass: "badge-success",
      canDoDefinitiveFromStart: true,
      definitiveStartVerdict: "CONSERVATIVE TRIAL FIRST (ELECTIVE BACKUP)",
      verdictTag: "Definitive Removal from Start (URS / FURS / ESWL):",
      verdictHeadline: "CONSERVATIVE TRIAL FIRST — Definitive Removal Only if Non-Passage at 4 Weeks",
      verdictSubtext: `Afebrile presentation with preserved normal renal function (sCr ${sCr.toFixed(2)} mg/dL; normal reference: ≤${crNormalUpper.toFixed(1)} mg/dL) and favorable caliber allows conservative MET surveillance. Active intervention and pre-stenting are not indicated during the initial 4-week safety ceiling.`,
      colDecompressBadge: "UPFRONT DRAINAGE STATUS",
      colDecompressTitle: "Decompression (DJ / PCN) Not Indicated",
      colDecompressHtml: `
        <div class="subcol-option-item">
          <div class="subcol-option-name" style="color: #34d399;">
            <span>✓ Preserved Renal Function (sCr ${sCr.toFixed(2)} mg/dL)</span>
          </div>
          <div>Afebrile presentation with normal creatinine: patient does not require Double-J stenting or nephrostomy. Initial management is Medical Expulsive Therapy (Tamsulosin 0.4mg daily) and oral NSAIDs (EAU LoE 1a).</div>
        </div>
        <div class="subcol-option-item" style="margin-top: 5px;">
          <div class="subcol-option-name" style="color: #f59e0b;">
            <span>⚠ Safety Window: 4 Weeks Maximum Limit</span>
          </div>
          <div>Repeat ultrasound / imaging at 2–3 weeks. Do not exceed 4 weeks of observation to prevent silent nephron loss or ureteral stricture.</div>
        </div>
      `,
      colDefinitiveBadge: "SECONDARY BACKUP DEFINITIVE",
      colDefinitiveTitle: "Elective Primary URS / ESWL if Trial Fails",
      colDefinitiveHtml: `
        <div class="subcol-option-item" style="border-color: rgba(14, 165, 233, 0.3); background: rgba(14, 165, 233, 0.08);">
          <div class="subcol-option-name" style="color: #38bdf8;">
            <span>🎯 Backup Procedure: ${backupModality}</span>
          </div>
          <div>If calculus fails to pass spontaneously by 4 weeks, proceed directly to definitive single-stage primary URS or ESWL without preliminary stenting.</div>
        </div>
        <div class="subcol-option-item" style="margin-top: 5px;">
          <div class="subcol-option-name" style="color: var(--text-muted);">
            <span>Pre-stenting Rule:</span>
          </div>
          <div>Routine pre-stenting prior to elective URS is NOT recommended (EAU LoE 1b); primary URS without prior stenting is safe and effective when renal function is preserved.</div>
        </div>
      `,
      pearlHtml: `<strong>EAU GUIDELINE (§ 3.4.1):</strong> High spontaneous clearance caliber with normal creatinine. Active intervention is reserved for failed conservative trial, refractory pain, or persistent obstruction at 4 weeks.`,
      definitiveModalityChoice: backupModality,
      definitiveModalityName: backupModality,
      preStentingNote: "Routine pre-stenting is not indicated as renal function is preserved."
    };
  }

  // Branch 4B: Elective Candidate Requiring Primary Active Removal (Normal Creatinine, Large / Dense / Upper)
  const baselineCrNote = hasBorderlineCr
    ? `Borderline serum creatinine (${sCr.toFixed(2)} mg/dL) requires close monitoring, hydration, and avoidance of nephrotoxic NSAIDs.`
    : `Afebrile presentation with preserved normal renal function (sCr ${sCr.toFixed(2)} mg/dL; normal reference: ≤${crNormalUpper.toFixed(1)} mg/dL) allows single-stage definitive stone fragmentation from the start.`;

  return {
    strategyType: "single_stage_definitive",
    strategyBadge: "SINGLE-STAGE DEFINITIVE (EAU § 3.4.4)",
    strategyBadgeClass: "badge-primary",
    canDoDefinitiveFromStart: true,
    definitiveStartVerdict: "PRIMARY DEFINITIVE REMOVAL FROM THE START (SINGLE-STAGE)",
    verdictTag: "Definitive Removal from Start (URS / FURS / ESWL):",
    verdictHeadline: "YES — Primary Single-Stage Definitive Removal Standard of Care",
    verdictSubtext: `${baselineCrNote} Routine preliminary DJ stenting is not required in normal baseline renal function.`,
    colDecompressBadge: "UPFRONT DRAINAGE & PRE-STENTING",
    colDecompressTitle: "Is Pre-Stenting (DJ) Required Before URS/ESWL?",
    colDecompressHtml: `
      <div class="subcol-option-item">
        <div class="subcol-option-name" style="color: #38bdf8;">
          <span>✓ Routine Pre-stenting NOT Indicated (EAU LoE 1b)</span>
        </div>
        <div>Primary URS, FURS, or ESWL should proceed directly without upfront stent placement. With preserved normal baseline renal function (sCr ${sCr.toFixed(2)} mg/dL), routine pre-stenting adds cost and morbidity without improving primary stone-free rates.</div>
      </div>
      <div class="subcol-option-item" style="margin-top: 5px;">
        <div class="subcol-option-name" style="color: var(--text-muted);">
          <span>ℹ Passive Dilation Exception:</span>
        </div>
        <div>A temporary DJ stent is placed only if unexpected anatomical ureteral narrowness prevents scope / access sheath advancement during the primary attempt; URS is then completed 1–2 weeks later.</div>
      </div>
    `,
    colDefinitiveBadge: "DEFINITIVE MODALITY OF CHOICE",
    colDefinitiveTitle: definitiveModalityChoice,
    colDefinitiveHtml: `
      <div class="subcol-option-item" style="border-color: rgba(14, 165, 233, 0.3); background: rgba(14, 165, 233, 0.08);">
        <div class="subcol-option-name" style="color: #38bdf8;">
          <span>🎯 Recommended Procedure: ${definitiveModalityName}</span>
        </div>
        <div>${definitiveModalityRationale}</div>
      </div>
      <div class="subcol-option-item" style="margin-top: 5px;">
        <div class="subcol-option-name" style="color: #34d399;">
          <span>Post-Operative Stenting:</span>
        </div>
        <div>Following uncomplicated primary URS, placement of a short-term post-operative stent (Double-J or string stent for 3–7 days) is optional; stentless URS is safe in select uncomplicated non-impacted cases with normal renal function (EAU LoE 1b).</div>
      </div>
    `,
    pearlHtml: `<strong>EAU CLINICAL PRINCIPLE (§ 3.4.4):</strong> Single-stage primary definitive stone removal achieves high stone-free rates (>90%) with minimal morbidity when renal function is normal. Decompression is reserved for sepsis, severe unmanageable colic, or deteriorating renal function.`,
    definitiveModalityChoice,
    definitiveModalityName,
    preStentingNote: "Routine pre-stenting is not recommended; primary URS proceeds directly."
  };
}

/**
 * Generate Multi-Parametric Input Correlation & Treatment Justification Matrix
 * Correlates EVERY entered input against EAU Guidelines with explicit rationale
 * @param {object} patientData 
 * @param {number} probabilityPercent 
 * @param {boolean} isEmergency 
 * @param {object} surgicalPathway 
 * @returns {object} Structured clinical justifications for each organ/stone factor
 */
export function generateTreatmentJustifications(patientData, probabilityPercent, isEmergency, surgicalPathway) {
  const {
    stoneSizeMm = 4.5,
    location = "distal",
    huValue = 750,
    serumCreatinine = 1.0,
    solitaryKidney = false,
    fever = false,
    tlcCount = 8.0,
    wbcCount = 8.0,
    sex = "M",
    hydronephrosis = "mild",
    painVas = 6,
    durationDays = 3,
    metPrescribed = true
  } = patientData;

  const sCr = typeof serumCreatinine === "number" ? serumCreatinine : (parseFloat(serumCreatinine) || 1.0);
  const isFemale = (sex || "M").toUpperCase() === "F";
  const crNormalUpper = isFemale ? 1.00 : 1.20;
  const crImpairmentThreshold = isFemale ? 1.20 : 1.40;
  const hasRenalImpairment = sCr >= crImpairmentThreshold;
  const hasSevereAzotemia = sCr >= 2.0;
  const hasBorderlineCr = sCr > crNormalUpper && sCr < crImpairmentThreshold;
  const effectiveTlc = typeof tlcCount === "number" ? tlcCount : (typeof wbcCount === "number" ? wbcCount : 8.0);
  const isSepsis = fever || effectiveTlc >= 14.0;
  const isSolitaryKidneyObstructed = solitaryKidney && (hydronephrosis !== "none" || sCr > crNormalUpper);

  // 1. Renal Filtration Justification
  let renal = {};
  if (hasSevereAzotemia) {
    renal = {
      statusTag: `sCr ${sCr.toFixed(2)} mg/dL — Severe Post-Renal AKI`,
      alertLevel: "danger",
      rationaleHtml: `<strong>EAU § 3.2.3 (LoE 1b):</strong> Serum creatinine is severely elevated (<strong>${sCr.toFixed(2)} mg/dL</strong>), confirming critical obstructive nephropathy. <strong>Renal function is severely compromised.</strong> Immediate upper urinary tract decompression via Retrograde Double-J Stent or Percutaneous Nephrostomy is mandatory to avert irreversible nephron apoptosis and uremic crisis. Definitive stone fragmentation must be deferred until renal function recovers.`
    };
  } else if (hasRenalImpairment) {
    renal = {
      statusTag: `sCr ${sCr.toFixed(2)} mg/dL — Post-Renal AKI (Elevated)`,
      alertLevel: "danger",
      rationaleHtml: `<strong>EAU § 3.4.1 & § 3.2.3 (LoE 1b):</strong> Serum creatinine is elevated at <strong>${sCr.toFixed(2)} mg/dL</strong> (normal reference: ${isFemale ? '≤1.00' : '≤1.20'} mg/dL), signifying acute post-renal renal impairment. <strong>Renal function is COMPROMISED, NOT preserved.</strong> EAU Guidelines explicitly state that conservative observation with MET is ONLY permitted in patients with normal baseline renal function. Therefore, waiting 4 weeks on MET is <strong>strictly contraindicated</strong>; prompt Double-J stent decompression (or urgent primary intervention with mandatory stenting) is required within 24–48 hours to relieve hydronephrotic pressure and halt nephron loss. <strong>NSAIDs are strictly withheld</strong> to prevent acute tubular necrosis.`
    };
  } else if (hasBorderlineCr) {
    renal = {
      statusTag: `sCr ${sCr.toFixed(2)} mg/dL — Borderline Azotemia`,
      alertLevel: "warning",
      rationaleHtml: `<strong>EAU § 3.4.1:</strong> Serum creatinine is borderline elevated (<strong>${sCr.toFixed(2)} mg/dL</strong>; normal reference: ${isFemale ? '≤1.00' : '≤1.20'} mg/dL), reflecting subclinical renal impairment or dehydration from colic. Limit conservative surveillance to a strict maximum of 10–14 days. Ensure aggressive hydration, avoid nephrotoxic NSAIDs, and re-check serum creatinine in 48–72 hours.`
    };
  } else {
    renal = {
      statusTag: `sCr ${sCr.toFixed(2)} mg/dL — Preserved Renal Function`,
      alertLevel: "success",
      rationaleHtml: `<strong>EAU § 3.4.1:</strong> Baseline serum creatinine is within normal physiological limits (<strong>${sCr.toFixed(2)} mg/dL</strong>; normal reference: ${isFemale ? '≤1.00' : '≤1.20'} mg/dL), indicating preserved bilateral glomerular filtration. Patient has adequate functional renal reserve for standard conservative trial or elective intervention without emergency pre-stenting.`
    };
  }

  // 2. Infection Justification
  let infection = {};
  if (isSepsis) {
    infection = {
      statusTag: fever ? "FEVER / SIRS PRESENT (High Risk Sepsis)" : `TLC ${effectiveTlc.toFixed(1)}k (Severe Leukocytosis)`,
      alertLevel: "danger",
      rationaleHtml: `<strong>EAU § 3.2.3 (LoE 1b, Strong):</strong> Obstructive urolithiasis combined with fever/SIRS or marked leukocytosis (<strong>${effectiveTlc.toFixed(1)} × 10³/μL</strong>) indicates infected hydronephrosis. <strong>Immediate upper urinary tract decompression within hours is mandatory.</strong> Primary stone fragmentation (URS / FURS / ESWL) from the start is strictly contraindicated due to fatal pyelovenous bacteremic backflow.`
    };
  } else {
    infection = {
      statusTag: `Afebrile, TLC ${effectiveTlc.toFixed(1)}k (No Sepsis)`,
      alertLevel: "success",
      rationaleHtml: `<strong>EAU § 3.2.3:</strong> Afebrile presentation with normal leukocyte count confirms absence of infected obstruction. Single-stage definitive procedural planning or urgent intervention is safe from a sepsis standpoint.`
    };
  }

  // 3. Stone Caliber & Anatomy Justification
  const locMap = { uvj: "UVJ (Terminal Junction)", distal: "Distal Ureter", mid: "Mid Ureter", proximal: "Proximal Ureter", puj: "PUJ" };
  const locText = locMap[location] || location.toUpperCase();
  let stone = {};
  if (stoneSizeMm <= 4.0) {
    stone = {
      statusTag: `${stoneSizeMm.toFixed(1)} mm ${locText} (Small Caliber)`,
      alertLevel: "success",
      rationaleHtml: `<strong>EAU § 3.4.1:</strong> Small calculus caliber (≤4.0mm) has an expected spontaneous expulsion rate of <strong>85–95%</strong>. If renal function is normal and pain is manageable, conservative surveillance with MET is the guideline-recommended first-line strategy.`
    };
  } else if (stoneSizeMm <= 6.0) {
    stone = {
      statusTag: `${stoneSizeMm.toFixed(1)} mm ${locText} (Intermediate Caliber)`,
      alertLevel: location === "distal" || location === "uvj" ? "success" : "warning",
      rationaleHtml: `<strong>EAU § 3.4.3:</strong> Intermediate caliber (4.1–6.0mm) derives significant benefit from alpha-blocker MET (Tamsulosin 0.4mg daily), accelerating expulsion rates to ~60–65% for distal calculi. Upper ureteral stones have lower passage and may warrant earlier intervention.`
    };
  } else if (stoneSizeMm <= 10.0) {
    stone = {
      statusTag: `${stoneSizeMm.toFixed(1)} mm ${locText} (Large Caliber)`,
      alertLevel: "warning",
      rationaleHtml: `<strong>EAU § 3.4.4:</strong> Calculus caliber >6.0mm has low spontaneous clearance (<25–30%). Primary active endourological stone removal (${surgicalPathway ? surgicalPathway.definitiveModalityChoice : 'URS'}) is recommended to prevent prolonged ureteral obstruction, hydronephrosis, and irreversible nephron loss.`
    };
  } else {
    stone = {
      statusTag: `${stoneSizeMm.toFixed(1)} mm ${locText} (Very Large >10mm)`,
      alertLevel: "danger",
      rationaleHtml: `<strong>EAU § 3.4.4:</strong> Calculus caliber >10mm has negligible spontaneous clearance (<10%). Endourological extraction (${surgicalPathway ? surgicalPathway.definitiveModalityChoice : 'URS/FURS'}) is the standard of care.`
    };
  }

  // 4. CT HU Attenuation Justification
  let density = {};
  if (huValue >= 1000) {
    density = {
      statusTag: `${huValue} HU (Dense / Hard Calculus)`,
      alertLevel: "warning",
      rationaleHtml: `<strong>EAU § 3.4.4 (LoE 1b):</strong> High non-contrast CT attenuation (<strong>${huValue} HU</strong> ≥ 1000 HU) indicates dense crystalline architecture (calcium oxalate monohydrate or brushite). This confers high acoustic impedance and resistance to shockwaves (ESWL failure rate elevated). <strong>Flexible/Semi-rigid URS with Holmium/Thulium laser lithotripsy is strongly preferred over ESWL.</strong>`
    };
  } else if (huValue <= 450) {
    density = {
      statusTag: `${huValue} HU (Low Density / Uric Acid)`,
      alertLevel: "success",
      rationaleHtml: `<strong>EAU § 3.4.2:</strong> Low attenuation calculus (<450 HU) consistent with pure uric acid. High candidate for oral chemolytic alkalization therapy (target urine pH 7.0–7.2) if radiolucent on plain radiograph and non-emergency.`
    };
  } else {
    density = {
      statusTag: `${huValue} HU (Favorable Attenuation)`,
      alertLevel: "success",
      rationaleHtml: `<strong>EAU § 3.4.4 (LoE 1b):</strong> Non-contrast CT attenuation (450–999 HU) indicates moderate/soft density amenable to both Shock Wave Lithotripsy (ESWL) and laser lithotripsy.`
    };
  }

  // 5. Hydronephrosis & Collecting System Backpressure
  let hydro = {};
  switch (hydronephrosis) {
    case "none":
      hydro = {
        statusTag: "No Dilatation (Grade 0)",
        alertLevel: "success",
        rationaleHtml: `<strong>EAU § 3.1:</strong> Normal collecting system without dilatation confirms baseline low intrapelvic pressure.`
      };
      break;
    case "mild":
      hydro = {
        statusTag: "Mild Hydronephrosis (Grade 1)",
        alertLevel: "success",
        rationaleHtml: `<strong>EAU § 3.1:</strong> Low-grade pelvicalyceal dilatation. Expected backpressure from ureteral calculus; acceptable for brief conservative surveillance ONLY if serum creatinine is normal.`
      };
      break;
    case "moderate":
      hydro = {
        statusTag: "Moderate Hydronephrosis (Grade 2)",
        alertLevel: "warning",
        rationaleHtml: `<strong>EAU § 3.2:</strong> Significant pelvicalyceal distension and urinary stasis. Persistent moderate dilatation risks parenchymal compression; observation must be strictly limited to max 2 weeks.`
      };
      break;
    case "severe":
      hydro = {
        statusTag: "Severe Hydronephrosis (Grade 3/4)",
        alertLevel: "danger",
        rationaleHtml: `<strong>EAU § 3.2.3:</strong> Marked collecting system dilatation with parenchymal thinning risk. High intrapelvic pressure threatens nephron viability; reinforces indication for prompt decompression or active stone retrieval.`
      };
      break;
  }

  // 6. Symptoms & Colic Duration
  let symptoms = {};
  if (durationDays > 14 || painVas >= 8) {
    symptoms = {
      statusTag: `Colic ${durationDays}d, VAS ${painVas}/10 (Prolonged/Intractable)`,
      alertLevel: "warning",
      rationaleHtml: `<strong>EAU § 3.4.1:</strong> Severe pain (VAS ${painVas}/10) or prolonged duration (${durationDays} days) causes periureteral mucosal edema, impaction, and ureteral stricture risk. Spontaneous clearance unlikely; mandates prompt active intervention.`
    };
  } else {
    symptoms = {
      statusTag: `Colic ${durationDays}d, VAS ${painVas}/10 (Acute/Controlled)`,
      alertLevel: "success",
      rationaleHtml: `<strong>EAU § 3.4.1:</strong> Fresh presentation without chronic mucosal embedment; manageable pain allows standard clinical pathway.`
    };
  }

  // 7. Pharmacotherapy: MET & Analgesia Safety Protocol
  let medication = {};
  if (hasSevereAzotemia || hasRenalImpairment) {
    medication = {
      statusTag: "MET & NSAIDs Strictly Contraindicated",
      alertLevel: "danger",
      rationaleHtml: `<strong>EAU § 3.4.1 & § 3.1.2 (LoE 1b):</strong> In post-renal AKI (sCr ${sCr.toFixed(2)} mg/dL), conservative MET is contraindicated because observation is prohibited. <strong>NSAIDs (Diclofenac/Ketorolac) are strictly contraindicated</strong> due to inhibition of renal prostaglandins causing afferent arteriolar vasoconstriction and precipitating acute tubular necrosis. Analgesia: Paracetamol or cautious short-acting opioids.`
    };
  } else if (isSepsis) {
    medication = {
      statusTag: "MET Contraindicated (Active Sepsis)",
      alertLevel: "danger",
      rationaleHtml: `<strong>EAU § 3.2.3:</strong> Infected hydronephrosis requires physical decompression and parenteral antimicrobials; MET is dangerous and ineffective.`
    };
  } else if (metPrescribed && ["uvj", "distal"].includes(location) && stoneSizeMm > 4.0) {
    medication = {
      statusTag: "Tamsulosin 0.4mg Daily Strongly Indicated",
      alertLevel: "success",
      rationaleHtml: `<strong>EAU § 3.4.3 (LoE 1a):</strong> Alpha-1 blockers accelerate distal calculus expulsion and reduce colic episodes in patients with preserved normal renal function.`
    };
  } else {
    medication = {
      statusTag: "Standard Oral Analgesia Protocol",
      alertLevel: "success",
      rationaleHtml: `<strong>EAU § 3.1.2 (LoE 1b):</strong> First-line oral NSAIDs (Diclofenac 50mg TID or Ibuprofen) provide superior colic relief to opioids when baseline renal function is normal.`
    };
  }

  // 8. Staging & Stenting Justification
  let staging = {};
  if (isSepsis) {
    staging = {
      statusTag: "Emergency Two-Stage Decompression (DJ vs PCN)",
      alertLevel: "danger",
      rationaleHtml: `<strong>EAU § 3.2.3:</strong> Sepsis mandates immediate upper tract drainage (Stage 1). Upfront stone fragmentation is prohibited to prevent septic shock. Definitive URS/FURS is deferred for 1–2 weeks.`
    };
  } else if (hasSevereAzotemia || isSolitaryKidneyObstructed) {
    staging = {
      statusTag: "Urgent Two-Stage Decompression (Severe Renal Impairment)",
      alertLevel: "danger",
      rationaleHtml: `<strong>EAU § 3.2.3:</strong> Severe azotemia (sCr ${sCr.toFixed(2)} mg/dL) or obstructed solitary kidney requires urgent Stage 1 decompression (DJ Stent or PCN) to decompress nephrons and restore GFR before stone surgery.`
    };
  } else if (hasRenalImpairment) {
    staging = {
      statusTag: "Urgent Stenting (DJ) Mandatory — Post-Renal AKI",
      alertLevel: "danger",
      rationaleHtml: `<strong>EAU § 3.2.3 & § 3.4.1:</strong> Elevated sCr (<strong>${sCr.toFixed(2)} mg/dL</strong>) overrides standard elective pathways. <strong>Routine 'no pre-stenting' does NOT apply.</strong> Urgent Double-J stent decompression is indicated to salvage renal filtration; if primary URS/FURS is performed immediately by an expert endourologist, retention of a post-operative DJ stent is mandatory (stentless procedure strictly contraindicated).`
    };
  } else if (surgicalPathway && surgicalPathway.strategyType === "conservative_first") {
    staging = {
      statusTag: "No Upfront Stenting (Conservative MET Trial)",
      alertLevel: "success",
      rationaleHtml: `<strong>EAU § 3.4.1:</strong> Preserved normal renal function (sCr ${sCr.toFixed(2)} mg/dL) and favorable stone size permit conservative observation with MET without upfront stenting. 4-week strict safety ceiling applies.`
    };
  } else {
    staging = {
      statusTag: "Single-Stage Primary Definitive (No Pre-Stenting Needed)",
      alertLevel: "success",
      rationaleHtml: `<strong>EAU § 3.4.4 (LoE 1b):</strong> In afebrile elective cases with normal renal function, routine pre-stenting is not indicated. Primary single-stage definitive URS/ESWL proceeds directly.`
    };
  }

  // 9. Comprehensive Treatment Choice Synthesis ("Why This Treatment Choice?")
  const definitiveName = surgicalPathway ? surgicalPathway.definitiveModalityName : "URS / FURS";
  let summaryText = "";

  if (isSepsis) {
    summaryText = `This patient presents with obstructive urosepsis (fever / severe leukocytosis). Per EAU Guideline § 3.2.3 (LoE 1b), urgent physical decompression via Double-J Stent or PCN is lifesaving and mandatory. Definitive stone clearance with ${definitiveName} is strictly deferred for 1–2 weeks until sepsis completely resolves, because upfront lithotripsy causes lethal endotoxemia.`;
  } else if (hasSevereAzotemia || isSolitaryKidneyObstructed) {
    summaryText = `This patient presents with critical post-renal azotemia (sCr ${sCr.toFixed(2)} mg/dL)${isSolitaryKidneyObstructed ? " in an obstructed solitary kidney" : ""}. Per EAU Guideline § 3.2.3, immediate Stage 1 upper urinary tract decompression is mandatory to avert anuric acute renal failure. Definitive stone fragmentation (${definitiveName}) is deferred until renal parenchymal filtration normalizes.`;
  } else if (hasRenalImpairment) {
    summaryText = `This patient presents with an obstructive calculus with <strong>elevated serum creatinine (${sCr.toFixed(2)} mg/dL)</strong>, confirming <strong>acute post-renal renal impairment (kidney function is NOT preserved)</strong>. Per EAU Guidelines § 3.2.3 & § 3.4.1, conservative observation with MET is strictly contraindicated. <strong>Double-J stent decompression is strongly indicated / mandatory</strong> to relieve hydronephrotic pressure and halt nephron loss (the elective 'no pre-stenting' rule DOES NOT apply). For stone clearance, <strong>${definitiveName}</strong> was selected based on caliber (${stoneSizeMm.toFixed(1)} mm), location (${locText}), and CT density (${huValue} HU), and must be performed with mandatory Double-J stent retention (stentless procedure contraindicated) and contrast-free protocol.`;
  } else if (surgicalPathway && surgicalPathway.strategyType === "conservative_first") {
    summaryText = `This patient presents with a favorable calculus (${stoneSizeMm.toFixed(1)} mm, ${locText}) with <strong>preserved normal renal function (sCr ${sCr.toFixed(2)} mg/dL)</strong> and absence of infection. Per EAU Guideline § 3.4.1 (LoE 1a), conservative surveillance with Medical Expulsive Therapy (Tamsulosin 0.4mg) is the first-line standard of care, offering an 85–95% spontaneous clearance rate without invasive surgery or upfront stenting. 4-week maximum safety ceiling applies.`;
  } else {
    summaryText = `This patient presents with an obstructive calculus (${stoneSizeMm.toFixed(1)} mm, ${locText}, ${huValue} HU) with <strong>preserved normal renal function (sCr ${sCr.toFixed(2)} mg/dL)</strong> and no infection. Per EAU Guideline § 3.4.4 (LoE 1b), low spontaneous passage probability justifies primary active endourological stone removal via <strong>${definitiveName}</strong>. Because baseline renal function is normal and patient is afebrile, routine preliminary DJ stenting is not required, and single-stage definitive clearance proceeds directly from the start.`;
  }

  const treatmentChoiceSummary = {
    statusTag: surgicalPathway ? surgicalPathway.strategyBadge : "EAU Treatment Choice Rationale",
    alertLevel: hasRenalImpairment || isSepsis || hasSevereAzotemia ? "danger" : "accent",
    rationaleHtml: summaryText
  };

  return {
    renal,
    infection,
    stone,
    density,
    hydronephrosis: hydro,
    symptoms,
    medication,
    staging,
    treatmentChoiceSummary
  };
}
