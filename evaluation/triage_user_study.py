"""
Analyst Queue Workload Simulation Benchmark
Simulates operator cognitive throughput and inspection delays across a synthetic batch of 50 reports.
NOTE: This is a mathematical simulation model of dispatcher throughput and inspection latency,
NOT an empirical human user study.
"""
import sys
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

import numpy as np
import json

np.random.seed(42)

def simulate_queue_workload(num_simulated_runs=20, batch_size=50):
    results = {
        "fifo_queue": {
            "time_to_first_critical_min": [],
            "batch_completion_time_min": []
        },
        "triage_queue": {
            "time_to_first_critical_min": [],
            "batch_completion_time_min": []
        }
    }

    for _ in range(num_simulated_runs):
        base_review_sec = np.random.uniform(40.0, 70.0)
        
        # FIFO: Critical items appear randomly scattered
        rank_fifo = np.random.randint(5, 15)
        t_first_fifo = (rank_fifo * base_review_sec) / 60.0
        t_batch_fifo = (batch_size * base_review_sec) / 60.0
        
        results["fifo_queue"]["time_to_first_critical_min"].append(round(t_first_fifo, 2))
        results["fifo_queue"]["batch_completion_time_min"].append(round(t_batch_fifo, 2))

        # Triage Queue: Top ranked items inspected first
        rank_triage = np.random.choice([1, 2], p=[0.85, 0.15])
        t_first_triage = (rank_triage * base_review_sec) / 60.0
        t_batch_triage = (batch_size * base_review_sec * 0.70) / 60.0 # Faster triage due to explanations

        results["triage_queue"]["time_to_first_critical_min"].append(round(t_first_triage, 2))
        results["triage_queue"]["batch_completion_time_min"].append(round(t_batch_triage, 2))

    summary = {
        "fifo_queue": {
            "time_to_first_critical_mean": round(float(np.mean(results["fifo_queue"]["time_to_first_critical_min"])), 2),
            "batch_completion_mean": round(float(np.mean(results["fifo_queue"]["batch_completion_time_min"])), 2)
        },
        "triage_queue": {
            "time_to_first_critical_mean": round(float(np.mean(results["triage_queue"]["time_to_first_critical_min"])), 2),
            "batch_completion_mean": round(float(np.mean(results["triage_queue"]["batch_completion_time_min"])), 2)
        }
    }

    with open("evaluation/workload_simulation_results.json", "w", encoding="utf-8") as f:
        json.dump(summary, f, indent=2)

    print("=" * 70)
    print("ANALYST QUEUE WORKLOAD SIMULATION MODEL (20 SIMULATED RUNS)")
    print("=" * 70)
    print(f"FIFO Queue Mean Time to 1st Critical:   {summary['fifo_queue']['time_to_first_critical_mean']:.2f} min")
    print(f"Triage Queue Mean Time to 1st Critical: {summary['triage_queue']['time_to_first_critical_mean']:.2f} min")
    print("=" * 70)
    return summary

if __name__ == "__main__":
    simulate_queue_workload()
