# OceanSaksham: An Open-Source Architecture for Credibility-Aware Triage and Audit Logging in Crowdsourced Coastal Hazard Management

[![IEEE Paper](https://img.shields.io/badge/IEEE-Conference%20Paper-00629B.svg)](./ieee_paper/main.pdf)
[![React](https://img.shields.io/badge/Frontend-React%2018%20%2B%20Vite-61DAFB.svg)](./package.json)
[![Backend](https://img.shields.io/badge/Backend-Node.js%20%2B%20Express-339933.svg)](./backend/src/server.js)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)

> **Paper Scope**: *"A credibility-aware triage layer for crowdsourced coastal hazard reports in a multilingual, human-in-the-loop platform."*

---

## 🌊 Overview & System Architecture

**OceanSaksham** is an end-to-end crowdsourced coastal hazard reporting and emergency dispatch platform developed for coastal communities and disaster management authorities (inspired by **INCOIS - Indian National Centre for Ocean Information Services**).

During extreme marine events (tsunamis, storm surges, high wave breaches, coastal erosion), emergency dispatch queues become congested with unverified, noisy, duplicate, or uncalibrated submissions. OceanSaksham addresses this by fusing **seven multimodal feature groups** with real-time **Open-Meteo physical sea-state telemetry** and providing an **explainable, human-in-the-loop official console with tamper-evident audit logging**.

```
+-----------------------------------------------------------------------------------+
|                            OCEANSAKSHAM ARCHITECTURE                              |
+-----------------------------------------------------------------------------------+
|  [Citizen Portal (9 Languages)]  -->  [GPS, EXIF, Photos, Multi-Step Hazard Form]  |
|                                         |                                         |
|                                  (HTTPS / JWT Auth)                               |
|                                         v                                         |
|  +-----------------------------------------------------------------------------+  |
|  |                           REAL-TIME BACKEND API                             |  |
|  |  * SQLite/PostgreSQL Schema         * Token-Bucket Rate Limiting            |  |
|  |  * Duplicate Detection (<2km, <3h)  * Server-Sent Events (SSE Hub)          |  |
|  |  * Open-Meteo Marine API Client     * Immutable Official Audit Logs         |  |
|  +-----------------------------------------------------------------------------+  |
|                                         |                                         |
|                                (7 Feature Groups)                                 |
|                                         v                                         |
|  +-----------------------------------------------------------------------------+  |
|  |                      ML CREDIBILITY & TRIAGE ENGINE                         |  |
|  |  * 5-Seed Benchmark Suite           * Explainable Reason Attribution        |  |
|  |  * Region-Held-Out Spatial Split    * Real-time Priority Sorting            |  |
|  +-----------------------------------------------------------------------------+  |
|                                         |                                         |
|                                (SSE Event Stream)                                 |
|                                         v                                         |
|  [Official Dispatch Console]  -->  [Credibility Badges, Overrides & Auto Hotspots]|
+-----------------------------------------------------------------------------------+
```

---

## 📊 Platform Implementation & Engineering Matrix

| Component | Status in Codebase | Description & Operational Notes |
| :--- | :--- | :--- |
| **Backend REST & SSE API** | 🟢 **Real Production Code** | Express server with JWT auth, token-bucket rate limiting, sustained 220 req/s mixed load throughput ($p_{50}=71.1\text{ms}$), and SSE hub. |
| **Database & Cryptographic Audit** | 🟢 **Real Production Code** | SQLite schema with SHA-256 hash-chained append-only official audit logs and automated verification unit test (`npm test`). |
| **Credibility Scoring Engine** | 🟢 **Real Production Code** | 19-dimensional feature extractor across 7 modalities with explainable reason attribution (JS rule engine live, Python ML benchmark). |
| **Marine Weather Validation** | 🟢 **Real Live API** | Wave height ($H_s$) and wind speed from **Open-Meteo Marine API** (verified across Cyclone Biparjoy and Michaung vs calm baselines under ODbL terms). |
| **Multilingual Web Client** | 🟢 **Real Production Code** | Mobile-responsive web client with Web App Manifest support across 9 coastal languages. |
| **Emergency SOS Workflow** | 🟡 **Prototype Workflow** | Multi-state machine (`ACTIVE` $\to$ `ACKNOWLEDGED` $\to$ `RESOLVED`) logging to database and broadcasting via SSE (prototype, no 112 emergency dispatch integration). |
| **Dataset ($N=1,000\times 5$)** | 🟡 **Synthetic Benchmark** | 5-seed parameterized synthetic benchmark with GPS degradation, adversarial hoaxes, and region-held-out spatial partition (West vs East Coast). |

---

## 🌐 Platform Feature Comparison Matrix

| Capability / Feature | Ushahidi | USGS DYFI | INCOIS SAMUDRA | Sahana Eden | OceanSaksham (Ours) |
|---|---|---|---|---|---|
| **Primary Domain** | General Crisis | Earthquakes | Ocean Forecasts | Relief Logistics | Coastal Hazards |
| **Multilingual Indic UI** | Partial (Plugins) | No (EN/ES) | Yes (Govt. Languages) | Partial | Yes (9 Coastal Languages) |
| **Camera EXIF Cross-Check** | No documented support | No documented support | No documented support | No documented support | Yes ($\Delta r_{\text{GPS-EXIF}}$) |
| **Spatial Deduplication** | Manual Review | Grid-Aggregated | No | Partial (Incident Link) | Automated ($<2\text{km}, <3\text{h}$) |
| **Marine Sensor Triage** | No | Physical Seismograph Array | Yes (Forecast Broadcast) | No | Yes (Open-Meteo Integration) |
| **Explainable Credibility Score** | Manual Moderation | Rule Intensity (CDI) | No | No | Yes (7 Feature Groups) |
| **Audit Trail Integrity** | Database Logs | Standard Server Logs | Institutional Internal Logs | Role-based Logs | Cryptographic Hash Chain |
| **SOS Emergency Workflow** | No | No | No | Incident Tracking | Prototype State Machine (no 112 dispatch) |

---

## 📈 Empirical Results Summary (5-Seed Region-Held-Out Benchmark)

Evaluated across 5 independent seeds $\{42, 123, 456, 789, 2024\}$ on the held-out East Coast partition ($N=422$):

### 1. Classifier Performance (Mean $\pm$ Std across 5 Seeds)
| Model | Precision | Recall | $F_1$-Score | AUC-ROC | AUC-PR |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **Logistic Regression (L2)** | $\mathbf{0.952} \pm 0.013$ | $\mathbf{0.941} \pm 0.011$ | $\mathbf{0.946} \pm 0.004$ | $\mathbf{0.988} \pm 0.001$ | $\mathbf{0.993} \pm 0.001$ |
| **Random Forest ($n=100$)** | $0.940 \pm 0.021$ | $0.937 \pm 0.025$ | $0.938 \pm 0.009$ | $0.987 \pm 0.002$ | $0.992 \pm 0.002$ |
| **GBDT (Gradient Boosting)** | $0.932 \pm 0.014$ | $0.937 \pm 0.017$ | $0.934 \pm 0.012$ | $0.986 \pm 0.003$ | $0.991 \pm 0.003$ |

### 2. Dispatch Queue Prioritization
| Triage Strategy | P@5 | P@10 | P@20 | NDCG@10 |
| :--- | :---: | :---: | :---: | :---: |
| **FIFO Queue (Baseline)** | $0.40 \pm 0.28$ | $0.34 \pm 0.26$ | $0.32 \pm 0.27$ | $0.381 \pm 0.240$ |
| **Severity Heuristic** | $0.68 \pm 0.10$ | $0.70 \pm 0.14$ | $0.65 \pm 0.11$ | $0.708 \pm 0.154$ |
| **Rule-Based Score** | $\mathbf{1.00} \pm 0.00$ | $\mathbf{1.00} \pm 0.00$ | $\mathbf{1.00} \pm 0.00$ | $\mathbf{1.000} \pm 0.000$ |
| **ML Triage (GBDT)** | $\mathbf{1.00} \pm 0.00$ | $\mathbf{1.00} \pm 0.00$ | $\mathbf{1.00} \pm 0.00$ | $\mathbf{1.000} \pm 0.000$ |

*Note*: On this synthetic testbed, the rule-based score matches the ML models due to the parameterized generative structure of the benchmark.

---

## 🛠️ Quickstart & Local Setup

### 1. Prerequisites
- **Node.js**: v18.x or higher
- **Python**: v3.9 or higher

### 2. Running the Backend Service
```bash
cd backend
npm install
npm run seed      # Seeds database with synthetic incident records
npm start         # Starts REST & SSE server on http://localhost:5000
```

### 3. Running the Frontend Web Application
```bash
npm install --legacy-peer-deps
npm run dev       # Starts Vite dev server on http://localhost:5173
```

### 4. Reproducing the 5-Seed Benchmark
```bash
cd ml_pipeline
python evaluate_triage.py
```

---

## ⚖️ Privacy Design Considerations (Informed by DPDP Act 2023)
1. **Spatial Coarsening**: Public citizen maps display rounded coordinates ($\approx 1.1\text{km}$ resolution) to safeguard residential privacy.
2. **Pseudonymization**: Salted SHA-256 tokens mask user identities in public SSE event streams.
3. **Immutable Decision Trails**: Official triage decisions and override rationales are preserved in tamper-evident audit logs.

---

## 📄 License
This project is licensed under the [MIT License](./LICENSE).
