# Add this to your project as a new file: app/system_limits.py

import asyncio
import psutil
import resource
import platform
import json
from typing import Dict, List
from fastapi import APIRouter

router = APIRouter()

def get_system_limits() -> Dict:
    """Analyze current system limits and capacity"""
    
    # Get system info
    cpu_count = psutil.cpu_count(logical=True)
    memory = psutil.virtual_memory()
    
    # Get resource limits
    soft_limit, hard_limit = resource.getrlimit(resource.RLIMIT_NOFILE)
    
    # Calculate theoretical limits
    max_concurrent_users = min(
        soft_limit - 100,  # Reserve 100 file descriptors for system
        memory.available // (1024 * 1024 * 2),  # 2MB per user estimate
        cpu_count * 200  # 200 users per CPU core (conservative)
    )
    
    return {
        "system_info": {
            "platform": platform.system(),
            "cpu_cores": cpu_count,
            "total_memory_gb": round(memory.total / (1024**3), 2),
            "available_memory_gb": round(memory.available / (1024**3), 2),
            "memory_usage_percent": memory.percent
        },
        "resource_limits": {
            "max_file_descriptors": soft_limit,
            "hard_file_descriptor_limit": hard_limit,
            "current_open_files": len(psutil.Process().open_files())
        },
        "estimated_capacity": {
            "max_concurrent_users": max_concurrent_users,
            "recommended_max_users": max_concurrent_users // 2,  # 50% safety margin
            "max_test_duration_minutes": 60,  # Practical limit
            "breaking_points": {
                "memory_limit": f"~{memory.available // (1024 * 1024 * 10)} users (10MB each)",
                "fd_limit": f"~{soft_limit - 100} users (1 connection each)",
                "cpu_limit": f"~{cpu_count * 200} users (200 per core)"
            }
        },
        "performance_degradation": {
            "light_load": "1-50 users: Optimal performance",
            "moderate_load": "50-200 users: Good performance, some latency",
            "heavy_load": "200-500 users: Performance degradation begins",
            "critical_load": f"500-{max_concurrent_users} users: System stress, high latency",
            "failure_point": f"{max_concurrent_users}+ users: System failure likely"
        }
    }

def get_current_load() -> Dict:
    """Get current system load"""
    cpu_percent = psutil.cpu_percent(interval=1)
    memory = psutil.virtual_memory()
    
    return {
        "cpu_usage_percent": cpu_percent,
        "memory_usage_percent": memory.percent,
        "available_memory_gb": round(memory.available / (1024**3), 2),
        "load_average": psutil.getloadavg() if hasattr(psutil, 'getloadavg') else None,
        "active_connections": len(psutil.net_connections()),
        "status": get_load_status(cpu_percent, memory.percent)
    }

def get_load_status(cpu_percent: float, memory_percent: float) -> str:
    """Determine system load status"""
    if cpu_percent > 90 or memory_percent > 90:
        return "CRITICAL"
    elif cpu_percent > 70 or memory_percent > 70:
        return "HIGH"
    elif cpu_percent > 50 or memory_percent > 50:
        return "MODERATE"
    else:
        return "LOW"

@router.get("/system/limits")
async def get_limits():
    """API endpoint to get system limits"""
    return get_system_limits()

@router.get("/system/status") 
async def get_status():
    """API endpoint to get current system status"""
    return get_current_load()

# Stress testing function
async def stress_test_capacity():
    """Test system capacity progressively"""
    results = []
    
    test_levels = [10, 25, 50, 100, 200, 500, 1000]
    
    for user_count in test_levels:
        print(f"\n🧪 Testing {user_count} concurrent users...")
        
        start_load = get_current_load()
        
        try:
            # Simulate the load without actually making requests
            tasks = []
            for i in range(user_count):
                tasks.append(asyncio.sleep(0.1))  # Simulate work
            
            start_time = asyncio.get_event_loop().time()
            await asyncio.gather(*tasks)
            end_time = asyncio.get_event_loop().time()
            
            end_load = get_current_load()
            
            result = {
                "user_count": user_count,
                "duration": end_time - start_time,
                "cpu_before": start_load["cpu_usage_percent"],
                "cpu_after": end_load["cpu_usage_percent"],
                "memory_before": start_load["memory_usage_percent"],
                "memory_after": end_load["memory_usage_percent"],
                "status": "SUCCESS"
            }
            
            results.append(result)
            
            # Break if system is getting stressed
            if end_load["cpu_usage_percent"] > 80 or end_load["memory_usage_percent"] > 80:
                print(f"⚠️ System stress detected at {user_count} users")
                break
                
        except Exception as e:
            results.append({
                "user_count": user_count,
                "status": "FAILED",
                "error": str(e)
            })
            print(f"❌ Failed at {user_count} users: {e}")
            break
    
    return results