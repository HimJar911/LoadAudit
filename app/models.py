from pydantic import BaseModel
from typing import List, Dict


class LoadTestRequest(BaseModel):
    target_url: str
    num_users: int
    duration: int
    method: str = "GET"
    headers: Dict[str, str] = {}
    payload: Dict = {}
    chaos_mode: bool = False


class LoadTestResponse(BaseModel):
    avg_latency: float
    max_latency: float
    p95_latency: float
    p99_latency: float
    latency_stddev: float
    error_rate: float
    throughput: float
    total_requests: int
    health_score: int
    diagnosis: List[str]

class RunSummary(BaseModel):
    run_id: str
    url: str
    users: int
    duration: int
    avg_latency: float
    max_latency: float
    p95_latency: float
    p99_latency: float
    latency_stddev: float
    error_rate: float
    throughput: float
    total_requests: int
    health_score: int
