# app/analyzer.py

from typing import Dict, List

def diagnose(metrics: Dict) -> List[str]:
    analysis = []

    if metrics["error_rate"] > 10:
        analysis.append("High error rate detected — potential server overload or endpoint failure.")
    else:
        analysis.append("Error rate is within acceptable limits.")

    if metrics["avg_latency"] > 2:
        analysis.append("High average latency — investigate bottlenecks or consider caching.")
    else:
        analysis.append("Latency is acceptable.")

    if metrics["throughput"] < 50:
        analysis.append("Low throughput — service may not scale under load.")
    else:
        analysis.append("Throughput is healthy.")

    return analysis
