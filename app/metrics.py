# app/metrics.py

import pandas as pd
from typing import List, Dict

def compute_metrics(results: List[Dict]) -> Dict:
    df = pd.DataFrame(results)

    total_requests = len(df)
    total_duration = df["latency"].sum()

    error_count = df[df["status"] != 200].shape[0]
    error_rate = error_count / total_requests if total_requests > 0 else 0

    throughput = total_requests / total_duration if total_duration > 0 else 0

    return {
        "avg_latency": round(df["latency"].mean(), 3),
        "max_latency": round(df["latency"].max(), 3),
        "error_rate": round(error_rate * 100, 2),      # percent
        "throughput": round(throughput, 2)              # req/sec
    }
