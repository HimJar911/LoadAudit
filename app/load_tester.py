# app/load_tester.py

import asyncio
import httpx
import time
import random
import os
import json
import numpy as np
from typing import List, Dict, Optional
from datetime import datetime

LOG_DIR = "logs"

async def simulate_user(
    client: httpx.AsyncClient,
    url: str,
    duration: int,
    method: str = "GET",
    headers: Optional[Dict] = None,
    payload: Optional[Dict] = None,
    chaos_mode: bool = False,
    run_id: str = "default"
) -> List[Dict]:
    results = []
    end_time = time.time() + duration
    os.makedirs(LOG_DIR, exist_ok=True)
    log_path = os.path.join(LOG_DIR, f"run_{run_id}.jsonl")

    while time.time() < end_time:
        start = time.time()
        status_code = 0
        error = None

        print(f"🔁 Sending request to {url} with method {method}")  # DEBUG

        if chaos_mode and random.random() < 0.1:
            await asyncio.sleep(random.uniform(0.1, 0.5))
            latency = time.time() - start
            status_code = 500
            error = "ChaosFailure"
            print("💥 Chaos mode triggered.")  # DEBUG
        else:
            try:
                response = await client.request(method, url, headers=headers, json=payload)
                status_code = response.status_code
                latency = time.time() - start
                print(f"✅ Response {status_code} in {latency:.4f}s")  # DEBUG
            except Exception as e:
                latency = time.time() - start
                error = str(e)
                print(f"❌ Request failed: {error}")  # DEBUG

        result = {"status": status_code, "latency": latency}
        results.append(result)

        with open(log_path, "a") as log_file:
            log_file.write(json.dumps({
                "timestamp": datetime.utcnow().isoformat(),
                "status": status_code,
                "latency": latency,
                "error": error
            }) + "\n")

    print(f"👤 User finished — {len(results)} requests sent\n")  # DEBUG
    return results


async def run_load_test(
    url: str,
    num_users: int,
    duration: int,
    method: str = "GET",
    headers: Optional[Dict] = None,
    payload: Optional[Dict] = None,
    chaos_mode: bool = False,
    run_id: str = "default"
) -> List[Dict]:
    print(f"\n🚀 Starting load test: {num_users} users | {duration}s | {method} {url}\n")  # DEBUG
    async with httpx.AsyncClient(timeout=10) as client:
        tasks = [
            simulate_user(client, url, duration, method, headers, payload, chaos_mode, run_id)
            for _ in range(num_users)
        ]
        all_results = await asyncio.gather(*tasks)
        flat_results = [item for sublist in all_results for item in sublist]

        print(f"📊 Test Complete — Requests: {len(flat_results)}")  # DEBUG

        return flat_results


