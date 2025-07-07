from fastapi import FastAPI, HTTPException
from app.load_tester import run_load_test
from typing import List, Dict
from app.persistence import (
    generate_run_id,
    save_run_summary,
    read_run_summaries,
    export_run_csv,
    compare_with_previous,
)
from app.metrics import analyze_results
from app.models import LoadTestRequest, LoadTestResponse, RunSummary
import asyncio

app = FastAPI(title="LoadAudit", version="0.1.0")

# --- ROUTES ---


@app.get("/")
def read_root():
    return {"message": "LoadAudit is live. Ready to test endpoints."}


@app.post("/start", response_model=LoadTestResponse)
async def start_load_test(config: LoadTestRequest):
    try:
        run_id = generate_run_id()
        print(f"\n🚀 Load Test Config:\n{config.dict()}")  # DEBUG

        # 1. Run the load test
        raw_metrics = await run_load_test(
            url=config.target_url,
            num_users=config.num_users,
            duration=config.duration,
            method=config.method,
            headers=config.headers,
            payload=config.payload,
            chaos_mode=config.chaos_mode,
            run_id=run_id,
        )

        print(f"\n📥 Raw Results Sample:\n{raw_metrics[:2]}")  # DEBUG

        # 2. Analyze metrics
        metrics = analyze_results(raw_metrics)
        regressions = compare_with_previous(metrics)
        metrics["diagnosis"].extend(regressions)
        print(f"\n📊 Analyzed Metrics:\n{metrics}")  # DEBUG

        # 3. Save summary
        save_run_summary(
            run_id=run_id,
            url=config.target_url,
            users=config.num_users,
            duration=config.duration,
            metrics=metrics,
        )

        # 4. Return full response
        response = LoadTestResponse(
            avg_latency=metrics["avg_latency"],
            max_latency=metrics["max_latency"],
            p95_latency=metrics["p95_latency"],
            p99_latency=metrics["p99_latency"],
            latency_stddev=metrics["std_dev_latency"],
            error_rate=metrics["error_rate"],
            throughput=metrics["throughput"],
            total_requests=metrics["total_requests"],
            health_score=metrics["health_score"],
            diagnosis=metrics["diagnosis"],
        )

        print(f"\n✅ Final Response:\n{response.dict()}")  # DEBUG
        return response

    except Exception as e:
        print(f"❌ Exception in /start: {e}")  # DEBUG
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/runs", response_model=List[RunSummary])
def get_all_runs():
    return read_run_summaries()


@app.get("/export")
def export_csv():
    return export_run_csv()
