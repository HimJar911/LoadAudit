import csv
import os
import uuid
from fastapi.responses import FileResponse

RESULTS_CSV = "data/results.csv"  # Store in data/ folder

# ------------------------------
# 🔹 Generate Unique Run ID
# ------------------------------
def generate_run_id():
    return str(uuid.uuid4())[:8]

# ------------------------------
# 🔹 Save Run Summary to CSV
# ------------------------------
def save_run_summary(run_id, url, users, duration, metrics):
    os.makedirs("data", exist_ok=True)
    file_exists = os.path.exists(RESULTS_CSV)

    with open(RESULTS_CSV, "a", newline="") as f:
        writer = csv.writer(f)
        if not file_exists:
            writer.writerow([
                "run_id", "url", "users", "duration",
                "avg_latency", "max_latency", "p95_latency", "p99_latency",
                "latency_stddev", "error_rate", "throughput",
                "total_requests", "health_score"
            ])
        writer.writerow([
            run_id, url, users, duration,
            metrics["avg_latency"], metrics["max_latency"],
            metrics["p95_latency"], metrics["p99_latency"],
            metrics["std_dev_latency"], metrics["error_rate"],
            metrics["throughput"], metrics["total_requests"],
            metrics["health_score"]
        ])

# ------------------------------
# 🔹 Load All Run Summaries
# ------------------------------
def read_run_summaries():
    if not os.path.exists(RESULTS_CSV):
        return []

    with open(RESULTS_CSV, "r") as f:
        reader = csv.DictReader(f)
        summaries = []
        for row in reader:
            summaries.append({
                "run_id": row["run_id"],
                "url": row["url"],
                "users": int(row["users"]),
                "duration": int(row["duration"]),
                "avg_latency": float(row["avg_latency"]),
                "max_latency": float(row["max_latency"]),
                "p95_latency": float(row["p95_latency"]),
                "p99_latency": float(row["p99_latency"]),
                "latency_stddev": float(row["latency_stddev"]),
                "error_rate": float(row["error_rate"]),
                "throughput": float(row["throughput"]),
                "total_requests": int(row["total_requests"]),
                "health_score": int(row["health_score"]),
            })
        return summaries

# ------------------------------
# 🔹 Export CSV File
# ------------------------------
def export_run_csv():
    if not os.path.exists(RESULTS_CSV):
        return {"error": "No data to export."}
    return FileResponse(
        path=RESULTS_CSV,
        filename="load_test_results.csv",
        media_type="text/csv"
    )

# ------------------------------
# 🔹 Compare with Previous Run
# ------------------------------
def compare_with_previous(current_metrics):
    if not os.path.exists(RESULTS_CSV):
        return []

    with open(RESULTS_CSV, "r") as f:
        rows = list(csv.DictReader(f))
        if len(rows) < 1:
            return []

        previous = rows[-1]

        regression_msgs = []

        def percent_change(new, old):
            return ((new - old) / old) * 100 if old != 0 else 0

        # Convert values
        prev_p95 = float(previous["p95_latency"])
        prev_p99 = float(previous["p99_latency"])
        prev_throughput = float(previous["throughput"])
        prev_error_rate = float(previous["error_rate"])
        prev_health = int(previous["health_score"])

        # Regression detection
        if percent_change(current_metrics["p95_latency"], prev_p95) > 50:
            regression_msgs.append("⚠️ p95 latency has worsened significantly.")
        if percent_change(current_metrics["p99_latency"], prev_p99) > 50:
            regression_msgs.append("⚠️ p99 latency has worsened significantly.")
        if percent_change(prev_throughput, current_metrics["throughput"]) > 30:
            regression_msgs.append("⚠️ Throughput has dropped noticeably.")
        if current_metrics["error_rate"] > prev_error_rate:
            regression_msgs.append("⚠️ Error rate increased.")
        if current_metrics["health_score"] < prev_health - 10:
            regression_msgs.append("⚠️ Health score has dropped by more than 10 points.")

        return regression_msgs
