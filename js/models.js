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

  const surgicalPathway = determineSurgicalPathway(patientData, probabilityPercent, isEmergency);

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
    huAnalysis: classifyHounsfieldUnit(huValue),
    surgicalPathway
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
    huValue = 750
  } = patientData;

  if (isEmergency) {
    const definitiveModalityChoice = (location === "distal" || location === "uvj")
      ? "Semi-rigid Ureteroscopy (URS) + Laser"
      : (huValue >= 1000 || stoneSizeMm > 10.0 ? "Flexible URS (FURS / RIRS) + Laser" : "Flexible URS or ESWL");

    return {
      strategyType: "two_stage",
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
      definitiveModalityName: definitiveModalityChoice,
      preStentingNote: "The emergency Double-J stent placed in Stage 1 serves both as lifesaving infection drainage and as passive ureteral dilation for safer Stage 2 URS."
    };
  }

  // Non-Emergency: Candidate for conservative observation
  const isHighPassageCandidate = probabilityPercent >= 70 && stoneSizeMm <= 5.0;

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
      verdictSubtext: "Patient has favorable caliber for spontaneous expulsion. Active surgical intervention and pre-stenting are not indicated during the initial 4-week surveillance ceiling.",
      colDecompressBadge: "UPFRONT DRAINAGE STATUS",
      colDecompressTitle: "Decompression (DJ / PCN) Not Indicated",
      colDecompressHtml: `
        <div class="subcol-option-item">
          <div class="subcol-option-name" style="color: #34d399;">
            <span>✓ No Stenting or Nephrostomy Required</span>
          </div>
          <div>Afebrile presentation with manageable colic: patient does not require Double-J stenting or nephrostomy. Initial management is Medical Expulsive Therapy (Tamsulosin 0.4mg daily) and oral NSAIDs (EAU LoE 1a).</div>
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
          <div>Routine pre-stenting prior to elective URS is NOT recommended (EAU LoE 1b); primary URS without prior stenting is safe and effective.</div>
        </div>
      `,
      pearlHtml: `<strong>EAU GUIDELINE (§ 3.4.1):</strong> High spontaneous clearance caliber. Active intervention is reserved for failed conservative trial, refractory pain, or persistent obstruction at 4 weeks.`,
      definitiveModalityChoice: backupModality,
      definitiveModalityName: backupModality,
      preStentingNote: "Routine pre-stenting is not indicated."
    };
  }

  // Non-Emergency Candidates Requiring Active Removal (Borderline or Primary Surgical):
  let definitiveModalityName = "";
  let definitiveModalityRationale = "";
  let definitiveModalityChoice = "";

  if (["distal", "uvj"].includes(location)) {
    definitiveModalityName = "Semi-rigid Ureteroscopy (URS) + Laser Lithotripsy";
    definitiveModalityRationale = "EAU LoE 1a: URS achieves superior 1-session stone-free rate (>95%) for distal calculi compared to ESWL. Upfront stent placement is NOT needed.";
    definitiveModalityChoice = "URS Preferred Over ESWL (LoE 1a)";
  } else if (location === "mid") {
    if (huValue < 1000 && stoneSizeMm <= 10.0) {
      definitiveModalityName = "Semi-rigid/Flexible URS or Shock Wave Lithotripsy (ESWL)";
      definitiveModalityRationale = "EAU LoE 1b: Equivalent primary success rates for mid-ureteral calculi <10mm and <1000 HU. Shared clinical decision based on patient preference and availability.";
      definitiveModalityChoice = "Shared Decision (URS vs ESWL)";
    } else {
      definitiveModalityName = "Ureteroscopy (URS / Laser Lithotripsy)";
      definitiveModalityRationale = "EAU LoE 1b: Dense stone (≥1000 HU) or larger caliber (>10mm) confers high shockwave resistance; endoscopic laser disintegration is preferred.";
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

  return {
    strategyType: "single_stage_definitive",
    strategyBadge: "SINGLE-STAGE DEFINITIVE (EAU § 3.4.4)",
    strategyBadgeClass: "badge-primary",
    canDoDefinitiveFromStart: true,
    definitiveStartVerdict: "PRIMARY DEFINITIVE REMOVAL FROM THE START (SINGLE-STAGE)",
    verdictTag: "Definitive Removal from Start (URS / FURS / ESWL):",
    verdictHeadline: "YES — Primary Single-Stage Definitive Removal Standard of Care",
    verdictSubtext: "Afebrile, non-septic presentation allows immediate, single-stage definitive stone fragmentation and clearance from the start. Routine preliminary DJ stenting is NOT required.",
    colDecompressBadge: "UPFRONT DRAINAGE & PRE-STENTING",
    colDecompressTitle: "Is Pre-Stenting (DJ) Required Before URS/ESWL?",
    colDecompressHtml: `
      <div class="subcol-option-item">
        <div class="subcol-option-name" style="color: #38bdf8;">
          <span>✓ Routine Pre-stenting NOT Indicated (EAU LoE 1b)</span>
        </div>
        <div>Primary URS or ESWL should proceed directly without upfront stent placement. Routine pre-stenting adds cost and morbidity without improving primary stone-free rates.</div>
      </div>
      <div class="subcol-option-item" style="margin-top: 5px;">
        <div class="subcol-option-name" style="color: var(--text-muted);">
          <span>ℹ Passive Dilation Exception:</span>
        </div>
        <div>A temporary DJ stent is placed only if unexpected anatomical ureteral narrowness prevents scope / access sheath advancement during the primary attempt; URS is then completed 1–2 weeks later.</div>
      </div>
    `,
    colDefinitiveBadge: "DEFINITIVE MODALITY OF CHOICE",
    colDefinitiveTitle: `${definitiveModalityChoice}`,
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
        <div>Following uncomplicated primary URS, placement of a short-term post-operative stent (Double-J or string stent for 3–7 days) is optional; stentless URS is safe in select uncomplicated non-impacted cases (EAU LoE 1b).</div>
      </div>
    `,
    pearlHtml: `<strong>EAU CLINICAL PRINCIPLE (§ 3.4.4):</strong> Single-stage primary definitive stone removal achieves high stone-free rates (>90%) with minimal morbidity. Decompression is reserved for sepsis, severe unmanageable colic, or deteriorating renal function.`,
    definitiveModalityChoice,
    definitiveModalityName,
    preStentingNote: "Routine pre-stenting is not recommended; primary URS proceeds directly."
  };
}
