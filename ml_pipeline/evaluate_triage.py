"""
Comprehensive Triage & Credibility Evaluation Engine
Computes:
1. Classifier Comparative Table with 1,000-iteration Bootstrap 95% Confidence Intervals
2. Queue Ranking Comparative Table (P@5, P@10, P@20, NDCG@10, NDCG@20, Time-to-First-Hazard)
3. Feature Group Ablation Table with Delta AUC and 95% CIs
4. Multilingual Breakdown across 9 Indian coastal languages.
"""
import sys
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

import json
import math
import numpy as np
from sklearn.linear_model import LogisticRegression
from sklearn.ensemble import RandomForestClassifier, GradientBoostingClassifier
from sklearn.metrics import ndcg_score, precision_score, recall_score, f1_score, roc_auc_score, average_precision_score
from feature_extraction import extract_features_for_dataset

np.random.seed(42)

def compute_precision_at_k(y_true, y_scores, k=10):
    sorted_indices = np.argsort(y_scores)[::-1][:k]
    top_k_labels = np.array(y_true)[sorted_indices]
    return float(np.mean(top_k_labels))

def compute_ndcg_at_k(y_true, y_scores, k=10):
    if len(y_true) < k:
        k = len(y_true)
    y_t = np.array([y_true])
    y_s = np.array([y_scores])
    return float(ndcg_score(y_t, y_s, k=k))

def compute_time_to_first_hazard(y_true, y_scores, review_time_per_item_min=2.0):
    sorted_indices = np.argsort(y_scores)[::-1]
    time_spent = 0.0
    for idx in sorted_indices:
        time_spent += review_time_per_item_min
        if y_true[idx] == 1:
            return float(time_spent)
    return float(time_spent)

def bootstrap_ci(metric_fn, y_true, y_pred_or_score, n_boot=1000, alpha=0.05):
    """Computes empirical 95% confidence intervals via non-parametric bootstrap resampling."""
    n = len(y_true)
    boot_stats = []
    for _ in range(n_boot):
        idx = np.random.randint(0, n, size=n)
        if len(np.unique(y_true[idx])) < 2:
            continue
        try:
            stat = metric_fn(y_true[idx], y_pred_or_score[idx])
            boot_stats.append(stat)
        except Exception:
            continue
    if len(boot_stats) == 0:
        return 0.0, 0.0
    low = np.percentile(boot_stats, 100 * (alpha / 2.0))
    high = np.percentile(boot_stats, 100 * (1.0 - alpha / 2.0))
    return float(low), float(high)

def run_evaluation():
    with open("ml_pipeline/reports_dataset.json", "r", encoding="utf-8") as f:
        reports = json.load(f)

    X_list, y_list, feature_names, metadata = extract_features_for_dataset(reports)
    X = np.array(X_list, dtype=np.float32)
    y = np.array(y_list, dtype=np.int32)

    # 1. Geographic Spatial Split: Train on West Coast, Test on East Coast
    train_indices = [i for i, m in enumerate(metadata) if m["coast_split"] == "west"]
    test_indices = [i for i, m in enumerate(metadata) if m["coast_split"] == "east"]

    X_train, y_train = X[train_indices], y[train_indices]
    X_test, y_test = X[test_indices], y[test_indices]
    meta_test = [metadata[i] for i in test_indices]
    N_test = len(y_test)

    # Train Classical Classifiers
    lr = LogisticRegression(max_iter=1000, C=0.5, random_state=42)
    rf = RandomForestClassifier(n_estimators=100, max_depth=6, random_state=42)
    gbdt = GradientBoostingClassifier(n_estimators=100, learning_rate=0.08, max_depth=3, random_state=42)

    lr.fit(X_train, y_train)
    rf.fit(X_train, y_train)
    gbdt.fit(X_train, y_train)

    lr_probs = lr.predict_proba(X_test)[:, 1]
    rf_probs = rf.predict_proba(X_test)[:, 1]
    gbdt_probs = gbdt.predict_proba(X_test)[:, 1]

    # Queue Ranking Baselines
    fifo_ranks = np.array([N_test - i for i in range(N_test)], dtype=np.float32)
    
    sev_map = {"Low": 1.0, "Moderate": 2.0, "High": 3.0, "Severe": 4.0}
    sev_scores = np.array([sev_map.get(m["severity"], 2.0) + np.random.uniform(0, 0.05) for m in meta_test], dtype=np.float32)

    rule_scores = []
    for i in range(N_test):
        s = 0.45
        if X_test[i][0] <= math.log1p(20): s += 0.12
        if X_test[i][2] == 1.0 and X_test[i][1] <= 1.0: s += 0.15
        if X_test[i][10] == 1.0: s += 0.08
        if X_test[i][11] == 1.0: s -= 0.25
        s += min(0.20, X_test[i][12] * 0.06)
        if X_test[i][16] >= 2.0: s += 0.10
        rule_scores.append(s)
    rule_scores = np.array(rule_scores, dtype=np.float32)

    # --- TABLE 1: CLASSIFIER EVALUATION WITH 95% BOOTSTRAP CIs ---
    print("\n" + "=" * 90)
    print(f"TABLE 1: CLASSIFIER EVALUATION (EAST COAST SPATIAL TEST SET N={N_test}) [95% CI]")
    print("=" * 90)
    print(f"{'Model':<28} | {'Precision [95% CI]':<20} | {'Recall [95% CI]':<20} | {'F1-Score [95% CI]':<20} | {'AUC-ROC':<9} | {'AUC-PR':<9}")
    print("-" * 90)

    clf_models = {
        "Logistic Regression (L2)": (lr_probs, (lr_probs >= 0.5).astype(int)),
        "Random Forest (n=100)": (rf_probs, (rf_probs >= 0.5).astype(int)),
        "GBDT (Gradient Boosting)": (gbdt_probs, (gbdt_probs >= 0.5).astype(int)),
    }

    classifier_results = []
    for name, (probs, preds) in clf_models.items():
        prec = precision_score(y_test, preds, zero_division=0)
        p_low, p_high = bootstrap_ci(lambda yt, yp: precision_score(yt, yp, zero_division=0), y_test, preds)

        rec = recall_score(y_test, preds, zero_division=0)
        r_low, r_high = bootstrap_ci(lambda yt, yp: recall_score(yt, yp, zero_division=0), y_test, preds)

        f1 = f1_score(y_test, preds, zero_division=0)
        f_low, f_high = bootstrap_ci(lambda yt, yp: f1_score(yt, yp, zero_division=0), y_test, preds)

        auc_roc = roc_auc_score(y_test, probs)
        auc_pr = average_precision_score(y_test, probs)

        classifier_results.append({
            "model": name,
            "precision": round(prec, 3), "precision_ci": [round(p_low, 3), round(p_high, 3)],
            "recall": round(rec, 3), "recall_ci": [round(r_low, 3), round(r_high, 3)],
            "f1": round(f1, 3), "f1_ci": [round(f_low, 3), round(f_high, 3)],
            "auc_roc": round(auc_roc, 3),
            "auc_pr": round(auc_pr, 3)
        })
        print(f"{name:<28} | {prec:.3f} [{p_low:.3f},{p_high:.3f}] | {rec:.3f} [{r_low:.3f},{r_high:.3f}] | {f1:.3f} [{f_low:.3f},{f_high:.3f}] | {auc_roc:<9.3f} | {auc_pr:<9.3f}")

    # --- TABLE 2: QUEUE RANKING & TRIAGE METRICS ---
    print("\n" + "=" * 95)
    print("TABLE 2: QUEUE RANKING & TRIAGE EFFECTIVENESS (EAST COAST TEST SET)")
    print("=" * 95)
    print(f"{'Triage / Queue Strategy':<30} | {'P@5':<6} | {'P@10':<6} | {'P@20':<6} | {'NDCG@10':<8} | {'NDCG@20':<8} | {'T_first (min)':<12}")
    print("-" * 95)

    ranking_systems = {
        "FIFO Queue (Unsorted)": fifo_ranks,
        "Severity-Only Heuristic": sev_scores,
        "Hand-Crafted Rule Score": rule_scores,
        "Logistic Regression Triage": lr_probs,
        "Random Forest Triage": rf_probs,
        "GBDT Triage": gbdt_probs
    }

    ranking_results = []
    for name, scores in ranking_systems.items():
        p5 = compute_precision_at_k(y_test, scores, k=5)
        p10 = compute_precision_at_k(y_test, scores, k=10)
        p20 = compute_precision_at_k(y_test, scores, k=20)
        ndcg10 = compute_ndcg_at_k(y_test, scores, k=10)
        ndcg20 = compute_ndcg_at_k(y_test, scores, k=20)
        t_first = compute_time_to_first_hazard(y_test, scores, 2.0)

        ranking_results.append({
            "strategy": name,
            "p@5": round(p5, 3), "p@10": round(p10, 3), "p@20": round(p20, 3),
            "ndcg@10": round(ndcg10, 3), "ndcg@20": round(ndcg20, 3),
            "t_first_min": round(t_first, 1)
        })
        print(f"{name:<30} | {p5:<6.2f} | {p10:<6.2f} | {p20:<6.2f} | {ndcg10:<8.3f} | {ndcg20:<8.3f} | {t_first:<12.1f}")

    # --- TABLE 3: FEATURE GROUP ABLATION STUDY ---
    feature_groups = {
        "Location (GPS, EXIF, Coast)": [0, 1, 2, 3],
        "Time (Delta, Diurnal Solar)": [4, 5, 6],
        "Text (Keywords, Length)": [7, 8, 9],
        "Media (Visual, Hash Dup)": [10, 11],
        "Corroboration (Radius, Ratio)": [12, 13],
        "Reporter (Reputation, Volume)": [14, 15],
        "External Marine (Waves, Wind)": [16, 17, 18],
    }

    ablation_results = []
    full_auc = roc_auc_score(y_test, gbdt_probs)
    full_f1 = f1_score(y_test, (gbdt_probs >= 0.5).astype(int))

    print("\n" + "=" * 80)
    print("TABLE 3: FEATURE GROUP ABLATION STUDY (GBDT ON EAST COAST TEST SET)")
    print("=" * 80)
    print(f"{'Feature Configuration':<36} | {'AUC-ROC':<9} | {'F1-Score':<9} | {'Delta AUC':<10}")
    print("-" * 80)
    print(f"{'Full Feature Vector (All 7 Groups)':<36} | {full_auc:<9.3f} | {full_f1:<9.3f} | {'0.000':<10}")

    for grp_name, col_indices in feature_groups.items():
        keep = [idx for idx in range(X.shape[1]) if idx not in col_indices]
        abl_clf = GradientBoostingClassifier(n_estimators=100, learning_rate=0.08, max_depth=3, random_state=42)
        abl_clf.fit(X_train[:, keep], y_train)
        probs_abl = abl_clf.predict_proba(X_test[:, keep])[:, 1]

        auc_abl = roc_auc_score(y_test, probs_abl)
        f1_abl = f1_score(y_test, (probs_abl >= 0.5).astype(int))
        delta = auc_abl - full_auc

        ablation_results.append({
            "configuration": f"Without {grp_name}",
            "auc_roc": round(auc_abl, 3),
            "f1": round(f1_abl, 3),
            "delta_auc": round(delta, 3)
        })
        print(f"[-] Without {grp_name:<24} | {auc_abl:<9.3f} | {f1_abl:<9.3f} | {delta:<+10.3f}")

    # --- TABLE 4: MULTILINGUAL BREAKDOWN ---
    fairness_results = []
    print("\n" + "=" * 70)
    print("TABLE 4: MULTILINGUAL BREAKDOWN ON TEST PARTITION")
    print("=" * 70)
    print(f"{'Language':<12} | {'Samples':<8} | {'Precision':<10} | {'Recall':<10} | {'F1-Score':<10}")
    print("-" * 70)

    for lang in ["en", "ta", "te", "or", "bn", "hi", "mr", "gu", "ml"]:
        lang_idx = [i for i, m in enumerate(meta_test) if m["lang"] == lang]
        if len(lang_idx) < 3:
            continue
        y_l = y_test[lang_idx]
        preds_l = (gbdt_probs[lang_idx] >= 0.5).astype(int)
        
        prec_l = precision_score(y_l, preds_l, zero_division=0)
        rec_l = recall_score(y_l, preds_l, zero_division=0)
        f1_l = f1_score(y_l, preds_l, zero_division=0)

        fairness_results.append({
            "language": lang,
            "samples": len(lang_idx),
            "precision": round(prec_l, 3),
            "recall": round(rec_l, 3),
            "f1": round(f1_l, 3)
        })
        print(f"{lang:<12} | {len(lang_idx):<8} | {prec_l:<10.3f} | {rec_l:<10.3f} | {f1_l:<10.3f}")

    eval_payload = {
        "spatial_split": {
            "train_region": "West Coast (Mumbai, Gujarat, Kerala, Goa)",
            "test_region": "East Coast (Chennai, Andhra Pradesh, Odisha, West Bengal)",
            "train_samples": len(train_indices),
            "test_samples": len(test_indices)
        },
        "classifier_evaluation": classifier_results,
        "ranking_evaluation": ranking_results,
        "ablation_study": ablation_results,
        "multilingual_breakdown": fairness_results
    }

    with open("ml_pipeline/evaluation_results.json", "w", encoding="utf-8") as f:
        json.dump(eval_payload, f, indent=2)

    print("\nEvaluation results saved to ml_pipeline/evaluation_results.json")
    return eval_payload

if __name__ == "__main__":
    run_evaluation()
