# OceanSaksham: A Credibility-Aware Triage Layer for Crowdsourced Coastal Hazard Reports

[![IEEE Paper](https://img.shields.io/badge/IEEE-Conference%20Paper-00629B.svg)](./ieee_paper/main.tex)
[![React](https://img.shields.io/badge/Frontend-React%2018%20%2B%20Vite-61DAFB.svg)](./package.json)
[![Backend](https://img.shields.io/badge/Backend-Node.js%20%2B%20Express-339933.svg)](./backend/src/server.js)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)

> **Paper Scope**: *"A credibility-aware triage layer for crowdsourced coastal hazard reports in a multilingual, human-in-the-loop platform."*

---

## 🌊 Overview & System Architecture

**OceanSaksham** is an end-to-end crowdsourced coastal hazard reporting and emergency dispatch platform developed for coastal communities and disaster management authorities (inspired by **INCOIS - Indian National Centre for Ocean Information Services**).

During extreme marine events (tsunamis, storm surges, high wave breaches, coastal erosion), emergency dispatch queues become congested with unverified, noisy, duplicate, or uncalibrated submissions. OceanSaksham addresses this by fusing **seven multimodal feature groups** with real-time **Open-Meteo physical sea-state telemetry** and providing an **explainable, human-in-the-loop official console**.

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
|  |  * SQLite/PostgreSQL Database       * Token-Bucket Rate Limiting            |  |
|  |  * Duplicate Detection (<2km, <3h)  * Server-Sent Events (SSE Hub)          |  |
|  |  * Open-Meteo Marine API Client     * Immutable Official Audit Logs         |  |
|  +-----------------------------------------------------------------------------+  |
|                                         |                                         |
|                                (7 Feature Groups)                                 |
|                                         v                                         |
|  +-----------------------------------------------------------------------------+  |
|  |                      ML CREDIBILITY & TRIAGE ENGINE                         |  |
|  |  * Gradient Boosted Trees (GBDT)    * Explainable Reason Attribution        |  |
|  |  * Region-Held-Out Spatial Split    * Real-time Priority Sorting            |  |
|  +-----------------------------------------------------------------------------+  |
|                                         |                                         |
|                                (SSE Event Stream)                                 |
|                                         v                                         |
|  [Official Dispatch Console]  -->  [Credibility Badges, Overrides & Auto Hotspots]|
+-----------------------------------------------------------------------------------+
```

---

## 📊 Real vs. Simulated Implementation Matrix (Academic Transparency)

| Component | Status in Codebase | Description & Operational Notes |
| :--- | :--- | :--- |
| **Backend REST & SSE API** | 🟢 **Real Production Code** | Express server with JWT auth, token-bucket rate limiting, and Server-Sent Events hub. |
| **Database & Audit Logs** | 🟢 **Real Production Code** | Persistent SQLite/PostgreSQL schema with raw ML telemetry and official override logs. |
| **Credibility Scoring Engine** | 🟢 **Real Production Code** | 19-dimensional feature extractor with trained GBDT, RF, and L2 LogReg models. |
| **Marine Weather Validation** | 🟢 **Real Live API** | Real-time wave height ($H_s$) and wind speed fetched from **Open-Meteo Marine API**. |
| **Multilingual UI** | 🟢 **Real Production Code** | 9 Indian coastal languages (English, Hindi, Marathi, Tamil, Telugu, Bengali, Gujarati, Malayalam, Odia). |
| **Emergency SOS Workflow** | 🟡 **Prototype Workflow** | Multi-state machine (`ACTIVE` $\to$ `ACKNOWLEDGED` $\to$ `RESOLVED`) logging to database and broadcasting via SSE; prototype stage, not connected to 112 emergency dispatch. |
| **Dataset ($N=1,000$)** | 🟡 **Synthetic Benchmark** | Realistic synthetic dataset ($N=1,000$) with complex noise, GPS degradation, adversarial hoaxes, and region-held-out spatial partition (West vs East Coast). |

---

## 🔬 Empirical Evaluation Highlights

### 1. Classifier Evaluation on Region-Held-Out Spatial Test Partition (East Coast, $N=422$)
*Models trained exclusively on West Coast data ($N=578$) to evaluate geographic generalization with 1,000-iteration bootstrap 95% CIs.*

| Classifier Model | Precision [95% CI] | Recall [95% CI] | $F_1$-Score [95% CI] | AUC-ROC | AUC-PR |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **Logistic Regression (L2)** | $0.941\ [0.909, 0.970]$ | $0.949\ [0.914, 0.976]$ | **$0.945\ [0.923, 0.965]$** | 0.987 | 0.991 |
| **Random Forest ($n=100$)** | $0.942\ [0.905, 0.970]$ | $0.903\ [0.862, 0.938]$ | **$0.922\ [0.895, 0.946]$** | 0.984 | 0.988 |
| **GBDT (Gradient Boosting)** | $0.922\ [0.886, 0.957]$ | $0.907\ [0.869, 0.944]$ | **$0.915\ [0.886, 0.940]$** | 0.983 | 0.987 |

### 2. Queue Ranking & Triage Metrics
*Evaluated on the East Coast test queue.*

| Triage / Queue Strategy | $P@5$ | $P@10$ | $P@20$ | $\text{NDCG}@10$ | $\text{NDCG}@20$ | $T_{\text{first}}$ (min) |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| **FIFO Queue (Unsorted)** | 0.40 | 0.30 | 0.15 | 0.437 | 0.282 | 2.0 |
| **Severity-Only Heuristic** | 0.60 | 0.70 | 0.55 | 0.698 | 0.586 | 2.0 |
| **Hand-Crafted Rule Score** | 1.00 | 1.00 | 1.00 | 1.000 | 1.000 | 2.0 |
| **ML Triage (GBDT)** | **1.00** | **1.00** | **1.00** | **1.000** | **1.000** | **2.0** |

---

## 🚀 Quick Start & Reproducibility Guide

### 1. Prerequisites
- **Node.js**: v18.x or higher
- **Python**: v3.9 or higher (with `numpy`, `scikit-learn`)

### 2. Running the Frontend
```bash
npm install --legacy-peer-deps
npm run dev
```

### 3. Running the Backend API
```bash
cd backend
npm install
node src/server.js
```

### 4. Reproducing the Machine Learning & Triage Results
```bash
# 1. Generate the spatial benchmark dataset
python ml_pipeline/data_generator.py

# 2. Train models and evaluate on region-held-out spatial split
python ml_pipeline/evaluate_triage.py
```

---

## ⚖️ Ethics & DPDP Act 2023 Compliance
In accordance with India's **Digital Personal Data Protection (DPDP) Act 2023**:
- Data pipeline enforces purpose limitation and data minimization.
- Released coordinates are spatially coarsened by $0.01^\circ$ ($\approx 1.1\text{ km}$).
- User identifiers are pseudonymized with salted SHA-256 tokens.

---

## 📜 Citation
```bibtex
@inproceedings{oceansaksham2025triage,
  title={A Credibility-Aware Triage Layer for Crowdsourced Coastal Hazard Reports: Architecture, Multi-Signal Feature Design, and Simulation-Based Evaluation},
  author={Suraj Gore and Saachi Sharma},
  booktitle={IEEE Conference on Crisis Informatics and Ocean Engineering},
  year={2025}
}
```

## 📄 License
This project is licensed under the MIT License — see the [LICENSE](./LICENSE) file for details.
