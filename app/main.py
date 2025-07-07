# app/main.py

from fastapi import FastAPI
from app.load_tester import run_load_test
from app.metrics import compute_metrics
from app.analyzer import diagnose
from app.models import LoadTestRequest, LoadTestResponse

app = FastAPI()

@app.get("/")
def read_root():
    return {"message": "LoadAudit is live."}

@app.post("/start", response_model=LoadTestResponse)
async def start_load_test(request: LoadTestRequest):
    raw_results = await run_load_test(request.target_url, request.num_users, request.duration)
    metrics = compute_metrics(raw_results)
    analysis = diagnose(metrics)
    return {
        **metrics,
        "diagnosis": analysis
    }
