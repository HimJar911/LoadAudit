from typing import List, Dict, Union
import numpy as np
import statistics
import ast


def analyze_results(results: List[Dict]) -> Dict:
    print(f"\n🔍 Raw Input to analyze_results (len={len(results)}): {results[:2]}")
    # Convert JSON string to list if needed
    if isinstance(
        results, dict
    ):  # This handles wrongly parsed JSON dict instead of list
        results = list(results.values())
    elif isinstance(results, str):  # In case results come as stringified JSON
        results = ast.literal_eval(results)

    latencies = [r["latency"] for r in results if isinstance(r, dict)]
    statuses = [r["status"] for r in results if isinstance(r, dict)]

    total_requests = len(latencies)
    successful_requests = sum(1 for s in statuses if 200 <= s < 300)
    errors = total_requests - successful_requests

    avg_latency = round(sum(latencies) / total_requests, 4) if total_requests else 0
    max_latency = round(max(latencies), 4) if latencies else 0
    error_rate = round(errors / total_requests, 4) if total_requests else 0
    throughput = round(successful_requests / (max(latencies) if latencies else 1), 4)

    # Advanced metrics
    p95 = round(np.percentile(latencies, 95), 4) if latencies else 0
    p99 = round(np.percentile(latencies, 99), 4) if latencies else 0
    std_dev = round(statistics.stdev(latencies), 4) if len(latencies) > 1 else 0

    # Diagnosis
    diagnosis = []

    if error_rate < 0.01:
        diagnosis.append("✅ Error rate is within acceptable limits.")
    elif error_rate < 0.05:
        diagnosis.append("⚠️ Minor error rate detected.")
    else:
        diagnosis.append("❌ High error rate — service instability likely.")

    if avg_latency < 1:
        diagnosis.append("✅ Latency is acceptable.")
    elif avg_latency < 2:
        diagnosis.append("⚠️ Moderate latency — monitor closely.")
    else:
        diagnosis.append("❌ High latency — potential bottlenecks.")

    if throughput < 1:
        diagnosis.append("❌ Low throughput — service may not scale under load.")
    else:
        diagnosis.append("✅ Good throughput.")

    health_score = compute_health_score(avg_latency, error_rate, throughput)
    return {
        "avg_latency": avg_latency,
        "max_latency": max_latency,
        "error_rate": error_rate,
        "throughput": throughput,
        "p95_latency": p95,
        "p99_latency": p99,
        "std_dev_latency": std_dev,
        "diagnosis": diagnosis,
        "total_requests": total_requests,
        "health_score": health_score,
    }


def compute_health_score(latency: float, error_rate: float, throughput: float) -> int:
    score = 100

    # Penalize high latency
    if latency > 2.0:
        score -= 30
    elif latency > 1.0:
        score -= 15
    elif latency > 0.5:
        score -= 5

    # Penalize errors
    if error_rate > 0.1:
        score -= 40
    elif error_rate > 0.05:
        score -= 20
    elif error_rate > 0.01:
        score -= 10

    # Penalize low throughput
    if throughput < 10:
        score -= 30
    elif throughput < 20:
        score -= 15
    elif throughput < 40:
        score -= 5

    return max(0, score)
