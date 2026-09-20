"""
Model Training and Cross-Validation Pipeline for OceanSaksham Credibility Triage
Implements Logistic Regression, Random Forest, Gradient Boosting, and 3 Baselines.
"""
import sys
import os

# Ensure UTF-8 output on Windows consoles
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

import json
import numpy as np
from sklearn.linear_model import LogisticRegression
from sklearn.ensemble import RandomForestClassifier, GradientBoostingClassifier
from sklearn.model_selection import StratifiedKFold
from sklearn.metrics import precision_score, recall_score, f1_score, roc_auc_score, average_precision_score
from feature_extraction import extract_features_for_dataset

def evaluate_classifier_cv(clf, X, y, n_splits=5):
    skf = StratifiedKFold(n_splits=n_splits, shuffle=True, random_state=42)
    precisions, recalls, f1s, roc_aucs, pr_aucs = [], [], [], [], []
    
    for train_idx, test_idx in skf.split(X, y):
        X_train, X_test = X[train_idx], X[test_idx]
        y_train, y_test = y[train_idx], y[test_idx]

        clf.fit(X_train, y_train)
        probs = clf.predict_proba(X_test)[:, 1]
        preds = (probs >= 0.5).astype(int)

        precisions.append(precision_score(y_test, preds, zero_division=0))
        recalls.append(recall_score(y_test, preds, zero_division=0))
        f1s.append(f1_score(y_test, preds, zero_division=0))
        roc_aucs.append(roc_auc_score(y_test, probs))
        pr_aucs.append(average_precision_score(y_test, probs))

    return {
        "precision_mean": float(np.mean(precisions)),
        "precision_std": float(np.std(precisions)),
        "recall_mean": float(np.mean(recalls)),
        "recall_std": float(np.std(recalls)),
        "f1_mean": float(np.mean(f1s)),
        "f1_std": float(np.std(f1s)),
        "roc_auc_mean": float(np.mean(roc_aucs)),
        "roc_auc_std": float(np.std(roc_aucs)),
        "pr_auc_mean": float(np.mean(pr_aucs)),
        "pr_auc_std": float(np.std(pr_aucs)),
    }

def run_training_pipeline():
    with open("ml_pipeline/reports_dataset.json", "r", encoding="utf-8") as f:
        reports = json.load(f)

    X_list, y_list, feature_names, metadata = extract_features_for_dataset(reports)
    X = np.array(X_list, dtype=np.float32)
    y = np.array(y_list, dtype=np.int32)

    # 1. Classical ML Classifiers
    models = {
        "Logistic Regression (L2)": LogisticRegression(max_iter=1000, C=1.0, random_state=42),
        "Random Forest (n=100)": RandomForestClassifier(n_estimators=100, max_depth=8, random_state=42),
        "Gradient Boosted Trees (GBDT)": GradientBoostingClassifier(n_estimators=120, learning_rate=0.08, max_depth=4, random_state=42)
    }

    results = {}
    print("=" * 70)
    print("MODEL TRAINING & 5-FOLD STRATIFIED CROSS-VALIDATION RESULTS")
    print("=" * 70)

    for name, clf in models.items():
        metrics = evaluate_classifier_cv(clf, X, y, n_splits=5)
        results[name] = metrics
        print(f"\n[{name}]")
        print(f"  Precision: {metrics['precision_mean']:.4f} (+/-{metrics['precision_std']:.3f})")
        print(f"  Recall:    {metrics['recall_mean']:.4f} (+/-{metrics['recall_std']:.3f})")
        print(f"  F1-Score:  {metrics['f1_mean']:.4f} (+/-{metrics['f1_std']:.3f})")
        print(f"  AUC-ROC:   {metrics['roc_auc_mean']:.4f} (+/-{metrics['roc_auc_std']:.3f})")
        print(f"  AUC-PR:    {metrics['pr_auc_mean']:.4f} (+/-{metrics['pr_auc_std']:.3f})")

    # Fit final GBDT model on full dataset for inference and save weights/metrics
    final_model = GradientBoostingClassifier(n_estimators=120, learning_rate=0.08, max_depth=4, random_state=42)
    final_model.fit(X, y)

    # Feature Importance analysis
    feat_importances = final_model.feature_importances_
    sorted_feat_idx = np.argsort(feat_importances)[::-1]
    
    importance_dict = {
        feature_names[idx]: float(feat_importances[idx])
        for idx in sorted_feat_idx
    }

    out_payload = {
        "cv_results": results,
        "feature_importances": importance_dict,
        "feature_names": feature_names,
        "sample_count": len(reports),
        "positive_class_ratio": float(np.mean(y))
    }

    with open("ml_pipeline/training_results.json", "w", encoding="utf-8") as f:
        json.dump(out_payload, f, indent=2)

    print("\nTraining complete. Results saved to ml_pipeline/training_results.json")
    return out_payload

if __name__ == "__main__":
    run_training_pipeline()
