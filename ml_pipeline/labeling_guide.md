# Annotation Guidelines & Labeling Protocol for Crowdsourced Coastal Hazards

This document defines the formal ground-truth annotation protocol used for training and evaluating the credibility-aware triage model for the **OceanSaksham** platform.

---

## 1. Scope and Class Definitions

Each submitted report is independently annotated into one of three mutually exclusive classes:

| Class | Definition | Operational Criteria |
| :--- | :--- | :--- |
| **`VERIFIED` (Positive Ground Truth)** | Genuine, actionable coastal hazard requiring authority attention. | Corroborated by independent reports or marine physics (wave/wind sensors), valid spatial coordinates matching physical coastline, consistent visual evidence, and authentic temporal stamp. |
| **`REJECTED` (Negative / Noise / False Alarm)** | Inaccurate, fabricated, spam, or duplicate report with no hazard. | Clear discrepancy between reported location and physical coastline (>15km inland), blatant EXIF manipulation, contradiction with calm ocean sensor data, recycled spam images, or promotional/unrelated text. |
| **`UNCERTAIN` (Ambiguous / Incomplete)** | Inconclusive report lacking sufficient telemetry to confirm or deny. | Single uncorroborated report, moderate GPS drift, missing photo, brief generic description during borderline weather conditions. |

---

## 2. Realistic Edge Cases & Pitfall Mitigation

To prevent circular synthetic data generation:
1. **Honest report with poor GPS**: A citizen on a choppy boat or dense mangrove forest submitting an authentic storm surge with $\pm 180\text{ m}$ GPS accuracy. Must be labeled `VERIFIED` if marine sensors and text align.
2. **Adversarial report with high-precision GPS**: A fabricated report with $\pm 5\text{ m}$ GPS precision submitted from an air-conditioned room claiming a tsunami when coastal tide gauges indicate calm seas ($0.3\text{m}$ wave height). Must be labeled `REJECTED`.
3. **Delayed honest reporting**: A fisherman reporting severe coastal erosion 18 hours after the storm passed due to lack of network offshore. Must be labeled `VERIFIED` with `UNCERTAIN` temporal urgency.

---

## 3. Inter-Annotator Agreement (Cohen's Kappa & Fleiss' Kappa)

To ensure high data quality, all pilot reports ($N=250$) are independently coded by two domain evaluators.

### Cohen's Kappa Formulation:
$$\kappa = \frac{P_o - P_e}{1 - P_e}$$
where $P_o$ is relative observed agreement and $P_e$ is hypothetical chance agreement:
$$P_e = \sum_{k \in \{\text{Ver}, \text{Rej}, \text{Unc}\}} p_{k,1} \cdot p_{k,2}$$

- **Target Inter-Annotator Agreement**: $\kappa \ge 0.82$ (Near-perfect domain agreement). Disagreements are resolved through a consensus adjudication panel.

---

## 4. Ethical Compliance & DPDP Act 2023 (India)

All dataset releases comply with the **Digital Personal Data Protection (DPDP) Act 2023**:
1. **Informed Consent**: Participants provide affirmative opt-in consent during registration for research triage usage.
2. **Spatial Coarsening**: Public coordinates are jittered/coarsened by $0.01^\circ$ ($\approx 1.1\text{ km}$) to preserve privacy.
3. **Data Minimization & Anonymization**: PII (names, phone numbers, IP addresses) are scrubbed and replaced with SHA-256 salted pseudonymous identifiers (`usr_hash`).
