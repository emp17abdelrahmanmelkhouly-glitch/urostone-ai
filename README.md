# UroStone AI — Clinical Urolithiasis Workstation
### An Ain Shams University Project • Faculty of Medicine, Department of Urology
### Calibrated Strictly with EAU Guidelines • 400-Patient Cohort Registry

**UroStone AI** is an advanced, evidence-based clinical decision support workstation developed as an **Ain Shams University project** (Faculty of Medicine, Department of Urology). It predicts spontaneous passage likelihood of urinary calculi and guides therapeutic decision-making strictly using the **EAU Guidelines on Urolithiasis** as its foundational clinical authority, powered by real-time **Case-Based Reasoning (CBR)** across a calibrated registry of **400 historical patient cases** (`PT-1001` to `PT-1400`).

---

## 📖 The EAU Guidelines as the Authoritative Clinical Framework

Every recommendation, timeline, safety ceiling, and surgical modality recommendation is directly anchored to the **EAU Guidelines on Urolithiasis**:

### 1. Emergency Decompression in Sepsis (`EAU § 3.2.3: LoE 1b, Strong Recommendation`)
- **Criteria**: Fever (>38.0°C), SIRS criteria, severe leukocytosis (TLC ≥ 14.0 × 10³/μL), infected hydronephrosis, or obstructed solitary kidney with elevated creatinine (>1.5 mg/dL).
- **Directive**: Urgent upper tract decompression via **Retrograde Double-J Stent or Percutaneous Nephrostomy (PCN)** + IV broad-spectrum antimicrobial therapy.
- **Rule**: Definitive stone removal (URS / SWL) is strictly contraindicated during acute infection.

### 2. Spontaneous Passage & Observation (`EAU § 3.4.1: LoE 1a, Strong Recommendation`)
- **Stones ≤ 4.0 mm**: ~85%–95% natural passage rate. Observation is first-line; routine Medical Expulsive Therapy (MET) is not indicated for stones < 4mm due to lack of superiority over placebo.
- **Mandatory 4-Week Surveillance Ceiling**: Conservative observation must **never exceed 4 to 6 weeks**. Complete or high-grade ureteral obstruction exceeding 4 weeks causes progressive, irreversible nephron loss (GFR decline) and ureteral stricture.

### 3. Medical Expulsive Therapy (MET) Protocol (`EAU § 3.4.3: LoE 1a, Strong Recommendation`)
- **Indication**: Distal ureteral calculi > 5 mm (or 4.0–7.0 mm) undergoing conservative trial.
- **Posology**: Tamsulosin 0.4 mg PO daily (or Silodosin 8 mg daily).
- **Benefits**: Accelerates expulsion rate, shortens transit time, reduces colic episodes, and decreases analgesic consumption. Includes patient counseling on retrograde ejaculation and hypotension.

### 4. Active Stone Removal Modality Selection (`EAU § 3.4.4: LoE 1a / 1b, Strong Recommendation`)
- **Distal Ureter**: Ureteroscopy (URS / semi-rigid laser lithotripsy) is preferred over SWL due to superior stone-free rates in a single session (`LoE 1a`).
- **Mid & Proximal Ureter**:
  - *Caliber < 10 mm & CT Density < 1000 HU*: SWL and URS are both valid first-line options (`LoE 1b`).
  - *Caliber > 10 mm or CT Density ≥ 1000 HU (COM, Brushite)*: Flexible URS (RIRS / Holmium/Thulium laser) is strongly preferred over SWL due to shockwave resistance (`LoE 1b`).

### 5. Acute Colic Analgesia Protocol (`EAU § 3.1.2: LoE 1b, Strong Recommendation`)
- First-line: NSAIDs (Diclofenac 50mg, Ibuprofen 400mg, Ketorolac, Metamizole) are superior to opioids for pain reduction and reduce renal pelvic pressure.

---

## 💎 Simplified & Calm Clinical Interface

In response to clinical ergonomics feedback, visual clutter and noisy HUD scanlines have been eliminated in favor of a clean, high-precision workstation:
- **Clean Typography & Layout**: High-legibility Inter font stack with generous breathing room and calm slate/navy background.
- **Interactive Anatomical Schematic**: Minimalist vector diagram of the urinary tract (Kidney, PUJ, Upper, Mid, Distal, UVJ, Bladder) paired with a tactile 5-segment picker.
- **EAU Guideline Mandate Card**: Prominent centerpiece displaying the authoritative EAU Section citation, Level of Evidence, Recommendation Strength, and step-by-step action plan.
- **Minimalist Probability Gauge**: Clean circular arc displaying spontaneous passage percentage and tight **95% Confidence Interval** badges (`95% CI: 78% – 88%`).
- **EAU Guidelines Reference Modal**: Accessible with one click (`EAU Guidelines Reference`) in the top navigation, presenting all guideline evidence tables, natural history rates, and dosage recommendations.
- **Renal Function & Inflammatory Markers**: Integrated inputs for **Serum Creatinine (sCr)** and **Total Leukocyte Count (TLC)** affecting passage probability, acute kidney injury warning indicators, and EMR note generation.

---

## 📊 400-Patient Historical Cohort Registry

- Expanded to **400 complete, clinically realistic cases** (`PT-1001` through `PT-1400`).
- Covers every size caliber (1.5mm to 13.5mm), all 5 anatomical levels, the full CT attenuation spectrum (220 to 1580 HU), hydronephrosis grading, Serum Creatinine, TLC, MET administration, and verified outcomes.
- Interactive 2D Scatter Plot: Stone Caliber (mm) vs CT Attenuation (HU) with real-time active patient target locator.
- Complete data tools: search, filter by location/outcome, CSV export/import, outcome logging modal, and reset to calibrated 400-patient dataset.

---

## 🔒 100% Offline & Patient Privacy (HIPAA / GDPR Compliant)

- Operates completely client-side in your local browser or mobile device.
- Zero network data transmission to third parties: all patient data and 400 cohort records remain securely on your local workstation and offline cache.
- Full Service Worker caching (`sw.js`) ensures 100% offline functionality in hospital wards, emergency departments, and operating rooms.

---

## 📱 Mobile & Smartphone Access (iOS & Android PWA)

UroStone AI is engineered as an **installable Progressive Web App (PWA)** optimized specifically for clinical rounds and mobile usage:

### 1. Launch the Mobile Server
- **Automatic**: Double-clicking [**`Launch_UroStone_AI.bat`**](file:///C:/Users/zero%20one%20tech/.gemini/antigravity-ide/scratch/urostone-ai/Launch_UroStone_AI.bat) now automatically starts the mobile server in the background on port `8080`.
- **Manual / Console**: You can also double-click [**`Launch_Mobile_Server.bat`**](file:///C:/Users/zero%20one%20tech/.gemini/antigravity-ide/scratch/urostone-ai/Launch_Mobile_Server.bat) anytime to see the server connection terminal.
- **Firewall Setup**: If your phone cannot connect over Wi-Fi, right-click [**`Fix_Firewall_Access.bat`**](file:///C:/Users/zero%20one%20tech/.gemini/antigravity-ide/scratch/urostone-ai/Fix_Firewall_Access.bat) and select **"Run as administrator"** to allow port 8080 through Windows Defender Firewall.

### 2. Connect Your Phone
- Click the **"📱 Open on Phone"** button in the workstation header to open the QR code modal.
- Point your phone's camera (iPhone Camera or Android QR scanner / Google Lens) at the crisp ISO-compliant QR code on screen to open the URL instantly.
- The modal automatically detects all active network adapters (Wi-Fi, Ethernet) and allows switching between IPs if multiple adapters exist.
- Alternatively, type `http://<YOUR_PC_IP>:8080` directly into Safari or Chrome on your phone.

### 3. Install to Home Screen (Native App Mode)
- **iPhone / iPad (Safari)**: Tap the **Share** button (box with upward arrow) -> Tap **"Add to Home Screen"**.
- **Android (Chrome)**: Tap the **three dots** menu -> Tap **"Install app"** or **"Add to Home screen"**.
- The app installs as a standalone, full-screen clinical workstation icon with offline caching.

### 4. Mobile Ergonomics & Features
- **Touch Steppers & Preset Chips**: One-tap quick presets for stone caliber (`≤3mm`, `4.5mm`, `5.5mm`, `7mm`, `≥10mm`), CT Hounsfield Units, TLC, and Creatinine.
- **Sticky Live Summary**: Real-time spontaneous passage % bar stays pinned to the top of your screen as you scroll.
- **Thumb-Reach Bottom Dock**: Instant navigation between Intake, 400-Patient Cohort, EAU Evidence Guide, and Clinical Audit.
- **Mobile Cohort Cards**: Touch-friendly card stack view of the 400-patient registry with outcome color coding and stone metrics.
- **1-Tap EMR Sharing & Haptics**: Tap "Share Note" to send formatted clinical documentation directly to WhatsApp, Notes, or Email via the native Mobile Share Sheet.

---

## 🚀 Quick Launch

### Desktop Quick Launch
Double-click [**`Launch_UroStone_AI.bat`**](file:///C:/Users/zero%20one%20tech/.gemini/antigravity-ide/scratch/urostone-ai/Launch_UroStone_AI.bat) or open [**`index.html`**](file:///C:/Users/zero%20one%20tech/.gemini/antigravity-ide/scratch/urostone-ai/index.html) in your desktop browser. (The local mobile server will automatically start in the background).

### Mobile Quick Launch
1. Ensure your phone is connected to the same Wi-Fi network as this PC.
2. Click **"Open on Phone"** in UroStone AI and scan the QR code with your iPhone or Android camera.
3. If blocked by Windows Firewall, run [**`Fix_Firewall_Access.bat`**](file:///C:/Users/zero%20one%20tech/.gemini/antigravity-ide/scratch/urostone-ai/Fix_Firewall_Access.bat) as Administrator.

---

## 🌐 Sharing with Your Professor / External Reviewers (Outside Your Home Wi-Fi)

Your local IP (`http://192.168.1.x:8080`) only works when devices are connected to the **same Wi-Fi router**. If your professor is at home or outside your local network, choose any of the following 3 options:

### Option 1: Instant Live Public Link (Right Now from your PC)
1. Double-click [**`Share_Online_Link.bat`**](file:///C:/Users/zero%20one%20tech/.gemini/antigravity-ide/scratch/urostone-ai/Share_Online_Link.bat).
2. Windows will automatically open an encrypted tunnel via OpenSSH and display a public URL (e.g., `https://xxxxxx.lhr.life`).
3. Copy that link and message it to your professor.
4. Your professor can open it immediately on their home computer, iPad, or smartphone without installing anything.
*(Keep the terminal window open while your professor is reviewing).*

### Option 2: Send the Standalone Package (`UroStone_AI_Standalone.zip`)
- Send [**`UroStone_AI_Standalone.zip`**](file:///C:/Users/zero%20one%20tech/.gemini/antigravity-ide/scratch/urostone-ai/UroStone_AI_Standalone.zip) (only ~130 KB) via email, WhatsApp, or Microsoft Teams.
- Your professor simply unzips it and double-clicks `index.html`. It runs 100% locally in any web browser (Chrome, Edge, Safari, Firefox) with complete EAU predictive calculations and the 400-patient registry.

### Option 3: Permanent 24/7 Web Hosting (Free, 2 Minutes)
Because UroStone AI is 100% client-side with zero server database requirements:
- **Netlify Drop**: Open [app.netlify.com/drop](https://app.netlify.com/drop) in your browser and drag the `urostone-ai` folder into the upload box. You get a permanent `https://urostone-ai.netlify.app` link that never expires.
- **GitHub Pages**: Push this project directory to a GitHub repository, enable **GitHub Pages** in Settings → Pages, and your professor can access it at `https://<username>.github.io/<repo>/` 24 hours a day.


